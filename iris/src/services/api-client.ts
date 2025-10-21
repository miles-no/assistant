import createClient from "openapi-fetch";
import type { components, paths } from "../../types/api";

// Re-export useful types
export type User = components["schemas"]["User"];
export type Room = components["schemas"]["Room"];
export type Booking = components["schemas"]["Booking"];
export type BookingInput = components["schemas"]["BookingInput"];
export type Location = components["schemas"]["Location"];

export interface ApiError {
	error: string;
	details?: Array<{
		path: string;
		message: string;
	}>;
}

export interface AuthResponse {
	message?: string;
	user?: User;
	token?: string;
}

export interface BookingsResponse {
	bookings: Booking[];
}

export interface RoomsResponse {
	rooms: Room[];
}

export interface BookingResponse {
	message?: string;
	booking?: Booking;
}

/**
 * Type-safe API client for the Miles booking system
 */
export class MilesApiClient {
	private client: ReturnType<typeof createClient<paths>>;
	private baseUrl: string;

	constructor(baseUrl: string, authToken?: string) {
		this.baseUrl = baseUrl;
		this.client = createClient<paths>({
			baseUrl,
			headers: authToken
				? {
						Authorization: `Bearer ${authToken}`,
						"Content-Type": "application/json",
					}
				: {
						"Content-Type": "application/json",
					},
		});
	}

	/**
	 * Update the authentication token
	 */
	setAuthToken(token: string): void {
		this.client = createClient<paths>({
			baseUrl: this.baseUrl,
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
		});
	}

	/**
	 * Health check
	 */
	async health(): Promise<{ status: string; timestamp: string }> {
		const { data, error } = await this.client.GET("/health");
		if (error) throw new Error("Health check failed");
		return {
			status: data?.status || "unknown",
			timestamp: data?.timestamp || new Date().toISOString(),
		};
	}

	/**
	 * Authentication
	 */
	async login(credentials: {
		email: string;
		password: string;
	}): Promise<AuthResponse> {
		const { data, error } = await this.client.POST("/api/auth/login", {
			body: credentials,
		});

		if (error) {
			throw new Error((error as ApiError).error || "Login failed");
		}

		return {
			message: data?.message,
			user: data?.user,
			token: data?.token,
		};
	}

	async register(userData: {
		email: string;
		password: string;
		firstName: string;
		lastName: string;
	}): Promise<AuthResponse> {
		const { data, error } = await this.client.POST("/api/auth/register", {
			body: userData,
		});

		if (error) {
			throw new Error((error as ApiError).error || "Registration failed");
		}

		return {
			message: data?.message,
			user: data?.user,
			token: data?.token,
		};
	}

	/**
	 * Rooms
	 */
	async getRooms(params?: {
		locationId?: string;
		capacity?: number;
	}): Promise<RoomsResponse> {
		const query = params
			? Object.fromEntries(
					Object.entries(params).filter(([, value]) => value !== undefined),
				)
			: undefined;

		const { data, error } = await this.client.GET("/api/rooms", {
			params: { query },
		});

		if (error) {
			throw new Error((error as ApiError).error || "Failed to fetch rooms");
		}

		return {
			rooms: data?.rooms || [],
		};
	}

	async getRoomAvailability(params: {
		roomId: string;
		startDate: string;
		endDate: string;
	}): Promise<{ bookings: Booking[] }> {
		const { data, error } = await this.client.GET(
			"/api/rooms/{id}/availability",
			{
				params: {
					path: { id: params.roomId },
					query: {
						startDate: params.startDate,
						endDate: params.endDate,
					},
				},
			},
		);

		if (error) {
			throw new Error(
				(error as ApiError).error || "Failed to check availability",
			);
		}

		return {
			bookings: data?.bookings || [],
		};
	}

	/**
	 * Bookings
	 */
	async getBookings(params?: {
		locationId?: string;
		startDate?: string;
		endDate?: string;
	}): Promise<BookingsResponse> {
		const query = params
			? Object.fromEntries(
					Object.entries(params).filter(([, value]) => value !== undefined),
				)
			: undefined;

		const { data, error } = await this.client.GET("/api/bookings", {
			params: { query },
		});

		if (error) {
			throw new Error((error as ApiError).error || "Failed to fetch bookings");
		}

		return {
			bookings: data?.bookings || [],
		};
	}

	async createBooking(booking: BookingInput): Promise<BookingResponse> {
		const { data, error } = await this.client.POST("/api/bookings", {
			body: booking,
		});

		if (error) {
			throw new Error((error as ApiError).error || "Failed to create booking");
		}

		return {
			message: data?.message,
			booking: data?.booking,
		};
	}

	async getBooking(bookingId: string): Promise<{ booking: Booking }> {
		const { data, error } = await this.client.GET("/api/bookings/{id}", {
			params: { path: { id: bookingId } },
		});

		if (error) {
			throw new Error((error as ApiError).error || "Failed to fetch booking");
		}

		if (!data?.booking) {
			throw new Error("Booking not found");
		}

		return {
			booking: data.booking,
		};
	}

	async updateBooking(
		bookingId: string,
		updates: Partial<BookingInput>,
	): Promise<BookingResponse> {
		const { data, error } = await this.client.PATCH("/api/bookings/{id}", {
			params: { path: { id: bookingId } },
			body: updates,
		});

		if (error) {
			throw new Error((error as ApiError).error || "Failed to update booking");
		}

		return {
			message: data?.message,
			booking: data?.booking,
		};
	}

	async cancelBooking(bookingId: string): Promise<{ message: string }> {
		const { data, error } = await this.client.DELETE("/api/bookings/{id}", {
			params: { path: { id: bookingId } },
		});

		if (error) {
			throw new Error((error as ApiError).error || "Failed to cancel booking");
		}

		return {
			message: data?.message || "Booking cancelled successfully",
		};
	}

	/**
	 * Locations
	 */
	async getLocations(): Promise<{ locations: Location[] }> {
		const { data, error } = await this.client.GET("/api/locations");

		if (error) {
			throw new Error((error as ApiError).error || "Failed to fetch locations");
		}

		return {
			locations: data?.locations || [],
		};
	}

	async getLocation(locationId: string): Promise<{ location: Location }> {
		const { data, error } = await this.client.GET("/api/locations/{id}", {
			params: { path: { id: locationId } },
		});

		if (error) {
			throw new Error((error as ApiError).error || "Failed to fetch location");
		}

		if (!data?.location) {
			throw new Error("Location not found");
		}

		return {
			location: data.location,
		};
	}
}

// Export ApiClient as an alias for backward compatibility
export const ApiClient = MilesApiClient;
