import { normaliser } from "./recherche.mjs";

/**
 * Prédicats et classements des filtres des navigateurs de compendium (fonctions pures, sans
 * globales Foundry, testées hors Foundry). Les navigateurs (module/apps/*-browser.mjs) les
 * appliquent dans leur _prepareContext.
 *
 * Convention des filtres numériques : `null` (champ vide) laisse tout passer.
 * Convention des filtres à trois états : "all" | "avec" | "sans" (ou "oui" | "non").
 */

// ── Comparaisons numériques ──────────────────────────────────────────────────

/** Vrai si `valeur` ≥ `min` (valeur absente = 0), ou si le filtre est vide. */
export function auMoins(valeur, min) {
  return min === null || min === undefined || (Number(valeur) || 0) >= min;
}

/** Vrai si `valeur` ≤ `max` (valeur absente = 0), ou si le filtre est vide. */
export function auPlus(valeur, max) {
  return max === null || max === undefined || (Number(valeur) || 0) <= max;
}

/**
 * Malus « au plus X » : compare la valeur absolue du malus (les données l'écrivent en positif,
 * une saisie manuelle peut l'écrire en négatif).
 */
export function malusAuPlus(malus, max) {
  return max === null || max === undefined || Math.abs(Number(malus) || 0) <= max;
}

/** Filtre à trois états : "all" laisse tout passer, "avec"/"oui" exige `present`, "sans"/"non" son absence. */
export function avecSans(present, filtre) {
  if (filtre === "avec" || filtre === "oui") return Boolean(present);
  if (filtre === "sans" || filtre === "non") return !present;
  return true;
}

// ── Armes ────────────────────────────────────────────────────────────────────

/** Catégorie de portée d'une arme : "distance" si une portée est renseignée, sinon "contact". */
export function porteeArme(portee) {
  const p = String(portee ?? "").trim();
  return p && p !== "—" ? "distance" : "contact";
}

// ── Manœuvres ────────────────────────────────────────────────────────────────

/**
 * Catégories d'une condition de manœuvre / botte :
 *  - "sans"     : aucune condition ;
 *  - "reaction" : la manœuvre est (ou peut être) une réaction ;
 *  - "peuple"   : réservée à un peuple (« Ogre uniquement », « Farfadet, réaction »…) ;
 *  - "autre"    : condition renseignée qui ne relève d'aucune des catégories précédentes.
 * Une condition peut relever de plusieurs catégories ; `peuples` liste les noms de peuples reconnus
 * en tête de condition.
 * @returns {string[]}
 */
export function categoriesConditionManoeuvre(condition, peuples = []) {
  const texte = normaliser(String(condition ?? "").trim());
  if (!texte) return ["sans"];
  const cats = [];
  if (/\breaction\b/.test(texte)) cats.push("reaction");
  const peuple = /\buniquement\b/.test(texte)
    || peuples.some(nom => {
      const n = normaliser(nom);
      return n && (texte === n || texte.startsWith(`${n},`) || texte.startsWith(`${n} `));
    });
  if (peuple) cats.push("peuple");
  if (!cats.length) cats.push("autre");
  return cats;
}

/** Vrai si la condition correspond au filtre ("all" | "sans" | "reaction" | "peuple" | "autre"). */
export function conditionManoeuvreCorrespond(condition, filtre, peuples = []) {
  if (!filtre || filtre === "all") return true;
  return categoriesConditionManoeuvre(condition, peuples).includes(filtre);
}

// ── Peuples ──────────────────────────────────────────────────────────────────

/** Vrai si le peuple vole (vitesse de vol de base positive). */
export function estVolant(mvVolBase) {
  return (Number(mvVolBase) || 0) > 0;
}

// ── Sorts ────────────────────────────────────────────────────────────────────

/** Types de magie des sorts d'Emprise (lancés par un danseur). */
export const TYPES_EMPRISE = ["jorniste", "obscurantiste", "eclipsiste"];

/** Types de magie des Arts magiques. */
export const TYPES_ARTS = ["accord", "cyse", "geste", "decorum"];

/** Famille d'un type de magie : "emprise", "arts" ou "" (inconnu). */
export function familleSort(typeMagie) {
  const t = String(typeMagie ?? "").toLowerCase();
  if (TYPES_EMPRISE.includes(t)) return "emprise";
  if (TYPES_ARTS.includes(t))    return "arts";
  return "";
}

/** Instruments / saisons distincts et non vides d'une liste de sorts, triés. */
export function instrumentsSorts(sorts) {
  return [...new Set(sorts.map(s => String(s.instrument ?? "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "fr"));
}

/** Clé i18n du libellé d'un instrument ou d'une saison (« flute » → « AGONE.Flute »). */
export function cleInstrument(instrument) {
  const v = String(instrument ?? "");
  return `AGONE.${v.charAt(0).toUpperCase()}${v.slice(1)}`;
}
