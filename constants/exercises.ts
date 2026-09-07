// ============================================================
// Liste des exercices prédéfinis — organisés par catégorie
// ============================================================

export interface ExerciseEntry {
  name: string;
  category: string;
}

export const EXERCISE_CATEGORIES = [
  'Abdominaux',
  'Biceps',
  'Triceps',
  'Poitrine',
  'Épaules',
  'Dos',
  'Jambes',
  'Cardio',
] as const;

export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];

export const PREDEFINED_EXERCISES: ExerciseEntry[] = [
  // ── Abdominaux ──────────────────────────────────────────────
  { name: 'Abdominal crunch', category: 'Abdominaux' },
  { name: 'Abdo poulie', category: 'Abdominaux' },

  // ── Biceps ──────────────────────────────────────────────────
  { name: 'Arm curl', category: 'Biceps' },
  { name: 'Avant bras haltère', category: 'Biceps' },
  { name: 'Avant bras tirage', category: 'Biceps' },
  { name: 'Avant bras tirage descendant', category: 'Biceps' },
  { name: 'Barre EZ biceps', category: 'Biceps' },
  { name: 'Biceps machine', category: 'Biceps' },
  { name: 'Biceps curl haltère', category: 'Biceps' },
  { name: 'Biceps curl marteau', category: 'Biceps' },
  { name: 'Biceps curl poulie', category: 'Biceps' },
  { name: 'Biceps curl tirage', category: 'Biceps' },
  { name: 'Biceps poulie corde', category: 'Biceps' },
  { name: 'Biceps poulie bras attaché', category: 'Biceps' },
  { name: 'Biceps poulie barre T', category: 'Biceps' },
  { name: 'Curl haltère', category: 'Biceps' },
  { name: 'Curl marteau', category: 'Biceps' },

  // ── Triceps ──────────────────────────────────────────────────
  { name: 'Dips', category: 'Triceps' },
  { name: 'Dips machine', category: 'Triceps' },
  { name: 'Seated dip', category: 'Triceps' },
  { name: 'Triceps poulie', category: 'Triceps' },
  { name: 'Triceps poulie corde', category: 'Triceps' },
  { name: 'Triceps poulie dos', category: 'Triceps' },
  { name: 'Triceps poulie barre T', category: 'Triceps' },
  { name: 'Triceps curl dos poulie', category: 'Triceps' },
  { name: 'Triceps poulie avec banc incliné', category: 'Triceps' },

  // ── Poitrine ──────────────────────────────────────────────────
  { name: 'Chest press', category: 'Poitrine' },
  { name: 'Converging chest press', category: 'Poitrine' },
  { name: 'Développé couché', category: 'Poitrine' },
  { name: 'Développé couché Smith', category: 'Poitrine' },
  { name: 'Développé couché incliné', category: 'Poitrine' },
  { name: 'Supine press', category: 'Poitrine' },
  { name: 'Pec fly', category: 'Poitrine' },
  { name: 'Pec machine', category: 'Poitrine' },
  { name: 'Push pec', category: 'Poitrine' },
  { name: 'Pompes', category: 'Poitrine' },

  // ── Épaules ──────────────────────────────────────────────────
  { name: 'Développé épaule', category: 'Épaules' },
  { name: 'Développé épaule Smith', category: 'Épaules' },
  { name: 'Développé épaule incliné Smith', category: 'Épaules' },
  { name: 'Shoulder press', category: 'Épaules' },
  { name: 'Converge shoulder press', category: 'Épaules' },
  { name: 'Épaule machine', category: 'Épaules' },
  { name: 'Face pull', category: 'Épaules' },
  { name: 'Rear delt', category: 'Épaules' },

  // ── Dos ──────────────────────────────────────────────────────
  { name: 'Lat pulldown', category: 'Dos' },
  { name: 'Diverging lat pull-down', category: 'Dos' },
  { name: 'Tirage vertical', category: 'Dos' },
  { name: 'Tirage horizontal machine', category: 'Dos' },
  { name: 'Seated row', category: 'Dos' },
  { name: 'Diverging seated row', category: 'Dos' },
  { name: 'Traction', category: 'Dos' },
  { name: 'Traction assistée', category: 'Dos' },
  { name: 'Traction assistée large', category: 'Dos' },
  { name: 'Traction machine', category: 'Dos' },
  { name: 'Traction et dips assisté', category: 'Dos' },
  { name: 'Lombaire', category: 'Dos' },

  // ── Jambes ──────────────────────────────────────────────────
  { name: 'Hack squat', category: 'Jambes' },
  { name: 'Hip adduction', category: 'Jambes' },
  { name: 'Leg curl', category: 'Jambes' },
  { name: 'Seated leg curl', category: 'Jambes' },
  { name: 'Prone leg curl', category: 'Jambes' },
  { name: 'Leg extension', category: 'Jambes' },
  { name: 'Leg press', category: 'Jambes' },
  { name: 'Perfect squat', category: 'Jambes' },
  { name: 'Pistol squat avec barre', category: 'Jambes' },
  { name: 'Squat profond', category: 'Jambes' },
  { name: 'Squat Smith', category: 'Jambes' },
  { name: 'Triceps sural (Mollets)', category: 'Jambes' },

  // ── Cardio ──────────────────────────────────────────────────
  { name: 'Marche inclinée', category: 'Cardio' },
  { name: 'Rameur', category: 'Cardio' },
];

/** Recherche insensible à la casse et aux accents */
export function searchExercises(query: string): ExerciseEntry[] {
  if (!query.trim()) return PREDEFINED_EXERCISES;
  const normalize = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const q = normalize(query);
  return PREDEFINED_EXERCISES.filter((e) => normalize(e.name).includes(q));
}

/** Retourne les exercices d'une catégorie */
export function getByCategory(category: string): ExerciseEntry[] {
  return PREDEFINED_EXERCISES.filter((e) => e.category === category);
}
