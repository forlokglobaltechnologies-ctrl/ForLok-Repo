import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { COLORS, FONTS, BORDER_RADIUS, SPACING } from '@constants/theme';

interface PhoneInputProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  containerStyle?: any;
  labelColor?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  label,
  value,
  onChangeText,
  error,
  containerStyle,
  labelColor,
  editable = true,
  ...props
}) => {
  // Only allow digits, remove any non-digit characters
  const handleChangeText = (text: string) => {
    const digitsOnly = text.replace(/\D/g, '');
    // Limit to 10 digits (Indian phone number)
    const limitedDigits = digitsOnly.slice(0, 10);
    onChangeText(limitedDigits);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, labelColor && { color: labelColor }]}>{label}</Text>}
      <View style={[styles.inputContainer, error && styles.inputError, !editable && styles.inputDisabled]}>
        {/* Static prefix with flag and +91 */}
        <View style={styles.prefixContainer}>
          <Text style={styles.flagEmoji}>🇮🇳</Text>
          <Text style={styles.prefixText}>+91</Text>
        </View>
        
        {/* Phone number input */}
        <TextInput
          style={[styles.input, props.style]}
          value={value}
          onChangeText={handleChangeText}
          placeholderTextColor={COLORS.textSecondary}
          keyboardType="phone-pad"
          maxLength={10}
          editable={editable}
          {...props}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
  },
  inputDisabled: {
    backgroundColor: COLORS.lightGray + '40',
    opacity: 0.6,
  },
  prefixContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.sm,
    paddingRight: SPACING.sm,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  flagEmoji: {
    fontFamily: FONTS.regular,
    fontSize: 20,
    marginRight: SPACING.xs,
  },
  prefixText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    paddingVertical: SPACING.md,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },
});
