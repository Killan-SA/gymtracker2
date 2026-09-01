import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import { useState, useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAllExerciseNames } from '../../lib/queries';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';

export default function ExercisesScreen() {
  const [exerciseNames, setExerciseNames] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      const names = getAllExerciseNames();
      setExerciseNames(names);
    }, [])
  );

  const filtered = exerciseNames.filter((name) =>
    name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (exerciseNames.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyExercises />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Barre de recherche */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un exercice..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <ExerciseRow
            name={item}
            onPress={() => router.push(`/exercises/${encodeURIComponent(item)}`)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <Text style={styles.noResult}>Aucun résultat pour « {searchQuery} »</Text>
        }
      />
    </View>
  );
}

function ExerciseRow({
  name,
  onPress,
}: {
  name: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.rowIcon}>
        <Ionicons name="barbell" size={20} color={COLORS.primary} />
      </View>
      <Text style={styles.rowName}>{name}</Text>
      <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
}

function EmptyExercises() {
  return (
    <View style={emptyStyles.container}>
      <Text style={emptyStyles.emoji}>🏋️</Text>
      <Text style={emptyStyles.title}>Aucun exercice</Text>
      <Text style={emptyStyles.subtitle}>
        Tes exercices apparaîtront ici dès ta première séance enregistrée.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.card,
    margin: SPACING.base,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: FONTS.base,
    color: COLORS.textPrimary,
    height: '100%',
  },

  listContent: {
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.xl,
  },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.separator },

  row: {
    backgroundColor: COLORS.card,
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.base,
    gap: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowName: {
    flex: 1,
    fontSize: FONTS.base,
    fontWeight: FONTS.medium,
    color: COLORS.textPrimary,
  },

  noResult: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginTop: SPACING.xl,
    fontSize: FONTS.base,
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
