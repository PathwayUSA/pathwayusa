import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Share, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { SHADOWS } from '../theme';
import { awardBadge } from '../lib/badges';

function makeStyles(colors) {
  return StyleSheet.create({
    safe:        { flex: 1, backgroundColor: colors.primary },
    container:   { flex: 1, backgroundColor: colors.background },
    header:      { backgroundColor: colors.primary, padding: 20, paddingTop: 20, gap: 6 },
    headerTitle: { fontSize: 24, fontWeight: '900', color: '#fff' },
    headerSub:   { fontSize: 14, color: 'rgba(255,255,255,0.75)' },
    content:     { padding: 20, gap: 16, paddingBottom: 60 },
    section:     { backgroundColor: '#fff', borderRadius: 20, padding: 18, gap: 14, ...SHADOWS.small },
    sectionTitle:{ fontSize: 16, fontWeight: '800', color: '#1a1a2e' },
    sectionSub:  { fontSize: 13, color: '#666', lineHeight: 19 },

    rewardRow:   { gap: 10 },
    rewardCard:  { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f8f8f8', borderRadius: 14, padding: 14 },
    rewardIcon:  { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    rewardName:  { fontSize: 14, fontWeight: '700', color: '#1a1a2e' },
    rewardDesc:  { fontSize: 12, color: '#666', marginTop: 2 },

    codeWrap:    { backgroundColor: colors.background, borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', gap: 8 },
    codeLabel:   { fontSize: 11, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
    code:        { fontSize: 28, fontWeight: '900', color: colors.primary, letterSpacing: 4 },
    shareBtn:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, justifyContent: 'center' },
    shareTxt:    { color: '#fff', fontWeight: '800', fontSize: 15 },

    statRow:     { flexDirection: 'row', gap: 10 },
    statCard:    { flex: 1, backgroundColor: colors.background, borderRadius: 14, padding: 14, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#e8e8e8' },
    statNum:     { fontSize: 28, fontWeight: '900', color: colors.primary },
    statLabel:   { fontSize: 12, color: '#888', textAlign: 'center' },

    leaderCard:  { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    leaderRank:  { fontSize: 16, fontWeight: '900', color: '#888', width: 28 },
    leaderName:  { flex: 1, fontSize: 14, fontWeight: '600', color: '#1a1a2e' },
    leaderCount: { fontSize: 14, fontWeight: '700', color: colors.primary },

    comingSoon:  { fontSize: 12, color: '#aaa', textAlign: 'center', fontStyle: 'italic', paddingVertical: 8 },
  });
}

const RANK_EMOJIS = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function ReferralScreen() {
  const { colors }  = useTheme();
  const { user, profile } = useAuth();
  const styles      = useMemo(() => makeStyles(colors), [colors]);
  const [referralCode, setReferralCode] = useState('');
  const [stats, setStats]               = useState({ invited: 0, joined: 0 });
  const [leaderboard, setLeaderboard]   = useState([]);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('referral_code, referral_count').eq('id', user.id).maybeSingle().then(({ data }) => {
      if (data?.referral_code) {
        setReferralCode(data.referral_code);
      } else {
        // Auto-generate referral code if none exists
        const code = (profile?.full_name?.split(' ')[0]?.toUpperCase() ?? 'PATH') + Math.random().toString(36).substr(2, 4).toUpperCase();
        supabase.from('profiles').update({ referral_code: code }).eq('id', user.id);
        setReferralCode(code);
      }
    });

    supabase.rpc('get_my_referral_stats').then(({ data }) => {
      const row = data?.[0];
      if (!row) return;
      setStats({ invited: row.invited ?? 0, joined: row.joined ?? 0 });
      // Auto-award Community Champion badge at 5+ referrals
      if ((row.invited ?? 0) >= 5) {
        awardBadge(user.id, 'community_champion', supabase);
      }
    });

    supabase.from('referral_leaderboard').select('*').then(({ data }) => {
      setLeaderboard(data ?? []);
    });
  }, [user]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `I'm using PathwayUSA to guide my immigration journey. Join me!\n\nDownload PathwayUSA and use my invite code: ${referralCode}\n\nYou'll get 2 weeks of Pro free when you sign up!`,
        title: 'Join me on PathwayUSA',
      });
    } catch (_) {}
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Invite Friends</Text>
          <Text style={styles.headerSub}>Earn rewards when friends join your journey</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Rewards */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What you both get</Text>
            <View style={styles.rewardRow}>
              <View style={styles.rewardCard}>
                <View style={[styles.rewardIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="person" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rewardName}>You get 1 month Pro free</Text>
                  <Text style={styles.rewardDesc}>For each friend who joins with your code</Text>
                </View>
              </View>
              <View style={styles.rewardCard}>
                <View style={[styles.rewardIcon, { backgroundColor: '#FFD70020' }]}>
                  <Ionicons name="star" size={22} color="#FFB300" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rewardName}>Your friend gets 2 weeks Pro free</Text>
                  <Text style={styles.rewardDesc}>As soon as they sign up with your code</Text>
                </View>
              </View>
              <View style={styles.rewardCard}>
                <View style={[styles.rewardIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="trophy" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rewardName}>Refer 5 friends → Community Champion badge</Text>
                  <Text style={styles.rewardDesc}>A rare badge only the top inviters earn</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Your code */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your invite code</Text>
            <View style={styles.codeWrap}>
              <Text style={styles.codeLabel}>Share this code</Text>
              <Text style={styles.code}>{referralCode || '------'}</Text>
            </View>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
              <Ionicons name="share-outline" size={20} color="#fff" />
              <Text style={styles.shareTxt}>Share Invite Link</Text>
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your referral stats</Text>
            <View style={styles.statRow}>
              <View style={styles.statCard}>
                <Text style={styles.statNum}>{stats.invited}</Text>
                <Text style={styles.statLabel}>Friends{'\n'}Invited</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNum}>{stats.joined}</Text>
                <Text style={styles.statLabel}>Friends{'\n'}Joined</Text>
              </View>
            </View>
          </View>

          {/* Leaderboard */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Inviters</Text>
            {leaderboard.length === 0 ? (
              <Text style={styles.comingSoon}>No invites yet — be the first on the board!</Text>
            ) : (
              leaderboard.map((entry, i) => (
                <View key={`${entry.display_name}-${i}`} style={styles.leaderCard}>
                  <Text style={styles.leaderRank}>{RANK_EMOJIS[i + 1] ?? i + 1}</Text>
                  <Text style={styles.leaderName}>{entry.display_name}</Text>
                  <Text style={styles.leaderCount}>{entry.referral_count} joined</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
