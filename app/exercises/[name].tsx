import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { getExerciseStats } from '../../lib/queries';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import type { ExerciseStats } from '../../types';

export default function ExerciseDetailScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const [stats, setStats] = useState<ExerciseStats | null>(null);
  const decodedName = decodeURIComponent(name ?? '');

  useEffect(() => {
    if (!decodedName) return;
    const s = getExerciseStats(decodedName);
    setStats(s);
  }, [decodedName]);

  if (!stats) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  const hasHistory = stats.weightHistory.length > 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Titre */}
      <Text style={styles.exerciseName}>{decodedName}</Text>

      {/* Cartes de stats */}
      <View style={styles.statsRow}>
        <StatCard
          label="Record"
          value={`${stats.personalRecord} kg`}
          icon="trophy"
          iconColor={COLORS.warning}
          highlight
        />
        <StatCard
          label="Dernière fois"
          value={`${stats.lastWeight} kg`}
          icon="barbell"
          iconColor={COLORS.primary}
        />
      </View>
      <View style={styles.statsRow}>
        <StatCard
          label="Séances"
          value={`${stats.totalSessions}`}
          icon="calendar"
          iconColor={COLORS.success}
        />
        <StatCard
          label="Progression 30j"
          value={`${stats.progressionPercent > 0 ? '+' : ''}${stats.progressionPercent}%`}
          icon={stats.progressionPercent >= 0 ? 'trending-up' : 'trending-down'}
          iconColor={stats.progressionPercent >= 0 ? COLORS.success : COLORS.danger}
        />
      </View>

      {/* Graphique — Sprint 4 */}
      <Text style={styles.sectionTitle}>Évolution du poids</Text>
      {hasHistory ? (
        <View style={styles.chartPlaceholder}>
          {/* Les graphiques seront ajoutés au Sprint 4 */}
          <Ionicons name="bar-chart" size={40} color={COLORS.primary} />
          <Text style={styles.chartPlaceholderText}>
            Graphique disponible au Sprint 4
          </Text>
          <Text style={styles.chartSubtext}>
            {stats.weightHistory.length} point(s) de données
          </Text>
        </View>
      ) : (
        <View style={styles.noData}>
          <Text style={styles.noDataText}>Aucune donnée disponible</Text>
        </View>
      )}

      {/* Historique des performances */}
      {hasHistory && (
        <>
          <Text style={styles.sectionTitle}>Historique</Text>
          <View style={styles.historyCard}>
            {stats.weightHistory.slice().reverse().slice(0, 10).map((point, i) => (
              <View key={i} style={styles.historyRow}>
                <Text style={styles.historyDate}>
                  {dayjs(point.date).format('DD/MM/YY')}
                </Text>
                <View style={styles.historyBar}>
                  <View
                    style={[
                      styles.historyBarFill,
                      {
                        width: `${(point.value / stats.personalRecord) * 100}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.historyWeight}>{point.value} kg</Text>
              </View>
            ))}
          </View>
        </>
      )}

      <View style={{ height: SPACING.xxxl }} />
    </ScrollView>
  );
}

function StatCard({
  label,
  value,
  icon,
  iconColor,
  highlight,
}: {
  label: string;
  value: string;
  icon: string;
  iconColor: string;
  highlight?: boolean;
}) {
  return (
    <View
      style={[
        statStyles.card,
        highlight && { borderColor: COLORS.warning, borderWidth: 1.5 },
      ]}
    >
      <Ionicons name={icon as any} size={22} color={iconColor} />
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.base },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },

  exerciseName: {
    fontSize: FONTS.xxl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },

  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },

  sectionTitle: {
    fontSize: FONTS.xs,
    fontWeight: FONTS.semibold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACING.md,
    marginTop: SPACING.lg,
  },

  chartPlaceholder: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderStyle: 'dashed',
  },
  chartPlaceholderText: {
    fontSize: FONTS.base,
    color: COLORS.textSecondary,
    fontWeight: FONTS.medium,
  },
  chartSubtext: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
  },

  noData: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  noDataText: {
    fontSize: FONTS.base,
    color: COLORS.textMuted,
  },

  historyCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    gap: SPACING.sm,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  historyDate: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    width: 64,
  },
  historyBar: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  historyBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
  },
  historyWeight: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    width: 56,
    textAlign: 'right',
  },
});

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    alignItems: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  value: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },
  label: {
    fontSize: FONTS.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
