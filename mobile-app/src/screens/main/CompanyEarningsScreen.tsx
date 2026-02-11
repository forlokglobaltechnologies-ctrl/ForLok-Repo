import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, IndianRupee, TrendingUp, Calendar, CheckCircle, Clock } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { Card } from '@components/common/Card';
import { companyApi } from '@utils/apiClient';

const CompanyEarningsScreen = () => {
  const navigation = useNavigation();
  const [earnings, setEarnings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'settled'>('all');

  useEffect(() => {
    loadEarnings();
  }, [filter]);

  const loadEarnings = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (filter !== 'all') {
        filters.status = filter;
      }

      const response = await companyApi.getEarnings(filters);
      
      if (response.success && response.data) {
        setEarnings(response.data);
      } else {
        setEarnings(null);
      }
    } catch (error: any) {
      console.error('Error loading earnings:', error);
      setEarnings(null);
    } finally {
      setLoading(false);
    }
  };

  const filteredEarnings = earnings?.earnings?.filter((earning: any) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return earning.settlementStatus !== 'settled';
    if (filter === 'settled') return earning.settlementStatus === 'settled';
    return true;
  }) || [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Earnings</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Summary Card */}
      {earnings?.summary && (
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Earnings</Text>
              <View style={styles.summaryValueContainer}>
                <IndianRupee size={20} color={COLORS.success} />
                <Text style={[styles.summaryValue, { color: COLORS.success }]}>
                  {earnings.summary.totalEarnings.toLocaleString()}
                </Text>
              </View>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Revenue</Text>
              <View style={styles.summaryValueContainer}>
                <IndianRupee size={20} color={COLORS.primary} />
                <Text style={[styles.summaryValue, { color: COLORS.primary }]}>
                  {earnings.summary.totalRevenue.toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Platform Fee</Text>
              <Text style={styles.summarySubValue}>
                ₹{earnings.summary.totalPlatformFee.toLocaleString()}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Bookings</Text>
              <Text style={styles.summarySubValue}>
                {earnings.summary.totalBookings}
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* Filters */}
      <View style={styles.filters}>
        {['all', 'pending', 'settled'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filter === f && styles.activeFilter]}
            onPress={() => setFilter(f as any)}
          >
            <Text style={[styles.filterText, filter === f && styles.activeFilterText]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Earnings List */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading earnings...</Text>
          </View>
        ) : filteredEarnings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IndianRupee size={64} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>No earnings found</Text>
          </View>
        ) : (
          filteredEarnings.map((earning: any, index: number) => (
            <Card key={earning.bookingId || index} style={styles.earningCard}>
              <View style={styles.earningHeader}>
                <View>
                  <Text style={styles.bookingNumber}>
                    #{earning.bookingNumber || earning.bookingId || 'N/A'}
                  </Text>
                  <Text style={styles.renterName}>
                    {earning.renter?.name || 'Unknown Renter'}
                  </Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  earning.settlementStatus === 'settled' && { backgroundColor: COLORS.success + '20' },
                  earning.settlementStatus !== 'settled' && { backgroundColor: COLORS.warning + '20' },
                ]}>
                  {earning.settlementStatus === 'settled' ? (
                    <CheckCircle size={14} color={COLORS.success} />
                  ) : (
                    <Clock size={14} color={COLORS.warning} />
                  )}
                  <Text style={[
                    styles.statusText,
                    earning.settlementStatus === 'settled' && { color: COLORS.success },
                    earning.settlementStatus !== 'settled' && { color: COLORS.warning },
                  ]}>
                    {earning.settlementStatus === 'settled' ? 'Settled' : 'Pending'}
                  </Text>
                </View>
              </View>

              <View style={styles.earningDetails}>
                <View style={styles.earningRow}>
                  <Text style={styles.earningLabel}>Amount:</Text>
                  <Text style={styles.earningValue}>
                    ₹{earning.amount?.toLocaleString() || 0}
                  </Text>
                </View>
                <View style={styles.earningRow}>
                  <Text style={styles.earningLabel}>Platform Fee:</Text>
                  <Text style={styles.earningSubValue}>
                    ₹{earning.platformFee?.toLocaleString() || 0}
                  </Text>
                </View>
                <View style={[styles.earningRow, styles.earningTotal]}>
                  <Text style={styles.earningLabel}>Your Earnings:</Text>
                  <View style={styles.earningValueContainer}>
                    <IndianRupee size={18} color={COLORS.success} />
                    <Text style={[styles.earningValue, { color: COLORS.success }]}>
                      {earning.earnings?.toLocaleString() || 0}
                    </Text>
                  </View>
                </View>
                {earning.date && (
                  <View style={styles.earningRow}>
                    <Calendar size={14} color={COLORS.textSecondary} />
                    <Text style={styles.earningDate}>
                      {new Date(earning.date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                )}
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    paddingTop: SPACING.xl + 8,
    backgroundColor: COLORS.primary,
    ...SHADOWS.md,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xl,
    color: COLORS.white,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerRight: {
    width: 40,
  },
  summaryCard: {
    margin: SPACING.md,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.white,
    ...SHADOWS.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  summaryValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  summaryValue: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
  },
  summarySubValue: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: '600',
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.background,
  },
  activeFilter: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  activeFilterText: {
    color: COLORS.white,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: { 
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  earningCard: {
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.white,
    ...SHADOWS.md,
  },
  earningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  bookingNumber: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  renterName: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
  earningDetails: {
    gap: SPACING.sm,
  },
  earningRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningTotal: {
    marginTop: SPACING.xs,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  earningLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  earningValue: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    color: COLORS.text,
    fontWeight: '700',
  },
  earningValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  earningSubValue: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    fontWeight: '500',
  },
  earningDate: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  loadingContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
    gap: SPACING.md,
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    color: COLORS.textSecondary,
  },
});

export default CompanyEarningsScreen;
