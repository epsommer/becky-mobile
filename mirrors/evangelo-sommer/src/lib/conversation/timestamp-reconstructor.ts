/**
 * Multi-line Timestamp Reconstruction Utility
 * 
 * Handles corrupted SMS exports where timestamps are split across multiple cells/rows
 * Implements the robust timestamp parsing logic from ConvoClean Python tool
 */

export interface TimestampReconstructionResult {
  success: boolean;
  timestamp: string | null;
  confidence: number;
  components: {
    dayOfWeek?: string;
    month?: string;
    day?: number;
    year?: number;
    hours?: number;
    minutes?: number;
    seconds?: number;
    period?: 'AM' | 'PM';
    timezone?: string;
  };
  reconstructionMethod: 'direct' | 'multiline' | 'fuzzy' | 'fallback';
  originalInput: string[];
}

export interface TimestampPattern {
  name: string;
  regex: RegExp;
  extractor: (match: RegExpMatchArray) => Partial<TimestampReconstructionResult['components']>;
  priority: number;
}

export class TimestampReconstructor {
  // Comprehensive timestamp patterns covering various SMS export formats
  private readonly patterns: TimestampPattern[] = [
    // Complete timestamp patterns
    {
      name: 'Complete Standard',
      regex: /(\w+),?\s+(\w+)\s+(\d{1,2}),?\s+(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?)?\s*(\w+)?/i,
      priority: 100,
      extractor: (match) => ({
        dayOfWeek: match[1],
        month: match[2],
        day: parseInt(match[3]),
        year: parseInt(match[4]),
        hours: parseInt(match[5]),
        minutes: parseInt(match[6]),
        seconds: parseInt(match[7]),
        period: match[8]?.toUpperCase().replace(/\./g, '') as 'AM' | 'PM' || undefined,
        timezone: match[9]
      })
    },
    
    // Multi-line patterns (most common in corrupted exports)
    {
      name: 'Day Month Date Year',
      regex: /(\w+),?\s+(\w+)\s+(\d{1,2}),?\s+(\d{4})/i,
      priority: 80,
      extractor: (match) => ({
        dayOfWeek: match[1],
        month: match[2], 
        day: parseInt(match[3]),
        year: parseInt(match[4])
      })
    },
    
    {
      name: 'Day Month Date',
      regex: /(\w+),?\s+(\w+)\s+(\d{1,2}),?/i,
      priority: 70,
      extractor: (match) => ({
        dayOfWeek: match[1],
        month: match[2],
        day: parseInt(match[3])
      })
    },
    
    {
      name: 'Time with Period',
      regex: /(\d{1,2}):(\d{2}):?(\d{2})?\s*(a\.?m\.?|p\.?m\.?)/i,
      priority: 60,
      extractor: (match) => ({
        hours: parseInt(match[1]),
        minutes: parseInt(match[2]),
        seconds: match[3] ? parseInt(match[3]) : undefined,
        period: match[4]?.toUpperCase().replace(/\./g, '') as 'AM' | 'PM'
      })
    },
    
    {
      name: 'Time Only',
      regex: /(\d{1,2}):(\d{2}):?(\d{2})?/,
      priority: 50,
      extractor: (match) => ({
        hours: parseInt(match[1]),
        minutes: parseInt(match[2]),
        seconds: match[3] ? parseInt(match[3]) : undefined
      })
    },
    
    {
      name: 'Year Only',
      regex: /^(20\d{2})$/,
      priority: 30,
      extractor: (match) => ({
        year: parseInt(match[1])
      })
    },
    
    {
      name: 'Month Only',
      regex: /^(january|february|march|april|may|june|july|august|september|october|november|december)$/i,
      priority: 25,
      extractor: (match) => ({
        month: match[1]
      })
    },
    
    {
      name: 'Day of Week Only',
      regex: /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i,
      priority: 20,
      extractor: (match) => ({
        dayOfWeek: match[1]
      })
    },
    
    {
      name: 'Timezone Only',
      regex: /^(eastern|est|edt|et|utc|gmt|cst|cdt|mst|mdt|pst|pdt)$/i,
      priority: 15,
      extractor: (match) => ({
        timezone: match[1]
      })
    }
  ];

