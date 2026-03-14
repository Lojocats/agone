import { AVANTAGES_EFFETS } from "../helpers/compendium-data.mjs";

/**
 * AgoneActor — Classe Actor étendue pour le système Agone
 * Gère les jets de dés et la préparation des données
 */
export class AgoneActor extends Actor {

  /** @override */
  prepareData() {
    super.prepareData();
  }
  /**
   * Redirige les mises à jour de la barre PdV token vers system.pdv.valeur
   * (FVTT appelle modifyTokenAttribute avec le champ "value" interne, on remplace par "valeur").
   * @override
   */
  async modifyTokenAttribute(attribute, value, isDelta = false, isBar = true) {
    if (isBar && attribute === "system.pdv") {
      const current = this.system.pdv.valeur;
      const max     = this.system.pdv.max;
      const newVal  = Math.min(max, Math.max(0, isDelta ? current + value : value));
      return this.update({ "system.pdv.valeur": newVal });
    }
    return super.modifyTokenAttribute(attribute, value, isDelta, isBar);
  }


  /**
   * Coerce les valeurs non-finies (NaN, Infinity) en 0 avant validation.
   * Dernier filet de sécurité avant que TypeDataModel.validate() ne soit appelé.
   * @override
   */
  async _preUpdate(changed, options, user) {
    if (changed.system) {
      const flat = foundry.utils.flattenObject(changed.system);
      for (const [k, v] of Object.entries(flat)) {
        if (typeof v === "number" && !Number.isFinite(v)) flat[k] = 0;
      }
      // Appliquer le plafond racial (max seulement — le min est une contrainte de création gérée par l'UI)
      // Le raceMax est une valeur brute (sans bonus). Le score stocké = rawScore + bonusAppliqué.
      // Donc plafond stocké = raceMax + bonusAppliqué.
      const attrs = ["agilite", "force", "perception", "resistance", "intelligence", "volonte", "charisma", "creativite"];
      for (const attr of attrs) {
        const scoreKey = `${attr}.score`;
        if (flat[scoreKey] !== undefined) {
          const raceMax     = this.system[attr]?.raceMax;
          const bonusOffset = this.system.peupleBonusApplique?.[`${attr}Bonus`] ?? 0;
          if (raceMax != null) flat[scoreKey] = Math.min(flat[scoreKey], raceMax + bonusOffset);
        }
      }
      changed.system = foundry.utils.expandObject(flat);
    }

    // — Peines : détection du franchissement des paliers démoniaques
    if (this.type === "personnage" && changed.system?.tenebres !== undefined) {
      const oldTene = this.system.tenebres ?? 0;
      const newTene = Number(changed.system.tenebres);
      if (newTene > oldTene) {
        const PALIERS_DEMON = [
          { palier: 10, origine: "diablotin"        },
          { palier: 30, origine: "demonFacetieux"   },
          { palier: 70, origine: "jumeauDemoniaque" },
          { palier: 92, origine: "siamoisTenebres"  },
        ];
        options._demonCreations = [];
        for (const { palier, origine } of PALIERS_DEMON) {
          if (oldTene < palier && newTene >= palier) {
            const alreadyExists = this.items.some(
              i => i.type === "demon" && i.system.origine === origine
            );
            if (!alreadyExists) options._demonCreations.push(origine);
          }
        }
      }
    }

    return super._preUpdate(changed, options, user);
  }

  /** @override */
  async _onUpdate(changed, options, userId) {
    await super._onUpdate(changed, options, userId);
    if (userId !== game.user.id) return;
    if (!options._demonCreations?.length) return;

    const NOM_DEMON = {
      diablotin:        "AGONE.Peine.diablotin",
      demonFacetieux:   "AGONE.Peine.demonFacetieux",
      jumeauDemoniaque: "AGONE.Peine.jumeauDemoniaque",
      siamoisTenebres:  "AGONE.Peine.siamoisTenebres",
    };
    const toCreate = options._demonCreations.map(origine => ({
      type:   "demon",
      name:   game.i18n.localize(NOM_DEMON[origine]) || origine,
      system: { modeCreation: true, origine },
    }));
    await this.createEmbeddedDocuments("Item", toCreate);
    const nomListe = toCreate.map(d => d.name).join(", ");
    ui.notifications.info(game.i18n.format("AGONE.DemonAutoApparu", { name: nomListe }));
  }

