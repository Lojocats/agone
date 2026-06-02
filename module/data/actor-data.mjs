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
      cheveux:     new fields.StringField({ initial: "" }),
      yeux:        new fields.StringField({ initial: "" }),
      signes:      new fields.StringField({ initial: "" }),
      dieu:        new fields.StringField({ initial: "" }),
      langues:     new fields.StringField({ initial: "" }),
      saisonPerso: new fields.StringField({ initial: "" }),
      historique:  new fields.HTMLField({ initial: "" }),
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
      // Règle Vie antérieure : 5 pts de base (+ 5 optionnel pour une Charge sociale)
      ptsCharges: new fields.SchemaField({
        max: new fields.NumberField({ initial: 5, integer: true, min: 0 })
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

      // Bouclier équipé
      bouclier: new fields.SchemaField({
        nom:          new fields.StringField({ initial: "" }),
        portee:       new fields.BooleanField({ initial: false }),
        defenseBonus: new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        protection:   new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        malusAgi:     new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      }),

      // État de combat
      blessureGrave1:    new fields.BooleanField({ initial: false }),
      blessureGrave2:    new fields.BooleanField({ initial: false }),
      blessureGrave3:    new fields.BooleanField({ initial: false }),
      blessuresCritique: new fields.BooleanField({ initial: false }),

      // Ténèbres & Perfidie
      tenebres: new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      perfidie: new fields.NumberField({ initial: 0, integer: true, min: 0 }),

      // Monnaie
      monnaie: new fields.SchemaField({
        pieceOr: new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        bribe:   new fields.NumberField({ initial: 0, integer: true, min: 0 })
      }),

      // Bonus/malus d'attributs supplémentaires (avantages & défauts personnalisés)
      bonusAttributsSupp: new fields.ArrayField(new fields.SchemaField({
        categorie:   new fields.StringField({ initial: "avantage" }),
        attribut:    new fields.StringField({ initial: "agilite" }),
        valeur:      new fields.NumberField({ initial: 0, integer: true }),
        description: new fields.StringField({ initial: "" }),
      }))
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

    // Noirceur (stat dérivée = Ténèbres ÷ 10, utilisée pour la conjuration)
    this.noirceur = Math.floor(this.tenebres / 10);

    // Noirs auto-dérivés des Peines (transitoires — cumul selon les seuils de Ténèbres atteints)
    const modeManuelPaliers = this.parent?.getFlag?.("agone", "tenebresModeManuel") ?? false;
    const paliersManuels    = modeManuelPaliers
      ? (this.parent?.getFlag?.("agone", "paliersManuels") ?? {})
      : null;
    const palierActif = (seuil) => modeManuelPaliers
      ? !!paliersManuels[String(seuil)]
      : this.tenebres >= seuil;

    const peineCorpsNoir =
      (palierActif(30) ? 1 : 0) +   // Démon facétieux
      (palierActif(40) ? 1 : 0) +   // Somnambule
      (palierActif(70) ? 1 : 0) +   // Jumeau démoniaque
      (palierActif(78) ? 1 : 0) +   // Présence oppressante
      (palierActif(81) ? 1 : 0) +   // Altération des sens
      (palierActif(84) ? 1 : 0) +   // Sang noir
      (palierActif(87) ? 1 : 0) +   // Apparence démoniaque
      (palierActif(92) ? 1 : 0) +   // Siamois de Ténèbre
      (palierActif(98) ? 1 : 0) +   // Portail intérieur
      (palierActif(99) ? 1 : 0);    // Marque des Hauts Diables
    const peineEspritNoir =
      (palierActif(10) ? 1 : 0) +   // Diablotin farceur
      (palierActif(20) ? 1 : 0) +   // Cauchemars
      (palierActif(50) ? 1 : 0) +   // Insomniaque
      (palierActif(55) ? 1 : 0) +   // Mépris
      (palierActif(60) ? 1 : 0) +   // Déviance sexuelle
      (palierActif(65) ? 1 : 0) +   // Scarifications lunaires
      (palierActif(75) ? 1 : 0) +   // Obsession de l’ombre
      (palierActif(94) ? 1 : 0) +   // Malédiction
      (palierActif(96) ? 1 : 0) +   // Ombre vivante
      (palierActif(100) ? 1 : 0);   // Déchu
    // Noirs supplémentaires issus des Peines de Perfidie (items embarqués)
    const peineItems = this.parent?.items?.filter(i => i.type === "peine") ?? [];
    let peineCorpsNoirPerf = 0;
    let peineAmeNoirPerf   = 0;
    for (const p of peineItems) {
      if (p.system.noirEffect === "corps") peineCorpsNoirPerf++;
      else if (p.system.noirEffect === "ame") peineAmeNoirPerf++;
    }

    // Totaux calculés sans modifier les champs stockés (évite l'accumulation infinie au submit)
    const corpsNoirTotal  = this.corps.noir  + peineCorpsNoir + peineCorpsNoirPerf;
    const espritNoirTotal = this.esprit.noir + peineEspritNoir;
    const ameNoirTotal    = this.ame.noir    + peineAmeNoirPerf;
    this.corpsNoirTotal  = corpsNoirTotal;
    this.espritNoirTotal = espritNoirTotal;
    this.ameNoirTotal    = ameNoirTotal;

    // Difficulté VOL contre la Corruption (tableau des Peines de Perfidie)
    const perf = this.perfidie ?? 0;
    this.difVolCorruption = perf >= 90 ? 30 : perf >= 76 ? 25 : perf >= 51 ? 20 : 15;
    // Bonus/malus d'aspects (utilise les totaux)
    this.bonusCorps  = this.corps.score  - corpsNoirTotal;
    this.bonusEsprit = this.esprit.score - espritNoirTotal;
    this.bonusAme    = this.ame.score    - ameNoirTotal;

    // Flamme = minimum des trois aspects (règle Agone)
    this.flamme      = Math.min(this.corps.score, this.esprit.score, this.ame.score);
    this.flammeNoire = Math.min(corpsNoirTotal, espritNoirTotal, ameNoirTotal);

    // PH max = Flamme x 2 (si non défini manuellement)
    if (this.ph.max === 0) this.ph.max = this.flamme * 2;

    // Stats dérivées de TAI
    this.mv  = this.mvOverride ?? taiTables.lookupTai(taiTables.taiToMv, this.tai);
    // PdV max = BPdV(race) + RES x 3 + bonusDe (résultat du 1d10 de création)
    const bpdv = pData?.bpdv ?? taiTables.lookupTai(taiTables.taiToBpdv, this.tai);
    this.pdv.max = bpdv + (this.resistance.score * 3) + this.pdv.bonusDe;
    // Alias FVTT : la barre token cherche .value et .min, le schéma utilise .valeur
    this.pdv.value = this.pdv.valeur;
    this.pdv.min   = 0;
    this.bd  = taiTables.lookupBd(this.force.score, this.tai);
    this.modPoids = taiTables.lookupTai(taiTables.taiToModPoids, this.tai);
    this.chargeMax = (this.force.score + this.resistance.score) * this.modPoids;

    // Caractéristiques secondaires
    this.melee    = Math.floor((this.force.score + this.agilite.score * 2) / 3);
    this.tir      = Math.floor((this.agilite.score + this.perception.score) / 2);
    // Emprise selon obédience magique
    if (this.typeMage === "jorniste") {
      this.emprise = this.intelligence.score;
    } else if (this.typeMage === "obscurantiste") {
      this.emprise = this.volonte.score;
    } else {
      // eclipsiste (défaut)
      this.emprise = Math.floor((this.intelligence.score + this.volonte.score) / 2);
    }
    // Art : Fée Noire = CRÉ seul ; autres = ⌊(CHA + CRÉ) / 2⌋
    if (peupleKey === "feeNoire") {
      this.art = this.creativite.score;
    } else {
      this.art = Math.floor((this.charisma.score + this.creativite.score) / 2);
    }

    // Initiative de base (sans arme)
    this.initiative     = this.agilite.score + this.perception.score + this.bonusCorps;
    this.initMagique    = this.initiative + 10;
    this.defenseNaturelle = this.agilite.score + this.bonusCorps;

    // Aptitudes magiques
    // Arts Magiques (Jorniste / Obscurantiste / Éclipsiste) : CRÉ x 2
    this.aptitudeArtsMagiques = this.creativite.score * 2;
    // Harmoniste (Accord / Cyse / Décorum / Geste) : ART x 2 = (CHA + CRÉ)
    this.aptitudeConjuration  = this.art * 2;

    // Seuils PdV
    this.seuilBlessureGrave    = Math.max(1, Math.floor(this.pdv.max / 3));
    this.seuilBlessureCritique = Math.max(1, Math.floor(this.pdv.max / 2));

    // Charges
    this.demiCharge     = Math.floor(this.chargeMax / 2);
    this.chargeJour     = Math.floor(this.chargeMax / 4);

    // Cercle maximum de conjuration (respecte le mode actif)
    this.maxCercleConjuration =
      palierActif(98) ? 5 :
      palierActif(92) ? 4 :
      palierActif(70) ? 3 :
      palierActif(30) ? 2 :
      palierActif(10) ? 1 : 0;

    // Bienfaits non-conjuration (respecte le mode actif)
    this.bienfaitsActifs = {
      nyctalopie:       palierActif(75),
      parlerMorts:      palierActif(78),
      detecterDemons:   palierActif(81),
      detecterTenebres: palierActif(96),
    };

    // Malus Blessures Graves
    this.blessuresGraves = (this.blessureGrave1 ? 1 : 0) + (this.blessureGrave2 ? 1 : 0) + (this.blessureGrave3 ? 1 : 0);
    const malusTable = [0, -2, -6, -12];
    this.malusBlessureGrave = malusTable[this.blessuresGraves];

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

    // Malus bouclier équipé
    this.bouclier._defenseBonusActif = this.bouclier.portee ? this.bouclier.defenseBonus : 0;
    this.bouclier._malusAgiActif     = this.bouclier.portee ? -this.bouclier.malusAgi    : 0;
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
      blessureGrave1: new fields.BooleanField({ initial: false }),
      blessureGrave2: new fields.BooleanField({ initial: false }),
      blessureGrave3: new fields.BooleanField({ initial: false }),
      notes: new fields.HTMLField({ initial: "" })
    };
  }

  prepareDerivedData() {
    this.initiative = this.agilite + this.perception;
    this.melee = Math.floor((this.force + this.agilite * 2) / 3);
    this.demiCharge = Math.floor(this.chargeMax / 2);
    this.defenseNaturelle = this.agilite;
    this.blessuresGraves = (this.blessureGrave1 ? 1 : 0) + (this.blessureGrave2 ? 1 : 0) + (this.blessureGrave3 ? 1 : 0);
    const malusTable = [0, -2, -6, -12];
    this.malusBlessureGrave = malusTable[this.blessuresGraves];
  }
}

