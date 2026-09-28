/**
 * Données de contexte partagées par les fiches d'acteur (personnage, compagnon, démon, PNJ).
 */
import { sourcesEffets } from "../helpers/effets.mjs";

/**
 * Compétences regroupées par score décroissant (un groupe par niveau).
 * @param {Item[]} competences
 */
export function competencesParScore(competences) {
  const byScore = {};
  for (const c of competences) {
    const s = c.system.score ?? 0;
    (byScore[s] ??= []).push(c);
  }
  return Object.entries(byScore)
    .sort(([a], [b]) => Number(b) - Number(a))
    .map(([score, comps]) => ({ label: game.i18n.format("AGONE.NiveauN", { n: score }), className: `score-${score}`, comps }));
}

// Domaines d'Arts Magiques standards (Accord est traité à part, par instrument)
const DOMAINES_ARTS_STD = [
  { nom: "Décorum", compLiee: "Peinture"  },
  { nom: "Geste",   compLiee: "Poésie"    },
  { nom: "Cyse",    compLiee: "Sculpture" },
];
const ACCORD_INSTRUMENTS = ["harpe", "flute", "viole", "tambour", "cistre"];

/**
 * Lignes de l'onglet Magie « Arts Magiques » : une par domaine (+ une par instrument pour Accord).
 * POT = Art + min(score Arts Magiques, score compétence liée) + bonus Âme ; IMPRO = CRÉ + … + bonus Âme.
 * @param {object} system       Données système de l'acteur (art, bonusAme)
 * @param {Item[]} competences  Compétences de l'acteur
 * @param {number} creativite   Score de Créativité (sa forme diffère selon le type d'acteur)
 */
export function artsMagiquesParDomaine(system, competences, creativite) {
  const art      = system.art ?? 0;
  const bonusAme = system.bonusAme ?? 0;
  const ligne = (domaine, displayLabel, instrument, comp, compLiee, nomCompLiee) => {
    const scoreArts     = comp ? (comp.system.score ?? 0) : 0;
    const scoreCompLiee = compLiee ? (compLiee.system.score ?? 0) : 0;
    // Sans compétence liée définie, le score Arts Magiques s'applique directement
    const scoreEffectif = comp ? (nomCompLiee ? Math.min(scoreArts, scoreCompLiee) : scoreArts) : 0;
    return {
      domaine, displayLabel, instrument, comp,
      potentiel:    comp ? art + scoreEffectif + bonusAme : null,
      impro:        comp ? creativite + scoreEffectif + bonusAme : null,
      specialite:   comp?.system.specialite ?? "",
      nomCompLiee, compLiee, scoreCompLiee,
      scoreArtsMag: scoreArts, scoreEffectif,
      artVal: art, creVal: creativite, bonusAmeVal: bonusAme,
    };
  };

  // Accord : une ligne par instrument connu (compétence dont le domaine = nom de l'instrument)
  const accordEntries = [];
  const accordComp = competences.find(c => c.name === "Arts Magiques" && c.system.domaine === "Accord");
  if (accordComp) {
    for (const instrument of ACCORD_INSTRUMENTS) {
      const compLiee = competences.find(c => c.system.domaine?.toLowerCase() === instrument);
      if (!compLiee) continue;
      accordEntries.push(ligne("Accord", `Accord (${instrument})`, instrument, accordComp, compLiee,
        `${compLiee.name} (${compLiee.system.domaine})`));
    }
    // Aucun instrument connu : Accord sans contrainte d'instrument
    if (!accordEntries.length) accordEntries.push(ligne("Accord", "Accord", "", accordComp, null, ""));
  }

  const domainesCustom = game.settings.get("agone", "domainesArtsCustom") ?? [];
  const domaines = [
    ...DOMAINES_ARTS_STD,
    ...domainesCustom.map(d => ({ nom: d.nom, compLiee: d.compLiee ?? "" })),
  ];
  return [
    ...accordEntries,
    ...domaines.map(({ nom, compLiee: nomCompLiee }) => {
      const comp     = competences.find(c => c.name === "Arts Magiques" && c.system.domaine === nom);
      const compLiee = competences.find(c => c.name === nomCompLiee);
      return ligne(nom, nom, "", comp, compLiee, nomCompLiee);
    }),
  ];
}

