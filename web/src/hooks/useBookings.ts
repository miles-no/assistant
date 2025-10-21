/**
 * Type-safe Booking hooks using generated OpenAPI React Query bindings
 *
 * This file provides a clean API using the generated type-safe hooks from OpenAPI spec.
 * All types are automatically inferred from the backend API.
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
 * Fetch all bookings with optional filters - fully type-safe query parameters
 */
export function useBookings(params?: GetApiBookingsData["query"]) {
	const query = useQuery(getApiBookingsOptions({ query: params }));
	return {
		...query,
		data: query.data?.bookings,
	};
}

/**
 * Fetch a single booking by ID with full type safety
 */
export function useBooking(id: string) {
	const query = useQuery({
		...getApiBookingsByIdOptions({ path: { id } }),
		enabled: !!id,
	});
	return {
		...query,
		data: query.data?.booking,
	};
}

/**
 * Create a new booking - request body is fully typed from OpenAPI spec
 */
export function useCreateBooking() {
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
}

/**
 * Update a booking - request body is fully typed from OpenAPI spec
 */
export function useUpdateBooking() {
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
}

/**
 * Cancel/Delete a booking with full type safety
 * Usage: mutation.mutate({ path: { id: 'booking-id' } })
 */
export function useCancelBooking() {
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
}
