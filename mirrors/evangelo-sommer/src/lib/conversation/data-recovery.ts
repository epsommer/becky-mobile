/**
 * Data Corruption Recovery System
 * 
 * Handles corrupted Excel/CSV rows from SMS exports where data is fragmented
 * across cells or rows due to export formatting issues, line breaks in messages,
 * or incomplete data extraction. Implements sophisticated recovery algorithms
 * from the ConvoClean Python tool.
 */

import { timestampReconstructor } from './timestamp-reconstructor';
import { speakerIdentifier } from './speaker-identifier';

export interface CorruptedRow {
  rowIndex: number;
  originalData: Record<string, any>;
  issues: CorruptionIssue[];
  confidence: number;
}

export interface CorruptionIssue {
  type: 'missing_field' | 'fragmented_data' | 'malformed_timestamp' | 'encoding_error' | 'structure_mismatch';
  field: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestedFix?: string;
}

export interface RecoveryResult {
  success: boolean;
  recoveredData: Record<string, any>;
  confidence: number;
  methodsUsed: string[];
  originalIssues: CorruptionIssue[];
  remainingIssues: CorruptionIssue[];
  reconstructionDetails: string[];
}

export interface RecoveryStats {
  totalRows: number;
  corruptedRows: number;
  recoveredRows: number;
  unrecoverableRows: number;
  averageConfidence: number;
  commonIssues: Array<{
    type: CorruptionIssue['type'];
    count: number;
    percentage: number;
  }>;
}

export class DataRecoveryEngine {
  private readonly fieldMappings = {
    // Common field variations in SMS exports
    messageType: ['type', 'direction', 'message_type', 'msg_type', 'sent_received'],
    timestamp: ['date', 'time', 'timestamp', 'datetime', 'sent_time', 'received_time'],
    sender: ['sender', 'from', 'name', 'contact', 'phone', 'number', 'name / number', 'name/number'],
    content: ['content', 'message', 'text', 'body', 'msg', 'message_content'],
    recipient: ['to', 'recipient', 'destination']
  };

  private readonly structurePatterns = [
    // Pattern 1: Standard 4-column format
    {
      name: 'standard_4col',
      expectedFields: ['type', 'date', 'name_number', 'content'],
      confidence: 0.9,
      validator: (data: any[]) => data.length >= 4
    },
    
    // Pattern 2: 5-column with recipient
    {
      name: 'extended_5col', 
      expectedFields: ['type', 'date', 'from', 'to', 'content'],
      confidence: 0.8,
      validator: (data: any[]) => data.length >= 5
    },
    
    // Pattern 3: Minimal 3-column
    {
      name: 'minimal_3col',
      expectedFields: ['direction', 'time', 'message'],
      confidence: 0.7,
      validator: (data: any[]) => data.length >= 3
    }
  ];

  /**
   * Analyze a dataset for corruption patterns and statistics
   */
  analyzeCorruption(rawData: Record<string, any>[]): {
    corruptedRows: CorruptedRow[];
    stats: RecoveryStats;
  } {
    console.log('🔍 Analyzing dataset for corruption...'); 
    console.log(`📊 Total rows: ${rawData.length}`);

    const corruptedRows: CorruptedRow[] = [];
    const issueStats = new Map<CorruptionIssue['type'], number>();

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const issues = this.detectCorruption(row, i);
      
      if (issues.length > 0) {
        const confidence = this.calculateRowHealth(row, issues);
        corruptedRows.push({
          rowIndex: i,
          originalData: row,
          issues,
          confidence
        });

        // Track issue statistics
        issues.forEach(issue => {
          issueStats.set(issue.type, (issueStats.get(issue.type) || 0) + 1);
        });
      }
    }

    // Calculate statistics
    const totalRows = rawData.length;
    const corruptedRowCount = corruptedRows.length;
    const averageConfidence = corruptedRows.length > 0 
      ? corruptedRows.reduce((sum, row) => sum + row.confidence, 0) / corruptedRows.length 
      : 1.0;

    const commonIssues = Array.from(issueStats.entries())
      .map(([type, count]) => ({
        type,
        count,
        percentage: (count / Math.max(corruptedRowCount, 1)) * 100
      }))
      .sort((a, b) => b.count - a.count);

