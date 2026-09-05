import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TYPOGRAPHY } from '../theme';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Errors are silently captured — in production you would send to Sentry
    console.warn('[ErrorBoundary]', error.message, info.componentStack?.split('\n')[1]);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <Ionicons name="alert-circle-outline" size={52} color="#f44336" />
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          This section ran into an unexpected error. Your data is safe.
        </Text>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => this.setState({ hasError: false, error: null })}
          activeOpacity={0.85}
        >
          <Text style={styles.btnTxt}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#fafafa' },
  title:     { fontFamily: TYPOGRAPHY.headingFamily, fontSize: TYPOGRAPHY.headingSize, lineHeight: TYPOGRAPHY.headingLineHeight, color: '#1a1a2e', marginTop: 16, marginBottom: 8 },
  body:      { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 21, marginBottom: 28 },
  btn:       { backgroundColor: '#1a9e89', paddingVertical: 14, paddingHorizontal: 36, borderRadius: 14 },
  btnTxt:    { color: '#fff', fontSize: 15, fontWeight: '800' },
});
