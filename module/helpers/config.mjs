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
