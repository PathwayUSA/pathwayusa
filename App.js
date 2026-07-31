import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { scheduleDailyReminder } from './src/lib/notifications';

import { Platform } from 'react-native';
import { AuthProvider, useAuth }             from './src/context/AuthContext';
import { ThemeProvider, useTheme }           from './src/context/ThemeContext';
import { LanguageProvider }                  from './src/i18n';
import { SubscriptionProvider }              from './src/context/SubscriptionContext';
import { TestVersionProvider }              from './src/context/TestVersionContext';
import { VisualEffectsProvider }             from './src/context/VisualEffectsContext';
import { HelperTipsProvider }               from './src/context/HelperTipsContext';
import { FirstLaunchProvider }              from './src/context/FirstLaunchContext';
import { AttorneyProvider, useAttorney }     from './src/context/AttorneyContext';
import { useOffline }                        from './src/hooks/useOffline';
import OfflineBanner                         from './src/components/OfflineBanner';
import { AppLockOverlay }                    from './src/components/AppLockOverlay';
import ErrorBoundary                         from './src/components/ErrorBoundary';
import FirstLaunchSlides                     from './src/components/FirstLaunchSlides';
import PaymentSuccessModal                   from './src/components/PaymentSuccessModal';
import PathwayLogo                           from './src/components/PathwayLogo';

// ── Client screens ──────────────────────────────────────────────────────────
import WelcomeScreen           from './src/screens/WelcomeScreen';
import LoginScreen             from './src/screens/LoginScreen';
import SignUpScreen            from './src/screens/SignUpScreen';
import AttorneyLoginScreen     from './src/screens/AttorneyLoginScreen';
import ForgotPasswordScreen    from './src/screens/ForgotPasswordScreen';
import HomeScreen              from './src/screens/HomeScreen';
import LearningScreen          from './src/screens/LearningScreen';
import ResourcesScreen         from './src/screens/ResourcesScreen';
import GuideScreen             from './src/screens/GuideScreen';
import LegalPortalScreen       from './src/screens/LegalPortalScreen';
import AttorneyMatchScreen     from './src/screens/AttorneyMatchScreen';
import SettingsScreen          from './src/screens/SettingsScreen';
import LanguageVoiceSettingsScreen        from './src/screens/settings/LanguageVoiceSettingsScreen';
import RemindersSettingsScreen            from './src/screens/settings/RemindersSettingsScreen';
import PrivacyAppLockSettingsScreen       from './src/screens/settings/PrivacyAppLockSettingsScreen';
import MyImmigrationProfileSettingsScreen from './src/screens/settings/MyImmigrationProfileSettingsScreen';
import DeadlinesScreen         from './src/screens/DeadlinesScreen';
import DocumentsScreen         from './src/screens/DocumentsScreen';
import DocumentExpiryScreen    from './src/screens/DocumentExpiryScreen';
import CaseTrackerScreen       from './src/screens/CaseTrackerScreen';
import UpgradeScreen           from './src/screens/UpgradeScreen';
import ClientDetailScreen      from './src/screens/ClientDetailScreen';
import IntakeStackNavigator, { ONBOARDING_KEY } from './src/screens/onboarding/IntakeStack';
import { OnboardingContext } from './src/context/OnboardingContext';
import NewsDetailScreen        from './src/screens/NewsDetailScreen';
import BadgesScreen            from './src/screens/BadgesScreen';
import ReferralScreen          from './src/screens/ReferralScreen';
import GlossaryScreen          from './src/screens/GlossaryScreen';
import ProfileScreen           from './src/screens/ProfileScreen';
import FAQScreen               from './src/screens/FAQScreen';
import AboutScreen             from './src/screens/AboutScreen';
import PolicyScreen            from './src/screens/PolicyScreen';
import CostCalculatorScreen    from './src/screens/CostCalculatorScreen';
import JournalScreen           from './src/screens/JournalScreen';
import CelebrationScreen       from './src/screens/CelebrationScreen';
import RFEScreen               from './src/screens/RFEScreen';
import VisaBulletinScreen      from './src/screens/VisaBulletinScreen';
import FormExplainerScreen     from './src/screens/FormExplainerScreen';
import FamilyScreen            from './src/screens/FamilyScreen';
import AppointmentPrepScreen   from './src/screens/AppointmentPrepScreen';
import PasswordResetScreen     from './src/screens/PasswordResetScreen';
import TravelTrackerScreen     from './src/screens/TravelTrackerScreen';
import StepMissionScreen       from './src/screens/StepMissionScreen';
import ResourceMapScreen       from './src/screens/ResourceMapScreen';
import NotificationsScreen     from './src/screens/NotificationsScreen';
import AttorneyAnalyticsScreen from './src/screens/attorney/AttorneyAnalyticsScreen';