  private readonly monthMap: Record<string, number> = {
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

  /**
   * Reconstruct timestamp from multi-line or corrupted components
   */
  reconstructTimestamp(components: string[]): TimestampReconstructionResult {
    console.log('🕒 Reconstructing timestamp from components:', components);

    if (!components || components.length === 0) {
      return this.createFailureResult(components, 'No components provided');
    }

    // Filter out empty/null components and normalize
    const cleanComponents = components
      .filter(comp => comp && typeof comp === 'string' && comp.trim())
      .map(comp => comp.trim());

    if (cleanComponents.length === 0) {
      return this.createFailureResult(components, 'No valid components after filtering');
    }

    // Try direct parsing first (single component with complete timestamp)
    if (cleanComponents.length === 1) {
      const directResult = this.tryDirectParsing(cleanComponents[0]);
      if (directResult.success) {
        return directResult;
      }
    }

    // Try multiline reconstruction
    const multilineResult = this.tryMultilineReconstruction(cleanComponents);
    if (multilineResult.success) {
      return multilineResult;
    }

    // Try fuzzy reconstruction as fallback
    const fuzzyResult = this.tryFuzzyReconstruction(cleanComponents);
    if (fuzzyResult.success) {
      return fuzzyResult;
    }

    // Complete fallback
    return this.createFallbackResult(components);
  }

  /**
   * Try to parse a complete timestamp from a single string
   */
  private tryDirectParsing(input: string): TimestampReconstructionResult {
    console.log('🎯 Trying direct parsing:', input);

    // Remove quotes that might be from CSV
    const cleanInput = input.replace(/^["']|["']$/g, '').trim();

    // Try patterns in priority order
    for (const pattern of this.patterns.sort((a, b) => b.priority - a.priority)) {
      const match = cleanInput.match(pattern.regex);
      if (match) {
        console.log(`✅ Direct match with pattern: ${pattern.name}`);
        const components = pattern.extractor(match);
        const timestamp = this.assembleTimestamp(components);
        
        if (timestamp) {
          return {
            success: true,
            timestamp,
            confidence: 0.9,
            components,
            reconstructionMethod: 'direct',
            originalInput: [input]
          };
        }
      }
    }

    return this.createFailureResult([input], 'No direct pattern match');
  }

  /**
   * Reconstruct timestamp from multiple components 
   */
  private tryMultilineReconstruction(components: string[]): TimestampReconstructionResult {
    console.log('🔧 Trying multiline reconstruction:', components);

    const mergedComponents: TimestampReconstructionResult['components'] = {};
    const matchedPatterns: string[] = [];

    // Process each component through pattern matching
    for (const component of components) {
      const cleanComponent = component.replace(/^["']|["']$/g, '').trim();
      
      for (const pattern of this.patterns) {
        const match = cleanComponent.match(pattern.regex);
        if (match) {
          const extracted = pattern.extractor(match);
          
          // Merge non-conflicting components
          for (const [key, value] of Object.entries(extracted)) {
            if (value !== undefined && mergedComponents[key as keyof typeof mergedComponents] === undefined) {
              (mergedComponents as any)[key] = value;
              matchedPatterns.push(`${key}:${pattern.name}`);
            }
          }
          break; // Use first matching pattern per component
        }
      }
    }

    console.log('🔍 Merged components:', mergedComponents);
    console.log('📝 Pattern matches:', matchedPatterns);

    // Check if we have minimum required components
    const hasDate = mergedComponents.month && mergedComponents.day;
    const hasYear = mergedComponents.year;
    
    if (hasDate) {
      const timestamp = this.assembleTimestamp(mergedComponents);
      if (timestamp) {
        const confidence = this.calculateConfidence(mergedComponents, matchedPatterns);
        return {
          success: true,
          timestamp,
          confidence,
          components: mergedComponents,
          reconstructionMethod: 'multiline',
          originalInput: components
        };
      }
    }

    return this.createFailureResult(components, 'Insufficient components for reconstruction');
  }

  /**
   * Fuzzy reconstruction attempts using heuristics and context
   */
  private tryFuzzyReconstruction(components: string[]): TimestampReconstructionResult {
    console.log('🤔 Trying fuzzy reconstruction:', components);

    // Combine all components and try to extract any date/time info
    const combinedText = components.join(' ').toLowerCase();
    
    // Look for any date-like patterns in the combined text
    const fuzzyComponents: TimestampReconstructionResult['components'] = {};
    
    // Extract year (most reliable)
    const yearMatch = combinedText.match(/\b(20\d{2})\b/);
    if (yearMatch) {
      fuzzyComponents.year = parseInt(yearMatch[1]);
    }
    
    // Extract month names
    for (const [monthName, monthNum] of Object.entries(this.monthMap)) {
      if (combinedText.includes(monthName)) {
        fuzzyComponents.month = monthName;
        break;
      }
    }
    
    // Extract day number (look for reasonable day values)
    const dayMatch = combinedText.match(/\b([1-2]?[0-9]|3[01])\b/);
    if (dayMatch) {
      const dayNum = parseInt(dayMatch[1]);
      if (dayNum >= 1 && dayNum <= 31) {
        fuzzyComponents.day = dayNum;
      }
    }
    
    // Extract time
    const timeMatch = combinedText.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      fuzzyComponents.hours = parseInt(timeMatch[1]);
      fuzzyComponents.minutes = parseInt(timeMatch[2]);
      
      // Try to detect AM/PM
      if (combinedText.includes('pm') || combinedText.includes('p.m')) {
        fuzzyComponents.period = 'PM';
      } else if (combinedText.includes('am') || combinedText.includes('a.m')) {
        fuzzyComponents.period = 'AM';
      }
    }

    console.log('🔍 Fuzzy extracted components:', fuzzyComponents);

    // Check if we have enough for a timestamp
    if (fuzzyComponents.month && fuzzyComponents.day) {
      const timestamp = this.assembleTimestamp(fuzzyComponents);
      if (timestamp) {
        return {
          success: true,
          timestamp,
          confidence: 0.6, // Lower confidence for fuzzy matching
          components: fuzzyComponents,
          reconstructionMethod: 'fuzzy',
          originalInput: components
        };
      }
    }

    return this.createFailureResult(components, 'Fuzzy reconstruction failed');
  }

  /**
   * Assemble a JavaScript Date from components and convert to ISO string
   */
  private assembleTimestamp(components: TimestampReconstructionResult['components']): string | null {
    try {
      // Default to current date for missing components
      const now = new Date();
      
      let year = components.year || now.getFullYear();
      let month = 0; // Default to January
      let day = components.day || 1;
      let hours = components.hours || 12; // Default to noon
      let minutes = components.minutes || 0;
      let seconds = components.seconds || 0;

      // Handle month
      if (components.month) {
        const monthNum = this.monthMap[components.month.toLowerCase()];
        if (monthNum !== undefined) {
          month = monthNum;
        }
      }

      // Handle AM/PM
      if (components.period === 'PM' && hours < 12) {
        hours += 12;
      } else if (components.period === 'AM' && hours === 12) {
        hours = 0;
      }

      // Validate ranges
      if (year < 1900 || year > 2100) return null;
      if (month < 0 || month > 11) return null;
      if (day < 1 || day > 31) return null;
      if (hours < 0 || hours > 23) return null;
      if (minutes < 0 || minutes > 59) return null;
      if (seconds < 0 || seconds > 59) return null;

      const date = new Date(year, month, day, hours, minutes, seconds);
      
      // Validate the constructed date
      if (isNaN(date.getTime())) return null;
      
      return date.toISOString();
    } catch (error) {
      console.log('❌ Error assembling timestamp:', error);
      return null;
    }
  }

  /**
   * Calculate confidence score based on components and pattern matches
   */
  private calculateConfidence(
    components: TimestampReconstructionResult['components'], 
    matchedPatterns: string[]
  ): number {
    let confidence = 0;

    // Base confidence from component completeness
    if (components.year) confidence += 0.25;
    if (components.month) confidence += 0.25;  
    if (components.day) confidence += 0.25;
    if (components.hours !== undefined) confidence += 0.15;
    if (components.minutes !== undefined) confidence += 0.1;

    // Bonus for high-priority pattern matches
    const highPriorityMatches = matchedPatterns.filter(pattern => 
      pattern.includes('Complete') || pattern.includes('Standard')
    );
    confidence += highPriorityMatches.length * 0.1;

    return Math.min(1.0, confidence);
  }

  /**
   * Create a failure result
   */
  private createFailureResult(components: string[], reason: string): TimestampReconstructionResult {
    console.log(`❌ Timestamp reconstruction failed: ${reason}`);
    return {
      success: false,
      timestamp: null,
      confidence: 0,
      components: {},
      reconstructionMethod: 'fallback',
      originalInput: components
    };
  }

  /**
   * Create a fallback result with generated timestamp
   */
  private createFallbackResult(components: string[]): TimestampReconstructionResult {
    console.log('⚠️ Using fallback timestamp generation');
    
    // Generate a reasonable fallback timestamp (within last year)
    const now = new Date();
    const yearAgo = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));
    const randomTime = yearAgo.getTime() + Math.random() * (now.getTime() - yearAgo.getTime());
    const fallbackDate = new Date(randomTime);

    return {
      success: false, // Mark as failure even though we provide a timestamp
      timestamp: fallbackDate.toISOString(),
      confidence: 0.1, // Very low confidence for fallback
      components: {},
      reconstructionMethod: 'fallback',
      originalInput: components
    };
  }

  /**
   * Clean SMS timestamp robust - main entry point matching Python function
   */
  cleanSMSTimestampRobust(rawTimestamp: string | string[]): TimestampReconstructionResult {
    console.log('🧹 Clean SMS timestamp robust called with:', rawTimestamp);

    let components: string[];
    
    if (typeof rawTimestamp === 'string') {
      // Handle single string - could be multi-line
      components = rawTimestamp
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);
    } else if (Array.isArray(rawTimestamp)) {
      components = rawTimestamp;
    } else {
      return this.createFailureResult([], 'Invalid input type');
    }

    return this.reconstructTimestamp(components);
  }
}

// Export singleton instance
export const timestampReconstructor = new TimestampReconstructor();