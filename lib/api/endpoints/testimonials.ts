/**
 * Testimonials API endpoints
 * @module lib/api/endpoints/testimonials
 */

import { apiClient } from '../client';
import { ApiResponse, PaginationParams } from '../types';

/**
 * Query parameters for testimonials
 */
export interface TestimonialsQuery extends PaginationParams {
  clientId?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  isPublic?: boolean;
  isFeatured?: boolean;
}

/**
 * Testimonial data structure
 */
export interface Testimonial {
  id: string;
  clientId: string;
  client?: {
    id: string;
    name: string;
    email?: string;
    company?: string;
  };
  serviceId?: string;
  serviceName?: string;
  rating: number;
  title?: string;
  content: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  isPublic: boolean;
  isFeatured: boolean;
  requestSentAt?: Date;
  submittedAt?: Date;
  approvedAt?: Date;
  source?: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Data for creating a testimonial
 */
export interface CreateTestimonialData {
  clientId: string;
  serviceId?: string;
  serviceName?: string;
  rating: number;
  title?: string;
  content: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  isPublic?: boolean;
  isFeatured?: boolean;
  source?: string;
}

/**
 * Testimonials API methods
 *
 * @example
 * ```typescript
 * import { testimonialsApi } from '@/lib/api/endpoints';
 *
 * // Get testimonials for client
 * const response = await testimonialsApi.getTestimonials({ clientId: 'abc123' });
 *
 * // Create new testimonial
 * const testimonial = await testimonialsApi.createTestimonial({
 *   clientId: 'abc123',
 *   rating: 5,
 *   content: 'Great service!'
 * });
 * ```
 */
export const testimonialsApi = {
  /**
   * Get all testimonials with optional filters
   *
   * @param params - Query parameters
   * @returns List of testimonials
   */
  getTestimonials: async (
    params?: TestimonialsQuery
  ): Promise<ApiResponse<Testimonial[]>> => {
    return apiClient.get<Testimonial[]>('/api/testimonials', params);
  },

  /**
   * Get testimonials by client ID
   *
   * @param clientId - Client ID
   * @returns List of testimonials for the client
   */
  getTestimonialsByClientId: async (
    clientId: string
  ): Promise<ApiResponse<Testimonial[]>> => {
    return apiClient.get<Testimonial[]>('/api/testimonials', { clientId });
  },

  /**
   * Get single testimonial by ID
   *
   * @param testimonialId - Testimonial ID
   * @returns Testimonial details
   */
  getTestimonial: async (
    testimonialId: string
  ): Promise<ApiResponse<Testimonial>> => {
    return apiClient.get<Testimonial>(`/api/testimonials/${testimonialId}`);
  },

  /**
   * Create new testimonial
   *
   * @param data - Testimonial data
   * @returns Created testimonial
   */
  createTestimonial: async (
    data: CreateTestimonialData
  ): Promise<ApiResponse<Testimonial>> => {
    return apiClient.post<Testimonial>('/api/testimonials', data);
  },

  /**
   * Update existing testimonial
   *
   * @param testimonialId - Testimonial ID
   * @param data - Updated data
   * @returns Updated testimonial
   */
  updateTestimonial: async (
    testimonialId: string,
    data: Partial<Testimonial>
  ): Promise<ApiResponse<Testimonial>> => {
    return apiClient.patch<Testimonial>(
      `/api/testimonials/${testimonialId}`,
      data
    );
  },

  /**
   * Delete testimonial
   *
   * @param testimonialId - Testimonial ID
   * @returns Success response
   */
  deleteTestimonial: async (testimonialId: string): Promise<ApiResponse<void>> => {
    return apiClient.delete<void>(`/api/testimonials/${testimonialId}`);
  },

  /**
   * Send testimonial request to client
   *
   * @param data - Request data
   * @returns Send result
   */
  sendTestimonialRequest: async (data: {
    clientId: string;
    serviceId?: string;
    serviceName?: string;
    message?: string;
  }): Promise<ApiResponse<any>> => {
    return apiClient.post<any>('/api/testimonials/send-request', data);
  },
};
