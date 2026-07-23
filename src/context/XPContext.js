import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { getCurrentLevel, getLevelProgress, getXPToNextLevel, addXP as addXPLib, isDoubleXPWeekend } from '../lib/xp';

const XPContext = createContext({
  totalXP: 0, level: null, progress: 0, xpToNext: 0,
  isDoubleXP: false, addXP: () => {}, levelUpEvent: null, clearLevelUp: () => {},
});

export function XPProvider({ children }) {
  const { user } = useAuth();
  const [totalXP, setTotalXP]         = useState(0);
  const [levelUpEvent, setLevelUpEvent] = useState(null);

  useEffect(() => {
    if (!user) { setTotalXP(0); return; }
    supabase
      .from('profiles')
      .select('total_xp')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => { if (data?.total_xp != null) setTotalXP(data.total_xp); });
  }, [user]);

  const addXP = useCallback(async (action) => {
    if (!user) return 0;
    const { amount, newTotal, levelUp } = await addXPLib(user.id, action, supabase);
    if (newTotal !== null) setTotalXP(newTotal);
    if (levelUp) setLevelUpEvent(levelUp);
    return amount;
  }, [user]);

  const level    = getCurrentLevel(totalXP);
  const progress = getLevelProgress(totalXP);
  const xpToNext = getXPToNextLevel(totalXP);

  return (
    <XPContext.Provider value={{
      totalXP, level, progress, xpToNext,
      isDoubleXP: isDoubleXPWeekend(),
      addXP,
      levelUpEvent,
      clearLevelUp: () => setLevelUpEvent(null),
    }}>
      {children}
    </XPContext.Provider>
  );
}

export const useXP = () => useContext(XPContext);
