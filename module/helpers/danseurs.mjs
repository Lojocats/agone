/**
 * Lien entre un sort et le danseur qui le mémorise.
 *
 * Le lien est porté par `system.danseurId` (id de l'item danseur du même acteur). L'ancien champ
 * `system.danseurNom` reste dans le schéma pour les données d'avant la 1.11.0 mais ne sert plus à
 * retrouver le danseur : renommer un danseur ne détache donc plus ses sorts, et un sort dont le
 * danseur n'existe plus est considéré comme libre.
 */

/**
 * Danseur qui mémorise le sort, ou `null` si le sort est libre (pas de lien ou danseur disparu).
 * @param {{system?: {danseurId?: string}}} sort
 * @param {Array<{id: string}>} danseurs  Danseurs de l'acteur
 */
export function danseurDuSort(sort, danseurs = []) {
  const id = sort?.system?.danseurId;
  if (!id) return null;
  return danseurs.find(d => d.id === id) ?? null;
}

/** Le sort n'est mémorisé par aucun danseur existant. */
export function sortEstLibre(sort, danseurs = []) {
  return !danseurDuSort(sort, danseurs);
}

/**
 * Sorts mémorisés par un danseur.
 * @param {Iterable<{type: string, system: object}>} items  Items de l'acteur
 * @param {string} danseurId
 */
export function sortsDuDanseur(items, danseurId) {
  if (!danseurId) return [];
  return [...(items ?? [])].filter(i => i.type === "sort" && i.system?.danseurId === danseurId);
}

/**
 * Migration 1.11.0 : mise à jour d'un sort encore lié par le nom de son danseur.
 * @param {{danseurNom?: string, danseurId?: string}} system  Données du sort
 * @param {Array<{id: string, name: string}>} danseurs       Danseurs du même acteur
 * @returns {object|null}  `{ "system.danseurId": id }`, ou `null` s'il n'y a rien à faire
 */
export function lienDanseurDepuisNom(system, danseurs = []) {
  if (!system?.danseurNom || system.danseurId) return null;
  const danseur = (danseurs ?? []).find(d => d.name === system.danseurNom);
  return danseur ? { "system.danseurId": danseur.id } : null;
}
