import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, MessageSquare, CircleCheck, CircleAlert } from 'lucide-react-native';
import { useTheme } from '@context/ThemeContext';
import { feedbackApi } from '@utils/apiClient';
import { FONTS, SPACING, BORDER_RADIUS } from '@constants/theme';
import { normalize } from '@utils/responsive';

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  acknowledged: '#3B82F6',
  resolved: '#10B981',
  archived: '#6B7280',
};

const MyReportsScreen = () => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reports, setReports] = useState<any[]>([]);

  const loadReports = useCallback(async () => {
    const res = await feedbackApi.getMyFeedback({ limit: 50 });
    if (res.success && res.data) {
      setReports((res.data as any).feedback || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>My Reports</Text>
        <View style={{ width: 22 }} />
      </View>

      <FlatList
        data={reports}
        keyExtractor={(item) => item.feedbackId}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await loadReports();
              setRefreshing(false);
            }}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <MessageSquare size={28} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No reports submitted yet.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const statusColor = STATUS_COLORS[item.status] || theme.colors.textSecondary;
          return (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => navigation.navigate('ReportBug', { feedbackId: item.feedbackId })}
              activeOpacity={0.75}
            >
              <View style={styles.cardTop}>
                <Text style={[styles.subject, { color: theme.colors.text }]} numberOfLines={1}>
                  {item.subject}
                </Text>
                <View style={[styles.statusPill, { backgroundColor: `${statusColor}20` }]}>
                  {item.status === 'resolved' ? (
                    <CircleCheck size={12} color={statusColor} />
                  ) : (
                    <CircleAlert size={12} color={statusColor} />
                  )}
                  <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
                </View>
              </View>
              <Text style={[styles.desc, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                {item.description}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginTop: normalize(30),
  },
  title: { fontFamily: FONTS.regular, fontSize: normalize(18), fontWeight: '700' },
  listContent: { padding: SPACING.md, paddingBottom: normalize(80), gap: normalize(10) },
  card: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  subject: { flex: 1, fontFamily: FONTS.regular, fontSize: normalize(14), fontWeight: '600' },
  desc: { marginTop: 8, fontFamily: FONTS.regular, fontSize: normalize(12), lineHeight: normalize(18) },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.round,
  },
  statusText: { fontFamily: FONTS.regular, fontSize: normalize(11), textTransform: 'capitalize' },
  empty: { alignItems: 'center', marginTop: normalize(80), gap: 8 },
  emptyText: { fontFamily: FONTS.regular, fontSize: normalize(13) },
});

export default MyReportsScreen;

