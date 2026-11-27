import { Alert, Platform } from 'react-native';

// react-native-web's Alert.alert is a literal no-op (static alert() {}) —
// calling it on web silently does nothing, which made several flows (error
// messages, confirmations) appear broken on the deployed web build with no
// indication anything went wrong. This mirrors Alert.alert's real signature
// (title, message?, buttons?) so it's a near drop-in replacement, but
// actually shows something on web via window.confirm/alert.
export function showAlert(title, message, buttons) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  const text = message ? `${title}\n\n${message}` : title;

  if (!buttons || buttons.length <= 1) {
    window.alert(text);
    buttons?.[0]?.onPress?.();
    return;
  }

  // Map a 2+ button Alert to a yes/no confirm: the destructive/primary
  // action (the last non-cancel button) fires on OK, the cancel button
  // (if any) fires on Cancel. Good enough for every confirm-dialog shape
  // actually used in this app (none have 3+ meaningfully distinct actions).
  const cancelBtn = buttons.find((b) => b.style === 'cancel');
  const actionBtn = buttons.find((b) => b.style !== 'cancel') ?? buttons[buttons.length - 1];
  if (window.confirm(text)) {
    actionBtn?.onPress?.();
  } else {
    cancelBtn?.onPress?.();
  }
}
