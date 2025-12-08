import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPrismaClient, isPrismaAvailable } from '@/lib/prisma';
import { SMSProcessor, RawSMSRow, convertSMSToMessages } from '@/lib/conversation/sms-processor';
import { dataRecoveryEngine } from '@/lib/conversation/data-recovery';
import { textCleaner } from '@/lib/conversation/text-cleaner';
import ExcelJS from 'exceljs';

const prisma = getPrismaClient();
const isDatabaseAvailable = isPrismaAvailable();

interface ProcessingProgress {
  stage: 'parsing' | 'recovery' | 'processing' | 'storing' | 'complete';
  progress: number;
  message: string;
}

export async function POST(request: NextRequest) {
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

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const clientId = formData.get('clientId') as string;
    const processingOptions = JSON.parse(formData.get('options') as string || '{}');

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/csv'
    ];

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload Excel or CSV files only.' },
        { status: 400 }
      );
    }

    // Verify client exists and user has access
    const client = await prisma.clientRecord.findFirst({
      where: {
        id: clientId,
        // Add user access validation here if needed
      }
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found or access denied' },
        { status: 404 }
      );
    }

    console.log(`🚀 Starting conversation file processing for client ${client.name}`);
    console.log(`📁 File: ${file.name} (${file.size} bytes)`);

    // Create processing ID for progress tracking
    const processingId = `proc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Stage 1: Parse file
    let progress: ProcessingProgress = {
      stage: 'parsing',
      progress: 10,
      message: 'Parsing file...'
    };
    
    const rawData = await parseFileToRows(file);
    console.log(`📊 Parsed ${rawData.length} rows from file`);

    // Stage 2: Analyze and recover corrupted data
    progress = {
      stage: 'recovery',
      progress: 30,
      message: 'Analyzing data corruption...'
    };

    const corruptionAnalysis = dataRecoveryEngine.analyzeCorruption(rawData);
    console.log(`🔍 Corruption analysis: ${corruptionAnalysis.corruptedRows.length}/${rawData.length} rows need recovery`);

    let recoveredData = rawData;
    if (corruptionAnalysis.corruptedRows.length > 0) {
      progress.message = 'Recovering corrupted data...';
      progress.progress = 50;

      const recoveryResult = await dataRecoveryEngine.recoverData(
        corruptionAnalysis.corruptedRows,
        rawData
      );
      
      // Apply recovered data back to original dataset
      recoveryResult.results.forEach((result, index) => {
        if (result.success) {
          const originalIndex = corruptionAnalysis.corruptedRows[index].rowIndex;
          recoveredData[originalIndex] = result.recoveredData;
        }
      });

      console.log(`🔧 Recovery complete: ${recoveryResult.stats.recoveredRows} rows recovered`);
    }

    // Stage 3: Process SMS data
    progress = {
      stage: 'processing',
      progress: 70,
      message: 'Processing SMS messages...'
    };

    const smsProcessor = new SMSProcessor();
    const processingResult = await smsProcessor.processSMSExport(recoveredData as RawSMSRow[]);
    
    console.log(`📱 SMS processing complete: ${processingResult.messages.length} messages extracted`);
    console.log(`🎯 Average confidence: ${Math.round(processingResult.summary.confidenceAverage * 100)}%`);

    // Clean message content for safe storage
    const cleanedMessages = processingResult.messages.map(msg => ({
      ...msg,
      content: textCleaner.cleanForDatabase(msg.content)
    }));

    // Stage 4: Store in database
    progress = {
      stage: 'storing',
      progress: 90,
      message: 'Storing conversation in database...'
    };

    // Convert to standard Message format
    const standardMessages = convertSMSToMessages(processingResult);

    // Create conversation record
    const conversation = await prisma.conversation.create({
      data: {
        clientId: clientId,
        title: `SMS conversation with ${client.name}`,
        summary: `Imported ${standardMessages.length} messages from ${file.name}`,
        sentiment: 'NEUTRAL',
        priority: 'MEDIUM',
        tags: ['sms_import', 'file_upload'],
        status: 'ACTIVE',
        source: 'IMPORT',
        participants: [client.name],
        messages: {
          create: standardMessages.map(msg => ({
            role: msg.role === 'YOU' ? 'YOU' : 'CLIENT',
            content: msg.content,
            timestamp: new Date(msg.timestamp),
            type: 'TEXT',
            metadata: msg.metadata || {}
          }))
        }
      },
      include: {
        messages: true
      }
    });

    console.log(`💾 Conversation stored with ID: ${conversation.id}`);

    progress = {
      stage: 'complete',
      progress: 100,
      message: 'Processing complete!'
    };

    // Return comprehensive results
    return NextResponse.json({
      success: true,
      processingId,
      conversation: {
        id: conversation.id,
        title: conversation.title,
        messageCount: standardMessages.length
      },
      processing: {
        summary: processingResult.summary,
        corruption: {
          totalRows: corruptionAnalysis.stats.totalRows,
          corruptedRows: corruptionAnalysis.stats.corruptedRows,
          recoveredRows: corruptionAnalysis.stats.recoveredRows || 0
        },
        cleaning: {
          messagesProcessed: cleanedMessages.length,
          // Add cleaning stats if needed
        }
      },
      progress
    });

  } catch (error) {
    console.error('Conversation upload error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process conversation file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Extract plain text string from ExcelJS cell value
 * Handles rich text, hyperlinks, formulas, and encoding issues
 */
function extractCellText(cellValue: any): string {
  if (cellValue === null || cellValue === undefined) {
    return '';
  }

  // Handle different cell value types
  if (typeof cellValue === 'string') {
    return cellValue;
  }

  if (typeof cellValue === 'number') {
    return cellValue.toString();
  }

  if (typeof cellValue === 'boolean') {
    return cellValue.toString();
  }

  // Handle Date objects
  if (cellValue instanceof Date) {
    return cellValue.toISOString();
  }

  // Handle rich text objects
  if (cellValue.richText && Array.isArray(cellValue.richText)) {
    return cellValue.richText.map((rt: any) => rt.text || '').join('');
  }

  // Handle hyperlink objects
  if (cellValue.text && cellValue.hyperlink) {
    return cellValue.text;
  }

  // Handle formula results
  if (cellValue.result !== undefined) {
    return extractCellText(cellValue.result);
  }

  // Handle error values
  if (cellValue.error) {
    return `#${cellValue.error}`;
  }

  // Last resort: convert to string
  return String(cellValue);
}

