import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, FileText } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '@constants/theme';
import { normalize } from '@utils/responsive';
import { adminApi } from '@utils/apiClient';
import { Button } from '@components/common/Button';

const AdminContentManagementScreen = () => {
  const navigation = useNavigation<any>();
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [keyValue, setKeyValue] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [payloadJson, setPayloadJson] = useState('{\n  "sections": []\n}');
  const [isPublished, setIsPublished] = useState(true);

  const loadPages = useCallback(async () => {
    setLoading(true);
    const res = await adminApi.getContentPages();
    if (res.success && res.data) {
      setPages((res.data as any).pages || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadPages();
  }, [loadPages]);

  const onSave = async () => {
    if (!keyValue.trim() || !title.trim()) {
      Alert.alert('Validation', 'Key and title are required.');
      return;
    }

    let parsedPayload: Record<string, any> = {};
    try {
      parsedPayload = JSON.parse(payloadJson || '{}');
    } catch (_e) {
      Alert.alert('Invalid JSON', 'Payload must be valid JSON.');
      return;
    }

    const res = await adminApi.upsertContentPage(keyValue.trim().toLowerCase(), {
      title: title.trim(),
      description: description.trim() || undefined,
      payload: parsedPayload,
      isPublished,
    });

    if (res.success) {
      Alert.alert('Saved', 'Content page saved successfully.');
      await loadPages();
    } else {
      Alert.alert('Error', res.error || 'Failed to save content page.');
    }
  };

  const onSelectPage = (page: any) => {
    setKeyValue(page.key || '');
    setTitle(page.title || '');
    setDescription(page.description || '');
    setPayloadJson(JSON.stringify(page.payload || {}, null, 2));
    setIsPublished(Boolean(page.isPublished));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CMS Content</Text>
        <TouchableOpacity onPress={() => void loadPages()}>
          <Text style={styles.refreshText}>{loading ? '...' : 'Refresh'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Existing Pages</Text>
        <FlatList
          horizontal
          data={pages}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.pageList}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.pageChip} onPress={() => onSelectPage(item)}>
              <FileText size={14} color={COLORS.primary} />
              <Text style={styles.pageChipText}>{item.key}</Text>
            </TouchableOpacity>
          )}
        />

        <Text style={styles.label}>Key</Text>
        <TextInput style={styles.input} value={keyValue} onChangeText={setKeyValue} placeholder="terms_conditions" />

        <Text style={styles.label}>Title</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Terms & Conditions" />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          placeholder="Optional description"
        />

        <View style={styles.publishRow}>
          <Text style={styles.label}>Published</Text>
          <Switch value={isPublished} onValueChange={setIsPublished} />
        </View>

        <Text style={styles.label}>Payload JSON</Text>
        <TextInput
          style={[styles.input, styles.payloadInput]}
          value={payloadJson}
          onChangeText={setPayloadJson}
          multiline
          textAlignVertical="top"
        />

        <Button title="Save Content Page" onPress={onSave} variant="primary" size="large" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    marginTop: normalize(28),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  headerTitle: { fontFamily: FONTS.regular, fontSize: normalize(18), fontWeight: '700', color: COLORS.text },
  refreshText: { fontFamily: FONTS.regular, fontSize: normalize(12), color: COLORS.primary, fontWeight: '600' },
  content: { flex: 1, padding: SPACING.md },
  sectionTitle: { fontFamily: FONTS.regular, fontSize: normalize(14), color: COLORS.text, fontWeight: '700' },
  pageList: { gap: 8, paddingVertical: 10 },
  pageChip: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.round,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: COLORS.white,
  },
  pageChipText: { fontFamily: FONTS.regular, fontSize: normalize(12), color: COLORS.text },
  label: { fontFamily: FONTS.regular, fontSize: normalize(12), color: COLORS.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontFamily: FONTS.regular,
    color: COLORS.text,
  },
  payloadInput: { minHeight: normalize(180), fontSize: normalize(12) },
  publishRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
});

export default AdminContentManagementScreen;

