import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ImageBackground, SafeAreaView, Modal, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CheckCircle, X } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { COLORS, FONTS, SPACING, SHADOWS, BORDER_RADIUS } from '@constants/theme';
import { Button } from '@components/common/Button';
import { useLanguage } from '@context/LanguageContext';

const VerificationPendingScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const [modalVisible, setModalVisible] = useState(true);

  useEffect(() => {
    // Modal opens automatically when screen loads
    setModalVisible(true);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={require('../../../assets/reg_compleete.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        <BlurView intensity={50} style={styles.blurContainer}>
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <View style={styles.successIconWrapper}>
                <View style={styles.checkIconContainer}>
                  <CheckCircle size={64} color={COLORS.white} strokeWidth={2} />
                </View>
              </View>
            </View>
            <Text style={styles.title}>{t('verificationPending.registrationComplete')}</Text>
            <Button
              title={t('verificationPending.goToDashboard')}
              onPress={() => navigation.navigate('MainDashboard' as never)}
              variant="primary"
              size="large"
              style={styles.button}
            />
          </View>
        </BlurView>
      </ImageBackground>

      {/* Verification Info Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <X size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('verificationPending.verificationStatus')}</Text>
            <Text style={styles.modalMessage}>
              {t('verificationPending.verificationMessage')}
            </Text>
            <Text style={styles.modalInfo}>
              {t('verificationPending.notificationInfo')}
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.primary,
    opacity: 0.6,
  },
  blurContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  iconContainer: {
    marginBottom: SPACING.xl,
    marginTop: -SPACING.xl,
  },
  successIconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIconContainer: {
    marginTop: -SPACING.xs,borderRadius:40,

  },
  title: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xxxl,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  button: {
    minWidth: 250,
    ...SHADOWS.md,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 400,
    marginTop: SPACING.xl,
    ...SHADOWS.lg,
  },
  closeButton: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  modalTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xl,
    color: COLORS.text,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: SPACING.lg,
    marginTop: SPACING.sm,
  },
  modalMessage: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.md,
  },
  modalInfo: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default VerificationPendingScreen;
