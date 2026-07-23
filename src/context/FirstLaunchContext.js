import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FIRST_LAUNCH_KEY = '@pathwayusa/first_launch_done';

const FirstLaunchContext = createContext({
  shouldShow: false,
  isReplay: false,
  markDone: () => {},
  replay: () => {},
});

export function FirstLaunchProvider({ children }) {
  const [shouldShow, setShouldShow] = useState(false);
  const [isReplay, setIsReplay]     = useState(false);
  const [loaded, setLoaded]         = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(FIRST_LAUNCH_KEY).then((v) => {
      if (!v) setShouldShow(true);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const markDone = useCallback(() => {
    setShouldShow(false);
    setIsReplay(false);
    AsyncStorage.setItem(FIRST_LAUNCH_KEY, '1').catch(() => {});
  }, []);

  const replay = useCallback(() => {
    setIsReplay(true);
    setShouldShow(true);
  }, []);

  if (!loaded) return null;

  return (
    <FirstLaunchContext.Provider value={{ shouldShow, isReplay, markDone, replay }}>
      {children}
    </FirstLaunchContext.Provider>
  );
}

export const useFirstLaunch = () => useContext(FirstLaunchContext);
