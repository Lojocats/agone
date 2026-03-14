/**
 * Configuration du système Agone
 */
import { PEUPLES_DATA } from "./compendium-data.mjs";
export const AGONE = {};

AGONE.peuples = {
  humain: "AGONE.Peuple.Humain",
  farfadet: "AGONE.Peuple.Farfadet",
  lutin: "AGONE.Peuple.Lutin",
  satyre: "AGONE.Peuple.Satyre",
  geant: "AGONE.Peuple.Geant",
  minotaure: "AGONE.Peuple.Minotaure",
  ogre: "AGONE.Peuple.Ogre",
  drakonien: "AGONE.Peuple.Drakonien",
  morgane: "AGONE.Peuple.Morgane",
  pixie: "AGONE.Peuple.Pixie",
  feeNoire: "AGONE.Peuple.FeeNoire",
  meduse: "AGONE.Peuple.Meduse",
  nain: "AGONE.Peuple.Nain"
};

// -- Données raciales dérivées depuis PEUPLES_DATA (source unique de vérité) ----
// key/name sont extraites ; toutes les autres propriétés alimentent peuplesData
AGONE.peuplesData      = {};
AGONE.peupleNomVersKey = {};
for (const p of PEUPLES_DATA) {
  const { key, name, ...rest } = p;
  AGONE.peuplesData[key]       = { ...rest };
  AGONE.peupleNomVersKey[name] = key;
}


// Multiplicateurs XP pour la montée de niveau (après création)
AGONE.xpMultipliers = { aspect: 7, carac: 5, competence: 5, avantage: 10, defaut: 5 };

// Table d'achat à la création (coûts cumulatifs, niveau 0-10)
// Coût incrémental de N→N+1 : table[N+1] - table[N]
AGONE.tableAchatCreation = [0, 1, 2, 3, 4, 5, 7, 10, 14, 19, 25];

// ── Tables de dérivation depuis TAI ────────────────────────────────────
// TAI est un modificateur : -2 (très petit) → 0 (humain) → +3 (géant)

// TAI → Mouvement de base
AGONE.taiToMv = { "-2": 1, "-1": 2, "0": 3, "1": 4, "2": 6, "3": 8 };

// TAI → Base de Points de Vie
AGONE.taiToBpdv = { "-2": 10, "-1": 20, "0": 25, "1": 45, "2": 70, "3": 100 };

// TAI → Modificateur de Poids (chargeMax = FOR × modPoids)
AGONE.taiToModPoids = { "-2": 4, "-1": 6, "0": 7, "1": 10, "2": 15, "3": 20 };

// Lookup générique par TAI (clampé entre -2 et +3)
AGONE.lookupTai = function(table, tai) {
  const clamped = Math.max(-2, Math.min(3, tai ?? 0));
  return table[String(clamped)] ?? table["0"];
};

// (FOR + TAI) → Bonus de Dommages
AGONE.forTaiToBd = {
  "-1": -6, "0": -4, "1": -2, "2": -1, "3": -1,
  "4": 0, "5": 0, "6": 0,
  "7": 1, "8": 1,
  "9": 2,
  "10": 4, "11": 6, "12": 8, "13": 10, "14": 12,
  "15": 15, "16": 18, "17": 21, "18": 24, "19": 27,
  "20": 31, "21": 35, "22": 39, "23": 43
};

AGONE.lookupBd = function(forScore, tai) {
  const sum = Math.max(-1, Math.min(23, (forScore ?? 0) + (tai ?? 0)));
  return AGONE.forTaiToBd[String(sum)] ?? 0;
};

AGONE.typesArme = {
  P: "AGONE.Arme.Perforant",
  T: "AGONE.Arme.Tranchant",
  PT: "AGONE.Arme.PerforantTranchant",
  C: "AGONE.Arme.Contondant"
};

AGONE.stylesArme = {
  melee: "AGONE.Arme.Melee",
  jet: "AGONE.Arme.Jet",
  trait: "AGONE.Arme.Trait"
};

