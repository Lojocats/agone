/**
 * Météo du calendrier appliquée à la scène : luminosité, effet météo natif de Foundry,
 * effets FXMaster et calcul des seules modifications nécessaires.
 */

/** Variation de luminosité selon la météo. */
const METEO_LUMINOSITE = {
  ensoleille: +0.15, nuageux: -0.10, pluie: -0.15,
  orage: -0.25, brouillard: -0.20, neige: -0.05,
  grele: -0.20, blizzard: -0.30, chaleur: +0.20,
  nuit: -0.05, automne: -0.05, cendres: -0.30,
  brumechaleur: +0.05,
};

/** Effet météo natif de Foundry (CONFIG.weatherEffects) pour chaque météo. */
const METEO_NATIVE = {
  pluie: "rain", orage: "rainstorm", brouillard: "fog",
  neige: "snow", grele: "rain", blizzard: "snow",
};

/**
 * Effets FXMaster par météo.
 * Particules disponibles : autumnleaves, bats, birds, bubbles, clouds, crows,
 *   eagles, embers, fog, hail, rain, rats, snow, snowstorm, spiders, stars
 * Filtres disponibles    : bloom, color, fog, lightning, oldfilm, predator, underwater
 */
export const METEO_FX = {
  ensoleille: [
    { kind: "filter", type: "color", options: { color: { value: "#fff0cc", apply: true }, saturation: 1.05, contrast: 1.02 } },
  ],
  nuageux: [
    { kind: "particle", type: "clouds", options: { scale: 1.0, density: 0.08, speed: 0.5, alpha: 0.45 } },
    { kind: "filter",   type: "color",  options: { color: { value: "#c8d4de", apply: true }, saturation: 0.85 } },
  ],
  pluie: [
    { kind: "particle", type: "rain",  options: { direction: 90, density: 0.15, speed: 1.2 } },
    { kind: "filter",   type: "color", options: { color: { value: "#90aec0", apply: true }, saturation: 0.75 } },
  ],
  orage: [
    { kind: "particle", type: "rain",      options: { direction: 95, density: 0.35, speed: 1.8 } },
    { kind: "filter",   type: "lightning", options: {} },
    { kind: "filter",   type: "color",     options: { color: { value: "#6680a0", apply: true }, saturation: 0.6 } },
  ],
  brouillard: [
    { kind: "particle", type: "fog",   options: { scale: 1.2, density: 0.12, speed: 0.4, alpha: 0.55 } },
    { kind: "filter",   type: "color", options: { color: { value: "#a8b8c0", apply: true }, saturation: 0.65 } },
  ],
  neige: [
    { kind: "particle", type: "snow",  options: { direction: 90, density: 0.12, speed: 0.9 } },
    { kind: "filter",   type: "color", options: { color: { value: "#d8eaff", apply: true }, saturation: 0.8 } },
  ],
  grele: [
    { kind: "particle", type: "hail",   options: { direction: 92, density: 0.20, speed: 1.6 } },
    { kind: "particle", type: "clouds", options: { scale: 0.9, density: 0.06, speed: 0.6, alpha: 0.5 } },
    { kind: "filter",   type: "color",  options: { color: { value: "#9eb8cc", apply: true }, saturation: 0.7 } },
  ],
  blizzard: [
    { kind: "particle", type: "snowstorm", options: { direction: 95, density: 0.30, speed: 2.0 } },
    { kind: "filter",   type: "color",     options: { color: { value: "#c0d8f0", apply: true }, saturation: 0.5 } },
  ],
  chaleur: [
    { kind: "filter", type: "color", options: { color: { value: "#ffcc88", apply: true }, saturation: 1.1, contrast: 1.05 } },
    { kind: "filter", type: "bloom", options: { blur: 3, bloomScale: 1.3, threshold: 0.35 } },
  ],
  nuit: [
    { kind: "particle", type: "stars", options: { scale: 0.8, density: 0.12, alpha: 0.85 } },
    { kind: "filter",   type: "color", options: { color: { value: "#1a2040", apply: true }, saturation: 0.6 } },
  ],
  automne: [
    { kind: "particle", type: "autumnleaves", options: { direction: 88, density: 0.10, speed: 0.7 } },
    { kind: "filter",   type: "color",        options: { color: { value: "#d4a870", apply: true }, saturation: 1.1 } },
  ],
  cendres: [
    { kind: "particle", type: "embers", options: { density: 0.15, speed: 0.6, alpha: 0.7, tint: { value: "#808080", apply: true } } },
    { kind: "filter",   type: "color",  options: { color: { value: "#887060", apply: true }, saturation: 0.4 } },
  ],
  brumechaleur: [
    { kind: "filter", type: "predator", options: {} },
    { kind: "filter", type: "color",    options: { color: { value: "#e8c890", apply: true }, saturation: 0.9 } },
  ],
};

/**
 * Luminosité globale de la scène (0 à 1) selon l'heure et la météo.
 * @param {number} heure    heure du calendrier (0-23)
 * @param {string} meteoId  identifiant de CONFIG.AGONE.meteoTypes
 */
export function luminositeMeteo(heure, meteoId) {
  const h = heure ?? 8;
  let base;
  if      (h >= 22 || h < 5) base = 0.0;
  else if (h >= 20)          base = 0.15;
  else if (h >= 18)          base = 0.35;
  else if (h >= 6 && h < 8)  base = 0.45;
  else                       base = 0.75;
  const valeur = Math.max(0, Math.min(1, base + (METEO_LUMINOSITE[meteoId] ?? 0)));
  return Math.round(valeur * 100) / 100;
}

/** Effet météo natif de Foundry pour une météo ("" : aucun). */
export function effetMeteoNatif(meteoId) {
  return METEO_NATIVE[meteoId] ?? "";
}

/**
 * Effets FXMaster d'une météo, selon les préférences du MJ.
 * @param {string} meteoId
 * @param {{couleur?: boolean, particules?: boolean}} [preferences]
 */
export function effetsFXMeteo(meteoId, { couleur = true, particules = true } = {}) {
  return (METEO_FX[meteoId] ?? []).filter(e => {
    if (!couleur && e.kind === "filter" && e.type === "color") return false;
    if (!particules && e.kind === "particle") return false;
    return true;
  });
}

/**
 * Modifications à apporter à la scène pour obtenir la météo et la luminosité voulues ;
 * objet vide si la scène est déjà dans cet état (aucune mise à jour à envoyer).
 * @param {{weather?: string, luminosite?: number}} actuel  état enregistré de la scène
 * @param {{weather: string, luminosite: number}} cible
 * @returns {Record<string, *>}
 */
export function changementsScene(actuel, cible) {
  const maj = {};
  if ((actuel.weather ?? "") !== cible.weather) maj.weather = cible.weather;
  if (Math.abs((actuel.luminosite ?? 0) - cible.luminosite) > 0.001) {
    maj["environment.globalLight.luminosity"] = cible.luminosite;
  }
  return maj;
}
