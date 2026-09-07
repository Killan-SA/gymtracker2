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
import { BarChart } from 'react-native-gifted-charts';
import {
  getLastSession,
  getDashboardStats,
  getSessionVolume,
  createSession,
} from '../../lib/queries';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import type { Session, DashboardStats } from '../../types';

dayjs.locale('fr');

const BAR_COLORS = [
  COLORS.primary,
  COLORS.success,
  COLORS.warning,
  COLORS.danger,
  COLORS.primaryLight,
  '#8B5CF6',
  '#22D3EE',
  '#F472B6',
];

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

  const loadData = useCallback(() => {
    const session = getLastSession();
    const dashboardStats = getDashboardStats();
    setLastSession(session);
    setStats(dashboardStats);
    if (session) {
      setLastSessionVolume(getSessionVolume(session.id));
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
          text: 'C\'est parti ! 💪',
          onPress: () => {
            const session = createSession();
            router.push(`/session/${session.id}`);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {getGreeting()}
            </Text>
            <Text style={styles.date}>
              {dayjs().format('dddd D MMMM')}
            </Text>
          </View>
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={16} color={COLORS.warning} />
            <Text style={styles.streakText}>{stats.monthlySessionCount}</Text>
          </View>
        </View>

        {/* CTA Bouton principal */}
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handleNewSession}
          activeOpacity={0.85}
        >
          <View style={styles.ctaContent}>
            <Ionicons name="add-circle" size={28} color={COLORS.textPrimary} />
            <View style={styles.ctaTextContainer}>
              <Text style={styles.ctaTitle}>Commencer une séance</Text>
              <Text style={styles.ctaSubtitle}>Enregistre tes performances</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.primaryLight} />
        </TouchableOpacity>

        {/* Stats rapides */}
        <Text style={styles.sectionTitle}>Cette semaine</Text>
        <View style={styles.statsGrid}>
          <StatCard
            icon="flash"
            iconColor={COLORS.primary}
            label="Volume total"
            value={`${Math.round(stats.weeklyVolume).toLocaleString('fr')} kg`}
          />
          <StatCard
            icon="calendar"
            iconColor={COLORS.success}
            label="Séances ce mois"
            value={`${stats.monthlySessionCount}`}
          />
        </View>

        {/* Dernière séance */}
        {lastSession ? (
          <>
            <Text style={styles.sectionTitle}>Dernière séance</Text>
            <TouchableOpacity
              style={styles.lastSessionCard}
              onPress={() => router.push(`/history/${lastSession.id}`)}
              activeOpacity={0.8}
            >
              <View style={styles.lastSessionHeader}>
                <View style={styles.lastSessionIconContainer}>
                  <Ionicons name="barbell" size={20} color={COLORS.primary} />
                </View>
                <View style={styles.lastSessionInfo}>
                  <Text style={styles.lastSessionDate}>
                    {dayjs(lastSession.date).format('dddd D MMMM [à] HH[h]mm')}
                  </Text>
                  <Text style={styles.lastSessionVolume}>
                    Volume : {Math.round(lastSessionVolume).toLocaleString('fr')} kg
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
              </View>
              {lastSession.notes && (
                <Text style={styles.lastSessionNotes}>{lastSession.notes}</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <EmptyState />
        )}


        {/* Records personnels */}
        {stats.personalRecords.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Records personnels 🏆</Text>
            <View style={styles.recordsList}>
              {stats.personalRecords.map((record, i) => (
                <TouchableOpacity
                  key={record.name}
                  style={styles.recordItem}
                  onPress={() => router.push(`/exercises/${encodeURIComponent(record.name)}`)}
                  activeOpacity={0.8}
                >
                  <View style={styles.recordRank}>
                    <Text style={styles.recordRankText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.recordName} numberOfLines={1}>{record.name}</Text>
                  <Text style={styles.recordWeight}>{record.weight} kg</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

// ============================================================
// Sous-composants
// ============================================================

function StatCard({
  icon,
  iconColor,
  label,
  value,
}: {
  icon: string;
  iconColor: string;
  label: string;
  value: string;
}) {
  return (
    <View style={statStyles.card}>
      <Ionicons name={icon as any} size={22} color={iconColor} />
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={emptyStyles.container}>
      <Text style={emptyStyles.emoji}>💪</Text>
      <Text style={emptyStyles.title}>Prêt à commencer ?</Text>
      <Text style={emptyStyles.subtitle}>
        Enregistre ta première séance pour voir ta progression ici.
      </Text>
    </View>
  );
}

// ============================================================
// Utilitaires
// ============================================================

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour 👋';
  if (hour < 18) return 'Bon après-midi 👋';
  return 'Bonsoir 👋';
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.base, paddingTop: SPACING.lg },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  greeting: {
    fontSize: FONTS.xxl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },
  date: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.warningGlow,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: `${COLORS.warning}40`,
  },
  streakText: {
    fontSize: FONTS.base,
    fontWeight: FONTS.bold,
    color: COLORS.warning,
  },

  ctaButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
    ...SHADOWS.primary,
  },
  ctaContent: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  ctaTextContainer: {},
  ctaTitle: {
    fontSize: FONTS.md,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },
  ctaSubtitle: {
    fontSize: FONTS.sm,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },

  sectionTitle: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.semibold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACING.md,
  },

  statsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },

  chartCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: SPACING.xl,
    overflow: 'hidden',
    ...SHADOWS.card,
  },

  lastSessionCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: SPACING.xl,
    ...SHADOWS.card,
  },
  lastSessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  lastSessionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastSessionInfo: { flex: 1 },
  lastSessionDate: {
    fontSize: FONTS.base,
    fontWeight: FONTS.semibold,
    color: COLORS.textPrimary,
    textTransform: 'capitalize',
  },
  lastSessionVolume: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  lastSessionNotes: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.separator,
  },

  recordsList: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: 'hidden',
    marginBottom: SPACING.xl,
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.base,
    gap: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.separator,
  },
  recordRank: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordRankText: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.bold,
    color: COLORS.primary,
  },
  recordName: {
    flex: 1,
    fontSize: FONTS.base,
    color: COLORS.textPrimary,
    fontWeight: FONTS.medium,
  },
  recordWeight: {
    fontSize: FONTS.base,
    fontWeight: FONTS.bold,
    color: COLORS.primary,
  },

  bottomSpacer: { height: SPACING.xl },
});

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    alignItems: 'flex-start',
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    ...SHADOWS.card,
  },
  value: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  label: {
    fontSize: FONTS.xs,
    color: COLORS.textSecondary,
  },
});

const emptyStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
    paddingHorizontal: SPACING.xl,
  },
  emoji: { fontSize: 56, marginBottom: SPACING.lg },
  title: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONTS.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
