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
  rpe: number | null;     // Difficulté ressentie (RPE/RIR), 1-10
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

/** Statut de progression pour la détection de plateau/deload */
export type PlateauStatus = 'progressing' | 'plateau' | 'declining' | 'insufficient_data';

/** Statistiques d'un exercice */
export interface ExerciseStats {
  name: string;
  personalRecord: number;         // Poids max tous temps
  lastWeight: number;             // Poids lors de la dernière séance
  totalSessions: number;          // Nombre de fois pratiqué
  progressionPercent: number;     // Progression sur 30 jours (%)
  weightHistory: ChartPoint[];    // Historique pour le graphique
  estimatedOneRM: number;         // Meilleur 1RM estimé (formule d'Epley), en kg
  oneRMHistory: ChartPoint[];     // Historique du 1RM estimé par séance
  plateau: {
    status: PlateauStatus;
    sessionsSinceProgress: number; // Nb de séances depuis le dernier record
    message: string;               // Message explicatif à afficher
  };
}

/** Volume total pour un groupe musculaire donné */
export interface CategoryVolume {
  category: string;
  volume: number;
}

/** Stats du tableau de bord */
export interface DashboardStats {
  weeklyVolume: number;           // Volume total cette semaine (kg)
  monthlySessionCount: number;    // Séances ce mois
  totalSessionCount: number;      // Total des séances
  personalRecords: { name: string; weight: number }[];
  volumeByCategory: CategoryVolume[]; // Volume par groupe musculaire (30 derniers jours)
}
