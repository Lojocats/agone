/**
 * Données de contexte partagées par les fiches d'acteur (personnage, compagnon, démon, PNJ).
 */

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

const ASPECTS = [
  { key: "corps",  label: "AGONE.Corps"  },
  { key: "esprit", label: "AGONE.Esprit" },
  { key: "ame",    label: "AGONE.Ame"    },
];

/**
 * Caractéristiques simples (nombres) groupées par aspect pour le partial caracs-simples.hbs.
 * Chaque nom de caractéristique est un bouton de jet (`rollAttribut`).
 * La saisie porte sur la valeur stockée (`source`) ; le bonus des effets actifs est affiché à part.
 * @param {object} system                     Données préparées (effets actifs appliqués)
 * @param {object} source                     Données stockées (`actor._source.system`)
 * @param {string[]} keys                     Caractéristiques affichées, dans l'ordre
 * @param {object} [options]
 * @param {Record<string, string>} [options.derivees]  Caractéristiques calculées (non modifiables) → info-bulle
 * @param {Record<string, object>} [options.extra]     Données supplémentaires par caractéristique (ex. montée de niveau)
 */
export function caracsParAspect(system, source, keys, { derivees = {}, extra = {} } = {}) {
  return ASPECTS.map(({ key: aspect, label }) => ({
    label,
    caracs: keys
      .filter(k => CONFIG.AGONE.attributs[k]?.aspect === aspect)
      .map(k => {
        const total = system[k] ?? 0;
        const base  = derivees[k] ? total : (source[k] ?? total);
        return {
          key     : k,
          labelKey: CONFIG.AGONE.attributs[k].label,
          score   : base,
          total,
          bonus   : total - base,
          derivee : derivees[k] ?? null,
          ...extra[k],
        };
      }),
  })).filter(g => g.caracs.length);
}
