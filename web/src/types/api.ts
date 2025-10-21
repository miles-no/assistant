// User types
export type UserRole = "ADMIN" | "MANAGER" | "USER";

export interface User {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	role: UserRole;
	createdAt: string;
}

// Auth types
export interface LoginRequest {
	email: string;
	password: string;
}

export interface RegisterRequest {
	email: string;
	password: string;
	firstName: string;
	lastName: string;
}

export interface AuthResponse {
	token: string;
	user: User;
}

// Location types
export interface Location {
	id: string;
	name: string;
	address: string;
	city: string;
	country: string;
	timezone: string;
	description?: string;
	createdAt: string;
	rooms?: Room[];
	managers?: User[];
}

export interface CreateLocationRequest {
	name: string;
	address: string;
	city: string;
	country: string;
	timezone?: string;
	description?: string;
}

export interface UpdateLocationRequest extends Partial<CreateLocationRequest> {}

// Room types
export interface Room {
	id: string;
	name: string;
	locationId: string;
	capacity: number;
	description?: string;
	amenities: string[];
	isActive: boolean;
	createdAt: string;
	location?: Location;
}

export interface CreateRoomRequest {
	name: string;
	locationId: string;
	capacity: number;
	description?: string;
	amenities?: string[];
}

export interface UpdateRoomRequest extends Partial<CreateRoomRequest> {
	isActive?: boolean;
}

export interface RoomAvailability {
	available: boolean;
	conflicts?: Booking[];
}

// Booking types
export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

export interface Booking {
	id: string;
	roomId: string;
	userId: string;
	startTime: string;
	endTime: string;
	title: string;
	description?: string;
	status: BookingStatus;
	createdAt: string;
	room?: Room;
	user?: User;
}

export interface CreateBookingRequest {
	roomId: string;
	startTime: string;
	endTime: string;
	title: string;
	description?: string;
}

export interface UpdateBookingRequest {
	startTime?: string;
	endTime?: string;
	title?: string;
	description?: string;
	status?: BookingStatus;
}

// Query parameters
export interface BookingsQueryParams {
	roomId?: string;
	locationId?: string;
	startDate?: string;
	endDate?: string;
}

export interface RoomsQueryParams {
	locationId?: string;
}

export interface AvailabilityQueryParams {
	startDate: string;
	endDate: string;
}

// API Error
export interface ApiError {
	message: string;
	statusCode: number;
	errors?: Record<string, string[]>;
}
