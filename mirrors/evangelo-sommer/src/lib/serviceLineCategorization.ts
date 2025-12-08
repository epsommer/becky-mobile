import { ServiceType } from '@prisma/client'

// Service Line definitions
export interface ServiceLineDefinition {
  id: string
  name: string
  slug: string
  description: string
  color: string
  keywords: string[]
  serviceTypes: ServiceType[]
  seasonality?: 'winter' | 'summer' | 'spring' | 'fall' | 'year-round'
  primaryCategories: string[]
}

// Predefined service lines for Mark Levy and similar clients
export const SERVICE_LINE_DEFINITIONS: ServiceLineDefinition[] = [
  {
    id: 'whiteknight_snow',
    name: 'White Knight Snow Service',
    slug: 'whiteknight',
    description: 'Professional winter snow removal and ice management services',
    color: '#6B7280', // Tactical Grey for winter services (no blue)
    keywords: [
      'snow', 'winter', 'plowing', 'salting', 'ice', 'driveway', 'walkway', 
      'deicing', 'calcium', 'magnesium', 'salt', 'removal', 'clearing'
    ],
    serviceTypes: [
      'SNOW_REMOVAL',
      'PREMIUM_SALTING',
      'CALCIUM_MAGNESIUM_MIX',
      'SNOW_PLOWING',
      'ICE_MANAGEMENT',
      'WINTER_MAINTENANCE'
    ],
    seasonality: 'winter',
    primaryCategories: [
      'Snow Removal',
      'Ice Management',
      'Winter Maintenance',
      'Salt Application',
      'Driveway Clearing'
    ]
  },
  {
    id: 'woodgreen_landscaping',
    name: 'Woodgreen Landscaping',
    slug: 'woodgreen',
    description: 'Full-service landscaping and lawn maintenance',
    color: '#7ED321', // Green for landscaping
    keywords: [
      'lawn', 'grass', 'landscaping', 'maintenance', 'mowing', 'trimming', 
      'hedge', 'garden', 'planting', 'weeding', 'mulching', 'spring', 
      'cleanup', 'seeding', 'fertilizer', 'yard'
    ],
    serviceTypes: [
      'LAWN_CARE',
      'LANDSCAPING', 
      'MAINTENANCE',
      'TREE_TRIMMING',
      'LAWN_MOWING',
      'HEDGE_TRIMMING',
      'WEEDING',
      'GARDENING_PLANTING',
      'GARDENING_SEEDING',
      'MULCHING',
      'DETHATCHING',
      'LEAF_REMOVAL'
    ],
    seasonality: 'summer',
    primaryCategories: [
      'Lawn Maintenance',
      'Landscaping',
      'Garden Care',
      'Tree Services',
      'Seasonal Cleanup'
    ]
  }
]

// Service categorization logic
export class ServiceLineCategorizer {
  private serviceLines: ServiceLineDefinition[]

  constructor(serviceLines: ServiceLineDefinition[] = SERVICE_LINE_DEFINITIONS) {
    this.serviceLines = serviceLines
  }

  /**
   * Categorize a service based on service type
   */
  categorizeByServiceType(serviceType: ServiceType): ServiceLineDefinition | null {
    return this.serviceLines.find(line => 
      line.serviceTypes.includes(serviceType)
    ) || null
  }

  /**
   * Categorize a service based on text content (message, description, etc.)
   */
  categorizeByTextContent(text: string): ServiceLineDefinition[] {
    const lowerText = text.toLowerCase()
    const matches: Array<{ serviceLine: ServiceLineDefinition; score: number }> = []

    for (const serviceLine of this.serviceLines) {
      let score = 0
      
      // Check keywords
      for (const keyword of serviceLine.keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          score += 1
        }
      }

      // Check primary categories
      for (const category of serviceLine.primaryCategories) {
        if (lowerText.includes(category.toLowerCase())) {
          score += 2 // Higher weight for categories
        }
      }

      if (score > 0) {
        matches.push({ serviceLine, score })
      }
    }

