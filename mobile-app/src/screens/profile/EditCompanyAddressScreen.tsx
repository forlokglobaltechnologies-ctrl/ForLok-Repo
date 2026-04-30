import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { ArrowLeft } from 'lucide-react-native';
import { Input } from '@components/common/Input';
import { useSnackbar } from '@context/SnackbarContext';
import { companyApi } from '@utils/apiClient';
import { BORDER_RADIUS, COLORS, FONTS, SPACING } from '@constants/theme';
import { normalize } from '@utils/responsive';
import { LinearGradient } from 'expo-linear-gradient';

const ORANGE_GRADIENT = ['#F99E3C', '#D47B1B'] as const;

const EditCompanyAddressScreen = () => {
  const navigation = useNavigation();
  const { showSnackbar } = useSnackbar();
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateField, setStateField] = useState('');
  const [pincode, setPincode] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await companyApi.getProfile();
      if (res.success && res.data) {
        setAddress(String(res.data.address || ''));
        setCity(String(res.data.city || ''));
        setStateField(String(res.data.state || ''));
        setPincode(String(res.data.pincode || '').replace(/\D/g, '').slice(0, 6));
      } else {
        showSnackbar({ message: res.error || 'Failed to load company profile', type: 'error' });
      }
    } catch (e: any) {
      showSnackbar({ message: e?.message || 'Failed to load company profile', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    void load();
  }, [load]);

  const canSave = useMemo(() => {
    return (
      address.trim().length > 0 &&
      city.trim().length > 0 &&
      stateField.trim().length > 0 &&
      pincode.length === 6 &&
      !saving
    );
  }, [address, city, stateField, pincode, saving]);

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const res = await companyApi.updateProfile({
        address: address.trim(),
        city: city.trim(),
        state: stateField.trim(),
        pincode,
      });
      if (!res.success) {
        showSnackbar({ message: res.error || 'Failed to update address', type: 'error' });
        return;
      }
      showSnackbar({ message: 'Address updated', type: 'success' });
      navigation.goBack();
    } catch (e: any) {
      showSnackbar({ message: e?.message || 'Failed to update address', type: 'error' });
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
        <Text style={styles.headerTitle}>Edit company address</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.hint}>Update your registered address. City, state, and pincode should match your records.</Text>
            <Input
              label="Address"
              value={address}
              onChangeText={setAddress}
              placeholder="Street, area, landmark"
              multiline
              numberOfLines={3}
              containerStyle={styles.input}
            />
            <Input label="City" value={city} onChangeText={setCity} placeholder="City" containerStyle={styles.input} />
            <Input label="State" value={stateField} onChangeText={setStateField} placeholder="State" containerStyle={styles.input} />
            <Input
              label="Pincode"
              value={pincode}
              onChangeText={(t) => setPincode(t.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit pincode"
              keyboardType="number-pad"
              maxLength={6}
              containerStyle={styles.input}
            />

            <TouchableOpacity
              style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!canSave}
              activeOpacity={0.85}
            >
              <LinearGradient colors={[ORANGE_GRADIENT[0], ORANGE_GRADIENT[1]]} style={styles.saveGradient}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>Save address</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEE7D1',
  },
  backButton: { paddingVertical: normalize(6), paddingRight: normalize(8) },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FONTS.semiBold,
    fontSize: normalize(17),
    color: '#1B1B1B',
  },
  headerSpacer: { width: normalize(36) },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: SPACING.md, paddingBottom: SPACING.xl * 2 },
  hint: {
    fontFamily: FONTS.regular,
    fontSize: normalize(13),
    color: '#666',
    marginBottom: SPACING.md,
    lineHeight: normalize(20),
  },
  input: { marginBottom: SPACING.md },
  saveBtn: {
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    minHeight: normalize(48),
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveGradient: {
    minHeight: normalize(48),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  saveText: { fontFamily: FONTS.semiBold, fontSize: normalize(16), color: '#FFFFFF' },
});

export default EditCompanyAddressScreen;
