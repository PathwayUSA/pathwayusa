import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { SHADOWS } from '../theme';

const CAT_THEME = {
  'USCIS Updates':  { bg: '#e3f2fd', color: '#1565c0', icon: 'document-text-outline' },
  'Policy Changes': { bg: '#fce4ec', color: '#c62828', icon: 'shield-checkmark-outline' },
  'Community News': { bg: '#e8f5e9', color: '#2e7d32', icon: 'people-outline' },
  'Legal Aid':      { bg: '#f3e5f5', color: '#6a1b9a', icon: 'briefcase-outline' },
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function makeStyles(colors) {
  return StyleSheet.create({
    container:   { flex: 1, backgroundColor: colors.background },
    content:     { padding: 20, paddingBottom: 60 },

    catRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
    catBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    catText:  { fontSize: 12, fontWeight: '700' },
    dateText: { fontSize: 13, color: colors.textSecondary },

    title:   { fontSize: 22, fontWeight: '900', color: colors.text, lineHeight: 31, marginBottom: 20 },
    divider: { height: 1, backgroundColor: colors.border, marginBottom: 18 },

    sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 18 },
    sourceText:{ fontSize: 12, color: colors.textSecondary, fontWeight: '500' },

    summaryLabel: {
      fontSize: 11, fontWeight: '700', color: colors.textSecondary,
      letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 10,
    },
    summary: { fontSize: 15, color: colors.text, lineHeight: 25 },

    readBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, backgroundColor: colors.primary, borderRadius: 14,
      paddingVertical: 15, marginTop: 30, ...SHADOWS.small,
    },
    readBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

    disclaimer: { fontSize: 11, color: colors.textSecondary, textAlign: 'center', marginTop: 12, lineHeight: 16 },

    infoCard: {
      backgroundColor: '#fff', borderRadius: 14, padding: 16, marginTop: 20,
      flexDirection: 'row', alignItems: 'center', gap: 12, ...SHADOWS.small,
    },
    infoText: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 19 },
  });
}

export default function NewsDetailScreen({ route }) {
  const { article } = route.params ?? {};
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (!article) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="document-outline" size={48} color="#ddd" />
        <Text style={{ marginTop: 10, color: '#aaa' }}>Article not found.</Text>
      </View>
    );
  }

  const cat = CAT_THEME[article.category] ?? CAT_THEME['USCIS Updates'];

  const openArticle = () => {
    const url = article.url;
    if (!url) return Alert.alert('No link', 'No external link available for this article.');
    Linking.canOpenURL(url)
      .then((ok) => {
        if (ok) return Linking.openURL(url);
        Alert.alert('Cannot open link', 'Unable to open this article in the browser.');
      })
      .catch(() => Alert.alert('Error', 'Could not open the link.'));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.catRow}>
        <View style={[styles.catBadge, { backgroundColor: cat.bg }]}>
          <Ionicons name={cat.icon} size={13} color={cat.color} />
          <Text style={[styles.catText, { color: cat.color }]}>{article.category}</Text>
        </View>
        {article.date && <Text style={styles.dateText}>{formatDate(article.date)}</Text>}
      </View>

      <Text style={styles.title}>{article.title}</Text>
      <View style={styles.divider} />

      {article.source && (
        <View style={styles.sourceRow}>
          <Ionicons name="globe-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.sourceText}>Source: {article.source}</Text>
        </View>
      )}

      <Text style={styles.summaryLabel}>Summary</Text>
      <Text style={styles.summary}>{article.summary || 'No summary available for this article.'}</Text>

      {article.url && (
        <TouchableOpacity style={styles.readBtn} onPress={openArticle} activeOpacity={0.85}>
          <Text style={styles.readBtnText}>Read Full Article</Text>
          <Ionicons name="open-outline" size={18} color="#fff" />
        </TouchableOpacity>
      )}

      <View style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
        <Text style={styles.infoText}>
          Immigration laws change frequently. Always verify information with a licensed attorney or official USCIS sources.
        </Text>
      </View>

      <Text style={styles.disclaimer}>
        PathwayUSA aggregates public immigration news for informational purposes. This is not legal advice.
      </Text>
    </ScrollView>
  );
}
