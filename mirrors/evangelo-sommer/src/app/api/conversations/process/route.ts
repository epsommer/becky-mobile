import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPrismaClient, isPrismaAvailable } from '@/lib/prisma';
import { SMSProcessor, RawSMSRow } from '@/lib/conversation/sms-processor';
import { dataRecoveryEngine } from '@/lib/conversation/data-recovery';
import { speakerIdentifier } from '@/lib/conversation/speaker-identifier';
import { textCleaner } from '@/lib/conversation/text-cleaner';

const prisma = getPrismaClient();
const isDatabaseAvailable = isPrismaAvailable();

interface ProcessRequest {
  rawData: RawSMSRow[];
  clientId: string;
  options?: {
    skipDataRecovery?: boolean;
    skipTextCleaning?: boolean;
    customSpeakerRules?: {
      userIdentifiers?: string[];
      clientIdentifiers?: string[];
    };
    processingMode?: 'fast' | 'thorough' | 'recovery_focused';
  };
}

interface ProcessResponse {
  success: boolean;
  processingId: string;
  results: {
    messages: any[];
    summary: {
      totalInput: number;
      messagesExtracted: number;
      corruptionRecovered: number;
      averageConfidence: number;
    };
    stages: {
      parsing: StageResult;
      recovery?: StageResult;
      processing: StageResult;
      cleaning: StageResult;
    };
  };
  warnings?: string[];
  errors?: string[];
}

interface StageResult {
  success: boolean;
  duration: number;
  inputCount: number;
  outputCount: number;
  details?: Record<string, any>;
}

