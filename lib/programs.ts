import type { TrainingProgram } from '../types';

// ============================================================
// Programmes d'entraînement statiques
// ============================================================

/**
 * Programmes d'entraînement prédéfinis. Les noms d'exercices correspondent
 * exactement à ceux de PREDEFINED_EXERCISES (constants/exercises.ts) pour
 * que l'autocomplete et les stats (historique, 1RM...) s'appliquent direct.
 */
export const TRAINING_PROGRAMS: TrainingProgram[] = [
  {
    id: 'ppl',
    name: 'Push / Pull / Legs',
    description: 'Le classique en 6 jours : pousser, tirer, jambes. Idéal si tu peux t\'entraîner souvent.',
    daysPerWeek: 6,
    days: [
      {
        label: 'Push (Pecs/Épaules/Triceps)',
        emoji: '🫸',
        muscleGroups: ['Pectoraux', 'Épaules', 'Triceps'],
        exerciseNames: [
          'Développé couché Smith',
          'Chest press incliné',
          'Shoulder press',
          'Pec fly incliné',
          'Triceps poulie',
          'Dips machine',
        ],
      },
      {
        label: 'Pull (Dos/Biceps)',
        emoji: '🫷',
        muscleGroups: ['Dos', 'Biceps'],
        exerciseNames: [
          'Traction',
          'Lat pulldown',
          'Seated row',
          'Biceps curl',
          'Curl haltère',
          'Face pull',
        ],
      },
      {
        label: 'Legs (Jambes)',
        emoji: '🦵',
        muscleGroups: ['Jambes'],
        exerciseNames: [
          'Squat libre',
          'Leg press',
          'Hack squat',
          'Leg extension / curl',
          'Triceps sural (Mollets)',
          'Abdominaux',
        ],
      },
      {
        label: 'Push B (Pecs/Épaules/Triceps)',
        emoji: '🫸',
        muscleGroups: ['Pectoraux', 'Épaules', 'Triceps'],
        exerciseNames: [
          'Chest press incliné',
          'Pec fly',
          'Shoulder press',
          'Élévations latérales',
          'Dips assistés',
          'Triceps corde',
        ],
      },
      {
        label: 'Pull B (Dos/Biceps)',
        emoji: '🫷',
        muscleGroups: ['Dos', 'Biceps'],
        exerciseNames: [
          'Traction',
          'Seated row',
          'Rear delt',
          'Curl barre EZ',
          'Curl haltère',
          'Face pull',
        ],
      },
      {
        label: 'Legs B (Jambes)',
        emoji: '🦵',
        muscleGroups: ['Jambes'],
        exerciseNames: [
          'Squat Smith',
          'Hack squat',
          'Leg extension / curl',
          'Hip adduction',
          'Triceps sural (Mollets)',
          'Abdominaux',
        ],
      },
    ],
  },
  {
    id: 'full-body',
    name: 'Full Body 3j',
    description: 'Tout le corps à chaque séance, 3 fois par semaine. Parfait pour débuter ou avec peu de temps.',
    daysPerWeek: 3,
    days: [
      {
        label: 'Séance A',
        emoji: '💪',
        muscleGroups: ['Pectoraux', 'Dos', 'Jambes', 'Épaules', 'Biceps'],
        exerciseNames: [
          'Squat libre',
          'Développé couché Smith',
          'Seated row',
          'Shoulder press',
          'Biceps curl',
          'Abdominaux',
        ],
      },
      {
        label: 'Séance B',
        emoji: '🔥',
        muscleGroups: ['Pectoraux', 'Dos', 'Jambes', 'Épaules', 'Triceps'],
        exerciseNames: [
          'Leg press',
          'Chest press incliné',
          'Traction',
          'Rear delt',
          'Triceps poulie',
          'Abdominaux',
        ],
      },
      {
        label: 'Séance C',
        emoji: '⚡',
        muscleGroups: ['Jambes', 'Pectoraux', 'Dos', 'Épaules', 'Biceps'],
        exerciseNames: [
          'Hack squat',
          'Pec fly incliné',
          'Lat pulldown',
          'Face pull',
          'Curl haltère',
          'Abdominaux',
        ],
      },
    ],
  },
  {
    id: 'upper-lower',
    name: 'Haut/Bas 4j',
    description: 'Haut du corps / bas du corps en 4 jours par semaine. Bon compromis fréquence/récupération.',
    daysPerWeek: 4,
    days: [
      {
        label: 'Haut du corps A',
        emoji: '💪',
        muscleGroups: ['Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps'],
        exerciseNames: [
          'Développé couché Smith',
          'Seated row',
          'Shoulder press',
          'Lat pulldown',
          'Biceps curl',
          'Triceps poulie',
        ],
      },
      {
        label: 'Bas du corps A',
        emoji: '🦵',
        muscleGroups: ['Jambes'],
        exerciseNames: [
          'Squat libre',
          'Leg press',
          'Leg extension / curl',
          'Hip adduction',
          'Triceps sural (Mollets)',
          'Abdominaux',
        ],
      },
      {
        label: 'Haut du corps B',
        emoji: '🔥',
        muscleGroups: ['Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps'],
        exerciseNames: [
          'Chest press incliné',
          'Traction',
          'Pec fly',
          'Rear delt',
          'Curl barre EZ',
          'Dips assistés',
        ],
      },
      {
        label: 'Bas du corps B',
        emoji: '⚡',
        muscleGroups: ['Jambes'],
        exerciseNames: [
          'Hack squat',
          'Squat Smith',
          'Leg extension / curl',
          'Pistol squat',
          'Triceps sural (Mollets)',
          'Abdominaux',
        ],
      },
    ],
  },
];

/** Retourne un programme par son id */
export function getProgramById(id: string): TrainingProgram | undefined {
  return TRAINING_PROGRAMS.find((p) => p.id === id);
}
