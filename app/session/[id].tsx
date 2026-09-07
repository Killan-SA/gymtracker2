import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  SectionList,
} from 'react-native';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getSessionWithExercises,
  addExerciseToSession,
  addSet,
  deleteSet,
  deleteExercise,
  getExerciseNames,
  getLastSetForExercise,
  updateSet,
} from '../../lib/queries';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import {
  PREDEFINED_EXERCISES,
  EXERCISE_CATEGORIES,
  searchExercises,
} from '../../constants/exercises';
import type { ExerciseWithSets, Set } from '../../types';

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [exercises, setExercises] = useState<ExerciseWithSets[]>([]);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentNames, setRecentNames] = useState<string[]>([]);

  const loadSession = useCallback(() => {
    if (!id) return;
    const session = getSessionWithExercises(id);
    if (session) setExercises(session.exercises);
    setRecentNames(getExerciseNames().slice(0, 8));
  }, [id]);

  useEffect(() => { loadSession(); }, [loadSession]);

  // Résultats de recherche
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchExercises(searchQuery);
  }, [searchQuery]);

  // Sections pour la SectionList (quand pas de recherche)
  const sections = useMemo(() => {
    const s = [];
    if (recentNames.length > 0) {
      s.push({ title: 'Récents', data: recentNames.map(n => ({ name: n, category: 'Récents' })) });
    }
    for (const cat of EXERCISE_CATEGORIES) {
      const items = PREDEFINED_EXERCISES.filter(e => e.category === cat);
      if (items.length > 0) s.push({ title: cat, data: items });
    }
    return s;
  }, [recentNames]);

  const handleSelectExercise = (name: string) => {
    if (!id || !name.trim()) return;
    addExerciseToSession(id, name.trim());
    setSearchQuery('');
    setShowAddExercise(false);
    loadSession();
  };

  const handleAddSet = (exerciseId: string) => {
    const last = getLastSetForExercise(exerciseId);
    addSet(exerciseId, last?.weight ?? 0, last?.reps ?? 0);
    loadSession();
  };

  const handleDeleteSet = (setId: string) => {
    Alert.alert('Supprimer', 'Supprimer cette série ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => { deleteSet(setId); loadSession(); } },
    ]);
  };

  const handleDeleteExercise = (exerciseId: string, name: string) => {
    Alert.alert('Supprimer l\'exercice', `Supprimer "${name}" et toutes ses séries ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => { deleteExercise(exerciseId); loadSession(); } },
    ]);
  };

  const handleFinish = () => {
    Alert.alert(
      'Terminer la séance',
      exercises.length === 0
        ? 'Tu n\'as enregistré aucun exercice. Terminer quand même ?'
        : `Séance terminée avec ${exercises.length} exercice(s). 💪`,
      [
        { text: 'Continuer la séance', style: 'cancel' },
        { text: 'Terminer ✅', onPress: () => router.replace('/(tabs)' as any) },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <FlatList
        data={exercises}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        renderItem={({ item }) => (
          <ExerciseCard
            exercise={item}
            onAddSet={() => handleAddSet(item.id)}
            onDeleteSet={handleDeleteSet}
            onDeleteExercise={() => handleDeleteExercise(item.id, item.name)}
            onReload={loadSession}
          />
        )}
        ListHeaderComponent={exercises.length === 0 ? <EmptySession /> : null}
        ListFooterComponent={
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.addExerciseButton}
              onPress={() => setShowAddExercise(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={22} color={COLORS.primary} />
              <Text style={styles.addExerciseText}>Ajouter un exercice</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.finishButton}
              onPress={handleFinish}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle" size={22} color="#fff" />
              <Text style={styles.finishButtonText}>Terminer la séance</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* ── Modal sélecteur d'exercice ─────────────────────── */}
      <Modal
        visible={showAddExercise}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setSearchQuery(''); setShowAddExercise(false); }}
      >
        <View style={pickerStyles.container}>
          {/* En-tête */}
          <View style={pickerStyles.header}>
            <Text style={pickerStyles.title}>Choisir un exercice</Text>
            <TouchableOpacity
              onPress={() => { setSearchQuery(''); setShowAddExercise(false); }}
              style={pickerStyles.closeBtn}
            >
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Barre de recherche */}
          <View style={pickerStyles.searchRow}>
            <Ionicons name="search" size={18} color={COLORS.textMuted} />
            <TextInput
              style={pickerStyles.searchInput}
              placeholder="Rechercher un exercice..."
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </View>

          {/* Résultats de recherche */}
          {searchQuery.trim().length > 0 ? (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.name}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 40 }}
              ListEmptyComponent={
                <View style={pickerStyles.emptySearch}>
                  <Text style={pickerStyles.emptyText}>Aucun résultat</Text>
                  <TouchableOpacity
                    style={pickerStyles.customBtn}
                    onPress={() => handleSelectExercise(searchQuery.trim())}
                  >
                    <Ionicons name="add-circle" size={18} color={COLORS.primary} />
                    <Text style={pickerStyles.customBtnText}>
                      Ajouter « {searchQuery.trim()} »
                    </Text>
                  </TouchableOpacity>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={pickerStyles.exerciseRow}
                  onPress={() => handleSelectExercise(item.name)}
                >
                  <View style={pickerStyles.categoryBadge}>
                    <Text style={pickerStyles.categoryBadgeText}>{item.category}</Text>
                  </View>
                  <Text style={pickerStyles.exerciseName}>{item.name}</Text>
                  <Ionicons name="add" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              )}
            />
          ) : (
            /* Liste par catégories */
            <SectionList
              sections={sections}
              keyExtractor={(item) => item.name}
              keyboardShouldPersistTaps="handled"
              stickySectionHeadersEnabled
              contentContainerStyle={{ paddingBottom: 40 }}
              renderSectionHeader={({ section }) => (
                <View style={pickerStyles.sectionHeader}>
                  <Text style={pickerStyles.sectionTitle}>{section.title}</Text>
                </View>
              )}
              renderItem={({ item, section }) => (
                <TouchableOpacity
                  style={pickerStyles.exerciseRow}
                  onPress={() => handleSelectExercise(item.name)}
                >
                  {section.title === 'Récents' && (
                    <Ionicons name="time-outline" size={16} color={COLORS.textMuted} style={{ marginRight: 4 }} />
                  )}
                  <Text style={[pickerStyles.exerciseName, { flex: 1 }]}>{item.name}</Text>
                  <Ionicons name="add" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ============================================================
// ExerciseCard
// ============================================================

function ExerciseCard({
  exercise,
  onAddSet,
  onDeleteSet,
  onDeleteExercise,
  onReload,
}: {
  exercise: ExerciseWithSets;
  onAddSet: () => void;
  onDeleteSet: (id: string) => void;
  onDeleteExercise: () => void;
  onReload: () => void;
}) {
  return (
    <View style={cardStyles.container}>
      <View style={cardStyles.header}>
        <Ionicons name="barbell" size={18} color={COLORS.primary} />
        <Text style={cardStyles.name}>{exercise.name}</Text>
        <TouchableOpacity onPress={onDeleteExercise} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
        </TouchableOpacity>
      </View>

      <View style={cardStyles.columnsHeader}>
        <Text style={cardStyles.colLabel}>Série</Text>
        <Text style={cardStyles.colLabel}>Poids (kg)</Text>
        <Text style={cardStyles.colLabel}>Répétitions</Text>
        <View style={{ width: 32 }} />
      </View>

      {exercise.sets.map((set) => (
        <SetRow
          key={set.id}
          set={set}
          onDelete={() => onDeleteSet(set.id)}
          onReload={onReload}
        />
      ))}

      {exercise.sets.length === 0 && (
        <Text style={cardStyles.noSets}>Ajoute une première série 👇</Text>
      )}

      <TouchableOpacity style={cardStyles.addSetButton} onPress={onAddSet}>
        <Ionicons name="add" size={18} color={COLORS.primary} />
        <Text style={cardStyles.addSetText}>Ajouter une série</Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================================
// SetRow
// ============================================================

function SetRow({ set, onDelete, onReload }: {
  set: Set;
  onDelete: () => void;
  onReload: () => void;
}) {
  const [weight, setWeight] = useState(set.weight > 0 ? set.weight.toString() : '');
  const [reps, setReps] = useState(set.reps > 0 ? set.reps.toString() : '');

  const handleBlur = () => {
    const w = parseFloat(weight) || 0;
    const r = parseInt(reps) || 0;
    if (w !== set.weight || r !== set.reps) {
      updateSet(set.id, w, r);
      onReload();
    }
  };

  return (
    <View style={setRowStyles.row}>
      <View style={setRowStyles.setNumberContainer}>
        <Text style={setRowStyles.setNumber}>{set.set_number}</Text>
      </View>
      <TextInput
        style={setRowStyles.input}
        value={weight}
        onChangeText={setWeight}
        onBlur={handleBlur}
        keyboardType="decimal-pad"
        selectTextOnFocus
        placeholder="0"
        placeholderTextColor={COLORS.textMuted}
      />
      <TextInput
        style={setRowStyles.input}
        value={reps}
        onChangeText={setReps}
        onBlur={handleBlur}
        keyboardType="number-pad"
        selectTextOnFocus
        placeholder="0"
        placeholderTextColor={COLORS.textMuted}
      />
      <TouchableOpacity onPress={onDelete} style={setRowStyles.deleteButton}>
        <Ionicons name="close-circle" size={22} color={COLORS.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

// ============================================================
// EmptySession
// ============================================================

function EmptySession() {
  return (
    <View style={emptyStyles.container}>
      <Text style={emptyStyles.emoji}>🏋️</Text>
      <Text style={emptyStyles.text}>Commence par ajouter ton premier exercice !</Text>
    </View>
  );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  listContent: { padding: SPACING.base, paddingBottom: 120 },
  footer: { gap: SPACING.md, marginTop: SPACING.lg, paddingBottom: SPACING.xl },
  addExerciseButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, padding: SPACING.base, borderRadius: RADIUS.lg,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryGlow,
  },
  addExerciseText: { fontSize: FONTS.base, fontWeight: FONTS.semibold, color: COLORS.primary },
  finishButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, padding: SPACING.base, borderRadius: RADIUS.lg,
    backgroundColor: COLORS.success, ...SHADOWS.card,
  },
  finishButtonText: { fontSize: FONTS.md, fontWeight: FONTS.bold, color: '#fff' },
});

const cardStyles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: SPACING.base, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.cardBorder, ...SHADOWS.card,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    marginBottom: SPACING.md, paddingBottom: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.separator,
  },
  name: { flex: 1, fontSize: FONTS.md, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  columnsHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: SPACING.sm, paddingHorizontal: 2,
  },
  colLabel: {
    flex: 1, fontSize: FONTS.xs, color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: FONTS.medium,
  },
  noSets: {
    fontSize: FONTS.sm, color: COLORS.textMuted, textAlign: 'center',
    paddingVertical: SPACING.md, fontStyle: 'italic',
  },
  addSetButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.xs, paddingVertical: SPACING.sm, marginTop: SPACING.sm,
  },
  addSetText: { fontSize: FONTS.sm, fontWeight: FONTS.medium, color: COLORS.primary },
});

const setRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.separator,
  },
  setNumberContainer: {
    width: 28, height: 28, borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryGlow, alignItems: 'center', justifyContent: 'center',
  },
  setNumber: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.primary },
  input: {
    flex: 1, height: 40, backgroundColor: COLORS.surface, borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm, fontSize: FONTS.md, fontWeight: FONTS.semibold,
    color: COLORS.textPrimary, textAlign: 'center',
    borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  deleteButton: { width: 32, alignItems: 'center' },
});

const pickerStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.base, paddingTop: SPACING.lg,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.separator,
  },
  title: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  closeBtn: { padding: SPACING.xs },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    margin: SPACING.base, backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  searchInput: { flex: 1, fontSize: FONTS.base, color: COLORS.textPrimary },
  sectionHeader: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.separator,
  },
  sectionTitle: {
    fontSize: FONTS.xs, fontWeight: FONTS.bold, color: COLORS.primary,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  exerciseRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.separator,
  },
  exerciseName: { flex: 1, fontSize: FONTS.base, color: COLORS.textPrimary },
  categoryBadge: {
    backgroundColor: COLORS.primaryGlow, borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm, paddingVertical: 2,
  },
  categoryBadgeText: { fontSize: FONTS.xs, color: COLORS.primary, fontWeight: FONTS.medium },
  emptySearch: { padding: SPACING.xl, alignItems: 'center', gap: SPACING.lg },
  emptyText: { fontSize: FONTS.base, color: COLORS.textMuted },
  customBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.primaryGlow, padding: SPACING.base,
    borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.primary,
  },
  customBtnText: { fontSize: FONTS.base, color: COLORS.primary, fontWeight: FONTS.semibold },
});

const emptyStyles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: SPACING.xxxl },
  emoji: { fontSize: 48, marginBottom: SPACING.lg },
  text: { fontSize: FONTS.base, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
});
