// src/components/UserInfoForm.tsx
"use client";

import { useState } from "react";
import { UserInfo } from "../types/excel-import";

interface UserInfoFormProps {
  onUserInfoSet: (userInfo: UserInfo) => void;
  onCancel?: () => void;
  initialData?: Partial<UserInfo>;
  className?: string;
}

export default function UserInfoForm({
  onUserInfoSet,
  onCancel,
  initialData = {},
  className = "",
}: UserInfoFormProps) {
  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: initialData.name || "",
    phone: initialData.phone || "",
    email: initialData.email || "",
  });

  const [errors, setErrors] = useState<Partial<UserInfo>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<UserInfo> = {};

    if (!userInfo.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!userInfo.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else {
      // Basic phone validation
      const cleanPhone = userInfo.phone.replace(/\D/g, "");
      if (cleanPhone.length < 10) {
        newErrors.phone = "Please enter a valid phone number";
      }
    }

    if (userInfo.email && userInfo.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userInfo.email)) {
        newErrors.email = "Please enter a valid email address";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      // Clean phone number
      const cleanedUserInfo = {
        ...userInfo,
        phone: userInfo.phone.replace(/\D/g, ""),
      };
      onUserInfoSet(cleanedUserInfo);
    }
  };

  const handleInputChange = (field: keyof UserInfo, value: string) => {
    setUserInfo((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
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

  const isFormValid =
    userInfo.name.trim() &&
    userInfo.phone.trim() &&
    Object.keys(errors).length === 0;

  return (
    <div className={`bg-white rounded-lg ${className}`}>
      <div className="p-6 border-b border-tactical-grey-300">
        <h3 className="text-lg font-semibold text-tactical-grey-800">
          Your Contact Information
        </h3>
        <p className="text-sm text-tactical-grey-500 mt-1">
          This information will be used to properly identify your messages in
          the import.
        </p>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
              Your Name *
            </label>
            <input
              type="text"
              value={userInfo.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500 transition-colors ${
                errors.name
                  ? "border-red-300 bg-red-50"
                  : "border-tactical-grey-400 bg-white"
              }`}
              placeholder="Evangelo P. Sommer"
              autoComplete="name"
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
              Your Phone Number *
            </label>
            <input
              type="tel"
              value={userInfo.phone}
              onChange={handlePhoneChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500 transition-colors ${
                errors.phone
                  ? "border-red-300 bg-red-50"
                  : "border-tactical-grey-400 bg-white"
              }`}
              placeholder="(647) 327-8401"
              autoComplete="tel"
            />
            {errors.phone && (
              <p className="text-sm text-red-600 mt-1">{errors.phone}</p>
            )}
            <p className="text-xs text-tactical-grey-500 mt-1">
              Format: (123) 456-7890 or 1234567890
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
              Your Email (Optional)
            </label>
            <input
              type="email"
              value={userInfo.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500 transition-colors ${
                errors.email
                  ? "border-red-300 bg-red-50"
                  : "border-tactical-grey-400 bg-white"
              }`}
              placeholder="evangelo@company.com"
              autoComplete="email"
            />
            {errors.email && (
              <p className="text-sm text-red-600 mt-1">{errors.email}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-tactical-grey-600 border border-tactical-grey-400 rounded-lg hover:bg-tactical-grey-100 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isFormValid}
            className={`px-6 py-2 rounded-lg transition-colors ${
              isFormValid
                ? "bg-tactical-gold text-white hover:bg-tactical-gold-dark"
                : "bg-gray-300 text-tactical-grey-500 cursor-not-allowed"
            }`}
          >
            Continue with Import
          </button>
        </div>
      </div>

      <div className="px-6 pb-4">
        <div className="bg-tactical-gold-muted border border-tactical-grey-300 rounded-lg p-3">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-tactical-gold-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-tactical-brown-dark">
                Why do we need this?
              </h4>
              <p className="text-sm text-tactical-brown-dark mt-1">
                Excel message exports often don&apos;t include your contact
                information for outgoing messages. We use this to properly
                identify which messages are from you vs. your client.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
