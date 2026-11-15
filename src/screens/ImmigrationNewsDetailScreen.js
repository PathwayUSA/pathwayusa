import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Modal, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SHADOWS, TYPOGRAPHY } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { lightHaptic, successHaptic } from '../utils/haptics';
import { formatDate, mayAffect, reportNews, SOURCE_LABEL } from '../lib/news';
import { KindPill, MayAffectTag } from '../components/NewsHomeCard';
import { useNewsUserCtx } from './ImmigrationNewsScreen';
import YouTubeVideo from '../components/YouTubeVideo';

function Section({ icon, title, children, colors }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHdr}>
        <Ionicons name={icon} size={18} color={colors.primary} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export default function ImmigrationNewsDetailScreen({ route, navigation }) {
  const item = route.params?.item;
  const { colors } = useTheme();
  const { user } = useAuth();
  const ctx = useNewsUserCtx();
  const insets = useSafeAreaInsets();
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);
  const [reported, setReported] = useState(false);

  if (!item) return null;

  const open = (url) => { lightHaptic(); Linking.openURL(url).catch(() => {}); };

  const sendReport = async () => {
    setSending(true);
    await reportNews(item.id, user?.id, reason.trim());
    setSending(false); setReportOpen(false); setReported(true); successHaptic();
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40, gap: 14 }}>
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        <KindPill kind={item.kind} />
        {mayAffect(item, ctx) && <MayAffectTag />}
      </View>
      <Text style={styles.headline}>{item.headline}</Text>
      <Text style={styles.dates}>
        Published {formatDate(item.published_at)}
        {item.effective_date ? ` · Takes effect ${formatDate(item.effective_date + 'T12:00:00')}` : ''}
      </Text>

      {item.video?.youtube_id ? (
        <YouTubeVideo videoId={item.video.youtube_id} title={item.video.title} lang={item.video.lang} colors={colors} />
      ) : null}

      {item.deadline && (
        <View style={[styles.deadline]}>
          <Ionicons name="alarm" size={20} color="#B42318" />
          <Text style={styles.deadlineTxt}>Date in the official notice: {formatDate(item.deadline + 'T12:00:00')}</Text>
        </View>
      )}

      <Section icon="document-text" title="What happened" colors={colors}>
        <Text style={styles.body}>{item.summary}</Text>
      </Section>

      {item.who_affected ? (
        <Section icon="people" title="Who this may affect" colors={colors}>
          <Text style={styles.body}>{item.who_affected}</Text>
        </Section>
      ) : null}

      {item.examples?.length > 0 && (
        <Section icon="bulb" title="Examples" colors={colors}>
          <Text style={styles.note}>These are made-up people to show how the change could work. Every case is different.</Text>
          {item.examples.map((e, i) => (
            <View key={i} style={[styles.example, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.exampleTitle, { color: colors.primaryDark }]}>{e.title}</Text>
              <Text style={styles.body}>{e.text}</Text>
            </View>
          ))}
        </Section>
      )}

      {item.questions?.length > 0 && (
        <Section icon="help-circle" title="Questions to think about" colors={colors}>
          {item.questions.map((q, i) => (
            <View key={i} style={styles.qRow}>
              <View style={[styles.qDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.body, { flex: 1 }]}>{q}</Text>
            </View>
          ))}
        </Section>
      )}

      <Section icon="shield-checkmark" title="Read the official source" colors={colors}>
        <TouchableOpacity style={[styles.linkBtn, { backgroundColor: colors.primary }]} onPress={() => open(item.source_url)} activeOpacity={0.85} accessibilityRole="link">
          <Ionicons name="open-outline" size={18} color="#fff" />
          <Text style={styles.linkBtnTxt}>Open on {SOURCE_LABEL[item.source] ?? 'official site'}</Text>
        </TouchableOpacity>
        {item.video_url ? (
          <TouchableOpacity style={[styles.linkBtnAlt, { borderColor: colors.primary }]} onPress={() => open(item.video_url)} activeOpacity={0.85} accessibilityRole="link">
            <Ionicons name="logo-youtube" size={18} color={colors.primary} />
            <Text style={[styles.linkBtnAltTxt, { color: colors.primary }]}>Watch the official video</Text>
          </TouchableOpacity>
        ) : null}
        <Text style={styles.official}>Official title: {item.source_title}</Text>
      </Section>

      <TouchableOpacity style={styles.helpRow} onPress={() => navigation.navigate('AppMain', { screen: 'Resources' })} activeOpacity={0.85}>
        <Ionicons name="briefcase" size={20} color="#1565C0" />
        <View style={{ flex: 1 }}>
          <Text style={styles.helpTitle}>Not sure how this applies to you?</Text>
          <Text style={styles.helpSub}>Free legal aid and licensed attorneys can look at your exact case.</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#9AA0A6" />
      </TouchableOpacity>

      <Text style={styles.fine}>
        Summary written by PathwayUSA from the official release, to help you understand it. It is general information, not legal advice. Rules can change. Always check the official source.
      </Text>

      {reported ? (
        <Text style={[styles.fine, { color: '#067647', fontWeight: '700' }]}>Thanks — we'll check this update.</Text>
      ) : (
        <TouchableOpacity onPress={() => setReportOpen(true)} style={{ alignSelf: 'center', padding: 8 }} accessibilityRole="button">
          <Text style={styles.report}>Something wrong with this update?</Text>
        </TouchableOpacity>
      )}

      <Modal visible={reportOpen} transparent animationType="fade" onRequestClose={() => setReportOpen(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>What looks wrong?</Text>
            <TextInput
              style={styles.input}
              value={reason}
              onChangeText={setReason}
              placeholder="Optional — tell us what's wrong"
              placeholderTextColor="#9AA0A6"
              multiline
              maxLength={500}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#F0F1F3' }]} onPress={() => setReportOpen(false)}>
                <Text style={[styles.modalBtnTxt, { color: '#3D4A4C' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={sendReport} disabled={sending}>
                {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnTxt}>Send</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headline:     { fontFamily: TYPOGRAPHY.displayFamily, fontSize: 26, color: '#1A1A2E', lineHeight: 31 },
  dates:        { fontSize: 13, color: '#7F8C8D' },
  deadline:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FEF3F2', borderRadius: 14, padding: 14 },
  deadlineTxt:  { flex: 1, fontSize: 15, fontWeight: '800', color: '#912018' },
  section:      { backgroundColor: '#fff', borderRadius: 20, padding: 16, gap: 10, ...SHADOWS.small },
  sectionHdr:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontFamily: TYPOGRAPHY.headingFamily, fontSize: 17, color: '#1A1A2E' },
  body:         { fontSize: 15.5, color: '#2E3A3C', lineHeight: 23 },
  note:         { fontSize: 13, color: '#7F8C8D', lineHeight: 18 },
  example:      { borderRadius: 14, padding: 14, gap: 4 },
  exampleTitle: { fontSize: 14, fontWeight: '900' },
  qRow:         { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  qDot:         { width: 8, height: 8, borderRadius: 4, marginTop: 8 },
  linkBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, height: 50 },
  linkBtnTxt:   { fontSize: 16, fontWeight: '900', color: '#fff' },
  linkBtnAlt:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, height: 48, borderWidth: 1.5 },
  linkBtnAltTxt:{ fontSize: 15, fontWeight: '800' },
  official:     { fontSize: 12.5, color: '#7F8C8D', lineHeight: 18 },
  helpRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#E3F2FD', borderRadius: 18, padding: 16 },
  helpTitle:    { fontSize: 15, fontWeight: '900', color: '#0D47A1' },
  helpSub:      { fontSize: 13, color: '#1565C0', marginTop: 2, lineHeight: 18 },
  fine:         { fontSize: 12, color: '#7F8C8D', lineHeight: 17, textAlign: 'center' },
  report:       { fontSize: 13, fontWeight: '700', color: '#7F8C8D', textDecorationLine: 'underline' },
  modalBg:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modal:        { backgroundColor: '#fff', borderRadius: 20, padding: 20, gap: 14 },
  modalTitle:   { fontFamily: TYPOGRAPHY.headingFamily, fontSize: 19, color: '#1A1A2E' },
  input:        { minHeight: 90, borderWidth: 1.5, borderColor: '#DADDE0', borderRadius: 12, padding: 12, fontSize: 15, textAlignVertical: 'top', color: '#1A1A2E' },
  modalBtn:     { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalBtnTxt:  { fontSize: 16, fontWeight: '800', color: '#fff' },
});
