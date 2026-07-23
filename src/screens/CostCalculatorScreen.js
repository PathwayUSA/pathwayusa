import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SHADOWS } from '../theme';
import { useTheme } from '../context/ThemeContext';

const PATHS = [
  { key: 'gc_family', label: 'Green Card — Family', icon: 'people-outline' },
  { key: 'gc_employment', label: 'Green Card — Employment', icon: 'briefcase-outline' },
  { key: 'citizenship', label: 'Naturalization (Citizenship)', icon: 'shield-checkmark-outline' },
  { key: 'renewal', label: 'Green Card Renewal', icon: 'refresh-outline' },
];

const FEES = {
  gc_family: [
    { label: 'I-130 Petition (Sponsor files)', form: 'I-130', uscisMin: 675, uscisMax: 675, notes: 'Filed by your U.S. citizen or PR sponsor', required: true },
    { label: 'I-485 Adjustment of Status', form: 'I-485', uscisMin: 1440, uscisMax: 1440, notes: 'Includes biometrics. Waived for certain applicants.', required: true },
    { label: 'I-864 Affidavit of Support', form: 'I-864', uscisMin: 0, uscisMax: 0, notes: 'No USCIS fee — preparation cost only', required: true },
    { label: 'Medical Exam (Civil Surgeon)', form: null, uscisMin: 200, uscisMax: 500, notes: 'Cost varies by civil surgeon. Not paid to USCIS.', required: true },
    { label: 'I-765 Work Permit (EAD)', form: 'I-765', uscisMin: 0, uscisMax: 0, notes: 'FREE when filed with I-485', required: false },
    { label: 'I-131 Advance Parole (Travel)', form: 'I-131', uscisMin: 0, uscisMax: 0, notes: 'FREE when filed with I-485', required: false },
    { label: 'Translation & Document Prep', form: null, uscisMin: 50, uscisMax: 300, notes: 'Certified translations of foreign documents', required: false },
    { label: 'Attorney Fees', form: null, uscisMin: 1500, uscisMax: 5000, notes: 'Varies widely. Many nonprofits offer free help.', attorney: true },
  ],
  gc_employment: [
    { label: 'I-140 Employer Petition', form: 'I-140', uscisMin: 700, uscisMax: 700, notes: 'Usually paid by employer', required: true },
    { label: 'PERM Labor Certification', form: null, uscisMin: 0, uscisMax: 0, notes: 'No USCIS fee — attorney prep costs apply', required: true },
    { label: 'I-485 Adjustment of Status', form: 'I-485', uscisMin: 1440, uscisMax: 1440, notes: 'Includes biometrics', required: true },
    { label: 'Medical Exam (Civil Surgeon)', form: null, uscisMin: 200, uscisMax: 500, notes: 'Cost varies by civil surgeon', required: true },
    { label: 'I-765 Work Permit (EAD)', form: 'I-765', uscisMin: 0, uscisMax: 0, notes: 'FREE when filed with I-485', required: false },
    { label: 'I-131 Advance Parole (Travel)', form: 'I-131', uscisMin: 0, uscisMax: 0, notes: 'FREE when filed with I-485', required: false },
    { label: 'Translation & Document Prep', form: null, uscisMin: 100, uscisMax: 400, notes: 'Certified translations required', required: false },
    { label: 'Attorney Fees', form: null, uscisMin: 3000, uscisMax: 10000, notes: 'Employment cases are complex. Attorney strongly recommended.', attorney: true },
  ],
  citizenship: [
    { label: 'N-400 Naturalization Application', form: 'N-400', uscisMin: 725, uscisMax: 725, notes: 'Fee waiver (I-912) available if you cannot afford', required: true },
    { label: 'Passport Photos', form: null, uscisMin: 15, uscisMax: 25, notes: 'Two passport-style photos required', required: true },
    { label: 'Translation & Document Prep', form: null, uscisMin: 0, uscisMax: 200, notes: 'Foreign documents need certified translation', required: false },
    { label: 'Attorney Fees', form: null, uscisMin: 500, uscisMax: 2500, notes: 'Many people file N-400 without an attorney', attorney: true },
    { label: 'U.S. Passport (after ceremony)', form: 'DS-11', uscisMin: 165, uscisMax: 165, notes: 'Optional but strongly recommended', required: false },
  ],
  renewal: [
    { label: 'I-90 Green Card Renewal', form: 'I-90', uscisMin: 455, uscisMax: 455, notes: 'File up to 6 months before expiry', required: true },
    { label: 'Biometrics Fee', form: null, uscisMin: 85, uscisMax: 85, notes: 'Paid to USCIS at the ASC', required: true },
    { label: 'Translation & Document Prep', form: null, uscisMin: 0, uscisMax: 100, notes: 'Usually minimal for renewal', required: false },
    { label: 'Attorney Fees', form: null, uscisMin: 300, uscisMax: 800, notes: 'Most renewals can be done without an attorney', attorney: true },
  ],
};

