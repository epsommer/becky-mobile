/**
 * React hooks for API integration
 * @module lib/hooks/useApi
 */

import { useState, useEffect, useCallback } from 'react';
import { ApiResponse } from '../api/types';
import { ApiError } from '../api/errors';

/**
 * State returned by useApi hook
 */
export interface UseApiState<T> {
  /** Response data (null until loaded) */
  data: T | null;
  /** Loading state */
  loading: boolean;
  /** Error message (null if no error) */
  error: string | null;
  /** Function to manually refetch data */
  refetch: () => Promise<void>;
}

/**
 * React hook for API queries with automatic loading/error handling
 *
 * Features:
 * - Automatic data fetching on mount
 * - Loading state management
 * - Error handling with user-friendly messages
 * - Cleanup on unmount
 * - Manual refetch capability
 * - Dependency array support for re-fetching
 *
 * @param apiCall - Function that returns API response promise
 * @param dependencies - Dependency array (like useEffect)
 * @returns State object with data, loading, error, and refetch
 *
 * @example
 * ```typescript
 * import { useApi } from '@/lib/hooks/useApi';
 * import { clientsApi } from '@/lib/api/endpoints';
 *
 * function ClientList() {
 *   const { data: clients, loading, error, refetch } = useApi(
 *     () => clientsApi.getClients({ limit: 30 }),
 *     [] // Re-fetch when dependencies change
 *   );
 *
 *   if (loading) return <Text>Loading...</Text>;
 *   if (error) return <Text>Error: {error}</Text>;
 *
 *   return (
 *     <View>
 *       {clients?.map(client => (
 *         <Text key={client.id}>{client.name}</Text>
 *       ))}
 *       <Button onPress={refetch} title="Refresh" />
 *     </View>
 *   );
 * }
 * ```
 */
export function useApi<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  dependencies: any[] = []
): UseApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    console.log('[useApi] Starting fetch...');
    setLoading(true);
    setError(null);

    try {
      console.log('[useApi] Calling API...');
      const response = await apiCall();
      console.log('[useApi] Response received, success:', response.success);
      console.log('[useApi] Response has data:', response.data !== undefined);
      console.log('[useApi] Response data type:', typeof response.data);
      if (Array.isArray(response.data)) {
        console.log('[useApi] Response data length:', response.data.length);
      }

      if (response.success && response.data !== undefined) {
        console.log('[useApi] Setting data...');
        setData(response.data);
      } else {
        console.log('[useApi] Setting error:', response.error || 'Failed to fetch data');
        setError(response.error || 'Failed to fetch data');
        setData(null);
      }
    } catch (err) {
      console.error('[useApi] Caught error:', err);
      if (err instanceof ApiError) {
        setError(err.getUserMessage());
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
      setData(null);
    } finally {
      console.log('[useApi] Fetch complete, loading = false');
      setLoading(false);
    }
  }, [apiCall]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (mounted) {
        await fetchData();
      }
    };

    load();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

/**
 * Hook for API mutations (POST, PATCH, DELETE)
 *
 * Unlike useApi, this doesn't fetch on mount - you call the mutation function manually
 *
 * @example
 * ```typescript
 * function CreateClient() {
 *   const { mutate, loading, error } = useApiMutation(clientsApi.createClient);
 *
 *   const handleCreate = async () => {
 *     const response = await mutate({ name: 'New Client' });
 *     if (response.success) {
 *       console.log('Created:', response.data);
 *     }
 *   };
 *
 *   return <Button onPress={handleCreate} disabled={loading} title="Create" />;
 * }
 * ```
 */
export interface UseApiMutationState<TData, TVariables> {
  /** Function to trigger the mutation */
  mutate: (variables: TVariables) => Promise<ApiResponse<TData>>;
  /** Loading state */
  loading: boolean;
  /** Error message */
  error: string | null;
  /** Response data from last successful mutation */
  data: TData | null;
}

export function useApiMutation<TData = any, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<ApiResponse<TData>>
): UseApiMutationState<TData, TVariables> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TData | null>(null);

  const mutate = useCallback(
    async (variables: TVariables): Promise<ApiResponse<TData>> => {
      setLoading(true);
      setError(null);

      try {
        const response = await mutationFn(variables);

        if (response.success && response.data !== undefined) {
          setData(response.data);
        } else if (!response.success) {
          setError(response.error || 'Mutation failed');
        }

        return response;
      } catch (err) {
        const errorMessage =
          err instanceof ApiError
            ? err.getUserMessage()
            : err instanceof Error
            ? err.message
            : 'An unexpected error occurred';

        setError(errorMessage);

        // Return error response
        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setLoading(false);
      }
    },
    [mutationFn]
  );

  return {
    mutate,
    loading,
    error,
    data,
  };
}
