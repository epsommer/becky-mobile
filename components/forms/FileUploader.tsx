/**
 * FileUploader Component
 * Mobile-friendly file and image picker with neomorphic design
 *
 * Features:
 * - Document picker integration
 * - Image picker integration
 * - Camera capture option
 * - File type validation
 * - Size limits
 * - Upload progress indicator
 * - File preview and management
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Shadow } from 'react-native-shadow-2';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useTheme, ThemeTokens } from '../../theme/ThemeContext';

// ============================================================================
// Types
// ============================================================================

export interface FileInfo {
  /** Unique identifier */
  id: string;
  /** File name */
  name: string;
  /** File URI (local) */
  uri: string;
  /** File size in bytes */
  size: number;
  /** MIME type */
  mimeType: string;
  /** File type category */
  type: 'image' | 'document' | 'video' | 'audio' | 'other';
  /** Upload progress (0-100) */
  progress?: number;
  /** Upload status */
  status: 'pending' | 'uploading' | 'completed' | 'error';
  /** Error message if failed */
  error?: string;
  /** Remote URL after upload */
  remoteUrl?: string;
}

export interface FileUploaderProps {
  /** Currently attached files */
  files: FileInfo[];
  /** Files changed handler */
  onFilesChange: (files: FileInfo[]) => void;
  /** File uploaded successfully handler */
  onFileUploaded?: (file: FileInfo) => void;
  /** Maximum number of files */
  maxFiles?: number;
  /** Maximum file size in bytes (default 25MB) */
  maxFileSize?: number;
  /** Accepted file types (MIME types) */
  acceptedTypes?: string[];
  /** Show camera option */
  showCamera?: boolean;
  /** Show document picker */
  showDocuments?: boolean;
  /** Show image picker */
  showImages?: boolean;
  /** Upload handler - if provided, files will be uploaded */
  onUpload?: (file: FileInfo) => Promise<string>;
  /** Custom container style */
  style?: StyleProp<ViewStyle>;
  /** Disabled state */
  disabled?: boolean;
  /** Compact mode (single row) */
  compact?: boolean;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Generate unique ID
 */
function generateId(): string {
  return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get file type category from MIME type
 */
function getFileType(mimeType: string): FileInfo['type'] {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('document') ||
    mimeType.includes('text') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('presentation')
  ) {
    return 'document';
  }
  return 'other';
}

/**
 * Get icon for file type
 */
function getFileIcon(type: FileInfo['type']): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'image':
      return 'image-outline';
    case 'video':
      return 'videocam-outline';
    case 'audio':
      return 'musical-notes-outline';
    case 'document':
      return 'document-text-outline';
    default:
      return 'document-outline';
  }
}

/**
 * Default accepted types
 */
