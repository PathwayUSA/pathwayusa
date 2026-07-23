import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth }     from '../../context/AuthContext';
import { useTheme }    from '../../context/ThemeContext';
import { useAttorney } from '../../context/AttorneyContext';
import { supabase }    from '../../lib/supabase';
import { SHADOWS }     from '../../theme';

const { width } = Dimensions.get('window');
const BAR_MAX_W = width - 120;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countryFlag(code) {
  if (!code || code.length < 2) return '🌍';
  try {
    return String.fromCodePoint(...[...code.slice(0, 2).toUpperCase()].map((c) => 0x1f1e6 - 65 + c.charCodeAt(0)));
  } catch { return '🌍'; }
}

function pct(a, b) { return b === 0 ? 0 : Math.round((a / b) * 100); }

const PERIOD_OPTIONS = [
  { key: '7d',  label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' },
  { key: 'all', label: 'All Time' },
];

function periodStart(key) {
  const now = Date.now();
  if (key === '7d')  return new Date(now - 7  * 86400000).toISOString();
  if (key === '30d') return new Date(now - 30 * 86400000).toISOString();
  if (key === '90d') return new Date(now - 90 * 86400000).toISOString();
  return null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color, colors }) {
  return (
    <View style={[as.statCard, { backgroundColor: colors.card || '#fff' }, SHADOWS.small]}>
      <View style={[as.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={[as.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[as.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      {!!sub && <Text style={[as.statSub, { color: color }]}>{sub}</Text>}
    </View>
  );
}

function BarRow({ label, count, total, color, colors }) {
  const barW = total > 0 ? (count / total) * BAR_MAX_W : 0;
  return (
    <View style={as.barRow}>
      <Text style={[as.barLabel, { color: colors.text }]} numberOfLines={1}>{label}</Text>
      <View style={as.barTrack}>
        <View style={[as.barFill, { width: barW, backgroundColor: color }]} />
      </View>
      <Text style={[as.barCount, { color: colors.textSecondary }]}>{count}</Text>
    </View>
  );
}

function SectionHeader({ title, colors }) {
  return <Text style={[as.sectionTitle, { color: colors.text }]}>{title}</Text>;
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function AttorneyAnalyticsScreen() {
  const { user }   = useAuth();
  const { colors } = useTheme();
  const { activityFeed } = useAttorney();

  const [period,        setPeriod]        = useState('30d');
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [stats,         setStats]         = useState(null);

  const fetch = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);

    const start = periodStart(period);

    // Get linked client IDs
    const { data: links } = await supabase
      .from('attorney_clients')
      .select('client_id, profiles!attorney_clients_client_id_fkey(id, full_name, country, created_at)')
      .eq('attorney_id', user.id);

    const allClients  = (links ?? []).map((l) => l.profiles).filter(Boolean);
    const clientIds   = allClients.map((c) => c.id);

    // Filter by period if needed
    const periodClients = start
      ? allClients.filter((c) => c.created_at >= start)
      : allClients;

    // Documents in period
    let docsQuery = supabase.from('roadmap_documents').select('id, status, uploaded_at, user_id');
    if (clientIds.length) docsQuery = docsQuery.in('user_id', clientIds);
    if (start) docsQuery = docsQuery.gte('uploaded_at', start);
    const { data: docs } = clientIds.length ? await docsQuery : { data: [] };

    const totalDocs    = (docs ?? []).length;
    const approvedDocs = (docs ?? []).filter((d) => d.status === 'approved').length;
    const pendingDocs  = (docs ?? []).filter((d) => d.status === 'uploaded').length;
    const rejectedDocs = (docs ?? []).filter((d) => d.status === 'rejected').length;

    // Messages in period
    let msgQuery = supabase.from('messages').select('id, created_at, from_id').eq('to_id', user.id);
    if (start) msgQuery = msgQuery.gte('created_at', start);
    const { data: msgs } = await msgQuery;
    const totalMsgs = (msgs ?? []).length;

    // Country breakdown (all time)
    const countryMap = {};
    allClients.forEach((c) => {
      const country = c.country || 'Unknown';
      countryMap[country] = (countryMap[country] ?? 0) + 1;
    });
    const countryBreakdown = Object.entries(countryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    // Recent activity grouping by type
    const docUploads = activityFeed.filter((i) => i.type === 'doc_uploaded').length;
    const msgEvents  = activityFeed.filter((i) => i.type === 'message').length;

    setStats({
      totalClients:    allClients.length,
      newClients:      periodClients.length,
      totalDocs,
      approvedDocs,
      pendingDocs,
      rejectedDocs,
      approvalRate:    pct(approvedDocs, totalDocs),
      totalMsgs,
      countryBreakdown,
      docUploads,
      msgEvents,
    });
    setLoading(false);
    setRefreshing(false);
  }, [user, period, activityFeed]);

  useEffect(() => { fetch(); }, [fetch]);

  const onRefresh = useCallback(() => { setRefreshing(true); fetch(true); }, [fetch]);

  if (loading) {
    return (
      <SafeAreaView style={[as.safe, { backgroundColor: colors.background }]}>
        <View style={as.loadWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[as.loadTxt, { color: colors.textSecondary }]}>Loading analytics…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const s = stats ?? {};

  return (
    <SafeAreaView style={[as.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[as.header, { backgroundColor: colors.primary }]}>
        <View>
          <Text style={as.headerTitle}>Analytics</Text>
          <Text style={as.headerSub}>Practice performance overview</Text>
        </View>
        <View style={[as.onlinePill, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
          <Ionicons name="bar-chart" size={14} color="#a5ffde" />
          <Text style={as.onlineTxt}>Live</Text>
        </View>
      </View>

      {/* Period selector */}
      <View style={[as.periodRow, { backgroundColor: colors.card || '#fff', borderBottomColor: colors.border || '#eee' }]}>
        {PERIOD_OPTIONS.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[as.periodTab, period === p.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={[as.periodTxt, { color: period === p.key ? colors.primary : colors.textSecondary, fontWeight: period === p.key ? '800' : '500' }]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 32 }}
      >
        {/* Stat cards row 1 */}
        <SectionHeader title="Client Overview" colors={colors} />
        <View style={as.cardGrid}>
          <StatCard icon="people"          label="Total Clients"  value={s.totalClients ?? 0} sub={`+${s.newClients ?? 0} new`}        color={colors.primary} colors={colors} />
          <StatCard icon="chatbubbles"     label="Messages In"   value={s.totalMsgs ?? 0}    sub="this period"                       color="#7b1fa2"        colors={colors} />
        </View>

        {/* Document stats */}
        <SectionHeader title="Document Activity" colors={colors} />
        <View style={as.cardGrid}>
          <StatCard icon="folder"          label="Total Docs"    value={s.totalDocs ?? 0}    sub={`${s.approvalRate ?? 0}% approved`} color="#2e7d32"   colors={colors} />
          <StatCard icon="hourglass"       label="Pending Review" value={s.pendingDocs ?? 0}  sub="awaiting action"                   color="#FF9800"   colors={colors} />
        </View>
        <View style={as.cardGrid}>
          <StatCard icon="checkmark-circle" label="Approved"     value={s.approvedDocs ?? 0} color="#4caf50"   colors={colors} />
          <StatCard icon="close-circle"     label="Rejected"     value={s.rejectedDocs ?? 0} color="#ef4444"   colors={colors} />
        </View>

        {/* Approval rate visual */}
        <View style={[as.rateCard, { backgroundColor: colors.card || '#fff' }, SHADOWS.small]}>
          <View style={as.rateRow}>
            <Text style={[as.rateTitle, { color: colors.text }]}>Document Approval Rate</Text>
            <Text style={[as.ratePct, { color: (s.approvalRate ?? 0) >= 70 ? '#4caf50' : '#FF9800' }]}>
              {s.approvalRate ?? 0}%
            </Text>
          </View>
          <View style={as.rateBarOuter}>
            <View style={[as.rateBarInner, {
              width: `${s.approvalRate ?? 0}%`,
              backgroundColor: (s.approvalRate ?? 0) >= 70 ? '#4caf50' : '#FF9800',
            }]} />
          </View>
          <View style={as.rateBreakRow}>
            <View style={as.rateBreakItem}>
              <View style={[as.rateBreakDot, { backgroundColor: '#4caf50' }]} />
              <Text style={[as.rateBreakTxt, { color: colors.textSecondary }]}>Approved: {s.approvedDocs ?? 0}</Text>
            </View>
            <View style={as.rateBreakItem}>
              <View style={[as.rateBreakDot, { backgroundColor: '#FF9800' }]} />
              <Text style={[as.rateBreakTxt, { color: colors.textSecondary }]}>Pending: {s.pendingDocs ?? 0}</Text>
            </View>
            <View style={as.rateBreakItem}>
              <View style={[as.rateBreakDot, { backgroundColor: '#ef4444' }]} />
              <Text style={[as.rateBreakTxt, { color: colors.textSecondary }]}>Rejected: {s.rejectedDocs ?? 0}</Text>
            </View>
          </View>
        </View>

        {/* Country breakdown */}
        {(s.countryBreakdown ?? []).length > 0 && (
          <View style={[as.barCard, { backgroundColor: colors.card || '#fff' }, SHADOWS.small]}>
            <Text style={[as.rateTitle, { color: colors.text, marginBottom: 14 }]}>Clients by Country</Text>
            {(s.countryBreakdown ?? []).map(([country, count]) => (
              <BarRow
                key={country}
                label={`${countryFlag(country)} ${country}`}
                count={count}
                total={s.totalClients ?? 1}
                color={colors.primary}
                colors={colors}
              />
            ))}
          </View>
        )}

        {/* Recent activity feed */}
        {activityFeed.length > 0 && (
          <View>
            <SectionHeader title="Recent Activity" colors={colors} />
            {activityFeed.slice(0, 8).map((item, i) => (
              <View key={item.id ?? i} style={[as.activityRow, { backgroundColor: colors.card || '#fff' }, SHADOWS.small]}>
                <View style={[as.activityIcon, { backgroundColor: item.type === 'message' ? '#7b1fa2' + '22' : colors.primary + '22' }]}>
                  <Ionicons
                    name={item.type === 'message' ? 'chatbubble-outline' : item.type === 'doc_uploaded' ? 'cloud-upload-outline' : 'notifications-outline'}
                    size={18}
                    color={item.type === 'message' ? '#7b1fa2' : colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[as.activityTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                  <Text style={[as.activitySub, { color: colors.textSecondary }]}>{item.time}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Empty state for no clients */}
        {(s.totalClients ?? 0) === 0 && (
          <View style={as.emptyWrap}>
            <Ionicons name="bar-chart-outline" size={64} color={colors.primary + '44'} />
            <Text style={[as.emptyTitle, { color: colors.text }]}>No data yet</Text>
            <Text style={[as.emptySub, { color: colors.textSecondary }]}>Analytics will appear once you have linked clients.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const as = StyleSheet.create({
  safe:       { flex: 1 },
  loadWrap:   { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadTxt:    { fontSize: 14 },

  header:     { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle:{ fontSize: 22, fontWeight: '900', color: '#fff' },
  headerSub:  { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  onlinePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  onlineTxt:  { fontSize: 12, color: '#a5ffde', fontWeight: '700' },

  periodRow:  { flexDirection: 'row', borderBottomWidth: 1 },
  periodTab:  { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  periodTxt:  { fontSize: 13 },

  sectionTitle:{ fontSize: 16, fontWeight: '800' },

  cardGrid:   { flexDirection: 'row', gap: 12 },
  statCard:   { flex: 1, borderRadius: 16, padding: 14, gap: 6 },
  statIcon:   { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  statValue:  { fontSize: 28, fontWeight: '900' },
  statLabel:  { fontSize: 12, fontWeight: '500' },
  statSub:    { fontSize: 11, fontWeight: '700' },

  rateCard:   { borderRadius: 16, padding: 16, gap: 10 },
  rateRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rateTitle:  { fontSize: 15, fontWeight: '800' },
  ratePct:    { fontSize: 22, fontWeight: '900' },
  rateBarOuter:{ height: 10, backgroundColor: '#eee', borderRadius: 5, overflow: 'hidden' },
  rateBarInner:{ height: 10, borderRadius: 5 },
  rateBreakRow:{ flexDirection: 'row', gap: 14 },
  rateBreakItem:{ flexDirection: 'row', alignItems: 'center', gap: 5 },
  rateBreakDot: { width: 8, height: 8, borderRadius: 4 },
  rateBreakTxt: { fontSize: 12 },

  barCard:    { borderRadius: 16, padding: 16 },
  barRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  barLabel:   { width: 90, fontSize: 13 },
  barTrack:   { flex: 1, height: 8, backgroundColor: '#eee', borderRadius: 4, overflow: 'hidden' },
  barFill:    { height: 8, borderRadius: 4 },
  barCount:   { width: 28, fontSize: 12, fontWeight: '700', textAlign: 'right' },

  activityRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 12, marginBottom: 8 },
  activityIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  activityTitle:{ fontSize: 14, fontWeight: '600' },
  activitySub:  { fontSize: 12, marginTop: 2 },

  emptyWrap:  { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
  emptySub:   { fontSize: 14, textAlign: 'center' },
});
