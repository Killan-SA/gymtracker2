import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { getDb, generateId } from './database';

dayjs.extend(customParseFormat);

// ============================================================
// Types
// ============================================================

export interface ImportRow {
  date: string;        // ISO 8601
  machine: string;
  serie: number;
  poids: number;
  reps: number;
}

export interface ImportSessionPreview {
  date: string;        // ISO 8601
  dateLabel: string;   // ex: "01/08/2026"
  exercises: {
    name: string;
    sets: { serie: number; poids: number; reps: number }[];
  }[];
  totalSets: number;
}

export interface ImportResult {
  previews: ImportSessionPreview[];
  errors: string[];
  skipped: number;
}

// ============================================================
// Parsing de la date — gère plusieurs formats courants
// ============================================================

const DATE_FORMATS = [
  'DD/MM/YYYY',
  'D/M/YYYY',
  'YYYY-MM-DD',
  'DD-MM-YYYY',
  'MM/DD/YYYY',
];

function parseDate(raw: unknown): string | null {
  if (raw == null || raw === '') return null;

  // Excel stocke les dates comme nombres entiers (serial date)
  if (typeof raw === 'number') {
    const d = XLSX.SSF.parse_date_code(raw);
    if (d) {
      const iso = dayjs(`${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`);
      return iso.isValid() ? iso.toISOString() : null;
    }
  }

  const str = String(raw).trim();
  for (const fmt of DATE_FORMATS) {
    const d = dayjs(str, fmt, true);
    if (d.isValid()) return d.toISOString();
  }
  return null;
}

// ============================================================
// Détection automatique des colonnes
// ============================================================

const COLUMN_ALIASES: Record<string, string[]> = {
  date:    ['date', 'jour', 'day'],
  machine: ['machine', 'exercice', 'exercise', 'nom', 'name'],
  serie:   ['serie', 'série', 'set', 'num', 'numéro'],
  poids:   ['poids', 'weight', 'kg', 'charge', 'poid'],
  reps:    ['rep', 'reps', 'répétition', 'repetition', 'répétitions'],
};

function detectColumns(headers: string[]): Record<string, number> | null {
  const normalized = headers.map(h => String(h ?? '').toLowerCase().trim());
  const mapping: Record<string, number> = {};

  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    const idx = normalized.findIndex(h => aliases.some(a => h.includes(a)));
    if (idx >= 0) mapping[field] = idx;
  }

  // Colonnes obligatoires
  if (!('date' in mapping) || !('machine' in mapping) ||
      !('poids' in mapping) || !('reps' in mapping)) {
    return null;
  }

  return mapping;
}

// ============================================================
// Parse du fichier xlsx (Buffer base64 ou ArrayBuffer)
// ============================================================

