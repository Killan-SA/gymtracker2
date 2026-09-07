import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import dayjs, { Dayjs } from 'dayjs';
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
type ViewMode = 'list' | 'calendar';

export default function HistoryScreen() {
  const [sessions, setSessions] = useState<SessionWithVolume[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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

  // Séances du jour sélectionné (vue calendrier)
  const selectedDaySessions = useMemo(() => {
    if (!selectedDate) return [];
    return sessions.filter((s) => dayjs(s.date).isSame(selectedDate, 'day'));
  }, [sessions, selectedDate]);

  const isEmpty = sessions.length === 0;

  return (
    <View style={styles.container}>
      {!isEmpty && (
        <ViewToggle mode={viewMode} onChange={setViewMode} />
      )}

      {isEmpty ? (
        <EmptyHistory />
      ) : viewMode === 'list' ? (
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
      ) : (
        <CalendarView
          sessions={sessions}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          selectedDaySessions={selectedDaySessions}
          onPressSession={(id) => router.push(`/history/${id}`)}
          onDeleteSession={handleDelete}
        />
      )}
    </View>
  );
}

function ViewToggle({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (m: ViewMode) => void;
}) {
  return (
    <View style={toggleStyles.container}>
      <TouchableOpacity
        style={[toggleStyles.option, mode === 'list' && toggleStyles.optionActive]}
        onPress={() => onChange('list')}
        activeOpacity={0.8}
      >
        <Ionicons
          name="list"
          size={16}
          color={mode === 'list' ? COLORS.textPrimary : COLORS.textMuted}
        />
        <Text
          style={[
            toggleStyles.optionText,
            mode === 'list' && toggleStyles.optionTextActive,
          ]}
        >
          Liste
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[toggleStyles.option, mode === 'calendar' && toggleStyles.optionActive]}
        onPress={() => onChange('calendar')}
        activeOpacity={0.8}
      >
        <Ionicons
          name="calendar"
          size={16}
          color={mode === 'calendar' ? COLORS.textPrimary : COLORS.textMuted}
        />
        <Text
          style={[
            toggleStyles.optionText,
            mode === 'calendar' && toggleStyles.optionTextActive,
          ]}
        >
          Calendrier
        </Text>
      </TouchableOpacity>
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

function CalendarView({
  sessions,
  selectedDate,
  onSelectDate,
  selectedDaySessions,
  onPressSession,
  onDeleteSession,
}: {
  sessions: SessionWithVolume[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  selectedDaySessions: SessionWithVolume[];
  onPressSession: (id: string) => void;
  onDeleteSession: (session: Session) => void;
}) {
  const [visibleMonth, setVisibleMonth] = useState<Dayjs>(dayjs().startOf('month'));

  // Regroupe les séances par jour (clé "YYYY-MM-DD") pour un lookup rapide
  const sessionsByDay = useMemo(() => {
    const map = new Map<string, SessionWithVolume[]>();
    for (const s of sessions) {
      const key = dayjs(s.date).format('YYYY-MM-DD');
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    return map;
  }, [sessions]);

  // Construit la grille du mois (lundi en premier), avec padding avant/après
  const gridDays = useMemo(() => {
    const startOfMonth = visibleMonth.startOf('month');
    const endOfMonth = visibleMonth.endOf('month');
    // isoWeekday: lundi = 1 ... dimanche = 7
    const leadingBlanks = (startOfMonth.day() + 6) % 7; // day(): dimanche=0
    const days: (Dayjs | null)[] = [];
    for (let i = 0; i < leadingBlanks; i++) days.push(null);
    for (let d = 0; d < endOfMonth.date(); d++) {
      days.push(startOfMonth.add(d, 'day'));
    }
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [visibleMonth]);

  const today = dayjs();

  const goToPrevMonth = () => setVisibleMonth((m) => m.subtract(1, 'month'));
  const goToNextMonth = () => setVisibleMonth((m) => m.add(1, 'month'));

  return (
    <ScrollView
      style={calStyles.container}
      contentContainerStyle={calStyles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Navigation du mois */}
      <View style={calStyles.monthHeader}>
        <TouchableOpacity onPress={goToPrevMonth} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <Text style={calStyles.monthLabel}>
          {visibleMonth.format('MMMM YYYY')}
        </Text>
        <TouchableOpacity onPress={goToNextMonth} hitSlop={10}>
          <Ionicons name="chevron-forward" size={22} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* En-têtes des jours de la semaine */}
      <View style={calStyles.weekRow}>
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
          <Text key={i} style={calStyles.weekLabel}>{d}</Text>
        ))}
      </View>

      {/* Grille des jours */}
      <View style={calStyles.grid}>
        {gridDays.map((day, i) => {
          if (!day) {
            return <View key={i} style={calStyles.cell} />;
          }
          const key = day.format('YYYY-MM-DD');
          const daySessions = sessionsByDay.get(key) ?? [];
          const hasSessions = daySessions.length > 0;
          const isToday = day.isSame(today, 'day');
          const isSelected = selectedDate === key;

          return (
            <TouchableOpacity
              key={i}
              style={calStyles.cell}
              activeOpacity={0.7}
              disabled={!hasSessions}
              onPress={() => onSelectDate(isSelected ? null : key)}
            >
              <View
                style={[
                  calStyles.dayCircle,
                  isToday && calStyles.dayCircleToday,
                  isSelected && calStyles.dayCircleSelected,
                ]}
              >
                <Text
                  style={[
                    calStyles.dayText,
                    !hasSessions && calStyles.dayTextMuted,
                    isSelected && calStyles.dayTextSelected,
                  ]}
                >
                  {day.date()}
                </Text>
              </View>
              {hasSessions && (
                <View
                  style={[
                    calStyles.dot,
                    isSelected && calStyles.dotSelected,
                  ]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Séances du jour sélectionné */}
      {selectedDate && (
        <View style={calStyles.dayDetail}>
          <Text style={calStyles.dayDetailTitle}>
            {dayjs(selectedDate).format('dddd D MMMM')}
          </Text>
          {selectedDaySessions.length === 0 ? (
            <Text style={calStyles.dayDetailEmpty}>Aucune séance ce jour</Text>
          ) : (
            <View style={{ gap: SPACING.sm }}>
              {selectedDaySessions.map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  onPress={() => onPressSession(s.id)}
                  onDelete={() => onDeleteSession(s)}
                />
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
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

const toggleStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 4,
    marginHorizontal: SPACING.base,
    marginTop: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  optionActive: {
    backgroundColor: COLORS.primary,
  },
  optionText: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.semibold,
    color: COLORS.textMuted,
  },
  optionTextActive: {
    color: COLORS.textPrimary,
  },
});

const CELL_SIZE = '14.28%'; // 100% / 7 jours

const calStyles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: SPACING.base, paddingBottom: SPACING.xxxl },

  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  monthLabel: {
    fontSize: FONTS.md,
    fontWeight: FONTS.semibold,
    color: COLORS.textPrimary,
    textTransform: 'capitalize',
  },

  weekRow: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  weekLabel: {
    width: CELL_SIZE,
    textAlign: 'center',
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    fontWeight: FONTS.medium,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: CELL_SIZE,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleToday: {
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  dayCircleSelected: {
    backgroundColor: COLORS.primary,
  },
  dayText: {
    fontSize: FONTS.sm,
    color: COLORS.textPrimary,
    fontWeight: FONTS.medium,
  },
  dayTextMuted: {
    color: COLORS.textMuted,
  },
  dayTextSelected: {
    color: COLORS.textPrimary,
    fontWeight: FONTS.bold,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    marginTop: 3,
  },
  dotSelected: {
    backgroundColor: COLORS.warning,
  },

  dayDetail: {
    marginTop: SPACING.xl,
    gap: SPACING.md,
  },
  dayDetailTitle: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.semibold,
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
  },
  dayDetailEmpty: {
    fontSize: FONTS.base,
    color: COLORS.textMuted,
  },
});
