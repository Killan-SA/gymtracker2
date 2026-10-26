import { create } from 'zustand';
import { getAppSetting, setAppSetting, getUserSetting, setUserSetting } from '../lib/database';

// ============================================================
// Clés de persistance
// ============================================================

const UNIT_KEY = 'weight_unit_kg';
const THEME_KEY = 'themeId';
const PROGRAM_KEY = 'currentProgramId';
const PROGRAM_DAY_KEY = 'currentProgramDayIndex';

// ============================================================
// Interface du store
// ============================================================

interface SettingsState {
  useKg: boolean;
  loaded: boolean;
  themeId: string;
  currentProgramId: string | null;
  currentProgramDayIndex: number;

  /** Charge toutes les préférences persistées. À appeler une fois au démarrage. */
  loadSettings: () => void;

  /** Bascule kg <-> lbs et persiste immédiatement le choix. */
  toggleUnit: () => void;
  setUseKg: (useKg: boolean) => void;

  /** Change le thème de couleur actif et le persiste dans user_settings. */
  setThemeId: (themeId: string) => void;

  /** Sélectionne un programme et remet le compteur de jour à 0. */
  setCurrentProgram: (programId: string | null) => void;

  /** Avance au jour suivant du programme actif (cycle automatique). */
  advanceProgramDay: (totalDays: number) => void;

  /** Définit directement l'index du jour de programme. */
  setProgramDayIndex: (index: number) => void;
}

// ============================================================
// Store Zustand
// ============================================================

export const useSettingsStore = create<SettingsState>((set, get) => ({
  useKg: true,
  loaded: false,
  themeId: 'blue',
  currentProgramId: null,
  currentProgramDayIndex: 0,

  loadSettings: () => {
    // Unité de poids (app_settings — ancienne table)
    const stored = getAppSetting(UNIT_KEY);
    // Par défaut kg (stored === null signifie première utilisation)

    // Thème (user_settings)
    const storedTheme = getUserSetting(THEME_KEY);

    // Programme actif (user_settings)
    const storedProgramId = getUserSetting(PROGRAM_KEY);
    const storedDayIndex = getUserSetting(PROGRAM_DAY_KEY);

    set({
      useKg: stored !== '0',
      loaded: true,
      themeId: storedTheme ?? 'blue',
      currentProgramId: storedProgramId ?? null,
      currentProgramDayIndex: storedDayIndex ? parseInt(storedDayIndex, 10) || 0 : 0,
    });
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

  setThemeId: (themeId: string) => {
    setUserSetting(THEME_KEY, themeId);
    set({ themeId });
  },

  setCurrentProgram: (programId: string | null) => {
    if (programId === null) {
      setUserSetting(PROGRAM_KEY, '');
      setUserSetting(PROGRAM_DAY_KEY, '0');
      set({ currentProgramId: null, currentProgramDayIndex: 0 });
    } else {
      setUserSetting(PROGRAM_KEY, programId);
      setUserSetting(PROGRAM_DAY_KEY, '0');
      set({ currentProgramId: programId, currentProgramDayIndex: 0 });
    }
  },

  advanceProgramDay: (totalDays: number) => {
    const nextIndex = (get().currentProgramDayIndex + 1) % totalDays;
    setUserSetting(PROGRAM_DAY_KEY, nextIndex.toString());
    set({ currentProgramDayIndex: nextIndex });
  },

  setProgramDayIndex: (index: number) => {
    setUserSetting(PROGRAM_DAY_KEY, index.toString());
    set({ currentProgramDayIndex: index });
  },
}));
