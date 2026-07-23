/**
 * Smart Onboarding Assessment Flow
 * 6 screens → personalized pathway assignment
 */
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, KeyboardAvoidingView, Platform, Modal, FlatList,
  ActivityIndicator, Animated,
} from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { useOnboardingRefresh } from '../../context/OnboardingContext';
import { supabase } from '../../lib/supabase';
import PathwayLogo from '../../components/PathwayLogo';

// ─── Constants ────────────────────────────────────────────────────────────────

export const ONBOARDING_KEY      = '@pathwayusa/onboarding_complete';
export const ONBOARDING_DATA_KEY = '@pathwayusa/onboarding_data';

const TEAL      = '#1a9e89';
const TEAL_DARK = '#0d7a6e';
const TEAL_GRAD = ['#0a5c52', '#0d7a6e', '#1a9e89'];
const TEAL_LIGHT = '#e8f7f5';
const DARK      = '#1A1A2E';
const MUTED     = '#7F8C8D';
const BG        = '#F5F7F5';
const WHITE     = '#ffffff';

// ─── Pathway Type Assignment ──────────────────────────────────────────────────

export function assignPathwayType(status, goals = []) {
  const g = new Set(goals);
  if (status === 'tps')        return 'A';
  if (status === 'student')    return 'B';
  if (status === 'visa')       return 'C';
  if (status === 'green_card') return 'D';
  if (status === 'asylum')     return 'E';
  if (status === 'citizen')    return 'F';
  if (g.has('family'))         return 'F';
  if (g.has('green_card'))     return 'A';
  return 'A';
}

// ─── Goal Options (branched by status) ───────────────────────────────────────

const ALL_GOALS = [
  { key: 'green_card',    label: 'Get a Green Card (Permanent Residency)' },
  { key: 'citizenship',   label: 'Apply for U.S. Citizenship (Naturalization)' },
  { key: 'extend_renew',  label: 'Extend or Renew Status' },
  { key: 'family',        label: 'Bring Family to the U.S.' },
  { key: 'work_auth',     label: 'Work Authorization' },
  { key: 'asylum',        label: 'Get Asylum or Refugee Status' },
  { key: 'renew_gc',      label: 'Renew Green Card' },
  { key: 'help_relative', label: 'Help a relative get citizenship' },
  { key: 'other',         label: 'Other / Not sure yet' },
];

const GOAL_KEYS_BY_STATUS = {
  tps:        ['green_card', 'citizenship', 'extend_renew', 'family', 'work_auth', 'asylum', 'other'],
  visa:       ['green_card', 'citizenship', 'extend_renew', 'family', 'work_auth', 'asylum', 'other'],
  student:    ['green_card', 'citizenship', 'extend_renew', 'family', 'work_auth', 'other'],
  asylum:     ['green_card', 'citizenship', 'extend_renew', 'family', 'work_auth', 'other'],
  other:      ['green_card', 'citizenship', 'extend_renew', 'family', 'work_auth', 'asylum', 'other'],
  green_card: ['citizenship', 'family', 'renew_gc', 'other'],
  citizen:    ['family', 'help_relative', 'other'],
};

function getGoalsForStatus(status) {
  const keys = GOAL_KEYS_BY_STATUS[status] ?? GOAL_KEYS_BY_STATUS.other;
  return ALL_GOALS.filter((g) => keys.includes(g.key));
}

// ─── Progress Dots ────────────────────────────────────────────────────────────

function ProgressDots({ current, total = 6 }) {
  return (
    <View style={dot.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            dot.base,
            i < current - 1 ? dot.done
            : i === current - 1 ? dot.active
            : dot.inactive,
          ]}
        />
      ))}
    </View>
  );
}

