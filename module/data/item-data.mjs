/**
 * Data Models pour les Items du système Agone
 */

const fields = foundry.data.fields;

// ================================
// Compétence
// ================================
export class CompetenceData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      nom:        new fields.StringField({ initial: "Armes" }),
      domaine:    new fields.StringField({ initial: "" }),
      specialite: new fields.StringField({ initial: "" }),
      score:      new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      exp:        new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      // Attribut lié pour le calcul du jet
      attributLie: new fields.StringField({
        initial: "agilite",
        choices: ["agilite","force","perception","resistance","intelligence","volonte","charisma","creativite","melee","tir"]
      }),
      notes: new fields.StringField({ initial: "" })
    };
  }
}

// ================================
// Arme
// ================================
export class ArmeData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      tai:         new fields.NumberField({ initial: 0, integer: true }),
      initBonus:   new fields.NumberField({ initial: 0, integer: true }),
      attackBonus: new fields.NumberField({ initial: 0, integer: true }),
      defenseBonus:new fields.NumberField({ initial: 0, integer: true }),
      dommages:    new fields.NumberField({ initial: 1, integer: true, min: 0 }),
      type:        new fields.StringField({ initial: "P", choices: ["P","T","PT","C","TC","PC"] }),
      style:       new fields.StringField({ initial: "melee", choices: ["melee","jet","trait","bouclier"] }),
      portee:      new fields.StringField({ initial: "" }),
      reqFor:      new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      reqAgi:      new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      competence:  new fields.StringField({ initial: "" }), // domaine de la compétence liée (ex: Mêlée, Tir, Jet)
      description: new fields.StringField({ initial: "" }),
      poids:       new fields.NumberField({ initial: 0, min: 0 }),
      // Champs complémentaires (boucliers et état d'équipement)
      equipe:      new fields.BooleanField({ initial: false }),
      protection:  new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      malusAgi:    new fields.NumberField({ initial: 0, integer: true, min: 0 })
    };
  }
}

// ================================
// Armure
// ================================
export class ArmureData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      type:       new fields.StringField({ initial: "0", choices: ["0","1","2"] }),
      protection: new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      malusAgi:   new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      malusPer:   new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      portee:     new fields.BooleanField({ initial: false }),
      description:new fields.StringField({ initial: "" }),
      poids:      new fields.NumberField({ initial: 0, min: 0 })
    };
  }

  prepareDerivedData() {
    if (this.type === "1") {
      this.malusPer = Math.floor(this.malusAgi / 2);
    } else if (this.type === "2") {
      this.malusPer = this.malusAgi;
    } else {
      this.malusPer = 0;
    }
  }
}

// ================================
// Don / Avantage / Défaut
// ================================
export class DonData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      categorie:   new fields.StringField({ initial: "avantage", choices: ["avantage","defaut"] }),
      typeCharge:  new fields.StringField({ initial: "" }),   // thème : charge | ame | corps | esprit | societe | emprise | arts | saisons | flamme
      cout:        new fields.NumberField({ initial: 0, integer: true }),
      description: new fields.HTMLField({ initial: "" })
    };
  }
}

// ================================
// Sort / Magie
// ================================
export class SortData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      typeMagie:   new fields.StringField({ initial: "" }),
      seuil:       new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      portee:      new fields.StringField({ initial: "" }),
      duree:       new fields.StringField({ initial: "" }),
      // Temps de lancer : "Danse" pour jorniste/obscurantiste/eclipsiste,
      // "Mesure" pour accord, "Modelage" pour cyse, "Dessin" pour decorum, "Verbe" pour geste
      danse:       new fields.StringField({ initial: "" }),
      // Sous-type : instrument (harpe/flute/viole/tambour/cistre) ou saison (printemps/ete/automne/hiver)
      instrument:  new fields.StringField({ initial: "" }),
      special:     new fields.StringField({ initial: "" }),
      description: new fields.HTMLField({ initial: "" }),
      danseurNom:  new fields.StringField({ initial: "" }),
      // Compétence alternative pour min(artsMagiques, compAlt + attrAlt)
      compAlt:     new fields.StringField({ initial: "" }),
      attrAlt:     new fields.StringField({ initial: "charisma",
        choices: ["agilite","force","perception","resistance","intelligence","volonte","charisma","creativite"] }),
    };
  }
}

