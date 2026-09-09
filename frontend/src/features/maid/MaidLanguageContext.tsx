import React, { createContext, useContext, useMemo, useState } from 'react';

export type MaidLanguage = 'en' | 'hi';

type MaidLanguageContextValue = {
  language: MaidLanguage;
  setLanguage: (language: MaidLanguage) => void;
};

const MaidLanguageContext = createContext<MaidLanguageContextValue | undefined>(undefined);

export function MaidLanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<MaidLanguage>('en');

  const value = useMemo(() => ({ language, setLanguage }), [language]);

  return (
    <MaidLanguageContext.Provider value={value}>
      {children}
    </MaidLanguageContext.Provider>
  );
}

export function useMaidLanguage() {
  const context = useContext(MaidLanguageContext);
  if (!context) {
    throw new Error('useMaidLanguage must be used inside MaidLanguageProvider');
  }
  return context;
}
