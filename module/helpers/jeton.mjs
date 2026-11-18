/**
 * Jetons (tokens) : barre de santé et réglages par défaut du token prototype.
 *
 * Foundry résout l'attribut d'une barre relativement à `actor.system`
 * (TokenDocument#getBarAttribute) : le chemin est donc « pdv », et non « system.pdv ».
 * Un démon n'a pas de PdV mais une Densité.
 */

/** Types d'acteur dont le token est lié à l'acteur par défaut (un seul exemplaire en jeu). */
export const TYPES_TOKEN_LIE = ["personnage", "compagnon"];

/** Attribut de la barre de santé d'un token selon le type de son acteur. */
export function attributBarreSante(typeActeur) {
  return typeActeur === "demon" ? "densite" : "pdv";
}

/**
 * Correction d'un attribut de barre enregistré avec un chemin erroné (« system.pdv »)
 * ou inexistant pour ce type d'acteur (« pdv » sur un démon, « densite » ailleurs).
 * @param {string|null|undefined} attribut    attribut enregistré sur le token
 * @param {string} [typeActeur]               type de l'acteur du token
 * @returns {string|null}  le nouvel attribut, ou null s'il n'y a rien à corriger
 */
export function corrigerAttributBarre(attribut, typeActeur) {
  if (typeof attribut !== "string") return null;
  const court = attribut.replace(/^system\./, "");
  if (court !== "pdv" && court !== "densite") return null;
  const attendu = attributBarreSante(typeActeur);
  return attribut === attendu ? null : attendu;
}

/**
 * Mises à jour corrigeant les barres de santé d'une liste de documents (migration 1.11.0).
 * @param {Iterable<{id: string, attribut: string|null|undefined, type?: string}>} entrees
 *   un acteur (barre de son token prototype) ou un token placé, avec le type de son acteur
 * @param {string} chemin  chemin de l'attribut dans le document mis à jour
 * @returns {object[]}     une entrée `{ _id, [chemin] }` par document à corriger
 */
export function correctionsBarres(entrees, chemin) {
  const maj = [];
  for (const { id, attribut, type } of entrees) {
    const corrige = corrigerAttributBarre(attribut, type);
    if (corrige) maj.push({ _id: id, [chemin]: corrige });
  }
  return maj;
}

/** Valeur d'un chemin pointé dans des données imbriquées ou à clés pointées. */
function lire(data, chemin) {
  if (!data) return undefined;
  if (chemin in data) return data[chemin];
  let courant = data;
  for (const cle of chemin.split(".")) {
    if (courant === null || typeof courant !== "object") return undefined;
    courant = courant[cle];
  }
  return courant;
}

/**
 * Réglages du token prototype à poser à la création d'un acteur, sans écraser ce que
 * les données de création précisent déjà (import, duplication, création par macro).
 * Seuls les personnages et les compagnons sont liés à leur acteur.
 * @param {string} typeActeur
 * @param {object} [data]            données de création reçues par le hook preCreateActor
 * @param {number} [affichageBarres] valeur de CONST.TOKEN_DISPLAY_MODES.OWNER
 * @returns {Record<string, *>}      mise à jour à passer à `actor.updateSource` (vide si rien)
 */
export function defautsTokenPrototype(typeActeur, data = {}, affichageBarres = 40) {
  const maj = {};
  const barre = lire(data, "prototypeToken.bar1.attribute");
  // Une barre absente (null : valeur par défaut de Foundry) reçoit la barre de santé ;
  // une barre de santé au chemin erroné est corrigée ; toute autre barre est conservée
  if (barre === undefined || barre === null) maj["prototypeToken.bar1.attribute"] = attributBarreSante(typeActeur);
  else {
    const corrige = corrigerAttributBarre(barre, typeActeur);
    if (corrige) maj["prototypeToken.bar1.attribute"] = corrige;
  }
  if (lire(data, "prototypeToken.displayBars") === undefined) maj["prototypeToken.displayBars"] = affichageBarres;
  if (TYPES_TOKEN_LIE.includes(typeActeur) && lire(data, "prototypeToken.actorLink") === undefined) {
    maj["prototypeToken.actorLink"] = true;
  }
  return maj;
}
