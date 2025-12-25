/**
 * AI Draft Service - Re-export from lib/services for convenience
 *
 * This file follows the requested module structure from the requirements:
 * - ./services/aiDraft.ts - API service
 *
 * @module services/aiDraft
 */

export {
  AIDraftService,
  type MessageTone,
  type MessageType,
  type ContextMode,
  type ConversationMessage,
  type DraftRequest,
  type DraftResponse,
} from '../lib/services/AIDraftService';

export {
  aiApi,
  type ClientContext,
  type DraftMessageRequest,
  type DraftMessageResponse,
  type AnalyzeContextRequest,
  type AnalyzeContextResponse,
  type ContextRequestType,
} from '../lib/api/endpoints';
