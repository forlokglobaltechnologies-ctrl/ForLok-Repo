import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Shield, Trash2 } from 'lucide-react-native';
import { adminApi } from '@utils/apiClient';
import { BORDER_RADIUS, COLORS, FONTS, SHADOWS, SPACING } from '@constants/theme';

type AdminRole = {
  roleId: string;
  roleKey: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
  isActive: boolean;
};

const ALL_PERMISSIONS = [
  'dashboard:view',
  'users:view',
  'users:manage',
  'offers:view',
  'offers:moderate',
  'bookings:view',
  'promos:review',
  'coins:view',
  'feedback:view',
  'feedback:manage',
  'analytics:view',
  'withdrawals:view',
  'withdrawals:manage',
  'content:view',
  'content:manage',
  'master_data:view',
  'master_data:manage',
  'settings:view',
  'settings:manage',
  'roles:view',
  'roles:manage',
  'admins:view',
  'admins:manage',
];

const AdminRolesScreen = () => {
  const navigation = useNavigation();
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [roleKey, setRoleKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [permissionsDropdownOpen, setPermissionsDropdownOpen] = useState(false);

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
      } catch (error) {
        Alert.alert('Error', 'Failed to load roles');
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

  const handleCreateRole = async () => {
    if (!roleKey.trim() || !name.trim()) {
      Alert.alert('Validation', 'Role key and name are required');
      return;
    }
    setSaving(true);
    try {
      const res = await adminApi.createRole({
        roleKey: roleKey.trim().toLowerCase(),
        name: name.trim(),
        description: description.trim() || undefined,
        permissions: selectedPermissions,
      });
      if (!res.success) {
        throw new Error(res.message || 'Could not create role');
      }
      setRoleKey('');
      setName('');
      setDescription('');
      setSelectedPermissions([]);
      setPermissionsDropdownOpen(false);
      await loadRoles();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to create role');
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (permission: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission]
    );
  };

  const toggleRoleStatus = async (item: AdminRole) => {
    try {
      const res = await adminApi.updateRole(item.roleKey, { isActive: !item.isActive });
      if (!res.success) throw new Error(res.message || 'Failed');
      await loadRoles();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update role');
    }
  };

  const handleDeleteRole = async (item: AdminRole) => {
    Alert.alert('Delete Role', `Delete "${item.name}" role?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await adminApi.deleteRole(item.roleKey);
            if (!res.success) throw new Error(res.message || 'Failed');
            await loadRoles();
          } catch (error: any) {
            Alert.alert('Error', error?.message || 'Failed to delete role');
          }
        },
      },
    ]);
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
        <Text style={styles.headerTitle}>Role Management</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0284C7" />}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create Role</Text>
          <TextInput
            style={styles.input}
            placeholder="Role key (example: support_admin)"
            value={roleKey}
            onChangeText={setRoleKey}
            autoCapitalize="none"
          />
          <TextInput style={styles.input} placeholder="Role name" value={name} onChangeText={setName} />
          <TextInput
            style={styles.input}
            placeholder="Description (optional)"
            value={description}
            onChangeText={setDescription}
          />
          <Text style={styles.permissionsLabel}>Permissions</Text>
          <TouchableOpacity
            style={styles.dropdownToggle}
            onPress={() => setPermissionsDropdownOpen((prev) => !prev)}
          >
            <Text style={styles.dropdownToggleText}>
              {selectedPermissions.length > 0
                ? `${selectedPermissions.length} selected`
                : 'Select permissions'}
            </Text>
            <Text style={styles.dropdownArrow}>{permissionsDropdownOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {permissionsDropdownOpen && (
            <ScrollView style={styles.dropdownMenu} nestedScrollEnabled>
              {ALL_PERMISSIONS.map((permission) => {
                const checked = selectedPermissions.includes(permission);
                return (
                  <TouchableOpacity
                    key={permission}
                    style={styles.permissionOption}
                    onPress={() => togglePermission(permission)}
                  >
                    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                      {checked && <Text style={styles.checkText}>✓</Text>}
                    </View>
                    <Text style={styles.permissionOptionText}>{permission}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {selectedPermissions.length > 0 && (
            <Text style={styles.selectedPermissionsText}>{selectedPermissions.join(', ')}</Text>
          )}
          <TouchableOpacity style={styles.primaryBtn} disabled={saving} onPress={handleCreateRole}>
            <Text style={styles.primaryBtnText}>{saving ? 'Creating...' : 'Create Role'}</Text>
          </TouchableOpacity>
        </View>

        {roles.map((item) => (
          <View key={item.roleId} style={styles.roleCard}>
            <View style={styles.roleTop}>
              <View style={styles.roleBadge}>
                <Shield size={14} color="#0284C7" />
                <Text style={styles.roleKey}>{item.roleKey}</Text>
              </View>
              <Text style={[styles.status, item.isActive ? styles.active : styles.inactive]}>
                {item.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
            <Text style={styles.roleName}>{item.name}</Text>
            {!!item.description && <Text style={styles.roleDescription}>{item.description}</Text>}
            <Text style={styles.permissionsText}>{item.permissions.join(', ') || 'No permissions'}</Text>

            <View style={styles.rowActions}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => toggleRoleStatus(item)}>
                <Text style={styles.secondaryBtnText}>{item.isActive ? 'Disable' : 'Enable'}</Text>
              </TouchableOpacity>
              {!item.isSystem && (
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteRole(item)}>
                  <Trash2 size={14} color="#fff" />
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
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
  content: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xl },
  card: { backgroundColor: '#fff', borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, ...SHADOWS.sm },
  cardTitle: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.md, fontWeight: '700', marginBottom: SPACING.sm },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
    backgroundColor: '#fff',
    fontFamily: FONTS.regular,
  },
  permissionsLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: '#475569',
    marginBottom: 6,
  },
  dropdownToggle: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
  },
  dropdownToggleText: {
    fontFamily: FONTS.regular,
    color: '#0F172A',
    fontSize: FONTS.sizes.sm,
  },
  dropdownArrow: {
    color: '#475569',
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.regular,
  },
  dropdownMenu: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    maxHeight: 220,
    backgroundColor: '#fff',
  },
  permissionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  permissionOptionText: {
    marginLeft: SPACING.sm,
    color: '#334155',
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  checkText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: FONTS.regular,
    fontWeight: '700',
  },
  selectedPermissionsText: {
    marginBottom: SPACING.sm,
    color: '#334155',
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
  },
  primaryBtn: {
    backgroundColor: '#0284C7',
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    marginTop: SPACING.xs,
  },
  primaryBtnText: { color: '#fff', fontFamily: FONTS.regular, fontWeight: '700' },
  roleCard: { backgroundColor: '#fff', borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, ...SHADOWS.sm },
  roleTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.round,
  },
  roleKey: { color: '#0369A1', fontFamily: FONTS.regular, fontSize: FONTS.sizes.xs, fontWeight: '700' },
  status: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.xs, fontWeight: '700' },
  active: { color: '#059669' },
  inactive: { color: '#DC2626' },
  roleName: { marginTop: SPACING.sm, fontFamily: FONTS.regular, fontSize: FONTS.sizes.md, fontWeight: '700' },
  roleDescription: { marginTop: 2, color: '#64748B', fontFamily: FONTS.regular, fontSize: FONTS.sizes.xs },
  permissionsText: { marginTop: SPACING.sm, color: '#334155', fontFamily: FONTS.regular, fontSize: FONTS.sizes.xs },
  rowActions: { marginTop: SPACING.sm, flexDirection: 'row', gap: SPACING.sm },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#0284C7',
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  secondaryBtnText: { color: '#0284C7', fontFamily: FONTS.regular, fontWeight: '700' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
  },
  deleteBtnText: { color: '#fff', fontFamily: FONTS.regular, fontWeight: '700' },
});

export default AdminRolesScreen;