function FeeRow({ fee, colors, includeAttorney }) {
  if (fee.attorney && !includeAttorney) return null;
  const isZero  = fee.uscisMin === 0 && fee.uscisMax === 0;
  const isSame  = fee.uscisMin === fee.uscisMax;
  const rangeStr = isZero ? 'FREE' : isSame ? `$${fee.uscisMin.toLocaleString()}` : `$${fee.uscisMin.toLocaleString()}–$${fee.uscisMax.toLocaleString()}`;
  const tagColor = fee.attorney ? '#e65100' : fee.required ? colors.primary : '#757575';

  return (
    <View style={[styles.feeRow, { borderBottomColor: '#f0f0f0' }]}>
      <View style={styles.feeLeft}>
        <View style={styles.feeTitleRow}>
          <Text style={[styles.feeLabel, { color: colors.text }]}>{fee.label}</Text>
          {fee.form && (
            <TouchableOpacity onPress={() => Linking.openURL(`https://www.uscis.gov/${fee.form.toLowerCase()}`)}>
              <View style={[styles.formChip, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.formText, { color: colors.primary }]}>{fee.form}</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.feeNote, { color: colors.textSecondary }]}>{fee.notes}</Text>
        <View style={[styles.tag, { backgroundColor: tagColor + '18' }]}>
          <Text style={[styles.tagText, { color: tagColor }]}>
            {fee.attorney ? 'Attorney' : fee.required ? 'Required' : 'Optional'}
          </Text>
        </View>
      </View>
      <Text style={[styles.feeAmount, { color: isZero ? '#4caf50' : colors.text }]}>{rangeStr}</Text>
    </View>
  );
}