const DEFAULT_ACCEPTED_TYPES = [
  'image/*',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

// ============================================================================
// File Item Component
// ============================================================================

interface FileItemProps {
  file: FileInfo;
  onRemove: (id: string) => void;
  onRetry?: (id: string) => void;
  tokens: ThemeTokens;
  compact?: boolean;
}

function FileItem({ file, onRemove, onRetry, tokens, compact }: FileItemProps) {
  const isImage = file.type === 'image';
  const isUploading = file.status === 'uploading';
  const hasError = file.status === 'error';
  const isCompleted = file.status === 'completed';

  return (
    <View
      style={[
        styles.fileItem,
        {
          backgroundColor: tokens.background,
          borderColor: hasError ? '#ef4444' : tokens.border,
        },
        compact && styles.fileItemCompact,
      ]}
    >
      {/* Preview / Icon */}
      {isImage && file.uri ? (
        <Image source={{ uri: file.uri }} style={styles.filePreview} />
      ) : (
        <View style={[styles.fileIconContainer, { backgroundColor: tokens.surface }]}>
          <Ionicons name={getFileIcon(file.type)} size={24} color={tokens.accent} />
        </View>
      )}

      {/* File Info */}
      <View style={styles.fileInfo}>
        <Text style={[styles.fileName, { color: tokens.textPrimary }]} numberOfLines={1}>
          {file.name}
        </Text>
        <View style={styles.fileDetails}>
          <Text style={[styles.fileSize, { color: tokens.textSecondary }]}>
            {formatFileSize(file.size)}
          </Text>
          {isCompleted && (
            <View style={styles.statusBadge}>
              <Ionicons name="checkmark-circle" size={12} color="#22c55e" />
            </View>
          )}
          {hasError && (
            <View style={styles.statusBadge}>
              <Ionicons name="alert-circle" size={12} color="#ef4444" />
            </View>
          )}
        </View>

        {/* Progress Bar */}
        {isUploading && file.progress !== undefined && (
          <View style={[styles.progressBar, { backgroundColor: tokens.border }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: tokens.accent, width: `${file.progress}%` },
              ]}
            />
          </View>
        )}

        {/* Error Message */}
        {hasError && file.error && (
          <Text style={styles.errorText} numberOfLines={1}>
            {file.error}
          </Text>
        )}
      </View>

      {/* Actions */}
      <View style={styles.fileActions}>
        {isUploading && <ActivityIndicator size="small" color={tokens.accent} />}
        {hasError && onRetry && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: tokens.surface }]}
            onPress={() => onRetry(file.id)}
          >
            <Ionicons name="refresh" size={16} color={tokens.accent} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: tokens.surface }]}
          onPress={() => onRemove(file.id)}
        >
          <Ionicons name="close" size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function FileUploader({
  files,
  onFilesChange,
  onFileUploaded,
  maxFiles = 10,
  maxFileSize = 25 * 1024 * 1024, // 25MB
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  showCamera = true,
  showDocuments = true,
  showImages = true,
  onUpload,
  style,
  disabled = false,
  compact = false,
}: FileUploaderProps) {
  const { tokens } = useTheme();
  const [isPickerLoading, setIsPickerLoading] = useState(false);

  const canAddMore = files.length < maxFiles;
  const hasFiles = files.length > 0;

  /**
   * Request camera permissions
   */
  const requestCameraPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Camera access is needed to take photos. Please enable it in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return false;
    }
    return true;
  }, []);

  /**
   * Request media library permissions
   */
  const requestMediaPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Media library access is needed to select photos. Please enable it in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return false;
    }
    return true;
  }, []);

  /**
   * Validate file before adding
   */
  const validateFile = useCallback(
    (name: string, size: number | undefined, mimeType: string | undefined): string | null => {
      if (files.length >= maxFiles) {
        return `Maximum ${maxFiles} files allowed`;
      }

      if (size && size > maxFileSize) {
        return `File size exceeds ${formatFileSize(maxFileSize)} limit`;
      }

      // Check for duplicates
      if (files.some((f) => f.name === name)) {
        return 'File already added';
      }

      return null;
    },
    [files, maxFiles, maxFileSize]
  );

  /**
   * Add file to the list
   */
  const addFile = useCallback(
    async (fileData: {
      uri: string;
      name: string;
      size?: number;
      mimeType?: string;
    }) => {
      const { uri, name, mimeType = 'application/octet-stream' } = fileData;

      // Get file info if size not provided
      let size = fileData.size;
      if (!size) {
        try {
          const info = await FileSystem.getInfoAsync(uri);
          size = info.exists ? (info as any).size : 0;
        } catch {
          size = 0;
        }
      }

      // Validate
      const error = validateFile(name, size, mimeType);
      if (error) {
        Alert.alert('Cannot Add File', error);
        return;
      }

      const newFile: FileInfo = {
        id: generateId(),
        name,
        uri,
        size: size || 0,
        mimeType,
        type: getFileType(mimeType),
        status: onUpload ? 'pending' : 'completed',
      };

      const updatedFiles = [...files, newFile];
      onFilesChange(updatedFiles);

      // Auto-upload if handler provided
      if (onUpload) {
        uploadFile(newFile, updatedFiles);
      }
    },
    [files, validateFile, onFilesChange, onUpload]
  );

  /**
   * Upload a file
   */
  const uploadFile = useCallback(
    async (file: FileInfo, currentFiles: FileInfo[]) => {
      if (!onUpload) return;

      // Update status to uploading
      const updateProgress = (progress: number) => {
        const updated = currentFiles.map((f) =>
          f.id === file.id ? { ...f, status: 'uploading' as const, progress } : f
        );
        onFilesChange(updated);
      };

      updateProgress(0);

      try {
        // Simulate progress updates
        const progressInterval = setInterval(() => {
          updateProgress(Math.min((file.progress || 0) + 10, 90));
        }, 200);

        const remoteUrl = await onUpload(file);

        clearInterval(progressInterval);

        // Update to completed
        const completed = currentFiles.map((f) =>
          f.id === file.id
            ? { ...f, status: 'completed' as const, progress: 100, remoteUrl }
            : f
        );
        onFilesChange(completed);
        onFileUploaded?.({ ...file, status: 'completed', progress: 100, remoteUrl });
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Upload failed';
        const failed = currentFiles.map((f) =>
          f.id === file.id ? { ...f, status: 'error' as const, error } : f
        );
        onFilesChange(failed);
      }
    },
    [onUpload, onFilesChange, onFileUploaded]
  );

  /**
   * Pick document from device
   */
  const pickDocument = useCallback(async () => {
    if (disabled || !canAddMore) return;

    setIsPickerLoading(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: acceptedTypes,
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        await addFile({
          uri: asset.uri,
          name: asset.name,
          size: asset.size,
          mimeType: asset.mimeType,
        });
      }
    } catch (err) {
      console.error('[FileUploader] Document picker error:', err);
      Alert.alert('Error', 'Failed to pick document');
    } finally {
      setIsPickerLoading(false);
    }
  }, [disabled, canAddMore, acceptedTypes, addFile]);

  /**
   * Pick image from library
   */
  const pickImage = useCallback(async () => {
    if (disabled || !canAddMore) return;

    const hasPermission = await requestMediaPermission();
    if (!hasPermission) return;

    setIsPickerLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        const name = asset.uri.split('/').pop() || 'image.jpg';
        await addFile({
          uri: asset.uri,
          name,
          size: asset.fileSize,
          mimeType: asset.mimeType || 'image/jpeg',
        });
      }
    } catch (err) {
      console.error('[FileUploader] Image picker error:', err);
      Alert.alert('Error', 'Failed to pick image');
    } finally {
      setIsPickerLoading(false);
    }
  }, [disabled, canAddMore, requestMediaPermission, addFile]);

  /**
   * Take photo with camera
   */
  const takePhoto = useCallback(async () => {
    if (disabled || !canAddMore) return;

    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    setIsPickerLoading(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        const name = `photo_${Date.now()}.jpg`;
        await addFile({
          uri: asset.uri,
          name,
          size: asset.fileSize,
          mimeType: asset.mimeType || 'image/jpeg',
        });
      }
    } catch (err) {
      console.error('[FileUploader] Camera error:', err);
      Alert.alert('Error', 'Failed to take photo');
    } finally {
      setIsPickerLoading(false);
    }
  }, [disabled, canAddMore, requestCameraPermission, addFile]);

  /**
   * Remove file
   */
  const removeFile = useCallback(
    (id: string) => {
      const updated = files.filter((f) => f.id !== id);
      onFilesChange(updated);
    },
    [files, onFilesChange]
  );

  /**
   * Retry failed upload
   */
  const retryUpload = useCallback(
    (id: string) => {
      const file = files.find((f) => f.id === id);
      if (file && onUpload) {
        uploadFile({ ...file, status: 'pending', error: undefined }, files);
      }
    },
    [files, onUpload, uploadFile]
  );

  return (
    <View style={[styles.container, style]}>
      <Shadow
        startColor={tokens.shadowDark}
        finalColor={tokens.surface}
        offset={[4, 4]}
        distance={10}
        style={{ borderRadius: 12, width: '100%' }}
      >
        <Shadow
          startColor={tokens.shadowLight}
          finalColor={tokens.surface}
          offset={[-4, -4]}
          distance={10}
          style={{ borderRadius: 12, width: '100%' }}
        >
          <View style={[styles.uploaderContainer, { backgroundColor: tokens.surface }]}>
            {/* Picker Buttons */}
            <View style={styles.pickerButtons}>
              {showDocuments && (
                <TouchableOpacity
                  style={[
                    styles.pickerButton,
                    { backgroundColor: tokens.background, borderColor: tokens.border },
                    (!canAddMore || disabled) && styles.pickerButtonDisabled,
                  ]}
                  onPress={pickDocument}
                  disabled={!canAddMore || disabled || isPickerLoading}
                >
                  <Ionicons
                    name="document-outline"
                    size={24}
                    color={canAddMore && !disabled ? tokens.accent : tokens.textSecondary}
                  />
                  <Text
                    style={[
                      styles.pickerButtonText,
                      {
                        color: canAddMore && !disabled ? tokens.textPrimary : tokens.textSecondary,
                      },
                    ]}
                  >
                    Document
                  </Text>
                </TouchableOpacity>
              )}

              {showImages && (
                <TouchableOpacity
                  style={[
                    styles.pickerButton,
                    { backgroundColor: tokens.background, borderColor: tokens.border },
                    (!canAddMore || disabled) && styles.pickerButtonDisabled,
                  ]}
                  onPress={pickImage}
                  disabled={!canAddMore || disabled || isPickerLoading}
                >
                  <Ionicons
                    name="image-outline"
                    size={24}
                    color={canAddMore && !disabled ? tokens.accent : tokens.textSecondary}
                  />
                  <Text
                    style={[
                      styles.pickerButtonText,
                      {
                        color: canAddMore && !disabled ? tokens.textPrimary : tokens.textSecondary,
                      },
                    ]}
                  >
                    Photo
                  </Text>
                </TouchableOpacity>
              )}

              {showCamera && (
                <TouchableOpacity
                  style={[
                    styles.pickerButton,
                    { backgroundColor: tokens.background, borderColor: tokens.border },
                    (!canAddMore || disabled) && styles.pickerButtonDisabled,
                  ]}
                  onPress={takePhoto}
                  disabled={!canAddMore || disabled || isPickerLoading}
                >
                  <Ionicons
                    name="camera-outline"
                    size={24}
                    color={canAddMore && !disabled ? tokens.accent : tokens.textSecondary}
                  />
                  <Text
                    style={[
                      styles.pickerButtonText,
                      {
                        color: canAddMore && !disabled ? tokens.textPrimary : tokens.textSecondary,
                      },
                    ]}
                  >
                    Camera
                  </Text>
                </TouchableOpacity>
              )}

              {isPickerLoading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="small" color={tokens.accent} />
                </View>
              )}
            </View>

            {/* File List */}
            {hasFiles && (
              <ScrollView
                style={styles.fileList}
                horizontal={compact}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
              >
                {files.map((file) => (
                  <FileItem
                    key={file.id}
                    file={file}
                    onRemove={removeFile}
                    onRetry={onUpload ? retryUpload : undefined}
                    tokens={tokens}
                    compact={compact}
                  />
                ))}
              </ScrollView>
            )}

            {/* Footer */}
            <View style={[styles.footer, { borderTopColor: tokens.border }]}>
              <Text style={[styles.footerText, { color: tokens.textSecondary }]}>
                {files.length}/{maxFiles} files
                {maxFileSize && ` - Max ${formatFileSize(maxFileSize)} each`}
              </Text>
            </View>
          </View>
        </Shadow>
      </Shadow>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  uploaderContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    padding: 16,
  },
  pickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  pickerButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  pickerButtonDisabled: {
    opacity: 0.5,
  },
  pickerButtonText: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 12,
  },
  fileList: {
    marginTop: 16,
    maxHeight: 200,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  fileItemCompact: {
    width: 200,
    marginRight: 12,
    marginBottom: 0,
  },
  filePreview: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  fileIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
  },
  fileDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  fileSize: {
    fontSize: 11,
  },
  statusBadge: {
    marginLeft: 4,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  errorText: {
    fontSize: 10,
    color: '#ef4444',
    marginTop: 4,
  },
  fileActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 12,
  },
  footerText: {
    fontSize: 11,
    textAlign: 'center',
  },
});

// ============================================================================
// Exports
// ============================================================================

export { formatFileSize, getFileType, getFileIcon };
