import dayjs from 'dayjs';
import { getDb, generateId, nowISO } from './database';
import type {
  Session,
  Exercise,
  Set,
  ExerciseWithSets,
  SessionWithExercises,
  ChartPoint,
  ExerciseStats,
  DashboardStats,
} from '../types';

// ============================================================
// SESSIONS
// ============================================================

/** Retourne toutes les séances, de la plus récente à la plus ancienne */
export function getAllSessions(): Session[] {
  const db = getDb();
  return db.getAllSync<Session>(
    'SELECT * FROM sessions ORDER BY date DESC'
  );
}

/** Retourne la dernière séance */
export function getLastSession(): Session | null {
  const db = getDb();
  return db.getFirstSync<Session>(
    'SELECT * FROM sessions ORDER BY date DESC LIMIT 1'
  ) ?? null;
}

/** Crée une nouvelle séance et la retourne */
export function createSession(notes?: string): Session {
  const db = getDb();
  const session: Session = {
    id: generateId(),
    date: nowISO(),
    notes: notes ?? null,
    created_at: nowISO(),
  };
  db.runSync(
    'INSERT INTO sessions (id, date, notes, created_at) VALUES (?, ?, ?, ?)',
    [session.id, session.date, session.notes, session.created_at]
  );
  return session;
}

/** Supprime une séance (et ses exercices/séries par cascade) */
export function deleteSession(sessionId: string): void {
  const db = getDb();
  db.runSync('DELETE FROM sessions WHERE id = ?', [sessionId]);
}

/** Retourne une séance avec tous ses exercices et séries */
export function getSessionWithExercises(sessionId: string): SessionWithExercises | null {
  const db = getDb();
  const session = db.getFirstSync<Session>(
    'SELECT * FROM sessions WHERE id = ?',
    [sessionId]
  );
  if (!session) return null;

  const exercises = db.getAllSync<Exercise>(
    'SELECT * FROM exercises WHERE session_id = ? ORDER BY order_index',
    [sessionId]
  );

  const exercisesWithSets: ExerciseWithSets[] = exercises.map((ex) => {
    const sets = db.getAllSync<Set>(
      'SELECT * FROM sets WHERE exercise_id = ? ORDER BY set_number',
      [ex.id]
    );
    return { ...ex, sets };
  });

  return { ...session, exercises: exercisesWithSets };
}

// ============================================================
// EXERCISES
// ============================================================

/** Ajoute un exercice à une séance */
export function addExerciseToSession(
  sessionId: string,
  name: string,
  notes?: string
): Exercise {
  const db = getDb();

  // Calcule le prochain order_index
  const result = db.getFirstSync<{ max_order: number | null }>(
    'SELECT MAX(order_index) as max_order FROM exercises WHERE session_id = ?',
    [sessionId]
  );
  const orderIndex = (result?.max_order ?? -1) + 1;

  const exercise: Exercise = {
    id: generateId(),
    session_id: sessionId,
    name: name.trim(),
    order_index: orderIndex,
    notes: notes ?? null,
  };

  db.runSync(
    'INSERT INTO exercises (id, session_id, name, order_index, notes) VALUES (?, ?, ?, ?, ?)',
    [exercise.id, exercise.session_id, exercise.name, exercise.order_index, exercise.notes]
  );

  // Met à jour l'autocomplete
  db.runSync(
    `INSERT INTO exercise_names (name, last_used, use_count)
     VALUES (?, ?, 1)
     ON CONFLICT(name) DO UPDATE SET
       last_used = excluded.last_used,
       use_count = use_count + 1`,
    [exercise.name, nowISO()]
  );

  return exercise;
}

/** Supprime un exercice (et ses séries par cascade) */
export function deleteExercise(exerciseId: string): void {
  const db = getDb();
  db.runSync('DELETE FROM exercises WHERE id = ?', [exerciseId]);
}

/** Retourne tous les noms d'exercices connus (pour l'autocomplete) */
export function getExerciseNames(): string[] {
  const db = getDb();
  const rows = db.getAllSync<{ name: string }>(
    'SELECT name FROM exercise_names ORDER BY use_count DESC, last_used DESC'
  );
  return rows.map((r) => r.name);
}

/** Retourne tous les exercices pratiqués (noms uniques) */
export function getAllExerciseNames(): string[] {
  const db = getDb();
  const rows = db.getAllSync<{ name: string }>(
    `SELECT DISTINCT e.name
     FROM exercises e
     JOIN sessions s ON e.session_id = s.id
     ORDER BY e.name ASC`
  );
  return rows.map((r) => r.name);
}

// ============================================================
// SETS (Séries)
// ============================================================

/** Ajoute une série à un exercice */
export function addSet(
  exerciseId: string,
  weight: number,
  reps: number,
  notes?: string
): Set {
  const db = getDb();

  const result = db.getFirstSync<{ max_set: number | null }>(
    'SELECT MAX(set_number) as max_set FROM sets WHERE exercise_id = ?',
    [exerciseId]
  );
  const setNumber = (result?.max_set ?? 0) + 1;

  const set: Set = {
    id: generateId(),
    exercise_id: exerciseId,
    set_number: setNumber,
    weight,
    reps,
    notes: notes ?? null,
  };

  db.runSync(
    'INSERT INTO sets (id, exercise_id, set_number, weight, reps, notes) VALUES (?, ?, ?, ?, ?, ?)',
    [set.id, set.exercise_id, set.set_number, set.weight, set.reps, set.notes]
  );

  return set;
}

