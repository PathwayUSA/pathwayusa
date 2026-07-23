import React from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function NotificationPrePromptModal({ visible, onSure, onNotNow }) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.iconWrap}>
            <Ionicons name="notifications" size={34} color="#f57c00" />
          </View>
          <Text style={styles.title}>Stay on track, every morning</Text>
          <Text style={styles.body}>
            Want a daily reminder to keep your citizenship journey moving? We'll send you one short reminder each morning.
          </Text>
          <TouchableOpacity style={styles.sureBtn} onPress={onSure} activeOpacity={0.85}>
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={styles.sureTxt}>Sure!</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.notNowBtn} onPress={onNotNow} activeOpacity={0.75}>
            <Text style={styles.notNowTxt}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 0,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1a1a2e',
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontSize: 16,
    color: '#555',
    lineHeight: 26,
    textAlign: 'center',
    marginBottom: 28,
  },
  sureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f57c00',
    borderRadius: 16,
    paddingVertical: 18,
    width: '100%',
    minHeight: 56,
    marginBottom: 12,
  },
  sureTxt: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  notNowBtn: {
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  notNowTxt: {
    fontSize: 15,
    color: '#aaa',
    fontWeight: '600',
  },
});