  /** @override */
  prepareDerivedData() {
    const actorData = this;
    const systemData = this.system;

    // Calcul de la charge totale portée depuis l'inventaire
    if (this.type === "personnage" || this.type === "compagnon") {
      let chargeTotal = 0;
      for (const item of this.items) {
        if (item.type === "equipement") {
          chargeTotal += item.system.poidsTotal ?? 0;
        } else if (item.type === "arme") {
          chargeTotal += item.system.poids ?? 0;
        } else if (item.type === "armure") {
          chargeTotal += item.system.poids ?? 0;
        }
      }
      systemData.chargeActuelle = chargeTotal;

      // Malus surcharge
      if (this.type === "personnage") {
        const demiCharge = systemData.demiCharge ?? 0;
        const chargeMax  = systemData.chargeMax  ?? 0;
        if (chargeTotal > chargeMax && chargeMax > 0) {
          systemData.malusSurcharge = -3;
        } else if (chargeTotal > demiCharge && demiCharge > 0) {
          systemData.malusSurcharge = -1;
        } else {
          systemData.malusSurcharge = 0;
        }

        // Esquive totale (AGI + compétence Esquive + Bonus Corps)
        const compEsquive = this.items.find(i =>
          i.type === "competence" && i.name === "Esquive (Épreuve)"
        );
        const scoreEsquive = compEsquive ? compEsquive.system.score : 0;
        systemData.esquiveTotal = systemData.agilite.score + scoreEsquive + systemData.bonusCorps;
        systemData.esquiveDistance = Math.round(
          (systemData.agilite.score + scoreEsquive) / 2
        );

        // Potentiel de conjuration (Noirceur + Démonologie + Bonus Âme)
        const compDemono = this.items.find(i =>
          i.type === "competence" && i.name === "Démonologie (Occulte)"
        );
        const scoreDemono = compDemono ? compDemono.system.score : 0;
        systemData.aptitudeConjuration = systemData.noirceur + scoreDemono + systemData.bonusAme;

        // Potentiel Arts Magiques (ART + Arts Magiques + Bonus Âme)
        const compArts = this.items.find(i =>
          i.type === "competence" && i.name === "Arts Magiques (Occulte)"
        );
        const scoreArts = compArts ? compArts.system.score : 0;
        systemData.aptitudeArtsMagiques = systemData.art + scoreArts + systemData.bonusAme;

        // Potentiel d'Emprise (EMP + Conn. des Danseurs + Bonus Esprit)
        const compDanseurs = this.items.find(i =>
          i.type === "competence" && i.name.toLowerCase().includes("danseur")
        );
        const scoreConnDanseurs = compDanseurs ? compDanseurs.system.score : 0;
        systemData.aptitudeEmprise = (systemData.emprise ?? 0) + scoreConnDanseurs + (systemData.bonusEsprit ?? 0);

        // Effets mécaniques des avantages & défauts
        this._applyAvantagesEffets();
      }
    }
  }

