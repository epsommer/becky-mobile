/**
 * File Upload Service for React Native
 * Provides file upload functionality with progress tracking and validation
 */

import * as FileSystem from 'expo-file-system';
import { Platform, Alert } from 'react-native';
import { apiClient } from '../lib/api/client';
import { FileInfo } from '../components/forms/FileUploader';

// ============================================================================
// Types
// ============================================================================

export interface UploadOptions {
  /** Target endpoint for upload */
  endpoint?: string;
  /** Associated client ID */
  clientId?: string;
  /** Associated conversation ID */
  conversationId?: string;
  /** File category/type */
  category?: 'conversation' | 'client' | 'receipt' | 'general';
  /** Custom headers */
  headers?: Record<string, string>;
  /** Progress callback */
  onProgress?: (progress: number) => void;
}

export interface UploadResult {
  success: boolean;
  fileId?: string;
  url?: string;
  error?: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  category?: string;
  clientId?: string;
  conversationId?: string;
}

export interface UploadProgress {
  fileId: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const DEFAULT_UPLOAD_ENDPOINT = '/api/files/upload';
const DEFAULT_CHUNK_SIZE = 1024 * 1024; // 1MB chunks for large files

const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Text
  'text/plain',
  'text/csv',
  'text/html',
  // Archives
  'application/zip',
  'application/x-rar-compressed',
];

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validate file before upload
 */
export function validateFile(
  file: { name: string; size: number; mimeType: string },
  options?: { maxSize?: number; allowedTypes?: string[] }
): { valid: boolean; error?: string } {
  const maxSize = options?.maxSize || DEFAULT_MAX_FILE_SIZE;
  const allowedTypes = options?.allowedTypes || ALLOWED_MIME_TYPES;

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size (${formatFileSize(file.size)}) exceeds the maximum allowed size (${formatFileSize(maxSize)})`,
    };
  }

  // Check MIME type
  const isAllowed = allowedTypes.some((type) => {
    if (type.endsWith('/*')) {
      return file.mimeType.startsWith(type.replace('/*', '/'));
    }
    return file.mimeType === type;
  });

  if (!isAllowed) {
    return {
      valid: false,
      error: `File type "${file.mimeType}" is not allowed`,
    };
  }

  return { valid: true };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get file extension from name
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
}

/**
 * Generate a unique filename
 */
export function generateUniqueFilename(originalName: string): string {
  const ext = getFileExtension(originalName);
  const baseName = originalName.replace(`.${ext}`, '');
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${baseName}_${timestamp}_${random}.${ext}`;
}

// ============================================================================
// File Upload Service Class
// ============================================================================

class FileUploadService {
  private uploadQueue: Map<string, AbortController> = new Map();

  /**
   * Upload a single file
   */
  async uploadFile(file: FileInfo, options: UploadOptions = {}): Promise<UploadResult> {
    const {
      endpoint = DEFAULT_UPLOAD_ENDPOINT,
      clientId,
      conversationId,
      category = 'general',
      headers = {},
      onProgress,
    } = options;

    // Validate file
    const validation = validateFile({
      name: file.name,
      size: file.size,
      mimeType: file.mimeType,
    });

    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Create abort controller for cancellation
    const abortController = new AbortController();
    this.uploadQueue.set(file.id, abortController);

    try {
      // Read file as base64 for upload
      const fileContent = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Simulate progress updates for now
      // In a real implementation, this would use XMLHttpRequest for actual progress
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress = Math.min(progress + 10, 90);
        onProgress?.(progress);
      }, 100);

      // Prepare upload data
      const uploadData = {
        file: {
          name: file.name,
          mimeType: file.mimeType,
          size: file.size,
          content: fileContent, // Base64 encoded
        },
        metadata: {
          clientId,
          conversationId,
          category,
          uploadedAt: new Date().toISOString(),
        },
      };

      // Make upload request
      const response = await apiClient.post<{ fileId: string; url: string }>(
        endpoint,
        uploadData,
        {
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          timeout: 120000, // 2 minute timeout for large files
        }
      );

      clearInterval(progressInterval);
      onProgress?.(100);

      if (response.success && response.data) {
        return {
          success: true,
          fileId: response.data.fileId,
          url: response.data.url,
        };
      }

