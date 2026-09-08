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

  // Migration : ajoute la colonne RPE (Rate of Perceived Exertion, 1-10)
  // si elle n'existe pas déjà sur une base créée avant son introduction.
  _addColumnIfMissing(db, 'sets', 'rpe', 'REAL');

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

  // user_version 0 → 1 : fusion "Biceps curl marteau" → "Curl haltère"
  const versionRow = db.getFirstSync<{ user_version: number }>(
    'PRAGMA user_version;'
  );
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion < 1) {
    db.runSync(
      `UPDATE exercises SET name = 'Curl haltère' WHERE name = 'Biceps curl marteau'`
    );
    db.runSync(
      `UPDATE OR IGNORE exercise_names SET name = 'Curl haltère' WHERE name = 'Biceps curl marteau'`
    );
    db.runSync(`DELETE FROM exercise_names WHERE name = 'Biceps curl marteau'`);
    db.execSync('PRAGMA user_version = 1;');
  }

  // user_version 1 → 2 : table réglages + exercices personnalisés
  if (currentVersion < 2) {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    db.execSync(`
      CREATE TABLE IF NOT EXISTS custom_exercises (
        name       TEXT PRIMARY KEY,
        category   TEXT NOT NULL DEFAULT 'Autre',
        created_at TEXT NOT NULL
      );
    `);
    db.execSync('PRAGMA user_version = 2;');
  }
}

// ============================================================
// Utilitaires
// ============================================================

/**
 * Ajoute une colonne à une table existante si elle n'existe pas déjà.
 * SQLite n'a pas de "ADD COLUMN IF NOT EXISTS", on vérifie donc via
 * PRAGMA table_info avant de tenter l'ALTER TABLE.
 */
function _addColumnIfMissing(
  db: SQLite.SQLiteDatabase,
  table: string,
  column: string,
  type: string
): void {
  const columns = db.getAllSync<{ name: string }>(`PRAGMA table_info(${table});`);
  const exists = columns.some((c) => c.name === column);
  if (!exists) {
    db.execSync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`);
  }
}

/**
 * Supprime définitivement toutes les données de l'application :
 * séances, exercices, séries et historique d'autocomplete.
 * Utilisé par le bouton "Réinitialiser toutes les données".
 */
export function resetAllData(): void {
  const db = getDb();
  // La suppression des séances cascade sur exercises et sets (ON DELETE CASCADE),
  // mais on nettoie explicitement chaque table pour ne rien laisser derrière,
  // y compris l'historique d'autocomplete qui n'est pas lié par clé étrangère.
  db.execSync('DELETE FROM sets;');
  db.execSync('DELETE FROM exercises;');
  db.execSync('DELETE FROM sessions;');
  db.execSync('DELETE FROM exercise_names;');
}

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
