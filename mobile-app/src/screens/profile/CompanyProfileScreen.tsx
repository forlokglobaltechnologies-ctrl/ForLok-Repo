import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Image, ActivityIndicator, Alert, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Settings, CheckCircle, Car, Bike, Edit, Mail, Phone, MapPin, Building, FileText, CreditCard, BarChart, DollarSign, LogOut, ChevronRight, Shield, Hash } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, SHADOWS, BORDER_RADIUS } from '@constants/theme';
import { Card } from '@components/common/Card';
import { useLanguage } from '@context/LanguageContext';
import { companyApi, documentApi, vehicleApi } from '@utils/apiClient';

const CompanyProfileScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<any[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [vehicleStats, setVehicleStats] = useState({
    total: 0,
    cars: 0,
    bikes: 0,
  });

  useEffect(() => {
    loadCompanyProfile();
  }, []);

  // Load documents and vehicles when company profile is loaded
  useEffect(() => {
    if (company && company.companyId) {
      // Load documents and vehicle stats in parallel, but don't block UI
      Promise.all([
        loadDocuments().catch(err => console.error('Error in loadDocuments:', err)),
        loadVehicleStats().catch(err => console.error('Error in loadVehicleStats:', err)),
      ]).finally(() => {
        console.log('✅ All profile data loaded');
      });
    }
  }, [company]);

  const loadCompanyProfile = async () => {
    try {
      setLoading(true);
      const response = await companyApi.getProfile();
      console.log('📋 Company Profile API Response:', {
        success: response.success,
        hasData: !!response.data,
        hasDocuments: !!response.data?.documents,
        documents: response.data?.documents,
        companyId: response.data?.companyId,
      });
      if (response.success && response.data) {
        setCompany(response.data);
        console.log('✅ Company profile loaded:', {
          companyId: response.data.companyId,
          companyName: response.data.companyName,
          hasDocuments: !!response.data.documents,
          documents: response.data.documents,
        });
        // Initialize vehicle stats with default values
        setVehicleStats({ total: 0, cars: 0, bikes: 0 });
      } else {
        Alert.alert('Error', response.error || 'Failed to load company profile');
      }
    } catch (error: any) {
      console.error('❌ Error loading company profile:', error);
      Alert.alert('Error', error.message || 'Failed to load company profile');
    } finally {
      setLoading(false);
    }
  };

  const loadVehicleStats = async () => {
    try {
      if (!company?.companyId) {
        console.log('⏳ Waiting for companyId...');
        return;
      }

      console.log('🚗 Loading vehicle stats for companyId:', company.companyId);
      const response = await vehicleApi.getCompanyVehicles(company.companyId);
      console.log('🚗 Vehicle stats response:', response.success, response.data?.length || 0);
      
      if (response.success && response.data) {
        const vehicles = Array.isArray(response.data) ? response.data : [];
        const cars = vehicles.filter((v: any) => v.type === 'car').length;
        const bikes = vehicles.filter((v: any) => v.type === 'bike').length;
        
        console.log('✅ Vehicle stats calculated:', { total: vehicles.length, cars, bikes });
        setVehicleStats({
          total: vehicles.length,
          cars,
          bikes,
        });
      } else {
        console.warn('⚠️ No vehicle data in response');
        setVehicleStats({ total: 0, cars: 0, bikes: 0 });
      }
    } catch (error: any) {
      console.error('❌ Error loading vehicle stats:', error);
      // Set default stats on error
      setVehicleStats({ total: 0, cars: 0, bikes: 0 });
    }
  };

  const loadDocuments = async () => {
    try {
      setDocumentsLoading(true);
      console.log('📥 Loading company documents...');
      
      // First, try to get documents from Document collection
      const docResponse = await documentApi.getUserDocuments();
      console.log('📥 Document Collection API response:', {
        success: docResponse.success,
        dataLength: docResponse.data?.length || 0,
      });
      
      let documents: any[] = [];
      
      // Get documents from Document collection
      if (docResponse.success && docResponse.data) {
        const docCollectionDocs = docResponse.data.filter((doc: any) => 
          ['company_registration', 'gst_certificate', 'business_license'].includes(doc.type)
        );
        documents = docCollectionDocs;
        console.log(`✅ Found ${docCollectionDocs.length} documents from Document collection`);
      }
      
      // Also check company profile's documents field (fallback)
      if (company && company.documents) {
        console.log('📋 Company profile has documents field:', company.documents);
        
        // Convert company.documents object to document array format
        const companyDocs: any[] = [];
        
        if (company.documents.registrationCertificate) {
          companyDocs.push({
            type: 'company_registration',
            url: company.documents.registrationCertificate,
            status: 'pending', // Default status
            documentId: `company_reg_${company.companyId}`,
          });
        }
        if (company.documents.gstCertificate) {
          companyDocs.push({
            type: 'gst_certificate',
            url: company.documents.gstCertificate,
            status: 'pending',
            documentId: `gst_${company.companyId}`,
          });
        }
        if (company.documents.businessLicense) {
          companyDocs.push({
            type: 'business_license',
            url: company.documents.businessLicense,
            status: 'pending',
            documentId: `license_${company.companyId}`,
          });
        }
        
        // Merge documents, preferring Document collection over company.documents
        // Only add company.documents if not already in documents array
        companyDocs.forEach((companyDoc) => {
          const exists = documents.find((d) => d.type === companyDoc.type);
          if (!exists) {
            documents.push(companyDoc);
            console.log(`➕ Added document from company.documents: ${companyDoc.type}`);
          }
        });
      }
      
      console.log(`✅ Total ${documents.length} company documents found:`, documents.map((d: any) => ({ type: d.type, url: d.url, status: d.status })));
      setDocuments(documents);
    } catch (error: any) {
      console.error('❌ Error loading company documents:', error);
      Alert.alert('Error', `Failed to load documents: ${error.message || 'Unknown error'}`);
      setDocuments([]);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const getDocumentName = (type: string) => {
    const names: Record<string, string> = {
      company_registration: 'Business Registration',
      gst_certificate: 'GST Certificate',
      business_license: 'Business License',
    };
    return names[type] || type;
  };

  const getDocumentStatus = (doc: any) => {
    if (doc.status === 'verified') return 'Verified';
    if (doc.status === 'pending') return 'Pending';
    if (doc.status === 'rejected') return 'Rejected';
    return 'Unknown';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading company profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!company) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>No company profile available</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('companyProfile.title')}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Settings' as never)}>
          <Settings size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Company Header Card */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.profileImageContainer}>
            <Building size={64} color={COLORS.primary} />
            <TouchableOpacity style={styles.editIconButton}>
              <Edit size={16} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.profileName}>{company.companyName || 'Company'}</Text>
          <View style={styles.companyIdContainer}>
            <Hash size={14} color={COLORS.primary} />
            <Text style={styles.companyIdText}>Company ID: {company.companyId || 'N/A'}</Text>
          </View>
          <Text style={styles.profileUsername}>{company.businessType || ''}</Text>
        </View>

        {/* Company Information Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Building size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>{t('companyProfile.companyInformation')}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Hash size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.infoLabel}>Company ID</Text>
            <Text style={styles.infoValue}>{company.companyId || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Building size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.infoLabel}>{t('companyProfile.companyName')}</Text>
            <Text style={styles.infoValue}>{company.companyName || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <FileText size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.infoLabel}>{t('companyProfile.registrationNo')}</Text>
            <Text style={styles.infoValue}>{company.registrationNumber || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Mail size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.infoLabel}>{t('common.email')}</Text>
            <Text style={styles.infoValue}>{company.email || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Phone size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.infoLabel}>{t('common.phone')}</Text>
            <Text style={styles.infoValue}>{company.contactNumber || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <MapPin size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.infoLabel}>{t('companyProfile.address')}</Text>
            <Text style={styles.infoValue}>{company.address || 'N/A'}</Text>
          </View>
        </View>

        {/* Documents Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <FileText size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>{t('profile.documents')}</Text>
          </View>
          <View style={styles.divider} />
          {documentsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading documents...</Text>
            </View>
          ) : documents.length > 0 ? (
            documents.map((doc: any) => (
              <TouchableOpacity
                key={doc.documentId || doc._id}
                style={styles.documentItem}
                onPress={async () => {
                  if (doc.url) {
                    try {
                      const canOpen = await Linking.canOpenURL(doc.url);
                      if (canOpen) {
                        await Linking.openURL(doc.url);
                      } else {
                        Alert.alert('Error', 'Cannot open document URL');
                      }
                    } catch (error) {
                      Alert.alert('Error', 'Failed to open document');
                    }
                  }
                }}
              >
                <View style={styles.documentIconContainer}>
                  {doc.status === 'verified' ? (
                    <CheckCircle size={20} color={COLORS.success} />
                  ) : doc.status === 'pending' ? (
                    <ActivityIndicator size={20} color={COLORS.warning} />
                  ) : (
                    <FileText size={20} color={COLORS.error} />
                  )}
                </View>
                <Text style={styles.documentText}>{getDocumentName(doc.type)}</Text>
                <View
                  style={[
                    styles.verifiedBadge,
                    doc.status === 'verified'
                      ? { backgroundColor: COLORS.success + '15' }
                      : doc.status === 'pending'
                      ? { backgroundColor: COLORS.warning + '15' }
                      : { backgroundColor: COLORS.error + '15' },
                  ]}
                >
                  <Text
                    style={[
                      styles.verifiedText,
                      doc.status === 'verified'
                        ? { color: COLORS.success }
                        : doc.status === 'pending'
                        ? { color: COLORS.warning }
                        : { color: COLORS.error },
                    ]}
                  >
                    {getDocumentStatus(doc)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No documents uploaded yet</Text>
            </View>
          )}
        </View>

        {/* Vehicle Statistics Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Car size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>{t('companyProfile.vehicleInventory')}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.vehicleStatsRow}>
            <View style={styles.vehicleStatItem}>
              <Car size={24} color={COLORS.primary} />
              <Text style={styles.vehicleStatValue}>{vehicleStats.cars}</Text>
              <Text style={styles.vehicleStatLabel}>{t('companyProfile.cars')}</Text>
            </View>
            <View style={styles.vehicleStatItem}>
              <Bike size={24} color={COLORS.primary} />
              <Text style={styles.vehicleStatValue}>{vehicleStats.bikes}</Text>
              <Text style={styles.vehicleStatLabel}>{t('companyProfile.bikes')}</Text>
            </View>
            <View style={styles.vehicleStatItem}>
              <Car size={24} color={COLORS.primary} />
              <Text style={styles.vehicleStatValue}>{vehicleStats.total}</Text>
              <Text style={styles.vehicleStatLabel}>{t('companyProfile.total')}</Text>
            </View>
          </View>
        </View>

        {/* Statistics Card */}
        <View style={styles.statsCard}>
          <View style={styles.sectionHeader}>
            <BarChart size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>{t('companyProfile.statistics')}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <BarChart size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.statValue}>{company.totalBookings || 0}</Text>
              <Text style={styles.statLabel}>{t('companyProfile.totalBookings')}</Text>
            </View>
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <DollarSign size={20} color={COLORS.success} />
              </View>
              <Text style={styles.statValue}>₹{((company.totalEarnings || 0) / 1000).toFixed(0)}K</Text>
              <Text style={styles.statLabel}>{t('companyProfile.totalEarnings')}</Text>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('VehicleInformation' as never)}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconContainer}>
                <Car size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.menuText}>{t('companyProfile.viewAllVehicles')}</Text>
            </View>
            <ChevronRight size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('CompanyHistory' as never)}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconContainer}>
                <BarChart size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.menuText}>{t('companyHistory.title')}</Text>
            </View>
            <ChevronRight size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Payment' as never)}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconContainer}>
                <CreditCard size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.menuText}>{t('profile.paymentMethods')}</Text>
            </View>
            <ChevronRight size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('HelpSupport' as never)}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconContainer}>
                <Shield size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.menuText}>{t('profile.helpSupport')}</Text>
            </View>
            <ChevronRight size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconContainer}>
                <FileText size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.menuText}>{t('profile.about')}</Text>
            </View>
            <ChevronRight size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.menuItem, styles.logoutItem]}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconContainer, styles.logoutIconContainer]}>
                <LogOut size={20} color={COLORS.error} />
              </View>
              <Text style={[styles.menuText, styles.logoutText]}>{t('profile.logout')}</Text>
            </View>
            <ChevronRight size={20} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    paddingTop: SPACING.xl,
  },
  headerTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xl,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  profileHeaderCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: SPACING.md,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIconButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
    ...SHADOWS.sm,
  },
  profileName: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xxl,
    color: COLORS.text,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  profileUsername: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  companyIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
  },
  companyIdText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  emptyState: {
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.lightGray,
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.md,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    width: 120,
  },
  infoValue: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    textAlign: 'right',
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.md,
  },
  documentIconContainer: {
    width: 40,
    alignItems: 'center',
  },
  documentText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  verifiedBadge: {
    backgroundColor: COLORS.success + '15',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  verifiedText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.success,
    fontWeight: '600',
  },
  vehicleStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: SPACING.md,
  },
  vehicleStatItem: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
  },
  vehicleStatValue: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xl,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginTop: SPACING.xs,
  },
  vehicleStatLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  statsCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    color: COLORS.text,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  menuContainer: {
    marginTop: SPACING.sm,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  logoutItem: {
    borderWidth: 1,
    borderColor: COLORS.error + '30',
  },
  logoutIconContainer: {
    backgroundColor: COLORS.error + '15',
  },
  logoutText: {
    color: COLORS.error,
    fontWeight: '600',
  },
});

export default CompanyProfileScreen;




