import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
  ScrollView,
} from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { resetAllData } from '../../lib/database';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';

export default function SettingsScreen() {
  const [useKg, setUseKg] = useState(true); // kg par défaut

  const handleExport = () => {
    Alert.alert(
      'Export de données',
      'Cette fonctionnalité sera disponible dans une prochaine mise à jour.',
      [{ text: 'OK' }]
    );
  };

  const handleReset = () => {
    Alert.alert(
      'Réinitialiser les données',
      'Toutes tes séances, exercices et séries seront supprimés définitivement. Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer tout',
          style: 'destructive',
          onPress: () => {
            // Double confirmation car l'action est irréversible et détruit
            // l'intégralité de l'historique de l'utilisateur.
            Alert.alert(
              'Es-tu vraiment sûr ?',
              'Il n\'y a pas de retour en arrière possible après cette action.',
              [
                { text: 'Annuler', style: 'cancel' },
                {
                  text: 'Oui, tout supprimer',
                  style: 'destructive',
                  onPress: () => {
                    resetAllData();
                    Alert.alert(
                      'Données supprimées',
                      'Toutes tes données ont été effacées.',
                      [{ text: 'OK', onPress: () => router.replace('/(tabs)' as any) }]
                    );
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Section Préférences */}
      <Text style={styles.sectionTitle}>Préférences</Text>
      <View style={styles.section}>
        <SettingRow
          icon="scale-outline"
          iconColor={COLORS.primary}
          label="Unité de poids"
          right={
            <View style={styles.unitToggle}>
              <Text style={[styles.unitLabel, !useKg && styles.unitLabelActive]}>lbs</Text>
              <Switch
                value={useKg}
                onValueChange={setUseKg}
                trackColor={{ false: COLORS.cardBorder, true: COLORS.primaryDark }}
                thumbColor={useKg ? COLORS.primary : COLORS.textMuted}
                ios_backgroundColor={COLORS.cardBorder}
              />
              <Text style={[styles.unitLabel, useKg && styles.unitLabelActive]}>kg</Text>
            </View>
          }
        />
      </View>

      {/* Section Données */}
      <Text style={styles.sectionTitle}>Données</Text>
      <View style={styles.section}>
        <SettingRow
          icon="cloud-upload-outline"
          iconColor={COLORS.primary}
          label="Importer depuis Excel (.xlsx)"
          onPress={() => router.push('/import' as any)}
          showArrow
        />
        <View style={styles.rowDivider} />
        <SettingRow
          icon="download-outline"
          iconColor={COLORS.success}
          label="Exporter mes données"
          onPress={handleExport}
          showArrow
        />
        <View style={styles.rowDivider} />
        <SettingRow
          icon="trash-outline"
          iconColor={COLORS.danger}
          label="Réinitialiser toutes les données"
          labelColor={COLORS.danger}
          onPress={handleReset}
        />
      </View>


      {/* Section À propos */}
      <Text style={styles.sectionTitle}>À propos</Text>
      <View style={styles.section}>
        <SettingRow
          icon="barbell-outline"
          iconColor={COLORS.primary}
          label="GymTracker"
          right={<Text style={styles.version}>v1.0.0</Text>}
        />
        <View style={styles.rowDivider} />
        <SettingRow
          icon="code-slash-outline"
          iconColor={COLORS.textSecondary}
          label="Développé avec Expo"
          right={<Text style={styles.version}>SDK 51</Text>}
        />
      </View>

      <Text style={styles.footer}>
        Toutes tes données sont stockées localement sur ton iPhone.
        Aucune donnée n'est envoyée sur internet. 🔒
      </Text>
    </ScrollView>
  );
}

function SettingRow({
  icon,
  iconColor,
  label,
  labelColor,
  right,
  onPress,
  showArrow,
}: {
  icon: string;
  iconColor: string;
  label: string;
  labelColor?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  showArrow?: boolean;
}) {
  const content = (
    <View style={settingStyles.row}>
      <View style={[settingStyles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
        <Ionicons name={icon as any} size={20} color={iconColor} />
      </View>
      <Text style={[settingStyles.label, labelColor ? { color: labelColor } : {}]}>
        {label}
      </Text>
      <View style={settingStyles.rightContent}>
        {right ?? null}
        {showArrow && (
          <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.base, paddingBottom: SPACING.xxxl },

  sectionTitle: {
    fontSize: FONTS.xs,
    fontWeight: FONTS.semibold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACING.sm,
    marginTop: SPACING.lg,
    marginLeft: SPACING.xs,
  },
  section: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: 'hidden',
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.separator,
    marginLeft: 56,
  },

  unitToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  unitLabel: {
    fontSize: FONTS.base,
    color: COLORS.textMuted,
    fontWeight: FONTS.medium,
    width: 24,
    textAlign: 'center',
  },
  unitLabelActive: {
    color: COLORS.primary,
  },
  version: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
  },

  footer: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.xxl,
    lineHeight: 20,
    paddingHorizontal: SPACING.md,
  },
});

const settingStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.base,
    gap: SPACING.md,
    minHeight: 52,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontSize: FONTS.base,
    color: COLORS.textPrimary,
    fontWeight: FONTS.regular,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
});
