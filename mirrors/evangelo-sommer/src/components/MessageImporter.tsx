// src/components/MessageImporter.tsx
"use client";

import { useState, useEffect } from "react";
import { Message } from "../types/client";
import { MessageParser } from "../lib/parsers/message-parser";
import { DateParser } from "../lib/parsers/date-parser";
import ExcelImporter from "./ExcelImporter";
import CRMIntegrator from "./CRMIntegrator";
import RobustFileUploader from "./conversation/RobustFileUploader";
import { CRMProcessingResult } from "../types/crm-integration";
import { ImportedConversation } from "../types/excel-import";

interface ParsedMessage {
  content: string;
  sender: "you" | "client" | "unknown";
  timestamp: string | null;
  confidence: number;
  type: "email" | "text" | "call-notes" | "meeting-notes";
  metadata?: {
    subject?: string;
    attachments?: string[];
    emailAddress?: string;
    phoneNumber?: string;
  };
}

interface MessageImporterProps {
  onMessagesDetected: (messages: Message[]) => void;
  clientName: string;
  userName: string;
  clientId?: string;
  defaultContent?: string;
  onCRMProcessingComplete?: (result: CRMProcessingResult) => void;
}

export default function MessageImporter({
  onMessagesDetected,
  clientName,
  userName,
  clientId,
  defaultContent = "",
  onCRMProcessingComplete,
}: MessageImporterProps) {
  const [importType, setImportType] = useState<"text" | "excel" | "crm" | "robust">(
    "robust",
  );
  const [content, setContent] = useState(defaultContent);
  const [format, setFormat] = useState<"email" | "text" | "unknown">("unknown");
  const [parsedMessages, setParsedMessages] = useState<ParsedMessage[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [importedConversation] = useState<ImportedConversation | null>(null);
  const [showCRMIntegration, setShowCRMIntegration] = useState(false);

  // CSV parsing functions for SMS export format
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
            const additionalContent = parts[2] || parts[3] || '';
            if (additionalContent && !additionalContent.match(/\d{4}|\d{1,2}:\d{2}:\d{2}|Eastern/)) {
              content += (content ? ' ' : '') + additionalContent;
            }
          }
        }
        
        currentIndex++;
      }
    }
    
    return {
      type: cleanCSVValue(type),
      dateString: cleanCSVValue(dateString),
      sender: cleanCSVValue(sender),
      content: cleanCSVValue(content),
      nextIndex: currentIndex
    };
  };

  const parseCSVLine = (line: string): string[] => {
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
      } else if (char === '\t' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
      i++;
    }
    
    result.push(current);
    return result;
  };

  const cleanCSVValue = (value: string): string => {
    return value
      .replace(/^"/, '')
      .replace(/"$/, '')
      .replace(/""/g, '"')
      .trim();
  };

  const parseCSVDate = (dateString: string): string | null => {
    if (!dateString) return null;
    
    console.log('📅 Parsing CSV date:', dateString);
    
    // Handle the multi-line date format from CSV
    const lines = dateString.split('\n').map(line => line.trim()).filter(Boolean);
    
    if (lines.length === 0) return null;
    
    let fullDateString = '';
    
    if (lines.length === 1) {
      // Single line date like "Tuesday, July 29, 2025 2:10:11 p.m."
      fullDateString = lines[0];
    } else {
      // Multi-line format - reconstruct
      fullDateString = lines.join('\n');
    }
    
    // Use existing date parser
    const result = DateParser.parseConversationExportDate(fullDateString);
    console.log('📅 CSV date parse result:', result);
    return result;
  };

  const determineRoleFromSender = (sender: string, type: string): 'you' | 'client' => {
    if (type === 'Sent') return 'you';
    if (type.startsWith('Received')) return 'client';
    
    if (sender.includes('Mark') || sender.includes('+164')) return 'client';
    if (sender.includes('+164') && !sender.includes('Mark')) return 'you';
    
    return 'client';
  };

  const generateSequentialTimestamp = (index: number): string => {
    // Start from December 8, 2024 and work backwards chronologically
    const endDate = new Date('2025-08-16T16:44:26-04:00'); // Latest message
    const startDate = new Date('2024-12-08T14:00:03-05:00'); // Earliest message
    
    const totalDuration = endDate.getTime() - startDate.getTime();
    const messageInterval = totalDuration / 300; // Spread across ~300 messages
    
    return new Date(startDate.getTime() + (index * messageInterval)).toISOString();
  };

  // CSV file handler
  const handleCSVFile = async (file: File) => {
    console.log('📄 Processing CSV file:', file.name);
    setProcessing(true);
    try {
      const text = await file.text();
      const messages = parseConversationCSV(text);
      
      if (messages.length === 0) {
        throw new Error('No messages could be extracted from the CSV file');
      }
      
      console.log(`✅ CSV parsing successful: ${messages.length} messages`);
      onMessagesDetected(messages);
      setPreviewMode(true);
    } catch (error) {
      console.error('CSV parsing error:', error);
      alert('Failed to parse CSV file: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    if (content) {
      const detectedFormat = MessageParser.detectFormat(content);
      setFormat(detectedFormat);
    }
  }, [content]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setPreviewMode(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('📁 File uploaded:', file.name, file.type);

    if (file.name.toLowerCase().endsWith('.csv')) {
      await handleCSVFile(file);
    } else if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
      // Let the Excel importer handle this
      console.log('📊 Excel file detected, switching to Excel import tab');
      setImportType('excel');
    } else {
      alert('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
    }
    
    // Clear the file input
    e.target.value = '';
  };

  const handleParseContent = () => {
    setProcessing(true);
    try {
      let parsedMessages: ParsedMessage[];
      const context = { clientName, userName };

      if (format === "email") {
        parsedMessages = MessageParser.parseEmailThread(content, context);
      } else if (format === "text") {
        parsedMessages = MessageParser.parseTextMessages(content, context);
      } else {
        // Try both formats and use the one that produces better results
        const emailMessages = MessageParser.parseEmailThread(content, context);
        const textMessages = MessageParser.parseTextMessages(content, context);
        parsedMessages =
          emailMessages.length > textMessages.length
            ? emailMessages
            : textMessages;
      }

      // Convert ParsedMessages to Messages
      const messages: Message[] = parsedMessages.map((msg) => ({
        id: `msg_${Math.random().toString(36).substr(2, 9)}`,
        role: msg.sender === "unknown" ? "client" : msg.sender,
        content: msg.content,
        timestamp: msg.timestamp || new Date().toISOString(),
        type: msg.type,
        metadata: msg.metadata,
      }));

      setParsedMessages(parsedMessages);
      setPreviewMode(true);
      onMessagesDetected(messages);
    } catch (error) {
      console.error("Error parsing messages:", error);
    } finally {
      setProcessing(false);
    }
  };

  const toggleSender = (index: number) => {
    const newMessages = [...parsedMessages];
    const message = newMessages[index];
    message.sender = message.sender === "you" ? "client" : "you";
    setParsedMessages(newMessages);

    // Convert to Message format and notify parent
    const messages: Message[] = newMessages.map((msg) => ({
      id: `msg_${Math.random().toString(36).substr(2, 9)}`,
      role: msg.sender === "unknown" ? "client" : msg.sender,
      content: msg.content,
      timestamp: msg.timestamp || new Date().toISOString(),
      type: msg.type,
      metadata: msg.metadata,
    }));
    onMessagesDetected(messages);
  };

  const handleExcelMessagesDetected = (messages: Message[]) => {
    onMessagesDetected(messages);
    // Also set up for potential CRM integration
    // This would need the ImportedConversation from ExcelImporter
    // For now, we'll trigger CRM integration separately
  };

  const handleCRMProcessingComplete = (result: CRMProcessingResult) => {
    onCRMProcessingComplete?.(result);
    setShowCRMIntegration(false);
  };

  const formatTimestamp = (timestamp: string | null): string => {
    if (!timestamp) return "No timestamp";
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="space-y-4">
      {/* Import Type Selection */}
      <div className="border-b-2 border-hud-border pb-4">
        <div className="flex space-x-1 bg-hud-background-secondary p-1 w-fit">
          <button
            onClick={() => setImportType("text")}
            className={`px-4 py-2 text-sm font-bold uppercase tracking-wide transition-colors font-primary ${
              importType === "text"
                ? "bg-tactical-gold text-hud-text-primary"
                : "text-medium-grey hover:text-hud-text-primary"
            }`}
          >
            PASTE TEXT
          </button>
          <button
            onClick={() => setImportType("excel")}
            className={`px-4 py-2 text-sm font-bold uppercase tracking-wide transition-colors font-primary ${
              importType === "excel"
                ? "bg-tactical-gold text-hud-text-primary"
                : "text-medium-grey hover:text-hud-text-primary"
            }`}
          >
            UPLOAD EXCEL
          </button>
          <button
            onClick={() => setImportType("robust")}
            className={`px-4 py-2 text-sm font-bold uppercase tracking-wide transition-colors font-primary ${
              importType === "robust"
                ? "bg-tactical-gold text-hud-text-primary"
                : "text-medium-grey hover:text-hud-text-primary"
            }`}
          >
            ROBUST UPLOAD
          </button>
          <button
            onClick={() => setImportType("crm")}
            className={`px-4 py-2 text-sm font-bold uppercase tracking-wide transition-colors font-primary ${
              importType === "crm"
                ? "bg-tactical-gold text-hud-text-primary"
                : "text-medium-grey hover:text-hud-text-primary"
            }`}
          >
            CRM INTEGRATION
          </button>
        </div>
      </div>

      {/* Text Import */}
      {importType === "text" && (
        <>
          {/* Input Area */}
          {!previewMode && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-hud-text-primary uppercase tracking-wide font-primary">
                  PASTE CONVERSATION CONTENT OR UPLOAD CSV FILE
                </label>
                {content && (
                  <span className="text-sm text-medium-grey font-primary uppercase tracking-wide">
                    DETECTED FORMAT:{" "}
                    {format.toUpperCase()}
                  </span>
                )}
              </div>
              <textarea
                value={content}
                onChange={handleContentChange}
                rows={12}
                className="w-full px-3 py-2 border-2 border-hud-border focus:border-hud-border-accent bg-white text-hud-text-primary font-primary"
                placeholder={`Paste your conversation here. Supports email threads and text message formats:

Email format:
From: client@example.com
Subject: Project Discussion
Message content...

Text format:
Client: Hello
You: Hi there!
Client: Can we meet tomorrow?`}
              />
              
              {/* File Upload Option */}
              <div className="mt-4 p-4 border-2 border-dashed border-hud-border bg-hud-background-secondary">
                <div className="text-center">
                  <label className="block text-sm font-bold text-hud-text-primary mb-2 uppercase tracking-wide font-primary">
                    OR UPLOAD CSV FILE
                  </label>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    disabled={processing}
                    className="block w-full text-sm text-hud-text-primary file:mr-4 file:py-2 file:px-4 file:border-0 file:text-sm file:font-bold file:bg-tactical-gold file:text-hud-text-primary hover:file:bg-tactical-gold-light file:cursor-pointer file:uppercase file:tracking-wide file:font-primary cursor-pointer"
                  />
                  <p className="text-xs text-medium-grey mt-2 font-primary">
                    SUPPORTS CSV, XLSX, AND XLS FILES
                  </p>
                </div>
              </div>

              <div className="mt-2 flex justify-end">
                <button
                  onClick={handleParseContent}
                  disabled={!content || processing}
                  className={`px-4 py-2 font-primary font-bold uppercase tracking-wide ${
                    content && !processing
                      ? "bg-tactical-gold text-hud-text-primary hover:bg-tactical-gold-light"
                      : "bg-medium-grey text-white cursor-not-allowed"
                  }`}
                >
                  {processing ? "PROCESSING..." : "PREVIEW MESSAGES"}
                </button>
              </div>
            </div>
          )}

          {/* Preview Area */}
          {previewMode && parsedMessages.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-hud-text-primary uppercase tracking-wide font-primary">
                  PREVIEW MESSAGES
                </h3>
                <button
                  onClick={() => setPreviewMode(false)}
                  className="text-gold hover:text-gold-dark font-primary font-bold uppercase tracking-wide"
                >
                  EDIT CONTENT
                </button>
              </div>

              <div className="space-y-4 max-h-[50vh] overflow-y-auto">
                {parsedMessages.map((message, index) => (
                  <div
                    key={index}
                    className={`p-4 border-2 ${
                      message.sender === "you"
                        ? "bg-tactical-gold-light border-hud-border-accent"
                        : message.sender === "client"
                          ? "bg-hud-background-secondary border-hud-border"
                          : "bg-light-grey border-medium-grey"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleSender(index)}
                          className={`px-2 py-1 text-sm font-bold uppercase tracking-wide font-primary ${
                            message.sender === "you"
                              ? "bg-tactical-gold text-hud-text-primary"
                              : message.sender === "client"
                                ? "bg-medium-grey text-white"
                                : "bg-light-grey text-hud-text-primary"
                          }`}
                        >
                          {message.sender.toUpperCase()}
                        </button>
                        <span className="text-sm text-medium-grey font-primary uppercase tracking-wide">
                          {formatTimestamp(message.timestamp)}
                        </span>
                      </div>
                      <span
                        className="text-xs text-medium-grey font-primary uppercase tracking-wide"
                        title="Detection confidence"
                      >
                        {Math.round(message.confidence * 100)}% CONFIDENCE
                      </span>
                    </div>
                    <div className="text-hud-text-primary whitespace-pre-wrap font-primary">
                      {message.content}
                    </div>
                    {message.metadata &&
                      Object.keys(message.metadata).length > 0 && (
                        <div className="mt-2 text-sm text-medium-grey font-primary uppercase tracking-wide">
                          {Object.entries(message.metadata).map(
                            ([key, value]) => (
                              <div key={key}>
                                {key.toUpperCase()}: {value}
                              </div>
                            ),
                          )}
                        </div>
                      )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Excel Import */}
      {importType === "excel" && (
        <div className="space-y-4">
          <ExcelImporter
            onMessagesDetected={handleExcelMessagesDetected}
            clientName={clientName}
            userName={userName}
          />

          {/* CRM Integration Option */}
          {parsedMessages.length > 0 && (
            <div className="bg-tactical-gold-light border-2 border-hud-border-accent p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-hud-text-primary uppercase tracking-wide font-primary">
                    AI-POWERED CRM INTEGRATION
                  </h4>
                  <p className="text-sm text-medium-grey mt-1 font-primary">
                    CONVERT THESE MESSAGES INTO STRUCTURED CRM DATA WITH BUSINESS INTELLIGENCE
                  </p>
                </div>
                <button
                  onClick={() => setShowCRMIntegration(true)}
                  className="px-4 py-2 bg-tactical-gold text-hud-text-primary hover:bg-tactical-gold-light transition-colors font-primary font-bold uppercase tracking-wide"
                >
                  PROCESS WITH AI
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Robust Upload */}
      {importType === "robust" && (
        <div className="space-y-4">
          <div className="bg-tactical-gold-light border-2 border-hud-border-accent p-4 rounded-lg">
            <h3 className="font-bold text-hud-text-primary uppercase tracking-wide font-primary mb-2">
              Advanced SMS Processing
            </h3>
            <p className="text-sm text-medium-grey font-primary mb-4">
              Upload your SMS export files with advanced corruption recovery, smart speaker identification, and robust data processing.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-xs">
              <div className="bg-white p-3 rounded border">
                <h4 className="font-bold text-hud-text-primary uppercase tracking-wide">🔧 DATA RECOVERY</h4>
                <p className="text-medium-grey mt-1">Fixes corrupted Excel rows and fragmented data</p>
              </div>
              
              <div className="bg-white p-3 rounded border">
                <h4 className="font-bold text-hud-text-primary uppercase tracking-wide">🕒 TIMESTAMP REPAIR</h4>
                <p className="text-medium-grey mt-1">Reconstructs multi-line timestamps</p>
              </div>
              
              <div className="bg-white p-3 rounded border">
                <h4 className="font-bold text-hud-text-primary uppercase tracking-wide">🎯 SMART IDENTIFICATION</h4>
                <p className="text-medium-grey mt-1">Identifies speakers with confidence scoring</p>
              </div>
            </div>
          </div>

          <RobustFileUploader
            clientId={clientId || "demo-client-id"}
            clientName={clientName}
            onUploadComplete={(result) => {
              console.log('Robust upload complete:', result);
              if (result.success && result.conversation) {
                // Handle successful upload
                // Convert to messages format and call onMessagesDetected
                // This would need the actual messages from the API response
              }
            }}
            onProgress={(progress) => {
              console.log('Upload progress:', progress);
            }}
          />
        </div>
      )}

      {/* CRM Integration */}
      {importType === "crm" && (
        <CRMIntegrator
          onProcessingComplete={handleCRMProcessingComplete}
          importedConversation={importedConversation || undefined}
        />
      )}

      {/* CRM Integration Modal/Overlay */}
      {showCRMIntegration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border-2 border-hud-border max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b-2 border-hud-border-accent bg-hud-background-secondary flex justify-between items-center">
              <h3 className="text-lg font-bold text-hud-text-primary uppercase tracking-wide font-primary">
                CRM INTEGRATION
              </h3>
              <button
                onClick={() => setShowCRMIntegration(false)}
                className="text-medium-grey hover:text-hud-text-primary font-bold text-lg"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <CRMIntegrator
                onProcessingComplete={handleCRMProcessingComplete}
                importedConversation={importedConversation || undefined}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
