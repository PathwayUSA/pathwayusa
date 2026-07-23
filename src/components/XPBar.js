import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ShimmerView from './ShimmerView';

export default function XPBar({ totalXP = 0, level, progress = 0, xpToNext = 0, isDoubleXP = false }) {
  const barWidth  = useRef(new Animated.Value(0)).current;
  const BAR_W     = 260;

  useEffect(() => {
    Animated.timing(barWidth, {
      toValue: progress * BAR_W,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <View style={styles.levelNameRow}>
          <Ionicons name={level?.iconName ?? 'leaf-outline'} size={11} color="rgba(255,255,255,0.85)" />
          <Text style={styles.levelName}>{level?.name}</Text>
        </View>
        <Text style={styles.xpText}>
          {isDoubleXP ? '2× ' : ''}{totalXP.toLocaleString()} XP
          {xpToNext > 0 ? ` · ${xpToNext} to next` : ''}
        </Text>
      </View>
      <ShimmerView width={BAR_W} style={styles.barBg}>
        <Animated.View style={[styles.barFill, { width: barWidth, backgroundColor: level?.color ?? '#2BC5B4' }]} />
      </ShimmerView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:     { width: 260, gap: 5 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  levelNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  levelName:{ fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  xpText:   { fontSize: 11, color: 'rgba(255,255,255,0.75)' },
  barBg:    { width: 260, height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' },
  barFill:  { height: 6, borderRadius: 3 },
});
