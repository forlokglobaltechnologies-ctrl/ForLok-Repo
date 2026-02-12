import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Home, Plus, Search, Clock, User } from 'lucide-react-native';
import { FONTS, SPACING, SHADOWS } from '@constants/theme';
import { normalize } from '@utils/responsive';
import { useTheme } from '@context/ThemeContext';

interface TabItem {
  name: string;
  label: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  screen: string;
}

const tabs: TabItem[] = [
  { name: 'Home', label: 'Home', icon: Home, screen: 'MainDashboard' },
  { name: 'Offer', label: 'Offer', icon: Plus, screen: 'OfferServices' },
  { name: 'Take', label: 'Take', icon: Search, screen: 'TakeServices' },
  { name: 'History', label: 'History', icon: Clock, screen: 'History' },
  { name: 'Profile', label: 'Profile', icon: User, screen: 'Profile' },
];

export const BottomTabNavigator = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();

  const getActiveTab = () => {
    const routeName = route.name;
    return tabs.findIndex(tab => tab.screen === routeName);
  };

  const activeIndex = getActiveTab();

  return (
    <View style={[styles.container, { 
      backgroundColor: theme.colors.surface, 
      borderTopColor: theme.colors.border 
    }]}>
      {tabs.map((tab, index) => {
        const isActive = activeIndex === index;
        const IconComponent = tab.icon;
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => navigation.navigate(tab.screen as never)}
            activeOpacity={0.7}
          >
            <View style={[
              styles.iconContainer,
              isActive && { backgroundColor: theme.colors.primary + '15' }
            ]}>
              <IconComponent
                size={22}
                color={isActive ? theme.colors.primary : theme.colors.textSecondary}
              />
            </View>
            <Text
              style={[
                styles.tabLabel,
                { color: theme.colors.textSecondary },
                isActive && { color: theme.colors.primary, fontWeight: '600' },
              ]}
            >
              {tab.label}
            </Text>
            {isActive && (
              <View style={[styles.activeIndicator, { backgroundColor: theme.colors.primary }]} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: SPACING.xs,
    paddingBottom: Platform.OS === 'ios' ? SPACING.md : SPACING.sm,
    paddingHorizontal: SPACING.xs,
    ...SHADOWS.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xs / 2,
    position: 'relative',
  },
  iconContainer: {
    width: normalize(32),
    height: normalize(32),
    borderRadius: normalize(16),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  tabLabel: {
    fontFamily: FONTS.regular,
    fontSize: normalize(10),
    marginTop: 2,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? SPACING.xs : SPACING.xs / 2,
    left: '50%',
    marginLeft: -12,
    width: normalize(24),
    height: normalize(2),
    borderRadius: normalize(1),
  },
});

