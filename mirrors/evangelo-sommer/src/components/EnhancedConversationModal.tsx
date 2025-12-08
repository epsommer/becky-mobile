// src/components/EnhancedConversationModal.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { clientManager } from "../lib/client-config";
import { Conversation, Message } from "../types/client";
import { MessageBatch } from "../types/conversation-batch";
import ConversationBatchManager from "./conversation/ConversationBatchManager";
import ParsingEngine from "../lib/conversation/parsing-engine";

interface EnhancedConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  onSave: (conversation: Conversation) => void;
}

export default function EnhancedConversationModal({
  isOpen,
  onClose,
  clientId,
  clientName,
  onSave,
}: EnhancedConversationModalProps) {
  // Form state
  const [formData, setFormData] = useState({
    title: "",
    source: "email" as Conversation["source"],
    priority: "medium" as Conversation["priority"],
    status: "active" as Conversation["status"],
    tags: "",
  });

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processedMessages, setProcessedMessages] = useState<Message[]>([]);

  // Initialize parsing engine
  const parsingEngine = useMemo(
    () =>
      new ParsingEngine({
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
      }),
    [],
  );

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: "",
        source: "email",
        priority: "medium",
        status: "active",
        tags: "",
      });
      setProcessedMessages([]);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleMessagesProcessed = async (messages: Message[]) => {
    try {
      setProcessedMessages(messages);
    } catch (err) {
      setError("Failed to process messages. Please try again.");
      console.error("Message processing error:", err);
    }
  };

  const handleBatchProcess = async (batch: MessageBatch) => {
    try {
      setIsProcessing(true);
      setError(null);

      // Process the batch using the parsing engine
      const processedBatch = await parsingEngine.processMessageBatch(
        batch.rawContent,
        clientId,
      );

      // Convert detected messages to conversation messages with strict type handling
      const messages: Message[] = processedBatch.detectedMessages.map((msg) => {
        // Determine the correct message type based on source and msg type
        let messageType: Message["type"];
        if (msg.type) {
          messageType = msg.type;
        } else {
          switch (formData.source) {
            case "phone":
              messageType = "call-notes";
              break;
            case "meeting":
              messageType = "meeting-notes";
              break;
            case "import":
            case "text":
              messageType = "text";
              break;
            case "email":
              messageType = "email";
              break;
            default:
              messageType = "text"; // Default fallback
          }
        }

        return {
          id: msg.id,
          role: msg.detectedSender === "unknown" ? "you" : msg.detectedSender,
          content: msg.content,
          timestamp: msg.timestamp || new Date().toISOString(),
          type: messageType,
          metadata:
            formData.source === "email"
              ? {
                  subject: formData.title || `Conversation with ${clientName}`,
                }
              : undefined,
        };
      });

      setProcessedMessages(messages);
    } catch (err) {
      setError("Failed to process message batch. Please try again.");
      console.error("Batch processing error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsProcessing(true);
      setError(null);

      const conversation: Conversation = {
        id: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, // Temporary ID for client-side
        clientId,
        title: formData.title || `${formData.source} conversation`,
        messages: processedMessages,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: formData.source,
        priority: formData.priority,
        status: formData.status,
        tags: formData.tags
          ? formData.tags.split(",").map((tag) => tag.trim())
          : [],
        summary: `${processedMessages.length} message${
          processedMessages.length !== 1 ? "s" : ""
        } via ${formData.source}`,
      };

      await onSave(conversation);
      onClose();
    } catch (err) {
      setError("Failed to save conversation. Please try again.");
      console.error("Conversation save error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white border-2 border-hud-border max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 bg-hud-background-secondary border-b-2 border-hud-border-accent">
          <h2 className="text-xl font-bold text-hud-text-primary uppercase tracking-wide font-primary">
            ADD CONVERSATION WITH {clientName.toUpperCase()}
          </h2>
          <button
            onClick={onClose}
            className="text-medium-grey hover:text-hud-text-primary transition-colors"
          >
            <svg
              className="w-6 h-6"
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

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            {/* Conversation Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold text-hud-text-primary mb-1 uppercase tracking-wide font-primary">
                  COMMUNICATION TYPE
                </label>
                <select
                  value={formData.source}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      source: e.target.value as Conversation["source"],
                    }))
                  }
                  className="w-full px-3 py-2 border-2 border-hud-border focus:border-hud-border-accent bg-white text-hud-text-primary font-primary text-sm uppercase tracking-wide"
                >
                  <option value="email">EMAIL</option>
                  <option value="text">TEXT MESSAGES</option>
                  <option value="phone">PHONE CALL</option>
                  <option value="meeting">MEETING</option>
                  <option value="import">IMPORTED</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-hud-text-primary mb-1 uppercase tracking-wide font-primary">
                  PRIORITY
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      priority: e.target.value as Conversation["priority"],
                    }))
                  }
                  className="w-full px-3 py-2 border-2 border-hud-border focus:border-hud-border-accent bg-white text-hud-text-primary font-primary text-sm uppercase tracking-wide"
                >
                  <option value="low">LOW</option>
                  <option value="medium">MEDIUM</option>
                  <option value="high">HIGH</option>
                  <option value="urgent">URGENT</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-hud-text-primary mb-1 uppercase tracking-wide font-primary">
                  STATUS
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      status: e.target.value as Conversation["status"],
                    }))
                  }
                  className="w-full px-3 py-2 border-2 border-hud-border focus:border-hud-border-accent bg-white text-hud-text-primary font-primary text-sm uppercase tracking-wide"
                >
                  <option value="active">ACTIVE</option>
                  <option value="pending">PENDING RESPONSE</option>
                  <option value="resolved">RESOLVED</option>
                  <option value="archived">ARCHIVED</option>
                </select>
              </div>
            </div>

            {/* Conversation Title */}
            <div>
              <label className="block text-sm font-bold text-hud-text-primary mb-1 uppercase tracking-wide font-primary">
                CONVERSATION TITLE (OPTIONAL)
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full px-3 py-2 border-2 border-hud-border focus:border-hud-border-accent bg-white text-hud-text-primary font-primary"
                placeholder="E.G., KITCHEN RENOVATION DISCUSSION, QUOTE FOLLOW-UP"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-bold text-hud-text-primary mb-1 uppercase tracking-wide font-primary">
                TAGS (COMMA-SEPARATED)
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, tags: e.target.value }))
                }
                className="w-full px-3 py-2 border-2 border-hud-border focus:border-hud-border-accent bg-white text-hud-text-primary font-primary"
                placeholder="QUOTE, URGENT, FOLLOW-UP, PRICING"
              />
            </div>

            {/* Conversation Content */}
            <div className="border-2 border-hud-border p-4 bg-hud-background-secondary">
              <h3 className="text-lg font-bold text-hud-text-primary uppercase tracking-wide font-primary mb-4">
                CONVERSATION CONTENT
              </h3>
              <ConversationBatchManager
                clientId={clientId}
                onMessagesProcessed={handleMessagesProcessed}
                onBatchProcess={handleBatchProcess}
              />
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-50 border-2 border-red-600 text-red-700 font-primary text-sm">
                <p className="font-bold uppercase tracking-wide">{error}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 p-6 border-t-2 border-hud-border bg-hud-background-secondary">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-hud-text-primary border-2 border-hud-border hover:bg-light-grey font-primary font-bold uppercase tracking-wide"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={isProcessing || processedMessages.length === 0}
              className={`px-4 py-2 font-primary font-bold uppercase tracking-wide ${
                isProcessing || processedMessages.length === 0
                  ? "bg-medium-grey text-white cursor-not-allowed"
                  : "bg-tactical-gold text-hud-text-primary hover:bg-tactical-gold-light"
              }`}
            >
              {isProcessing ? "PROCESSING..." : "SAVE CONVERSATION"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