/** Met à jour une série existante */
export function updateSet(
  setId: string,
  weight: number,
  reps: number
): void {
  const db = getDb();
  db.runSync(
    'UPDATE sets SET weight = ?, reps = ? WHERE id = ?',
    [weight, reps, setId]
  );
}

/** Supprime une série */
export function deleteSet(setId: string): void {
  const db = getDb();
  db.runSync('DELETE FROM sets WHERE id = ?', [setId]);
}

/** Retourne la dernière série d'un exercice (pour le pré-remplissage) */
export function getLastSetForExercise(exerciseId: string): Set | null {
  const db = getDb();
  return db.getFirstSync<Set>(
    'SELECT * FROM sets WHERE exercise_id = ? ORDER BY set_number DESC LIMIT 1',
    [exerciseId]
  ) ?? null;
}

// ============================================================
// STATISTIQUES
// ============================================================

/** Calcule le volume total d'une séance (poids × reps) */
export function getSessionVolume(sessionId: string): number {
  const db = getDb();
  const result = db.getFirstSync<{ total: number | null }>(
    `SELECT SUM(s.weight * s.reps) as total
     FROM sets s
     JOIN exercises e ON s.exercise_id = e.id
     WHERE e.session_id = ?`,
    [sessionId]
  );
  return result?.total ?? 0;
}

/** Volume total de la semaine courante */
export function getWeeklyVolume(): number {
  const db = getDb();
  const weekStart = dayjs().startOf('week').toISOString();
  const result = db.getFirstSync<{ total: number | null }>(
    `SELECT SUM(s.weight * s.reps) as total
     FROM sets s
     JOIN exercises e ON s.exercise_id = e.id
     JOIN sessions sess ON e.session_id = sess.id
     WHERE sess.date >= ?`,
    [weekStart]
  );
  return result?.total ?? 0;
}

/** Nombre de séances du mois courant */
export function getMonthlySessionCount(): number {
  const db = getDb();
  const monthStart = dayjs().startOf('month').toISOString();
  const result = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM sessions WHERE date >= ?',
    [monthStart]
  );
  return result?.count ?? 0;
}

/** Records personnels (poids max par exercice) */
export function getPersonalRecords(): { name: string; weight: number }[] {
  const db = getDb();
  return db.getAllSync<{ name: string; weight: number }>(
    `SELECT e.name, MAX(s.weight) as weight
     FROM sets s
     JOIN exercises e ON s.exercise_id = e.id
     GROUP BY e.name
     ORDER BY weight DESC
     LIMIT 5`
  );
}

/** Historique du poids max par séance pour un exercice donné (graphique) */
export function getWeightHistory(exerciseName: string): ChartPoint[] {
  const db = getDb();
  const rows = db.getAllSync<{ date: string; max_weight: number }>(
    `SELECT sess.date, MAX(s.weight) as max_weight
     FROM sets s
     JOIN exercises e ON s.exercise_id = e.id
     JOIN sessions sess ON e.session_id = sess.id
     WHERE e.name = ?
     GROUP BY sess.id
     ORDER BY sess.date ASC`,
    [exerciseName]
  );
  return rows.map((r) => ({
    date: r.date,
    value: r.max_weight,
    label: dayjs(r.date).format('DD/MM'),
  }));
}

/** Statistiques complètes d'un exercice */
export function getExerciseStats(exerciseName: string): ExerciseStats {
  const weightHistory = getWeightHistory(exerciseName);
  const db = getDb();

  const prResult = db.getFirstSync<{ pr: number | null }>(
    `SELECT MAX(s.weight) as pr
     FROM sets s
     JOIN exercises e ON s.exercise_id = e.id
     WHERE e.name = ?`,
    [exerciseName]
  );
  const personalRecord = prResult?.pr ?? 0;

  const lastWeight = weightHistory.length > 0
    ? weightHistory[weightHistory.length - 1].value
    : 0;

  const countResult = db.getFirstSync<{ count: number }>(
    `SELECT COUNT(DISTINCT sess.id) as count
     FROM exercises e
     JOIN sessions sess ON e.session_id = sess.id
     WHERE e.name = ?`,
    [exerciseName]
  );
  const totalSessions = countResult?.count ?? 0;

  // Progression sur 30 jours
  const thirtyDaysAgo = dayjs().subtract(30, 'day').toISOString();
  const oldResult = db.getFirstSync<{ old_weight: number | null }>(
    `SELECT MAX(s.weight) as old_weight
     FROM sets s
     JOIN exercises e ON s.exercise_id = e.id
     JOIN sessions sess ON e.session_id = sess.id
     WHERE e.name = ? AND sess.date <= ?`,
    [exerciseName, thirtyDaysAgo]
  );
  const oldWeight = oldResult?.old_weight ?? lastWeight;
  const progressionPercent = oldWeight > 0
    ? Math.round(((lastWeight - oldWeight) / oldWeight) * 100)
    : 0;

  return {
    name: exerciseName,
    personalRecord,
    lastWeight,
    totalSessions,
    progressionPercent,
    weightHistory,
  };
}

/** Données complètes du tableau de bord */
export function getDashboardStats(): DashboardStats {
  const db = getDb();
  const countResult = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM sessions'
  );

  return {
    weeklyVolume: getWeeklyVolume(),
    monthlySessionCount: getMonthlySessionCount(),
    totalSessionCount: countResult?.count ?? 0,
    personalRecords: getPersonalRecords(),
  };
}
