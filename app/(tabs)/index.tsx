import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { useCallback, useState, useEffect } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import {
  getLastSession,
  getDashboardStats,
  getSessionVolume,
  createSession,
  getTotalVolumeAllTime,
  getFrequentSessionTemplates,
  getSmartSessionRecommendation,
  createSessionFromTemplate,
  getMuscleGroupFrequency,
  getWeeklyReport,
  createSessionFromProgramDay,
} from '../../lib/queries';
import type { SessionTemplate } from '../../lib/queries';
import { useSettingsStore } from '../../lib/settingsStore';
import { useAppTheme } from '../../lib/themes';
import { getProgramById } from '../../lib/programs';
import { fromKg, roundWeight, unitLabel } from '../../lib/units';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import type { Session, DashboardStats, MuscleGroupFrequency, WeeklyReport } from '../../types';

dayjs.locale('fr');

const formatVolume = (kg: number, useKg: boolean): string => {
  const converted = fromKg(kg, useKg);
  if (useKg) {
    if (converted >= 1_000_000) return `${(converted / 1_000_000).toFixed(1)} Mt`;
    if (converted >= 1_000) return `${(converted / 1_000).toFixed(1)} t`;
    return `${Math.round(converted)} kg`;
  }
  if (converted >= 1_000_000) return `${(converted / 1_000_000).toFixed(1)} M lbs`;
  if (converted >= 1_000) return `${(converted / 1_000).toFixed(1)} k lbs`;
  return `${Math.round(converted)} lbs`;
};

