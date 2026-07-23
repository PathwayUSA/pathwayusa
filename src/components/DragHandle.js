import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function DragHandle({ color = '#d0d0d0', style }) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={[styles.handle, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:   { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  handle: { width: 40, height: 4, borderRadius: 2 },
});
