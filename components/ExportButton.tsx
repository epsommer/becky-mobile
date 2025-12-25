/**
 * ExportButton Component
 * Reusable export button with format selection and progress indicator
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeTokens, useTheme } from '../theme/ThemeContext';

// ============================================================================
// Types
// ============================================================================

export type ExportFormat = 'csv' | 'pdf';

export interface ExportButtonProps {
  /** Label for the button */
  label?: string;
  /** Available export formats */
  formats?: ExportFormat[];
  /** Callback when export is requested */
  onExport: (format: ExportFormat) => Promise<void>;
  /** Whether an export is in progress */
  loading?: boolean;
  /** Button style variant */
  variant?: 'primary' | 'secondary' | 'icon';
  /** Button size */
  size?: 'small' | 'medium' | 'large';
  /** Disabled state */
  disabled?: boolean;
  /** Custom icon name */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Show format selector modal or export directly with first format */
  showFormatSelector?: boolean;
}

// ============================================================================
// ExportButton Component
// ============================================================================

export function ExportButton({
  label = 'Export',
  formats = ['csv', 'pdf'],
  onExport,
  loading = false,
  variant = 'secondary',
  size = 'medium',
  disabled = false,
  icon = 'download-outline',
  showFormatSelector = true,
}: ExportButtonProps) {
  const { tokens } = useTheme();
  const styles = createStyles(tokens, variant, size);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>(null);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  const handlePress = () => {
    if (disabled || loading) return;

    if (showFormatSelector && formats.length > 1) {
      setModalVisible(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      // Export directly with first format
      handleExport(formats[0]);
    }
  };

  const handleExport = async (format: ExportFormat) => {
    setSelectedFormat(format);
    setModalVisible(false);
    try {
      await onExport(format);
    } finally {
      setSelectedFormat(null);
    }
  };

  const closeModal = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
    });
  };

  const getFormatIcon = (format: ExportFormat): keyof typeof Ionicons.glyphMap => {
    switch (format) {
      case 'csv':
        return 'document-text-outline';
      case 'pdf':
        return 'document-outline';
      default:
        return 'document-outline';
    }
  };

  const getFormatLabel = (format: ExportFormat): string => {
    switch (format) {
      case 'csv':
        return 'Export as CSV';
      case 'pdf':
        return 'Export as PDF';
    }
  };

  const getFormatDescription = (format: ExportFormat): string => {
    switch (format) {
      case 'csv':
        return 'Spreadsheet format for Excel, Numbers, etc.';
      case 'pdf':
        return 'Portable document for printing & sharing';
    }
  };

  const isLoading = loading || selectedFormat !== null;

  // Icon-only variant
  if (variant === 'icon') {
    return (
      <>
        <TouchableOpacity
          style={[styles.iconButton, disabled && styles.disabled]}
          onPress={handlePress}
          disabled={disabled || isLoading}
          activeOpacity={0.7}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={tokens.accent} />
          ) : (
            <Ionicons name={icon} size={size === 'small' ? 18 : size === 'large' ? 26 : 22} color={tokens.accent} />
          )}
        </TouchableOpacity>

        <FormatSelectorModal
          visible={modalVisible}
          formats={formats}
          onSelect={handleExport}
          onClose={closeModal}
          tokens={tokens}
          fadeAnim={fadeAnim}
          getFormatIcon={getFormatIcon}
          getFormatLabel={getFormatLabel}
          getFormatDescription={getFormatDescription}
        />
      </>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.button, disabled && styles.disabled]}
        onPress={handlePress}
        disabled={disabled || isLoading}
        activeOpacity={0.7}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={variant === 'primary' ? tokens.background : tokens.accent} />
        ) : (
          <>
            <Ionicons
              name={icon}
              size={size === 'small' ? 14 : size === 'large' ? 20 : 16}
              color={variant === 'primary' ? tokens.background : tokens.accent}
            />
            <Text style={styles.buttonText}>{label}</Text>
          </>
        )}
      </TouchableOpacity>

      <FormatSelectorModal
        visible={modalVisible}
        formats={formats}
        onSelect={handleExport}
        onClose={closeModal}
        tokens={tokens}
        fadeAnim={fadeAnim}
        getFormatIcon={getFormatIcon}
        getFormatLabel={getFormatLabel}
        getFormatDescription={getFormatDescription}
      />
    </>
  );
}

// ============================================================================
// Format Selector Modal
// ============================================================================

interface FormatSelectorModalProps {
  visible: boolean;
  formats: ExportFormat[];
  onSelect: (format: ExportFormat) => void;
  onClose: () => void;
  tokens: ThemeTokens;
  fadeAnim: Animated.Value;
  getFormatIcon: (format: ExportFormat) => keyof typeof Ionicons.glyphMap;
  getFormatLabel: (format: ExportFormat) => string;
  getFormatDescription: (format: ExportFormat) => string;
}