  /**
   * Applique les effets mécaniques des avantages & défauts (type "don") sur les stats.
   * Modifie uniquement les propriétés calculées (transient), jamais le stockage persistant.
   * Appelée à la FIN de prepareDerivedData() pour le type personnage.
   */
  _applyAvantagesEffets() {
    const sd = this.system;
    const T  = CONFIG.AGONE;

    const dons = this.items.filter(i => i.type === "don");
    if (!dons.length) return;

    // Accumulation des deltas
    const b = {
      agilite: 0, force: 0, resistance: 0, intelligence: 0,
      volonte: 0, charisma: 0, creativite: 0, perception: 0,
      corps: 0, esprit: 0, ame: 0,
      corps_noir: 0, esprit_noir: 0, ame_noir: 0,
      tai: 0,
      initiative_bonus: 0,
      art_bonus: 0,
      emprise_bonus: 0,
      mv_divisor: 1,
      ptsCreationComp_bonus: 0,
      charges_double: false,
      charges_reduction: 0,
    };

    for (const don of dons) {
      const effets = AVANTAGES_EFFETS[don.name] ?? [];
      for (const e of effets) {
        if (e.stat === "mv_divisor") {
          b.mv_divisor = Math.max(b.mv_divisor, e.value ?? 1);
        } else if (e.stat === "charges_double") {
          b.charges_double = true;
        } else if (e.delta !== undefined) {
          b[e.stat] = (b[e.stat] ?? 0) + e.delta;
        }
      }
    }

    // Rien à faire si aucun effet
    const anyDelta = Object.entries(b).some(([k, v]) => {
      if (k === "mv_divisor")     return v > 1;
      if (k === "charges_double") return v === true;
      return typeof v === "number" && v !== 0;
    });
    if (!anyDelta) return;

    // --- 1. Application des deltas sur les stats brutes ---
    sd.agilite.score      += b.agilite;
    sd.force.score        += b.force;
    sd.resistance.score   += b.resistance;
    sd.intelligence.score += b.intelligence;
    sd.volonte.score      += b.volonte;
    sd.charisma.score     += b.charisma;
    sd.creativite.score   += b.creativite;
    sd.perception.score   += b.perception;
    sd.corps.score        += b.corps;
    sd.esprit.score       += b.esprit;
    sd.ame.score          += b.ame;
    // Ajouter les noirs des dons aux totaux dérivés (pas aux champs stockés)
    sd.corpsNoirTotal  = (sd.corpsNoirTotal  ?? sd.corps.noir)  + b.corps_noir;
    sd.espritNoirTotal = (sd.espritNoirTotal ?? sd.esprit.noir) + b.esprit_noir;
    sd.ameNoirTotal    = (sd.ameNoirTotal    ?? sd.ame.noir)    + b.ame_noir;
    // taiEffectif = valeur TAI avec les bonus d'avantages, uniquement pour les dérivations.
    // sd.tai n'est PAS modifié pour éviter l'accumulation en BDD lors des sauvegardes.
    const taiEffectif = sd.tai + b.tai;

    // --- 1b. Points de création compétences (ex: Orphelin -10) ---
    if (b.ptsCreationComp_bonus !== 0) {
      sd.ptsCreationComp.max = Math.max(0, sd.ptsCreationComp.max + b.ptsCreationComp_bonus);
    }

    // --- 2. Re-dérivation des bonus/malus d'aspects (utilise les totaux dérivés) ---
    sd.bonusCorps  = sd.corps.score  - sd.corpsNoirTotal;
    sd.bonusEsprit = sd.esprit.score - sd.espritNoirTotal;
    sd.bonusAme    = sd.ame.score    - sd.ameNoirTotal;
    sd.flamme      = Math.min(sd.corps.score, sd.esprit.score, sd.ame.score);
    sd.flammeNoire = Math.min(sd.corpsNoirTotal, sd.espritNoirTotal, sd.ameNoirTotal);

    // --- 3. Re-dérivation TAI (si TAI modifié) ---
    if (b.tai !== 0) {
      if (!sd.mvOverride) sd.mv = T.lookupTai(T.taiToMv, taiEffectif);
      sd.modPoids = T.lookupTai(T.taiToModPoids, taiEffectif);
    }

    // --- 4. Re-dérivation dépendant de force / résistance ---
    const peupleKey = T.peupleNomVersKey?.[sd.peuple] ?? "humain";
    const pData     = T.peuplesData?.[peupleKey] ?? T.peuplesData?.humain;
    const bpdv      = pData?.bpdv ?? T.lookupTai(T.taiToBpdv, taiEffectif);
    sd.pdv.max   = bpdv + sd.resistance.score * 3 + sd.pdv.bonusDe;
    sd.bd        = T.lookupBd(sd.force.score, taiEffectif);
    sd.chargeMax = (sd.force.score + sd.resistance.score) * sd.modPoids;
    sd.demiCharge = Math.floor(sd.chargeMax / 2);
    sd.chargeJour = Math.floor(sd.chargeMax / 4);
    sd.seuilBlessureGrave    = Math.max(1, Math.floor(sd.pdv.max / 3));
    sd.seuilBlessureCritique = Math.max(1, Math.floor(sd.pdv.max / 2));

    // --- 5. Re-dérivation des caractéristiques secondaires ---
    sd.melee = Math.round((sd.force.score + sd.agilite.score * 2) / 3);
    sd.tir   = Math.round((sd.agilite.score + sd.perception.score) / 2);

    if (sd.typeMage === "jorniste")           sd.emprise = sd.intelligence.score;
    else if (sd.typeMage === "obscurantiste") sd.emprise = sd.volonte.score;
    else sd.emprise = Math.round((sd.intelligence.score + sd.volonte.score) / 2);
    sd.emprise += b.emprise_bonus;

    sd.art              = Math.round((sd.charisma.score + sd.creativite.score) / 2) + b.art_bonus;
    sd.initiative       = sd.agilite.score + sd.perception.score + sd.bonusCorps + b.initiative_bonus;
    sd.initMagique      = sd.initiative + 10;
    sd.defenseNaturelle = sd.agilite.score + sd.bonusCorps;
    sd.noirceur         = Math.floor(sd.tenebres / 10);

    // MV diviseur (Boiteux ÷2, Un membre en moins ÷3)
    if (b.mv_divisor > 1) {
      sd.mv = Math.max(1, Math.floor(sd.mv / b.mv_divisor));
    }

    // --- 6. Calcul des Charges (avantages & défauts) ---
    {
      let depense = 0;
      let recupere = 0;
      for (const don of dons) {
        const cout = don.system.cout ?? 0;
        if (don.system.categorie === "avantage") {
          let coutEff = cout;
          if (b.charges_double && don.name !== "Jeune")     coutEff *= 2;
          if (b.charges_reduction > 0 && don.name !== "Vieillard") coutEff = Math.max(1, coutEff - b.charges_reduction);
          depense += Math.max(0, coutEff);
        } else {
          // défauts : cout stocké négatif → on prend la valeur absolue
          recupere += Math.abs(cout);
        }
      }
      sd.chargesDepensees   = depense;
      sd.chargesRecuperees  = recupere;
      sd.chargesDisponibles = (sd.ptsCharges?.max ?? 0) + recupere;
      sd.chargesSolde       = sd.chargesDisponibles - depense;
      sd.chargesSoldeClass  = sd.chargesSolde < 0 ? "charges-deficit" : "charges-ok";
      // booléens utiles dans le template
      sd.chargesJeune       = b.charges_double;
      sd.chargesVieillard   = b.charges_reduction > 0;
    }

    // --- 7. Re-dérivation des stats basées sur les items ---
    const compEsquive  = this.items.find(i => i.type === "competence" && i.name === "Esquive (Épreuve)");
    const scoreEsquive = compEsquive?.system.score ?? 0;
    sd.esquiveTotal    = sd.agilite.score + scoreEsquive + sd.bonusCorps;
    sd.esquiveDistance = Math.round((sd.agilite.score + scoreEsquive) / 2);

    const compDemono       = this.items.find(i => i.type === "competence" && i.name === "Démonologie (Occulte)");
    const scoreDemono      = compDemono?.system.score ?? 0;
    sd.aptitudeConjuration = sd.noirceur + scoreDemono + sd.bonusAme;

    const compArts          = this.items.find(i => i.type === "competence" && i.name === "Arts Magiques (Occulte)");
    const scoreArts         = compArts?.system.score ?? 0;
    sd.aptitudeArtsMagiques = sd.art + scoreArts + sd.bonusAme;

    const compDanseurs      = this.items.find(i => i.type === "competence" && i.name.toLowerCase().includes("danseur"));
    const scoreConnDanseurs = compDanseurs?.system.score ?? 0;
    sd.aptitudeEmprise      = sd.emprise + scoreConnDanseurs + sd.bonusEsprit;
  }

  // ==============================
  // Méthodes de jet de dés
  // ==============================

