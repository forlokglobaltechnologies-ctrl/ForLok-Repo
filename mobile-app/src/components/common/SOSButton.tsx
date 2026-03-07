import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Vibration,
  Platform,
  Linking,
} from 'react-native';
import { useSOS } from '@context/SOSContext';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '@constants/theme';
import { normalize, wp } from '@utils/responsive';
import LottieView from 'lottie-react-native';

// Screens where SOS button should be hidden (auth/onboarding + admin screens)
const HIDDEN_SCREENS = [
  'Splash',
  'Onboarding',
  'SignIn',
  'SignUp',
  'ForgotPassword',
  'UserTypeSelection',
  'IndividualRegistration',
  'CompanyRegistration',
  'DocumentVerification',
  'VerificationPending',
  'Loading',
  'Error',
  'PinkPoolingSplash',
  // Admin screens — SOS is for passengers/drivers, not admin
  'AdminLogin',
  'AdminDashboard',
  'AdminSettings',
  'AdminPromoReview',
  'PoolingManagement',
  'RentalManagement',
  'RidesHistory',
  'UserManagement',
  'FeedbackManagement',
  'FeedbackDetails',
  'Analytics',
];

const HOLD_DURATION = 3000; // 3 seconds to confirm
const TICK_INTERVAL = 50; // Update progress every 50ms

