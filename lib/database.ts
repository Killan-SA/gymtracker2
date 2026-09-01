import * as SQLite from 'expo-sqlite';

// ============================================================
// Connexion à la base de données
// ============================================================

let _db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync('gymtracker.db');
    _initDatabase(_db);
  }
  return _db;
}

// ============================================================
// Initialisation des tables (migrations)
// ============================================================

function _initDatabase(db: SQLite.SQLiteDatabase): void {
  // Active le mode WAL (plus rapide) et les clés étrangères
  db.execSync('PRAGMA journal_mode = WAL;');
  db.execSync('PRAGMA foreign_keys = ON;');

  // Table des séances
  db.execSync(`
    CREATE TABLE IF NOT EXISTS sessions (
      id          TEXT PRIMARY KEY,
      date        TEXT NOT NULL,
      notes       TEXT,
      created_at  TEXT NOT NULL
    );
  `);

  // Table des exercices (dans une séance)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS exercises (
      id          TEXT PRIMARY KEY,
      session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      notes       TEXT
    );
  `);

  // Table des séries
  db.execSync(`
    CREATE TABLE IF NOT EXISTS sets (
      id           TEXT PRIMARY KEY,
      exercise_id  TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
      set_number   INTEGER NOT NULL,
      weight       REAL NOT NULL DEFAULT 0,
      reps         INTEGER NOT NULL DEFAULT 0,
      notes        TEXT
    );
  `);

  // Table de l'autocomplete pour les noms d'exercices
  db.execSync(`
    CREATE TABLE IF NOT EXISTS exercise_names (
      name       TEXT PRIMARY KEY,
      last_used  TEXT NOT NULL,
      use_count  INTEGER NOT NULL DEFAULT 1
    );
  `);

  // Index pour accélérer les requêtes fréquentes
  db.execSync(`
    CREATE INDEX IF NOT EXISTS idx_exercises_session_id
      ON exercises(session_id);
  `);
  db.execSync(`
    CREATE INDEX IF NOT EXISTS idx_sets_exercise_id
      ON sets(exercise_id);
  `);
  db.execSync(`
    CREATE INDEX IF NOT EXISTS idx_sessions_date
      ON sessions(date DESC);
  `);
}

// ============================================================
// Utilitaires
// ============================================================

/** Génère un identifiant unique (UUID v4) */
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Retourne la date/heure actuelle en ISO 8601 */
export function nowISO(): string {
  return new Date().toISOString();
}
