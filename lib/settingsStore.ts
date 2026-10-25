import { create } from 'zustand';
import { getAppSetting, setAppSetting } from './database';

const UNIT_KEY = 'weight_unit_kg';

interface SettingsState {
  useKg: boolean;
  loaded: boolean;
  /** Charge la préférence persistée. À appeler une fois au démarrage. */
  loadSettings: () => void;
  /** Bascule kg <-> lbs et persiste immédiatement le choix. */
  toggleUnit: () => void;
  setUseKg: (useKg: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  useKg: true,
  loaded: false,

  loadSettings: () => {
    const stored = getAppSetting(UNIT_KEY);
    // Par défaut kg (stored === null signifie première utilisation)
    set({ useKg: stored !== '0', loaded: true });
  },

  toggleUnit: () => {
    const next = !get().useKg;
    setAppSetting(UNIT_KEY, next ? '1' : '0');
    set({ useKg: next });
  },

  setUseKg: (useKg: boolean) => {
    setAppSetting(UNIT_KEY, useKg ? '1' : '0');
    set({ useKg });
  },
}));
