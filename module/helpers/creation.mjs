/**
 * Création de personnage : table d'achat des scores et bornes raciales des caractéristiques.
 */

const table = tbl => tbl ?? CONFIG.AGONE?.tableAchatCreation ?? [0, 1, 2, 3, 4, 5, 7, 10, 14, 19, 25];

/**
 * Coût en points de création pour passer du score brut `score` à `score + 1`.
 * Dans la table : écart entre deux lignes. Au-delà : l'écart continue de croître de 1 par niveau
 * (règle de l'achat point par point, celle que les joueurs utilisent sur la fiche).
 * @param {number} score     Score brut actuel (hors bonus racial et avantages)
 * @param {number[]} [tbl]   Table d'achat (défaut : CONFIG.AGONE.tableAchatCreation)
 */
export function coutCreationNiveau(score, tbl) {
  const t = table(tbl);
  const s = Math.max(0, Math.trunc(Number(score) || 0));
  if (s + 1 < t.length) return t[s + 1] - t[s];
  const dernierEcart = t.length >= 2 ? t[t.length - 1] - t[t.length - 2] : 1;
  return dernierEcart + (s - (t.length - 2));
}

/**
 * Coût total en points de création d'un score brut : toujours égal à la somme des achats point par point.
 * @param {number} score
 * @param {number[]} [tbl]
 */
export function coutCreationTotal(score, tbl) {
  const t = table(tbl);
  const n = Math.trunc(Number(score) || 0);
  if (n <= 0) return 0;
  if (n < t.length) return t[n];
  let total = t[t.length - 1] ?? 0;
  for (let s = Math.max(0, t.length - 1); s < n; s++) total += coutCreationNiveau(s, t);
  return total;
}

/**
 * Achat minimum imposé par le peuple (score brut, hors bonus racial) : compensation d'un malus
 * racial (plancher à 0) et minimum racial, diminué du bonus racial positif.
 * @param {number} bonus          Modificateur racial de la caractéristique
 * @param {number|null} raceMin   Minimum racial (score total), ou null
 */
export function achatForce(bonus, raceMin) {
  const b = Number(bonus) || 0;
  return Math.max(b < 0 ? -b : 0, Math.max(0, (Number(raceMin) || 0) - Math.max(0, b)));
}

/**
 * Bornes raciales d'une caractéristique du personnage.
 * Les bornes enregistrées sur l'acteur à l'application du peuple (`raceMin` / `raceMax`, lues sur
 * l'item Peuple) priment ; à défaut, celles de la table du peuple nommé ; sans peuple, celles de
 * l'Humain. Un peuple personnalisé inconnu de la table n'a que ses bornes enregistrées.
 * @param {object} system  Données du personnage
 * @param {string} cle     Caractéristique ("agilite", "force"…)
 * @returns {{min: number|null, max: number|null}}
 */
export function bornesRaciales(system, cle) {
  const AGONE = CONFIG.AGONE ?? {};
  const peuple = system?.peuple ?? "";
  const peupleKey = peuple ? AGONE.peupleNomVersKey?.[peuple] : "humain";
  const data = peupleKey ? AGONE.peuplesData?.[peupleKey] : null;
  return {
    min: system?.[cle]?.raceMin ?? data?.[`${cle}Min`] ?? null,
    max: system?.[cle]?.raceMax ?? data?.[`${cle}Max`] ?? null,
  };
}
