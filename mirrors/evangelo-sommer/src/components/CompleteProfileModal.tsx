"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Client } from "../types/client";

interface CompleteProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  onProfileComplete: (updatedClient: Partial<Client>) => void;
}

interface FormData {
  email: string;
  phone: string;
}

interface FormErrors {
  email?: string;
  phone?: string;
}

export default function CompleteProfileModal({
  isOpen,
  onClose,
  client,
  onProfileComplete,
}: CompleteProfileModalProps) {
  const [formData, setFormData] = useState<FormData>({
    email: client.email || "",
    phone: client.phone || "",
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>("");

  // Reset form when modal opens/closes or client changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        email: client.email || "",
        phone: client.phone || "",
      });
      setErrors({});
      setSubmitError("");
    }
  }, [isOpen, client]);

  // Determine which fields are missing
  const missingFields = {
    email: !client.email || client.email.trim() === "",
    phone: !client.phone || client.phone.trim() === "",
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Only validate fields that are missing and being filled
    if (missingFields.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = "Please enter a valid email address";
      }
    }

    if (missingFields.phone && formData.phone.trim()) {
      const cleanPhone = formData.phone.replace(/\D/g, "");
      if (cleanPhone.length < 10) {
        newErrors.phone = "Please enter a valid phone number";
      }
    }

    // At least one field must be provided
    if (missingFields.email && missingFields.phone) {
      if (!formData.email.trim() && !formData.phone.trim()) {
        newErrors.email = "Please provide at least email or phone";
        newErrors.phone = "Please provide at least email or phone";
      }
    } else if (missingFields.email && !formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (missingFields.phone && !formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    
    // Clear submit error
    if (submitError) {
      setSubmitError("");
    }
  };

  const formatPhoneNumber = (value: string): string => {
    const cleaned = value.replace(/\D/g, "");
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (match) {
      let formatted = "";
      if (match[1]) formatted += `(${match[1]}`;
      if (match[2]) formatted += `) ${match[2]}`;
      if (match[3]) formatted += `-${match[3]}`;
      return formatted;
    }
    return value;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    handleInputChange("phone", formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      // Prepare update data - only include fields that were missing
      const updateData: Partial<Client> = {};
      
      if (missingFields.email && formData.email.trim()) {
        updateData.email = formData.email.trim();
      }
      
      if (missingFields.phone && formData.phone.trim()) {
        updateData.phone = formData.phone.replace(/\D/g, ""); // Store clean phone number
      }

      // Call API to update client
      const response = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update profile");
      }

      const result = await response.json();
      
      // Notify parent component of successful update
      onProfileComplete(updateData);
      
      // Close modal
      onClose();
    } catch (error) {
      console.error("Error updating client profile:", error);
      setSubmitError(
        error instanceof Error ? error.message : "Failed to update profile"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
          >
            {/* Header */}
            <div className="p-6 border-b border-tactical-grey-300">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-tactical-grey-800">
                    Complete Client Profile
                  </h3>
                  <p className="text-sm text-tactical-grey-500 mt-1">
                    {client.name}
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="text-gray-400 hover:text-tactical-grey-500 transition-colors disabled:opacity-50"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                {/* Email field - only show if missing */}
                {missingFields.email && (
                  <div>
                    <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-tactical-gold focus:border-tactical-gold transition-colors ${
                        errors.email
                          ? "border-red-300 bg-red-50"
                          : "border-tactical-grey-400 bg-white"
                      }`}
                      placeholder="client@example.com"
                      autoComplete="email"
                      disabled={isSubmitting}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-600 mt-1">{errors.email}</p>
                    )}
                  </div>
                )}

                {/* Phone field - only show if missing */}
                {missingFields.phone && (
                  <div>
                    <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-tactical-gold focus:border-tactical-gold transition-colors ${
                        errors.phone
                          ? "border-red-300 bg-red-50"
                          : "border-tactical-grey-400 bg-white"
                      }`}
                      placeholder="(123) 456-7890"
                      autoComplete="tel"
                      disabled={isSubmitting}
                    />
                    {errors.phone && (
                      <p className="text-sm text-red-600 mt-1">{errors.phone}</p>
                    )}
                    <p className="text-xs text-tactical-grey-500 mt-1">
                      Format: (123) 456-7890 or 1234567890
                    </p>
                  </div>
                )}

                {/* Submit error */}
                {submitError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-700">{submitError}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-tactical-grey-600 border border-tactical-grey-400 rounded-lg hover:bg-tactical-grey-100 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-6 py-2 rounded-lg transition-colors ${
                    isSubmitting
                      ? "bg-gray-300 text-tactical-grey-500 cursor-not-allowed"
                      : "bg-tactical-gold text-tactical-brown-dark hover:bg-tactical-gold-dark"
                  }`}
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </div>
                  ) : (
                    "Complete Profile"
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
