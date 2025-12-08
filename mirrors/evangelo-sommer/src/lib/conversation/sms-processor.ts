/**
 * Robust SMS Processing Module - ConvoClean Logic Integration
 * 
 * This module implements the sophisticated SMS processing logic from the ConvoClean Python tool,
 * handling corrupted Excel/CSV exports with advanced data reconstruction capabilities.
 * 
 * Key Features:
 * - Multi-line timestamp reconstruction and normalization
 * - Smart speaker identification (handle "Me", contact names, phone numbers)
 * - Data corruption recovery for broken Excel rows
 * - Text cleaning with HTML/JSX quote escaping
 * - Conversation chronological sorting
 * - Message direction detection (sent/received)
 */

import { Message } from '../../types/client';

// Types for SMS processing
export interface RawSMSRow {
  type?: string;
  date?: string;
  sender?: string;
  content?: string;
  [key: string]: any;
}

export interface ProcessedSMSMessage {
  id: string;
  role: 'you' | 'client';
  content: string;
  timestamp: string;
  type: 'text';
  metadata: {
    originalSender?: string;
    originalType?: string;
    parseSuccess: boolean;
    confidence: number;
    reconstructed: boolean;
    originalRow?: number;
  };
}

export interface SMSProcessingResult {
  messages: ProcessedSMSMessage[];
  summary: {
    totalRows: number;
    processedMessages: number;
    skippedRows: number;
    reconstructedRows: number;
    confidenceAverage: number;
    dateParseSuccess: number;
  };
  errors: Array<{
    row: number;
    error: string;
    content?: string;
  }>;
}

export interface TimestampComponents {
  dayOfWeek?: string;
  month?: string;
  day?: string;
  year?: string;
  time?: string;
  period?: string;
  timezone?: string;
  raw: string[];
}

export interface SpeakerIdentity {
  name: string;
  role: 'you' | 'client';
  confidence: number;
  identifiers: string[];
}

export class SMSProcessor {
  private readonly USER_IDENTIFIERS = [
    'you', 'me', 'evan', 'myself', 'evangelo', 'sommer'
  ];
  
  private readonly CLIENT_IDENTIFIERS = [
    'mark', 'levy', 'mark levy', 'client'
  ];

  private readonly PHONE_PATTERNS = [
    /^\+1?\s*\(?(\d{3})\)?[-.\s]*(\d{3})[-.\s]*(\d{4})$/,
    /^(\d{10})$/,
    /^(\d{3})[-.\s](\d{3})[-.\s](\d{4})$/
  ];

  private readonly DATE_PATTERNS = {
    // Day of week patterns
    dayOfWeek: /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday),?\s*/i,
    
    // Month patterns  
    month: /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
    monthShort: /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i,
    
    // Day patterns
    day: /\b(\d{1,2}),?\s*/,
    
    // Year patterns
    year: /\b(20\d{2})\b/,
    
    // Time patterns
    time: /\b(\d{1,2}:\d{2}:?\d{0,2})\s*(a\.?m\.?|p\.?m\.?|am|pm)?\b/i,
    
    // Timezone patterns
    timezone: /\b(eastern|est|edt|et|utc|gmt)\b/i,
    
