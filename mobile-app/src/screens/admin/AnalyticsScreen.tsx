import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ImageBackground,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import Svg, {
  Circle,
  Path,
  Line,
  Polyline,
  Text as SvgText,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  G,
  Rect,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Car,
  KeyRound,
  Clock,
  Star,
  Activity,
  Award,
  BarChart3,
  Download,
  ChevronRight,
  Zap,
  Target,
  MapPin,
  Bike,
  RefreshCw,
} from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { useLanguage } from '@context/LanguageContext';
import { analyticsApi } from '@utils/apiClient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 200 : 220;

/* ── helpers ─────────────────────────────────────────────── */
const safeNum = (val: any): number => {
  if (val == null) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val) || 0;
  // If it's an object, try common keys
  if (typeof val === 'object') {
    return Number(val.amount ?? val.total ?? val.value ?? val.count ?? 0) || 0;
  }
  return 0;
};

const formatNumber = (n: any): string => {
  const v = safeNum(n);
  if (v >= 10000000) return `${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return v.toString();
};

const formatCurrency = (n: any): string => {
  const v = safeNum(n);
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v}`;
};

/* ── component ───────────────────────────────────────────── */
const AnalyticsScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();

  /* ── state ────────────────────────────────────────────── */
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('Overview');
  const [trendPeriod, setTrendPeriod] = useState<'week' | 'month'>('week');

  // API data
  const [realtimeStats, setRealtimeStats] = useState<any>(null);
  const [todayStats, setTodayStats] = useState<any>(null);
  const [trendData, setTrendData] = useState<any>(null);
  const [poolingStats, setPoolingStats] = useState<any>(null);
  const [financialData, setFinancialData] = useState<any>(null);
  const [userGrowthData, setUserGrowthData] = useState<any>(null);
  const [topEarnersList, setTopEarnersList] = useState<any[]>([]);
  const [mostActiveList, setMostActiveList] = useState<any[]>([]);
  const [highestRatedList, setHighestRatedList] = useState<any[]>([]);

  // Chart interaction
  const [selectedRevenuePoint, setSelectedRevenuePoint] = useState<number | null>(null);
  const [selectedUserPoint, setSelectedUserPoint] = useState<number | null>(null);

  /* ── fetch ────────────────────────────────────────────── */
  const fetchAnalytics = useCallback(async () => {
    try {
      const [
        realtimeRes,
        todayRes,
        trendsRes,
        poolingRes,
        financialRes,
        userGrowthRes,
        earnersRes,
        activeRes,
        ratedRes,
      ] = await Promise.all([
        analyticsApi.getRealtime(),
        analyticsApi.getTodayStats(),
        analyticsApi.getTrends(trendPeriod),
        analyticsApi.getPoolingStats(),
        analyticsApi.getFinancialSummary('month'),
        analyticsApi.getUserGrowth(),
        analyticsApi.getTopEarners(5),
        analyticsApi.getMostActive(5),
        analyticsApi.getHighestRated(5),
      ]);

      if (realtimeRes.success) setRealtimeStats(realtimeRes.data);
      if (todayRes.success) setTodayStats(todayRes.data);
      if (trendsRes.success) setTrendData(trendsRes.data);
      if (poolingRes.success) setPoolingStats(poolingRes.data);
      if (financialRes.success) setFinancialData(financialRes.data);
      if (userGrowthRes.success) setUserGrowthData(userGrowthRes.data);
      if (earnersRes.success) setTopEarnersList(earnersRes.data?.earners || []);
      if (activeRes.success) setMostActiveList(activeRes.data?.users || activeRes.data?.drivers || []);
      if (ratedRes.success) setHighestRatedList(ratedRes.data?.drivers || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [trendPeriod]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  /* ── derived data ─────────────────────────────────────── */
  const newUsers = safeNum(todayStats?.newUsers);
  const todayRevenue = safeNum(todayStats?.revenue ?? todayStats?.totalRevenue);
  const totalBookings = safeNum(todayStats?.totalBookings ?? todayStats?.bookings);
  const activeTrips = safeNum(realtimeStats?.activeTrips);
  const onlineDrivers = safeNum(realtimeStats?.onlineDrivers);
  const pendingBookings = safeNum(realtimeStats?.pendingBookings);

  // Pooling distribution
  const carPoolPct = safeNum(poolingStats?.byVehicleType?.car?.percentage);
  const bikePoolPct = safeNum(poolingStats?.byVehicleType?.bike?.percentage);

  // Financial
  const totalRevenue = safeNum(financialData?.totalRevenue ?? financialData?.revenue);
  const totalExpense = safeNum(financialData?.totalExpenses ?? financialData?.expenses);
  const netProfit = safeNum(financialData?.netProfit) || (totalRevenue - totalExpense);
  const commissionEarned = safeNum(financialData?.commissionEarned ?? financialData?.commission);

  // User growth chart data
  const growthPoints: { label: string; value: number }[] =
    userGrowthData?.monthly?.map((m: any) => ({ label: m.month || m.label || '', value: m.count || m.users || m.value || 0 })) ||
    userGrowthData?.weekly?.map((w: any) => ({ label: w.week || w.label || '', value: w.count || w.users || w.value || 0 })) ||
    trendData?.userTrends?.map((d: any) => ({ label: d.date || d.label || '', value: d.count || d.users || d.value || 0 })) ||
    [];

  // Revenue chart data
  const revenuePoints: { label: string; value: number }[] =
    trendData?.revenueTrends?.map((d: any) => ({ label: d.date || d.label || '', value: d.revenue || d.amount || d.value || 0 })) ||
    financialData?.monthly?.map((m: any) => ({ label: m.month || m.label || '', value: m.revenue || m.amount || m.value || 0 })) ||
    [];

  // Pie chart data for service distribution
  const pieData = [
    { label: 'Car Pooling', value: carPoolPct || 0, color: '#3B82F6' },
    { label: 'Bike Pooling', value: bikePoolPct || 0, color: '#10B981' },
    { label: 'Car Rentals', value: safeNum(poolingStats?.carRentals), color: '#F59E0B' },
    { label: 'Bike Rentals', value: safeNum(poolingStats?.bikeRentals), color: '#EF4444' },
  ];
  const pieTotal = pieData.reduce((s, d) => s + d.value, 0) || 1;

  // Top earners
  const topEarners =
    topEarnersList.length > 0
      ? topEarnersList.map((e: any) => ({
          name: e.name || 'Unknown',
          earnings: e.totalEarnings ?? e.earnings ?? 0,
          avatar: (e.name || 'U').charAt(0),
        }))
      : [];

  // Most active
  const mostActive =
    mostActiveList.length > 0
      ? mostActiveList.map((u: any) => ({
          name: u.name || 'Unknown',
          trips: u.totalTrips ?? u.trips ?? u.bookings ?? 0,
          avatar: (u.name || 'U').charAt(0),
        }))
      : [];

  // Highest rated
  const highestRated =
    highestRatedList.length > 0
      ? highestRatedList.map((d: any) => ({
          name: d.name || 'Unknown',
          rating: d.averageRating ?? d.rating ?? 0,
          trips: d.totalTrips ?? d.trips ?? 0,
          avatar: (d.name || 'U').charAt(0),
        }))
      : [];

  /* ── chart constants ──────────────────────────────────── */
  const chartWidth = SCREEN_WIDTH - SPACING.md * 4;
  const chartHeight = 260;
  const chartPad = { top: 20, right: 20, bottom: 50, left: 50 };
  const cw = chartWidth - chartPad.left - chartPad.right;
  const ch = chartHeight - chartPad.top - chartPad.bottom;

  /* ── tab config ───────────────────────────────────────── */
  const tabs = [
    { key: 'Overview', label: 'Overview', icon: BarChart3 },
    { key: 'Revenue', label: 'Revenue', icon: DollarSign },
    { key: 'Users', label: 'Users', icon: Users },
    { key: 'Leaderboard', label: 'Leaderboard', icon: Award },
  ];

  /* ── render chart helper ──────────────────────────────── */
  const renderLineChart = (
    data: { label: string; value: number }[],
    color: string,
    gradientId: string,
    selectedIdx: number | null,
    onSelect: (i: number | null) => void,
    yLabel: string,
  ) => {
    if (data.length === 0)
      return (
        <View style={styles.emptyChart}>
          <Activity size={32} color="#CBD5E1" />
          <Text style={styles.emptyChartText}>No data available yet</Text>
        </View>
      );
    const maxVal = Math.max(...data.map((d) => d.value), 1);
    return (
      <View style={styles.chartContainer}>
        <Pressable onPress={() => onSelect(null)} style={StyleSheet.absoluteFill}>
          <Svg width={chartWidth} height={chartHeight}>
            <Defs>
              <SvgLinearGradient id={`${gradientId}Area`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={color} stopOpacity="0.35" />
                <Stop offset="100%" stopColor={color} stopOpacity="0.03" />
              </SvgLinearGradient>
              <SvgLinearGradient id={`${gradientId}Line`} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0%" stopColor={color} stopOpacity="1" />
                <Stop offset="100%" stopColor={color} stopOpacity="0.7" />
              </SvgLinearGradient>
            </Defs>

            {/* grid */}
            {[0, 1, 2, 3, 4].map((i) => {
              const yPos = chartPad.top + (ch / 4) * i;
              return (
                <G key={`grid-${i}`}>
                  <Line x1={chartPad.left} y1={yPos} x2={chartWidth - chartPad.right} y2={yPos} stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4,4" />
                  <SvgText x={chartPad.left - 6} y={yPos + 4} fontSize="10" textAnchor="end" fill="#94A3B8" fontWeight="500">
                    {formatNumber(Math.round(maxVal - (maxVal / 4) * i))}
                  </SvgText>
                </G>
              );
            })}

            {/* axes */}
            <Line x1={chartPad.left} y1={chartPad.top} x2={chartPad.left} y2={chartHeight - chartPad.bottom} stroke="#CBD5E1" strokeWidth="1.5" />
            <Line x1={chartPad.left} y1={chartHeight - chartPad.bottom} x2={chartWidth - chartPad.right} y2={chartHeight - chartPad.bottom} stroke="#CBD5E1" strokeWidth="1.5" />

            {/* area */}
            <Path
              d={`M ${chartPad.left},${chartHeight - chartPad.bottom} ${data
                .map((d, i) => `L ${chartPad.left + (i * cw) / Math.max(data.length - 1, 1)},${chartHeight - chartPad.bottom - (d.value / maxVal) * ch}`)
                .join(' ')} L ${chartWidth - chartPad.right},${chartHeight - chartPad.bottom} Z`}
              fill={`url(#${gradientId}Area)`}
            />

            {/* line */}
            <Polyline
              points={data
                .map((d, i) => `${chartPad.left + (i * cw) / Math.max(data.length - 1, 1)},${chartHeight - chartPad.bottom - (d.value / maxVal) * ch}`)
                .join(' ')}
              fill="none"
              stroke={`url(#${gradientId}Line)`}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* points + labels */}
            {data.map((d, i) => {
              const x = chartPad.left + (i * cw) / Math.max(data.length - 1, 1);
              const y = chartHeight - chartPad.bottom - (d.value / maxVal) * ch;
              const isSel = selectedIdx === i;
              return (
                <G key={`pt-${i}`}>
                  <Circle cx={x} cy={y} r={isSel ? 10 : 6} fill={color} opacity={isSel ? 0.3 : 0.2} />
                  <Circle cx={x} cy={y} r={isSel ? 6 : 4} fill="#fff" stroke={color} strokeWidth={isSel ? 3 : 2} />
                  {isSel && (
                    <G>
                      <Rect x={x - 30} y={y - 30} width="60" height="20" rx="6" fill={color} />
                      <SvgText x={x} y={y - 16} fontSize="10" textAnchor="middle" fill="#fff" fontWeight="700">
                        {yLabel === '₹' ? formatCurrency(d.value) : formatNumber(d.value)}
                      </SvgText>
                    </G>
                  )}
                  {/* x label (skip some if crowded) */}
                  {(data.length <= 7 || i % Math.ceil(data.length / 7) === 0) && (
                    <SvgText x={x} y={chartHeight - chartPad.bottom + 18} fontSize="9" textAnchor="middle" fill="#64748B" fontWeight="500">
                      {d.label.length > 5 ? d.label.slice(0, 5) : d.label}
                    </SvgText>
                  )}
                </G>
              );
            })}
          </Svg>

          {/* touch targets */}
          {data.map((d, i) => {
            const x = chartPad.left + (i * cw) / Math.max(data.length - 1, 1);
            const y = chartHeight - chartPad.bottom - (d.value / (Math.max(...data.map((dd) => dd.value), 1))) * ch;
            return (
              <TouchableOpacity
                key={`t-${i}`}
                style={[styles.dataPointTouch, { left: x - 18, top: y - 18 }]}
                onPress={() => onSelect(selectedIdx === i ? null : i)}
                activeOpacity={0.7}
              />
            );
          })}
        </Pressable>
      </View>
    );
  };

  /* ── pie chart renderer ───────────────────────────────── */
  const renderPieChart = () => {
    const cx = 90,
      cy = 90,
      r = 75,
      innerR = 48;
    let angle = -Math.PI / 2;
    return (
      <View style={styles.pieRow}>
        <Svg width={180} height={180} viewBox="0 0 180 180">
          {pieData.map((slice, idx) => {
            const sliceAngle = (slice.value / pieTotal) * 2 * Math.PI;
            const startA = angle;
            const endA = angle + sliceAngle;
            const x1 = cx + r * Math.cos(startA);
            const y1 = cy + r * Math.sin(startA);
            const x2 = cx + r * Math.cos(endA);
            const y2 = cy + r * Math.sin(endA);
            const ix1 = cx + innerR * Math.cos(endA);
            const iy1 = cy + innerR * Math.sin(endA);
            const ix2 = cx + innerR * Math.cos(startA);
            const iy2 = cy + innerR * Math.sin(startA);
            const large = sliceAngle > Math.PI ? 1 : 0;
            const d = [
              `M ${x1} ${y1}`,
              `A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`,
              `L ${ix1} ${iy1}`,
              `A ${innerR} ${innerR} 0 ${large} 0 ${ix2} ${iy2}`,
              'Z',
            ].join(' ');
            angle = endA;
            return <Path key={idx} d={d} fill={slice.color} />;
          })}
          <SvgText x={cx} y={cy - 4} fontSize="14" fontWeight="bold" textAnchor="middle" fill="#1E293B">
            {pieTotal}%
          </SvgText>
          <SvgText x={cx} y={cy + 12} fontSize="10" textAnchor="middle" fill="#94A3B8">
            Total
          </SvgText>
        </Svg>
        <View style={styles.legendCol}>
          {pieData.map((s, i) => (
            <View key={i} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: s.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.legendLabel}>{s.label}</Text>
                <Text style={styles.legendValue}>{s.value}%</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  /* ── loading state ────────────────────────────────────── */
  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <View style={[styles.loadingWrap]}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </View>
    );
  }

  /* ── main render ──────────────────────────────────────── */
  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* ── Hero Header ──────────────────────────────── */}
        <ImageBackground source={require('../../../assets/analytics.png')} style={styles.heroImage} resizeMode="cover">
          <View style={styles.heroOverlay} />
          <BlurView intensity={20} tint="dark" style={styles.heroBlur}>
            {/* back + title */}
            <View style={styles.heroTopRow}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
                <BlurView intensity={30} tint="dark" style={styles.backBtnBlur}>
                  <ArrowLeft size={20} color="#fff" />
                </BlurView>
              </TouchableOpacity>
              <View style={{ flex: 1, marginLeft: SPACING.md }}>
                <Text style={styles.heroTitle}>Analytics & Reports</Text>
                <Text style={styles.heroSub}>Real-time platform insights</Text>
              </View>
              <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} activeOpacity={0.7}>
                <RefreshCw size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* live badges */}
            <View style={styles.liveBadgeRow}>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveBadgeText}>{activeTrips} Active Trips</Text>
              </View>
              <View style={styles.liveBadge}>
                <Zap size={12} color="#FBBF24" />
                <Text style={styles.liveBadgeText}>{onlineDrivers} Online Drivers</Text>
              </View>
              <View style={styles.liveBadge}>
                <Clock size={12} color="#F97316" />
                <Text style={styles.liveBadgeText}>{pendingBookings} Pending</Text>
              </View>
            </View>
          </BlurView>
        </ImageBackground>

        {/* ── Floating Stats Strip ─────────────────────── */}
        <View style={styles.statsStrip}>
          {[
            { label: 'New Users', value: formatNumber(newUsers), icon: Users, color: '#4A90D9' },
            { label: 'Revenue', value: formatCurrency(todayRevenue), icon: DollarSign, color: '#00B894' },
            { label: 'Bookings', value: formatNumber(totalBookings), icon: Car, color: '#F39C12' },
            { label: 'Net Profit', value: formatCurrency(netProfit), icon: TrendingUp, color: '#7B61FF' },
          ].map((s, i) => (
            <View key={i} style={styles.statsItem}>
              <View style={[styles.statsIcon, { backgroundColor: s.color + '18' }]}>
                <s.icon size={16} color={s.color} />
              </View>
              <Text style={styles.statsValue} numberOfLines={1}>
                {s.value}
              </Text>
              <Text style={styles.statsLabel} numberOfLines={1}>
                {s.label}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Tab Bar ──────────────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabPill, active && styles.tabPillActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                <tab.icon size={15} color={active ? '#fff' : '#64748B'} />
                <Text style={[styles.tabPillText, active && styles.tabPillTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── OVERVIEW TAB ─────────────────────────────── */}
        {activeTab === 'Overview' && (
          <View style={styles.section}>
            {/* Real-time pulse */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Activity size={18} color="#4A90D9" />
                  <Text style={styles.cardTitle}>Real-time Activity</Text>
                </View>
                <View style={styles.liveIndicator}>
                  <View style={styles.livePulse} />
                  <Text style={styles.liveLabel}>LIVE</Text>
                </View>
              </View>
              <View style={styles.realtimeGrid}>
                {[
                  { label: 'Active Trips', value: activeTrips, icon: Car, color: '#3B82F6' },
                  { label: 'Online Drivers', value: onlineDrivers, icon: Users, color: '#10B981' },
                  { label: 'Pending Bookings', value: pendingBookings, icon: Clock, color: '#F59E0B' },
                  { label: 'Today Bookings', value: totalBookings, icon: Target, color: '#8B5CF6' },
                ].map((item, idx) => (
                  <View key={idx} style={styles.realtimeCell}>
                    <View style={[styles.realtimeIconWrap, { backgroundColor: item.color + '12' }]}>
                      <item.icon size={18} color={item.color} />
                    </View>
                    <Text style={styles.realtimeValue}>{item.value}</Text>
                    <Text style={styles.realtimeLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Service Distribution Pie */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <BarChart3 size={18} color="#F59E0B" />
                  <Text style={styles.cardTitle}>Service Distribution</Text>
                </View>
              </View>
              {renderPieChart()}
            </View>

            {/* Financial Summary */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <DollarSign size={18} color="#10B981" />
                  <Text style={styles.cardTitle}>Financial Summary</Text>
                </View>
                <Text style={styles.cardSubtitle}>This month</Text>
              </View>
              <View style={styles.financeGrid}>
                {[
                  { label: 'Total Revenue', value: formatCurrency(totalRevenue), color: '#10B981', icon: TrendingUp },
                  { label: 'Total Expenses', value: formatCurrency(totalExpense), color: '#EF4444', icon: TrendingDown },
                  { label: 'Net Profit', value: formatCurrency(netProfit), color: '#3B82F6', icon: DollarSign },
                  { label: 'Commission', value: formatCurrency(commissionEarned), color: '#8B5CF6', icon: Award },
                ].map((f, i) => (
                  <View key={i} style={styles.financeItem}>
                    <View style={[styles.financeIconWrap, { backgroundColor: f.color + '12' }]}>
                      <f.icon size={16} color={f.color} />
                    </View>
                    <Text style={styles.financeLabel}>{f.label}</Text>
                    <Text style={[styles.financeValue, { color: f.color }]}>{f.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ── REVENUE TAB ──────────────────────────────── */}
        {activeTab === 'Revenue' && (
          <View style={styles.section}>
            {/* Period toggle */}
            <View style={styles.periodRow}>
              {(['week', 'month'] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.periodBtn, trendPeriod === p && styles.periodBtnActive]}
                  onPress={() => setTrendPeriod(p)}
                >
                  <Text style={[styles.periodBtnText, trendPeriod === p && styles.periodBtnTextActive]}>
                    {p === 'week' ? 'Weekly' : 'Monthly'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Revenue Chart */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <TrendingUp size={18} color="#10B981" />
                  <Text style={styles.cardTitle}>Revenue Trends</Text>
                </View>
              </View>
              {renderLineChart(revenuePoints, '#10B981', 'rev', selectedRevenuePoint, setSelectedRevenuePoint, '₹')}
            </View>

            {/* Financial Summary in Revenue tab */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <DollarSign size={18} color="#3B82F6" />
                  <Text style={styles.cardTitle}>Revenue Breakdown</Text>
                </View>
              </View>
              <View style={styles.breakdownList}>
                {[
                  { label: 'Total Revenue', value: formatCurrency(totalRevenue), color: '#10B981' },
                  { label: 'Expenses', value: formatCurrency(totalExpense), color: '#EF4444' },
                  { label: 'Commission Earned', value: formatCurrency(commissionEarned), color: '#8B5CF6' },
                  { label: 'Net Profit', value: formatCurrency(netProfit), color: '#3B82F6' },
                ].map((item, i) => (
                  <View key={i} style={styles.breakdownRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={[styles.breakdownDot, { backgroundColor: item.color }]} />
                      <Text style={styles.breakdownLabel}>{item.label}</Text>
                    </View>
                    <Text style={[styles.breakdownValue, { color: item.color }]}>{item.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ── USERS TAB ────────────────────────────────── */}
        {activeTab === 'Users' && (
          <View style={styles.section}>
            {/* User Growth Chart */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Users size={18} color="#3B82F6" />
                  <Text style={styles.cardTitle}>User Growth</Text>
                </View>
              </View>
              {renderLineChart(growthPoints, '#3B82F6', 'usr', selectedUserPoint, setSelectedUserPoint, '')}
            </View>

            {/* User Stats */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Activity size={18} color="#8B5CF6" />
                  <Text style={styles.cardTitle}>Today's User Metrics</Text>
                </View>
              </View>
              <View style={styles.userMetricsRow}>
                {[
                  { label: 'New Users', value: newUsers, color: '#3B82F6' },
                  { label: 'Active Now', value: onlineDrivers, color: '#10B981' },
                  { label: 'Bookings', value: totalBookings, color: '#F59E0B' },
                ].map((m, i) => (
                  <View key={i} style={[styles.userMetricCard, { borderLeftColor: m.color }]}>
                    <Text style={[styles.userMetricValue, { color: m.color }]}>{m.value}</Text>
                    <Text style={styles.userMetricLabel}>{m.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Pooling Breakdown */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Car size={18} color="#F59E0B" />
                  <Text style={styles.cardTitle}>Pooling Breakdown</Text>
                </View>
              </View>
              <View style={styles.poolingBreakdownList}>
                {[
                  { label: 'Car Pooling', pct: carPoolPct, icon: Car, color: '#3B82F6' },
                  { label: 'Bike Pooling', pct: bikePoolPct, icon: Bike, color: '#10B981' },
                ].map((p, i) => (
                  <View key={i} style={styles.poolingRow}>
                    <View style={styles.poolingRowLeft}>
                      <View style={[styles.poolingIconWrap, { backgroundColor: p.color + '15' }]}>
                        <p.icon size={16} color={p.color} />
                      </View>
                      <Text style={styles.poolingLabel}>{p.label}</Text>
                    </View>
                    <View style={styles.poolingBarWrap}>
                      <View style={[styles.poolingBar, { width: `${Math.min(p.pct, 100)}%`, backgroundColor: p.color }]} />
                    </View>
                    <Text style={[styles.poolingPct, { color: p.color }]}>{p.pct}%</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ── LEADERBOARD TAB ──────────────────────────── */}
        {activeTab === 'Leaderboard' && (
          <View style={styles.section}>
            {/* Top Earners */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <DollarSign size={18} color="#10B981" />
                  <Text style={styles.cardTitle}>Top Earners</Text>
                </View>
                <Text style={styles.cardBadge}>{topEarners.length} users</Text>
              </View>
              {topEarners.length === 0 ? (
                <Text style={styles.noDataText}>No data available</Text>
              ) : (
                topEarners.map((u, i) => (
                  <View key={i} style={styles.leaderRow}>
                    <View style={[styles.rankBadge, i < 3 && { backgroundColor: ['#FFD700', '#C0C0C0', '#CD7F32'][i] + '20' }]}>
                      <Text style={[styles.rankText, i < 3 && { color: ['#B8860B', '#808080', '#8B4513'][i] }]}>{i + 1}</Text>
                    </View>
                    <View style={[styles.leaderAvatar, { backgroundColor: '#3B82F6' + '20' }]}>
                      <Text style={styles.leaderAvatarText}>{u.avatar}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.leaderName}>{u.name}</Text>
                      <Text style={styles.leaderSub}>Total earnings</Text>
                    </View>
                    <Text style={styles.leaderValue}>{formatCurrency(u.earnings)}</Text>
                  </View>
                ))
              )}
            </View>

            {/* Most Active */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Activity size={18} color="#3B82F6" />
                  <Text style={styles.cardTitle}>Most Active Users</Text>
                </View>
                <Text style={styles.cardBadge}>{mostActive.length} users</Text>
              </View>
              {mostActive.length === 0 ? (
                <Text style={styles.noDataText}>No data available</Text>
              ) : (
                mostActive.map((u, i) => (
                  <View key={i} style={styles.leaderRow}>
                    <View style={[styles.rankBadge, i < 3 && { backgroundColor: ['#FFD700', '#C0C0C0', '#CD7F32'][i] + '20' }]}>
                      <Text style={[styles.rankText, i < 3 && { color: ['#B8860B', '#808080', '#8B4513'][i] }]}>{i + 1}</Text>
                    </View>
                    <View style={[styles.leaderAvatar, { backgroundColor: '#F59E0B' + '20' }]}>
                      <Text style={styles.leaderAvatarText}>{u.avatar}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.leaderName}>{u.name}</Text>
                      <Text style={styles.leaderSub}>Total trips</Text>
                    </View>
                    <Text style={styles.leaderValue}>{u.trips} trips</Text>
                  </View>
                ))
              )}
            </View>

            {/* Highest Rated */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Star size={18} color="#F59E0B" />
                  <Text style={styles.cardTitle}>Highest Rated Drivers</Text>
                </View>
                <Text style={styles.cardBadge}>{highestRated.length} drivers</Text>
              </View>
              {highestRated.length === 0 ? (
                <Text style={styles.noDataText}>No data available</Text>
              ) : (
                highestRated.map((d, i) => (
                  <View key={i} style={styles.leaderRow}>
                    <View style={[styles.rankBadge, i < 3 && { backgroundColor: ['#FFD700', '#C0C0C0', '#CD7F32'][i] + '20' }]}>
                      <Text style={[styles.rankText, i < 3 && { color: ['#B8860B', '#808080', '#8B4513'][i] }]}>{i + 1}</Text>
                    </View>
                    <View style={[styles.leaderAvatar, { backgroundColor: '#F59E0B' + '20' }]}>
                      <Text style={styles.leaderAvatarText}>{d.avatar}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.leaderName}>{d.name}</Text>
                      <Text style={styles.leaderSub}>{d.trips} trips</Text>
                    </View>
                    <View style={styles.ratingBadge}>
                      <Star size={12} color="#F59E0B" />
                      <Text style={styles.ratingText}>{(d.rating || 0).toFixed(1)}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* ── Action Buttons ───────────────────────────── */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
            <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.actionGradient}>
              <Download size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Export Report</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
            <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.actionGradient}>
              <BarChart3 size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Custom Report</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

/* ── styles ──────────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: '#94A3B8',
  },

  /* ── Hero ─────────── */
  heroImage: {
    width: '100%',
    height: HEADER_HEIGHT,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 52, 96, 0.50)',
  },
  heroBlur: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 54,
    justifyContent: 'flex-end',
    paddingBottom: SPACING.lg,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  backBtn: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  backBtnBlur: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroTitle: {
    fontFamily: FONTS.regular,
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  heroSub: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* live badges */
  liveBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  liveBadgeText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },

  /* ── Stats Strip ──── */
  statsStrip: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    marginTop: -SPACING.md,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: SPACING.sm,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statsItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statsIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsValue: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  statsLabel: {
    fontFamily: FONTS.regular,
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '500',
  },

  /* ── Tabs ─────────── */
  tabRow: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: 8,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabPillText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  tabPillTextActive: {
    color: '#fff',
  },

  /* ── Section ──────── */
  section: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },

  /* ── Card ─────────── */
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: SPACING.md,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  cardSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#94A3B8',
  },
  cardBadge: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    fontWeight: '600',
    overflow: 'hidden',
  },

  /* ── Realtime Grid ── */
  realtimeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  realtimeCell: {
    width: (SCREEN_WIDTH - SPACING.md * 4 - 10) / 2 - 5,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  realtimeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  realtimeValue: {
    fontFamily: FONTS.regular,
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
  },
  realtimeLabel: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },

  /* ── Live indicator ─ */
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EF444415',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  livePulse: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  liveLabel: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: '#EF4444',
    fontWeight: '800',
    letterSpacing: 1,
  },

  /* ── Pie Chart ────── */
  pieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  legendCol: {
    flex: 1,
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#64748B',
  },
  legendValue: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },

  /* ── Finance Grid ─── */
  financeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  financeItem: {
    width: (SCREEN_WIDTH - SPACING.md * 4 - 10) / 2 - 5,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  financeIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  financeLabel: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  financeValue: {
    fontFamily: FONTS.regular,
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B',
  },

  /* ── Chart ────────── */
  chartContainer: {
    height: 260,
    width: '100%',
  },
  emptyChart: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyChartText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#94A3B8',
  },
  dataPointTouch: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'transparent',
  },

  /* ── Period toggle ── */
  periodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  periodBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  periodBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  periodBtnText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  periodBtnTextActive: {
    color: '#fff',
  },

  /* ── Breakdown List ─ */
  breakdownList: {
    gap: 2,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  breakdownDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  breakdownLabel: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  breakdownValue: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    fontWeight: '700',
  },

  /* ── User Metrics ─── */
  userMetricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  userMetricCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    gap: 4,
  },
  userMetricValue: {
    fontFamily: FONTS.regular,
    fontSize: 22,
    fontWeight: '800',
  },
  userMetricLabel: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },

  /* ── Pooling Breakdown */
  poolingBreakdownList: {
    gap: 14,
  },
  poolingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  poolingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 120,
  },
  poolingIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  poolingLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  poolingBarWrap: {
    flex: 1,
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  poolingBar: {
    height: '100%',
    borderRadius: 4,
  },
  poolingPct: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    fontWeight: '700',
    width: 40,
    textAlign: 'right',
  },

  /* ── Leaderboard ──── */
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
  },
  leaderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leaderAvatarText: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    fontWeight: '700',
    color: '#3B82F6',
  },
  leaderName: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  leaderSub: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: '#94A3B8',
  },
  leaderValue: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  ratingText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    fontWeight: '700',
    color: '#B45309',
  },
  noDataText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 20,
  },

  /* ── Actions ──────── */
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.lg,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  actionBtnText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});

export default AnalyticsScreen;
