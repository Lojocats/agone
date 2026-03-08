/**
 * Data Models pour les Acteurs du système Agone
 * Utilise TypeDataModel (FoundryVTT v12+)
 */

const fields = foundry.data.fields;

// ================================
// Personnage (Joueur)
// ================================
export class PersonnageData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      // Infos générales
      origine:     new fields.StringField({ initial: "" }),
      occupation:  new fields.StringField({ initial: "" }),
      sexe:        new fields.StringField({ initial: "" }),
      age:         new fields.StringField({ initial: "" }),
      taille:      new fields.StringField({ initial: "" }),
      tai:         new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      masse:       new fields.StringField({ initial: "" }),
      peuple:      new fields.StringField({ initial: "humain" }),
      parrain:     new fields.StringField({ initial: "" }),
      mv:          new fields.NumberField({ initial: 3, integer: true, min: 0 }),
      description: new fields.HTMLField({ initial: "" }),

      // Expérience
      experience: new fields.SchemaField({
        courante: new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        totale:   new fields.NumberField({ initial: 0, integer: true, min: 0 })
      }),

      // Points de Vie
      pdv: new fields.SchemaField({
        valeur: new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        max:    new fields.NumberField({ initial: 0, integer: true, min: 0 })
      }),

      // Points d'Héroïsme
      ph: new fields.SchemaField({
        valeur: new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        max:    new fields.NumberField({ initial: 0, integer: true, min: 0 })
      }),

      // Aspects
      corps: new fields.SchemaField({
        score: new fields.NumberField({ initial: 1, integer: true, min: 0 }),
        exp:   new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        noir:  new fields.NumberField({ initial: 0, integer: true, min: 0 })
      }),
      esprit: new fields.SchemaField({
        score: new fields.NumberField({ initial: 1, integer: true, min: 0 }),
        exp:   new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        noir:  new fields.NumberField({ initial: 0, integer: true, min: 0 })
      }),
      ame: new fields.SchemaField({
        score: new fields.NumberField({ initial: 1, integer: true, min: 0 }),
        exp:   new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        noir:  new fields.NumberField({ initial: 0, integer: true, min: 0 })
      }),

      // Caractéristiques primaires
      agilite:      new fields.SchemaField({
        score: new fields.NumberField({ initial: 1, integer: true, min: 0 }),
        exp:   new fields.NumberField({ initial: 0, integer: true, min: 0 })
      }),
      force:        new fields.SchemaField({
        score: new fields.NumberField({ initial: 1, integer: true, min: 0 }),
        exp:   new fields.NumberField({ initial: 0, integer: true, min: 0 })
      }),
      perception:   new fields.SchemaField({
        score: new fields.NumberField({ initial: 1, integer: true, min: 0 }),
        exp:   new fields.NumberField({ initial: 0, integer: true, min: 0 })
      }),
      resistance:   new fields.SchemaField({
        score: new fields.NumberField({ initial: 1, integer: true, min: 0 }),
        exp:   new fields.NumberField({ initial: 0, integer: true, min: 0 })
      }),
      intelligence: new fields.SchemaField({
        score: new fields.NumberField({ initial: 1, integer: true, min: 0 }),
        exp:   new fields.NumberField({ initial: 0, integer: true, min: 0 })
      }),
      volonte:      new fields.SchemaField({
        score: new fields.NumberField({ initial: 1, integer: true, min: 0 }),
        exp:   new fields.NumberField({ initial: 0, integer: true, min: 0 })
      }),
      charisma:     new fields.SchemaField({
        score: new fields.NumberField({ initial: 1, integer: true, min: 0 }),
        exp:   new fields.NumberField({ initial: 0, integer: true, min: 0 })
      }),
      creativite:   new fields.SchemaField({
        score: new fields.NumberField({ initial: 1, integer: true, min: 0 }),
        exp:   new fields.NumberField({ initial: 0, integer: true, min: 0 })
      }),

      // Secondaires manuels
      bd:      new fields.NumberField({ initial: 0, integer: true }),
      emprise: new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      chargeMax: new fields.NumberField({ initial: 0, integer: true, min: 0 }),

      // Armure portée
      armure: new fields.SchemaField({
        nom:       new fields.StringField({ initial: "" }),
        type:      new fields.StringField({ initial: "0" }),
        portee:    new fields.BooleanField({ initial: false }),
        protection: new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        malusAgi:  new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        malusPer:  new fields.NumberField({ initial: 0, integer: true, min: 0 })
      }),

      // État de combat
      blessuresGraves: new fields.NumberField({ initial: 0, integer: true, min: 0, max: 3 }),

      // Ténèbres & Perfidie
      tenebres: new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      perfidie: new fields.NumberField({ initial: 0, integer: true, min: 0 }),

      // Peines (Ténèbres)
      peines: new fields.SchemaField({
        diablotin:             new fields.BooleanField({ initial: false }),
        cauchemars:            new fields.BooleanField({ initial: false }),
        demonFacetieux:        new fields.BooleanField({ initial: false }),
        somnambule:            new fields.BooleanField({ initial: false }),
        insomniaque:           new fields.BooleanField({ initial: false }),
        mepris:                new fields.BooleanField({ initial: false }),
        devianceSexuelle:      new fields.BooleanField({ initial: false }),
        scarificationsLunaires:new fields.BooleanField({ initial: false }),
        jumeauDemoniaque:      new fields.BooleanField({ initial: false }),
        obsessionOmbre:        new fields.BooleanField({ initial: false }),
        presenceOppressante:   new fields.BooleanField({ initial: false }),
        alterationSens:        new fields.BooleanField({ initial: false }),
        sangNoir:              new fields.BooleanField({ initial: false }),
        apparenceDemoniaque:   new fields.BooleanField({ initial: false }),
        siamoisTenebres:       new fields.BooleanField({ initial: false }),
        malediction:           new fields.BooleanField({ initial: false }),
        ombreVivante:          new fields.BooleanField({ initial: false }),
        marqueHautsDiables:    new fields.BooleanField({ initial: false }),
        portailInterieur:      new fields.BooleanField({ initial: false }),
        ombrePerfidie:         new fields.BooleanField({ initial: false }),
        dechu:                 new fields.BooleanField({ initial: false })
      }),

      // Monnaie
      monnaie: new fields.SchemaField({
        aiglon:   new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        sastre:   new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        pistole:  new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        dirhem:   new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        perle:    new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        cristal:  new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        pieceOr:  new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        sou:      new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        bribe:    new fields.NumberField({ initial: 0, integer: true, min: 0 })
      })
    };
  }

  prepareDerivedData() {
    // Bonus d'aspects
    this.bonusCorps  = Math.max(0, this.corps.score - this.corps.noir);
    this.bonusEsprit = Math.max(0, this.esprit.score - this.esprit.noir);
    this.bonusAme    = Math.max(0, this.ame.score - this.ame.noir);

    // Flamme
    this.flamme      = this.corps.score + this.esprit.score + this.ame.score;
    this.flammeNoire = this.corps.noir + this.esprit.noir + this.ame.noir;

    // PH max = Flamme × 2 (si non défini manuellement)
    if (this.ph.max === 0) this.ph.max = this.flamme * 2;

    // Caractéristiques secondaires
    this.melee = Math.round((this.force.score + this.agilite.score * 2) / 3);
    this.tir   = Math.round((this.perception.score + this.agilite.score) / 2);
    this.art   = Math.round((this.charisma.score + this.creativite.score) / 2);

    // Initiative de base (sans arme)
    this.initiative     = this.agilite.score + this.perception.score + this.bonusCorps;
    this.defenseNaturelle = this.agilite.score + this.bonusCorps;

    // Seuils PdV
    this.seuilBlessureGrave    = Math.max(1, Math.floor(this.pdv.max / 3));
    this.seuilBlessureCritique = Math.max(1, Math.floor(this.pdv.max / 2));

    // Charges
    this.demiCharge     = Math.floor(this.chargeMax / 2);
    this.chargeJour     = Math.floor(this.chargeMax / 4);

    // Noirceur
    this.noirceur = Math.floor(this.tenebres / 10);

    // Malus Blessures Graves
    const malusTable = [0, -1, -3, -6];
    this.malusBlessureGrave = malusTable[Math.min(this.blessuresGraves, 3)];

    // Malus armure selon type (Partielle: malusPer = malusAgi/2, Complète: malusPer = malusAgi)
    if (this.armure.portee) {
      if (this.armure.type === "1") {
        this.armure.malusPer = Math.floor(this.armure.malusAgi / 2);
      } else if (this.armure.type === "2") {
        this.armure.malusPer = this.armure.malusAgi;
      } else {
        this.armure.malusPer = 0;
      }
    } else {
      this.armure.malusPer = 0;
      this.armure._malusAgiActif = 0;
    }
    this.armure._malusAgiActif = this.armure.portee ? this.armure.malusAgi : 0;
    this.armure._malusPerActif  = this.armure.portee ? this.armure.malusPer : 0;
  }
}

