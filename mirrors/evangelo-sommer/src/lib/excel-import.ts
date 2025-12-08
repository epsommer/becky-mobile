import ExcelJS from 'exceljs';

import {
  MessageRow,
  UserInfo,
  ClientInfo,
  SenderNormalizationConfig,
  NormalizedMessage,
  ImportedConversation,
  ExcelParseResult,
} from "../types/excel-import";
import { Message } from "../types/client";
import { DateParser } from "./parsers/date-parser";

/**
 * Parse Excel file and extract message data
 */
export const parseExcelFile = async (file: File): Promise<ExcelParseResult> => {
  try {
    console.log("=== EXCEL PARSING DEBUG START ===");
    console.log("File name:", file.name);
    console.log("File size:", file.size);
    console.log("File type:", file.type);
    
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    // Get the first worksheet
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error("No worksheets found in the Excel file.");
    }
    console.log("Worksheet name:", worksheet.name);

    const rawArrayData: unknown[][] = [];
    worksheet.eachRow((row) => {
      const rowValues: unknown[] = [];
      // Note: row.values is 1-indexed in exceljs
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        rowValues[colNumber - 1] = cell.value;
      });
      rawArrayData.push(rowValues);
    });

    // Try multiple parsing methods
    console.log("\n--- METHOD 1: Raw array parsing ---");
    console.log("Raw array data (first 10 rows):", rawArrayData.slice(0, 10));

    console.log("\n--- METHOD 2: Object parsing with auto headers ---");
    const headersFromFirstRow = rawArrayData[0] as string[];
    const objectData = rawArrayData.slice(1).map(row => {
      const obj: Record<string, unknown> = {};
      headersFromFirstRow.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
    console.log("Object data (first 5 rows):", objectData.slice(0, 5));

    console.log("\n--- METHOD 3: Manual cell inspection ---");
    for (let R = 0; R < Math.min(worksheet.rowCount, 10); R++) {
      const row = worksheet.getRow(R + 1);
      const rowData: Record<string, unknown> = {};
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        rowData[cell.address.replace(/\d+/, '')] = cell.value;
      });
      console.log(`Row ${R + 1}:`, rowData);
    }

    // Try to find headers in the object data
    console.log("\n--- HEADER DETECTION ---");
    let headerRowIndex = -1;
    let headers: string[] = [];

    // Check if objectData has valid headers
    if (objectData.length > 0) {
      const firstRow = objectData[0];
      headers = Object.keys(firstRow as Record<string, unknown>);
      console.log("Detected headers from object data:", headers);

      // Check if these look like valid headers
      const validHeaders = headers.filter((header) => {
        const lower = header.toLowerCase();
        return [
          "type",
          "date",
          "content",
          "name",
          "number",
          "message",
          "text",
        ].some((keyword) => lower.includes(keyword));
      });

      console.log("Valid headers found:", validHeaders);

      if (validHeaders.length >= 2) {
        console.log("✅ Headers detected successfully!");
        return {
          success: true,
          data: objectData as Record<string, unknown>[],
          headers: headers,
          filename: file.name,
        };
      }
    }

    // Fallback: Try to find headers in raw array data
    console.log("\n--- FALLBACK: Array header detection ---");
    for (let i = 0; i < Math.min(rawArrayData.length, 10); i++) {
      const row = rawArrayData[i];
      console.log(`Checking row ${i + 1} for headers:`, row);

      if (Array.isArray(row) && row.length > 0) {
        const hasValidHeaders = row.some((cell: unknown) => {
          if (!cell || typeof cell !== "string") return false;
          const lower = cell.toLowerCase();
          return ["type", "date", "content", "name", "number"].some((keyword) =>
            lower.includes(keyword),
          );
        });

        if (hasValidHeaders) {
          console.log(`✅ Found headers in row ${i + 1}:`, row);
          headerRowIndex = i;
          headers = row.map((cell: unknown, index: number) =>
            cell && typeof cell === "string"
              ? cell.trim()
              : `Column${index + 1}`,
          );
          break;
        }
      }
    }

    if (headerRowIndex >= 0) {
      // Convert remaining data to objects
      const dataRows = (rawArrayData as unknown[][])
        .slice(headerRowIndex + 1)
        .map((row: unknown[]) => {
          const obj: Record<string, unknown> = {};
          headers.forEach((header, index) => {
            obj[header] = row[index] || "";
          });
          return obj;
        })
        .filter((row) => {
          const values = Object.values(row).filter(
            (val) => val && val.toString().trim() !== "",
          );
          return values.length > 0;
        });

      console.log("✅ Successfully parsed with fallback method");
      console.log("Final headers:", headers);
      console.log("Data rows:", dataRows.length);
      console.log("Sample data:", dataRows.slice(0, 3));

      return {
        success: true,
        data: dataRows,
        headers: headers,
        filename: file.name,
      };
    }

    console.log("❌ No valid headers found in standard methods");
    
    // Try variable structure SMS parsing as final attempt
    console.log("\n--- VARIABLE STRUCTURE SMS PARSING ATTEMPT ---");
    try {
      // Analyze structure first for debugging
      const patterns = analyzeExcelStructure(worksheet);
      
      // Try variable structure SMS parsing (handles 1-5 row message blocks)
      const smsMessages = parseVariableStructureSMS(worksheet);
      
      if (smsMessages.length > 0) {
        console.log(`✅ Variable structure SMS parsing succeeded: ${smsMessages.length} messages`);
        
        // Convert to expected format
        const convertedData = smsMessages.map(msg => ({
          'Type': msg.role === 'you' ? 'Sent' : 'Received',
          'Date': msg.timestamp,
          'Name / Number': (msg.metadata as any)?.emailAddress || (msg.role === 'client' ? 'Mark' : 'Evan'),
          'Content': msg.content
        }));
        
        return {
          success: true,
          data: convertedData,
          headers: ['Type', 'Date', 'Name / Number', 'Content'],
          filename: file.name,
        };
      }
    } catch (enhancedError) {
      console.error("Variable structure parsing failed:", enhancedError);
    }
    
    console.log("❌ All parsing methods failed");
    console.log("=== EXCEL PARSING DEBUG END ===");

    throw new Error(
      `Could not find header row or parse data. Detected ${rawArrayData.length} rows total. Please check the file format.`,
    );
  } catch (error) {
    console.error("Excel parsing error:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    console.log("=== EXCEL PARSING DEBUG END (ERROR) ===");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown parsing error",
      filename: file.name,
    };
  }
};

