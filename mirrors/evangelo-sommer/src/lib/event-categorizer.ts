export type EventCategory = 'primary' | 'secondary' | 'tertiary';

export interface EventCategorizationRule {
  id: string;
  name: string;
  category: EventCategory;
  keywords: string[];
  enabled: boolean;
  priority: number;
}

export interface CategorizationConfig {
  enableSmartCategorization: boolean;
  categorizationRules: EventCategorizationRule[];
  defaultCategory: EventCategory;
  showCategoryBadges: boolean;
  prioritizeMoneyMaking: boolean;
}

export interface CategorizedEvent {
  category: EventCategory;
  confidence: number;
  matchedRule?: EventCategorizationRule;
  matchedKeywords?: string[];
}

/**
 * Smart event categorization system that analyzes events and categorizes them
 * based on their money-making priority and business relevance
 */
export class EventCategorizer {
  private config: CategorizationConfig;

  constructor(config: CategorizationConfig) {
    this.config = config;
  }

  /**
   * Categorize a single event based on its title, description, and other metadata
   */
  categorizeEvent(event: {
    title: string;
    description?: string;
    service?: string;
    clientName?: string;
    location?: string;
    notes?: string;
    type?: string;
  }): CategorizedEvent {
    if (!this.config.enableSmartCategorization) {
      return {
        category: this.config.defaultCategory,
        confidence: 0
      };
    }

    // Combine all text fields for analysis
    const textToAnalyze = [
      event.title,
      event.description,
      event.service,
      event.clientName,
      event.location,
      event.notes,
      event.type
    ].filter(Boolean).join(' ').toLowerCase();

    // Find matching rules sorted by priority
    const enabledRules = this.config.categorizationRules
      .filter(rule => rule.enabled)
      .sort((a, b) => a.priority - b.priority);

    let bestMatch: {
      rule: EventCategorizationRule;
      matchedKeywords: string[];
      score: number;
    } | null = null;

    for (const rule of enabledRules) {
      const matchedKeywords: string[] = [];
      let score = 0;

      for (const keyword of rule.keywords) {
        if (keyword.trim() === '') continue;
        
        const keywordLower = keyword.toLowerCase().trim();
        if (textToAnalyze.includes(keywordLower)) {
          matchedKeywords.push(keyword);
          // Score based on keyword relevance and rule priority
          score += 1 / rule.priority;
        }
      }

      if (matchedKeywords.length > 0) {
        // Calculate confidence based on match ratio and rule priority
        const matchRatio = matchedKeywords.length / rule.keywords.length;
        const confidence = Math.min(0.95, matchRatio * (1 / rule.priority) * 0.8 + 0.2);
        
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = {
            rule,
            matchedKeywords,
            score
          };
        }
      }
    }

    if (bestMatch) {
      const confidence = Math.min(0.95, bestMatch.score * 0.6 + 0.3);
      return {
        category: bestMatch.rule.category,
        confidence,
        matchedRule: bestMatch.rule,
        matchedKeywords: bestMatch.matchedKeywords
      };
    }

