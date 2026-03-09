import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { ArrowLeft, UserCog } from 'lucide-react-native';
import { adminApi } from '@utils/apiClient';
import { BORDER_RADIUS, COLORS, FONTS, SHADOWS, SPACING } from '@constants/theme';

type AdminUser = {
  adminId: string;
  username: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
};

type RoleItem = {
  roleKey: string;
  name: string;
  isActive: boolean;
};

const AdminUsersScreen = () => {
  const navigation = useNavigation();
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('admin');

  const roleOptions = useMemo(
    () =>
      ['super_admin', ...roles.filter((r) => r.isActive).map((r) => r.roleKey)].filter(
        (value, index, arr) => arr.indexOf(value) === index
      ),
    [roles]
  );

  const loadData = useCallback(async () => {
    const [adminsRes, rolesRes] = await Promise.all([adminApi.getAdminUsers(), adminApi.getRoles()]);
    if (adminsRes.success) {
      setAdminUsers(adminsRes.data?.admins || []);
    }
    if (rolesRes.success) {
      setRoles(rolesRes.data?.roles || []);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await loadData();
      } catch (error) {
        Alert.alert('Error', 'Failed to load admin users');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreateAdmin = async () => {
    if (!username.trim() || !email.trim() || !name.trim() || !password.trim()) {
      Alert.alert('Validation', 'Please fill all required fields');
      return;
    }
    setSaving(true);
    try {
      const res = await adminApi.createAdminUser({
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        name: name.trim(),
        password: password.trim(),
        role: selectedRole,
      });
      if (!res.success) {
        throw new Error(res.message || 'Could not create admin user');
      }
      setUsername('');
      setEmail('');
      setName('');
      setPassword('');
      setSelectedRole('admin');
      await loadData();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to create admin user');
    } finally {
      setSaving(false);
    }
  };

  const toggleAdminStatus = async (item: AdminUser) => {
    try {
      const res = await adminApi.updateAdminUser(item.adminId, { isActive: !item.isActive });
      if (!res.success) throw new Error(res.message || 'Update failed');
      await loadData();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update admin user');
    }
  };

  const resetPassword = async (item: AdminUser) => {
    const defaultPassword = 'forlok123';
    Alert.alert(
      'Reset Password',
      `Reset password for ${item.username} to "${defaultPassword}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: async () => {
            try {
              const res = await adminApi.resetAdminUserPassword(item.adminId, defaultPassword);
              if (!res.success) throw new Error(res.message || 'Failed');
              Alert.alert('Success', `Password reset to ${defaultPassword}`);
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Failed to reset password');
            }
          },
        },
      ]
    );
  };

  const deleteAdminUser = async (item: AdminUser) => {
    Alert.alert('Delete Admin', `Delete admin user ${item.username}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await adminApi.deleteAdminUser(item.adminId);
            if (!res.success) throw new Error(res.message || 'Delete failed');
            await loadData();
          } catch (error: any) {
            Alert.alert('Error', error?.message || 'Failed to delete admin user');
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
        <Text style={styles.headerTitle}>Admin Users</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0284C7" />}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create Admin User</Text>
          <TextInput style={styles.input} placeholder="Username" value={username} onChangeText={setUsername} />
          <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} />
          <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
          <TextInput
            style={styles.input}
            placeholder="Password (min 8 chars)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Text style={styles.sectionLabel}>Role</Text>
          <View style={styles.roleWrap}>
            {roleOptions.map((role) => (
              <TouchableOpacity
                key={role}
                style={[styles.roleChip, selectedRole === role && styles.roleChipActive]}
                onPress={() => setSelectedRole(role)}
              >
                <Text style={[styles.roleChipText, selectedRole === role && styles.roleChipTextActive]}>
                  {role}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.primaryBtn} disabled={saving} onPress={handleCreateAdmin}>
            <Text style={styles.primaryBtnText}>{saving ? 'Creating...' : 'Create Admin User'}</Text>
          </TouchableOpacity>
        </View>

        {adminUsers.map((item) => (
          <View key={item.adminId} style={styles.userCard}>
            <View style={styles.userTop}>
              <View style={styles.userBadge}>
                <UserCog size={14} color="#0284C7" />
                <Text style={styles.userBadgeText}>{item.username}</Text>
              </View>
              <Text style={[styles.status, item.isActive ? styles.active : styles.inactive]}>
                {item.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.meta}>{item.email}</Text>
            <Text style={styles.meta}>Role: {item.role}</Text>

            <View style={styles.rowActions}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => toggleAdminStatus(item)}>
                <Text style={styles.secondaryBtnText}>{item.isActive ? 'Deactivate' : 'Activate'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtnSmall} onPress={() => resetPassword(item)}>
                <Text style={styles.primaryBtnText}>Reset Password</Text>
              </TouchableOpacity>
              {item.role !== 'super_admin' && (
                <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteAdminUser(item)}>
                  <Text style={styles.primaryBtnText}>Delete</Text>
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
  sectionLabel: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.xs, color: '#475569', marginBottom: 6 },
  roleWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginBottom: SPACING.sm },
  roleChip: {
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    borderRadius: BORDER_RADIUS.round,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  roleChipActive: { backgroundColor: '#0284C7', borderColor: '#0284C7' },
  roleChipText: { fontFamily: FONTS.regular, color: '#0369A1', fontSize: FONTS.sizes.xs, fontWeight: '600' },
  roleChipTextActive: { color: '#fff' },
  primaryBtn: {
    backgroundColor: '#0284C7',
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  primaryBtnSmall: {
    backgroundColor: '#0284C7',
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    flex: 1,
  },
  primaryBtnText: { color: '#fff', fontFamily: FONTS.regular, fontWeight: '700' },
  userCard: { backgroundColor: '#fff', borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, ...SHADOWS.sm },
  userTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.round,
  },
  userBadgeText: { color: '#0369A1', fontFamily: FONTS.regular, fontSize: FONTS.sizes.xs, fontWeight: '700' },
  userName: { marginTop: SPACING.sm, fontFamily: FONTS.regular, fontSize: FONTS.sizes.md, fontWeight: '700' },
  meta: { marginTop: 2, color: '#64748B', fontFamily: FONTS.regular, fontSize: FONTS.sizes.xs },
  status: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.xs, fontWeight: '700' },
  active: { color: '#059669' },
  inactive: { color: '#DC2626' },
  rowActions: { marginTop: SPACING.sm, flexDirection: 'row', gap: SPACING.sm },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#0284C7',
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
  },
  secondaryBtnText: { color: '#0284C7', fontFamily: FONTS.regular, fontWeight: '700' },
  deleteBtn: {
    backgroundColor: '#DC2626',
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    flex: 1,
  },
});

export default AdminUsersScreen;
