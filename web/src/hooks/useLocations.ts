/**
 * Type-safe Location hooks using generated OpenAPI React Query bindings
 *
 * This file provides a clean API using the generated type-safe hooks from OpenAPI spec.
 * All types are automatically inferred from the backend API.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getApiLocationsOptions,
  getApiLocationsByIdOptions,
  postApiLocationsMutation,
  patchApiLocationsByIdMutation,
  deleteApiLocationsByIdMutation,
} from '@/api-generated/@tanstack/react-query.gen';
import { useToastStore } from '@/stores';

/**
 * Fetch all locations with full type safety from OpenAPI spec
 */
export function useLocations() {
  const query = useQuery(getApiLocationsOptions());
  return {
    ...query,
    data: query.data?.locations,
  };
}

/**
 * Fetch a single location by ID with full type safety
 */
export function useLocation(id: string) {
  const query = useQuery({
    ...getApiLocationsByIdOptions({ path: { id } }),
    enabled: !!id,
  });
  return {
    ...query,
    data: query.data?.location,
  };
}

/**
 * Create a new location - request body is fully typed from OpenAPI spec
 */
export function useCreateLocation() {
  const queryClient = useQueryClient();
  const { success, error } = useToastStore();

  return useMutation({
    ...postApiLocationsMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [{ _id: 'getApiLocations' }] });
      success('Location created successfully');
    },
    onError: () => {
      error('Failed to create location');
    },
  });
}

/**
 * Update a location - request body is fully typed from OpenAPI spec
 */
export function useUpdateLocation() {
  const queryClient = useQueryClient();
  const { success, error } = useToastStore();

  return useMutation({
    ...patchApiLocationsByIdMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [{ _id: 'getApiLocations' }] });
      queryClient.invalidateQueries({ queryKey: [{ _id: 'getApiLocationsById' }] });
      success('Location updated successfully');
    },
    onError: () => {
      error('Failed to update location');
    },
  });
}

/**
 * Delete a location with full type safety
 */
export function useDeleteLocation() {
  const queryClient = useQueryClient();
  const { success, error } = useToastStore();

  return useMutation({
    ...deleteApiLocationsByIdMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [{ _id: 'getApiLocations' }] });
      success('Location deleted successfully');
    },
    onError: () => {
      error('Failed to delete location');
    },
  });
}
