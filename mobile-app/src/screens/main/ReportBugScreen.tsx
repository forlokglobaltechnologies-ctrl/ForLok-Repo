import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ArrowLeft,
  Bug,
  Smartphone,
  MapPin,
  CreditCard,
  UserX,
  Zap,
  Send,
  CheckCircle,
  Info,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FONTS, SPACING, SHADOWS } from '@constants/theme';
import { normalize, wp } from '@utils/responsive';
import { useLanguage } from '@context/LanguageContext';
import { useTheme } from '@context/ThemeContext';
import { feedbackApi } from '@utils/apiClient';
import { AppLoader } from '@components/common/AppLoader';

const ReportBugScreen = () => {
  const navigation = useNavigation<any>();
  const { t } = useLanguage();
  const { theme } = useTheme();

  const [bugCategory, setBugCategory] = useState<string | null>(null);
  const [severity, setSeverity] = useState<'critical' | 'major' | 'minor'>('major');
  const [title, setTitle] = useState('');
  const [steps, setSteps] = useState('');
  const [expected, setExpected] = useState('');
  const [actual, setActual] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const bugCategories = [
    { id: 'app_crash', icon: Zap, label: 'App Crash', color: '#F44336' },
    { id: 'navigation', icon: MapPin, label: 'Navigation', color: '#F99E3C' },
    { id: 'wallet_coins', icon: CreditCard, label: 'Wallet & Coins', color: '#FF9800' },
    { id: 'account', icon: UserX, label: 'Account', color: '#9C27B0' },
    { id: 'ui_issue', icon: Smartphone, label: 'UI Issue', color: '#00BCD4' },
    { id: 'other', icon: Bug, label: 'Other', color: '#607D8B' },
  ];

  const severities = [
    { id: 'critical', label: 'Critical', desc: 'App is unusable', color: '#F44336' },
    { id: 'major', label: 'Major', desc: 'Feature broken', color: '#FF9800' },
    { id: 'minor', label: 'Minor', desc: 'Small glitch', color: '#4CAF50' },
  ];

  const handleSubmit = async () => {
    if (!bugCategory) {
      Alert.alert(t('reportBug.requiredField'), t('reportBug.selectCategory'));
      return;
    }
    if (!title.trim()) {
      Alert.alert(t('reportBug.requiredField'), t('reportBug.enterTitle'));
      return;
    }
    if (!steps.trim()) {
      Alert.alert(t('reportBug.requiredField'), t('reportBug.enterSteps'));
      return;
    }

    try {
      setSubmitting(true);
      const response = await feedbackApi.submit({
        type: 'issue',
        subject: `[Bug - ${bugCategory}] ${title.trim()}`,
        description: `Category: ${bugCategory}\nSeverity: ${severity}\n\nSteps to Reproduce:\n${steps.trim()}\n\nExpected Behavior:\n${expected.trim() || 'N/A'}\n\nActual Behavior:\n${actual.trim() || 'N/A'}`,
        priority: severity === 'critical' ? 'high' : severity === 'major' ? 'medium' : 'low',
      });

      if (response.success) {
        Alert.alert(
          t('reportBug.submitSuccess'),
          t('reportBug.submitSuccessMessage'),
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert(t('common.error'), response.error || t('reportBug.submitFailed'));
      }
    } catch (error: any) {
      console.error('Error submitting bug report:', error);
      Alert.alert(t('common.error'), error.message || t('reportBug.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={[
            styles.headerNav,
            {
              backgroundColor: theme.colors.surface,
              borderBottomColor: theme.colors.border,
            },
          ]}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navButton}>
            <ArrowLeft size={22} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.navTitle, { color: theme.colors.text }]}>{t('reportBug.title')}</Text>
          </View>
          <View style={styles.headerRightPlaceholder} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={['#FFD54A', '#F99E3C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroIconWrap}>
              <Bug size={20} color="#111827" />
            </View>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroTitle}>Report an issue quickly</Text>
              <Text style={styles.heroSubtitle}>{t('reportBug.helpText')}</Text>
            </View>
          </LinearGradient>

          <View style={[styles.infoBanner, { backgroundColor: '#FFF8E6', borderColor: '#FCD79C' }]}>
            <Info size={16} color="#9A5B00" />
            <Text style={[styles.infoText, { color: '#9A5B00' }]}>
              Add clear steps so our team can reproduce and fix faster.
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{t('reportBug.bugCategory')}</Text>
            <View style={styles.categoryGrid}>
              {bugCategories.map((cat) => {
                const isSelected = bugCategory === cat.id;
                const Icon = cat.icon;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      {
                        borderColor: isSelected ? '#F99E3C' : theme.colors.border,
                        backgroundColor: isSelected ? '#FFF4E6' : theme.colors.background,
                      },
                    ]}
                    onPress={() => setBugCategory(cat.id)}
                    activeOpacity={0.8}
                  >
                    <Icon size={16} color={isSelected ? '#B85E00' : theme.colors.textSecondary} />
                    <Text style={[styles.categoryChipText, { color: isSelected ? '#B85E00' : theme.colors.textSecondary }]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{t('reportBug.severity')}</Text>
            <View style={styles.severityRow}>
              {severities.map((sev) => {
                const isSelected = severity === sev.id;
                return (
                  <TouchableOpacity
                    key={sev.id}
                    style={[
                      styles.severityChip,
                      {
                        borderColor: isSelected ? '#F99E3C' : theme.colors.border,
                        backgroundColor: isSelected ? '#FFF4E6' : theme.colors.background,
                      },
                    ]}
                    onPress={() => setSeverity(sev.id as any)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.severityDot, { backgroundColor: sev.color }]} />
                    <Text style={[styles.severityLabel, { color: isSelected ? '#B85E00' : theme.colors.text }]}>
                      {sev.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{t('reportBug.bugTitle')}</Text>
            <TextInput
              style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
              value={title}
              onChangeText={setTitle}
              placeholder={t('reportBug.bugTitlePlaceholder')}
              placeholderTextColor={theme.colors.textSecondary}
              maxLength={120}
            />
            <Text style={[styles.charCount, { color: theme.colors.textSecondary }]}>{title.length}/120</Text>
          </View>

          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{t('reportBug.stepsToReproduce')}</Text>
            <TextInput
              style={[styles.textArea, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
              value={steps}
              onChangeText={setSteps}
              placeholder={t('reportBug.stepsPlaceholder')}
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={[styles.charCount, { color: theme.colors.textSecondary }]}>{steps.length}/500</Text>
          </View>

          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{t('reportBug.expectedBehavior')}</Text>
            <TextInput
              style={[styles.textArea, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background, minHeight: normalize(88) }]}
              value={expected}
              onChangeText={setExpected}
              placeholder={t('reportBug.expectedPlaceholder')}
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={300}
            />
          </View>

          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{t('reportBug.actualBehavior')}</Text>
            <TextInput
              style={[styles.textArea, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background, minHeight: normalize(88) }]}
              value={actual}
              onChangeText={setActual}
              placeholder={t('reportBug.actualPlaceholder')}
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={300}
            />
          </View>

          <View style={[styles.tipsCard, { backgroundColor: '#FFF9EE', borderColor: '#FDE4BD' }]}>
            <Text style={[styles.tipsTitle, { color: '#8A4A00' }]}>{t('reportBug.tipsTitle')}</Text>
            <View style={styles.tipRow}>
              <CheckCircle size={14} color="#22C55E" />
              <Text style={[styles.tipText, { color: '#5C3A00' }]}>Be specific - include exact steps</Text>
            </View>
            <View style={styles.tipRow}>
              <CheckCircle size={14} color="#22C55E" />
              <Text style={[styles.tipText, { color: '#5C3A00' }]}>Mention your device model & OS version</Text>
            </View>
            <View style={styles.tipRow}>
              <CheckCircle size={14} color="#22C55E" />
              <Text style={[styles.tipText, { color: '#5C3A00' }]}>Describe what you expected vs what happened</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, { opacity: submitting ? 0.75 : 1 }]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#232323', '#191919']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.submitGradient}
            >
              {submitting ? (
                <AppLoader size="small" color="#FFF" />
              ) : (
                <>
                  <Send size={18} color="#FFF" />
                  <Text style={styles.submitText}>{t('reportBug.submitReport')}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardWrap: { flex: 1 },
  headerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navButton: {
    paddingVertical: normalize(6),
    paddingRight: normalize(8),
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  navTitle: {
    fontFamily: FONTS.medium,
    fontSize: normalize(18),
    fontWeight: '700',
  },
  headerRightPlaceholder: {
    width: normalize(38),
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl * 2,
  },
  heroCard: {
    marginTop: normalize(8),
    marginBottom: SPACING.md,
    borderRadius: normalize(18),
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  heroIconWrap: {
    width: normalize(42),
    height: normalize(42),
    borderRadius: normalize(21),
    backgroundColor: 'rgba(255,255,255,0.58)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: normalize(12),
  },
  heroTextWrap: { flex: 1 },
  heroTitle: {
    fontFamily: FONTS.medium,
    fontSize: normalize(16),
    fontWeight: '700',
    color: '#1F2937',
  },
  heroSubtitle: {
    marginTop: normalize(4),
    fontFamily: FONTS.regular,
    fontSize: normalize(12),
    lineHeight: normalize(17),
    color: 'rgba(17,24,39,0.78)',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: normalize(8),
    borderRadius: normalize(12),
    paddingVertical: normalize(10),
    paddingHorizontal: normalize(12),
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  infoText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: normalize(12),
    lineHeight: normalize(17),
  },
  card: {
    borderRadius: normalize(14),
    padding: SPACING.md,
    marginBottom: normalize(10),
    ...SHADOWS.sm,
  },
  cardTitle: {
    fontFamily: FONTS.medium,
    fontSize: normalize(15),
    fontWeight: '700',
    marginBottom: normalize(10),
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: normalize(8),
  },
  categoryChip: {
    width: '48.5%',
    paddingVertical: normalize(11),
    borderRadius: normalize(11),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: normalize(4),
  },
  categoryChipText: {
    fontFamily: FONTS.medium,
    fontSize: normalize(10.5),
    fontWeight: '600',
    textAlign: 'center',
  },
  severityRow: {
    flexDirection: 'row',
    gap: normalize(8),
  },
  severityChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: normalize(6),
    paddingVertical: normalize(11),
    borderRadius: normalize(10),
    borderWidth: 1,
  },
  severityDot: {
    width: normalize(9),
    height: normalize(9),
    borderRadius: normalize(4.5),
  },
  severityLabel: {
    fontFamily: FONTS.medium,
    fontSize: normalize(12),
    fontWeight: '600',
  },
  input: {
    fontFamily: FONTS.regular,
    fontSize: normalize(14),
    borderWidth: 1,
    borderRadius: normalize(12),
    padding: SPACING.md,
  },
  textArea: {
    fontFamily: FONTS.regular,
    fontSize: normalize(14),
    borderWidth: 1,
    borderRadius: normalize(12),
    padding: SPACING.md,
    minHeight: normalize(120),
  },
  charCount: {
    fontFamily: FONTS.regular,
    fontSize: normalize(11),
    textAlign: 'right',
    marginTop: normalize(4),
  },
  submitButton: {
    borderRadius: normalize(14),
    overflow: 'hidden',
    marginTop: normalize(8),
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: normalize(8),
    paddingVertical: normalize(15),
  },
  submitText: {
    fontFamily: FONTS.medium,
    fontSize: normalize(15),
    fontWeight: '600',
    color: '#FFF',
  },
  tipsCard: {
    borderRadius: normalize(14),
    padding: SPACING.md,
    borderWidth: 1,
    marginBottom: normalize(2),
    gap: normalize(8),
  },
  tipsTitle: {
    fontFamily: FONTS.medium,
    fontSize: normalize(14),
    fontWeight: '700',
    marginBottom: normalize(4),
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(8),
  },
  tipText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(12),
    lineHeight: normalize(18),
  },
});

export default ReportBugScreen;
