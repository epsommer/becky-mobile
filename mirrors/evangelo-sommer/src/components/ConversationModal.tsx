// src/components/ConversationModal.tsx
"use client";

import { useState, useEffect } from "react";
import { clientManager } from "../lib/client-config";
import { Conversation, Message } from "../types/client";
import MessageImporter from "./MessageImporter";
import ManualMessageEntry from "./ManualMessageEntry";

interface ConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  onSave: (conversation: Conversation) => void;
}

export default function ConversationModal({
  isOpen,
  onClose,
  clientId,
  clientName,
  onSave,
}: ConversationModalProps) {
  const [step, setStep] = useState<"type" | "content">("type");
  const [conversationType, setConversationType] = useState<"import" | "manual">(
    "import",
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    source: "email" as Conversation["source"],
    priority: "medium" as Conversation["priority"],
    status: "active" as Conversation["status"],
    tags: "",
  });

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setStep("type");
      setMessages([]);
      setFormData({
        title: "",
        source: "email",
        priority: "medium",
        status: "active",
        tags: "",
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    setError(null);
    e.preventDefault();

    if (messages.length === 0) {
      setError("Please add at least one message to the conversation.");
      return;
    }

    try {
      const conversation: Conversation = {
        id: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, // Temporary ID for client-side
        clientId,
        title: formData.title || `${formData.source} conversation`,
        messages,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: formData.source,
        priority: formData.priority,
        status: formData.status,
        tags: formData.tags
          ? formData.tags.split(",").map((tag) => tag.trim())
          : [],
        summary: `${messages.length} message${
          messages.length !== 1 ? "s" : ""
        } via ${formData.source}`,
      };

      onSave(conversation);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while saving the conversation",
      );
    }
  };

  const handleNext = () => {
    setStep("content");
  };

  const handleBack = () => {
    setStep("type");
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
          {step === "type" && (
            <div className="p-6">
              <h3 className="text-lg font-bold mb-4 text-hud-text-primary uppercase tracking-wide font-primary">
                HOW WOULD YOU LIKE TO ADD THIS CONVERSATION?
              </h3>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border-2 border-red-600 text-red-700 font-primary text-sm">
                  {error}
                </div>
              )}
              <div className="space-y-4">
                <label className="flex items-start p-4 border-2 border-hud-border cursor-pointer hover:bg-hud-background-secondary transition-colors">
                  <input
                    type="radio"
                    value="import"
                    checked={conversationType === "import"}
                    onChange={(e) =>
                      setConversationType(e.target.value as "import" | "manual")
                    }
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-bold text-hud-text-primary uppercase tracking-wide font-primary">
                      IMPORT TEXT HISTORY
                    </div>
                    <div className="text-sm text-medium-grey font-primary">
                      PASTE CONVERSATION HISTORY FROM EMAILS, TEXTS, OR MESSAGES
                    </div>
                  </div>
                </label>

                <label className="flex items-start p-4 border-2 border-hud-border cursor-pointer hover:bg-hud-background-secondary transition-colors">
                  <input
                    type="radio"
                    value="manual"
                    checked={conversationType === "manual"}
                    onChange={(e) =>
                      setConversationType(e.target.value as "import" | "manual")
                    }
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-bold text-hud-text-primary uppercase tracking-wide font-primary">
                      MANUAL ENTRY
                    </div>
                    <div className="text-sm text-medium-grey font-primary">
                      ADD MESSAGES ONE BY ONE WITH CUSTOM TIMESTAMPS
                    </div>
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
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

              <div className="mt-4">
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
            </div>
          )}

          {step === "content" && (
            <div className="p-6">
              <div className="flex items-center mb-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="text-gold hover:text-gold-dark mr-3 font-primary font-bold uppercase tracking-wide"
                >
                  ← BACK
                </button>
                <h3 className="text-lg font-bold text-hud-text-primary uppercase tracking-wide font-primary">
                  {conversationType === "import"
                    ? "IMPORT CONVERSATION HISTORY"
                    : "ADD MESSAGES"}
                </h3>
              </div>

              {conversationType === "import" ? (
                <MessageImporter
                  onMessagesDetected={setMessages}
                  clientName={clientName}
                  userName="You"
                />
              ) : (
                <ManualMessageEntry
                  onMessagesChange={(messages) => {
                    setMessages(messages);
                  }}
                  clientName={clientName}
                  userName="You"
                  messageType={
                    formData.source === "phone"
                      ? "call-notes"
                      : formData.source === "meeting"
                        ? "meeting-notes"
                        : (formData.source as Message["type"])
                  }
                />
              )}

              <div className="mt-4">
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
            </div>
          )}

          <div className="flex justify-end space-x-3 p-6 border-t-2 border-hud-border bg-hud-background-secondary">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-hud-text-primary border-2 border-hud-border hover:bg-light-grey font-primary font-bold uppercase tracking-wide"
            >
              CANCEL
            </button>
            {step === "type" ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2 bg-tactical-gold text-hud-text-primary hover:bg-tactical-gold-light font-primary font-bold uppercase tracking-wide"
              >
                NEXT
              </button>
            ) : (
              <button
                type="submit"
                className="px-4 py-2 bg-tactical-gold text-hud-text-primary hover:bg-tactical-gold-light font-primary font-bold uppercase tracking-wide"
              >
                SAVE CONVERSATION
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