// ── Attorney screens ─────────────────────────────────────────────────────────
import AttorneyHomeScreen         from './src/screens/attorney/AttorneyHomeScreen';
import AttorneyClientsScreen      from './src/screens/attorney/AttorneyClientsScreen';
import AttorneyDocumentsScreen    from './src/screens/attorney/AttorneyDocumentsScreen';
import AttorneyMessagesScreen     from './src/screens/attorney/AttorneyMessagesScreen';
import AttorneySettingsScreen     from './src/screens/attorney/AttorneySettingsScreen';
import AttorneyClientDetailScreen from './src/screens/attorney/AttorneyClientDetailScreen';

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Deep-link configuration.  All pathwayusa:// URLs (and the Expo Go tunnel
// equivalent during development) are intercepted by React Navigation so the
// URL event reaches our AuthContext listener.  Auth tokens live in the URL
// fragment (#) and are not mapped to named routes — AuthContext handles them.
const LINKING_CONFIG = {
  prefixes: [Linking.createURL('/'), 'pathwayusa://'],
  config: { screens: {} },
};

// ── Shared utilities ─────────────────────────────────────────────────────────

const CLIENT_TAB_ICONS = {
  Home:      { focused: 'home',            outline: 'home-outline'            },
  Learn:     { focused: 'school',          outline: 'school-outline'          },
  Guide:     { focused: 'map',             outline: 'map-outline'             },
  Documents: { focused: 'folder',          outline: 'folder-outline'          },
  Resources: { focused: 'location',        outline: 'location-outline'        },
};

const ATTORNEY_TAB_ICONS = {
  AttDashboard:  { focused: 'grid',         outline: 'grid-outline'         },
  AttClients:    { focused: 'people',       outline: 'people-outline'       },
  AttDocuments:  { focused: 'folder',       outline: 'folder-outline'       },
  AttMessages:   { focused: 'chatbubbles',  outline: 'chatbubbles-outline'  },
  AttAnalytics:  { focused: 'bar-chart',    outline: 'bar-chart-outline'    },
  AttSettings:   { focused: 'settings',     outline: 'settings-outline'     },
};

function NotificationSetup() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    // Only reschedule if permission was already granted — don't prompt at launch.
    // Permission is requested after the first quiz or step completion (LearningScreen).
    Notifications.getPermissionsAsync()
      .then(({ status }) => { if (status === 'granted') scheduleDailyReminder().catch(() => {}); })
      .catch(() => {});
  }, [user]);
  return null;
}

function ThemeSync() {
  const { profile } = useAuth();
  const { applyTheme } = useTheme();
  useEffect(() => {
    if (profile?.role === 'attorney') {
      applyTheme('classic');
    } else if (profile?.theme) {
      applyTheme(profile.theme);
    }
  }, [profile?.theme, profile?.role]);
  return null;
}

function OfflineWrapper() {
  const isOffline = useOffline();
  return isOffline ? <OfflineBanner /> : null;
}

// ── Auth / onboarding stacks ─────────────────────────────────────────────────

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome"         component={WelcomeScreen}        />
      <Stack.Screen name="Login"           component={LoginScreen}           />
      <Stack.Screen name="SignUp"          component={SignUpScreen}          />
      <Stack.Screen name="AttorneyLogin"   component={AttorneyLoginScreen}   />
      <Stack.Screen name="ForgotPassword"  component={ForgotPasswordScreen}  />
    </Stack.Navigator>
  );
}

