// src/lib/crm-integration.ts
import { Anthropic } from "@anthropic-ai/sdk";
import ExcelJS from "exceljs";
import {
  CRMIntegrationRequest,
  CRMIntegrationOutput,
  CRMProcessingResult,
  SMSConversationData,
  CRMValidationResult,
  ClaudeCRMResponse,
  ProcessingMetadata,
} from "../types/crm-integration";
import { ImportedConversation } from "../types/excel-import";

// Anthropic client will be initialized only when needed (server-side)
let anthropic: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropic) {
    if (typeof window !== 'undefined') {
      throw new Error('Anthropic client cannot be initialized on the client side');
    }
    anthropic = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY!,
    });
  }
  return anthropic;
}

// Main CRM Integration Prompt
const CRM_INTEGRATION_PROMPT = `
You are a CRM integration specialist for a landscaping business. Convert SMS conversation data into structured CRM records.

TASK: Parse SMS conversations and create comprehensive CRM-ready data structures.

INPUT DATA FORMAT:
- SMS conversations between landscaping service provider and clients
- Mixed sent/received messages in chronological order
- Client and service provider contact information

OUTPUT REQUIREMENTS:

1. CLIENT RECORDS:
{
  "clients": [
    {
      "client_id": "auto_generated_unique_id",
      "personal_info": {
        "name": "extracted_from_conversation",
        "phone": "normalized_phone_number",
        "email": "extracted_if_mentioned",
        "preferred_contact": "sms|email|phone"
      },
      "service_profile": {
        "service_types": ["lawn_care", "snow_removal", "landscaping", "maintenance", "emergency"],
        "property_details": "extracted_property_info",
        "service_frequency": "weekly|monthly|seasonal|one_time|as_needed",
        "special_requirements": ["access_notes", "pet_considerations", "equipment_notes"]
      },
      "billing_info": {
        "payment_method": "extracted_if_mentioned",
        "receipt_preference": "email|paper|text",
        "billing_address": "if_different_from_service"
      },
      "relationship_data": {
        "client_since": "first_contact_date",
        "last_contact": "most_recent_message",
        "communication_style": "professional|casual|detailed|brief",
        "satisfaction_indicators": ["positive|neutral|negative"]
      }
    }
  ]
}

2. SERVICE RECORDS:
{
  "service_history": [
    {
      "service_id": "auto_generated",
      "client_id": "linked_to_client",
      "service_date": "extracted_from_conversation",
      "service_type": "lawn_care|landscaping|maintenance|snow_removal|emergency",
      "service_area": "extracted_area_details",
      "completion_status": "completed|scheduled|cancelled|pending",
      "notes": "special_instructions_or_modifications",
      "follow_up_needed": true/false
    }
  ]
}

3. COMMUNICATION LOG:
{
  "communications": [
    {
      "comm_id": "auto_generated",
      "client_id": "linked_to_client",
      "timestamp": "parsed_datetime_ISO8601",
      "direction": "inbound|outbound",
      "channel": "sms",
      "content": "message_content",
      "purpose": "scheduling|service_update|billing|general|complaint|followup",
      "action_items": ["extracted_tasks"],
      "sentiment": "positive|neutral|negative"
    }
  ]
}

4. BUSINESS INSIGHTS:
{
  "insights": {
    "lead_quality_score": 1-10,
    "client_lifetime_value_indicator": "high|medium|low",
    "referral_potential": 1-10,
    "upsell_opportunities": ["service_expansions"],
    "retention_risk": "low|medium|high",
    "next_action_priority": "immediate|this_week|this_month|low_priority"
  }
}

INTEGRATION RULES:

1. PHONE NUMBER NORMALIZATION:
   - Convert all phone formats to: +1XXXXXXXXXX
   - Remove spaces, dashes, parentheses
   - Ensure consistent formatting

2. DATE/TIME PARSING:
   - Convert all timestamps to ISO 8601 format
   - Handle timezone (Eastern Time default)
   - Sort chronologically

3. SERVICE CLASSIFICATION:
   - lawn_care: mowing, trimming, grass cutting, edging
   - landscaping: design, planting, hardscaping, gardens
   - maintenance: cleanup, pruning, seasonal work, weeding
   - snow_removal: plowing, salting, ice management, shoveling
   - emergency: storm cleanup, urgent repairs, damage assessment

4. SENTIMENT ANALYSIS:
   - Positive: satisfaction, thanks, compliments, recommendations
   - Neutral: factual exchanges, scheduling, confirmations
   - Negative: complaints, delays, issues, dissatisfaction

5. ACTION ITEM EXTRACTION:
   - Schedule changes or new appointments
   - Service modifications or special requests
   - Billing/payment setup requirements
   - Follow-up communications needed
   - Property access or constraint updates

6. RELATIONSHIP SCORING:
   - Communication responsiveness (1-10)
   - Service adaptability acceptance (1-10)
   - Payment reliability indicators
   - Referral potential based on satisfaction
   - Retention risk based on communication patterns

LANDSCAPING BUSINESS CONTEXT:
- Focus on seasonal service patterns (spring cleanup, summer maintenance, fall cleanup, winter snow removal)
- Note property access constraints (gates, dogs, parking)
- Track equipment/material requirements
- Identify weather-dependent scheduling flexibility
- Monitor client communication preferences and response times
- Flag upsell opportunities (add snow service to lawn care clients, etc.)
- Assess client satisfaction through language and response patterns

OUTPUT FORMAT: Valid JSON ready for direct CRM database import.

CRITICAL REQUIREMENTS:
- Generate unique, consistent IDs for all records
- Link all records properly (client_id references)
- Extract actionable business intelligence
- Normalize all contact information
- Classify all services accurately
- Identify genuine business opportunities
- Flag clients needing immediate attention
- Ensure data is ready for automated workflows

Process the SMS conversation data and return complete CRM integration records.
`;

