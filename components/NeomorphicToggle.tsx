/**
 * Neomorphic Toggle Component
 * Animated toggle switch with neomorphic styling
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Text,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { Shadow } from 'react-native-shadow-2';
import { useTheme } from '../theme/ThemeContext';

export interface NeomorphicToggleProps {
  /** Toggle value */
  value: boolean;
  /** Change handler */
  onValueChange: (value: boolean) => void;
  /** Optional label */
  label?: string;
  /** Custom container style */
  style?: StyleProp<ViewStyle>;
}

/**
 * Neomorphic toggle switch with smooth animation
 *
 * Matches the web app's toggle implementation with:
 * - Inset track shadow
 * - Convex slider shadow
 * - Smooth slide animation
 *
 * @example
 * ```tsx
 * <NeomorphicToggle
 *   value={darkMode}
 *   onValueChange={setDarkMode}
 *   label="Dark Mode"
 * />
 * ```
 */
export default function NeomorphicToggle({
  value,
  onValueChange,
  label,
  style,
}: NeomorphicToggleProps) {
  const { tokens } = useTheme();
  const slideAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: value ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [value, slideAnim]);

  const sliderTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [6, 50], // 88px track - 32px slider - 6px padding
  });

  const containerStyle: ViewStyle = {
    flexDirection: label ? 'row' : 'column',
    alignItems: 'center',
    gap: label ? 12 : 0,
  };

  const trackStyle: ViewStyle = {
    width: 88,
    height: 44,
    borderRadius: 88,
    backgroundColor: tokens.surface,
    position: 'relative',
    justifyContent: 'center',
  };

  const sliderStyle: ViewStyle = {
    width: 32,
    height: 32,
    borderRadius: 100,
    backgroundColor: tokens.surface,
    position: 'absolute',
  };

  return (
    <View style={[containerStyle, style]}>
      {label && (
        <Text
          style={{
            color: tokens.textPrimary,
            fontSize: 16,
            fontWeight: '600',
          }}
        >
          {label}
        </Text>
      )}

      <TouchableOpacity
        onPress={() => onValueChange(!value)}
        activeOpacity={0.9}
      >
        {/* Track with inset shadow */}
        <Shadow
          startColor={tokens.shadowDark}
          offset={[0, -3]}
          distance={3}
          style={{ borderRadius: 88 }}
        >
          <Shadow
            startColor={tokens.shadowLight}
            offset={[0, 3]}
            distance={3}
            style={{ borderRadius: 88 }}
          >
            <Shadow
              startColor={tokens.shadowLight}
              offset={[12, -17]}
              distance={14}
              style={{ borderRadius: 88 }}
            >
              <Shadow
                startColor={tokens.shadowDark}
                offset={[-13, 14]}
                distance={12}
                style={{ borderRadius: 88 }}
              >
                <View style={trackStyle}>
                  {/* Animated slider with convex shadow */}
                  <Animated.View
                    style={[
                      sliderStyle,
                      {
                        transform: [{ translateX: sliderTranslateX }],
                      },
                    ]}
                  >
                    <Shadow
                      startColor={tokens.shadowDark}
                      offset={[2, 2]}
                      distance={5}
                      style={{ borderRadius: 100 }}
                    >
                      <Shadow
                        startColor={tokens.shadowLight}
                        offset={[-2, -2]}
                        distance={2}
                        style={{ borderRadius: 100 }}
                      >
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 100,
                            backgroundColor: tokens.surface,
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          {/* Optional icon or indicator */}
                        </View>
                      </Shadow>
                    </Shadow>
                  </Animated.View>
                </View>
              </Shadow>
            </Shadow>
          </Shadow>
        </Shadow>
      </TouchableOpacity>
    </View>
  );
}
