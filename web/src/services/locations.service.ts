import apiClient from "@/lib/api-client";
import type {
	CreateLocationRequest,
	Location,
	UpdateLocationRequest,
} from "@/types/api";

export const locationsService = {
	/**
	 * Get all locations
	 */
	async getAll(): Promise<Location[]> {
		const response = await apiClient.get<Location[]>("/locations");
		return response.data;
	},

	/**
	 * Get location by ID (with rooms and managers)
	 */
	async getById(id: string): Promise<Location> {
		const response = await apiClient.get<Location>(`/locations/${id}`);
		return response.data;
	},

	/**
	 * Create new location (ADMIN only)
	 */
	async create(data: CreateLocationRequest): Promise<Location> {
		const response = await apiClient.post<Location>("/locations", data);
		return response.data;
	},

	/**
	 * Update location (ADMIN/MANAGER)
	 */
	async update(id: string, data: UpdateLocationRequest): Promise<Location> {
		const response = await apiClient.patch<Location>(`/locations/${id}`, data);
		return response.data;
	},

	/**
	 * Delete location (ADMIN only)
	 */
	async delete(id: string): Promise<void> {
		await apiClient.delete(`/locations/${id}`);
	},

	/**
	 * Assign manager to location (ADMIN only)
	 */
	async assignManager(locationId: string, userId: string): Promise<void> {
		await apiClient.post(`/locations/${locationId}/managers`, { userId });
	},

	/**
	 * Remove manager from location (ADMIN only)
	 */
	async removeManager(locationId: string, userId: string): Promise<void> {
		await apiClient.delete(`/locations/${locationId}/managers/${userId}`);
	},
};
