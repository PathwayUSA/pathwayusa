import React from 'react';
import { View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useOnboardingRefresh } from '../../context/OnboardingContext';
import { ONBOARDING_KEY } from '../onboarding/IntakeStack';
import { rowStyles, SectionHeader, RowLink } from '../../components/SettingsRow';

export default function MyImmigrationProfileSettingsScreen({ navigation }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { refresh: refreshOnboarding } = useOnboardingRefresh();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={rowStyles.section}>
        <SectionHeader
          icon="person-outline" iconBg={colors.primaryLight} iconColor={colors.primary}
          title="My Immigration Profile"
          subtitle="Update your status and goals"
        />
        <RowLink
          icon="person-circle-outline"
          label="Edit Profile"
          iconColor={colors.primary}
          onPress={() => navigation.navigate('Profile')}
        />
        <View style={rowStyles.divider} />
        <RowLink
          icon="create-outline"
          label="Redo Immigration Assessment"
          iconColor={colors.primary}
          onPress={async () => {
            if (user) await AsyncStorage.removeItem(`${ONBOARDING_KEY}/${user.id}`).catch(() => {});
            refreshOnboarding();
          }}
        />
        <View style={rowStyles.divider} />
        <RowLink
          icon="calendar-outline"
          label="Update Green Card Date"
          iconColor={colors.primary}
          onPress={() => navigation.navigate('TravelTracker')}
        />
      </View>
    </ScrollView>
  );
}
