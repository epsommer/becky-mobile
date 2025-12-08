// src/components/conversation/FileImportEngine.tsx
"use client";

import { useState, useCallback, useRef } from "react";
import { Message } from "../../types/client";
import ExcelJS from 'exceljs';

// Extended Message type for file import with additional metadata
interface ImportedMessage extends Message {
  metadata?: Message['metadata'] & {
    originalType?: string;
    importMethod?: string;
    originalLine?: string;
    originalDate?: string;
    reconstructed?: boolean;
    lineNumber?: number;
    sender?: string;
  };
}

interface FileImportEngineProps {
  onMessagesImported: (messages: Message[]) => void;
  onError: (error: string | null) => void;
}

interface ParseResult {
  success: boolean;
  messages: ImportedMessage[];
  errors: string[];
  method: string;
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

export default function FileImportEngine({ onMessagesImported, onError }: FileImportEngineProps) {
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [parseResults, setParseResults] = useState<ParseResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Multi-format parsing strategies
  const parseStrategies = [
    { name: 'Excel File (XLSX/XLS)', method: 'excel', parser: parseExcelFile },
    { name: 'CSV Tab-Separated', method: 'csv-tabs', parser: parseCSVTabSeparated },
    { name: 'CSV Comma-Separated', method: 'csv-comma', parser: parseCSVCommaSeparated },
    { name: 'Text Pattern Matching', method: 'text-patterns', parser: parseTextPatterns },
    { name: 'Line-by-Line Text', method: 'text-lines', parser: parseTextLines },
    { name: 'JSON Structure', method: 'json', parser: parseJSONStructure },
    { name: 'Fallback Content Extractor', method: 'fallback', parser: parseFallbackContent }
  ];

  // Excel File Parser (Handles XLSX/XLS files)
  function parseExcelFile(content: string, file?: File): Promise<ParseResult> {
    const messages: ImportedMessage[] = [];
    const errors: string[] = [];

    try {
      console.log('🔍 Trying Excel file parsing...');
      
      if (!file) {
        throw new Error('Excel parsing requires file object');
      }

      return new Promise<ParseResult>((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const data = e.target?.result;
            if (!data) {
              resolve({
                success: false,
                messages: [],
                errors: ['Failed to read file data'],
                method: 'excel'
              });
              return;
            }

            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(data as ArrayBuffer);
            const worksheet = workbook.worksheets[0];
            const jsonData: any[][] = [];

            // Extract cell values properly, handling rich text objects
            worksheet.eachRow((row: ExcelJS.Row) => {
              const rowData: any[] = [];
              row.eachCell((cell) => {
                rowData.push(extractCellText(cell.value));
              });
              // Add empty strings for any missing cells at the end
              while (rowData.length < 5) {
                rowData.push('');
              }
              jsonData.push(rowData);
            });

            console.log('📊 Excel data parsed:', jsonData.length, 'rows');
            console.log('📋 First few rows:', jsonData.slice(0, 3));

            let messageIndex = 0;
            // Skip empty rows and find header
            let headerRowIndex = -1;
            for (let i = 0; i < jsonData.length; i++) {
              const row = jsonData[i] as any[];
              if (row && row.length > 0) {
                const rowStr = row.join('').toLowerCase();
                if (rowStr.includes('type') || rowStr.includes('sent') || rowStr.includes('received')) {
                  headerRowIndex = i;
                  break;
                }
              }
            }

            // Reconstruct messages from Excel data using same logic as CSV
            const excelMessages = reconstructExcelMessages(jsonData, headerRowIndex);
            console.log(`🔧 Reconstructed ${excelMessages.length} Excel messages`);
            
            for (const msgData of excelMessages) {
              if (msgData.content && msgData.content.trim().length > 0) {
                // Use improved role detection
                const role = determineMessageRole(msgData.type, msgData.sender, msgData.content);
                
                // Try to parse actual timestamps
                const timestamp = parseActualTimestamp(msgData.dateString) || 
                                generateSequentialTimestamp(messageIndex, excelMessages.length);
                
                messages.push({
                  id: `msg_${Date.now()}_${messageIndex++}`,
                  role,
                  content: msgData.content.trim(),
                  timestamp,
                  type: 'text',
                  metadata: {
                    originalType: msgData.type,
                    sender: msgData.sender,
                    originalDate: msgData.dateString,
                    reconstructed: true,
                    importMethod: 'excel-enhanced'
                  }
                });
              }
            }

            resolve({
              success: messages.length > 0,
              messages,
              errors: messages.length === 0 ? ['No valid messages found in Excel file'] : [],
              method: 'excel'
            });

          } catch (error) {
            resolve({
              success: false,
              messages: [],
              errors: [`Excel parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
              method: 'excel'
            });
          }
        };

        reader.onerror = () => {
          resolve({
            success: false,
            messages: [],
            errors: ['Failed to read Excel file'],
            method: 'excel'
          });
        };

        reader.readAsArrayBuffer(file);
      });

    } catch (error) {
      return Promise.resolve({
        success: false,
        messages: [],
        errors: [`Excel parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        method: 'excel'
      });
    }
  }

  // Enhanced CSV Tab-Separated Parser for SMS exports
  function parseCSVTabSeparated(content: string, file?: File): ParseResult {
    const messages: ImportedMessage[] = [];
    const errors: string[] = [];

    try {
      console.log('🔍 Trying Enhanced CSV Tab-Separated parsing...');
      const lines = content.split('\n').filter(line => line.trim());
      console.log(`📋 Found ${lines.length} non-empty lines`);
      
      // More sophisticated message reconstruction
      const reconstructedMessages = reconstructSMSMessages(lines);
      console.log(`🔧 Reconstructed ${reconstructedMessages.length} complete messages`);
      
      let messageIndex = 0;
      for (const msgData of reconstructedMessages) {
        if (msgData.content && msgData.content.trim().length > 0) {
          // Improved role detection
          const role = determineMessageRole(msgData.type, msgData.sender, msgData.content);
          
          // Try to parse actual timestamps if available
          const timestamp = parseActualTimestamp(msgData.dateString) || 
                          generateSequentialTimestamp(messageIndex, reconstructedMessages.length);
          
          messages.push({
            id: `msg_${Date.now()}_${messageIndex++}`,
            role,
            content: msgData.content.trim(),
            timestamp,
            type: 'text',
            metadata: {
              originalType: msgData.type,
              sender: msgData.sender,
              originalDate: msgData.dateString,
              reconstructed: true,
              importMethod: 'csv-tabs-enhanced'
            }
          });
        }
      }

      return {
        success: messages.length > 0,
        messages,
        errors: messages.length === 0 ? ['No valid messages found in enhanced CSV format'] : [],
        method: 'csv-tabs'
      };
    } catch (error) {
      return {
        success: false,
        messages: [],
        errors: [`Enhanced CSV parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        method: 'csv-tabs'
      };
    }
  }

  // Reconstruct complete SMS messages from fragmented CSV data
  function reconstructSMSMessages(lines: string[]) {
    const messages: Array<{
      type: string;
      sender: string;
      content: string;
      dateString: string;
    }> = [];
    
    let currentMessage: {
      type: string;
      sender: string;
      content: string;
      dateString: string;
    } | null = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split('\t').map(part => cleanQuotes(part.trim()));
      
      // Check if this is a new message start
      const isNewMessage = parts[0] && (parts[0].includes('Sent') || parts[0].includes('Received'));
      
      if (isNewMessage) {
        // Save previous message if it has content
        if (currentMessage && currentMessage.content.trim()) {
          messages.push({ ...currentMessage });
        }
        
        // Start new message
        currentMessage = {
          type: parts[0] || '',
          dateString: parts[1] || '',
          sender: parts[2] || '',
          content: parts[3] || ''
        };
        
        // Look ahead for additional content in subsequent parts of same line
        for (let j = 4; j < parts.length; j++) {
          if (parts[j] && parts[j].length > 5 && !parts[j].match(/^\d{4}$|^\d{1,2}:\d{2}/)) {
            currentMessage.content += (currentMessage.content ? ' ' : '') + parts[j];
          }
        }
      } else if (currentMessage) {
        // This is a continuation line - add meaningful content
        for (const part of parts) {
          if (part && part.length > 5 && 
              !part.match(/^\d{4}$|^\d{1,2}:\d{2}:\d{2}|^Eastern|^\+\d{10}/) &&
              part !== currentMessage.sender) {
            currentMessage.content += (currentMessage.content ? ' ' : '') + part;
          }
        }
      }
    }
    
    // Don't forget the last message
    if (currentMessage && currentMessage.content.trim()) {
      messages.push(currentMessage);
    }
    
    console.log('🧩 Reconstructed messages:', messages.slice(0, 3));
    return messages;
  }
  
  // ConvoClean exact speaker identification logic
  function determineMessageRole(originalType: string, sender: string, content: string): 'you' | 'client' {
    console.log(`🎯 ConvoClean Frontend - OriginalType: "${originalType}", Sender: "${sender}"`);
    
    // Sent messages = you
    if (originalType === 'Sent' || (originalType.includes('Sent') && !originalType.includes('Received'))) {
      console.log(`✅ ConvoClean Frontend: SENT message detected → role: "you"`);
      return 'you';
    }
    
    // Received messages = client
    if (originalType.includes('Received Sent by:') || originalType === 'Received' || originalType.includes('Received')) {
      console.log(`✅ ConvoClean Frontend: RECEIVED message detected → role: "client"`);
      return 'client';
    }
    
    // Fallback - default to client
    console.log(`⚠️ ConvoClean Frontend: Fallback used for originalType: "${originalType}"`);
    return 'client';
  }
  
  // Parse actual timestamps from date strings
  function parseActualTimestamp(dateString: string): string | null {
    if (!dateString || dateString.trim().length === 0) return null;
    
    try {
      // Common SMS export date formats
      const cleanDate = dateString.trim();
      
      // Try various date parsing approaches
      const patterns = [
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/, // MM/dd/yyyy HH:mm:ss
        /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/, // yyyy-MM-dd HH:mm:ss
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/dd/yyyy
      ];
      
      for (const pattern of patterns) {
        const match = cleanDate.match(pattern);
        if (match) {
          const parsedDate = new Date(cleanDate);
          if (!isNaN(parsedDate.getTime())) {
            return parsedDate.toISOString();
          }
        }
      }
    } catch (error) {
      console.log('⚠️ Failed to parse date:', dateString, error);
    }
    
    return null;
  }

  // CSV Comma-Separated Parser
  function parseCSVCommaSeparated(content: string, file?: File): ParseResult {
    const messages: ImportedMessage[] = [];
    const errors: string[] = [];

    try {
      console.log('🔍 Trying CSV Comma-Separated parsing...');
      const lines = content.split('\n');
      console.log(`📋 Processing ${lines.length} lines`);
      let messageIndex = 0;

      // Try to detect if first line is header
      let startIdx = 0;
      if (lines.length > 0) {
        const firstLine = lines[0].toLowerCase();
        if (firstLine.includes('type') || firstLine.includes('date') || firstLine.includes('content')) {
          startIdx = 1;
        }
      }
      
      for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = parseCSVLine(line, ',');
        if (parts.length >= 3) {
          const content = parts[parts.length - 1]; // Last column is usually content
          if (content && content.trim().length > 0) {
            messages.push({
              id: `msg_${Date.now()}_${messageIndex++}`,
              role: parts[0].toLowerCase().includes('sent') ? 'you' : 'client',
              content: cleanQuotes(content),
              timestamp: generateSequentialTimestamp(messageIndex, 100),
              type: 'text',
              metadata: {
                originalType: parts[0],
                importMethod: 'csv-comma'
              }
            });
          }
        }
      }

      return {
        success: messages.length > 0,
        messages,
        errors: messages.length === 0 ? ['No valid messages found in comma-separated format'] : [],
        method: 'csv-comma'
      };
    } catch (error) {
      return {
        success: false,
        messages: [],
        errors: [`Comma-separated parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        method: 'csv-comma'
      };
    }
  }

  // Text Pattern Matching Parser
  function parseTextPatterns(content: string, file?: File): ParseResult {
    const messages: ImportedMessage[] = [];
    const errors: string[] = [];

    try {
      console.log('🔍 Trying Text Pattern parsing...');
      console.log(`📋 Content length: ${content.length} characters`);
      
      // Split by common patterns
      const patterns = [
        /(?=Sent\t)/g,
        /(?=Received.*?\t)/g,
        /(?="Sent")/g,
        /(?="Received)/g,
        /(?=\d{1,2}\/\d{1,2}\/\d{4}.*?:)/g
      ];

      let blocks: string[] = [];
      for (const pattern of patterns) {
        blocks = content.split(pattern);
        if (blocks.length > 1) break;
      }

      let messageIndex = 0;
      for (const block of blocks) {
        if (block.trim().length < 10) continue;

        let role: 'you' | 'client' = 'client';
        let messageContent = '';

        if (block.toLowerCase().includes('sent')) {
          role = 'you';
        }

        // Find meaningful content - be more flexible
        const lines = block.split('\n');
        for (const line of lines) {
          const cleanLine = line.trim();
          // Look for lines with actual message content
          if (cleanLine.length > 5 && 
              !cleanLine.match(/^(Type|Date|Name|Content|Sent|Received|\d{4}|\d{1,2}:\d{2}:\d{2}|Eastern|\+\d)/i) &&
              !cleanLine.match(/^\d+$/) && // Not just numbers
              cleanLine.includes(' ')) { // Has spaces (likely text)
            if (cleanLine.length > messageContent.length) {
              messageContent = cleanLine;
            }
          }
        }

        if (messageContent) {
          messages.push({
            id: `msg_${Date.now()}_${messageIndex++}`,
            role,
            content: cleanQuotes(messageContent),
            timestamp: generateSequentialTimestamp(messageIndex, 100),
            type: 'text',
            metadata: {
              importMethod: 'text-patterns'
            }
          });
        }
      }

      return {
        success: messages.length > 0,
        messages,
        errors: messages.length === 0 ? ['No patterns matched in text content'] : [],
        method: 'text-patterns'
      };
    } catch (error) {
      return {
        success: false,
        messages: [],
        errors: [`Pattern parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        method: 'text-patterns'
      };
    }
  }

  // Line-by-Line Text Parser
  function parseTextLines(content: string, file?: File): ParseResult {
    const messages: ImportedMessage[] = [];
    const errors: string[] = [];

    try {
      console.log('🔍 Trying Line-by-Line text parsing...');
      const lines = content.split('\n');
      console.log(`📋 Processing ${lines.length} lines`);
      let messageIndex = 0;

      for (const line of lines) {
        const cleanLine = line.trim();
        if (cleanLine.length > 2 && 
            !cleanLine.match(/^(Type|Date|Name|Content|Sent|Received|\d{4}|\d{1,2}:\d{2}:\d{2})/i)) { // Any non-header content
          
          messages.push({
            id: `msg_${Date.now()}_${messageIndex++}`,
            role: messageIndex % 2 === 0 ? 'you' : 'client', // Alternate roles
            content: cleanQuotes(cleanLine),
            timestamp: generateSequentialTimestamp(messageIndex, 100),
            type: 'text',
            metadata: {
              importMethod: 'text-lines'
            }
          });
        }
      }

      return {
        success: messages.length > 0,
        messages,
        errors: messages.length === 0 ? ['No valid content lines found'] : [],
        method: 'text-lines'
      };
    } catch (error) {
      return {
        success: false,
        messages: [],
        errors: [`Line parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        method: 'text-lines'
      };
    }
  }

  // JSON Structure Parser
  function parseJSONStructure(content: string, file?: File): ParseResult {
    const messages: ImportedMessage[] = [];
    const errors: string[] = [];

    try {
      console.log('🔍 Trying JSON parsing...');
      const data = JSON.parse(content);
      
      if (Array.isArray(data)) {
        let messageIndex = 0;
        for (const item of data) {
          if (item.content || item.message || item.text) {
            messages.push({
              id: `msg_${Date.now()}_${messageIndex++}`,
              role: item.role || item.sender === 'you' ? 'you' : 'client',
              content: item.content || item.message || item.text,
              timestamp: item.timestamp || generateSequentialTimestamp(messageIndex, data.length),
              type: 'text',
              metadata: {
                ...item,
                importMethod: 'json'
              }
            });
          }
        }
      }

      return {
        success: messages.length > 0,
        messages,
        errors: messages.length === 0 ? ['No valid message objects found in JSON'] : [],
        method: 'json'
      };
    } catch (error) {
      return {
        success: false,
        messages: [],
        errors: [`JSON parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        method: 'json'
      };
    }
  }

  // Fallback Content Parser - extracts any meaningful text as messages
  function parseFallbackContent(content: string, file?: File): ParseResult {
    const messages: ImportedMessage[] = [];
    const errors: string[] = [];

    try {
      console.log('🔍 Trying Fallback Content parsing - extracting ANY meaningful text...');
      console.log(`📝 Content sample: "${content.substring(0, 200)}..."`);
      
      // Split content by multiple possible delimiters
      const allPossibleLines = content
        .split(/[\n\r\t]+/)
        .map(line => line.trim())
        .filter(line => line.length > 0);

      console.log(`📋 Found ${allPossibleLines.length} potential content lines`);

      let messageIndex = 0;
      const minLength = 2; // Very permissive minimum length
      
      for (const line of allPossibleLines) {
        // Skip obvious header/metadata lines but be very permissive
        const isSkippable = line.match(/^(Type|Date|Name|Content|Time|Phone|Email|Subject|\d{4}-\d{2}-\d{2}|\d{1,2}:\d{2}|\d{1,2}\/\d{1,2}\/\d{4})$/i);
        
        if (!isSkippable && line.length >= minLength) {
          // Extract meaningful content
          let cleanContent = line
            .replace(/^["']|["']$/g, '') // Remove quotes
            .replace(/^\w+\s*[:\-\>]\s*/, '') // Remove "Name:" or "Name ->" prefixes
            .trim();

          if (cleanContent.length >= minLength) {
            // Determine role - very simple heuristic
            const role: 'you' | 'client' = 
              line.toLowerCase().includes('sent') || 
              line.toLowerCase().includes('me:') || 
              line.toLowerCase().includes('you:') ? 'you' : 'client';

            messages.push({
              id: `msg_${Date.now()}_${messageIndex++}`,
              role,
              content: cleanContent,
              timestamp: generateSequentialTimestamp(messageIndex, allPossibleLines.length),
              type: 'text',
              metadata: {
                originalLine: line,
                importMethod: 'fallback',
                lineNumber: messageIndex + 1
              }
            });

            console.log(`✅ Extracted message ${messageIndex}: "${cleanContent.substring(0, 50)}..."`);
          }
        }
      }

      console.log(`📊 Fallback parser found ${messages.length} messages`);

      return {
        success: messages.length > 0,
        messages,
        errors: messages.length === 0 ? ['No extractable text content found in file'] : [],
        method: 'fallback'
      };
    } catch (error) {
      return {
        success: false,
        messages: [],
        errors: [`Fallback parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        method: 'fallback'
      };
    }
  }
  
  // Reconstruct complete messages from Excel data
  function reconstructExcelMessages(jsonData: any[], headerRowIndex: number) {
    const messages: Array<{
      type: string;
      sender: string;
      content: string;
      dateString: string;
    }> = [];
    
    const startIndex = headerRowIndex >= 0 ? headerRowIndex + 1 : 1;
    let currentMessage: {
      type: string;
      sender: string;
      content: string;
      dateString: string;
    } | null = null;
    
    for (let i = startIndex; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
      if (!row || row.length === 0) continue;
      
      const type = String(row[0] || '').trim();
      const date = String(row[1] || '').trim();
      const sender = String(row[2] || '').trim();
      const content = String(row[3] || '').trim();
      
      // Check if this starts a new message
      const isNewMessage = type && (type.includes('Sent') || type.includes('Received'));
      
      if (isNewMessage) {
        // Save previous message if it has content
        if (currentMessage && currentMessage.content.trim()) {
          messages.push({ ...currentMessage });
        }
        
        // Start new message
        currentMessage = {
          type,
          dateString: date,
          sender,
          content
        };
        
        // Look for additional content in remaining columns
        for (let j = 4; j < row.length; j++) {
          const additionalContent = String(row[j] || '').trim();
          if (additionalContent && additionalContent.length > 5) {
            currentMessage.content += (currentMessage.content ? ' ' : '') + additionalContent;
          }
        }
      } else if (currentMessage && content) {
        // This is likely a continuation row - add content
        currentMessage.content += (currentMessage.content ? ' ' : '') + content;
        
        // Check other columns for additional content
        for (let j = 4; j < row.length; j++) {
          const additionalContent = String(row[j] || '').trim();
          if (additionalContent && additionalContent.length > 5 &&
              additionalContent !== currentMessage.sender) {
            currentMessage.content += ' ' + additionalContent;
          }
        }
      }
    }
    
    // Don't forget the last message
    if (currentMessage && currentMessage.content.trim()) {
      messages.push(currentMessage);
    }
    
    console.log('📊 Excel reconstructed messages sample:', messages.slice(0, 2));
    return messages;
  }

  // Utility functions
  function cleanQuotes(str: string): string {
    return str.replace(/^["']|["']$/g, '').replace(/""/g, '"').trim();
  }

  function parseCSVLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }

  function generateSequentialTimestamp(index: number, total: number): string {
    const endDate = new Date('2025-08-16T20:44:26Z');
    const startDate = new Date('2024-12-08T19:00:03Z');
    const totalTime = endDate.getTime() - startDate.getTime();
    const timePerMessage = totalTime / Math.max(total, 100);
    const messageTime = endDate.getTime() - (index * timePerMessage);
    return new Date(messageTime).toISOString();
  }

  // File handling
  const handleFileSelect = useCallback(async (files: FileList | File[]) => {
    const file = files[0];
    if (!file) return;

    setProcessing(true);
    setParseResults([]);
    onError(null);

    try {
      console.log(`📄 Processing file: ${file.name} (${file.size} bytes, type: ${file.type})`);
      
      const results: ParseResult[] = [];
      
      // Check if it's an Excel file first
      const isExcelFile = file.name.toLowerCase().endsWith('.xlsx') || 
                         file.name.toLowerCase().endsWith('.xls') || 
                         file.type.includes('sheet') ||
                         file.type.includes('excel');
      
      if (isExcelFile) {
        console.log('🔍 Detected Excel file, using Excel parser first');
        const excelResult = await parseExcelFile('', file);
        results.push(excelResult);
        
        if (excelResult.success && excelResult.messages.length > 0) {
          console.log(`✅ Excel parsing succeeded: ${excelResult.messages.length} messages`);
          onMessagesImported(excelResult.messages);
          setParseResults(results);
          return;
        }
      }
      
      // For other files, read as text with encoding detection
      let content: string;
      try {
        // First try UTF-8
        content = await file.text();
        console.log(`📋 Reading as UTF-8, content preview: ${content.substring(0, 200)}...`);
        
        // Check if content looks corrupted (has lots of replacement characters)
        const replacementCharCount = (content.match(/�/g) || []).length;
        if (replacementCharCount > content.length * 0.1) {
          console.log('⚠️ Detected potential encoding issues, trying alternative approaches');
          
          // Try reading as array buffer and decode manually
          const buffer = await file.arrayBuffer();
          const decoder = new TextDecoder('windows-1252'); // Common for older exports
          const altContent = decoder.decode(buffer);
          
          if ((altContent.match(/�/g) || []).length < replacementCharCount) {
            content = altContent;
            console.log('✅ Successfully decoded with windows-1252 encoding');
          }
        }
      } catch (error) {
        console.error('Error reading file:', error);
        throw error;
      }
      
      // Try text-based parsing strategies (skip Excel parser for non-Excel files)
      const textStrategies = isExcelFile ? parseStrategies.slice(1) : parseStrategies.slice(1);
      
      for (const strategy of textStrategies) {
        let result: ParseResult;
        
        // Handle async parsers
        if (strategy.method === 'excel') {
          continue; // Already tried above if applicable
        } else {
          result = await Promise.resolve(strategy.parser(content, file));
        }
        
        results.push(result);
        
        if (result.success && result.messages.length > 0) {
          console.log(`✅ ${strategy.name} succeeded: ${result.messages.length} messages`);
          onMessagesImported(result.messages);
          setParseResults(results);
          return;
        } else {
          console.log(`❌ ${strategy.name} failed: ${result.errors.join(', ')}`);
        }
      }

      // If no strategy succeeded, show all results
      setParseResults(results);
      onError('No parsing strategy succeeded. See details below.');

    } catch (error) {
      console.error('File processing error:', error);
      onError(`Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessing(false);
    }
  }, [onMessagesImported, onError, parseStrategies]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files);
    }
  }, [handleFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileSelect(e.target.files);
    }
  }, [handleFileSelect]);

  return (
    <div className="space-y-6">
      {/* File Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive ? 'border-hud-border-accent bg-tactical-gold bg-opacity-10' : 'border-hud-border'
        } ${processing ? 'pointer-events-none opacity-50' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.txt,.json,.tsv"
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="space-y-4">
          <div className="flex justify-center">
            <svg className="w-16 h-16 text-medium-grey" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>

          {processing ? (
            <div>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hud-border-accent mx-auto mb-4"></div>
              <p className="font-primary font-bold text-hud-text-primary">
                Processing file with multiple strategies...
              </p>
            </div>
          ) : (
            <div>
              <h3 className="text-xl font-bold text-hud-text-primary font-primary uppercase tracking-wide">
                Upload Conversation File
              </h3>
              <p className="text-medium-grey font-primary mt-2">
                Drag and drop your file here, or click to browse
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 px-6 py-2 bg-tactical-gold text-hud-text-primary font-primary font-bold uppercase tracking-wide hover:bg-tactical-gold-light transition-colors"
              >
                Choose File
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Supported Formats */}
      <div className="bg-tactical-gold-muted border-2 border-tactical-grey-300 rounded-lg p-4">
        <h4 className="font-bold text-tactical-brown-dark font-primary uppercase tracking-wide mb-2">
          Supported Formats
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-tactical-brown-dark font-primary">
          <div>
            <strong>Excel Files:</strong>
            <ul className="list-disc list-inside ml-4 mt-1">
              <li>.xlsx and .xls formats</li>
              <li>Automatic sheet detection</li>
              <li>Multi-column parsing</li>
            </ul>
          </div>
          <div>
            <strong>CSV Files:</strong>
            <ul className="list-disc list-inside ml-4 mt-1">
              <li>Tab-separated SMS exports</li>
              <li>Comma-separated data</li>
              <li>Multi-line message support</li>
            </ul>
          </div>
          <div>
            <strong>Text Files:</strong>
            <ul className="list-disc list-inside ml-4 mt-1">
              <li>Pattern-based parsing</li>
              <li>Line-by-line processing</li>
              <li>JSON message arrays</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Parse Results */}
      {parseResults.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-bold text-hud-text-primary font-primary uppercase tracking-wide">
            Parsing Results
          </h4>
          
          {parseResults.map((result, index) => (
            <div key={index} className={`border-2 rounded-lg p-4 ${
              result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold font-primary">
                  {parseStrategies[index]?.name}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-bold font-primary ${
                  result.success ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                }`}>
                  {result.success ? `${result.messages.length} messages` : 'Failed'}
                </span>
              </div>
              
              {result.errors.length > 0 && (
                <ul className="text-sm space-y-1">
                  {result.errors.map((error, errorIndex) => (
                    <li key={errorIndex} className="text-red-700 font-primary">
                      • {error}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}