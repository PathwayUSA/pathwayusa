import React, { useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SHADOWS, TYPOGRAPHY } from '../theme';

// Know Your Rights card — hardcoded offline text in 3 languages
const KYR = {
  en: {
    title: 'Know Your Rights — ICE Encounters',
    sections: [
      {
        heading: 'You have the right to remain silent.',
        body: 'You do not have to answer questions about where you were born, how you entered the U.S., or your immigration status. Politely say: "I am exercising my right to remain silent."',
      },
      {
        heading: 'You do not have to open the door.',
        body: 'If ICE comes to your home, you do not have to open the door unless they have a judicial warrant signed by a judge. Ask them to slide it under the door. A deportation order is NOT a judicial warrant.',
      },
      {
        heading: 'Do not sign anything.',
        body: 'Do not sign any documents without speaking to an attorney. Signing may waive important rights.',
      },
      {
        heading: 'You have the right to an attorney.',
        body: 'If you are detained, say clearly: "I want to speak to a lawyer." You have the right to call a lawyer or a family member.',
      },
      {
        heading: 'Stay calm.',
        body: 'Do not run, resist, or obstruct. Keep your hands visible. Memorize an attorney\'s phone number in case your phone is taken.',
      },
    ],
  },
  es: {
    title: 'Conozca Sus Derechos — Encuentros con ICE',
    sections: [
      {
        heading: 'Tiene derecho a guardar silencio.',
        body: 'No tiene que responder preguntas sobre dónde nació, cómo entró a los EE. UU. o su estado migratorio. Diga cortésmente: "Estoy ejerciendo mi derecho a guardar silencio."',
      },
      {
        heading: 'No tiene que abrir la puerta.',
        body: 'Si ICE viene a su casa, no tiene que abrir la puerta a menos que tengan una orden judicial firmada por un juez. Pídalos que la deslicen por debajo de la puerta. Una orden de deportación NO es una orden judicial.',
      },
      {
        heading: 'No firme nada.',
        body: 'No firme ningún documento sin hablar con un abogado. Firmar puede renunciar a derechos importantes.',
      },
      {
        heading: 'Tiene derecho a un abogado.',
        body: 'Si le detienen, diga claramente: "Quiero hablar con un abogado." Tiene derecho a llamar a un abogado o a un familiar.',
      },
      {
        heading: 'Mantenga la calma.',
        body: 'No corra, no resista ni obstruya. Mantenga las manos visibles. Memorice el número de teléfono de un abogado por si le quitan su teléfono.',
      },
    ],
  },
  ht: {
    title: 'Konnen Dwa Ou — Rankontre ak ICE',
    sections: [
      {
        heading: 'Ou gen dwa pou rete silans.',
        body: 'Ou pa oblije reponn kesyon sou kote ou te fèt, kijan ou te antre nan Etazini, oswa estati imigrasyon ou. Di avèk poli: "Mwen ap egzèse dwa mwen pou rete silans."',
      },
      {
        heading: 'Ou pa oblije ouvri pòt la.',
        body: 'Si ICE vini kay ou, ou pa oblije ouvri pòt la sof si yo gen yon manda jidisyè siyen pa yon jij. Mande yo pou yo glise li anba pòt la. Yon lòd depòtasyon se PA yon manda jidisyè.',
      },
      {
        heading: 'Pa siyen anyen.',
        body: 'Pa siyen okenn dokiman san pale ak yon avoka. Siyen ka fè ou pèdi dwa enpòtan.',
      },
      {
        heading: 'Ou gen dwa pou yon avoka.',
        body: 'Si yo arete ou, di klèman: "Mwen vle pale ak yon avoka." Ou gen dwa pou rele yon avoka oswa yon manm fanmi.',
      },
      {
        heading: 'Rete kalm.',
        body: 'Pa kouri, reziste, oswa bloke. Kenbe men ou vizib. Memorize nimewo telefòn yon avoka au cas telefonw ta pran.',
      },
    ],
  },
};

