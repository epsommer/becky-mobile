// src/components/conversation/ConversationBatchManager.tsx
"use client";

import React, { useState, useCallback } from "react";
import { MessageBatch, DetectedMessage } from "../../types/conversation-batch";
import { Message } from "../../types/client";
import EnhancedMessageInput from "./EnhancedMessageInput";
import BatchMessageProcessor from "./BatchMessageProcessor";
import ParsingEngine from "../../lib/conversation/parsing-engine";

interface ConversationBatchManagerProps {
  clientId: string;
  conversationId?: string;
  onMessagesProcessed: (messages: Message[]) => Promise<void>;
  onBatchProcess?: (batch: MessageBatch) => Promise<void>;
  className?: string;
}

const ConversationBatchManager: React.FC<ConversationBatchManagerProps> = ({
  clientId,
  conversationId,
  onMessagesProcessed,
  onBatchProcess,
  className = "",
}) => {
  // State management
  const [currentBatch, setCurrentBatch] = useState<MessageBatch | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize parsing engine with default configuration
  const parsingEngine = new ParsingEngine({
    parseMethod: "smart",
    learningEnabled: true,
    settings: {
      minConfidence: 0.6,
      autoApproveThreshold: 0.9,
      enableSplitDetection: true,
      enableStyleAnalysis: true,
      maxContextWindow: 5,
      timezoneSetting: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });

  // Handle batch processing
  const handleBatchProcess = useCallback(
    async (batch: MessageBatch) => {
      try {
        setIsProcessing(true);
        setError(null);

        // Process the batch using the parsing engine
        // Allow external batch processing if provided
        if (onBatchProcess) {
          await onBatchProcess(batch);
        } else {
          const processedBatch = await parsingEngine.processMessageBatch(
            batch.rawContent,
            clientId,
          );
          setCurrentBatch(processedBatch);
        }
      } catch (err) {
        setError("Failed to process message batch. Please try again.");
        console.error("Batch processing error:", err);
      } finally {
        setIsProcessing(false);
      }
    },
    [clientId, onBatchProcess, parsingEngine],
  );

  // Handle individual message submission
  const handleMessageSubmit = useCallback(
    async (messages: Message[]) => {
      try {
        setIsProcessing(true);
        setError(null);
        await onMessagesProcessed(messages);
      } catch (err) {
        setError("Failed to save messages. Please try again.");
        console.error("Message submission error:", err);
      } finally {
        setIsProcessing(false);
      }
    },
    [onMessagesProcessed],
  );

  // Handle batch update during review
  const handleBatchUpdate = useCallback(
    (messages: DetectedMessage[]) => {
      if (!currentBatch) return;

      setCurrentBatch({
        ...currentBatch,
        detectedMessages: messages,
        confidence:
          messages.reduce((acc, msg) => acc + msg.confidence, 0) /
          messages.length,
        updatedAt: new Date().toISOString(),
      });
    },
    [currentBatch],
  );

  // Handle batch approval
  const handleBatchApprove = useCallback(
    async (messages: Message[]) => {
      try {
        setIsProcessing(true);
        setError(null);
        await onMessagesProcessed(messages);
        setCurrentBatch(null);
      } catch (err) {
        setError("Failed to save approved messages. Please try again.");
        console.error("Batch approval error:", err);
      } finally {
        setIsProcessing(false);
      }
    },
    [onMessagesProcessed],
  );

  // Handle batch rejection
  const handleBatchReject = useCallback(() => {
    setCurrentBatch(null);
    setError(null);
  }, []);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Show error message if any */}
      {error && (
        <div className="p-4 bg-red-50 border-2 border-red-600">
          <p className="text-sm text-red-700 font-primary font-bold uppercase tracking-wide">{error}</p>
        </div>
      )}

      {/* Show batch processor when there's a current batch */}
      {currentBatch ? (
        <BatchMessageProcessor
          batch={currentBatch}
          onUpdate={handleBatchUpdate}
          onApprove={handleBatchApprove}
          onReject={handleBatchReject}
        />
      ) : (
        /* Show message input when there's no current batch */
        <EnhancedMessageInput
          clientId={clientId}
          conversationId={conversationId}
          onMessageSubmit={handleMessageSubmit}
          onBatchProcess={handleBatchProcess}
        />
      )}

      {/* Loading overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 border-2 border-hud-border">
            <div className="flex items-center space-x-4">
              <div className="animate-spin h-8 w-8 border-4 border-hud-border-accent border-t-transparent"></div>
              <p className="text-hud-text-primary font-primary font-bold uppercase tracking-wide">PROCESSING MESSAGES...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationBatchManager;
