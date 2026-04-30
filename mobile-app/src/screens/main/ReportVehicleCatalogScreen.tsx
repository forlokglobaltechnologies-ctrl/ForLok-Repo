import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, ChevronDown } from 'lucide-react-native';
import { COLORS, FONTS } from '@constants/theme';
import { normalize } from '@utils/responsive';
import { vehicleCatalogApi } from '@utils/apiClient';

type VehicleType = 'bike' | 'scooty';

const ReportVehicleCatalogScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const initial = route.params || {};

  const [submitting, setSubmitting] = useState(false);
  const [vehicleType, setVehicleType] = useState<VehicleType>(() => {
    const v = String(initial.vehicleType || 'bike').toLowerCase();
    return v === 'scooty' ? 'scooty' : 'bike';
  });
  const [brand, setBrand] = useState(String(initial.brand || ''));
  const [model, setModel] = useState(String(initial.model || ''));
  const [fuelType, setFuelType] = useState(String(initial.fuelType || 'Petrol'));
  const [transmission, setTransmission] = useState(String(initial.transmission || 'Manual'));
  const [launchYear, setLaunchYear] = useState('');
  const [realWorldMileageAvg, setRealWorldMileageAvg] = useState('');
  const [mileageUnit, setMileageUnit] = useState('kmpl');
  const [estimatedCostPerKmInr, setEstimatedCostPerKmInr] = useState('');
  const [cityTier, setCityTier] = useState('mixed');
  const [notes, setNotes] = useState('');
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [selectionField, setSelectionField] = useState<'vehicleType' | 'fuelType' | 'transmission' | 'cityTier' | null>(null);

  const vehicleTypes = useMemo(
    () => [
      { key: 'bike' as const, label: 'Bike' },
      { key: 'scooty' as const, label: 'Scooty' },
    ],
    []
  );
  const fuelTypes = useMemo(() => ['Petrol', 'Diesel', 'CNG', 'Electric', 'LPG', 'AutoGas'], []);
  const transmissions = useMemo(() => ['Manual', 'Automatic'], []);
  const cityTiers = useMemo(() => ['metro', 'urban', 'mixed'], []);

  const openSelection = (field: 'vehicleType' | 'fuelType' | 'transmission' | 'cityTier') => {
    setSelectionField(field);
    setShowSelectionModal(true);
  };

  const selectValue = (value: string) => {
    if (selectionField === 'vehicleType') setVehicleType(value as VehicleType);
    else if (selectionField === 'fuelType') setFuelType(value);
    else if (selectionField === 'transmission') setTransmission(value);
    else if (selectionField === 'cityTier') setCityTier(value);
    setShowSelectionModal(false);
    setSelectionField(null);
  };

  const modalOptions =
    selectionField === 'vehicleType'
      ? vehicleTypes.map((v) => v.key)
      : selectionField === 'fuelType'
        ? fuelTypes
        : selectionField === 'transmission'
          ? transmissions
          : selectionField === 'cityTier'
            ? cityTiers
            : [];

  const onSubmit = async () => {
    if (!brand.trim() || !model.trim() || !fuelType.trim()) {
      Alert.alert('Validation', 'Vehicle type, brand, model and fuel type are required.');
      return;
    }
    try {
      setSubmitting(true);
      const response = await vehicleCatalogApi.submitRequest({
        vehicleType,
        brand: brand.trim(),
        model: model.trim(),
        fuelType: fuelType.trim(),
        transmission: transmission.trim() || undefined,
        launchYear: launchYear ? Number(launchYear) : undefined,
        realWorldMileageAvg: realWorldMileageAvg ? Number(realWorldMileageAvg) : undefined,
        mileageUnit: mileageUnit.trim() || undefined,
        estimatedCostPerKmInr: estimatedCostPerKmInr ? Number(estimatedCostPerKmInr) : undefined,
        cityTier: cityTier.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      if (response.success) {
        Alert.alert(
          'Submitted',
          'Your vehicle request was sent to admin. Once approved, it will appear in dropdowns next time.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Failed', response.error || 'Unable to submit request');
      }
    } catch (error: any) {
      Alert.alert('Failed', error?.message || 'Unable to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Missing Vehicle</Text>
        <View style={{ width: normalize(36) }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.hint}>
            Share your exact vehicle details. Admin will review and approve, then it will be available in app dropdowns.
          </Text>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Required Details</Text>

            <Text style={styles.label}>Vehicle Type *</Text>
            <TouchableOpacity style={styles.dropdownField} onPress={() => openSelection('vehicleType')} activeOpacity={0.8}>
              <Text style={styles.dropdownValue}>
                {vehicleType.charAt(0).toUpperCase() + vehicleType.slice(1)}
              </Text>
              <ChevronDown size={16} color="#7A7A7A" />
            </TouchableOpacity>

            <Text style={styles.label}>Brand *</Text>
            <TextInput style={styles.input} value={brand} onChangeText={setBrand} placeholder="e.g. Hyundai" />

            <Text style={styles.label}>Model *</Text>
            <TextInput style={styles.input} value={model} onChangeText={setModel} placeholder="e.g. Exter" />

            <Text style={styles.label}>Fuel Type *</Text>
            <TouchableOpacity style={styles.dropdownField} onPress={() => openSelection('fuelType')} activeOpacity={0.8}>
              <Text style={styles.dropdownValue}>{fuelType || 'Select fuel type'}</Text>
              <ChevronDown size={16} color="#7A7A7A" />
            </TouchableOpacity>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Optional Details</Text>

            <Text style={styles.label}>Transmission</Text>
            <TouchableOpacity style={styles.dropdownField} onPress={() => openSelection('transmission')} activeOpacity={0.8}>
              <Text style={styles.dropdownValue}>{transmission || 'Select transmission'}</Text>
              <ChevronDown size={16} color="#7A7A7A" />
            </TouchableOpacity>

            <Text style={styles.label}>Launch Year</Text>
            <TextInput style={styles.input} value={launchYear} onChangeText={setLaunchYear} keyboardType="number-pad" placeholder="e.g. 2022" />

            <Text style={styles.label}>Real-world Mileage</Text>
            <TextInput
              style={styles.input}
              value={realWorldMileageAvg}
              onChangeText={setRealWorldMileageAvg}
              keyboardType="decimal-pad"
              placeholder="e.g. 18.5"
            />

            <Text style={styles.label}>Mileage Unit</Text>
            <TextInput style={styles.input} value={mileageUnit} onChangeText={setMileageUnit} placeholder="kmpl / km/kg / km/kWh" />

            <Text style={styles.label}>Estimated Cost per Km (INR)</Text>
            <TextInput
              style={styles.input}
              value={estimatedCostPerKmInr}
              onChangeText={setEstimatedCostPerKmInr}
              keyboardType="decimal-pad"
              placeholder="Optional"
            />

            <Text style={styles.label}>City Tier</Text>
            <TouchableOpacity style={styles.dropdownField} onPress={() => openSelection('cityTier')} activeOpacity={0.8}>
              <Text style={styles.dropdownValue}>{cityTier || 'Select city tier'}</Text>
              <ChevronDown size={16} color="#7A7A7A" />
            </TouchableOpacity>

            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional details for admin"
              multiline
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity style={[styles.submitBtn, submitting && styles.submitBtnDisabled]} disabled={submitting} onPress={onSubmit}>
            <Text style={styles.submitBtnText}>{submitting ? 'Submitting...' : 'Submit to Admin'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showSelectionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSelectionModal(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSelectionModal(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {selectionField === 'vehicleType'
                ? 'Select Vehicle Type'
                : selectionField === 'fuelType'
                  ? 'Select Fuel Type'
                  : selectionField === 'transmission'
                    ? 'Select Transmission'
                    : 'Select City Tier'}
            </Text>
            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {modalOptions.map((option) => (
                <TouchableOpacity key={option} style={styles.modalOption} onPress={() => selectValue(option)}>
                  <Text style={styles.modalOptionText}>
                    {selectionField === 'vehicleType'
                      ? option.charAt(0).toUpperCase() + option.slice(1)
                      : option}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F8' },
  header: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: normalize(16),
    paddingVertical: normalize(12),
    paddingTop: normalize(46),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
  },
  backBtn: { paddingVertical: normalize(6), paddingRight: normalize(8) },
  headerTitle: {
    fontFamily: FONTS.medium || FONTS.regular,
    fontSize: normalize(17),
    color: COLORS.text,
    fontWeight: '700',
  },
  scrollContent: { padding: normalize(14), paddingBottom: normalize(40) },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: normalize(14),
    borderWidth: 1,
    borderColor: '#ECECEC',
    padding: normalize(12),
    marginBottom: normalize(12),
  },
  sectionTitle: {
    fontFamily: FONTS.medium || FONTS.regular,
    fontSize: normalize(14),
    color: COLORS.text,
    fontWeight: '700',
    marginBottom: normalize(10),
  },
  hint: {
    fontFamily: FONTS.regular,
    fontSize: normalize(12),
    color: '#6D6D6D',
    marginBottom: normalize(12),
  },
  label: {
    fontFamily: FONTS.regular,
    fontSize: normalize(12),
    color: '#666',
    marginBottom: normalize(4),
    fontWeight: '600',
  },
  input: {
    minHeight: normalize(44),
    borderRadius: normalize(12),
    borderWidth: 1.2,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: normalize(12),
    fontFamily: FONTS.regular,
    color: COLORS.text,
    marginBottom: normalize(10),
  },
  dropdownField: {
    minHeight: normalize(44),
    borderRadius: normalize(12),
    borderWidth: 1.2,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: normalize(12),
    marginBottom: normalize(10),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownValue: {
    fontFamily: FONTS.regular,
    fontSize: normalize(13),
    color: COLORS.text,
    fontWeight: '500',
    flex: 1,
    marginRight: normalize(8),
  },
  notesInput: {
    minHeight: normalize(90),
    paddingTop: normalize(10),
  },
  typeRow: {
    flexDirection: 'row',
    gap: normalize(8),
    marginBottom: normalize(10),
    flexWrap: 'wrap',
  },
  typeChip: {
    paddingHorizontal: normalize(12),
    paddingVertical: normalize(8),
    borderRadius: normalize(20),
    borderWidth: 1.2,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  typeChipActive: {
    borderColor: '#D47B1B',
    backgroundColor: '#FFF3E6',
  },
  typeChipText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(12),
    color: COLORS.text,
  },
  typeChipTextActive: {
    color: '#B5651D',
    fontWeight: '700',
  },
  vehicleTypeIconRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: normalize(12),
    marginBottom: normalize(10),
  },
  vehicleIconPill: {
    width: normalize(44),
    height: normalize(30),
    borderRadius: normalize(15),
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleIconPillActive: {
    backgroundColor: '#BFF4F0',
    borderColor: '#8BE7DF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: normalize(20),
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: normalize(16),
    maxHeight: normalize(420),
    paddingVertical: normalize(12),
  },
  modalTitle: {
    fontFamily: FONTS.medium || FONTS.regular,
    fontSize: normalize(15),
    color: COLORS.text,
    fontWeight: '700',
    paddingHorizontal: normalize(14),
    marginBottom: normalize(8),
  },
  modalList: {
    paddingHorizontal: normalize(8),
  },
  modalOption: {
    paddingVertical: normalize(10),
    paddingHorizontal: normalize(10),
    borderRadius: normalize(10),
  },
  modalOptionText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(13),
    color: COLORS.text,
    fontWeight: '500',
  },
  submitBtn: {
    height: normalize(50),
    borderRadius: normalize(14),
    backgroundColor: '#F99E3C',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: normalize(8),
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    fontFamily: FONTS.medium || FONTS.regular,
    fontSize: normalize(15),
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default ReportVehicleCatalogScreen;
