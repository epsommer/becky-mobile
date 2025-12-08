"use client";

import React, { useState } from "react";
import { Client } from "../types/client";
import { isClientProfileIncomplete, getProfileCompletionMessage } from "../lib/client-profile-utils";
import CompleteProfileModal from "./CompleteProfileModal";

interface ClientProfileCompletionProps {
  client: Client;
  onClientUpdate: (updatedClient: Partial<Client>) => void;
  className?: string;
}

export default function ClientProfileCompletion({
  client,
  onClientUpdate,
  className = "",
}: ClientProfileCompletionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Check if profile is incomplete
  const isIncomplete = isClientProfileIncomplete(client);

  // Don't render if profile is complete
  if (!isIncomplete) {
    return null;
  }

  const handleCompleteProfile = () => {
    setIsModalOpen(true);
  };

  const handleProfileComplete = async (updatedData: Partial<Client>) => {
    setIsUpdating(true);
    
    try {
      // Update the client data in parent component
      onClientUpdate(updatedData);
      
      // Close modal
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error handling profile completion:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleModalClose = () => {
    if (!isUpdating) {
      setIsModalOpen(false);
    }
  };

  return (
    <>
      <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-yellow-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-yellow-800">
              Complete Client Profile
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>{getProfileCompletionMessage(client)}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={handleCompleteProfile}
                disabled={isUpdating}
                className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md transition-colors ${
                  isUpdating
                    ? "bg-gray-300 text-tactical-grey-500 cursor-not-allowed"
                    : "bg-yellow-600 text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                }`}
              >
                {isUpdating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <svg
                      className="mr-2 h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    Complete Profile
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Complete Profile Modal */}
      <CompleteProfileModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        client={client}
        onProfileComplete={handleProfileComplete}
      />
    </>
  );
}