export class CRMIntegrationService {
  /**
   * Get Anthropic client instance (server-side only)
   */
  private getAnthropicClient(): Anthropic {
    return getAnthropicClient();
  }

  /**
   * Main entry point for CRM integration
   */
  async integrateSMSDataToCRM(
    request: CRMIntegrationRequest,
  ): Promise<CRMProcessingResult> {
    const startTime = Date.now();

    try {
      let conversationData: SMSConversationData;

      // Handle different input types
      if (request.excelFile) {
        conversationData = await this.parseExcelToConversationData(
          request.excelFile,
        );
      } else if (request.conversationData) {
        conversationData = request.conversationData;
      } else {
        throw new Error("No input data provided");
      }

      // Process with Claude API
      const claudeResponse = await this.processWithClaude(
        conversationData,
        request.customPrompt,
      );

      // Validate the response
      const validationResult = this.validateCRMData(claudeResponse);
      if (!validationResult.isValid) {
        throw new Error(
          `Data validation failed: ${validationResult.errors.map((e) => e.message).join(", ")}`,
        );
      }

      // Process and enhance the data
      const processedData = this.enhanceCRMData(claudeResponse);

      const processingTime = Date.now() - startTime;
      const metadata: ProcessingMetadata = {
        processedAt: new Date().toISOString(),
        messagesProcessed: conversationData.messages.length,
        clientsIdentified: processedData.clients.length,
        servicesDetected: processedData.service_history.length,
        communicationsLogged: processedData.communications.length,
        processingTimeMs: processingTime,
        confidence: this.calculateConfidenceScore(
          processedData,
          conversationData,
        ),
      };

      return {
        success: true,
        data: processedData,
        metadata,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        metadata: {
          processedAt: new Date().toISOString(),
          messagesProcessed: 0,
          clientsIdentified: 0,
          servicesDetected: 0,
          communicationsLogged: 0,
          processingTimeMs: processingTime,
          confidence: 0,
        },
      };
    }
  }

  /**
   * Process conversation data with Claude API
   */
  private async processWithClaude(
    conversationData: SMSConversationData,
    customPrompt?: string,
  ): Promise<ClaudeCRMResponse> {
    const prompt = this.buildCRMPrompt(conversationData, customPrompt);

    const anthropicClient = this.getAnthropicClient();
    const response = await anthropicClient.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Extract text content
    let textContent = "";
    for (const block of response.content) {
      if (block.type === "text") {
        textContent += block.text;
      }
    }

    if (!textContent) {
      throw new Error("No response received from Claude API");
    }

    // Parse JSON response
    try {
      const cleanedContent = this.cleanJSONResponse(textContent);
      return JSON.parse(cleanedContent) as ClaudeCRMResponse;
    } catch (parseError) {
      throw new Error(`Failed to parse Claude response as JSON: ${parseError}`);
    }
  }