/**
 * Analyze Excel structure to understand data layout and patterns
 */
export const analyzeExcelStructure = (worksheet: ExcelJS.Worksheet) => {
  console.group('📊 Excel Structure Analysis');
  console.log(`Dimensions: ${worksheet.rowCount} rows, ${worksheet.columnCount} columns`);
  
  // Analyze first 20 rows to understand structure
  for (let R = 1; R <= Math.min(20, worksheet.rowCount); R++) {
    const row = worksheet.getRow(R);
    const rowData: Record<string, unknown> = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      rowData[`Col${colNumber}`] = cell.value ? {
        raw: cell.value,
        formatted: cell.text,
        type: cell.type
      } : null;
    });
    console.log(`Row ${R}:`, rowData);
  }
  
  // Look for patterns
  const patterns = {
    datePatterns: [] as Array<{row: number, col: number, value: string}>,
    senderPatterns: [] as Array<{row: number, col: number, value: string}>,
    contentPatterns: [] as Array<{row: number, col: number, value: string}>
  };
  
  worksheet.eachRow((row: ExcelJS.Row, rowNumber: number) => {
    row.eachCell({ includeEmpty: true }, (cell: ExcelJS.Cell, colNumber: number) => {
      const cellText = cell.text;
      if (cellText) {
        // Check for date patterns
        if (cellText.match(/\d{1,2}:\d{2}:\d{2}|Eastern|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/)) {
          patterns.datePatterns.push({row: rowNumber, col: colNumber, value: cellText});
        }
        // Check for sender patterns  
        if (cellText.match(/Mark|Evan|\+\d{11}/)) {
          patterns.senderPatterns.push({row: rowNumber, col: colNumber, value: cellText});
        }
      }
    });
  });

  console.log('Detected Patterns:', patterns);
  console.groupEnd();
  
  return patterns;
};

