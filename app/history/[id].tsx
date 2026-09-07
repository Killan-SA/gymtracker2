import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { getSessionWithExercises, deleteSession, getSessionVolume } from '../../lib/queries';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import type { SessionWithExercises } from '../../types';

dayjs.locale('fr');

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<SessionWithExercises | null>(null);
  const [volume, setVolume] = useState(0);

  useEffect(() => {
    if (!id) return;
    const s = getSessionWithExercises(id);
    setSession(s);
    setVolume(getSessionVolume(id));
  }, [id]);

  const handleDelete = () => {
    Alert.alert(
      'Supprimer la séance',
      'Cette action est irréversible. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            if (id) deleteSession(id);
            router.back();
          },
        },
      ]
    );
  };

  if (!session) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>Séance introuvable.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Résumé de la séance */}
      <View style={styles.summaryCard}>
        <Text style={styles.date}>
          {dayjs(session.date).format('dddd D MMMM YYYY [à] HH[h]mm')}
        </Text>
        <View style={styles.stats}>
          <StatBadge
            label="Exercices"
            value={`${session.exercises.length}`}
            icon="barbell"
          />
          <StatBadge
            label="Séries"
            value={`${session.exercises.reduce((acc, e) => acc + e.sets.length, 0)}`}
            icon="repeat"
          />
          <StatBadge
            label="Volume"
            value={`${Math.round(volume).toLocaleString('fr')} kg`}
            icon="flash"
          />
        </View>
        {session.notes && (
          <Text style={styles.notes}>{session.notes}</Text>
        )}
      </View>

      {/* Exercices */}
      {session.exercises.map((exercise) => (
        <View key={exercise.id} style={styles.exerciseCard}>
          <View style={styles.exerciseHeader}>
            <Ionicons name="barbell" size={18} color={COLORS.primary} />
            <Text style={styles.exerciseName}>{exercise.name}</Text>
          </View>

          {/* Tableau des séries */}
          <View style={styles.setsTable}>
            <View style={styles.setsHeader}>
              <Text style={styles.colHeader}>Série</Text>
              <Text style={styles.colHeader}>Poids</Text>
              <Text style={styles.colHeader}>Reps</Text>
              <Text style={styles.colHeader}>Volume</Text>
              <Text style={styles.colHeaderRpe}>RPE</Text>
            </View>
            {exercise.sets.map((set) => (
              <View key={set.id} style={styles.setRow}>
                <Text style={styles.setNum}>{set.set_number}</Text>
                <Text style={styles.setVal}>{set.weight} kg</Text>
                <Text style={styles.setVal}>× {set.reps}</Text>
                <Text style={styles.setVol}>
                  {Math.round(set.weight * set.reps)} kg
                </Text>

              </View>
            ))}
          </View>
        </View>
      ))}

      {/* Bouton supprimer */}
      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
        <Text style={styles.deleteText}>Supprimer cette séance</Text>
      </TouchableOpacity>

      <View style={{ height: SPACING.xxxl }} />
    </ScrollView>
  );
}

function StatBadge({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={badgeStyles.container}>
      <Ionicons name={icon as any} size={18} color={COLORS.primary} />
      <Text style={badgeStyles.value}>{value}</Text>
      <Text style={badgeStyles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.base },
  notFound: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 40, fontSize: FONTS.base },

  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: SPACING.lg,
  },
  date: {
    fontSize: FONTS.base,
    fontWeight: FONTS.semibold,
    color: COLORS.textPrimary,
    textTransform: 'capitalize',
    marginBottom: SPACING.md,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  notes: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.separator,
    fontStyle: 'italic',
  },

  exerciseCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: SPACING.md,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.separator,
  },
  exerciseName: {
    fontSize: FONTS.md,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },

  setsTable: {},
  setsHeader: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  colHeader: {
    flex: 1,
    fontSize: FONTS.xs,
    fontWeight: FONTS.semibold,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  colHeaderRpe: {
    width: 36,
    fontSize: FONTS.xs,
    fontWeight: FONTS.semibold,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    paddingVertical: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.separator,
    alignItems: 'center',
  },
  setNum: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONTS.sm,
    fontWeight: FONTS.bold,
    color: COLORS.primary,
  },
  setVal: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONTS.base,
    color: COLORS.textPrimary,
  },
  setVol: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
  },
  setRpe: {
    width: 36,
    textAlign: 'center',
    fontSize: FONTS.sm,
    fontWeight: FONTS.semibold,
    color: COLORS.warning,
  },

  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.base,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.danger,
    marginTop: SPACING.lg,
    backgroundColor: COLORS.dangerGlow,
  },
  deleteText: {
    fontSize: FONTS.base,
    color: COLORS.danger,
    fontWeight: FONTS.medium,
  },
});

const badgeStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 4,
  },
  value: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },
  label: {
    fontSize: FONTS.xs,
    color: COLORS.textSecondary,
  },
});
