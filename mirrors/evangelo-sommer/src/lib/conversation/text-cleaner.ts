/**
 * Text Cleaning and Sanitization Utility
 * 
 * Comprehensive text cleaning system for SMS/conversation processing that handles:
 * - HTML/JSX quote escaping for React components
 * - CSV/Excel formatting artifacts removal
 * - Unicode normalization and encoding fixes
 * - Whitespace and control character cleaning
 * - Content sanitization for database storage
 * - Special character handling for various export formats
 */

export interface CleaningOptions {
  // Escaping options
  escapeHtml: boolean;
  escapeJsx: boolean;
  preserveLineBreaks: boolean;
  
  // CSV/Excel cleaning
  removeCsvQuotes: boolean;
  handleCsvEscapes: boolean;
  normalizeWhitespace: boolean;
  
  // Content filtering
  removeControlChars: boolean;
  fixUnicodeArtifacts: boolean;
  trimContent: boolean;
  
  // Output format
  maxLength?: number;
  ellipsisStyle: 'truncate' | 'word_boundary' | 'sentence_boundary';
}

export interface CleaningResult {
  cleaned: string;
  original: string;
  changes: CleaningChange[];
  statistics: {
    originalLength: number;
    cleanedLength: number;
    charactersRemoved: number;
    charactersEscaped: number;
    encodingIssuesFixed: number;
  };
}

export interface CleaningChange {
  type: 'removal' | 'escape' | 'replacement' | 'normalization';
  description: string;
  position?: number;
  originalText?: string;
  newText?: string;
}

export class TextCleaner {
  private readonly defaultOptions: CleaningOptions = {
    escapeHtml: true,
    escapeJsx: true,
    preserveLineBreaks: true,
    removeCsvQuotes: true,
    handleCsvEscapes: true,
    normalizeWhitespace: true,
    removeControlChars: true,
    fixUnicodeArtifacts: true,
    trimContent: true,
    ellipsisStyle: 'word_boundary'
  };

  // HTML entities for escaping
  private readonly htmlEscapes: Record<string, string> = {
    '"': '&quot;',
    "'": '&#x27;',
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;'
  };

  // JSX-specific escapes (stricter than HTML)
  private readonly jsxEscapes: Record<string, string> = {
    '"': '&quot;',
    "'": '&#x27;',
    '{': '&#123;',
    '}': '&#125;',
    '`': '&#96;'
  };

  // Common CSV/Excel artifacts
  private readonly csvArtifacts = [
    { pattern: /^"(.*)"$/g, replacement: '$1', description: 'CSV outer quotes' },
    { pattern: /""/g, replacement: '"', description: 'CSV escaped quotes' },
    { pattern: /\r\n/g, replacement: '\n', description: 'Windows line endings' },
    { pattern: /\r/g, replacement: '\n', description: 'Mac line endings' }
  ];

