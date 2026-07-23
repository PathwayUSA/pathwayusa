import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function DisclaimerBanner({ style }) {
  return (
    <View style={[styles.wrap, style]}>
      <Text style={styles.text}>
        ⚠️ This is general guidance based on publicly available USCIS information. Immigration laws change frequently. Your situation may differ. Always consult a licensed immigration attorney before making any decisions about your immigration status.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#FFF9E6',
    borderLeftWidth: 3,
    borderLeftColor: '#F5A623',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  text: {
    fontSize: 12,
    color: '#7A5800',
    lineHeight: 18,
    fontWeight: '500',
  },
});
