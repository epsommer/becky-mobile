"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeTokens, useTheme } from "../theme/ThemeContext";

export type ActionPanelType = 'messages' | 'details' | 'insights' | 'schedule' | 'billing';

interface QuickAction {
  key: ActionPanelType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface QuickActionBarProps {
  messagesContent?: React.ReactNode;
  detailsContent?: React.ReactNode;
  insightsContent?: React.ReactNode;
  scheduleContent?: React.ReactNode;
  billingContent?: React.ReactNode;
  onActionPress?: (action: ActionPanelType) => void;
  // External control to open a specific panel
  openPanelRequest?: ActionPanelType | null;
  onPanelOpened?: () => void;
}

const QUICK_ACTIONS: QuickAction[] = [
  { key: 'messages', label: 'Draft AI', icon: 'sparkles-outline' },
  { key: 'details', label: 'Details', icon: 'information-circle-outline' },
  { key: 'insights', label: 'Insights', icon: 'bulb-outline' },
  { key: 'schedule', label: 'Schedule', icon: 'calendar-outline' },
  { key: 'billing', label: 'Billing', icon: 'receipt-outline' },
];

const SCREEN_HEIGHT = Dimensions.get('window').height;
const MIN_PANEL_HEIGHT = 200;
const MAX_PANEL_HEIGHT = SCREEN_HEIGHT - 120;
const DEFAULT_PANEL_HEIGHT = 350;

export default function QuickActionBar({
  messagesContent,
  detailsContent,
  insightsContent,
  scheduleContent,
  billingContent,
  onActionPress,
  openPanelRequest,
  onPanelOpened,
}: QuickActionBarProps) {
  const { tokens } = useTheme();
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);

  const [activePanel, setActivePanel] = useState<ActionPanelType | null>(null);
  const panelHeight = useRef(new Animated.Value(DEFAULT_PANEL_HEIGHT)).current;
  const lastPanelHeight = useRef(DEFAULT_PANEL_HEIGHT);

  // Handle external panel open requests
  useEffect(() => {
    if (openPanelRequest && openPanelRequest !== activePanel) {
      openPanel(openPanelRequest);
      onPanelOpened?.();
    }
  }, [openPanelRequest]);

  // Pan responder for dragging the panel
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const newHeight = lastPanelHeight.current - gestureState.dy;
        const clampedHeight = Math.min(Math.max(newHeight, MIN_PANEL_HEIGHT), MAX_PANEL_HEIGHT);
        panelHeight.setValue(clampedHeight);
      },
      onPanResponderRelease: (_, gestureState) => {
        const newHeight = lastPanelHeight.current - gestureState.dy;
        const clampedHeight = Math.min(Math.max(newHeight, MIN_PANEL_HEIGHT), MAX_PANEL_HEIGHT);
        lastPanelHeight.current = clampedHeight;

        // If dragged down significantly, close the panel
        if (gestureState.dy > 100 && gestureState.vy > 0.5) {
          closePanel();
        }
      },
    })
  ).current;

  const openPanel = (panel: ActionPanelType) => {
    setActivePanel(panel);
    panelHeight.setValue(lastPanelHeight.current);
    onActionPress?.(panel);
  };

  const closePanel = () => {
    Animated.timing(panelHeight, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start(() => {
      setActivePanel(null);
      panelHeight.setValue(DEFAULT_PANEL_HEIGHT);
    });
  };

  const handleActionPress = (action: ActionPanelType) => {
    if (activePanel === action) {
      closePanel();
    } else {
      openPanel(action);
    }
  };

  const getPanelContent = () => {
    switch (activePanel) {
      case 'messages':
        return messagesContent;
      case 'details':
        return detailsContent;
      case 'insights':
        return insightsContent;
      case 'schedule':
        return scheduleContent;
      case 'billing':
        return billingContent;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Sliding Panel */}
      {activePanel && (
        <Animated.View style={[styles.panel, { height: panelHeight }]}>
          {/* Drag Handle */}
          <View {...panResponder.panHandlers} style={styles.dragHandle}>
            <View style={styles.dragIndicator} />
          </View>

          {/* Panel Header */}
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>
              {QUICK_ACTIONS.find(a => a.key === activePanel)?.label || 'Panel'}
            </Text>
            <TouchableOpacity onPress={closePanel} style={styles.closeButton}>
              <Ionicons name="close" size={20} color={tokens.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Panel Content */}
          <View style={styles.panelContent}>
            {getPanelContent() || (
              <View style={styles.placeholderContent}>
                <Ionicons
                  name={QUICK_ACTIONS.find(a => a.key === activePanel)?.icon || 'help-circle-outline'}
                  size={48}
                  color={tokens.textSecondary}
                />
                <Text style={styles.placeholderText}>
                  {activePanel?.charAt(0).toUpperCase() + activePanel?.slice(1)} content coming soon
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      )}

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.key}
              style={[
                styles.actionButton,
                activePanel === action.key && styles.actionButtonActive,
              ]}
              onPress={() => handleActionPress(action.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={action.icon}
                size={22}
                color={activePanel === action.key ? tokens.textPrimary : tokens.accent}
              />
              <Text
                style={[
                  styles.actionLabel,
                  activePanel === action.key && styles.actionLabelActive,
                ]}
              >
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
    },
    panel: {
      backgroundColor: tokens.surface,
      borderTopWidth: 2,
      borderTopColor: tokens.border,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      overflow: 'hidden',
      shadowColor: tokens.shadowDark,
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 10,
    },
    dragHandle: {
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: tokens.background,
    },
    dragIndicator: {
      width: 40,
      height: 5,
      borderRadius: 3,
      backgroundColor: tokens.border,
    },
    panelHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    panelTitle: {
      color: tokens.textPrimary,
      fontSize: 16,
      fontWeight: '700',
    },
    closeButton: {
      padding: 4,
    },
    panelContent: {
      flex: 1,
      padding: 16,
    },
    placeholderContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
    },
    placeholderText: {
      color: tokens.textSecondary,
      fontSize: 14,
      textAlign: 'center',
    },
    actionBar: {
      backgroundColor: tokens.surface,
      borderTopWidth: 1,
      borderTopColor: tokens.border,
      paddingHorizontal: 8,
      paddingVertical: 8,
      paddingBottom: 24, // Extra padding for home indicator
      shadowColor: tokens.shadowDark,
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 8,
    },
    actionsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    actionButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 4,
      borderRadius: 12,
    },
    actionButtonActive: {
      backgroundColor: tokens.accent,
    },
    actionLabel: {
      color: tokens.textSecondary,
      fontSize: 10,
      marginTop: 4,
      fontWeight: '500',
    },
    actionLabelActive: {
      color: tokens.textPrimary,
    },
  });
