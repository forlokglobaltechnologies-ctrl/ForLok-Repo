import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  RefreshControl,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Check, Download, X } from 'lucide-react-native';
import { adminApi } from '@utils/apiClient';
import { BORDER_RADIUS, COLORS, FONTS, SHADOWS, SPACING } from '@constants/theme';

type RoleItem = {
  roleId: string;
  roleKey: string;
  name: string;
  permissions: string[];
  isActive: boolean;
};

const PERMISSION_CATALOG = [
  { key: 'dashboard:view', label: 'Dashboard' },
  { key: 'users:view', label: 'Users View' },
  { key: 'users:manage', label: 'Users Manage' },
  { key: 'offers:view', label: 'Offers View' },
  { key: 'offers:moderate', label: 'Offers Moderate' },
  { key: 'bookings:view', label: 'Bookings View' },
  { key: 'promos:review', label: 'Promos Review' },
  { key: 'coins:view', label: 'Coins View' },
  { key: 'feedback:view', label: 'Feedback View' },
  { key: 'feedback:manage', label: 'Feedback Manage' },
  { key: 'analytics:view', label: 'Analytics View' },
  { key: 'withdrawals:view', label: 'Withdrawals View' },
  { key: 'withdrawals:manage', label: 'Withdrawals Manage' },
  { key: 'content:view', label: 'Content View' },
  { key: 'content:manage', label: 'Content Manage' },
  { key: 'master_data:view', label: 'Master Data View' },
  { key: 'master_data:manage', label: 'Master Data Manage' },
  { key: 'settings:view', label: 'Settings View' },
  { key: 'settings:manage', label: 'Settings Manage' },
  { key: 'roles:view', label: 'Roles View' },
  { key: 'roles:manage', label: 'Roles Manage' },
  { key: 'admins:view', label: 'Admins View' },
  { key: 'admins:manage', label: 'Admins Manage' },
];

const CELL_W = 126;
const ROLE_COL_W = 170;

const AdminPermissionMatrixScreen = () => {
  const navigation = useNavigation();
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRoles = useCallback(async () => {
    const res = await adminApi.getRoles();
    if (res.success) {
      setRoles(res.data?.roles || []);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await loadRoles();
      } finally {
        setLoading(false);
      }
    })();
  }, [loadRoles]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadRoles();
    } finally {
      setRefreshing(false);
    }
  };

  const matrixRoles = useMemo(() => {
    const filtered = roles.filter((r) => r.isActive).sort((a, b) => a.roleKey.localeCompare(b.roleKey));
    return [
      {
        roleId: 'super_admin',
        roleKey: 'super_admin',
        name: 'Super Admin',
        permissions: ['*'],
        isActive: true,
      },
      ...filtered,
    ];
  }, [roles]);

  const hasPermission = (role: RoleItem, permissionKey: string): boolean => {
    if (role.roleKey === 'super_admin') return true;
    return role.permissions.includes(permissionKey) || role.permissions.includes('*');
  };

  const toCsvSafe = (value: string) => {
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const handleExportCsv = async () => {
    try {
      const header = ['Role Key', 'Role Name', ...PERMISSION_CATALOG.map((p) => p.key)];
      const rows = matrixRoles.map((role) => [
        role.roleKey,
        role.name,
        ...PERMISSION_CATALOG.map((p) => (hasPermission(role, p.key) ? 'yes' : 'no')),
      ]);
      const csv = [header, ...rows].map((row) => row.map((cell) => toCsvSafe(cell)).join(',')).join('\n');
      await Share.share({
        title: 'forlok_permission_matrix.csv',
        message: csv,
      });
    } catch (_error) {
      Alert.alert('Export failed', 'Unable to export CSV right now');
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#0284C7" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Permission Matrix</Text>
        <TouchableOpacity onPress={handleExportCsv} style={styles.exportBtn}>
          <Download size={18} color="#0369A1" />
          <Text style={styles.exportBtnText}>CSV</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.legendBox}>
        <Text style={styles.legendText}>Read-only audit table. Green = allowed, red = not allowed.</Text>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0284C7" />}
        contentContainerStyle={styles.outerContent}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.tableWrap}>
            <View style={styles.headerRow}>
              <View style={[styles.roleHeaderCell, { width: ROLE_COL_W }]}>
                <Text style={styles.headerCellText}>Role</Text>
              </View>
              {PERMISSION_CATALOG.map((p) => (
                <View key={p.key} style={[styles.headerCell, { width: CELL_W }]}>
                  <Text style={styles.headerCellText}>{p.label}</Text>
                </View>
              ))}
            </View>

            {matrixRoles.map((role) => (
              <View key={role.roleId} style={styles.dataRow}>
                <View style={[styles.roleCell, { width: ROLE_COL_W }]}>
                  <Text style={styles.roleName}>{role.name}</Text>
                  <Text style={styles.roleKey}>{role.roleKey}</Text>
                </View>
                {PERMISSION_CATALOG.map((p) => {
                  const allowed = hasPermission(role, p.key);
                  return (
                    <View key={`${role.roleId}-${p.key}`} style={[styles.dataCell, { width: CELL_W }]}>
                      <View style={[styles.badge, allowed ? styles.allowedBadge : styles.deniedBadge]}>
                        {allowed ? <Check size={12} color="#fff" /> : <X size={12} color="#fff" />}
                        <Text style={styles.badgeText}>{allowed ? 'Yes' : 'No'}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingTop: SPACING.xl,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.lg, color: COLORS.text, fontWeight: '700' },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.round,
  },
  exportBtnText: { color: '#0369A1', fontFamily: FONTS.regular, fontSize: FONTS.sizes.xs, fontWeight: '700' },
  legendBox: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: '#E0F2FE',
    borderRadius: BORDER_RADIUS.md,
  },
  legendText: { color: '#075985', fontFamily: FONTS.regular, fontSize: FONTS.sizes.xs },
  outerContent: { padding: SPACING.md, paddingBottom: SPACING.xl },
  tableWrap: {
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  headerRow: { flexDirection: 'row', backgroundColor: '#0F172A' },
  roleHeaderCell: {
    borderRightWidth: 1,
    borderRightColor: '#1E293B',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    justifyContent: 'center',
  },
  headerCell: {
    borderRightWidth: 1,
    borderRightColor: '#1E293B',
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.sm,
    justifyContent: 'center',
  },
  headerCellText: { color: '#E2E8F0', fontFamily: FONTS.regular, fontSize: 11, fontWeight: '700' },
  dataRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  roleCell: {
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  roleName: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, color: '#0F172A', fontWeight: '700' },
  roleKey: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.xs, color: '#475569' },
  dataCell: {
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: BORDER_RADIUS.round,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  allowedBadge: { backgroundColor: '#059669' },
  deniedBadge: { backgroundColor: '#DC2626' },
  badgeText: { color: '#fff', fontFamily: FONTS.regular, fontSize: 11, fontWeight: '700' },
});

export default AdminPermissionMatrixScreen;
