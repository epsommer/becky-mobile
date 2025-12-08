// src/components/ExcelImportDemo.tsx
"use client";

import { useState } from "react";
import { Message } from "../types/client";
import ExcelImporter from "./ExcelImporter";

interface ExcelImportDemoProps {
  clientName?: string;
  userName?: string;
  onComplete?: (messages: Message[]) => void;
}

export default function ExcelImportDemo({
  clientName = "Mark Levy",
  userName = "Evangelo P. Sommer",
  onComplete,
}: ExcelImportDemoProps) {
  const [importedMessages, setImportedMessages] = useState<Message[]>([]);
  const [showDemo, setShowDemo] = useState(false);

  const handleMessagesDetected = (messages: Message[]) => {
    setImportedMessages(messages);
    onComplete?.(messages);
    console.log("Excel Import Complete:", messages);
  };

  const resetDemo = () => {
    setImportedMessages([]);
    setShowDemo(false);
  };

  if (!showDemo) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-tactical-grey-800 mb-4">
            Excel Message Import Demo
          </h2>
          <p className="text-tactical-grey-500 mb-6">
            Test the new Excel import functionality with sender normalization
          </p>

          <div className="bg-tactical-gold-muted border border-tactical-grey-300 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-tactical-brown-dark mb-2">
              Features Included:
            </h3>
            <ul className="text-sm text-tactical-brown-dark text-left space-y-1">
              <li>✅ Excel file parsing (.xlsx, .xls)</li>
              <li>✅ Automatic sender detection (Sent/Received)</li>
              <li>✅ User contact information collection</li>
              <li>✅ Client information auto-detection</li>
              <li>✅ Message preview with sender correction</li>
              <li>✅ Contact information extraction</li>
              <li>✅ Date/time normalization</li>
            </ul>
          </div>

          <div className="bg-tactical-grey-200 rounded-lg p-4 mb-6 text-left">
            <h4 className="font-medium text-tactical-grey-800 mb-2">
              Expected Excel Format:
            </h4>
            <div className="text-sm text-tactical-grey-600">
              <div className="grid grid-cols-4 gap-2 font-mono bg-white p-2 rounded">
                <div className="font-bold">Type</div>
                <div className="font-bold">Date</div>
                <div className="font-bold">Name / Number</div>
                <div className="font-bold">Content</div>
                <div>Sent</div>
                <div>2024-01-15 10:30</div>
                <div>Mark Levy (647-888-0078)</div>
                <div>Hi Mark, how are you?</div>
                <div>Received</div>
                <div>2024-01-15 10:35</div>
                <div>Mark Levy (647-888-0078)</div>
                <div>Good thanks! Ready for the project?</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowDemo(true)}
            className="px-6 py-3 bg-tactical-gold text-white rounded-lg hover:bg-tactical-gold-dark transition-colors"
          >
            Start Excel Import Demo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-tactical-grey-800">
            Excel Import - {clientName}
          </h2>
          <p className="text-tactical-grey-500">
            Import and normalize message history from Excel export
          </p>
        </div>
        <button
          onClick={resetDemo}
          className="px-4 py-2 text-tactical-grey-500 border border-tactical-grey-400 rounded-lg hover:bg-tactical-grey-100"
        >
          Reset Demo
        </button>
      </div>

      {/* Import Interface */}
      <div className="bg-white rounded-lg shadow-lg">
        <ExcelImporter
          onMessagesDetected={handleMessagesDetected}
          clientName={clientName}
          userName={userName}
        />
      </div>

      {/* Results Display */}
      {importedMessages.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-tactical-grey-800 mb-4">
            Import Results ({importedMessages.length} messages)
          </h3>

          <div className="space-y-4">
            {importedMessages.map((message, index) => (
              <div
                key={message.id}
                className={`p-4 rounded-lg border ${
                  message.role === "you"
                    ? "bg-tactical-gold-muted border-tactical-grey-300 ml-8"
                    : "bg-green-50 border-green-200 mr-8"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        message.role === "you"
                          ? "bg-tactical-gold-light text-tactical-brown-dark"
                          : "bg-green-200 text-green-800"
                      }`}
                    >
                      {message.role === "you" ? userName : clientName}
                    </span>
                    <span className="text-sm text-tactical-grey-500">
                      {new Date(message.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">#{index + 1}</span>
                </div>

                <div className="text-tactical-grey-800 whitespace-pre-wrap">
                  {message.content}
                </div>

                {message.metadata && (
                  <div className="mt-2 text-xs text-tactical-grey-500 bg-tactical-grey-100 rounded p-2">
                    <div className="grid grid-cols-2 gap-2">
                      {message.metadata.phoneNumber && (
                        <div>
                          <span className="font-medium">Phone:</span>{" "}
                          {message.metadata.phoneNumber}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Type:</span>{" "}
                        {message.type}
                      </div>
                      {message.metadata.subject && (
                        <div>
                          <span className="font-medium">Subject:</span>{" "}
                          {message.metadata.subject}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Role:</span>{" "}
                        {message.role}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Summary Stats */}
          <div className="mt-6 p-4 bg-tactical-grey-100 rounded-lg">
            <h4 className="font-medium text-tactical-grey-800 mb-2">Import Summary</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-tactical-gold">
                  {importedMessages.filter((m) => m.role === "you").length}
                </div>
                <div className="text-sm text-tactical-grey-500">From You</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {importedMessages.filter((m) => m.role === "client").length}
                </div>
                <div className="text-sm text-tactical-grey-500">From Client</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-tactical-grey-700">
                  {importedMessages.length}
                </div>
                <div className="text-sm text-tactical-grey-500">Total Messages</div>
              </div>
            </div>
          </div>

          {/* Integration Note */}
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <svg
                className="h-5 w-5 text-yellow-400 mt-0.5 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="text-sm">
                <h4 className="font-medium text-yellow-800">
                  Ready for Integration
                </h4>
                <p className="text-yellow-700 mt-1">
                  These messages have been converted to the standard Message
                  format and are ready to be saved to a conversation. The
                  ExcelImporter component can be integrated directly into the
                  existing ConversationModal.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
