/**
 * Type-safe Room hooks using generated OpenAPI React Query bindings
 *
 * This file provides a clean API using the generated type-safe hooks from OpenAPI spec.
 * All types are automatically inferred from the backend API.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	deleteApiRoomsByIdMutation,
	getApiRoomsByIdAvailabilityOptions,
	getApiRoomsByIdOptions,
	getApiRoomsOptions,
	patchApiRoomsByIdMutation,
	postApiRoomsMutation,
} from "@/api-generated/@tanstack/react-query.gen";
import type {
	GetApiRoomsByIdAvailabilityData,
	GetApiRoomsData,
} from "@/api-generated/types.gen";
import { useToastStore } from "@/stores";

/**
 * Fetch all rooms with optional filters - fully type-safe query parameters
 */
export function useRooms(params?: GetApiRoomsData["query"]) {
	const query = useQuery(getApiRoomsOptions({ query: params }));
	return {
		...query,
		data: query.data?.rooms,
	};
}

/**
 * Fetch a single room by ID with full type safety
 */
export function useRoom(id: string) {
	const query = useQuery({
		...getApiRoomsByIdOptions({ path: { id } }),
		enabled: !!id,
	});
	return {
		...query,
		data: query.data?.room,
	};
}

/**
 * Check room availability with full type safety
 * Returns bookings that overlap with the requested time period
 */
export function useRoomAvailability(
	id: string,
	params: GetApiRoomsByIdAvailabilityData["query"],
) {
	const query = useQuery({
		...getApiRoomsByIdAvailabilityOptions({ path: { id }, query: params }),
		enabled: !!id && !!params.startDate && !!params.endDate,
	});
	return {
		...query,
		data: query.data?.bookings,
	};
}

/**
 * Create a new room - request body is fully typed from OpenAPI spec
 */
export function useCreateRoom() {
	const queryClient = useQueryClient();
	const { success, error } = useToastStore();

	return useMutation({
		...postApiRoomsMutation(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [{ _id: "getApiRooms" }] });
			success("Room created successfully");
		},
		onError: () => {
			error("Failed to create room");
		},
	});
}

/**
 * Update a room - request body is fully typed from OpenAPI spec
 */
export function useUpdateRoom() {
	const queryClient = useQueryClient();
	const { success, error } = useToastStore();

	return useMutation({
		...patchApiRoomsByIdMutation(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [{ _id: "getApiRooms" }] });
			queryClient.invalidateQueries({ queryKey: [{ _id: "getApiRoomsById" }] });
			success("Room updated successfully");
		},
		onError: () => {
			error("Failed to update room");
		},
	});
}

/**
 * Delete a room with full type safety
 */
export function useDeleteRoom() {
	const queryClient = useQueryClient();
	const { success, error } = useToastStore();

	return useMutation({
		...deleteApiRoomsByIdMutation(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [{ _id: "getApiRooms" }] });
			success("Room deleted successfully");
		},
		onError: () => {
			error("Failed to delete room");
		},
	});
}
