import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useOffline() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsOffline(!(state.isConnected && state.isInternetReachable !== false));
    });
    NetInfo.fetch().then((state) => {
      setIsOffline(!(state.isConnected && state.isInternetReachable !== false));
    });
    return unsub;
  }, []);

  return isOffline;
}

const KEYS = {
  quizQuestions: '@pathwayusa/quiz_questions',
  roadmapSteps:  '@pathwayusa/roadmap_steps',
  resources:     '@pathwayusa/resources',
};

export async function cacheData(key, data) {
  try {
    await AsyncStorage.setItem(KEYS[key] ?? key, JSON.stringify({ data, cachedAt: Date.now() }));
  } catch (_) {}
}

export async function getCachedData(key) {
  try {
    const raw = await AsyncStorage.getItem(KEYS[key] ?? key);
    if (!raw) return null;
    return JSON.parse(raw).data;
  } catch (_) {
    return null;
  }
}
