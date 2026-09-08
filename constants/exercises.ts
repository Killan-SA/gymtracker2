// ============================================================
// Liste des exercices — basée sur les séances réelles de l'utilisateur
// ============================================================

export interface ExerciseEntry {
  name: string;
  category: string;
}

export const EXERCISE_CATEGORIES = [
  'Biceps',
  'Triceps',
  'Poitrine',
  'Dos',
  'Épaules',
  'Jambes',
  'Abdominaux',
  'Cardio',
] as const;

export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];

/** Exercices au poids du corps — le poids = PDC de l'utilisateur */
export const BODYWEIGHT_EXERCISES = ['Pompes', 'Traction', 'Pistol squat'];

export const PREDEFINED_EXERCISES: ExerciseEntry[] = [
  // ── Biceps ──────────────────────────────────────────────────
  { name: 'Biceps curl',          category: 'Biceps' },
  { name: 'Biceps poulie',        category: 'Biceps' },
  { name: 'Curl haltère',         category: 'Biceps' },
  { name: 'Curl barre EZ',        category: 'Biceps' },
  { name: 'Avant-bras',           category: 'Biceps' },

  // ── Triceps ──────────────────────────────────────────────────
  { name: 'Triceps poulie',       category: 'Triceps' },
  { name: 'Dips machine',         category: 'Triceps' },
  { name: 'Dips assistés',        category: 'Triceps' },
  { name: 'Pompes',               category: 'Triceps' },

  // ── Poitrine ─────────────────────────────────────────────────
  { name: 'Pec fly',              category: 'Poitrine' },
  { name: 'Pec fly incliné',      category: 'Poitrine' },
  { name: 'Développé couché Smith', category: 'Poitrine' },
  { name: 'Chest press incliné',  category: 'Poitrine' },

  // ── Dos ──────────────────────────────────────────────────────
  { name: 'Traction',             category: 'Dos' },
  { name: 'Traction assistée',    category: 'Dos' },
  { name: 'Lat pulldown',         category: 'Dos' },
  { name: 'Seated row',           category: 'Dos' },
  { name: 'Lombaires',            category: 'Dos' },

  // ── Épaules ──────────────────────────────────────────────────
  { name: 'Shoulder press',       category: 'Épaules' },
  { name: 'Shoulder press Smith', category: 'Épaules' },
  { name: 'Rear delt',            category: 'Épaules' },
  { name: 'Face pull',            category: 'Épaules' },

  // ── Jambes ───────────────────────────────────────────────────
  { name: 'Leg extension / curl', category: 'Jambes' },
  { name: 'Hack squat',           category: 'Jambes' },
  { name: 'Leg press',            category: 'Jambes' },
  { name: 'Squat Smith',          category: 'Jambes' },
  { name: 'Squat libre',          category: 'Jambes' },
  { name: 'Hip adduction',        category: 'Jambes' },
  { name: 'Pistol squat',         category: 'Jambes' },
  { name: 'Triceps sural (Mollets)', category: 'Jambes' },

  // ── Abdominaux ───────────────────────────────────────────────
  { name: 'Abdominaux',           category: 'Abdominaux' },

  // ── Cardio ───────────────────────────────────────────────────
  { name: 'Rameur (Cardio)',      category: 'Cardio' },
  { name: 'Marche inclinée (Cardio)', category: 'Cardio' },
];

// ── Helpers ──────────────────────────────────────────────────

/** Normalise une chaîne pour la recherche insensible aux accents/casse */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Recherche dans la liste prédéfinie + dans les noms connus */
export function searchExercises(
  query: string,
  knownNames: string[] = []
): ExerciseEntry[] {
  const q = normalize(query.trim());
  if (!q) return [];

  const predefined = PREDEFINED_EXERCISES.filter((e) =>
    normalize(e.name).includes(q)
  );

  const knownMatches: ExerciseEntry[] = knownNames
    .filter((n) => normalize(n).includes(q) && !PREDEFINED_EXERCISES.some((e) => e.name === n))
    .map((n) => ({ name: n, category: 'Personnalisé' }));

  return [...predefined, ...knownMatches];
}

/** Retourne les exercices groupés par catégorie (pour SectionList) */
export function getExercisesByCategory(): { title: string; data: ExerciseEntry[] }[] {
  const map = new Map<string, ExerciseEntry[]>();
  for (const cat of EXERCISE_CATEGORIES) {
    map.set(cat, []);
  }
  for (const ex of PREDEFINED_EXERCISES) {
    map.get(ex.category)?.push(ex);
  }
  return Array.from(map.entries())
    .filter(([, items]) => items.length > 0)
    .map(([title, data]) => ({ title, data }));
}
