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
      const modeManuel = this.getFlag("agone", "tenebresModeManuel") ?? false;
      if (!modeManuel && newTene > oldTene) {
        const PALIERS_DEMON = [
          { palier: 10, origine: "diablotin"        },
          { palier: 30, origine: "demonFacetieux"   },
          { palier: 70, origine: "jumeauDemoniaque" },
          { palier: 92, origine: "siamoisTenebres"  },
        ];
        options._demonCreations = [];
        const _linkedDemonUuids = this.getFlag("agone", "demons") ?? [];
        for (const { palier, origine } of PALIERS_DEMON) {
          if (oldTene < palier && newTene >= palier) {
            const alreadyExistsItem = this.items.some(
              i => i.type === "demon" && i.system.origine === origine
            );
            const alreadyExistsActor = _linkedDemonUuids.some(uuid => {
              const doc = fromUuidSync?.(uuid);
              return doc?.system?.origine === origine;
            });
            if (!alreadyExistsItem && !alreadyExistsActor) options._demonCreations.push(origine);
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
    const currentUuids = this.getFlag("agone", "demons") ?? [];
    const newUuids = [...currentUuids];
    for (const origine of options._demonCreations) {
      const name = game.i18n.localize(NOM_DEMON[origine]) || origine;
      const newActor = await Actor.create({
        name,
        type:   "demon",
        system: { origine },
      });
      if (newActor) {
        newUuids.push(newActor.uuid);
        ui.notifications.info(game.i18n.format("AGONE.DemonAutoApparu", { name }));
      }
    }
    if (newUuids.length > currentUuids.length) {
      await this.setFlag("agone", "demons", newUuids);
    }
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
          i.type === "competence" && i.name === "Esquive"
        );
        const scoreEsquive = compEsquive ? compEsquive.system.score : 0;
        systemData.esquiveTotal = systemData.agilite.score + scoreEsquive + systemData.bonusCorps;
        systemData.esquiveDistance = Math.round(
          (systemData.agilite.score + scoreEsquive) / 2
        );

        // Potentiel de conjuration (Noirceur + Démonologie + Bonus Âme)
        const compDemono = this.items.find(i =>
          i.type === "competence" && i.name === "Démonologie"
        );
        const scoreDemono = compDemono ? compDemono.system.score : 0;
        systemData.aptitudeConjuration = systemData.noirceur + scoreDemono + systemData.bonusAme;

        // Potentiel Arts Magiques (ART + Arts Magiques + Bonus Âme)
        const compArts = this.items.find(i =>
          i.type === "competence" && i.name === "Arts Magiques"
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

        // Bonus/malus d'attributs supplémentaires (bonusAttributsSupp) — stats dérivées
        const _bsArr = systemData.bonusAttributsSupp ?? [];
        if (_bsArr.length > 0) {
          const _bs = (k) => _bsArr.reduce((s, e) => e.attribut === k ? s + (Number(e.valeur) || 0) : s, 0);
          systemData.melee            = (systemData.melee            ?? 0) + _bs('melee');
          systemData.tir              = (systemData.tir              ?? 0) + _bs('tir');
          systemData.art              = (systemData.art              ?? 0) + _bs('art');
          systemData.initiative       = (systemData.initiative       ?? 0) + _bs('initiative');
          systemData.initMagique      = (systemData.initMagique      ?? 0) + _bs('initMagique');
          systemData.defenseNaturelle = (systemData.defenseNaturelle ?? 0) + _bs('defenseNaturelle');
          systemData.bd               = (systemData.bd               ?? 0) + _bs('bd');
          systemData.esquiveTotal     = (systemData.esquiveTotal     ?? 0) + _bs('esquive');
          systemData.emprise          = (systemData.emprise          ?? 0) + _bs('emprise');
        }
      }
    }

    // Esquive pour PNJ (AGI + compétence Esquive + Bonus Corps)
    if (this.type === "pnj") {
      const compEsquivePnj = this.items.find(i => i.type === "competence" && i.name === "Esquive");
      const scoreEsquivePnj = compEsquivePnj?.system.score ?? 0;
      systemData.esquiveTotal = systemData.agilite + scoreEsquivePnj + (systemData.bonusCorps ?? 0);
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
    const _primairesSupp = ['agilite','force','perception','resistance','intelligence','volonte','charisma','creativite','corps','esprit','ame'];
    const _hasSuppPrimaire = (sd.bonusAttributsSupp ?? []).some(e => _primairesSupp.includes(e.attribut));
    if (!dons.length && !_hasSuppPrimaire) return;

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

    // Bonus/malus d'attributs supplémentaires sur stats primaires
    for (const e of (sd.bonusAttributsSupp ?? [])) {
      if (_primairesSupp.includes(e.attribut)) {
        b[e.attribut] = (b[e.attribut] ?? 0) + (Number(e.valeur) || 0);
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
    // Mémoriser les bonus avantages pour la séparation UI base / final (transient — jamais stocké)
    sd.agilite.avantageBonus      = b.agilite;
    sd.force.avantageBonus        = b.force;
    sd.resistance.avantageBonus   = b.resistance;
    sd.intelligence.avantageBonus = b.intelligence;
    sd.volonte.avantageBonus      = b.volonte;
    sd.charisma.avantageBonus     = b.charisma;
    sd.creativite.avantageBonus   = b.creativite;
    sd.perception.avantageBonus   = b.perception;
    sd.corps.avantageBonus        = b.corps;
    sd.esprit.avantageBonus       = b.esprit;
    sd.ame.avantageBonus          = b.ame;
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
    sd.melee = Math.floor((sd.force.score + sd.agilite.score * 2) / 3);
    sd.tir   = Math.floor((sd.agilite.score + sd.perception.score) / 2);

    if (sd.typeMage === "jorniste")           sd.emprise = sd.intelligence.score;
    else if (sd.typeMage === "obscurantiste") sd.emprise = sd.volonte.score;
    else sd.emprise = Math.floor((sd.intelligence.score + sd.volonte.score) / 2);
    sd.emprise += b.emprise_bonus;

    // Art : Fée Noire = CRÉ seul ; autres = ⌊(CHA + CRÉ) / 2⌋
    if (peupleKey === "feeNoire") {
      sd.art = sd.creativite.score + b.art_bonus;
    } else {
      sd.art = Math.floor((sd.charisma.score + sd.creativite.score) / 2) + b.art_bonus;
    }
    sd.initiative       = sd.agilite.score + sd.perception.score + sd.bonusCorps + b.initiative_bonus;
    sd.initMagique      = sd.initiative + 10;
    sd.defenseNaturelle = sd.agilite.score + sd.bonusCorps;
    sd.noirceur         = Math.floor(sd.tenebres / 10);
    // Stockage des bonus d'avantages sur les stats dérivées (transient, pour affichage dans les tooltips)
    sd.avantageInitiativeBonus = b.initiative_bonus;
    sd.avantageArtBonus        = b.art_bonus;
    sd.avantageEmpriseBonus    = b.emprise_bonus;

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
    const compEsquive  = this.items.find(i => i.type === "competence" && i.name === "Esquive");
    const scoreEsquive = compEsquive?.system.score ?? 0;
    sd.esquiveCompScore = scoreEsquive; // transient — pour les tooltips
    sd.esquiveTotal    = sd.agilite.score + scoreEsquive + sd.bonusCorps;
    sd.esquiveDistance = Math.round((sd.agilite.score + scoreEsquive) / 2);

    const compDemono       = this.items.find(i => i.type === "competence" && i.name === "Démonologie");
    const scoreDemono      = compDemono?.system.score ?? 0;
    sd.aptitudeConjuration = sd.noirceur + scoreDemono + sd.bonusAme;

    const compArts          = this.items.find(i => i.type === "competence" && i.name === "Arts Magiques");
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
      ? (sd.armure?._malusAgiActif ?? 0) + (sd.bouclier?._malusAgiActif ?? 0) : 0;
    const malusBlessure = sd.malusBlessureGrave ?? 0;

    const roll = new Roll(
      "1d10x10 + @base + @malus + @modif",
      { base: baseScore, malus: malusArmure + (sd.malusSurcharge ?? 0) + malusBlessure, modif: modif + bonusSaisonin }
    );
    await roll.evaluate();
    await this._sendRollToChat(roll, label, {
      base:   `${label} x2 : ${attrScore * 2}`,
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
      ? (sd.armure?._malusAgiActif ?? 0) + (sd.bouclier?._malusAgiActif ?? 0) : 0;
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
      ...(bonusSaisonin > 0 ? { saisonin: `Bonus Saisonin : +${bonusSaisonin}` } : {}),
      ...(compData.notes    ? { notes:    compData.notes } : {})
    });
    return roll;
  }

  // Jet d'une compétence non acquise (score 0, malus -3 automatique)
  async rollCompetenceSansItem(nom, attributLie, domaine) {
    const sd     = this.system;
    const attrKey = attributLie ?? "agilite"; // défaut pour la présélection dans le dialog

    const label = nom;

    // Construire les options du sélecteur d'attribut
    const attrOptions = Object.entries(CONFIG.AGONE.attributs)
      .map(([key, cfg]) => {
        const score = sd[key]?.score ?? 0;
        const locLabel = game.i18n.localize(cfg.label ?? key);
        const selected = key === attrKey ? "selected" : "";
        return `<option value="${key}" ${selected}>${locLabel} (${cfg.abbr}) : ${score}</option>`;
      })
      .join("");

    const result = await foundry.applications.api.DialogV2.wait({
      window:  { title: label },
      content: `
        <form>
          <div class="agone-roll-dialog">
            <p><strong>${label}</strong></p>
            <div class="form-group">
              <label>${game.i18n.localize("AGONE.AttributLie")}</label>
              <select id="attrChosen" name="attrChosen">${attrOptions}</select>
            </div>
            <div class="form-group">
              <label>${game.i18n.localize("AGONE.BonusMalus")}</label>
              <input type="number" id="modif" name="modif" value="0" autofocus/>
            </div>
            <div class="form-group form-check">
              <input type="checkbox" id="typeJet" name="typeJet" checked />
              <label for="typeJet">${game.i18n.localize("AGONE.JetOuvert")}</label>
            </div>
          </div>
        </form>
      `,
      buttons: [
        {
          action:  "lancer",
          icon:    "fas fa-dice-d10",
          label:   game.i18n.localize("AGONE.Lancer"),
          default: true,
          callback: (event, button) => ({
            attrChosen: button.form.elements.attrChosen.value,
            modif:      parseInt(button.form.elements.modif.value) || 0,
            type:       button.form.elements.typeJet.checked ? "ouvert" : "ferme",
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
    this._lastRollType = result.type;
    this._lastBonusSpe = 0;

    const chosenKey = result.attrChosen ?? attrKey;
    const chosenScore = sd[chosenKey]?.score ?? 0;
    const chosenCfg   = CONFIG.AGONE.attributs[chosenKey] ?? {};
    const modif = result.modif;

    let bonusAspect = 0;
    if (chosenCfg.aspect === "corps")  bonusAspect = sd.bonusCorps  ?? 0;
    if (chosenCfg.aspect === "esprit") bonusAspect = sd.bonusEsprit ?? 0;
    if (chosenCfg.aspect === "ame")    bonusAspect = sd.bonusAme    ?? 0;

    const bonusSaisonin = this._getBonusSaisonin();
    const malusArmure = (chosenKey === "agilite" || chosenKey === "perception")
      ? (sd.armure?._malusAgiActif ?? 0) + (sd.bouclier?._malusAgiActif ?? 0) : 0;
    const malusBlessure = sd.malusBlessureGrave ?? 0;

    const roll = new Roll(
      "1d10x10 + @comp + @attr + @bonus + @modif",
      {
        comp:  0,
        attr:  chosenScore,
        bonus: bonusAspect,
        modif: modif + malusArmure - 3 + (sd.malusSurcharge ?? 0) + malusBlessure + bonusSaisonin
      }
    );
    await roll.evaluate();
    await this._sendRollToChat(roll, label, {
      competence: `${label} : 0 (${game.i18n.localize("AGONE.MalusCompNonApprise")})`,
      attribut:  `${game.i18n.localize(chosenCfg.label ?? chosenKey)} : ${chosenScore}`,
      aspect:    `Bonus d'aspect : ${bonusAspect}`,
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
      const comp = this.items.find(i => i.type === "competence" && i.system.domaine === nomComp);
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
      const comp = this.items.find(i => i.type === "competence" && i.system.domaine === nomComp);
      scoreComp = comp?.system.score ?? 0;
    }

    const defenseBonus = arme.system.defenseBonus ?? 0;
    const bonusCorps   = sd.bonusCorps ?? 0;
    const total = melee + scoreComp + defenseBonus + bonusCorps;

    const label = `${game.i18n.localize("AGONE.Parade")} — ${arme.name}`;
    const modif = await this._dialogModificateur(label);
    if (modif === null) return;

    const bonusSaisonin = this._getBonusSaisonin();
    const malusArmure = (sd.armure?._malusAgiActif ?? 0) + (sd.bouclier?._malusAgiActif ?? 0);
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
    const malusArmure = (sd.armure?._malusAgiActif ?? 0) + (sd.bouclier?._malusAgiActif ?? 0);
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
    const malusArmure = (sd.armure?._malusAgiActif ?? 0) + (sd.bouclier?._malusAgiActif ?? 0);
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
      volonte: `${game.i18n.localize("AGONE.Attribut.Volonte")} x2 : ${volScore * 2}`,
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
    // Intégrer les domaines custom (clé = nom normalisé sans accents + minuscule)
    const _customDomaines = game.settings.get("agone", "domainesArtsCustom") ?? [];
    for (const d of _customDomaines) {
      const key = d.nom?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
      if (key) TYPES_TO_DOMAINE[key] = d.nom;
    }
    const EMPRISE_TYPES = new Set(["jorniste", "obscurantiste", "eclipsiste"]);
    const typeMagie  = sort.system.typeMagie?.trim().toLowerCase() ?? "";
    let typeMagieResolved = typeMagie;
    const compAltNomGuard = sort.system.compAlt?.trim() ?? "";
    if (!compAltNomGuard && typeMagie && !TYPES_TO_DOMAINE[typeMagie] && !EMPRISE_TYPES.has(typeMagie)) {
      const selectedType = await this._promptMagicTypeFallback(typeMagie);
      if (!selectedType) return null;
      typeMagieResolved = selectedType;
    }

    if (!compAltNomGuard) {
      const domaineCible = TYPES_TO_DOMAINE[typeMagieResolved] ?? null;
      const hasArts = this.items.some(i =>
        i.type === "competence" &&
        i.name === "Arts Magiques" &&
        (domaineCible === null ? true : i.system.domaine === domaineCible)
      );
      if (!hasArts) {
        const domainLabel = domaineCible ?? (typeMagieResolved || "ce domaine");
        ui.notifications.warn(`${this.name} ne possède pas Arts Magiques (${domainLabel}) pour lancer ce sort.`);
        return null;
      }
    }

    const seuilBase = sort.system.seuil ?? 0;

    // Aptitude : utilise le score de la compétence "Arts Magiques" du domaine exact du sort
    const domaineCibleApt = TYPES_TO_DOMAINE[typeMagieResolved] ?? null;
    let aptitude;
    let aptitudeDomainLabel;
    if (domaineCibleApt) {
      const compArtsExact = this.items.find(i =>
        i.type === "competence" &&
        i.name === "Arts Magiques" &&
        i.system.domaine === domaineCibleApt
      );
      const scoreExact = compArtsExact?.system.score ?? 0;
      aptitude = (sd.art ?? 0) + scoreExact + (sd.bonusAme ?? 0);
      aptitudeDomainLabel = `Arts Magiques (${domaineCibleApt}) : ${aptitude}`;
    } else {
      // Pas de domaine précis (jorniste / obscurantiste / eclipsiste)
      aptitude = sd.aptitudeArtsMagiques ?? sd.art ?? 0;
      aptitudeDomainLabel = `Arts Magiques : ${aptitude}`;
    }

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
    const dialogResult = await this._dialogSort(label, seuilBase, impro);
    if (dialogResult === null) return;
    const { modif, seuilBonus } = dialogResult;

    const seuilFinal = impro ? (seuilBase + seuilBonus) * 2 : seuilBase + seuilBonus;

    const bonusSaisonin = this._getBonusSaisonin();
    const roll = new Roll(
      "1d10x10 + @aptitude + @modif",
      { aptitude, modif: modif + bonusSaisonin }
    );
    await roll.evaluate();

    const succes = roll.total >= seuilFinal;
    const aptitudeLabel = compAltNom
      ? `${aptitudeDomainLabel.replace(/ : \d+$/, "")} (min avec ${compAltNom}) : ${aptitude}`
      : aptitudeDomainLabel;
    let seuilLabel;
    if (impro && seuilBonus > 0)
      seuilLabel = `Seuil : ${seuilFinal} ((${seuilBase} + ${seuilBonus}) x 2, improvisé)`;
    else if (impro)
      seuilLabel = `Seuil : ${seuilFinal} (${seuilBase} x 2, improvisé)`;
    else if (seuilBonus > 0)
      seuilLabel = `Seuil : ${seuilFinal} (${seuilBase} + ${seuilBonus} augmenté)`;
    else
      seuilLabel = `Seuil : ${seuilFinal}`;
    await this._sendRollToChat(roll, label, {
      aptitude: aptitudeLabel,
      seuil:    seuilLabel,
      resultat: succes ? "✔ Succès" : "✘ Échec",
      modif:    `Bonus/Malus : ${modif}`,
      ...(bonusSaisonin > 0 ? { saisonin: `Bonus Saisonin : +${bonusSaisonin}` } : {})
    }, {
      description: sort.system.description ?? "",
      sortMeta: {
        typeMagie: sort.system.typeMagie ?? "",
        portee:    sort.system.portee    ?? "",
        duree:     sort.system.duree     ?? "",
        danse:     sort.system.danse     ?? "",
      }
    });
    return roll;
  }

  /**
   * Jet de sort d'emprise improvis\u00e9 via un danseur (depuis le browser de sorts).
   * Reprend la logique de _onRollSortDanseur avec s\u00e9uil \u00d7 2.
   */
  async rollSortImproDanseur(danseurId, sortData) {
    const danseur = this.items.get(danseurId);
    if (!danseur) return;

    if ((danseur.system.enduranceActuelle ?? 0) <= 0) {
      ui.notifications.warn(`${danseur.name} n'a plus d'endurance et ne peut pas lancer de sort.`);
      return;
    }

    const sd          = this.system;
    const seuilBase   = sortData.seuil ?? 0;
    const seuil       = seuilBase * 2;
    const label       = `${sortData.name} (improvis\u00e9 via ${danseur.name})`;

    const compDanseurs      = this.items.find(i =>
      i.type === "competence" && i.name.toLowerCase().includes("danseur")
    );
    const scoreConnDanseurs = compDanseurs?.system.score ?? 0;
    const aptitude          = (sd.emprise ?? 0) + scoreConnDanseurs + (sd.bonusEsprit ?? 0);
    const bonusDanseur      = danseur.system.bonusEmprise ?? 0;
    const bonusEsprit       = sd.bonusEsprit ?? 0;
    const endBefore         = danseur.system.enduranceActuelle ?? 0;
    const newEnd            = Math.max(0, endBefore - 1);

    const empSourceLabel = sd.typeMage === "jorniste"      ? `INT (${sd.intelligence?.score ?? 0}) \u2014 Jorniste`
                         : sd.typeMage === "obscurantiste" ? `VOL (${sd.volonte?.score ?? 0}) \u2014 Obscurantiste`
                         : `(INT ${sd.intelligence?.score ?? 0} + VOL ${sd.volonte?.score ?? 0}) / 2 \u2014 \u00c9clipsiste`;

    const modif = await this._dialogModificateur(label);
    if (modif === null) return;

    const roll = new Roll("1d10x10 + @apt + @bd + @modif", {
      apt: aptitude, bd: bonusDanseur, modif,
    });
    await roll.evaluate();

    const succes = roll.total >= seuil;
    await this._sendRollToChat(roll, label, {
      sort:      { label: "Sort",         value: sortData.name },
      seuil:     { label: "Seuil",        value: `${seuil} (${seuilBase} \u00d7 2, improvis\u00e9)` },
      resultat:  { label: "R\u00e9sultat", value: succes ? "\u2714 Succ\u00e8s" : "\u2718 \u00c9chec" },
      danseur:   { label: "Danseur",      value: danseur.name },
      endurance: { label: "Endurance",    value: `${endBefore} \u2192 ${newEnd} / ${danseur.system.enduranceMax ?? 0}` },
      empBase:   { label: "Emprise (base)", value: sd.emprise ?? 0, tooltip: empSourceLabel },
      connDans:  { label: compDanseurs?.name ?? "Conn. Danseurs", value: `+${scoreConnDanseurs}` },
      esprit:    { label: "Bonus Esprit",   value: `+${bonusEsprit}`,
                   tooltip: `Esprit ${sd.esprit?.score ?? 0} \u2212 Esprit Noir ${sd.esprit?.noir ?? 0}` },
      aptTotal:  { label: "Total Emprise",  value: aptitude },
      bonusDans: { label: `Bonus d'Emprise (${danseur.name})`, value: `+${bonusDanseur}` },
      modif:     { label: "Bonus / Malus",  value: modif >= 0 ? `+${modif}` : modif },
    }, {
      description: sortData.description ?? "",
      sortMeta: {
        typeMagie: sortData.typeMagie ?? "",
        portee:    sortData.portee    ?? "",
        duree:     sortData.duree     ?? "",
        danse:     sortData.danse     ?? "",
      }
    });

    await danseur.update({ "system.enduranceActuelle": newEnd });
    return roll;
  }

  async rollImprovisationDanseur(danseurId) {
    const danseur = this.items.get(danseurId);
    if (!danseur) return;

    const sd    = this.system;
    const label = game.i18n.format("AGONE.ImprovisationEmpriseLabel", { nom: danseur.name });

    const cre         = sd.creativite?.score ?? 0;
    const empathie    = danseur.system.empathie ?? 0;
    const bonusEsprit = sd.bonusEsprit ?? 0;
    const aptitude    = cre + empathie + bonusEsprit;
    const endAct      = danseur.system.enduranceActuelle ?? 0;
    const endMax      = danseur.system.enduranceMax     ?? 0;

    const modif = await this._dialogModificateur(label);
    if (modif === null) return;

    const roll = new Roll("1d10x10 + @apt + @modif", { apt: aptitude, modif });
    await roll.evaluate();
    await this._sendRollToChat(roll, label, {
      danseur:   { label: "Danseur",                      value: danseur.name },
      endurance: { label: "Endurance danseur",            value: `${endAct} / ${endMax}` },
      cre:       { label: "Cr\u00e9ativit\u00e9 (CR\u00c9)",              value: cre },
      empathie:  { label: `Empathie (${danseur.name})`,  value: `+${empathie}` },
      esprit:    { label: "Bonus Esprit",                 value: `+${bonusEsprit}`,
                   tooltip: `Esprit ${sd.esprit?.score ?? 0} \u2212 Esprit Noir ${sd.esprit?.noir ?? 0}` },
      aptTotal:  { label: "Total Improvisation",          value: aptitude },
      modif:     { label: "Bonus / Malus",                value: modif >= 0 ? `+${modif}` : modif },
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
   * Ouvre un DialogV2 comme enfant de la fiche active (suit le pop-out parent).
   * Fallback sur DialogV2.wait si aucune fiche rendue.
   */
  async _renderChildDialog(options) {
    const sheet = Object.values(this.apps || {}).find(a => a.rendered);
    if (!sheet) return foundry.applications.api.DialogV2.wait(options);
    return new Promise(resolve => {
      let settled = false;
      const settle = (v) => { if (!settled) { settled = true; resolve(v); } };
      const buttons = (options.buttons ?? []).map(btn => ({
        ...btn,
        callback: (event, button, dialog) => {
          const result = btn.callback?.(event, button, dialog) ?? btn.action;
          settle(result);
          return result;
        },
      }));
      const dialog = new foundry.applications.api.DialogV2({ ...options, buttons });
      dialog.addEventListener("close", () => settle(null), { once: true });
      sheet.renderChild(dialog);
    });
  }

  /**
   * Affiche un dialog spécialisé pour le lancer de sort avec bonus/malus et augmentation du seuil.
   * @param {string} label     - Titre du dialog
   * @param {number} seuilBase - Seuil de base du sort (affiché à titre indicatif)
   * @param {boolean} impro    - Si vrai, le seuil sera doublé
   * @returns {Promise<{modif: number, seuilBonus: number}|null>}
   */
  async _dialogSort(label, seuilBase = 0, impro = false) {
    const seuilInfo = impro
      ? `${seuilBase} × 2 = ${seuilBase * 2} (improvisé)`
      : `${seuilBase}`;

    const result = await this._renderChildDialog({
      window:  { title: label },
      content: `
        <form>
          <div class="agone-roll-dialog">
            <p><strong>${label}</strong></p>
            <div class="form-group">
              <label>${game.i18n.localize("AGONE.BonusMalus")}</label>
              <input type="number" id="modif" name="modif" value="0" autofocus/>
            </div>
            <div class="form-group">
              <label>${game.i18n.localize("AGONE.AugmentationSeuil")} <em>(base : ${seuilInfo})</em></label>
              <input type="number" id="seuilBonus" name="seuilBonus" value="0" min="0"/>
            </div>
            <div class="form-group form-check">
              <input type="checkbox" id="typeJet" name="typeJet" checked />
              <label for="typeJet">${game.i18n.localize("AGONE.JetOuvert")}</label>
            </div>
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
            modif:      parseInt(button.form.elements.modif.value)      || 0,
            seuilBonus: parseInt(button.form.elements.seuilBonus.value) || 0,
            type:       button.form.elements.typeJet.checked ? "ouvert" : "ferme",
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
    this._lastRollType = result.type;
    this._lastBonusSpe = 0;
    return { modif: result.modif, seuilBonus: Math.max(0, result.seuilBonus) };
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

    const result = await this._renderChildDialog({
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

  async _promptMagicTypeFallback(unknownType) {
    const normalize = (value) => value
      ?.toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase() ?? "";

    const domaineToType = {
      accord: "accord",
      cyse: "cyse",
      decorum: "decorum",
      geste: "geste",
    };

    const labelByType = {
      jorniste: game.i18n.localize("AGONE.Jorniste"),
      obscurantiste: game.i18n.localize("AGONE.Obscurantiste"),
      eclipsiste: game.i18n.localize("AGONE.Eclipsiste"),
      accord: game.i18n.localize("AGONE.Accord"),
      cyse: game.i18n.localize("AGONE.Cyse"),
      decorum: game.i18n.localize("AGONE.Decorum"),
      geste: game.i18n.localize("AGONE.Geste"),
    };

    const options = [];
    const added = new Set();
    const addOption = (type) => {
      if (!type || added.has(type)) return;
      added.add(type);
      options.push({ value: type, label: labelByType[type] ?? type });
    };

    const typeMage = (this.system?.typeMage ?? "").trim().toLowerCase();
    if (["jorniste", "obscurantiste", "eclipsiste"].includes(typeMage)) addOption(typeMage);

    this.items
      .filter(i => i.type === "competence" && i.name === "Arts Magiques")
      .forEach(i => {
        const domaineKey = normalize(i.system?.domaine);
        addOption(domaineToType[domaineKey]);
      });

    if (!options.length) {
      ui.notifications.warn(game.i18n.localize("AGONE.AucunTypeMagieDisponible"));
      return null;
    }

    const optionsHtml = options.map(o => `<option value="${o.value}">${o.label}</option>`).join("");
    const result = await foundry.applications.api.DialogV2.wait({
      window: { title: game.i18n.localize("AGONE.ChoisirTypeMagie") },
      content: `
        <form>
          <div class="agone-roll-dialog">
            <p>${game.i18n.format("AGONE.TypeMagieInconnu", { type: unknownType })}</p>
            <div class="form-group">
              <label>${game.i18n.localize("AGONE.TypeMagie")}</label>
              <select name="typeMagie">${optionsHtml}</select>
            </div>
          </div>
        </form>
      `,
      buttons: [
        {
          action: "ok",
          icon: "fas fa-check",
          label: game.i18n.localize("AGONE.Confirmer"),
          default: true,
          callback: (_event, button) => button.form.elements.typeMagie.value,
        },
        {
          action: "cancel",
          icon: "fas fa-times",
          label: game.i18n.localize("AGONE.Annuler"),
        },
      ],
      rejectClose: false,
    });

    if (!result || typeof result !== "string") return null;
    return result;
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
    // Extraire resultat et seuil pour les afficher en permanence
    const _resultat = details.resultat ?? null;
    const _seuil    = details.seuil    ?? null;
    const _filtered = Object.entries(details)
      .filter(([k]) => k !== "resultat" && k !== "seuil")
      .map(([, v]) => v);
    const detailsArr = [
      { label: diceLabel, value: diceResult },
      ...(_seuil    ? [typeof _seuil    === "object" ? _seuil    : { label: "Seuil",    value: _seuil    }] : []),
      ..._filtered.map(v => {
        if (typeof v === "object" && v !== null) return v;
        const idx = v.lastIndexOf(" : ");
        return idx !== -1
          ? { label: v.slice(0, idx), value: v.slice(idx + 3) }
          : { label: v, value: "" };
      })
    ];

    // Résultat succès/échec (affiché hors details)
    const resultatLabel = _resultat
      ? (typeof _resultat === "object" ? _resultat.value : _resultat)
      : null;
    const seuilValue = _seuil
      ? (typeof _seuil === "object" ? _seuil.value : _seuil)
      : null;

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
        resultat:      resultatLabel,
        seuil:         seuilValue,
        isFumble,
        fumblePenalty,
        fumbleTotal:   finalRoll.total - fumblePenalty,
        isMegaFumble,
        isCritique,
        actorId:       this.id,
        arme:          extra.arme ?? null,
        typeJetCombat: extra.typeJet ?? null,
        description:   extra.description || null,
        sortMeta:      extra.sortMeta     || null
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
