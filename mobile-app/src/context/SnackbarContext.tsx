import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SnackbarType = 'error' | 'success' | 'info' | 'warning';

type SnackbarPayload = {
  message: string;
  type?: SnackbarType;
  durationMs?: number;
};

type SnackbarContextType = {
  showSnackbar: (payload: SnackbarPayload) => void;
};

const SnackbarContext = createContext<SnackbarContextType>({
  showSnackbar: () => {},
});

export const useSnackbar = () => useContext(SnackbarContext);

const BG_BY_TYPE: Record<SnackbarType, string> = {
  error: '#FDECEC',
  success: '#EAF8EE',
  info: '#EAF2FF',
  warning: '#FFF4E8',
};

const BORDER_BY_TYPE: Record<SnackbarType, string> = {
  error: '#F5C2C2',
  success: '#BDE8CC',
  info: '#C7DBFF',
  warning: '#FFD9B5',
};

const TEXT_BY_TYPE: Record<SnackbarType, string> = {
  error: '#9B1C1C',
  success: '#1F6B3A',
  info: '#1E4FA8',
  warning: '#9A4E00',
};

export const SnackbarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  const [type, setType] = useState<SnackbarType>('info');
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const translateY = useRef(new Animated.Value(-28)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const hide = useCallback(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -28, duration: 160, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
    ]).start(() => setVisible(false));
  }, [opacity, translateY]);

  const showSnackbar = useCallback(
    ({ message: text, type = 'info', durationMs = 2600 }: SnackbarPayload) => {
      if (!text) return;
      if (timerRef.current) clearTimeout(timerRef.current);

      setMessage(text);
      setType(type);
      setVisible(true);

      translateY.setValue(-28);
      opacity.setValue(0);

      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();

      timerRef.current = setTimeout(hide, durationMs);
    },
    [hide, opacity, translateY]
  );

  const value = useMemo(() => ({ showSnackbar }), [showSnackbar]);

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      {visible && (
        <View pointerEvents="none" style={styles.host}>
          <Animated.View
            style={[
              styles.snackbar,
              {
                marginTop: Math.max(insets.top + 20, 34),
                backgroundColor: BG_BY_TYPE[type],
                borderColor: BORDER_BY_TYPE[type],
                transform: [{ translateY }],
                opacity,
              },
            ]}
          >
            <Text style={[styles.text, { color: TEXT_BY_TYPE[type] }]} numberOfLines={3}>
              {message}
            </Text>
          </Animated.View>
        </View>
      )}
    </SnackbarContext.Provider>
  );
};

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    alignItems: 'flex-end',
    zIndex: 9999,
    elevation: 30,
    paddingHorizontal: 12,
  },
  snackbar: {
    width: '62%',
    minWidth: 160,
    maxWidth: 240,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});
