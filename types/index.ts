// ============================================================
// Types principaux de GymTracker
// ============================================================

/** Une séance d'entraînement */
export interface Session {
  id: string;
  date: string;           // ISO 8601 ex: "2024-08-30T17:00:00"
  notes: string | null;
  created_at: string;
}

/** Un exercice dans une séance */
export interface Exercise {
  id: string;
  session_id: string;
  name: string;
  order_index: number;
  notes: string | null;
}

/** Une série : ex. 80kg × 10 reps */
export interface Set {
  id: string;
  exercise_id: string;
  set_number: number;
  weight: number;         // En kg
  reps: number;
  notes: string | null;
}

/** Nom d'exercice pour l'autocomplete */
export interface ExerciseName {
  name: string;
  last_used: string;
  use_count: number;
}

// ============================================================
// Types composites (jointures)
// ============================================================

/** Exercice avec toutes ses séries */
export interface ExerciseWithSets extends Exercise {
  sets: Set[];
}

/** Séance complète avec exercices et séries */
export interface SessionWithExercises extends Session {
  exercises: ExerciseWithSets[];
}

// ============================================================
// Types pour les statistiques
// ============================================================

/** Point de données pour un graphique */
export interface ChartPoint {
  date: string;
  value: number;
  label?: string;
}

/** Statistiques d'un exercice */
export interface ExerciseStats {
  name: string;
  personalRecord: number;             // Poids max tous temps
  lastWeight: number;                 // Poids lors de la dernière séance
  firstWeight: number;                // Poids lors de la première séance (base de départ)
  firstDate: string;                  // Date de la première séance
  totalSessions: number;              // Nombre de fois pratiqué
  progressionPercent: number;         // Progression sur 30 jours (%)
  progressionFromStart: number;       // Gain kg depuis le début
  progressionFromStartPercent: number;// Gain % depuis le début
  estimated1RM: number;               // 1RM estimé par formule d'Epley
  plateauDetected: boolean;           // Plateau détecté sur les 3 dernières séances
  weightHistory: ChartPoint[];        // Historique poids max par séance
  volumeHistory: ChartPoint[];        // Historique volume (poids×reps) par séance
  repsHistory: ChartPoint[];          // Historique reps max par séance
}

/** Stats du tableau de bord */
export interface DashboardStats {
  weeklyVolume: number;           // Volume total cette semaine (kg)
  monthlySessionCount: number;    // Séances ce mois
  totalSessionCount: number;      // Total des séances
  personalRecords: { name: string; weight: number }[];
}

/** Volume par groupe musculaire */
export interface MuscleGroupVolume {
  category: string;
  volume: number;
}
