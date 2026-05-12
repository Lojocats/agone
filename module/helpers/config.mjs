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
AGONE.xpMultipliers = { aspect: 7, carac: 5, competence: 3, avantage: 10, defaut: 5 };

// Table d'achat à la création (coûts cumulatifs, niveau 0-10)
// Coût incrémental de N→N+1 : table[N+1] - table[N]
AGONE.tableAchatCreation = [0, 1, 2, 3, 4, 5, 7, 10, 14, 19, 25];

// ── Tables de dérivation depuis TAI ────────────────────────────────────
// TAI est un modificateur : -2 (très petit) → 0 (humain) → +3 (géant)

// TAI → Mouvement de base
AGONE.taiToMv = { "-2": 1, "-1": 2, "0": 3, "1": 4, "2": 6, "3": 8 };

// TAI → Base de Points de Vie
AGONE.taiToBpdv = { "-2": 10, "-1": 20, "0": 25, "1": 45, "2": 70, "3": 100 };

// TAI → Modificateur de Poids (chargeMax = FOR x modPoids)
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
  { name: "Armes",              famille: "Épreuve",  attributLie: "melee"        },
  { name: "Athlétisme",         famille: "Épreuve",  attributLie: "force"        },
  { name: "Équitation",         famille: "Épreuve",  attributLie: "agilite"      },
  { name: "Escalade",           famille: "Épreuve",  attributLie: "force"        },
  { name: "Esquive",            famille: "Épreuve",  attributLie: "agilite"      },
  { name: "Natation",           famille: "Épreuve",  attributLie: "force"        },
  { name: "Premiers soins",     famille: "Épreuve",  attributLie: "intelligence" },
  { name: "Survie",             famille: "Épreuve",  attributLie: "intelligence" },
  { name: "Vigilance",          famille: "Épreuve",  attributLie: "perception"   },
  // MARAUDE
  { name: "Acrobatie",          famille: "Maraude",  attributLie: "agilite"      },
  { name: "Camouflage",         famille: "Maraude",  attributLie: "agilite"      },
  { name: "Chasse",             famille: "Maraude",  attributLie: "perception"   },
  { name: "Déguisement",        famille: "Maraude",  attributLie: "charisma"     },
  { name: "Discrétion",         famille: "Maraude",  attributLie: "agilite"      },
  { name: "Fouille",            famille: "Maraude",  attributLie: "perception"   },
  { name: "Intrigue",           famille: "Maraude",  attributLie: "intelligence" },
  { name: "Jeu",                famille: "Maraude",  attributLie: "intelligence" },
  { name: "Passe-passe",        famille: "Maraude",  attributLie: "agilite"      },
  { name: "Poisons",            famille: "Maraude",  attributLie: "intelligence" },
  { name: "Serrurerie",         famille: "Maraude",  attributLie: "agilite"      },
  // SAVOIR
  { name: "Alphabets",           famille: "Savoir",   attributLie: "intelligence" },
  { name: "Astronomie",          famille: "Savoir",   attributLie: "intelligence" },
  { name: "Chirurgie",           famille: "Savoir",   attributLie: "intelligence" },
  { name: "Cultes",              famille: "Savoir",   attributLie: "intelligence" },
  { name: "Géographie",          famille: "Savoir",   attributLie: "intelligence" },
  { name: "Herboristerie",       famille: "Savoir",   attributLie: "intelligence" },
  { name: "Histoire & Légendes", famille: "Savoir",   attributLie: "intelligence" },
  { name: "Langues",             famille: "Savoir",   attributLie: "intelligence" },
  { name: "Lois",                famille: "Savoir",   attributLie: "intelligence" },
  { name: "Médecine",            famille: "Savoir",   attributLie: "intelligence" },
  { name: "Navigation",          famille: "Savoir",   attributLie: "intelligence" },
  { name: "Saisons",             famille: "Savoir",   attributLie: "intelligence" },
  { name: "Stratégie",           famille: "Savoir",   attributLie: "intelligence" },
  { name: "Zoologie",            famille: "Savoir",   attributLie: "intelligence" },
  // SOCIÉTÉ
  { name: "Baratin",            famille: "Société",  attributLie: "charisma"     },
  { name: "Diplomatie",         famille: "Société",  attributLie: "charisma"     },
  { name: "Éloquence",          famille: "Société",  attributLie: "charisma"     },
  { name: "Étiquette",          famille: "Société",  attributLie: "intelligence" },
  { name: "Intendance",         famille: "Société",  attributLie: "intelligence" },
  { name: "Musique",            famille: "Société",  attributLie: "creativite"   },
  { name: "Négoce",             famille: "Société",  attributLie: "intelligence" },
  { name: "Peinture",           famille: "Société",  attributLie: "creativite"   },
  { name: "Poésie",             famille: "Société",  attributLie: "creativite"   },
  { name: "Savoir-faire",       famille: "Société",  attributLie: "intelligence" },
  { name: "Sculpture",          famille: "Société",  attributLie: "creativite"   },
  { name: "Us et Coutumes",     famille: "Société",   attributLie: "intelligence" },
  // OCCULTE
  { name: "Alchimie",           famille: "Occulte",   attributLie: "intelligence" },
  { name: "Arts Magiques",      famille: "Occulte",  attributLie: "creativite"   },
  { name: "Conn. des Danseurs", famille: "Occulte",  attributLie: "intelligence" },
  { name: "Cryptogramme",       famille: "Occulte",  attributLie: "intelligence" },
  { name: "Démonologie",        famille: "Occulte",  attributLie: "intelligence" },
  { name: "Élémentalisme",      famille: "Occulte",  attributLie: "intelligence" },
  { name: "Harmonie",           famille: "Occulte",  attributLie: "creativite"   },
  { name: "Résonance",          famille: "Occulte",  attributLie: "creativite"   },
];

