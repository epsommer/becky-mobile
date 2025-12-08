/**
 * Utility functions for handling JSON fields in Prisma
 * The schema now uses Json fields instead of arrays for better compatibility
 */

// Helper to safely parse JSON fields
export function safeJsonParse<T>(jsonField: unknown, fallback: T): T {
  if (jsonField === null || jsonField === undefined) {
    return fallback;
  }
  
  if (typeof jsonField === 'string') {
    try {
      return JSON.parse(jsonField);
    } catch {
      return fallback;
    }
  }
  
  // If it's already parsed (which can happen with some Prisma configurations)
  if (typeof jsonField === 'object') {
    return jsonField as T;
  }
  
  return fallback;
}

// Helper to safely stringify for JSON fields
export function safeJsonStringify<T>(value: T): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

// Specific parsers for common field types
export const JsonFieldParsers = {
  // Parse string arrays (for tags, services, actionItems, etc.)
  parseStringArray: (jsonField: unknown): string[] => {
    return safeJsonParse(jsonField, [] as string[]);
  },

  // Parse contact preferences object
  parseContactPreferences: (jsonField: unknown) => {
    return safeJsonParse(jsonField, {
      preferredChannel: 'EMAIL',
      preferredTime: 'BUSINESS_HOURS',
      frequency: 'NORMAL'
    });
  },

  // Parse address object
  parseAddress: (jsonField: unknown) => {
    return safeJsonParse(jsonField, {
      street: '',
      city: '',
      province: '',
      postalCode: '',
      country: 'Canada'
    });
  },

  // Parse service metadata
  parseServiceMetadata: (jsonField: unknown) => {
    return safeJsonParse(jsonField, {});
  },

  // Parse notification data
  parseNotificationData: (jsonField: unknown) => {
    return safeJsonParse(jsonField, {
      scheduled: 0,
      lastScheduledAt: null
    });
  },

  // Parse recurrence data
  parseRecurrenceData: (jsonField: unknown) => {
    return safeJsonParse(jsonField, {
      pattern: 'NONE',
      interval: 1
    });
  }
};

// Serializers for storing data
export const JsonFieldSerializers = {
  // Serialize string arrays
  serializeStringArray: (array: string[]): string | undefined => {
    if (!array || !Array.isArray(array) || array.length === 0) {
      return undefined;
    }
    return safeJsonStringify(array) ?? undefined;
  },

  // Serialize contact preferences
  serializeContactPreferences: (prefs: any): string | undefined => {
    if (!prefs || typeof prefs !== 'object') {
      return undefined;
    }
    return safeJsonStringify(prefs) ?? undefined;
  },

  // Serialize address
  serializeAddress: (address: any): string | undefined => {
    if (!address || typeof address !== 'object') {
      return undefined;
    }
    return safeJsonStringify(address) ?? undefined;
  },

  // Serialize generic object
  serializeObject: (obj: any): string | undefined => {
    if (!obj || typeof obj !== 'object') {
      return undefined;
    }
    return safeJsonStringify(obj) ?? undefined;
  }
};

// Transform database records for API responses
export function transformClientRecordForResponse(client: any) {
  return {
    ...client,
    tags: JsonFieldParsers.parseStringArray(client.tags),
    serviceTypes: JsonFieldParsers.parseStringArray(client.serviceTypes),
    contactPreferences: JsonFieldParsers.parseContactPreferences(client.contactPreferences),
    address: JsonFieldParsers.parseAddress(client.address),
    metadata: JsonFieldParsers.parseServiceMetadata(client.metadata),
    personalInfo: safeJsonParse(client.personalInfo, {}),
    serviceProfile: safeJsonParse(client.serviceProfile, {}),
    billingInfo: safeJsonParse(client.billingInfo, {}),
    relationshipData: safeJsonParse(client.relationshipData, {})
  };
}

// Transform communication records
export function transformCommunicationForResponse(communication: any) {
  return {
    ...communication,
    actionItems: JsonFieldParsers.parseStringArray(communication.actionItems),
    attachments: JsonFieldParsers.parseStringArray(communication.attachments)
  };
}

// Transform conversation records
export function transformConversationForResponse(conversation: any) {
  return {
    ...conversation,
    nextActions: JsonFieldParsers.parseStringArray(conversation.nextActions),
    tags: JsonFieldParsers.parseStringArray(conversation.tags),
    participants: JsonFieldParsers.parseStringArray(conversation.participants),
    relatedDocuments: JsonFieldParsers.parseStringArray(conversation.relatedDocuments)
  };
}

// Transform follow-up records
export function transformFollowUpForResponse(followUp: any) {
  return {
    ...followUp,
    actionItems: JsonFieldParsers.parseStringArray(followUp.actionItems),
    recurrenceData: JsonFieldParsers.parseRecurrenceData(followUp.recurrenceData),
    notificationsSent: JsonFieldParsers.parseNotificationData(followUp.notificationsSent)
  };
}

// Transform participant records
export function transformParticipantForResponse(participant: any) {
  return {
    ...participant,
    services: JsonFieldParsers.parseStringArray(participant.services),
    contactPreferences: JsonFieldParsers.parseContactPreferences(participant.contactPreferences)
  };
}