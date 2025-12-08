/**
 * Neomorphic Input Component
 * Text input with inset neomorphic shadow effect
 */

import React, { useState } from 'react';
import {
  TextInput,
  View,
  StyleSheet,
  ViewStyle,
  TextInputProps,
  StyleProp,
  TouchableOpacity,
} from 'react-native';
import { Shadow } from 'react-native-shadow-2';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

export interface NeomorphicInputProps extends Omit<TextInputProps, 'style'> {
  /** Input value */
  value: string;
  /** Change handler */
  onChangeText: (text: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Secure text entry (password) */
  secureTextEntry?: boolean;
  /** Auto capitalize */
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  /** Keyboard type */
  keyboardType?: TextInputProps['keyboardType'];
  /** Custom container style */
  style?: StyleProp<ViewStyle>;
  /** Ref for next input (tab support) */
  nextInput?: React.RefObject<TextInput>;
}

/**
 * Neomorphic input field with inset shadow effect
 *
 * @example
 * ```tsx
 * <NeomorphicInput
 *   value={email}
 *   onChangeText={setEmail}
 *   placeholder="Email address"
 *   keyboardType="email-address"
 *   autoCapitalize="none"
 * />
 * ```
 */
export default React.forwardRef<TextInput, NeomorphicInputProps>(
  function NeomorphicInput(
    {
      value,
      onChangeText,
      placeholder,
      secureTextEntry,
      autoCapitalize = 'none',
      keyboardType,
      style,
      nextInput,
      ...rest
    },
    ref
  ) {
    const { tokens } = useTheme();
    const [focused, setFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Inset shadow effect (opposite of convex)
    const darkOffset: [number, number] = [4, 4];
    const lightOffset: [number, number] = [-4, -4];

    const containerStyle: ViewStyle = {
      width: '100%',
      borderRadius: 12,
      overflow: 'hidden',
    };

    const inputContainerStyle: ViewStyle = {
      position: 'relative',
    };

    const inputStyle = {
      backgroundColor: tokens.surface,
      borderRadius: 12,
      paddingHorizontal: 20,
      paddingRight: secureTextEntry ? 56 : 20,
      paddingVertical: 16,
      fontSize: 16,
      fontWeight: '500' as const,
      color: tokens.textPrimary,
      borderWidth: focused ? 2 : 0,
      borderColor: focused ? tokens.accent : 'transparent',
    };

    const eyeIconStyle = {
      position: 'absolute' as const,
      right: 16,
      top: '50%',
      transform: [{ translateY: -12 }],
      padding: 4,
    };

    const placeholderColor = tokens.textSecondary;

    return (
      <View style={[containerStyle, style]}>
        <Shadow
          startColor={tokens.shadowDark}
          offset={darkOffset}
          distance={8}
          sides={{ start: true, end: true, top: true, bottom: true }}
          corners={{ topStart: true, topEnd: true, bottomStart: true, bottomEnd: true }}
          style={{ borderRadius: 12, width: '100%' }}
          containerStyle={{ width: '100%' }}
          stretch
        >
          <Shadow
            startColor={tokens.shadowLight}
            offset={lightOffset}
            distance={8}
            sides={{ start: true, end: true, top: true, bottom: true }}
            corners={{ topStart: true, topEnd: true, bottomStart: true, bottomEnd: true }}
            style={{ borderRadius: 12, width: '100%' }}
            containerStyle={{ width: '100%' }}
            stretch
          >
            <View style={inputContainerStyle}>
              <TextInput
                ref={ref}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={placeholderColor}
                secureTextEntry={secureTextEntry && !showPassword}
                autoCapitalize={autoCapitalize}
                keyboardType={keyboardType}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onSubmitEditing={() => nextInput?.current?.focus()}
                returnKeyType={nextInput ? 'next' : 'done'}
                blurOnSubmit={!nextInput}
                style={inputStyle}
                {...rest}
              />
              {secureTextEntry && (
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={eyeIconStyle}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye' : 'eye-off'}
                    size={20}
                    color={tokens.textSecondary}
                  />
                </TouchableOpacity>
              )}
            </View>
          </Shadow>
        </Shadow>
      </View>
    );
  }
);
