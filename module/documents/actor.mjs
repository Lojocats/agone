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
    return super._preUpdate(changed, options, user);
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
      }
    }
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

    const malusArmure = (attributKey === "agilite" || attributKey === "perception")
      ? (sd.armure?._malusAgiActif ?? 0) : 0;

    const roll = new Roll(
      "1d10x10 + @base + @malus + @modif",
      { base: baseScore, malus: malusArmure + (sd.malusSurcharge ?? 0), modif }
    );
    await roll.evaluate();
    await this._sendRollToChat(roll, label, {
      base: `${label} ×2 : ${attrScore * 2}`,
      aspect: `Bonus d'aspect : ${bonusAspect}`,
      modif: `Bonus/Malus : ${modif + malusArmure + (sd.malusSurcharge ?? 0)}`
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

    const bonusSpe    = this._lastBonusSpe ?? 0;
    const malusComp0  = compScore === 0 ? -3 : 0;
    const malusArmure = (attrKey === "agilite" || attrKey === "perception")
      ? (sd.armure?._malusAgiActif ?? 0) : 0;

    const roll = new Roll(
      "1d10x10 + @comp + @attr + @bonus + @modif",
      {
        comp: compScore,
        attr: attrScore,
        bonus: bonusAspect + bonusSpe,
        modif: modif + malusArmure + malusComp0 + (sd.malusSurcharge ?? 0)
      }
    );
    await roll.evaluate();
    await this._sendRollToChat(roll, label, {
      competence: `${label} : ${compScore}${compScore === 0 ? ` (${game.i18n.localize("AGONE.MalusCompNonApprise")})` : ""}`,
      attribut:  `${game.i18n.localize(attrConfig.label ?? attrKey)} : ${attrScore}`,
      aspect:    `Bonus d'aspect : ${bonusAspect}${bonusSpe ? ` + Spécialité : +${bonusSpe}` : ""}`,
      modif:     `Bonus/Malus : ${modif + malusArmure + malusComp0 + (sd.malusSurcharge ?? 0)}`
    });
    return roll;
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

    const roll = new Roll(
      "1d10 + @base + @modif",
      { base, modif: modif + (sd.malusSurcharge ?? 0) }
    );
    await roll.evaluate();
    await this._sendRollToChat(roll, label, {
      base:  `Initiative : ${base}`,
      modif: `Bonus/Malus : ${modif + (sd.malusSurcharge ?? 0)}`
    });

    // Envoyer au tracker d'initiative
    const combatant = this.combatant;
    if (combatant) {
      await combatant.update({ initiative: roll.total });
    }
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

    const roll = new Roll(
      "1d10x10 + @total + @modif",
      { total, modif: modif + (sd.malusSurcharge ?? 0) }
    );
    await roll.evaluate();
    await this._sendRollToChat(roll, label, {
      style:     `${style === "trait" ? "TIR" : "MÊL"} : ${baseAttack}`,
      competence:`Compétence : ${scoreComp}`,
      arme:      `Bonus arme : ${attackBonus}`,
      aspect:    `Bonus Corps : ${bonusCorps}`,
      modif:     `Bonus/Malus : ${modif + (sd.malusSurcharge ?? 0)}`
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

    const malusArmure = sd.armure?._malusAgiActif ?? 0;
    const roll = new Roll(
      "1d10x10 + @total + @modif",
      { total, modif: modif + malusArmure + (sd.malusSurcharge ?? 0) }
    );
    await roll.evaluate();
    await this._sendRollToChat(roll, label, {
      melee:     `MÊL : ${melee}`,
      competence:`Compétence : ${scoreComp}`,
      arme:      `Bonus arme : ${defenseBonus}`,
      aspect:    `Bonus Corps : ${bonusCorps}`,
      modif:     `Bonus/Malus : ${modif + malusArmure + (sd.malusSurcharge ?? 0)}`
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

    const malusArmure = sd.armure?._malusAgiActif ?? 0;
    const roll = new Roll(
      "1d10x10 + @total + @modif",
      { total, modif: modif + malusArmure + (sd.malusSurcharge ?? 0) }
    );
    await roll.evaluate();
    await this._sendRollToChat(roll, label, {
      base:  `Esquive : ${total}`,
      modif: `Bonus/Malus : ${modif + malusArmure + (sd.malusSurcharge ?? 0)}`
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

    const malusArmure = sd.armure?._malusAgiActif ?? 0;
    const roll = new Roll(
      "1d10x10 + @total + @modif",
      { total, modif: modif + malusArmure + (sd.malusSurcharge ?? 0) }
    );
    await roll.evaluate();
    await this._sendRollToChat(roll, label, {
      base:  `Défense Naturelle : ${total}`,
      modif: `Bonus/Malus : ${modif + malusArmure + (sd.malusSurcharge ?? 0)}`
    });
    return roll;
  }

  /**
   * Jet de Fumble : 1d10 fermé → pénalité à soustraire du jet raté
   */
  async rollFumble() {
    const label = game.i18n.localize("AGONE.Fumble");
    const roll = new Roll("1d10");
    await roll.evaluate();

    const content = await renderTemplate(
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
      type:  CONST.CHAT_MESSAGE_TYPES?.ROLL ?? 5,
      rolls: [roll]
    });
    return roll;
  }

  /**
   * Jet de sort / magie
   */
  async rollSort(itemId) {
    const sd = this.system;
    const sort = this.items.get(itemId);
    if (!sort || sort.type !== "sort") return;

    const seuil = sort.system.seuil ?? 0;
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

    const label = sort.name;
    const modif = await this._dialogModificateur(label);
    if (modif === null) return;

    const roll = new Roll(
      "1d10x10 + @aptitude + @modif",
      { aptitude, modif }
    );
    await roll.evaluate();

    const succes = roll.total >= seuil;
    const aptitudeLabel = compAltNom
      ? `Arts Magiques (min avec ${compAltNom}) : ${aptitude}`
      : `Arts Magiques : ${aptitude}`;
    await this._sendRollToChat(roll, label, {
      aptitude: aptitudeLabel,
      seuil:    `Seuil : ${seuil}`,
      resultat: succes ? "✔ Succès" : "✘ Échec",
      modif:    `Bonus/Malus : ${modif}`
    });
    return roll;
  }

  // ==============================
  // Private helpers
  // ==============================

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
    return new Promise((resolve) => {
      new Dialog({
        title: label,
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
        buttons: {
          lancer: {
            icon: '<i class="fas fa-dice-d10"></i>',
            label: game.i18n.localize("AGONE.Lancer"),
            callback: (html) => {
              const modif    = parseInt(html.find("#modif").val()) || 0;
              const type     = html.find("#typeJet").prop("checked") ? "ouvert" : "ferme";
              const bonusSpe = specialite && html.find("#bonusSpe").prop("checked") ? 1 : 0;
              resolve({ modif, type, bonusSpe });
            }
          },
          annuler: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize("AGONE.Annuler"),
            callback: () => resolve(null)
          }
        },
        default: "lancer",
        close: () => resolve(null)
      }).render(true);
    }).then(result => {
      if (!result) return null;
      // Mémoriser le type de jet et le bonus spécialité pour les callers
      this._lastRollType = result.type;
      this._lastBonusSpe = result.bonusSpe ?? 0;
      return result.modif;
    });
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

    const content = await renderTemplate(
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
      type:  CONST.CHAT_MESSAGE_TYPES?.ROLL ?? 5,
      rolls: [finalRoll]
    });
    return finalRoll;
  }
}
