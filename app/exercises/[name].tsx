import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-gifted-charts';
import dayjs from 'dayjs';
import { getExerciseStats } from '../../lib/queries';
import type { ExerciseStats, ChartPoint } from '../../types';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - SPACING.base * 2 - 32; // marges

type MetricTab = 'weight' | 'volume' | 'reps';
type PeriodTab = '1M' | '3M' | '6M' | '1A' | 'Tout';

const PERIODS: { label: PeriodTab; days?: number }[] = [
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1A', days: 365 },
  { label: 'Tout' },
];

export default function ExerciseDetailScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const [metric, setMetric] = useState<MetricTab>('weight');
  const [period, setPeriod] = useState<PeriodTab>('3M');
  const [stats, setStats] = useState<ExerciseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [focusedPoint, setFocusedPoint] = useState<{ value: number; label: string } | null>(null);

  const reload = useCallback(() => {
    if (!name) return;
    setLoading(true);
    setFocusedPoint(null);
    const selectedPeriod = PERIODS.find((p) => p.label === period);
    const s = getExerciseStats(decodeURIComponent(name), selectedPeriod?.days);
    setStats(s);
    setLoading(false);
  }, [name, period]);

  useEffect(() => { reload(); }, [reload]);

  if (loading || !stats) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  // Données du graphique selon la métrique choisie
  const chartData: ChartPoint[] =
    metric === 'weight' ? stats.weightHistory :
    metric === 'volume' ? stats.volumeHistory :
    stats.repsHistory;

  const chartColor =
    metric === 'weight' ? COLORS.primary :
    metric === 'volume' ? COLORS.success :
    COLORS.warning;

  const chartLabel =
    metric === 'weight' ? 'kg max' :
    metric === 'volume' ? 'kg·reps' :
    'reps max';

  const gifted = chartData.map((p) => ({
    value: p.value,
    label: p.label ?? '',
  }));

  // Si on a trop de points, n'afficher qu'un label sur X
  const labelStep = gifted.length > 10 ? Math.ceil(gifted.length / 6) : 1;
  const giftedLabeled = gifted.map((p, i) => ({
    ...p,
    label: i % labelStep === 0 ? p.label : '',
  }));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Progression depuis le début ──────────────────── */}
      {stats.firstWeight > 0 && stats.totalSessions > 1 && (
        <View style={styles.progressionBanner}>
          <Ionicons
            name={stats.progressionFromStart >= 0 ? 'trending-up' : 'trending-down'}
            size={20}
            color={stats.progressionFromStart >= 0 ? COLORS.success : COLORS.danger}
          />
          <Text style={styles.progressionText}>
            Départ {dayjs(stats.firstDate).format('DD/MM/YY')} →{' '}
            <Text style={{ fontWeight: FONTS.bold }}>
              {stats.firstWeight} kg
            </Text>
            {'  '}Aujourd'hui →{' '}
            <Text style={{ fontWeight: FONTS.bold }}>{stats.lastWeight} kg</Text>
            {'  '}
            <Text style={{
              color: stats.progressionFromStart >= 0 ? COLORS.success : COLORS.danger,
              fontWeight: FONTS.bold,
            }}>
              {stats.progressionFromStart >= 0 ? '+' : ''}{stats.progressionFromStart} kg
              {' '}({stats.progressionFromStartPercent >= 0 ? '+' : ''}{stats.progressionFromStartPercent}%)
            </Text>
          </Text>
        </View>
      )}

      {/* ── Plateau warning ───────────────────────────────── */}
      {stats.plateauDetected && stats.totalSessions >= 3 && (
        <View style={styles.plateauBanner}>
          <Ionicons name="warning" size={18} color={COLORS.warning} />
          <Text style={styles.plateauText}>
            📊 Plateau détecté — les 3 dernières séances n'ont pas progressé. Change d'angle ou augmente la charge !
          </Text>
        </View>
      )}

      {/* ── Cards stats ───────────────────────────────────── */}
      <View style={styles.statsGrid}>
        <StatCard icon="trophy" label="Record" value={`${stats.personalRecord} kg`} color={COLORS.warning} />
        <StatCard icon="barbell" label="Dernière" value={`${stats.lastWeight} kg`} color={COLORS.primary} />
        <StatCard icon="flash" label="1RM estimé" value={`${stats.estimated1RM} kg`} color="#BF5FFF" subtitle="Épley" />
        <StatCard icon="calendar" label="Séances" value={`${stats.totalSessions}`} color={COLORS.success} />
        <StatCard
          icon="trending-up"
          label="30 jours"
          value={`${stats.progressionPercent >= 0 ? '+' : ''}${stats.progressionPercent}%`}
          color={stats.progressionPercent >= 0 ? COLORS.success : COLORS.danger}
        />
        <StatCard
          icon="stats-chart"
          label="Progression"
          value={`${stats.progressionFromStartPercent >= 0 ? '+' : ''}${stats.progressionFromStartPercent}%`}
          color={COLORS.primary}
          subtitle="depuis le début"
        />
      </View>

      {/* ── Graphique ─────────────────────────────────────── */}
      <View style={styles.chartCard}>
        {/* Sélecteur métrique */}
        <View style={styles.metricRow}>
          {(['weight', 'volume', 'reps'] as MetricTab[]).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.metricBtn, metric === m && { backgroundColor: chartColor + '30', borderColor: chartColor }]}
              onPress={() => setMetric(m)}
            >
              <Text style={[styles.metricBtnText, metric === m && { color: chartColor }]}>
                {m === 'weight' ? '⚖️ Poids' : m === 'volume' ? '🔥 Volume' : '🔄 Reps'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sélecteur période */}
        <View style={styles.periodRow}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p.label}
              style={[styles.periodBtn, period === p.label && styles.periodBtnActive]}
              onPress={() => setPeriod(p.label)}
            >
              <Text style={[styles.periodBtnText, period === p.label && styles.periodBtnTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Chart */}
        {giftedLabeled.length >= 2 ? (
          <View style={styles.chartWrapper}>
            {/* Tooltip du point sélectionné */}
            <View style={styles.tooltipRow}>
              {focusedPoint ? (
                <View style={[styles.tooltip, { borderColor: chartColor }]}>
                  <Text style={[styles.tooltipValue, { color: chartColor }]}>
                    {focusedPoint.value} {metric === 'reps' ? 'reps' : 'kg'}
                  </Text>
                  <Text style={styles.tooltipDate}>{focusedPoint.label}</Text>
                </View>
              ) : (
                <Text style={styles.tooltipHint}>Appuie sur un point pour voir la valeur</Text>
              )}
            </View>
            <LineChart
              areaChart
              data={giftedLabeled}
              width={CHART_WIDTH}
              height={180}
              color={chartColor}
              thickness={2.5}
              startFillColor={chartColor}
              endFillColor="transparent"
              startOpacity={0.25}
              endOpacity={0}
              dataPointsColor={chartColor}
              dataPointsRadius={5}
              backgroundColor="transparent"
              rulesColor={COLORS.separator}
              rulesType="solid"
              noOfSections={4}
              yAxisTextStyle={{ color: COLORS.textMuted, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: COLORS.textMuted, fontSize: 10 }}
              xAxisColor={COLORS.separator}
              yAxisColor="transparent"
              curved
              focusEnabled
              showDataPointOnFocus
              showStripOnFocus
              stripColor={chartColor + '60'}
              stripWidth={1}
              focusedDataPointColor={chartColor}
              focusedDataPointRadius={7}
              onFocus={(item: any) => {
                setFocusedPoint({ value: item.value, label: item.label ?? '' });
              }}
            />
            <Text style={styles.chartUnit}>{chartLabel}</Text>
          </View>
        ) : (
          <View style={styles.noDataChart}>
            <Ionicons name="stats-chart-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.noDataText}>
              {chartData.length === 0
                ? 'Pas encore de données pour cette période.'
                : 'Il faut au moins 2 séances pour afficher un graphique.'}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ── StatCard ─────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  color,
  subtitle,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
  subtitle?: string;
}) {
  return (
    <View style={[statStyles.card, { borderColor: color + '40' }]}>
      <Ionicons name={icon as any} size={18} color={color} />
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
      {subtitle && <Text style={statStyles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.base, paddingBottom: 60 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },

  progressionBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
    backgroundColor: COLORS.successGlow, borderRadius: RADIUS.lg,
    padding: SPACING.base, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.success + '40',
  },
  progressionText: { flex: 1, fontSize: FONTS.sm, color: COLORS.textSecondary, lineHeight: 20 },

  plateauBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
    backgroundColor: COLORS.warningGlow, borderRadius: RADIUS.lg,
    padding: SPACING.base, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.warning + '40',
  },
  plateauText: { flex: 1, fontSize: FONTS.sm, color: COLORS.warning, lineHeight: 20 },

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },

  chartCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: SPACING.base, borderWidth: 1, borderColor: COLORS.cardBorder,
    ...SHADOWS.card,
  },

  metricRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  metricBtn: {
    flex: 1, paddingVertical: SPACING.sm, borderRadius: RADIUS.md,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.surface,
  },
  metricBtnText: { fontSize: FONTS.xs, fontWeight: FONTS.semibold, color: COLORS.textMuted },

  periodRow: { flexDirection: 'row', gap: SPACING.xs, marginBottom: SPACING.lg },
  periodBtn: {
    flex: 1, paddingVertical: SPACING.xs, borderRadius: RADIUS.sm,
    alignItems: 'center', backgroundColor: 'transparent',
  },
  periodBtnActive: { backgroundColor: COLORS.primary + '25' },
  periodBtnText: { fontSize: FONTS.xs, color: COLORS.textMuted, fontWeight: FONTS.medium },
  periodBtnTextActive: { color: COLORS.primary, fontWeight: FONTS.bold },

  chartWrapper: { alignItems: 'center' },
  chartUnit: {
    fontSize: FONTS.xs, color: COLORS.textMuted,
    alignSelf: 'flex-end', marginTop: 4, fontStyle: 'italic',
  },

  tooltipRow: {
    height: 44, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.sm,
  },
  tooltip: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    borderWidth: 1,
  },
  tooltipValue: { fontSize: FONTS.lg, fontWeight: FONTS.bold },
  tooltipDate: { fontSize: FONTS.sm, color: COLORS.textMuted },
  tooltipHint: { fontSize: FONTS.xs, color: COLORS.textMuted, fontStyle: 'italic' },

  noDataChart: {
    alignItems: 'center', paddingVertical: SPACING.xxxl, gap: SPACING.md,
  },
  noDataText: {
    fontSize: FONTS.sm, color: COLORS.textMuted, textAlign: 'center',
    paddingHorizontal: SPACING.xl, lineHeight: 20,
  },
});

const statStyles = StyleSheet.create({
  card: {
    width: '31%', minWidth: 100,
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: SPACING.md, alignItems: 'center', gap: 4,
    borderWidth: 1,
  },
  value: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  label: { fontSize: FONTS.xs, color: COLORS.textSecondary, textAlign: 'center' },
  subtitle: { fontSize: 10, color: COLORS.textMuted, fontStyle: 'italic' },
});