const TYPES_MAGIE_ORDRE = ["jorniste", "obscurantiste", "eclipsiste", "accord", "cyse", "decorum", "geste"];
const TYPES_MAGIE_LABELS = {
  jorniste: "AGONE.Jorniste", obscurantiste: "AGONE.Obscurantiste", eclipsiste: "AGONE.Eclipsiste",
  accord: "AGONE.Accord", cyse: "AGONE.Cyse", geste: "AGONE.Geste", decorum: "AGONE.Decorum",
};

/**
 * Sorts de l'onglet Magie : types présents (mini-filtre), groupes par seuil et groupes
 * selon le tri choisi (flag `triSorts` : "type" | "seuil"). Les sorts mémorisés par un
 * danseur sont affichés dans son emplacement, pas dans la grille.
 * @param {Actor} actor
 * @param {Item[]} sorts
 */
export function sortsContext(actor, sorts) {
  const typeLabel = t => TYPES_MAGIE_LABELS[t] ? game.i18n.localize(TYPES_MAGIE_LABELS[t]) : t;
  const libres    = sorts.filter(s => !s.system.danseurNom);

  const sortTypes = [...new Set(sorts.map(s => s.system.typeMagie).filter(Boolean))]
    .sort()
    .map(t => ({ value: t, label: typeLabel(t) }));

  const bySeuil = {};
  for (const s of libres) (bySeuil[s.system.seuil ?? 0] ??= []).push(s);
  const sortsBySeuil = Object.entries(bySeuil)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([seuil, list]) => ({ seuil: Number(seuil), sorts: list }));

  const triSortsEstType = (actor.getFlag("agone", "triSorts") ?? "type") === "type";
  let sortsGroups;
  if (triSortsEstType) {
    const byType = {};
    for (const s of libres) (byType[s.system.typeMagie || "Autre"] ??= []).push(s);
    sortsGroups = [
      ...TYPES_MAGIE_ORDRE.filter(t => byType[t]).map(t => ({ label: typeLabel(t), sorts: byType[t] })),
      ...Object.keys(byType).filter(t => !TYPES_MAGIE_ORDRE.includes(t)).map(t => ({ label: t, sorts: byType[t] })),
    ];
  } else {
    sortsGroups = sortsBySeuil.map(g => ({ label: `${game.i18n.localize("AGONE.Seuil")} ${g.seuil}`, sorts: g.sorts }));
  }

  return { sortTypes, sortsBySeuil, triSortsEstType, sortsGroups };
}

/**
 * Jauges et mémorisation d'un Danseur : mémoire (pts Seuil), endurance et sorts mémorisables.
 * Fonction pure — ne lit ni le DataModel ni `game.i18n`, uniquement les valeurs passées en argument.
 * @param {object} danseur                  `{ capaciteSeuil, enduranceActuelle, enduranceMax }`
 * @param {Array<{seuil?: number}>} sortsAssignes  Sorts déjà mémorisés par ce danseur
 * @param {Array<{id: string, name: string, seuil?: number, danseurNom?: string}>} autresSorts
 *        Sorts de l'acteur non mémorisés par ce danseur (libres ou mémorisés par un autre danseur)
 * @returns {{memoireUtilisee: number, isFull: boolean, memoirePct: number, endurancePct: number,
 *            enduranceVide: boolean, sortsMemorisables: Array}}
 */
export function danseurMemoire({ capaciteSeuil = 0, enduranceActuelle = 0, enduranceMax = 0 } = {}, sortsAssignes = [], autresSorts = []) {
  const memoireUtilisee = sortsAssignes.reduce((sum, s) => sum + (s.seuil ?? 0), 0);
  const isFull       = capaciteSeuil > 0 && memoireUtilisee >= capaciteSeuil;
  const memoirePct   = capaciteSeuil > 0 ? Math.max(0, Math.min(100, (memoireUtilisee / capaciteSeuil) * 100)) : 0;
  const endurancePct = enduranceMax > 0 ? Math.max(0, Math.min(100, (enduranceActuelle / enduranceMax) * 100)) : 0;
  const enduranceVide = enduranceActuelle <= 0;
  const restant = capaciteSeuil - memoireUtilisee;
  const sortsMemorisables = autresSorts.filter(s => (s.seuil ?? 0) <= restant);
  return { memoireUtilisee, isFull, memoirePct, endurancePct, enduranceVide, sortsMemorisables };
}

const ASPECTS = [
  { key: "corps",  label: "AGONE.Corps"  },
  { key: "esprit", label: "AGONE.Esprit" },
  { key: "ame",    label: "AGONE.Ame"    },
];

