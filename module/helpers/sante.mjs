/**
 * Santé des acteurs : points de vie (Densité pour un démon) et libellé descriptif,
 * utilisés par l'infobulle des tokens et le tracker de combat.
 */

/**
 * Points de vie d'un acteur. Un démon n'a pas de PdV mais une Densité.
 * @returns {{ valeur: number, max: number, champ: "pdv"|"densite" }}
 */
export function pointsDeVie(actor) {
  const champ = actor?.type === "demon" ? "densite" : "pdv";
  const pv = actor?.system?.[champ];
  return { valeur: pv?.valeur ?? 0, max: pv?.max ?? 0, champ };
}

/**
 * Libellé descriptif de l'état de santé (réglages du monde « santeLabel* »), sans chiffres :
 * c'est ce que voient les joueurs pour un acteur qu'ils ne possèdent pas.
 * @returns {string|null}  null si l'acteur n'a pas de maximum de points de vie
 */
export function libelleSante(actor) {
  const { valeur, max } = pointsDeVie(actor);
  if (!max) return null;
  const ratio = valeur / max;
  const cle = ratio >= 1    ? "santeLabel100"
            : ratio >= 0.75 ? "santeLabel75"
            : ratio >= 0.5  ? "santeLabel50"
            : ratio >= 0.25 ? "santeLabel25"
            : ratio > 0     ? "santeLabel10"
            :                 "santeLabel0";
  return game.settings.get("agone", cle);
}

/** Couleur de la barre de points de vie selon le pourcentage restant. */
export function couleurSante(pourcentage) {
  if (pourcentage <= 25) return "var(--agone-txt-rouge, #c04040)";
  if (pourcentage <= 50) return "var(--agone-txt-orange, #c07820)";
  return "var(--agone-txt-vert, #4a9a4a)";
}
