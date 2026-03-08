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
      nom:        new fields.StringField({ initial: "Armes (Épreuve)" }),
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
      style:       new fields.StringField({ initial: "melee", choices: ["melee","jet","trait"] }),
      portee:      new fields.StringField({ initial: "" }),
      reqFor:      new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      reqAgi:      new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      competence:  new fields.StringField({ initial: "" }), // nom de la compétence liée
      description: new fields.StringField({ initial: "" }),
      poids:       new fields.NumberField({ initial: 0, min: 0 })
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
    };
  }
}

// ================================
// Danseur
// ================================
export class DanseurData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description:       new fields.HTMLField({ initial: "" }),
      experience:        new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      memoireActuelle:   new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      memoireMax:        new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      bonusEmprise:      new fields.NumberField({ initial: 0, integer: true }),
      empathie:          new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      enduranceActuelle: new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      enduranceMax:      new fields.NumberField({ initial: 0, integer: true, min: 0 }),
    };
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
      score:       new fields.NumberField({ initial: 0, integer: true }),
      malus:       new fields.NumberField({ initial: 0, integer: true }),
      description: new fields.HTMLField({ initial: "" })
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
    };
  }
}
