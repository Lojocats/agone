/**
 * Configuration du système Agone
 */
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

// Stats raciales de base pour l'initialisation du compendium
// bonus = modificateur de départ, Min/Max = contraintes permanentes (m/M du tableau)
// taiBase = MODIFICATEUR de TAI (-2=très petit, 0=humain, +3=géant)
// mvBase = override MV si différent de la table taiToMv (ex: pixie volant)
AGONE.peuplesData = {
  // ── Peuples du tableau officiel ──────────────────────────────
  humain:    {
    taiBase: 0, pointsCreationComp: 120, corpsBonus: 0, espritBonus: 0, ameBonus: 0,
    agiliteBonus: 0,  agiliteMin: null, agiliteMax: null,
    forceBonus: 0,    forceMin: null,   forceMax: null,
    perceptionBonus: 0, perceptionMin: null, perceptionMax: null,
    resistanceBonus: 0, resistanceMin: null, resistanceMax: null,
    intelligenceBonus: 0, intelligenceMin: null, intelligenceMax: null,
    volonteBonus: 0,  volonteMin: null, volonteMax: null,
    charismaBonus: 0, charismaMin: null, charismaMax: null,
    creativiteBonus: 0, creativiteMin: null, creativiteMax: null,
  },
  nain:      {
    // RÉS +2m5, CRÉ +2
    taiBase: -1, pointsCreationComp: 100, corpsBonus: 0, espritBonus: 0, ameBonus: 0,
    agiliteBonus: 0,  agiliteMin: null, agiliteMax: null,
    forceBonus: 0,    forceMin: null,   forceMax: null,
    perceptionBonus: 0, perceptionMin: null, perceptionMax: null,
    resistanceBonus: 2, resistanceMin: 5, resistanceMax: null,
    intelligenceBonus: 0, intelligenceMin: null, intelligenceMax: null,
    volonteBonus: 0,  volonteMin: null, volonteMax: null,
    charismaBonus: 0, charismaMin: null, charismaMax: null,
    creativiteBonus: 2, creativiteMin: null, creativiteMax: null,
  },
  geant:     {
    // RÉS +7m7, FOR +8m8, AGI M3, INT -2, CHA -2
    taiBase: 3, pointsCreationComp: 100, corpsBonus: 0, espritBonus: 0, ameBonus: 0,
    agiliteBonus: 0,   agiliteMin: null, agiliteMax: 3,
    forceBonus: 8,     forceMin: 8,      forceMax: null,
    perceptionBonus: 0, perceptionMin: null, perceptionMax: null,
    resistanceBonus: 7, resistanceMin: 7, resistanceMax: null,
    intelligenceBonus: -2, intelligenceMin: null, intelligenceMax: null,
    volonteBonus: 0,   volonteMin: null, volonteMax: null,
    charismaBonus: -2, charismaMin: null, charismaMax: null,
    creativiteBonus: 0, creativiteMin: null, creativiteMax: null,
  },
  farfadet:  {
    // RÉS -2M8, FOR M5, AGI +2, PER +1, INT +1, CHA m5
    taiBase: -1, pointsCreationComp: 100, corpsBonus: 0, espritBonus: 0, ameBonus: 0,
    agiliteBonus: 2,   agiliteMin: null, agiliteMax: null,
    forceBonus: 0,     forceMin: null,   forceMax: 5,
    perceptionBonus: 1, perceptionMin: null, perceptionMax: null,
    resistanceBonus: -2, resistanceMin: null, resistanceMax: 8,
    intelligenceBonus: 1, intelligenceMin: null, intelligenceMax: null,
    volonteBonus: 0,   volonteMin: null, volonteMax: null,
    charismaBonus: 0,  charismaMin: 5,   charismaMax: null,
    creativiteBonus: 0, creativiteMin: null, creativiteMax: null,
  },
  lutin:     {
    // RÉS -2M7, FOR M4, AGI +1, PER +2, VOL +1, INT m5
    taiBase: -1, pointsCreationComp: 100, corpsBonus: 0, espritBonus: 0, ameBonus: 0,
    agiliteBonus: 1,   agiliteMin: null, agiliteMax: null,
    forceBonus: 0,     forceMin: null,   forceMax: 4,
    perceptionBonus: 2, perceptionMin: null, perceptionMax: null,
    resistanceBonus: -2, resistanceMin: null, resistanceMax: 7,
    intelligenceBonus: 0, intelligenceMin: 5, intelligenceMax: null,
    volonteBonus: 1,   volonteMin: null, volonteMax: null,
    charismaBonus: 0,  charismaMin: null, charismaMax: null,
    creativiteBonus: 0, creativiteMin: null, creativiteMax: null,
  },
  satyre:    {
    // RÉS +1, VOL +1, CHA +2m6
    taiBase: 0, pointsCreationComp: 100, corpsBonus: 0, espritBonus: 0, ameBonus: 0,
    agiliteBonus: 0,   agiliteMin: null, agiliteMax: null,
    forceBonus: 0,     forceMin: null,   forceMax: null,
    perceptionBonus: 0, perceptionMin: null, perceptionMax: null,
    resistanceBonus: 1, resistanceMin: null, resistanceMax: null,
    intelligenceBonus: 0, intelligenceMin: null, intelligenceMax: null,
    volonteBonus: 1,   volonteMin: null, volonteMax: null,
    charismaBonus: 2,  charismaMin: 6,   charismaMax: null,
    creativiteBonus: 0, creativiteMin: null, creativiteMax: null,
  },
  minotaure: {
    // RÉS +4m6, FOR +3m7, AGI M8, CHA -1, CRÉ -1
    taiBase: 1, pointsCreationComp: 100, corpsBonus: 0, espritBonus: 0, ameBonus: 0,
    agiliteBonus: 0,   agiliteMin: null, agiliteMax: 8,
    forceBonus: 3,     forceMin: 7,      forceMax: null,
    perceptionBonus: 0, perceptionMin: null, perceptionMax: null,
    resistanceBonus: 4, resistanceMin: 6, resistanceMax: null,
    intelligenceBonus: 0, intelligenceMin: null, intelligenceMax: null,
    volonteBonus: 0,   volonteMin: null, volonteMax: null,
    charismaBonus: -1, charismaMin: null, charismaMax: null,
    creativiteBonus: -1, creativiteMin: null, creativiteMax: null,
  },
  ogre:      {
    // RÉS +2m5, FOR +1m5
    taiBase: 0, pointsCreationComp: 100, corpsBonus: 0, espritBonus: 0, ameBonus: 0,
    agiliteBonus: 0,   agiliteMin: null, agiliteMax: null,
    forceBonus: 1,     forceMin: 5,      forceMax: null,
    perceptionBonus: 0, perceptionMin: null, perceptionMax: null,
    resistanceBonus: 2, resistanceMin: 5, resistanceMax: null,
    intelligenceBonus: 0, intelligenceMin: null, intelligenceMax: null,
    volonteBonus: 0,   volonteMin: null, volonteMax: null,
    charismaBonus: 0,  charismaMin: null, charismaMax: null,
    creativiteBonus: 0, creativiteMin: null, creativiteMax: null,
  },
  feeNoire:  {
    // RÉS M3, FOR M3, VOL +1, INT +2, CHA -2, CRÉ +3 (MV 1 à pied / 9 en vol)
    taiBase: -2, pointsCreationComp: 100, corpsBonus: 0, espritBonus: 0, ameBonus: 0,
    agiliteBonus: 0,   agiliteMin: null, agiliteMax: null,
    forceBonus: 0,     forceMin: null,   forceMax: 3,
    perceptionBonus: 0, perceptionMin: null, perceptionMax: null,
    resistanceBonus: 0, resistanceMin: null, resistanceMax: 3,
    intelligenceBonus: 2, intelligenceMin: null, intelligenceMax: null,
    volonteBonus: 1,   volonteMin: null, volonteMax: null,
    charismaBonus: -2, charismaMin: null, charismaMax: null,
    creativiteBonus: 3, creativiteMin: null, creativiteMax: null,
  },
  meduse:    {
    // AGI +1, INT +1m6, CHA +1m7, CRÉ +1
    taiBase: 0, pointsCreationComp: 100, corpsBonus: 0, espritBonus: 0, ameBonus: 0,
    agiliteBonus: 1,   agiliteMin: null, agiliteMax: null,
    forceBonus: 0,     forceMin: null,   forceMax: null,
    perceptionBonus: 0, perceptionMin: null, perceptionMax: null,
    resistanceBonus: 0, resistanceMin: null, resistanceMax: null,
    intelligenceBonus: 1, intelligenceMin: 6, intelligenceMax: null,
    volonteBonus: 0,   volonteMin: null, volonteMax: null,
    charismaBonus: 1,  charismaMin: 7,  charismaMax: null,
    creativiteBonus: 1, creativiteMin: null, creativiteMax: null,
  },
  // ── Peuples hors tableau (valeurs estimées) ──────────────────
  drakonien: {
    taiBase: 1, corpsBonus: 0, espritBonus: 0, ameBonus: 0,
    agiliteBonus: 0,   agiliteMin: null, agiliteMax: null,
    forceBonus: 1,     forceMin: null,   forceMax: null,
    perceptionBonus: 1, perceptionMin: null, perceptionMax: null,
    resistanceBonus: 2, resistanceMin: null, resistanceMax: null,
    intelligenceBonus: 1, intelligenceMin: null, intelligenceMax: null,
    volonteBonus: 0,   volonteMin: null, volonteMax: null,
    charismaBonus: -1, charismaMin: null, charismaMax: null,
    creativiteBonus: 0, creativiteMin: null, creativiteMax: null,
  },
  morgane:   {
    taiBase: 0, pointsCreationComp: 100, corpsBonus: 0, espritBonus: 0, ameBonus: 0,
    agiliteBonus: 0,   agiliteMin: null, agiliteMax: null,
    forceBonus: 0,     forceMin: null,   forceMax: null,
    perceptionBonus: 1, perceptionMin: null, perceptionMax: null,
    resistanceBonus: 0, resistanceMin: null, resistanceMax: null,
    intelligenceBonus: 2, intelligenceMin: null, intelligenceMax: null,
    volonteBonus: 1,  volonteMin: null, volonteMax: null,
    charismaBonus: 0, charismaMin: null, charismaMax: null,
    creativiteBonus: 1, creativiteMin: null, creativiteMax: null,
  },
  pixie:     {
    taiBase: -2, mvBase: 5, pointsCreationComp: 100, corpsBonus: 0, espritBonus: 0, ameBonus: 0,  // mvBase=5 : MV spécial (vol)
    agiliteBonus: 3,   agiliteMin: null, agiliteMax: null,
    forceBonus: -3,    forceMin: null,   forceMax: null,
    perceptionBonus: 2, perceptionMin: null, perceptionMax: null,
    resistanceBonus: -2, resistanceMin: null, resistanceMax: null,
    intelligenceBonus: 0, intelligenceMin: null, intelligenceMax: null,
    volonteBonus: 0,  volonteMin: null, volonteMax: null,
    charismaBonus: 1, charismaMin: null, charismaMax: null,
    creativiteBonus: 2, creativiteMin: null, creativiteMax: null,
  },
};

