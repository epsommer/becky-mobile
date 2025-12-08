// src/components/conversation/EnhancedMessageInput.tsx
"use client";

import { useState, useRef, useEffect, ReactElement } from "react";
import { Tab } from "@headlessui/react";
import {
  MessageInputMode,
  MessageBatch,
  DetectedMessage,
} from "../../types/conversation-batch";
import { Message } from "../../types/client";
import { MessageType } from "../../types/messages";

// Simple text editor component while we work on RichTextEditor integration
const TextEditor = ({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) => (
  <textarea
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className="w-full h-32 p-3 border-2 border-hud-border focus:border-hud-border-accent bg-white text-hud-text-primary font-primary"
  />
);

interface EnhancedMessageInputProps {
  clientId: string;
  conversationId?: string;
  onMessageSubmit: (messages: Message[]) => Promise<void>;
  onBatchProcess?: (batch: MessageBatch) => Promise<void>;
  initialMode?: MessageInputMode;
  className?: string;
}

const EnhancedMessageInput = ({
  clientId,
  conversationId,
  onMessageSubmit,
  onBatchProcess,
  initialMode = "individual",
  className,
}: EnhancedMessageInputProps): ReactElement => {
  // State management
  const [selectedMode, setSelectedMode] =
    useState<MessageInputMode>(initialMode);
  const [content, setContent] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [_detectedMessages, setDetectedMessages] = useState<DetectedMessage[]>(
    [],
  );
  const [selectedSender, setSelectedSender] = useState<"client" | "you">("you");
  const [messageType, setMessageType] = useState<MessageType>("text");
  const [error, setError] = useState<string | null>(null);

  // Refs
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle mode switching
  useEffect(() => {
    // Clear state when switching modes
    setContent("");
    setDetectedMessages([]); // Reset detected messages when mode changes
    setError(null);
  }, [selectedMode]);

  // Handle individual message submission
  const handleIndividualSubmit = async () => {
    try {
      setIsProcessing(true);
      setError(null);

      const message: Message = {
        id: `msg_${Date.now()}`,
        role: selectedSender,
        content: content.trim(),
        timestamp: new Date().toISOString(),
        type: messageType,
      };

      await onMessageSubmit([message]);
      setContent("");
    } catch (err) {
      setError("Failed to submit message. Please try again.");
      console.error("Message submission error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle batch processing
  const handleBatchProcess = async () => {
    if (!onBatchProcess) return;

    try {
      setIsProcessing(true);
      setError(null);

      const batch: MessageBatch = {
        id: `batch_${Date.now()}`,
        rawContent: content,
        detectedMessages: [],
        processedMessages: [],
        confidence: 0,
        status: "analyzing",
        corrections: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        clientId,
        conversationId,
        metadata: {
          sourceType: "manual",
          importMethod: selectedMode === "smart" ? "smart" : "manual",
          totalMessageCount: 0,
          processedMessageCount: 0,
          errorCount: 0,
          processingTime: 0,
        },
      };

      await onBatchProcess(batch);
      setContent("");
    } catch (err) {
      setError("Failed to process messages. Please try again.");
      console.error("Batch processing error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setContent(content);
    };
    reader.readAsText(file);
  };

  return (
    <div className={`bg-white border-2 border-hud-border ${className}`}>
      <Tab.Group
        selectedIndex={["individual", "batch", "smart"].indexOf(selectedMode)}
        onChange={(index) =>
          setSelectedMode(
            ["individual", "batch", "smart"][index] as MessageInputMode,
          )
        }
      >
        <Tab.List className="flex space-x-1 bg-hud-background-secondary p-1">
          <Tab
            className={({ selected }: { selected: boolean }) => `
            w-full py-2.5 text-sm font-bold uppercase tracking-wide leading-5 font-primary
            ${
              selected
                ? "bg-tactical-gold text-hud-text-primary"
                : "text-medium-grey hover:bg-light-grey hover:text-hud-text-primary"
            }
          `}
          >
            INDIVIDUAL
          </Tab>
          <Tab
            className={({ selected }: { selected: boolean }) => `
            w-full py-2.5 text-sm font-bold uppercase tracking-wide leading-5 font-primary
            ${
              selected
                ? "bg-tactical-gold text-hud-text-primary"
                : "text-medium-grey hover:bg-light-grey hover:text-hud-text-primary"
            }
          `}
          >
            BATCH IMPORT
          </Tab>
          <Tab
            className={({ selected }: { selected: boolean }) => `
            w-full py-2.5 text-sm font-bold uppercase tracking-wide leading-5 font-primary
            ${
              selected
                ? "bg-tactical-gold text-hud-text-primary"
                : "text-medium-grey hover:bg-light-grey hover:text-hud-text-primary"
            }
          `}
          >
            SMART SCAN
          </Tab>
        </Tab.List>

        <Tab.Panels className="p-4">
          {/* Individual Message Panel */}
          <Tab.Panel>
            <div className="space-y-4">
              <div className="flex space-x-4">
                <select
                  value={selectedSender}
                  onChange={(e) =>
                    setSelectedSender(e.target.value as "client" | "you")
                  }
                  className="border-2 border-hud-border px-3 py-2 bg-white text-hud-text-primary font-primary text-sm uppercase tracking-wide focus:border-hud-border-accent"
                >
                  <option value="you">YOU</option>
                  <option value="client">CLIENT</option>
                </select>
                <select
                  value={messageType}
                  onChange={(e) =>
                    setMessageType(e.target.value as MessageType)
                  }
                  className="border-2 border-hud-border px-3 py-2 bg-white text-hud-text-primary font-primary text-sm uppercase tracking-wide focus:border-hud-border-accent"
                >
                  <option value="text">TEXT</option>
                  <option value="email">EMAIL</option>
                  <option value="call-notes">CALL NOTES</option>
                  <option value="meeting-notes">MEETING NOTES</option>
                </select>
              </div>
              <div className="rich-text-container">
                <TextEditor
                  value={content}
                  onChange={setContent}
                  placeholder="TYPE YOUR MESSAGE..."
                />
              </div>
              <button
                onClick={handleIndividualSubmit}
                disabled={isProcessing || !content.trim()}
                className={`w-full py-2 px-4 font-primary font-bold uppercase tracking-wide
                  ${
                    isProcessing || !content.trim()
                      ? "bg-medium-grey text-white cursor-not-allowed"
                      : "bg-tactical-gold text-hud-text-primary hover:bg-tactical-gold-light"
                  }
                `}
              >
                {isProcessing ? "SENDING..." : "SEND MESSAGE"}
              </button>
            </div>
          </Tab.Panel>

          {/* Batch Import Panel */}
          <Tab.Panel>
            <div className="space-y-4">
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-hud-border border-dashed cursor-pointer bg-hud-background-secondary hover:bg-light-grey">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg
                      className="w-8 h-8 mb-4 text-medium-grey"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="mb-2 text-sm text-medium-grey font-primary uppercase tracking-wide">
                      <span className="font-bold">CLICK TO UPLOAD</span> OR DRAG AND DROP
                    </p>
                    <p className="text-xs text-medium-grey font-primary uppercase tracking-wide">
                      TXT, DOC, OR COPY/PASTE TEXT DIRECTLY
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".txt,.doc,.docx"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
              <textarea
                ref={textAreaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="PASTE CONVERSATION HISTORY HERE..."
                className="w-full h-64 p-4 border-2 border-hud-border focus:border-hud-border-accent bg-white text-hud-text-primary font-primary"
              />
              <button
                onClick={handleBatchProcess}
                disabled={isProcessing || !content.trim()}
                className={`w-full py-2 px-4 font-primary font-bold uppercase tracking-wide
                  ${
                    isProcessing || !content.trim()
                      ? "bg-medium-grey text-white cursor-not-allowed"
                      : "bg-tactical-gold text-hud-text-primary hover:bg-tactical-gold-light"
                  }
                `}
              >
                {isProcessing ? "PROCESSING..." : "PROCESS MESSAGES"}
              </button>
            </div>
          </Tab.Panel>

          {/* Smart Scan Panel */}
          <Tab.Panel>
            <div className="space-y-4">
              <div className="bg-tactical-gold-light border-2 border-hud-border-accent p-4">
                <h3 className="text-sm font-bold text-hud-text-primary uppercase tracking-wide font-primary">
                  AI-POWERED ANALYSIS
                </h3>
                <p className="mt-1 text-sm text-medium-grey font-primary">
                  THIS MODE USES AI TO AUTOMATICALLY DETECT MESSAGE BOUNDARIES, SENDERS, AND CONTEXT. REVIEW AND CONFIRM THE RESULTS BEFORE SAVING.
                </p>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="PASTE ANY CONVERSATION CONTENT FOR AI ANALYSIS..."
                className="w-full h-64 p-4 border-2 border-hud-border focus:border-hud-border-accent bg-white text-hud-text-primary font-primary"
              />
              <button
                onClick={handleBatchProcess}
                disabled={isProcessing || !content.trim()}
                className={`w-full py-2 px-4 font-primary font-bold uppercase tracking-wide
                  ${
                    isProcessing || !content.trim()
                      ? "bg-medium-grey text-white cursor-not-allowed"
                      : "bg-tactical-gold text-hud-text-primary hover:bg-tactical-gold-light"
                  }
                `}
              >
                {isProcessing ? "ANALYZING..." : "START ANALYSIS"}
              </button>
            </div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border-2 border-red-600">
          <p className="text-sm text-red-700 font-primary font-bold uppercase tracking-wide">{error}</p>
        </div>
      )}
    </div>
  );
};

export default EnhancedMessageInput;
