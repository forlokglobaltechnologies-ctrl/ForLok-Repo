import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Home, Search, Clock, User, Car } from 'lucide-react-native';
import { FONTS, SPACING, SHADOWS } from '@constants/theme';
import { useTheme } from '@context/ThemeContext';
import { useSOS } from '@context/SOSContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

interface TabItem {
  name: string;
  label: string;
  icon: React.ComponentType<any>;
  screen: string;
}

const tabs: TabItem[] = [
  { name: 'Take', label: 'Find Ride', icon: Search, screen: 'SearchPooling' },
  { name: 'Offer', label: 'Give Ride', icon: Car, screen: 'CreatePoolingOffer' },
  { name: 'Home', label: 'Home', icon: Home, screen: 'MainDashboard' },
  { name: 'History', label: 'History', icon: Clock, screen: 'History' },
  { name: 'Profile', label: 'Profile', icon: User, screen: 'Profile' },
];

const MOTION = {
  iconDuration: 300,
  labelDuration: 220,
  borderFillDuration: 360,
  pressDownDuration: 90,
  easing: Easing.out(Easing.cubic),
} as const;

const TAB_ITEM_HEIGHT = 64;
const NAV_COLLAPSE_TRANSLATE_Y = 70;

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

type AnimatedTabItemProps = {
  tab: TabItem;
  isActive: boolean;
  theme: any;
  onPress: () => void;
  onLongPress?: () => void;
  delayLongPress?: number;
};

const AnimatedTabItem = React.memo(({
  tab,
  isActive,
  theme,
  onPress,
  onLongPress,
  delayLongPress,
}: AnimatedTabItemProps) => {
  const activeProgress = useSharedValue(isActive ? 1 : 0);
  const pressProgress = useSharedValue(0);

  useEffect(() => {
    activeProgress.value = withTiming(isActive ? 1 : 0, {
      duration: MOTION.borderFillDuration,
      easing: MOTION.easing,
    });
  }, [isActive, activeProgress]);

  const itemAnimatedStyle = useAnimatedStyle(() => {
    const scaleFromPress = interpolate(pressProgress.value, [0, 1], [1, 0.97]);
    return {
      transform: [{ scale: scaleFromPress }],
    };
  });

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(activeProgress.value, [0, 1], [0, -9]) },
      { scale: interpolate(activeProgress.value, [0, 1], [1, 1.06]) },
    ],
  }));

  const labelAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(activeProgress.value, [0, 1], [0.84, 1]),
    color: interpolateColor(
      activeProgress.value,
      [0, 1],
      [theme.colors.textSecondary, theme.colors.primary]
    ),
  }));

  const iconRingStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      activeProgress.value,
      [0, 1],
      [theme.colors.border + '70', theme.colors.primary + 'CC']
    ),
    backgroundColor: interpolateColor(
      activeProgress.value,
      [0, 1],
      ['rgba(64, 134, 255, 0.00)', 'rgba(64, 134, 255, 0.24)']
    ),
  }));

  const activeIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(activeProgress.value, [0, 1], [0, 1]),
  }));

  const inactiveIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(activeProgress.value, [0, 1], [1, 0]),
  }));

  const IconComponent = tab.icon;

  return (
    <AnimatedTouchable
      style={[styles.tab, itemAnimatedStyle]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={delayLongPress}
      activeOpacity={0.9}
      onPressIn={() => {
        pressProgress.value = withTiming(1, { duration: MOTION.pressDownDuration, easing: MOTION.easing });
      }}
      onPressOut={() => {
        pressProgress.value = withTiming(0, { duration: 140, easing: MOTION.easing });
      }}
    >
      <Animated.View style={[styles.iconWrap, iconAnimatedStyle, iconRingStyle]}>
        <Animated.View style={[styles.iconLayer, inactiveIconStyle]}>
          <IconComponent size={20} color={theme.colors.textSecondary} strokeWidth={2.2} />
        </Animated.View>
        <Animated.View style={[styles.iconLayer, activeIconStyle]}>
          <IconComponent size={20} color={theme.colors.primary} strokeWidth={2.35} />
        </Animated.View>
      </Animated.View>
      <Animated.Text numberOfLines={1} style={[styles.tabLabel, labelAnimatedStyle]}>
        {tab.label}
      </Animated.Text>
    </AnimatedTouchable>
  );
});

AnimatedTabItem.displayName = 'AnimatedTabItem';

type BottomTabNavigatorProps = {
  enabled?: boolean;
};

export const BottomTabNavigator = ({ enabled = true }: BottomTabNavigatorProps) => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { showSOS, currentRoute } = useSOS();
  const insets = useSafeAreaInsets();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const collapseProgress = useSharedValue(0);
  const routeName = currentRoute || '';
  const tabScreens = tabs.map((tab) => tab.screen);
  const shouldShowOnRoute = tabScreens.includes(routeName);
  const activeIndex = Math.max(0, tabs.findIndex((tab) => tab.screen === routeName));

  useEffect(() => {
    collapseProgress.value = withTiming(isCollapsed ? 1 : 0, {
      duration: 260,
      easing: MOTION.easing,
    });
  }, [isCollapsed, collapseProgress]);

  const navAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(collapseProgress.value, [0, 1], [0, NAV_COLLAPSE_TRANSLATE_Y + 52]) }],
    opacity: interpolate(collapseProgress.value, [0, 1], [1, 0]),
  }));

  if (!enabled || !shouldShowOnRoute) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={[styles.outer, { paddingBottom: Math.max(insets.bottom - 2, 6) }]}
    >
      <TouchableOpacity
        style={[styles.gestureZone, { bottom: Math.max(insets.bottom, 6) }]}
        onPress={() => setIsCollapsed((prev) => !prev)}
        activeOpacity={1}
      />

      <Animated.View style={[styles.containerWrap, navAnimatedStyle]} pointerEvents={isCollapsed ? 'none' : 'auto'}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: 'rgba(245, 247, 251, 0.94)',
              borderColor: theme.colors.border + '70',
            },
          ]}
        >
          {tabs.map((tab, index) => (
            <AnimatedTabItem
              key={tab.name}
              tab={tab}
              isActive={activeIndex === index}
              theme={theme}
              onPress={() => {
                if (currentRoute !== tab.screen) navigation.navigate(tab.screen as never);
              }}
              onLongPress={tab.name === 'Profile' ? showSOS : undefined}
              delayLongPress={tab.name === 'Profile' ? 3000 : undefined}
            />
          ))}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    marginBottom: 0,
    paddingHorizontal: SPACING.sm,
    paddingTop: 0,
    zIndex: 999,
    elevation: 20,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 6,
    paddingVertical: 10,
    overflow: 'visible',
    ...SHADOWS.lg,
  },
  containerWrap: {
    width: '100%',
  },
  gestureZone: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 28,
    zIndex: 30,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: TAB_ITEM_HEIGHT,
    paddingTop: 8,
    position: 'relative',
    zIndex: 1,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  iconLayer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    marginTop: Platform.OS === 'ios' ? 0 : -1,
    letterSpacing: 0.15,
  },
});

