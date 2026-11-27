import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { TYPOGRAPHY } from '../theme';
import { lightHaptic, mediumHaptic } from '../utils/haptics';

const { width: SCREEN_W } = Dimensions.get('window');
const NODE_SIZE = 58;
const CURRENT_NODE_SIZE = 76;
const ROW_HEIGHT = 200;
const BADGE_SPACE = 26;
const LABEL_WIDTH = 200;
// Keep enough margin for the wider label (half its width) plus half the
// largest node, so neither clips off the edge of a narrow phone screen.
const AMPLITUDE = Math.min(SCREEN_W * 0.2, SCREEN_W / 2 - (CURRENT_NODE_SIZE / 2 + LABEL_WIDTH / 2));
const CENTER_X = SCREEN_W / 2;

// Keyword -> icon, checked in order (most specific first) against the
// step's title. Covers every step title across every pathway definition in
// pathwayRouter.js, not just one path — add a new case here if a future
// pathway introduces a title these patterns don't catch; FALLBACK_ICON
// keeps that safe rather than crashing.
const ICON_RULES = [
  [/biometric/i, 'finger-print-outline'],
  [/interview notice/i, 'mail-unread-outline'],
  [/interview/i, 'chatbubbles-outline'],
  [/civics|english test|study/i, 'book-outline'],
  [/oath|ceremony/i, 'flag-outline'],
  [/certificate/i, 'ribbon-outline'],
  [/green card/i, 'card-outline'],
  [/petition|application|file your|file adjustment|file qualifying/i, 'document-text-outline'],
  [/gather|documents?\b/i, 'folder-open-outline'],
  [/priority date|monitor|wait for/i, 'hourglass-outline'],
  [/physical presence|calculate/i, 'time-outline'],
  [/eligib|qualify|requirements?/i, 'shield-checkmark-outline'],
  [/employer|sponsor/i, 'briefcase-outline'],
  [/attorney|consult/i, 'people-outline'],
  [/status|confirm/i, 'clipboard-outline'],
  [/relationship|family|marriage/i, 'heart-outline'],
  [/work authorization|\bead\b|\bopt\b|h-1b|lottery|stem/i, 'briefcase-outline'],
  [/pathway|identify/i, 'map-outline'],
  [/based on your/i, 'information-circle-outline'],
];
const FALLBACK_ICON = 'document-text-outline';

export function stepIconFor(title) {
  if (!title) return FALLBACK_ICON;
  const rule = ICON_RULES.find(([pattern]) => pattern.test(title));
  return rule ? rule[1] : FALLBACK_ICON;
}

function nodeX(i) {
  // A gentle, deterministic meander left/right — a trail, not a straight list.
  return CENTER_X + AMPLITUDE * Math.sin(i * 1.05);
}

function nodeY(i) {
  // + BADGE_SPACE so the very first node has room for its "YOU ARE HERE"
  // badge above it without getting clipped at the top of the container.
  return ROW_HEIGHT * i + CURRENT_NODE_SIZE / 2 + 12 + BADGE_SPACE;
}

/** Smooth vertical S-curve between two points, control points pulled
 * straight down/up from each end so consecutive segments join cleanly. */
function segmentPath(x0, y0, x1, y1) {
  const dy = (y1 - y0) / 2;
  return `M ${x0},${y0} C ${x0},${y0 + dy} ${x1},${y1 - dy} ${x1},${y1}`;
}

