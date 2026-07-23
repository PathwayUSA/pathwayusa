import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function FloatingSpeechButton({ speaking, onPress, color = '#0047bb' }) {
  const insets = useSafeAreaInsets();
  const bottom = insets.bottom + 60 + 16;

  return (
    <View style={[styles.wrap, { bottom }]} pointerEvents="box-none">
      <TouchableOpacity
        style={[styles.btn, speaking && styles.btnActive]}
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={speaking ? 'Stop reading aloud' : 'Read aloud'}
      >
        <Ionicons
          name={speaking ? 'stop-circle' : 'volume-high'}
          size={32}
          color="#fff"
        />
        <View style={styles.badge}>
          <Text style={styles.badgeTxt}>{speaking ? 'STOP' : 'READ\nALOUD'}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 20,
    alignItems: 'center',
    zIndex: 999,
  },
  btn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0047bb',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0047bb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
  btnActive: {
    backgroundColor: '#bb0014',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#bb0014',
    borderRadius: 999,
    paddingHorizontal: 5,
    paddingVertical: 2,
    minWidth: 28,
    alignItems: 'center',
  },
  badgeTxt: {
    fontSize: 7,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
