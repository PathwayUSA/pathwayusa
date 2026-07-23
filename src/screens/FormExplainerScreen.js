import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SHADOWS } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useSpeech } from '../hooks/useSpeech';

const FORMS = [
  {
    id: 'n400',
    number: 'N-400',
    title: 'Application for Naturalization',
    icon: 'shield-checkmark-outline',
    color: '#1565c0',
    who: 'The person applying for citizenship (the applicant)',
    when: 'After 5 years as a permanent resident (3 years if married to a U.S. citizen). Can be filed up to 90 days early.',
    fee: '$725 (fee waiver Form I-912 available)',
    link: 'https://www.uscis.gov/n-400',
    summary: 'The N-400 is the application to become a U.S. citizen through naturalization. It collects your personal history, immigration history, time spent outside the U.S., and background information.',
    fields: [
      { field: 'Part 1 – Eligibility', plain: 'Select which eligibility basis applies to you. Most people check "I have been a Lawful Permanent Resident for at least 5 years." If married to a U.S. citizen for 3+ years, check that box instead.' },
      { field: 'Part 2 – Information About You', plain: 'Your legal name exactly as it appears on your Green Card. If you want to change your name at naturalization, list your desired name here.' },
      { field: 'Part 5 – Information for Criminal Records Search', plain: 'Your physical description. This is used to run your background check. Answer truthfully — any mismatch with your records will be flagged.' },
      { field: 'Part 8 – Time Outside the U.S.', plain: 'List every trip outside the U.S. in the last 5 years (or 3 years). Include the country you visited, departure date, and return date. USCIS cross-checks this against travel records.' },
      { field: 'Part 12 – Good Moral Character', plain: 'Extensive background questions. Answer EVERY question honestly, including Yes/No questions about arrests, tax filings, drug use, and more. Hiding information is fraud.' },
      { field: 'Part 14 – Oath Requirements', plain: 'Certifies you are willing to take the Oath of Allegiance and support the U.S. Constitution. Must answer Yes to all questions to qualify.' },
    ],
    mistakes: [
      'Leaving travel history incomplete — USCIS will find any undisclosed trips',
      'Answering "No" to questions out of shame — always disclose and explain',
      'Not signing and dating every page that requires it',
      'Using a nickname instead of your legal name',
      'Not attaching required documents (passport photos, Green Card copy)',
    ],
  },
  {
    id: 'i485',
    number: 'I-485',
    title: 'Application to Register Permanent Residence',
    icon: 'card-outline',
    color: '#2e7d32',
    who: 'The person applying for a Green Card who is already inside the U.S.',
    when: 'After an immigrant petition (I-130 or I-140) is approved and a visa number is immediately available.',
    fee: '$1,440 (includes biometrics)',
    link: 'https://www.uscis.gov/i-485',
    summary: 'Form I-485 is used to apply for a Green Card (adjustment of status) from inside the United States. You do NOT leave the U.S. to complete this process — that is consular processing.',
    fields: [
      { field: 'Part 1 – Information About You', plain: 'Your full legal name, date and place of birth, nationality. Must match your passport and birth certificate exactly.' },
      { field: 'Part 2 – Application Type', plain: 'Select the basis for your Green Card application. Most family cases select "An immediate relative of a U.S. citizen."' },
      { field: 'Part 4 – Addresses', plain: 'List every address you have lived at in the last 5 years in reverse chronological order. Every month must be accounted for.' },
      { field: 'Part 5 – Employment', plain: 'List every job you have held in the past 5 years. Gaps must be explained.' },
      { field: 'Part 9 – Criminal History and Immigration Violations', plain: 'Answer all Yes/No questions truthfully. Disclose every arrest, charge, conviction, or deportation order — even if the case was dismissed or expunged.' },
      { field: 'Signature', plain: 'You must sign in the exact same way your name is written on the form. An unsigned form will be rejected.' },
    ],
    mistakes: [
      'Filing before a visa number is available — it will be rejected',
      'Not filing I-765 (EAD) and I-131 (Advance Parole) at the same time — these are free when filed with I-485',
      'Traveling outside the U.S. without Advance Parole — this abandons your application',
      'Forgetting the medical exam (I-693) in a sealed envelope from a civil surgeon',
    ],
  },
  {
    id: 'i130',
    number: 'I-130',
    title: 'Petition for Alien Relative',
    icon: 'people-outline',
    color: '#7b1fa2',
    who: 'A U.S. citizen or Lawful Permanent Resident (the "petitioner" or sponsor)',
    when: 'As soon as the qualifying relationship exists. You do not wait for your relative to be inside the U.S.',
    fee: '$675',
    link: 'https://www.uscis.gov/i-130',
    summary: 'The I-130 is filed by a U.S. citizen or permanent resident to start the process of bringing a qualified family member to the U.S. It establishes that a qualifying relationship exists — it does NOT grant a visa or Green Card by itself.',
    fields: [
      { field: 'Part 1 – Relationship', plain: 'The type of relationship (spouse, parent, child, sibling). This determines the visa category and wait time. Immediate relatives of U.S. citizens have no wait; preference categories can take years.' },
      { field: 'Part 2 – Information About You (the petitioner)', plain: 'Your legal name, date of birth, Social Security number, and current immigration status. Must be a U.S. citizen or LPR.' },
      { field: 'Part 3 – Information About Your Relative', plain: 'Full legal name, date/place of birth, current address, and current immigration status of the person you are sponsoring.' },
      { field: 'Supporting documents', plain: 'Proof of the qualifying relationship is critical: marriage certificate (for spouse), birth certificates (for parent-child), naturalization certificate (for U.S. citizen petitioner).' },
    ],
    mistakes: [
      'Using a translation of a name instead of the exact legal name as on their passport',
      'Not including proof of prior marriages ended (divorce decrees, death certificates)',
      'Filing in the wrong category (e.g. filing for adult child as immediate relative)',
      'Not updating USCIS when your address changes during the wait',
    ],
  },
  {
    id: 'i864',
    number: 'I-864',
    title: 'Affidavit of Support Under Section 213A',
    icon: 'cash-outline',
    color: '#e65100',
    who: 'The U.S. citizen or LPR petitioner (and sometimes a joint sponsor)',
    when: 'Required for most family-based and some employment-based Green Card cases, submitted with I-485 or at consular processing.',
    fee: 'No USCIS filing fee (attorney prep fees apply)',
    link: 'https://www.uscis.gov/i-864',
    summary: 'The I-864 is a legally binding contract where the sponsor promises to financially support the immigrant and ensure they do not become a "public charge." The sponsor must prove their income is at least 125% of the Federal Poverty Guidelines.',
    fields: [
      { field: 'Part 1 – Basis for Filing', plain: 'Most sponsors check "I am the petitioner." A joint sponsor uses the same form and files separately.' },
      { field: 'Part 6 – Sponsor\'s Income and Employment', plain: 'Your current annual income, employer name, and job title. Attach your most recent tax return, W-2, and current pay stub. If self-employed, attach Schedule C.' },
      { field: 'Household size', plain: 'Count yourself, everyone listed as a dependent on your taxes, and the person you are sponsoring. The minimum income requirement increases with household size.' },
      { field: 'Assets (Part 7)', plain: 'If your income alone is insufficient, you can supplement with assets. Assets must be worth 3x the shortfall and must be liquid (easily converted to cash).' },
    ],
    mistakes: [
      'Forgetting to attach tax returns and W-2s — the form is incomplete without them',
      'Not including all household members in the household size calculation',
      'Using assets without providing bank/investment statements proving their value',
      'Not having a joint sponsor when income is insufficient — this is a common denial reason',
    ],
  },
  {
    id: 'i693',
    number: 'I-693',
    title: 'Report of Medical Examination and Vaccination Record',
    icon: 'medkit-outline',
    color: '#00838f',
    who: 'Completed BY a USCIS-approved civil surgeon — NOT by your regular doctor',
    when: 'Before filing I-485, or when requested by USCIS. Valid for 2 years from the date the civil surgeon signs it.',
    fee: 'No USCIS fee — civil surgeon charges $200–$500',
    link: 'https://www.uscis.gov/i-693',
    summary: 'The I-693 is the official USCIS medical examination form. It must be completed by a USCIS-authorized civil surgeon who will check your vaccination history, screen for communicable diseases, and assess your overall health.',
    fields: [
      { field: 'Physical examination', plain: 'The civil surgeon will examine you for communicable diseases including tuberculosis, syphilis, gonorrhea, Hansen\'s disease, and certain other conditions.' },
      { field: 'Vaccination record', plain: 'Required vaccines include: COVID-19, influenza, measles, mumps, rubella, varicella, hepatitis B, hepatitis A, meningococcal disease, tetanus, and others based on age.' },
      { field: 'Mental health evaluation', plain: 'The civil surgeon will assess for any mental health conditions. Do not be afraid — only specific conditions that cause harm are disqualifying.' },
      { field: 'Sealed envelope', plain: 'CRITICAL: The I-693 must be given to you in a sealed envelope by the civil surgeon. Do not open it. Submit it sealed to USCIS.' },
    ],
    mistakes: [
      'Going to a regular doctor instead of a USCIS-authorized civil surgeon',
      'Opening the sealed envelope — this voids the entire exam',
      'Waiting too long — the exam expires 2 years after the civil surgeon signs it',
      'Not getting all required vaccinations before or at the exam',
    ],
  },
];

