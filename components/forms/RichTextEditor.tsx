/**
 * RichTextEditor Component
 * Mobile-friendly rich text editor with neomorphic design
 *
 * Features:
 * - Bold, italic, underline formatting
 * - Bullet and numbered lists
 * - Headers (H1, H2)
 * - Links
 * - Mobile-friendly toolbar
 * - Markdown support for input/output
 */

import React, { useCallback, useMemo, useState, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
  TextStyle,
  StyleProp,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Shadow } from 'react-native-shadow-2';
import { useTheme, ThemeTokens } from '../../theme/ThemeContext';

// ============================================================================
// Types
// ============================================================================

export interface RichTextEditorProps {
  /** Current value (supports plain text or markdown) */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Read-only mode */
  readOnly?: boolean;
  /** Minimum height */
  minHeight?: number;
  /** Maximum height (enables scrolling) */
  maxHeight?: number;
  /** Custom container style */
  style?: StyleProp<ViewStyle>;
  /** Show toolbar */
  showToolbar?: boolean;
  /** Auto focus on mount */
  autoFocus?: boolean;
  /** On focus callback */
  onFocus?: () => void;
  /** On blur callback */
  onBlur?: () => void;
}

type FormatType = 'bold' | 'italic' | 'underline' | 'strikethrough' | 'h1' | 'h2' | 'bullet' | 'numbered' | 'link';

