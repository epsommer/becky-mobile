// src/types/claude.ts
export interface ClaudeRequest {
  text: string;
  businessId: string;
  documentType: DocumentType;
  customPrompt?: string;
  additionalData?: Record<string, unknown>;
}

export interface ClaudeResponse {
  content: string;
  business: string;
  type: string;
  timestamp: string;
}

export type DocumentType =
  | "blog-post"
  | "email"
  | "invoice"
  | "quote"
  | "receipt"
  | "proposal"
  | "custom";

export interface RecentActivity {
  type: string;
  business: string;
  timestamp: string;
  id?: string;
}

// Add proper Anthropic types
export interface AnthropicTextBlock {
  type: "text";
  text: string;
}

export interface AnthropicThinkingBlock {
  type: "thinking";
  content: string;
}

export type AnthropicContentBlock = AnthropicTextBlock | AnthropicThinkingBlock;