function FormCard({ form, colors, selected, onSelect, onSpeak }) {
  const isOpen = selected === form.id;
  return (
    <View>
      <TouchableOpacity
        style={[styles.formCard, { backgroundColor: colors.card || '#fff', borderColor: isOpen ? form.color : 'transparent', borderWidth: isOpen ? 2 : 0 }, SHADOWS.small]}
        onPress={() => onSelect(isOpen ? null : form.id)}
        activeOpacity={0.85}
      >
        <View style={[styles.formNum, { backgroundColor: form.color }]}>
          <Text style={styles.formNumText}>{form.number}</Text>
        </View>
        <View style={styles.formMeta}>
          <Text style={[styles.formTitle, { color: colors.text }]}>{form.title}</Text>
          <Text style={[styles.formFee, { color: colors.textSecondary }]}>Fee: {form.fee}</Text>
        </View>
        <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      {isOpen && (
        <View style={[styles.formDetail, { backgroundColor: colors.card || '#fff' }, SHADOWS.small]}>
          <LinearGradient colors={[form.color, form.color + 'cc']} style={styles.detailBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Ionicons name={form.icon} size={22} color="#fff" />
            <View>
              <Text style={styles.bannerTitle}>Form {form.number}</Text>
              <Text style={styles.bannerSub}>{form.title}</Text>
            </View>
          </LinearGradient>

          <View style={styles.detailContent}>
            <Text style={[styles.summary, { color: colors.text }]}>{form.summary}</Text>

            <View style={styles.metaRow}>
              <View style={[styles.metaChip, { backgroundColor: '#e8f5e9' }]}>
                <Ionicons name="person-outline" size={13} color="#2e7d32" />
                <Text style={[styles.metaChipText, { color: '#2e7d32' }]}>Filed by: {form.who}</Text>
              </View>
            </View>
            <View style={[styles.metaChip, { backgroundColor: '#e3f2fd' }]}>
              <Ionicons name="calendar-outline" size={13} color="#1565c0" />
              <Text style={[styles.metaChipText, { color: '#1565c0' }]}>When: {form.when}</Text>
            </View>

            <Text style={[styles.sectionLabel, { color: form.color }]}>KEY FIELDS EXPLAINED</Text>
            {form.fields.map((f, i) => (
              <View key={i} style={[styles.fieldRow, { borderLeftColor: form.color }]}>
                <Text style={[styles.fieldName, { color: form.color }]}>{f.field}</Text>
                <Text style={[styles.fieldPlain, { color: colors.text }]}>{f.plain}</Text>
              </View>
            ))}

            <Text style={[styles.sectionLabel, { color: '#c62828' }]}>COMMON MISTAKES</Text>
            {form.mistakes.map((m, i) => (
              <View key={i} style={styles.mistakeRow}>
                <Ionicons name="close-circle-outline" size={16} color="#c62828" style={{ marginTop: 2 }} />
                <Text style={[styles.mistakeText, { color: colors.text }]}>{m}</Text>
              </View>
            ))}

            <View style={styles.actions}>
              <TouchableOpacity style={[styles.linkBtn, { backgroundColor: form.color }]} onPress={() => Linking.openURL(form.link)}>
                <Ionicons name="open-outline" size={15} color="#fff" />
                <Text style={styles.linkBtnText}>Download on USCIS.gov</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.speakBtn, { borderColor: form.color + '40' }]} onPress={() => onSpeak(`Form ${form.number}. ${form.title}. ${form.summary}`)}>
                <Ionicons name="volume-high-outline" size={15} color={form.color} />
                <Text style={[styles.speakBtnText, { color: form.color }]}>Read Aloud</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

export default function FormExplainerScreen() {
  const { colors } = useTheme();
  const { speak } = useSpeech();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState(null);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient colors={['#37474f', '#546e7a']} style={styles.hero}>
        <Ionicons name="document-text" size={32} color="#fff" />
        <View>
          <Text style={styles.heroTitle}>USCIS Forms Guide</Text>
          <Text style={styles.heroSub}>Plain-language field-by-field explanations</Text>
        </View>
      </LinearGradient>

      <View style={[styles.infoBox, { backgroundColor: '#fff8e1' }]}>
        <Ionicons name="information-circle-outline" size={16} color="#f9a825" />
        <Text style={[styles.infoText, { color: '#7c6c0e' }]}>All USCIS forms are FREE at uscis.gov. Never pay a third-party website for these forms. Each form download link opens directly on the official USCIS website.</Text>
      </View>

      {FORMS.map((form) => (
        <FormCard key={form.id} form={form} colors={colors} selected={selected} onSelect={setSelected} onSpeak={speak} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content:   { padding: 16, gap: 10 },

  hero:     { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 20, padding: 20, marginBottom: 4 },
  heroTitle:{ fontSize: 20, fontWeight: '900', color: '#fff' },
  heroSub:  { fontSize: 13, color: 'rgba(255,255,255,0.8)' },

  infoBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 14, padding: 12 },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18 },

  formCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, gap: 12 },
  formNum:  { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, flexShrink: 0 },
  formNumText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  formMeta: { flex: 1 },
  formTitle:{ fontSize: 14, fontWeight: '700', marginBottom: 2 },
  formFee:  { fontSize: 12 },

  formDetail:   { borderRadius: 18, overflow: 'hidden', marginTop: 4 },
  detailBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  bannerTitle:  { fontSize: 16, fontWeight: '900', color: '#fff' },
  bannerSub:    { fontSize: 12, color: 'rgba(255,255,255,0.8)' },

  detailContent: { padding: 16, gap: 14 },
  summary:       { fontSize: 14, lineHeight: 22 },

  metaRow:     { gap: 8 },
  metaChip:    { flexDirection: 'row', alignItems: 'flex-start', gap: 6, borderRadius: 10, padding: 10 },
  metaChipText:{ flex: 1, fontSize: 12, lineHeight: 18 },

  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },

  fieldRow:   { borderLeftWidth: 3, paddingLeft: 12, gap: 4 },
  fieldName:  { fontSize: 13, fontWeight: '700' },
  fieldPlain: { fontSize: 13, lineHeight: 20 },

  mistakeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  mistakeText:{ flex: 1, fontSize: 13, lineHeight: 20 },

  actions:    { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  linkBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, paddingVertical: 12 },
  linkBtnText:{ color: '#fff', fontSize: 13, fontWeight: '700' },
  speakBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  speakBtnText:{ fontSize: 13, fontWeight: '600' },
});
