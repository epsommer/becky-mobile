// Service Detection Utilities
// Analyzes conversation content to extract service mentions and mappings

import { ServiceType } from '@prisma/client';

// Service keyword patterns for detection
export interface ServicePattern {
  keywords: string[];
  variations: string[];
  contextClues: string[];
  serviceType: ServiceType;
  confidence: number;
}

// Service detection result
export interface DetectedService {
  serviceType: ServiceType;
  serviceName: string;
  confidence: number;
  mentions: ServiceMention[];
  frequency?: ServiceFrequency;
  status?: ServiceStatus;
}

export interface ServiceMention {
  messageId: string;
  content: string;
  context: string;
  timestamp: string;
  matchedKeywords: string[];
  confidence: number;
}

export interface ServiceFrequency {
  pattern: 'one-time' | 'weekly' | 'bi-weekly' | 'monthly' | 'seasonal' | 'annual' | 'as-needed';
  indicators: string[];
  confidence: number;
}

export interface ServiceStatus {
  status: 'active' | 'completed' | 'planned' | 'quoted' | 'cancelled';
  indicators: string[];
  lastMentioned: string;
}

// Service detection patterns with comprehensive keyword mappings
export const SERVICE_PATTERNS: ServicePattern[] = [
  {
    keywords: ['snow removal', 'snow clearing', 'snow plowing', 'snow service', 'winter service'],
    variations: ['white knight snow removal', 'snow', 'winter maintenance', 'salt', 'de-ice', 'ice removal'],
    contextClues: ['driveway', 'sidewalk', 'parking lot', 'winter', 'december', 'january', 'february', 'march', 'storm'],
    serviceType: 'SNOW_REMOVAL' as ServiceType,
    confidence: 0.9
  },
  {
    keywords: ['lawn mowing', 'grass cutting', 'mow', 'cutting grass'],
    variations: ['lawn care', 'grass', 'mower', 'cut', 'trim grass'],
    contextClues: ['weekly', 'bi-weekly', 'growing season', 'summer', 'spring', 'fall'],
    serviceType: 'LAWN_MOWING' as ServiceType,
    confidence: 0.95
  },
  {
    keywords: ['hedge trimming', 'hedge cutting', 'shrub trimming', 'bush trimming'],
    variations: ['hedges', 'shrubs', 'bushes', 'pruning', 'shaping'],
    contextClues: ['overgrown', 'shape', 'neat', 'tidy', 'trim back'],
    serviceType: 'HEDGE_TRIMMING' as ServiceType,
    confidence: 0.85
  },
  {
    keywords: ['tree trimming', 'tree pruning', 'tree cutting', 'tree service'],
    variations: ['trees', 'branches', 'limbs', 'dead wood', 'canopy'],
    contextClues: ['overhang', 'safety', 'storm damage', 'height', 'arborist'],
    serviceType: 'TREE_TRIMMING' as ServiceType,
    confidence: 0.9
  },
  {
    keywords: ['leaf removal', 'fall cleanup', 'leaf collection', 'raking'],
    variations: ['leaves', 'autumn', 'fall', 'rake', 'cleanup'],
    contextClues: ['october', 'november', 'seasonal', 'yard cleanup', 'debris'],
    serviceType: 'LEAF_REMOVAL' as ServiceType,
    confidence: 0.9
  },
  {
    keywords: ['mulching', 'mulch application', 'mulch delivery'],
    variations: ['mulch', 'wood chips', 'bark', 'ground cover'],
    contextClues: ['flower beds', 'garden beds', 'moisture retention', 'spring'],
    serviceType: 'MULCHING' as ServiceType,
    confidence: 0.85
  },
  {
    keywords: ['gutter cleaning', 'eaves cleaning', 'gutter maintenance'],
    variations: ['gutters', 'eavestroughs', 'downspouts', 'drainage'],
    contextClues: ['clogged', 'leaves', 'debris', 'water damage', 'overflow'],
    serviceType: 'GUTTER_CLEANING' as ServiceType,
    confidence: 0.9
  },
  {
    keywords: ['landscaping', 'landscape design', 'hardscaping'],
    variations: ['landscape', 'garden design', 'outdoor space', 'yard work'],
    contextClues: ['design', 'installation', 'renovation', 'improvement', 'curb appeal'],
    serviceType: 'LANDSCAPING' as ServiceType,
    confidence: 0.8
  },
  {
    keywords: ['weeding', 'weed control', 'weed removal'],
    variations: ['weeds', 'dandelions', 'crabgrass', 'unwanted plants'],
    contextClues: ['garden beds', 'flower beds', 'invasive', 'maintenance'],
    serviceType: 'WEEDING' as ServiceType,
    confidence: 0.85
  },
  {
    keywords: ['planting', 'flower planting', 'tree planting', 'shrub planting'],
    variations: ['plants', 'flowers', 'annuals', 'perennials', 'installation'],
    contextClues: ['spring', 'garden', 'color', 'seasonal', 'new plants'],
    serviceType: 'GARDENING_PLANTING' as ServiceType,
    confidence: 0.8
  },
  {
    keywords: ['seeding', 'grass seeding', 'overseeding', 'lawn seeding'],
    variations: ['seed', 'overseed', 'lawn restoration', 'grass seed'],
    contextClues: ['bare spots', 'thin lawn', 'improvement', 'spring', 'fall'],
    serviceType: 'GARDENING_SEEDING' as ServiceType,
    confidence: 0.85
  },
  {
    keywords: ['dethatching', 'lawn dethatching', 'thatch removal'],
    variations: ['dethatch', 'thatch', 'lawn aeration', 'core aeration'],
    contextClues: ['compacted', 'thick thatch', 'lawn health', 'spring', 'aerate'],
    serviceType: 'DETHATCHING' as ServiceType,
    confidence: 0.9
  }
];

