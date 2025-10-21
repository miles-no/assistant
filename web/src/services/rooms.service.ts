import apiClient from "@/lib/api-client";
import type {
	AvailabilityQueryParams,
	CreateRoomRequest,
	Room,
	RoomAvailability,
	RoomsQueryParams,
	UpdateRoomRequest,
} from "@/types/api";

export const roomsService = {
	/**
	 * Get all rooms (optionally filtered by location)
	 */
	async getAll(params?: RoomsQueryParams): Promise<Room[]> {
		const response = await apiClient.get<Room[]>("/rooms", { params });
		return response.data;
	},

	/**
	 * Get room by ID
	 */
	async getById(id: string): Promise<Room> {
		const response = await apiClient.get<Room>(`/rooms/${id}`);
		return response.data;
	},

	/**
	 * Check room availability
	 */
	async checkAvailability(
		roomId: string,
		params: AvailabilityQueryParams,
	): Promise<RoomAvailability> {
		const response = await apiClient.get<RoomAvailability>(
			`/rooms/${roomId}/availability`,
			{
				params,
			},
		);
		return response.data;
	},

	/**
	 * Create new room (ADMIN/MANAGER)
	 */
	async create(data: CreateRoomRequest): Promise<Room> {
		const response = await apiClient.post<Room>("/rooms", data);
		return response.data;
	},

	/**
	 * Update room (ADMIN/MANAGER)
	 */
	async update(id: string, data: UpdateRoomRequest): Promise<Room> {
		const response = await apiClient.patch<Room>(`/rooms/${id}`, data);
		return response.data;
	},

	/**
	 * Delete room (ADMIN/MANAGER)
	 */
	async delete(id: string): Promise<void> {
		await apiClient.delete(`/rooms/${id}`);
	},
};
