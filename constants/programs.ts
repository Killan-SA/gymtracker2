import type { TrainingProgram } from '../types';

/**
 * Programmes d'entraînement prédéfinis. Les noms d'exercices correspondent
 * exactement à ceux de PREDEFINED_EXERCISES (constants/exercises.ts) pour
 * que l'autocomplete et les stats (historique, 1RM...) s'appliquent direct.
 */
export const TRAINING_PROGRAMS: TrainingProgram[] = [
  {
    id: 'ppl',
    name: 'Push / Pull / Legs',
    description: 'Le classique en 3 ou 6 jours : pousser, tirer, jambes. Idéal si tu peux t\'entraîner souvent.',
    daysPerWeek: 3,
    days: [
      {
        label: 'Push (Pecs/Épaules/Triceps)',
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
        exerciseNames: [
          'Squat libre',
          'Leg press',
          'Hack squat',
          'Leg extension / curl',
          'Triceps sural (Mollets)',
          'Abdominaux',
        ],
      },
    ],
  },
  {
    id: 'upper-lower',
    name: 'Upper / Lower',
    description: 'Haut du corps / bas du corps en 4 jours par semaine. Bon compromis fréquence/récupération.',
    daysPerWeek: 4,
    days: [
      {
        label: 'Haut du corps A',
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
  {
    id: 'full-body',
    name: 'Full Body',
    description: 'Tout le corps à chaque séance, 3 fois par semaine. Parfait pour débuter ou avec peu de temps.',
    daysPerWeek: 3,
    days: [
      {
        label: 'Séance A',
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
];

export function getProgramById(id: string): TrainingProgram | undefined {
  return TRAINING_PROGRAMS.find((p) => p.id === id);
}