function PathNode({ step, index, status, colors, onPress }) {
  const shake = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status !== 'current') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [status, pulse]);

  const handlePress = () => {
    if (status === 'locked') {
      lightHaptic();
      Animated.sequence([
        Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
      return;
    }
    mediumHaptic();
    onPress(step, index, status);
  };

  const size = status === 'current' ? CURRENT_NODE_SIZE : NODE_SIZE;
  const x = nodeX(index);
  const y = nodeY(index);

  const bg = status === 'locked' ? colors.border : colors.primary;
  const icon = stepIconFor(step.title);
  const iconColor = status === 'locked' ? colors.textLight : '#fff';

  return (
    // BADGE_SPACE is reserved above every node, current or not, so the
    // circle itself always lands at the same offset from `y` — otherwise
    // the current node's badge would push just that one node down,
    // misaligning it from where the SVG path math expects its center.
    <View style={{ position: 'absolute', left: x - size / 2 - 4, top: y - size / 2 - 4 - BADGE_SPACE, width: size + 8, alignItems: 'center' }}>
      <View style={{ height: BADGE_SPACE, justifyContent: 'flex-end' }}>
        {status === 'current' && (
          <View style={[styles.hereBadge, { backgroundColor: colors.primaryDark }]}>
            <Text style={styles.hereBadgeTxt}>YOU ARE HERE</Text>
          </View>
        )}
      </View>
      <Animated.View
        style={{
          transform: [
            { translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-6, 6] }) },
            { scale: status === 'current' ? pulse : 1 },
          ],
        }}
      >
        {status === 'current' && (
          <>
            <View style={[styles.haloOuter, { width: size + 36, height: size + 36, borderRadius: (size + 36) / 2, borderColor: colors.primary, left: -18, top: -18 }]} />
            <View style={[styles.halo, { width: size + 20, height: size + 20, borderRadius: (size + 20) / 2, borderColor: colors.primary, left: -10, top: -10 }]} />
            <Text style={[styles.sparkle, { color: colors.secondary, right: -14, top: -2 }]}>✦</Text>
            <Text style={[styles.sparkle, { color: colors.secondary, left: -10, bottom: 6, fontSize: 11 }]}>✦</Text>
          </>
        )}
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.8}
          style={[
            styles.node,
            { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
            status === 'done' && { borderWidth: 3, borderColor: colors.primaryDark },
          ]}
        >
          <Ionicons name={icon} size={status === 'current' ? 30 : 22} color={iconColor} />
        </TouchableOpacity>
        {status === 'done' && (
          <View style={[styles.doneBadge, { backgroundColor: colors.secondary, borderColor: colors.background }]}>
            <Ionicons name="checkmark" size={11} color="#fff" />
          </View>
        )}
        {status === 'locked' && (
          <View style={[styles.doneBadge, { backgroundColor: colors.textLight, borderColor: colors.background }]}>
            <Ionicons name="lock-closed" size={10} color="#fff" />
          </View>
        )}
      </Animated.View>
      {/* No numberOfLines cap: a hard line limit combined with a fixed
          width forced the web renderer to split words mid-letter
          ("Naturaliza/tion") to cram long titles into the limit instead of
          just wrapping to another line. Letting it wrap freely avoids that
          entirely — ROW_HEIGHT below is generous enough for the longest
          real title to wrap naturally without crowding the next node. */}
      <Text
        style={[
          styles.label,
          { color: status === 'locked' ? colors.textLight : colors.text },
          status === 'current' && styles.labelCurrent,
        ]}
      >
        {step.title}
      </Text>
    </View>
  );
}

/** A winding "trail map" of the user's pathway steps — Duolingo-style — in
 * place of a plain checklist. Visual position communicates progress; tapping
 * a reachable node navigates into it, tapping a locked one just nudges back
 * with haptic + a small shake, no dead-end modal needed.
 *
 * `statuses` is a parallel array of 'done' | 'current' | 'locked', one per
 * step — computed by the caller (GuideScreen already derives this from
 * completedStepIds/currentStepIndex) rather than re-derived here, so there's
 * exactly one source of truth for what counts as done/current/locked. */
export default function PathwayMap({ steps, statuses, colors, onPressStep }) {
  const mapHeight = ROW_HEIGHT * steps.length + CURRENT_NODE_SIZE + BADGE_SPACE;

  const segments = [];
  for (let i = 0; i < steps.length - 1; i++) {
    // A segment is "walked" once the node it leads into is done or current.
    const walked = statuses[i + 1] === 'done' || statuses[i + 1] === 'current';
    segments.push({ d: segmentPath(nodeX(i), nodeY(i), nodeX(i + 1), nodeY(i + 1)), walked });
  }

  return (
    <View style={{ height: mapHeight, width: '100%', overflow: 'hidden' }}>
      <View style={[styles.blob, { left: -30, top: mapHeight * 0.22, width: 140, height: 140, borderRadius: 70, backgroundColor: colors.primary, opacity: 0.05 }]} />
      <View style={[styles.blob, { right: -40, top: mapHeight * 0.55, width: 160, height: 160, borderRadius: 80, backgroundColor: colors.navy, opacity: 0.04 }]} />
      <Svg width="100%" height={mapHeight} style={{ position: 'absolute' }}>
        {segments.map((seg, i) => (
          <Path
            key={i}
            d={seg.d}
            stroke={seg.walked ? colors.primary : colors.border}
            strokeWidth={6}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={seg.walked ? undefined : '2 12'}
          />
        ))}
      </Svg>
      {steps.map((step, i) => (
        <PathNode
          key={step.id}
          step={step}
          index={i}
          status={statuses[i]}
          colors={colors}
          onPress={onPressStep}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
  },
  node: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  halo: {
    position: 'absolute',
    borderWidth: 2,
    opacity: 0.35,
  },
  haloOuter: {
    position: 'absolute',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    opacity: 0.22,
  },
  sparkle: {
    position: 'absolute',
    fontSize: 14,
    fontWeight: '900',
  },
  doneBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hereBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 6,
  },
  hereBadgeTxt: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  label: {
    marginTop: 8,
    fontSize: 11.5,
    fontWeight: '700',
    textAlign: 'center',
    width: LABEL_WIDTH,
    lineHeight: 15,
  },
  labelCurrent: {
    fontFamily: TYPOGRAPHY.headingFamily,
    fontSize: 12.5,
  },
});
