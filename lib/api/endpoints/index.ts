/**
 * API endpoint modules
 * @module lib/api/endpoints
 */

export { clientsApi } from './clients';
export { conversationsApi } from './conversations';
export { eventsApi } from './events';
export type { RecurringDeleteOption } from './events';
export { billingApi } from './billing';
export { testimonialsApi } from './testimonials';
export { participantsApi } from './participants';
export { calendarIntegrationsApi } from './calendar-integrations';
export type { CalendarIntegration, CalendarSyncResult } from './calendar-integrations';
export { aiApi } from './ai';
export type {
  MessageTone,
  MessageType,
  ContextRequestType,
  ConversationMessage as AIConversationMessage,
  ClientContext,
  DraftMessageRequest,
  DraftMessageResponse,
  AnalyzeContextRequest,
  AnalyzeContextResponse,
} from './ai';
export { analyticsApi } from './analytics';
export type {
  DateRangeType,
  AnalyticsDateRange,
  RevenueDataPoint,
  RevenueByServiceLine,
  RevenueAnalytics,
  ClientAnalytics,
  ActivityMetrics,
  OutstandingBilling,
  DashboardAnalytics,
  KPISummary,
} from './analytics';

// Re-export API client and types for convenience
export { apiClient } from '../client';
export type { ApiResponse } from '../types';
