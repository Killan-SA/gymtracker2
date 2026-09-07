import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { LineChart } from 'react-native-gifted-charts';
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

      {/* Graphique d'évolution du poids */}
      <Text style={styles.sectionTitle}>Évolution du poids</Text>
      {hasHistory ? (
        <View style={styles.chartCard}>
          {stats.weightHistory.length > 1 ? (
            <LineChart
              data={stats.weightHistory.map((p) => ({
                value: p.value,
                label: p.label,
              }))}
              width={Dimensions.get('window').width - SPACING.base * 2 - SPACING.base * 2 - 20}
              height={180}
              spacing={Math.max(
                36,
                (Dimensions.get('window').width - SPACING.base * 4 - 40) /
                  Math.max(stats.weightHistory.length - 1, 1)
              )}
              initialSpacing={16}
              endSpacing={16}
              color={COLORS.primary}
              thickness={2.5}
              startFillColor={COLORS.primary}
              endFillColor={COLORS.background}
              startOpacity={0.35}
              endOpacity={0.02}
              areaChart
              curved
              dataPointsColor={COLORS.primary}
              dataPointsRadius={4}
              yAxisTextStyle={{ color: COLORS.textMuted, fontSize: FONTS.xs }}
              xAxisLabelTextStyle={{ color: COLORS.textMuted, fontSize: FONTS.xs }}
              yAxisColor={COLORS.cardBorder}
              xAxisColor={COLORS.cardBorder}
              rulesColor={COLORS.cardBorder}
              rulesType="solid"
              noOfSections={4}
              yAxisLabelSuffix=" kg"
              hideDataPoints={false}
              showVerticalLines={false}
              pointerConfig={{
                pointerStripHeight: 160,
                pointerStripColor: COLORS.primary,
                pointerStripUptoDataPoint: true,
                pointerColor: COLORS.primary,
                radius: 5,
                pointerLabelWidth: 80,
                pointerLabelHeight: 40,
                activatePointersOnLongPress: true,
                autoAdjustPointerLabelPosition: true,
                pointerLabelComponent: (items: any) => (
                  <View style={styles.tooltip}>
                    <Text style={styles.tooltipText}>
                      {items[0]?.value} kg
                    </Text>
                  </View>
                ),
              }}
            />
          ) : (
            <View style={styles.singlePoint}>
              <Ionicons name="analytics" size={32} color={COLORS.primary} />
              <Text style={styles.chartSubtext}>
                Encore une séance pour voir la courbe
              </Text>
            </View>
          )}
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

  plateauBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.base,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  plateauBannerSuccess: {
    backgroundColor: COLORS.successGlow,
    borderColor: `${COLORS.success}40`,
  },
  plateauBannerWarning: {
    backgroundColor: COLORS.warningGlow,
    borderColor: `${COLORS.warning}40`,
  },
  plateauBannerDanger: {
    backgroundColor: COLORS.dangerGlow,
    borderColor: `${COLORS.danger}40`,
  },
  plateauText: {
    flex: 1,
    fontSize: FONTS.sm,
    color: COLORS.textPrimary,
    lineHeight: 19,
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

  chartCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: 'hidden',
  },
  singlePoint: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xl,
  },
  chartSubtext: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
  },
  tooltip: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  tooltipText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.xs,
    fontWeight: FONTS.bold,
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
