import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Switch,
  Image,
} from 'react-native';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '@constants/theme';
import { normalize } from '@utils/responsive';
import { adminApi, uploadFile } from '@utils/apiClient';
import { Button } from '@components/common/Button';
import { cloneContentDefault } from '@constants/contentDefaults';

type PageKey =
  | 'about'
  | 'terms_conditions'
  | 'privacy_policy'
  | 'intellectual_property'
  | 'faq'
  | 'help_support';

const PAGES: Array<{ key: PageKey; label: string; title: string }> = [
  { key: 'about', label: 'About', title: 'About App' },
  { key: 'terms_conditions', label: 'Terms', title: 'Terms & Conditions' },
  { key: 'privacy_policy', label: 'Privacy', title: 'Privacy Policy' },
  { key: 'intellectual_property', label: 'IP', title: 'Intellectual Property' },
  { key: 'faq', label: 'FAQ', title: 'FAQs' },
  { key: 'help_support', label: 'Help', title: 'Help & Support' },
];

const makeDefaultPayload = (key: PageKey): Record<string, any> => cloneContentDefault(key as any);

const mergePrefill = (defaultValue: any, currentValue: any): any => {
  if (currentValue === undefined || currentValue === null || currentValue === '') {
    return defaultValue;
  }

  if (Array.isArray(defaultValue)) {
    if (!Array.isArray(currentValue) || currentValue.length === 0) {
      return defaultValue;
    }
    if (defaultValue.length === 0) return currentValue;
    const mergedArray: any[] = [];
    const maxLength = Math.max(defaultValue.length, currentValue.length);
    for (let i = 0; i < maxLength; i += 1) {
      if (i < currentValue.length) {
        mergedArray.push(
          i < defaultValue.length
            ? mergePrefill(defaultValue[i], currentValue[i])
            : currentValue[i]
        );
      } else {
        mergedArray.push(defaultValue[i]);
      }
    }
    return mergedArray;
  }

  if (
    defaultValue &&
    currentValue &&
    typeof defaultValue === 'object' &&
    typeof currentValue === 'object' &&
    !Array.isArray(defaultValue) &&
    !Array.isArray(currentValue)
  ) {
    const merged: Record<string, any> = { ...defaultValue, ...currentValue };
    Object.keys(defaultValue).forEach((key) => {
      merged[key] = mergePrefill(defaultValue[key], currentValue[key]);
    });
    return merged;
  }

  return currentValue;
};

const hydratePayload = (pageKey: PageKey, storedPayload?: Record<string, any>) => {
  const defaults = makeDefaultPayload(pageKey);
  if (!storedPayload) return defaults;
  return mergePrefill(defaults, storedPayload);
};

