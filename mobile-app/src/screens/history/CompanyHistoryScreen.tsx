import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ImageBackground } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Calendar, Search, Car, Clock, User } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '@constants/theme';
import { Card } from '@components/common/Card';
import { Button } from '@components/common/Button';
import { useLanguage } from '@context/LanguageContext';

// Mock company bookings data
const mockCompanyBookings = [
  {
    id: '1',
    vehicle: 'Honda City',
    vehicleNumber: 'KA-01-AB-1234',
    bookedBy: 'Ravi Kumar',
    date: '15 Jan 2024',
    duration: '4 hours',
    status: 'confirmed',
    amount: 3200,
  },
  {
    id: '2',
    vehicle: 'Maruti Swift',
    vehicleNumber: 'KA-02-CD-5678',
    bookedBy: 'Priya Sharma',
    date: '14 Jan 2024',
    duration: '6 hours',
    status: 'completed',
    amount: 4800,
  },
  {
    id: '3',
    vehicle: 'Royal Enfield',
    vehicleNumber: 'KA-03-EF-9012',
    bookedBy: 'Amit Singh',
    date: '13 Jan 2024',
    duration: '3 hours',
    status: 'cancelled',
    amount: 1200,
  },
];

const CompanyHistoryScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('All');

  const tabs = [t('common.all'), t('history.upcoming'), t('history.past'), t('history.cancelled')];
  const filteredBookings = mockCompanyBookings.filter((booking) => {
    if (activeTab === t('common.all')) return true;
    const tabMap: { [key: string]: string } = {
      [t('history.upcoming')]: 'confirmed',
      [t('history.past')]: 'completed',
      [t('history.cancelled')]: 'cancelled',
    };
    return booking.status === tabMap[activeTab];
  });

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={require('../../../assets/history iamge.jpg')}
        style={styles.headerImage}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        <BlurView intensity={50} style={styles.blurContainer}>
          <View style={styles.headerTop}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              style={styles.iconButton}
            >
              <ArrowLeft size={20} color={COLORS.white} />
            </TouchableOpacity>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.iconButton}>
                <Calendar size={20} color={COLORS.white} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton}>
                <Search size={20} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{t('companyHistory.title')}</Text>
          </View>
        </BlurView>
      </ImageBackground>
      <View style={styles.tabs}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {filteredBookings.map((booking) => (
          <Card key={booking.id} style={styles.bookingCard}>
            <View style={styles.bookingHeader}>
              <View style={styles.vehicleInfo}>
                <Car size={24} color={COLORS.primary} />
                <View style={styles.vehicleDetails}>
                  <Text style={styles.vehicleName}>{booking.vehicle}</Text>
                  <Text style={styles.vehicleNumber}>{booking.vehicleNumber}</Text>
                </View>
              </View>
              <View style={styles.bookingDateContainer}>
                <Clock size={16} color={COLORS.textSecondary} />
                <Text style={styles.bookingDate}>{booking.date}</Text>
              </View>
            </View>
            <View style={styles.bookingDetails}>
              <View style={styles.detailRow}>
                <User size={16} color={COLORS.textSecondary} />
                <Text style={styles.detailText}>{t('companyHistory.bookedBy')}: {booking.bookedBy}</Text>
              </View>
              <View style={styles.detailRow}>
                <Clock size={16} color={COLORS.textSecondary} />
                <Text style={styles.detailText}>{t('companyHistory.duration')}: {booking.duration}</Text>
              </View>
              <Text style={styles.amountText}>₹{booking.amount}</Text>
            </View>
            <View style={styles.bookingFooter}>
              <View style={[styles.statusBadge, booking.status === 'confirmed' && styles.statusConfirmed, booking.status === 'completed' && styles.statusCompleted, booking.status === 'cancelled' && styles.statusCancelled]}>
                <Text style={styles.statusText}>{booking.status}</Text>
              </View>
              <Button 
                title={t('companyHistory.viewDetails')} 
                onPress={() => navigation.navigate('BookingDetails' as never, { booking } as never)} 
                variant="outline" 
                size="small" 
                style={styles.detailsButton} 
              />
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerImage: {
    width: '100%',
    height: 200,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.primary,
    opacity: 0.6,
  },
  blurContainer: {
    flex: 1,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.sm,
  },
  headerCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xl,
    color: COLORS.white,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: { 
    flexDirection: 'row', 
    backgroundColor: COLORS.white, 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border 
  },
  tab: { 
    flex: 1, 
    padding: SPACING.md, 
    alignItems: 'center', 
    borderBottomWidth: 2, 
    borderBottomColor: 'transparent' 
  },
  activeTab: { 
    borderBottomColor: COLORS.primary 
  },
  tabText: { 
    fontFamily: FONTS.regular, 
    fontSize: FONTS.sizes.sm, 
    color: COLORS.textSecondary 
  },
  activeTabText: { 
    color: COLORS.primary, 
    fontWeight: 'bold' 
  },
  scrollContent: { 
    padding: SPACING.md 
  },
  bookingCard: { 
    padding: SPACING.md, 
    marginBottom: SPACING.md 
  },
  bookingHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: SPACING.sm 
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  vehicleDetails: {
    flex: 1,
  },
  vehicleName: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  vehicleNumber: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  bookingDateContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: SPACING.xs 
  },
  bookingDate: { 
    fontFamily: FONTS.regular, 
    fontSize: FONTS.sizes.sm, 
    color: COLORS.textSecondary 
  },
  bookingDetails: {
    marginBottom: SPACING.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  detailText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  amountText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginTop: SPACING.xs,
  },
  bookingFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: SPACING.sm 
  },
  statusBadge: { 
    paddingHorizontal: SPACING.sm, 
    paddingVertical: SPACING.xs, 
    borderRadius: 4 
  },
  statusConfirmed: { 
    backgroundColor: COLORS.secondary + '20' 
  },
  statusCompleted: { 
    backgroundColor: COLORS.success + '20' 
  },
  statusCancelled: { 
    backgroundColor: COLORS.error + '20' 
  },
  statusText: { 
    fontFamily: FONTS.regular, 
    fontSize: FONTS.sizes.xs, 
    color: COLORS.text, 
    textTransform: 'capitalize' 
  },
  detailsButton: { 
    marginLeft: SPACING.xs 
  },
});

export default CompanyHistoryScreen;




