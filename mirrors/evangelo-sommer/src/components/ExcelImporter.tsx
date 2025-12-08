// src/components/ExcelImporter.tsx
"use client";

import { useState, useCallback } from "react";
import { Message } from "../types/client";
import {
  MessageRow,
  UserInfo,
  ClientInfo,
  ExcelImportState,
} from "../types/excel-import";
import {
  parseExcelFile,
  detectClientInfo,
  processConversationImport,
  convertToMessages,
} from "../lib/excel-import";
import { DateParser } from "../lib/parsers/date-parser";
import UserInfoForm from "./UserInfoForm";
import ImportPreview from "./ImportPreview";
import DateValidationStep, { EnhancedMessage } from "./DateValidationStep";
import DateParsingDebugger from "./DateParsingDebugger";

interface ExcelImporterProps {
  onMessagesDetected: (messages: Message[]) => void;
  clientName: string;
  userName: string;
}

export default function ExcelImporter({
  onMessagesDetected,
  clientName,
  userName,
}: ExcelImporterProps) {
  const [importState, setImportState] = useState<ExcelImportState>({
    step: "upload",
    file: null,
    excelData: [],
    userInfo: null,
    clientInfo: {},
    normalizedMessages: [],
    previewConversation: null,
    needsDateValidation: false,
    processedMessages: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // CSV Parsing Helper Functions
  const parseCSVLine = (line: string): string[] => {
    return line.split('\t').map(part => part.trim());
  };

  const parseCSVDate = (dateString: string): string | null => {
    try {
      if (!dateString) return null;
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date.toISOString();
    } catch {
      return null;
    }
  };

  const determineRoleFromSender = (sender: string, messageType: string): 'YOU' | 'CLIENT' => {
    if (messageType === 'Sent') return 'YOU';
    if (messageType === 'Received') return 'CLIENT';
    // Fallback: check if sender looks like the user's name/number
    return sender.includes(userName) ? 'YOU' : 'CLIENT';
  };

  // CSV Parsing Functions
  const parseConversationCSV = (csvText: string): Message[] => {
    console.log('📄 Starting CSV parsing...');
    const lines = csvText.split('\n');
    const messages: Message[] = [];
    let i = 2; // Skip header rows
    
    while (i < lines.length) {
      const messageBlock = extractCSVMessageBlock(lines, i);
      
      if (messageBlock.content) {
        messages.push({
          id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          role: determineRoleFromSender(messageBlock.sender, messageBlock.type),
          content: messageBlock.content.trim(),
          timestamp: parseCSVDate(messageBlock.dateString) || generateSequentialTimestamp(messages.length),
          type: 'text',
          metadata: {
            subject: `SMS from ${messageBlock.sender}`,
            emailAddress: messageBlock.sender.includes('@') ? messageBlock.sender : undefined,
          },
        });
        
        console.log(`✅ CSV message extracted: "${messageBlock.content.substring(0, 50)}..."`); 
      }
      
      i = messageBlock.nextIndex;
    }
    
    console.log(`🎯 CSV parsing complete: ${messages.length} messages extracted`);
    return messages;
  };

  const extractCSVMessageBlock = (lines: string[], startIndex: number) => {
    let currentIndex = startIndex;
    let type = '';
    let dateString = '';
    let sender = '';
    let content = '';
    
    // Parse first line of message block
    const firstLine = lines[currentIndex];
    const firstParts = parseCSVLine(firstLine);
    
    if (firstParts.length >= 4) {
      // Complete message in one line
      type = firstParts[0];
      dateString = firstParts[1];
      sender = firstParts[2];
      content = firstParts[3];
      currentIndex++;
    } else {
      // Message spans multiple lines
      type = firstParts[0] || '';
      dateString = firstParts[1] || '';
      sender = firstParts[2] || '';
      content = firstParts[3] || '';
      
      currentIndex++;
      
      // Continue reading until we have all components or hit next message
      while (currentIndex < lines.length) {
        const line = lines[currentIndex];
        const parts = parseCSVLine(line);
        
        // Check if this is start of new message
        if (parts[0] && (parts[0] === 'Sent' || parts[0].startsWith('Received'))) {
          break;
        }
        
        // Add components from continuation lines
        if (parts.length > 0) {
          if (!dateString && parts[0]) {
            // Look for date components
            if (parts[0].match(/\d{4}|\d{1,2}:\d{2}:\d{2}|Eastern/)) {
              dateString += (dateString ? '\n' : '') + parts[0];
            }
          }
          
          if (!sender && parts[1] && !parts[1].match(/\d{4}|\d{1,2}:\d{2}:\d{2}|Eastern/)) {
            sender = parts[1];
          }
          
          if (parts[2] || parts[3]) {
            content += (content ? ' ' : '') + (parts[2] || parts[3] || '');
          } else if (parts[0] && !parts[0].match(/\d{4}|\d{1,2}:\d{2}:\d{2}|Eastern/)) {
            content += (content ? ' ' : '') + parts[0];
          }
        }
        
        currentIndex++;
      }
    }
    
    return {
      type,
      dateString,
      sender,
      content: cleanContent(content),
      role: type === 'Sent' ? 'you' : 'client',
      nextIndex: currentIndex
    };
  };

  const extractContentFromLine = (line: string, messageType: string): string => {
    // Split by tabs and find the content column
    const parts = line.split('\t');
    
    // Look for the last meaningful part that's not a date/phone number
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i].trim();
      if (part && part.length > 10 && !part.match(/^\d{4}$|^\d{1,2}:\d{2}:\d{2}|^Eastern|^\+\d{11}$/)) {
        return cleanContent(part);
      }
    }
    
    return '';
  };

  const cleanContent = (content: string): string => {
    return content
      .replace(/^["']/, '')
      .replace(/["']$/, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const parseConversationText = (text: string): Message[] => {
    console.log('📝 Trying text-based parsing...');
    const messages: Message[] = [];
    
    // Split by common message indicators
    const blocks = text.split(/(?=Sent\t|Received\t|"Sent"|"Received)/);
    
    for (let block of blocks) {
      if (block.trim().length < 10) continue;
      
      let role: 'you' | 'client' = 'client';
      let content = '';
      
      if (block.includes('Sent')) {
        role = 'you';
        // Extract everything that looks like message content
        const lines = block.split('\n');
        content = lines.find(line => 
          line.length > 20 && 
          !line.match(/^\d{4}$|^\d{1,2}:\d{2}:\d{2}|^Eastern|^\+\d|^Mark Levy/)
        ) || '';
      } else if (block.includes('Received')) {
        role = 'client';
        const lines = block.split('\n');
        content = lines.find(line => 
          line.length > 20 && 
          !line.match(/^\d{4}$|^\d{1,2}:\d{2}:\d{2}|^Eastern|^\+\d|^Mark Levy/)
        ) || '';
      }
      
      if (content.trim()) {
        messages.push({
          id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          role,
          content: cleanContent(content),
          timestamp: generateSequentialTimestamp(messages.length),
          type: 'text',
          metadata: {}
        });
        
        console.log(`✅ Text message extracted: "${content.substring(0, 50)}..."`); 
      }
    }
    
    console.log(`🎯 Text parsing complete: ${messages.length} messages extracted`);
    return messages;
  };

  // Remove old function - replaced by simplified logic

  const generateSequentialTimestamp = (index: number): string => {
    // Generate timestamps going backwards from August 2025 to December 2024
    const endDate = new Date('2025-08-16T20:44:26Z');
    const startDate = new Date('2024-12-08T19:00:03Z');
    
    const totalTime = endDate.getTime() - startDate.getTime();
    const timePerMessage = totalTime / 300; // Assuming ~300 messages
    
    const messageTime = endDate.getTime() - (index * timePerMessage);
    return new Date(messageTime).toISOString();
  };

  const resetImport = useCallback(() => {
    setImportState({
      step: "upload",
      file: null,
      excelData: [],
      userInfo: null,
      clientInfo: {},
      normalizedMessages: [],
      previewConversation: null,
      needsDateValidation: false,
      processedMessages: [],
    });
    setError(null);
    setLoading(false);
  }, []);

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!file) return;

      // Validate file type - now accepts CSV files too
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/csv",
        "application/csv",
        ".xlsx",
        ".xls",
        ".csv",
      ];

      const isValidType = validTypes.some(
        (type) => file.type === type || file.name.toLowerCase().endsWith(type),
      );

      if (!isValidType) {
        setError("Please upload a valid file (.xlsx, .xls, or .csv)");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Check if it's a CSV file
        const isCSV = file.name.toLowerCase().endsWith('.csv') || 
                     file.type === 'text/csv' || 
                     file.type === 'application/csv';

        if (isCSV) {
          // Handle CSV file
          console.log('📄 Processing CSV file:', file.name);
          const text = await file.text();
          const messages = parseConversationCSV(text);

          if (messages.length === 0) {
            throw new Error('No messages could be extracted from the CSV file');
          }

          console.log(`✅ CSV parsing successful: ${messages.length} messages`);
          
          // Call parent directly with CSV messages
          onMessagesDetected(messages);
          return;
        } else {
          // Handle Excel file  
          const parseResult = await parseExcelFile(file);

          if (!parseResult.success) {
            throw new Error(parseResult.error || "Failed to parse Excel file");
          }

          if (!parseResult.data || parseResult.data.length === 0) {
            throw new Error("No message data found in the Excel file");
          }

          // Convert parsed data to MessageRow format for compatibility
          const excelData = parseResult.data as unknown as MessageRow[];

          // Auto-detect client info
          const detectedClient = detectClientInfo(excelData);

          // Merge with provided client name
          const clientInfo: Partial<ClientInfo> = {
            name: detectedClient.name || clientName,
            phone: detectedClient.phone || "",
            contact: detectedClient.contact || "",
          };

          setImportState((prev: ExcelImportState) => ({
            ...prev,
            step: "user-info",
            file,
            excelData,
            clientInfo,
          }));
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to parse Excel file",
        );
      } finally {
        setLoading(false);
      }
    },
    [clientName],
  );

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleUserInfoSubmit = useCallback(
    (userInfo: UserInfo) => {
      setLoading(true);
      setError(null);

      try {
        // Ensure we have complete client info
        const completeClientInfo: ClientInfo = {
          name: importState.clientInfo.name || clientName,
          phone: importState.clientInfo.phone || "",
          email: importState.clientInfo.email,
          contact:
            importState.clientInfo.contact ||
            importState.clientInfo.name ||
            clientName,
        };

        // Process the import with enhanced date parsing
        const conversation = processConversationImport(
          importState.excelData,
          userInfo,
          completeClientInfo,
        );

        // Convert to Message format for date analysis
        const messages = convertToMessages(conversation);

        // Analyze date parsing results
        const analysis = DateParser.analyzeDateParsingResults(
          messages as Array<{
            timestamp: string;
            metadata?: { parseSuccess?: boolean };
          }>,
        );

        console.log("📊 Date analysis results:", analysis);

        if (analysis.needsValidation) {
          console.log("⚠️ Date validation needed, showing validation step");

          setImportState((prev: ExcelImportState) => ({
            ...prev,
            step: "date-validation",
            userInfo,
            clientInfo: completeClientInfo,
            previewConversation: conversation,
            processedMessages: messages,
            needsDateValidation: true,
          }));
        } else {
          console.log("✅ Date parsing successful, proceeding to preview");

          setImportState((prev: ExcelImportState) => ({
            ...prev,
            step: "preview",
            userInfo,
            clientInfo: completeClientInfo,
            previewConversation: conversation,
            processedMessages: messages,
            needsDateValidation: false,
          }));
        }
      } catch (err) {
        console.error("Error in handleUserInfoSubmit:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to process conversation import",
        );
      } finally {
        setLoading(false);
      }
    },
    [importState.excelData, importState.clientInfo, clientName],
  );

  const handleSenderCorrection = useCallback(
    (messageIndex: number) => {
      if (!importState.previewConversation) return;

      const updatedConversation = { ...importState.previewConversation };
      const message = updatedConversation.messages[messageIndex];

      // Toggle sender
      const newRole = message.role === "you" ? "client" : "you";
      const userInfo = importState.userInfo!;
      const clientInfo = importState.clientInfo as ClientInfo;

      updatedConversation.messages[messageIndex] = {
        ...message,
        role: newRole,
        metadata: {
          ...message.metadata,
          senderName: newRole === "you" ? userInfo.name : clientInfo.name,
          recipientName: newRole === "you" ? clientInfo.name : userInfo.name,
          senderContact: newRole === "you" ? userInfo.phone : clientInfo.phone,
          recipientContact:
            newRole === "you" ? clientInfo.phone : userInfo.phone,
        },
      };

      setImportState((prev: ExcelImportState) => ({
        ...prev,
        previewConversation: updatedConversation,
      }));
    },
    [
      importState.previewConversation,
      importState.userInfo,
      importState.clientInfo,
    ],
  );

  const handleConfirmImport = useCallback(() => {
    if (!importState.previewConversation) return;

    // Convert to Message format and notify parent
    const messages = convertToMessages(importState.previewConversation);
    onMessagesDetected(messages);
  }, [importState.previewConversation, onMessagesDetected]);

  const handleDatesCorrected = useCallback(
    (correctedMessages: Message[]) => {
      console.log(
        "📅 Dates corrected, proceeding to preview with corrected messages",
      );

      // Update the processed messages and proceed to preview
      setImportState((prev: ExcelImportState) => ({
        ...prev,
        step: "preview",
        processedMessages: correctedMessages,
        needsDateValidation: false,
      }));

      // Call the parent with corrected messages
      onMessagesDetected(correctedMessages);
    },
    [onMessagesDetected],
  );

  const handleSkipDateValidation = useCallback(() => {
    console.log("⏭️ Skipping date validation");
    setImportState((prev: ExcelImportState) => ({
      ...prev,
      step: "preview",
      needsDateValidation: false,
    }));
  }, []);

  const handleBackToUserInfo = useCallback(() => {
    setImportState((prev: ExcelImportState) => ({
      ...prev,
      step: "user-info",
      previewConversation: null,
      needsDateValidation: false,
    }));
  }, []);

  const handleBackToDateValidation = useCallback(() => {
    if (importState.needsDateValidation && importState.processedMessages) {
      setImportState((prev: ExcelImportState) => ({
        ...prev,
        step: "date-validation",
      }));
    } else {
      handleBackToUserInfo();
    }
  }, [
    importState.needsDateValidation,
    importState.processedMessages,
    handleBackToUserInfo,
  ]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Render upload step
  if (importState.step === "upload") {
    return (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <h3 className="text-lg font-medium text-tactical-grey-800 mb-2">
            Import Message History
          </h3>
          <p className="text-sm text-tactical-grey-500">
            Upload your text message export from Excel or CSV format
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-4">
            <div className="flex items-start">
              <svg
                className="h-5 w-5 text-red-400 mt-0.5 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <h4 className="font-medium">Upload Error</h4>
                <p className="mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* File Upload Area */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? "border-tactical-gold bg-tactical-gold-muted"
              : "border-tactical-grey-400 hover:border-tactical-grey-400"
          } ${loading ? "pointer-events-none opacity-50" : ""}`}
        >
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            disabled={loading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          <div className="space-y-4">
            <div className="flex justify-center">
              <svg
                className="w-12 h-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {loading ? (
              <div>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-tactical-gold mx-auto mb-2"></div>
                <p className="text-sm text-tactical-grey-500">
                  Processing Excel file...
                </p>
              </div>
            ) : (
              <div>
                <p className="text-lg font-medium text-tactical-grey-800">
                  Drop file here or click to browse
                </p>
                <p className="text-sm text-tactical-grey-500">
                  Supports .xlsx, .xls, and .csv files
                </p>
              </div>
            )}
          </div>

          {importState.file && (
            <div className="mt-4 p-3 bg-tactical-grey-100 rounded border text-left">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-tactical-grey-800">
                    {importState.file.name}
                  </p>
                  <p className="text-xs text-tactical-grey-500">
                    {formatFileSize(importState.file.size)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    resetImport();
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Format Requirements */}
        <div className="bg-tactical-gold-muted border border-tactical-gold rounded-lg p-4">
          <h4 className="font-medium text-tactical-brown-dark mb-2">
            Expected File Format
          </h4>
          <div className="text-sm text-tactical-brown">
            <p className="mb-2">Your file should have columns for:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>
                <strong>Type:</strong> &quot;Sent&quot; or &quot;Received&quot;
              </li>
              <li>
                <strong>Date:</strong> Message timestamp
              </li>
              <li>
                <strong>Name / Number:</strong> Contact info
              </li>
              <li>
                <strong>Content:</strong> Message text
              </li>
            </ul>
            <p className="mt-2 text-xs">CSV files should be tab-separated with quoted values</p>
          </div>
        </div>
      </div>
    );
  }

  // Render user info step
  if (importState.step === "user-info") {
    return (
      <UserInfoForm
        onUserInfoSet={handleUserInfoSubmit}
        onCancel={resetImport}
        initialData={{
          name: userName !== "You" ? userName : "",
          phone: "",
          email: "",
        }}
        className="border-0 shadow-none"
      />
    );
  }

  // Render date validation step
  if (importState.step === "date-validation" && importState.processedMessages) {
    return (
      <div className="space-y-6">
        <div className="bg-tactical-gold-muted border border-tactical-gold rounded-lg p-4">
          <h3 className="font-medium text-tactical-brown-dark mb-2">Date Validation</h3>
          <p className="text-tactical-brown text-sm">
            Some timestamps in your Excel file could not be parsed correctly.
            Please review and correct them below before proceeding.
          </p>
        </div>

        <DateParsingDebugger
          originalData={
            importState.excelData as unknown as Record<string, unknown>[]
          }
          mapping={{
            timestamp: "Date",
            messageContent: "Content",
            messageType: "Type",
            sender: "Name / Number",
          }}
        />

        <DateValidationStep
          messages={importState.processedMessages as EnhancedMessage[]}
          onDatesCorrected={handleDatesCorrected}
          onSkip={handleSkipDateValidation}
        />
      </div>
    );
  }

  // Render preview step
  if (
    importState.step === "preview" &&
    importState.previewConversation &&
    importState.userInfo
  ) {
    return (
      <ImportPreview
        conversation={importState.previewConversation}
        userInfo={importState.userInfo}
        clientInfo={importState.clientInfo as ClientInfo}
        onSenderCorrection={handleSenderCorrection}
        onConfirmImport={handleConfirmImport}
        onCancel={resetImport}
        onBack={handleBackToDateValidation}
      />
    );
  }

  return null;
}