AGONE.typesArmure = {
  "0": "AGONE.Armure.VesteSeule",
  "1": "AGONE.Armure.Partielle",
  "2": "AGONE.Armure.Complete"
};

// Caractéristiques primaires et leurs aspects associés
AGONE.attributs = {
  agilite:     { label: "AGONE.Attribut.Agilite",     abbr: "AGI", aspect: "corps" },
  force:       { label: "AGONE.Attribut.Force",       abbr: "FOR", aspect: "corps" },
  perception:  { label: "AGONE.Attribut.Perception",  abbr: "PER", aspect: "corps" },
  resistance:  { label: "AGONE.Attribut.Resistance",  abbr: "RES", aspect: "corps" },
  intelligence:{ label: "AGONE.Attribut.Intelligence",abbr: "INT", aspect: "esprit" },
  volonte:     { label: "AGONE.Attribut.Volonte",     abbr: "VOL", aspect: "esprit" },
  charisma:    { label: "AGONE.Attribut.Charisma",    abbr: "CHA", aspect: "ame" },
  creativite:  { label: "AGONE.Attribut.Creativite",  abbr: "CRE", aspect: "ame" }
};

// Malus de blessures graves [0 BG, 1 BG, 2 BG, 3 BG]
AGONE.malusBlessuresGraves = [0, -1, -3, -6];