// Statistique d'effet actif → statistique affichée sur les fiches simples (carac ou clé de statsCombatSimples)
const EFFET_VERS_STAT = {
  initiative_bonus: "initiative", melee_bonus: "melee", tir_bonus: "tir", defense_bonus: "defenseNaturelle",
  esquive_bonus: "esquive", bd_bonus: "bd", emprise_bonus: "emprise", art_bonus: "art",
};

const signe = v => `${v > 0 ? "+" : "−"}${Math.abs(v)}`;

/**
 * Badges de bonus/malus des fiches d'acteur simples (partial badges-bonus.hbs), comme sur la fiche
 * personnage : un badge par origine, par statistique — peuple (racial), effets actifs des items
 * (sources dans l'infobulle) et armure (AGI, appliqué au jet seulement : `jet: true`).
 * @param {object} [options]
 * @param {Record<string, Array<{nom: string, valeur: number}>>} [options.sources]  `sourcesEffets(actor)`
 * @param {Record<string, number>} [options.racial]  Modificateurs raciaux appliqués, par caractéristique
 * @param {string} [options.peuple]                  Nom du peuple (infobulle du badge racial)
 * @param {number} [options.malusAgi]                Malus d'AGI de l'armure (négatif ou nul)
 * @param {string} [options.armureNom]               Armure(s) portée(s) (infobulle)
 * @returns {Record<string, Array<{valeur: number, texte: string, classe: string, tooltip: string, jet?: boolean}>>}
 */
export function badgesBonus({ sources = {}, racial = {}, peuple = "", malusAgi = 0, armureNom = "" } = {}) {
  const badges = {};
  const ajouter = (stat, valeur, tooltip, extra = {}) => {
    if (!valeur) return;
    (badges[stat] ??= []).push({
      valeur, texte: valeur > 0 ? `+${valeur}` : String(valeur),
      classe: valeur > 0 ? "racial-pos" : "racial-neg", tooltip, ...extra,
    });
  };
  for (const [k, v] of Object.entries(racial)) {
    ajouter(k, v, `${game.i18n.localize(v < 0 ? "AGONE.MalusRacialPeuple" : "AGONE.BonusRacialPeuple")} ${peuple}`.trim());
  }
  for (const [stat, liste] of Object.entries(sources)) {
    const actives = liste.filter(s => s.valeur);
    const total   = actives.reduce((s, e) => s + e.valeur, 0);
    const detail  = actives.map(s => `${signe(s.valeur)} (${s.nom})`).join(", ");
    ajouter(EFFET_VERS_STAT[stat] ?? stat, total, `${game.i18n.localize("AGONE.Effets.Titre")} : ${detail}`);
  }
  ajouter("agilite", malusAgi, `${game.i18n.localize("AGONE.MalusAgi")}${armureNom ? ` (${armureNom})` : ""}`, { jet: true });
  return badges;
}

/**
 * Caractéristiques simples (nombres) groupées par aspect pour le partial caracs-simples.hbs.
 * Chaque nom de caractéristique est un bouton de jet (`rollAttribut`).
 * La saisie porte sur la valeur stockée (`source`) ; les bonus (effets actifs, peuple, armure) sont affichés à part.
 * @param {object} system                     Données préparées (effets actifs appliqués)
 * @param {object} source                     Données stockées (`actor._source.system`)
 * @param {string[]} keys                     Caractéristiques affichées, dans l'ordre
 * @param {object} [options]
 * @param {Record<string, string>} [options.derivees]  Caractéristiques calculées (non modifiables) → info-bulle
 * @param {Record<string, object>} [options.extra]     Données supplémentaires par caractéristique (ex. montée de niveau)
 * @param {Record<string, Array>}  [options.badges]    Badges de bonus/malus par caractéristique (voir badgesBonus)
 */
export function caracsParAspect(system, source, keys, { derivees = {}, extra = {}, badges = {} } = {}) {
  return ASPECTS.map(({ key: aspect, label }) => ({
    label,
    caracs: keys
      .filter(k => CONFIG.AGONE.attributs[k]?.aspect === aspect)
      .map(k => {
        const liste = badges[k] ?? [];
        // Les malus appliqués au jet seulement (armure) comptent dans le total affiché, pas dans la valeur préparée
        const total = (system[k] ?? 0) + liste.filter(b => b.jet).reduce((s, b) => s + b.valeur, 0);
        const base  = derivees[k] ? total : (source[k] ?? total);
        const bonus = total - base;
        return {
          key     : k,
          labelKey: CONFIG.AGONE.attributs[k].label,
          score   : base,
          total,
          bonus,
          // Sans détail des sources, un badge générique porte l'écart dû aux effets actifs
          badges  : liste.length || !bonus || derivees[k] ? liste
                  : [{ valeur: bonus, texte: bonus > 0 ? `+${bonus}` : String(bonus),
                       classe: bonus > 0 ? "racial-pos" : "racial-neg", tooltip: game.i18n.localize("AGONE.Effets.Titre") }],
          derivee : derivees[k] ?? null,
          ...extra[k],
        };
      }),
  })).filter(g => g.caracs.length);
}

