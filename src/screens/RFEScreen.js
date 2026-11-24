import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Linking, Share, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS, TYPOGRAPHY } from '../theme';
import { useTheme } from '../context/ThemeContext';
import DisclaimerBanner from '../components/DisclaimerBanner';
import { useSpeech } from '../hooks/useSpeech';

const RFE_TYPES = [
  {
    id: 'relationship',
    icon: 'heart-outline',
    color: '#2A8B7A',
    title: 'Insufficient Evidence of Relationship',
    what: 'USCIS does not have enough evidence that the qualifying relationship is genuine. Common for spousal petitions.',
    documents: [
      'Joint bank account statements (12 months)',
      'Joint lease or mortgage documents',
      'Insurance policies listing both spouses',
      'Photos together (at least 20–30, spanning several years)',
      'Birth certificates of children born together',
      'Sworn affidavits from friends/family',
      'Airline tickets and hotel receipts from trips together',
      'Text/messaging records showing ongoing communication',
      'Letters addressed to both spouses at the same address',
    ],
    template: `Re: Response to Request for Evidence – [Receipt Number]

Dear USCIS Officer,

I am writing in response to the Request for Evidence dated [RFE Date] regarding Form [Form Number] filed by [Petitioner Name] on behalf of [Beneficiary Name].

We respectfully submit the following evidence to establish the bona fides of our [marriage/relationship]:

[List the documents you are enclosing]

We are a genuine couple who [share a home / have built a life together / have children together]. The enclosed documents demonstrate the authenticity of our relationship. We respectfully request that the above-listed petition be approved.

Sincerely,
[Your Name]
[Date]`,
    tip: 'Submit evidence in chronological order. More is better. USCIS wants to see a relationship that evolves over time, not just a wedding photo.',
  },
  {
    id: 'medical',
    icon: 'medical-outline',
    color: '#2A8B7A',
    title: 'Missing or Incomplete Medical Examination',
    what: 'Your I-693 Medical Examination is missing, incomplete, was signed by an unauthorized civil surgeon, or has expired.',
    documents: [
      'Completed Form I-693 in a sealed envelope (must be sealed by civil surgeon)',
      'Proof that civil surgeon is USCIS-authorized',
      'Vaccination records for all required vaccines',
      'TB test results',
      'Doctor notes on any medical conditions disclosed',
    ],
    template: `Re: Response to Request for Evidence – [Receipt Number]

Dear USCIS Officer,

In response to your RFE regarding the medical examination, please find enclosed the completed Form I-693 sealed by [Civil Surgeon Name], a USCIS-authorized civil surgeon, conducted on [Date].

The examination was completed within the required timeframe and includes all required vaccinations and tests.

Sincerely,
[Your Name]
[Date]`,
    tip: 'The I-693 is valid for 2 years from the date the civil surgeon signs it. Make sure you use a USCIS-authorized civil surgeon — the list is at uscis.gov.',
  },
  {
    id: 'criminal',
    icon: 'shield-outline',
    // Only RFE type that keeps a distinct (red) color — it genuinely
    // indicates a more serious problem than the others, which are all teal.
    color: COLORS.error,
    title: 'Criminal History Questions',
    what: 'USCIS has questions about your criminal history — arrests, charges, or convictions disclosed on your application.',
    documents: [
      'Certified court records for every arrest or charge',
      'Disposition records showing how each case was resolved',
      'If dismissed/expunged: court order showing expungement',
      'Personal statement explaining the circumstances',
      'Character reference letters (3–5 from respected community members)',
      'Evidence of rehabilitation (counseling records, community service, employment)',
    ],
    template: `Re: Response to Request for Evidence – [Receipt Number]

Dear USCIS Officer,

I am responding to the RFE regarding my criminal history. I disclose all past interactions with law enforcement as follows:

[Describe each incident briefly and honestly]

As evidenced by the enclosed court records, [case was dismissed / I completed my sentence / I have fully rehabilitated]. I have been a law-abiding member of my community since and present character references from [people] to attest to my good moral character.

Sincerely,
[Your Name]
[Date]`,
    tip: 'NEVER hide or minimize criminal history. Dishonesty on immigration forms is fraud and far worse than the underlying offense. An attorney is strongly recommended for this RFE type.',
  },
  {
    id: 'employment',
    icon: 'briefcase-outline',
    color: '#2A8B7A',
    title: 'Employment History Gaps',
    what: 'USCIS needs clarification about periods where you were not employed or had inconsistent employment history.',
    documents: [
      'Employment verification letters from all employers',
      'W-2s and tax returns for years in question',
      'Explanation letter covering each gap period',
      'If self-employed: business records, bank statements, 1099s',
      'If in school: enrollment verification letters',
      'If caretaker: written explanation with family situation',
    ],
    template: `Re: Response to Request for Evidence – [Receipt Number]

Dear USCIS Officer,

I am writing to clarify my employment history. The periods you have identified as gaps are explained as follows:

[Gap Period 1] – [Reason: e.g., Full-time student at X University]
[Gap Period 2] – [Reason: e.g., Primary caretaker for ill family member]

Enclosed please find supporting documentation for each period. I maintained [lawful immigration status / good moral character] throughout all periods.

Sincerely,
[Your Name]
[Date]`,
    tip: 'Every month must be accounted for. Gaps in employment are normal — just explain them clearly and provide documentation.',
  },
  {
    id: 'travel',
    icon: 'airplane-outline',
    color: '#2A8B7A',
    title: 'Travel History Questions',
    what: 'USCIS is questioning trips outside the U.S. — possibly affecting your continuous residence claim for naturalization.',
    documents: [
      'Passport copies showing all entry/exit stamps',
      'I-94 travel history from cbp.dhs.gov',
      'For trips over 6 months: employer letter confirming you maintained U.S. ties',
      'For N-400: N-470 Application to Preserve Residence (if applicable)',
      'Travel itineraries, hotel receipts, airline tickets',
      'Bank statements showing continued U.S. financial activity during trips',
    ],
    template: `Re: Response to Request for Evidence – [Receipt Number]

Dear USCIS Officer,

I am providing clarification on my travel history as requested. My travel record is as follows:

[List each trip: Country, Departure Date, Return Date, Duration, Purpose]

I maintained my domicile and ties to the United States throughout all absences. Enclosed please find passport copies, I-94 records, and supporting documentation.

Sincerely,
[Your Name]
[Date]`,
    tip: 'For naturalization, trips of 6+ months may interrupt continuous residence. Document all trips carefully and explain your U.S. ties during extended absences.',
  },
  {
    id: 'financial',
    icon: 'cash-outline',
    color: '#2A8B7A',
    title: 'Missing Financial Documents',
    what: 'USCIS needs more evidence of financial support — typically for I-864 Affidavit of Support cases.',
    documents: [
      '3 most recent federal tax returns (IRS transcripts preferred)',
      'W-2s and 1099s for all income sources',
      'Current employer verification letter with salary',
      'Recent pay stubs (last 6 months)',
      'Bank statements (3 months)',
      'If using assets: documentation of liquid assets (stocks, savings)',
      'If using household member income: Form I-864A',
    ],
    template: `Re: Response to Request for Evidence – [Receipt Number]

Dear USCIS Officer,

I am submitting additional financial documentation in support of Form I-864. My current household income is [amount], which exceeds 125% of the federal poverty guideline for a household of [size].

Enclosed: [list documents]

Sincerely,
[Your Name]
[Date]`,
    tip: 'If your income is below 125% of the poverty line, you can use assets or add a joint sponsor who files their own I-864.',
  },
  {
    id: 'biometrics',
    icon: 'finger-print-outline',
    color: '#2A8B7A',
    title: 'Biometrics Issues',
    what: 'Your fingerprints could not be processed or your biometrics appointment was missed.',
    documents: [
      'Contact USCIS at 1-800-375-5283 immediately',
      'Request a new biometrics appointment if missed',
      'If fingerprints could not be taken: letter from ASC stating FD-258 waiver is needed',
    ],
    template: `Re: Response to Request for Evidence – [Receipt Number]

Dear USCIS Officer,

I am writing regarding the biometrics issue identified in your RFE. [I was unable to attend my appointment due to X / My fingerprints could not be captured due to a medical condition].

I have [rescheduled my appointment for DATE / enclosed a medical letter explaining why an alternative identification method should be used].

Sincerely,
[Your Name]
[Date]`,
    tip: 'Call USCIS immediately if you miss a biometrics appointment. Rescheduling is usually allowed but must be done quickly.',
  },
  {
    id: 'address',
    icon: 'home-outline',
    color: '#2A8B7A',
    title: 'Address Inconsistencies',
    what: 'Addresses listed on your forms do not match records or documents are missing for certain address periods.',
    documents: [
      'Utility bills for each address (at least 2 per year)',
      'Bank statements showing address history',
      'Lease or mortgage documents',
      'Tax returns showing address for each year',
      'Government correspondence (USCIS notices, driver license renewals)',
    ],
    template: `Re: Response to Request for Evidence – [Receipt Number]

Dear USCIS Officer,

I am providing documentation of my addresses as follows:

[Date Range] – [Full Address]: [Documents enclosed]
[Date Range] – [Full Address]: [Documents enclosed]

Enclosed documents confirm my continuous lawful residence at these addresses.

Sincerely,
[Your Name]
[Date]`,
    tip: 'For naturalization you must prove continuous residence for 5 years. Keep utility bills and bank statements organized by address.',
  },
];