function FormatSelectorModal({
  visible,
  formats,
  onSelect,
  onClose,
  tokens,
  fadeAnim,
  getFormatIcon,
  getFormatLabel,
  getFormatDescription,
}: FormatSelectorModalProps) {
  const modalStyles = createModalStyles(tokens);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable style={modalStyles.overlay} onPress={onClose}>
        <Animated.View style={[modalStyles.backdrop, { opacity: fadeAnim }]} />
        <Animated.View
          style={[
            modalStyles.container,
            {
              opacity: fadeAnim,
              transform: [
                {
                  scale: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.95, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Pressable>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>Export Format</Text>
              <TouchableOpacity onPress={onClose} style={modalStyles.closeButton}>
                <Ionicons name="close" size={24} color={tokens.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={modalStyles.content}>
              {formats.map((format, index) => (
                <TouchableOpacity
                  key={format}
                  style={[
                    modalStyles.formatOption,
                    index < formats.length - 1 && modalStyles.formatOptionBorder,
                  ]}
                  onPress={() => onSelect(format)}
                  activeOpacity={0.7}
                >
                  <View style={modalStyles.formatIconContainer}>
                    <Ionicons name={getFormatIcon(format)} size={24} color={tokens.accent} />
                  </View>
                  <View style={modalStyles.formatInfo}>
                    <Text style={modalStyles.formatLabel}>{getFormatLabel(format)}</Text>
                    <Text style={modalStyles.formatDescription}>{getFormatDescription(format)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={tokens.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={modalStyles.cancelButton} onPress={onClose}>
              <Text style={modalStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// ============================================================================
// Quick Export Menu (Alternative component for dropdown-style export)
// ============================================================================

export interface ExportMenuProps {
  formats?: ExportFormat[];
  onExport: (format: ExportFormat) => Promise<void>;
  loading?: boolean;
}

export function ExportMenu({ formats = ['csv', 'pdf'], onExport, loading }: ExportMenuProps) {
  const { tokens } = useTheme();
  const menuStyles = createMenuStyles(tokens);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>(null);

  const handleExport = async (format: ExportFormat) => {
    setSelectedFormat(format);
    try {
      await onExport(format);
    } finally {
      setSelectedFormat(null);
    }
  };

  const isLoading = loading || selectedFormat !== null;

  return (
    <View style={menuStyles.container}>
      <Text style={menuStyles.title}>Export Options</Text>
      <View style={menuStyles.options}>
        {formats.includes('csv') && (
          <TouchableOpacity
            style={menuStyles.option}
            onPress={() => handleExport('csv')}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            {selectedFormat === 'csv' ? (
              <ActivityIndicator size="small" color={tokens.accent} />
            ) : (
              <Ionicons name="document-text-outline" size={20} color={tokens.accent} />
            )}
            <Text style={menuStyles.optionText}>CSV</Text>
          </TouchableOpacity>
        )}
        {formats.includes('pdf') && (
          <TouchableOpacity
            style={menuStyles.option}
            onPress={() => handleExport('pdf')}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            {selectedFormat === 'pdf' ? (
              <ActivityIndicator size="small" color={tokens.accent} />
            ) : (
              <Ionicons name="document-outline" size={20} color={tokens.accent} />
            )}
            <Text style={menuStyles.optionText}>PDF</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const createStyles = (tokens: ThemeTokens, variant: string, size: string) =>
  StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: size === 'small' ? 6 : size === 'large' ? 14 : 10,
      paddingHorizontal: size === 'small' ? 12 : size === 'large' ? 24 : 16,
      borderRadius: 10,
      backgroundColor: variant === 'primary' ? tokens.accent : tokens.surface,
      borderWidth: variant === 'secondary' ? 1 : 0,
      borderColor: tokens.border,
    },
    buttonText: {
      fontSize: size === 'small' ? 12 : size === 'large' ? 16 : 14,
      fontWeight: '600',
      color: variant === 'primary' ? tokens.background : tokens.accent,
    },
    iconButton: {
      width: size === 'small' ? 36 : size === 'large' ? 52 : 44,
      height: size === 'small' ? 36 : size === 'large' ? 52 : 44,
      borderRadius: size === 'small' ? 18 : size === 'large' ? 26 : 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: tokens.surface,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    disabled: {
      opacity: 0.5,
    },
  });

const createModalStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    container: {
      width: '85%',
      maxWidth: 360,
      backgroundColor: tokens.background,
      borderRadius: 20,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 10,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: tokens.textPrimary,
    },
    closeButton: {
      padding: 4,
    },
    content: {
      paddingVertical: 8,
    },
    formatOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 20,
    },
    formatOptionBorder: {
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    formatIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: `${tokens.accent}15`,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    formatInfo: {
      flex: 1,
    },
    formatLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: tokens.textPrimary,
      marginBottom: 2,
    },
    formatDescription: {
      fontSize: 12,
      color: tokens.textSecondary,
    },
    cancelButton: {
      paddingVertical: 16,
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: tokens.border,
      backgroundColor: tokens.surface,
    },
    cancelText: {
      fontSize: 15,
      fontWeight: '600',
      color: tokens.textSecondary,
    },
  });

const createMenuStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    container: {
      backgroundColor: tokens.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: tokens.border,
      padding: 16,
    },
    title: {
      fontSize: 12,
      fontWeight: '600',
      color: tokens.textSecondary,
      textTransform: 'uppercase',
      marginBottom: 12,
      letterSpacing: 0.5,
    },
    options: {
      flexDirection: 'row',
      gap: 12,
    },
    option: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: tokens.background,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    optionText: {
      fontSize: 14,
      fontWeight: '600',
      color: tokens.textPrimary,
    },
  });

export default ExportButton;
