/**
 * API endpoint modules
 * @module lib/api/endpoints
 */

export { clientsApi } from './clients';
export { conversationsApi } from './conversations';
export { eventsApi } from './events';
export { billingApi } from './billing';
export { testimonialsApi } from './testimonials';
export { participantsApi } from './participants';

// Re-export API client and types for convenience
export { apiClient } from '../client';
export type { ApiResponse } from '../types';
