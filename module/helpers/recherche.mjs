/**
 * Moteur de recherche des navigateurs de compendium (fonctions pures, testées hors Foundry).
 *
 * Syntaxe de la requête :
 *  - plusieurs mots : tous doivent être trouvés, dans n'importe quel ordre et n'importe quel champ ;
 *  - "expression exacte" entre guillemets ;
 *  - -mot : exclut les entrées qui contiennent ce mot ;
 *  - nom:mot : ne cherche ce mot que dans le nom.
 * Accents, casse, ligatures (œ, æ) et apostrophes sont ignorés. Sans résultat exact, la recherche
 * tolère une faute de frappe par mot (deux pour les mots longs) : résultats « approchants ».
 * Les résultats sont classés par pertinence : nom commençant par la requête, puis mot du nom,
 * puis nom contenant le terme, puis autres champs.
 */

const LIGATURES = { "œ": "oe", "Œ": "oe", "æ": "ae", "Æ": "ae", "ß": "ss", "’": "'", "‘": "'", "`": "'" };

/** Normalise un caractère : minuscules, sans accent (0, 1 ou 2 caractères). */
function normaliserCaractere(c) {
  if (LIGATURES[c]) return LIGATURES[c];
  return c.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Chaîne normalisée pour la comparaison (accents, casse, ligatures, apostrophes). */
export function normaliser(texte) {
  let res = "";
  for (const c of String(texte ?? "")) res += normaliserCaractere(c);
  return res;
}

/** Texte brut d'un champ (le HTML des descriptions est retiré). */
function texteBrut(valeur) {
  return String(valeur ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ");
}

/**
 * Analyse une requête en termes à trouver et à exclure.
 * @returns {{ termes: {texte: string, nomSeul: boolean}[], exclus: string[] }}
 */
export function analyserRequete(requete) {
  const termes = [];
  const exclus = [];
  const re = /(-?)(nom:|name:)?(?:"([^"]*)"|(\S+))/gi;
  for (const m of String(requete ?? "").matchAll(re)) {
    const texte = normaliser(m[3] ?? m[4] ?? "").trim();
    if (!texte || texte === "-") continue;
    if (m[1]) exclus.push(texte);
    else termes.push({ texte, nomSeul: !!m[2] });
  }
  return { termes, exclus };
}

/** Distance d'édition (Levenshtein) bornée : renvoie max + 1 dès que la borne est dépassée. */
export function distance(a, b, max = 2) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prec = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cour = [i];
    let minLigne = i;
    for (let j = 1; j <= b.length; j++) {
      cour[j] = Math.min(prec[j] + 1, cour[j - 1] + 1, prec[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      minLigne = Math.min(minLigne, cour[j]);
    }
    if (minLigne > max) return max + 1;
    prec = cour;
  }
  return prec[b.length];
}

/** Fautes tolérées pour un terme en recherche approchante (aucune sous 4 lettres). */
function tolerance(terme) {
  return terme.length >= 8 ? 2 : terme.length >= 4 ? 1 : 0;
}

const MOTS = /[a-z0-9]+(?:'[a-z0-9]+)*/g;

/**
 * Pertinence d'un terme dans un champ normalisé (0 : absent).
 * Nom : 6 début du nom, 5 début d'un mot, 4 contenu ; autres champs : 2 début de mot, 1 contenu.
 * Approchant : 0,5 si un mot du champ est à moins de `tolerance` fautes du terme.
 */
function scoreTerme(terme, champ, estNom, approx) {
  const pos = champ.indexOf(terme);
  if (pos >= 0) {
    const debutMot = pos === 0 || !/[a-z0-9]/.test(champ[pos - 1]);
    if (estNom) return pos === 0 ? 6 : debutMot ? 5 : 4;
    return debutMot ? 2 : 1;
  }
  if (!approx) return 0;
  const max = tolerance(terme);
  if (!max || terme.includes(" ")) return 0;
  for (const mot of champ.match(MOTS) ?? []) {
    // Préfixe approchant : « fulgu » trouve « fulgurance », « fulgurence » aussi
    const candidat = mot.length > terme.length ? mot.slice(0, terme.length) : mot;
    if (distance(terme, candidat, max) <= max) return 0.5;
  }
  return 0;
}

/**
 * Pertinence d'une entrée pour une requête analysée (0 : l'entrée ne correspond pas).
 * @param {object} entree
 * @param {{termes, exclus}} requete    Résultat d'analyserRequete
 * @param {string[]} champs             Champs texte de l'entrée ; le premier est le nom
 * @param {boolean} [approx=false]      Tolérer les fautes de frappe
 */
export function scoreEntree(entree, requete, champs, approx = false) {
  const valeurs = champs.map(c => normaliser(texteBrut(entree[c])));
  if (requete.exclus.some(ex => valeurs.some(v => v.includes(ex)))) return 0;
  if (!requete.termes.length) return 1;  // exclusions seules : toute entrée non exclue
  let total = 0;
  for (const { texte, nomSeul } of requete.termes) {
    let meilleur = scoreTerme(texte, valeurs[0], true, approx);
    if (!nomSeul) for (const v of valeurs.slice(1)) meilleur = Math.max(meilleur, scoreTerme(texte, v, false, approx));
    if (!meilleur) return 0;
    total += meilleur;
  }
  // Bonus : le nom est exactement la requête
  const phrase = requete.termes.map(t => t.texte).join(" ");
  if (phrase && valeurs[0] === phrase) total += 10;
  return total;
}

/**
 * Filtre et classe `entrees` selon `requete` (chaîne brute).
 * @returns {{ resultats: object[], scores: Map<object, number>, approximatif: boolean, actif: boolean }}
 *   `resultats` garde l'ordre d'origine (le navigateur trie ensuite, voir comparerPertinence) ;
 *   `approximatif` : aucun résultat exact, résultats tolérant les fautes de frappe.
 */
export function rechercher(entrees, requete, champs = ["name"]) {
  const analyse = analyserRequete(requete);
  if (!analyse.termes.length && !analyse.exclus.length) {
    return { resultats: entrees, scores: new Map(), approximatif: false, actif: false };
  }
  const passe = approx => {
    const scores = new Map();
    for (const e of entrees) {
      const s = scoreEntree(e, analyse, champs, approx);
      if (s > 0) scores.set(e, s);
    }
    return scores;
  };
  let scores = passe(false);
  let approximatif = false;
  if (!scores.size && analyse.termes.length) {
    scores = passe(true);
    approximatif = scores.size > 0;
  }
  return { resultats: entrees.filter(e => scores.has(e)), scores, approximatif, actif: true };
}

/**
 * Comparateur : pertinence décroissante quand une recherche est active, puis `ordre` (tri habituel).
 * @param {Map<object, number>} scores
 * @param {(a, b) => number} ordre
 */
export function comparerPertinence(scores, ordre = () => 0) {
  if (!scores?.size) return ordre;
  return (a, b) => ((scores.get(b) ?? 0) - (scores.get(a) ?? 0)) || ordre(a, b);
}

/**
 * Plages [début, fin[ du texte d'origine qui correspondent aux termes de la requête (surlignage).
 * Les positions tiennent compte des caractères que la normalisation allonge (œ → oe).
 */
export function plagesSurlignage(texte, requete) {
  const { termes } = analyserRequete(requete);
  if (!termes.length) return [];
  // Normalisation caractère par caractère, avec l'index d'origine de chaque caractère normalisé
  const origine = [];
  let norm = "";
  const chars = [...String(texte ?? "")];
  let index = 0;
  for (const c of chars) {
    const n = normaliserCaractere(c);
    for (let k = 0; k < n.length; k++) origine.push(index);
    norm += n;
    index += c.length;
  }
  origine.push(index);

  const plages = [];
  for (const { texte: terme } of termes) {
    let pos = norm.indexOf(terme);
    while (pos >= 0) {
      const debut = origine[pos];
      const finNorm = pos + terme.length;
      const fin = finNorm < origine.length - 1 ? origine[finNorm] : index;
      plages.push([debut, fin]);
      pos = norm.indexOf(terme, finNorm);
    }
  }
  // Fusion des plages qui se chevauchent
  plages.sort((a, b) => a[0] - b[0]);
  const fusion = [];
  for (const p of plages) {
    const der = fusion.at(-1);
    if (der && p[0] <= der[1]) der[1] = Math.max(der[1], p[1]);
    else fusion.push([...p]);
  }
  return fusion;
}