/**
 * Pourcentage de remplissage d'une jauge (PdV, Densité…), arrondi et borné à [0, 100].
 * @param {number} valeur
 * @param {number} max
 * @returns {number}  0 si `max` est nul ou négatif
 */
export function jaugePct(valeur, max) {
  if (!(max > 0)) return 0;
  return Math.round(Math.max(0, Math.min(100, ((Number(valeur) || 0) / max) * 100)));
}

/**
 * Items d'un type, triés comme sur la fiche personnage : ordre manuel (`sort`) puis nom.
 * @param {Actor} actor
 * @param {string} type
 * @returns {Item[]}
 */
export function trierItems(actor, type) {
  return actor.items.filter(i => i.type === type)
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.name.localeCompare(b.name, "fr"));
}

/**
 * Malus de surcharge (affichage) : -3 au-delà de la charge max, -1 au-delà de la demi-charge.
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
 * Stats de combat affichées par le partial cstats-simples.hbs pour un acteur simple.
 * Une stat avec `action` est un bouton de jet (`data-action`), sinon une valeur passive.
 * Chaque stat porte ses badges de bonus/malus et, si elle est calculée, sa formule détaillée (`formule`).
 * @param {object} system  Données préparées de l'acteur
 * @param {"compagnon"|"demon"|"pnj"} type
 * @param {Record<string, Array>} [badges]  Badges par stat (voir badgesBonus)
 * @returns {Array<{cle: string, labelKey: string, valeur: number, icone: string, tooltipKey: string, badges: Array, formule: string, action?: string, actionKey?: string}>}
 */
export function statsCombatSimples(system, type, badges = {}) {
  const formules = formulesStatsSimples(system, badges);
  const stat = (cle, labelKey, valeur, icone, tooltipKey, action = null, actionKey = null) =>
    ({ cle, labelKey, valeur: valeur ?? 0, icone, tooltipKey, badges: badges[cle] ?? [], formule: formules[cle] ?? "",
       ...(action ? { action, actionKey } : {}) });
  const stats = [
    stat("initiative", "AGONE.Initiative", system.initiative, "fa-bolt", "AGONE.Ui.InitiativeSimpleTooltip",
         "rollInitiative", "AGONE.JeterInitiative"),
  ];
  if (type === "pnj") {
    stats.push(stat("initMagique", "AGONE.InitMagique", system.initMagique, "fa-hat-wizard", "AGONE.Ui.InitMagiqueTooltip",
                    "rollInitiativeMagique", "AGONE.JeterInitMagique"));
  }
  stats.push(
    stat("melee", "AGONE.Melee", system.melee, "fa-sword", "AGONE.Ui.MeleeSimpleTooltip"),
    stat("tir",   "AGONE.Tir",   system.tir,   "fa-bullseye",  "AGONE.Ui.TirSimpleTooltip"),
    stat("defenseNaturelle", "AGONE.DefenseNaturelle", system.defenseNaturelle, "fa-shield-alt",
         "AGONE.Ui.DefenseSimpleTooltip", "rollDefenseNaturelle", "AGONE.JeterDefenseNat"),
    stat("esquive", "AGONE.Esquive", system.esquiveTotal, "fa-running", "AGONE.Ui.EsquiveSimpleTooltip",
         "rollEsquive", "AGONE.JeterEsquive"),
  );
  if (type !== "compagnon") stats.push(stat("bd", "AGONE.BD", system.bd, "fa-hammer", "AGONE.BD"));
  if (type !== "demon") {
    stats.push(stat("protection", "AGONE.Combat.ProTotale", system.armure?.protection, "fa-shield-halved",
                    "AGONE.Ui.ProtectionSimpleTooltip"));
  }
  if (type === "pnj") {
    stats.push(stat("emprise", "AGONE.Emprise", system.emprise, "fa-fire", "AGONE.Ui.EmpriseSimpleTooltip",
                    "rollEmpriseAttr", "AGONE.JeterEmprise"));
  }
  return stats;
}