// ================================
// Danseur
// ================================
// Table officielle Agone : investissement (1-7 pts) → valeur stat
export const DANSEUR_TABLE = {
  memoire:   [12, 14, 16, 18, 24, 30, 40],
  emprise:   [ 0,  1,  2,  3,  4,  5,  6],
  empathie:  [ 2,  3,  4,  5,  6,  7,  8],
  endurance: [ 1,  2,  3,  4,  5,  6,  7],
};

export class DanseurData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description:       new fields.HTMLField({ initial: "" }),
      experience:        new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      modeCreation:      new fields.BooleanField({ initial: true }),
      ptsCreationMax:    new fields.NumberField({ initial: 17, integer: true, min: 0 }),
      // Niveaux de création (1-7) → valeurs dérivées via table officielle
      memoireNiveau:     new fields.NumberField({ initial: 1, integer: true, min: 1, max: 7 }),
      empriseNiveau:     new fields.NumberField({ initial: 1, integer: true, min: 1, max: 7 }),
      empathieNiveau:    new fields.NumberField({ initial: 1, integer: true, min: 1, max: 7 }),
      enduranceNiveau:   new fields.NumberField({ initial: 1, integer: true, min: 1, max: 7 }),
      saison:            new fields.StringField({ initial: "" }),
      // Valeurs courantes (état actuel)
      memoireActuelle:   new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      enduranceActuelle: new fields.NumberField({ initial: 0, integer: true, min: 0 }),
    };
  }

  prepareDerivedData() {
    const niv = n => Math.max(0, Math.min(6, (n ?? 1) - 1));
    this.memoireMax   = DANSEUR_TABLE.memoire[niv(this.memoireNiveau)];
    this.bonusEmprise = DANSEUR_TABLE.emprise[niv(this.empriseNiveau)];
    this.empathie     = DANSEUR_TABLE.empathie[niv(this.empathieNiveau)];
    this.enduranceMax = DANSEUR_TABLE.endurance[niv(this.enduranceNiveau)];
    this.ptsCreationDepense  = (this.memoireNiveau ?? 1) + (this.empriseNiveau ?? 1)
                             + (this.empathieNiveau ?? 1) + (this.enduranceNiveau ?? 1);
    this.ptsCreationRestants = (this.ptsCreationMax ?? 17) - this.ptsCreationDepense;
  }
}

// ================================
// Equipement
// ================================
export class EquipementData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      quantite:    new fields.NumberField({ initial: 1, integer: true, min: 0 }),
      poidsUnit:   new fields.NumberField({ initial: 0, min: 0 }),
      description: new fields.StringField({ initial: "" })
    };
  }

  prepareDerivedData() {
    this.poidsTotal = this.quantite * this.poidsUnit;
  }
}

// ================================
// Pouvoir de Flamme / Saisonin
// ================================
export class PouvoirData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      categorie:   new fields.StringField({ initial: "flamme", choices: ["flamme","saisonin"] }),
      description: new fields.HTMLField({ initial: "" })
    };
  }
}

// ================================
// Manœuvre / Botte
// ================================
export class ManoeuvreData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      categorie:   new fields.StringField({ initial: "manoeuvre", choices: ["manoeuvre","botte"] }),
      // Modificateurs structurés (null = valeur variable, e.g. +X ou +MR)
      ini:         new fields.NumberField({ initial: 0, integer: true, nullable: true }),
      att:         new fields.NumberField({ initial: 0, integer: true, nullable: true }),
      def:         new fields.NumberField({ initial: 0, integer: true, nullable: true }),
      dom:         new fields.StringField({ initial: "0" }),
      condition:   new fields.StringField({ initial: "" }),
      description: new fields.HTMLField({ initial: "" })
    };
  }
}

// ================================
// Démon (item embarqué dans un personnage)
// ================================
export class DemonItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description:         new fields.HTMLField({ initial: "" }),
      origine:             new fields.StringField({ initial: "" }),
      modeCreation:        new fields.BooleanField({ initial: true }),
      opacite:             new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      densite: new fields.SchemaField({
        valeur: new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        max:    new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      }),
      dif:                 new fields.NumberField({ initial: 0, integer: true }),
      aptitudeConjuration: new fields.NumberField({ initial: 0, integer: true }),
      empathie:            new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      endurance: new fields.SchemaField({
        valeur: new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        max:    new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      }),
      memoire: new fields.SchemaField({
        valeur: new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        max:    new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      }),
      connivances: new fields.HTMLField({ initial: "" }),
      notes:       new fields.HTMLField({ initial: "" }),
    };
  }
}

