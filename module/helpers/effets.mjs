import { AVANTAGES_EFFETS } from "./compendium-data.mjs";

/**
 * Effets actifs Agone.
 *
 * Les bonus/malus portés par les items (avantages, armes, armures, équipements…) sont de vrais
 * ActiveEffect Foundry, transférés à l'acteur qui possède l'item. Chaque modificateur vise la clé
 * `flags.agone.effets.<stat>` : Foundry cumule les valeurs pendant `applyActiveEffects`, puis les
 * calculs dérivés du système les lisent (voir AgoneActor#_applyAvantagesEffets et les DataModels).
 * Les statistiques disponibles sont décrites dans CONFIG.AGONE.effets.
 */
export const EFFET_PREFIX = "flags.agone.effets.";

const MODES = () => ({
  add     : CONST.ACTIVE_EFFECT_MODES.ADD,
  upgrade : CONST.ACTIVE_EFFECT_MODES.UPGRADE,
  override: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
});

/** Valeurs neutres de chaque statistique (avant application des effets). */
export function effetsNeutres() {
  return Object.fromEntries(Object.entries(CONFIG.AGONE.effets).map(([k, def]) => [k, def.neutre ?? 0]));
}

/** Données d'un modificateur (change) d'ActiveEffect pour une statistique. */
export function changeEffet(stat, value) {
  const def = CONFIG.AGONE.effets[stat] ?? {};
  return {
    key  : EFFET_PREFIX + stat,
    mode : MODES()[def.mode ?? "add"],
    value: String(def.booleen ? true : value),
  };
}

/** Décode un modificateur : statistique Agone connue ou clé libre. */
export function lireChange(change) {
  const stat = change.key?.startsWith(EFFET_PREFIX) ? change.key.slice(EFFET_PREFIX.length) : null;
  const def  = stat ? CONFIG.AGONE.effets[stat] : null;
  return { stat, def, connu: !!def, key: change.key, value: change.value };
}

/**
 * Effets d'un avantage/défaut du livre de base (table AVANTAGES_EFFETS), prêts à être créés
 * sur l'item. Tableau vide si l'avantage n'a pas d'effet mécanique.
 */
export function effetsDepuisTable(nom, img) {
  const effets = AVANTAGES_EFFETS[nom] ?? [];
  if (!effets.length) return [];
  return [{
    name    : nom,
    img     : img || "icons/svg/aura.svg",
    transfer: true,
    changes : effets.map(e => changeEffet(e.stat, e.delta ?? e.value ?? 0)),
  }];
}

/** Cumul des effets actifs de l'acteur (valeurs neutres si aucun). */
export function effetsActeur(actor) {
  return { ...effetsNeutres(), ...(actor?.flags?.agone?.effets ?? {}) };
}

/**
 * Sources des modificateurs actifs, par statistique : { stat: [{ nom, valeur }] }.
 * Sert aux infobulles des fiches.
 */
export function sourcesEffets(actor) {
  const sources = {};
  for (const effect of actor.allApplicableEffects()) {
    if (!effect.active) continue;
    const nom = effect.parent?.documentName === "Item" ? effect.parent.name : effect.name;
    for (const change of effect.changes) {
      const { stat, connu } = lireChange(change);
      if (!connu) continue;
      (sources[stat] ??= []).push({ nom, valeur: Number(change.value) || 0 });
    }
  }
  return sources;
}