// ================================
// Compagnon / Monture
// ================================
export class CompagnonData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new fields.HTMLField({ initial: "" }),
      espece:  new fields.StringField({ initial: "" }),
      mv:      new fields.NumberField({ initial: 3, integer: true, min: 0 }),
      mvVol:   new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      tai:     new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      pdv: new fields.SchemaField({
        valeur: new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        max:    new fields.NumberField({ initial: 0, integer: true, min: 0 })
      }),
      agilite:     new fields.NumberField({ initial: 1, integer: true, min: 0 }),
      force:       new fields.NumberField({ initial: 1, integer: true, min: 0 }),
      perception:  new fields.NumberField({ initial: 1, integer: true, min: 0 }),
      resistance:  new fields.NumberField({ initial: 1, integer: true, min: 0 }),
      chargeMax:   new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      blessuresGraves: new fields.NumberField({ initial: 0, integer: true, min: 0, max: 3 }),
      notes: new fields.HTMLField({ initial: "" })
    };
  }

  prepareDerivedData() {
    this.initiative = this.agilite + this.perception;
    this.melee = Math.round((this.force + this.agilite * 2) / 3);
    this.demiCharge = Math.floor(this.chargeMax / 2);
    const malusTable = [0, -1, -3, -6];
    this.malusBlessureGrave = malusTable[Math.min(this.blessuresGraves, 3)];
  }
}

