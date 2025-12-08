/**
 * Participants API endpoints
 * @module lib/api/endpoints/participants
 */

import { apiClient } from '../client';
import { ApiResponse } from '../types';

/**
 * Participant data structure
 */
export interface Participant {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  contactPreferences?: any;
  bixbyContactId?: string;
  googleContactId?: string;
  services?: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Data for creating a participant
 */
export interface CreateParticipantData {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  contactPreferences?: any;
  bixbyContactId?: string;
  googleContactId?: string;
}

/**
 * Query parameters for finding participants
 */
export interface FindParticipantQuery {
  phone?: string;
  email?: string;
  name?: string;
}

/**
 * Participants API methods
 */
export const participantsApi = {
  /**
   * Get all participants
   */
  getParticipants: async (): Promise<ApiResponse<Participant[]>> => {
    return apiClient.get<Participant[]>('/api/participants');
  },

  /**
   * Get single participant by ID
   */
  getParticipant: async (participantId: string): Promise<ApiResponse<Participant>> => {
    return apiClient.get<Participant>(`/api/participants/${participantId}`);
  },

  /**
   * Find participant by contact info (phone or email)
   */
  findByContact: async (query: FindParticipantQuery): Promise<ApiResponse<Participant>> => {
    return apiClient.get<Participant>('/api/participants/find', query);
  },

  /**
   * Create new participant
   */
  createParticipant: async (data: CreateParticipantData): Promise<ApiResponse<Participant>> => {
    return apiClient.post<Participant>('/api/participants', data);
  },

  /**
   * Update existing participant
   */
  updateParticipant: async (
    participantId: string,
    data: Partial<Participant>
  ): Promise<ApiResponse<Participant>> => {
    return apiClient.patch<Participant>(`/api/participants/${participantId}`, data);
  },

  /**
   * Link device contact to participant
   */
  linkContact: async (
    participantId: string,
    contactData: {
      deviceContactId: string;
      phone?: string;
      email?: string;
    }
  ): Promise<ApiResponse<Participant>> => {
    return apiClient.patch<Participant>(`/api/participants/${participantId}/link-contact`, contactData);
  },

  /**
   * Delete participant
   */
  deleteParticipant: async (participantId: string): Promise<ApiResponse<void>> => {
    return apiClient.delete<void>(`/api/participants/${participantId}`);
  },
};
