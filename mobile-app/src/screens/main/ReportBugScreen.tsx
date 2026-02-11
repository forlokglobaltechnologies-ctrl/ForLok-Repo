import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ImageBackground,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
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
  Camera,
  Send,
  AlertTriangle,
  CheckCircle,
  Info,
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { COLORS, FONTS, SPACING, SHADOWS } from '@constants/theme';
import { useLanguage } from '@context/LanguageContext';
import { useTheme } from '@context/ThemeContext';
import { feedbackApi } from '@utils/apiClient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
    { id: 'navigation', icon: MapPin, label: 'Navigation', color: '#2196F3' },
    { id: 'payment', icon: CreditCard, label: 'Payment', color: '#FF9800' },
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
      Alert.alert('Required', 'Please select a bug category');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a bug title');
      return;
    }
    if (!steps.trim()) {
      Alert.alert('Required', 'Please describe the steps to reproduce');
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
          'Bug Reported',
          'Thank you for reporting this bug. Our team will investigate and fix it as soon as possible.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', response.error || 'Failed to submit bug report');
      }
    } catch (error: any) {
      console.error('Error submitting bug report:', error);
      Alert.alert('Error', error.message || 'Failed to submit bug report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* ── Hero Header ── */}
      <ImageBackground
        source={require('../../../assets/bug.png')}
        style={styles.headerImage}
        resizeMode="cover"
      >
        <View style={[styles.headerOverlay, { backgroundColor: theme.colors.primary }]} />
        <BlurView intensity={40} style={styles.blurContainer}>
          <View style={styles.headerNav}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navButton}>
              <ArrowLeft size={22} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.navTitle}>Report a Bug</Text>
            <View style={{ width: 38 }} />
          </View>
        </BlurView>
      </ImageBackground>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Info Banner ── */}
        <View style={[styles.infoBanner, { backgroundColor: '#E3F2FD', borderColor: '#90CAF9' }]}>
          <Info size={18} color="#1565C0" />
          <Text style={[styles.infoText, { color: '#1565C0' }]}>
            Help us squash bugs! The more detail you provide, the faster we can fix it.
          </Text>
        </View>

        {/* ── Bug Category ── */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Bug Category *</Text>
          <View style={styles.categoryGrid}>
            {bugCategories.map((cat) => {
              const isSelected = bugCategory === cat.id;
              const Icon = cat.icon;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    { borderColor: isSelected ? cat.color : theme.colors.border, backgroundColor: isSelected ? cat.color + '10' : theme.colors.background },
                  ]}
                  onPress={() => setBugCategory(cat.id)}
                  activeOpacity={0.7}
                >
                  <Icon size={20} color={isSelected ? cat.color : theme.colors.textSecondary} />
                  <Text style={[styles.categoryChipText, { color: isSelected ? cat.color : theme.colors.textSecondary }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Severity ── */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Severity</Text>
          <View style={styles.severityRow}>
            {severities.map((sev) => {
              const isSelected = severity === sev.id;
              return (
                <TouchableOpacity
                  key={sev.id}
                  style={[
                    styles.severityChip,
                    {
                      borderColor: isSelected ? sev.color : theme.colors.border,
                      backgroundColor: isSelected ? sev.color + '10' : theme.colors.background,
                    },
                  ]}
                  onPress={() => setSeverity(sev.id as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.severityDot, { backgroundColor: sev.color }]} />
                  <View>
                    <Text style={[styles.severityLabel, { color: isSelected ? sev.color : theme.colors.text }]}>{sev.label}</Text>
                    <Text style={[styles.severityDesc, { color: theme.colors.textSecondary }]}>{sev.desc}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Bug Title ── */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Bug Title *</Text>
          <TextInput
            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Brief description of the bug..."
            placeholderTextColor={theme.colors.textSecondary}
            maxLength={120}
          />
          <Text style={[styles.charCount, { color: theme.colors.textSecondary }]}>{title.length}/120</Text>
        </View>

        {/* ── Steps to Reproduce ── */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Steps to Reproduce *</Text>
          <TextInput
            style={[styles.textArea, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
            value={steps}
            onChangeText={setSteps}
            placeholder={"1. Open the app\n2. Go to...\n3. Tap on...\n4. Observe the bug"}
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={[styles.charCount, { color: theme.colors.textSecondary }]}>{steps.length}/500</Text>
        </View>

        {/* ── Expected Behavior ── */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Expected Behavior</Text>
          <TextInput
            style={[styles.textArea, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background, minHeight: 80 }]}
            value={expected}
            onChangeText={setExpected}
            placeholder="What should have happened?"
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            maxLength={300}
          />
        </View>

        {/* ── Actual Behavior ── */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Actual Behavior</Text>
          <TextInput
            style={[styles.textArea, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background, minHeight: 80 }]}
            value={actual}
            onChangeText={setActual}
            placeholder="What actually happened instead?"
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            maxLength={300}
          />
        </View>

        {/* ── Submit Button ── */}
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: theme.colors.primary, opacity: submitting ? 0.7 : 1 }]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Send size={18} color="#FFF" />
              <Text style={styles.submitText}>Submit Bug Report</Text>
            </>
          )}
        </TouchableOpacity>

        {/* ── Tips Card ── */}
        <View style={[styles.tipsCard, { backgroundColor: '#FFF3E0', borderColor: '#FFE0B2' }]}>
          <Text style={[styles.tipsTitle, { color: '#E65100' }]}>Tips for a Good Bug Report</Text>
          <View style={styles.tipRow}>
            <CheckCircle size={14} color="#4CAF50" />
            <Text style={[styles.tipText, { color: '#5D4037' }]}>Be specific - include exact steps</Text>
          </View>
          <View style={styles.tipRow}>
            <CheckCircle size={14} color="#4CAF50" />
            <Text style={[styles.tipText, { color: '#5D4037' }]}>Mention your device model & OS version</Text>
          </View>
          <View style={styles.tipRow}>
            <CheckCircle size={14} color="#4CAF50" />
            <Text style={[styles.tipText, { color: '#5D4037' }]}>Describe what you expected vs what happened</Text>
          </View>
          <View style={styles.tipRow}>
            <CheckCircle size={14} color="#4CAF50" />
            <Text style={[styles.tipText, { color: '#5D4037' }]}>Note if the bug happens every time or randomly</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* ── Hero Header ── */
  headerImage: { width: '100%', height: 160 },
  headerOverlay: { ...StyleSheet.absoluteFillObject, opacity: 0.78 },
  blurContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  headerNav: { flexDirection: 'row', alignItems: 'center' },
  navButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 22,
    color: '#FFF',
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.4,
  },

  /* ── Scroll ── */
  scrollContent: { padding: SPACING.md, paddingBottom: SPACING.xl * 2 },

  /* ── Info Banner ── */
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  infoText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 13,
    lineHeight: 19,
  },

  /* ── Card ── */
  card: {
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  cardTitle: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },

  /* ── Category Grid ── */
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  categoryChip: {
    width: (SCREEN_WIDTH - SPACING.md * 2 - SPACING.lg * 2 - SPACING.sm * 2) / 3,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  categoryChipText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    fontWeight: '600',
  },

  /* ── Severity ── */
  severityRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  severityChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  severityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  severityLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: '700',
  },
  severityDesc: {
    fontFamily: FONTS.regular,
    fontSize: 10,
  },

  /* ── Inputs ── */
  input: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.md,
  },
  textArea: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.md,
    minHeight: 120,
  },
  charCount: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    textAlign: 'right',
    marginTop: 4,
  },

  /* ── Submit ── */
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: SPACING.lg,
  },
  submitText: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },

  /* ── Tips ── */
  tipsCard: {
    borderRadius: 16,
    padding: SPACING.lg,
    borderWidth: 1,
    marginBottom: SPACING.md,
    gap: 8,
  },
  tipsTitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tipText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 18,
  },
});

export default ReportBugScreen;
