// src/types/excel-import.ts

export interface ExcelParseResult {
  success: boolean;
  data?: Record<string, unknown>[];
  headers?: string[];
  filename: string;
  error?: string;
}

export interface MessageRow {
  Type: "Sent" | "Received";
  Date: string;
  "Name / Number": string;
  Content: string;
}

export interface UserInfo {
  name: string;
  phone: string;
  email?: string;
}

export interface ClientInfo {
  name: string;
  phone: string;
  email?: string;
  contact: string; // original contact string from export
}

export interface SenderNormalizationConfig {
  userName: string;
  userPhone: string;
  userEmail?: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
}

export interface NormalizedMessage {
  content: string;
  timestamp: string;
  sender: "you" | "client";
  senderName: string;
  senderContact: string;
  recipientName: string;
  recipientContact: string;
  type: "text";
  metadata: {
    originalType: "Sent" | "Received";
    originalNameNumber: string;
    direction: "outgoing" | "incoming";
    originalTimestamp?: unknown;
    parseSuccess?: boolean;
    rowIndex?: number;
  };
}

export interface ImportedConversation {
  title: string;
  messages: Array<{
    id: string;
    role: "you" | "client";
    content: string;
    timestamp: string;
    type: "text";
    metadata: {
      senderName: string;
      senderContact: string;
      recipientName: string;
      recipientContact: string;
      originalData: {
        originalType: "Sent" | "Received";
        originalNameNumber: string;
        direction: "outgoing" | "incoming";
        originalTimestamp?: unknown;
        parseSuccess?: boolean;
        rowIndex?: number;
      };
    };
  }>;
  metadata: {
    participantName: string;
    participantContact: string;
    userInfo: UserInfo;
    importedFrom: "text_message_export";
    messageCount: number;
    dateRange: {
      start: string;
      end: string;
    };
  };
}

export interface ExcelImportState {
  step: "upload" | "user-info" | "date-validation" | "preview";
  file: File | null;
  excelData: MessageRow[];
  userInfo: UserInfo | null;
  clientInfo: Partial<ClientInfo>;
  normalizedMessages: NormalizedMessage[];
  previewConversation: ImportedConversation | null;
  needsDateValidation?: boolean;
  processedMessages?: unknown[];
}
