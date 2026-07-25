import React, { useState } from 'react';
import { Text, Modal, View, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../i18n';
import { splitWithGlossaryTerms, getGlossaryTerm } from '../lib/glossaryAliases';

const LANG_MAP = { en: 'en', es: 'es', ht: 'ht' };

// Renders `children` (a plain string) with recognized immigration jargon
// (EAD, I-485, RFE, "Adjustment of Status", ...) tappable — tapping shows a
// plain-language definition sourced from the existing glossary content
// without leaving the screen. Unrecognized text renders exactly as before.
export default function GlossaryText({ children, style, ...rest }) {
  const { lang } = useLanguage();
  const [active, setActive] = useState(null);
  const l = LANG_MAP[lang] || 'en';

  if (typeof children !== 'string') return <Text style={style} {...rest}>{children}</Text>;

  const segments = splitWithGlossaryTerms(children);
  const activeTerm = active ? getGlossaryTerm(active) : null;
  const displayTerm = activeTerm
    ? (l === 'es' ? (activeTerm.termEs || activeTerm.term) : l === 'ht' ? (activeTerm.termHt || activeTerm.term) : activeTerm.term)
    : '';
  const definition = activeTerm ? (activeTerm.definition?.[l] || activeTerm.definition?.en || '') : '';

  return (
    <>
      <Text style={style} {...rest}>
        {segments.map((seg, i) =>
          seg.termId ? (
            <Text key={i} style={styles.term} onPress={() => setActive(seg.termId)}>
              {seg.text}
            </Text>
          ) : (
            <Text key={i}>{seg.text}</Text>
          )
        )}
      </Text>

      <Modal visible={!!active} transparent animationType="fade" onRequestClose={() => setActive(null)}>
        <Pressable style={styles.backdrop} onPress={() => setActive(null)}>
          <Pressable style={styles.card} onPress={() => {}}>
            <View style={styles.cardHeader}>
              <Ionicons name={activeTerm?.icon || 'information-circle-outline'} size={20} color="#2A8B7A" />
              <Text style={styles.cardTitle}>{displayTerm}</Text>
              <TouchableOpacity onPress={() => setActive(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={20} color="#999" />
              </TouchableOpacity>
            </View>
            <Text style={styles.cardDef}>{definition}</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  term: { textDecorationLine: 'underline', textDecorationStyle: 'dotted', fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '900', color: '#1A1A2E' },
  cardDef: { fontSize: 14, color: '#333', lineHeight: 21 },
});