// Frequency detection patterns
const FREQUENCY_PATTERNS = {
  'weekly': ['weekly', 'every week', 'once a week', '1x week', 'per week'],
  'bi-weekly': ['bi-weekly', 'every two weeks', 'every 2 weeks', 'twice a month', 'biweekly'],
  'monthly': ['monthly', 'every month', 'once a month', '1x month', 'per month'],
  'seasonal': ['seasonal', 'spring', 'summer', 'fall', 'autumn', 'winter', 'yearly', 'annually'],
  'annual': ['annual', 'yearly', 'once a year', 'every year', '1x year'],
  'as-needed': ['as needed', 'when required', 'on request', 'call when', 'if needed']
};

// Status detection patterns
const STATUS_PATTERNS = {
  'active': ['currently', 'ongoing', 'regular', 'scheduled', 'continuing'],
  'completed': ['finished', 'done', 'completed', 'wrapped up', 'all set'],
  'planned': ['planning', 'will do', 'scheduled for', 'coming up', 'next'],
  'quoted': ['quote', 'estimate', 'pricing', 'cost', 'price'],
  'cancelled': ['cancelled', 'canceled', 'no longer', 'stopped', 'discontinued']
};

/**
 * Analyzes conversation messages to detect service mentions
 */
export class ServiceDetector {
  