interface ToolbarButton {
  format: FormatType;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

// ============================================================================
// Markdown Utilities
// ============================================================================

/**
 * Apply markdown formatting to selected text
 */
function applyMarkdownFormat(
  text: string,
  selection: { start: number; end: number },
  format: FormatType
): { text: string; newSelection: { start: number; end: number } } {
  const before = text.substring(0, selection.start);
  const selected = text.substring(selection.start, selection.end);
  const after = text.substring(selection.end);

  let formatted: string;
  let newStart = selection.start;
  let newEnd = selection.end;

  switch (format) {
    case 'bold':
      formatted = `**${selected || 'bold text'}**`;
      newStart = selection.start + 2;
      newEnd = newStart + (selected || 'bold text').length;
      break;
    case 'italic':
      formatted = `*${selected || 'italic text'}*`;
      newStart = selection.start + 1;
      newEnd = newStart + (selected || 'italic text').length;
      break;
    case 'underline':
      formatted = `<u>${selected || 'underlined text'}</u>`;
      newStart = selection.start + 3;
      newEnd = newStart + (selected || 'underlined text').length;
      break;
    case 'strikethrough':
      formatted = `~~${selected || 'strikethrough text'}~~`;
      newStart = selection.start + 2;
      newEnd = newStart + (selected || 'strikethrough text').length;
      break;
    case 'h1':
      // Add heading at start of line
      formatted = `# ${selected || 'Heading'}`;
      newStart = selection.start + 2;
      newEnd = newStart + (selected || 'Heading').length;
      break;
    case 'h2':
      formatted = `## ${selected || 'Subheading'}`;
      newStart = selection.start + 3;
      newEnd = newStart + (selected || 'Subheading').length;
      break;
    case 'bullet':
      // Add bullet point
      formatted = `\n- ${selected || 'List item'}`;
      newStart = selection.start + 3;
      newEnd = newStart + (selected || 'List item').length;
      break;
    case 'numbered':
      // Add numbered list
      formatted = `\n1. ${selected || 'List item'}`;
      newStart = selection.start + 4;
      newEnd = newStart + (selected || 'List item').length;
      break;
    case 'link':
      // Link format [text](url)
      if (selected) {
        formatted = `[${selected}](url)`;
        newStart = selection.start + selected.length + 3;
        newEnd = newStart + 3;
      } else {
        formatted = '[link text](url)';
        newStart = selection.start + 1;
        newEnd = newStart + 9;
      }
      break;
    default:
      formatted = selected;
  }

  return {
    text: before + formatted + after,
    newSelection: { start: newStart, end: newEnd },
  };
}

/**
 * Convert markdown to plain text preview
 */
function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
    .replace(/\*(.*?)\*/g, '$1') // Italic
    .replace(/~~(.*?)~~/g, '$1') // Strikethrough
    .replace(/<u>(.*?)<\/u>/g, '$1') // Underline
    .replace(/^#{1,6}\s+/gm, '') // Headers
    .replace(/^\s*[-*+]\s+/gm, '') // Bullet points
    .replace(/^\s*\d+\.\s+/gm, '') // Numbered lists
    .replace(/\[(.*?)\]\(.*?\)/g, '$1'); // Links
}

// ============================================================================
// Toolbar Button Component
// ============================================================================

interface ToolbarButtonComponentProps {
  button: ToolbarButton;
  onPress: (format: FormatType) => void;
  tokens: ThemeTokens;
  disabled?: boolean;
}

function ToolbarButtonComponent({ button, onPress, tokens, disabled }: ToolbarButtonComponentProps) {
  return (
    <TouchableOpacity
      style={[
        styles.toolbarButton,
        { backgroundColor: tokens.surface, opacity: disabled ? 0.5 : 1 },
      ]}
      onPress={() => onPress(button.format)}
      disabled={disabled}
      accessibilityLabel={button.label}
      accessibilityRole="button"
    >
      <Ionicons name={button.icon} size={18} color={tokens.textPrimary} />
    </TouchableOpacity>
  );
}

// ============================================================================
// Link Modal Component
// ============================================================================

interface LinkModalProps {
  visible: boolean;
  onClose: () => void;
  onInsert: (text: string, url: string) => void;
  tokens: ThemeTokens;
  initialText?: string;
}

function LinkModal({ visible, onClose, onInsert, tokens, initialText = '' }: LinkModalProps) {
  const [linkText, setLinkText] = useState(initialText);
  const [linkUrl, setLinkUrl] = useState('');

  const handleInsert = () => {
    if (!linkText.trim() || !linkUrl.trim()) {
      Alert.alert('Error', 'Please enter both link text and URL');
      return;
    }
    onInsert(linkText, linkUrl);
    setLinkText('');
    setLinkUrl('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.modalContent, { backgroundColor: tokens.surface }]}>
          <Text style={[styles.modalTitle, { color: tokens.textPrimary }]}>Insert Link</Text>

          <TextInput
            style={[
              styles.modalInput,
              { backgroundColor: tokens.background, color: tokens.textPrimary, borderColor: tokens.border },
            ]}
            placeholder="Link text"
            placeholderTextColor={tokens.textSecondary}
            value={linkText}
            onChangeText={setLinkText}
          />

          <TextInput
            style={[
              styles.modalInput,
              { backgroundColor: tokens.background, color: tokens.textPrimary, borderColor: tokens.border },
            ]}
            placeholder="URL (https://...)"
            placeholderTextColor={tokens.textSecondary}
            value={linkUrl}
            onChangeText={setLinkUrl}
            autoCapitalize="none"
            keyboardType="url"
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, { borderColor: tokens.border }]}
              onPress={onClose}
            >
              <Text style={[styles.modalButtonText, { color: tokens.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: tokens.accent }]}
              onPress={handleInsert}
            >
              <Text style={[styles.modalButtonText, { color: tokens.textPrimary }]}>Insert</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================================
// Main Component
// ============================================================================

const TOOLBAR_BUTTONS: ToolbarButton[] = [
  { format: 'bold', icon: 'text', label: 'Bold' },
  { format: 'italic', icon: 'text-outline', label: 'Italic' },
  { format: 'underline', icon: 'remove-outline', label: 'Underline' },
  { format: 'h1', icon: 'text', label: 'Heading 1' },
  { format: 'h2', icon: 'text', label: 'Heading 2' },
  { format: 'bullet', icon: 'list', label: 'Bullet List' },
  { format: 'numbered', icon: 'list-outline', label: 'Numbered List' },
  { format: 'link', icon: 'link', label: 'Insert Link' },
];

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start typing...',
  readOnly = false,
  minHeight = 120,
  maxHeight = 300,
  style,
  showToolbar = true,
  autoFocus = false,
  onFocus,
  onBlur,
}: RichTextEditorProps) {
  const { tokens } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [isFocused, setIsFocused] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);

  const dynamicStyles = useMemo(() => createDynamicStyles(tokens, minHeight, maxHeight), [tokens, minHeight, maxHeight]);

  const handleFormat = useCallback((format: FormatType) => {
    if (readOnly) return;

    if (format === 'link') {
      setShowLinkModal(true);
      return;
    }

    const result = applyMarkdownFormat(value, selection, format);
    onChange(result.text);

    // Update selection after format is applied
    setTimeout(() => {
      inputRef.current?.setNativeProps({
        selection: result.newSelection,
      });
      setSelection(result.newSelection);
    }, 10);
  }, [value, selection, onChange, readOnly]);

  const handleInsertLink = useCallback((text: string, url: string) => {
    const before = value.substring(0, selection.start);
    const after = value.substring(selection.end);
    const link = `[${text}](${url})`;
    onChange(before + link + after);
  }, [value, selection, onChange]);

  const handleSelectionChange = useCallback((event: any) => {
    setSelection(event.nativeEvent.selection);
  }, []);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    onFocus?.();
  }, [onFocus]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    onBlur?.();
  }, [onBlur]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, style]}
    >
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
          <View style={[dynamicStyles.editorContainer, { backgroundColor: tokens.surface }]}>
            {/* Toolbar */}
            {showToolbar && !readOnly && (
              <View style={[dynamicStyles.toolbar, { borderBottomColor: tokens.border }]}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.toolbarContent}
                >
                  {TOOLBAR_BUTTONS.map((button) => (
                    <ToolbarButtonComponent
                      key={button.format}
                      button={button}
                      onPress={handleFormat}
                      tokens={tokens}
                      disabled={readOnly}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Editor */}
            <ScrollView
              style={dynamicStyles.editorScroll}
              contentContainerStyle={styles.editorContent}
              keyboardShouldPersistTaps="handled"
            >
              <TextInput
                ref={inputRef}
                style={[
                  dynamicStyles.textInput,
                  { color: tokens.textPrimary },
                  isFocused && { borderColor: tokens.accent, borderWidth: 2 },
                ]}
                value={value}
                onChangeText={onChange}
                placeholder={placeholder}
                placeholderTextColor={tokens.textSecondary}
                multiline
                editable={!readOnly}
                autoFocus={autoFocus}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onSelectionChange={handleSelectionChange}
                textAlignVertical="top"
                scrollEnabled={false}
              />
            </ScrollView>

            {/* Character Count */}
            <View style={[styles.footer, { borderTopColor: tokens.border }]}>
              <Text style={[styles.charCount, { color: tokens.textSecondary }]}>
                {value.length} characters
              </Text>
              {value.includes('**') || value.includes('*') || value.includes('#') ? (
                <View style={[styles.markdownBadge, { backgroundColor: tokens.accent + '20' }]}>
                  <Ionicons name="logo-markdown" size={12} color={tokens.accent} />
                  <Text style={[styles.markdownBadgeText, { color: tokens.accent }]}>
                    Markdown
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </Shadow>
      </Shadow>

      {/* Link Modal */}
      <LinkModal
        visible={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        onInsert={handleInsertLink}
        tokens={tokens}
        initialText={value.substring(selection.start, selection.end)}
      />
    </KeyboardAvoidingView>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  toolbarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 4,
  },
  toolbarButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editorContent: {
    flexGrow: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  charCount: {
    fontSize: 11,
  },
  markdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  markdownBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

const createDynamicStyles = (tokens: ThemeTokens, minHeight: number, maxHeight: number) =>
  StyleSheet.create({
    editorContainer: {
      borderRadius: 12,
      overflow: 'hidden',
    },
    toolbar: {
      height: 48,
      borderBottomWidth: 1,
      justifyContent: 'center',
    },
    editorScroll: {
      minHeight,
      maxHeight,
    },
    textInput: {
      flex: 1,
      minHeight,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      lineHeight: 24,
    },
  });

// ============================================================================
// Exports
// ============================================================================

export { markdownToPlainText, applyMarkdownFormat };
