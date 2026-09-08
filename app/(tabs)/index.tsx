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
import { router } from 'expo-router';
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
} from '../../lib/queries';
import type { SessionTemplate } from '../../lib/queries';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import type { Session, DashboardStats } from '../../types';

dayjs.locale('fr');

const formatVolume = (kg: number): string => {
  if (kg >= 1_000_000) return `${(kg / 1_000_000).toFixed(1)} Mt`;
  if (kg >= 1_000) return `${(kg / 1_000).toFixed(1)} t`;
  return `${kg} kg`;
};

export default function DashboardScreen() {
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
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

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
        `• ${ex.name}${ex.suggestedWeight > 0 ? ` → ${ex.suggestedWeight} kg` : ''}`
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bonjour 👋</Text>
          <Text style={styles.date}>{dayjs().format('dddd D MMMM')}</Text>
        </View>
        <TouchableOpacity style={styles.newSessionBtn} onPress={handleNewSession}>
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.newSessionText}>Séance</Text>
        </TouchableOpacity>
      </View>

      {/* ── Stats principales ──────────────────────────────── */}
      <View style={styles.statsRow}>
        <StatCard
          icon="flame"
          label="Vol. 7 jours"
          value={formatVolume(stats.weeklyVolume)}
          color={COLORS.warning}
        />
        <StatCard
          icon="calendar"
          label="Ce mois"
          value={`${stats.monthlySessionCount} séances`}
          color={COLORS.primary}
        />
        <StatCard
          icon="barbell"
          label="Total séances"
          value={`${stats.totalSessionCount}`}
          color={COLORS.success}
        />
      </View>

      {/* ── Volume total all-time ─────────────────────────── */}
      {totalVolume > 0 && (
        <View style={styles.totalVolumeCard}>
          <Ionicons name="stats-chart" size={22} color={COLORS.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.totalVolumeLabel}>Volume total soulevé depuis le début</Text>
            <Text style={styles.totalVolumeValue}>{formatVolume(totalVolume)}</Text>
          </View>
          <Text style={styles.totalVolumeEmoji}>
            {totalVolume >= 1_000_000 ? '🏆' : totalVolume >= 100_000 ? '🔥' : '💪'}
          </Text>
        </View>
      )}

      {/* ── Séance intelligente (plateau) ─────────────────── */}
      {smartSession && (
        <>
          <Text style={styles.sectionTitle}>🧠 Séance conseillée</Text>
          <TouchableOpacity
            style={styles.smartCard}
            onPress={() => handleStartTemplate(smartSession, 'Séance anti-plateau')}
            activeOpacity={0.85}
          >
            <View style={styles.smartCardHeader}>
              <Ionicons name="trending-up" size={20} color={COLORS.warning} />
              <Text style={styles.smartCardTitle}>Tu stagnes — voici comment débloquer</Text>
            </View>
            <Text style={styles.smartCardSub}>
              {smartSession.exercises.length} exercice{smartSession.exercises.length > 1 ? 's' : ''} avec plateau détecté · +2.5 kg recommandé
            </Text>
            <View style={styles.smartExerciseList}>
              {smartSession.exercises.map((ex) => (
                <View key={ex.name} style={styles.smartExRow}>
                  <Text style={styles.smartExName}>{ex.name}</Text>
                  {ex.suggestedWeight > 0 && (
                    <View style={styles.suggestedBadge}>
                      <Text style={styles.suggestedText}>
                        {ex.lastWeight} → {ex.suggestedWeight} kg
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
              style={styles.templateCard}
              onPress={() => handleStartTemplate(tmpl, `Séance ${i + 1}`)}
              activeOpacity={0.85}
            >
              <View style={styles.templateHeader}>
                <Text style={styles.templateTitle}>
                  {tmpl.exercises.slice(0, 2).map(e => e.name).join(' + ')}
                  {tmpl.exercises.length > 2 ? ` +${tmpl.exercises.length - 2}` : ''}
                </Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{tmpl.count}×</Text>
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
                        {ex.plateauDetected ? '⟳' : '↑'} {ex.suggestedWeight} kg
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
            style={styles.sessionCard}
            onPress={() => router.push(`/history/${lastSession.id}` as any)}
            activeOpacity={0.8}
          >
            <View style={styles.sessionCardRow}>
              <Ionicons name="time-outline" size={18} color={COLORS.primary} />
              <Text style={styles.sessionDate}>
                {dayjs(lastSession.date).format('dddd D MMM · HH:mm')}
              </Text>
            </View>
            {lastSessionVolume > 0 && (
              <Text style={styles.sessionVolume}>
                Volume : {formatVolume(lastSessionVolume)}
              </Text>
            )}
          </TouchableOpacity>
        </>
      )}

      {/* ── Records personnels ───────────────────────────── */}
      {stats.personalRecords.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>🏆 Records personnels</Text>
          <View style={styles.recordsCard}>
            {stats.personalRecords.map((pr, i) => (
              <TouchableOpacity
                key={pr.name}
                style={[styles.recordRow, i < stats.personalRecords.length - 1 && styles.recordBorder]}
                onPress={() => router.push(`/exercises/${encodeURIComponent(pr.name)}` as any)}
              >
                <Text style={styles.recordName}>{pr.name}</Text>
                <Text style={styles.recordWeight}>{pr.weight} kg</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {stats.totalSessionCount === 0 && (
        <EmptyState onPress={handleNewSession} />
      )}
    </ScrollView>
  );
}

// ── StatCard ─────────────────────────────────────────────────

function StatCard({ icon, label, value, color }: {
  icon: string; label: string; value: string; color: string;
}) {
  return (
    <View style={[statStyles.card, { borderColor: color + '40' }]}>
      <Ionicons name={icon as any} size={18} color={color} />
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

// ── EmptyState ───────────────────────────────────────────────

function EmptyState({ onPress }: { onPress: () => void }) {
  return (
    <View style={emptyStyles.container}>
      <Text style={emptyStyles.emoji}>🏋️</Text>
      <Text style={emptyStyles.title}>Commence ton aventure</Text>
      <Text style={emptyStyles.sub}>Enregistre ta première séance et suis tes progrès.</Text>
      <TouchableOpacity style={emptyStyles.btn} onPress={onPress}>
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