function RFECard({ rfe, colors, onSpeak, selected, onSelect }) {
  return (
    <TouchableOpacity
      style={[styles.rfeCard, { backgroundColor: colors.card || '#fff', borderColor: selected ? rfe.color : 'transparent', borderWidth: selected ? 2 : 0 }, SHADOWS.small]}
      onPress={() => onSelect(selected ? null : rfe.id)}
      activeOpacity={0.85}
    >
      <View style={[styles.rfeIcon, { backgroundColor: rfe.color + '18' }]}>
        <Ionicons name={rfe.icon} size={22} color={rfe.color} />
      </View>
      <Text style={[styles.rfeTitle, { color: colors.text }]} numberOfLines={2}>{rfe.title}</Text>
      <Ionicons name={selected ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

function RFEDetail({ rfe, colors, onSpeak }) {
  const [showTemplate, setShowTemplate] = useState(false);

  const copyTemplate = () => {
    Share.share({ message: rfe.template, title: 'RFE Response Template' });
  };

  return (
    <View style={[styles.detailCard, { backgroundColor: colors.card || '#fff' }, SHADOWS.medium]}>
      <LinearGradient colors={[rfe.color, rfe.color + 'cc']} style={styles.detailHeader} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <Text style={styles.detailTitle}>{rfe.title}</Text>
      </LinearGradient>

      <View style={styles.detailBody}>
        {/* What USCIS is asking */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: rfe.color }]}>WHAT USCIS IS ASKING</Text>
          <Text style={[styles.bodyText, { color: colors.text }]}>{rfe.what}</Text>
        </View>

        {/* Deadline warning */}
        <View style={[styles.deadlineBox, { backgroundColor: '#fff3e0' }]}>
          <Ionicons name="warning-outline" size={18} color="#e65100" />
          <View style={{ flex: 1 }}>
            <Text style={styles.deadlineTitle}>87-Day Response Deadline</Text>
            <Text style={styles.deadlineText}>You have 87 days from the RFE date to respond. Missing this deadline will result in denial. Mark your calendar TODAY.</Text>
          </View>
        </View>

        {/* Documents to gather */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: rfe.color }]}>DOCUMENTS TO GATHER</Text>
          {rfe.documents.map((doc, i) => (
            <View key={i} style={styles.docRow}>
              <View style={[styles.docDot, { backgroundColor: rfe.color }]} />
              <Text style={[styles.docText, { color: colors.text }]}>{doc}</Text>
            </View>
          ))}
        </View>

        {/* Pro tip */}
        <View style={[styles.tipBox, { backgroundColor: rfe.color + '12' }]}>
          <Ionicons name="bulb-outline" size={16} color={rfe.color} />
          <Text style={[styles.tipText, { color: rfe.color }]}>{rfe.tip}</Text>
        </View>

        {/* Cover letter template */}
        <TouchableOpacity style={[styles.templateToggle, { borderColor: rfe.color + '40' }]} onPress={() => setShowTemplate(!showTemplate)}>
          <Ionicons name="document-text-outline" size={18} color={rfe.color} />
          <Text style={[styles.templateToggleText, { color: rfe.color }]}>{showTemplate ? 'Hide Template' : 'Show Cover Letter Template'}</Text>
          <Ionicons name={showTemplate ? 'chevron-up' : 'chevron-down'} size={16} color={rfe.color} />
        </TouchableOpacity>

        {showTemplate && (
          <View style={styles.templateWrap}>
            <Text style={[styles.templateText, { color: colors.text }]}>{rfe.template}</Text>
            <TouchableOpacity style={[styles.copyBtn, { backgroundColor: rfe.color }]} onPress={copyTemplate}>
              <Ionicons name="share-outline" size={16} color="#fff" />
              <Text style={styles.copyBtnText}>Share Template</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Attorney warning */}
        <View style={[styles.attorneyBox, { backgroundColor: '#fce4ec' }]}>
          <Ionicons name="information-circle-outline" size={18} color="#c62828" />
          <Text style={[styles.attorneyText, { color: '#c62828' }]}>
            An immigration attorney should review your RFE response before submitting. A denial is much harder to appeal than getting the response right the first time.
          </Text>
        </View>

        {/* Read aloud */}
        <TouchableOpacity style={[styles.speakBtn, { borderColor: rfe.color + '40' }]} onPress={() => onSpeak(`${rfe.title}. ${rfe.what}. Documents needed: ${rfe.documents.join(', ')}.`)}>
          <Ionicons name="volume-high-outline" size={16} color={rfe.color} />
          <Text style={[styles.speakText, { color: rfe.color }]}>Read Aloud</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function RFEScreen() {
  const { colors } = useTheme();
  const { speak } = useSpeech();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState(null);

  const selectedRFE = RFE_TYPES.find((r) => r.id === selected);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Intro */}
      <LinearGradient colors={['#c62828', '#e53935']} style={styles.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Ionicons name="warning" size={32} color="#fff" />
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>RFE Response Guide</Text>
          <Text style={styles.heroSub}>Request for Evidence — step-by-step response help</Text>
        </View>
      </LinearGradient>

      <View style={[styles.introCard, { backgroundColor: '#fff8e1' }]}>
        <Text style={[styles.introText, { color: '#7c5c00' }]}>
          An RFE is NOT a denial — it is USCIS asking for more information. Select your RFE type below for a complete response guide. You have 87 days from the RFE date to respond.
        </Text>
      </View>

      <DisclaimerBanner />

      {/* RFE type list */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SELECT YOUR RFE TYPE</Text>
      {RFE_TYPES.map((rfe) => (
        <View key={rfe.id}>
          <RFECard rfe={rfe} colors={colors} onSpeak={speak} selected={selected === rfe.id} onSelect={setSelected} />
          {selected === rfe.id && selectedRFE && (
            <RFEDetail rfe={selectedRFE} colors={colors} onSpeak={speak} />
          )}
        </View>
      ))}

      <TouchableOpacity style={styles.uscisBtn} onPress={() => Linking.openURL('https://www.uscis.gov/rfe')}>
        <Ionicons name="open-outline" size={16} color="#fff" />
        <Text style={styles.uscisBtnText}>USCIS RFE Information</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content:   { padding: 16, gap: 10 },

  hero:     { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 20, padding: 20, marginBottom: 4 },
  heroTitle:{ fontSize: TYPOGRAPHY.subheadingSize, fontWeight: TYPOGRAPHY.subheadingWeight, lineHeight: TYPOGRAPHY.subheadingLineHeight, color: '#fff' },
  heroSub:  { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  introCard: { borderRadius: 16, padding: 14 },
  introText: { fontSize: 14, lineHeight: 21 },

  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginLeft: 4, marginTop: 4 },

  rfeCard:  { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, gap: 12 },
  rfeIcon:  { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  rfeTitle: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 20 },

  detailCard:   { borderRadius: 20, overflow: 'hidden', marginBottom: 4 },
  detailHeader: { padding: 16 },
  detailTitle:  { fontSize: 17, fontWeight: '800', color: '#fff', lineHeight: 24 },
  detailBody:   { padding: 16, gap: 16 },

  section:      { gap: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  bodyText:     { fontSize: 14, lineHeight: 22 },

  deadlineBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 14, padding: 14 },
  deadlineTitle:{ fontSize: 14, fontWeight: '800', color: '#e65100', marginBottom: 4 },
  deadlineText: { fontSize: 13, color: '#7c3c00', lineHeight: 19 },

  docRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  docDot:  { width: 6, height: 6, borderRadius: 3, marginTop: 8, flexShrink: 0 },
  docText: { flex: 1, fontSize: 14, lineHeight: 21 },

  tipBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 12, padding: 12 },
  tipText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '500' },

  templateToggle:     { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 14, padding: 12 },
  templateToggleText: { flex: 1, fontSize: 14, fontWeight: '600' },
  templateWrap:       { gap: 12 },
  templateText:       { fontSize: 13, lineHeight: 22, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  copyBtn:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 12 },
  copyBtnText:        { color: '#fff', fontWeight: '700', fontSize: 14 },

  attorneyBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 14, padding: 14 },
  attorneyText: { flex: 1, fontSize: 13, lineHeight: 19 },

  speakBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  speakText: { fontSize: 13, fontWeight: '600' },

  uscisBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#c62828', borderRadius: 16, paddingVertical: 14, marginTop: 8 },
  uscisBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