function KnowYourRightsCard({ lang, onClose }) {
  const content = KYR[lang] ?? KYR.en;
  return (
    <View style={styles.kyrContainer}>
      <View style={styles.kyrHeader}>
        <Ionicons name="shield-checkmark" size={22} color="#fff" />
        <Text style={styles.kyrTitle}>{content.title}</Text>
        <TouchableOpacity onPress={onClose} style={{ padding: 2 }}>
          <Ionicons name="close" size={22} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.kyrScroll} showsVerticalScrollIndicator={false}>
        {content.sections.map((s, i) => (
          <View key={i} style={styles.kyrSection}>
            <Text style={styles.kyrHeading}>{`${i + 1}. ${s.heading}`}</Text>
            <Text style={styles.kyrBody}>{s.body}</Text>
          </View>
        ))}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

export default function EmergencyModal({ visible, onClose, lang = 'en' }) {
  const [showKYR, setShowKYR] = useState(false);

  const call = (number) => Linking.openURL(`tel:${number}`);
  const openMaps = () => Linking.openURL('https://maps.google.com/?q=immigration+attorney+near+me');

  const ACTIONS = [
    {
      icon: 'call',
      label: 'Call USCIS',
      sub: '1-800-375-5283',
      color: '#1976d2',
      bg: '#e3f2fd',
      onPress: () => call('18003755283'),
    },
    {
      icon: 'call',
      label: 'Call Immigration Legal Aid',
      sub: '1-800-354-0365',
      color: '#388e3c',
      bg: '#e8f5e9',
      onPress: () => call('18003540365'),
    },
    {
      icon: 'navigate',
      label: 'Find Emergency Legal Help Near Me',
      sub: 'Opens Google Maps',
      color: '#f57c00',
      bg: '#fff3e0',
      onPress: openMaps,
    },
    {
      icon: 'shield-checkmark',
      label: 'ICE Raid — Know Your Rights',
      sub: 'Read plain-language rights card',
      color: '#0F2A3D',
      bg: '#E8EDF0',
      onPress: () => setShowKYR(true),
    },
    {
      icon: 'alert-circle',
      label: 'Call 911',
      sub: 'For physical safety emergencies only',
      color: '#c62828',
      bg: '#ffebee',
      onPress: () => {
        call('911');
      },
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {showKYR ? (
            <KnowYourRightsCard lang={lang} onClose={() => setShowKYR(false)} />
          ) : (
            <>
              <View style={styles.sheetHeader}>
                <View style={styles.headerLeft}>
                  <View style={styles.redDot} />
                  <Text style={styles.sheetTitle}>Need Immediate Help?</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={22} color="#666" />
                </TouchableOpacity>
              </View>
              <Text style={styles.sheetSub}>
                Tap any option below. All contacts are free and confidential.
              </Text>

              {ACTIONS.map((a) => (
                <TouchableOpacity
                  key={a.label}
                  style={[styles.actionRow, { backgroundColor: a.bg }]}
                  onPress={a.onPress}
                  activeOpacity={0.82}
                >
                  <View style={[styles.actionIcon, { backgroundColor: a.color + '22' }]}>
                    <Ionicons name={a.icon} size={22} color={a.color} />
                  </View>
                  <View style={styles.actionText}>
                    <Text style={[styles.actionLabel, { color: a.color }]}>{a.label}</Text>
                    <Text style={styles.actionSub}>{a.sub}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={a.color} />
                </TouchableOpacity>
              ))}

              <Text style={styles.disclaimer}>
                PathwayUSA is not a law firm. This is not legal advice. In immediate physical danger, always call 911 first.
              </Text>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

export function EmergencyFAB({ lang, color = '#d32f2f' }) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: color }]}
        onPress={() => setVisible(true)}
        activeOpacity={0.88}
      >
        <Ionicons name="alert-circle" size={22} color="#fff" />
        <Text style={styles.fabLabel}>Help</Text>
      </TouchableOpacity>
      <EmergencyModal visible={visible} onClose={() => setVisible(false)} lang={lang} />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    padding: 22, paddingBottom: 36,
    maxHeight: '92%',
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  redDot:      { width: 12, height: 12, borderRadius: 6, backgroundColor: '#d32f2f' },
  sheetTitle:  { fontFamily: TYPOGRAPHY.headingFamily, fontSize: TYPOGRAPHY.headingSize, lineHeight: TYPOGRAPHY.headingLineHeight, color: '#1a1a1a' },
  closeBtn:    { padding: 4 },
  sheetSub:    { fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 19 },

  actionRow:   {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, padding: 14, marginBottom: 10,
  },
  actionIcon:  { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  actionText:  { flex: 1 },
  actionLabel: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  actionSub:   { fontSize: 12, color: '#888' },

  disclaimer: { fontSize: 11, color: '#aaa', textAlign: 'center', lineHeight: 16, marginTop: 8 },

  fab: {
    position: 'absolute', left: 18, bottom: 86,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 28, ...SHADOWS.medium,
  },
  fabLabel: { fontSize: 13, fontWeight: '800', color: '#fff' },

  kyrContainer: { flex: 1, maxHeight: 520 },
  kyrHeader:    {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#0F2A3D',
    borderRadius: 14, padding: 14, marginBottom: 14,
  },
  kyrTitle:   { flex: 1, fontSize: 14, fontWeight: '800', color: '#fff', lineHeight: 19 },
  kyrScroll:  { flex: 1 },
  kyrSection: { marginBottom: 16 },
  kyrHeading: { fontSize: 14, fontWeight: '800', color: '#1a1a1a', marginBottom: 5, lineHeight: 20 },
  kyrBody:    { fontSize: 13, color: '#444', lineHeight: 20 },
});
