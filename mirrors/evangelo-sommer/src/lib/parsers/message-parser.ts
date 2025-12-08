// src/lib/parsers/message-parser.ts

interface ParsingContext {
  clientName: string;
  userName: string;
  timezone?: string;
}

interface SenderDetection {
  sender: "you" | "client" | "unknown";
  confidence: number;
  reason: string;
}

interface ParsedMessage {
  content: string;
  sender: "you" | "client" | "unknown";
  timestamp: string | null;
  confidence: number;
  type: "email" | "text" | "call-notes" | "meeting-notes";
  metadata?: {
    subject?: string;
    attachments?: string[];
    emailAddress?: string;
    phoneNumber?: string;
  };
}

export class MessageParser {
  private static readonly EMAIL_PATTERNS = {
    header: /^(?:From|To|Date|Subject):\s+(.+)$/i,
    fromHeader: /^From:\s+(.+)$/i,
    toHeader: /^To:\s+(.+)$/i,
    dateHeader: /^Date:\s+(.+)$/i,
    subjectHeader: /^Subject:\s+(.+)$/i,
    emailAddress:
      /<([^>]+)>|\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/,
  };

  private static readonly TEXT_PATTERNS = {
    timestamp: /\[?(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)\]?/,
    sender: /^([^:]+):/,
    datePrefix: /^(?:Today|Yesterday|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s+/i,
  };

  static parseEmailThread(
    text: string,
    context: ParsingContext,
  ): ParsedMessage[] {
    const messages: ParsedMessage[] = [];
    const lines = text.split("\n");
    let currentMessage: Partial<ParsedMessage> = {};
    let currentContent: string[] = [];
    let inHeaders = true;

    for (let line of lines) {
      line = line.trim();

      if (!line && !inHeaders && currentContent.length > 0) {
        // Save current message and start new one
        if (currentContent.length > 0) {
          messages.push({
            content: currentContent.join("\n").trim(),
            sender: currentMessage.sender || "unknown",
            timestamp: currentMessage.timestamp || null,
            confidence: currentMessage.confidence || 0.5,
            type: "email",
            metadata: currentMessage.metadata,
          } as ParsedMessage);
        }
        currentMessage = {};
        currentContent = [];
        inHeaders = true;
        continue;
      }

      if (inHeaders) {
        const headerMatch = line.match(this.EMAIL_PATTERNS.header);
        if (headerMatch) {
          const headerValue = headerMatch[1];
          if (line.match(this.EMAIL_PATTERNS.fromHeader)) {
            const senderDetection = this.detectSender(headerValue, context);
            currentMessage.sender = senderDetection.sender;
            currentMessage.confidence = senderDetection.confidence;
          } else if (line.match(this.EMAIL_PATTERNS.dateHeader)) {
            currentMessage.timestamp = this.extractTimestamp(headerValue);
          } else if (line.match(this.EMAIL_PATTERNS.subjectHeader)) {
            currentMessage.metadata = {
              ...currentMessage.metadata,
              subject: headerValue,
            };
          }
          continue;
        } else if (line) {
          inHeaders = false;
        }
      }

      if (!inHeaders && line) {
        currentContent.push(line);
      }
    }

    // Add final message
    if (currentContent.length > 0) {
      messages.push({
        content: currentContent.join("\n").trim(),
        sender: currentMessage.sender || "unknown",
        timestamp: currentMessage.timestamp || null,
        confidence: currentMessage.confidence || 0.5,
        type: "email",
        metadata: currentMessage.metadata,
      } as ParsedMessage);
    }

    return messages;
  }

  static parseTextMessages(
    text: string,
    context: ParsingContext,
  ): ParsedMessage[] {
    const messages: ParsedMessage[] = [];
    const lines = text.split("\n");
    let currentMessage: string[] = [];
    let currentSender: "you" | "client" | "unknown" = "unknown";
    let currentTimestamp: string | null = null;

    for (let line of lines) {
      line = line.trim();
      if (!line) {
        if (currentMessage.length > 0) {
          messages.push({
            content: currentMessage.join("\n").trim(),
            sender: currentSender,
            timestamp: currentTimestamp,
            confidence: 0.8,
            type: "text",
          });
          currentMessage = [];
          currentSender = "unknown";
          currentTimestamp = null;
        }
        continue;
      }

      // Check for new message pattern: "Sender: Message"
      const senderMatch = line.match(this.TEXT_PATTERNS.sender);
      if (senderMatch) {
        // Save previous message if exists
        if (currentMessage.length > 0) {
          messages.push({
            content: currentMessage.join("\n").trim(),
            sender: currentSender,
            timestamp: currentTimestamp,
            confidence: 0.8,
            type: "text",
          });
          currentMessage = [];
        }

        // Process new message
        const senderName = senderMatch[1].trim();
        const senderDetection = this.detectSender(senderName, context);
        currentSender = senderDetection.sender;

        // Extract timestamp if present
        const timestampMatch = line.match(this.TEXT_PATTERNS.timestamp);
        if (timestampMatch) {
          currentTimestamp = timestampMatch[1];
        }

        // Add message content without sender prefix
        const content = line.replace(senderMatch[0], "").trim();
        if (content) {
          currentMessage.push(content);
        }
      } else {
        currentMessage.push(line);
      }
    }

    // Add final message if exists
    if (currentMessage.length > 0) {
      messages.push({
        content: currentMessage.join("\n").trim(),
        sender: currentSender,
        timestamp: currentTimestamp,
        confidence: 0.8,
        type: "text",
      });
    }

    return messages;
  }

  static detectSender(text: string, context: ParsingContext): SenderDetection {
    text = text.toLowerCase();
    const { clientName, userName } = context;

    // Direct matches
    if (
      text.includes("you:") ||
      text.includes("me:") ||
      text.includes(userName.toLowerCase())
    ) {
      return {
        sender: "you",
        confidence: 0.9,
        reason: "Direct match with user indicators",
      };
    }

    if (text.includes("client:") || text.includes(clientName.toLowerCase())) {
      return {
        sender: "client",
        confidence: 0.9,
        reason: "Direct match with client indicators",
      };
    }

    // Email pattern matching
    const emailMatch = text.match(this.EMAIL_PATTERNS.emailAddress);
    if (emailMatch) {
      const email = emailMatch[1] || emailMatch[2];
      if (
        email.includes("client") ||
        email.includes(clientName.toLowerCase())
      ) {
        return {
          sender: "client",
          confidence: 0.8,
          reason: "Email pattern match with client",
        };
      }
    }

    // Contextual clues
    if (text.includes("wrote:") || text.includes("says:")) {
      if (text.includes(clientName.toLowerCase())) {
        return {
          sender: "client",
          confidence: 0.7,
          reason: "Contextual match with client name",
        };
      }
      if (text.includes("i wrote") || text.includes("i said")) {
        return {
          sender: "you",
          confidence: 0.7,
          reason: "First person contextual match",
        };
      }
    }

    return {
      sender: "unknown",
      confidence: 0.3,
      reason: "No clear sender indicators",
    };
  }

  static extractTimestamp(text: string): string | null {
    // Try parsing as ISO date first
    const date = new Date(text);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }

    // Try common date formats
    const patterns = [
      // MM/DD/YYYY HH:MM
      /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])?/,
      // YYYY-MM-DD HH:MM
      /(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/,
      // Today/Yesterday HH:MM
      /(Today|Yesterday)\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])?/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          let timestamp;
          if (match[1].toLowerCase() === "today") {
            timestamp = new Date();
          } else if (match[1].toLowerCase() === "yesterday") {
            timestamp = new Date();
            timestamp.setDate(timestamp.getDate() - 1);
          } else {
            // Handle numeric dates
            const [, month, day, year] = match;
            timestamp = new Date(`${year}-${month}-${day}`);
          }
          return timestamp.toISOString();
        } catch {
          continue;
        }
      }
    }

    return null;
  }

  static cleanMessageContent(text: string): string {
    return text
      .replace(/^[>]+/gm, "") // Remove quote markers
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[EMAIL]") // Redact emails
      .replace(/\b\d{10,}\b/g, "[PHONE]") // Redact phone numbers
      .trim();
  }

  static detectFormat(text: string): "email" | "text" | "unknown" {
    const lines = text.split("\n");
    let emailHeaderCount = 0;
    let textMessageCount = 0;

    for (const line of lines) {
      if (this.EMAIL_PATTERNS.header.test(line)) {
        emailHeaderCount++;
      }
      if (this.TEXT_PATTERNS.sender.test(line)) {
        textMessageCount++;
      }
    }

    if (emailHeaderCount > 1) return "email";
    if (textMessageCount > 1) return "text";
    return "unknown";
  }
}