  /**
   * Build the complete prompt for Claude
   */
  private buildCRMPrompt(
    conversationData: SMSConversationData,
    customPrompt?: string,
  ): string {
    const conversationSummary = this.buildConversationSummary(conversationData);

    let prompt = CRM_INTEGRATION_PROMPT;

    if (customPrompt) {
      prompt += `\n\nADDITIONAL INSTRUCTIONS:\n${customPrompt}`;
    }

    prompt += `\n\nCONVERSATION DATA TO PROCESS:\n\n${conversationSummary}`;

    return prompt;
  }

  /**
   * Build a structured summary of the conversation for Claude
   */
  private buildConversationSummary(
    conversationData: SMSConversationData,
  ): string {
    const { messages, participants, metadata } = conversationData;

    let summary = "=== SMS CONVERSATION DATA ===\n\n";

    // Participants info
    summary += "PARTICIPANTS:\n";
    participants.forEach((p) => {
      summary += `- ${p.name} (${p.role}): ${p.phone}${p.email ? `, ${p.email}` : ""}\n`;
    });

    // Metadata
    summary += `\nMETADATA:\n`;
    summary += `- Date Range: ${metadata.dateRange.start} to ${metadata.dateRange.end}\n`;
    summary += `- Total Messages: ${metadata.totalMessages}\n`;
    summary += `- Import Source: ${metadata.importSource}\n`;
    if (metadata.businessContext) {
      summary += `- Business Context: ${metadata.businessContext}\n`;
    }

    // Messages
    summary += `\nMESSAGES (chronological order):\n`;
    messages.forEach((msg, index) => {
      const participant = participants.find(
        (p) => p.phone === msg.sender || p.id === msg.sender,
      );
      const participantName = participant ? participant.name : msg.sender;

      summary += `${index + 1}. [${msg.timestamp}] ${participantName} (${msg.direction}):\n`;
      summary += `   "${msg.content}"\n\n`;
    });

    return summary;
  }

  /**
   * Parse Excel file to conversation data format
   */
  private async parseExcelToConversationData(
    file: File,
  ): Promise<SMSConversationData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          if (!arrayBuffer) {
            throw new Error("Failed to read file into ArrayBuffer.");
          }
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(arrayBuffer);
          const worksheet = workbook.worksheets[0];
          if (!worksheet) {
            throw new Error("No worksheet found in the Excel file.");
          }