// ── Client navigator ─────────────────────────────────────────────────────────

function MainTabs({ route }) {
  const { colors } = useTheme();
  const firstSession = route.params?.firstSession ?? false;
  return (
    <Tab.Navigator
      initialRouteName={firstSession ? 'Guide' : 'Home'}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons = CLIENT_TAB_ICONS[route.name];
          return <Ionicons name={focused ? icons.focused : icons.outline} size={Math.max(size, 28)} color={color} />;
        },
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: '#BDC3C7',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 96 : 72,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
          elevation: 12,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700', marginTop: 3 },
        headerStyle:      { backgroundColor: '#1A1A2E' },
        headerTintColor:  '#fff',
        headerTitleStyle: { fontWeight: '800', fontSize: 17 },
      })}
    >
      <Tab.Screen name="Home"      component={HomeScreen}      options={{ headerShown: false, tabBarLabel: 'Home'  }} />
      <Tab.Screen name="Learn"     component={LearningScreen}  options={{ headerShown: false, tabBarLabel: 'Study' }} />
      <Tab.Screen name="Guide"     component={GuideScreen}     options={{ headerShown: false, tabBarLabel: 'Path'  }} />
      <Tab.Screen name="Documents" component={DocumentsScreen} options={{ title: 'Documents', tabBarLabel: 'Documents' }} />
      <Tab.Screen name="Resources" component={ResourcesScreen} options={{ headerShown: false, tabBarLabel: 'Help' }} />
    </Tab.Navigator>
  );
}

