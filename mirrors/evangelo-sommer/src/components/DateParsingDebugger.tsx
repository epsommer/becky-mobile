// src/components/DateParsingDebugger.tsx
"use client";

import { useState } from "react";
import { DateParser } from "../lib/parsers/date-parser";

interface DateParsingDebuggerProps {
  originalData: Record<string, unknown>[];
  mapping?: {
    timestamp: string;
    messageContent: string;
    messageType: string;
    sender: string;
  };
}

// Type-safe accessor function for dynamic property access
const getRowValue = (row: Record<string, unknown>, key: string): string => {
  const value = row[key];
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
};

export default function DateParsingDebugger({
  originalData,
  mapping,
}: DateParsingDebuggerProps) {
  const [showDebug, setShowDebug] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  if (!showDebug) {
    return (
      <div className="mb-4">
        <button
          onClick={() => setShowDebug(true)}
          className="text-xs text-tactical-gold hover:text-tactical-brown-dark underline"
        >
          🔍 Debug Date Parsing Issues
        </button>
      </div>
    );
  }

  const sampleData = originalData.slice(0, 15);
  const timestampColumn = mapping?.timestamp || "Date";

  return (
    <div className="mt-4 p-4 bg-tactical-grey-100 border border-tactical-grey-300 rounded-lg">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-medium text-tactical-grey-700">
          Date Parsing Debug Console
        </h4>
        <button
          onClick={() => setShowDebug(false)}
          className="text-tactical-grey-500 hover:text-tactical-grey-600"
        >
          ✕
        </button>
      </div>

      <div className="mb-4 p-3 bg-tactical-gold-muted border border-tactical-grey-300 rounded text-sm">
        <div className="font-medium text-tactical-brown-dark mb-1">Debug Information</div>
        <div className="text-tactical-brown-dark">
          <div>Total rows: {originalData.length}</div>
          <div>
            Timestamp column:{" "}
            <code className="bg-tactical-gold-muted px-1 rounded">{timestampColumn}</code>
          </div>
          <div>Sample showing first {sampleData.length} rows</div>
        </div>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {sampleData.map((row, index) => {
          const rawDate = row[timestampColumn];
          const parsedDate = DateParser.parseSMSExportDate(rawDate);
          const validation = DateParser.validateDate(parsedDate || "");
          const isExpanded = expandedRow === index;

          return (
            <div
              key={index}
              className="border border-tactical-grey-400 rounded bg-white"
            >
              <div
                className="p-3 cursor-pointer hover:bg-tactical-grey-100"
                onClick={() => setExpandedRow(isExpanded ? null : index)}
              >
                <div className="flex items-center justify-between">
                  <div className="font-mono text-xs">
                    <span className="text-tactical-grey-500">Row {index + 1}:</span>
                    <span
                      className={`ml-2 px-2 py-1 rounded ${
                        parsedDate
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {parsedDate ? "✅ SUCCESS" : "❌ FAILED"}
                    </span>
                  </div>
                  <div className="text-xs text-tactical-grey-500">
                    {isExpanded ? "▼" : "▶"} Click to{" "}
                    {isExpanded ? "collapse" : "expand"}
                  </div>
                </div>

                <div className="mt-2 text-xs">
                  <div className="truncate">
                    <span className="text-tactical-grey-500">Raw:</span>
                    <code className="ml-1 bg-tactical-grey-200 px-1 rounded">
                      {JSON.stringify(rawDate).length > 80
                        ? JSON.stringify(rawDate).substring(0, 80) + "..."
                        : JSON.stringify(rawDate)}
                    </code>
                  </div>
                  {parsedDate && (
                    <div className="text-green-600 mt-1">
                      <span className="text-tactical-grey-500">Parsed:</span>
                      <span className="ml-1">
                        {DateParser.formatForDisplay(parsedDate)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-tactical-grey-300 p-3 bg-tactical-grey-100">
                  <div className="text-xs space-y-2">
                    <div>
                      <div className="font-medium text-tactical-grey-600 mb-1">
                        Detailed Analysis:
                      </div>
                      <div className="ml-2 space-y-1">
                        <div>
                          <span className="text-tactical-grey-500">Raw Value:</span>
                          <code className="ml-1 bg-tactical-grey-300 px-1 rounded break-all">
                            {JSON.stringify(rawDate)}
                          </code>
                        </div>
                        <div>
                          <span className="text-tactical-grey-500">Type:</span>
                          <code className="ml-1 bg-tactical-grey-300 px-1 rounded">
                            {typeof rawDate}
                          </code>
                        </div>
                        <div>
                          <span className="text-tactical-grey-500">Length:</span>
                          <code className="ml-1 bg-tactical-grey-300 px-1 rounded">
                            {rawDate?.toString()?.length || 0} chars
                          </code>
                        </div>

                        {parsedDate ? (
                          <>
                            <div className="text-green-700">
                              <div>
                                ✅{" "}
                                <span className="font-medium">
                                  Parse Result:
                                </span>
                              </div>
                              <div className="ml-4 space-y-1">
                                <div>
                                  ISO:{" "}
                                  <code className="bg-green-100 px-1 rounded">
                                    {parsedDate}
                                  </code>
                                </div>
                                <div>
                                  Display:{" "}
                                  <code className="bg-green-100 px-1 rounded">
                                    {DateParser.formatForDisplay(parsedDate)}
                                  </code>
                                </div>
                                <div>
                                  Valid:{" "}
                                  <span
                                    className={
                                      validation.isValid
                                        ? "text-green-600"
                                        : "text-red-600"
                                    }
                                  >
                                    {validation.isValid
                                      ? "Yes"
                                      : `No - ${validation.error}`}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="text-red-700">
                            <div>
                              ❌{" "}
                              <span className="font-medium">Parse Failed</span>
                            </div>
                            <div className="ml-4">
                              No matching date pattern found. The system will
                              use sequential fallback.
                            </div>
                          </div>
                        )}

                        {/* Additional row context */}
                        <div className="pt-2 border-t border-tactical-grey-400">
                          <div className="text-tactical-grey-500 font-medium mb-1">
                            Row Context:
                          </div>
                          <div className="ml-2 space-y-1">
                            {mapping?.messageContent && (
                              <div>
                                <span className="text-tactical-grey-500">Message:</span>
                                <span className="ml-1 text-xs">
                                  {(() => {
                                    const content = getRowValue(
                                      row,
                                      mapping.messageContent,
                                    );
                                    return content.length > 50
                                      ? content.substring(0, 50) + "..."
                                      : content;
                                  })()}
                                </span>
                              </div>
                            )}
                            {mapping?.messageType && (
                              <div>
                                <span className="text-tactical-grey-500">Type:</span>
                                <span className="ml-1">
                                  {getRowValue(row, mapping.messageType)}
                                </span>
                              </div>
                            )}
                            {mapping?.sender && (
                              <div>
                                <span className="text-tactical-grey-500">Sender:</span>
                                <span className="ml-1">
                                  {getRowValue(row, mapping.sender)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
        <div className="font-medium text-yellow-800 mb-2">Parsing Summary</div>
        <div className="text-yellow-700">
          {(() => {
            const successful = sampleData.filter((row) =>
              DateParser.parseSMSExportDate(row[timestampColumn]),
            ).length;
            const failed = sampleData.length - successful;

            return (
              <div className="space-y-1">
                <div>
                  ✅ Successful parses: {successful}/{sampleData.length}
                </div>
                <div>
                  ❌ Failed parses: {failed}/{sampleData.length}
                </div>
                <div>
                  📊 Success rate:{" "}
                  {Math.round((successful / sampleData.length) * 100)}%
                </div>
                {failed > 0 && (
                  <div className="mt-2 text-yellow-600">
                    <strong>Note:</strong> Failed parses will use sequential
                    timestamps. Consider using the Date Validation step to
                    correct these manually.
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      <div className="mt-3 text-xs text-tactical-grey-500">
        💡 <strong>Tip:</strong> If you see many failed parses, your date format
        might not be recognized. The most common SMS export formats are
        supported, but custom formats may need manual correction.
      </div>
    </div>
  );
}
