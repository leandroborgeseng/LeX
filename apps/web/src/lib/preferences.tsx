import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'lex_entity_filter_id';

type PreferencesContextValue = {
  /** `null` = todas as entidades */
  entityFilterId: string | null;
  setEntityFilterId: (id: string | null) => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function readStoredEntityId(): string | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [entityFilterId, setEntityFilterIdState] = useState<string | null>(readStoredEntityId);

  const setEntityFilterId = useCallback((id: string | null) => {
    setEntityFilterIdState(id);
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({ entityFilterId, setEntityFilterId }),
    [entityFilterId, setEntityFilterId],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error('usePreferences must be used within PreferencesProvider');
  }
  return ctx;
}
