/**
 * Utilitaires de conversion d'unité de poids.
 *
 * ⚠️ Convention importante : TOUT est stocké en base de données en kg,
 * quelle que soit l'unité d'affichage choisie par l'utilisateur. Ces
 * fonctions ne servent qu'à la présentation (affichage) et à la saisie
 * (conversion d'entrée utilisateur vers kg avant écriture en BDD).
 * Ne jamais stocker de lbs en base : ça casserait l'historique si
 * l'utilisateur change d'unité plus tard.
 */

const KG_TO_LBS = 2.2046226218;

/** Convertit un poids en kg vers l'unité d'affichage choisie */
export function fromKg(kg: number, useKg: boolean): number {
  return useKg ? kg : kg * KG_TO_LBS;
}

/** Convertit une valeur saisie dans l'unité choisie vers des kg (pour la BDD) */
export function toKg(value: number, useKg: boolean): number {
  return useKg ? value : value / KG_TO_LBS;
}

/** Arrondit proprement pour l'affichage (1 décimale max, sans .0 inutile) */
export function roundWeight(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Formate un poids stocké en kg pour l'affichage, avec suffixe d'unité */
export function formatWeight(kg: number, useKg: boolean): string {
  const converted = roundWeight(fromKg(kg, useKg));
  return `${converted} ${useKg ? 'kg' : 'lbs'}`;
}

/** Retourne juste le suffixe d'unité courant ("kg" ou "lbs") */
export function unitLabel(useKg: boolean): string {
  return useKg ? 'kg' : 'lbs';
}