function AppStack({ firstSession = false }) {
  const { colors } = useTheme();
  const headerOpts = {
    headerStyle:      { backgroundColor: '#1A1A2E' },
    headerTintColor:  '#fff',
    headerTitleStyle: { fontWeight: '800', fontSize: 17 },
    headerBackTitle:  '',
  };
  return (
    <Stack.Navigator>
      <Stack.Screen name="AppMain" options={{ headerShown: false }} component={MainTabs} initialParams={{ firstSession }} />
      <Stack.Screen name="Settings"    component={SettingsScreen}    options={{ title: 'Settings',    ...headerOpts }} />
      <Stack.Screen name="LanguageVoiceSettings"        component={LanguageVoiceSettingsScreen}        options={{ title: 'Language and Voice',     ...headerOpts }} />
      <Stack.Screen name="RemindersSettings"            component={RemindersSettingsScreen}            options={{ title: 'Reminders',              ...headerOpts }} />
      <Stack.Screen name="PrivacyAppLockSettings"       component={PrivacyAppLockSettingsScreen}       options={{ title: 'Privacy and App Lock',   ...headerOpts }} />
      <Stack.Screen name="MyImmigrationProfileSettings" component={MyImmigrationProfileSettingsScreen} options={{ title: 'My Immigration Profile', ...headerOpts }} />
      <Stack.Screen name="Deadlines"   component={DeadlinesScreen}   options={{ title: 'Deadline Reminders',  ...headerOpts }} />
      <Stack.Screen name="DocumentExpiry" component={DocumentExpiryScreen} options={{ title: 'Document Expiry Dates', ...headerOpts }} />
      <Stack.Screen name="Legal"       component={LegalPortalScreen} options={{ title: 'Legal Portal',        ...headerOpts }} />
      <Stack.Screen name="CaseTracker"  component={CaseTrackerScreen}  options={{ title: 'USCIS Case Tracker', ...headerOpts }} />
      <Stack.Screen name="Upgrade"     component={UpgradeScreen}     options={{ title: 'Upgrade to Pro',     ...headerOpts }} />
      <Stack.Screen name="ClientDetail" component={ClientDetailScreen} options={{ title: 'Client Details',    ...headerOpts }} />
      <Stack.Screen name="AttorneyMatch"      component={AttorneyMatchScreen}      options={{ headerShown: false }} />
      <Stack.Screen name="NewsDetail"  component={NewsDetailScreen}  options={{ title: 'News',               ...headerOpts }} />
      <Stack.Screen name="Badges"          component={BadgesScreen}          options={{ headerShown: false }} />
      <Stack.Screen name="Referral"        component={ReferralScreen}        options={{ headerShown: false }} />
      <Stack.Screen name="Glossary"        component={GlossaryScreen}        options={{ title: 'Immigration Glossary',  ...headerOpts }} />
      <Stack.Screen name="Profile"         component={ProfileScreen}         options={{ title: 'My Profile',           ...headerOpts }} />
      <Stack.Screen name="FAQ"             component={FAQScreen}             options={{ title: 'FAQ',                  ...headerOpts }} />
      <Stack.Screen name="About"           component={AboutScreen}           options={{ title: 'About PathwayUSA',     ...headerOpts }} />
      <Stack.Screen name="Policy"          component={PolicyScreen}          options={{ title: 'Legal',                ...headerOpts }} />
      <Stack.Screen name="CostCalculator"  component={CostCalculatorScreen}  options={{ title: 'Cost Calculator',      ...headerOpts }} />
      <Stack.Screen name="Journal"          component={JournalScreen}          options={{ title: 'Journey Journal',      ...headerOpts }} />
      <Stack.Screen name="Celebration"      component={CelebrationScreen}      options={{ headerShown: false }} />
      <Stack.Screen name="RFE"              component={RFEScreen}              options={{ title: 'RFE Response Guide',   ...headerOpts }} />
      <Stack.Screen name="VisaBulletin"     component={VisaBulletinScreen}     options={{ title: 'Visa Bulletin',        ...headerOpts }} />
      <Stack.Screen name="FormExplainer"    component={FormExplainerScreen}    options={{ title: 'Form Field Guide',     ...headerOpts }} />
      <Stack.Screen name="Family"           component={FamilyScreen}           options={{ title: 'Family Mode',          ...headerOpts }} />
      <Stack.Screen name="AppointmentPrep"  component={AppointmentPrepScreen}  options={{ title: 'Appointment Coach',    ...headerOpts }} />
      <Stack.Screen name="TravelTracker"    component={TravelTrackerScreen}    options={{ title: 'Travel Tracker',       ...headerOpts }} />
      <Stack.Screen name="StepMission"      component={StepMissionScreen}      options={{ headerShown: false }} />
      <Stack.Screen name="ResourceMap"      component={ResourceMapScreen}       options={{ headerShown: false }} />
      <Stack.Screen name="Notifications"    component={NotificationsScreen}     options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

// ── Attorney navigator ────────────────────────────────────────────────────────

function AttorneyTabs() {
  const { colors }                      = useTheme();
  const { pendingDocs, unreadMessages } = useAttorney();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons = ATTORNEY_TAB_ICONS[route.name];
          return <Ionicons name={focused ? icons.focused : icons.outline} size={Math.max(size, 28)} color={color} />;
        },
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#eeeeee',
          paddingBottom: 5,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="AttDashboard"
        component={AttorneyHomeScreen}
        options={{ tabBarLabel: 'Dashboard' }}
      />
      <Tab.Screen
        name="AttClients"
        component={AttorneyClientsScreen}
        options={{ tabBarLabel: 'Clients' }}
      />
      <Tab.Screen
        name="AttDocuments"
        component={AttorneyDocumentsScreen}
        options={{
          tabBarLabel: 'Documents',
          tabBarBadge: pendingDocs > 0 ? pendingDocs : undefined,
        }}
      />
      <Tab.Screen
        name="AttMessages"
        component={AttorneyMessagesScreen}
        options={{
          tabBarLabel: 'Messages',
          tabBarBadge: unreadMessages > 0 ? unreadMessages : undefined,
        }}
      />
      <Tab.Screen
        name="AttAnalytics"
        component={AttorneyAnalyticsScreen}
        options={{ tabBarLabel: 'Analytics' }}
      />
      <Tab.Screen
        name="AttSettings"
        component={AttorneySettingsScreen}
        options={{ tabBarLabel: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

function AttorneyStackInner() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AttMain"         component={AttorneyTabs}              />
      <Stack.Screen name="AttClientDetail" component={AttorneyClientDetailScreen} />
    </Stack.Navigator>
  );
}

function AttorneyStack() {
  return (
    <AttorneyProvider>
      <AttorneyStackInner />
    </AttorneyProvider>
  );
}

// ── Root navigator ────────────────────────────────────────────────────────────

function PasswordResetStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PasswordReset" component={PasswordResetScreen} />
    </Stack.Navigator>
  );
}