export function parseXlsxFile(data: ArrayBuffer): ImportResult {
  const errors: string[] = [];
  let skipped = 0;

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(data, { type: 'array', cellDates: false });
  } catch {
    return { previews: [], errors: ['Impossible de lire le fichier. Vérifiez qu\'il s\'agit bien d\'un fichier .xlsx.'], skipped: 0 };
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (rawRows.length < 2) {
    return { previews: [], errors: ['Le fichier est vide ou ne contient que des en-têtes.'], skipped: 0 };
  }

  const headers = (rawRows[0] as string[]);
  const colMap = detectColumns(headers);

  if (!colMap) {
    return {
      previews: [],
      errors: [
        `Colonnes détectées : ${headers.join(', ')}`,
        'Colonnes obligatoires manquantes. Le fichier doit contenir : Date, Machine, Poids, Rep (ou Reps).',
      ],
      skipped: 0,
    };
  }

  // ── Lecture des lignes ──────────────────────────────────────
  const rows: ImportRow[] = [];

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i] as unknown[];
    const lineNum = i + 1;

    const rawDate = row[colMap.date];
    const rawMachine = row[colMap.machine];
    const rawPoids = row[colMap.poids];
    const rawReps = row[colMap.reps];
    const rawSerie = colMap.serie !== undefined ? row[colMap.serie] : i;

    // Ligne vide → skip silencieux
    if (!rawDate && !rawMachine && !rawPoids && !rawReps) { skipped++; continue; }

    const date = parseDate(rawDate);
    if (!date) { errors.push(`Ligne ${lineNum} : date invalide "${rawDate}"`); skipped++; continue; }

    const machine = String(rawMachine ?? '').trim();
    if (!machine) { errors.push(`Ligne ${lineNum} : nom d'exercice vide`); skipped++; continue; }

    const poids = parseFloat(String(rawPoids).replace(',', '.'));
    if (isNaN(poids) || poids < 0) { errors.push(`Ligne ${lineNum} : poids invalide "${rawPoids}"`); skipped++; continue; }

    const reps = parseInt(String(rawReps));
    if (isNaN(reps) || reps < 0) { errors.push(`Ligne ${lineNum} : répétitions invalides "${rawReps}"`); skipped++; continue; }

    const serie = parseInt(String(rawSerie)) || i;

    rows.push({ date, machine, serie, poids, reps });
  }

  if (rows.length === 0) {
    return { previews: [], errors: [...errors, 'Aucune ligne valide trouvée.'], skipped };
  }

  // ── Regroupement par date → exercice ────────────────────────
  // Clé : date ISO tronquée au jour (YYYY-MM-DD)
  const byDate = new Map<string, Map<string, ImportRow[]>>();

  for (const row of rows) {
    const dayKey = row.date.slice(0, 10); // YYYY-MM-DD
    if (!byDate.has(dayKey)) byDate.set(dayKey, new Map());
    const byMachine = byDate.get(dayKey)!;
    if (!byMachine.has(row.machine)) byMachine.set(row.machine, []);
    byMachine.get(row.machine)!.push(row);
  }

  // ── Construction des previews ────────────────────────────────
  const previews: ImportSessionPreview[] = [];

  for (const [dayKey, byMachine] of byDate) {
    const exercises: ImportSessionPreview['exercises'] = [];
    let totalSets = 0;

    for (const [name, sets] of byMachine) {
      const sortedSets = [...sets].sort((a, b) => a.serie - b.serie);
      exercises.push({
        name,
        sets: sortedSets.map(s => ({ serie: s.serie, poids: s.poids, reps: s.reps })),
      });
      totalSets += sets.length;
    }

    previews.push({
      date: dayjs(dayKey).toISOString(),
      dateLabel: dayjs(dayKey).format('DD/MM/YYYY'),
      exercises,
      totalSets,
    });
  }

  // Trier du plus ancien au plus récent
  previews.sort((a, b) => a.date.localeCompare(b.date));

  return { previews, errors, skipped };
}

// ============================================================
// Import en base de données
// ============================================================

export function importPreviews(
  previews: ImportSessionPreview[],
  onProgress?: (done: number, total: number) => void
): { imported: number; duplicates: number } {
  const db = getDb();
  let imported = 0;
  let duplicates = 0;

  for (let i = 0; i < previews.length; i++) {
    const preview = previews[i];
    const dayKey = preview.date.slice(0, 10);

    // Vérifier doublon (même date à la journée près)
    const existing = db.getFirstSync<{ id: string }>(
      `SELECT id FROM sessions WHERE date LIKE ?`,
      [`${dayKey}%`]
    );

    if (existing) {
      duplicates++;
      onProgress?.(i + 1, previews.length);
      continue;
    }

    // Créer la séance
    const sessionId = generateId();
    db.runSync(
      'INSERT INTO sessions (id, date, notes, created_at) VALUES (?, ?, NULL, ?)',
      [sessionId, preview.date, new Date().toISOString()]
    );

    // Créer les exercices et séries
    for (let ei = 0; ei < preview.exercises.length; ei++) {
      const ex = preview.exercises[ei];
      const exerciseId = generateId();
      db.runSync(
        'INSERT INTO exercises (id, session_id, name, order_index, notes) VALUES (?, ?, ?, ?, NULL)',
        [exerciseId, sessionId, ex.name, ei]
      );

      for (const s of ex.sets) {
        db.runSync(
          'INSERT INTO sets (id, exercise_id, set_number, weight, reps, notes) VALUES (?, ?, ?, ?, ?, NULL)',
          [generateId(), exerciseId, s.serie, s.poids, s.reps]
        );
      }

      // Mettre à jour l'autocomplete
      db.runSync(
        `INSERT INTO exercise_names (name, last_used, use_count)
         VALUES (?, ?, 1)
         ON CONFLICT(name) DO UPDATE SET
           last_used = excluded.last_used,
           use_count = use_count + 1`,
        [ex.name, preview.date]
      );
    }

    imported++;
    onProgress?.(i + 1, previews.length);
  }

  return { imported, duplicates };
}