  /**
   * Jet d'attribut principal
   * Formule: 1d10 explodant + Attribut*2 + BonusAspect + modificateurs
   */
  async rollAttribut(attributKey) {
    const sd = this.system;
    const attrConfig = CONFIG.AGONE.attributs[attributKey];
    if (!attrConfig) return;

    const attrScore = sd[attributKey]?.score ?? 0;
    let bonusAspect = 0;
    if (attrConfig.aspect === "corps")  bonusAspect = sd.bonusCorps  ?? 0;
    if (attrConfig.aspect === "esprit") bonusAspect = sd.bonusEsprit ?? 0;
    if (attrConfig.aspect === "ame")    bonusAspect = sd.bonusAme    ?? 0;

    const label = game.i18n.localize(attrConfig.label);
    const baseScore = attrScore * 2 + bonusAspect;

    const modif = await this._dialogModificateur(label);
    if (modif === null) return;

    const bonusSaisonin = this._getBonusSaisonin();
    const malusArmure = (attributKey === "agilite" || attributKey === "perception")
      ? (sd.armure?._malusAgiActif ?? 0) : 0;
    const malusBlessure = sd.malusBlessureGrave ?? 0;

    const roll = new Roll(
      "1d10x10 + @base + @malus + @modif",
      { base: baseScore, malus: malusArmure + (sd.malusSurcharge ?? 0) + malusBlessure, modif: modif + bonusSaisonin }
    );
    await roll.evaluate();
    await this._sendRollToChat(roll, label, {
      base:   `${label} ×2 : ${attrScore * 2}`,
      aspect: `Bonus d'aspect : ${bonusAspect}`,
      modif:  `Bonus/Malus : ${modif + malusArmure + (sd.malusSurcharge ?? 0) + malusBlessure}`,
      ...(bonusSaisonin > 0 ? { saisonin: `Bonus Saisonin : +${bonusSaisonin}` } : {})
    });
    return roll;
  }

  /**
   * Jet de compétence
   * Formule: 1d10 explodant + Compétence + Attribut + BonusAspect + modificateurs
   */
  async rollCompetence(itemId) {
    const item = this.items.get(itemId);
    if (!item || item.type !== "competence") return;

    const sd = this.system;
    const compData  = item.system;
    const compScore = compData.score ?? 0;
    const attrKey   = compData.attributLie ?? "agilite";
    const attrScore = sd[attrKey]?.score ?? sd[attrKey] ?? 0;

    const attrConfig = CONFIG.AGONE.attributs[attrKey] ?? {};
    let bonusAspect = 0;
    if (attrConfig.aspect === "corps")  bonusAspect = sd.bonusCorps  ?? 0;
    if (attrConfig.aspect === "esprit") bonusAspect = sd.bonusEsprit ?? 0;
    if (attrConfig.aspect === "ame")    bonusAspect = sd.bonusAme    ?? 0;

    const specialite = compData.specialite ?? "";
    const label = item.name + (compData.domaine ? ` [${compData.domaine}]` : "");
    const modif = await this._dialogModificateur(label, { specialite });
    if (modif === null) return;

    const bonusSaisonin = this._getBonusSaisonin();
    const bonusSpe    = this._lastBonusSpe ?? 0;
    const malusComp0  = compScore === 0 ? -3 : 0;
    const malusArmure = (attrKey === "agilite" || attrKey === "perception")
      ? (sd.armure?._malusAgiActif ?? 0) : 0;
    const malusBlessure = sd.malusBlessureGrave ?? 0;

    const roll = new Roll(
      "1d10x10 + @comp + @attr + @bonus + @modif",
      {
        comp: compScore,
        attr: attrScore,
        bonus: bonusAspect + bonusSpe,
        modif: modif + malusArmure + malusComp0 + (sd.malusSurcharge ?? 0) + malusBlessure + bonusSaisonin
      }
    );
    await roll.evaluate();
    await this._sendRollToChat(roll, label, {
      competence: `${label} : ${compScore}${compScore === 0 ? ` (${game.i18n.localize("AGONE.MalusCompNonApprise")})` : ""}`,
      attribut:  `${game.i18n.localize(attrConfig.label ?? attrKey)} : ${attrScore}`,
      aspect:    `Bonus d'aspect : ${bonusAspect}${bonusSpe ? ` + Spécialité : +${bonusSpe}` : ""}`,
      modif:     `Bonus/Malus : ${modif + malusArmure + malusComp0 + (sd.malusSurcharge ?? 0) + malusBlessure}`,
      ...(bonusSaisonin > 0 ? { saisonin: `Bonus Saisonin : +${bonusSaisonin}` } : {})
    });
    return roll;
  }

  // Jet d'une compétence non acquise (score 0, malus -3 automatique)
  async rollCompetenceSansItem(nom, attributLie, domaine) {
    const sd        = this.system;
    const attrKey   = attributLie ?? "agilite";
    const attrScore = sd[attrKey]?.score ?? sd[attrKey] ?? 0;

    const attrConfig = CONFIG.AGONE.attributs[attrKey] ?? {};
    let bonusAspect = 0;
    if (attrConfig.aspect === "corps")  bonusAspect = sd.bonusCorps  ?? 0;
    if (attrConfig.aspect === "esprit") bonusAspect = sd.bonusEsprit ?? 0;
    if (attrConfig.aspect === "ame")    bonusAspect = sd.bonusAme    ?? 0;

    const label = nom + (domaine ? ` [${domaine}]` : "");
    const modif = await this._dialogModificateur(label, { specialite: "" });
    if (modif === null) return;

    const bonusSaisonin = this._getBonusSaisonin();
    const bonusSpe    = this._lastBonusSpe ?? 0;
    const malusArmure = (attrKey === "agilite" || attrKey === "perception")
      ? (sd.armure?._malusAgiActif ?? 0) : 0;
    const malusBlessure = sd.malusBlessureGrave ?? 0;

    const roll = new Roll(
      "1d10x10 + @comp + @attr + @bonus + @modif",
      {
        comp: 0,
        attr: attrScore,
        bonus: bonusAspect + bonusSpe,
        modif: modif + malusArmure - 3 + (sd.malusSurcharge ?? 0) + malusBlessure + bonusSaisonin
      }
    );
    await roll.evaluate();
    await this._sendRollToChat(roll, label, {
      competence: `${label} : 0 (${game.i18n.localize("AGONE.MalusCompNonApprise")})`,
      attribut:  `${game.i18n.localize(attrConfig.label ?? attrKey)} : ${attrScore}`,
      aspect:    `Bonus d'aspect : ${bonusAspect}${bonusSpe ? ` + Spécialité : +${bonusSpe}` : ""}`,
      modif:     `Bonus/Malus : ${modif + malusArmure - 3 + (sd.malusSurcharge ?? 0) + malusBlessure}`,
      ...(bonusSaisonin > 0 ? { saisonin: `Bonus Saisonin : +${bonusSaisonin}` } : {})
    });
    return roll;
  }

