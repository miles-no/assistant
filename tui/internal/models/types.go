package models

import "time"

// User represents an authenticated user
type User struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	Role      Role      `json:"role"`
	CreatedAt time.Time `json:"createdAt"`
}

// Role represents user role
type Role string

const (
	RoleAdmin   Role = "ADMIN"
	RoleManager Role = "MANAGER"
	RoleUser    Role = "USER"
)

// Location represents an office location
type Location struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Address     string    `json:"address"`
	City        string    `json:"city"`
	Country     string    `json:"country"`
	Timezone    string    `json:"timezone"`
	Description string    `json:"description,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
}

// Room represents a meeting room
type Room struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Location    Location  `json:"location"`
	LocationID  string    `json:"locationId"`
	Capacity    int       `json:"capacity"`
	Equipment   []string  `json:"equipment"`
	Description string    `json:"description,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
}

// Booking represents a room booking
type Booking struct {
	ID          string        `json:"id"`
	Room        Room          `json:"room"`
	RoomID      string        `json:"roomId"`
	User        User          `json:"user"`
	UserID      string        `json:"userId"`
	StartTime   time.Time     `json:"startTime"`
	EndTime     time.Time     `json:"endTime"`
	Purpose     string        `json:"purpose"`
	Status      BookingStatus `json:"status"`
	Attendees   int           `json:"attendees,omitempty"`
	CreatedAt   time.Time     `json:"createdAt"`
	UpdatedAt   time.Time     `json:"updatedAt"`
}

// BookingStatus represents booking status
type BookingStatus string

const (
	BookingStatusPending   BookingStatus = "PENDING"
	BookingStatusConfirmed BookingStatus = "CONFIRMED"
	BookingStatusCancelled BookingStatus = "CANCELLED"
)

// AuthResponse represents authentication response
type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

// CreateBookingRequest represents a booking creation request
type CreateBookingRequest struct {
	RoomID    string    `json:"roomId"`
	StartTime time.Time `json:"startTime"`
	EndTime   time.Time `json:"endTime"`
	Purpose   string    `json:"purpose"`
	Attendees int       `json:"attendees,omitempty"`
}

// UpdateBookingRequest represents a booking update request
type UpdateBookingRequest struct {
	StartTime *time.Time     `json:"startTime,omitempty"`
	EndTime   *time.Time     `json:"endTime,omitempty"`
	Purpose   *string        `json:"purpose,omitempty"`
	Status    *BookingStatus `json:"status,omitempty"`
	Attendees *int           `json:"attendees,omitempty"`
}
