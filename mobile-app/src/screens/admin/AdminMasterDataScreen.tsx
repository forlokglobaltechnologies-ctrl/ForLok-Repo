import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  Switch,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Database, Trash2, Pencil, ChevronDown, X } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '@constants/theme';
import { normalize } from '@utils/responsive';
import { adminApi } from '@utils/apiClient';
import { Button } from '@components/common/Button';

const MASTER_TYPES: Array<{ key: string; label: string }> = [
  { key: 'vehicle_type', label: 'Vehicle Type' },
  { key: 'vehicle_brand', label: 'Vehicle Brand' },
  { key: 'vehicle_model', label: 'Vehicle Model' },
  { key: 'fuel_type', label: 'Fuel Type' },
  { key: 'transmission_type', label: 'Transmission Type' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'service_category', label: 'Service Category' },
  { key: 'faq_category', label: 'FAQ Category' },
  { key: 'help_topic_category', label: 'Help Topic Category' },
  { key: 'report_bug_category', label: 'Bug Category' },
  { key: 'feedback_type', label: 'Feedback Type' },
  { key: 'feedback_status', label: 'Feedback Status' },
  { key: 'feedback_priority', label: 'Feedback Priority' },
  { key: 'settlement_status', label: 'Settlement Status' },
  { key: 'review_type', label: 'Review Type' },
  { key: 'rating_bucket', label: 'Rating Bucket' },
  { key: 'time_slot', label: 'Time Slot' },
  { key: 'ride_feature', label: 'Ride Feature' },
  { key: 'sort_option', label: 'Sort Option' },
  { key: 'booking_status', label: 'Booking Status' },
  { key: 'pooling_offer_status', label: 'Pooling Offer Status' },
  { key: 'rental_offer_status', label: 'Rental Offer Status' },
  { key: 'payment_method', label: 'Payment Method' },
  { key: 'user_type', label: 'User Type' },
  { key: 'language', label: 'Language' },
];