  /**
   * Expose les statistiques dérivées pour les formules de jet FoundryVTT
   * (p. ex. CONFIG.Combat.initiative.formula = "1d10 + @initiative")
   * @override
   */
  getRollData() {
    const data = super.getRollData();
    const sd   = this.system;
    data.initiative  = sd.initiative  ?? 0;
    data.initMagique = sd.initMagique ?? 0;
    data.bonusCorps  = sd.bonusCorps  ?? 0;
    data.bonusEsprit = sd.bonusEsprit ?? 0;
    data.bonusAme    = sd.bonusAme    ?? 0;
    return data;
  }

  /**
   * Jet d'initiative (fermé)
   */
  async rollInitiative(armeId = null) {
    const sd = this.system;
    let base = sd.initiative ?? 0;
    let label = game.i18n.localize("AGONE.Initiative");

    if (armeId) {
      const arme = this.items.get(armeId);
      if (arme) {
        base += arme.system.initBonus ?? 0;
        label += ` (${arme.name})`;
      }
    }

    const modif = await this._dialogModificateur(label);
    if (modif === null) return;

    const bonusSaisonin = this._getBonusSaisonin();
    const malusBlessure = sd.malusBlessureGrave ?? 0;
    const roll = new Roll(
      "1d10 + @base + @modif",
      { base, modif: modif + (sd.malusSurcharge ?? 0) + malusBlessure + bonusSaisonin }
    );
    await roll.evaluate();
    await this._sendRollToChat(roll, label, {
      base:  `Initiative : ${base}`,
      modif: `Bonus/Malus : ${modif + (sd.malusSurcharge ?? 0) + malusBlessure}`,
      ...(bonusSaisonin > 0 ? { saisonin: `Bonus Saisonin : +${bonusSaisonin}` } : {})
    });

    // Mettre à jour le tracker de combat
    await this._setInitiativeInCombat(Math.max(0, roll.total));
    return roll;
  }

  /**
   * Jet d'initiative magique (Initiative + 10, fermé)
   */
  async rollInitiativeMagique() {
    const sd    = this.system;
    const base  = sd.initMagique ?? 0;
    const label = game.i18n.localize("AGONE.InitMagique");

    const modif = await this._dialogModificateur(label);
    if (modif === null) return;

    const bonusSaisonin = this._getBonusSaisonin();
    const malusBlessure = sd.malusBlessureGrave ?? 0;
    const roll = new Roll(
      "1d10 + @base + @modif",
      { base, modif: modif + (sd.malusSurcharge ?? 0) + malusBlessure + bonusSaisonin }
    );
    await roll.evaluate();
    await this._sendRollToChat(roll, label, {
      base:  `Initiative Magique : ${base}`,
      modif: `Bonus/Malus : ${modif + (sd.malusSurcharge ?? 0) + malusBlessure}`,
      ...(bonusSaisonin > 0 ? { saisonin: `Bonus Saisonin : +${bonusSaisonin}` } : {})
    });

    // Mettre à jour le tracker de combat
    await this._setInitiativeInCombat(Math.max(0, roll.total));
    return roll;
  }

  /**
   * Jet d'attaque avec arme
   */
  async rollAttaque(armeId) {
    const sd = this.system;
    const arme = this.items.get(armeId);
    if (!arme) return;

    const style = arme.system.style ?? "melee";
    let baseAttack = style === "trait" ? (sd.tir ?? 0) : (sd.melee ?? 0);

    // Compétence liée
    const nomComp = arme.system.competence;
    let scoreComp = 0;
    if (nomComp) {
      const comp = this.items.find(i => i.type === "competence" && i.name === nomComp);
      scoreComp = comp?.system.score ?? 0;
    }

    const attackBonus = arme.system.attackBonus ?? 0;
    const bonusCorps  = sd.bonusCorps ?? 0;
    const total = baseAttack + scoreComp + attackBonus + bonusCorps;

    const label = `${game.i18n.localize("AGONE.Attaque")} — ${arme.name}`;
    const modif = await this._dialogModificateur(label);
    if (modif === null) return;

    const bonusSaisonin = this._getBonusSaisonin();
    const malusBlessure = sd.malusBlessureGrave ?? 0;
    const roll = new Roll(
      "1d10x10 + @total + @modif",
      { total, modif: modif + (sd.malusSurcharge ?? 0) + malusBlessure + bonusSaisonin }
    );
    await roll.evaluate();
    await this._sendRollToChat(roll, label, {
      style:     `${style === "trait" ? "TIR" : "MÊL"} : ${baseAttack}`,
      competence:`Compétence : ${scoreComp}`,
      arme:      `Bonus arme : ${attackBonus}`,
      aspect:    `Bonus Corps : ${bonusCorps}`,
      modif:     `Bonus/Malus : ${modif + (sd.malusSurcharge ?? 0) + malusBlessure}`,
      ...(bonusSaisonin > 0 ? { saisonin: `Bonus Saisonin : +${bonusSaisonin}` } : {})
    }, { arme, typeJet: "attaque" });
    return roll;
  }