const SOSButton: React.FC = () => {
  const { triggerSOS, isSending, currentRoute, sosVisible } = useSOS();
  const [showModal, setShowModal] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [sosResult, setSOSResult] = useState<{ success: boolean; message: string } | null>(null);

  // Refs
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const holdStartRef = useRef<number>(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const shouldHide = !currentRoute || HIDDEN_SCREENS.includes(currentRoute) || !sosVisible;
  if (shouldHide) return null;

  const handlePress = () => {
    setShowModal(true);
    setHoldProgress(0);
    setSOSResult(null);
  };

  const handleHoldStart = () => {
    holdStartRef.current = Date.now();
    Vibration.vibrate(50);

    // Progress update interval
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartRef.current;
      const progress = Math.min(elapsed / HOLD_DURATION, 1);
      setHoldProgress(progress);

      if (progress >= 1) {
        clearInterval(progressIntervalRef.current!);
        progressIntervalRef.current = null;
        handleSOSSend();
      }
    }, TICK_INTERVAL);
  };

  const handleHoldEnd = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (holdProgress < 1) {
      setHoldProgress(0);
    }
  };

  const handleSOSSend = async () => {
    Vibration.vibrate([0, 200, 100, 200]); // Double vibration feedback
    const result = await triggerSOS();
    setSOSResult(result);
    setHoldProgress(0);
  };

  const handleDismiss = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setShowModal(false);
    setHoldProgress(0);
    setSOSResult(null);
  };

  const handleCallEmergency = () => {
    Linking.openURL('tel:112');
  };

  // Circle progress for hold indicator
  const progressDegrees = holdProgress * 360;

  return (
    <>
      {/* Floating SOS Lottie Button */}
      <TouchableOpacity
        style={styles.floatingContainer}
        onPress={handlePress}
        activeOpacity={0.85}
      >
        <LottieView
          source={require('../../../assets/videos/Sos animation.json')}
          autoPlay
          loop
          style={styles.sosLottie}
        />
      </TouchableOpacity>

      {/* SOS Confirmation Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={handleDismiss}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {sosResult ? (
              // Result Screen
              <>
                <View
                  style={[
                    styles.resultIcon,
                    sosResult.success ? styles.resultIconSuccess : styles.resultIconError,
                  ]}
                >
                  <Text style={styles.resultIconText}>
                    {sosResult.success ? '✓' : '!'}
                  </Text>
                </View>
                <Text style={styles.modalTitle}>
                  {sosResult.success ? 'SOS Sent!' : 'SOS Failed'}
                </Text>
                <Text style={styles.modalMessage}>{sosResult.message}</Text>

                {!sosResult.success && (
                  <TouchableOpacity
                    style={styles.callButton}
                    onPress={handleCallEmergency}
                  >
                    <Text style={styles.callButtonText}>Call 112 (Emergency)</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss}>
                  <Text style={styles.dismissButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            ) : (
              // Hold to Confirm Screen
              <>
                <View style={styles.warningIcon}>
                  <Text style={styles.warningIconText}>🚨</Text>
                </View>
                <Text style={styles.modalTitle}>Emergency SOS</Text>
                <Text style={styles.modalMessage}>
                  Hold the button below for 3 seconds to send an emergency alert with your
                  location and trip details.
                </Text>

                {/* Hold Button with Progress */}
                <View style={styles.holdButtonContainer}>
                  {/* Progress Ring Background */}
                  <View style={styles.progressRing}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          backgroundColor:
                            holdProgress > 0 ? '#D32F2F' : 'transparent',
                          opacity: holdProgress,
                        },
                      ]}
                    />
                    <TouchableOpacity
                      style={[
                        styles.holdButton,
                        isSending && styles.holdButtonDisabled,
                        holdProgress > 0 && styles.holdButtonActive,
                      ]}
                      onPressIn={handleHoldStart}
                      onPressOut={handleHoldEnd}
                      disabled={isSending}
                      activeOpacity={0.9}
                    >
                      {isSending ? (
                        <Text style={styles.holdButtonText}>Sending...</Text>
                      ) : (
                        <>
                          <Text style={styles.holdButtonText}>
                            {holdProgress > 0
                              ? `${Math.ceil((1 - holdProgress) * 3)}s`
                              : 'HOLD'}
                          </Text>
                          <Text style={styles.holdButtonSubtext}>
                            {holdProgress > 0 ? 'Keep holding...' : 'Press & hold'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Progress bar */}
                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBarBg}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${holdProgress * 100}%` },
                        ]}
                      />
                    </View>
                  </View>
                </View>

                {/* Quick call option */}
                <TouchableOpacity
                  style={styles.callButton}
                  onPress={handleCallEmergency}
                >
                  <Text style={styles.callButtonText}>Or Call 112 Directly</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelButton} onPress={handleDismiss}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  // Floating button
  floatingContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? normalize(90) : normalize(75),
    right: normalize(8),
    zIndex: 99999,
    elevation: 99999,
    width: normalize(70),
    height: normalize(70),
  },
  sosLottie: {
    width: normalize(70),
    height: normalize(70),
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: normalize(20),
    padding: SPACING.xl,
    width: '100%',
    maxWidth: wp(90),
    alignItems: 'center',
  },

  // Warning icon
  warningIcon: {
    width: normalize(64),
    height: normalize(64),
    borderRadius: normalize(32),
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  warningIconText: {
    fontSize: normalize(32),
    fontFamily: FONTS.regular,
  },

  // Result icon
  resultIcon: {
    width: normalize(64),
    height: normalize(64),
    borderRadius: normalize(32),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  resultIconSuccess: {
    backgroundColor: '#E8F5E9',
  },
  resultIconError: {
    backgroundColor: '#FFEBEE',
  },
  resultIconText: {
    fontSize: normalize(32),
    fontWeight: 'bold',
    fontFamily: FONTS.regular,
  },

  modalTitle: {
    fontFamily: FONTS.regular,
    fontSize: normalize(22),
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  modalMessage: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: normalize(22),
    marginBottom: SPACING.lg,
  },

  // Hold button
  holdButtonContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
    width: '100%',
  },
  progressRing: {
    width: normalize(120),
    height: normalize(120),
    borderRadius: normalize(60),
    backgroundColor: '#FFCDD2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  progressFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: normalize(60),
  },
  holdButton: {
    width: normalize(104),
    height: normalize(104),
    borderRadius: normalize(52),
    backgroundColor: '#D32F2F',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: normalize(3),
    borderColor: '#B71C1C',
  },
  holdButtonActive: {
    backgroundColor: '#B71C1C',
    borderColor: '#880E4F',
  },
  holdButtonDisabled: {
    backgroundColor: '#999',
    borderColor: '#777',
  },
  holdButtonText: {
    fontFamily: FONTS.regular,
    color: '#FFFFFF',
    fontSize: normalize(20),
    fontWeight: '900',
    letterSpacing: 1,
  },
  holdButtonSubtext: {
    fontFamily: FONTS.regular,
    color: '#FFCDD2',
    fontSize: normalize(10),
    fontWeight: '600',
    marginTop: 2,
  },

  // Progress bar
  progressBarContainer: {
    width: '80%',
    paddingHorizontal: SPACING.md,
  },
  progressBarBg: {
    height: normalize(6),
    backgroundColor: '#FFCDD2',
    borderRadius: normalize(3),
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#D32F2F',
    borderRadius: normalize(3),
  },

  // Buttons
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1565C0',
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    width: '100%',
    marginBottom: SPACING.sm,
  },
  callButtonText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  cancelButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  cancelButtonText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  dismissButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    width: '100%',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  dismissButtonText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.white,
    fontWeight: 'bold',
  },
});

export default SOSButton;
