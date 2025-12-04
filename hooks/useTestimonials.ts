// hooks/useTestimonials.ts
import { useState, useEffect, useCallback } from 'react';
import { Testimonial, testimonialsApi } from '../lib/api/endpoints/testimonials';

interface UseTestimonialsResult {
  testimonials: Testimonial[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch all testimonials
 */
export function useTestimonials(): UseTestimonialsResult {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTestimonials = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await testimonialsApi.getTestimonials();
      if (response.success && response.data) {
        setTestimonials(response.data as Testimonial[]);
      } else {
        console.error('[useTestimonials] Failed to load testimonials:', response);
        setTestimonials([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load testimonials');
      console.error('[useTestimonials] Error fetching testimonials:', err);
      setTestimonials([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTestimonials();
  }, [fetchTestimonials]);

  return {
    testimonials,
    loading,
    error,
    refetch: fetchTestimonials,
  };
}

interface UseClientTestimonialsResult {
  testimonials: Testimonial[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch testimonials for a specific client
 */
export function useClientTestimonials(clientId: string | null): UseClientTestimonialsResult {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTestimonials = useCallback(async () => {
    if (!clientId) {
      console.log('[useClientTestimonials] No clientId provided');
      setTestimonials([]);
      setLoading(false);
      return;
    }

    try {
      console.log('[useClientTestimonials] Fetching testimonials for clientId:', clientId);
      setLoading(true);
      setError(null);
      const response = await testimonialsApi.getTestimonialsByClientId(clientId);
      console.log('[useClientTestimonials] API response:', JSON.stringify(response, null, 2));
      if (response.success && response.data) {
        console.log('[useClientTestimonials] Setting testimonials, count:', response.data.length);
        setTestimonials(response.data as Testimonial[]);
      } else {
        console.error('[useClientTestimonials] Failed to load testimonials:', response);
        setTestimonials([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load testimonials');
      console.error('[useClientTestimonials] Error fetching testimonials:', err);
      setTestimonials([]);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchTestimonials();
  }, [fetchTestimonials]);

  return {
    testimonials,
    loading,
    error,
    refetch: fetchTestimonials,
  };
}