  /**
   * Jet de parade avec arme
   */
  async rollParade(armeId) {
    const sd = this.system;
    const arme = this.items.get(armeId);
    if (!arme) return;

    const melee = sd.melee ?? 0;
    const nomComp = arme.system.competence;
    let scoreComp = 0;
    if (nomComp) {
      const comp = this.items.find(i => i.type === "competence" && i.name === nomComp);
      scoreComp = comp?.system.score ?? 0;
    }

    const defenseBonus = arme.system.defenseBonus ?? 0;
    const bonusCorps   = sd.bonusCorps ?? 0;
    const total = melee + scoreComp + defenseBonus + bonusCorps;

    const label = `${game.i18n.localize("AGONE.Parade")} — ${arme.name}`;
    const modif = await this._dialogModificateur(label);
    if (modif === null) return;

    const bonusSaisonin = this._getBonusSaisonin();
    const malusArmure = sd.armure?._malusAgiActif ?? 0;
    const malusBlessure = sd.malusBlessureGrave ?? 0;
    const roll = new Roll(
      "1d10x10 + @total + @modif",
      { total, modif: modif + malusArmure + (sd.malusSurcharge ?? 0) + malusBlessure + bonusSaisonin }
    );
    await roll.evaluate();
    await this._sendRollToChat(roll, label, {
      melee:     `MÊL : ${melee}`,
      competence:`Compétence : ${scoreComp}`,
      arme:      `Bonus arme : ${defenseBonus}`,
      aspect:    `Bonus Corps : ${bonusCorps}`,
      modif:     `Bonus/Malus : ${modif + malusArmure + (sd.malusSurcharge ?? 0) + malusBlessure}`,
      ...(bonusSaisonin > 0 ? { saisonin: `Bonus Saisonin : +${bonusSaisonin}` } : {})
    }, { arme, typeJet: "parade" });
    return roll;
  }

  /**
   * Jet d'esquive
   */
  async rollEsquive() {
    const sd = this.system;
    const total = sd.esquiveTotal ?? (sd.agilite?.score ?? 0);
    const label = game.i18n.localize("AGONE.Esquive");
    const modif = await this._dialogModificateur(label);
    if (modif === null) return;

    const bonusSaisonin = this._getBonusSaisonin();
    const malusArmure = sd.armure?._malusAgiActif ?? 0;
    const malusBlessure = sd.malusBlessureGrave ?? 0;
    const roll = new Roll(
      "1d10x10 + @total + @modif",
      { total, modif: modif + malusArmure + (sd.malusSurcharge ?? 0) + malusBlessure + bonusSaisonin }
    );
    await roll.evaluate();
    await this._sendRollToChat(roll, label, {
      base:  `Esquive : ${total}`,
      modif: `Bonus/Malus : ${modif + malusArmure + (sd.malusSurcharge ?? 0) + malusBlessure}`,
      ...(bonusSaisonin > 0 ? { saisonin: `Bonus Saisonin : +${bonusSaisonin}` } : {})
    });
    return roll;
  }

  /**
   * Jet de Défense Naturelle
   */
  async rollDefenseNaturelle() {
    const sd = this.system;
    const total = sd.defenseNaturelle ?? (sd.agilite?.score ?? 0);
    const label = game.i18n.localize("AGONE.DefenseNaturelle");
    const modif = await this._dialogModificateur(label);
    if (modif === null) return;

    const bonusSaisonin = this._getBonusSaisonin();
    const malusArmure = sd.armure?._malusAgiActif ?? 0;
    const malusBlessure = sd.malusBlessureGrave ?? 0;
    const roll = new Roll(
      "1d10x10 + @total + @modif",
      { total, modif: modif + malusArmure + (sd.malusSurcharge ?? 0) + malusBlessure + bonusSaisonin }
    );
    await roll.evaluate();
    await this._sendRollToChat(roll, label, {
      base:  `Défense Naturelle : ${total}`,
      modif: `Bonus/Malus : ${modif + malusArmure + (sd.malusSurcharge ?? 0) + malusBlessure}`,
      ...(bonusSaisonin > 0 ? { saisonin: `Bonus Saisonin : +${bonusSaisonin}` } : {})
    });
    return roll;
  }

  /**
   * Jet de VOL à Difficulté 10 pour la 3e blessure grave
   * (sans malus de blessures selon la règle)
   */
  async rollVolBlessure3() {
    const sd = this.system;
    const volScore = sd.volonte?.score ?? 0;
    const bonusAme = sd.bonusAme ?? 0;
    const base = volScore * 2 + bonusAme;
    const label = game.i18n.localize("AGONE.JetVolBlessure3");
    const DIFFICULTE = 10;

    // On force le type ouvert pour que _sendRollToChat gère fumbles & critiques
    this._lastRollType = "ouvert";
    const roll = new Roll("1d10x10 + @base", { base });
    await roll.evaluate();

    const finalRoll = await this._sendRollToChat(roll, label, {
      volonte: `${game.i18n.localize("AGONE.Volonte")} ×2 : ${volScore * 2}`,
      ame:     `${game.i18n.localize("AGONE.BonusAme")} : ${bonusAme}`,
      diff:    `${game.i18n.localize("AGONE.Difficulte")} : ${DIFFICULTE}`,
    });

    // Fumble (dé = 1) = échec automatique, sinon on compare le total
    const firstFace = finalRoll?.dice[0]?.results?.[0]?.result ?? null;
    const isFumble  = firstFace === 1;
    const succes    = !isFumble && (finalRoll?.total ?? 0) >= DIFFICULTE;

    if (!succes) {
      ui.notifications.warn(`${this.name} — ${game.i18n.localize("AGONE.VolBlessureEchec")}`);
    }
    return finalRoll;
  }

