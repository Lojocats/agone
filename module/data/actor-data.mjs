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
      tai:         new fields.NumberField({ initial: 0, integer: true }),
      masse:       new fields.StringField({ initial: "" }),
      peuple:      new fields.StringField({ initial: "Humain" }),
      peupleId:    new fields.StringField({ initial: "" }),
      parrain:     new fields.StringField({ initial: "" }),
      mv:          new fields.NumberField({ initial: 3, integer: true, min: 0 }),
      mvOverride:  new fields.NumberField({ initial: null, nullable: true, integer: true }),
      mvVol:       new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      peupleCompetenceIds: new fields.ArrayField(new fields.StringField({ initial: "" })),
      description: new fields.HTMLField({ initial: "" }),

      // Bonus raciaux appliqués (positifs à la création, + négatifs après validation)
      peupleBonusApplique: new fields.SchemaField({
        corpsBonus:       new fields.NumberField({ initial: 0, integer: true }),
        espritBonus:      new fields.NumberField({ initial: 0, integer: true }),
        ameBonus:         new fields.NumberField({ initial: 0, integer: true }),
        agiliteBonus:     new fields.NumberField({ initial: 0, integer: true }),
        forceBonus:       new fields.NumberField({ initial: 0, integer: true }),
        perceptionBonus:  new fields.NumberField({ initial: 0, integer: true }),
        resistanceBonus:  new fields.NumberField({ initial: 0, integer: true }),
        intelligenceBonus:new fields.NumberField({ initial: 0, integer: true }),
        volonteBonus:     new fields.NumberField({ initial: 0, integer: true }),
        charismaBonus:    new fields.NumberField({ initial: 0, integer: true }),
        creativiteBonus:  new fields.NumberField({ initial: 0, integer: true }),
      }),

      // Malus raciaux en attente (appliqués seulement à la fin de la création)
      peupleMalusEnAttente: new fields.SchemaField({
        corpsBonus:       new fields.NumberField({ initial: 0, integer: true }),
        espritBonus:      new fields.NumberField({ initial: 0, integer: true }),
        ameBonus:         new fields.NumberField({ initial: 0, integer: true }),
        agiliteBonus:     new fields.NumberField({ initial: 0, integer: true }),
        forceBonus:       new fields.NumberField({ initial: 0, integer: true }),
        perceptionBonus:  new fields.NumberField({ initial: 0, integer: true }),
        resistanceBonus:  new fields.NumberField({ initial: 0, integer: true }),
        intelligenceBonus:new fields.NumberField({ initial: 0, integer: true }),
        volonteBonus:     new fields.NumberField({ initial: 0, integer: true }),
        charismaBonus:    new fields.NumberField({ initial: 0, integer: true }),
        creativiteBonus:  new fields.NumberField({ initial: 0, integer: true }),
      }),

      // Expérience
      experience: new fields.SchemaField({
        courante: new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        totale:   new fields.NumberField({ initial: 0, integer: true, min: 0 })
      }),

      // Mode création du personnage
      modeCreation: new fields.BooleanField({ initial: true }),
      // Mode montée de niveau visible (toggle UI)
      modeLevelUp:  new fields.BooleanField({ initial: false }),

      // Points de Vie
      pdv: new fields.SchemaField({
        valeur:  new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        max:     new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        bonusDe: new fields.NumberField({ initial: 0, integer: true, min: 0 })
      }),

      // Points d'Héroïsme
      ph: new fields.SchemaField({
        valeur: new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        max:    new fields.NumberField({ initial: 0, integer: true, min: 0 })
      }),

      // Aspects
      corps: new fields.SchemaField({
        score: new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        exp:   new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        noir:  new fields.NumberField({ initial: 0, integer: true, min: 0 })
      }),
      esprit: new fields.SchemaField({
        score: new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        exp:   new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        noir:  new fields.NumberField({ initial: 0, integer: true, min: 0 })
      }),
      ame: new fields.SchemaField({
        score: new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        exp:   new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        noir:  new fields.NumberField({ initial: 0, integer: true, min: 0 })
      }),

      // Caractéristiques primaires
      agilite:      new fields.SchemaField({
        score:   new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        exp:     new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        raceMin: new fields.NumberField({ initial: null, nullable: true, integer: true }),
        raceMax: new fields.NumberField({ initial: null, nullable: true, integer: true }),
      }),
      force:        new fields.SchemaField({
        score:   new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        exp:     new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        raceMin: new fields.NumberField({ initial: null, nullable: true, integer: true }),
        raceMax: new fields.NumberField({ initial: null, nullable: true, integer: true }),
      }),
      perception:   new fields.SchemaField({
        score:   new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        exp:     new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        raceMin: new fields.NumberField({ initial: null, nullable: true, integer: true }),
        raceMax: new fields.NumberField({ initial: null, nullable: true, integer: true }),
      }),
      resistance:   new fields.SchemaField({
        score:   new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        exp:     new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        raceMin: new fields.NumberField({ initial: null, nullable: true, integer: true }),
        raceMax: new fields.NumberField({ initial: null, nullable: true, integer: true }),
      }),
      intelligence: new fields.SchemaField({
        score:   new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        exp:     new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        raceMin: new fields.NumberField({ initial: null, nullable: true, integer: true }),
        raceMax: new fields.NumberField({ initial: null, nullable: true, integer: true }),
      }),
      volonte:      new fields.SchemaField({
        score:   new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        exp:     new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        raceMin: new fields.NumberField({ initial: null, nullable: true, integer: true }),
        raceMax: new fields.NumberField({ initial: null, nullable: true, integer: true }),
      }),
      charisma:     new fields.SchemaField({
        score:   new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        exp:     new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        raceMin: new fields.NumberField({ initial: null, nullable: true, integer: true }),
        raceMax: new fields.NumberField({ initial: null, nullable: true, integer: true }),
      }),
      creativite:   new fields.SchemaField({
        score:   new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        exp:     new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        raceMin: new fields.NumberField({ initial: null, nullable: true, integer: true }),
        raceMax: new fields.NumberField({ initial: null, nullable: true, integer: true }),
      }),

      // Secondaires manuels
      bd:       new fields.NumberField({ initial: 0, integer: true }),
      emprise:  new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      chargeMax: new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      // Obédience magique : détermine la formule d'Emprise
      // jorniste → EMP = INT | eclipsiste → EMP = (INT+VOL)/2 | obscurantiste → EMP = VOL
      typeMage: new fields.StringField({ initial: "eclipsiste", choices: ["jorniste", "eclipsiste", "obscurantiste"] }),

      // Points de création de compétences
      ptsCreationComp: new fields.SchemaField({
        depense: new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        max:     new fields.NumberField({ initial: 120, integer: true, min: 0 })
      }),

      // Points de création de caractéristiques
      ptsCreationCarac: new fields.SchemaField({
        depense: new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        max:     new fields.NumberField({ initial: 80, integer: true, min: 0 })
      }),

      // Budget initial de Charges (avantages & défauts)
      // Règle Vie antérieure : 10 pts de base (+ 5 optionnel pour une Charge sociale)
      ptsCharges: new fields.SchemaField({
        max: new fields.NumberField({ initial: 10, integer: true, min: 0 })
      }),

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
      blessuresGraves:   new fields.NumberField({ initial: 0, integer: true, min: 0, max: 3 }),
      blessuresCritique: new fields.BooleanField({ initial: false }),

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
    const taiTables = CONFIG.AGONE;

    // Max des points de création dérivés du peuple actif
    const peupleKey = CONFIG.AGONE?.peupleNomVersKey?.[this.peuple] ?? "humain";
    const pData     = CONFIG.AGONE?.peuplesData?.[peupleKey] ?? CONFIG.AGONE?.peuplesData?.humain;
    if (pData) {
      this.ptsCreationComp.max  = pData.pointsCreationComp  ?? 120;
      this.ptsCreationCarac.max = pData.pointsCreationCarac ?? 80;
    }

    // Bonus d'aspects
    this.bonusCorps  = Math.max(0, this.corps.score - this.corps.noir);
    this.bonusEsprit = Math.max(0, this.esprit.score - this.esprit.noir);
    this.bonusAme    = Math.max(0, this.ame.score - this.ame.noir);

    // Flamme = minimum des trois aspects (règle Agone)
    this.flamme      = Math.min(this.corps.score, this.esprit.score, this.ame.score);
    this.flammeNoire = Math.min(this.corps.noir, this.esprit.noir, this.ame.noir);

    // PH max = Flamme × 2 (si non défini manuellement)
    if (this.ph.max === 0) this.ph.max = this.flamme * 2;

    // Stats dérivées de TAI
    this.mv  = this.mvOverride ?? taiTables.lookupTai(taiTables.taiToMv, this.tai);
    // PdV max = BPdV(race) + RES × 3 + bonusDe (résultat du 1d10 de création)
    const bpdv = pData?.bpdv ?? taiTables.lookupTai(taiTables.taiToBpdv, this.tai);
    this.pdv.max = bpdv + (this.resistance.score * 3) + this.pdv.bonusDe;
    this.bd  = taiTables.lookupBd(this.force.score, this.tai);
    this.modPoids = taiTables.lookupTai(taiTables.taiToModPoids, this.tai);
    this.chargeMax = (this.force.score + this.resistance.score) * this.modPoids;

    // Caractéristiques secondaires
    this.melee    = Math.round((this.force.score + this.agilite.score * 2) / 3);
    this.tir      = Math.round((this.agilite.score + this.perception.score) / 2);
    // Emprise selon obédience magique
    if (this.typeMage === "jorniste") {
      this.emprise = this.intelligence.score;
    } else if (this.typeMage === "obscurantiste") {
      this.emprise = this.volonte.score;
    } else {
      // eclipsiste (défaut)
      this.emprise = Math.round((this.intelligence.score + this.volonte.score) / 2);
    }
    this.art      = Math.round((this.charisma.score + this.creativite.score) / 2);

    // Initiative de base (sans arme)
    this.initiative     = this.agilite.score + this.perception.score + this.bonusCorps;
    this.initMagique    = this.initiative + 10;
    this.defenseNaturelle = this.agilite.score + this.bonusCorps;

    // Aptitudes magiques
    // Arts Magiques (Jorniste / Obscurantiste / Éclipsiste) : CRÉ × 2
    this.aptitudeArtsMagiques = this.creativite.score * 2;
    // Harmoniste (Accord / Cyse / Décorum / Geste) : ART × 2 = (CHA + CRÉ)
    this.aptitudeConjuration  = this.art * 2;

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
    this.armure._malusAgiActif = this.armure.portee ? -this.armure.malusAgi : 0;
    this.armure._malusPerActif  = this.armure.portee ? -this.armure.malusPer : 0;
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
