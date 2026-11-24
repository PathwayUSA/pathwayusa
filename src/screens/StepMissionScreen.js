import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Dimensions, Linking, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { SHADOWS, TYPOGRAPHY } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { getMissionData, buildDefaultMissionData } from '../lib/stepMissionData';
import GlossaryText from '../components/GlossaryText';
import CelebrationModal from '../components/CelebrationModal';
import { awardBadge, BADGE_DEFS } from '../lib/badges';
import { mediumHaptic, lightHaptic, heavyHaptic } from '../utils/haptics';

// Offline queue key — completions recorded while offline are synced on next mount
const PENDING_KEY = '@pathwayusa/pending_step_completions';

const { width } = Dimensions.get('window');

const NAVY = '#0F2A3D';
const GOLD = '#F5A623';

const TABS = ['Overview', 'Step Guide', 'Documents', 'Issues', 'Help'];

const DIFF_COLOR = { Easy: '#27AE60', Medium: '#F5A623', Hard: '#E74C3C' };

function getHelpItems(colors) {
  return [
    { icon: 'play-circle',         color: '#E74C3C',      bg: '#FDECEA',             label: 'Watch a Video Guide',    sub: 'Coming soon',                  onPress: null },
    { icon: 'chatbubble-ellipses', color: NAVY,           bg: '#E8EDF0',             label: 'Chat with an Expert',    sub: 'Live support via attorney',     onPress: 'AttorneyMatch' },
    { icon: 'location',            color: colors.primary, bg: colors.primaryLight,   label: 'Find a Local Attorney',  sub: 'Verified immigration lawyers',  onPress: 'AttorneyMatch' },
  ];
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    // Header
    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingBottom: 16, gap: 8,
    },
    headerBack: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.8 },
    headerStep: { fontSize: 17, fontWeight: '900', color: '#fff', marginTop: 2 },
    headerRight: { width: 40 },

    // Progress bar under header
    progressBarBg: { height: 3, backgroundColor: 'rgba(255,255,255,0.2)' },
    progressBarFill: { height: 3, backgroundColor: GOLD },

    // Tab bar
    tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E8ECE8' },
    tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 12 },
    tabBtnTxt: { fontSize: 11, fontWeight: '700', color: '#BDC3C7' },
    tabBtnTxtActive: { color: colors.primary },
    tabUnderline: { position: 'absolute', bottom: 0, left: 8, right: 8, height: 2, backgroundColor: colors.primary, borderRadius: 1 },

    // Cards
    card: { marginHorizontal: 20, marginTop: 16, backgroundColor: '#fff', borderRadius: 16, padding: 20, ...SHADOWS.small },
    cardTitle: { fontSize: 15, fontWeight: '900', color: '#1A1A2E', marginBottom: 12 },

    // Stat chips
    chipsRow: { flexDirection: 'row', gap: 10, marginHorizontal: 20, marginTop: 16 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, ...SHADOWS.small },
    chipTxt: { fontSize: 13, fontWeight: '700', color: '#1A1A2E' },

    // Why it matters
    whyCard: { marginHorizontal: 20, marginTop: 16, backgroundColor: colors.primary, borderRadius: 16, padding: 20, gap: 10, ...SHADOWS.small },
    whyLabel: { fontSize: 11, fontWeight: '900', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1 },
    whyTxt: { fontSize: 15, color: '#fff', lineHeight: 23, fontWeight: '600' },

    // In this step checklist
    checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    checkIcon: { marginTop: 2 },
    checkTxt: { fontSize: 14, color: '#444', lineHeight: 22, flex: 1 },

    // What you'll need grid
    needGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    needTile: { width: (width - 80) / 2, backgroundColor: colors.background, borderRadius: 12, padding: 12, gap: 6, alignItems: 'flex-start' },
    needTileTxt: { fontSize: 12, fontWeight: '700', color: '#1A1A2E', lineHeight: 17 },

    // Primary CTA
    startBtn: { marginHorizontal: 20, marginTop: 20, backgroundColor: colors.primary, borderRadius: 16, height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, ...SHADOWS.medium },
    startBtnTxt: { fontSize: 17, fontWeight: '900', color: '#fff' },

    // Mark complete link
    markLink: { marginHorizontal: 20, marginTop: 12, alignItems: 'center', paddingVertical: 8 },
    markLinkTxt: { fontSize: 14, color: '#7F8C8D', fontWeight: '600' },

    // Micro-steps
    microHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, paddingHorizontal: 4 },
    microHeaderCount: { fontSize: 13, fontWeight: '700', color: '#7F8C8D' },
    microHeaderToggle: { fontSize: 13, fontWeight: '700' },
    microStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
    microNumWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    microNumTxt: { fontSize: 14, fontWeight: '900', color: '#fff' },
    microRight: { flex: 1, gap: 6 },
    microTitle: { fontSize: 15, fontWeight: '800', color: '#1A1A2E' },
    microDesc: { fontSize: 14, color: '#555', lineHeight: 21 },
    microTip: { backgroundColor: '#FFF8E7', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
    microTipTxt: { fontSize: 13, color: '#7c4a00', lineHeight: 19, flex: 1 },
    microLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    microLinkTxt: { fontSize: 13, fontWeight: '700', color: colors.primary },
    microDivider: { height: 1, backgroundColor: '#E8ECE8', marginLeft: 46, marginVertical: 16 },

    // Documents tab
    docRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
    docDivider: { height: 1, backgroundColor: colors.background, marginLeft: 36 },
    docName: { fontSize: 14, color: '#1A1A2E', fontWeight: '600', flex: 1 },
    docBadge: { fontSize: 11, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },

    // Issues tab
    issueCard: { marginHorizontal: 20, marginTop: 12, backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', ...SHADOWS.small },
    issueHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
    issueHeaderTxt: { flex: 1, fontSize: 14, fontWeight: '800', color: '#1A1A2E' },
    issueBody: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
    issueGuidance: { fontSize: 14, color: '#555', lineHeight: 21 },
    issueActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary + '15', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start' },
    issueActionTxt: { fontSize: 13, fontWeight: '700', color: colors.primary },

    // Help tab
    helpRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 20 },
    helpDivider: { height: 1, backgroundColor: colors.background, marginLeft: 70 },
    helpIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    helpLabel: { fontSize: 15, fontWeight: '800', color: '#1A1A2E', flex: 1 },
    helpSub: { fontSize: 12, color: '#7F8C8D', marginTop: 2 },

    // Completion overlay
    completionOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
      paddingHorizontal: 32,
    },
    completionCircle: {
      width: 100, height: 100, borderRadius: 50,
      backgroundColor: '#EAF7EE',
      alignItems: 'center', justifyContent: 'center',
    },
    completionTitle: { fontFamily: TYPOGRAPHY.displayFamily, fontSize: TYPOGRAPHY.displaySize, letterSpacing: TYPOGRAPHY.displayLetterSpacing, color: '#1A1A2E', lineHeight: TYPOGRAPHY.displayLineHeight, textAlign: 'center' },
    completionSub: { fontSize: 15, color: '#7F8C8D', textAlign: 'center', lineHeight: 22 },
    nextStepBtn: { width: '100%', backgroundColor: colors.primary, borderRadius: 16, height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, ...SHADOWS.medium },
    nextStepBtnTxt: { fontSize: 17, fontWeight: '900', color: '#fff' },
    backRoadmapBtn: { paddingVertical: 12 },
    backRoadmapTxt: { fontSize: 14, color: '#7F8C8D', fontWeight: '600' },
  });
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ mission, styles, colors, onStartGuide, onMarkComplete, gatheredRequired, requiredDocCount }) {
  const hasRequiredDocs   = requiredDocCount > 0;
  const allDocsGathered   = !hasRequiredDocs || gatheredRequired >= requiredDocCount;

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Stat chips */}
      <View style={styles.chipsRow}>
        <View style={styles.chip}>
          <Ionicons name="time-outline" size={16} color={colors.primary} />
          <Text style={styles.chipTxt}>{mission.estimatedTime}</Text>
        </View>
        <View style={styles.chip}>
          <Ionicons name="speedometer-outline" size={16} color={DIFF_COLOR[mission.difficulty] ?? colors.primary} />
          <Text style={[styles.chipTxt, { color: DIFF_COLOR[mission.difficulty] ?? colors.primary }]}>
            {mission.difficulty}
          </Text>
        </View>
      </View>

      {/* Why it matters */}
      <View style={styles.whyCard}>
        <Text style={styles.whyLabel}>Why This Matters</Text>
        <Text style={styles.whyTxt}>{mission.whyItMatters}</Text>
      </View>

      {/* In this step you will */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>In This Step You Will</Text>
        {mission.inThisStepYouWill.map((item, i) => (
          <View key={i} style={styles.checkRow}>
            <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={styles.checkIcon} />
            <Text style={styles.checkTxt}>{item}</Text>
          </View>
        ))}
      </View>

      {/* What you'll need */}
      {mission.whatYoullNeed?.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>What You'll Need</Text>
          <View style={styles.needGrid}>
            {mission.whatYoullNeed.map((item, i) => (
              <View key={i} style={styles.needTile}>
                <Ionicons name={item.icon} size={22} color={colors.primary} />
                <Text style={styles.needTileTxt}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* CTA */}
      <TouchableOpacity style={styles.startBtn} onPress={onStartGuide} activeOpacity={0.85}>
        <Text style={styles.startBtnTxt}>Start Step Guide</Text>
        <Ionicons name="arrow-forward" size={20} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.markLink}
        onPress={() => {
          if (hasRequiredDocs && !allDocsGathered) {
            Alert.alert(
              'Documents Needed',
              `Gather all ${requiredDocCount} required document${requiredDocCount !== 1 ? 's' : ''} before completing this step.`,
              [{ text: 'OK' }],
            );
            return;
          }
          onMarkComplete();
        }}
        activeOpacity={0.7}
      >
        {hasRequiredDocs && !allDocsGathered ? (
          <>
            <Ionicons name="document-text-outline" size={16} color="#E67E22" style={{ marginBottom: 4 }} />
            <Text style={[styles.markLinkTxt, { color: '#E67E22', textAlign: 'center' }]}>
              Gather all {requiredDocCount} required documents first
            </Text>
          </>
        ) : (
          <Text style={styles.markLinkTxt}>✓ Mark as Completed</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ── Step Guide Tab ────────────────────────────────────────────────────────────
function StepGuideTab({ mission, styles, colors }) {
  const [expanded, setExpanded] = useState(new Set([1]));
  const allExpanded = expanded.size === mission.microSteps.length;

  const toggle = (n) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(n) ? next.delete(n) : next.add(n);
      return next;
    });
  };

  const toggleAll = () => {
    lightHaptic();
    setExpanded(allExpanded ? new Set() : new Set(mission.microSteps.map((s) => s.number)));
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.microHeaderRow}>
        <Text style={styles.microHeaderCount}>{mission.microSteps.length} steps</Text>
        <TouchableOpacity onPress={toggleAll} activeOpacity={0.7}>
          <Text style={[styles.microHeaderToggle, { color: colors.primary }]}>
            {allExpanded ? 'Collapse all' : 'Expand all'}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.card, { marginTop: 8, gap: 0 }]}>
        {mission.microSteps.map((step, i) => (
          <React.Fragment key={step.number}>
            <TouchableOpacity
              style={styles.microStep}
              onPress={() => { lightHaptic(); toggle(step.number); }}
              activeOpacity={0.8}
            >
              <View style={styles.microNumWrap}>
                <Text style={styles.microNumTxt}>{step.number}</Text>
              </View>
              <View style={[styles.microRight, { paddingTop: 5 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.microTitle, { flex: 1 }]}>{step.title}</Text>
                  <Ionicons
                    name={expanded.has(step.number) ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color="#BDC3C7"
                  />
                </View>
                {expanded.has(step.number) && (
                  <View style={{ gap: 10 }}>
                    <GlossaryText style={styles.microDesc}>{step.description}</GlossaryText>
                    {step.tip && (
                      <View style={styles.microTip}>
                        <Ionicons name="bulb-outline" size={15} color="#F5A623" />
                        <GlossaryText style={styles.microTipTxt}>{step.tip}</GlossaryText>
                      </View>
                    )}
                    {step.link && (
                      <TouchableOpacity
                        style={styles.microLink}
                        onPress={() => Linking.openURL(step.link.url)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="open-outline" size={14} color={colors.primary} />
                        <Text style={styles.microLinkTxt}>{step.link.label}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            </TouchableOpacity>
            {i < mission.microSteps.length - 1 && <View style={styles.microDivider} />}
          </React.Fragment>
        ))}
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ── Documents Tab ─────────────────────────────────────────────────────────────
function DocumentsTab({ docs, docStatuses, docsLoading, gatheredRequired, requiredCount, onToggleDoc, styles, colors }) {
  if (!docs.length) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 }}>
        <Ionicons name="document-outline" size={48} color="#BDC3C7" />
        <Text style={{ fontSize: 16, color: '#7F8C8D', textAlign: 'center', fontWeight: '600' }}>
          No specific documents listed for this step.
        </Text>
      </View>
    );
  }

  const allGathered = requiredCount > 0 && gatheredRequired >= requiredCount;

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={[styles.card, { marginTop: 20, gap: 0 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={styles.cardTitle}>Documents</Text>
          {docsLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={{ fontSize: 12, fontWeight: '700', color: allGathered ? '#27AE60' : colors.primary }}>
              {gatheredRequired} of {requiredCount} gathered
            </Text>
          )}
        </View>
        <Text style={{ fontSize: 13, color: '#7F8C8D', marginBottom: 12, lineHeight: 19 }}>
          Tap to mark as gathered. Progress is saved automatically.
        </Text>
        {docs.map((doc, i) => (
          <React.Fragment key={doc.name}>
            <DocRow
              doc={doc}
              status={docStatuses[doc.name] ?? 'not_started'}
              onToggle={() => onToggleDoc(doc)}
              styles={styles}
              colors={colors}
            />
            {i < docs.length - 1 && <View style={styles.docDivider} />}
          </React.Fragment>
        ))}
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function DocRow({ doc, status, onToggle, styles, colors }) {
  const isGathered = status === 'gathered' || status === 'uploaded';
  const isUploaded = status === 'uploaded';
  const isOptional = doc.required === false;

  return (
    <TouchableOpacity style={styles.docRow} onPress={onToggle} activeOpacity={0.7}>
      {isUploaded ? (
        <Ionicons name="attach-outline" size={22} color={colors.primary} />
      ) : (
        <Ionicons
          name={isGathered ? 'checkmark-circle' : 'ellipse-outline'}
          size={22}
          color={isGathered ? '#27AE60' : '#BDC3C7'}
        />
      )}
      <Text style={[
        styles.docName,
        isGathered && { color: isUploaded ? colors.primary : '#27AE60' },
      ]}>
        {doc.name}
      </Text>
      {isOptional ? (
        <Text style={[styles.docBadge, { backgroundColor: '#F5F5F5', color: '#7F8C8D' }]}>
          Optional
        </Text>
      ) : (
        <Text style={[styles.docBadge, { backgroundColor: '#FFF0F0', color: '#E74C3C' }]}>
          Required
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ── Common Issues Tab ─────────────────────────────────────────────────────────
function IssuesTab({ mission, styles, colors }) {
  const [openIndex, setOpenIndex] = useState(null);
  const issues = mission.commonIssues ?? [];

  if (!issues.length) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 }}>
        <Ionicons name="checkmark-done-circle-outline" size={48} color="#BDC3C7" />
        <Text style={{ fontSize: 16, color: '#7F8C8D', textAlign: 'center', fontWeight: '600' }}>
          No common issues recorded for this step yet.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={{ marginTop: 8, marginBottom: 40 }}>
        {issues.map((issue, i) => (
          <View key={i} style={styles.issueCard}>
            <TouchableOpacity
              style={styles.issueHeader}
              onPress={() => { lightHaptic(); setOpenIndex(openIndex === i ? null : i); }}
              activeOpacity={0.8}
            >
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: (issue.color ?? colors.primary) + '18', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={issue.icon ?? 'alert-circle-outline'} size={20} color={issue.color ?? colors.primary} />
              </View>
              <Text style={styles.issueHeaderTxt}>{issue.condition}</Text>
              <Ionicons name={openIndex === i ? 'chevron-up' : 'chevron-down'} size={16} color="#BDC3C7" />
            </TouchableOpacity>
            {openIndex === i && (
              <View style={styles.issueBody}>
                <Text style={styles.issueGuidance}>{issue.guidance}</Text>
                {issue.actionLabel && (
                  <TouchableOpacity
                    style={styles.issueActionBtn}
                    onPress={() => issue.actionUrl ? Linking.openURL(issue.actionUrl) : lightHaptic()}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="open-outline" size={14} color={colors.primary} />
                    <Text style={styles.issueActionTxt}>{issue.actionLabel}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ── Help Tab ──────────────────────────────────────────────────────────────────
function HelpTab({ styles, colors, navigation }) {
  const helpItems = getHelpItems(colors);
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={[styles.card, { marginTop: 20, gap: 0 }]}>
        {helpItems.map((item, i) => (
          <React.Fragment key={item.label}>
            <TouchableOpacity
              style={styles.helpRow}
              onPress={() => {
                lightHaptic();
                if (item.onPress) navigation.navigate(item.onPress);
              }}
              activeOpacity={item.onPress ? 0.8 : 1}
            >
              <View style={[styles.helpIconWrap, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon} size={24} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.helpLabel}>{item.label}</Text>
                <Text style={styles.helpSub}>{item.sub}</Text>
              </View>
              {item.onPress && <Ionicons name="chevron-forward" size={16} color="#BDC3C7" />}
            </TouchableOpacity>
            {i < helpItems.length - 1 && <View style={styles.helpDivider} />}
          </React.Fragment>
        ))}
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ── Completion Overlay ────────────────────────────────────────────────────────
function CompletionOverlay({ styles, step, stepIndex, totalSteps, pathway, navigation, steps, profile }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const nextStep = steps?.[stepIndex + 1] ?? null;

  const goNext = () => {
    heavyHaptic();
    if (nextStep) {
      navigation.replace('StepMission', {
        step: nextStep,
        stepIndex: stepIndex + 1,
        totalSteps,
        pathway,
        steps,
      });
    } else {
      navigation.navigate('AppMain');
    }
  };

  return (
    <View style={styles.completionOverlay}>
      <Animated.View style={[styles.completionCircle, { transform: [{ scale: scaleAnim }] }]}>
        <Ionicons name="checkmark" size={52} color="#27AE60" />
      </Animated.View>

      <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', gap: 10 }}>
        <Text style={styles.completionTitle}>Step {stepIndex + 1} Complete!</Text>
        <Text style={styles.completionSub}>
          {nextStep
            ? `Next up: ${nextStep.title}`
            : 'You have completed all steps in your pathway!'}
        </Text>
      </Animated.View>

      <Animated.View style={{ opacity: fadeAnim, width: '100%', alignItems: 'center', gap: 12 }}>
        {nextStep ? (
          <TouchableOpacity style={styles.nextStepBtn} onPress={goNext} activeOpacity={0.85}>
            <Text style={styles.nextStepBtnTxt}>Continue to Next Step</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.nextStepBtn}
            onPress={() => {
              heavyHaptic();
              navigation.navigate('Celebration', {
                name: profile?.full_name || 'Friend',
                path: pathway?.id === 'D' ? 'green_card' : 'citizenship',
                date: new Date().toDateString(),
              });
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.nextStepBtnTxt}>View Your Certificate 🎉</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.backRoadmapBtn} onPress={() => navigation.navigate('AppMain')} activeOpacity={0.7}>
          <Text style={styles.backRoadmapTxt}>← Back to Roadmap</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function StepMissionScreen({ route, navigation }) {
  const { step, stepIndex = 0, totalSteps = 1, pathway, steps = [], initialTab = 0 } = route.params ?? {};
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { user, profile } = useAuth();

  const [activeTab, setActiveTab] = useState(initialTab);
  const [completed, setCompleted] = useState(false);
  const [newBadge, setNewBadge] = useState(null);

  // ── Document state (lifted — persists across tab switches) ────────────────
  const [docStatuses, setDocStatuses]   = useState({});
  const [docsLoading, setDocsLoading]   = useState(false);

  const mission  = getMissionData(pathway?.id, step?.id) ?? buildDefaultMissionData(step ?? {});
  const stepId   = String(step?.id ?? stepIndex + 1);
  const docs     = mission.documents ?? [];

  const progressPct = totalSteps > 0 ? ((stepIndex + 1) / totalSteps) : 0;

  // Flush any offline-queued completions on mount when we have a connection
  useEffect(() => {
    if (!user) return;
    (async () => {
      const netState = await NetInfo.fetch().catch(() => null);
      if (!netState?.isConnected) return;
      const raw = await AsyncStorage.getItem(PENDING_KEY).catch(() => null);
      if (!raw) return;
      const queue = JSON.parse(raw);
      if (!queue.length) return;
      const remaining = [];
      for (const record of queue) {
        const { error } = await supabase
          .from('user_progress')
          .upsert(record, { onConflict: 'user_id,step_id' });
        if (error) remaining.push(record);
      }
      if (remaining.length) {
        await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(remaining)).catch(() => {});
      } else {
        await AsyncStorage.removeItem(PENDING_KEY).catch(() => {});
      }
    })();
  }, [user]);

  // Fetch saved document statuses — cache-first, then Supabase authoritative
  useEffect(() => {
    if (!user || !docs.length) return;
    const cacheKey = `docs_${user.id}_${stepId}`;
    // Instant paint from AsyncStorage
    AsyncStorage.getItem(cacheKey)
      .then((raw) => {
        if (!raw) return;
        const names = JSON.parse(raw);
        const base = {};
        names.forEach((n) => { base[n] = 'gathered'; });
        setDocStatuses(base);
      })
      .catch(() => {});
    // Authoritative overwrite from Supabase
    setDocsLoading(true);
    supabase
      .from('user_documents')
      .select('document_name, checked')
      .eq('user_id', user.id)
      .then(({ data }) => {
        const map = {};
        (data ?? []).forEach((r) => { map[r.document_name] = r.checked ? 'gathered' : 'not_started'; });
        setDocStatuses(map);
        // Keep cache in sync with Supabase truth
        const gatheredNames = Object.entries(map)
          .filter(([, s]) => s === 'gathered' || s === 'uploaded')
          .map(([n]) => n);
        AsyncStorage.setItem(cacheKey, JSON.stringify(gatheredNames)).catch(() => {});
        setDocsLoading(false);
      })
      .catch(() => setDocsLoading(false));
  }, [user, stepId]);

  // Toggle a document between not_started ↔ gathered
  const toggleDoc = useCallback(async (doc) => {
    lightHaptic();
    const current = docStatuses[doc.name] ?? 'not_started';
    const next    = (current === 'gathered' || current === 'uploaded') ? 'not_started' : 'gathered';
    const updated = { ...docStatuses, [doc.name]: next };
    setDocStatuses(updated);
    // Keep AsyncStorage cache in sync immediately
    if (user) {
      const cacheKey = `docs_${user.id}_${stepId}`;
      const gatheredNames = Object.entries(updated)
        .filter(([, s]) => s === 'gathered' || s === 'uploaded')
        .map(([n]) => n);
      AsyncStorage.setItem(cacheKey, JSON.stringify(gatheredNames)).catch(() => {});
    }
    if (!user) return;
    if (next === 'not_started') {
      supabase
        .from('user_documents')
        .delete()
        .eq('user_id', user.id)
        .eq('document_name', doc.name)
        .then(() => {}).catch(() => {});
    } else {
      supabase
        .from('user_documents')
        .upsert({
          user_id: user.id,
          document_name: doc.name,
          checked: true,
        }, { onConflict: 'user_id,document_name' })
        .then(() => {}).catch(() => {});
    }
  }, [user, stepId, docStatuses]);

  // Derived doc counts
  const requiredDocs      = docs.filter((d) => d.required !== false);
  const gatheredRequired  = requiredDocs.filter((d) => {
    const s = docStatuses[d.name];
    return s === 'gathered' || s === 'uploaded';
  }).length;

  const handleMarkComplete = useCallback(async () => {
    if (!user) return;
    mediumHaptic();

    const record = {
      user_id: user.id,
      step_id: String(step?.id ?? stepIndex + 1),
      completed: true,
      updated_at: new Date().toISOString(),
    };

    const netState = await NetInfo.fetch().catch(() => null);
    const isOnline = netState?.isConnected && netState?.isInternetReachable !== false;

    if (!isOnline) {
      const raw = await AsyncStorage.getItem(PENDING_KEY).catch(() => null);
      const queue = raw ? JSON.parse(raw) : [];
      if (!queue.some((r) => r.step_id === record.step_id && r.user_id === record.user_id)) {
        queue.push(record);
        await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(queue)).catch(() => {});
      }
      setCompleted(true);
      return;
    }

    const { error } = await supabase
      .from('user_progress')
      .upsert(record, { onConflict: 'user_id,step_id' });

    if (error) {
      if (error.code === '42P01') {
        setCompleted(true);
        return;
      }
      if (
        error.code === '42501' ||
        error.message?.toLowerCase().includes('permission denied') ||
        error.message?.toLowerCase().includes('policy') ||
        error.code === 'PGRST301'
      ) {
        const raw = await AsyncStorage.getItem(PENDING_KEY).catch(() => null);
        const queue = raw ? JSON.parse(raw) : [];
        if (!queue.some((r) => r.step_id === record.step_id && r.user_id === record.user_id)) {
          queue.push(record);
          await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(queue)).catch(() => {});
        }
        setCompleted(true);
        return;
      }
      Alert.alert('Could not save progress', 'Check your connection and try again.');
      return;
    }

    supabase
      .from('profiles')
      .update({ last_step_action_at: record.updated_at })
      .eq('id', user.id)
      .catch(() => {});

    // Award the "first step" / "roadmap done" badges here — this is the only
    // exit path that confirms the write actually reached Supabase, so it's
    // the only one safe to also award a badge against. awardBadge() is
    // idempotent (no-ops if already earned), so it's safe to attempt on
    // every completion rather than tracking "is this really the first one"
    // client-side. Only surface the celebration modal when a badge is
    // genuinely newly earned, not on every step.
    const isFinalStep = !steps?.[stepIndex + 1];
    const badgeId = isFinalStep ? 'roadmap_done' : 'first_step';
    awardBadge(user.id, badgeId, supabase)
      .then((awarded) => { if (awarded) setNewBadge(BADGE_DEFS.find((b) => b.id === badgeId)); })
      .catch(() => {});

    setCompleted(true);
  }, [user, step, stepIndex, steps, totalSteps]);

  if (!step) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <Text style={{ color: '#7F8C8D' }}>No step data found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── HEADER ── */}
      <LinearGradient
        colors={colors.gradient}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
        start={{ x: 0, y: 0 }} end={{ x: 0.3, y: 1 }}
      >
        <TouchableOpacity style={styles.headerBack} onPress={() => { lightHaptic(); navigation.goBack(); }} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Step {stepIndex + 1} of {totalSteps}</Text>
          <Text style={styles.headerStep} numberOfLines={1}>{step.title}</Text>
        </View>
        <View style={styles.headerRight} />
      </LinearGradient>

      {/* Progress bar */}
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${Math.round(progressPct * 100)}%` }]} />
      </View>

      {/* ── TAB BAR ── */}
      <View style={styles.tabBar}>
        {TABS.map((tab, i) => {
          const label = (i === 2 && requiredDocs.length > 0)
            ? `Docs (${gatheredRequired}/${requiredDocs.length})`
            : tab;
          return (
            <TouchableOpacity
              key={i}
              style={styles.tabBtn}
              onPress={() => { lightHaptic(); setActiveTab(i); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabBtnTxt, activeTab === i && styles.tabBtnTxtActive]}>{label}</Text>
              {activeTab === i && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── TAB CONTENT ── */}
      <View style={{ flex: 1 }}>
        {activeTab === 0 && (
          <OverviewTab
            mission={mission}
            styles={styles}
            colors={colors}
            onStartGuide={() => { lightHaptic(); setActiveTab(1); }}
            onMarkComplete={handleMarkComplete}
            gatheredRequired={gatheredRequired}
            requiredDocCount={requiredDocs.length}
          />
        )}
        {activeTab === 1 && <StepGuideTab mission={mission} styles={styles} colors={colors} />}
        {activeTab === 2 && (
          <DocumentsTab
            docs={docs}
            docStatuses={docStatuses}
            docsLoading={docsLoading}
            gatheredRequired={gatheredRequired}
            requiredCount={requiredDocs.length}
            onToggleDoc={toggleDoc}
            styles={styles}
            colors={colors}
          />
        )}
        {activeTab === 3 && <IssuesTab mission={mission} styles={styles} colors={colors} />}
        {activeTab === 4 && <HelpTab styles={styles} colors={colors} navigation={navigation} />}
      </View>

      {/* ── COMPLETION OVERLAY ── */}
      {completed && (
        <CompletionOverlay
          styles={styles}
          step={step}
          stepIndex={stepIndex}
          totalSteps={totalSteps}
          pathway={pathway}
          navigation={navigation}
          steps={steps}
          profile={profile}
        />
      )}

      <CelebrationModal
        visible={!!newBadge}
        title={newBadge?.name}
        subtitle={newBadge ? `Badge earned: ${newBadge.desc}` : ''}
        iconName={newBadge?.icon}
        onClose={() => setNewBadge(null)}
      />
    </View>
  );
}