    // No matches found, use default category with low confidence
    return {
      category: this.config.defaultCategory,
      confidence: 0.1
    };
  }

  /**
   * Categorize multiple events and optionally sort by priority
   */
  categorizeEvents(events: Array<{
    id: string;
    title: string;
    description?: string;
    service?: string;
    clientName?: string;
    location?: string;
    notes?: string;
    type?: string;
  }>): Array<{
    id: string;
    category: EventCategory;
    confidence: number;
    matchedRule?: EventCategorizationRule;
    matchedKeywords?: string[];
  }> {
    return events.map(event => ({
      id: event.id,
      ...this.categorizeEvent(event)
    }));
  }

  /**
   * Sort events by category priority (Primary -> Secondary -> Tertiary)
   */
  sortEventsByPriority<T extends { category: EventCategory }>(events: T[]): T[] {
    if (!this.config.prioritizeMoneyMaking) {
      return events;
    }

    const categoryOrder: Record<EventCategory, number> = {
      'primary': 1,
      'secondary': 2,
      'tertiary': 3
    };

    return [...events].sort((a, b) => {
      return categoryOrder[a.category] - categoryOrder[b.category];
    });
  }

  /**
   * Get category display information
   */
  getCategoryInfo(category: EventCategory): {
    label: string;
    description: string;
    color: string;
    badgeClass: string;
  } {
    switch (category) {
      case 'primary':
        return {
          label: 'Primary',
          description: 'Money-Making Activities',
          color: '#10b981',
          badgeClass: 'bg-green-100 text-green-800 border-green-200'
        };
      case 'secondary':
        return {
          label: 'Secondary',
          description: 'Business Support Tasks',
          color: '#f59e0b',
          badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-200'
        };
      case 'tertiary':
        return {
          label: 'Tertiary',
          description: 'Personal Life Tasks',
          color: '#D4AF37',
          badgeClass: 'bg-tactical-gold-muted text-tactical-brown-dark border-tactical-gold'
        };
    }
  }

  /**
   * Group events by category
   */
  groupEventsByCategory<T extends { category: EventCategory }>(events: T[]): {
    primary: T[];
    secondary: T[];
    tertiary: T[];
  } {
    const groups = {
      primary: [] as T[],
      secondary: [] as T[],
      tertiary: [] as T[]
    };

    events.forEach(event => {
      groups[event.category].push(event);
    });

    return groups;
  }

  /**
   * Load configuration from system preferences
   */
  static loadConfigFromPreferences(): CategorizationConfig {
    try {
      // Check if running in browser environment
      if (typeof window !== 'undefined' && localStorage) {
        const preferences = localStorage.getItem('system-preferences');
        if (preferences) {
          const parsed = JSON.parse(preferences);
          return parsed.eventParsing || EventCategorizer.getDefaultConfig();
        }
      }
    } catch (error) {
      console.error('Error loading categorization config:', error);
    }
    
    return EventCategorizer.getDefaultConfig();
  }

  /**
   * Get default categorization configuration
   */
  static getDefaultConfig(): CategorizationConfig {
    return {
      enableSmartCategorization: true,
      categorizationRules: [
        {
          id: '1',
          name: 'Money-Making Activities',
          category: 'primary',
          keywords: ['landscaping', 'client meeting', 'service call', 'consultation', 'estimate', 'proposal', 'invoice', 'payment', 'contract'],
          enabled: true,
          priority: 1
        },
        {
          id: '2',
          name: 'Business Support Tasks',
          category: 'secondary',
          keywords: ['equipment maintenance', 'supply pickup', 'planning', 'scheduling', 'follow-up', 'marketing', 'networking', 'training'],
          enabled: true,
          priority: 2
        },
        {
          id: '3',
          name: 'Personal Life Tasks',
          category: 'tertiary',
          keywords: ['groceries', 'cleaning', 'laundry', 'car wash', 'doctor appointment', 'personal', 'family', 'shopping', 'errands'],
          enabled: true,
          priority: 3
        }
      ],
      defaultCategory: 'secondary',
      showCategoryBadges: true,
      prioritizeMoneyMaking: true
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CategorizationConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Export singleton instance (lazy-loaded, browser-only)
let _eventCategorizer: EventCategorizer | null = null;

export const eventCategorizer = {
  get instance(): EventCategorizer {
    if (!_eventCategorizer) {
      // Only create the instance on the client side
      if (typeof window !== 'undefined') {
        _eventCategorizer = new EventCategorizer(EventCategorizer.loadConfigFromPreferences());
      } else {
        // Return default config instance for SSR
        _eventCategorizer = new EventCategorizer(EventCategorizer.getDefaultConfig());
      }
    }
    return _eventCategorizer;
  }
};