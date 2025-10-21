import apiClient from "@/lib/api-client";
import type {
	Booking,
	BookingsQueryParams,
	CreateBookingRequest,
	UpdateBookingRequest,
} from "@/types/api";

export const bookingsService = {
	/**
	 * Get bookings (filtered by role and params)
	 */
	async getAll(params?: BookingsQueryParams): Promise<Booking[]> {
		const response = await apiClient.get<Booking[]>("/bookings", { params });
		return response.data;
	},

	/**
	 * Get booking by ID
	 */
	async getById(id: string): Promise<Booking> {
		const response = await apiClient.get<Booking>(`/bookings/${id}`);
		return response.data;
	},

	/**
	 * Create new booking
	 */
	async create(data: CreateBookingRequest): Promise<Booking> {
		const response = await apiClient.post<Booking>("/bookings", data);
		return response.data;
	},

	/**
	 * Update booking (owner/manager/admin)
	 */
	async update(id: string, data: UpdateBookingRequest): Promise<Booking> {
		const response = await apiClient.patch<Booking>(`/bookings/${id}`, data);
		return response.data;
	},

	/**
	 * Cancel booking (soft delete)
	 */
	async cancel(id: string): Promise<void> {
		await apiClient.delete(`/bookings/${id}`);
	},

	/**
	 * Get iCal feed URL for office
	 */
	getOfficeCalendarUrl(locationId: string): string {
		const token = localStorage.getItem("token");
		return `/api/calendar/office/${locationId}.ics?token=${token}`;
	},

	/**
	 * Get iCal feed URL for room
	 */
	getRoomCalendarUrl(roomId: string): string {
		const token = localStorage.getItem("token");
		return `/api/calendar/room/${roomId}.ics?token=${token}`;
	},

	/**
	 * Get iCal feed URL for user
	 */
	getUserCalendarUrl(userId: string): string {
		const token = localStorage.getItem("token");
		return `/api/calendar/user/${userId}.ics?token=${token}`;
	},
};
