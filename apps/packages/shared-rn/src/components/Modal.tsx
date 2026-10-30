import React, { type ReactNode } from 'react';
import {
  Modal as RNModal,
  Pressable,
  View,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Text } from './Text';

export type ModalProps = {
  visible: boolean;
  onRequestClose: () => void;
  title?: string;
  children: ReactNode;
  accessibilityLabel: string;
  contentStyle?: StyleProp<ViewStyle>;
  dismissOnBackdropPress?: boolean;
};

export function Modal({
  visible,
  onRequestClose,
  title,
  children,
  accessibilityLabel,
  contentStyle,
  dismissOnBackdropPress = true,
}: ModalProps) {
  const { tokens } = useTheme();

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
      accessibilityViewIsModal
    >
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          padding: tokens.spacing.lg,
        }}
      >
        {/* Backdrop: Independent sibling overlay to prevent gesture responder conflicts */}
        {dismissOnBackdropPress ? (
          <Pressable
            onPress={onRequestClose}
            accessibilityRole="button"
            accessibilityLabel="Dismiss dialog"
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: tokens.color.overlay },
            ]}
          />
        ) : (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: tokens.color.overlay },
            ]}
          />
        )}

        {/* Modal Dialog Card (Z-index above backdrop) */}
        <View
          accessibilityLabel={accessibilityLabel}
          style={[
            {
              backgroundColor: tokens.color.background,
              borderRadius: tokens.radius.lg,
              padding: tokens.spacing.lg,
              gap: tokens.spacing.md,
              zIndex: 1,
              elevation: 10,
            },
            contentStyle,
          ]}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            {title ? (
              <Text variant="heading2" style={{ flex: 1, marginRight: 8 }}>
                {title}
              </Text>
            ) : <View style={{ flex: 1 }} />}
            <Pressable
              onPress={onRequestClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close dialog"
              style={({ pressed }) => ({
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: pressed ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.05)',
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              <Text style={{ fontSize: 16, color: tokens.color.textSecondary, fontWeight: '700' }}>✕</Text>
            </Pressable>
          </View>
          <View>{children}</View>
        </View>
      </View>
    </RNModal>
  );
}