// Liste des compétences { name, domaine (catégorie), attributLie }
AGONE.competences = [
  // ÉPREUVE
  { name: "Armes (Épreuve)",              domaine: "Épreuve",  attributLie: "melee"        },
  { name: "Athlétisme (Épreuve)",         domaine: "Épreuve",  attributLie: "force"        },
  { name: "Équitation (Épreuve)",         domaine: "Épreuve",  attributLie: "agilite"      },
  { name: "Escalade (Épreuve)",           domaine: "Épreuve",  attributLie: "force"        },
  { name: "Esquive (Épreuve)",            domaine: "Épreuve",  attributLie: "agilite"      },
  { name: "Natation (Épreuve)",           domaine: "Épreuve",  attributLie: "force"        },
  { name: "Premiers soins (Épreuve)",     domaine: "Épreuve",  attributLie: "intelligence" },
  { name: "Survie (Épreuve)",             domaine: "Épreuve",  attributLie: "intelligence" },
  { name: "Vigilance (Épreuve)",          domaine: "Épreuve",  attributLie: "perception"   },
  // MARAUDE
  { name: "Acrobatie (Maraude)",          domaine: "Maraude",  attributLie: "agilite"      },
  { name: "Camouflage (Maraude)",         domaine: "Maraude",  attributLie: "agilite"      },
  { name: "Chasse (Maraude)",             domaine: "Maraude",  attributLie: "perception"   },
  { name: "Déguisement (Maraude)",        domaine: "Maraude",  attributLie: "charisma"     },
  { name: "Discrétion (Maraude)",         domaine: "Maraude",  attributLie: "agilite"      },
  { name: "Fouille (Maraude)",            domaine: "Maraude",  attributLie: "perception"   },
  { name: "Intrigue (Maraude)",           domaine: "Maraude",  attributLie: "intelligence" },
  { name: "Jeu (Maraude)",                domaine: "Maraude",  attributLie: "intelligence" },
  { name: "Passe-passe (Maraude)",        domaine: "Maraude",  attributLie: "agilite"      },
  { name: "Poisons (Maraude)",            domaine: "Maraude",  attributLie: "intelligence" },
  { name: "Serrurerie (Maraude)",         domaine: "Maraude",  attributLie: "agilite"      },
  // SAVOIR
  { name: "Alchimie (Occulte)",           domaine: "Savoir",   attributLie: "intelligence" },
  { name: "Alphabets (Savoir)",           domaine: "Savoir",   attributLie: "intelligence" },
  { name: "Astronomie (Savoir)",          domaine: "Savoir",   attributLie: "intelligence" },
  { name: "Chirurgie (Savoir)",           domaine: "Savoir",   attributLie: "intelligence" },
  { name: "Cultes (Savoir)",              domaine: "Savoir",   attributLie: "intelligence" },
  { name: "Géographie (Savoir)",          domaine: "Savoir",   attributLie: "intelligence" },
  { name: "Herboristerie (Savoir)",       domaine: "Savoir",   attributLie: "intelligence" },
  { name: "Histoire & Légendes (Savoir)", domaine: "Savoir",   attributLie: "intelligence" },
  { name: "Langues (Savoir)",             domaine: "Savoir",   attributLie: "intelligence" },
  { name: "Lois (Savoir)",                domaine: "Savoir",   attributLie: "intelligence" },
  { name: "Médecine (Savoir)",            domaine: "Savoir",   attributLie: "intelligence" },
  { name: "Navigation (Savoir)",          domaine: "Savoir",   attributLie: "intelligence" },
  { name: "Saisons (Savoir)",             domaine: "Savoir",   attributLie: "intelligence" },
  { name: "Stratégie (Savoir)",           domaine: "Savoir",   attributLie: "intelligence" },
  { name: "Us et Coutumes (Société)",     domaine: "Savoir",   attributLie: "intelligence" },
  { name: "Zoologie (Savoir)",            domaine: "Savoir",   attributLie: "intelligence" },
  // SOCIÉTÉ
  { name: "Baratin (Société)",            domaine: "Société",  attributLie: "charisma"     },
  { name: "Diplomatie (Société)",         domaine: "Société",  attributLie: "charisma"     },
  { name: "Éloquence (Société)",          domaine: "Société",  attributLie: "charisma"     },
  { name: "Étiquette (Société)",          domaine: "Société",  attributLie: "intelligence" },
  { name: "Intendance (Société)",         domaine: "Société",  attributLie: "intelligence" },
  { name: "Musique (Société)",            domaine: "Société",  attributLie: "creativite"   },
  { name: "Négoce (Société)",             domaine: "Société",  attributLie: "intelligence" },
  { name: "Peinture (Société)",           domaine: "Société",  attributLie: "creativite"   },
  { name: "Poésie (Société)",             domaine: "Société",  attributLie: "creativite"   },
  { name: "Savoir-faire (Société)",       domaine: "Société",  attributLie: "intelligence" },
  { name: "Sculpture (Société)",          domaine: "Société",  attributLie: "creativite"   },
  // OCCULTE
  { name: "Arts Magiques (Occulte)",      domaine: "Occulte",  attributLie: "creativite"   },
  { name: "Conn. des Danseurs (Occulte)", domaine: "Occulte",  attributLie: "intelligence" },
  { name: "Cryptogramme (Occulte)",       domaine: "Occulte",  attributLie: "intelligence" },
  { name: "Démonologie (Occulte)",        domaine: "Occulte",  attributLie: "intelligence" },
  { name: "Élémentalisme (Occulte)",      domaine: "Occulte",  attributLie: "intelligence" },
  { name: "Harmonie (Occulte)",           domaine: "Occulte",  attributLie: "creativite"   },
  { name: "Résonance (Occulte)",          domaine: "Occulte",  attributLie: "creativite"   },
];

// ── Saisons du Monde ────────────────────────────────────────────────────────
AGONE.saisons = {
  "": "—",
  printemps: "Printemps",
  ete:       "Été",
  automne:   "Automne",
  hiver:     "Hiver",
};

// ── Calendrier d'Harmonde (10 mois × 30 jours) ──────────────────────────────
AGONE.calendrier = {
  joursParMois: 30,
  mois: [
    { nom: "Nymphe",   saison: "printemps" },
    { nom: "Dryade",   saison: "printemps" },
    { nom: "Troll",    saison: "printemps" },
    { nom: "Phénix",   saison: "ete"       },
    { nom: "Wyvern",   saison: "ete"       },
    { nom: "Centaure", saison: "ete"       },
    { nom: "Automne",  saison: "automne"   },
    { nom: "Harpie",   saison: "hiver"     },
    { nom: "Hydre",    saison: "hiver"     },
    { nom: "Tarasque", saison: "hiver"     },
  ],
};

