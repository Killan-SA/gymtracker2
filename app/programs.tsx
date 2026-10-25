import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TRAINING_PROGRAMS, getProgramById } from '../constants/programs';
import type { TrainingProgram } from '../types';
import {
  getActiveProgramId,
  setActiveProgram,
  getNextProgramDayIndex,
  createSessionFromProgramDay,
} from '../lib/queries';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

export default function ProgramsScreen() {
  const [activeProgramId, setActiveProgramId] = useState<string | null>(null);
  const [nextDayIndex, setNextDayIndex] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(() => {
    const id = getActiveProgramId();
    setActiveProgramId(id);
    setNextDayIndex(getNextProgramDayIndex());
    if (id) setExpandedId(id);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const activeProgram = activeProgramId ? getProgramById(activeProgramId) : undefined;
  const nextDay = activeProgram
    ? activeProgram.days[nextDayIndex % activeProgram.days.length]
    : null;

  const handleActivate = (program: TrainingProgram) => {
    Alert.alert(
      `Activer "${program.name}" ?`,
      'GymTracker te proposera automatiquement le prochain jour du programme à chaque séance.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Activer',
          onPress: () => {
            setActiveProgram(program.id);
            load();
          },
        },
      ]
    );
  };

  const handleDeactivate = () => {
    Alert.alert('Désactiver le programme', 'Tu pourras en choisir un autre à tout moment.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Désactiver',
        style: 'destructive',
        onPress: () => { setActiveProgram(null); load(); },
      },
    ]);
  };

  const handleStartNextDay = () => {
    if (!activeProgram || !nextDay) return;
    const nextIndex = (nextDayIndex + 1) % activeProgram.days.length;
    const sessionId = createSessionFromProgramDay(nextDay.exerciseNames, nextIndex);
    router.push(`/session/${sessionId}` as any);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ── Programme actif ────────────────────────────────── */}
      {activeProgram && nextDay ? (
        <View style={styles.activeCard}>
          <View style={styles.activeHeader}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.activeLabel}>Programme actif</Text>
          </View>
          <Text style={styles.activeName}>{activeProgram.name}</Text>

          <View style={styles.nextDayBox}>
            <Text style={styles.nextDayLabel}>Prochaine séance</Text>
            <Text style={styles.nextDayTitle}>{nextDay.label}</Text>
            <View style={styles.nextDayExList}>
              {nextDay.exerciseNames.map((name) => (
                <Text key={name} style={styles.nextDayEx}>• {name}</Text>
              ))}
            </View>
            <TouchableOpacity style={styles.startBtn} onPress={handleStartNextDay} activeOpacity={0.85}>
              <Ionicons name="play" size={18} color="#fff" />
              <Text style={styles.startBtnText}>Démarrer cette séance</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.deactivateBtn} onPress={handleDeactivate}>
            <Text style={styles.deactivateBtnText}>Désactiver ce programme</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.intro}>
          Choisis un programme et GymTracker te proposera automatiquement le bon jour à chaque séance.
        </Text>
      )}

      {/* ── Liste des programmes ───────────────────────────── */}
      <Text style={styles.sectionTitle}>Tous les programmes</Text>
      {TRAINING_PROGRAMS.map((program) => {
        const isActive = program.id === activeProgramId;
        const isExpanded = expandedId === program.id;
        return (
          <View key={program.id} style={[styles.programCard, isActive && styles.programCardActive]}>
            <TouchableOpacity
              style={styles.programHeader}
              onPress={() => setExpandedId(isExpanded ? null : program.id)}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1 }}>
                <View style={styles.programTitleRow}>
                  <Text style={styles.programName}>{program.name}</Text>
                  {isActive && (
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>Actif</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.programMeta}>
                  {program.daysPerWeek} jours/semaine · {program.days.length} séances types
                </Text>
              </View>
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>

            <Text style={styles.programDescription}>{program.description}</Text>

            {isExpanded && (
              <View style={styles.daysList}>
                {program.days.map((day) => (
                  <View key={day.label} style={styles.dayRow}>
                    <Text style={styles.dayLabel}>{day.label}</Text>
                    <Text style={styles.dayExercises}>
                      {day.exerciseNames.join(' · ')}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {!isActive && (
              <TouchableOpacity
                style={styles.activateBtn}
                onPress={() => handleActivate(program)}
                activeOpacity={0.85}
              >
                <Text style={styles.activateBtnText}>Activer ce programme</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.base, paddingBottom: 60 },

  intro: {
    fontSize: FONTS.sm, color: COLORS.textSecondary,
    marginBottom: SPACING.xl, lineHeight: 20,
  },

  activeCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.success + '50',
    padding: SPACING.base, marginBottom: SPACING.xl,
    ...SHADOWS.card,
  },
  activeHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: 4 },
  activeLabel: {
    fontSize: FONTS.xs, fontWeight: FONTS.bold, color: COLORS.success,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  activeName: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.md },
  nextDayBox: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.base, gap: SPACING.xs,
  },
  nextDayLabel: {
    fontSize: FONTS.xs, color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  nextDayTitle: { fontSize: FONTS.md, fontWeight: FONTS.bold, color: COLORS.primary, marginBottom: 4 },
  nextDayExList: { gap: 2, marginBottom: SPACING.md },
  nextDayEx: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg, padding: SPACING.md,
  },
  startBtnText: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: '#fff' },
  deactivateBtn: { alignItems: 'center', marginTop: SPACING.md, padding: SPACING.xs },
  deactivateBtnText: { fontSize: FONTS.xs, color: COLORS.danger },

  sectionTitle: {
    fontSize: FONTS.base, fontWeight: FONTS.semibold,
    color: COLORS.textSecondary, marginBottom: SPACING.sm,
  },

  programCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    padding: SPACING.base, marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  programCardActive: { borderColor: COLORS.success + '60' },
  programHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  programTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  programName: { fontSize: FONTS.md, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  activeBadge: {
    backgroundColor: COLORS.success + '25', borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm, paddingVertical: 2,
  },
  activeBadgeText: { fontSize: FONTS.xs, color: COLORS.success, fontWeight: FONTS.bold },
  programMeta: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  programDescription: {
    fontSize: FONTS.sm, color: COLORS.textSecondary,
    marginTop: SPACING.sm, lineHeight: 19,
  },

  daysList: {
    marginTop: SPACING.md, paddingTop: SPACING.md, gap: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.separator,
  },
  dayRow: { gap: 2 },
  dayLabel: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.primary },
  dayExercises: { fontSize: FONTS.xs, color: COLORS.textSecondary, lineHeight: 17 },

  activateBtn: {
    marginTop: SPACING.md, backgroundColor: COLORS.primaryGlow,
    borderRadius: RADIUS.lg, padding: SPACING.sm, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.primary,
  },
  activateBtnText: { fontSize: FONTS.sm, fontWeight: FONTS.semibold, color: COLORS.primary },
});