/**
 * Multi-Pattern Excel parser for variable structure SMS exports
 * Handles inconsistent row/cell structures by treating each message as a variable-length block
 */
export const parseVariableStructureSMS = (worksheet: ExcelJS.Worksheet): Message[] => {
  const messages: Message[] = [];
  let i = 1; // Skip header row
  
  console.log('🔄 Starting variable structure SMS parsing...');
  console.log(`Processing ${worksheet.rowCount} rows, ${worksheet.columnCount} columns`);
  
  while (i <= worksheet.rowCount) {
    const messageData = extractMessageBlock(worksheet, i);
    
    if (messageData.message) {
      messages.push({
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        role: determineRoleFromSender(messageData.sender),
        content: messageData.message.trim(),
        timestamp: parseFlexibleDate(messageData.dateComponents) || generateSequentialTimestamp(messages.length),
        type: 'text',
        metadata: {
          subject: `SMS from ${messageData.sender}`,
          ...(messageData.sender && { emailAddress: messageData.sender }),
        } as any
      });
      
      console.log(`✅ Extracted message ${messages.length}: "${messageData.message.substring(0, 50)}..." from rows ${i}-${messageData.nextRow - 1}`);
    }
    
    i = messageData.nextRow;
  }
  
  console.log(`🎯 Variable structure parsing complete: ${messages.length} messages extracted`);
  return messages;
};

/**
 * Extract a complete message block from variable row structure
 */
function extractMessageBlock(worksheet: ExcelJS.Worksheet, startRow: number) {
  let currentRow = startRow;
  let messageType = '';
  let dateComponents: string[] = [];
  let sender = '';
  let message = '';
  let foundComplete = false;
  
  // Look ahead up to 10 rows to find complete message block
  for (let offset = 0; offset < 10 && (currentRow + offset) <= worksheet.rowCount; offset++) {
    const rowData = getRowData(worksheet, currentRow + offset);
    
    // Check if this row starts a new message block (but not on first iteration)
    if (offset > 0 && isNewMessageStart(rowData)) {
      break; // Stop here, next message starts
    }
    
    // Extract components from this row
    const analysis = analyzeRowContent(rowData);
    
    if (analysis.isMessageType) messageType = analysis.value;
    if (analysis.isDateComponent) dateComponents.push(analysis.value);
    if (analysis.isSender) sender = analysis.value;
    if (analysis.isMessage) message += (message ? ' ' : '') + analysis.value;
    
    // Check if we have a complete message
    if (messageType && sender && message && dateComponents.length > 0) {
      foundComplete = true;
      currentRow += offset + 1;
      break;
    }
  }
  
  // If not complete, try to salvage what we have
  if (!foundComplete) {
    currentRow += 1; // Move to next row anyway
  }
  
  return {
    message,
    sender,
    dateComponents,
    messageType,
    rowsUsed: currentRow - startRow,
    nextRow: currentRow
  };
}

/**
 * Get row data as array of non-empty strings
 */
function getRowData(worksheet: ExcelJS.Worksheet, rowNumber: number): string[] {
  const data: string[] = [];
  const row = worksheet.getRow(rowNumber);
  row.eachCell({ includeEmpty: true }, (cell) => {
    data.push(cell.text?.trim() || '');
  });
  return data.filter(Boolean); // Remove empty cells
}

/**
 * Analyze row content to identify component types
 */
