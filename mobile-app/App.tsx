import React, { useEffect, useState, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Font from 'expo-font';
import {
  ActivityIndicator,
  View,
  StyleSheet,
  Platform,
  LogBox,
} from 'react-native';

LogBox.ignoreLogs(['Non-serializable values were found in the navigation state']);
import { COLORS } from './src/constants/theme';

/* ─────────────────────────────────────────────────────────────
   GLOBAL FONT OVERRIDE  (secondary safety-net)
   
   The PRIMARY fix lives in theme.ts which patches StyleSheet.create
   to inject fontFamily and strip fontWeight on Android.
   
   This module handles INLINE styles (ones that bypass StyleSheet.create)
   by patching React.createElement to intercept <Text> / <TextInput>.
   ───────────────────────────────────────────────────────────── */
const applyGlobalFont = () => {};

// Import screens
import SplashScreen from './src/screens/auth/SplashScreen';
import OnboardingScreen from './src/screens/auth/OnboardingScreen';
import SignInScreen from './src/screens/auth/SignInScreen';
import SignUpScreen from './src/screens/auth/SignUpScreen';
import UserTypeSelectionScreen from './src/screens/auth/UserTypeSelectionScreen';
import IndividualRegistrationScreen from './src/screens/registration/IndividualRegistrationScreen';
import DocumentVerificationScreen from './src/screens/registration/DocumentVerificationScreen';
import VerificationPendingScreen from './src/screens/registration/VerificationPendingScreen';
import MainDashboardScreen from './src/screens/main/MainDashboardScreen';
import OfferServicesScreen from './src/screens/offer/OfferServicesScreen';
import CreatePoolingOfferScreen from './src/screens/offer/CreatePoolingOfferScreen';
import CreateRentalOfferScreen from './src/screens/offer/CreateRentalOfferScreen';
import TakeServicesScreen from './src/screens/take/TakeServicesScreen';
import SearchPoolingScreen from './src/screens/take/SearchPoolingScreen';
import SearchRentalScreen from './src/screens/take/SearchRentalScreen';
import PoolingDetailsScreen from './src/screens/take/PoolingDetailsScreen';
import RentalDetailsScreen from './src/screens/take/RentalDetailsScreen';
import PriceSummaryScreen from './src/screens/main/PriceSummaryScreen';
import BookingConfirmationScreen from './src/screens/main/BookingConfirmationScreen';
import HistoryScreen from './src/screens/history/HistoryScreen';
import CompanyHistoryScreen from './src/screens/history/CompanyHistoryScreen';
import BookingDetailsScreen from './src/screens/history/BookingDetailsScreen';
import ProfileScreen from './src/screens/profile/ProfileScreen';
import EditProfileScreen from './src/screens/profile/EditProfileScreen';
import CompanyProfileScreen from './src/screens/profile/CompanyProfileScreen';
import SettingsScreen from './src/screens/profile/SettingsScreen';
import LocationPickerScreen from './src/screens/main/LocationPickerScreen';
import TripTrackingScreen from './src/screens/main/TripTrackingScreen';
import DriverTripScreen from './src/screens/main/DriverTripScreen';
import BookFoodScreen from './src/screens/main/BookFoodScreen';
import MyOffersScreen from './src/screens/offer/MyOffersScreen';
import CompanyMyOffersScreen from './src/screens/offer/CompanyMyOffersScreen';
import CompanyOfferDetailsScreen from './src/screens/offer/CompanyOfferDetailsScreen';
import OwnerRentalManagementScreen from './src/screens/offer/OwnerRentalManagementScreen';
import EndRentalScreen from './src/screens/offer/EndRentalScreen';
import CompanyVehicleManagementScreen from './src/screens/main/CompanyVehicleManagementScreen';
import CompanyEarningsScreen from './src/screens/main/CompanyEarningsScreen';
import NotificationsScreen from './src/screens/main/NotificationsScreen';
import ChatScreen from './src/screens/main/ChatScreen';
import ChatListScreen from './src/screens/main/ChatListScreen';
import RatingScreen from './src/screens/history/RatingScreen';
import CompanyRegistrationScreen from './src/screens/registration/CompanyRegistrationScreen';
import CompanyDashboardScreen from './src/screens/main/CompanyDashboardScreen';
import AddVehicleScreen from './src/screens/main/AddVehicleScreen';
import VehicleInformationScreen from './src/screens/main/VehicleInformationScreen';
import VehicleDetailsScreen from './src/screens/profile/VehicleDetailsScreen';
import FilterScreen from './src/screens/main/FilterScreen';
import ForgotPasswordScreen from './src/screens/auth/ForgotPasswordScreen';
import ChangePasswordScreen from './src/screens/auth/ChangePasswordScreen';
import HelpSupportScreen from './src/screens/main/HelpSupportScreen';
import FeedbackScreen from './src/screens/main/FeedbackScreen';
import FAQScreen from './src/screens/main/FAQScreen';
import ReportBugScreen from './src/screens/main/ReportBugScreen';
import LoadingScreen from './src/screens/main/LoadingScreen';
import ErrorScreen from './src/screens/main/ErrorScreen';
import PinkPoolingSplashScreen from './src/screens/main/PinkPoolingSplashScreen';
import WalletScreen from './src/screens/main/WalletScreen';
import EarnCoinsScreen from './src/screens/main/EarnCoinsScreen';
import ReviewsScreen from './src/screens/profile/ReviewsScreen';
import BlockedUsersScreen from './src/screens/profile/BlockedUsersScreen';
import AboutScreen from './src/screens/profile/AboutScreen';
import IntellectualPropertyScreen from './src/screens/profile/IntellectualPropertyScreen';
import TermsConditionsScreen from './src/screens/profile/TermsConditionsScreen';
import PrivacyPolicyScreen from './src/screens/profile/PrivacyPolicyScreen';

// Admin Screens
import AdminLoginScreen from './src/screens/admin/AdminLoginScreen';
import AdminDashboardScreen from './src/screens/admin/AdminDashboardScreen';
import AdminPromoReviewScreen from './src/screens/admin/AdminPromoReviewScreen';
import PoolingManagementScreen from './src/screens/admin/PoolingManagementScreen';
import RentalManagementScreen from './src/screens/admin/RentalManagementScreen';
import RidesHistoryScreen from './src/screens/admin/RidesHistoryScreen';
import UserManagementScreen from './src/screens/admin/UserManagementScreen';
import FeedbackManagementScreen from './src/screens/admin/FeedbackManagementScreen';
import FeedbackDetailsScreen from './src/screens/admin/FeedbackDetailsScreen';
import AnalyticsScreen from './src/screens/admin/AnalyticsScreen';
import AdminSettingsScreen from './src/screens/admin/AdminSettingsScreen';
import { LanguageProvider } from './src/context/LanguageContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { SOSProvider, useSOS } from './src/context/SOSContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SnackbarProvider } from './src/context/SnackbarContext';
import SOSButton from './src/components/common/SOSButton';
import { BottomTabNavigator } from './src/components/navigation/BottomTabNavigator';
import { websocketService } from './src/services/websocket.service';

