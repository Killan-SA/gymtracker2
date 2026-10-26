/**
 * Fichier de compatibilité : re-exporte le store depuis store/settings.ts.
 * Les imports existants (import { useSettingsStore } from '../../lib/settingsStore')
 * continuent de fonctionner sans modification.
 */
export { useSettingsStore } from '../store/settings';
