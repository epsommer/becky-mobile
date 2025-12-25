// hooks/useTestimonials.ts
import { useState, useEffect, useCallback } from 'react';
import { Testimonial, testimonialsApi } from '../lib/api/endpoints/testimonials';

interface UseTestimonialsResult {
  testimonials: Testimonial[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  // Mutation functions
  approveTestimonial: (id: string) => Promise<boolean>;
  rejectTestimonial: (id: string, reason?: string) => Promise<boolean>;
  toggleFeatured: (id: string, isFeatured: boolean) => Promise<boolean>;
  toggleVisibility: (id: string, isPublic: boolean) => Promise<boolean>;
  deleteTestimonial: (id: string) => Promise<boolean>;
  updateTestimonial: (id: string, data: Partial<Testimonial>) => Promise<boolean>;
  // Batch operations
  batchApprove: (ids: string[]) => Promise<boolean>;
  batchReject: (ids: string[], reason?: string) => Promise<boolean>;
  batchDelete: (ids: string[]) => Promise<boolean>;
  // Operation state
  mutating: boolean;
}

/**
 * Hook to fetch all testimonials with mutation functions
 */
export function useTestimonials(): UseTestimonialsResult {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);

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

  // Mutation: Approve testimonial
  const approveTestimonial = useCallback(async (id: string): Promise<boolean> => {
    setMutating(true);
    try {
      const response = await testimonialsApi.approveTestimonial(id);
      if (response.success && response.data) {
        // Update local state optimistically
        setTestimonials(prev =>
          prev.map(t => t.id === id ? { ...t, status: 'APPROVED', approvedAt: new Date() } : t)
        );
        return true;
      }
      return false;
    } catch (err) {
      console.error('[useTestimonials] Error approving testimonial:', err);
      return false;
    } finally {
      setMutating(false);
    }
  }, []);

  // Mutation: Reject testimonial
  const rejectTestimonial = useCallback(async (id: string, reason?: string): Promise<boolean> => {
    setMutating(true);
    try {
      const response = await testimonialsApi.rejectTestimonial(id, reason);
      if (response.success) {
        setTestimonials(prev =>
          prev.map(t => t.id === id ? {
            ...t,
            status: 'REJECTED',
            metadata: reason ? { ...t.metadata, rejectionReason: reason } : t.metadata
          } : t)
        );
        return true;
      }
      return false;
    } catch (err) {
      console.error('[useTestimonials] Error rejecting testimonial:', err);
      return false;
    } finally {
      setMutating(false);
    }
  }, []);

  // Mutation: Toggle featured
  const toggleFeatured = useCallback(async (id: string, isFeatured: boolean): Promise<boolean> => {
    setMutating(true);
    try {
      const response = await testimonialsApi.toggleFeatured(id, isFeatured);
      if (response.success) {
        setTestimonials(prev =>
          prev.map(t => t.id === id ? { ...t, isFeatured } : t)
        );
        return true;
      }
      return false;
    } catch (err) {
      console.error('[useTestimonials] Error toggling featured:', err);
      return false;
    } finally {
      setMutating(false);
    }
  }, []);

  // Mutation: Toggle visibility
  const toggleVisibility = useCallback(async (id: string, isPublic: boolean): Promise<boolean> => {
    setMutating(true);
    try {
      const response = await testimonialsApi.toggleVisibility(id, isPublic);
      if (response.success) {
        setTestimonials(prev =>
          prev.map(t => t.id === id ? { ...t, isPublic } : t)
        );
        return true;
      }
      return false;
    } catch (err) {
      console.error('[useTestimonials] Error toggling visibility:', err);
      return false;
    } finally {
      setMutating(false);
    }
  }, []);

  // Mutation: Delete testimonial
  const deleteTestimonial = useCallback(async (id: string): Promise<boolean> => {
    setMutating(true);
    try {
      const response = await testimonialsApi.deleteTestimonial(id);
      if (response.success) {
        setTestimonials(prev => prev.filter(t => t.id !== id));
        return true;
      }
      return false;
    } catch (err) {
      console.error('[useTestimonials] Error deleting testimonial:', err);
      return false;
    } finally {
      setMutating(false);
    }
  }, []);

  // Mutation: Update testimonial
  const updateTestimonial = useCallback(async (id: string, data: Partial<Testimonial>): Promise<boolean> => {
    setMutating(true);
    try {
      const response = await testimonialsApi.updateTestimonial(id, data);
      if (response.success && response.data) {
        setTestimonials(prev =>
          prev.map(t => t.id === id ? { ...t, ...response.data } : t)
        );
        return true;
      }
      return false;
    } catch (err) {
      console.error('[useTestimonials] Error updating testimonial:', err);
      return false;
    } finally {
      setMutating(false);
    }
  }, []);

  // Batch: Approve multiple
  const batchApprove = useCallback(async (ids: string[]): Promise<boolean> => {
    setMutating(true);
    try {
      const response = await testimonialsApi.batchApprove(ids);
      if (response.success) {
        setTestimonials(prev =>
          prev.map(t => ids.includes(t.id) ? { ...t, status: 'APPROVED', approvedAt: new Date() } : t)
        );
        return true;
      }
      return false;
    } catch (err) {
      console.error('[useTestimonials] Error batch approving:', err);
      return false;
    } finally {
      setMutating(false);
    }
  }, []);

  // Batch: Reject multiple
  const batchReject = useCallback(async (ids: string[], reason?: string): Promise<boolean> => {
    setMutating(true);
    try {
      const response = await testimonialsApi.batchReject(ids, reason);
      if (response.success) {
        setTestimonials(prev =>
          prev.map(t => ids.includes(t.id) ? { ...t, status: 'REJECTED' } : t)
        );
        return true;
      }
      return false;
    } catch (err) {
      console.error('[useTestimonials] Error batch rejecting:', err);
      return false;
    } finally {
      setMutating(false);
    }
  }, []);

  // Batch: Delete multiple
  const batchDelete = useCallback(async (ids: string[]): Promise<boolean> => {
    setMutating(true);
    try {
      const response = await testimonialsApi.batchDelete(ids);
      if (response.success) {
        setTestimonials(prev => prev.filter(t => !ids.includes(t.id)));
        return true;
      }
      return false;
    } catch (err) {
      console.error('[useTestimonials] Error batch deleting:', err);
      return false;
    } finally {
      setMutating(false);
    }
  }, []);

  return {
    testimonials,
    loading,
    error,
    refetch: fetchTestimonials,
    approveTestimonial,
    rejectTestimonial,
    toggleFeatured,
    toggleVisibility,
    deleteTestimonial,
    updateTestimonial,
    batchApprove,
    batchReject,
    batchDelete,
    mutating,
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
