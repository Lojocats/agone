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
      type:        new fields.StringField({ initial: "P", choices: ["P","T","PT","C"] }),
      style:       new fields.StringField({ initial: "melee", choices: ["melee","jet","trait"] }),
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
      temps:       new fields.StringField({ initial: "" }),
      initiative:  new fields.NumberField({ initial: 10, integer: true }), // Init = Init + 10
      description: new fields.HTMLField({ initial: "" })
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