// ================================
// Démon (acteur complet)
// ================================
export class DemonData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      // Identité
      description:  new fields.HTMLField({ initial: "" }),
      origine:      new fields.StringField({ initial: "" }),  // valeur libre : opalin/azurin/… ou nom du palier auto-créé
      sexe:         new fields.StringField({ initial: "" }),
      taille:       new fields.StringField({ initial: "" }),
      masse:        new fields.StringField({ initial: "" }),
      age:          new fields.StringField({ initial: "" }),

      // Caractéristiques primaires
      agilite:     new fields.NumberField({ initial: 1, integer: true, min: 0 }),
      force:       new fields.NumberField({ initial: 1, integer: true, min: 0 }),
      perception:  new fields.NumberField({ initial: 1, integer: true, min: 0 }),
      intelligence:new fields.NumberField({ initial: 1, integer: true, min: 0 }),
      volonte:     new fields.NumberField({ initial: 1, integer: true, min: 0 }),
      charisma:    new fields.NumberField({ initial: 1, integer: true, min: 0 }),
      creativite:  new fields.NumberField({ initial: 1, integer: true, min: 0 }),

      // XP et amélioration
      experience:      new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      modeLevelUp:     new fields.BooleanField({ initial: false }),
      // XP buffers par caractéristique (pour capitalisation partielle)
      agiliteExp:      new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      forceExp:        new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      perceptionExp:   new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      intelligenceExp: new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      volonteExp:      new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      charismaExp:     new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      creativiteExp:   new fields.NumberField({ initial: 0, integer: true, min: 0 }),

      // Stats physiques
      tai:         new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      mv:          new fields.NumberField({ initial: 3, integer: true, min: 0 }),
      mvVol:       new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      bd:          new fields.NumberField({ initial: 0, integer: true }),
      dif:         new fields.NumberField({ initial: 0, integer: true }),
      opacite:     new fields.NumberField({ initial: 0, integer: true, min: 0 }),

      // Densité (équivalent PdV pour le démon)
      densite: new fields.SchemaField({
        valeur: new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        max:    new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      }),

      // Charge
      chargeMax:   new fields.NumberField({ initial: 0, integer: true, min: 0 }),

      // Blessures
      blessureGrave1: new fields.BooleanField({ initial: false }),
      blessureGrave2: new fields.BooleanField({ initial: false }),
      blessureGrave3: new fields.BooleanField({ initial: false }),

      // Notes
      connivances: new fields.HTMLField({ initial: "" }),
      notes:       new fields.HTMLField({ initial: "" }),
    };
  }

  prepareDerivedData() {
    // RÉS = Densité max / 5
    this.resistance = Math.floor(this.densite.max / 5);
    // Stats de combat
    this.melee    = Math.floor((this.force + this.agilite * 2) / 3);
    this.tir      = Math.floor((this.agilite + this.perception) / 2);
    this.initiative = this.agilite + this.perception;
    this.art      = Math.floor((this.charisma + this.creativite) / 2);
    this.defenseNaturelle = this.agilite;
    // Seuils basés sur densité max
    this.seuilBlessureGrave    = Math.max(1, Math.floor(this.densite.max / 3));
    this.seuilBlessureCritique = Math.max(1, Math.floor(this.densite.max / 2));
    // Charge
    this.demiCharge  = Math.floor(this.chargeMax / 2);
    this.chargeJour  = Math.floor(this.chargeMax / 4);
    // Blessures graves
    this.blessuresGraves = (this.blessureGrave1 ? 1 : 0) + (this.blessureGrave2 ? 1 : 0) + (this.blessureGrave3 ? 1 : 0);
    const malusTable = [0, -2, -6, -12];
    this.malusBlessureGrave = malusTable[this.blessuresGraves];
    // Alias token bar
    this.densite.value = this.densite.valeur;
    this.densite.min   = 0;
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
      flamme:      new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      corps:       new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      esprit:      new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      ame:         new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      blessureGrave1: new fields.BooleanField({ initial: false }),
      blessureGrave2: new fields.BooleanField({ initial: false }),
      blessureGrave3: new fields.BooleanField({ initial: false }),
      armure: new fields.SchemaField({
        protection: new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        malusAgi:   new fields.NumberField({ initial: 0, integer: true, min: 0 })
      }),
      typeMage:     new fields.StringField({ initial: "eclipsiste", blank: false }),
      competences:  new fields.HTMLField({ initial: "" }),
      notes:        new fields.HTMLField({ initial: "" }),
      equipement:   new fields.StringField({ initial: "" })
    };
  }

  prepareDerivedData() {
    this.melee      = Math.floor((this.force + this.agilite * 2) / 3);
    this.tir        = Math.floor((this.perception + this.agilite) / 2);
    this.initiative = this.agilite + this.perception;
    this.art             = Math.floor((this.charisma + this.creativite) / 2);
    this.defenseNaturelle = this.agilite;
    if (this.typeMage === "jorniste")           this.emprise = this.intelligence;
    else if (this.typeMage === "obscurantiste") this.emprise = this.volonte;
    else                                        this.emprise = Math.floor((this.intelligence + this.volonte) / 2);
    this.emprise += this.esprit;
    this.seuilBlessureGrave    = Math.max(1, Math.floor(this.pdv.max / 3));
    this.seuilBlessureCritique = Math.max(1, Math.floor(this.pdv.max / 2));
    this.bonusCorps  = this.corps;
    this.bonusEsprit = this.esprit;
    this.bonusAme    = this.ame;
    if (this.corps + this.esprit + this.ame > 0)
      this.flamme = Math.min(this.corps, this.esprit, this.ame);
    this.blessuresGraves = (this.blessureGrave1 ? 1 : 0) + (this.blessureGrave2 ? 1 : 0) + (this.blessureGrave3 ? 1 : 0);
    const malusTable = [0, -2, -6, -12];
    this.malusBlessureGrave = malusTable[this.blessuresGraves];
  }
}
