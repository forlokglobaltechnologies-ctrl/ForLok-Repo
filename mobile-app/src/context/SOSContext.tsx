import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { Alert, Platform } from 'react-native';
import * as Location from 'expo-location';
import { sosApi } from '@utils/apiClient';

interface SOSContextType {
  activeBookingId: string | null;
  setActiveBooking: (bookingId: string) => void;
  clearActiveBooking: () => void;
  triggerSOS: () => Promise<{ success: boolean; message: string }>;
  isSending: boolean;
  lastSOSTime: Date | null;
  currentRoute: string;
  setCurrentRoute: (route: string) => void;
  sosVisible: boolean;
  handleLogoTap: () => void;
  showSOS: () => void;
}

const SOSContext = createContext<SOSContextType>({
  activeBookingId: null,
  setActiveBooking: () => {},
  clearActiveBooking: () => {},
  triggerSOS: async () => ({ success: false, message: '' }),
  isSending: false,
  lastSOSTime: null,
  currentRoute: '',
  setCurrentRoute: () => {},
  sosVisible: false,
  handleLogoTap: () => {},
  showSOS: () => {},
});

export const useSOS = () => useContext(SOSContext);

interface SOSProviderProps {
  children: ReactNode;
}

export const SOSProvider: React.FC<SOSProviderProps> = ({ children }) => {
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [lastSOSTime, setLastSOSTime] = useState<Date | null>(null);
  const [currentRoute, setCurrentRouteState] = useState<string>('');
  const [sosVisible, setSosVisible] = useState(false);

  const logoTapCountRef = useRef(0);
  const logoTapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sosHideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showSOS = useCallback(() => {
    setSosVisible(true);
    if (sosHideTimerRef.current) clearTimeout(sosHideTimerRef.current);
    sosHideTimerRef.current = setTimeout(() => {
      setSosVisible(false);
    }, 60000);
  }, []);

  const handleLogoTap = useCallback(() => {
    logoTapCountRef.current += 1;

    if (logoTapTimerRef.current) clearTimeout(logoTapTimerRef.current);

    if (logoTapCountRef.current >= 3) {
      logoTapCountRef.current = 0;
      showSOS();
    } else {
      logoTapTimerRef.current = setTimeout(() => {
        logoTapCountRef.current = 0;
      }, 800);
    }
  }, [showSOS]);

  const setCurrentRoute = useCallback((route: string) => {
    setCurrentRouteState(route);
  }, []);

  const setActiveBooking = useCallback((bookingId: string) => {
    setActiveBookingId(bookingId);
  }, []);

  const clearActiveBooking = useCallback(() => {
    setActiveBookingId(null);
  }, []);

  const triggerSOS = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    // Prevent rapid re-triggers (30 second cooldown)
    if (lastSOSTime && Date.now() - lastSOSTime.getTime() < 30000) {
      return {
        success: false,
        message: 'SOS was already sent recently. Please wait before sending again.',
      };
    }

    setIsSending(true);

    try {
      // 1. Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Required',
          'SOS needs your location to send to emergency contacts. Please enable location access.',
        );
        return { success: false, message: 'Location permission denied' };
      }

      // 2. Get current position
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = position.coords;

      // 3. Try to reverse geocode for address
      let address: string | undefined;
      try {
        const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geocode[0]) {
          const g = geocode[0];
          address = [g.name, g.street, g.city, g.region, g.postalCode]
            .filter(Boolean)
            .join(', ');
        }
      } catch {
        // Geocoding failed, proceed without address
      }

      // 4. Call SOS API
      const response = await sosApi.trigger(
        { lat: latitude, lng: longitude, address },
        activeBookingId || undefined,
      );

      if (response.success) {
        setLastSOSTime(new Date());
        return {
          success: true,
          message: response.message || 'SOS alert sent! Emergency contacts have been notified.',
        };
      } else {
        return {
          success: false,
          message: response.message || 'Failed to send SOS. Please call emergency services directly.',
        };
      }
    } catch (error: any) {
      console.error('SOS trigger error:', error);
      return {
        success: false,
        message: 'Failed to send SOS. Please call 112 for emergency help.',
      };
    } finally {
      setIsSending(false);
    }
  }, [activeBookingId, lastSOSTime]);

  return (
    <SOSContext.Provider
      value={{
        activeBookingId,
        setActiveBooking,
        clearActiveBooking,
        triggerSOS,
        isSending,
        lastSOSTime,
        currentRoute,
        setCurrentRoute,
        sosVisible,
        handleLogoTap,
        showSOS,
      }}
    >
      {children}
    </SOSContext.Provider>
  );
};

export default SOSContext;
