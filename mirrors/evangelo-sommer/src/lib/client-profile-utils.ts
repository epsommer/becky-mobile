import { Client } from "../types/client";

/**
 * Check if a client profile is incomplete (missing email OR phone)
 */
export function isClientProfileIncomplete(client: Client): boolean {
  const hasEmail = client.email && client.email.trim() !== "";
  const hasPhone = client.phone && client.phone.trim() !== "";
  
  // Profile is incomplete if BOTH email AND phone are missing
  return !hasEmail && !hasPhone;
}

/**
 * Get missing required fields for a client
 */
export function getMissingClientFields(client: Client): {
  email: boolean;
  phone: boolean;
} {
  return {
    email: !client.email || client.email.trim() === "",
    phone: !client.phone || client.phone.trim() === "",
  };
}

/**
 * Check if client has at least one contact method
 */
export function hasContactMethod(client: Client): boolean {
  const hasEmail = !!(client.email && client.email.trim() !== "");
  const hasPhone = !!(client.phone && client.phone.trim() !== "");
  
  return hasEmail || hasPhone;
}

/**
 * Get completion status message for client profile
 */
export function getProfileCompletionMessage(client: Client): string {
  const missing = getMissingClientFields(client);
  
  if (missing.email && missing.phone) {
    return "Email and phone number are required";
  } else if (missing.email) {
    return "Email address is missing";
  } else if (missing.phone) {
    return "Phone number is missing";
  }
  
  return "Profile is complete";
}

/**
 * Validate email format
 * Supports international domains including .ca, .co.uk, .com.au, etc.
 */
export function isValidEmail(email: string): boolean {
  // More comprehensive email regex that supports:
  // - International domains (.ca, .co.uk, .com.au, etc.)
  // - Subdomains
  // - Various TLD lengths (2-6 characters)
  // - Special characters in local part
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,6}$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate phone format
 */
export function isValidPhone(phone: string): boolean {
  const cleanPhone = phone.replace(/\D/g, "");
  return cleanPhone.length >= 10;
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
  
  if (match) {
    let formatted = "";
    if (match[1]) formatted += `(${match[1]}`;
    if (match[2]) formatted += `) ${match[2]}`;
    if (match[3]) formatted += `-${match[3]}`;
    return formatted;
  }
  
  return phone;
}

/**
 * Clean phone number for storage (remove formatting)
 */
export function cleanPhoneNumber(phone: string): string {
  return phone.replace(/\D/g, "");
}
