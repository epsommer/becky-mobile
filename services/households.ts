/**
 * Household API Service
 *
 * Provides methods for managing households (grouped clients) in the Becky CRM mobile app.
 * Households allow grouping related clients (family members, business partners) for
 * better relationship management.
 *
 * @module services/households
 */

import { apiClient } from '../lib/api/client';
import { ApiResponse } from '../lib/api/types';

// ============================================================================
// Types
// ============================================================================

/**
 * Household account type
 */
export type HouseholdType = 'PERSONAL' | 'FAMILY' | 'BUSINESS' | 'ORGANIZATION';

/**
 * Relationship role within a household
 */
export type RelationshipRole =
  | 'Primary Client'
  | 'Spouse'
  | 'Partner'
  | 'Son'
  | 'Daughter'
  | 'Family Member'
  | 'Business Partner'
  | 'Employee'
  | 'Other';

/**
 * Address structure for household
 */
export interface HouseholdAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

/**
 * Household member summary (for list views)
 */
export interface HouseholdMemberSummary {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status?: string;
  isPrimaryContact: boolean;
  relationshipRole?: RelationshipRole | string;
}

/**
 * Household entity
 */
export interface Household {
  id: string;
  name: string;
  accountType: HouseholdType;
  address?: HouseholdAddress;
  primaryContactId?: string;
  primaryContact?: HouseholdMemberSummary;
  notes?: string;
  tags?: string[];
  billingPreferences?: {
    billToHousehold?: boolean;
    billingEmail?: string;
    billingAddress?: HouseholdAddress;
  };
  memberCount: number;
  members?: HouseholdMemberSummary[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Payload for creating a new household
 */
export interface CreateHouseholdData {
  name: string;
  accountType: HouseholdType;
  address?: HouseholdAddress;
  primaryContactId?: string;
  notes?: string;
  tags?: string[];
  billingPreferences?: {
    billToHousehold?: boolean;
    billingEmail?: string;
    billingAddress?: HouseholdAddress;
  };
}

/**
 * Payload for updating a household
 */
export interface UpdateHouseholdData {
  name?: string;
  accountType?: HouseholdType;
  address?: HouseholdAddress;
  primaryContactId?: string;
  notes?: string;
  tags?: string[];
  billingPreferences?: {
    billToHousehold?: boolean;
    billingEmail?: string;
    billingAddress?: HouseholdAddress;
  };
}

/**
 * Payload for adding a member to a household
 */
export interface AddMemberData {
  clientId: string;
  isPrimaryContact?: boolean;
  relationshipRole?: RelationshipRole | string;
}

/**
 * Payload for updating a member's role in a household
 */
export interface UpdateMemberData {
  isPrimaryContact?: boolean;
  relationshipRole?: RelationshipRole | string;
}

// ============================================================================
// API Methods
// ============================================================================

/**
 * Household API methods
 *
 * Provides type-safe methods for all household-related operations
 *
 * @example
 * ```typescript
 * import { householdsApi } from '@/services/households';
 *
 * // Get all households
 * const response = await householdsApi.getHouseholds();
 * if (response.success) {
 *   console.log(response.data); // Household[]
 * }
 *
 * // Get single household with members
 * const household = await householdsApi.getHousehold('household-123');
 * ```
 */
export const householdsApi = {
  /**
   * Get all households
   *
   * @returns List of households with member counts
   */
  getHouseholds: async (): Promise<ApiResponse<Household[]>> => {
    return apiClient.get<Household[]>('/api/households');
  },

  /**
   * Get single household by ID with full member details
   *
   * @param householdId - Household ID
   * @returns Household with members
   */
  getHousehold: async (householdId: string): Promise<ApiResponse<Household>> => {
    return apiClient.get<Household>(`/api/households/${householdId}`);
  },

  /**
   * Create new household
   *
   * @param data - Household data
   * @returns Created household
   */
  createHousehold: async (data: CreateHouseholdData): Promise<ApiResponse<Household>> => {
    return apiClient.post<Household>('/api/households', data);
  },

  /**
   * Update existing household
   *
   * @param householdId - Household ID
   * @param data - Updated household data
   * @returns Updated household
   */
  updateHousehold: async (
    householdId: string,
    data: UpdateHouseholdData
  ): Promise<ApiResponse<Household>> => {
    return apiClient.patch<Household>(`/api/households/${householdId}`, data);
  },

  /**
   * Delete household (ungroups all members)
   *
   * @param householdId - Household ID
   * @returns Success response
   */
  deleteHousehold: async (householdId: string): Promise<ApiResponse<void>> => {
    return apiClient.delete<void>(`/api/households/${householdId}`);
  },

  /**
   * Get all members of a household
   *
   * @param householdId - Household ID
   * @returns List of household members
   */
  getMembers: async (householdId: string): Promise<ApiResponse<HouseholdMemberSummary[]>> => {
    return apiClient.get<HouseholdMemberSummary[]>(`/api/households/${householdId}/members`);
  },

  /**
   * Add a client to a household
   *
   * @param householdId - Household ID
   * @param data - Member data including clientId and relationship role
   * @returns Updated household
   */
  addMember: async (
    householdId: string,
    data: AddMemberData
  ): Promise<ApiResponse<Household>> => {
    return apiClient.post<Household>(`/api/households/${householdId}/members`, data);
  },

  /**
   * Update a member's role/status in a household
   *
   * @param householdId - Household ID
   * @param clientId - Client ID of the member
   * @param data - Updated member data
   * @returns Updated household
   */
  updateMember: async (
    householdId: string,
    clientId: string,
    data: UpdateMemberData
  ): Promise<ApiResponse<Household>> => {
    return apiClient.patch<Household>(`/api/households/${householdId}/members/${clientId}`, data);
  },

  /**
   * Remove a client from a household
   *
   * @param householdId - Household ID
   * @param clientId - Client ID to remove
   * @returns Updated household
   */
  removeMember: async (
    householdId: string,
    clientId: string
  ): Promise<ApiResponse<Household>> => {
    return apiClient.delete<Household>(`/api/households/${householdId}/members/${clientId}`);
  },

  /**
   * Set the primary contact for a household
   *
   * @param householdId - Household ID
   * @param clientId - Client ID to set as primary
   * @returns Updated household
   */
  setPrimaryContact: async (
    householdId: string,
    clientId: string
  ): Promise<ApiResponse<Household>> => {
    return apiClient.patch<Household>(`/api/households/${householdId}/primary-contact`, {
      clientId,
    });
  },

  /**
   * Get household for a specific client
   *
   * @param clientId - Client ID
   * @returns Household the client belongs to (if any)
   */
  getClientHousehold: async (clientId: string): Promise<ApiResponse<Household | null>> => {
    return apiClient.get<Household | null>(`/api/clients/${clientId}/household`);
  },
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get display label for household type
 */
export function getHouseholdTypeLabel(type: HouseholdType): string {
  const labels: Record<HouseholdType, string> = {
    PERSONAL: 'Personal',
    FAMILY: 'Family',
    BUSINESS: 'Business',
    ORGANIZATION: 'Organization',
  };
  return labels[type] || type;
}

/**
 * Get icon name for household type
 */
export function getHouseholdTypeIcon(type: HouseholdType): string {
  const icons: Record<HouseholdType, string> = {
    PERSONAL: 'person',
    FAMILY: 'people',
    BUSINESS: 'business',
    ORGANIZATION: 'globe',
  };
  return icons[type] || 'home';
}

/**
 * Get available relationship roles
 */
export function getRelationshipRoles(): RelationshipRole[] {
  return [
    'Primary Client',
    'Spouse',
    'Partner',
    'Son',
    'Daughter',
    'Family Member',
    'Business Partner',
    'Employee',
    'Other',
  ];
}

/**
 * Format household address for display
 */
export function formatHouseholdAddress(address?: HouseholdAddress): string {
  if (!address) return 'No address';

  const parts = [
    address.street,
    address.city,
    address.state,
    address.zip,
    address.country,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : 'No address';
}

/**
 * Get household member count display text
 */
export function getMemberCountText(count: number): string {
  if (count === 0) return 'No members';
  if (count === 1) return '1 member';
  return `${count} members`;
}