function analyzeRowContent(rowData: string[]) {
  const combinedText = rowData.join(' ').trim();
  
  return {
    isMessageType: /^(Sent|Received)$/i.test(combinedText),
    isDateComponent: /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)|^\d{1,2}:\d{2}:\d{2}|^Eastern|^\d{4}$|^(January|February|March|April|May|June|July|August|September|October|November|December)/i.test(combinedText),
    isSender: /^\+\d{11}$|^[A-Za-z]+\s+[A-Za-z]+|^You$|^Mark|^Evan/i.test(combinedText),
    isMessage: combinedText.length > 20 && !/^(Sent|Received|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|\d{1,2}:\d{2}:\d{2}|Eastern|\d{4}|\+\d{11})$/i.test(combinedText),
    value: combinedText
  };
}

/**
 * Check if row data indicates start of new message
 */
function isNewMessageStart(rowData: string[]): boolean {
  const firstCell = rowData[0] || '';
  return /^(Sent|Received)$/i.test(firstCell);
}

/**
 * Parse date components using flexible approach
 */
function parseFlexibleDate(dateComponents: string[]): string | null {
  if (dateComponents.length === 0) return null;
  
  // Combine all date components into multi-line format
  const fullDateString = `"${dateComponents.join('\n')}"`;
  
  console.log(`🗓️ Parsing flexible date:`, fullDateString);
  
  // Use existing enhanced conversation date parser
  const result = DateParser.parseConversationExportDate(fullDateString);
  
  if (result) {
    console.log(`✅ Date parsed successfully: ${result}`);
  } else {
    console.log(`❌ Date parsing failed, will use sequential fallback`);
  }
  
  return result;
}

/**
 * Determine message role from sender information
 */
function determineRoleFromSender(sender: string): 'you' | 'client' {
  if (!sender) return 'client';
  if (sender.toLowerCase().includes('mark') || sender.includes('+')) return 'client';
  if (sender.toLowerCase().includes('evan') || sender === 'You') return 'you';
  return 'client';
}

/**
 * Generate sequential timestamp for fallback
 */
function generateSequentialTimestamp(index: number): string {
  const baseDate = new Date('2024-12-08T14:00:00-05:00');
  const minutesPerMessage = 15;
  return new Date(baseDate.getTime() + (index * minutesPerMessage * 60000)).toISOString();
}


/**
 * Extract contact information from name/number string
 */
export const extractContact = (nameNumber: string): string => {
  // Extract phone number
  const phoneMatch = nameNumber.match(
    /[\+]?[1]?[-.\s]?[\(]?([0-9]{3})[\)]?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/,
  );
  if (phoneMatch) {
    return phoneMatch[0].replace(/\D/g, ""); // Return clean digits
  }

  // Extract email
  const emailMatch = nameNumber.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
  if (emailMatch) {
    return emailMatch[0];
  }

  // Return as-is if no pattern matches
  return nameNumber;
};

/**
 * Extract name from name/number string
 */
export const extractName = (nameNumber: string): string => {
  // Remove phone number and parentheses
  return nameNumber
    .replace(
      /[\+]?[1]?[-.\s]?[\(]?([0-9]{3})[\)]?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/,
      "",
    )
    .replace(/^\(|\)$/g, "")
    .replace(/\s*\([^)]*\)\s*/g, "") // Remove anything in parentheses
    .trim();
};

/**
 * Parse date string to ISO format with enhanced SMS support
 */
export const parseDate = (
  dateValue: unknown,
  rowIndex?: number,
  fallbackDate?: Date,
): string => {
  console.log(
    `🕒 parseDate called for row ${rowIndex || "unknown"}:`,
    dateValue,
  );

  // Try enhanced conversation date parsing first
  const parsedDate = DateParser.parseConversationExportDate(dateValue);

  if (parsedDate) {
    console.log(`✅ Successfully parsed date for row ${rowIndex}:`, parsedDate);
    return parsedDate;
  }

  // If parsing failed, use sequential fallback based on row index
  if (typeof rowIndex === "number" && fallbackDate) {
    console.log(
      `⚠️ Date parsing failed for row ${rowIndex}, using sequential fallback`,
    );
    return DateParser.generateSequentialDate(fallbackDate, rowIndex, 1);
  }

  // Last resort: use current time but log the failure
  console.error(`❌ Complete date parsing failure for:`, dateValue);
  return new Date().toISOString();
};

