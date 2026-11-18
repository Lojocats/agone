/**
 * Tracker de combat : quels changements de documents demandent de le redessiner.
 */

/** Champs d'un token modifiés par un simple déplacement sur la carte. */
const CLES_DEPLACEMENT = new Set(["x", "y", "elevation", "rotation", "sort", "level", "_movementHistory"]);

/** Vrai si la modification d'un token n'est qu'un déplacement (rien à redessiner dans le tracker). */
export function estDeplacementSeul(changed) {
  const cles = Object.keys(changed ?? {}).filter(k => k !== "_id");
  return cles.length > 0 && cles.every(k => CLES_DEPLACEMENT.has(k));
}

/** Acteur d'un combattant : celui du token pour un token non lié. */
const acteurDe = c => c.token?.actor ?? c.actor ?? null;

/** Vrai si l'acteur (du monde ou synthétique d'un token) participe au combat. */
function acteurAuCombat(actor, combat) {
  if (!actor) return false;
  for (const c of combat.combatants) {
    const a = acteurDe(c);
    if (a === actor || (a?.uuid && a.uuid === actor.uuid)) return true;
    // Acteur du monde d'un token non lié : ses données de base alimentent l'acteur du token
    if (!actor.isToken && c.actorId === actor.id) return true;
  }
  return false;
}

/**
 * Vrai si l'évènement `nom` reçu pour `doc` change ce qu'affiche le tracker du combat actif.
 * @param {string} nom         nom du hook (updateActor, updateToken, createCombatant…)
 * @param {object} doc         document concerné
 * @param {object} [changed]   modifications (hooks update*)
 * @param {object|null} combat combat actif (game.combat)
 */
export function concerneCombat(nom, doc, changed, combat) {
  // Création, suppression ou modification d'un combat : le combat actif peut avoir changé
  if (/Combat$/.test(nom)) return true;
  if (!combat) return false;
  if (/Combatant$/.test(nom)) return doc?.parent === combat || doc?.parent?.id === combat.id;
  if (nom === "updateToken") {
    if (estDeplacementSeul(changed)) return false;
    return [...combat.combatants].some(c => c.tokenId === doc?.id);
  }
  if (nom === "updateActor") return acteurAuCombat(doc, combat);
  if (/ActiveEffect$/.test(nom)) {
    // Effet d'un acteur, ou d'un item porté par un acteur
    const parent = doc?.parent;
    return acteurAuCombat(parent?.documentName === "Actor" ? parent : parent?.parent, combat);
  }
  return true;
}
