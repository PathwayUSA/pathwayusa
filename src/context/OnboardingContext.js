import { createContext, useContext } from 'react';

export const OnboardingContext = createContext({ refresh: () => {} });
export const useOnboardingRefresh = () => useContext(OnboardingContext);