    // Complete timestamp patterns
    fullTimestamp: /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday),?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s*(20\d{2})?\s*(\d{1,2}:\d{2}:?\d{0,2})?\s*(a\.?m\.?|p\.?m\.?|am|pm)?\s*(eastern|est|edt|et)?\b/i
  };

  /**
   * Process SMS export data with advanced corruption recovery
   */
  async processSMSExport(rawData: RawSMSRow[]): Promise<SMSProcessingResult> {
    console.log('🔄 Starting robust SMS processing...');
    console.log(`📊 Input: ${rawData.length} raw rows`);

    const result: SMSProcessingResult = {
      messages: [],
      summary: {
        totalRows: rawData.length,
        processedMessages: 0,
        skippedRows: 0,
        reconstructedRows: 0,
        confidenceAverage: 0,
        dateParseSuccess: 0
      },
      errors: []
    };

    let rowIndex = 0;
    const confidenceScores: number[] = [];

    while (rowIndex < rawData.length) {
      try {
        const { message, rowsConsumed } = await this.processMessageBlock(rawData, rowIndex);
        
        if (message) {
          result.messages.push(message);
          confidenceScores.push(message.metadata.confidence);
          result.summary.processedMessages++;
          
          if (message.metadata.reconstructed) {
            result.summary.reconstructedRows++;
          }
          
          if (message.metadata.parseSuccess) {
            result.summary.dateParseSuccess++;
          }

          console.log(`✅ Message ${result.messages.length}: "${message.content.substring(0, 50)}..." (confidence: ${Math.round(message.metadata.confidence * 100)}%)`);
        } else {
          result.summary.skippedRows++;
        }
        
        rowIndex += rowsConsumed;
      } catch (error) {
        result.errors.push({
          row: rowIndex,
          error: error instanceof Error ? error.message : 'Unknown error',
          content: JSON.stringify(rawData[rowIndex])
        });
        result.summary.skippedRows++;
        rowIndex++;
      }
    }

    // Calculate summary statistics
    result.summary.confidenceAverage = confidenceScores.length > 0 
      ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length 
      : 0;

    // Sort messages chronologically
    result.messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    console.log(`🎯 SMS processing complete:`);
    console.log(`   📝 Processed: ${result.summary.processedMessages} messages`);
    console.log(`   🔧 Reconstructed: ${result.summary.reconstructedRows} corrupted rows`);
    console.log(`   ✅ Date parse success: ${result.summary.dateParseSuccess}/${result.summary.processedMessages}`);
    console.log(`   🎯 Average confidence: ${Math.round(result.summary.confidenceAverage * 100)}%`);
    console.log(`   ❌ Errors: ${result.errors.length}`);

    return result;
  }

  /**
   * Process a message block that may span multiple rows due to corruption
   */
  private async processMessageBlock(rawData: RawSMSRow[], startIndex: number): Promise<{
    message: ProcessedSMSMessage | null;
    rowsConsumed: number;
  }> {
    let endIndex = startIndex + 1;
    let messageType = '';
    let timestampComponents: string[] = [];
    let sender = '';
    let content = '';
    let reconstructed = false;

    // Examine up to 5 rows to reconstruct corrupted message
    const maxLookahead = Math.min(5, rawData.length - startIndex);
    
    for (let i = 0; i < maxLookahead; i++) {
      const currentIndex = startIndex + i;
      const row = rawData[currentIndex];
      
      if (!row) break;

      // Stop if we hit a clear message boundary (but not on first iteration)
      if (i > 0 && this.isMessageBoundary(row)) {
        break;
      }

      // Extract components from this row
      const extraction = this.extractRowComponents(row);
      
      if (extraction.messageType && !messageType) {
        messageType = extraction.messageType;
      }
      
      if (extraction.timestampComponents.length > 0) {
        timestampComponents.push(...extraction.timestampComponents);
      }
      
      if (extraction.sender && !sender) {
        sender = extraction.sender;
      }
      
      if (extraction.content) {
        content += (content ? ' ' : '') + extraction.content;
      }

      endIndex = currentIndex + 1;
      
      // Mark as reconstructed if we used more than one row
      if (i > 0) {
        reconstructed = true;
      }

      // Check if we have enough for a complete message
      if (this.hasCompleteMessage(messageType, timestampComponents, sender, content)) {
        break;
      }
    }

    // Try to create a valid message from collected components
    if (content.trim()) {
      const message = await this.constructMessage(
        messageType,
        timestampComponents, 
        sender,
        content,
        startIndex,
        reconstructed
      );
      
      return {
        message,
        rowsConsumed: endIndex - startIndex
      };
    }

    return {
      message: null,
      rowsConsumed: 1
    };
  }

  /**
   * Extract components from a single row, handling various field mappings
   */
  private extractRowComponents(row: RawSMSRow): {
    messageType: string;
    timestampComponents: string[];
    sender: string;
    content: string;
  } {
    const result = {
      messageType: '',
      timestampComponents: [] as string[],
      sender: '',
      content: ''
    };

    // Convert row to array of values for processing
    const values = Object.values(row).filter(v => v !== undefined && v !== null && v !== '');
    
    for (const value of values) {
      const stringValue = String(value).trim();
      
      if (!stringValue) continue;

      // Detect message type - handle variations like "Received Sent by: Mark Levy"
      if (/^sent$/i.test(stringValue)) {
        result.messageType = 'sent';
        console.log(`📤 Found SENT message type: "${stringValue}"`);
        continue;
      } else if (/^received/i.test(stringValue)) {
        result.messageType = 'received';
        console.log(`📥 Found RECEIVED message type: "${stringValue}"`);
        continue;
      }

      // Detect timestamp components
      if (this.isTimestampComponent(stringValue)) {
        result.timestampComponents.push(stringValue);
        continue;
      }

      // Detect sender
      if (this.isSenderIdentifier(stringValue) && !result.sender) {
        result.sender = stringValue;
        continue;
      }

      // Everything else is potentially content
      if (stringValue.length > 10 && !this.isTimestampComponent(stringValue)) {
        result.content = stringValue;
      }
    }

    return result;
  }

  /**
   * Check if a row represents a message boundary
   */
  private isMessageBoundary(row: RawSMSRow): boolean {
    const values = Object.values(row);
    const firstValue = values.find(v => v && String(v).trim());
    
    if (firstValue) {
      const stringValue = String(firstValue).trim().toLowerCase();
      return stringValue === 'sent' || stringValue === 'received';
    }
    
    return false;
  }

  /**
   * Check if we have enough components for a complete message
   */
  private hasCompleteMessage(
    messageType: string, 
    timestampComponents: string[], 
    sender: string, 
    content: string
  ): boolean {
    return !!(messageType && timestampComponents.length > 0 && content.trim().length > 5);
  }

  /**
   * Multi-line timestamp reconstruction and normalization
   * Handles patterns like:
   * "Monday, July 29,"
   * "2025"  
   * "2:10:11 p.m."
   * "Eastern Standard Time"
   */
  reconstructTimestamp(components: string[]): string | null {
    if (components.length === 0) return null;

    console.log('🕒 Reconstructing timestamp from components:', components);

    // Combine components and extract date parts
    const fullText = components.join(' ').replace(/\s+/g, ' ').trim();
    const timestampComponents: TimestampComponents = {
      raw: components
    };

    // Extract day of week
    const dayMatch = fullText.match(this.DATE_PATTERNS.dayOfWeek);
    if (dayMatch) {
      timestampComponents.dayOfWeek = dayMatch[1];
    }

    // Extract month
    const monthMatch = fullText.match(this.DATE_PATTERNS.month) || 
                      fullText.match(this.DATE_PATTERNS.monthShort);
    if (monthMatch) {
      timestampComponents.month = monthMatch[1];
    }

    // Extract day
    const dayNumMatch = fullText.match(this.DATE_PATTERNS.day);
    if (dayNumMatch) {
      timestampComponents.day = dayNumMatch[1];
    }

    // Extract year
    const yearMatch = fullText.match(this.DATE_PATTERNS.year);
    if (yearMatch) {
      timestampComponents.year = yearMatch[1];
    }

    // Extract time
    const timeMatch = fullText.match(this.DATE_PATTERNS.time);
    if (timeMatch) {
      timestampComponents.time = timeMatch[1];
      timestampComponents.period = timeMatch[2] || '';
    }

    // Extract timezone
    const timezoneMatch = fullText.match(this.DATE_PATTERNS.timezone);
    if (timezoneMatch) {
      timestampComponents.timezone = timezoneMatch[1];
    }

    // Attempt to construct ISO date
    try {
      const isoDate = this.constructISODate(timestampComponents);
      if (isoDate) {
        console.log('✅ Timestamp reconstructed:', isoDate);
        return isoDate;
      }
    } catch (error) {
      console.log('❌ Timestamp reconstruction failed:', error);
    }

    // Fallback to sequential timestamp
    console.log('⚠️ Using fallback timestamp');
    return this.generateFallbackTimestamp();
  }

  /**
   * Construct ISO date from extracted components
   */
  private constructISODate(components: TimestampComponents): string | null {
    if (!components.month || !components.day || !components.year) {
      return null;
    }

    // Month name to number mapping
    const monthMap: Record<string, number> = {
      'january': 0, 'jan': 0,
      'february': 1, 'feb': 1, 
      'march': 2, 'mar': 2,
      'april': 3, 'apr': 3,
      'may': 4,
      'june': 5, 'jun': 5,
      'july': 6, 'jul': 6,
      'august': 7, 'aug': 7,
      'september': 8, 'sep': 8,
      'october': 9, 'oct': 9,
      'november': 10, 'nov': 10,
      'december': 11, 'dec': 11
    };

    const monthNum = monthMap[components.month.toLowerCase()];
    if (monthNum === undefined) return null;

    const date = new Date();
    date.setFullYear(parseInt(components.year));
    date.setMonth(monthNum);
    date.setDate(parseInt(components.day));

    // Handle time if available
    if (components.time) {
      const timeMatch = components.time.match(/(\d{1,2}):(\d{2}):?(\d{0,2})/);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const seconds = timeMatch[3] ? parseInt(timeMatch[3]) : 0;

        // Handle AM/PM
        if (components.period) {
          const isPM = /p\.?m/i.test(components.period);
          if (isPM && hours < 12) hours += 12;
          if (!isPM && hours === 12) hours = 0;
        }

        date.setHours(hours, minutes, seconds, 0);
      }
    } else {
      // Default to noon if no time specified
      date.setHours(12, 0, 0, 0);
    }

    return date.toISOString();
  }

  /**
   * ConvoClean exact speaker identification algorithm
   * Implements the proven logic from convoclean_sms_fixed.py
   */
  identifySpeaker(originalType: string, sender: string): SpeakerIdentity {
    console.log(`🎯 ConvoClean Speaker ID - OriginalType: "${originalType}", Sender: "${sender}"`);
    
    // Sent messages = you
    if (originalType === 'Sent' || (originalType.includes('Sent') && !originalType.includes('Received'))) {
      console.log(`✅ ConvoClean: SENT message detected → role: "you", speaker: "Me"`);
      return {
        name: 'Me',
        role: 'you',
        confidence: 0.95,
        identifiers: ['convoclean:sent']
      };
    }
    
    // Received messages = client
    if (originalType.includes('Received Sent by:')) {
      const speaker = originalType.replace('Received Sent by:', '').trim();
      console.log(`✅ ConvoClean: RECEIVED with sender → role: "client", speaker: "${speaker}"`);
      return {
        name: speaker,
        role: 'client',
        confidence: 0.95,
        identifiers: ['convoclean:received_sent_by']
      };
    }
    
    if (originalType === 'Received' || originalType.includes('Received')) {
      // Extract clean speaker name from sender, default to Mark Levy
      let speaker = 'Mark Levy';
      if (sender && sender.includes('Mark Levy')) {
        speaker = 'Mark Levy';
      } else if (sender && !sender.match(/^\+?[\d\s\-\(\)]+$/)) {
        // If sender is not a phone number, use it as speaker name
        speaker = sender.trim();
      }
      
      console.log(`✅ ConvoClean: RECEIVED message → role: "client", speaker: "${speaker}"`);
      return {
        name: speaker,
        role: 'client',
        confidence: 0.95,
        identifiers: ['convoclean:received']
      };
    }
    
    // Fallback - default to client
    console.log(`⚠️ ConvoClean: Fallback used for originalType: "${originalType}"`);
    return {
      name: 'Mark Levy',
      role: 'client',
      confidence: 0.5,
      identifiers: ['convoclean:fallback']
    };
  }

  /**
   * Text cleaning with HTML/JSX quote escaping
   */
  cleanMessageContent(content: string): string {
    if (!content) return '';

    let cleaned = content.trim();

    // Remove leading/trailing quotes that might be from CSV formatting
    cleaned = cleaned.replace(/^["']|["']$/g, '');

    // Handle CSV escaped quotes
    cleaned = cleaned.replace(/""/g, '"');

    // Clean up whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // HTML/JSX escaping for quotes
    cleaned = cleaned.replace(/"/g, '&quot;');
    cleaned = cleaned.replace(/'/g, '&#x27;');

    // Remove any remaining control characters
    cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '');

    return cleaned;
  }

  /**
   * Check if a string contains timestamp components
   */
  private isTimestampComponent(text: string): boolean {
    const patterns = [
      this.DATE_PATTERNS.dayOfWeek,
      this.DATE_PATTERNS.month,
      this.DATE_PATTERNS.monthShort,
      this.DATE_PATTERNS.day,
      this.DATE_PATTERNS.year,
      this.DATE_PATTERNS.time,
      this.DATE_PATTERNS.timezone
    ];

    return patterns.some(pattern => pattern.test(text));
  }

  /**
   * Check if a string is a sender identifier
   */
  private isSenderIdentifier(text: string): boolean {
    const normalized = text.toLowerCase().trim();
    
    // Check known identifiers
    const allIdentifiers = [...this.USER_IDENTIFIERS, ...this.CLIENT_IDENTIFIERS];
    if (allIdentifiers.some(id => normalized.includes(id))) {
      return true;
    }

    // Check phone patterns
    return this.PHONE_PATTERNS.some(pattern => pattern.test(text));
  }

  /**
   * Construct a message from processed components
   */
  private async constructMessage(
    messageType: string,
    timestampComponents: string[],
    sender: string,
    content: string,
    originalRow: number,
    reconstructed: boolean
  ): Promise<ProcessedSMSMessage> {
    // Reconstruct timestamp
    const timestamp = this.reconstructTimestamp(timestampComponents);
    const parseSuccess = timestamp !== null && !timestamp.includes('fallback');

    // Identify speaker using ConvoClean algorithm
    const speakerIdentity = this.identifySpeaker(messageType, sender);

    // Clean content
    const cleanedContent = this.cleanMessageContent(content);

    // Calculate overall confidence
    const confidence = speakerIdentity.confidence * (parseSuccess ? 1 : 0.7) * (reconstructed ? 0.9 : 1);

    return {
      id: `sms_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      role: speakerIdentity.role,
      content: cleanedContent,
      timestamp: timestamp || this.generateFallbackTimestamp(),
      type: 'text',
      metadata: {
        originalSender: sender,
        originalType: messageType,
        parseSuccess,
        confidence,
        reconstructed,
        originalRow
      }
    };
  }

  /**
   * Generate fallback timestamp for unparseable dates
   */
  private generateFallbackTimestamp(): string {
    // Generate timestamps going backwards from recent date
    const baseDate = new Date('2025-08-16T20:44:26Z');
    const randomOffset = Math.random() * 30 * 24 * 60 * 60 * 1000; // Random within 30 days
    return new Date(baseDate.getTime() - randomOffset).toISOString();
  }
}

/**
 * Convert SMSProcessor results to standard Message format
 */
export function convertSMSToMessages(result: SMSProcessingResult): Message[] {
  return result.messages.map(smsMessage => ({
    id: smsMessage.id,
    role: smsMessage.role,
    content: smsMessage.content,
    timestamp: smsMessage.timestamp,
    type: smsMessage.type,
    metadata: {
      confidence: smsMessage.metadata.confidence,
      parseSuccess: smsMessage.metadata.parseSuccess,
      reconstructed: smsMessage.metadata.reconstructed,
      originalSender: smsMessage.metadata.originalSender,
      originalType: smsMessage.metadata.originalType
    } as any
  }));
}

// Export singleton instance
export const smsProcessor = new SMSProcessor();