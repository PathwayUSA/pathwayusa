import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TIPS_ENABLED_KEY = '@pathwayusa/helper_tips_enabled';

const HelperTipsContext = createContext({
  tipsEnabled:  true,
  setTipsEnabled: () => {},
  hasSeenTip:   () => false,
  markTipSeen:  () => {},
});

export function HelperTipsProvider({ children }) {
  const [tipsEnabled, setTipsEnabledState] = useState(true);
  // seenTips is in-memory only — resets each session so tips reappear on next launch
  const [seenTips, setSeenTips] = useState(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(TIPS_ENABLED_KEY).then((enabled) => {
      if (enabled !== null) setTipsEnabledState(JSON.parse(enabled));
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const setTipsEnabled = useCallback((val) => {
    setTipsEnabledState(val);
    AsyncStorage.setItem(TIPS_ENABLED_KEY, JSON.stringify(val)).catch(() => {});
  }, []);

  const hasSeenTip = useCallback((key) => seenTips.has(key), [seenTips]);

  const markTipSeen = useCallback((key) => {
    setSeenTips((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);

  if (!loaded) return children;

  return (
    <HelperTipsContext.Provider value={{ tipsEnabled, setTipsEnabled, hasSeenTip, markTipSeen }}>
      {children}
    </HelperTipsContext.Provider>
  );
}

export const useHelperTips = () => useContext(HelperTipsContext);