export default function CostCalculatorScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [path, setPath]               = useState('citizenship');
  const [includeAttorney, setIncludeAttorney] = useState(false);

  const fees = FEES[path] || [];

  const { minTotal, maxTotal } = useMemo(() => {
    let min = 0, max = 0;
    for (const f of fees) {
      if (f.attorney && !includeAttorney) continue;
      min += f.uscisMin;
      max += f.uscisMax;
    }
    return { minTotal: min, maxTotal: max };
  }, [fees, includeAttorney]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Path selector */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>SELECT YOUR PATH</Text>
      <View style={styles.pathGrid}>
        {PATHS.map((p) => {
          const active = path === p.key;
          return (
            <TouchableOpacity
              key={p.key}
              style={[
                styles.pathCard,
                { backgroundColor: active ? colors.primary : (colors.card || '#fff') },
                SHADOWS.small,
              ]}
              onPress={() => setPath(p.key)}
              activeOpacity={0.8}
            >
              <Ionicons name={p.icon} size={20} color={active ? '#fff' : colors.primary} />
              <Text style={[styles.pathLabel, { color: active ? '#fff' : colors.text }]} numberOfLines={2}>
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Attorney toggle */}
      <View style={[styles.toggleCard, { backgroundColor: colors.card || '#fff' }, SHADOWS.small]}>
        <View style={[styles.toggleIcon, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="briefcase-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.toggleBody}>
          <Text style={[styles.toggleLabel, { color: colors.text }]}>Include Attorney Fees</Text>
          <Text style={[styles.toggleSub, { color: colors.textSecondary }]}>Estimate cost with professional legal help</Text>
        </View>
        <Switch
          value={includeAttorney}
          onValueChange={setIncludeAttorney}
          trackColor={{ false: '#e0e0e0', true: colors.primary + '80' }}
          thumbColor={includeAttorney ? colors.primary : '#bbb'}
        />
      </View>

      {/* Total banner */}
      <LinearGradient
        colors={[colors.primary, colors.primary + 'dd']}
        style={styles.totalBanner}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.totalLabel}>Estimated Total Cost</Text>
        <Text style={styles.totalAmount}>
          {minTotal === maxTotal
            ? `$${minTotal.toLocaleString()}`
            : `$${minTotal.toLocaleString()} – $${maxTotal.toLocaleString()}`}
        </Text>
        <Text style={styles.totalSub}>
          {includeAttorney ? 'Including attorney fees' : 'Excluding attorney fees · Toggle above to include'}
        </Text>
      </LinearGradient>

      {/* Fee breakdown */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>FEE BREAKDOWN</Text>
      <View style={[styles.feeTable, { backgroundColor: colors.card || '#fff' }, SHADOWS.small]}>
        {fees.map((fee, i) => (
          <FeeRow key={i} fee={fee} colors={colors} includeAttorney={includeAttorney} />
        ))}
      </View>

      {/* Disclaimer */}
      <View style={[styles.disclaimer, { backgroundColor: '#fff8e1' }]}>
        <Ionicons name="information-circle-outline" size={16} color="#f9a825" />
        <Text style={[styles.disclaimerText, { color: '#7c6c0e' }]}>
          Fees shown are USCIS rates as of 2025. USCIS fees change periodically. Always verify current fees at uscis.gov before filing. Fee waivers (Form I-912) may be available if you cannot afford USCIS fees.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.uscisBtn, { backgroundColor: colors.primary }]}
        onPress={() => Linking.openURL('https://www.uscis.gov/forms/filing-fees')}
      >
        <Ionicons name="open-outline" size={16} color="#fff" />
        <Text style={styles.uscisBtnText}>Verify Current Fees at USCIS.gov</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content:   { padding: 16, gap: 12 },

  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginLeft: 4, marginTop: 4 },

  pathGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pathCard: { width: '47%', borderRadius: 16, padding: 14, gap: 8 },
  pathLabel: { fontSize: 13, fontWeight: '700', lineHeight: 18 },

  toggleCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, gap: 12 },
  toggleIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  toggleBody: { flex: 1 },
  toggleLabel: { fontSize: 15, fontWeight: '700' },
  toggleSub:   { fontSize: 12 },

  totalBanner: { borderRadius: 20, padding: 24, alignItems: 'center', gap: 6 },
  totalLabel:  { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  totalAmount: { color: '#fff', fontSize: 36, fontWeight: '900' },
  totalSub:    { color: 'rgba(255,255,255,0.7)', fontSize: 12, textAlign: 'center' },

  feeTable: { borderRadius: 16, overflow: 'hidden' },
  feeRow:   { padding: 14, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  feeLeft:  { flex: 1, gap: 4 },
  feeTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  feeLabel: { fontSize: 14, fontWeight: '600' },
  formChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  formText: { fontSize: 11, fontWeight: '700' },
  feeNote:  { fontSize: 12, lineHeight: 17 },
  tag:      { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  tagText:  { fontSize: 10, fontWeight: '700' },
  feeAmount: { fontSize: 15, fontWeight: '800', flexShrink: 0, textAlign: 'right', minWidth: 80 },

  disclaimer:     { borderRadius: 14, padding: 14, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  disclaimerText: { flex: 1, fontSize: 12, lineHeight: 18 },

  uscisBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, paddingVertical: 14 },
  uscisBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
