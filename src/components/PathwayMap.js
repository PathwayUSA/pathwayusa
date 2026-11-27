import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated } from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { TYPOGRAPHY } from '../theme';
import { lightHaptic, mediumHaptic } from '../utils/haptics';

const { width: SCREEN_W } = Dimensions.get('window');
// Sizes below are the original design x1.35 — approved at that scale after
// a 1.5x mockup read as too big.
const NODE_SIZE = 78;
const CURRENT_NODE_SIZE = 103;
const ROW_HEIGHT = 270;
const BADGE_SPACE = 35;
const LABEL_WIDTH = 270;

// Brick-road styling for the "walked" portion of the path (everything
// behind/at the current step) — approved from a mockup: a shadow layer for
// lift, a terracotta base, a lighter highlight stripe, and rotated mortar
// ticks computed along the real bezier curve so they actually follow the
// path's direction rather than just being decoration laid on top.
const BRICK_SHADOW = '#7A3E1D';
const BRICK_BASE = '#A85A32';
const BRICK_HIGHLIGHT = '#E0996A';
const BRICK_MORTAR = '#8A4A26';
const BRICK_TICKS_PER_SEGMENT = 4;
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

// The two control points segmentPath implies for a given (x0,y0)->(x1,y1)
// — needed separately here to sample points/tangents along the same curve
// for the brick-road mortar ticks below.
function segmentControlPoints(x0, y0, x1, y1) {
  const dy = (y1 - y0) / 2;
  return { cx0: x0, cy0: y0 + dy, cx1: x1, cy1: y1 - dy };
}

function cubicBezierPoint(p0, c0, c1, p1, t) {
  const mt = 1 - t;
  const x = mt ** 3 * p0.x + 3 * mt ** 2 * t * c0.x + 3 * mt * t ** 2 * c1.x + t ** 3 * p1.x;
  const y = mt ** 3 * p0.y + 3 * mt ** 2 * t * c0.y + 3 * mt * t ** 2 * c1.y + t ** 3 * p1.y;
  return { x, y };
}