// ================================
// Démon
// ================================
export class DemonData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description:  new fields.HTMLField({ initial: "" }),
      origine:      new fields.StringField({ initial: "" }),
      opacite:      new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      densite: new fields.SchemaField({
        valeur: new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        max:    new fields.NumberField({ initial: 0, integer: true, min: 0 })
      }),
      dif:          new fields.NumberField({ initial: 0, integer: true }),
      aptitudeConjuration: new fields.NumberField({ initial: 0, integer: true }),
      empathie:     new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      endurance: new fields.SchemaField({
        valeur: new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        max:    new fields.NumberField({ initial: 0, integer: true, min: 0 })
      }),
      memoire: new fields.SchemaField({
        valeur: new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        max:    new fields.NumberField({ initial: 0, integer: true, min: 0 })
      }),
      connivances:  new fields.HTMLField({ initial: "" }),
      notes:        new fields.HTMLField({ initial: "" })
    };
  }
}

// ================================
// PNJ
// ================================
export class PnjData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new fields.HTMLField({ initial: "" }),
      race:        new fields.StringField({ initial: "" }),
      mv:          new fields.NumberField({ initial: 3, integer: true, min: 0 }),
      tai:         new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      pdv: new fields.SchemaField({
        valeur: new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        max:    new fields.NumberField({ initial: 0, integer: true, min: 0 })
      }),
      agilite:     new fields.NumberField({ initial: 1, integer: true, min: 0 }),
      force:       new fields.NumberField({ initial: 1, integer: true, min: 0 }),
      perception:  new fields.NumberField({ initial: 1, integer: true, min: 0 }),
      resistance:  new fields.NumberField({ initial: 1, integer: true, min: 0 }),
      intelligence:new fields.NumberField({ initial: 1, integer: true, min: 0 }),
      volonte:     new fields.NumberField({ initial: 1, integer: true, min: 0 }),
      charisma:    new fields.NumberField({ initial: 1, integer: true, min: 0 }),
      creativite:  new fields.NumberField({ initial: 1, integer: true, min: 0 }),
      bd:          new fields.NumberField({ initial: 0, integer: true }),
      blessuresGraves: new fields.NumberField({ initial: 0, integer: true, min: 0, max: 3 }),
      armure: new fields.SchemaField({
        protection: new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        malusAgi:   new fields.NumberField({ initial: 0, integer: true, min: 0 })
      }),
      competences:  new fields.HTMLField({ initial: "" }),
      notes:        new fields.HTMLField({ initial: "" }),
      equipement:   new fields.StringField({ initial: "" })
    };
  }

  prepareDerivedData() {
    this.melee      = Math.round((this.force + this.agilite * 2) / 3);
    this.tir        = Math.round((this.perception + this.agilite) / 2);
    this.initiative = this.agilite + this.perception;
    const malusTable = [0, -1, -3, -6];
    this.malusBlessureGrave = malusTable[Math.min(this.blessuresGraves, 3)];
  }
}