/**
 * Formules détaillées des stats de combat calculées d'un acteur simple (infobulles), avec le bonus
 * des effets actifs de la stat : « (FOR 3 + AGI 4×2) ÷ 3 + 1 = 4 ».
 * @param {object} system  Données préparées de l'acteur
 * @param {Record<string, Array>} [badges]  Badges par stat (voir badgesBonus)
 * @returns {Record<string, string>}  Formule par clé de stat (voir statsCombatSimples)
 */
export function formulesStatsSimples(system, badges = {}) {
  const v  = k => system[k] ?? 0;
  const ab = k => `${CONFIG.AGONE.attributs[k].abbr} ${v(k)}`;
  const f  = (cle, expr) => {
    const bonus = (badges[cle] ?? []).reduce((s, b) => s + b.valeur, 0);
    return `${expr}${bonus ? ` ${bonus > 0 ? "+" : "−"} ${Math.abs(bonus)}` : ""} = ${v(cle === "esquive" ? "esquiveTotal" : cle)}`;
  };
  const emprise = system.typeMage === "jorniste"      ? ab("intelligence")
                : system.typeMage === "obscurantiste" ? ab("volonte")
                : `(${ab("intelligence")} + ${ab("volonte")}) ÷ 2`;
  const bonusCorps = system.bonusCorps ? ` + ${game.i18n.localize("AGONE.BonusCorps")} ${system.bonusCorps}` : "";
  return {
    initiative      : f("initiative", `${ab("agilite")} + ${ab("perception")}`),
    initMagique     : `${game.i18n.localize("AGONE.Initiative")} ${v("initiative")} + 10 = ${v("initMagique")}`,
    melee           : f("melee", `(${ab("force")} + ${ab("agilite")}×2) ÷ 3`),
    tir             : f("tir", `(${ab("agilite")} + ${ab("perception")}) ÷ 2`),
    defenseNaturelle: f("defenseNaturelle", ab("agilite")),
    esquive         : f("esquive", `${ab("agilite")} + ${game.i18n.localize("AGONE.Esquive")} ${v("esquiveCompScore")}${bonusCorps}`),
    emprise         : f("emprise", emprise),
  };
}

/**
 * Badges de bonus/malus d'un acteur simple : effets actifs des items, peuple (PNJ) et armure portée.
 * @param {Actor} actor
 */
function badgesActeurSimple(actor) {
  const system = actor.system;
  const peuple = system.peupleKey
    ? Object.entries(CONFIG.AGONE.peupleNomVersKey).find(([, key]) => key === system.peupleKey)?.[0] ?? ""
    : "";
  const armures = actor.items.filter(i => i.type === "armure" && i.system.portee).map(i => i.name).join(", ");
  return badgesBonus({
    sources  : sourcesEffets(actor),
    racial   : system.bonusRacial ?? {},
    peuple,
    malusAgi : -(system.armure?.malusAgi ?? 0),
    armureNom: armures,
  });
}

/**
 * Contexte commun des fiches d'acteur simples (compagnon, démon, PNJ) : identité, permissions,
 * armes et armures triées, compétences et champs du partial competences.hbs, description enrichie.
 * Chaque fiche l'étend avec ses propres données.
 * @param {Actor} actor
 * @param {ActorSheetV2} sheet
 */
export async function contexteActeurSimple(actor, sheet) {
  const system      = actor.system;
  const competences = trierItems(actor, "competence");
  const badges      = badgesActeurSimple(actor);
  return {
    system, actor,
    source  : actor._source.system,   // valeurs stockées (saisie), sans les effets actifs
    isOwner : actor.isOwner,
    isGM    : game.user.isGM,
    editable: sheet.isEditable,
    armes   : trierItems(actor, "arme"),
    armures : trierItems(actor, "armure"),
    // Badges de bonus/malus par stat (caractéristiques, aspects, stats de combat) : voir badgesBonus
    badges,
    statsCombat: statsCombatSimples(system, actor.type, badges),
    // Partial competences.hbs : pas de tri par famille ni de montée de niveau par défaut
    competences,
    competencesGroups     : competencesParScore(competences),
    competencesNonAcquises: [],
    triCompsEstFamille    : false,
    showLevelUp           : false,
    showLevelUpComp       : false,
    showLevelUpAspect     : false,
    descriptionHTML: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      system.description ?? "", { async: true, secrets: actor.isOwner }
    ),
  };
}
