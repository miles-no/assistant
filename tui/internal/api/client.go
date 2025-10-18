package api

import (
	"fmt"
	"time"

	"github.com/go-resty/resty/v2"
	"github.com/miles/booking-tui/internal/models"
)

// Client is the API client for the booking system
type Client struct {
	baseURL string
	http    *resty.Client
	token   string
}

// NewClient creates a new API client
func NewClient(baseURL string) *Client {
	return &Client{
		baseURL: baseURL,
		http: resty.New().
			SetBaseURL(baseURL).
			SetTimeout(30 * time.Second).
			SetHeader("Content-Type", "application/json"),
	}
}

// SetToken sets the JWT token for authenticated requests
func (c *Client) SetToken(token string) {
	c.token = token
	c.http.SetAuthToken(token)
}

// GetToken returns the current JWT token
func (c *Client) GetToken() string {
	return c.token
}

// ClearToken clears the JWT token
func (c *Client) ClearToken() {
	c.token = ""
	c.http.SetAuthToken("")
}

// Auth endpoints

// Login authenticates a user
func (c *Client) Login(email, password string) (*models.AuthResponse, error) {
	var response struct {
		Message string       `json:"message"`
		User    models.User  `json:"user"`
		Token   string       `json:"token"`
	}
	resp, err := c.http.R().
		SetBody(map[string]string{
			"email":    email,
			"password": password,
		}).
		SetResult(&response).
		Post("/auth/login")

	if err != nil {
		return nil, err
	}

	if resp.IsError() {
		return nil, fmt.Errorf("login failed: %s", resp.Status())
	}

	return &models.AuthResponse{
		Token: response.Token,
		User:  response.User,
	}, nil
}

// Register creates a new user account
func (c *Client) Register(email, password, name string) (*models.AuthResponse, error) {
	var response models.AuthResponse
	resp, err := c.http.R().
		SetBody(map[string]interface{}{
			"email":    email,
			"password": password,
			"name":     name,
		}).
		SetResult(&response).
		Post("/auth/register")

	if err != nil {
		return nil, err
	}

	if resp.IsError() {
		return nil, fmt.Errorf("registration failed: %s", resp.Status())
	}

	return &response, nil
}

// GetCurrentUser gets the current authenticated user
func (c *Client) GetCurrentUser() (*models.User, error) {
	var response struct {
		User models.User `json:"user"`
	}
	resp, err := c.http.R().
		SetResult(&response).
		Get("/auth/me")

	if err != nil {
		return nil, err
	}

	if resp.IsError() {
		return nil, fmt.Errorf("failed to get user: %s", resp.Status())
	}

	return &response.User, nil
}

// Location endpoints

// GetLocations retrieves all locations
func (c *Client) GetLocations() ([]models.Location, error) {
	var response struct {
		Locations []models.Location `json:"locations"`
	}
	resp, err := c.http.R().
		SetResult(&response).
		Get("/locations")

	if err != nil {
		return nil, err
	}

	if resp.IsError() {
		return nil, fmt.Errorf("failed to get locations: %s", resp.Status())
	}

	return response.Locations, nil
}

// GetLocation retrieves a location by ID
func (c *Client) GetLocation(id string) (*models.Location, error) {
	var location models.Location
	resp, err := c.http.R().
		SetResult(&location).
		Get(fmt.Sprintf("/locations/%s", id))

	if err != nil {
		return nil, err
	}

	if resp.IsError() {
		return nil, fmt.Errorf("failed to get location: %s", resp.Status())
	}

	return &location, nil
}

// Room endpoints

// GetRooms retrieves rooms with optional filters
func (c *Client) GetRooms(locationID *string, minCapacity *int, equipment []string) ([]models.Room, error) {
	var response struct {
		Rooms []models.Room `json:"rooms"`
	}
	req := c.http.R().SetResult(&response)

	if locationID != nil {
		req.SetQueryParam("locationId", *locationID)
	}
	if minCapacity != nil {
		req.SetQueryParam("minCapacity", fmt.Sprintf("%d", *minCapacity))
	}
	if len(equipment) > 0 {
		for _, eq := range equipment {
			req.SetQueryParam("equipment", eq)
		}
	}

	resp, err := req.Get("/rooms")
	if err != nil {
		return nil, err
	}

	if resp.IsError() {
		return nil, fmt.Errorf("failed to get rooms: %s", resp.Status())
	}

	return response.Rooms, nil
}

