import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const VFX_KEY = '@pathwayusa/visual_effects';
const VisualEffectsContext = createContext({ enabled: true, toggle: () => {} });

export function VisualEffectsProvider({ children }) {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(VFX_KEY).then((v) => {
      if (v !== null) setEnabled(v === 'true');
    }).catch(() => {});
  }, []);

  const toggle = useCallback(async (val) => {
    setEnabled(val);
    try { await AsyncStorage.setItem(VFX_KEY, String(val)); } catch (_) {}
  }, []);

  return (
    <VisualEffectsContext.Provider value={{ enabled, toggle }}>
      {children}
    </VisualEffectsContext.Provider>
  );
}

export const useVisualEffects = () => useContext(VisualEffectsContext);
