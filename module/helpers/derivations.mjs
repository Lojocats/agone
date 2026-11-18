/**
 * Dérivations pures partagées par AgoneActor, AgoneItem et les fiches : recherche de compétence,
 * bonus d'aspect, malus de jet, surcharge, totaux d'arme, Charges des avantages, barre de jeton.
 * Aucune dépendance à Foundry hors CONFIG.AGONE (testable hors Foundry).
 */

/** Nom comparable : sans accents, sans casse, sans espaces de bord. */
export function normaliserNom(texte) {
  return String(texte ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

/** Clés de recherche (normalisées) des compétences lues par les calculs du système. */
export const CLES_COMPETENCES = Object.freeze({
  esquive:      { cle: "esquive" },
  artsMagiques: { cle: "arts magiques" },
  demonologie:  { cle: "demonologi", partiel: true },
  danseurs:     { cle: "danseur",    partiel: true },
  resonance:    { cle: "resonance",  partiel: true },
});

/**
 * Compétence d'après son nom, comparé sans accents ni casse.
 * Une correspondance exacte est toujours préférée ; avec `partiel`, la première compétence dont le
 * nom contient la clé sert de repli (« Connaissance des Danseurs » pour la clé « danseur »).
 * @param {Iterable<object>} items  Items de l'acteur (seules les compétences sont examinées)
 * @param {string} cle
 * @param {object} [options]
 * @param {boolean} [options.partiel=false]  Accepter un nom qui contient la clé
 * @param {Function} [options.filtre]        Prédicat supplémentaire (ex. domaine de la compétence)
 * @returns {object|null}
 */
export function competenceParNom(items, cle, { partiel = false, filtre = null } = {}) {
  const cherche = normaliserNom(cle);
  if (!cherche) return null;
  let approchante = null;
  for (const i of items ?? []) {
    if (i.type !== "competence") continue;
    if (filtre && !filtre(i)) continue;
    const nom = normaliserNom(i.name);
    if (nom === cherche) return i;
    if (partiel && !approchante && nom.includes(cherche)) approchante = i;
  }
  return approchante;
}

/** Compétence « connue » du système (voir CLES_COMPETENCES). */
export function competenceConnue(items, nomCle, options = {}) {
  const def = CLES_COMPETENCES[nomCle];
  return def ? competenceParNom(items, def.cle, { partiel: !!def.partiel, ...options }) : null;
}

/** Score d'une caractéristique : `{ score }` (personnage) ou nombre (compagnon, démon, PNJ). */
export function scoreAttribut(system, cle) {
  const valeur = system?.[cle];
  return (typeof valeur === "object" ? valeur?.score : valeur) ?? 0;
}

/**
 * Bonus d'aspect (Corps, Esprit ou Âme) associé à une caractéristique.
 * @param {object} system    Données préparées de l'acteur
 * @param {string} attribut  Clé de CONFIG.AGONE.attributs
 * @returns {number}
 */
export function bonusAspectAttribut(system, attribut) {
  const aspect = CONFIG.AGONE.attributs[attribut]?.aspect;
  if (aspect === "corps")  return system.bonusCorps  ?? 0;
  if (aspect === "esprit") return system.bonusEsprit ?? 0;
  if (aspect === "ame")    return system.bonusAme    ?? 0;
  return 0;
}

/**
 * Malus de surcharge : -3 au-delà de la charge max, -1 au-delà de la demi-charge.
 * @param {number} charge      Charge portée
 * @param {number} demiCharge
 * @param {number} chargeMax
 * @returns {number}
 */
export function malusSurcharge(charge, demiCharge, chargeMax) {
  if (chargeMax > 0 && charge > chargeMax)   return -3;
  if (demiCharge > 0 && charge > demiCharge) return -1;
  return 0;
}

/**
 * Malus cumulés appliqués à un jet : armure (selon le jet), surcharge et blessures graves.
 * @param {object} system          Données préparées de l'acteur
 * @param {number} [malusArmure=0] Malus d'armure propre au jet (négatif ou nul)
 * @returns {number}
 */
export function cumulMalusJet(system, malusArmure = 0) {
  return malusArmure + (system.malusSurcharge ?? 0) + (system.malusBlessureGrave ?? 0);
}

/** Malus de blessures graves pour un nombre de blessures (table CONFIG.AGONE.malusBlessuresGraves). */
export function malusBlessuresGraves(nombre) {
  const table = CONFIG.AGONE.malusBlessuresGraves;
  const index = Math.max(0, Math.min(table.length - 1, Number(nombre) || 0));
  return table[index];
}

/** Somme des bonus/malus d'attributs supplémentaires (bonusAttributsSupp) visant une statistique. */
export function sommeBonusSupp(liste, attribut) {
  return (liste ?? []).reduce((s, e) => e.attribut === attribut ? s + (Number(e.valeur) || 0) : s, 0);
}

/**
 * Caractéristique de base d'une attaque : `attributLie` de la compétence de l'arme, sinon TIR pour
 * une arme de trait et MÊL pour les autres.
 * @returns {{ attributLie: string, base: number }}
 */
export function baseAttaqueArme(armeSystem, acteurSystem, competence) {
  const attributLie = competence?.system?.attributLie
    ?? ((armeSystem.style ?? "melee") === "trait" ? "tir" : "melee");
  const base = (attributLie === "melee" || attributLie === "tir")
    ? (acteurSystem[attributLie] ?? 0)
    : scoreAttribut(acteurSystem, attributLie);
  return { attributLie, base };
}

/**
 * Totaux d'une arme portée (initiative, attaque, parade, dommages), d'après les données PRÉPARÉES
 * de l'acteur. Mêmes formules que rollAttaque et rollParade.
 * @param {object} armeSystem     `system` de l'arme
 * @param {object} acteurSystem   `system` préparé de l'acteur
 * @param {Iterable<object>} items  Items de l'acteur (compétence liée par domaine)
 */
export function totauxArme(armeSystem, acteurSystem, items) {
  let competence = null;
  if (armeSystem.competence) {
    for (const i of items ?? []) {
      if (i.type === "competence" && i.system.domaine === armeSystem.competence) { competence = i; break; }
    }
  }
  const scoreComp  = competence?.system.score ?? 0;
  const bonusCorps = acteurSystem.bonusCorps ?? 0;
  const melee      = acteurSystem.melee ?? 0;
  const { attributLie, base } = baseAttaqueArme(armeSystem, acteurSystem, competence);
  const attackBonus  = armeSystem.attackBonus  ?? 0;
  const defenseBonus = armeSystem.defenseBonus ?? 0;
  return {
    competence, scoreComp, bonusCorps, melee, attributLie,
    baseAttaque:   base,
    attackBonus, defenseBonus,
    initTotal:     (acteurSystem.initiative ?? 0) + (armeSystem.initBonus ?? 0),
    attackTotal:   base  + scoreComp + attackBonus  + bonusCorps,
    defenseTotal:  melee + scoreComp + defenseBonus + bonusCorps,
    dommagesTotal: (armeSystem.dommages ?? 0) + (acteurSystem.bd ?? 0),
  };
}

/**
 * Charges des avantages & défauts : dépensées, récupérées, solde.
 * « Coût doublé » et « réduction » viennent des effets actifs (Jeune, Vieillard).
 * @param {Iterable<object>} dons  Items de type `don`
 * @param {object} effets          Cumul des effets actifs (charges_double, charges_reduction)
 * @param {number} [ptsMax=0]      Budget initial de Charges
 */
export function calculerCharges(dons, effets, ptsMax = 0) {
  let depense = 0;
  let recupere = 0;
  for (const don of dons ?? []) {
    const cout = don.system.cout ?? 0;
    if (don.system.categorie === "avantage") {
      let coutEff = cout;
      const estCharge = don.system.typeCharge === "charge";
      if (effets.charges_double && don.name !== "Jeune" && estCharge) coutEff *= 2;
      if (effets.charges_reduction > 0 && don.name !== "Vieillard" && estCharge) coutEff = Math.max(1, coutEff - effets.charges_reduction);
      depense += Math.max(0, coutEff);
    } else {
      // défauts : coût stocké négatif → on prend la valeur absolue
      recupere += Math.abs(cout);
    }
  }
  const chargesDisponibles = (ptsMax ?? 0) + recupere;
  const chargesSolde = chargesDisponibles - depense;
  return {
    chargesDepensees:  depense,
    chargesRecuperees: recupere,
    chargesDisponibles,
    chargesSolde,
    chargesSoldeClass: chargesSolde < 0 ? "charges-deficit" : "charges-ok",
    // booléens utiles dans le template
    chargesJeune:      effets.charges_double,
    chargesVieillard:  effets.charges_reduction > 0,
  };
}

/**
 * Applique des deltas aux scores `{ score }` d'un personnage, plancher à 0, et mémorise le delta
 * réellement appliqué dans `avantageBonus` (transitoire : la valeur stockée = score − avantageBonus).
 */
export function appliquerDeltasScores(system, deltas, cles) {
  for (const k of cles) {
    const avant = system[k].score ?? 0;
    const apres = Math.max(0, avant + (Number(deltas[k]) || 0));
    system[k].score = apres;
    system[k].avantageBonus = apres - avant;
  }
}

/** Attributs de barre de jeton gérés par le système (ressource `{ valeur, max }`). */
export const BARRES_JETON = Object.freeze(["pdv", "densite"]);

/** Clé de ressource (`pdv`, `densite`) visée par un attribut de barre, ou null. */
export function cleBarreJeton(attribut) {
  const cle = String(attribut ?? "").replace(/^system\./, "");
  return BARRES_JETON.includes(cle) ? cle : null;
}

/** Nouvelle valeur d'une barre de jeton, bornée entre 0 et le maximum. */
export function valeurBarre(courant, max, valeur, estDelta = false) {
  const cible = estDelta ? (Number(courant) || 0) + (Number(valeur) || 0) : (Number(valeur) || 0);
  return Math.max(0, Math.min(Number(max) || 0, cible));
}
