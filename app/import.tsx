import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { parseXlsxFile, importPreviews } from '../lib/importXlsx';
import type { ImportSessionPreview, ImportResult } from '../lib/importXlsx';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

type Step = 'idle' | 'parsing' | 'preview' | 'importing' | 'done';

export default function ImportScreen() {
  const [step, setStep] = useState<Step>('idle');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importStats, setImportStats] = useState<{ imported: number; duplicates: number } | null>(null);

  // ── Sélection du fichier ──────────────────────────────────────
  const handlePickFile = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          '*/*',
        ],
        copyToCacheDirectory: true,
      });

      if (picked.canceled || !picked.assets?.[0]) return;

      const asset = picked.assets[0];
      if (!asset.name.toLowerCase().endsWith('.xlsx') && !asset.name.toLowerCase().endsWith('.xls')) {
        Alert.alert('Fichier invalide', 'Sélectionne un fichier Excel (.xlsx ou .xls).');
        return;
      }

      setStep('parsing');
      setResult(null);
      setImportStats(null);

      // Lire le fichier en base64 puis convertir en ArrayBuffer
      const base64 = await readAsStringAsync(asset.uri, {
        encoding: 'base64' as any,
      });

      const binary = atob(base64);
      const buffer = new ArrayBuffer(binary.length);
      const view = new Uint8Array(buffer);
      for (let i = 0; i < binary.length; i++) {
        view[i] = binary.charCodeAt(i);
      }

      const parsed = parseXlsxFile(buffer);
      setResult(parsed);
      setStep('preview');
    } catch (err) {
      setStep('idle');
      Alert.alert('Erreur', `Impossible de lire le fichier : ${String(err)}`);
    }
  };

  // ── Import en base de données ─────────────────────────────────
  const handleImport = () => {
    if (!result?.previews?.length) return;

    Alert.alert(
      'Confirmer l\'import',
      `Importer ${result.previews.length} séance(s) dans l'application ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Importer',
          onPress: () => {
            setStep('importing');
            setTimeout(() => {
              try {
                const stats = importPreviews(result.previews);
                setImportStats(stats);
                setStep('done');
              } catch (err) {
                setStep('preview');
                Alert.alert('Erreur import', String(err));
              }
            }, 100);
          },
        },
      ]
    );
  };

  const handleReset = () => {
    setStep('idle');
    setResult(null);
    setImportStats(null);
  };

  // ── Rendu ─────────────────────────────────────────────────────
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* En-tête */}
      <View style={styles.headerCard}>
        <Ionicons name="cloud-upload" size={32} color={COLORS.primary} />
        <Text style={styles.headerTitle}>Importer un historique</Text>
        <Text style={styles.headerSubtitle}>
          Importe tes séances depuis un fichier Excel (.xlsx)
        </Text>
        <View style={styles.formatInfo}>
          <Text style={styles.formatTitle}>Format attendu :</Text>
          <Text style={styles.formatRow}>📅 Date | 🏋️ Machine | 🔢 Série | ⚖️ Poids | 🔄 Rep</Text>
        </View>
      </View>

      {/* ── Étape IDLE / sélection ── */}
      {(step === 'idle' || step === 'parsing') && (
        <TouchableOpacity
          style={[styles.pickButton, step === 'parsing' && { opacity: 0.6 }]}
          onPress={handlePickFile}
          disabled={step === 'parsing'}
          activeOpacity={0.8}
        >
          {step === 'parsing' ? (
            <>
              <ActivityIndicator color="#fff" />
              <Text style={styles.pickButtonText}>Analyse en cours…</Text>
            </>
          ) : (
            <>
              <Ionicons name="document-attach" size={22} color="#fff" />
              <Text style={styles.pickButtonText}>Sélectionner un fichier Excel</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* ── Étape PREVIEW ── */}
      {step === 'preview' && result && (
        <>
          {/* Erreurs */}
          {result.errors.length > 0 && (
            <View style={styles.errorBox}>
              <View style={styles.errorHeader}>
                <Ionicons name="warning" size={18} color={COLORS.warning} />
                <Text style={styles.errorTitle}>
                  {result.errors.length} avertissement(s)
                </Text>
              </View>
              {result.errors.slice(0, 5).map((e, i) => (
                <Text key={i} style={styles.errorText}>• {e}</Text>
              ))}
              {result.errors.length > 5 && (
                <Text style={styles.errorText}>… et {result.errors.length - 5} autre(s)</Text>
              )}
            </View>
          )}

          {/* Résumé */}
          <View style={styles.summaryRow}>
            <SummaryCard
              icon="calendar"
              value={result.previews.length.toString()}
              label="Séances"
              color={COLORS.primary}
            />
            <SummaryCard
              icon="barbell"
              value={result.previews.reduce((s, p) => s + p.exercises.length, 0).toString()}
              label="Exercices"
              color={COLORS.success}
            />
            <SummaryCard
              icon="list"
              value={result.previews.reduce((s, p) => s + p.totalSets, 0).toString()}
              label="Séries"
              color={COLORS.warning}
            />
          </View>

          {result.skipped > 0 && (
            <Text style={styles.skippedText}>
              {result.skipped} ligne(s) ignorée(s) (données manquantes)
            </Text>
          )}

          {/* Aperçu des séances */}
          {result.previews.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Aperçu des séances</Text>
              {result.previews.slice(0, 10).map((preview, i) => (
                <SessionPreviewCard key={i} preview={preview} />
              ))}
              {result.previews.length > 10 && (
                <Text style={styles.moreText}>
                  … et {result.previews.length - 10} autre(s) séance(s)
                </Text>
              )}

              <TouchableOpacity style={styles.importButton} onPress={handleImport} activeOpacity={0.85}>
                <Ionicons name="checkmark-circle" size={22} color="#fff" />
                <Text style={styles.importButtonText}>
                  Importer {result.previews.length} séance(s)
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.noDataBox}>
              <Text style={styles.noDataText}>Aucune séance valide à importer.</Text>
            </View>
          )}

          <TouchableOpacity style={styles.cancelButton} onPress={handleReset}>
            <Text style={styles.cancelText}>Choisir un autre fichier</Text>
          </TouchableOpacity>
        </>
      )}

      {/* ── Étape IMPORTING ── */}
      {step === 'importing' && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Import en cours…</Text>
        </View>
      )}

      {/* ── Étape DONE ── */}
      {step === 'done' && importStats && (
        <View style={styles.doneBox}>
          <Text style={styles.doneEmoji}>✅</Text>
          <Text style={styles.doneTitle}>Import terminé !</Text>
          <Text style={styles.doneStat}>
            {importStats.imported} séance(s) importée(s)
          </Text>
          {importStats.duplicates > 0 && (
            <Text style={styles.doneSkipped}>
              {importStats.duplicates} séance(s) déjà existante(s) ignorée(s)
            </Text>
          )}
          <TouchableOpacity
            style={styles.importButton}
            onPress={() => router.replace('/(tabs)/history')}
            activeOpacity={0.85}
          >
            <Ionicons name="time" size={20} color="#fff" />
            <Text style={styles.importButtonText}>Voir l'historique</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={handleReset}>
            <Text style={styles.cancelText}>Importer un autre fichier</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

// ── Composants ────────────────────────────────────────────────

function SummaryCard({ icon, value, label, color }: {
  icon: string; value: string; label: string; color: string;
}) {
  return (
    <View style={[summaryStyles.card, { borderColor: color + '40' }]}>
      <Ionicons name={icon as any} size={22} color={color} />
      <Text style={summaryStyles.value}>{value}</Text>
      <Text style={summaryStyles.label}>{label}</Text>
    </View>
  );
}

function SessionPreviewCard({ preview }: { preview: ImportSessionPreview }) {
  return (
    <View style={previewStyles.card}>
      <View style={previewStyles.dateRow}>
        <Ionicons name="calendar" size={16} color={COLORS.primary} />
        <Text style={previewStyles.date}>{preview.dateLabel}</Text>
        <Text style={previewStyles.badge}>{preview.totalSets} séries</Text>
      </View>
      {preview.exercises.map((ex, i) => (
        <View key={i} style={previewStyles.exRow}>
          <Ionicons name="barbell-outline" size={14} color={COLORS.textMuted} />
          <Text style={previewStyles.exName}>{ex.name}</Text>
          <Text style={previewStyles.exSets}>{ex.sets.length}×</Text>
          <Text style={previewStyles.exDetail}>
            {ex.sets.map(s => `${s.poids}kg×${s.reps}`).join(', ')}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.base, paddingBottom: SPACING.xxxl },

  headerCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: SPACING.xl, alignItems: 'center', gap: SPACING.sm,
    marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  headerTitle: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  headerSubtitle: { fontSize: FONTS.sm, color: COLORS.textSecondary, textAlign: 'center' },
  formatInfo: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: SPACING.md, marginTop: SPACING.sm, width: '100%',
  },
  formatTitle: { fontSize: FONTS.xs, color: COLORS.textMuted, marginBottom: 4, fontWeight: FONTS.semibold },
  formatRow: { fontSize: FONTS.sm, color: COLORS.textSecondary },

  pickButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, backgroundColor: COLORS.primary, padding: SPACING.lg,
    borderRadius: RADIUS.lg, ...SHADOWS.primary,
  },
  pickButtonText: { fontSize: FONTS.md, fontWeight: FONTS.bold, color: '#fff' },

  errorBox: {
    backgroundColor: COLORS.warningGlow, borderRadius: RADIUS.lg,
    padding: SPACING.base, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.warning + '60',
  },
  errorHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  errorTitle: { fontSize: FONTS.base, fontWeight: FONTS.semibold, color: COLORS.warning },
  errorText: { fontSize: FONTS.sm, color: COLORS.warning + 'CC', lineHeight: 20 },

  summaryRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  skippedText: { fontSize: FONTS.xs, color: COLORS.textMuted, textAlign: 'center', marginBottom: SPACING.md },

  sectionTitle: {
    fontSize: FONTS.xs, fontWeight: FONTS.bold, color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: SPACING.sm, marginTop: SPACING.md,
  },
  moreText: { fontSize: FONTS.sm, color: COLORS.textMuted, textAlign: 'center', marginVertical: SPACING.md },

  importButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, backgroundColor: COLORS.success, padding: SPACING.base,
    borderRadius: RADIUS.lg, marginTop: SPACING.lg, ...SHADOWS.card,
  },
  importButtonText: { fontSize: FONTS.md, fontWeight: FONTS.bold, color: '#fff' },

  cancelButton: { alignItems: 'center', padding: SPACING.base, marginTop: SPACING.sm },
  cancelText: { fontSize: FONTS.base, color: COLORS.textSecondary },

  noDataBox: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.xl,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  noDataText: { fontSize: FONTS.base, color: COLORS.textMuted },

  loadingBox: { alignItems: 'center', paddingVertical: SPACING.xxxl, gap: SPACING.lg },
  loadingText: { fontSize: FONTS.base, color: COLORS.textSecondary },

  doneBox: { alignItems: 'center', paddingVertical: SPACING.xl, gap: SPACING.md },
  doneEmoji: { fontSize: 56 },
  doneTitle: { fontSize: FONTS.xxl, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  doneStat: { fontSize: FONTS.lg, color: COLORS.success, fontWeight: FONTS.semibold },
  doneSkipped: { fontSize: FONTS.sm, color: COLORS.textMuted },
});

const summaryStyles = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: SPACING.md, alignItems: 'center', gap: SPACING.xs,
    borderWidth: 1,
  },
  value: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  label: { fontSize: FONTS.xs, color: COLORS.textSecondary },
});

const previewStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  dateRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  date: { flex: 1, fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  badge: {
    fontSize: FONTS.xs, color: COLORS.primary, fontWeight: FONTS.medium,
    backgroundColor: COLORS.primaryGlow, paddingHorizontal: SPACING.sm,
    paddingVertical: 2, borderRadius: RADIUS.full,
  },
  exRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    paddingVertical: 2,
  },
  exName: { fontSize: FONTS.sm, color: COLORS.textSecondary, fontWeight: FONTS.medium, width: 110 },
  exSets: { fontSize: FONTS.xs, color: COLORS.primary, fontWeight: FONTS.bold, width: 20 },
  exDetail: { flex: 1, fontSize: FONTS.xs, color: COLORS.textMuted },
});