  /**
   * Jet de Fumble : 1d10 fermé → pénalité à soustraire du jet raté
   */
  async rollFumble() {
    const label = game.i18n.localize("AGONE.Fumble");
    const roll = new Roll("1d10");
    await roll.evaluate();

    const content = await foundry.applications.handlebars.renderTemplate(
      "systems/agone/templates/chat/roll-result.hbs",
      {
        actor:        this,
        label,
        roll,
        total:        roll.total,
        details:      [{ label: game.i18n.localize("AGONE.PenaliteFumble"), value: roll.total }],
        rollType:     "ferme",
        isFumble:     true,
        fumblePenalty: roll.total,
        fumbleTotal:  null,
        isCritique:   false,
      }
    );

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content,
      rolls: [roll]
    });
    return roll;
  }

  /**
   * Jet de sort / magie
   */
  async rollSort(itemIdOrData, { impro = false } = {}) {
    const sd = this.system;
    let sort;
    if (typeof itemIdOrData === "string") {
      sort = this.items.get(itemIdOrData);
      if (!sort || sort.type !== "sort") return;
    } else {
      // Données brutes depuis le navigateur de sorts (SORTS_DATA)
      sort = { name: itemIdOrData.name, system: {
        seuil      : itemIdOrData.seuil      ?? 0,
        typeMagie  : itemIdOrData.typeMagie  ?? "",
        compAlt    : itemIdOrData.compAlt    ?? "",
        attrAlt    : itemIdOrData.attrAlt    ?? "",
      }};
    }

    // ── Guard : le personnage doit avoir Arts Magiques pour ce domaine ──────
    // Correspondance typeMagie (clé minuscule de SORTS_DATA) → domaine réel dans les compétences
    const TYPES_TO_DOMAINE = {
      accord:        "Accord",
      cyse:          "Cyse",
      decorum:       "Décorum",
      geste:         "Geste",
      // jorniste / obscurantiste / eclipsiste → vérification sans domaine précis
    };
    const typeMagie  = sort.system.typeMagie?.trim() ?? "";
    const compAltNomGuard = sort.system.compAlt?.trim() ?? "";
    if (!compAltNomGuard) {
      const domaineCible = TYPES_TO_DOMAINE[typeMagie] ?? null;
      const hasArts = this.items.some(i =>
        i.type === "competence" &&
        i.name === "Arts Magiques (Occulte)" &&
        (domaineCible === null ? true : i.system.domaine === domaineCible)
      );
      if (!hasArts) {
        const domainLabel = domaineCible ?? (typeMagie || "ce domaine");
        ui.notifications.warn(`${this.name} ne possède pas Arts Magiques (${domainLabel}) pour lancer ce sort.`);
        return null;
      }
    }

    const seuilBase = sort.system.seuil ?? 0;
    const seuil = impro ? seuilBase * 2 : seuilBase;
    let aptitude = sd.aptitudeArtsMagiques ?? sd.art ?? 0;

    // Compétence alternative : min(artsMagiques, compAlt + attrAlt + bonusAspect)
    const compAltNom = sort.system.compAlt?.trim() ?? "";
    if (compAltNom) {
      const compAltItem = this.items.find(i => i.type === "competence" && i.name === compAltNom);
      if (compAltItem) {
        const attrAltKey  = sort.system.attrAlt || compAltItem.system.attributLie || "charisma";
        const attrAltScore = sd[attrAltKey]?.score ?? 0;
        const attrCfg     = CONFIG.AGONE.attributs[attrAltKey] ?? {};
        let bonusAlt = 0;
        if (attrCfg.aspect === "corps")  bonusAlt = sd.bonusCorps  ?? 0;
        if (attrCfg.aspect === "esprit") bonusAlt = sd.bonusEsprit ?? 0;
        if (attrCfg.aspect === "ame")    bonusAlt = sd.bonusAme    ?? 0;
        const altAptitude = compAltItem.system.score + attrAltScore + bonusAlt;
        aptitude = Math.min(aptitude, altAptitude);
      }
    }

    const label = impro ? `${sort.name} (improvisé)` : sort.name;
    const modif = await this._dialogModificateur(label);
    if (modif === null) return;

    const bonusSaisonin = this._getBonusSaisonin();
    const roll = new Roll(
      "1d10x10 + @aptitude + @modif",
      { aptitude, modif: modif + bonusSaisonin }
    );
    await roll.evaluate();

    const succes = roll.total >= seuil;
    const aptitudeLabel = compAltNom
      ? `Arts Magiques (min avec ${compAltNom}) : ${aptitude}`
      : `Arts Magiques : ${aptitude}`;
    const seuilLabel = impro ? `Seuil : ${seuil} (${seuilBase} × 2, improvisé)` : `Seuil : ${seuil}`;
    await this._sendRollToChat(roll, label, {
      aptitude: aptitudeLabel,
      seuil:    seuilLabel,
      resultat: succes ? "✔ Succès" : "✘ Échec",
      modif:    `Bonus/Malus : ${modif}`,
      ...(bonusSaisonin > 0 ? { saisonin: `Bonus Saisonin : +${bonusSaisonin}` } : {})
    });
    return roll;
  }

  // ==============================
  // Private helpers
  // ==============================

  /**
   * Met à jour l'initiative du combattant lié à cet acteur dans le combat actif.
   * Utilise game.combat.setInitiative() qui est l'API officielle v13.
   * @param {number} value
   */
  async _setInitiativeInCombat(value) {
    const combat = game.combat;
    if (!combat) return;
    // Priorité 1 : via le TokenDocument associé à cet acteur (fonctionne même pour les tokens non-liés)
    const token = this.token;
    let combatant = token
      ? combat.combatants.find(c => c.tokenId === token.id)
      : null;
    // Priorité 2 : via actorId (tokens liés dont la feuille est ouverte depuis le sidebar)
    if (!combatant) combatant = combat.combatants.find(c => c.actorId === this.id);
    if (combatant) await combat.setInitiative(combatant.id, value);
  }

  /**
   * Retourne +1 si la saison du monde correspond à la saison personnelle du personnage
   * (via saisonPerso ou un item de type danseur avec saison correspondante).
   */
  _getBonusSaisonin() {
    try {
      const saisonMonde = game.settings?.get("agone", "saisonMonde") ?? "";
      if (!saisonMonde) return 0;
      const sd = this.system;
      if (sd.saisonPerso && sd.saisonPerso === saisonMonde) return 1;
      return this.items.some(i => i.type === "danseur" && i.system.saison === saisonMonde) ? 1 : 0;
    } catch { return 0; }
  }

  /**
   * Affiche un dialog pour saisir le modificateur (bonus/malus)
   * @returns {Promise<number|null>} modificateur ou null si annulé
   */
  async _dialogModificateur(label, { specialite = "" } = {}) {
    const speRow = specialite ? `
              <div class="form-group form-check">
                <input type="checkbox" id="bonusSpe" name="bonusSpe" />
                <label for="bonusSpe">${game.i18n.localize("AGONE.BonusSpecialite")} <em>${specialite}</em> (+1)</label>
              </div>` : "";

    const result = await foundry.applications.api.DialogV2.wait({
      window:  { title: label },
      content: `
        <form>
          <div class="agone-roll-dialog">
            <p><strong>${label}</strong></p>
            <div class="form-group">
              <label>${game.i18n.localize("AGONE.BonusMalus")}</label>
              <input type="number" id="modif" name="modif" value="0" autofocus/>
            </div>
            <div class="form-group form-check">
              <input type="checkbox" id="typeJet" name="typeJet" checked />
              <label for="typeJet">${game.i18n.localize("AGONE.JetOuvert")}</label>
            </div>${speRow}
          </div>
        </form>
      `,
      buttons: [
        {
          action:   "lancer",
          icon:     "fas fa-dice-d10",
          label:    game.i18n.localize("AGONE.Lancer"),
          default:  true,
          callback: (event, button) => ({
            modif:    parseInt(button.form.elements.modif.value) || 0,
            type:     button.form.elements.typeJet.checked ? "ouvert" : "ferme",
            bonusSpe: specialite && button.form.elements.bonusSpe?.checked ? 1 : 0,
          })
        },
        {
          action: "annuler",
          icon:   "fas fa-times",
          label:  game.i18n.localize("AGONE.Annuler"),
        }
      ],
      rejectClose: false,
    });

    if (!result || typeof result === "string") return null;
    // Mémoriser le type de jet et le bonus spécialité pour les callers
    this._lastRollType = result.type;
    this._lastBonusSpe = result.bonusSpe ?? 0;
    return result.modif;
  }

  /**
   * Envoie un résultat de jet dans le chat
   */
  async _sendRollToChat(roll, label, details = {}, extra = {}) {
    const rollType = this._lastRollType ?? "ouvert";

    // Si jet fermé: recalculer sans explosion
    let finalRoll = roll;
    if (rollType === "ferme") {
      const formula = roll.formula.replace("1d10x10", "1d10");
      const r = new Roll(formula, roll.data);
      await r.evaluate();
      finalRoll = r;
    }

    // Valeur brute du dé (premier dé de la formule)
    const diceResult = finalRoll.dice[0]?.total ?? "?";
    const diceLabel  = rollType === "ferme" ? "Dé (fermé)" : "Dé (ouvert)";

    // Convertir les détails en tableau {label, value}
    // Les valeurs sont au format "Label : valeur" ou "texte simple"
    const detailsArr = [
      { label: diceLabel, value: diceResult },
      ...Object.values(details).map(v => {
        // Accepte soit une chaîne "Label : valeur", soit un objet {label, value, tooltip?}
        if (typeof v === "object" && v !== null) return v;
        const idx = v.lastIndexOf(" : ");
        return idx !== -1
          ? { label: v.slice(0, idx), value: v.slice(idx + 3) }
          : { label: v, value: "" };
      })
    ];

    // Détection fumble (dé = 1) et critique (dé explosé ≥ 10), jets ouverts seulement
    const firstFace  = finalRoll.dice[0]?.results?.[0]?.result ?? null;
    const isFumble   = rollType !== "ferme" && firstFace === 1;
    const isCritique = rollType !== "ferme" && (finalRoll.dice[0]?.total ?? 0) >= 10;

    // Pénalité de fumble : 1d10 fermé soustrait du total
    let fumblePenalty = 0;
    let isMegaFumble  = false;
    if (isFumble) {
      const fumbleRoll = new Roll("1d10");
      await fumbleRoll.evaluate();
      fumblePenalty = fumbleRoll.total;
      isMegaFumble  = fumblePenalty === 10;
      if (isMegaFumble) Hooks.callAll("agone.megaFumble", { actor: this, roll: finalRoll, fumbleRoll });
    }

    const content = await foundry.applications.handlebars.renderTemplate(
      "systems/agone/templates/chat/roll-result.hbs",
      {
        actor:         this,
        label,
        roll:          finalRoll,
        total:         finalRoll.total,
        details:       detailsArr,
        rollType,
        isFumble,
        fumblePenalty,
        fumbleTotal:   finalRoll.total - fumblePenalty,
        isMegaFumble,
        isCritique,
        actorId:       this.id,
        arme:          extra.arme ?? null,
        typeJetCombat: extra.typeJet ?? null
      }
    );

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content,
      rolls: [finalRoll]
    });
    return finalRoll;
  }
}