// ── Saisons du Monde ────────────────────────────────────────────────────────
AGONE.saisons = {
  "": "—",
  printemps: "Printemps",
  ete:       "Été",
  automne:   "Automne",
  hiver:     "Hiver",
};

// ── Météo ────────────────────────────────────────────────────────────────────
AGONE.meteoTypes = [
  { id: "",           icon: "—",  label: "—"                    },
  { id: "ensoleille", icon: "☀️", label: "Ensoleillé"            },
  { id: "nuageux",    icon: "⛅", label: "Nuageux"               },
  { id: "pluie",      icon: "🌧️", label: "Pluie"                 },
  { id: "orage",      icon: "⛈️", label: "Orage"                 },
  { id: "brouillard", icon: "🌫️", label: "Brouillard"             },
  { id: "neige",      icon: "❄️", label: "Neige"                 },
  { id: "grele",      icon: "🌨️", label: "Grêle"                 },
  { id: "blizzard",   icon: "🌪️", label: "Blizzard"              },
  { id: "chaleur",    icon: "🔆", label: "Chaleur accablante"    },
  { id: "nuit",       icon: "🌙", label: "Nuit étoilée"           },
  { id: "automne",    icon: "🍂", label: "Vent d'automne"         },
  { id: "cendres",    icon: "🌋", label: "Pluie de cendres"       },
  { id: "brumechaleur",icon: "🌅",label: "Brume de chaleur"       },
];

// ── Phases de lune (cycle 28 jours) ─────────────────────────────────────────
AGONE.phasesLune = [
  { icon: "🌑", label: "Nouvelle lune"     },
  { icon: "🌒", label: "Premier croissant" },
  { icon: "🌓", label: "Premier quartier"  },
  { icon: "🌔", label: "Lune gibbeuse croissante" },
  { icon: "🌕", label: "Pleine lune"       },
  { icon: "🌖", label: "Lune gibbeuse décroissante" },
  { icon: "🌗", label: "Dernier quartier"  },
  { icon: "🌘", label: "Dernier croissant" },
];

// ── Calendrier d'Harmonde (10 mois x 30 jours) ──────────────────────────────
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

