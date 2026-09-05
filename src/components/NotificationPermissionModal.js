import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { SHADOWS, TYPOGRAPHY } from '../theme';

export default function NotificationPermissionModal({ visible, onEnable, onDismiss }) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="notifications" size={34} color={colors.primary} />
          </View>

          <Text style={styles.title}>Stay on track with reminders</Text>
          <Text style={styles.body}>
            PathwayUSA can remind you about deadlines and next steps so you never miss an important date.
          </Text>

          <View style={styles.benefitList}>
            {[
              { icon: 'calendar-outline',   text: 'Deadline alerts 30, 7, and 1 day before' },
              { icon: 'flag-outline',       text: 'Gentle nudge if you go 2 weeks without progress' },
              { icon: 'ribbon-outline',     text: 'Citizenship eligibility milestone alerts' },
            ].map((item) => (
              <View key={item.text} style={styles.benefitRow}>
                <Ionicons name={item.icon} size={16} color={colors.primary} />
                <Text style={styles.benefitTxt}>{item.text}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.enableBtn, { backgroundColor: colors.primary }]}
            onPress={onEnable}
            activeOpacity={0.85}
          >
            <Ionicons name="notifications" size={18} color="#fff" />
            <Text style={styles.enableTxt}>Turn On Reminders</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.laterBtn} onPress={onDismiss} activeOpacity={0.7}>
            <Text style={styles.laterTxt}>Maybe Later</Text>
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
    padding: 28,
    paddingBottom: 40,
    gap: 16,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontFamily: TYPOGRAPHY.displayFamily,
    fontSize: TYPOGRAPHY.displaySize,
    letterSpacing: TYPOGRAPHY.displayLetterSpacing,
    lineHeight: TYPOGRAPHY.displayLineHeight,
    color: '#1A1A2E',
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 23,
    maxWidth: 300,
  },
  benefitList: {
    alignSelf: 'stretch',
    gap: 12,
    backgroundColor: '#F5F7F5',
    borderRadius: 14,
    padding: 16,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  benefitTxt: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    flex: 1,
  },
  enableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    height: 56,
    alignSelf: 'stretch',
  },
  enableTxt: {
    fontSize: 17,
    fontWeight: '900',
    color: '#fff',
  },
  laterBtn: {
    paddingVertical: 8,
  },
  laterTxt: {
    fontSize: 15,
    color: '#BDC3C7',
    fontWeight: '600',
  },
});