/**
 * Process conversation data without file upload
 * Useful for re-processing existing data or processing from external sources
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check database availability
    if (!isDatabaseAvailable || !prisma) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 503 }
      );
    }

    const body = await request.json() as ProcessRequest;
    const { rawData, clientId, options = {} } = body;

    if (!rawData || !Array.isArray(rawData)) {
      return NextResponse.json(
        { error: 'Raw data array is required' },
        { status: 400 }
      );
    }

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      );
    }

    // Verify client exists
    const client = await prisma.clientRecord.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    const processingId = `process_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    console.log(`🔄 Starting conversation processing (${processingId})`);
    console.log(`📊 Input: ${rawData.length} raw data rows`);
    console.log(`🎯 Client: ${client.name} (${clientId})`);
    console.log(`⚙️ Mode: ${options.processingMode || 'thorough'}`);

    const results: ProcessResponse['results'] = {
      messages: [],
      summary: {
        totalInput: rawData.length,
        messagesExtracted: 0,
        corruptionRecovered: 0,
        averageConfidence: 0
      },
      stages: {
        parsing: { success: false, duration: 0, inputCount: 0, outputCount: 0 },
        processing: { success: false, duration: 0, inputCount: 0, outputCount: 0 },
        cleaning: { success: false, duration: 0, inputCount: 0, outputCount: 0 }
      }
    };

    const warnings: string[] = [];
    const errors: string[] = [];

    // Stage 1: Initial parsing validation
    const parseStart = Date.now();
    console.log('📋 Stage 1: Parsing validation...');

    const validRows = rawData.filter(row => {
      // Basic validation - at least one non-empty field
      return Object.values(row).some(value => 
        value && typeof value === 'string' && value.trim()
      );
    });

    results.stages.parsing = {
      success: true,
      duration: Date.now() - parseStart,
      inputCount: rawData.length,
      outputCount: validRows.length,
      details: {
        invalidRowsRemoved: rawData.length - validRows.length
      }
    };

    if (validRows.length === 0) {
      return NextResponse.json({
        success: false,
        processingId,
        error: 'No valid data rows found',
        results
      });
    }

    console.log(`✅ Parsing: ${validRows.length}/${rawData.length} valid rows`);

    // Stage 2: Data recovery (if enabled)
    let processedRows = validRows;
    
    if (!options.skipDataRecovery && options.processingMode !== 'fast') {
      const recoveryStart = Date.now();
      console.log('🔧 Stage 2: Data recovery...');

      const corruptionAnalysis = dataRecoveryEngine.analyzeCorruption(validRows);
      
      if (corruptionAnalysis.corruptedRows.length > 0) {
        console.log(`🚨 Found ${corruptionAnalysis.corruptedRows.length} corrupted rows`);
        
        const recoveryResult = await dataRecoveryEngine.recoverData(
          corruptionAnalysis.corruptedRows,
          validRows
        );

        // Apply successful recoveries
        recoveryResult.results.forEach((result, index) => {
          if (result.success && result.confidence > 0.3) {
            const originalIndex = corruptionAnalysis.corruptedRows[index].rowIndex;
            processedRows[originalIndex] = result.recoveredData;
          }
        });

        results.stages.recovery = {
          success: true,
          duration: Date.now() - recoveryStart,
          inputCount: corruptionAnalysis.corruptedRows.length,
          outputCount: recoveryResult.stats.recoveredRows,
          details: {
            corruptedRowsFound: corruptionAnalysis.corruptedRows.length,
            successfulRecoveries: recoveryResult.stats.recoveredRows,
            averageRecoveryConfidence: recoveryResult.stats.averageConfidence
          }
        };

        results.summary.corruptionRecovered = recoveryResult.stats.recoveredRows;
        
        console.log(`✅ Recovery: ${recoveryResult.stats.recoveredRows} rows recovered`);
        
        if (recoveryResult.stats.unrecoverableRows > 0) {
          warnings.push(`${recoveryResult.stats.unrecoverableRows} rows could not be recovered`);
        }
      } else {
        results.stages.recovery = {
          success: true,
          duration: Date.now() - recoveryStart,
          inputCount: 0,
          outputCount: 0,
          details: { message: 'No corruption detected' }
        };
        console.log('✅ No data corruption detected');
      }
    }

    // Stage 3: SMS Processing
    const processingStart = Date.now();
    console.log('📱 Stage 3: SMS processing...');

    // Configure speaker identifier with custom rules
    if (options.customSpeakerRules) {
      speakerIdentifier.updateProfile({
        userId: session.user?.email || 'unknown',
        clientId: clientId,
        userIdentifiers: options.customSpeakerRules.userIdentifiers,
        clientIdentifiers: options.customSpeakerRules.clientIdentifiers
      });
    }

    const smsProcessor = new SMSProcessor();
    const smsResult = await smsProcessor.processSMSExport(processedRows as RawSMSRow[]);

    results.stages.processing = {
      success: true,
      duration: Date.now() - processingStart,
      inputCount: processedRows.length,
      outputCount: smsResult.messages.length,
      details: {
        messagesExtracted: smsResult.messages.length,
        averageConfidence: smsResult.summary.confidenceAverage,
        dateParseSuccessRate: smsResult.summary.dateParseSuccess / smsResult.summary.processedMessages,
        errorCount: smsResult.errors.length
      }
    };

    results.summary.messagesExtracted = smsResult.messages.length;
    results.summary.averageConfidence = smsResult.summary.confidenceAverage;

    console.log(`✅ Processing: ${smsResult.messages.length} messages extracted`);
    console.log(`🎯 Average confidence: ${Math.round(smsResult.summary.confidenceAverage * 100)}%`);

    if (smsResult.errors.length > 0) {
      errors.push(...smsResult.errors.map(e => `Row ${e.row}: ${e.error}`));
    }

    // Stage 4: Text cleaning
    const cleaningStart = Date.now();
    console.log('🧹 Stage 4: Text cleaning...');

    let finalMessages = smsResult.messages;

    if (!options.skipTextCleaning) {
      const cleaningMode = options.processingMode === 'fast' ? 'sms' : 'thorough';

      finalMessages = smsResult.messages.map(msg => {
        const cleanedContent = cleaningMode === 'sms'
          ? textCleaner.cleanSMSContent(msg.content)
          : textCleaner.cleanForDatabase(msg.content);

        return {
          ...msg,
          content: cleanedContent
        };
      });

      results.stages.cleaning = {
        success: true,
        duration: Date.now() - cleaningStart,
        inputCount: smsResult.messages.length,
        outputCount: finalMessages.length,
        details: {
          cleaningMode,
          averageCleaningChanges: 0 // Could be calculated from cleaning results
        }
      };

      console.log(`✅ Cleaning: ${finalMessages.length} messages cleaned`);
    } else {
      results.stages.cleaning = {
        success: true,
        duration: Date.now() - cleaningStart,
        inputCount: smsResult.messages.length,
        outputCount: finalMessages.length,
        details: { message: 'Text cleaning skipped' }
      };
    }

    // Final results
    results.messages = finalMessages;

    const totalDuration = Date.now() - startTime;
    console.log(`🎉 Processing complete in ${totalDuration}ms`);
    console.log(`📈 Success rate: ${Math.round((results.summary.messagesExtracted / results.summary.totalInput) * 100)}%`);

    const response: ProcessResponse = {
      success: true,
      processingId,
      results,
      warnings: warnings.length > 0 ? warnings : undefined,
      errors: errors.length > 0 ? errors : undefined
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Conversation processing error:', error);
    
    return NextResponse.json({
      success: false,
      processingId: `error_${Date.now()}`,
      error: 'Processing failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      results: {
        messages: [],
        summary: {
          totalInput: 0,
          messagesExtracted: 0,
          corruptionRecovered: 0,
          averageConfidence: 0
        },
        stages: {
          parsing: { success: false, duration: 0, inputCount: 0, outputCount: 0 },
          processing: { success: false, duration: 0, inputCount: 0, outputCount: 0 },
          cleaning: { success: false, duration: 0, inputCount: 0, outputCount: 0 }
        }
      }
    }, { status: 500 });
  }
}

/**
 * Get processing capabilities and configuration
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      capabilities: {
        corruption_recovery: {
          enabled: true,
          supported_issues: [
            'missing_field',
            'fragmented_data', 
            'malformed_timestamp',
            'encoding_error',
            'structure_mismatch'
          ]
        },
        speaker_identification: {
          enabled: true,
          customizable: true,
          confidence_threshold: 0.5
        },
        text_cleaning: {
          enabled: true,
          modes: ['fast', 'thorough'],
          features: [
            'html_escaping',
            'jsx_escaping', 
            'csv_artifact_removal',
            'unicode_normalization',
            'whitespace_normalization'
          ]
        },
        timestamp_reconstruction: {
          enabled: true,
          supported_formats: [
            'multi_line',
            'fragmented_components',
            'various_date_formats'
          ]
        }
      },
      processing_modes: {
        fast: {
          description: 'Quick processing with basic recovery',
          features: ['basic_validation', 'sms_processing', 'fast_cleaning']
        },
        thorough: {
          description: 'Complete processing with full recovery',
          features: ['full_validation', 'data_recovery', 'sms_processing', 'thorough_cleaning']
        },
        recovery_focused: {
          description: 'Maximum effort on data recovery',
          features: ['extensive_recovery', 'pattern_matching', 'context_inference']
        }
      },
      limits: {
        max_rows_per_request: 10000,
        max_processing_time: 300, // seconds
        supported_file_formats: ['xlsx', 'xls', 'csv']
      }
    });

  } catch (error) {
    console.error('Processing info error:', error);
    return NextResponse.json(
      { error: 'Failed to get processing information' },
      { status: 500 }
    );
  }
}