const Stack = createNativeStackNavigator();
const DEBUG_ENDPOINT = 'http://127.0.0.1:7775/ingest/9bdd2fd3-ac77-45be-b342-a40ab02f34f7';

// StatusBar component — transparent so screens span the full height
const ThemedStatusBar = () => {
  return <StatusBar style="light" translucent backgroundColor="transparent" />;
};

// Helper to get current route name from navigation state
const getActiveRouteName = (state: any): string => {
  if (!state) return '';
  const route = state.routes[state.index];
  if (route.state) return getActiveRouteName(route.state);
  return route.name || '';
};

// Inner app that uses SOS context for route tracking
const AppNavigator = () => {
  const { setCurrentRoute } = useSOS();
  const { isAuthenticated, isLoading, user } = useAuth();
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  const onNavigationStateChange = (state: any) => {
    const routeName = getActiveRouteName(state);
    setCurrentRoute(routeName);
  };

  const onNavigationReady = () => {
    const currentRoute = navigationRef.current?.getCurrentRoute();
    if (currentRoute?.name) {
      setCurrentRoute(currentRoute.name);
    }
  };

  return (
    <>
      <NavigationContainer
        ref={navigationRef}
        onStateChange={onNavigationStateChange}
        onReady={onNavigationReady}
      >
        <ThemedStatusBar />
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          {isLoading ? (
            /* Show splash while checking auth state */
            <Stack.Screen name="Splash" component={SplashScreen} />
          ) : !isAuthenticated ? (
            /* Auth screens — user is NOT logged in */
            <>
              <Stack.Screen name="Splash" component={SplashScreen} />
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
              <Stack.Screen name="SignIn" component={SignInScreen} />
              <Stack.Screen name="SignUp" component={SignUpScreen} />
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
              <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
              <Stack.Screen name="UserTypeSelection" component={UserTypeSelectionScreen} />
              <Stack.Screen name="IndividualRegistration" component={IndividualRegistrationScreen} />
              <Stack.Screen name="DocumentVerification" component={DocumentVerificationScreen} />
              <Stack.Screen name="CompanyRegistration" component={CompanyRegistrationScreen} />
              <Stack.Screen name="VerificationPending" component={VerificationPendingScreen} />
              <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
            </>
          ) : (
            /* App screens — user IS logged in */
            <>
              {/* Initial dashboard — first screen = initial route after login */}
              {user?.userType === 'admin' ? (
                <>
                  <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
                  <Stack.Screen name="MainDashboard" component={MainDashboardScreen} />
                  <Stack.Screen name="CompanyDashboard" component={CompanyDashboardScreen} />
                </>
              ) : user?.userType === 'company' ? (
                <>
                  <Stack.Screen name="CompanyDashboard" component={CompanyDashboardScreen} />
                  <Stack.Screen name="MainDashboard" component={MainDashboardScreen} />
                </>
              ) : (
                <>
                  <Stack.Screen name="MainDashboard" component={MainDashboardScreen} />
                  <Stack.Screen name="CompanyDashboard" component={CompanyDashboardScreen} />
                </>
              )}
              <Stack.Screen name="PinkPoolingSplash" component={PinkPoolingSplashScreen} />
              
              {/* Offer Services */}
              <Stack.Screen name="OfferServices" component={OfferServicesScreen} />
              <Stack.Screen name="CreatePoolingOffer" component={CreatePoolingOfferScreen} />
              <Stack.Screen name="CreateRentalOffer" component={CreateRentalOfferScreen} />
              <Stack.Screen name="MyOffers" component={MyOffersScreen} />
              <Stack.Screen name="CompanyMyOffers" component={CompanyMyOffersScreen} />
              <Stack.Screen name="CompanyOfferDetails" component={CompanyOfferDetailsScreen} />
              <Stack.Screen name="CompanyVehicleManagement" component={CompanyVehicleManagementScreen} />
              <Stack.Screen name="CompanyEarnings" component={CompanyEarningsScreen} />
              <Stack.Screen name="OwnerRentalManagement" component={OwnerRentalManagementScreen} />
              <Stack.Screen name="EndRental" component={EndRentalScreen} />
              
              {/* Take Services */}
              <Stack.Screen name="TakeServices" component={TakeServicesScreen} />
              <Stack.Screen name="SearchPooling" component={SearchPoolingScreen} />
              <Stack.Screen name="SearchRental" component={SearchRentalScreen} />
              <Stack.Screen name="PoolingDetails" component={PoolingDetailsScreen} />
              <Stack.Screen name="RentalDetails" component={RentalDetailsScreen} />
              
              {/* Booking Flow */}
              <Stack.Screen name="PriceSummary" component={PriceSummaryScreen} />
              <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
              <Stack.Screen name="TripTracking" component={TripTrackingScreen} />
              <Stack.Screen name="DriverTrip" component={DriverTripScreen} />
              <Stack.Screen name="BookFood" component={BookFoodScreen} />
              
              {/* History */}
              <Stack.Screen name="History" component={HistoryScreen} />
              <Stack.Screen name="CompanyHistory" component={CompanyHistoryScreen} />
              <Stack.Screen name="BookingDetails" component={BookingDetailsScreen} />
              <Stack.Screen name="Rating" component={RatingScreen} />
              
              {/* Profile & Settings */}
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="EditProfile" component={EditProfileScreen} />
              <Stack.Screen name="CompanyProfile" component={CompanyProfileScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              
              {/* Utility Screens */}
              <Stack.Screen name="LocationPicker" component={LocationPickerScreen} />
              <Stack.Screen name="Notifications" component={NotificationsScreen} />
              <Stack.Screen name="ChatList" component={ChatListScreen} />
              <Stack.Screen name="Chat" component={ChatScreen} />
              
              {/* Company Screens */}
              <Stack.Screen name="AddVehicle" component={AddVehicleScreen} />
              <Stack.Screen name="VehicleInformation" component={VehicleInformationScreen} />
              <Stack.Screen name="VehicleDetails" component={VehicleDetailsScreen} />

              {/* Registration (also needed post-login for document verification) */}
              <Stack.Screen name="DocumentVerification" component={DocumentVerificationScreen} />
              <Stack.Screen name="IndividualRegistration" component={IndividualRegistrationScreen} />
              
              {/* Additional Screens */}
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
              <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
              <Stack.Screen name="Filter" component={FilterScreen} />
              <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
              <Stack.Screen name="Feedback" component={FeedbackScreen} />
              <Stack.Screen name="FAQ" component={FAQScreen} />
              <Stack.Screen name="ReportBug" component={ReportBugScreen} />
              <Stack.Screen name="Loading" component={LoadingScreen} />
              <Stack.Screen name="Error" component={ErrorScreen} />
              <Stack.Screen name="Wallet" component={WalletScreen} />
              <Stack.Screen name="EarnCoins" component={EarnCoinsScreen} />
              <Stack.Screen name="Reviews" component={ReviewsScreen} />
              <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
              <Stack.Screen name="About" component={AboutScreen} />
              <Stack.Screen name="IntellectualProperty" component={IntellectualPropertyScreen} />
              <Stack.Screen name="TermsConditions" component={TermsConditionsScreen} />
              <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
              
              {/* Admin Screens */}
              {user?.userType !== 'admin' && (
                <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
              )}
              <Stack.Screen name="AdminPromoReview" component={AdminPromoReviewScreen} />
              <Stack.Screen name="PoolingManagement" component={PoolingManagementScreen} />
              <Stack.Screen name="RentalManagement" component={RentalManagementScreen} />
              <Stack.Screen name="RidesHistory" component={RidesHistoryScreen} />
              <Stack.Screen name="UserManagement" component={UserManagementScreen} />
              <Stack.Screen name="FeedbackManagement" component={FeedbackManagementScreen} />
              <Stack.Screen name="FeedbackDetails" component={FeedbackDetailsScreen} />
              <Stack.Screen name="Analytics" component={AnalyticsScreen} />
              <Stack.Screen name="AdminSettings" component={AdminSettingsScreen} />
            </>
          )}
        </Stack.Navigator>
        <BottomTabNavigator enabled={isAuthenticated && user?.userType !== 'admin'} />
      </NavigationContainer>
      <SOSButton />
    </>
  );
};

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const bootLoggedRef = useRef(false);

  useEffect(() => {
    // #region agent log
    fetch(DEBUG_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9d349f'},body:JSON.stringify({sessionId:'9d349f',runId:'startup',hypothesisId:'H1',location:'App.tsx:useEffect:init',message:'App mounted and starting initialization',data:{platform:Platform.OS},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const previousGlobalHandler = (global as any).ErrorUtils?.getGlobalHandler?.();
    if ((global as any).ErrorUtils?.setGlobalHandler) {
      (global as any).ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
        // #region agent log
        fetch(DEBUG_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9d349f'},body:JSON.stringify({sessionId:'9d349f',runId:'startup',hypothesisId:'H5',location:'App.tsx:globalErrorHandler',message:'Unhandled runtime error captured',data:{isFatal:!!isFatal,errorMessage:error?.message || 'unknown',errorName:error?.name || 'unknown'},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        if (previousGlobalHandler) {
          previousGlobalHandler(error, isFatal);
        }
      });
    }
    loadFonts();
    
    // WebSocket is now connected after auth (not on app start)
    // Cleanup on unmount
    return () => {
      websocketService.disconnect();
    };
  }, []);

  const loadFonts = async () => {
    try {
      // #region agent log
      fetch(DEBUG_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9d349f'},body:JSON.stringify({sessionId:'9d349f',runId:'startup',hypothesisId:'H3',location:'App.tsx:loadFonts:start',message:'Starting font load',data:{font:'MomoTrustDisplay-Regular'},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      await Font.loadAsync({
        'MomoTrustDisplay-Regular': require('./assets/fonts/MomoTrustDisplay-Regular.ttf'),
      });
      // #region agent log
      fetch(DEBUG_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9d349f'},body:JSON.stringify({sessionId:'9d349f',runId:'startup',hypothesisId:'H3',location:'App.tsx:loadFonts:success',message:'Font load succeeded',data:{fontLoaded:true},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      // Apply the custom font globally to ALL Text & TextInput components
      applyGlobalFont();
    } catch (error) {
      // #region agent log
      fetch(DEBUG_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9d349f'},body:JSON.stringify({sessionId:'9d349f',runId:'startup',hypothesisId:'H3',location:'App.tsx:loadFonts:catch',message:'Font loading or global font patch failed',data:{errorMessage:(error as any)?.message || 'unknown'},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      console.warn('Font loading error:', error);
      // Fallback to system font if custom font fails
    } finally {
      setFontsLoaded(true);
    }
  };

  if (fontsLoaded && !bootLoggedRef.current) {
    bootLoggedRef.current = true;
    // #region agent log
    fetch(DEBUG_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9d349f'},body:JSON.stringify({sessionId:'9d349f',runId:'startup',hypothesisId:'H4',location:'App.tsx:render:fontsLoaded',message:'Root app passed font gate',data:{fontsLoaded:true},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <AuthProvider>
      <ThemeProvider>
        <LanguageProvider>
          <NotificationProvider>
            <SOSProvider>
              <SafeAreaProvider>
                <SnackbarProvider>
                  <AppNavigator />
                </SnackbarProvider>
              </SafeAreaProvider>
            </SOSProvider>
          </NotificationProvider>
        </LanguageProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
});