/**
 * Normalize sender data for a message row
 */
export const normalizeSender = (
  row: MessageRow,
  config: SenderNormalizationConfig,
  rowIndex?: number,
  fallbackDate?: Date,
): NormalizedMessage => {
  const isOutgoing = row.Type.toLowerCase() === "sent";
  const nameNumber = row["Name / Number"];

  // Try to parse the date with enhanced logic
  const originalDate = row.Date;
  const parsedTimestamp = parseDate(originalDate, rowIndex, fallbackDate);
  const parseSuccess = DateParser.parseConversationExportDate(originalDate) !== null;

  return {
    content: row.Content,
    timestamp: parsedTimestamp,
    sender: isOutgoing ? "you" : "client",
    senderName: isOutgoing ? config.userName : config.clientName,
    senderContact: isOutgoing ? config.userPhone : extractContact(nameNumber),
    recipientName: isOutgoing ? config.clientName : config.userName,
    recipientContact: isOutgoing
      ? extractContact(nameNumber)
      : config.userPhone,
    type: "text" as const,
    metadata: {
      originalType: row.Type,
      originalNameNumber: nameNumber,
      direction: isOutgoing ? ("outgoing" as const) : ("incoming" as const),
      originalTimestamp: originalDate,
      parseSuccess,
      rowIndex,
    },
  };
};

/**
 * Detect if Excel data uses conversation export date format
 */
export const detectConversationDateFormat = (
  excelData: MessageRow[],
): boolean => {
  // Look for multi-line date format in Date column
  const sampleRows = excelData.slice(0, 10); // Check first 10 rows
  
  for (const row of sampleRows) {
    const dateValue = row.Date;
    if (typeof dateValue === 'string' && dateValue.includes('\n')) {
      const lines = dateValue.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      
      // Check various conversation format patterns:
      if (lines.length >= 2) {
        const firstLine = lines[0];
        const secondLine = lines[1];
        
        // Pattern 1: Standard format - "Day, Month DD, YYYY" + time
        const hasStandardDatePattern = /[A-Za-z]+,\s+[A-Za-z]+\s+\d{1,2},\s+\d{4}/.test(firstLine);
        const hasTimePattern = /\d{1,2}:\d{2}:\d{2}\s*[ap]\.?m\./i.test(secondLine);
        
        // Pattern 2: Year continuation - "Day, Month DD," + "YYYY time"
        const hasPartialDatePattern = /[A-Za-z]+,\s+[A-Za-z]+\s+\d{1,2},\s*$/.test(firstLine);
        const hasYearAndTimePattern = /^\d{4}\s+\d{1,2}:\d{2}:\d{2}\s*[ap]\.?m\./i.test(secondLine);
        
        // Pattern 3: Split year - "Day, Month DD," + "YYYY" + time in third line
        const hasSplitYearPattern = lines.length >= 3 && 
                                   hasPartialDatePattern && 
                                   /^\d{4}$/.test(secondLine) &&
                                   /\d{1,2}:\d{2}:\d{2}\s*[ap]\.?m\./i.test(lines[2]);
        
        if (hasStandardDatePattern && hasTimePattern) {
          console.log('📅 Detected standard conversation date format');
          return true;
        }
        
        if (hasPartialDatePattern && hasYearAndTimePattern) {
          console.log('📅 Detected year continuation conversation date format');
          return true;
        }
        
        if (hasSplitYearPattern) {
          console.log('📅 Detected split year conversation date format');
          return true;
        }
      }
    }
  }
  
  return false;
};

/**
 * Auto-detect client information from Excel data
 */