const MASTER_DEFAULT_OPTIONS: Record<string, Array<{ key: string; label: string; value?: string; sortOrder?: number; isActive?: boolean }>> = {
  vehicle_type: [
    { key: 'car', label: 'Car' },
    { key: 'bike', label: 'Bike' },
    { key: 'scooty', label: 'Scooty' },
  ],
  vehicle_brand: [
    { key: 'maruti_suzuki', label: 'Maruti Suzuki' },
    { key: 'hyundai', label: 'Hyundai' },
    { key: 'tata', label: 'Tata' },
    { key: 'mahindra', label: 'Mahindra' },
    { key: 'kia', label: 'Kia' },
    { key: 'toyota', label: 'Toyota' },
    { key: 'honda', label: 'Honda' },
    { key: 'hero', label: 'Hero' },
    { key: 'bajaj', label: 'Bajaj' },
    { key: 'yamaha', label: 'Yamaha' },
    { key: 'tvs', label: 'TVS' },
    { key: 'royal_enfield', label: 'Royal Enfield' },
    { key: 'suzuki', label: 'Suzuki' },
    { key: 'ola', label: 'Ola' },
  ],
  fuel_type: [
    { key: 'petrol', label: 'Petrol' },
    { key: 'diesel', label: 'Diesel' },
    { key: 'electric', label: 'Electric' },
    { key: 'cng', label: 'CNG' },
  ],
  transmission_type: [
    { key: 'manual', label: 'Manual' },
    { key: 'automatic', label: 'Automatic' },
  ],
  state: [
    { key: 'andhra_pradesh', label: 'Andhra Pradesh' },
    { key: 'telangana', label: 'Telangana' },
    { key: 'karnataka', label: 'Karnataka' },
    { key: 'tamil_nadu', label: 'Tamil Nadu' },
    { key: 'kerala', label: 'Kerala' },
    { key: 'maharashtra', label: 'Maharashtra' },
    { key: 'delhi', label: 'Delhi' },
    { key: 'gujarat', label: 'Gujarat' },
    { key: 'rajasthan', label: 'Rajasthan' },
    { key: 'west_bengal', label: 'West Bengal' },
  ],
  city: [
    { key: 'hyderabad', label: 'Hyderabad' },
    { key: 'bengaluru', label: 'Bengaluru' },
    { key: 'chennai', label: 'Chennai' },
    { key: 'mumbai', label: 'Mumbai' },
    { key: 'pune', label: 'Pune' },
    { key: 'delhi', label: 'Delhi' },
    { key: 'kolkata', label: 'Kolkata' },
    { key: 'ahmedabad', label: 'Ahmedabad' },
    { key: 'visakhapatnam', label: 'Visakhapatnam' },
    { key: 'vijayawada', label: 'Vijayawada' },
  ],
  service_category: [
    { key: 'pooling', label: 'Pooling' },
    { key: 'rental', label: 'Rental' },
    { key: 'food', label: 'Food' },
  ],
  faq_category: [
    { key: 'account_registration', label: 'Account & Registration' },
    { key: 'pooling_services', label: 'Pooling Services' },
    { key: 'rental_services', label: 'Rental Services' },
    { key: 'wallet_coins', label: 'Wallet & Coins' },
    { key: 'safety_security', label: 'Safety & Security' },
    { key: 'ratings_reviews', label: 'Ratings & Reviews' },
    { key: 'trip_management', label: 'Trip Management' },
  ],
  help_topic_category: [
    { key: 'pooling', label: 'Pooling' },
    { key: 'rental', label: 'Rental' },
    { key: 'trips', label: 'Trips' },
    { key: 'policy', label: 'Policy' },
    { key: 'ratings', label: 'Ratings' },
    { key: 'account', label: 'Account' },
    { key: 'wallet', label: 'Wallet' },
    { key: 'tracking', label: 'Tracking' },
  ],
  report_bug_category: [
    { key: 'ui_issue', label: 'UI Issue' },
    { key: 'crash', label: 'App Crash' },
    { key: 'performance', label: 'Performance' },
    { key: 'payment', label: 'Payment' },
    { key: 'booking', label: 'Booking' },
    { key: 'other', label: 'Other' },
  ],
  feedback_type: [
    { key: 'issue', label: 'Issue' },
    { key: 'suggestion', label: 'Suggestion' },
    { key: 'complaint', label: 'Complaint' },
  ],
  feedback_status: [
    { key: 'pending', label: 'Pending' },
    { key: 'acknowledged', label: 'In Review' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'archived', label: 'Archived' },
  ],
  feedback_priority: [
    { key: 'high', label: 'High' },
    { key: 'medium', label: 'Medium' },
    { key: 'low', label: 'Low' },
  ],
  settlement_status: [
    { key: 'pending', label: 'Pending' },
    { key: 'settled', label: 'Settled' },
  ],
  review_type: [
    { key: 'passenger_to_driver', label: 'As Driver' },
    { key: 'driver_to_passenger', label: 'As Rider' },
  ],
  rating_bucket: [
    { key: '4_5', label: '4.5+' },
    { key: '4_0', label: '4.0+' },
    { key: '3_5', label: '3.5+' },
  ],
  time_slot: [
    { key: 'morning', label: 'Morning' },
    { key: 'afternoon', label: 'Afternoon' },
    { key: 'evening', label: 'Evening' },
  ],
  ride_feature: [
    { key: 'ac', label: 'AC Available' },
    { key: 'music', label: 'Music System' },
    { key: 'luggage', label: 'Luggage Space' },
  ],
  sort_option: [
    { key: 'priceLow', label: 'Price: Low to High' },
    { key: 'priceHigh', label: 'Price: High to Low' },
    { key: 'rating', label: 'Rating' },
    { key: 'distance', label: 'Distance' },
  ],
  booking_status: [
    { key: 'pending', label: 'Pending' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
    { key: 'no_show', label: 'No Show' },
  ],
  pooling_offer_status: [
    { key: 'active', label: 'Active' },
    { key: 'pending', label: 'Pending' },
    { key: 'paused', label: 'Paused' },
    { key: 'expired', label: 'Expired' },
    { key: 'suspended', label: 'Suspended' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ],
  rental_offer_status: [
    { key: 'active', label: 'Active' },
    { key: 'booked', label: 'Booked' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ],
  payment_method: [
    { key: 'offline_cash', label: 'Offline Cash' },
    { key: 'wallet', label: 'Wallet' },
  ],
  user_type: [
    { key: 'individual', label: 'Individual' },
    { key: 'company', label: 'Company' },
  ],
  language: [
    { key: 'en', label: 'English' },
    { key: 'hi', label: 'Hindi' },
    { key: 'te', label: 'Telugu' },
  ],
};

const normalizeKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const AdminMasterDataScreen = () => {
  const navigation = useNavigation<any>();
  const [type, setType] = useState(MASTER_TYPES[0].key);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [defaultItems, setDefaultItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [keyValue, setKeyValue] = useState('');
  const [label, setLabel] = useState('');
  const [value, setValue] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);

  const loadItems = useCallback(async () => {
    setLoading(true);
    const res = await adminApi.getMasterData(type);
    if (res.success && res.data) {
      setItems((res.data as any).items || []);
      setDefaultItems(MASTER_DEFAULT_OPTIONS[type] || []);
    } else {
      setItems([]);
      setDefaultItems(MASTER_DEFAULT_OPTIONS[type] || []);
      if (res.error) {
        Alert.alert('Load Failed', res.error);
      }
    }
    setLoading(false);
  }, [type]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const onSelectItem = (item: any) => {
    setKeyValue(item.key || '');
    setLabel(item.label || '');
    setValue(item.value || '');
    setSortOrder(String(item.sortOrder ?? 0));
    setIsActive(Boolean(item.isActive));
  };

  const clearForm = () => {
    setKeyValue('');
    setLabel('');
    setValue('');
    setSortOrder('0');
    setIsActive(true);
  };

  const onSave = async () => {
    if (!label.trim()) {
      Alert.alert('Validation', 'Label is required.');
      return;
    }

    const finalKey = (keyValue.trim() || normalizeKey(label)).toLowerCase();
    if (!finalKey) {
      Alert.alert('Validation', 'Enter a valid label or key.');
      return;
    }

    const res = await adminApi.upsertMasterDataItem(type, finalKey, {
      label: label.trim(),
      value: value.trim() || undefined,
      metadata: {},
      sortOrder: Number(sortOrder || 0),
      isActive,
    });
    if (res.success) {
      Alert.alert('Saved', 'Master data item saved.');
      clearForm();
      await loadItems();
    } else {
      Alert.alert('Error', res.error || 'Failed to save item.');
    }
  };

  const onDelete = async (keyToDelete?: string) => {
    const selectedKey = (keyToDelete || keyValue).trim().toLowerCase();
    if (!selectedKey) {
      Alert.alert('Delete', 'Select an item first.');
      return;
    }
    const res = await adminApi.deleteMasterDataItem(type, selectedKey);
    if (res.success) {
      Alert.alert('Deleted', 'Master data item deleted.');
      clearForm();
      await loadItems();
    } else {
      Alert.alert('Error', res.error || 'Failed to delete item.');
    }
  };

  const selectedTypeLabel =
    MASTER_TYPES.find((item) => item.key === type)?.label || type;
  const displayItems = items.length > 0 ? items : defaultItems.map((item) => ({ ...item, fromDefault: true, type }));

  const onImportDefaults = async () => {
    const defaults = MASTER_DEFAULT_OPTIONS[type] || [];
    if (defaults.length === 0) {
      Alert.alert('No Defaults', 'No app defaults available for this dropdown type.');
      return;
    }
    setLoading(true);
    try {
      for (const item of defaults) {
        // eslint-disable-next-line no-await-in-loop
        await adminApi.upsertMasterDataItem(type, item.key.toLowerCase(), {
          label: item.label,
          value: item.value,
          metadata: {},
          sortOrder: item.sortOrder ?? 0,
          isActive: item.isActive ?? true,
        });
      }
      Alert.alert('Imported', `${defaults.length} default options imported.`);
      await loadItems();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Master Data</Text>
        <TouchableOpacity onPress={() => void loadItems()}>
          <Text style={styles.refreshText}>{loading ? '...' : 'Refresh'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>Dropdown Type</Text>
        <TouchableOpacity style={styles.typeSelector} onPress={() => setShowTypeModal(true)}>
          <View style={styles.typeSelectorLeft}>
            <Database size={14} color={COLORS.primary} />
            <Text style={styles.typeSelectorText}>{selectedTypeLabel}</Text>
          </View>
          <ChevronDown size={16} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Existing Items</Text>
        <FlatList
          style={styles.itemsList}
          data={displayItems}
          keyExtractor={(item) => `${item.type}:${item.key}`}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No options found for this dropdown type.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.itemRow}>
              <View style={styles.itemTextArea}>
                <Text style={styles.itemTitle}>
                  {item.label}
                  {item.fromDefault ? ' (default)' : ''}
                </Text>
                <Text style={styles.itemSub}>{item.key}</Text>
              </View>
              <View style={styles.itemActions}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => onSelectItem(item)}>
                  <Pencil size={14} color={COLORS.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconBtn}
                  disabled={item.fromDefault}
                  onPress={() =>
                    Alert.alert(
                      'Delete Option',
                      `Delete "${item.label}" from ${selectedTypeLabel}?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => void onDelete(item.key) },
                      ]
                    )
                  }
                >
                  <Trash2 size={14} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
        {items.length === 0 && defaultItems.length > 0 && (
          <TouchableOpacity style={styles.importBtn} onPress={() => void onImportDefaults()}>
            <Database size={14} color={COLORS.primary} />
            <Text style={styles.importBtnText}>Import App Defaults for this Type</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.sectionTitle}>Add / Edit Option</Text>

        <Text style={styles.label}>Key (optional)</Text>
        <TextInput style={styles.input} value={keyValue} onChangeText={setKeyValue} placeholder="auto-generated from label if empty" />

        <Text style={styles.label}>Label</Text>
        <TextInput style={styles.input} value={label} onChangeText={setLabel} placeholder="Display label" />

        <Text style={styles.label}>Value (optional)</Text>
        <TextInput style={styles.input} value={value} onChangeText={setValue} placeholder="Stored value (optional)" />

        <Text style={styles.label}>Sort Order</Text>
        <TextInput
          style={styles.input}
          value={sortOrder}
          onChangeText={setSortOrder}
          keyboardType="numeric"
          placeholder="0"
        />

        <View style={styles.publishRow}>
          <Text style={styles.label}>Active</Text>
          <Switch value={isActive} onValueChange={setIsActive} />
        </View>

        <Button title="Save Master Data Item" onPress={onSave} variant="primary" size="large" />
        <TouchableOpacity style={styles.secondaryBtn} onPress={clearForm}>
          <X size={14} color={COLORS.textSecondary} />
          <Text style={styles.secondaryBtnText}>Clear Form</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => void onDelete()}>
          <Trash2 size={14} color={COLORS.error} />
          <Text style={styles.deleteBtnText}>Delete Selected</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showTypeModal} transparent animationType="slide" onRequestClose={() => setShowTypeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Dropdown Type</Text>
              <TouchableOpacity onPress={() => setShowTypeModal(false)}>
                <X size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={MASTER_TYPES}
              keyExtractor={(item) => item.key}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalRow, item.key === type && styles.modalRowActive]}
                  onPress={() => {
                    setType(item.key);
                    setShowTypeModal(false);
                    clearForm();
                  }}
                >
                  <Text style={[styles.modalRowText, item.key === type && styles.modalRowTextActive]}>{item.label}</Text>
                  <Text style={styles.modalRowSub}>{item.key}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    marginTop: normalize(28),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  headerTitle: { fontFamily: FONTS.regular, fontSize: normalize(18), fontWeight: '700', color: COLORS.text },
  refreshText: { fontFamily: FONTS.regular, fontSize: normalize(12), color: COLORS.primary, fontWeight: '600' },
  content: { flex: 1, padding: SPACING.md },
  label: { fontFamily: FONTS.regular, fontSize: normalize(12), color: COLORS.textSecondary, marginBottom: 6 },
  sectionTitle: {
    fontFamily: FONTS.regular,
    fontSize: normalize(13),
    color: COLORS.text,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 8,
  },
  typeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    marginBottom: 12,
  },
  typeSelectorLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeSelectorText: { fontFamily: FONTS.regular, fontSize: normalize(13), color: COLORS.text, fontWeight: '600' },
  itemsList: { maxHeight: normalize(220), marginBottom: 10 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: COLORS.white,
    marginBottom: 8,
  },
  itemTextArea: { flex: 1, paddingRight: 8 },
  itemTitle: { fontFamily: FONTS.regular, fontSize: normalize(13), color: COLORS.text, fontWeight: '600' },
  itemSub: { fontFamily: FONTS.regular, fontSize: normalize(11), color: COLORS.textSecondary, marginTop: 1 },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: normalize(30),
    height: normalize(30),
    borderRadius: normalize(8),
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontFamily: FONTS.regular,
    color: COLORS.text,
  },
  publishRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  secondaryBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  secondaryBtnText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(12),
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  deleteBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  deleteBtnText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(12),
    color: COLORS.error,
    fontWeight: '600',
  },
  emptyState: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 16,
    paddingHorizontal: 10,
    backgroundColor: COLORS.white,
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(12),
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary + '10',
  },
  importBtnText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(12),
    color: COLORS.primary,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: normalize(16),
    borderTopRightRadius: normalize(16),
    maxHeight: '70%',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: normalize(24),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: { fontFamily: FONTS.regular, fontSize: normalize(16), fontWeight: '700', color: COLORS.text },
  modalRow: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  modalRowActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  modalRowText: { fontFamily: FONTS.regular, fontSize: normalize(13), color: COLORS.text, fontWeight: '600' },
  modalRowTextActive: { color: COLORS.primary },
  modalRowSub: { fontFamily: FONTS.regular, fontSize: normalize(11), color: COLORS.textSecondary, marginTop: 2 },
});

export default AdminMasterDataScreen;

