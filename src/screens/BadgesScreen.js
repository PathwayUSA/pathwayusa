import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { BADGE_DEFS, hasBadge } from '../lib/badges';
import { SHADOWS, TYPOGRAPHY } from '../theme';

function makeStyles(colors) {
  return StyleSheet.create({
    safe:        { flex: 1, backgroundColor: colors.primary },
    container:   { flex: 1, backgroundColor: colors.background },
    header:      { backgroundColor: colors.primary, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 },
    headerTitle: { fontFamily: TYPOGRAPHY.displayFamily, fontSize: TYPOGRAPHY.displaySize, letterSpacing: TYPOGRAPHY.displayLetterSpacing, color: '#fff', lineHeight: TYPOGRAPHY.displayLineHeight },
    headerSub:   { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
    progress:    { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '700', marginTop: 10 },

    content:     { padding: 16, paddingBottom: 60 },
    grid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    badgeCard:   { width: '47%', backgroundColor: '#fff', borderRadius: 18, padding: 16, alignItems: 'center', gap: 8, ...SHADOWS.small },
    badgeCardLocked: { opacity: 0.45 },
    iconWrap:    { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    badgeName:   { fontSize: 13, fontWeight: '800', color: '#1a1a2e', textAlign: 'center' },
    badgeDesc:   { fontSize: 11, color: '#888', textAlign: 'center', lineHeight: 15 },
    earnedPill:  { backgroundColor: '#e8f5e9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    earnedTxt:   { fontSize: 10, fontWeight: '700', color: '#2e7d32' },
    lockedPill:  { backgroundColor: '#f5f5f5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    lockedTxt:   { fontSize: 10, fontWeight: '600', color: '#aaa' },
  });
}

export default function BadgesScreen() {
  const { colors }     = useTheme();
  const { user }       = useAuth();
  const styles         = useMemo(() => makeStyles(colors), [colors]);
  const [badges, setBadges] = useState([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('badges')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => { if (data?.badges) setBadges(data.badges); });
  }, [user]);

  const earned = BADGE_DEFS.filter((b) => hasBadge(badges, b.id)).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Badges</Text>
          <Text style={styles.headerSub}>Achievements earned on your journey</Text>
          <Text style={styles.progress}>{earned} / {BADGE_DEFS.length} earned</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            {BADGE_DEFS.map((badge) => {
              const unlocked = hasBadge(badges, badge.id);
              return (
                <View key={badge.id} style={[styles.badgeCard, !unlocked && styles.badgeCardLocked]}>
                  <View style={[styles.iconWrap, { backgroundColor: badge.color + '20' }]}>
                    <Ionicons
                      name={unlocked ? badge.icon.replace('-outline', '') : badge.icon}
                      size={28}
                      color={unlocked ? badge.color : '#bbb'}
                    />
                  </View>
                  <Text style={styles.badgeName}>{badge.name}</Text>
                  <Text style={styles.badgeDesc}>{badge.desc}</Text>
                  {unlocked ? (
                    <View style={styles.earnedPill}>
                      <Text style={styles.earnedTxt}>EARNED</Text>
                    </View>
                  ) : (
                    <View style={styles.lockedPill}>
                      <Text style={styles.lockedTxt}>LOCKED</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