const FIRST_SESSION_KEY = '@pathwayusa/first_session_complete';

function RootNavigator() {
  const { user, profile, loading, pendingPasswordReset } = useAuth();
  const { colors } = useTheme();
  const [firstSession,  setFirstSession]  = useState(null);
  const [onboardingDone, setOnboardingDone] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Exposed via OnboardingContext so intake screens can force a re-check
  const refresh = React.useCallback(() => setRefreshTrigger((t) => t + 1), []);

  const isAppUser = !loading && !!user && profile?.role !== 'attorney';

  useEffect(() => {
    if (!isAppUser) { setFirstSession(null); setOnboardingDone(null); return; }
    let cancelled = false;

    AsyncStorage.getItem(FIRST_SESSION_KEY).then((v) => {
      if (!cancelled) setFirstSession(!v);
    }).catch(() => { if (!cancelled) setFirstSession(false); });

    // Key is user-scoped so switching accounts on the same device never
    // inherits a previous user's completed state.  On first run after
    // an upgrade we migrate the old unscoped key to the new format.
    const userKey = `${ONBOARDING_KEY}/${user.id}`;
    AsyncStorage.getItem(userKey).then(async (v) => {
      if (v) {
        if (!cancelled) setOnboardingDone(!!profile?.onboarding_complete || true);
        return;
      }
      // Backward-compat: migrate old unscoped key if it belongs to this device's
      // only/previous session, then delete it so a future new user starts clean.
      try {
        const old = await AsyncStorage.getItem(ONBOARDING_KEY);
        if (old) {
          await AsyncStorage.setItem(userKey, old);
          await AsyncStorage.removeItem(ONBOARDING_KEY);
          if (!cancelled) setOnboardingDone(true);
        } else {
          if (!cancelled) setOnboardingDone(!!profile?.onboarding_complete || false);
        }
      } catch {
        if (!cancelled) setOnboardingDone(!!profile?.onboarding_complete || false);
      }
    }).catch(() => { if (!cancelled) setOnboardingDone(true); });

    return () => { cancelled = true; };
  }, [isAppUser, profile?.onboarding_complete, refreshTrigger, user?.id]);

  const appLoading = loading || (isAppUser && (firstSession === null || onboardingDone === null));

  if (appLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0d7a6e' }}>
        <PathwayLogo variant="white" size={140} />
        <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" style={{ marginTop: 32 }} />
      </View>
    );
  }

  if (pendingPasswordReset) return <PasswordResetStack />;
  if (!user) return <AuthStack />;

  const isAttorney = profile?.role === 'attorney';
  if (isAttorney) return <AttorneyStack />;

  if (onboardingDone === false) return (
    <OnboardingContext.Provider value={{ refresh }}>
      <IntakeStackNavigator />
    </OnboardingContext.Provider>
  );
  return (
    <OnboardingContext.Provider value={{ refresh }}>
      <AppStack firstSession={firstSession ?? false} />
    </OnboardingContext.Provider>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <ThemeProvider>
          <AuthProvider>
            <TestVersionProvider>
            <SubscriptionProvider>
                <VisualEffectsProvider>
                <HelperTipsProvider>
                <FirstLaunchProvider>
                <AppLockOverlay>
                <ErrorBoundary>
                <View style={styles.root}>
                  <OfflineWrapper />
                  <NavigationContainer linking={LINKING_CONFIG}>
                    <StatusBar style="light" />
                    <ThemeSync />
                    <NotificationSetup />
                    <RootNavigator />
                  </NavigationContainer>
                  <FirstLaunchSlides />
                  <PaymentSuccessModal />
                </View>
                </ErrorBoundary>
                </AppLockOverlay>
                </FirstLaunchProvider>
                </HelperTipsProvider>
                </VisualEffectsProvider>
            </SubscriptionProvider>
            </TestVersionProvider>
          </AuthProvider>
        </ThemeProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
