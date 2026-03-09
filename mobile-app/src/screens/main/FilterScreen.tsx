import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Check, X } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '@constants/theme';
import { normalize, wp, hp } from '@utils/responsive';
import { Button } from '@components/common/Button';
import { Card } from '@components/common/Card';
import { useLanguage } from '@context/LanguageContext';
import useMasterData from '../../hooks/useMasterData';

const FilterScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { items: vehicleTypeMasterItems } = useMasterData('vehicle_type', [
    { type: 'vehicle_type', key: 'car', label: 'Car' },
    { type: 'vehicle_type', key: 'bike', label: 'Bike' },
  ]);
  const vehicleTypeOptions = vehicleTypeMasterItems
    .map((item: any) => ({ code: String(item.value || item.key || '').toLowerCase(), label: String(item.label || item.value || item.key || '') }))
    .filter((item: any) => item.code && item.label);
  const { items: ratingBucketItems } = useMasterData('rating_bucket', [
    { type: 'rating_bucket', key: '4_5', label: '4.5+' },
    { type: 'rating_bucket', key: '4_0', label: '4.0+' },
    { type: 'rating_bucket', key: '3_5', label: '3.5+' },
  ]);
  const { items: timeSlotItems } = useMasterData('time_slot', [
    { type: 'time_slot', key: 'morning', label: t('filter.morning') },
    { type: 'time_slot', key: 'afternoon', label: t('filter.afternoon') },
    { type: 'time_slot', key: 'evening', label: t('filter.evening') },
  ]);
  const { items: rideFeatureItems } = useMasterData('ride_feature', [
    { type: 'ride_feature', key: 'ac', label: t('filter.acAvailable') },
    { type: 'ride_feature', key: 'music', label: t('filter.musicSystem') },
    { type: 'ride_feature', key: 'luggage', label: t('filter.luggageSpace') },
  ]);
  const { items: sortOptionItems } = useMasterData('sort_option', [
    { type: 'sort_option', key: 'priceLow', label: t('filter.priceLowToHigh') },
    { type: 'sort_option', key: 'priceHigh', label: t('filter.priceHighToLow') },
    { type: 'sort_option', key: 'rating', label: t('filter.rating') },
    { type: 'sort_option', key: 'distance', label: t('filter.distance') },
  ]);
  const ratingOptions = ratingBucketItems
    .map((item: any) => ({
      key: String(item.value || item.key || '').replace('_', '.'),
      label: String(item.label || item.value || item.key || ''),
    }))
    .filter((item: any) => item.key && item.label);
  const departureOptions = timeSlotItems
    .map((item: any) => ({ key: String(item.value || item.key || ''), label: String(item.label || item.value || item.key || '') }))
    .filter((item: any) => item.key && item.label);
  const featureOptions = rideFeatureItems
    .map((item: any) => ({ key: String(item.value || item.key || ''), label: String(item.label || item.value || item.key || '') }))
    .filter((item: any) => item.key && item.label);
  const sortOptions = sortOptionItems
    .map((item: any) => ({ key: String(item.value || item.key || ''), label: String(item.label || item.value || item.key || '') }))
    .filter((item: any) => item.key && item.label);

  const makeVehicleTypeState = (defaultCode = 'car') => {
    const state: Record<string, boolean> = {};
    vehicleTypeOptions.forEach((opt: any) => {
      state[opt.code] = opt.code === defaultCode;
    });
    return state;
  };

  const [minPrice, setMinPrice] = useState(500);
  const [maxPrice, setMaxPrice] = useState(2000);
  const [vehicleType, setVehicleType] = useState<Record<string, boolean>>({});
  const [rating, setRating] = useState({ '4.5': true, '4.0': false, '3.5': false });
  const [departureTime, setDepartureTime] = useState({
    morning: false,
    afternoon: true,
    evening: false,
  });
  const [features, setFeatures] = useState({
    ac: true,
    music: false,
    luggage: true,
  });
  const [sortBy, setSortBy] = useState('priceHigh');

  React.useEffect(() => {
    if (Object.keys(vehicleType).length === 0 && vehicleTypeOptions.length > 0) {
      setVehicleType(makeVehicleTypeState(vehicleTypeOptions[0].code));
    }
  }, [vehicleTypeOptions.length]);

  const handleReset = () => {
    setMinPrice(500);
    setMaxPrice(2000);
    setVehicleType(makeVehicleTypeState(vehicleTypeOptions[0]?.code || 'car'));
    setRating({ '4.5': true, '4.0': false, '3.5': false });
    setDepartureTime({ morning: false, afternoon: true, evening: false });
    setFeatures({ ac: true, music: false, luggage: true });
    setSortBy('priceHigh');
  };

  const handleApply = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <X size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('filter.title')}</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
            <Text style={styles.resetText}>{t('filter.reset')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.filterCard}>
          <Text style={styles.filterTitle}>{t('filter.priceRange')}:</Text>
          <View style={styles.priceRangeContainer}>
            <View style={styles.priceInputContainer}>
              <Text style={styles.priceLabel}>{t('filter.min')}:</Text>
              <TextInput
                style={styles.priceInput}
                value={minPrice.toString()}
                onChangeText={(text) => setMinPrice(parseInt(text) || 0)}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
            <Text style={styles.priceSeparator}>-</Text>
            <View style={styles.priceInputContainer}>
              <Text style={styles.priceLabel}>{t('filter.max')}:</Text>
              <TextInput
                style={styles.priceInput}
                value={maxPrice.toString()}
                onChangeText={(text) => setMaxPrice(parseInt(text) || 0)}
                keyboardType="numeric"
                placeholder="5000"
              />
            </View>
          </View>
          <Text style={styles.priceHint}>₹0 ────────────●───────● ₹5000</Text>
        </Card>

        <Card style={styles.filterCard}>
          <Text style={styles.filterTitle}>{t('filter.vehicleType')}:</Text>
          <View style={styles.checkboxRow}>
            {vehicleTypeOptions.map((opt: any) => (
              <TouchableOpacity
                key={opt.code}
                style={styles.checkbox}
                onPress={() => setVehicleType({ ...vehicleType, [opt.code]: !vehicleType[opt.code] })}
              >
                {vehicleType[opt.code] ? (
                  <Check size={20} color={COLORS.primary} />
                ) : (
                  <View style={styles.checkboxEmpty} />
                )}
                <Text style={styles.checkboxLabel}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Card style={styles.filterCard}>
          <Text style={styles.filterTitle}>{t('filter.rating')}:</Text>
          <View style={styles.ratingRow}>
            {ratingOptions.map((rate) => (
              <TouchableOpacity
                key={rate.key}
                style={styles.ratingOption}
                onPress={() => setRating({ ...rating, [rate.key]: !rating[rate.key as keyof typeof rating] })}
              >
                {rating[rate.key as keyof typeof rating] ? (
                  <Check size={20} color={COLORS.primary} />
                ) : (
                  <View style={styles.checkboxEmpty} />
                )}
                <Text style={styles.ratingLabel}>{rate.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Card style={styles.filterCard}>
          <Text style={styles.filterTitle}>{t('filter.departureTime')}:</Text>
          {departureOptions.map((time) => (
            <TouchableOpacity
              key={time.key}
              style={styles.timeOption}
              onPress={() =>
                setDepartureTime({
                  ...departureTime,
                  [time.key]: !departureTime[time.key as keyof typeof departureTime],
                })
              }
            >
              {departureTime[time.key as keyof typeof departureTime] ? (
                <Check size={20} color={COLORS.primary} />
              ) : (
                <View style={styles.checkboxEmpty} />
              )}
              <Text style={styles.timeLabel}>{time.label}</Text>
            </TouchableOpacity>
          ))}
        </Card>

        <Card style={styles.filterCard}>
          <Text style={styles.filterTitle}>{t('filter.features')}:</Text>
          {featureOptions.map((feature) => (
            <TouchableOpacity
              key={feature.key}
              style={styles.featureOption}
              onPress={() =>
                setFeatures({
                  ...features,
                  [feature.key]: !features[feature.key as keyof typeof features],
                })
              }
            >
              {features[feature.key as keyof typeof features] ? (
                <Check size={20} color={COLORS.primary} />
              ) : (
                <View style={styles.checkboxEmpty} />
              )}
              <Text style={styles.featureLabel}>{feature.label}</Text>
            </TouchableOpacity>
          ))}
        </Card>

        <Card style={styles.filterCard}>
          <Text style={styles.filterTitle}>{t('filter.sortBy')}:</Text>
          {sortOptions.map((sort) => (
            <TouchableOpacity
              key={sort.key}
              style={styles.sortOption}
              onPress={() => setSortBy(sort.key)}
            >
              <View style={styles.radio}>
                {sortBy === sort.key && <View style={styles.radioSelected} />}
              </View>
              <Text style={styles.sortLabel}>{sort.label}</Text>
            </TouchableOpacity>
          ))}
        </Card>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Button
          title={t('filter.apply')}
          onPress={handleApply}
          variant="primary"
          size="large"
          style={styles.applyButton}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    paddingTop: SPACING.xl,
  },
  headerTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xl,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  headerRight: { flexDirection: 'row', gap: SPACING.md },
  resetButton: { padding: SPACING.xs },
  resetText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.white,
  },
  scrollContent: { padding: SPACING.md },
  filterCard: { padding: SPACING.md, marginBottom: SPACING.md },
  filterTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  priceRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  priceInputContainer: {
    flex: 1,
  },
  priceLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  priceInput: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    backgroundColor: COLORS.white,
  },
  priceSeparator: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.lg,
  },
  priceHint: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  checkboxRow: { flexDirection: 'row', gap: SPACING.lg },
  checkbox: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  checkboxEmpty: {
    width: normalize(20),
    height: normalize(20),
    borderRadius: normalize(4),
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  checkboxLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  ratingRow: { flexDirection: 'row', gap: SPACING.md },
  ratingOption: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  ratingLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  timeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  timeLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  featureOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  featureLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  sortLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  buttonContainer: { padding: SPACING.md, paddingBottom: SPACING.xl },
  applyButton: { width: '100%' },
});

export default FilterScreen;

