// src/components/conversation/BatchMessageProcessor.tsx
"use client";

import React, { useState, useMemo } from "react";
import {
  MessageBatch,
  DetectedMessage,
  MessageValidationResult,
} from "../../types/conversation-batch";
import { Message } from "../../types/client";

interface BatchMessageProcessorProps {
  batch: MessageBatch;
  onUpdate: (messages: DetectedMessage[]) => void;
  onApprove: (messages: Message[]) => void;
  onReject: () => void;
  className?: string;
}

const BatchMessageProcessor: React.FC<BatchMessageProcessorProps> = ({
  batch,
  onUpdate,
  onApprove,
  onReject,
  className = "",
}) => {
  // State management
  const [messages, setMessages] = useState<DetectedMessage[]>(
    batch.detectedMessages,
  );
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(
    new Set(),
  );
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [validation] = useState<MessageValidationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Computed properties
  const hasErrors = useMemo(() => {
    return validation?.errors.length ? validation.errors.length > 0 : false;
  }, [validation]);

  const hasWarnings = useMemo(() => {
    return validation?.warnings.length ? validation.warnings.length > 0 : false;
  }, [validation]);

  // Handle message selection
  const toggleMessageSelection = (messageId: string) => {
    const newSelection = new Set(selectedMessages);
    if (newSelection.has(messageId)) {
      newSelection.delete(messageId);
    } else {
      newSelection.add(messageId);
    }
    setSelectedMessages(newSelection);
  };

  // Handle message editing
  const updateMessage = (
    messageId: string,
    updates: Partial<DetectedMessage>,
  ) => {
    const updatedMessages = messages.map((msg) =>
      msg.id === messageId ? { ...msg, ...updates } : msg,
    );
    setMessages(updatedMessages);
    onUpdate(updatedMessages);
  };

  // Handle batch actions
  const handleMergeMessages = () => {
    if (selectedMessages.size < 2) return;

    const selectedIds = Array.from(selectedMessages);
    const selectedMsgs = messages.filter((msg) => selectedIds.includes(msg.id));

    // Sort by timestamp or index
    selectedMsgs.sort((a, b) => {
      if (a.timestamp && b.timestamp) {
        return (
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      }
      return (
        (a.metadata?.originalIndex || 0) - (b.metadata?.originalIndex || 0)
      );
    });

    // Create merged message
    const mergedMessage: DetectedMessage = {
      id: `merged_${Date.now()}`,
      content: selectedMsgs.map((msg) => msg.content).join("\n\n"),
      detectedSender: selectedMsgs[0].detectedSender,
      confidence: Math.min(...selectedMsgs.map((msg) => msg.confidence)),
      timestamp: selectedMsgs[0].timestamp,
      type: selectedMsgs[0].type,
      indicators: selectedMsgs.flatMap((msg) => msg.indicators),
      metadata: {
        originalIndex: selectedMsgs[0].metadata?.originalIndex || 0,
        mergedIds: selectedIds,
      },
    };

    // Update messages list
    const newMessages = messages.filter((msg) => !selectedIds.includes(msg.id));
    newMessages.push(mergedMessage);
    newMessages.sort(
      (a, b) =>
        (a.metadata?.originalIndex || 0) - (b.metadata?.originalIndex || 0),
    );

    setMessages(newMessages);
    setSelectedMessages(new Set());
    onUpdate(newMessages);
  };

  const handleSplitMessage = (messageId: string) => {
    const message = messages.find((msg) => msg.id === messageId);
    if (!message) return;

    // Split on double newlines or clear paragraph breaks
    const segments = message.content.split(/\n{2,}/).filter(Boolean);
    if (segments.length <= 1) return;

    const splitMessages: DetectedMessage[] = segments.map((content, index) => ({
      id: `split_${messageId}_${index}`,
      content: content.trim(),
      detectedSender: message.detectedSender,
      confidence: message.confidence * 0.9, // Slightly reduce confidence for splits
      timestamp: message.timestamp,
      type: message.type,
      indicators: message.indicators,
      metadata: {
        originalIndex: message.metadata?.originalIndex || 0,
        splitFromId: messageId,
        splitIndex: index,
      },
    }));

    // Update messages list
    const newMessages = messages.filter((msg) => msg.id !== messageId);
    newMessages.push(...splitMessages);
    newMessages.sort(
      (a, b) =>
        (a.metadata?.originalIndex || 0) - (b.metadata?.originalIndex || 0),
    );

    setMessages(newMessages);
    onUpdate(newMessages);
  };

  const handleApprove = async () => {
    try {
      setIsProcessing(true);

      // Convert DetectedMessages to Messages
      const processedMessages: Message[] = messages.map((msg) => ({
        id: msg.id,
        role: msg.detectedSender === "unknown" ? "you" : msg.detectedSender,
        content: msg.content,
        timestamp: msg.timestamp || new Date().toISOString(),
        type: msg.type || "text",
      }));

      await onApprove(processedMessages);
    } catch (error) {
      console.error("Error approving batch:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Batch Status */}
      <div className="flex items-center justify-between bg-white p-4 border-2 border-hud-border">
        <div>
          <h3 className="text-lg font-bold text-hud-text-primary uppercase tracking-wide font-primary">
            MESSAGE BATCH REVIEW
          </h3>
          <p className="text-sm text-medium-grey font-primary uppercase tracking-wide">
            {messages.length} MESSAGES DETECTED
            {batch.confidence > 0 &&
              ` WITH ${Math.round(batch.confidence * 100)}% CONFIDENCE`}
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleMergeMessages}
            disabled={selectedMessages.size < 2}
            className={`px-3 py-1 text-sm font-primary font-bold uppercase tracking-wide ${
              selectedMessages.size < 2
                ? "bg-light-grey text-medium-grey"
                : "bg-tactical-gold text-hud-text-primary hover:bg-tactical-gold-light"
            }`}
          >
            MERGE SELECTED
          </button>
          <button
            onClick={() => handleSplitMessage(Array.from(selectedMessages)[0])}
            disabled={selectedMessages.size !== 1}
            className={`px-3 py-1 text-sm font-primary font-bold uppercase tracking-wide ${
              selectedMessages.size !== 1
                ? "bg-light-grey text-medium-grey"
                : "bg-tactical-gold text-hud-text-primary hover:bg-tactical-gold-light"
            }`}
          >
            SPLIT MESSAGE
          </button>
        </div>
      </div>

      {/* Validation Warnings */}
      {(hasErrors || hasWarnings) && (
        <div
          className={`p-4 border-2 ${
            hasErrors
              ? "bg-red-50 border-red-600"
              : "bg-yellow-50 border-yellow-600"
          }`}
        >
          <h4
            className={`text-sm font-bold uppercase tracking-wide font-primary ${
              hasErrors ? "text-red-700" : "text-yellow-700"
            }`}
          >
            {hasErrors ? "ERRORS FOUND" : "WARNINGS"}
          </h4>
          <ul className="mt-2 space-y-1">
            {validation?.errors.map((error, index) => (
              <li key={`error_${index}`} className="text-sm text-red-700 font-primary uppercase tracking-wide">
                • {error.message}
              </li>
            ))}
            {validation?.warnings.map((warning, index) => (
              <li key={`warning_${index}`} className="text-sm text-yellow-700 font-primary uppercase tracking-wide">
                • {warning.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Message List */}
      <div className="space-y-2">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`bg-white p-4 border-2 ${
              selectedMessages.has(message.id)
                ? "border-hud-border-accent bg-tactical-gold-light"
                : "border-hud-border"
            }`}
          >
            <div className="flex items-start space-x-4">
              {/* Selection Checkbox */}
              <input
                type="checkbox"
                checked={selectedMessages.has(message.id)}
                onChange={() => toggleMessageSelection(message.id)}
                className="mt-1 h-4 w-4 text-gold border-2 border-hud-border focus:ring-gold"
              />

              <div className="flex-1 min-w-0">
                {/* Message Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-1 text-xs font-bold uppercase tracking-wide font-primary ${
                        message.detectedSender === "client"
                          ? "bg-medium-grey text-white"
                          : message.detectedSender === "you"
                            ? "bg-tactical-gold text-hud-text-primary"
                            : "bg-light-grey text-hud-text-primary"
                      }`}
                    >
                      {message.detectedSender.toUpperCase()}
                    </span>
                    {message.type && (
                      <span className="text-xs text-medium-grey font-primary uppercase tracking-wide">
                        {message.type.toUpperCase()}
                      </span>
                    )}
                    {message.timestamp && (
                      <span className="text-xs text-medium-grey font-primary uppercase tracking-wide">
                        {new Date(message.timestamp).toLocaleString().toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setEditingMessage(message.id)}
                      className="text-sm text-gold hover:text-gold-dark font-primary font-bold uppercase tracking-wide"
                    >
                      EDIT
                    </button>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-medium-grey font-primary uppercase tracking-wide">CONFIDENCE:</span>
                      <div className="w-20 h-2 bg-light-grey">
                        <div
                          className={`h-full ${
                            message.confidence > 0.8
                              ? "bg-green-600"
                              : message.confidence > 0.5
                                ? "bg-tactical-gold"
                                : "bg-red-600"
                          }`}
                          style={{ width: `${message.confidence * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Message Content */}
                {editingMessage === message.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={message.content}
                      onChange={(e) =>
                        updateMessage(message.id, { content: e.target.value })
                      }
                      className="w-full min-h-[100px] p-2 border-2 border-hud-border focus:border-hud-border-accent bg-white text-hud-text-primary font-primary"
                    />
                    <div className="flex space-x-2">
                      <select
                        value={message.detectedSender}
                        onChange={(e) =>
                          updateMessage(message.id, {
                            detectedSender: e.target.value as
                              | "client"
                              | "you"
                              | "unknown",
                          })
                        }
                        className="border-2 border-hud-border px-2 py-1 bg-white text-hud-text-primary font-primary text-sm uppercase tracking-wide focus:border-hud-border-accent"
                      >
                        <option value="client">CLIENT</option>
                        <option value="you">YOU</option>
                        <option value="unknown">UNKNOWN</option>
                      </select>
                      <button
                        onClick={() => setEditingMessage(null)}
                        className="px-3 py-1 text-sm text-gold hover:text-gold-dark font-primary font-bold uppercase tracking-wide"
                      >
                        DONE
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-hud-text-primary whitespace-pre-wrap font-primary">
                    {message.content}
                  </p>
                )}

                {/* Pattern Indicators */}
                {message.indicators.length > 0 && (
                  <div className="mt-2">
                    <details className="text-xs text-medium-grey font-primary uppercase tracking-wide">
                      <summary className="cursor-pointer hover:text-hud-text-primary font-bold">
                        DETECTION DETAILS
                      </summary>
                      <ul className="mt-1 space-y-1 pl-4">
                        {message.indicators.map((indicator, index) => (
                          <li key={index}>
                            {indicator.type.toUpperCase()}: {indicator.reasoning.toUpperCase()} (
                            {Math.round(indicator.confidence * 100)}%)
                          </li>
                        ))}
                      </ul>
                    </details>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4 pt-4 border-t-2 border-hud-border">
        <button
          onClick={onReject}
          disabled={isProcessing}
          className="px-4 py-2 text-sm font-bold text-hud-text-primary bg-white border-2 border-hud-border hover:bg-light-grey font-primary uppercase tracking-wide"
        >
          CANCEL
        </button>
        <button
          onClick={handleApprove}
          disabled={isProcessing || hasErrors || messages.length === 0}
          className={`px-4 py-2 text-sm font-bold font-primary uppercase tracking-wide ${
            isProcessing || hasErrors || messages.length === 0
              ? "bg-medium-grey text-white cursor-not-allowed"
              : "bg-tactical-gold text-hud-text-primary hover:bg-tactical-gold-light"
          }`}
        >
          {isProcessing ? "PROCESSING..." : "APPROVE & SAVE"}
        </button>
      </div>
    </div>
  );
};

export default BatchMessageProcessor;