// ================================
// Peine de Perfidie
// ================================
export class PeineData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      // Contexte d'acquisition (règle p.xx)
      categorie: new fields.StringField({
        initial: "autre",
        choices: ["creature_masque", "lieu_perfidie", "autre"]
      }),
      // Aspect corrompu : "corps" | "ame" | "" (Sang venimeux = aucun)
      noirEffect: new fields.StringField({ initial: "corps" }),
      // Nom du Bienfait lié (vide si aucun)
      bienfait: new fields.StringField({ initial: "" }),
      // Le personnage a-t-il payé le Bienfait (+1 Perfidie) ?
      bienfaitAcquis: new fields.BooleanField({ initial: false }),
      description: new fields.HTMLField({ initial: "" }),
    };
  }
}

// ================================
// Peuple / Espèce
// ================================
export class PeupleData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description:      new fields.HTMLField({ initial: "" }),
      taiBase:              new fields.NumberField({ initial: 0, integer: true }),
      mvBase:               new fields.NumberField({ initial: null, nullable: true, integer: true }),
      mvVolBase:            new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      pointsCreationComp:   new fields.NumberField({ initial: 120, integer: true }),
      competencesRaciales:  new fields.ArrayField(new fields.SchemaField({
        nom:         new fields.StringField({ initial: "" }),
        domaine:     new fields.StringField({ initial: "" }),
        specialite:  new fields.StringField({ initial: "" }),
        attributLie: new fields.StringField({ initial: "agilite" }),
        score:       new fields.NumberField({ initial: 5, integer: true }),
      })),
      // Bonus d'aspects
      corpsBonus:       new fields.NumberField({ initial: 0, integer: true }),
      espritBonus:      new fields.NumberField({ initial: 0, integer: true }),
      ameBonus:         new fields.NumberField({ initial: 0, integer: true }),
      // Bonus/min/max d'attributs (m = minimum autorisé, M = maximum autorisé)
      agiliteBonus:      new fields.NumberField({ initial: 0,    integer: true }),
      agiliteMin:        new fields.NumberField({ initial: null, nullable: true, integer: true }),
      agiliteMax:        new fields.NumberField({ initial: null, nullable: true, integer: true }),
      forceBonus:        new fields.NumberField({ initial: 0,    integer: true }),
      forceMin:          new fields.NumberField({ initial: null, nullable: true, integer: true }),
      forceMax:          new fields.NumberField({ initial: null, nullable: true, integer: true }),
      perceptionBonus:   new fields.NumberField({ initial: 0,    integer: true }),
      perceptionMin:     new fields.NumberField({ initial: null, nullable: true, integer: true }),
      perceptionMax:     new fields.NumberField({ initial: null, nullable: true, integer: true }),
      resistanceBonus:   new fields.NumberField({ initial: 0,    integer: true }),
      resistanceMin:     new fields.NumberField({ initial: null, nullable: true, integer: true }),
      resistanceMax:     new fields.NumberField({ initial: null, nullable: true, integer: true }),
      intelligenceBonus: new fields.NumberField({ initial: 0,    integer: true }),
      intelligenceMin:   new fields.NumberField({ initial: null, nullable: true, integer: true }),
      intelligenceMax:   new fields.NumberField({ initial: null, nullable: true, integer: true }),
      volonteBonus:      new fields.NumberField({ initial: 0,    integer: true }),
      volonteMin:        new fields.NumberField({ initial: null, nullable: true, integer: true }),
      volonteMax:        new fields.NumberField({ initial: null, nullable: true, integer: true }),
      charismaBonus:     new fields.NumberField({ initial: 0,    integer: true }),
      charismaMin:       new fields.NumberField({ initial: null, nullable: true, integer: true }),
      charismaMax:       new fields.NumberField({ initial: null, nullable: true, integer: true }),
      creativiteBonus:   new fields.NumberField({ initial: 0,    integer: true }),
      creativiteMin:     new fields.NumberField({ initial: null, nullable: true, integer: true }),
      creativiteMax:     new fields.NumberField({ initial: null, nullable: true, integer: true }),
      saisonDefaut:     new fields.StringField({ initial: "" }),
    };
  }
}
