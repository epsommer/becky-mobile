// src/components/DateValidationStep.tsx
"use client";

import { useState } from "react";
import { DateParser } from "../lib/parsers/date-parser";
import { Message } from "../types/client";

export interface EnhancedMessage extends Message {
  metadata?: {
    parseSuccess?: boolean;
    originalTimestamp?: unknown;
    rowIndex?: number;
    autoFixed?: boolean;
    smartFixed?: boolean;
    manuallyEdited?: boolean;
  } & Message["metadata"];
}

interface DateValidationStepProps {
  messages: EnhancedMessage[];
  onDatesCorrected: (messages: EnhancedMessage[]) => void;
  onSkip: () => void;
}

export default function DateValidationStep({
  messages,
  onDatesCorrected,
  onSkip,
}: DateValidationStepProps) {
  const [editedMessages, setEditedMessages] = useState(messages);
  const [showingProblematic, setShowingProblematic] = useState(false);

  // Find messages with parsing issues
  const problematicMessages = editedMessages.filter(
    (msg) =>
      !msg.metadata?.parseSuccess ||
      new Date(msg.timestamp).getFullYear() === new Date().getFullYear(),
  );

  const duplicateTimestamps = editedMessages.filter(
    (msg, index, arr) =>
      arr.findIndex((m) => m.timestamp === msg.timestamp) !== index,
  );

  const handleDateChange = (messageId: string, newDate: string) => {
    setEditedMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              timestamp: new Date(newDate).toISOString(),
              metadata: {
                ...msg.metadata,
                parseSuccess: true,
                manuallyEdited: true,
              },
            }
          : msg,
      ),
    );
  };

  const autoFixDates = () => {
    // Try to distribute problematic dates evenly based on row order
    const sortedMessages = [...editedMessages].sort(
      (a, b) => (a.metadata?.rowIndex || 0) - (b.metadata?.rowIndex || 0),
    );

    // Use a reasonable base date (6 months ago)
    const baseDate = new Date();
    baseDate.setMonth(baseDate.getMonth() - 6);

    const fixedMessages = sortedMessages.map((msg, index) => {
      if (!msg.metadata?.parseSuccess || duplicateTimestamps.includes(msg)) {
        // Create a date based on row order (assuming chronological)
        const newDate = new Date(baseDate.getTime() + index * 60 * 60 * 1000); // 1 hour intervals

        return {
          ...msg,
          timestamp: newDate.toISOString(),
          metadata: {
            ...msg.metadata,
            parseSuccess: true,
            autoFixed: true,
          },
        };
      }
      return msg;
    });

    setEditedMessages(fixedMessages);
  };

  const smartFixDates = () => {
    // More intelligent date fixing based on content patterns
    const sortedMessages = [...editedMessages].sort(
      (a, b) => (a.metadata?.rowIndex || 0) - (b.metadata?.rowIndex || 0),
    );

    // Find the earliest and latest successfully parsed dates
    const validDates = sortedMessages
      .filter((msg) => msg.metadata?.parseSuccess)
      .map((msg) => new Date(msg.timestamp))
      .sort((a, b) => a.getTime() - b.getTime());

    let baseDate: Date;
    let intervalMs: number;

    if (validDates.length >= 2) {
      // Use the range from valid dates
      baseDate = validDates[0];
      const endDate = validDates[validDates.length - 1];
      intervalMs =
        (endDate.getTime() - baseDate.getTime()) / sortedMessages.length;
    } else {
      // Fallback to estimated dates
      baseDate = new Date();
      baseDate.setMonth(baseDate.getMonth() - 3); // 3 months ago
      intervalMs = 30 * 60 * 1000; // 30 minute intervals
    }

    const fixedMessages = sortedMessages.map((msg, index) => {
      if (!msg.metadata?.parseSuccess || duplicateTimestamps.includes(msg)) {
        const newDate = new Date(baseDate.getTime() + index * intervalMs);

        return {
          ...msg,
          timestamp: newDate.toISOString(),
          metadata: {
            ...msg.metadata,
            parseSuccess: true,
            smartFixed: true,
          },
        };
      }
      return msg;
    });

    setEditedMessages(fixedMessages);
  };

  const resetDates = () => {
    setEditedMessages(messages);
  };

  const analysis = DateParser.analyzeDateParsingResults(editedMessages);

  return (
    <div className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-2">
          <div className="text-yellow-600">⚠️</div>
          <h3 className="font-medium text-yellow-800">
            Date Validation Required
          </h3>
        </div>
        <div className="text-yellow-700 text-sm space-y-1">
          <p>{problematicMessages.length} messages have date parsing issues.</p>
          {duplicateTimestamps.length > 0 && (
            <p>
              {duplicateTimestamps.length} messages have duplicate timestamps.
            </p>
          )}
          {analysis.currentDateIssues > 0 && (
            <p>
              {analysis.currentDateIssues} messages show current year (likely
              parse failures).
            </p>
          )}
          <p className="mt-2 text-yellow-600">
            Please review and correct the timestamps below, or use auto-fix
            options.
          </p>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={smartFixDates}
            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
          >
            Smart Auto-Fix
          </button>
          <button
            onClick={autoFixDates}
            className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition-colors"
          >
            Simple Auto-Fix
          </button>
          <button
            onClick={() => setShowingProblematic(!showingProblematic)}
            className="px-3 py-1 bg-tactical-gold text-white text-sm rounded hover:bg-tactical-gold-dark transition-colors"
          >
            {showingProblematic ? "Show All Messages" : "Show Problems Only"}
          </button>
          <button
            onClick={resetDates}
            className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-tactical-grey-700 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {(showingProblematic
          ? problematicMessages
          : editedMessages.slice(0, 20)
        ).map((message) => {
          const hasIssue =
            !message.metadata?.parseSuccess ||
            duplicateTimestamps.includes(message) ||
            new Date(message.timestamp).getFullYear() ===
              new Date().getFullYear();

          return (
            <div
              key={message.id}
              className={`border rounded-lg p-4 transition-colors ${
                hasIssue
                  ? "border-red-200 bg-red-50"
                  : "border-tactical-grey-300 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2 flex-wrap">
                    <span
                      className={`px-2 py-1 text-xs rounded whitespace-nowrap ${
                        message.role === "you"
                          ? "bg-tactical-gold-muted text-tactical-brown-dark"
                          : "bg-tactical-grey-200 text-tactical-grey-700"
                      }`}
                    >
                      {message.role === "you" ? "You" : "Client"}
                    </span>

                    {!message.metadata?.parseSuccess && (
                      <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded whitespace-nowrap">
                        Parse Failed
                      </span>
                    )}

                    {message.metadata?.autoFixed && (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded whitespace-nowrap">
                        Auto-Fixed
                      </span>
                    )}

                    {message.metadata?.smartFixed && (
                      <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded whitespace-nowrap">
                        Smart-Fixed
                      </span>
                    )}

                    {message.metadata?.manuallyEdited && (
                      <span className="px-2 py-1 text-xs bg-tactical-gold-muted text-tactical-brown-dark rounded whitespace-nowrap">
                        Manually Edited
                      </span>
                    )}

                    {duplicateTimestamps.includes(message) && (
                      <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded whitespace-nowrap">
                        Duplicate Time
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-tactical-grey-600 mb-2 break-words">
                    {message.content.length > 100
                      ? `${message.content.substring(0, 100)}...`
                      : message.content}
                  </p>

                  <div className="text-xs text-tactical-grey-500 space-y-1">
                    <div>
                      Original:{" "}
                      {message.metadata?.originalTimestamp
                        ? JSON.stringify(message.metadata.originalTimestamp)
                        : "N/A"}
                    </div>
                    <div>
                      Current: {DateParser.formatForDisplay(message.timestamp)}
                    </div>
                    {message.metadata?.rowIndex !== undefined && (
                      <div>Row: {message.metadata.rowIndex + 1}</div>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <input
                    type="datetime-local"
                    value={new Date(message.timestamp)
                      .toISOString()
                      .slice(0, 16)}
                    onChange={(e) =>
                      handleDateChange(message.id, e.target.value)
                    }
                    className="text-sm border border-tactical-grey-400 rounded px-2 py-1 w-48"
                  />
                </div>
              </div>
            </div>
          );
        })}

        {!showingProblematic && editedMessages.length > 20 && (
          <div className="text-center py-4 text-tactical-grey-500 text-sm">
            Showing first 20 messages. Use &quot;Show Problems Only&quot; to see
            all problematic messages.
          </div>
        )}
      </div>

      <div className="bg-tactical-grey-100 border border-tactical-grey-300 rounded-lg p-4">
        <h4 className="font-medium text-tactical-grey-700 mb-2">
          Date Analysis Summary
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="font-medium text-tactical-grey-500">Total Messages</div>
            <div className="text-lg font-bold text-tactical-grey-800">
              {editedMessages.length}
            </div>
          </div>
          <div>
            <div className="font-medium text-red-600">Parse Failures</div>
            <div className="text-lg font-bold text-red-700">
              {analysis.failedParses}
            </div>
          </div>
          <div>
            <div className="font-medium text-orange-600">Duplicates</div>
            <div className="text-lg font-bold text-orange-700">
              {analysis.duplicates}
            </div>
          </div>
          <div>
            <div className="font-medium text-yellow-600">Current Year</div>
            <div className="text-lg font-bold text-yellow-700">
              {analysis.currentDateIssues}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={onSkip}
          className="px-4 py-2 text-tactical-grey-500 border border-tactical-grey-400 rounded-lg hover:bg-tactical-grey-100 transition-colors"
        >
          Skip Validation
        </button>
        <button
          onClick={() => onDatesCorrected(editedMessages)}
          className="px-4 py-2 bg-tactical-gold text-white rounded-lg hover:bg-tactical-gold-dark transition-colors"
        >
          Continue with Corrected Dates ({editedMessages.length} messages)
        </button>
      </div>
    </div>
  );
}
