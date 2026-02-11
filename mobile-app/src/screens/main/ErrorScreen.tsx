import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react-native';
import { COLORS, FONTS, SPACING } from '@constants/theme';
import { Button } from '@components/common/Button';

interface ErrorScreenProps {
  message?: string;
  onRetry?: () => void;
}

const ErrorScreen: React.FC<ErrorScreenProps> = ({
  message = 'Unable to load data. Please check your internet connection and try again.',
  onRetry,
}) => {
  const navigation = useNavigation();

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      navigation.goBack();
    }
  };

  return (
    <LinearGradient
      colors={[COLORS.primary, COLORS.primaryDark]}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <AlertCircle size={80} color={COLORS.warning} />
        </View>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message}>{message}</Text>
        <Button
          title="TRY AGAIN"
          onPress={handleRetry}
          variant="primary"
          size="large"
          style={styles.retryButton}
          icon={<RefreshCw size={20} color={COLORS.white} />}
        />
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: SPACING.md,
  },
  backButton: {
    padding: SPACING.sm,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  iconContainer: {
    marginBottom: SPACING.xl,
  },
  title: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xxl,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  message: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.white,
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: SPACING.xl,
    lineHeight: 24,
  },
  retryButton: {
    minWidth: 200,
  },
});

export default ErrorScreen;






