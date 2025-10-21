/**
 * Type-safe Booking hooks using generated OpenAPI React Query bindings
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	deleteApiBookingsByIdMutation,
	getApiBookingsByIdOptions,
	getApiBookingsOptions,
	patchApiBookingsByIdMutation,
	postApiBookingsMutation,
} from "@/api-generated/@tanstack/react-query.gen";
import type { GetApiBookingsData } from "@/api-generated/types.gen";
import { useToastStore } from "@/stores";

/**
 * Fetch all bookings with optional filters
 * Fully type-safe query parameters from OpenAPI spec
 */
export const useBookingsGenerated = (params?: GetApiBookingsData["query"]) => {
	return useQuery(getApiBookingsOptions({ query: params }));
};

/**
 * Fetch a single booking by ID
 */
export const useBookingGenerated = (id: string) => {
	return useQuery(getApiBookingsByIdOptions({ path: { id } }));
};

/**
 * Create a new booking
 * Request body is fully typed from OpenAPI spec
 */
export const useCreateBookingGenerated = () => {
	const queryClient = useQueryClient();
	const { success, error } = useToastStore();

	return useMutation({
		...postApiBookingsMutation(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [{ _id: "getApiBookings" }] });
			success("Booking created successfully");
		},
		onError: () => {
			error("Failed to create booking");
		},
	});
};

/**
 * Update a booking
 */
export const useUpdateBookingGenerated = () => {
	const queryClient = useQueryClient();
	const { success, error } = useToastStore();

	return useMutation({
		...patchApiBookingsByIdMutation(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [{ _id: "getApiBookings" }] });
			queryClient.invalidateQueries({
				queryKey: [{ _id: "getApiBookingsById" }],
			});
			success("Booking updated successfully");
		},
		onError: () => {
			error("Failed to update booking");
		},
	});
};

/**
 * Cancel/Delete a booking
 */
export const useCancelBookingGenerated = () => {
	const queryClient = useQueryClient();
	const { success, error } = useToastStore();

	return useMutation({
		...deleteApiBookingsByIdMutation(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [{ _id: "getApiBookings" }] });
			success("Booking cancelled successfully");
		},
		onError: () => {
			error("Failed to cancel booking");
		},
	});
};
