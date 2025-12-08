/**
 * Neomorphic Button Component
 * Matches the web app's neomorphic button styling with pressed states
 */

import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { Shadow } from 'react-native-shadow-2';
import { useTheme } from '../theme/ThemeContext';

export interface NeomorphicButtonProps {
  /** Button text or content */
  children: React.ReactNode;
  /** Press handler */
  onPress: () => void;
  /** Button variant */
  variant?: 'default' | 'active' | 'outline';
  /** Disabled state */
  disabled?: boolean;
  /** Custom button style */
  style?: StyleProp<ViewStyle>;
  /** Custom text style */
  textStyle?: StyleProp<TextStyle>;
  /** Button size */
  size?: 'small' | 'medium' | 'large';
}

/**
 * Neomorphic button with convex/inset shadow states
 *
 * @example
 * ```tsx
 * <NeomorphicButton onPress={handleSubmit} variant="active">
 *   Submit
 * </NeomorphicButton>
 * ```
 */
export default function NeomorphicButton({
  children,
  onPress,
  variant = 'default',
  disabled = false,
  style,
  textStyle,
  size = 'medium',
}: NeomorphicButtonProps) {
  const { tokens } = useTheme();
  const [pressed, setPressed] = useState(false);

  // Size configurations
  const sizeConfig = {
    small: { height: 38, paddingHorizontal: 16, fontSize: 14 },
    medium: { height: 48, paddingHorizontal: 24, fontSize: 16 },
    large: { height: 54, paddingHorizontal: 28, fontSize: 18 },
  };

  const config = sizeConfig[size];

  // Background color based on variant
  const backgroundColor =
    variant === 'active' ? tokens.accent : tokens.surface;

  // Text color based on variant
  const textColor =
    variant === 'active' ? tokens.background : tokens.textPrimary;

  // Shadow offsets - inset when pressed, convex when not
  const darkOffset = pressed ? [0, 0] : [6, 6];
  const lightOffset = pressed ? [0, 0] : [-6, -6];
  const shadowDistance = pressed ? 4 : 12;

  const baseButtonStyle: ViewStyle = {
    width: '100%',
    height: config.height,
    paddingHorizontal: config.paddingHorizontal,
    backgroundColor,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: disabled ? 0.5 : 1,
  };

  const baseTextStyle: TextStyle = {
    color: textColor,
    fontSize: config.fontSize,
    fontWeight: '600',
    fontFamily: 'Montserrat',
  };

  return (
    <Shadow
      startColor={pressed ? tokens.shadowLight : tokens.shadowDark}
      offset={darkOffset as [number, number]}
      distance={shadowDistance}
      style={[{ borderRadius: 40, width: '100%' }, style]}
      containerStyle={{ width: '100%' }}
      stretch
    >
      <Shadow
        startColor={pressed ? tokens.shadowDark : tokens.shadowLight}
        offset={lightOffset as [number, number]}
        distance={shadowDistance}
        style={{ borderRadius: 40, width: '100%' }}
        containerStyle={{ width: '100%' }}
        stretch
      >
        <TouchableOpacity
          style={baseButtonStyle}
          onPressIn={() => {
            console.log('[NeomorphicButton] onPressIn, disabled:', disabled);
            !disabled && setPressed(true);
          }}
          onPressOut={() => {
            console.log('[NeomorphicButton] onPressOut');
            setPressed(false);
          }}
          onPress={() => {
            console.log('[NeomorphicButton] onPress, disabled:', disabled);
            if (!disabled) {
              console.log('[NeomorphicButton] Calling onPress handler');
              onPress();
            }
          }}
          disabled={disabled}
          activeOpacity={0.9}
        >
          {typeof children === 'string' ? (
            <Text style={[baseTextStyle, textStyle]}>{children}</Text>
          ) : (
            children
          )}
        </TouchableOpacity>
      </Shadow>
    </Shadow>
  );
}