export const detectClientInfo = (
  excelData: MessageRow[],
): Partial<ClientInfo> => {
  // Look for conversation header in any cell that might contain it
  const possibleHeaders = excelData.slice(0, 5); // Check first 5 rows

  for (const row of possibleHeaders) {
    const values = Object.values(row);
    for (const value of values) {
      if (typeof value === "string" && value.includes("Conversation with:")) {
        const match = value.match(/Conversation with:\s*(.+?)\s*\((.+?)\)/);
        if (match) {
          return {
            name: match[1].trim(),
            phone: match[2].replace(/\D/g, ""),
            contact: match[2],
          };
        }
      }
    }
  }

  // Fallback: look for received messages to get client name
  const receivedMessage = excelData.find(
    (row) => row.Type?.toLowerCase() === "received",
  );

  if (receivedMessage) {
    const nameNumber = receivedMessage["Name / Number"];
    return {
      name: extractName(nameNumber),
      phone: extractContact(nameNumber),
      contact: nameNumber,
    };
  }

  return {};
};

/**
 * Generate unique message ID
 */
export const generateMessageId = (): string => {
  return `msg_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Process complete conversation import with normalization
 */
export const processConversationImport = (
  excelData: MessageRow[],
  userInfo: UserInfo,
  clientInfo: ClientInfo,
): ImportedConversation => {
  console.log("🔄 Processing conversation import with enhanced date parsing");
  console.log("📊 Total Excel data rows:", excelData.length);

  // Filter out header rows and empty rows
  const messageRows = excelData.filter(
    (row) =>
      row.Type &&
      row.Date &&
      row.Content &&
      ["sent", "received"].includes(row.Type.toLowerCase()),
  );

  console.log("✅ Filtered message rows:", messageRows.length);

  // Use a base date for sequential fallback (estimate based on typical SMS usage)
  const fallbackBaseDate = new Date();
  fallbackBaseDate.setMonth(fallbackBaseDate.getMonth() - 6); // 6 months ago as estimate

  // Normalize all messages with enhanced date parsing
  const normalizedMessages = messageRows.map((row, index) =>
    normalizeSender(
      row,
      {
        userName: userInfo.name,
        userPhone: userInfo.phone,
        userEmail: userInfo.email,
        clientName: clientInfo.name,
        clientPhone: clientInfo.phone,
        clientEmail: clientInfo.email,
      },
      index,
      fallbackBaseDate,
    ),
  );

  // Sort by timestamp
  normalizedMessages.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  // Convert to conversation format
  const conversation: ImportedConversation = {
    title: `Text conversation with ${clientInfo.name}`,
    messages: normalizedMessages.map((msg) => ({
      id: generateMessageId(),
      role: msg.sender,
      content: msg.content,
      timestamp: msg.timestamp,
      type: "text" as const,
      metadata: {
        senderName: msg.senderName,
        senderContact: msg.senderContact,
        recipientName: msg.recipientName,
        recipientContact: msg.recipientContact,
        originalData: msg.metadata,
      },
    })),
    metadata: {
      participantName: clientInfo.name,
      participantContact: clientInfo.phone,
      userInfo: userInfo,
      importedFrom: "text_message_export" as const,
      messageCount: normalizedMessages.length,
      dateRange: {
        start: normalizedMessages[0]?.timestamp || new Date().toISOString(),
        end:
          normalizedMessages[normalizedMessages.length - 1]?.timestamp ||
          new Date().toISOString(),
      },
    },
  };

  return conversation;
};

/**
 * Convert ImportedConversation to Message array for existing system
 */
export const convertToMessages = (
  importedConversation: ImportedConversation,
): Message[] => {
  return importedConversation.messages.map((msg) => ({
    id: msg.id,
    role: msg.role,
    content: msg.content,
    timestamp: msg.timestamp,
    type: msg.type,
    metadata: {
      phoneNumber: msg.metadata.senderContact,
      // Store additional Excel import data as custom fields if needed
      subject: `${msg.metadata.originalData.originalType} message from ${msg.metadata.senderName}`,
    },
  }));
};
