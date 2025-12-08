// src/components/ImportPreview.tsx
"use client";

import { useState } from "react";
import {
  ImportedConversation,
  UserInfo,
  ClientInfo,
} from "../types/excel-import";

interface ImportPreviewProps {
  conversation: ImportedConversation;
  userInfo: UserInfo;
  clientInfo: ClientInfo;
  onSenderCorrection: (messageIndex: number) => void;
  onConfirmImport: () => void;
  onCancel: () => void;
  onBack: () => void;
}

export default function ImportPreview({
  conversation,
  userInfo,
  clientInfo,
  onSenderCorrection,
  onConfirmImport,
  onCancel,
  onBack,
}: ImportPreviewProps) {
  const [selectedMessages, setSelectedMessages] = useState<Set<number>>(
    new Set(),
  );
  const [showDetails, setShowDetails] = useState(false);

  const toggleMessageSelection = (index: number) => {
    const newSelection = new Set(selectedMessages);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedMessages(newSelection);
  };

  const selectAllMessages = () => {
    if (selectedMessages.size === conversation.messages.length) {
      setSelectedMessages(new Set());
    } else {
      setSelectedMessages(
        new Set(
          Array.from({ length: conversation.messages.length }, (_, i) => i),
        ),
      );
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    try {
      return new Date(timestamp).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return timestamp;
    }
  };

  const getMessageStats = () => {
    const total = conversation.messages.length;
    const fromYou = conversation.messages.filter(
      (msg) => msg.role === "you",
    ).length;
    const fromClient = total - fromYou;

    return { total, fromYou, fromClient };
  };

  const stats = getMessageStats();

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-4xl mx-auto max-h-[90vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b bg-tactical-grey-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-tactical-grey-800">
              Import Preview
            </h3>
            <p className="text-sm text-tactical-grey-500 mt-1">
              Review and correct message senders before importing
            </p>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-tactical-gold hover:text-tactical-brown-dark"
          >
            {showDetails ? "Hide Details" : "Show Details"}
          </button>
        </div>

        {/* Participant Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-tactical-gold-muted border border-tactical-grey-300 rounded-lg p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-tactical-gold rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                Y
              </div>
              <div>
                <div className="font-medium text-tactical-grey-800">You</div>
                <div className="text-sm text-tactical-grey-500">{userInfo.name}</div>
                <div className="text-sm text-tactical-grey-500">{userInfo.phone}</div>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                C
              </div>
              <div>
                <div className="font-medium text-tactical-grey-800">Client</div>
                <div className="text-sm text-tactical-grey-500">{clientInfo.name}</div>
                <div className="text-sm text-tactical-grey-500">{clientInfo.phone}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-white rounded-lg p-3 border">
            <div className="text-2xl font-bold text-tactical-grey-800">
              {stats.total}
            </div>
            <div className="text-sm text-tactical-grey-500">Total Messages</div>
          </div>
          <div className="bg-white rounded-lg p-3 border">
            <div className="text-2xl font-bold text-tactical-gold">
              {stats.fromYou}
            </div>
            <div className="text-sm text-tactical-grey-500">From You</div>
          </div>
          <div className="bg-white rounded-lg p-3 border">
            <div className="text-2xl font-bold text-green-600">
              {stats.fromClient}
            </div>
            <div className="text-sm text-tactical-grey-500">From Client</div>
          </div>
        </div>

        {showDetails && (
          <div className="mt-4 p-4 bg-tactical-grey-200 rounded-lg">
            <h4 className="font-medium text-tactical-grey-800 mb-2">Import Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Date Range:</span>
                <div className="text-tactical-grey-500">
                  {formatTimestamp(conversation.metadata.dateRange.start)} -
                  {formatTimestamp(conversation.metadata.dateRange.end)}
                </div>
              </div>
              <div>
                <span className="font-medium">Source:</span>
                <div className="text-tactical-grey-500">Text Message Export</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={selectAllMessages}
              className="text-sm text-tactical-gold hover:text-tactical-brown-dark"
            >
              {selectedMessages.size === conversation.messages.length
                ? "Deselect All"
                : "Select All"}
            </button>
            {selectedMessages.size > 0 && (
              <span className="text-sm text-tactical-grey-500">
                {selectedMessages.size} selected
              </span>
            )}
          </div>
          <div className="text-sm text-tactical-grey-500">
            Click sender badges to switch between You/Client
          </div>
        </div>

        <div className="space-y-4">
          {conversation.messages.map((message, index) => (
            <div
              key={message.id || `message-${index}`}
              className={`relative p-4 rounded-lg border transition-all ${
                message.role === "you"
                  ? "bg-tactical-gold-muted border-tactical-grey-300"
                  : "bg-green-50 border-green-200"
              } ${selectedMessages.has(index) ? "ring-2 ring-tactical-gold-500" : ""}`}
            >
              {/* Selection Checkbox */}
              <div className="absolute top-2 left-2">
                <input
                  type="checkbox"
                  checked={selectedMessages.has(index)}
                  onChange={() => toggleMessageSelection(index)}
                  className="h-4 w-4 text-tactical-gold rounded"
                />
              </div>

              {/* Message Header */}
              <div className="flex justify-between items-start mb-3 ml-6">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => onSenderCorrection(index)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      message.role === "you"
                        ? "bg-tactical-gold-light text-tactical-brown-dark hover:bg-tactical-gold-300"
                        : "bg-green-200 text-green-800 hover:bg-green-300"
                    }`}
                    title="Click to switch sender"
                  >
                    {message.role === "you" ? userInfo.name : clientInfo.name}
                  </button>
                  <button
                    onClick={() => onSenderCorrection(index)}
                    className="text-gray-400 hover:text-tactical-grey-500"
                    title="Switch sender"
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
                        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                      />
                    </svg>
                  </button>
                </div>
                <div className="text-sm text-tactical-grey-500">
                  {formatTimestamp(message.timestamp)}
                </div>
              </div>

              {/* Message Content */}
              <div className="text-tactical-grey-800 whitespace-pre-wrap ml-6">
                {message.content}
              </div>

              {/* Message Metadata */}
              <div className="mt-3 ml-6 text-xs text-tactical-grey-500 bg-white bg-opacity-50 rounded p-2">
                <div className="flex justify-between">
                  <span>
                    Original: {message.metadata.originalData.originalType}
                  </span>
                  <span>
                    {message.metadata.originalData.originalNameNumber}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex justify-between items-center p-6 border-t bg-tactical-grey-100">
        <button
          onClick={onBack}
          className="px-4 py-2 text-tactical-grey-600 border border-tactical-grey-400 rounded-lg hover:bg-tactical-grey-100 transition-colors"
        >
          ← Back to User Info
        </button>

        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-tactical-grey-600 border border-tactical-grey-400 rounded-lg hover:bg-tactical-grey-100 transition-colors"
          >
            Cancel Import
          </button>
          <button
            onClick={onConfirmImport}
            className="px-6 py-2 bg-tactical-gold text-white rounded-lg hover:bg-tactical-gold-dark transition-colors"
          >
            Import {stats.total} Messages
          </button>
        </div>
      </div>

      {/* Help Text */}
      <div className="px-6 pb-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-start">
            <svg
              className="h-5 w-5 text-yellow-400 mt-0.5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div className="text-sm">
              <h4 className="font-medium text-yellow-800">
                Review Sender Detection
              </h4>
              <p className="text-yellow-700 mt-1">
                We&apos;ve automatically detected message senders based on
                &quot;Sent&quot; vs &quot;Received&quot; in your export. Click
                the colored sender badges to correct any misidentified messages
                before importing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