  // Unicode artifacts and encoding issues
  private readonly unicodeArtifacts = [
    { pattern: /\uFFFD/g, replacement: '', description: 'Unicode replacement character' },
    { pattern: /â€™/g, replacement: "'", description: 'Encoding artifact apostrophe' },
    { pattern: /â€œ/g, replacement: '"', description: 'Encoding artifact left quote' },
    { pattern: /â€/g, replacement: '"', description: 'Encoding artifact right quote' },
    { pattern: /â€"/g, replacement: '—', description: 'Encoding artifact em dash' },
    { pattern: /â€"/g, replacement: '–', description: 'Encoding artifact en dash' },
    { pattern: /Â /g, replacement: ' ', description: 'Non-breaking space artifact' },
    { pattern: /Â/g, replacement: '', description: 'Stray Â character' },
  ];

  // Control characters to remove (except common whitespace)
  private readonly controlCharsPattern = /[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g;

  /**
   * Clean text with specified options
   */
  cleanText(text: string, options: Partial<CleaningOptions> = {}): CleaningResult {
    if (!text || typeof text !== 'string') {
      return {
        cleaned: '',
        original: text || '',
        changes: [],
        statistics: {
          originalLength: 0,
          cleanedLength: 0,
          charactersRemoved: 0,
          charactersEscaped: 0,
          encodingIssuesFixed: 0
        }
      };
    }

    const opts = { ...this.defaultOptions, ...options };
    const changes: CleaningChange[] = [];
    const stats = {
      originalLength: text.length,
      cleanedLength: 0,
      charactersRemoved: 0,
      charactersEscaped: 0,
      encodingIssuesFixed: 0
    };

    let cleaned = text;
    const originalText = text;

    // Step 1: Remove CSV/Excel artifacts
    if (opts.removeCsvQuotes || opts.handleCsvEscapes) {
      const csvResult = this.cleanCsvArtifacts(cleaned);
      cleaned = csvResult.text;
      changes.push(...csvResult.changes);
    }

    // Step 2: Fix Unicode encoding issues
    if (opts.fixUnicodeArtifacts) {
      const unicodeResult = this.fixUnicodeIssues(cleaned);
      cleaned = unicodeResult.text;
      changes.push(...unicodeResult.changes);
      stats.encodingIssuesFixed = unicodeResult.changes.length;
    }

    // Step 3: Remove control characters
    if (opts.removeControlChars) {
      const controlResult = this.removeControlCharacters(cleaned);
      cleaned = controlResult.text;
      changes.push(...controlResult.changes);
      stats.charactersRemoved += controlResult.changes.length;
    }

    // Step 4: Normalize whitespace
    if (opts.normalizeWhitespace) {
      const whitespaceResult = this.normalizeWhitespace(cleaned, opts.preserveLineBreaks);
      cleaned = whitespaceResult.text;
      changes.push(...whitespaceResult.changes);
    }

    // Step 5: Apply HTML/JSX escaping
    if (opts.escapeHtml || opts.escapeJsx) {
      const escapeResult = this.applyEscaping(cleaned, opts.escapeJsx);
      cleaned = escapeResult.text;
      changes.push(...escapeResult.changes);
      stats.charactersEscaped = escapeResult.changes.length;
    }

    // Step 6: Trim content
    if (opts.trimContent) {
      const originalLength = cleaned.length;
      cleaned = cleaned.trim();
      if (cleaned.length !== originalLength) {
        changes.push({
          type: 'normalization',
          description: 'Trimmed leading and trailing whitespace'
        });
      }
    }

    // Step 7: Apply length limits
    if (opts.maxLength && cleaned.length > opts.maxLength) {
      const truncateResult = this.truncateText(cleaned, opts.maxLength, opts.ellipsisStyle);
      cleaned = truncateResult.text;
      changes.push(...truncateResult.changes);
    }

    stats.cleanedLength = cleaned.length;
    stats.charactersRemoved += Math.max(0, stats.originalLength - stats.cleanedLength);

    return {
      cleaned,
      original: originalText,
      changes,
      statistics: stats
    };
  }

  /**
   * Quick clean for common SMS processing (optimized preset)
   */
  cleanSMSContent(text: string): string {
    return this.cleanText(text, {
      escapeHtml: true,
      escapeJsx: true,
      removeCsvQuotes: true,
      handleCsvEscapes: true,
      fixUnicodeArtifacts: true,
      removeControlChars: true,
      normalizeWhitespace: true,
      trimContent: true
    }).cleaned;
  }

  /**
   * Clean for safe database storage (preserves more formatting)
   */
  cleanForDatabase(text: string): string {
    return this.cleanText(text, {
      escapeHtml: false,
      escapeJsx: false,
      removeCsvQuotes: true,
      handleCsvEscapes: true,
      fixUnicodeArtifacts: true,
      removeControlChars: true,
      normalizeWhitespace: true,
      trimContent: true,
      preserveLineBreaks: true
    }).cleaned;
  }

  /**
   * Clean for React/JSX rendering (strict escaping)
   */
  cleanForReact(text: string, maxLength?: number): string {
    return this.cleanText(text, {
      escapeHtml: true,
      escapeJsx: true,
      removeCsvQuotes: true,
      handleCsvEscapes: true,
      fixUnicodeArtifacts: true,
      removeControlChars: true,
      normalizeWhitespace: true,
      trimContent: true,
      maxLength,
      ellipsisStyle: 'word_boundary'
    }).cleaned;
  }

  /**
   * Clean CSV artifacts
   */
  private cleanCsvArtifacts(text: string): {
    text: string;
    changes: CleaningChange[];
  } {
    let cleaned = text;
    const changes: CleaningChange[] = [];

    for (const artifact of this.csvArtifacts) {
      const matches = [...cleaned.matchAll(artifact.pattern)];
      if (matches.length > 0) {
        cleaned = cleaned.replace(artifact.pattern, artifact.replacement);
        changes.push({
          type: 'normalization',
          description: `Removed ${artifact.description}`,
          originalText: matches[0][0],
          newText: artifact.replacement
        });
      }
    }

    return { text: cleaned, changes };
  }

  /**
   * Fix Unicode encoding issues
   */
  private fixUnicodeIssues(text: string): {
    text: string;
    changes: CleaningChange[];
  } {
    let cleaned = text;
    const changes: CleaningChange[] = [];

    for (const artifact of this.unicodeArtifacts) {
      const matches = [...cleaned.matchAll(artifact.pattern)];
      if (matches.length > 0) {
        cleaned = cleaned.replace(artifact.pattern, artifact.replacement);
        changes.push({
          type: 'replacement',
          description: `Fixed ${artifact.description}`,
          originalText: matches[0][0],
          newText: artifact.replacement
        });
      }
    }

    return { text: cleaned, changes };
  }

  /**
   * Remove control characters
   */
  private removeControlCharacters(text: string): {
    text: string;
    changes: CleaningChange[];
  } {
    const matches = [...text.matchAll(this.controlCharsPattern)];
    const cleaned = text.replace(this.controlCharsPattern, '');
    
    const changes: CleaningChange[] = matches.length > 0 ? [{
      type: 'removal',
      description: `Removed ${matches.length} control characters`
    }] : [];

    return { text: cleaned, changes };
  }

  /**
   * Normalize whitespace
   */
  private normalizeWhitespace(text: string, preserveLineBreaks: boolean): {
    text: string;
    changes: CleaningChange[];
  } {
    let cleaned = text;
    const changes: CleaningChange[] = [];

    // Replace multiple spaces with single space
    const spacesBefore = (cleaned.match(/\s{2,}/g) || []).length;
    cleaned = cleaned.replace(/[ \t]+/g, ' ');
    
    if (!preserveLineBreaks) {
      // Replace line breaks with spaces if not preserving
      const lineBreaksBefore = (cleaned.match(/\n/g) || []).length;
      cleaned = cleaned.replace(/\n+/g, ' ');
      
      if (lineBreaksBefore > 0) {
        changes.push({
          type: 'normalization',
          description: `Replaced ${lineBreaksBefore} line breaks with spaces`
        });
      }
    } else {
      // Normalize line breaks but keep them
      cleaned = cleaned.replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive line breaks
    }

    if (spacesBefore > 0) {
      changes.push({
        type: 'normalization',
        description: `Normalized ${spacesBefore} multiple space sequences`
      });
    }

    return { text: cleaned, changes };
  }

  /**
   * Apply HTML/JSX escaping
   */
  private applyEscaping(text: string, useJsxEscapes: boolean): {
    text: string;
    changes: CleaningChange[];
  } {
    let cleaned = text;
    const changes: CleaningChange[] = [];
    const escapes = useJsxEscapes ? this.jsxEscapes : this.htmlEscapes;

    for (const [char, escape] of Object.entries(escapes)) {
      const pattern = new RegExp(this.escapeRegExp(char), 'g');
      const matches = [...cleaned.matchAll(pattern)];
      
      if (matches.length > 0) {
        cleaned = cleaned.replace(pattern, escape);
        changes.push({
          type: 'escape',
          description: `Escaped ${matches.length} "${char}" characters`,
          originalText: char,
          newText: escape
        });
      }
    }

    return { text: cleaned, changes };
  }

  /**
   * Truncate text intelligently
   */
  private truncateText(
    text: string,
    maxLength: number,
    style: CleaningOptions['ellipsisStyle']
  ): {
    text: string;
    changes: CleaningChange[];
  } {
    if (text.length <= maxLength) {
      return { text, changes: [] };
    }

    let truncated: string;
    const ellipsis = '...';
    const targetLength = maxLength - ellipsis.length;

    switch (style) {
      case 'word_boundary':
        const words = text.substring(0, targetLength).split(' ');
        words.pop(); // Remove potentially partial last word
        truncated = words.join(' ') + ellipsis;
        break;

      case 'sentence_boundary':
        const sentences = text.substring(0, targetLength).split(/[.!?]+/);
        sentences.pop(); // Remove potentially partial last sentence
        truncated = sentences.join('.') + (sentences.length > 0 ? '.' : '') + ellipsis;
        break;

      case 'truncate':
      default:
        truncated = text.substring(0, targetLength) + ellipsis;
        break;
    }

    return {
      text: truncated,
      changes: [{
        type: 'normalization',
        description: `Truncated from ${text.length} to ${truncated.length} characters using ${style} method`
      }]
    };
  }

  /**
   * Escape special regex characters
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Batch clean multiple texts efficiently
   */
  batchClean(texts: string[], options: Partial<CleaningOptions> = {}): CleaningResult[] {
    console.log(`🧹 Batch cleaning ${texts.length} texts...`);
    
    const results = texts.map((text, index) => {
      const result = this.cleanText(text, options);
      
      if (index % 100 === 0 && index > 0) {
        console.log(`   Progress: ${index}/${texts.length} texts processed`);
      }
      
      return result;
    });

    console.log(`✅ Batch cleaning complete: ${results.length} texts processed`);
    return results;
  }

  /**
   * Get cleaning statistics for a batch of results
   */
  getBatchStatistics(results: CleaningResult[]): {
    totalTexts: number;
    totalChanges: number;
    averageChangesPerText: number;
    totalCharactersRemoved: number;
    totalCharactersEscaped: number;
    encodingIssuesFixed: number;
    changeTypeDistribution: Record<string, number>;
  } {
    const stats = {
      totalTexts: results.length,
      totalChanges: 0,
      averageChangesPerText: 0,
      totalCharactersRemoved: 0,
      totalCharactersEscaped: 0,
      encodingIssuesFixed: 0,
      changeTypeDistribution: {} as Record<string, number>
    };

    for (const result of results) {
      stats.totalChanges += result.changes.length;
      stats.totalCharactersRemoved += result.statistics.charactersRemoved;
      stats.totalCharactersEscaped += result.statistics.charactersEscaped;
      stats.encodingIssuesFixed += result.statistics.encodingIssuesFixed;

      // Count change types
      for (const change of result.changes) {
        stats.changeTypeDistribution[change.type] = 
          (stats.changeTypeDistribution[change.type] || 0) + 1;
      }
    }

    stats.averageChangesPerText = results.length > 0 
      ? stats.totalChanges / results.length 
      : 0;

    return stats;
  }

  /**
   * Validate that text is clean and safe
   */
  validateCleanText(text: string): {
    isClean: boolean;
    issues: Array<{
      type: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
    }>;
  } {
    const issues: Array<{ type: string; description: string; severity: 'low' | 'medium' | 'high' }> = [];

    // Check for unescaped HTML/JSX characters
    if (/[<>&]/.test(text)) {
      issues.push({
        type: 'unescaped_html',
        description: 'Contains unescaped HTML characters',
        severity: 'medium'
      });
    }

    // Check for control characters
    if (this.controlCharsPattern.test(text)) {
      issues.push({
        type: 'control_characters',
        description: 'Contains control characters',
        severity: 'high'
      });
    }

    // Check for encoding artifacts
    if (/â€|Â|\uFFFD/.test(text)) {
      issues.push({
        type: 'encoding_artifacts',
        description: 'Contains encoding artifacts',
        severity: 'medium'
      });
    }

    // Check for excessive whitespace
    if (/\s{4,}|\n{3,}/.test(text)) {
      issues.push({
        type: 'excessive_whitespace',
        description: 'Contains excessive whitespace',
        severity: 'low'
      });
    }

    return {
      isClean: issues.length === 0,
      issues
    };
  }
}

// Export singleton instance
export const textCleaner = new TextCleaner();