          const jsonData: Record<string, unknown>[] = [];
          const headers = (worksheet.getRow(1).values as string[]).slice(1); // Get headers from the first row
          worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber > 1) { // Skip header row
              const rowData: Record<string, unknown> = {};
              row.eachCell((cell, colNumber) => {
                rowData[headers[colNumber - 1]] = cell.value;
              });
              jsonData.push(rowData);
            }
          });
          
          const conversationData =
            this.convertExcelDataToConversationFormat(jsonData);
          resolve(conversationData);
        } catch (error) {
          reject(new Error(`Failed to parse Excel file: ${error}`));
        }
      };

      reader.onerror = () => reject(new Error("Failed to read Excel file"));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Convert raw Excel data to conversation format
   */
  private convertExcelDataToConversationFormat(
    excelData: Record<string, unknown>[],
  ): SMSConversationData {
    const messages: {
      id: string;
      content: string;
      timestamp: string;
      direction: "inbound" | "outbound";
      sender: string;
      recipient: string;
      type: "sms";
      rawData: {
        originalType: 'Sent' | 'Received';
        originalNameNumber: string;
        rowIndex: number;
      };
    }[] = [];
    const participantMap = new Map();
    let earliestDate = new Date();
    let latestDate = new Date(0);

    excelData.forEach((row, index) => {
      const content = row.Content as string;
      const type = row.Type as string;
      const date = row.Date as string | number | Date;
      const nameNumber = row["Name / Number"] as string;

      if (!content || !type || !date) return;

      const timestamp = new Date(date).toISOString();
      const messageDate = new Date(timestamp);

      if (messageDate < earliestDate) earliestDate = messageDate;
      if (messageDate > latestDate) latestDate = messageDate;

      const phoneMatch = (nameNumber || "").match(/[\d\-\(\)\s\+]+/);
      const phone = phoneMatch ? this.normalizePhoneNumber(phoneMatch[0]) : "";
      const name = (nameNumber || "").replace(/[\d\-\(\)\s\+]/g, "").trim();

      if (phone && !participantMap.has(phone)) {
        participantMap.set(phone, {
          id: phone,
          name: name || "Unknown",
          phone: phone,
          role: "client",
        });
      }

      messages.push({
        id: `msg_${index}`,
        content: content,
        timestamp: timestamp,
        direction: type.toLowerCase() === "sent" ? "outbound" : "inbound",
        sender: type.toLowerCase() === "sent" ? "service_provider" : phone,
        recipient: type.toLowerCase() === "sent" ? phone : "service_provider",
        type: "sms",
        rawData: {
          originalType: (type as string).toLowerCase() === 'sent' ? 'Sent' : 'Received',
          originalNameNumber: nameNumber,
          rowIndex: index,
        },
      });
    });

    // Add service provider as participant
    if (!participantMap.has("service_provider")) {
      participantMap.set("service_provider", {
        id: "service_provider",
        name: "Service Provider",
        phone: "",
        role: "service_provider",
      });
    }

    return {
      messages: messages.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      ),
      participants: Array.from(participantMap.values()),
      metadata: {
        dateRange: {
          start: earliestDate.toISOString(),
          end: latestDate.toISOString(),
        },
        totalMessages: messages.length,
        importSource: "excel_export",
      },
    };
  }

  /**
   * Validate CRM data structure
   */
  private validateCRMData(data: ClaudeCRMResponse): CRMValidationResult {
    const errors: {
      field: string;
      message: string;
      severity: "error" | "warning";
    }[] = [];
    const warnings: { field: string; message: string }[] = [];

    // Validate clients
    if (!data.clients || !Array.isArray(data.clients)) {
      errors.push({
        field: "clients",
        message: "Clients array is required",
        severity: "error",
      });
    } else {
      data.clients.forEach((client, index) => {
        if (!client.client_id) {
          errors.push({
            field: `clients[${index}].client_id`,
            message: "Client ID is required",
            severity: "error",
          });
        }
        if (!client.personal_info?.name) {
          errors.push({
            field: `clients[${index}].personal_info.name`,
            message: "Client name is required",
            severity: "error",
          });
        }
        if (!client.personal_info?.phone) {
          warnings.push({
            field: `clients[${index}].personal_info.phone`,
            message: "Client phone is recommended",
          });
        }
      });
    }

    // Validate service history
    if (data.service_history && Array.isArray(data.service_history)) {
      data.service_history.forEach((service, index) => {
        if (!service.client_id) {
          errors.push({
            field: `service_history[${index}].client_id`,
            message: "Client ID is required for service records",
            severity: "error",
          });
        }
        if (!service.service_type) {
          errors.push({
            field: `service_history[${index}].service_type`,
            message: "Service type is required",
            severity: "error",
          });
        }
      });
    }

    // Validate communications
    if (data.communications && Array.isArray(data.communications)) {
      data.communications.forEach((comm, index) => {
        if (!comm.client_id) {
          errors.push({
            field: `communications[${index}].client_id`,
            message: "Client ID is required for communication records",
            severity: "error",
          });
        }
        if (!comm.content) {
          warnings.push({
            field: `communications[${index}].content`,
            message: "Communication content is empty",
          });
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Enhance CRM data with additional processing
   */
  private enhanceCRMData(claudeData: ClaudeCRMResponse): CRMIntegrationOutput {
    // Normalize phone numbers in all records
    const clients = claudeData.clients.map((client) => ({
      ...client,
      personal_info: {
        ...client.personal_info,
        phone: this.normalizePhoneNumber(client.personal_info.phone),
      },
    }));

    // Enhance service records with additional metadata
    const service_history = claudeData.service_history.map((service) => ({
      ...service,
      service_id:
        service.service_id ||
        `service_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }));

    // Enhance communication records
    const communications = claudeData.communications.map((comm) => ({
      ...comm,
      comm_id:
        comm.comm_id ||
        `comm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }));

    return {
      clients,
      service_history,
      communications,
      insights: claudeData.insights,
    };
  }

  /**
   * Calculate confidence score for the processing results
   */
  private calculateConfidenceScore(
    processedData: CRMIntegrationOutput,
    originalData: SMSConversationData,
  ): number {
    let score = 0;
    let factors = 0;

    // Factor 1: Message coverage (did we process most messages?)
    if (originalData.messages.length > 0) {
      const communicationCoverage =
        processedData.communications.length / originalData.messages.length;
      score += Math.min(communicationCoverage, 1) * 30;
      factors += 30;
    }

    // Factor 2: Client identification
    if (processedData.clients.length > 0) {
      score += 25;
    }
    factors += 25;

    // Factor 3: Service detection
    if (processedData.service_history.length > 0) {
      score += 20;
    }
    factors += 20;

    // Factor 4: Data completeness
    const hasCompleteClientData = processedData.clients.every(
      (c) => c.personal_info.name && c.personal_info.phone,
    );
    if (hasCompleteClientData) {
      score += 15;
    }
    factors += 15;

    // Factor 5: Business insights quality
    if (processedData.insights.lead_quality_score > 0) {
      score += 10;
    }
    factors += 10;

    return factors > 0 ? Math.round((score / factors) * 100) / 10 : 0;
  }

  /**
   * Normalize phone number format
   */
  private normalizePhoneNumber(phone: string): string {
    if (!phone) return "";

    // Remove all non-digits
    const digits = phone.replace(/\D/g, "");

    // Handle North American numbers
    if (digits.length === 10) {
      return `+1${digits}`;
    } else if (digits.length === 11 && digits.startsWith("1")) {
      return `+${digits}`;
    }

    return phone; // Return original if we can't normalize
  }

  /**
   * Clean JSON response from Claude (remove markdown formatting, etc.)
   */
  private cleanJSONResponse(response: string): string {
    // Remove markdown code blocks
    let cleaned = response.replace(/```json\s*/gi, "").replace(/```\s*$/gi, "");

    // Remove any leading/trailing whitespace
    cleaned = cleaned.trim();

    // Try to find JSON object boundaries
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");

    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
    }

    return cleaned;
  }

  /**
   * Convert ImportedConversation to SMSConversationData format
   */
  convertImportedConversationToCRM(
    conversation: ImportedConversation,
  ): SMSConversationData {
    const messages = conversation.messages.map((msg) => ({
      id: msg.id,
      content: msg.content,
      timestamp: msg.timestamp,
      direction:
        msg.role === "you" ? ("outbound" as const) : ("inbound" as const),
      sender:
        msg.role === "you"
          ? "service_provider"
          : conversation.metadata.participantContact,
      recipient:
        msg.role === "you"
          ? conversation.metadata.participantContact
          : "service_provider",
      type: "sms" as const,
      rawData: msg.metadata.originalData,
    }));

    const participants = [
      {
        id: "service_provider",
        name: conversation.metadata.userInfo.name,
        phone: conversation.metadata.userInfo.phone,
        email: conversation.metadata.userInfo.email,
        role: "service_provider" as const,
      },
      {
        id: conversation.metadata.participantContact,
        name: conversation.metadata.participantName,
        phone: conversation.metadata.participantContact,
        role: "client" as const,
      },
    ];

    return {
      messages,
      participants,
      metadata: {
        dateRange: conversation.metadata.dateRange,
        totalMessages: conversation.metadata.messageCount,
        importSource: "excel_export",
        businessContext: "landscaping",
      },
    };
  }
}

// Export singleton instance
export const crmIntegrationService = new CRMIntegrationService();

// Utility functions for external use
export async function integrateSMSDataToCRM(
  request: CRMIntegrationRequest,
): Promise<CRMProcessingResult> {
  return crmIntegrationService.integrateSMSDataToCRM(request);
}

export function convertImportedConversationToCRM(
  conversation: ImportedConversation,
): SMSConversationData {
  return crmIntegrationService.convertImportedConversationToCRM(conversation);
}
