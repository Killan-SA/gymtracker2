import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import {
  getAllSessions,
  deleteSession,
  getSessionVolume,
} from '../../lib/queries';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import type { Session } from '../../types';

dayjs.locale('fr');

type SessionWithVolume = Session & { volume: number };

export default function HistoryScreen() {
  const [sessions, setSessions] = useState<SessionWithVolume[]>([]);

  const loadSessions = useCallback(() => {
    const rawSessions = getAllSessions();
    const withVolume: SessionWithVolume[] = rawSessions.map((s) => ({
      ...s,
      volume: getSessionVolume(s.id),
    }));
    setSessions(withVolume);
  }, []);

  // Recharge les données chaque fois que l'onglet devient actif
  useFocusEffect(useCallback(() => { loadSessions(); }, [loadSessions]));

  const handleDelete = (session: Session) => {
    Alert.alert(
      'Supprimer la séance',
      `Supprimer la séance du ${dayjs(session.date).format('D MMMM [à] HH[h]mm')} ? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            deleteSession(session.id);
            loadSessions();
          },
        },
      ]
    );
  };

  if (sessions.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyHistory />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <SessionCard
            session={item}
            onPress={() => router.push(`/history/${item.id}`)}
            onDelete={() => handleDelete(item)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

function SessionCard({
  session,
  onPress,
  onDelete,
}: {
  session: SessionWithVolume;
  onPress: () => void;
  onDelete: () => void;
}) {
  const date = dayjs(session.date);
  const isToday = date.isSame(dayjs(), 'day');

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.cardLeft}>
        <View style={styles.dateCircle}>
          <Text style={styles.dateDay}>{date.format('D')}</Text>
          <Text style={styles.dateMonth}>{date.format('MMM')}</Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>
            {isToday ? "Aujourd'hui" : date.format('dddd D MMMM')}
          </Text>
          <Text style={styles.cardTime}>{date.format('HH[h]mm')}</Text>
        </View>
        <Text style={styles.cardVolume}>
          Volume : {Math.round(session.volume).toLocaleString('fr')} kg
        </Text>
        {session.notes && (
          <Text style={styles.cardNotes} numberOfLines={1}>
            {session.notes}
          </Text>
        )}
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={onDelete}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
        </TouchableOpacity>
        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

function EmptyHistory() {
  return (
    <View style={emptyStyles.container}>
      <Text style={emptyStyles.emoji}>📋</Text>
      <Text style={emptyStyles.title}>Aucune séance</Text>
      <Text style={emptyStyles.subtitle}>
        Tes séances enregistrées apparaîtront ici.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  listContent: { padding: SPACING.base },
  separator: { height: SPACING.sm },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cardLeft: {},
  dateCircle: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${COLORS.primary}40`,
  },
  dateDay: {
    fontSize: FONTS.md,
    fontWeight: FONTS.bold,
    color: COLORS.primary,
    lineHeight: 20,
  },
  dateMonth: {
    fontSize: FONTS.xs,
    color: COLORS.primaryLight,
    textTransform: 'uppercase',
    fontWeight: FONTS.medium,
  },
  cardContent: { flex: 1 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: FONTS.base,
    fontWeight: FONTS.semibold,
    color: COLORS.textPrimary,
    textTransform: 'capitalize',
    flex: 1,
  },
  cardTime: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginLeft: 8,
  },
  cardVolume: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
  },
  cardNotes: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
    marginTop: 2,
    fontStyle: 'italic',
  },
  cardActions: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  deleteButton: {
    padding: SPACING.xs,
  },
});

const emptyStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emoji: { fontSize: 56, marginBottom: SPACING.lg },
  title: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONTS.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