const dot = StyleSheet.create({
  row:      { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  base:     { width: 8, height: 8, borderRadius: 4 },
  active:   { backgroundColor: TEAL, width: 24 },
  done:     { backgroundColor: TEAL, opacity: 0.5 },
  inactive: { backgroundColor: '#D0D0D0' },
});

// ─── Picker Modal (reusable) ──────────────────────────────────────────────────

function PickerModal({ visible, title, options, onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const filtered = query
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={pm.safe} edges={['top', 'bottom']}>
        <View style={pm.header}>
          <Text style={pm.title}>{title}</Text>
          <TouchableOpacity onPress={() => { setQuery(''); onClose(); }} style={pm.closeBtn}>
            <Ionicons name="close" size={24} color={DARK} />
          </TouchableOpacity>
        </View>
        <View style={pm.searchWrap}>
          <Ionicons name="search-outline" size={16} color={MUTED} />
          <TextInput
            style={pm.searchInput}
            placeholder="Search..."
            placeholderTextColor={MUTED}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={pm.item}
              onPress={() => { onSelect(item); setQuery(''); onClose(); }}
              activeOpacity={0.7}
            >
              <Text style={pm.itemTxt}>{item}</Text>
              <Ionicons name="chevron-forward" size={16} color="#CCC" />
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={pm.sep} />}
          keyboardShouldPersistTaps="handled"
        />
      </SafeAreaView>
    </Modal>
  );
}

const pm = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: WHITE },
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  title:       { flex: 1, fontSize: 18, fontWeight: '800', color: DARK },
  closeBtn:    { padding: 4 },
  searchWrap:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginVertical: 12, backgroundColor: BG, borderRadius: 10, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, fontSize: 15, color: DARK },
  item:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  itemTxt:     { flex: 1, fontSize: 16, color: DARK },
  sep:         { height: 1, backgroundColor: '#F0F0F0', marginLeft: 20 },
});

// ─── SCREEN 1 — WELCOME ───────────────────────────────────────────────────────

function WelcomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  return (
    <LinearGradient colors={TEAL_GRAD} style={{ flex: 1 }} start={{ x: 0, y: 0 }} end={{ x: 0.3, y: 1 }}>
      {/* Decorative circles */}
      <View style={[s.decCircle1]} />
      <View style={[s.decCircle2]} />

      <ScrollView
        contentContainerStyle={[s.welcomeContent, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginBottom: 24 }}>
          <PathwayLogo variant="white" size={120} />
        </View>

        <Text style={s.welcomeHeadline}>Your Path to U.S. Citizenship</Text>
        <Text style={s.welcomeSub}>
          We'll ask a few questions to personalize your experience.
        </Text>

        {/* Trust bullets */}
        <View style={s.trustWrap}>
          {[
            'Takes 2–3 minutes',
            '100% private',
            'Helps us guide you better',
          ].map((txt) => (
            <View key={txt} style={s.trustRow}>
              <View style={s.trustCheck}>
                <Ionicons name="checkmark" size={13} color={TEAL} />
              </View>
              <Text style={s.trustText}>{txt}</Text>
            </View>
          ))}
        </View>

        {/* Start Now CTA */}
        <TouchableOpacity
          style={s.startBtn}
          onPress={() => navigation.navigate('IntakeStatus')}
          activeOpacity={0.88}
        >
          <Text style={s.startBtnTxt}>Start Now</Text>
          <Ionicons name="arrow-forward" size={20} color={TEAL} />
        </TouchableOpacity>

        {/* Skip link */}
        <TouchableOpacity
          style={s.skipLink}
          onPress={async () => {
            await AsyncStorage.setItem(user ? `${ONBOARDING_KEY}/${user.id}` : ONBOARDING_KEY, 'skipped');
            navigation.navigate('IntakeComplete', { skipped: true });
          }}
          activeOpacity={0.7}
        >
          <Text style={s.skipTxt}>I'll do this later</Text>
        </TouchableOpacity>

        <ProgressDots current={1} />
      </ScrollView>
    </LinearGradient>
  );
}

// ─── SCREEN 2 — CURRENT STATUS ────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { key: 'citizen',    icon: 'flag',              emoji: '🇺🇸', title: 'U.S. Citizen',       subtitle: 'I am already a U.S. citizen' },
  { key: 'green_card', icon: 'card',              emoji: '🪪',  title: 'Green Card Holder',   subtitle: 'I have a permanent resident card' },
  { key: 'tps',        icon: 'shield-checkmark',  emoji: '🛡️', title: 'TPS Holder',          subtitle: 'I have Temporary Protected Status' },
  { key: 'visa',       icon: 'airplane',          emoji: '✈️', title: 'Visa Holder',          subtitle: 'I am in the U.S. on a visa' },
  { key: 'student',    icon: 'school',            emoji: '🎓', title: 'Student',              subtitle: 'I am a student with an F-1 or other visa' },
  { key: 'asylum',     icon: 'scale',             emoji: '⚖️', title: 'Asylum / Refugee',    subtitle: 'I have asylum or refugee status' },
  { key: 'other',      icon: 'help-circle',       emoji: '❓', title: 'Other',                subtitle: 'Another immigration status' },
];