// Correspondance nom français (nom item compendium) → clé interne peuplesData
AGONE.peupleNomVersKey = {
  "Humain":    "humain",
  "Nain":      "nain",
  "Géant":     "geant",
  "Farfadet":  "farfadet",
  "Lutin":     "lutin",
  "Satyre":    "satyre",
  "Minotaure": "minotaure",
  "Ogre":      "ogre",
  "Fée Noire": "feeNoire",
  "Méduse":    "meduse",
  "Drakoënien": "drakonien",
  "Morgane":   "morgane",
  "Pixie":     "pixie",
};

// Compétences raciales de départ (score 5, offertes aux saïsonins à la création)
AGONE.peuplesData.humain.competencesRaciales    = [];
AGONE.peuplesData.nain.competencesRaciales      = [
  { nom: "Harmonie",           domaine: "Occulte",  specialite: "architecture ésotérique", attributLie: "creativite",   score: 5 },
  { nom: "Démonologie",        domaine: "Occulte",  specialite: "",                      attributLie: "intelligence", score: 5 },
  { nom: "Savoir-faire",       domaine: "Société", specialite: "forge",                 attributLie: "intelligence", score: 5 },
];
AGONE.peuplesData.geant.competencesRaciales     = [
  { nom: "Armes",              domaine: "Épreuve",  specialite: "lancer de rocher",      attributLie: "melee",        score: 5 },
  { nom: "Chasse",             domaine: "Maraude",  specialite: "",                      attributLie: "perception",   score: 5 },
  { nom: "Géographie",         domaine: "Savoir",   specialite: "",                      attributLie: "intelligence", score: 5 },
];
AGONE.peuplesData.farfadet.competencesRaciales  = [
  { nom: "Serrurerie",         domaine: "Maraude",  specialite: "",                      attributLie: "agilite",      score: 5 },
  { nom: "Passe-passe",        domaine: "Maraude",  specialite: "",                      attributLie: "agilite",      score: 5 },
  { nom: "Chasse",             domaine: "Maraude",  specialite: "Danseurs",              attributLie: "perception",   score: 5 },
];
AGONE.peuplesData.lutin.competencesRaciales     = [
  { nom: "Discrétion",         domaine: "Maraude",  specialite: "",                      attributLie: "agilite",      score: 5 },
  { nom: "Herboristerie",      domaine: "Savoir",   specialite: "",                      attributLie: "intelligence", score: 5 },
  { nom: "Astronomie",         domaine: "Savoir",   specialite: "",                      attributLie: "intelligence", score: 5 },
];
AGONE.peuplesData.satyre.competencesRaciales    = [
  { nom: "Musique",            domaine: "Société", specialite: "",                      attributLie: "charisma",     score: 5 },
  { nom: "Éloquence",          domaine: "Société", specialite: "",                      attributLie: "charisma",     score: 5 },
  { nom: "Armes",              domaine: "Épreuve",  specialite: "sabots",                attributLie: "melee",        score: 5 },
];
AGONE.peuplesData.minotaure.competencesRaciales = [
  { nom: "Vigilance",          domaine: "Épreuve",  specialite: "",                      attributLie: "perception",   score: 5 },
  { nom: "Démonologie",        domaine: "Occulte",  specialite: "",                      attributLie: "intelligence", score: 5 },
  { nom: "Armes",              domaine: "Épreuve",  specialite: "cornes",                attributLie: "melee",        score: 5 },
];
AGONE.peuplesData.ogre.competencesRaciales      = [
  { nom: "Chirurgie",          domaine: "Savoir",   specialite: "",                      attributLie: "intelligence", score: 5 },
  { nom: "Premiers soins",     domaine: "Épreuve",  specialite: "",                      attributLie: "intelligence", score: 5 },
  { nom: "Jeu",                domaine: "Maraude",  specialite: "",                      attributLie: "agilite",      score: 5 },
];
AGONE.peuplesData.feeNoire.competencesRaciales  = [
  { nom: "Harmonie",           domaine: "Occulte",  specialite: "",                      attributLie: "creativite",   score: 5 },
  { nom: "Sculpture",          domaine: "Société", specialite: "",                      attributLie: "creativite",   score: 5 },
  { nom: "Histoire & Légendes", domaine: "Savoir",   specialite: "",                      attributLie: "intelligence", score: 5 },
];
AGONE.peuplesData.meduse.competencesRaciales    = [
  { nom: "Éloquence",          domaine: "Société", specialite: "",                      attributLie: "charisma",     score: 5 },
  { nom: "Intendance",         domaine: "Société", specialite: "",                      attributLie: "intelligence", score: 5 },
  { nom: "Armes",              domaine: "Épreuve",  specialite: "serpents",              attributLie: "melee",        score: 5 },
];
AGONE.peuplesData.drakonien.competencesRaciales = [];
AGONE.peuplesData.morgane.competencesRaciales   = [];
AGONE.peuplesData.pixie.competencesRaciales     = [];