    const stats: RecoveryStats = {
      totalRows,
      corruptedRows: corruptedRowCount,
      recoveredRows: 0, // Will be updated during recovery
      unrecoverableRows: 0, // Will be updated during recovery
      averageConfidence,
      commonIssues
    };

    console.log(`🚨 Corruption analysis complete:`);
    console.log(`   💥 Corrupted rows: ${corruptedRowCount}/${totalRows} (${((corruptedRowCount/totalRows) * 100).toFixed(1)}%)`);
    console.log(`   🎯 Average health: ${(averageConfidence * 100).toFixed(1)}%`);
    console.log(`   📈 Top issues: ${commonIssues.slice(0, 3).map(i => `${i.type}(${i.count})`).join(', ')}`);

    return { corruptedRows, stats };
  }

  /**
   * Attempt to recover corrupted data using multiple strategies
   */
  async recoverData(corruptedRows: CorruptedRow[], fullDataset?: Record<string, any>[]): Promise<{
    results: RecoveryResult[];
    stats: RecoveryStats;
  }> {
    console.log('🔧 Starting data recovery process...');
    console.log(`🚑 Processing ${corruptedRows.length} corrupted rows`);

    const results: RecoveryResult[] = [];
    let recoveredCount = 0;
    let unrecoverableCount = 0;

    for (const corruptedRow of corruptedRows) {
      const recoveryResult = await this.recoverSingleRow(
        corruptedRow,
        fullDataset,
        corruptedRows.indexOf(corruptedRow)
      );
      
      results.push(recoveryResult);
      
      if (recoveryResult.success && recoveryResult.confidence > 0.5) {
        recoveredCount++;
      } else {
        unrecoverableCount++;
      }
    }

    // Update stats
    const averageConfidence = results.length > 0 
      ? results.reduce((sum, r) => sum + r.confidence, 0) / results.length 
      : 0;

    const stats: RecoveryStats = {
      totalRows: corruptedRows.length, // Only corrupted rows in this context
      corruptedRows: corruptedRows.length,
      recoveredRows: recoveredCount,
      unrecoverableRows: unrecoverableCount,
      averageConfidence,
      commonIssues: [] // Inherited from original analysis
    };

    console.log('✅ Recovery process complete:');
    console.log(`   🎉 Recovered: ${recoveredCount}/${corruptedRows.length} rows`);
    console.log(`   ❌ Unrecoverable: ${unrecoverableCount}/${corruptedRows.length} rows`);
    console.log(`   🎯 Average confidence: ${(averageConfidence * 100).toFixed(1)}%`);

    return { results, stats };
  }

  /**
   * Recover a single corrupted row using multiple strategies
   */
  private async recoverSingleRow(
    corruptedRow: CorruptedRow,
    fullDataset?: Record<string, any>[],
    rowIndex?: number
  ): Promise<RecoveryResult> {
    console.log(`🔧 Recovering row ${corruptedRow.rowIndex}:`, corruptedRow.originalData);

    const result: RecoveryResult = {
      success: false,
      recoveredData: { ...corruptedRow.originalData },
      confidence: 0,
      methodsUsed: [],
      originalIssues: [...corruptedRow.issues],
      remainingIssues: [],
      reconstructionDetails: []
    };

    // Strategy 1: Field Mapping Recovery
    const mappingResult = await this.applyFieldMapping(result.recoveredData);
    if (mappingResult.improved) {
      result.methodsUsed.push('field_mapping');
      result.reconstructionDetails.push('Applied field name mapping');
      result.recoveredData = mappingResult.data;
    }

    // Strategy 2: Data Reconstruction from Fragments
    const fragmentResult = await this.reconstructFragmentedData(result.recoveredData, corruptedRow.issues);
    if (fragmentResult.improved) {
      result.methodsUsed.push('fragment_reconstruction');
      result.reconstructionDetails.push('Reconstructed fragmented data');
      result.recoveredData = fragmentResult.data;
    }

    // Strategy 3: Timestamp Recovery
    const timestampResult = await this.recoverTimestamp(result.recoveredData);
    if (timestampResult.improved) {
      result.methodsUsed.push('timestamp_recovery');
      result.reconstructionDetails.push('Recovered timestamp information');
      result.recoveredData = timestampResult.data;
    }

    // Strategy 4: Context-based Recovery (using surrounding rows)
    if (fullDataset && rowIndex !== undefined) {
      const contextResult = await this.applyContextualRecovery(
        result.recoveredData, 
        fullDataset, 
        rowIndex
      );
      if (contextResult.improved) {
        result.methodsUsed.push('contextual_recovery');
        result.reconstructionDetails.push('Used context from surrounding rows');
        result.recoveredData = contextResult.data;
      }
    }

    // Strategy 5: Pattern-based Structure Recovery
    const structureResult = await this.recoverStructure(result.recoveredData);
    if (structureResult.improved) {
      result.methodsUsed.push('structure_recovery');
      result.reconstructionDetails.push('Applied structural patterns');
      result.recoveredData = structureResult.data;
    }

    // Final validation and confidence calculation
    const finalIssues = this.detectCorruption(result.recoveredData, corruptedRow.rowIndex);
    result.remainingIssues = finalIssues;
    result.confidence = this.calculateRecoveryConfidence(
      corruptedRow.issues,
      finalIssues,
      result.methodsUsed
    );
    result.success = result.confidence > 0.3 && this.hasRequiredFields(result.recoveredData);

    console.log(`${result.success ? '✅' : '❌'} Row recovery result:`, {
      confidence: Math.round(result.confidence * 100) + '%',
      methodsUsed: result.methodsUsed.length,
      issuesRemaining: result.remainingIssues.length
    });

    return result;
  }

  /**
   * Detect corruption issues in a data row
   */
  private detectCorruption(row: Record<string, any>, rowIndex: number): CorruptionIssue[] {
    const issues: CorruptionIssue[] = [];
    
    if (!row || typeof row !== 'object') {
      issues.push({
        type: 'structure_mismatch',
        field: 'entire_row',
        severity: 'critical',
        description: 'Row is not a valid object'
      });
      return issues;
    }

    const values = Object.values(row).filter(v => v !== undefined && v !== null && v !== '');
    
    // Check for missing required fields
    const hasMessageType = this.hasAnyField(row, this.fieldMappings.messageType);
    const hasTimestamp = this.hasAnyField(row, this.fieldMappings.timestamp);
    const hasContent = this.hasAnyField(row, this.fieldMappings.content);
    
    if (!hasMessageType) {
      issues.push({
        type: 'missing_field',
        field: 'message_type',
        severity: 'high',
        description: 'Message type/direction field missing'
      });
    }

    if (!hasTimestamp) {
      issues.push({
        type: 'missing_field',
        field: 'timestamp',
        severity: 'high', 
        description: 'Timestamp field missing'
      });
    }

    if (!hasContent) {
      issues.push({
        type: 'missing_field',
        field: 'content',
        severity: 'critical',
        description: 'Message content field missing'
      });
    }

    // Check for fragmented data (content split across fields)
    const suspiciouslyShortContent = values.find(v => 
      typeof v === 'string' && v.length < 10 && v.match(/\w/)
    );
    
    if (suspiciouslyShortContent && values.length > 2) {
      issues.push({
        type: 'fragmented_data',
        field: 'content',
        severity: 'medium',
        description: 'Message content may be fragmented across cells'
      });
    }

    // Check for malformed timestamps
    if (hasTimestamp) {
      const timestampValue = this.getFieldValue(row, this.fieldMappings.timestamp);
      if (timestampValue && !this.isValidTimestamp(timestampValue)) {
        issues.push({
          type: 'malformed_timestamp',
          field: 'timestamp',
          severity: 'medium',
          description: 'Timestamp format is invalid or corrupted'
        });
      }
    }

    // Check for encoding issues
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === 'string' && this.hasEncodingIssues(value)) {
        issues.push({
          type: 'encoding_error',
          field: key,
          severity: 'low',
          description: 'Text contains encoding artifacts'
        });
      }
    }

    return issues;
  }

  /**
   * Apply field mapping to standardize field names
   */
  private async applyFieldMapping(data: Record<string, any>): Promise<{
    improved: boolean;
    data: Record<string, any>;
  }> {
    const mapped = { ...data };
    let improved = false;

    for (const [standardField, variations] of Object.entries(this.fieldMappings)) {
      if (!mapped[standardField]) {
        // Try to find field under alternative names
        for (const variation of variations) {
          if (mapped[variation] !== undefined) {
            mapped[standardField] = mapped[variation];
            improved = true;
            break;
          }
        }
      }
    }

    return { improved, data: mapped };
  }

  /**
   * Reconstruct fragmented data from multiple fields
   */
  private async reconstructFragmentedData(
    data: Record<string, any>,
    issues: CorruptionIssue[]
  ): Promise<{
    improved: boolean;
    data: Record<string, any>;
  }> {
    const reconstructed = { ...data };
    let improved = false;

    // Look for fragmentation issues
    const fragmentationIssues = issues.filter(i => i.type === 'fragmented_data');
    
    if (fragmentationIssues.length > 0) {
      // Try to reconstruct message content from multiple fields
      const contentFragments: string[] = [];
      
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string' && value.trim() && value.length > 5) {
          // Skip known metadata fields
          if (!['type', 'direction', 'date', 'time'].includes(key.toLowerCase())) {
            contentFragments.push(value.trim());
          }
        }
      }

      if (contentFragments.length > 1) {
        // Combine fragments intelligently
        const combinedContent = this.combineContentFragments(contentFragments);
        if (combinedContent && combinedContent.length > (reconstructed.content?.length || 0)) {
          reconstructed.content = combinedContent;
          improved = true;
        }
      }
    }

    return { improved, data: reconstructed };
  }

  /**
   * Recover timestamp information using the timestamp reconstructor
   */
  private async recoverTimestamp(data: Record<string, any>): Promise<{
    improved: boolean;
    data: Record<string, any>;
  }> {
    const recovered = { ...data };
    let improved = false;

    // Collect all potential timestamp components
    const timestampComponents: string[] = [];
    
    for (const [key, value] of Object.entries(data)) {
      if (value && typeof value === 'string') {
        const stringValue = value.trim();
        // Check if this looks like timestamp data
        if (this.looksLikeTimestampComponent(stringValue)) {
          timestampComponents.push(stringValue);
        }
      }
    }

    if (timestampComponents.length > 0) {
      const reconstructionResult = timestampReconstructor.cleanSMSTimestampRobust(timestampComponents);
      
      if (reconstructionResult.success && reconstructionResult.timestamp) {
        recovered.timestamp = reconstructionResult.timestamp;
        recovered.date = reconstructionResult.timestamp; // Alias for compatibility
        improved = true;
      }
    }

    return { improved, data: recovered };
  }

  /**
   * Apply contextual recovery using surrounding rows
   */
  private async applyContextualRecovery(
    data: Record<string, any>,
    fullDataset: Record<string, any>[],
    rowIndex: number
  ): Promise<{
    improved: boolean;
    data: Record<string, any>;
  }> {
    const recovered = { ...data };
    let improved = false;

    // Get context window (2 rows before and after)
    const contextStart = Math.max(0, rowIndex - 2);
    const contextEnd = Math.min(fullDataset.length, rowIndex + 3);
    const contextRows = fullDataset.slice(contextStart, contextEnd);

    // Infer missing message type from alternating pattern
    if (!recovered.type && !recovered.messageType) {
      const inferredType = this.inferMessageTypeFromContext(contextRows, rowIndex - contextStart);
      if (inferredType) {
        recovered.type = inferredType;
        improved = true;
      }
    }

    // Infer sender from context pattern
    if (!recovered.sender && !recovered.from) {
      const inferredSender = this.inferSenderFromContext(contextRows, rowIndex - contextStart);
      if (inferredSender) {
        recovered.sender = inferredSender;
        improved = true;
      }
    }

    return { improved, data: recovered };
  }

  /**
   * Recover structural information using known patterns
   */
  private async recoverStructure(data: Record<string, any>): Promise<{
    improved: boolean;
    data: Record<string, any>;
  }> {
    const recovered = { ...data };
    let improved = false;

    const values = Object.values(data).filter(v => v !== undefined && v !== null && v !== '');
    
    // Try to match against known structural patterns
    for (const pattern of this.structurePatterns) {
      if (pattern.validator(values)) {
        // Apply pattern-based field assignment
        const patternData = this.applyStructuralPattern(values, pattern);
        if (patternData) {
          Object.assign(recovered, patternData);
          improved = true;
          break;
        }
      }
    }

    return { improved, data: recovered };
  }

  /**
   * Helper methods
   */
  private hasAnyField(obj: Record<string, any>, fieldNames: string[]): boolean {
    return fieldNames.some(name => {
      return Object.keys(obj).some(key => 
        key.toLowerCase().replace(/[\s_-]/g, '') === name.toLowerCase().replace(/[\s_-]/g, '')
      );
    });
  }

  private getFieldValue(obj: Record<string, any>, fieldNames: string[]): any {
    for (const name of fieldNames) {
      for (const [key, value] of Object.entries(obj)) {
        if (key.toLowerCase().replace(/[\s_-]/g, '') === name.toLowerCase().replace(/[\s_-]/g, '')) {
          return value;
        }
      }
    }
    return undefined;
  }

  private isValidTimestamp(value: any): boolean {
    if (!value) return false;
    const date = new Date(value);
    return !isNaN(date.getTime());
  }

  private hasEncodingIssues(text: string): boolean {
    // Check for common encoding artifacts
    return /[\uFFFD\u0000-\u001F]/.test(text) || 
           text.includes('â€™') || 
           text.includes('Â') ||
           text.includes('�');
  }

  private looksLikeTimestampComponent(text: string): boolean {
    return /\d{1,2}:\d{2}|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|\d{4}|eastern|am|pm/i.test(text);
  }

  private combineContentFragments(fragments: string[]): string {
    // Intelligent fragment combination
    return fragments
      .filter(f => f && f.trim())
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private inferMessageTypeFromContext(contextRows: Record<string, any>[], targetIndex: number): string | null {
    // Simple alternating pattern inference
    const adjacentRows = contextRows.filter((_, i) => Math.abs(i - targetIndex) === 1);
    
    for (const row of adjacentRows) {
      const type = this.getFieldValue(row, this.fieldMappings.messageType);
      if (type) {
        return type.toLowerCase() === 'sent' ? 'received' : 'sent';
      }
    }

    return null;
  }

  private inferSenderFromContext(contextRows: Record<string, any>[], targetIndex: number): string | null {
    // Look for consistent sender patterns
    const senders = contextRows
      .map(row => this.getFieldValue(row, this.fieldMappings.sender))
      .filter(Boolean);
    
    // Return most common sender
    const senderCounts = new Map();
    senders.forEach(sender => {
      senderCounts.set(sender, (senderCounts.get(sender) || 0) + 1);
    });

    if (senderCounts.size > 0) {
      return Array.from(senderCounts.entries())
        .sort((a, b) => b[1] - a[1])[0][0];
    }

    return null;
  }

  private applyStructuralPattern(values: any[], pattern: any): Record<string, any> | null {
    const result: Record<string, any> = {};
    
    try {
      pattern.expectedFields.forEach((field: string, index: number) => {
        if (index < values.length && values[index]) {
          result[field] = values[index];
        }
      });
      
      return Object.keys(result).length > 0 ? result : null;
    } catch {
      return null;
    }
  }

  private calculateRowHealth(row: Record<string, any>, issues: CorruptionIssue[]): number {
    let health = 1.0;
    
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical': health -= 0.4; break;
        case 'high': health -= 0.25; break;
        case 'medium': health -= 0.15; break;
        case 'low': health -= 0.05; break;
      }
    });

    return Math.max(0, health);
  }

  private calculateRecoveryConfidence(
    originalIssues: CorruptionIssue[],
    remainingIssues: CorruptionIssue[],
    methodsUsed: string[]
  ): number {
    const issuesResolved = originalIssues.length - remainingIssues.length;
    const resolutionRate = originalIssues.length > 0 ? issuesResolved / originalIssues.length : 1;
    const methodBonus = Math.min(methodsUsed.length * 0.1, 0.3);
    
    return Math.min(1.0, resolutionRate + methodBonus);
  }

  private hasRequiredFields(data: Record<string, any>): boolean {
    return this.hasAnyField(data, this.fieldMappings.content) &&
           (this.hasAnyField(data, this.fieldMappings.messageType) ||
            this.hasAnyField(data, this.fieldMappings.sender));
  }
}

// Export singleton instance
export const dataRecoveryEngine = new DataRecoveryEngine();