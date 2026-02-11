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
import { Button } from '@components/common/Button';
import { Card } from '@components/common/Card';
import { useLanguage } from '@context/LanguageContext';

const FilterScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const [minPrice, setMinPrice] = useState(500);
  const [maxPrice, setMaxPrice] = useState(2000);
  const [vehicleType, setVehicleType] = useState({ car: true, bike: false });
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

  const handleReset = () => {
    setMinPrice(500);
    setMaxPrice(2000);
    setVehicleType({ car: true, bike: false });
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
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setVehicleType({ ...vehicleType, car: !vehicleType.car })}
            >
              {vehicleType.car ? (
                <Check size={20} color={COLORS.primary} />
              ) : (
                <View style={styles.checkboxEmpty} />
              )}
              <Text style={styles.checkboxLabel}>{t('filter.car')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setVehicleType({ ...vehicleType, bike: !vehicleType.bike })}
            >
              {vehicleType.bike ? (
                <Check size={20} color={COLORS.primary} />
              ) : (
                <View style={styles.checkboxEmpty} />
              )}
              <Text style={styles.checkboxLabel}>{t('filter.bike')}</Text>
            </TouchableOpacity>
          </View>
        </Card>

        <Card style={styles.filterCard}>
          <Text style={styles.filterTitle}>{t('filter.rating')}:</Text>
          <View style={styles.ratingRow}>
            {['4.5', '4.0', '3.5'].map((rate) => (
              <TouchableOpacity
                key={rate}
                style={styles.ratingOption}
                onPress={() => setRating({ ...rating, [rate]: !rating[rate as keyof typeof rating] })}
              >
                {rating[rate as keyof typeof rating] ? (
                  <Check size={20} color={COLORS.primary} />
                ) : (
                  <View style={styles.checkboxEmpty} />
                )}
                <Text style={styles.ratingLabel}>{rate}+</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Card style={styles.filterCard}>
          <Text style={styles.filterTitle}>{t('filter.departureTime')}:</Text>
          {[
            { key: 'morning', label: t('filter.morning') },
            { key: 'afternoon', label: t('filter.afternoon') },
            { key: 'evening', label: t('filter.evening') },
          ].map((time) => (
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
          {[
            { key: 'ac', label: t('filter.acAvailable') },
            { key: 'music', label: t('filter.musicSystem') },
            { key: 'luggage', label: t('filter.luggageSpace') },
          ].map((feature) => (
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
          {[
            { key: 'priceLow', label: t('filter.priceLowToHigh') },
            { key: 'priceHigh', label: t('filter.priceHighToLow') },
            { key: 'rating', label: t('filter.rating') },
            { key: 'distance', label: t('filter.distance') },
          ].map((sort) => (
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
    width: 20,
    height: 20,
    borderRadius: 4,
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

