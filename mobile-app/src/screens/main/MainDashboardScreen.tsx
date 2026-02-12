import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  SafeAreaView,
  Image,
  Platform,
  Alert,
} from 'react-native';
import { normalize, wp, hp, SCREEN_WIDTH } from '@utils/responsive';
import { useNavigation } from '@react-navigation/native';
import { Video, ResizeMode } from 'expo-av';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Menu, Bell, User, Clock, MapPin, Calendar, TrendingUp, TrendingDown, IndianRupee, Heart, Plus, Coins } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { Button } from '@components/common/Button';
import { Input } from '@components/common/Input';
import { Card } from '@components/common/Card';
import { LocationData } from '@components/common/LocationPicker';
import { BottomTabNavigator } from '@components/navigation/BottomTabNavigator';
import { useLanguage } from '@context/LanguageContext';
import { useTheme } from '@context/ThemeContext';
import { dashboardApi } from '@utils/apiClient';
import { useNotifications } from '@context/NotificationContext';

const MainDashboardScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { theme, isPinkMode, setPinkMode } = useTheme();
  const { unreadCount } = useNotifications();
  const videoRef = useRef<Video>(null);
  const [fromLocation, setFromLocation] = useState<LocationData | null>(null);
  const [toLocation, setToLocation] = useState<LocationData | null>(null);
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [vehicleType, setVehicleType] = useState<'Car' | 'Bike' | null>(null);
  const [passengers, setPassengers] = useState(1);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [financialData, setFinancialData] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [userGender, setUserGender] = useState<string | null>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const recentSearches = [
    { from: 'Bangalore', to: 'Mumbai' },
    { from: 'Delhi', to: 'Jaipur' },
  ];

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoadingStats(true);
      // Single API call — stats includes user info, financial data, and gender
      const statsResponse = await dashboardApi.getStats();

      if (statsResponse.success && statsResponse.data) {
        setDashboardStats(statsResponse.data);
        // Financial data is inside stats response
        setFinancialData(statsResponse.data.financial);
        // Gender is also returned in user data
        setUserGender(statsResponse.data.user?.gender || null);
      }
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const formatDateDisplay = (d: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateOnly = new Date(d);
    dateOnly.setHours(0, 0, 0, 0);
    const isToday = dateOnly.getTime() === today.getTime();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = dateOnly.getTime() === tomorrow.getTime();

    const formatted = d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    if (isToday) return `Today, ${formatted}`;
    if (isTomorrow) return `Tomorrow, ${formatted}`;
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const onDateChange = (_event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={() => setShowProfileDropdown(false)}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
          <View style={styles.menuButton}>
            <Image
              source={require('../../../assets/signin_logo.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.headerTitle, { color: theme.colors.white }]}>Dashboard</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigation.navigate('Notifications' as never)}
            >
              <Bell size={24} color={theme.colors.white} />
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.profileIconContainer}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={(e) => {
                  e.stopPropagation();
                  setShowProfileDropdown(!showProfileDropdown);
                }}
              >
                <User size={24} color={theme.colors.white} />
              </TouchableOpacity>
              {showProfileDropdown && (
                <TouchableWithoutFeedback onPress={() => setShowProfileDropdown(false)}>
                  <View style={[styles.dropdown, { backgroundColor: theme.colors.surface }]}>
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => {
                        setShowProfileDropdown(false);
                        navigation.navigate('Profile' as never);
                      }}
                    >
                      <User size={18} color={theme.colors.text} />
                      <Text style={[styles.dropdownText, { color: theme.colors.text }]}>View Profile</Text>
                    </TouchableOpacity>
                    {(userGender === 'Female' || isPinkMode) && (
                      <>
                        <View style={[styles.dropdownDivider, { backgroundColor: theme.colors.border }]} />
                        <TouchableOpacity
                          style={styles.dropdownItem}
                          onPress={() => {
                            setShowProfileDropdown(false);
                            if (isPinkMode) {
                              setPinkMode(false);
                            } else {
                              navigation.navigate('PinkPoolingSplash' as never);
                            }
                          }}
                        >
                          <Heart size={18} color={isPinkMode ? theme.colors.primary : theme.colors.text} />
                          <Text style={[styles.dropdownText, { color: theme.colors.text }]}>
                            {isPinkMode ? 'Exit HerPooling' : 'Enter HerPooling'}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </TouchableWithoutFeedback>
              )}
            </View>
          </View>
        </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.welcomeContainer}>
          <Text style={[styles.welcomeText, { color: theme.colors.primary }]}>
            {t('dashboard.welcomeBack')}, {dashboardStats?.user?.name || 'User'}
          </Text>
          <Text style={[styles.welcomeQuote, { color: theme.colors.textSecondary }]}>{t('dashboard.startRide')}</Text>
        </View>

        {/* HerPooling Button - Only visible for Female users */}
        {userGender === 'Female' && (
          <Card style={styles.pinkPoolingCard}>
            <TouchableOpacity
              style={styles.pinkPoolingButton}
              onPress={() => {
                // Gender is already verified, proceed to HerPooling
                navigation.navigate('PinkPoolingSplash' as never);
              }}
            >
              <View style={styles.pinkPoolingContent}>
                <View style={styles.pinkPoolingIconContainer}>
                  <Heart size={32} color="#FF6B9D" fill="#FF6B9D" />
                </View>
                <View style={styles.pinkPoolingTextContainer}>
                  <Text style={styles.pinkPoolingTitle}>HerPooling</Text>
                  <Text style={styles.pinkPoolingSubtitle}>Safe rides for women & girls</Text>
                </View>
              </View>
            </TouchableOpacity>
          </Card>
        )}

        {/* Financial Cards */}
        {financialData && (
          <View style={styles.financialCardsContainer}>
            <Card style={[styles.financialCard, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.financialCardHeader}>
                <TrendingUp size={24} color={financialData.walletBalance >= 0 ? theme.colors.success : theme.colors.error} />
                <Text style={[styles.financialCardTitle, { color: theme.colors.textSecondary }]}>Wallet Balance</Text>
              </View>
              <View style={styles.financialCardAmount}>
                <IndianRupee size={28} color={financialData.walletBalance >= 0 ? theme.colors.success : theme.colors.error} />
                <Text style={[styles.financialCardValue, { color: financialData.walletBalance >= 0 ? theme.colors.success : theme.colors.error }]}>
                  {financialData.walletBalance || 0}
                </Text>
              </View>
              <Text style={[styles.financialCardSubtitle, { color: theme.colors.textSecondary }]}>
                {financialData.canBookRide
                  ? (financialData.canGiveRide !== false ? 'Ready to ride' : 'Ready to book rides')
                  : (financialData.walletBalance >= 0
                    ? `Recharge to ₹${financialData.minimumRequired || 100} to take rides`
                    : 'Recharge wallet to continue')}
              </Text>
              <View style={styles.walletButtonsRow}>
                <TouchableOpacity
                  style={[styles.rechargeButton, { backgroundColor: theme.colors.success }]}
                  onPress={() => (navigation.navigate as any)('Wallet', {})}
                >
                  <Plus size={16} color={theme.colors.white} />
                  <Text style={[styles.withdrawButtonText, { color: theme.colors.white }]}>Recharge</Text>
                </TouchableOpacity>
                {(financialData.walletBalance || 0) > 0 && (
                  <TouchableOpacity
                    style={[styles.withdrawButton, { backgroundColor: theme.colors.primary }]}
                    onPress={() => (navigation.navigate as any)('Withdrawal', {})}
                  >
                    <Text style={[styles.withdrawButtonText, { color: theme.colors.white }]}>Withdraw</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Card>
          </View>
        )}

        {/* Coin Balance Badge */}
        {dashboardStats?.coins && (
          <TouchableOpacity
            style={styles.coinBadgeCard}
            onPress={() => (navigation.navigate as any)('Wallet', { tab: 'coins' })}
          >
            <View style={styles.coinBadgeLeft}>
              <View style={styles.coinIconContainer}>
                <Coins size={22} color="#F5A623" />
              </View>
              <View>
                <Text style={styles.coinBadgeBalance}>{dashboardStats.coins.balance} coins</Text>
                <Text style={styles.coinBadgeWorth}>Worth ₹{dashboardStats.coins.worthInRupees}</Text>
              </View>
            </View>
            <Text style={styles.coinBadgeArrow}>→</Text>
          </TouchableOpacity>
        )}

        <View style={styles.videoContainer}>
          <Video
            ref={videoRef}
            source={require('../../../assets/videos/dashboard.mp4')}
            style={styles.video}
            resizeMode={ResizeMode.COVER}
            isLooping
            isMuted
            shouldPlay
          />
          <View style={[styles.blurOverlay, { backgroundColor: 'rgba(255, 255, 255, 0.67)' }]}>
            <View style={styles.locationFieldsContainer}>
              <TouchableOpacity
                onPress={() => (navigation.navigate as any)('LocationPicker', {
                  title: 'Select From Location',
                  onLocationSelect: (location: LocationData) => setFromLocation(location),
                })}
                style={styles.locationFieldWrapper}
              >
                <Input
                  label={t('dashboard.from')}
                  value={fromLocation?.address || ''}
                  placeholder={t('dashboard.selectLocation')}
                  editable={false}
                  containerStyle={styles.locationInput}
                  inputStyle={styles.compactInput}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => (navigation.navigate as any)('LocationPicker', {
                  title: 'Select To Location',
                  onLocationSelect: (location: LocationData) => setToLocation(location),
                })}
                style={styles.locationFieldWrapper}
              >
                <Input
                  label={t('dashboard.to')}
                  value={toLocation?.address || ''}
                  placeholder={t('dashboard.selectLocation')}
                  editable={false}
                  containerStyle={styles.locationInput}
                  inputStyle={styles.compactInput}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.searchSection}>

          <TouchableOpacity onPress={() => setShowDatePicker(true)}>
            <Input
              label={t('dashboard.date')}
              value={formatDateDisplay(date)}
              placeholder="Select date"
              editable={false}
              containerStyle={styles.locationInput}
              leftIcon={<Calendar size={20} color={theme.colors.primary} />}
            />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              minimumDate={new Date()}
            />
          )}
          <View style={styles.vehicleTypeContainer}>
            <Text style={[styles.label, { color: theme.colors.text }]}>{t('dashboard.vehicleType')}</Text>

            <View style={styles.vehicleTypeOptions}>
              <TouchableOpacity
                style={[
                  styles.vehicleTypeButton,
                  { borderColor: theme.colors.border },
                  vehicleType === 'Car' && [styles.vehicleTypeSelected, { borderColor: theme.colors.primary, borderWidth: 3 }],
                ]}
                onPress={() => {
                  setVehicleType('Car');
                  setPassengers(1);
                }}
              >
                <Image
                  source={require('../../../assets/car.jpg')}
                  style={styles.vehicleImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.vehicleTypeButton,
                  { borderColor: theme.colors.border },
                  vehicleType === 'Bike' && [styles.vehicleTypeSelected, { borderColor: theme.colors.primary, borderWidth: 3 }],
                ]}
                onPress={() => {
                  setVehicleType('Bike');
                  setPassengers(1);
                }}
              >
                <Image
                  source={require('../../../assets/bike.jpg')}
                  style={styles.vehicleImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.passengerContainer}>
            <Text style={[styles.label, { color: theme.colors.text }]}>{t('dashboard.passengers')}</Text>
            <View style={styles.passengerRangeContainer}>
              <View style={styles.passengerRangeRow}>
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.passengerRangeButton,
                      { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
                      passengers === num && [styles.passengerRangeSelected, { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '15' }],
                      vehicleType === 'Bike' && styles.passengerRangeDisabled,
                    ]}
                    onPress={() => vehicleType === 'Car' && setPassengers(num)}
                    disabled={vehicleType === 'Bike'}
                  >
                    <Text
                      style={[
                        styles.passengerRangeText,
                        { color: theme.colors.text },
                        passengers === num && [styles.passengerRangeTextSelected, { color: theme.colors.primary }],
                        vehicleType === 'Bike' && [styles.passengerRangeTextDisabled, { color: theme.colors.textSecondary }],
                      ]}
                    >
                      {num}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {vehicleType === 'Bike' && (
                <Text style={[styles.disabledHint, { color: theme.colors.textSecondary }]}>Not available for Bike</Text>
              )}
            </View>
          </View>

          <Button
            title={t('dashboard.searchPools')}
            onPress={() => (navigation.navigate as any)('SearchPooling', {
              from: fromLocation || undefined,
              to: toLocation || undefined,
              date: date.toISOString().split('T')[0],
              vehicleType: vehicleType || undefined,
              passengers,
            })}
            variant="primary"
            size="large"
            style={styles.searchButton}
          />
        </View>

        <View style={styles.recentSearches}>
          <Text style={[styles.recentTitle, { color: theme.colors.text }]}>{t('dashboard.recentSearches')}:</Text>
          {recentSearches.map((search, index) => (
            <TouchableOpacity
              key={index}
              style={styles.recentItem}
              onPress={() => {
                setFromLocation({ address: search.from, lat: 0, lng: 0 });
                setToLocation({ address: search.to, lat: 0, lng: 0 });
              }}
            >
              <Clock size={16} color={theme.colors.textSecondary} />
              <Text style={[styles.recentText, { color: theme.colors.textSecondary }]}>
                {search.from} → {search.to}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

        <BottomTabNavigator />
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    paddingTop: SPACING.xl,
  },
  headerTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    zIndex: -1,
  },
  menuButton: {
    padding: SPACING.xs,
  },
  headerLogo: {
    width: normalize(32),
    height: normalize(32),
    borderRadius: normalize(16),
  },
  headerRight: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  iconButton: {
    padding: SPACING.xs,
    position: 'relative' as const,
  },
  notifBadge: {
    position: 'absolute' as const,
    top: normalize(-4),
    right: normalize(-6),
    backgroundColor: '#FF3B30',
    borderRadius: normalize(10),
    minWidth: normalize(20),
    height: normalize(20),
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: normalize(4),
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  notifBadgeText: {
    color: COLORS.white,
    fontSize: normalize(10),
    fontWeight: 'bold' as const,
    fontFamily: FONTS.regular,
  },
  profileIconContainer: {
    position: 'relative',
  },
  dropdown: {
    position: 'absolute',
    top: normalize(45),
    right: 0,
    minWidth: wp(48),
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.xs,
    ...SHADOWS.lg,
    zIndex: 1000,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  dropdownText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
  },
  dropdownDivider: {
    height: 1,
    marginVertical: SPACING.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: 0,
  },
  videoContainer: {
    width: SCREEN_WIDTH - SPACING.md * 2,
    height: 220,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  welcomeContainer: {
    marginBottom: SPACING.lg,
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.md,
  },
  welcomeText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xxl,
    marginBottom: SPACING.xs / 2,
    textAlign: 'left',
  },
  welcomeQuote: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    textAlign: 'left',
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: 0,
  },
  locationFieldsContainer: {
    gap: SPACING.sm,
  },
  locationFieldWrapper: {
    width: '100%',
  },
  searchSection: {
    marginBottom: SPACING.lg,
  },
  locationInput: {
    marginBottom: 0,
  },
  compactInput: {
    paddingVertical: SPACING.sm,
  },
  vehicleTypeContainer: {
    marginBottom: SPACING.md,
    marginTop: SPACING.md,
  },
  label: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    marginBottom: SPACING.xs,
  },
  vehicleTypeOptions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  vehicleTypeButton: {
    flex: 1,
    height: 140,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  vehicleTypeSelected: {
    // Border color applied inline
  },
  vehicleImage: {
    width: '100%',
    height: '100%',
  },
  passengerContainer: {
    marginBottom: SPACING.lg,
  },
  passengerRangeContainer: {
    marginTop: SPACING.sm,
  },
  passengerRangeRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  passengerRangeButton: {
    width: 50,
    height: 50,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passengerRangeSelected: {
    // Colors applied inline
  },
  passengerRangeDisabled: {
    opacity: 0.5,
  },
  passengerRangeText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
  },
  passengerRangeTextSelected: {
    fontWeight: 'bold',
  },
  passengerRangeTextDisabled: {
    // Color applied inline
  },
  disabledHint: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    marginTop: SPACING.sm,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  searchButton: {
    marginTop: SPACING.md,
  },
  recentSearches: {
    marginTop: SPACING.lg,
  },
  recentTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    marginBottom: SPACING.sm,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  recentText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    marginLeft: SPACING.sm,
  },
  pinkPoolingCard: {
    marginBottom: SPACING.lg,
    backgroundColor: '#FFF5F8',
    borderWidth: 2,
    borderColor: '#FFDEE7',
  },
  pinkPoolingButton: {
    width: '100%',
  },
  pinkPoolingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  pinkPoolingIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFDEE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  pinkPoolingTextContainer: {
    flex: 1,
  },
  pinkPoolingTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xl,
    color: '#FF6B9D',
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  pinkPoolingSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
  },
  financialCardsContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  financialCard: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  financialCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  financialCardTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  financialCardAmount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  financialCardValue: {
    fontFamily: FONTS.medium,
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
  },
  financialCardSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
  },
  walletButtonsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  rechargeButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  withdrawButton: {
    flex: 1,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  withdrawButtonText: {
    fontFamily: FONTS.medium,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  coinBadgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF8E7',
    borderWidth: 1,
    borderColor: '#F5A623' + '40',
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  coinBadgeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  coinIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5A623' + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinBadgeBalance: {
    fontFamily: FONTS.medium,
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
    color: '#8B5E00',
  },
  coinBadgeWorth: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: '#A0763D',
  },
  coinBadgeArrow: {
    fontSize: 18,
    color: '#F5A623',
    fontWeight: 'bold',
  },
});

export default MainDashboardScreen;

