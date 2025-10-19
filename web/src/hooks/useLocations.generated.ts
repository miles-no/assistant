/**
 * Type-safe Location hooks using generated OpenAPI React Query bindings
 *
 * These hooks are fully type-safe from backend to frontend:
 * 1. OpenAPI spec defines the API contract
 * 2. @hey-api/openapi-ts generates TypeScript types and React Query hooks
 * 3. These hooks use the generated hooks for complete type safety
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
 * Fetch all locations with full type safety
 * - Request params are typed from OpenAPI spec
 * - Response data is typed from OpenAPI spec
 * - Errors are typed from OpenAPI spec
 */
export const useLocationsGenerated = () => {
  return useQuery(getApiLocationsOptions());
};

/**
 * Fetch a single location by ID with full type safety
 */
export const useLocationGenerated = (id: string) => {
  return useQuery(getApiLocationsByIdOptions({ path: { id } }));
};

/**
 * Create a new location with full type safety
 * - Request body is typed from OpenAPI spec
 * - Response is typed from OpenAPI spec
 * - Automatic cache invalidation
 */
export const useCreateLocationGenerated = () => {
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
};

/**
 * Update a location with full type safety
 */
export const useUpdateLocationGenerated = () => {
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
};

/**
 * Delete a location with full type safety
 */
export const useDeleteLocationGenerated = () => {
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
};