    // Sort by score (highest first) and return service lines
    return matches
      .sort((a, b) => b.score - a.score)
      .map(match => match.serviceLine)
  }

  /**
   * Categorize a service based on multiple criteria
   */
  categorizeService(criteria: {
    serviceType?: ServiceType
    description?: string
    notes?: string
    category?: string
    date?: Date
  }): {
    primaryMatch: ServiceLineDefinition | null
    alternativeMatches: ServiceLineDefinition[]
    confidence: 'high' | 'medium' | 'low'
  } {
    let primaryMatch: ServiceLineDefinition | null = null
    let alternativeMatches: ServiceLineDefinition[] = []
    let confidence: 'high' | 'medium' | 'low' = 'low'

    // 1. Try to match by service type (highest confidence)
    if (criteria.serviceType) {
      primaryMatch = this.categorizeByServiceType(criteria.serviceType)
      if (primaryMatch) {
        confidence = 'high'
      }
    }

    // 2. Try to match by text content
    const textMatches: ServiceLineDefinition[] = []
    
    if (criteria.description) {
      textMatches.push(...this.categorizeByTextContent(criteria.description))
    }
    
    if (criteria.notes) {
      textMatches.push(...this.categorizeByTextContent(criteria.notes))
    }
    
    if (criteria.category) {
      textMatches.push(...this.categorizeByTextContent(criteria.category))
    }

    // Remove duplicates and get top matches
    const uniqueTextMatches = Array.from(new Set(textMatches))
    
    if (!primaryMatch && uniqueTextMatches.length > 0) {
      primaryMatch = uniqueTextMatches[0]
      confidence = uniqueTextMatches.length > 1 ? 'medium' : 'low'
      alternativeMatches = uniqueTextMatches.slice(1)
    } else if (primaryMatch) {
      alternativeMatches = uniqueTextMatches.filter(match => match.id !== primaryMatch?.id)
    }

    // 3. Consider seasonality if date is provided
    if (criteria.date && (!primaryMatch || confidence === 'low')) {
      const month = criteria.date.getMonth() + 1 // 1-12
      const seasonalMatches = this.serviceLines.filter(line => {
        if (!line.seasonality) return false
        
        switch (line.seasonality) {
          case 'winter':
            return month === 12 || month <= 2
          case 'spring':
            return month >= 3 && month <= 5
          case 'summer':
            return month >= 6 && month <= 8
          case 'fall':
            return month >= 9 && month <= 11
          default:
            return true
        }
      })

      if (seasonalMatches.length > 0) {
        if (!primaryMatch) {
          primaryMatch = seasonalMatches[0]
          confidence = 'low'
        }
        alternativeMatches.push(...seasonalMatches.filter(match => match.id !== primaryMatch?.id))
      }
    }

    // Remove duplicates from alternative matches
    alternativeMatches = Array.from(new Set(alternativeMatches))

    return {
      primaryMatch,
      alternativeMatches,
      confidence
    }
  }

  /**
   * Get service line by slug
   */
  getServiceLineBySlug(slug: string): ServiceLineDefinition | null {
    return this.serviceLines.find(line => line.slug === slug) || null
  }

  /**
   * Get all service lines
   */
  getAllServiceLines(): ServiceLineDefinition[] {
    return [...this.serviceLines]
  }

  /**
   * Add a custom service line
   */
  addServiceLine(serviceLine: ServiceLineDefinition): void {
    const existingIndex = this.serviceLines.findIndex(line => line.id === serviceLine.id)
    if (existingIndex >= 0) {
      this.serviceLines[existingIndex] = serviceLine
    } else {
      this.serviceLines.push(serviceLine)
    }
  }

  /**
   * Batch categorize multiple services
   */
  categorizeServices(services: Array<{
    id: string
    serviceType?: ServiceType
    description?: string
    notes?: string
    category?: string
    date?: Date
  }>): Array<{
    id: string
    serviceLineId: string | null
    serviceLine: ServiceLineDefinition | null
    confidence: 'high' | 'medium' | 'low'
    alternatives: ServiceLineDefinition[]
  }> {
    return services.map(service => {
      const result = this.categorizeService(service)
      return {
        id: service.id,
        serviceLineId: result.primaryMatch?.id || null,
        serviceLine: result.primaryMatch,
        confidence: result.confidence,
        alternatives: result.alternativeMatches
      }
    })
  }
}

// Default categorizer instance
export const serviceCategorizer = new ServiceLineCategorizer()

// Utility functions
export function getServiceLineColor(serviceLineSlug: string): string {
  const serviceLine = serviceCategorizer.getServiceLineBySlug(serviceLineSlug)
  return serviceLine?.color || '#6B7280'
}

export function getServiceLineDisplayName(serviceLineSlug: string): string {
  const serviceLine = serviceCategorizer.getServiceLineBySlug(serviceLineSlug)
  return serviceLine?.name || serviceLineSlug
}

export function isWinterService(serviceType: ServiceType): boolean {
  const winterServiceLine = serviceCategorizer.getServiceLineBySlug('whiteknight')
  return winterServiceLine?.serviceTypes.includes(serviceType) || false
}

export function isLandscapingService(serviceType: ServiceType): boolean {
  const landscapingServiceLine = serviceCategorizer.getServiceLineBySlug('woodgreen')
  return landscapingServiceLine?.serviceTypes.includes(serviceType) || false
}

// Message categorization for conversation analysis
export function categorizeConversationMessages(messages: Array<{
  id: string
  content: string
  timestamp: string
}>): {
  whiteknightMessages: number
  woodgreenMessages: number
  uncategorizedMessages: number
  serviceLineBreakdown: Record<string, number>
} {
  let whiteknightMessages = 0
  let woodgreenMessages = 0
  let uncategorizedMessages = 0
  const serviceLineBreakdown: Record<string, number> = {}

  for (const message of messages) {
    const matches = serviceCategorizer.categorizeByTextContent(message.content)
    
    if (matches.length === 0) {
      uncategorizedMessages++
    } else {
      const primaryMatch = matches[0]
      if (primaryMatch.slug === 'whiteknight') {
        whiteknightMessages++
      } else if (primaryMatch.slug === 'woodgreen') {
        woodgreenMessages++
      }
      
      serviceLineBreakdown[primaryMatch.slug] = (serviceLineBreakdown[primaryMatch.slug] || 0) + 1
    }
  }

  return {
    whiteknightMessages,
    woodgreenMessages,
    uncategorizedMessages,
    serviceLineBreakdown
  }
}