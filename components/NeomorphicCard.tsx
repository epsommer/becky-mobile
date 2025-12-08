import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Shadow } from "react-native-shadow-2";
import { useTheme } from "../theme/ThemeContext";

interface NeomorphicCardProps {
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  radius?: number;
  children: React.ReactNode;
  darkOffset?: [number, number];
  lightOffset?: [number, number];
  darkDistance?: number;
  lightDistance?: number;
}

const NeomorphicCard: React.FC<NeomorphicCardProps> = ({
  style,
  contentStyle,
  radius = 22,
  children,
  darkOffset = [6, 6],
  lightOffset = [-6, -6],
  darkDistance = 14,
  lightDistance = 14,
}) => {
  const { tokens } = useTheme();

  const baseContentStyle = [
    {
      backgroundColor: tokens.surface,
      borderRadius: radius,
      padding: 0,
      width: '100%',
    },
    contentStyle,
  ];

  const flattenedContentStyle = StyleSheet.flatten(baseContentStyle);
  const innerStyle = {
    ...flattenedContentStyle,
    borderWidth: 0,
    borderColor: "transparent",
    alignSelf: 'stretch',
  };

  return (
    <Shadow
      startColor={tokens.shadowDark}
      finalColor={tokens.surface}
      offset={darkOffset}
      distance={darkDistance}
      style={[{ borderRadius: radius, width: '100%' }, style]}
    >
      <Shadow
        startColor={tokens.shadowLight}
        finalColor={tokens.surface}
        offset={lightOffset}
        distance={lightDistance}
        style={{ borderRadius: radius, width: '100%' }}
      >
        <View style={innerStyle}>{children}</View>
      </Shadow>
    </Shadow>
  );
};

export default NeomorphicCard;