const AdminContentFormsScreen = () => {
  const navigation = useNavigation<any>();
  const [selected, setSelected] = useState<PageKey>('about');
  const [loading, setLoading] = useState(false);
  const [isPublished, setIsPublished] = useState(true);
  const [logoUploading, setLogoUploading] = useState(false);
  const [description, setDescription] = useState('');
  const [payload, setPayload] = useState<Record<string, any>>(makeDefaultPayload('about'));
  const [allPages, setAllPages] = useState<Record<string, any>>({});

  const selectedMeta = useMemo(() => PAGES.find((p) => p.key === selected)!, [selected]);

  const loadPages = async () => {
    setLoading(true);
    const res = await adminApi.getContentPages();
    if (res.success && res.data) {
      const pages = ((res.data as any).pages || []) as any[];
      const map: Record<string, any> = {};
      pages.forEach((p) => {
        map[p.key] = p;
      });
      setAllPages(map);
      const current = map[selected];
      if (current) {
        setPayload(hydratePayload(selected, current.payload));
        setDescription(current.description || '');
        setIsPublished(current.isPublished !== false);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadPages();
  }, []);

  useEffect(() => {
    const page = allPages[selected];
    if (page) {
      setPayload(hydratePayload(selected, page.payload));
      setDescription(page.description || '');
      setIsPublished(page.isPublished !== false);
    } else {
      setPayload(makeDefaultPayload(selected));
      setDescription('');
      setIsPublished(true);
    }
  }, [selected, allPages]);

  const updateField = (key: string, value: any) => {
    setPayload((prev) => ({ ...prev, [key]: value }));
  };

  const handlePickAboutLogo = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Please allow photo library access to upload logo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
      });
      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      setLogoUploading(true);

      // Show picked image immediately while upload runs
      updateField('logoUrl', asset.uri);

      const uploadRes = await uploadFile(
        // Backend document upload accepts whitelisted types; use user_photo for app logo asset upload.
        '/api/documents/upload?type=user_photo',
        {
          uri: asset.uri,
          type: asset.mimeType || 'image/jpeg',
          name: asset.fileName || `about_logo_${Date.now()}.jpg`,
        }
      );

      if (uploadRes.success && uploadRes.data?.url) {
        updateField('logoUrl', uploadRes.data.url);
        Alert.alert('Success', 'Logo uploaded successfully.');
      } else {
        Alert.alert('Upload failed', uploadRes.error || 'Unable to upload logo.');
      }
    } catch (error: any) {
      Alert.alert('Upload failed', error?.message || 'Unable to upload logo.');
    } finally {
      setLogoUploading(false);
    }
  };

  const onSave = async () => {
    let finalPayload = payload;
    if (selected === 'faq') {
      const categories = Array.isArray(payload.categories) ? payload.categories : [];
      finalPayload = {
        ...payload,
        categories: categories.map((category: any) => ({
          ...category,
          icon: category.icon || 'help_circle',
        })),
      };
    }
    if (selected === 'help_support') {
      const helpDefaults = makeDefaultPayload('help_support');
      const quickDefaults = Array.isArray(helpDefaults.quickActions) ? helpDefaults.quickActions : [];
      const topicDefaults = Array.isArray(helpDefaults.popularTopics) ? helpDefaults.popularTopics : [];
      const contactDefaults = Array.isArray(helpDefaults.contactOptions) ? helpDefaults.contactOptions : [];

      const quickActions = Array.isArray(payload.quickActions) ? payload.quickActions : [];
      const popularTopics = Array.isArray(payload.popularTopics) ? payload.popularTopics : [];
      const contactOptions = Array.isArray(payload.contactOptions) ? payload.contactOptions : [];

      finalPayload = {
        ...payload,
        quickActions: quickActions.map((row: any, idx: number) => ({
          ...row,
          icon: row.icon || quickDefaults[idx]?.icon || 'help_circle',
          color: row.color || quickDefaults[idx]?.color || '#F99E3C',
          route: row.route || quickDefaults[idx]?.route || '',
          actionType: row.actionType || quickDefaults[idx]?.actionType || '',
          actionValue: row.actionValue || quickDefaults[idx]?.actionValue || '',
        })),
        popularTopics: popularTopics.map((row: any, idx: number) => ({
          ...row,
          icon: row.icon || topicDefaults[idx]?.icon || 'help_circle',
          color: row.color || topicDefaults[idx]?.color || '#F99E3C',
        })),
        contactOptions: contactOptions.map((row: any, idx: number) => ({
          ...row,
          icon: row.icon || contactDefaults[idx]?.icon || 'help_circle',
          color: row.color || contactDefaults[idx]?.color || '#F99E3C',
          actionType: row.actionType || contactDefaults[idx]?.actionType || 'url',
          actionValue: row.actionValue || contactDefaults[idx]?.actionValue || '',
        })),
      };
    }

    const res = await adminApi.upsertContentPage(selected, {
      title: selectedMeta.title,
      description: description || undefined,
      payload: finalPayload,
      isPublished,
    });
    if (res.success) {
      Alert.alert('Saved', `${selectedMeta.label} content updated successfully.`);
      await loadPages();
    } else {
      Alert.alert('Error', res.error || 'Failed to save content.');
    }
  };

  const renderSectionsEditor = (field: string) => {
    const rows = Array.isArray(payload[field]) ? payload[field] : [];
    return (
      <View style={styles.editorBlock}>
        <Text style={styles.blockTitle}>Sections</Text>
        {rows.map((row: any, idx: number) => (
          <View key={`${field}-${idx}`} style={styles.rowCard}>
            <TextInput
              style={styles.input}
              value={row.title || ''}
              onChangeText={(text) => {
                const next = [...rows];
                next[idx] = { ...next[idx], title: text };
                updateField(field, next);
              }}
              placeholder="Section title"
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              value={row.content || ''}
              onChangeText={(text) => {
                const next = [...rows];
                next[idx] = { ...next[idx], content: text };
                updateField(field, next);
              }}
              multiline
              textAlignVertical="top"
              placeholder="Section content"
            />
            <TouchableOpacity
              style={styles.inlineDelete}
              onPress={() => updateField(field, rows.filter((_: any, i: number) => i !== idx))}
            >
              <Trash2 size={14} color={COLORS.error} />
              <Text style={styles.inlineDeleteText}>Remove</Text>
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => updateField(field, [...rows, { title: '', content: '' }])}
        >
          <Plus size={14} color={COLORS.primary} />
          <Text style={styles.addBtnText}>Add Section</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderFaqEditor = () => {
    const categories = Array.isArray(payload.categories) ? payload.categories : [];
    return (
      <View style={styles.editorBlock}>
        <Text style={styles.blockTitle}>FAQ Categories & Questions</Text>
        {categories.map((category: any, cIdx: number) => (
          <View key={`faq-cat-${cIdx}`} style={styles.rowCard}>
            <TextInput
              style={styles.input}
              value={category.title || ''}
              onChangeText={(text) => {
                const next = [...categories];
                next[cIdx] = { ...next[cIdx], title: text };
                updateField('categories', next);
              }}
              placeholder="Category title"
            />
            <View style={styles.rowInline}>
              <TextInput
                style={styles.input}
                value={category.color || ''}
                onChangeText={(text) => {
                  const next = [...categories];
                  next[cIdx] = { ...next[cIdx], color: text };
                  updateField('categories', next);
                }}
                placeholder="color"
              />
            </View>

            {(category.items || []).map((item: any, qIdx: number) => (
              <View key={`faq-item-${cIdx}-${qIdx}`} style={styles.innerBox}>
                <TextInput
                  style={styles.input}
                  value={item.question || ''}
                  onChangeText={(text) => {
                    const next = [...categories];
                    const items = [...(next[cIdx].items || [])];
                    items[qIdx] = { ...items[qIdx], question: text };
                    next[cIdx] = { ...next[cIdx], items };
                    updateField('categories', next);
                  }}
                  placeholder="Question"
                />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={item.answer || ''}
                  onChangeText={(text) => {
                    const next = [...categories];
                    const items = [...(next[cIdx].items || [])];
                    items[qIdx] = { ...items[qIdx], answer: text };
                    next[cIdx] = { ...next[cIdx], items };
                    updateField('categories', next);
                  }}
                  placeholder="Answer"
                  multiline
                  textAlignVertical="top"
                />
              </View>
            ))}

            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => {
                const next = [...categories];
                next[cIdx] = { ...next[cIdx], items: [...(next[cIdx].items || []), { question: '', answer: '' }] };
                updateField('categories', next);
              }}
            >
              <Plus size={14} color={COLORS.primary} />
              <Text style={styles.addBtnText}>Add Question</Text>
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() =>
            updateField('categories', [...categories, { title: '', color: '#F99E3C', icon: 'help_circle', items: [] }])
          }
        >
          <Plus size={14} color={COLORS.primary} />
          <Text style={styles.addBtnText}>Add Category</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderHelpEditor = () => {
    const quickActions = Array.isArray(payload.quickActions) ? payload.quickActions : [];
    const popularTopics = Array.isArray(payload.popularTopics) ? payload.popularTopics : [];
    const contactOptions = Array.isArray(payload.contactOptions) ? payload.contactOptions : [];
    const helpDefaults = makeDefaultPayload('help_support');
    const quickDefaults = Array.isArray(helpDefaults.quickActions) ? helpDefaults.quickActions : [];
    const topicDefaults = Array.isArray(helpDefaults.popularTopics) ? helpDefaults.popularTopics : [];
    const contactDefaults = Array.isArray(helpDefaults.contactOptions) ? helpDefaults.contactOptions : [];
    return (
      <View>
        <Text style={styles.blockTitle}>Support Hours</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={payload.supportHoursText || ''}
          onChangeText={(text) => updateField('supportHoursText', text)}
          multiline
          placeholder="Support hours text"
        />

        <Text style={styles.blockTitle}>Quick Actions</Text>
        {quickActions.map((row: any, idx: number) => (
          <View key={`qa-${idx}`} style={styles.rowCard}>
            <TextInput style={styles.input} value={row.label || ''} onChangeText={(text) => {
              const next = [...quickActions]; next[idx] = { ...next[idx], label: text }; updateField('quickActions', next);
            }} placeholder="Label" />
            <TextInput style={styles.input} value={row.desc || ''} onChangeText={(text) => {
              const next = [...quickActions]; next[idx] = { ...next[idx], desc: text }; updateField('quickActions', next);
            }} placeholder="Description" />
          </View>
        ))}
        <TouchableOpacity style={styles.addBtn} onPress={() => {
          const defaultItem = quickDefaults[quickActions.length] || {};
          updateField('quickActions', [...quickActions, {
            label: '',
            desc: '',
            icon: defaultItem.icon || 'help_circle',
            color: defaultItem.color || '#F99E3C',
            route: defaultItem.route || '',
            actionType: defaultItem.actionType || '',
            actionValue: defaultItem.actionValue || '',
          }]);
        }}>
          <Plus size={14} color={COLORS.primary} />
          <Text style={styles.addBtnText}>Add Quick Action</Text>
        </TouchableOpacity>

        <Text style={styles.blockTitle}>Popular Topics</Text>
        {popularTopics.map((row: any, idx: number) => (
          <View key={`pt-${idx}`} style={styles.rowCard}>
            <TextInput style={styles.input} value={row.title || ''} onChangeText={(text) => {
              const next = [...popularTopics]; next[idx] = { ...next[idx], title: text }; updateField('popularTopics', next);
            }} placeholder="Topic title" />
            <TextInput style={styles.input} value={row.category || ''} onChangeText={(text) => {
              const next = [...popularTopics]; next[idx] = { ...next[idx], category: text }; updateField('popularTopics', next);
            }} placeholder="Category" />
            <TextInput style={[styles.input, styles.textArea]} value={row.explanation || ''} onChangeText={(text) => {
              const next = [...popularTopics]; next[idx] = { ...next[idx], explanation: text }; updateField('popularTopics', next);
            }} multiline placeholder="Explanation / answer" />
          </View>
        ))}
        <TouchableOpacity style={styles.addBtn} onPress={() => {
          const defaultItem = topicDefaults[popularTopics.length] || {};
          updateField('popularTopics', [...popularTopics, {
            title: '',
            category: '',
            icon: defaultItem.icon || 'help_circle',
            color: defaultItem.color || '#F99E3C',
            explanation: '',
          }]);
        }}>
          <Plus size={14} color={COLORS.primary} />
          <Text style={styles.addBtnText}>Add Topic</Text>
        </TouchableOpacity>

        <Text style={styles.blockTitle}>Contact Options</Text>
        {contactOptions.map((row: any, idx: number) => (
          <View key={`co-${idx}`} style={styles.rowCard}>
            <TextInput style={styles.input} value={row.label || ''} onChangeText={(text) => {
              const next = [...contactOptions]; next[idx] = { ...next[idx], label: text }; updateField('contactOptions', next);
            }} placeholder="Label" />
            <TextInput style={styles.input} value={row.desc || ''} onChangeText={(text) => {
              const next = [...contactOptions]; next[idx] = { ...next[idx], desc: text }; updateField('contactOptions', next);
            }} placeholder="Description" />
          </View>
        ))}
        <TouchableOpacity style={styles.addBtn} onPress={() => {
          const defaultItem = contactDefaults[contactOptions.length] || {};
          updateField('contactOptions', [...contactOptions, {
            label: '',
            desc: '',
            icon: defaultItem.icon || 'help_circle',
            color: defaultItem.color || '#F99E3C',
            actionType: defaultItem.actionType || 'url',
            actionValue: defaultItem.actionValue || '',
          }]);
        }}>
          <Plus size={14} color={COLORS.primary} />
          <Text style={styles.addBtnText}>Add Contact Option</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderPageFields = () => {
    if (selected === 'faq') return renderFaqEditor();
    if (selected === 'help_support') return renderHelpEditor();

    return (
      <View>
        {selected === 'about' && (
          <>
            <Text style={styles.blockTitle}>App Logo</Text>
            <View style={styles.rowCard}>
              {payload.logoUrl ? (
                <Image source={{ uri: payload.logoUrl }} style={styles.logoPreview} resizeMode="contain" />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Text style={styles.logoPlaceholderText}>No logo selected</Text>
                </View>
              )}
              <TouchableOpacity style={styles.addBtn} onPress={() => void handlePickAboutLogo()} disabled={logoUploading}>
                <Plus size={14} color={COLORS.primary} />
                <Text style={styles.addBtnText}>{logoUploading ? 'Uploading...' : 'Upload Logo'}</Text>
              </TouchableOpacity>
            </View>
            <TextInput style={styles.input} value={payload.brandName || ''} onChangeText={(t) => updateField('brandName', t)} placeholder="Brand name" />
            <TextInput style={styles.input} value={payload.tagline || ''} onChangeText={(t) => updateField('tagline', t)} placeholder="Tagline" />
            <TextInput style={styles.input} value={payload.version || ''} onChangeText={(t) => updateField('version', t)} placeholder="Version text" />
            <TextInput style={[styles.input, styles.textArea]} value={payload.whoWeAre || ''} onChangeText={(t) => updateField('whoWeAre', t)} multiline placeholder="Who we are" />

            <Text style={styles.blockTitle}>About Features</Text>
            {(payload.features || []).map((row: any, idx: number) => (
              <View key={`about-feature-${idx}`} style={styles.rowCard}>
                <TextInput style={styles.input} value={row.title || ''} onChangeText={(text) => {
                  const next = [...(payload.features || [])]; next[idx] = { ...next[idx], title: text }; updateField('features', next);
                }} placeholder="Feature title" />
                <TextInput style={[styles.input, styles.textArea]} value={row.description || ''} onChangeText={(text) => {
                  const next = [...(payload.features || [])]; next[idx] = { ...next[idx], description: text }; updateField('features', next);
                }} multiline placeholder="Feature description" />
                <TextInput style={styles.input} value={row.color || ''} onChangeText={(text) => {
                    const next = [...(payload.features || [])]; next[idx] = { ...next[idx], color: text }; updateField('features', next);
                  }} placeholder="color" />
              </View>
            ))}
            <TouchableOpacity style={styles.addBtn} onPress={() => updateField('features', [...(payload.features || []), { title: '', description: '', icon: 'help_circle', color: '#F99E3C' }])}>
              <Plus size={14} color={COLORS.primary} />
              <Text style={styles.addBtnText}>Add Feature</Text>
            </TouchableOpacity>

            <Text style={styles.blockTitle}>Stats</Text>
            {(payload.stats || []).map((row: any, idx: number) => (
              <View key={`about-stat-${idx}`} style={styles.rowCard}>
                <View style={styles.rowInline}>
                  <TextInput style={[styles.input, styles.halfInput]} value={row.value || ''} onChangeText={(text) => {
                    const next = [...(payload.stats || [])]; next[idx] = { ...next[idx], value: text }; updateField('stats', next);
                  }} placeholder="Value (e.g. 50K+)" />
                  <TextInput style={[styles.input, styles.halfInput]} value={row.label || ''} onChangeText={(text) => {
                    const next = [...(payload.stats || [])]; next[idx] = { ...next[idx], label: text }; updateField('stats', next);
                  }} placeholder="Label" />
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.addBtn} onPress={() => updateField('stats', [...(payload.stats || []), { value: '', label: '', icon: 'users' }])}>
              <Plus size={14} color={COLORS.primary} />
              <Text style={styles.addBtnText}>Add Stat</Text>
            </TouchableOpacity>

            <Text style={styles.blockTitle}>Contact Items</Text>
            {(payload.contactItems || []).map((row: any, idx: number) => (
              <View key={`about-contact-${idx}`} style={styles.rowCard}>
                <TextInput style={styles.input} value={row.label || ''} onChangeText={(text) => {
                  const next = [...(payload.contactItems || [])]; next[idx] = { ...next[idx], label: text }; updateField('contactItems', next);
                }} placeholder="Label" />
                <TextInput style={styles.input} value={row.value || ''} onChangeText={(text) => {
                  const next = [...(payload.contactItems || [])]; next[idx] = { ...next[idx], value: text }; updateField('contactItems', next);
                }} placeholder="Value" />
                <TextInput style={styles.input} value={row.action || ''} onChangeText={(text) => {
                  const next = [...(payload.contactItems || [])]; next[idx] = { ...next[idx], action: text }; updateField('contactItems', next);
                }} placeholder="Link/Action (url/tel/mailto)" />
              </View>
            ))}
            <TouchableOpacity style={styles.addBtn} onPress={() => updateField('contactItems', [...(payload.contactItems || []), { label: '', value: '', icon: 'mail', action: '' }])}>
              <Plus size={14} color={COLORS.primary} />
              <Text style={styles.addBtnText}>Add Contact</Text>
            </TouchableOpacity>
          </>
        )}

        {(selected === 'terms_conditions' || selected === 'privacy_policy' || selected === 'intellectual_property') && (
          <>
            <TextInput style={styles.input} value={payload.introTitle || ''} onChangeText={(t) => updateField('introTitle', t)} placeholder="Intro title" />
            <TextInput style={styles.input} value={payload.introSub || ''} onChangeText={(t) => updateField('introSub', t)} placeholder="Intro subtitle" />
            <TextInput style={styles.input} value={payload.effectiveText || payload.lastUpdatedText || ''} onChangeText={(t) => {
              if (selected === 'terms_conditions') updateField('effectiveText', t);
              else updateField('lastUpdatedText', t);
            }} placeholder="Effective/Last updated text" />
            <TextInput style={[styles.input, styles.textArea]} value={payload.introBody || ''} onChangeText={(t) => updateField('introBody', t)} multiline placeholder="Intro body" />
          </>
        )}

        {selected === 'privacy_policy' && (
          <>
            <TextInput style={styles.input} value={payload.dpoEmail || ''} onChangeText={(t) => updateField('dpoEmail', t)} placeholder="DPO email" />
            {renderSectionsEditor('sections')}
            <Text style={styles.blockTitle}>Rights</Text>
            {(payload.rights || []).map((row: any, idx: number) => (
              <View key={`right-${idx}`} style={styles.rowCard}>
                <TextInput style={styles.input} value={row.title || ''} onChangeText={(text) => {
                  const next = [...(payload.rights || [])]; next[idx] = { ...next[idx], title: text }; updateField('rights', next);
                }} placeholder="Right title" />
                <TextInput style={styles.input} value={row.desc || ''} onChangeText={(text) => {
                  const next = [...(payload.rights || [])]; next[idx] = { ...next[idx], desc: text }; updateField('rights', next);
                }} placeholder="Right description" />
              </View>
            ))}
            <TouchableOpacity style={styles.addBtn} onPress={() => updateField('rights', [...(payload.rights || []), { title: '', desc: '' }])}>
              <Plus size={14} color={COLORS.primary} />
              <Text style={styles.addBtnText}>Add Right</Text>
            </TouchableOpacity>
          </>
        )}

        {selected === 'terms_conditions' && (
          <>
            {renderSectionsEditor('sections')}
            <TextInput style={styles.input} value={payload.contactEmail || ''} onChangeText={(t) => updateField('contactEmail', t)} placeholder="Contact email" />
          </>
        )}

        {selected === 'intellectual_property' && (
          <>
            {renderSectionsEditor('sections')}
            <TextInput style={styles.input} value={payload.warningTitle || ''} onChangeText={(t) => updateField('warningTitle', t)} placeholder="Warning title" />
            <TextInput style={[styles.input, styles.textArea]} value={payload.warningText || ''} onChangeText={(t) => updateField('warningText', t)} placeholder="Warning text" multiline />
            <TextInput style={styles.input} value={payload.licensingTitle || ''} onChangeText={(t) => updateField('licensingTitle', t)} placeholder="Licensing title" />
            <TextInput style={styles.input} value={payload.licensingSub || ''} onChangeText={(t) => updateField('licensingSub', t)} placeholder="Licensing subtitle" />
            <TextInput style={styles.input} value={payload.contactEmail1 || ''} onChangeText={(t) => updateField('contactEmail1', t)} placeholder="Primary email" />
            <TextInput style={styles.input} value={payload.contactEmail2 || ''} onChangeText={(t) => updateField('contactEmail2', t)} placeholder="Secondary email" />
          </>
        )}

        <TextInput style={styles.input} value={payload.footerLine1 || ''} onChangeText={(t) => updateField('footerLine1', t)} placeholder="Footer line 1" />
        <TextInput style={styles.input} value={payload.footerLine2 || ''} onChangeText={(t) => updateField('footerLine2', t)} placeholder="Footer line 2" />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CMS Forms</Text>
        <TouchableOpacity onPress={() => void loadPages()}>
          <Text style={styles.refreshText}>{loading ? '...' : 'Refresh'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {PAGES.map((page) => (
            <TouchableOpacity
              key={page.key}
              style={[styles.tab, selected === page.key && styles.tabActive]}
              onPress={() => setSelected(page.key)}
            >
              <Text style={[styles.tabText, selected === page.key && styles.tabTextActive]}>{page.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>{selectedMeta.title}</Text>
        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          placeholder="Admin description (optional)"
        />
        <View style={styles.publishRow}>
          <Text style={styles.publishText}>Published</Text>
          <Switch value={isPublished} onValueChange={setIsPublished} />
        </View>

        {renderPageFields()}

        <Button title="Save Content Form" onPress={onSave} variant="primary" size="large" />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    marginTop: normalize(28),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  headerTitle: { fontFamily: FONTS.regular, fontSize: normalize(18), fontWeight: '700', color: COLORS.text },
  refreshText: { fontFamily: FONTS.regular, fontSize: normalize(12), color: COLORS.primary, fontWeight: '600' },
  content: { padding: SPACING.md, paddingBottom: normalize(60) },
  tabs: { gap: 8, paddingBottom: 10 },
  tab: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  tabActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '14' },
  tabText: { fontFamily: FONTS.regular, fontSize: normalize(12), color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.primary, fontWeight: '700' },
  sectionTitle: { fontFamily: FONTS.regular, fontSize: normalize(16), fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    color: COLORS.text,
    fontFamily: FONTS.regular,
  },
  textArea: { minHeight: normalize(100), textAlignVertical: 'top' },
  publishRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  publishText: { fontFamily: FONTS.regular, fontSize: normalize(13), color: COLORS.text },
  editorBlock: { marginBottom: 12 },
  blockTitle: { fontFamily: FONTS.regular, fontSize: normalize(13), color: COLORS.text, fontWeight: '700', marginBottom: 8 },
  rowCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: 10,
    marginBottom: 8,
  },
  rowInline: { flexDirection: 'row', gap: 8 },
  halfInput: { flex: 1 },
  innerBox: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border, paddingTop: 8, marginTop: 6 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  addBtnText: { fontFamily: FONTS.regular, fontSize: normalize(12), color: COLORS.primary, fontWeight: '600' },
  inlineDelete: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end' },
  inlineDeleteText: { fontFamily: FONTS.regular, fontSize: normalize(11), color: COLORS.error },
  logoPreview: {
    width: normalize(96),
    height: normalize(96),
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.background,
    marginBottom: 10,
  },
  logoPlaceholder: {
    width: normalize(96),
    height: normalize(96),
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    backgroundColor: COLORS.background,
  },
  logoPlaceholderText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(11),
    color: COLORS.textSecondary,
  },
});

export default AdminContentFormsScreen;

