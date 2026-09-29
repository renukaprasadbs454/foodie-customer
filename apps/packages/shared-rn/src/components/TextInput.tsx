import React from 'react';
import {
  TextInput as RNTextInput,
  View,
  type StyleProp,
  type TextInputProps as RNTextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Text } from './Text';

export type TextInputProps = Omit<RNTextInputProps, 'style'> & {
  label?: string;
  errorText?: string;
  accessibilityLabel: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
};

export function TextInput({
  label,
  errorText,
  accessibilityLabel,
  containerStyle,
  inputStyle,
  editable = true,
  placeholderTextColor,
  ...rest
}: TextInputProps) {
  const { tokens } = useTheme();

  return (
    <View style={[{ gap: tokens.spacing.xs }, containerStyle]}>
      {label ? (
        <Text variant="label" color={tokens.color.textSecondary}>
          {label}
        </Text>
      ) : null}
      <RNTextInput
        placeholderTextColor={placeholderTextColor ?? tokens.color.textSecondary}
        {...rest}
        editable={editable}
        accessibilityLabel={accessibilityLabel}
        style={[
          {
            minHeight: 48,
            borderWidth: 1,
            borderColor: errorText ? tokens.color.error : tokens.color.border,
            borderRadius: tokens.radius.md,
            paddingHorizontal: tokens.spacing.md,
            color: tokens.color.textPrimary,
            backgroundColor: tokens.color.surface,
            opacity: editable ? 1 : 0.6,
            fontSize: tokens.typography.body.fontSize,
          },
          inputStyle,
        ]}
      />
      {errorText ? (
        <Text variant="caption" color={tokens.color.error}>
          {errorText}
        </Text>
      ) : null}
    </View>
  );
}

