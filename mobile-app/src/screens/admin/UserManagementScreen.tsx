import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  Platform,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import {
  ArrowLeft,
  Users,
  UserCheck,
  Building2,
  CheckCircle,
  Clock,
  Shield,
  ChevronRight,
  AlertCircle,
  User,
  Calendar,
  Inbox,
} from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { adminApi } from '@utils/apiClient';

const { width } = Dimensions.get('window');
const HEADER_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 180 : 200;

const formatNumber = (num: number): string => {
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const TAB_COLORS: Record<string, string> = {
  total: '#4A90D9',
  individual: '#7B61FF',
  company: '#F39C12',
  verified: '#00B894',
};

const UserManagementScreen = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('All');
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, individual: 0, company: 0, verified: 0, pending: 0, suspended: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  const tabs = ['All', 'Individual', 'Company', 'Verified', 'Pending', 'Suspended'];

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);

      // Build query params based on active tab
      const params: any = { page, limit: 20 };
      if (activeTab === 'Individual') params.userType = 'individual';
      else if (activeTab === 'Company') params.userType = 'company';
      else if (activeTab === 'Verified') params.verified = true;
      else if (activeTab === 'Pending') params.status = 'pending';
      else if (activeTab === 'Suspended') params.status = 'suspended';

      const [usersRes, statsRes] = await Promise.all([
        adminApi.getUsers(params),
        adminApi.getDashboardStats(),
      ]);

      if (usersRes.success && usersRes.data) {
        const userData = usersRes.data;
        setUsers(userData.users || userData.data || (Array.isArray(userData) ? userData : []));
        setTotalUsers(userData.total || userData.totalCount || 0);
      }

      if (statsRes.success && statsRes.data) {
        const s = statsRes.data;
        const userStats = s.users || s;
        setStats({
          total: userStats.total || userStats.totalUsers || 0,
          individual: userStats.individual || userStats.individualUsers || 0,
          company: userStats.company || userStats.companyUsers || 0,
          verified: userStats.verified || userStats.verifiedUsers || 0,
          pending: userStats.pending || userStats.pendingUsers || 0,
          suspended: userStats.suspended || userStats.suspendedUsers || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, page]);

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  const handleVerify = async (userId: string) => {
    try {
      await adminApi.verifyUser(userId);
      fetchData(true);
    } catch (e) {
      console.error('Verify error:', e);
    }
  };

  const handleSuspend = async (userId: string) => {
    try {
      await adminApi.suspendUser(userId);
      fetchData(true);
    } catch (e) {
      console.error('Suspend error:', e);
    }
  };

  const handleActivate = async (userId: string) => {
    try {
      await adminApi.activateUser(userId);
      fetchData(true);
    } catch (e) {
      console.error('Activate error:', e);
    }
  };

  const getStatusStyle = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'active' || s === 'verified') return { bg: 'rgba(0,184,148,0.2)', color: '#00B894' };
    if (s === 'pending') return { bg: 'rgba(243,156,18,0.2)', color: '#F39C12' };
    if (s === 'suspended') return { bg: 'rgba(231,76,60,0.2)', color: '#E74C3C' };
    return { bg: '#F1F5F9', color: '#64748B' };
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return dateStr; }
  };

  const statItems = [
    { key: 'total', value: stats.total, label: 'Total Users', icon: Users, color: TAB_COLORS.total },
    { key: 'individual', value: stats.individual, label: 'Individual', icon: UserCheck, color: TAB_COLORS.individual },
    { key: 'company', value: stats.company, label: 'Company', icon: Building2, color: TAB_COLORS.company },
    { key: 'verified', value: stats.verified, label: 'Verified', icon: CheckCircle, color: TAB_COLORS.verified },
  ];

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Hero Header */}
        <View style={[styles.heroContainer, { height: HEADER_HEIGHT }]}>
          <ImageBackground source={require('../../../assets/userm.png')} style={styles.heroImage} resizeMode="cover">
            <View style={styles.overlay} />
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill}>
              <View style={styles.headerContent}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.8}>
                  <BlurView intensity={40} tint="dark" style={styles.backButtonBlur}>
                    <ArrowLeft size={22} color="#fff" />
                  </BlurView>
                </TouchableOpacity>
                <View style={styles.titleContainer}>
                  <Text style={styles.heroTitle}>User Management</Text>
                  <Text style={styles.heroSubtitle}>Manage and monitor all platform users</Text>
                </View>
              </View>
            </BlurView>
          </ImageBackground>
        </View>

        {/* Floating Stats Strip */}
        <View style={styles.statsStrip}>
          {statItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <View key={item.key} style={styles.statCol}>
                <View style={[styles.statIconChip, { backgroundColor: item.color + '20' }]}>
                  <IconComponent size={18} color={item.color} />
                </View>
                <Text style={styles.statValue}>{formatNumber(item.value)}</Text>
                <Text style={styles.statLabel} numberOfLines={1}>{item.label}</Text>
              </View>
            );
          })}
        </View>

        {/* Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsWrapper} style={styles.tabsScroll}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabPill, activeTab === tab && styles.tabPillActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabPillText, activeTab === tab && styles.tabPillTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* User Cards */}
        <View style={styles.usersSection}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading users...</Text>
            </View>
          ) : users.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <Inbox size={48} color="#CBD5E1" />
              </View>
              <Text style={styles.emptyTitle}>No Users Found</Text>
              <Text style={styles.emptyText}>No users match the selected filter.</Text>
            </View>
          ) : (
            users.map((user: any) => {
              const userId = user.userId || user._id || user.id;
              const name = user.name || user.fullName || 'Unknown';
              const type = user.userType || user.type || 'individual';
              const status = user.status || (user.isVerified ? 'verified' : 'pending');
              const joined = user.createdAt || user.joinedAt;
              const statusStyle = getStatusStyle(status);

              return (
                <View key={userId} style={styles.userCard}>
                  <View style={styles.userCardTop}>
                    <View style={styles.avatarWrapper}>
                      <View style={styles.avatarCircle}>
                        <User size={24} color={COLORS.textSecondary} />
                      </View>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{name}</Text>
                      <Text style={styles.userId}>ID: {userId}</Text>
                      <View style={styles.badgeRow}>
                        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                          <Text style={[styles.statusText, { color: statusStyle.color }]}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </Text>
                        </View>
                        <View style={styles.typeBadge}>
                          <Text style={styles.typeText}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
                        </View>
                      </View>
                      {joined && (
                        <View style={styles.joinedRow}>
                          <Calendar size={12} color={COLORS.textSecondary} />
                          <Text style={styles.joinedText}>{formatDate(joined)}</Text>
                        </View>
                      )}
                    </View>
                    <ChevronRight size={20} color={COLORS.textSecondary} />
                  </View>
                  <View style={styles.userActions}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => navigation.navigate('UserDetails' as never, { userId } as never)}
                    >
                      <ChevronRight size={14} color={COLORS.primary} />
                      <Text style={styles.actionBtnText}>View</Text>
                    </TouchableOpacity>
                    {status === 'pending' && (
                      <TouchableOpacity style={[styles.actionBtn, styles.verifyBtn]} onPress={() => handleVerify(userId)}>
                        <CheckCircle size={14} color="#fff" />
                        <Text style={[styles.actionBtnText, styles.verifyBtnText]}>Verify</Text>
                      </TouchableOpacity>
                    )}
                    {status === 'suspended' ? (
                      <TouchableOpacity style={[styles.actionBtn, styles.activateBtn]} onPress={() => handleActivate(userId)}>
                        <CheckCircle size={14} color="#fff" />
                        <Text style={[styles.actionBtnText, styles.activateBtnText]}>Activate</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={[styles.actionBtn, styles.suspendBtn]} onPress={() => handleSuspend(userId)}>
                        <AlertCircle size={14} color={COLORS.error} />
                        <Text style={[styles.actionBtnText, styles.suspendBtnText]}>Suspend</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Pagination */}
        {!loading && users.length > 0 && (
          <View style={styles.paginationRow}>
            <TouchableOpacity
              style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
              onPress={() => page > 1 && setPage(page - 1)}
              disabled={page === 1}
            >
              <Text style={styles.pageBtnText}>Previous</Text>
            </TouchableOpacity>
            <Text style={styles.paginationInfo}>Page {page}</Text>
            <TouchableOpacity
              style={[styles.pageBtn, users.length < 20 && styles.pageBtnDisabled]}
              onPress={() => users.length >= 20 && setPage(page + 1)}
              disabled={users.length < 20}
            >
              <Text style={styles.pageBtnText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}
        {!loading && (
          <Text style={styles.totalInfo}>
            {totalUsers > 0 ? `${totalUsers.toLocaleString()} total users` : `${users.length} users shown`}
          </Text>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: SPACING.xl },
  heroContainer: { width: '100%', overflow: 'hidden' },
  heroImage: { width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 52, 96, 0.5)' },
  headerContent: { flex: 1, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + SPACING.md : SPACING.xl, paddingHorizontal: SPACING.md, justifyContent: 'flex-start' },
  backButton: { alignSelf: 'flex-start', marginBottom: SPACING.lg, overflow: 'hidden', borderRadius: BORDER_RADIUS.lg },
  backButtonBlur: { padding: SPACING.sm, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden' },
  titleContainer: { alignItems: 'center', marginTop: SPACING.sm },
  heroTitle: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.xxl, fontWeight: '700', color: '#fff', textAlign: 'center' },
  heroSubtitle: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, color: 'rgba(255, 255, 255, 0.9)', marginTop: SPACING.xs },
  statsStrip: { flexDirection: 'row', marginHorizontal: SPACING.md, marginTop: -SPACING.md, padding: SPACING.md, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#F1F5F9', ...SHADOWS.sm },
  statCol: { flex: 1, alignItems: 'center' },
  statIconChip: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.xs },
  statValue: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text },
  statLabel: { fontFamily: FONTS.regular, fontSize: 10, color: COLORS.textSecondary, marginTop: 2 },
  tabsScroll: { marginTop: SPACING.lg },
  tabsWrapper: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: SPACING.sm },
  tabPill: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.round, backgroundColor: '#fff', borderWidth: 1, borderColor: '#F1F5F9', marginRight: SPACING.sm },
  tabPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabPillText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.text },
  tabPillTextActive: { color: '#fff' },
  usersSection: { paddingHorizontal: SPACING.md, marginTop: SPACING.md },
  loadingContainer: { alignItems: 'center', paddingVertical: SPACING.xxl * 2 },
  loadingText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: SPACING.md },
  emptyContainer: { alignItems: 'center', paddingVertical: SPACING.xxl * 2 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.lg },
  emptyTitle: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.lg, fontWeight: '700', color: '#1E293B', marginBottom: SPACING.xs },
  emptyText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, color: '#94A3B8' },
  userCard: { marginBottom: SPACING.md, padding: SPACING.md, borderRadius: 14, borderWidth: 1, borderColor: '#F1F5F9', backgroundColor: '#fff', ...SHADOWS.sm },
  userCardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  avatarWrapper: { marginRight: SPACING.md },
  avatarCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  userInfo: { flex: 1 },
  userName: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text },
  userId: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: SPACING.sm, gap: SPACING.xs },
  statusBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: BORDER_RADIUS.sm },
  statusText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.xs, fontWeight: '600' },
  typeBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: BORDER_RADIUS.sm, backgroundColor: '#F1F5F9' },
  typeText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, fontWeight: '600' },
  joinedRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.sm, gap: 4 },
  joinedText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  userActions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: SPACING.md, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: SPACING.sm },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.sm, backgroundColor: COLORS.primary + '15', gap: SPACING.xs },
  actionBtnText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.primary },
  verifyBtn: { backgroundColor: '#00B894' },
  verifyBtnText: { color: '#fff' },
  activateBtn: { backgroundColor: '#4A90D9' },
  activateBtnText: { color: '#fff' },
  suspendBtn: { backgroundColor: COLORS.error + '15' },
  suspendBtnText: { color: COLORS.error },
  paginationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.lg, marginHorizontal: SPACING.md },
  pageBtn: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.sm, backgroundColor: '#fff', borderWidth: 1, borderColor: '#F1F5F9' },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.text },
  paginationInfo: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  totalInfo: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.sm, paddingHorizontal: SPACING.md, marginBottom: SPACING.lg },
});

export default UserManagementScreen;
