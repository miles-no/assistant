package config

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/go-resty/resty/v2"
	"github.com/miles/booking-cli/internal/generated"
)

// Client is the API client for the Miles booking system
type Client struct {
	BaseURL string
	Token   string
	http    *resty.Client
}

// NewClient creates a new API client
func NewClient(baseURL, token string) *Client {
	client := resty.New()
	client.SetTimeout(10 * time.Second)
	client.SetBaseURL(baseURL)

	if token != "" {
		client.SetAuthToken(token)
	}

	return &Client{
		BaseURL: baseURL,
		Token:   token,
		http:    client,
	}
}

// LoginResponse represents the login API response
type LoginResponse struct {
	Token string          `json:"token"`
	User  *generated.User `json:"user,omitempty"`
}

// API response wrappers - the API returns data wrapped in objects
type LocationsResponse struct {
	Locations []generated.Location `json:"locations"`
}

type RoomsResponse struct {
	Rooms []generated.Room `json:"rooms"`
}

type BookingsResponse struct {
	Bookings []generated.Booking `json:"bookings"`
}

// Login authenticates a user and returns a token
func (c *Client) Login(email, password string) (*LoginResponse, error) {
	var result LoginResponse

	resp, err := c.http.R().
		SetBody(map[string]string{
			"email":    email,
			"password": password,
		}).
		SetResult(&result).
		Post("/api/auth/login")

	if err != nil {
		return nil, fmt.Errorf("login request failed: %w", err)
	}

	if resp.StatusCode() != http.StatusOK {
		return nil, fmt.Errorf("login failed: %s", resp.Status())
	}

	// Update client token
	c.Token = result.Token
	c.http.SetAuthToken(result.Token)

	return &result, nil
}

// GetLocations retrieves all locations
func (c *Client) GetLocations() ([]generated.Location, error) {
	var response LocationsResponse
	resp, err := c.http.R().
		SetResult(&response).
		Get("/api/locations")

	if err != nil {
		return nil, fmt.Errorf("get locations failed: %w", err)
	}

	if resp.StatusCode() != http.StatusOK {
		return nil, fmt.Errorf("get locations failed: %s", resp.Status())
	}

	return response.Locations, nil
}

// GetRooms retrieves rooms, optionally filtered by location
func (c *Client) GetRooms(locationID string) ([]generated.Room, error) {
	var response RoomsResponse
	req := c.http.R().SetResult(&response)

	if locationID != "" {
		req.SetQueryParam("locationId", locationID)
	}

	resp, err := req.Get("/api/rooms")
	if err != nil {
		return nil, fmt.Errorf("get rooms failed: %w", err)
	}

	if resp.StatusCode() != http.StatusOK {
		return nil, fmt.Errorf("get rooms failed: %s", resp.Status())
	}

	return response.Rooms, nil
}

// GetBookings retrieves bookings for the authenticated user
func (c *Client) GetBookings() ([]generated.Booking, error) {
	var response BookingsResponse
	resp, err := c.http.R().
		SetResult(&response).
		Get("/api/bookings")

	if err != nil {
		return nil, fmt.Errorf("get bookings failed: %w", err)
	}

	if resp.StatusCode() != http.StatusOK {
		return nil, fmt.Errorf("get bookings failed: %s", resp.Status())
	}

	return response.Bookings, nil
}

// CreateBooking creates a new booking
func (c *Client) CreateBooking(req generated.BookingInput) (*generated.Booking, error) {
	var result generated.Booking
	resp, err := c.http.R().
		SetBody(req).
		SetResult(&result).
		Post("/api/bookings")

	if err != nil {
		return nil, fmt.Errorf("create booking failed: %w", err)
	}

	if resp.StatusCode() != http.StatusCreated {
		var errResp map[string]interface{}
		json.Unmarshal(resp.Body(), &errResp)
		if msg, ok := errResp["error"].(string); ok {
			return nil, fmt.Errorf("create booking failed: %s", msg)
		}
		return nil, fmt.Errorf("create booking failed: %s", resp.Status())
	}

	return &result, nil
}

// CancelBooking cancels a booking by ID
func (c *Client) CancelBooking(bookingID string) error {
	resp, err := c.http.R().
		Delete(fmt.Sprintf("/api/bookings/%s", bookingID))

	if err != nil {
		return fmt.Errorf("cancel booking failed: %w", err)
	}

	if resp.StatusCode() != http.StatusOK {
		var errResp map[string]interface{}
		json.Unmarshal(resp.Body(), &errResp)
		if msg, ok := errResp["error"].(string); ok {
			return fmt.Errorf("cancel booking failed: %s", msg)
		}
		return fmt.Errorf("cancel booking failed: %s", resp.Status())
	}

	return nil
}
