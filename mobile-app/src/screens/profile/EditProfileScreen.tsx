import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, CheckCircle2 } from 'lucide-react-native';
import { Input } from '@components/common/Input';
import { useAuth } from '@context/AuthContext';
import { useSnackbar } from '@context/SnackbarContext';
import { userApi } from '@utils/apiClient';
import { BORDER_RADIUS, COLORS, FONTS, SHADOWS, SPACING } from '@constants/theme';
import { normalize } from '@utils/responsive';
import { LinearGradient } from 'expo-linear-gradient';

const GENDERS = ['Male', 'Female', 'Other'] as const;
const ORANGE_GRADIENT = ['#F99E3C', '#D47B1B'] as const;

/** Show DOB as DD-MM-YYYY (from API ISO / YYYY-MM-DD). */
function toDdMmYyyy(raw: string | undefined | null): string {
  if (raw == null || String(raw).trim() === '') return '';
  const s = String(raw).trim();
  const datePart = s.includes('T') ? s.split('T')[0] : s;
  const ymd = datePart.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) return `${ymd[3]}-${ymd[2]}-${ymd[1]}`;
  const dmy = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmy) return s;
  return '';
}

/** Parse DD-MM-YYYY → ISO datetime for API (Zod datetime). */
function ddMmYyyyToIso(value: string): string | null {
  const m = value.trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);
  if (yyyy < 1900 || yyyy > 2100 || mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const d = new Date(Date.UTC(yyyy, mm - 1, dd));
  if (d.getUTCFullYear() !== yyyy || d.getUTCMonth() !== mm - 1 || d.getUTCDate() !== dd) return null;
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}T00:00:00.000Z`;
}

const EditProfileScreen = () => {
  const navigation = useNavigation<any>();
  const { user, updateUser } = useAuth();
  const { showSnackbar } = useSnackbar();

  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<(typeof GENDERS)[number] | ''>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name || '');
    const g = user.gender;
    setGender(g && (GENDERS as readonly string[]).includes(g) ? (g as (typeof GENDERS)[number]) : '');
    if (user.dateOfBirth) {
      setDateOfBirth(toDdMmYyyy(String(user.dateOfBirth)));
    } else {
      setDateOfBirth('');
    }
  }, [user]);

  const canSave = useMemo(() => name.trim().length >= 2 && !saving, [name, saving]);

  const handleSave = async () => {
    if (!canSave) return;
    const trimmedDob = dateOfBirth.trim();
    let dobIso: string | null = null;
    if (trimmedDob) {
      dobIso = ddMmYyyyToIso(trimmedDob);
      if (!dobIso) {
        showSnackbar({ message: 'Use date of birth as DD-MM-YYYY (e.g. 15-08-1999)', type: 'error' });
        return;
      }
    }

    const payload: any = { name: name.trim() };
    if (dobIso) payload.dateOfBirth = dobIso;
    if (gender) payload.gender = gender;

    setSaving(true);
    try {
      const response = await userApi.updateProfile(payload);
      if (!response.success) {
        showSnackbar({ message: response.error || 'Failed to update profile', type: 'error' });
        return;
      }

      await updateUser(payload);
      Alert.alert('Success', 'Profile updated successfully', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (error: any) {
      showSnackbar({ message: error?.message || 'Failed to update profile', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={20} color="#1B1B1B" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <Text style={styles.headerSubtitle}>Update your account details</Text>
        </View>
        <View style={styles.rightPlaceholder} />
      </View>

      <KeyboardAvoidingView style={styles.keyboardWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.heroStrip}>
            <Text style={styles.heroTitle}>eZway Profile</Text>
            <Text style={styles.heroText}>Keep your details up to date for faster bookings and verification.</Text>
          </View>

          <View style={styles.card}>
            <Input label="Full Name" value={name} onChangeText={setName} placeholder="Enter your name" />
            <Input
              label="Date of Birth"
              value={dateOfBirth}
              onChangeText={setDateOfBirth}
              placeholder="DD-MM-YYYY"
              autoCapitalize="none"
              keyboardType="numbers-and-punctuation"
            />

            <Text style={styles.genderLabel}>Gender</Text>
            <View style={styles.genderRow}>
              {GENDERS.map((g) => {
                const selected = gender === g;
                return (
                  <TouchableOpacity
                    key={g}
                    style={[styles.genderChip, selected && styles.genderChipActive]}
                    onPress={() => setGender(g)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.genderChipText, selected && styles.genderChipTextActive]}>{g}</Text>
                    {selected ? <CheckCircle2 size={14} color="#1B1B1B" /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!canSave}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[ORANGE_GRADIENT[0], ORANGE_GRADIENT[1]]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.saveButtonGradient}
            >
              <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
            </LinearGradient>
          </TouchableOpacity>

          {saving ? (
            <View style={styles.savingState}>
              <ActivityIndicator size="small" color="#1B1B1B" />
              <Text style={styles.savingText}>Updating profile...</Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    paddingTop: SPACING.xl,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE7D1',
  },
  backButton: {
    paddingVertical: normalize(6),
    paddingRight: normalize(8),
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.regular,
    fontSize: normalize(18),
    color: '#1B1B1B',
    fontWeight: '700',
  },
  headerSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: normalize(11),
    color: 'rgba(27,27,27,0.8)',
    marginTop: normalize(2),
  },
  rightPlaceholder: { width: normalize(36) },
  keyboardWrap: { flex: 1 },
  scrollContent: { padding: SPACING.md, paddingBottom: SPACING.xl * 2 },
  heroStrip: {
    backgroundColor: '#1B1B1B',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  heroTitle: {
    fontFamily: FONTS.regular,
    fontSize: normalize(15),
    color: '#F4AB04',
    fontWeight: '700',
    marginBottom: normalize(3),
  },
  heroText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(12),
    color: '#F7F7F7',
    lineHeight: normalize(18),
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: '#F3D58B',
  },
  genderLabel: {
    fontFamily: FONTS.regular,
    fontSize: normalize(13),
    color: '#3D3D3D',
    marginTop: normalize(4),
    marginBottom: normalize(8),
  },
  genderRow: { flexDirection: 'row', gap: SPACING.sm },
  genderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(6),
    borderWidth: 1,
    borderColor: '#E7D8A5',
    borderRadius: BORDER_RADIUS.round,
    paddingHorizontal: normalize(12),
    paddingVertical: normalize(8),
    backgroundColor: '#FFFDF5',
  },
  genderChipActive: {
    borderColor: '#F4AB04',
    backgroundColor: '#FFF1C7',
  },
  genderChipText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(13),
    color: '#4A4A4A',
  },
  genderChipTextActive: {
    color: '#1B1B1B',
    fontWeight: '700',
  },
  saveButton: {
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    minHeight: normalize(52),
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.55,
  },
  saveButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: normalize(14),
  },
  saveButtonText: {
    color: '#1B1B1B',
    fontWeight: '700',
  },
  savingState: {
    marginTop: normalize(10),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: normalize(8),
  },
  savingText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(12),
    color: '#8A7A4B',
  },
});

export default EditProfileScreen;