function cubicBezierTangentAngle(p0, c0, c1, p1, t) {
  const mt = 1 - t;
  const dx = 3 * mt ** 2 * (c0.x - p0.x) + 6 * mt * t * (c1.x - c0.x) + 3 * t ** 2 * (p1.x - c1.x);
  const dy = 3 * mt ** 2 * (c0.y - p0.y) + 6 * mt * t * (c1.y - c0.y) + 3 * t ** 2 * (p1.y - c1.y);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/** The thick, textured "walked" road — shadow + base + highlight strokes
 * on the real curve, plus mortar-seam ticks sampled at points along it and
 * rotated to the curve's actual local direction (not just laid on flat). */
function BrickSegment({ x0, y0, x1, y1 }) {
  const d = segmentPath(x0, y0, x1, y1);
  const { cx0, cy0, cx1, cy1 } = segmentControlPoints(x0, y0, x1, y1);
  const p0 = { x: x0, y: y0 }, c0 = { x: cx0, y: cy0 }, c1 = { x: cx1, y: cy1 }, p1 = { x: x1, y: y1 };

  const ticks = [];
  for (let i = 1; i <= BRICK_TICKS_PER_SEGMENT; i++) {
    const t = i / (BRICK_TICKS_PER_SEGMENT + 1);
    const pt = cubicBezierPoint(p0, c0, c1, p1, t);
    const angle = cubicBezierTangentAngle(p0, c0, c1, p1, t) + 90;
    ticks.push({ ...pt, angle });
  }

  return (
    <>
      <Path d={d} stroke={BRICK_SHADOW} strokeWidth={19} strokeLinecap="round" fill="none" opacity={0.25} transform="translate(2,3)" />
      <Path d={d} stroke={BRICK_BASE} strokeWidth={19} strokeLinecap="round" fill="none" />
      <Path d={d} stroke={BRICK_HIGHLIGHT} strokeWidth={6} strokeLinecap="round" fill="none" opacity={0.55} transform="translate(-2,-2)" />
      {ticks.map((tk, i) => (
        <Line
          key={i}
          x1={tk.x - 9} y1={tk.y} x2={tk.x + 9} y2={tk.y}
          stroke={BRICK_MORTAR}
          strokeWidth={2.2}
          opacity={0.85}
          transform={`rotate(${tk.angle} ${tk.x} ${tk.y})`}
        />
      ))}
    </>
  );
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
    <View style={{ position: 'absolute', left: x - size / 2 - 5, top: y - size / 2 - 5 - BADGE_SPACE, width: size + 10, alignItems: 'center' }}>
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
            { translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-8, 8] }) },
            { scale: status === 'current' ? pulse : 1 },
          ],
        }}
      >
        {status === 'current' && (
          <>
            <View style={[styles.haloOuter, { width: size + 49, height: size + 49, borderRadius: (size + 49) / 2, borderColor: colors.primary, left: -24, top: -24 }]} />
            <View style={[styles.halo, { width: size + 27, height: size + 27, borderRadius: (size + 27) / 2, borderColor: colors.primary, left: -14, top: -14 }]} />
            <Text style={[styles.sparkle, { color: colors.secondary, right: -19, top: -3 }]}>✦</Text>
            <Text style={[styles.sparkle, { color: colors.secondary, left: -14, bottom: 8, fontSize: 15 }]}>✦</Text>
          </>
        )}
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.8}
          style={[
            styles.node,
            { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
            status === 'done' && { borderWidth: 4, borderColor: colors.primaryDark },
          ]}
        >
          <Ionicons name={icon} size={status === 'current' ? 40 : 30} color={iconColor} />
        </TouchableOpacity>
        {status === 'done' && (
          <View style={[styles.doneBadge, { backgroundColor: colors.secondary, borderColor: colors.background }]}>
            <Ionicons name="checkmark" size={15} color="#fff" />
          </View>
        )}
        {status === 'locked' && (
          <View style={[styles.doneBadge, { backgroundColor: colors.textLight, borderColor: colors.background }]}>
            <Ionicons name="lock-closed" size={13} color="#fff" />
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
    segments.push({ x0: nodeX(i), y0: nodeY(i), x1: nodeX(i + 1), y1: nodeY(i + 1), walked });
  }

  return (
    <View style={{ height: mapHeight, width: '100%', overflow: 'hidden' }}>
      <View style={[styles.blob, { left: -30, top: mapHeight * 0.22, width: 140, height: 140, borderRadius: 70, backgroundColor: colors.primary, opacity: 0.05 }]} />
      <View style={[styles.blob, { right: -40, top: mapHeight * 0.55, width: 160, height: 160, borderRadius: 80, backgroundColor: colors.navy, opacity: 0.04 }]} />
      <Svg width="100%" height={mapHeight} style={{ position: 'absolute' }}>
        {segments.map((seg, i) => (
          seg.walked ? (
            <BrickSegment key={i} x0={seg.x0} y0={seg.y0} x1={seg.x1} y1={seg.y1} />
          ) : (
            <Path
              key={i}
              d={segmentPath(seg.x0, seg.y0, seg.x1, seg.y1)}
              stroke={colors.border}
              strokeWidth={9}
              strokeLinecap="round"
              fill="none"
              strokeDasharray="2 13"
            />
          )
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
    borderWidth: 3,
    opacity: 0.35,
  },
  haloOuter: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'dashed',
    opacity: 0.22,
  },
  sparkle: {
    position: 'absolute',
    fontSize: 19,
    fontWeight: '900',
  },
  doneBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 27,
    height: 27,
    borderRadius: 14,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hereBadge: {
    paddingHorizontal: 11,
    paddingVertical: 4,
    borderRadius: 11,
    marginBottom: 8,
  },
  hereBadgeTxt: {
    fontSize: 13,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  label: {
    marginTop: 11,
    fontSize: 15.5,
    fontWeight: '700',
    textAlign: 'center',
    width: LABEL_WIDTH,
    lineHeight: 20,
  },
  labelCurrent: {
    fontFamily: TYPOGRAPHY.headingFamily,
    fontSize: 17,
  },
});