function StatusScreen({ navigation, route }) {
  const [selected, setSelected] = useState(route.params?.intakeData?.immigration_status ?? null);

  const handleNext = () => {
    if (!selected) return;
    navigation.navigate('IntakeGoals', {
      intakeData: { ...(route.params?.intakeData ?? {}), immigration_status: selected },
    });
  };

  return (
    <SafeAreaView style={s.screen} edges={['bottom']}>
      {/* Teal header strip */}
      <LinearGradient colors={[TEAL_DARK, TEAL]} style={s.screenHeader} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <Text style={s.screenHeaderTitle}>I am currently...</Text>
        <Text style={s.screenHeaderSub}>What best describes your immigration status?</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.screenPad} showsVerticalScrollIndicator={false}>
        <View style={s.optionList}>
          {STATUS_OPTIONS.map((opt) => {
            const active = selected === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[s.optCard, active && s.optCardActive]}
                onPress={() => setSelected(opt.key)}
                activeOpacity={0.8}
              >
                <Text style={s.optEmoji}>{opt.emoji}</Text>
                <View style={s.optBody}>
                  <Text style={[s.optTitle, active && s.optTitleActive]}>{opt.title}</Text>
                  <Text style={s.optSub}>{opt.subtitle}</Text>
                </View>
                {active
                  ? <Ionicons name="checkmark-circle" size={22} color={TEAL} />
                  : <Ionicons name="chevron-forward" size={18} color="#CCC" />}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={s.bottomWrap}>
        <ProgressDots current={2} />
        <TouchableOpacity
          style={[s.nextBtn, !selected && s.nextBtnDisabled]}
          onPress={handleNext}
          disabled={!selected}
          activeOpacity={0.85}
        >
          <Text style={s.nextBtnTxt}>Next</Text>
          <Ionicons name="arrow-forward" size={20} color={WHITE} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── SCREEN 3 — GOALS (branched by status) ────────────────────────────────────

function GoalsScreen({ navigation, route }) {
  const status = route.params?.intakeData?.immigration_status ?? 'other';
  const goals  = getGoalsForStatus(status);
  const [selected, setSelected] = useState(new Set(route.params?.intakeData?.immigration_goals ?? []));

  const toggle = (key) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleNext = () => {
    navigation.navigate('IntakeTime', {
      intakeData: {
        ...(route.params?.intakeData ?? {}),
        immigration_goals: Array.from(selected),
      },
    });
  };

  return (
    <SafeAreaView style={s.screen} edges={['bottom']}>
      <LinearGradient colors={[TEAL_DARK, TEAL]} style={s.screenHeader} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <Text style={s.screenHeaderTitle}>What is your goal?</Text>
        <Text style={s.screenHeaderSub}>Select all that apply.</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.screenPad} showsVerticalScrollIndicator={false}>
        <View style={s.checkList}>
          {goals.map((opt) => {
            const active = selected.has(opt.key);
            return (
              <TouchableOpacity
                key={opt.key}
                style={[s.checkRow, active && s.checkRowActive]}
                onPress={() => toggle(opt.key)}
                activeOpacity={0.8}
              >
                <View style={[s.checkbox, active && s.checkboxActive]}>
                  {active && <Ionicons name="checkmark" size={14} color={WHITE} />}
                </View>
                <Text style={[s.checkLabel, active && s.checkLabelActive]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={s.footNote}>You can update this anytime.</Text>
      </ScrollView>

      <View style={s.bottomWrap}>
        <ProgressDots current={3} />
        <TouchableOpacity style={s.nextBtn} onPress={handleNext} activeOpacity={0.85}>
          <Text style={s.nextBtnTxt}>Next</Text>
          <Ionicons name="arrow-forward" size={20} color={WHITE} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── SCREEN 4 — TIMELINE ──────────────────────────────────────────────────────

const TIME_OPTIONS = [
  { key: 'lt1',    label: 'Less than 1 year' },
  { key: '1_3',    label: '1 – 3 years' },
  { key: '3_5',    label: '3 – 5 years' },
  { key: '5_10',   label: '5 – 10 years' },
  { key: '10_15',  label: '10 – 15 years' },
  { key: 'gt15',   label: 'More than 15 years' },
];

function TimelineScreen({ navigation, route }) {
  const [selected, setSelected] = useState(route.params?.intakeData?.years_in_us ?? null);

  const handleNext = () => {
    if (!selected) return;
    navigation.navigate('IntakeDetails', {
      intakeData: { ...(route.params?.intakeData ?? {}), years_in_us: selected },
    });
  };

  return (
    <SafeAreaView style={s.screen} edges={['bottom']}>
      <LinearGradient colors={[TEAL_DARK, TEAL]} style={s.screenHeader} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <Text style={s.screenHeaderTitle}>How long have you been in the U.S.?</Text>
        <Text style={s.screenHeaderSub}>This helps us build your timeline.</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.screenPad} showsVerticalScrollIndicator={false}>
        <View style={s.radioList}>
          {TIME_OPTIONS.map((opt) => {
            const active = selected === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[s.radioRow, active && s.radioRowActive]}
                onPress={() => setSelected(opt.key)}
                activeOpacity={0.8}
              >
                <View style={[s.radioCircle, active && s.radioCircleActive]}>
                  {active && <View style={s.radioDot} />}
                </View>
                <Text style={[s.radioLabel, active && s.radioLabelActive]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={s.bottomWrap}>
        <ProgressDots current={4} />
        <TouchableOpacity
          style={[s.nextBtn, !selected && s.nextBtnDisabled]}
          onPress={handleNext}
          disabled={!selected}
          activeOpacity={0.85}
        >
          <Text style={s.nextBtnTxt}>Next</Text>
          <Ionicons name="arrow-forward" size={20} color={WHITE} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── SCREEN 5 — ADDITIONAL DETAILS ───────────────────────────────────────────

const LANGUAGES = [
  'English', 'Spanish', 'French', 'Portuguese', 'Haitian Creole',
  'Mandarin', 'Vietnamese', 'Tagalog', 'Arabic', 'Other',
];

const COUNTRIES = [
  'Afghanistan','Albania','Algeria','Angola','Argentina','Armenia','Australia',
  'Austria','Azerbaijan','Bahamas','Bahrain','Bangladesh','Belarus','Belgium',
  'Belize','Bolivia','Bosnia and Herzegovina','Brazil','Bulgaria','Cambodia',
  'Cameroon','Canada','Cape Verde','Chile','China','Colombia','Congo',
  'Costa Rica','Croatia','Cuba','Czech Republic','Democratic Republic of the Congo',
  'Denmark','Dominican Republic','Ecuador','Egypt','El Salvador','Eritrea',
  'Ethiopia','Finland','France','Georgia','Germany','Ghana','Greece',
  'Guatemala','Guinea','Haiti','Honduras','Hungary','India','Indonesia',
  'Iran','Iraq','Ireland','Israel','Italy','Jamaica','Japan','Jordan',
  'Kazakhstan','Kenya','Kosovo','Kyrgyzstan','Laos','Latvia','Lebanon',
  'Liberia','Libya','Lithuania','Madagascar','Malawi','Malaysia','Mali',
  'Mauritania','Mexico','Moldova','Morocco','Mozambique','Myanmar','Nepal',
  'Netherlands','Nicaragua','Nigeria','North Macedonia','Norway','Oman',
  'Pakistan','Palestine','Panama','Paraguay','Peru','Philippines','Poland',
  'Portugal','Qatar','Romania','Russia','Rwanda','Saudi Arabia','Senegal',
  'Serbia','Sierra Leone','Singapore','Slovakia','Somalia','South Africa',
  'South Korea','South Sudan','Spain','Sri Lanka','Sudan','Sweden',
  'Switzerland','Syria','Taiwan','Tajikistan','Tanzania','Thailand','Togo',
  'Trinidad and Tobago','Tunisia','Turkey','Turkmenistan','Uganda','Ukraine',
  'United Kingdom','United States','Uruguay','Uzbekistan','Venezuela',
  'Vietnam','Yemen','Zambia','Zimbabwe','Other',
].sort();

function DetailsScreen({ navigation, route }) {
  const prev = route.params?.intakeData ?? {};
  const [dob, setDob]                 = useState(prev.date_of_birth ?? '');
  const [country, setCountry]         = useState(prev.country_of_birth ?? '');
  const [language, setLanguage]       = useState(prev.primary_language ?? '');
  const [hasAttorney, setHasAttorney] = useState(prev.has_attorney ?? null);
  const [showCountry, setShowCountry] = useState(false);
  const [showLang, setShowLang]       = useState(false);

  const formatDob = (txt) => {
    const d = txt.replace(/\D/g, '').slice(0, 8);
    let out = d;
    if (d.length > 4) out = d.slice(0, 2) + '/' + d.slice(2, 4) + '/' + d.slice(4);
    else if (d.length > 2) out = d.slice(0, 2) + '/' + d.slice(2);
    setDob(out);
  };

  const handleNext = () => {
    navigation.navigate('IntakeReveal', {
      intakeData: {
        ...prev,
        date_of_birth:    dob,
        country_of_birth: country,
        primary_language: language,
        has_attorney:     hasAttorney,
      },
    });
  };

  return (
    <SafeAreaView style={s.screen} edges={['bottom']}>
      <LinearGradient colors={[TEAL_DARK, TEAL]} style={s.screenHeader} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <Text style={s.screenHeaderTitle}>A few more details...</Text>
        <Text style={s.screenHeaderSub}>To personalize your experience.</Text>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.screenPad} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <Text style={s.fieldLabel}>Date of Birth (MM/DD/YYYY)</Text>
          <TextInput
            style={s.fieldInput}
            value={dob}
            onChangeText={formatDob}
            placeholder="MM/DD/YYYY"
            placeholderTextColor={MUTED}
            keyboardType="number-pad"
            maxLength={10}
          />

          <Text style={s.fieldLabel}>Country of Birth</Text>
          <TouchableOpacity style={s.picker} onPress={() => setShowCountry(true)} activeOpacity={0.8}>
            <Text style={[s.pickerTxt, !country && s.pickerPlaceholder]}>
              {country || 'Select country'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={MUTED} />
          </TouchableOpacity>

          <Text style={s.fieldLabel}>Primary Language</Text>
          <TouchableOpacity style={s.picker} onPress={() => setShowLang(true)} activeOpacity={0.8}>
            <Text style={[s.pickerTxt, !language && s.pickerPlaceholder]}>
              {language || 'Select language'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={MUTED} />
          </TouchableOpacity>

          <Text style={s.fieldLabel}>Do you have legal representation?</Text>
          <View style={s.radioList}>
            {[
              { key: true,  label: 'Yes, I have an attorney' },
              { key: false, label: 'No, I do not' },
            ].map((opt) => {
              const active = hasAttorney === opt.key;
              return (
                <TouchableOpacity
                  key={String(opt.key)}
                  style={[s.radioRow, active && s.radioRowActive]}
                  onPress={() => setHasAttorney(opt.key)}
                  activeOpacity={0.8}
                >
                  <View style={[s.radioCircle, active && s.radioCircleActive]}>
                    {active && <View style={s.radioDot} />}
                  </View>
                  <Text style={[s.radioLabel, active && s.radioLabelActive]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={s.bottomWrap}>
        <ProgressDots current={5} />
        <TouchableOpacity style={s.nextBtn} onPress={handleNext} activeOpacity={0.85}>
          <Text style={s.nextBtnTxt}>See My Roadmap</Text>
          <Ionicons name="map" size={20} color={WHITE} />
        </TouchableOpacity>
      </View>

      <PickerModal
        visible={showCountry}
        title="Country of Birth"
        options={COUNTRIES}
        onSelect={setCountry}
        onClose={() => setShowCountry(false)}
      />
      <PickerModal
        visible={showLang}
        title="Primary Language"
        options={LANGUAGES}
        onSelect={setLanguage}
        onClose={() => setShowLang(false)}
      />
    </SafeAreaView>
  );
}

// ─── SCREEN 6 — ROADMAP REVEAL ────────────────────────────────────────────────

const STATUS_META = {
  citizen:    { label: 'U.S. Citizen',      icon: '🇺🇸', pathway: 'F' },
  green_card: { label: 'Green Card Holder', icon: '🪪',  pathway: 'D' },
  tps:        { label: 'TPS Holder',        icon: '🛡️', pathway: 'A' },
  visa:       { label: 'Visa Holder',       icon: '✈️', pathway: 'C' },
  student:    { label: 'Student',           icon: '🎓', pathway: 'B' },
  asylum:     { label: 'Asylum / Refugee',  icon: '⚖️', pathway: 'E' },
  other:      { label: 'Other Status',      icon: '❓', pathway: 'A' },
};

const GOAL_LABELS = {
  green_card:    'Get a Green Card',
  citizenship:   'U.S. Citizenship',
  extend_renew:  'Extend / Renew Status',
  family:        'Bring Family to the U.S.',
  work_auth:     'Work Authorization',
  asylum:        'Asylum / Refugee Status',
  renew_gc:      'Renew Green Card',
  help_relative: 'Help a Relative',
  other:         'Other / Not Sure',
};

function RevealScreen({ navigation, route }) {
  const { user } = useAuth();
  const { refresh } = useOnboardingRefresh();
  const [saving, setSaving] = useState(false);
  const intake = route.params?.intakeData ?? {};

  const statusMeta  = STATUS_META[intake.immigration_status] ?? STATUS_META.other;
  const pathwayType = assignPathwayType(intake.immigration_status, intake.immigration_goals);
  const primaryGoal = (intake.immigration_goals ?? [])[0];
  const goalLabel   = primaryGoal ? GOAL_LABELS[primaryGoal] : 'Personalized for you';

  const handleComplete = useCallback(async (destination = 'Home') => {
    if (saving) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const saveData = {
        immigration_status:   intake.immigration_status,
        immigration_goals:    intake.immigration_goals ?? [],
        years_in_us:          intake.years_in_us,
        date_of_birth:        intake.date_of_birth || null,
        country_of_birth:     intake.country_of_birth || null,
        primary_language:     intake.primary_language || null,
        has_attorney:         intake.has_attorney,
        pathway_type:         pathwayType,
        onboarding_complete:  true,
        onboarding_completed_at: now,
        // Also map to existing immigration_path field for backward compat
        immigration_path: intake.immigration_status === 'green_card' ? 'citizenship' : 'green_card',
      };
      await AsyncStorage.multiSet([
        [user ? `${ONBOARDING_KEY}/${user.id}` : ONBOARDING_KEY, 'complete'],
        [ONBOARDING_DATA_KEY, JSON.stringify({ ...intake, pathway_type: pathwayType })],
      ]);
      if (user) {
        await supabase.from('profiles').update(saveData).eq('id', user.id);
      }
      refresh(); // triggers RootNavigator to switch to AppStack
    } catch (err) {
      // Refresh anyway — don't block user even if Supabase fails
      refresh();
    }
    setSaving(false);
  }, [saving, intake, pathwayType, user, refresh]);

  return (
    <SafeAreaView style={s.screen} edges={['bottom']}>
      <LinearGradient colors={[TEAL_DARK, TEAL]} style={s.screenHeader} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <Text style={s.screenHeaderTitle}>Your personalized roadmap is ready! 🗺️</Text>
        <Text style={s.screenHeaderSub}>Based on your answers, we've created a custom experience for you.</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.screenPad} showsVerticalScrollIndicator={false}>
        {/* Summary card */}
        <View style={rv.card}>
          <Text style={rv.cardTitle}>Your Situation</Text>
          <View style={rv.divider} />

          <View style={rv.row}>
            <Text style={rv.rowIcon}>{statusMeta.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={rv.rowLabel}>Status</Text>
              <Text style={rv.rowValue}>{statusMeta.label}</Text>
            </View>
          </View>

          {primaryGoal && (
            <View style={rv.row}>
              <Text style={rv.rowIcon}>🎯</Text>
              <View style={{ flex: 1 }}>
                <Text style={rv.rowLabel}>Goal</Text>
                <Text style={rv.rowValue}>{goalLabel}</Text>
              </View>
            </View>
          )}

          <View style={rv.row}>
            <Text style={rv.rowIcon}>🗺️</Text>
            <View style={{ flex: 1 }}>
              <Text style={rv.rowLabel}>Pathway</Text>
              <Text style={rv.rowValue}>Pathway {pathwayType} — Custom roadmap created</Text>
            </View>
          </View>

          <View style={rv.pillRow}>
            <View style={rv.pill}>
              <Ionicons name="checkmark-circle" size={14} color={TEAL} />
              <Text style={rv.pillTxt}>Steps personalized</Text>
            </View>
            <View style={rv.pill}>
              <Ionicons name="checkmark-circle" size={14} color={TEAL} />
              <Text style={rv.pillTxt}>Timeline estimated</Text>
            </View>
          </View>
        </View>

        {/* Disclaimer */}
        <View style={rv.disclaimer}>
          <Text style={rv.disclaimerTxt}>
            This information is based on current USCIS policy and general immigration law. Immigration rules change frequently. Your individual circumstances may affect your eligibility. This is not legal advice. Always consult a licensed immigration attorney before taking action.
          </Text>
        </View>
      </ScrollView>

      <View style={s.bottomWrap}>
        <ProgressDots current={6} />
        <TouchableOpacity
          style={[s.nextBtn, saving && s.nextBtnDisabled]}
          onPress={() => handleComplete('Guide')}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color={WHITE} />
          ) : (
            <>
              <Text style={s.nextBtnTxt}>View My Roadmap</Text>
              <Ionicons name="map" size={20} color={WHITE} />
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.ghostBtn, saving && s.nextBtnDisabled]}
          onPress={() => handleComplete('Home')}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={s.ghostBtnTxt}>Go to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const rv = StyleSheet.create({
  card:       { backgroundColor: WHITE, borderRadius: 16, padding: 20, gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardTitle:  { fontSize: 16, fontWeight: '800', color: DARK },
  divider:    { height: 1, backgroundColor: '#F0F0F0' },
  row:        { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowIcon:    { fontSize: 24 },
  rowLabel:   { fontSize: 12, fontWeight: '600', color: MUTED, marginBottom: 2 },
  rowValue:   { fontSize: 15, fontWeight: '700', color: DARK },
  pillRow:    { flexDirection: 'row', gap: 8, marginTop: 4 },
  pill:       { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: TEAL_LIGHT, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  pillTxt:    { fontSize: 12, fontWeight: '600', color: TEAL },
  disclaimer: { backgroundColor: '#F9F9F9', borderRadius: 10, padding: 14, marginTop: 16 },
  disclaimerTxt: { fontSize: 11, color: MUTED, lineHeight: 17, fontWeight: '400' },
});

// ─── COMPLETE BRIDGE SCREEN ───────────────────────────────────────────────────

// Shown while RootNavigator detects the completed intake and switches to AppStack.
function CompleteScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: WHITE, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={TEAL} />
    </View>
  );
}

// ─── Shared Styles ────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  // Welcome screen
  welcomeContent:   { paddingHorizontal: 28, alignItems: 'center' },
  decCircle1:       { position: 'absolute', width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(255,255,255,0.04)', top: -120, right: -100 },
  decCircle2:       { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.05)', bottom: 80, left: -60 },
  welcomeHeadline:  { fontSize: 30, fontWeight: '800', color: WHITE, textAlign: 'center', lineHeight: 38, marginBottom: 14 },
  welcomeSub:       { fontSize: 15, color: 'rgba(255,255,255,0.78)', textAlign: 'center', lineHeight: 23, marginBottom: 36 },
  trustWrap:        { alignSelf: 'stretch', gap: 14, marginBottom: 40 },
  trustRow:         { flexDirection: 'row', alignItems: 'center', gap: 12 },
  trustCheck:       { width: 26, height: 26, borderRadius: 13, backgroundColor: WHITE, justifyContent: 'center', alignItems: 'center' },
  trustText:        { fontSize: 15, color: WHITE, fontWeight: '500' },
  startBtn:         { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: WHITE, borderRadius: 14, height: 56, marginBottom: 16 },
  startBtnTxt:      { fontSize: 17, fontWeight: '800', color: TEAL },
  skipLink:         { marginBottom: 8 },
  skipTxt:          { fontSize: 14, color: 'rgba(255,255,255,0.55)', textDecorationLine: 'underline' },

  // Screen header (teal strip on non-welcome screens)
  screenHeader:     { paddingHorizontal: 20, paddingTop: 52, paddingBottom: 20 },
  screenHeaderTitle:{ fontSize: 22, fontWeight: '800', color: WHITE, lineHeight: 30, marginBottom: 4 },
  screenHeaderSub:  { fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 20 },

  screenPad: { padding: 20, paddingBottom: 8 },

  // Bottom action area
  bottomWrap: { paddingHorizontal: 20, paddingBottom: 20, backgroundColor: WHITE, borderTopWidth: 1, borderTopColor: '#F0F0F0', gap: 10 },

  // Next button
  nextBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: TEAL, borderRadius: 14, height: 56 },
  nextBtnDisabled: { opacity: 0.45 },
  nextBtnTxt:      { fontSize: 17, fontWeight: '700', color: WHITE },
  ghostBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 44 },
  ghostBtnTxt:     { fontSize: 15, fontWeight: '600', color: TEAL },

  // Option cards (status screen)
  optionList:    { gap: 10 },
  optCard:       { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: WHITE, borderRadius: 14, borderWidth: 1.5, borderColor: '#E8E8E8', padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  optCardActive: { borderColor: TEAL, backgroundColor: TEAL_LIGHT },
  optEmoji:      { fontSize: 26 },
  optBody:       { flex: 1 },
  optTitle:      { fontSize: 15, fontWeight: '700', color: DARK },
  optTitleActive:{ color: TEAL_DARK },
  optSub:        { fontSize: 12, color: MUTED, marginTop: 2 },

  // Checkboxes (goals screen)
  checkList:      { gap: 10 },
  checkRow:       { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: WHITE, borderRadius: 14, borderWidth: 1.5, borderColor: '#E8E8E8', padding: 16 },
  checkRowActive: { borderColor: TEAL, backgroundColor: TEAL_LIGHT },
  checkbox:       { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#BDBDBD', justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: TEAL, borderColor: TEAL },
  checkLabel:     { flex: 1, fontSize: 15, color: DARK, fontWeight: '500' },
  checkLabelActive: { fontWeight: '700', color: TEAL_DARK },
  footNote:       { fontSize: 12, color: MUTED, textAlign: 'center', marginTop: 12, fontStyle: 'italic' },

  // Radio buttons (timeline + attorney screens)
  radioList:        { gap: 10 },
  radioRow:         { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: WHITE, borderRadius: 14, borderWidth: 1.5, borderColor: '#E8E8E8', padding: 16 },
  radioRowActive:   { borderColor: TEAL, backgroundColor: TEAL_LIGHT },
  radioCircle:      { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#BDBDBD', justifyContent: 'center', alignItems: 'center' },
  radioCircleActive:{ borderColor: TEAL },
  radioDot:         { width: 10, height: 10, borderRadius: 5, backgroundColor: TEAL },
  radioLabel:       { flex: 1, fontSize: 15, color: DARK, fontWeight: '500' },
  radioLabelActive: { fontWeight: '700', color: TEAL_DARK },

  // Fields (details screen)
  fieldLabel:       { fontSize: 13, fontWeight: '700', color: DARK, marginBottom: 8, marginTop: 16 },
  fieldInput:       { backgroundColor: WHITE, borderRadius: 12, borderWidth: 1.5, borderColor: '#E8E8E8', paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: DARK },
  picker:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: WHITE, borderRadius: 12, borderWidth: 1.5, borderColor: '#E8E8E8', paddingHorizontal: 16, paddingVertical: 16 },
  pickerTxt:        { fontSize: 15, color: DARK, flex: 1 },
  pickerPlaceholder:{ color: MUTED },
});

// ─── Stack Navigator ──────────────────────────────────────────────────────────

const Stack = createNativeStackNavigator();

export default function IntakeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="IntakeWelcome"  component={WelcomeScreen}   />
      <Stack.Screen name="IntakeStatus"   component={StatusScreen}    />
      <Stack.Screen name="IntakeGoals"    component={GoalsScreen}     />
      <Stack.Screen name="IntakeTime"     component={TimelineScreen}  />
      <Stack.Screen name="IntakeDetails"  component={DetailsScreen}   />
      <Stack.Screen name="IntakeReveal"   component={RevealScreen}    />
      <Stack.Screen name="IntakeComplete" component={CompleteScreen}  />
    </Stack.Navigator>
  );
}