/**
 * Detect and decode text with proper encoding
 * Tries UTF-8 first, then falls back to common encodings
 */
function decodeBuffer(buffer: ArrayBuffer): string {
  const uint8Array = new Uint8Array(buffer);

  // Try UTF-8 first
  const utf8Decoder = new TextDecoder('utf-8', { fatal: false });
  let text = utf8Decoder.decode(uint8Array);

  // Check for replacement characters indicating encoding issues
  const replacementCharCount = (text.match(/�/g) || []).length;

  // If more than 1% of characters are replacement chars, try other encodings
  if (replacementCharCount > text.length * 0.01) {
    // Try Windows-1252 (common for legacy Windows exports)
    try {
      const win1252Decoder = new TextDecoder('windows-1252');
      const altText = win1252Decoder.decode(uint8Array);

      // Check if this encoding has fewer issues
      const altReplacementCount = (altText.match(/�/g) || []).length;
      if (altReplacementCount < replacementCharCount) {
        text = altText;
      }
    } catch (e) {
      // Stick with UTF-8 if Windows-1252 fails
    }

    // Try ISO-8859-1 (Latin-1) as another fallback
    if (replacementCharCount > text.length * 0.01) {
      try {
        const latin1Decoder = new TextDecoder('iso-8859-1');
        const latin1Text = latin1Decoder.decode(uint8Array);

        const latin1ReplacementCount = (latin1Text.match(/�/g) || []).length;
        if (latin1ReplacementCount < replacementCharCount) {
          text = latin1Text;
        }
      } catch (e) {
        // Stick with previous best attempt
      }
    }
  }

  return text;
}

/**
 * Parse uploaded file into raw data rows
 */
async function parseFileToRows(file: File): Promise<Record<string, any>[]> {
  const buffer = await file.arrayBuffer();

  if (file.name.toLowerCase().endsWith('.csv')) {
    // Handle CSV files with encoding detection
    const text = decodeBuffer(buffer);
    return parseCSVToRows(text);
  } else {
    // Handle Excel files
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return [];
    }

    const jsonData: Record<string, any>[] = [];
    const headers = (worksheet.getRow(1).values as string[]).slice(1); // Get headers from the first row
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber > 1) { // Skip header row
        const rowData: Record<string, any> = {};
        row.eachCell((cell, colNumber) => {
          // Extract text properly, handling rich text, hyperlinks, etc.
          rowData[headers[colNumber - 1]] = extractCellText(cell.value);
        });
        jsonData.push(rowData);
      }
    });
    return jsonData;
  }
}

/**
 * Parse CSV text into rows
 */
function parseCSVToRows(csvText: string): Record<string, any>[] {
  const lines = csvText.split('\n');
  const rows: Record<string, any>[] = [];
  
  // Assume first row contains headers
  if (lines.length < 2) {
    return [];
  }

  const headers = parseCSVLine(lines[0]);
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.some(v => v.trim())) { // Skip empty rows
      const row: Record<string, any> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }
  }

  return rows;
}

/**
 * Parse a single CSV line handling quotes and escapes
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
    i++;
  }

  result.push(current.trim());
  return result;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Return upload status/info - could be extended for progress tracking
    return NextResponse.json({
      supported_formats: ['xlsx', 'xls', 'csv'],
      max_file_size: '50MB',
      processing_capabilities: {
        corruption_recovery: true,
        timestamp_reconstruction: true,
        speaker_identification: true,
        text_cleaning: true,
        automatic_sorting: true
      }
    });

  } catch (error) {
    console.error('Upload info error:', error);
    return NextResponse.json(
      { error: 'Failed to get upload information' },
      { status: 500 }
    );
  }
}