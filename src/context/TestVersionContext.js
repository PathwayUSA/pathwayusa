import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TV_KEY = '@pathwayusa/civics_test_version';
const TestVersionContext = createContext(null);

export function TestVersionProvider({ children }) {
  const [testVersion, setTestVersionState] = useState(undefined); // undefined = still loading

  useEffect(() => {
    AsyncStorage.getItem(TV_KEY).then((v) => {
      setTestVersionState(v === '2008' || v === '2025' || v === 'unsure' ? v : null);
    }).catch(() => setTestVersionState(null));
  }, []);

  const setTestVersion = useCallback(async (v) => {
    setTestVersionState(v);
    await AsyncStorage.setItem(TV_KEY, v);
  }, []);

  const quizSize      = testVersion === '2025' ? 20 : 10;
  const passThreshold = testVersion === '2025' ? 12 : 6;

  return (
    <TestVersionContext.Provider value={{ testVersion, setTestVersion, quizSize, passThreshold }}>
      {children}
    </TestVersionContext.Provider>
  );
}

export function useTestVersion() {
  return useContext(TestVersionContext);
}