export default function DashboardScreen() {
  const useKg = useSettingsStore((s) => s.useKg);
  const currentProgramId = useSettingsStore((s) => s.currentProgramId);
  const currentProgramDayIndex = useSettingsStore((s) => s.currentProgramDayIndex);
  const advanceProgramDay = useSettingsStore((s) => s.advanceProgramDay);
  const theme = useAppTheme();

  const [refreshing, setRefreshing] = useState(false);
  const [lastSession, setLastSession] = useState<Session | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    weeklyVolume: 0,
    monthlySessionCount: 0,
    totalSessionCount: 0,
    personalRecords: [],
  });
  const [lastSessionVolume, setLastSessionVolume] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);
  const [templates, setTemplates] = useState<SessionTemplate[]>([]);
  const [smartSession, setSmartSession] = useState<SessionTemplate | null>(null);
  const [muscleFrequency, setMuscleFrequency] = useState<MuscleGroupFrequency[]>([]);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [showWeeklyReport, setShowWeeklyReport] = useState(false);

  const loadData = useCallback(() => {
    try {
      const session = getLastSession();
      const dashboardStats = getDashboardStats();
      setLastSession(session);
      setStats(dashboardStats);
      if (session) setLastSessionVolume(getSessionVolume(session.id));
    } catch (e) {
      console.error('[Dashboard] loadData error:', e);
    }
    // Séparé du try principal pour ne pas bloquer les stats si elles échouent
    try {
      setTotalVolume(getTotalVolumeAllTime());
    } catch (e) {
      console.error('[Dashboard] totalVolume error:', e);
    }
    try {
      setTemplates(getFrequentSessionTemplates());
    } catch (e) {
      console.error('[Dashboard] templates error:', e);
    }
    try {
      setSmartSession(getSmartSessionRecommendation());
    } catch (e) {
      console.error('[Dashboard] smartSession error:', e);
    }
    try {
      setMuscleFrequency(getMuscleGroupFrequency(7));
    } catch (e) {
      console.error('[Dashboard] muscleFrequency error:', e);
    }
    try {
      setWeeklyReport(getWeeklyReport());
    } catch (e) {
      console.error('[Dashboard] weeklyReport error:', e);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      useSettingsStore.getState().loadSettings();
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleNewSession = () => {
    Alert.alert(
      'Nouvelle séance',
      'Démarrer une nouvelle séance maintenant ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'C\'est parti 💪',
          onPress: () => {
            const session = createSession();
            router.push(`/session/${session.id}` as any);
            loadData();
          },
        },
      ]
    );
  };

  const handleStartTemplate = (template: SessionTemplate, label: string) => {
    Alert.alert(
      `Démarrer "${label}" ?`,
      template.exercises.map((ex) =>
        `• ${ex.name}${ex.suggestedWeight > 0 ? ` → ${roundWeight(fromKg(ex.suggestedWeight, useKg))} ${unitLabel(useKg)}` : ''}`
      ).join('\n'),
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Démarrer 💪',
          onPress: () => {
            const sessionId = createSessionFromTemplate(template);
            router.push(`/session/${sessionId}` as any);
            loadData();
          },
        },
      ]
    );
  };

  // ── Prochaine séance du programme ────────────────────────
  const activeProgram = currentProgramId ? getProgramById(currentProgramId) : null;
  const nextDay = activeProgram
    ? activeProgram.days[currentProgramDayIndex % activeProgram.days.length]
    : null;

  const handleStartProgramDay = () => {
    if (!activeProgram || !nextDay) return;
    const totalDays = activeProgram.days.length;
    const nextIndex = (currentProgramDayIndex + 1) % totalDays;

    Alert.alert(
      `${nextDay.emoji ?? '💪'} ${nextDay.label}`,
      `Exercices prévus :\n${nextDay.exerciseNames.map((n) => `• ${n}`).join('\n')}`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Démarrer cette séance 💪',
          onPress: () => {
            const sessionId = createSessionFromProgramDay(nextDay.exerciseNames, nextIndex);
            // Met à jour le store Zustand (persisté dans user_settings par createSessionFromProgramDay)
            advanceProgramDay(totalDays);
            router.push(`/session/${sessionId}` as any);
            loadData();
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bonjour 👋</Text>
          <Text style={styles.date}>{dayjs().format('dddd D MMMM')}</Text>
        </View>
        <TouchableOpacity style={[styles.newSessionBtn, { backgroundColor: theme.primary }]} onPress={handleNewSession}>
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.newSessionText}>Séance</Text>
        </TouchableOpacity>
      </View>

      {/* ── Prochaine séance du programme ─────────────────── */}
      {activeProgram && nextDay ? (
        <>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>📅 Prochaine séance</Text>
            <TouchableOpacity onPress={() => router.push('/programs' as any)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.changeProgramLink, { color: theme.primary }]}>Changer</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.nextSessionCard, { backgroundColor: theme.card, borderColor: theme.primary + '60' }]}
            onPress={handleStartProgramDay}
            activeOpacity={0.85}
          >
            <View style={styles.nextSessionHeader}>
              <Text style={styles.nextSessionEmoji}>{nextDay.emoji ?? '💪'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.nextSessionProgram, { color: theme.primary }]}>{activeProgram.name}</Text>
                <Text style={styles.nextSessionLabel}>{nextDay.label}</Text>
              </View>
              {nextDay.muscleGroups && (
                <View style={[styles.dayBadge, { backgroundColor: theme.primaryGlow, borderColor: theme.primary + '40' }]}>
                  <Text style={[styles.dayBadgeText, { color: theme.primary }]}>
                    Jour {(currentProgramDayIndex % activeProgram.days.length) + 1}/{activeProgram.days.length}
                  </Text>
                </View>
              )}
            </View>

            {nextDay.muscleGroups && nextDay.muscleGroups.length > 0 && (
              <Text style={styles.nextSessionMuscles}>
                🎯 {nextDay.muscleGroups.join(' · ')}
              </Text>
            )}

            <View style={styles.nextSessionExList}>
              {nextDay.exerciseNames.slice(0, 4).map((name) => (
                <Text key={name} style={styles.nextSessionEx}>• {name}</Text>
              ))}
              {nextDay.exerciseNames.length > 4 && (
                <Text style={[styles.nextSessionEx, { color: COLORS.textMuted, fontStyle: 'italic' }]}>
                  +{nextDay.exerciseNames.length - 4} autres exercices…
                </Text>
              )}
            </View>

            <View style={[styles.startProgramBtn, { backgroundColor: theme.primary }]}>
              <Ionicons name="play" size={16} color="#fff" />
              <Text style={styles.startProgramBtnText}>Démarrer cette séance</Text>
            </View>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity
          style={[styles.pickProgramCard, { backgroundColor: theme.card, borderColor: theme.primary + '40' }]}
          onPress={() => router.push('/programs' as any)}
          activeOpacity={0.85}
        >
          <View style={styles.pickProgramHeader}>
            <View style={[styles.pickProgramIcon, { backgroundColor: theme.primaryGlow }]}>
              <Ionicons name="calendar-outline" size={24} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pickProgramTitle}>Choisir un programme</Text>
              <Text style={styles.pickProgramSub}>
                PPL, Full Body, Haut/Bas... Choisis un programme pour afficher ta prochaine séance ici !
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.primary} />
          </View>
        </TouchableOpacity>
      )}

      {/* ── Stats principales ──────────────────────────────── */}
      <View style={styles.statsRow}>
        <StatCard
          icon="flame"
          label="Vol. 7 jours"
          value={formatVolume(stats.weeklyVolume, useKg)}
          color={COLORS.warning}
          theme={theme}
        />
        <StatCard
          icon="calendar"
          label="Ce mois"
          value={`${stats.monthlySessionCount} séances`}
          color={theme.primary}
          theme={theme}
        />
        <StatCard
          icon="barbell"
          label="Total séances"
          value={`${stats.totalSessionCount}`}
          color={COLORS.success}
          theme={theme}
        />
      </View>

      {/* ── Volume total all-time ─────────────────────────── */}
      {totalVolume > 0 && (
        <View style={[styles.totalVolumeCard, { backgroundColor: theme.primaryGlow, borderColor: theme.primary + '40' }]}>
          <Ionicons name="stats-chart" size={22} color={theme.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.totalVolumeLabel}>Volume total soulevé depuis le début</Text>
            <Text style={[styles.totalVolumeValue, { color: theme.primary }]}>{formatVolume(totalVolume, useKg)}</Text>
          </View>
          <Text style={styles.totalVolumeEmoji}>
            {totalVolume >= 1_000_000 ? '🏆' : totalVolume >= 100_000 ? '🔥' : '💪'}
          </Text>
        </View>
      )}

      {/* ── Groupes musculaires délaissés ─────────────────── */}
      {muscleFrequency.some((m) => m.isStale && m.lastTrainedDate !== null) && (
        <View style={styles.staleCard}>
          <Ionicons name="alert-circle" size={20} color={COLORS.warning} />
          <View style={{ flex: 1 }}>
            {muscleFrequency
              .filter((m) => m.isStale && m.lastTrainedDate !== null)
              .slice(0, 3)
              .map((m) => (
                <Text key={m.category} style={styles.staleText}>
                  <Text style={styles.staleCategory}>{m.category}</Text> : pas travaillé depuis {m.daysSince} jour{(m.daysSince ?? 0) > 1 ? 's' : ''}
                </Text>
              ))}
          </View>
        </View>
      )}

      {/* ── Rapport hebdomadaire ───────────────────────────── */}
      {weeklyReport && weeklyReport.sessionCount > 0 && (
        <TouchableOpacity
          style={[styles.reportCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          onPress={() => setShowWeeklyReport((v) => !v)}
          activeOpacity={0.85}
        >
          <View style={styles.reportHeader}>
            <Ionicons name="newspaper" size={20} color={theme.primary} />
            <Text style={styles.reportTitle}>Rapport de la semaine</Text>
            <Ionicons
              name={showWeeklyReport ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={COLORS.textMuted}
            />
          </View>
          <View style={styles.reportSummaryRow}>
            <Text style={styles.reportSummaryItem}>
              {weeklyReport.sessionCount} séance{weeklyReport.sessionCount > 1 ? 's' : ''}
            </Text>
            <Text style={styles.reportSummaryDot}>·</Text>
            <Text style={styles.reportSummaryItem}>{formatVolume(weeklyReport.totalVolume, useKg)}</Text>
            {weeklyReport.newRecords.length > 0 && (
              <>
                <Text style={styles.reportSummaryDot}>·</Text>
                <Text style={[styles.reportSummaryItem, { color: COLORS.warning }]}>
                  🏆 {weeklyReport.newRecords.length} record{weeklyReport.newRecords.length > 1 ? 's' : ''}
                </Text>
              </>
            )}
          </View>

          {showWeeklyReport && (
            <View style={styles.reportDetails}>
              {weeklyReport.muscleGroupsTrained.length > 0 && (
                <View style={styles.reportSection}>
                  <Text style={styles.reportSectionTitle}>Muscles travaillés</Text>
                  <Text style={styles.reportSectionText}>
                    {weeklyReport.muscleGroupsTrained.map((m) => m.category).join(' · ')}
                  </Text>
                </View>
              )}
              {weeklyReport.newRecords.length > 0 && (
                <View style={styles.reportSection}>
                  <Text style={styles.reportSectionTitle}>Records battus</Text>
                  {weeklyReport.newRecords.map((r) => (
                    <Text key={r.exerciseName} style={styles.reportSectionText}>
                      🏆 {r.exerciseName} — {roundWeight(fromKg(r.weight, useKg))} {unitLabel(useKg)}
                    </Text>
                  ))}
                </View>
              )}
              {weeklyReport.mostImprovedExercise && (
                <View style={styles.reportSection}>
                  <Text style={styles.reportSectionTitle}>Meilleure progression</Text>
                  <Text style={styles.reportSectionText}>
                    {weeklyReport.mostImprovedExercise.name} ({weeklyReport.mostImprovedExercise.gainPercent > 0 ? '+' : ''}{weeklyReport.mostImprovedExercise.gainPercent}%)
                  </Text>
                </View>
              )}
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* ── Séance intelligente (plateau) ─────────────────── */}
      {smartSession && (
        <>
          <Text style={styles.sectionTitle}>🧠 Séance conseillée</Text>
          <TouchableOpacity
            style={[styles.smartCard, { backgroundColor: theme.card, borderColor: COLORS.warning + '50' }]}
            onPress={() => handleStartTemplate(smartSession, 'Séance anti-plateau')}
            activeOpacity={0.85}
          >
            <View style={styles.smartCardHeader}>
              <Ionicons name="trending-up" size={20} color={COLORS.warning} />
              <Text style={styles.smartCardTitle}>Tu stagnes — voici comment débloquer</Text>
            </View>
            <Text style={styles.smartCardSub}>
              {smartSession.exercises.length} exercice{smartSession.exercises.length > 1 ? 's' : ''} avec plateau détecté · petite progression recommandée
            </Text>
            <View style={styles.smartExerciseList}>
              {smartSession.exercises.map((ex) => (
                <View key={ex.name} style={styles.smartExRow}>
                  <Text style={styles.smartExName}>{ex.name}</Text>
                  {ex.suggestedWeight > 0 && (
                    <View style={styles.suggestedBadge}>
                      <Text style={styles.suggestedText}>
                        {roundWeight(fromKg(ex.lastWeight, useKg))} → {roundWeight(fromKg(ex.suggestedWeight, useKg))} {unitLabel(useKg)}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
            <View style={styles.startBtnRow}>
              <Text style={styles.startBtnText}>Démarrer cette séance →</Text>
            </View>
          </TouchableOpacity>
        </>
      )}

      {/* ── Séances habituelles ───────────────────────────── */}
      {templates.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>📋 Tes séances habituelles</Text>
          {templates.map((tmpl, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.templateCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
              onPress={() => handleStartTemplate(tmpl, `Séance ${i + 1}`)}
              activeOpacity={0.85}
            >
              <View style={styles.templateHeader}>
                <Text style={styles.templateTitle}>
                  {tmpl.exercises.slice(0, 2).map(e => e.name).join(' + ')}
                  {tmpl.exercises.length > 2 ? ` +${tmpl.exercises.length - 2}` : ''}
                </Text>
                <View style={[styles.countBadge, { backgroundColor: theme.primary + '25' }]}>
                  <Text style={[styles.countBadgeText, { color: theme.primary }]}>{tmpl.count}×</Text>
                </View>
              </View>
              <View style={styles.templateExList}>
                {tmpl.exercises.map((ex) => (
                  <View key={ex.name} style={styles.templateExRow}>
                    <Text style={styles.templateExName}>{ex.name}</Text>
                    {ex.suggestedWeight > 0 && (
                      <Text style={[
                        styles.templateExWeight,
                        { color: ex.plateauDetected ? COLORS.warning : COLORS.success },
                      ]}>
                        {ex.plateauDetected ? '⟳' : '↑'} {roundWeight(fromKg(ex.suggestedWeight, useKg))} {unitLabel(useKg)}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
              <Text style={styles.templateLastDate}>
                Dernière fois : {dayjs(tmpl.lastDate).format('D MMM YYYY')}
              </Text>
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* ── Dernière séance ───────────────────────────────── */}
      {lastSession && (
        <>
          <Text style={styles.sectionTitle}>Dernière séance</Text>
          <TouchableOpacity
            style={[styles.sessionCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            onPress={() => router.push(`/history/${lastSession.id}` as any)}
            activeOpacity={0.8}
          >
            <View style={styles.sessionCardRow}>
              <Ionicons name="time-outline" size={18} color={theme.primary} />
              <Text style={styles.sessionDate}>
                {dayjs(lastSession.date).format('dddd D MMM · HH:mm')}
              </Text>
            </View>
            {lastSessionVolume > 0 && (
              <Text style={styles.sessionVolume}>
                Volume : {formatVolume(lastSessionVolume, useKg)}
              </Text>
            )}
          </TouchableOpacity>
        </>
      )}

      {/* ── Records personnels ───────────────────────────── */}
      {stats.personalRecords.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>🏆 Records personnels</Text>
          <View style={[styles.recordsCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            {stats.personalRecords.map((pr, i) => (
              <TouchableOpacity
                key={pr.name}
                style={[styles.recordRow, i < stats.personalRecords.length - 1 && { ...styles.recordBorder, borderBottomColor: theme.cardBorder }]}
                onPress={() => router.push(`/exercises/${encodeURIComponent(pr.name)}` as any)}
              >
                <Text style={styles.recordName}>{pr.name}</Text>
                <Text style={styles.recordWeight}>{roundWeight(fromKg(pr.weight, useKg))} {unitLabel(useKg)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {stats.totalSessionCount === 0 && (
        <EmptyState onPress={handleNewSession} theme={theme} />
      )}
    </ScrollView>
  );
}

// ── StatCard ─────────────────────────────────────────────────

function StatCard({ icon, label, value, color, theme }: {
  icon: string; label: string; value: string; color: string;
  theme: ReturnType<typeof useAppTheme>;
}) {
  return (
    <View style={[statStyles.card, { backgroundColor: theme.card, borderColor: color + '40' }]}>
      <Ionicons name={icon as any} size={18} color={color} />
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

// ── EmptyState ───────────────────────────────────────────────

function EmptyState({ onPress, theme }: { onPress: () => void; theme: ReturnType<typeof useAppTheme> }) {
  return (
    <View style={emptyStyles.container}>
      <Text style={emptyStyles.emoji}>🏋️</Text>
      <Text style={emptyStyles.title}>Commence ton aventure</Text>
      <Text style={emptyStyles.sub}>Enregistre ta première séance et suis tes progrès.</Text>
      <TouchableOpacity style={[emptyStyles.btn, { backgroundColor: theme.primary }]} onPress={onPress}>
        <Text style={emptyStyles.btnText}>Démarrer une séance</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.base, paddingBottom: 80 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: SPACING.xl,
  },
  greeting: { fontSize: FONTS.xxl, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  date: { fontSize: FONTS.sm, color: COLORS.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  newSessionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
  },
  newSessionText: { color: '#fff', fontWeight: FONTS.bold, fontSize: FONTS.sm },

  // Prochaine séance
  nextSessionCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    borderWidth: 1.5, borderColor: COLORS.primary + '60',
    padding: SPACING.base, marginBottom: SPACING.xl,
    ...SHADOWS.card,
  },
  nextSessionHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  nextSessionEmoji: { fontSize: 28 },
  nextSessionProgram: { fontSize: FONTS.xs, fontWeight: FONTS.semibold, color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  nextSessionLabel: { fontSize: FONTS.md, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginTop: 2 },
  dayBadge: {
    backgroundColor: COLORS.primaryGlow, borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm, paddingVertical: 2,
    borderWidth: 1, borderColor: COLORS.primary + '40',
  },
  dayBadgeText: { fontSize: FONTS.xs, color: COLORS.primary, fontWeight: FONTS.bold },
  nextSessionMuscles: { fontSize: FONTS.xs, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  nextSessionExList: { gap: 4, marginBottom: SPACING.md },
  nextSessionEx: { fontSize: FONTS.sm, color: COLORS.textPrimary },
  startProgramBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.base,
  },
  startProgramBtnText: { color: '#fff', fontWeight: FONTS.bold, fontSize: FONTS.sm },

  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },

  totalVolumeCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.primaryGlow, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.primary + '40',
    padding: SPACING.base, marginBottom: SPACING.xl,
  },
  totalVolumeLabel: { fontSize: FONTS.xs, color: COLORS.textSecondary },
  totalVolumeValue: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.primary, marginTop: 2 },
  totalVolumeEmoji: { fontSize: 28 },

  sectionTitle: {
    fontSize: FONTS.base, fontWeight: FONTS.semibold,
    color: COLORS.textSecondary, marginBottom: SPACING.sm, marginTop: SPACING.xs,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  changeProgramLink: {
    fontSize: FONTS.xs,
    fontWeight: FONTS.semibold,
    color: COLORS.primary,
  },

  // Choisir un programme banner
  pickProgramCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: SPACING.base,
    marginBottom: SPACING.xl,
    ...SHADOWS.card,
  },
  pickProgramHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  pickProgramIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickProgramTitle: {
    fontSize: FONTS.base,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },
  pickProgramSub: {
    fontSize: FONTS.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },

  staleCard: {
    flexDirection: 'row', gap: SPACING.md,
    backgroundColor: COLORS.warning + '15', borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.warning + '40',
    padding: SPACING.base, marginBottom: SPACING.lg,
  },
  staleText: { fontSize: FONTS.sm, color: COLORS.textSecondary, lineHeight: 20 },
  staleCategory: { fontWeight: FONTS.bold, color: COLORS.textPrimary },

  reportCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    padding: SPACING.base, marginBottom: SPACING.xl,
    ...SHADOWS.card,
  },
  reportHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs },
  reportTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary, flex: 1 },
  reportSummaryRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, flexWrap: 'wrap' },
  reportSummaryItem: { fontSize: FONTS.sm, color: COLORS.textSecondary, fontWeight: FONTS.medium },
  reportSummaryDot: { fontSize: FONTS.sm, color: COLORS.textMuted },
  reportDetails: {
    marginTop: SPACING.md, paddingTop: SPACING.md, gap: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.separator,
  },
  reportSection: { gap: 2 },
  reportSectionTitle: {
    fontSize: FONTS.xs, fontWeight: FONTS.bold, color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  reportSectionText: { fontSize: FONTS.sm, color: COLORS.textPrimary },

  smartCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.warning + '50',
    padding: SPACING.base, marginBottom: SPACING.xl,
    ...SHADOWS.card,
  },
  smartCardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 4 },
  smartCardTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary, flex: 1 },
  smartCardSub: { fontSize: FONTS.xs, color: COLORS.textMuted, marginBottom: SPACING.md },
  smartExerciseList: { gap: SPACING.xs },
  smartExRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  smartExName: { fontSize: FONTS.sm, color: COLORS.textPrimary },
  suggestedBadge: {
    backgroundColor: COLORS.warning + '20', borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm, paddingVertical: 2,
  },
  suggestedText: { fontSize: FONTS.xs, color: COLORS.warning, fontWeight: FONTS.semibold },
  startBtnRow: {
    marginTop: SPACING.md, alignItems: 'flex-end',
  },
  startBtnText: { fontSize: FONTS.sm, color: COLORS.warning, fontWeight: FONTS.bold },

  templateCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    padding: SPACING.base, marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  templateHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  templateTitle: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.textPrimary, flex: 1 },
  countBadge: {
    backgroundColor: COLORS.primary + '25', borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm, paddingVertical: 2,
  },
  countBadgeText: { fontSize: FONTS.xs, color: COLORS.primary, fontWeight: FONTS.bold },
  templateExList: { gap: 4, marginBottom: SPACING.sm },
  templateExRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  templateExName: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  templateExWeight: { fontSize: FONTS.xs, fontWeight: FONTS.semibold },
  templateLastDate: { fontSize: FONTS.xs, color: COLORS.textMuted, fontStyle: 'italic' },

  sessionCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    padding: SPACING.base, marginBottom: SPACING.xl, gap: SPACING.xs,
    ...SHADOWS.card,
  },
  sessionCardRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  sessionDate: { fontSize: FONTS.sm, color: COLORS.textSecondary, textTransform: 'capitalize' },
  sessionVolume: { fontSize: FONTS.sm, color: COLORS.textMuted, marginLeft: 26 },

  recordsCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    overflow: 'hidden', ...SHADOWS.card,
  },
  recordRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.base },
  recordBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder },
  recordName: { fontSize: FONTS.sm, color: COLORS.textPrimary, flex: 1 },
  recordWeight: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.warning },
});

const statStyles = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: SPACING.md, alignItems: 'center', gap: 4,
    borderWidth: 1, ...SHADOWS.card,
  },
  value: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary, textAlign: 'center' },
  label: { fontSize: FONTS.xs, color: COLORS.textSecondary, textAlign: 'center' },
});

const emptyStyles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 60, gap: SPACING.md },
  emoji: { fontSize: 64 },
  title: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  sub: { fontSize: FONTS.sm, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: SPACING.xxl },
  btn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.xxl, paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
  },
  btnText: { color: '#fff', fontWeight: FONTS.bold, fontSize: FONTS.base },
});
