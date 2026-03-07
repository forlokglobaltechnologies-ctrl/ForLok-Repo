import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { X } from 'lucide-react-native';
import { FONTS, SPACING, BORDER_RADIUS } from '@constants/theme';
import { useLanguage } from '@context/LanguageContext';
import { normalize, wp, hp } from '@utils/responsive';
import { LinearGradient } from 'expo-linear-gradient';

const ACCENT = '#F9A825';
const ORANGE_GRADIENT = ['#F99E3C', '#D47B1B'] as const;

const VerificationPendingScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const [modalVisible, setModalVisible] = useState(true);

  useEffect(() => {
    setModalVisible(true);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.content}>
        <Image
          source={require('../../../assets/reg_success.png')}
          style={styles.illustration}
          resizeMode="contain"
        />

        <Text style={styles.title}>{t('verificationPending.registrationComplete')}</Text>
        <Text style={styles.subtitle}>
          Your account has been created successfully. You're all set to start!
        </Text>

        <TouchableOpacity
          style={styles.dashboardBtn}
          onPress={() => navigation.navigate('MainDashboard' as never)}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[ORANGE_GRADIENT[0], ORANGE_GRADIENT[1]]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.dashboardBtnText}>
              {t('verificationPending.goToDashboard')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Verification Info Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setModalVisible(false)}
            >
              <X size={20} color="#666666" />
            </TouchableOpacity>

            <View style={styles.modalIconWrap}>
              <Text style={styles.modalIcon}>🎉</Text>
            </View>

            <Text style={styles.modalTitle}>
              {t('verificationPending.verificationStatus')}
            </Text>
            <Text style={styles.modalMessage}>
              {t('verificationPending.verificationMessage')}
            </Text>
            <Text style={styles.modalInfo}>
              {t('verificationPending.notificationInfo')}
            </Text>

            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => setModalVisible(false)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[ORANGE_GRADIENT[0], ORANGE_GRADIENT[1]]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.modalBtnText}>Got it</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  illustration: {
    width: wp(55),
    height: hp(22),
    marginBottom: SPACING.xl,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: normalize(26),
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: '#888888',
    textAlign: 'center',
    lineHeight: normalize(24),
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  dashboardBtn: {
    height: normalize(52),
    borderRadius: normalize(26),
    paddingHorizontal: SPACING.xxl,
    minWidth: wp(70),
    overflow: 'hidden',
  },
  dashboardBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONTS.sizes.lg,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: normalize(20),
    padding: SPACING.xl,
    width: '100%',
    maxWidth: wp(90),
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    width: normalize(32),
    height: normalize(32),
    borderRadius: normalize(16),
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  modalIconWrap: {
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  modalIcon: {
    fontSize: normalize(48),
  },
  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: FONTS.sizes.xl,
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  modalMessage: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: '#555555',
    textAlign: 'center',
    lineHeight: normalize(24),
    marginBottom: SPACING.sm,
  },
  modalInfo: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: '#999999',
    textAlign: 'center',
    lineHeight: normalize(20),
    marginBottom: SPACING.lg,
  },
  modalBtn: {
    height: normalize(44),
    borderRadius: normalize(22),
    paddingHorizontal: SPACING.xl,
    minWidth: normalize(140),
    overflow: 'hidden',
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONTS.sizes.md,
    color: '#FFFFFF',
  },
});

export default VerificationPendingScreen;