// GetRoom retrieves a room by ID
func (c *Client) GetRoom(id string) (*models.Room, error) {
	var room models.Room
	resp, err := c.http.R().
		SetResult(&room).
		Get(fmt.Sprintf("/rooms/%s", id))

	if err != nil {
		return nil, err
	}

	if resp.IsError() {
		return nil, fmt.Errorf("failed to get room: %s", resp.Status())
	}

	return &room, nil
}

// CheckRoomAvailability checks if a room is available for a time slot
func (c *Client) CheckRoomAvailability(roomID string, startTime, endTime time.Time) (bool, error) {
	var result map[string]bool
	resp, err := c.http.R().
		SetQueryParams(map[string]string{
			"startTime": startTime.Format(time.RFC3339),
			"endTime":   endTime.Format(time.RFC3339),
		}).
		SetResult(&result).
		Get(fmt.Sprintf("/rooms/%s/availability", roomID))

	if err != nil {
		return false, err
	}

	if resp.IsError() {
		return false, fmt.Errorf("failed to check availability: %s", resp.Status())
	}

	return result["available"], nil
}

// Booking endpoints

// GetBookings retrieves bookings with optional filters
func (c *Client) GetBookings(roomID, locationID *string, startDate, endDate *time.Time) ([]models.Booking, error) {
	var response struct {
		Bookings []models.Booking `json:"bookings"`
	}
	req := c.http.R().SetResult(&response)

	if roomID != nil {
		req.SetQueryParam("roomId", *roomID)
	}
	if locationID != nil {
		req.SetQueryParam("locationId", *locationID)
	}
	if startDate != nil {
		req.SetQueryParam("startDate", startDate.Format("2006-01-02"))
	}
	if endDate != nil {
		req.SetQueryParam("endDate", endDate.Format("2006-01-02"))
	}

	resp, err := req.Get("/bookings")
	if err != nil {
		return nil, err
	}

	if resp.IsError() {
		return nil, fmt.Errorf("failed to get bookings: %s", resp.Status())
	}

	return response.Bookings, nil
}

// GetBooking retrieves a booking by ID
func (c *Client) GetBooking(id string) (*models.Booking, error) {
	var booking models.Booking
	resp, err := c.http.R().
		SetResult(&booking).
		Get(fmt.Sprintf("/bookings/%s", id))

	if err != nil {
		return nil, err
	}

	if resp.IsError() {
		return nil, fmt.Errorf("failed to get booking: %s", resp.Status())
	}

	return &booking, nil
}

// CreateBooking creates a new booking
func (c *Client) CreateBooking(req models.CreateBookingRequest) (*models.Booking, error) {
	var response struct {
		Booking models.Booking `json:"booking"`
	}
	resp, err := c.http.R().
		SetBody(req).
		SetResult(&response).
		Post("/bookings")

	if err != nil {
		return nil, err
	}

	if resp.IsError() {
		return nil, fmt.Errorf("failed to create booking: %s", resp.Status())
	}

	return &response.Booking, nil
}

// UpdateBooking updates an existing booking
func (c *Client) UpdateBooking(id string, req models.UpdateBookingRequest) (*models.Booking, error) {
	var booking models.Booking
	resp, err := c.http.R().
		SetBody(req).
		SetResult(&booking).
		Patch(fmt.Sprintf("/bookings/%s", id))

	if err != nil {
		return nil, err
	}

	if resp.IsError() {
		return nil, fmt.Errorf("failed to update booking: %s", resp.Status())
	}

	return &booking, nil
}

// CancelBooking cancels a booking
func (c *Client) CancelBooking(id string) error {
	resp, err := c.http.R().
		Delete(fmt.Sprintf("/bookings/%s", id))

	if err != nil {
		return err
	}

	if resp.IsError() {
		return fmt.Errorf("failed to cancel booking: %s", resp.Status())
	}

	return nil
}

// GetMyBookings retrieves the current user's bookings
// Note: The API automatically filters by user role - regular users only see their own bookings
func (c *Client) GetMyBookings() ([]models.Booking, error) {
	var response struct {
		Bookings []models.Booking `json:"bookings"`
	}
	resp, err := c.http.R().
		SetResult(&response).
		Get("/bookings")

	if err != nil {
		return nil, err
	}

	if resp.IsError() {
		return nil, fmt.Errorf("failed to get bookings: %s", resp.Status())
	}

	return response.Bookings, nil
}
