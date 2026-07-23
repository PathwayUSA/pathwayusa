import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SpeechButton({ speaking, onPress, color = '#fff', size = 22, style }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={[styles.btn, style]}>
      <Ionicons name={speaking ? 'stop-circle' : 'volume-high-outline'} size={size} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { padding: 4 },
});