      return {
        success: false,
        error: 'Upload failed - no file ID returned',
      };
    } catch (error) {
      console.error('[FileUploadService] Upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    } finally {
      this.uploadQueue.delete(file.id);
    }
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(
    files: FileInfo[],
    options: UploadOptions = {}
  ): Promise<Map<string, UploadResult>> {
    const results = new Map<string, UploadResult>();

    for (const file of files) {
      const result = await this.uploadFile(file, {
        ...options,
        onProgress: (progress) => {
          // Could track individual file progress here
        },
      });
      results.set(file.id, result);
    }

    return results;
  }

  /**
   * Cancel an upload
   */
  cancelUpload(fileId: string): boolean {
    const controller = this.uploadQueue.get(fileId);
    if (controller) {
      controller.abort();
      this.uploadQueue.delete(fileId);
      return true;
    }
    return false;
  }

  /**
   * Cancel all pending uploads
   */
  cancelAllUploads(): void {
    for (const [fileId, controller] of this.uploadQueue) {
      controller.abort();
    }
    this.uploadQueue.clear();
  }

  /**
   * Get list of uploaded files for a conversation
   */
  async getConversationFiles(conversationId: string): Promise<UploadedFile[]> {
    try {
      const response = await apiClient.get<UploadedFile[]>(
        `/api/conversations/${conversationId}/files`
      );

      if (response.success && Array.isArray(response.data)) {
        return response.data;
      }

      return [];
    } catch (error) {
      console.error('[FileUploadService] Error fetching files:', error);
      return [];
    }
  }

  /**
   * Get list of uploaded files for a client
   */
  async getClientFiles(clientId: string): Promise<UploadedFile[]> {
    try {
      const response = await apiClient.get<UploadedFile[]>(
        `/api/clients/${clientId}/files`
      );

      if (response.success && Array.isArray(response.data)) {
        return response.data;
      }

      return [];
    } catch (error) {
      console.error('[FileUploadService] Error fetching client files:', error);
      return [];
    }
  }

  /**
   * Delete an uploaded file
   */
  async deleteFile(fileId: string): Promise<boolean> {
    try {
      const response = await apiClient.delete(`/api/files/${fileId}`);
      return response.success;
    } catch (error) {
      console.error('[FileUploadService] Error deleting file:', error);
      return false;
    }
  }

  /**
   * Download a file to local storage
   */
  async downloadFile(
    fileUrl: string,
    fileName: string
  ): Promise<{ success: boolean; localUri?: string; error?: string }> {
    try {
      const localUri = `${FileSystem.documentDirectory}${fileName}`;

      const downloadResult = await FileSystem.downloadAsync(fileUrl, localUri);

      if (downloadResult.status === 200) {
        return { success: true, localUri: downloadResult.uri };
      }

      return { success: false, error: 'Download failed' };
    } catch (error) {
      console.error('[FileUploadService] Download error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Download failed',
      };
    }
  }
}

// ============================================================================
// Hook for File Upload Operations
// ============================================================================

import React, { useState, useCallback } from 'react';

export interface UseFileUploadResult {
  uploading: boolean;
  uploadProgress: Map<string, number>;
  uploadFile: (file: FileInfo, options?: UploadOptions) => Promise<UploadResult>;
  uploadFiles: (files: FileInfo[], options?: UploadOptions) => Promise<Map<string, UploadResult>>;
  cancelUpload: (fileId: string) => void;
  cancelAllUploads: () => void;
  getConversationFiles: (conversationId: string) => Promise<UploadedFile[]>;
  getClientFiles: (clientId: string) => Promise<UploadedFile[]>;
  deleteFile: (fileId: string) => Promise<boolean>;
  downloadFile: (url: string, fileName: string) => Promise<{ success: boolean; localUri?: string }>;
}

export function useFileUpload(): UseFileUploadResult {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Map<string, number>>(new Map());

  const service = React.useMemo(() => new FileUploadService(), []);

  const handleUploadFile = useCallback(
    async (file: FileInfo, options?: UploadOptions): Promise<UploadResult> => {
      setUploading(true);
      setUploadProgress((prev) => new Map(prev).set(file.id, 0));

      try {
        const result = await service.uploadFile(file, {
          ...options,
          onProgress: (progress) => {
            setUploadProgress((prev) => new Map(prev).set(file.id, progress));
            options?.onProgress?.(progress);
          },
        });

        return result;
      } finally {
        setUploading(false);
        setUploadProgress((prev) => {
          const next = new Map(prev);
          next.delete(file.id);
          return next;
        });
      }
    },
    [service]
  );

  const handleUploadFiles = useCallback(
    async (files: FileInfo[], options?: UploadOptions): Promise<Map<string, UploadResult>> => {
      setUploading(true);
      const results = new Map<string, UploadResult>();

      for (const file of files) {
        const result = await handleUploadFile(file, options);
        results.set(file.id, result);
      }

      setUploading(false);
      return results;
    },
    [handleUploadFile]
  );

  const handleCancelUpload = useCallback(
    (fileId: string) => {
      service.cancelUpload(fileId);
      setUploadProgress((prev) => {
        const next = new Map(prev);
        next.delete(fileId);
        return next;
      });
    },
    [service]
  );

  const handleCancelAllUploads = useCallback(() => {
    service.cancelAllUploads();
    setUploadProgress(new Map());
  }, [service]);

  return {
    uploading,
    uploadProgress,
    uploadFile: handleUploadFile,
    uploadFiles: handleUploadFiles,
    cancelUpload: handleCancelUpload,
    cancelAllUploads: handleCancelAllUploads,
    getConversationFiles: service.getConversationFiles.bind(service),
    getClientFiles: service.getClientFiles.bind(service),
    deleteFile: service.deleteFile.bind(service),
    downloadFile: service.downloadFile.bind(service),
  };
}

// ============================================================================
// Exports
// ============================================================================

export const fileUploadService = new FileUploadService();

export default {
  validateFile,
  formatFileSize,
  getFileExtension,
  generateUniqueFilename,
  fileUploadService,
  useFileUpload,
};
