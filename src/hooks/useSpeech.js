import { useState, useEffect, useCallback } from 'react';
import * as Speech from 'expo-speech';
import { useAuth } from '../context/AuthContext';

// Per-language natural settings (pitch + base rate at Normal speed)
const LANG_SETTINGS = {
  en: { language: 'en-US', pitch: 1.1,  rate: 0.85 },
  es: { language: 'es-ES', pitch: 1.1,  rate: 0.82 },
  ht: { language: 'ht-HT', pitch: 1.05, rate: 0.80 }, // no fallback — gated by `available` below
  zh: { language: 'zh-CN', pitch: 1.0,  rate: 0.80 },
  fr: { language: 'fr-FR', pitch: 1.1,  rate: 0.83 },
  pt: { language: 'pt-BR', pitch: 1.1,  rate: 0.83 },
  ar: { language: 'ar-SA', pitch: 1.0,  rate: 0.78 },
};

const SPEED_MULTIPLIER = {
  slow:   0.70,
  normal: 1.00,
  fast:   1.40,
};

export function useSpeech(lang) {
  const { profile } = useAuth();
  const [speaking, setSpeaking] = useState(false);
  // Only Haitian Creole needs a device-voice check today — every other
  // LANG_SETTINGS entry maps to a voice that ships on iOS/Android by default.
  const [available, setAvailable] = useState(lang !== 'ht');

  useEffect(() => () => { Speech.stop(); }, []);

  useEffect(() => {
    if (lang !== 'ht') { setAvailable(true); return; }
    let cancelled = false;
    Speech.getAvailableVoicesAsync()
      .then((voices) => {
        if (cancelled) return;
        const hasKreyol = (voices ?? []).some((v) => v.language?.toLowerCase().startsWith('ht'));
        setAvailable(hasKreyol);
      })
      .catch(() => { if (!cancelled) setAvailable(false); });
    return () => { cancelled = true; };
  }, [lang]);

  const readingSpeed = profile?.reading_speed ?? 'normal';

  const speak = useCallback((text) => {
    // Do NOT call Speech.stop() here — stop() is async; its onStopped callback fires
    // after setSpeaking(true) and would reset state, silently killing the new utterance.
    if (!available) return; // e.g. no Kreyòl voice on this device — never fall back to another language
    const settings    = LANG_SETTINGS[lang] ?? LANG_SETTINGS.en;
    const multiplier  = SPEED_MULTIPLIER[readingSpeed] ?? 1.0;
    const rate        = settings.rate * multiplier;

    setSpeaking(true);
    Speech.speak(text, {
      language: settings.language,
      pitch:    settings.pitch,
      rate,
      volume:   1.0,
      onDone:    () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError:   (err) => { console.warn('[useSpeech] error:', err); setSpeaking(false); },
    });
  }, [lang, readingSpeed, available]);

  const stop = useCallback(() => {
    Speech.stop();
    setSpeaking(false);
  }, []);

  return { speaking, speak, stop, available };
}