  /**
   * Analyzes all messages in a conversation to detect services
   */
  static analyzeConversation(messages: any[]): DetectedService[] {
    const detectedServices: Map<ServiceType, DetectedService> = new Map();

    messages.forEach(message => {
      const detections = this.analyzeMessage(message);
      
      detections.forEach(detection => {
        const existing = detectedServices.get(detection.serviceType);
        
        if (existing) {
          // Merge detections for the same service type
          existing.mentions.push(...detection.mentions);
          existing.confidence = Math.max(existing.confidence, detection.confidence);
          
          // Update frequency and status if new detection has higher confidence
          if (detection.frequency && detection.frequency.confidence > (existing.frequency?.confidence || 0)) {
            existing.frequency = detection.frequency;
          }
          
          if (detection.status && (!existing.status || new Date(detection.status.lastMentioned) > new Date(existing.status.lastMentioned))) {
            existing.status = detection.status;
          }
        } else {
          detectedServices.set(detection.serviceType, detection);
        }
      });
    });

    return Array.from(detectedServices.values())
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Analyzes a single message for service mentions
   */
  static analyzeMessage(message: any): DetectedService[] {
    const content = message.content.toLowerCase();
    const detections: DetectedService[] = [];

    SERVICE_PATTERNS.forEach(pattern => {
      const mentions = this.findServiceMentions(message, pattern, content);
      
      if (mentions.length > 0) {
        const avgConfidence = mentions.reduce((sum, m) => sum + m.confidence, 0) / mentions.length;
        const finalConfidence = Math.min(avgConfidence * pattern.confidence, 1.0);

        // Only include detections above confidence threshold
        if (finalConfidence >= 0.3) {
          const detection: DetectedService = {
            serviceType: pattern.serviceType,
            serviceName: this.getServiceDisplayName(pattern.serviceType),
            confidence: finalConfidence,
            mentions
          };

          // Detect frequency patterns
          const frequency = this.detectFrequency(content);
          if (frequency) {
            detection.frequency = frequency;
          }

          // Detect status patterns
          const status = this.detectStatus(content, message.timestamp);
          if (status) {
            detection.status = status;
          }

          detections.push(detection);
        }
      }
    });

    return detections;
  }

  /**
   * Finds service mentions in message content based on patterns
   */
  private static findServiceMentions(message: any, pattern: ServicePattern, content: string): ServiceMention[] {
    const mentions: ServiceMention[] = [];
    const allKeywords = [...pattern.keywords, ...pattern.variations];
    const matchedKeywords: string[] = [];
    let confidence = 0;

    // Check for direct keyword matches
    allKeywords.forEach(keyword => {
      if (content.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
        confidence += pattern.keywords.includes(keyword) ? 0.8 : 0.5;
      }
    });

    // Check for context clues to boost confidence
    let contextMatches = 0;
    pattern.contextClues.forEach(clue => {
      if (content.includes(clue.toLowerCase())) {
        contextMatches++;
        confidence += 0.2;
      }
    });

    // Normalize confidence
    confidence = Math.min(confidence, 1.0);

    // Only create mention if we have keyword matches
    if (matchedKeywords.length > 0) {
      // Extract surrounding context (50 chars before and after the first match)
      const firstKeyword = matchedKeywords[0];
      const keywordIndex = content.indexOf(firstKeyword.toLowerCase());
      const contextStart = Math.max(0, keywordIndex - 50);
      const contextEnd = Math.min(content.length, keywordIndex + firstKeyword.length + 50);
      const context = content.substring(contextStart, contextEnd);

      mentions.push({
        messageId: message.id,
        content: message.content,
        context: `...${context}...`,
        timestamp: message.timestamp,
        matchedKeywords,
        confidence
      });
    }

    return mentions;
  }

  /**
   * Detects frequency patterns in message content
   */
  private static detectFrequency(content: string): ServiceFrequency | null {
    for (const [pattern, keywords] of Object.entries(FREQUENCY_PATTERNS)) {
      const matchedKeywords = keywords.filter(keyword => 
        content.includes(keyword.toLowerCase())
      );

      if (matchedKeywords.length > 0) {
        return {
          pattern: pattern as ServiceFrequency['pattern'],
          indicators: matchedKeywords,
          confidence: Math.min(matchedKeywords.length * 0.3, 1.0)
        };
      }
    }

    return null;
  }

  /**
   * Detects status patterns in message content
   */
  private static detectStatus(content: string, timestamp: string): ServiceStatus | null {
    for (const [status, keywords] of Object.entries(STATUS_PATTERNS)) {
      const matchedKeywords = keywords.filter(keyword => 
        content.includes(keyword.toLowerCase())
      );

      if (matchedKeywords.length > 0) {
        return {
          status: status as ServiceStatus['status'],
          indicators: matchedKeywords,
          lastMentioned: timestamp
        };
      }
    }

    return null;
  }

  /**
   * Gets display name for service type
   */
  private static getServiceDisplayName(serviceType: ServiceType): string {
    const SERVICE_NAMES: Record<ServiceType, string> = {
      LAWN_CARE: 'Lawn Care',
      LANDSCAPING: 'Landscaping',
      MAINTENANCE: 'Maintenance',
      SNOW_REMOVAL: 'Snow Removal',
      EMERGENCY: 'Emergency Service',
      CONSULTATION: 'Consultation',
      DESIGN: 'Design',
      INSTALLATION: 'Installation',
      TREE_TRIMMING: 'Tree Trimming',
      LAWN_MOWING: 'Lawn Mowing',
      HEDGE_TRIMMING: 'Hedge Trimming',
      WEEDING: 'Weeding',
      GARDENING_PLANTING: 'Gardening (Planting)',
      GARDENING_SEEDING: 'Gardening (Seeding)',
      MULCHING: 'Mulching',
      GUTTER_CLEANING: 'Gutter Cleaning',
      DETHATCHING: 'Dethatching',
      LEAF_REMOVAL: 'Leaf Removal/Fall Cleanup',
      PREMIUM_SALTING: 'Premium Salting',
      CALCIUM_MAGNESIUM_MIX: 'Calcium Magnesium Mix',
      SNOW_PLOWING: 'Snow Plowing',
      ICE_MANAGEMENT: 'Ice Management',
      WINTER_MAINTENANCE: 'Winter Maintenance'
    };

    return SERVICE_NAMES[serviceType] || serviceType;
  }

  /**
   * Filters detected services that aren't already in the client's profile
   */
  static filterNewServices(detectedServices: DetectedService[], existingServices: string[]): DetectedService[] {
    const existingServiceTypes = new Set(existingServices);
    
    return detectedServices.filter(service => 
      !existingServiceTypes.has(service.serviceType)
    );
  }

  /**
   * Creates service update recommendations based on detected services
   */
  static generateServiceRecommendations(
    detectedServices: DetectedService[], 
    existingServices: string[]
  ): ServiceRecommendation[] {
    const newServices = this.filterNewServices(detectedServices, existingServices);
    
    return newServices.map(service => ({
      serviceType: service.serviceType,
      serviceName: service.serviceName,
      confidence: service.confidence,
      recommendedAction: this.getRecommendedAction(service),
      evidence: service.mentions.map(mention => ({
        content: mention.context,
        timestamp: mention.timestamp,
        keywords: mention.matchedKeywords
      })),
      suggestedFrequency: String(service.frequency?.pattern || 'as-needed'),
      suggestedStatus: String(service.status?.status || 'active')
    }));
  }

  /**
   * Determines recommended action based on service confidence and mentions
   */
  private static getRecommendedAction(service: DetectedService): 'HIGH_CONFIDENCE_ADD' | 'MEDIUM_CONFIDENCE_REVIEW' | 'LOW_CONFIDENCE_INVESTIGATE' {
    if (service.confidence >= 0.8) {
      return 'HIGH_CONFIDENCE_ADD';
    } else if (service.confidence >= 0.6) {
      return 'MEDIUM_CONFIDENCE_REVIEW';
    } else {
      return 'LOW_CONFIDENCE_INVESTIGATE';
    }
  }
}

// Service recommendation interface
export interface ServiceRecommendation {
  serviceType: ServiceType;
  serviceName: string;
  confidence: number;
  recommendedAction: 'HIGH_CONFIDENCE_ADD' | 'MEDIUM_CONFIDENCE_REVIEW' | 'LOW_CONFIDENCE_INVESTIGATE';
  evidence: Array<{
    content: string;
    timestamp: string;
    keywords: string[];
  }>;
  suggestedFrequency: string;
  suggestedStatus: string;
}

// Export utility functions
export const ServiceDetectionUtils = {
  /**
   * Quick analysis function for conversation analysis API
   */
  analyzeConversationForServices: (messages: any[]) => {
    return ServiceDetector.analyzeConversation(messages);
  },

  /**
   * Get recommendations for service profile updates
   */
  getServiceUpdateRecommendations: (
    detectedServices: DetectedService[], 
    existingServices: string[]
  ) => {
    return ServiceDetector.generateServiceRecommendations(detectedServices, existingServices);
  },

  /**
   * Check if a specific service type is mentioned in messages
   */
  hasServiceMentions: (messages: any[], serviceType: ServiceType) => {
    const detections = ServiceDetector.analyzeConversation(messages);
    return detections.some(detection => detection.serviceType === serviceType);
  }
};