// Points de création de caractéristiques : humain = 80, saisonins = 70
AGONE.peuplesData.humain.pointsCreationCarac = 80;
for (const _k of Object.keys(AGONE.peuplesData)) {
  if (_k !== "humain") AGONE.peuplesData[_k].pointsCreationCarac = 70;
}

// Base de Points de Vie par race (BPdV — formule PdV max = BPdV + RES×3 + 1d10)
AGONE.peuplesData.humain.bpdv     = 25;
AGONE.peuplesData.nain.bpdv       = 20;
AGONE.peuplesData.geant.bpdv      = 100;
AGONE.peuplesData.farfadet.bpdv   = 20;
AGONE.peuplesData.lutin.bpdv      = 20;
AGONE.peuplesData.satyre.bpdv     = 25;
AGONE.peuplesData.minotaure.bpdv  = 45;
AGONE.peuplesData.ogre.bpdv       = 25;
AGONE.peuplesData.feeNoire.bpdv   = 10;
AGONE.peuplesData.meduse.bpdv     = 25;
AGONE.peuplesData.drakonien.bpdv  = 45;
AGONE.peuplesData.morgane.bpdv    = 25;
AGONE.peuplesData.pixie.bpdv      = 10;

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

// Liste des compétences
AGONE.competences = [
  "Acrobatie (Maraude)",
  "Alchimie (Occulte)",
  "Alphabets (Savoir)",
  "Armes (Épreuve)",
  "Arts Magiques (Occulte)",
  "Astronomie (Savoir)",
  "Athlétisme (Épreuve)",
  "Baratin (Société)",
  "Camouflage (Maraude)",
  "Chasse (Maraude)",
  "Chirurgie (Savoir)",
  "Conn. des Danseurs (Occulte)",
  "Cryptogramme (Occulte)",
  "Cultes (Savoir)",
  "Déguisement (Maraude)",
  "Démonologie (Occulte)",
  "Diplomatie (Société)",
  "Discrétion (Maraude)",
  "Élémentalisme (Occulte)",
  "Éloquence (Société)",
  "Équitation (Épreuve)",
  "Escalade (Épreuve)",
  "Esquive (Épreuve)",
  "Étiquette (Société)",
  "Fouille (Maraude)",
  "Géographie (Savoir)",
  "Harmonie (Occulte)",
  "Herboristerie (Savoir)",
  "Histoire & Légendes (Savoir)",
  "Intendance (Société)",
  "Intrigue (Maraude)",
  "Jeu (Maraude)",
  "Langues (Savoir)",
  "Lois (Savoir)",
  "Médecine (Savoir)",
  "Musique (Société)",
  "Natation (Épreuve)",
  "Navigation (Savoir)",
  "Négoce (Société)",
  "Passe-passe (Maraude)",
  "Peinture (Société)",
  "Poésie (Société)",
  "Poisons (Maraude)",
  "Premiers soins (Épreuve)",
  "Résonance (Occulte)",
  "Saisons (Savoir)",
  "Savoir-faire (Société)",
  "Sculpture (Société)",
  "Serrurerie (Maraude)",
  "Stratégie (Savoir)",
  "Survie (Épreuve)",
  "Vigilance (Épreuve)",
  "Us et Coutumes (Société)",
  "Zoologie (Savoir)"
];
