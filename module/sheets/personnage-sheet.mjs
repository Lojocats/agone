/**
 * Feuille de personnage Agone (Personnage Joueur)
 * Utilise l'API ActorSheet standard (compatible v12/v13)
 */
export class PersonnageSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["agone", "sheet", "actor", "personnage"],
      template: "systems/agone/templates/actors/personnage-sheet.hbs",
      width: 870,
      height: 800,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "attributs" }],
      scrollY: [".sheet-body"],
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }]
    });
  }

  /** @override */
  async getData(options = {}) {
    const context = await super.getData(options);
    const actor    = this.actor;
    const system   = actor.system;

    context.system    = system;
    context.actor     = actor;
    context.isOwner   = actor.isOwner;
    context.isGM      = game.user.isGM;

    // Tri des items par type
    context.competences = actor.items.filter(i => i.type === "competence")
      .sort((a, b) => a.name.localeCompare(b.name));
    context.armes        = actor.items.filter(i => i.type === "arme");
    context.armures      = actor.items.filter(i => i.type === "armure");
    context.dons         = actor.items.filter(i => i.type === "don" && i.system.categorie === "avantage");
    context.defauts      = actor.items.filter(i => i.type === "don" && i.system.categorie === "defaut");
    context.sorts        = actor.items.filter(i => i.type === "sort");
    context.equipements  = actor.items.filter(i => i.type === "equipement");
    context.pouvoirs     = actor.items.filter(i => i.type === "pouvoir");
    context.manoeuvres   = actor.items.filter(i => i.type === "manoeuvre");

    // Enrichissement de la description HTML
    context.descriptionHTML = await TextEditor.enrichHTML(
      system.description ?? "", { async: true, secrets: actor.isOwner }
    );

    // Config pour les selects
    context.peuples   = Object.entries(CONFIG.AGONE.peuples).map(([k, v]) => ({
      value: k, label: game.i18n.localize(v)
    }));
    context.attributsConfig = CONFIG.AGONE.attributs;
    context.typsArme  = CONFIG.AGONE.typesArme;
    context.competencesListe = CONFIG.AGONE.competences;

    // Coûts XP pour la montée de niveau (multiplicateurs, après création)
    const m   = CONFIG.AGONE.xpMultipliers ?? { aspect: 7, carac: 5, competence: 5 };
    const tbl = CONFIG.AGONE.tableAchatCreation ?? [0, 1, 2, 3, 4, 5, 7, 10, 14, 19, 25];
    // Coût incrémental selon la table d'achat création : utilise le score BRUT (hors bonus racial)
    // rawScore = score stocké − bonus positif appliqué. Indice dans la table = niveau brut actuel.
    const creaDelta = (rawScore) => rawScore + 1 < tbl.length ? tbl[rawScore + 1] : null;
    const posBonus  = (k) => system.peupleBonusApplique?.[`${k}Bonus`] ?? 0;
    const rawCarac  = (k) => Math.max(0, system[k].score - posBonus(k));

    context.xpCout = {
      corps:        (system.corps.score        + 1) * m.aspect,
      esprit:       (system.esprit.score       + 1) * m.aspect,
      ame:          (system.ame.score          + 1) * m.aspect,
      agilite:      (system.agilite.score      + 1) * m.carac,
      force:        (system.force.score        + 1) * m.carac,
      perception:   (system.perception.score   + 1) * m.carac,
      resistance:   (system.resistance.score   + 1) * m.carac,
      intelligence: (system.intelligence.score + 1) * m.carac,
      volonte:      (system.volonte.score      + 1) * m.carac,
      charisma:     (system.charisma.score     + 1) * m.carac,
      creativite:   (system.creativite.score   + 1) * m.carac,
    };
    context.creaCout = {
      corps:        creaDelta(system.corps.score),
      esprit:       creaDelta(system.esprit.score),
      ame:          creaDelta(system.ame.score),
      agilite:      creaDelta(rawCarac('agilite')),
      force:        creaDelta(rawCarac('force')),
      perception:   creaDelta(rawCarac('perception')),
      resistance:   creaDelta(rawCarac('resistance')),
      intelligence: creaDelta(rawCarac('intelligence')),
      volonte:      creaDelta(rawCarac('volonte')),
      charisma:     creaDelta(rawCarac('charisma')),
      creativite:   creaDelta(rawCarac('creativite')),
    };
    for (const c of context.competences) {
      c.xpCout  = (c.system.score + 1) * m.competence;
      c.creaCout = creaDelta(c.system.score);
    }

    // Valeur affichée sur les boutons : table d'achat en création, multiplicateurs après
    const src = system.modeCreation ? context.creaCout : context.xpCout;
    context.coutAffiche = {
      corps:        src.corps,
      esprit:       src.esprit,
      ame:          src.ame,
      agilite:      src.agilite,
      force:        src.force,
      perception:   src.perception,
      resistance:   src.resistance,
      intelligence: src.intelligence,
      volonte:      src.volonte,
      charisma:     src.charisma,
      creativite:   src.creativite,
    };
    for (const c of context.competences)
      c.coutAffiche = system.modeCreation ? c.creaCout : c.xpCout;

    // Points de création restants (valeur décroissante)
    context.ptsCreationCaracRestant = system.ptsCreationCarac.max - system.ptsCreationCarac.depense;
    context.ptsCreationCompRestant  = system.ptsCreationComp.max  - system.ptsCreationComp.depense;
    context.modeCreation = system.modeCreation;

    // BPdV de la race (pour affichage dans la formule PdV)
    const peupleKey = CONFIG.AGONE?.peupleNomVersKey?.[system.peuple] ?? "humain";
    const peupleData = CONFIG.AGONE?.peuplesData?.[peupleKey] ?? CONFIG.AGONE?.peuplesData?.humain;
    context.bpdv = peupleData?.bpdv ?? 25;

    // Min/Max raciaux par carac — seuils sur score BRUT (hors bonus racial)
    const caracsKeys = ['agilite', 'force', 'perception', 'resistance', 'intelligence', 'volonte', 'charisma', 'creativite'];
    const caracAtMax      = {};
    const caracBelowMin   = {};
    const caracEffectiveMax = {}; // max final affiché = raceMax + bonusAppliqué
    for (const k of caracsKeys) {
      const bonus    = system.peupleBonusApplique?.[`${k}Bonus`] ?? 0;
      const rawScore = system[k].score - bonus;
      const raceMax  = peupleData?.[`${k}Max`] ?? null;
      caracAtMax[k]         = raceMax !== null && rawScore >= raceMax;
      caracBelowMin[k]      = system.modeCreation && (peupleData?.[`${k}Min`] ?? null) !== null && rawScore < peupleData[`${k}Min`];
      caracEffectiveMax[k]  = raceMax !== null ? raceMax + bonus : null;
    }
    context.caracAtMax        = caracAtMax;
    context.caracBelowMin     = caracBelowMin;
    context.caracEffectiveMax = caracEffectiveMax;

    return context;
  }

  /** @override */
  async _onSubmit(event, options = {}) {
    // Convertir les inputs type="number" vides en "0" avant que FormDataExtended
    // ne les lise comme NaN (valueAsNumber d'un champ vide = NaN).
    if (this.form) {
      this.form.querySelectorAll("input[type='number']").forEach(el => {
        if (el.value === "" || isNaN(Number(el.value))) el.value = "0";
      });
    }
    return super._onSubmit(event, options);
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Sections dépliables
    html.find(".section-toggle").click(this._onToggleSection.bind(this));

    if (!this.isEditable) return;

    // Items — créer / éditer / supprimer
    html.find(".item-create").click(this._onItemCreate.bind(this));
    html.find(".item-edit").click(this._onItemEdit.bind(this));
    html.find(".item-delete").click(this._onItemDelete.bind(this));
    html.find(".item-send-chat").click(this._onItemSendChat.bind(this));

    // Jets de dés — Attributs
    html.find("[data-action='rollAttribut']").click(this._onRollAttribut.bind(this));

    // Jets de dés — Compétences
    html.find("[data-action='rollCompetence']").click(this._onRollCompetence.bind(this));

    // Jets de dés — Combat
    html.find("[data-action='rollInitiative']").click(this._onRollInitiative.bind(this));
    html.find("[data-action='rollAttaque']").click(this._onRollAttaque.bind(this));
    html.find("[data-action='rollParade']").click(this._onRollParade.bind(this));
    html.find("[data-action='rollEsquive']").click(this._onRollEsquive.bind(this));
    html.find("[data-action='rollDefenseNaturelle']").click(this._onRollDefenseNaturelle.bind(this));
    html.find("[data-action='rollFumble']").click(this._onRollFumble.bind(this));
    html.find("[data-action='rollBonusDe']").click(this._onRollBonusDe.bind(this));

    // Jets de dés — Sorts & Magie
    html.find("[data-action='rollSort']").click(this._onRollSort.bind(this));
    html.find("[data-action='rollAptitudeMagie']").click(this._onRollAptitudeMagie.bind(this));
    html.find("[data-action='rollAptitudeConjuration']").click(this._onRollAptitudeConjuration.bind(this));

    // Ouvrir le compendium de compétences / peuples
    html.find(".compendium-browse").click(this._onBrowseCompendium.bind(this));

    // Retirer le peuple actuel
    html.find(".peuple-clear").click(this._onClearPeuple.bind(this));

    // Envoyer un item en chat
    html.find("[data-action='rollItemChat']").click(this._onItemSendChat.bind(this));

    // Édition inline (quantité équipement, etc.)
    html.find(".inline-edit").change(this._onInlineEdit.bind(this));

    // Armure portée — clic sur checkbox d'item
    html.find(".armure-portee").change(this._onArmureItemPorteeChange.bind(this));

    // Armure portée — calcul auto
    html.find("[name='system.armure.portee']").change(this._onArmurePorteeChange.bind(this));
    html.find("[name='system.armure.malusAgi']").change(this._onArmureMalusChange.bind(this));
    html.find("[name='system.armure.type']").change(this._onArmureMalusChange.bind(this));

    // Montée de niveau (dépense XP)
    html.find("[data-action='levelUp']").click(this._onLevelUp.bind(this));

    // Mode création — toggle, resets locaux et validation
    html.find("[data-action='toggleCreation']").click(this._onToggleCreation.bind(this));
    html.find("[data-action='resetCaracs']").click(this._onResetCaracs.bind(this));
    html.find("[data-action='resetComps']").click(this._onResetComps.bind(this));
    html.find("[data-action='validerCreation']").click(this._onValiderCreation.bind(this));

    // Drag & drop inline items
    html.find(".item-drag").each((i, li) => {
      li.setAttribute("draggable", true);
      li.addEventListener("dragstart", this._onDragStart.bind(this));
    });
  }

  // ==============================
  // Sections dépliables
  // ==============================
  _onToggleSection(event) {
    event.preventDefault();
    const btn = event.currentTarget;
    const section = btn.closest(".agone-section");
    if (!section) return;
    const content = section.querySelector(".section-content");
    if (!content) return;
    const isOpen = !section.classList.contains("collapsed");
    section.classList.toggle("collapsed", isOpen);
    btn.querySelector("i")?.classList.toggle("fa-chevron-down", isOpen);
    btn.querySelector("i")?.classList.toggle("fa-chevron-right", !isOpen);
  }

  // ==============================
  // Gestion des Items
  // ==============================
  async _onItemCreate(event) {
    event.preventDefault();
    const btn  = event.currentTarget;
    const type = btn.dataset.type;
    const name = game.i18n.localize(`AGONE.Nouvel${type.charAt(0).toUpperCase() + type.slice(1)}`);
    const itemData = { name, type, system: {} };
    return await Item.create(itemData, { parent: this.actor });
  }

  _onItemEdit(event) {
    event.preventDefault();
    const li   = event.currentTarget.closest("[data-item-id]");
    const item = this.actor.items.get(li.dataset.itemId);
    item?.sheet.render(true);
  }

  async _onItemDelete(event) {
    event.preventDefault();
    const li   = event.currentTarget.closest("[data-item-id]");
    const item = this.actor.items.get(li.dataset.itemId);
    if (!item) return;
    const confirmed = await Dialog.confirm({
      title: game.i18n.localize("AGONE.Supprimer"),
      content: `<p>${game.i18n.format("AGONE.ConfirmationSuppression", { nom: item.name })}</p>`
    });
    if (confirmed) await item.delete();
  }

  async _onItemSendChat(event) {
    event.preventDefault();
    const li   = event.currentTarget.closest("[data-item-id]");
    const item = this.actor.items.get(li.dataset.itemId);
    item?.toChat?.();
  }

  // ==============================
  // Jets de dés
  // ==============================
  async _onRollAttribut(event) {
    event.preventDefault();
    const attrKey = event.currentTarget.dataset.carac;
    await this.actor.rollAttribut(attrKey);
  }

  async _onRollCompetence(event) {
    event.preventDefault();
    const li     = event.currentTarget.closest("[data-item-id]");
    const itemId = li?.dataset.itemId ?? event.currentTarget.dataset.itemId;
    await this.actor.rollCompetence(itemId);
  }

  async _onRollInitiative(event) {
    event.preventDefault();
    const armeId = event.currentTarget.dataset.armeId ?? null;
    await this.actor.rollInitiative(armeId);
  }

  async _onRollAttaque(event) {
    event.preventDefault();
    const li     = event.currentTarget.closest("[data-item-id]");
    const armeId = li?.dataset.itemId ?? event.currentTarget.dataset.armeId;
    await this.actor.rollAttaque(armeId);
  }

  async _onRollParade(event) {
    event.preventDefault();
    const li     = event.currentTarget.closest("[data-item-id]");
    const armeId = li?.dataset.itemId ?? event.currentTarget.dataset.armeId;
    await this.actor.rollParade(armeId);
  }

  async _onRollEsquive(event) {
    event.preventDefault();
    await this.actor.rollEsquive();
  }

  async _onRollDefenseNaturelle(event) {
    event.preventDefault();
    await this.actor.rollDefenseNaturelle();
  }

  async _onRollFumble(event) {
    event.preventDefault();
    await this.actor.rollFumble();
  }

  async _onRollBonusDe(event) {
    event.preventDefault();
    const roll = await new Roll("1d10").evaluate();
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor:  game.i18n.localize("AGONE.BonusDePdvFlavor")
    });
    await this.actor.update({ "system.pdv.bonusDe": roll.total });
  }

  async _onRollSort(event) {
    event.preventDefault();
    const li     = event.currentTarget.closest("[data-item-id]");
    const itemId = li?.dataset.itemId ?? event.currentTarget.dataset.itemId;
    await this.actor.rollSort(itemId);
  }

  async _onRollAptitudeMagie(event) {
    event.preventDefault();
    // Roll arts magiques : aptitudeArtsMagiques
    const sd = this.actor.system;
    const label = game.i18n.localize("AGONE.AptitudeArtsMagiques");
    const modif = await this.actor._dialogModificateur(label);
    if (modif === null) return;
    const roll = new Roll("1d10x10 + @apt + @modif", { apt: sd.aptitudeArtsMagiques ?? 0, modif });
    await roll.evaluate();
    await this.actor._sendRollToChat(roll, label, {
      aptitude: `${label} : ${sd.aptitudeArtsMagiques ?? 0}`,
      modif: `Bonus/Malus : ${modif}`
    });
  }

  async _onRollAptitudeConjuration(event) {
    event.preventDefault();
    const sd = this.actor.system;
    const label = game.i18n.localize("AGONE.AptitudeConjuration");
    const modif = await this.actor._dialogModificateur(label);
    if (modif === null) return;
    const roll = new Roll("1d10x10 + @apt + @modif", { apt: sd.aptitudeConjuration ?? 0, modif });
    await roll.evaluate();
    await this.actor._sendRollToChat(roll, label, {
      aptitude: `${label} : ${sd.aptitudeConjuration ?? 0}`,
      modif: `Bonus/Malus : ${modif}`
    });
  }

  // ==============================
  // Calcul automatique armure
  // ==============================
  async _onArmureItemPorteeChange(event) {
    event.preventDefault();
    const el     = event.currentTarget;
    const itemId = el.dataset.itemId;
    const portee = el.checked;

    // Dé-équiper toutes les armures d'abord
    const updateBatch = this.actor.items
      .filter(i => i.type === "armure")
      .map(i => ({ _id: i.id, "system.portee": i.id === itemId ? portee : false }));
    await this.actor.updateEmbeddedDocuments("Item", updateBatch);

    // Synchroniser les stats d'armure de l'acteur
    if (portee) {
      const item = this.actor.items.get(itemId);
      if (item) {
        await this.actor.update({
          "system.armure.portee":     true,
          "system.armure.nom":        item.name,
          "system.armure.type":       item.system.type,
          "system.armure.protection": item.system.protection,
          "system.armure.malusAgi":   item.system.malusAgi,
          "system.armure.malusPer":   item.system.malusPer
        });
      }
    } else {
      await this.actor.update({
        "system.armure.portee":     false,
        "system.armure.nom":        "",
        "system.armure.protection": 0,
        "system.armure.malusAgi":   0,
        "system.armure.malusPer":   0
      });
    }
  }

  async _onArmurePorteeChange(event) {
    const portee = event.currentTarget.checked;
    if (!portee) {
      await this.actor.update({
        "system.armure.portee": false
      });
    }
  }

  async _onArmureMalusChange(event) {
    // Déclenche la mise à jour pour recalculer malusPer
    const form = this.element.find("form");
    const malusAgi = parseInt(form.find("[name='system.armure.malusAgi']").val()) || 0;
    const type     = form.find("[name='system.armure.type']").val();
    let malusPer = 0;
    if (type === "1") malusPer = Math.floor(malusAgi / 2);
    if (type === "2") malusPer = malusAgi;
    await this.actor.update({ "system.armure.malusPer": malusPer });
  }

  // ==============================
  // Compendium
  // ==============================
  async _onBrowseCompendium(event) {
    event.preventDefault();
    const packId = event.currentTarget.dataset.pack ?? "agone.competences";
    const pack = game.packs.get(packId);
    if (!pack) return ui.notifications?.warn(game.i18n.localize("AGONE.CompendiumIntrouvable"));
    pack.render(true);
  }

  async _onClearPeuple(event) {
    event.preventDefault();
    const sd  = this.actor.system;
    const old = sd.peupleBonusApplique ?? {};

    // Supprimer les compétences raciales de l'ancien peuple
    const oldCompIds = (sd.peupleCompetenceIds ?? []).filter(id => this.actor.items.has(id));
    if (oldCompIds.length) await this.actor.deleteEmbeddedDocuments("Item", oldCompIds);

    const update = {
      "system.peuple":                 "",
      "system.peupleId":               "",
      "system.tai":                    0,
      "system.mvOverride":             null,
      "system.peupleCompetenceIds":    [],
      "system.peupleBonusApplique.corpsBonus":        0,
      "system.peupleBonusApplique.espritBonus":       0,
      "system.peupleBonusApplique.ameBonus":          0,
      "system.peupleBonusApplique.agiliteBonus":      0,
      "system.peupleBonusApplique.forceBonus":        0,
      "system.peupleBonusApplique.perceptionBonus":   0,
      "system.peupleBonusApplique.resistanceBonus":   0,
      "system.peupleBonusApplique.intelligenceBonus": 0,
      "system.peupleBonusApplique.volonteBonus":      0,
      "system.peupleBonusApplique.charismaBonus":     0,
      "system.peupleBonusApplique.creativiteBonus":   0,
      "system.peupleMalusEnAttente.corpsBonus":        0,
      "system.peupleMalusEnAttente.espritBonus":       0,
      "system.peupleMalusEnAttente.ameBonus":          0,
      "system.peupleMalusEnAttente.agiliteBonus":      0,
      "system.peupleMalusEnAttente.forceBonus":        0,
      "system.peupleMalusEnAttente.perceptionBonus":   0,
      "system.peupleMalusEnAttente.resistanceBonus":   0,
      "system.peupleMalusEnAttente.intelligenceBonus": 0,
      "system.peupleMalusEnAttente.volonteBonus":      0,
      "system.peupleMalusEnAttente.charismaBonus":     0,
      "system.peupleMalusEnAttente.creativiteBonus":   0,
      "system.corps.score":       Math.max(0, (sd.corps?.score  ?? 0) - (old.corpsBonus  ?? 0)),
      "system.esprit.score":      Math.max(0, (sd.esprit?.score ?? 0) - (old.espritBonus ?? 0)),
      "system.ame.score":         Math.max(0, (sd.ame?.score    ?? 0) - (old.ameBonus    ?? 0)),
      "system.agilite.score":     Math.max(0, (sd.agilite?.score      ?? 0) - (old.agiliteBonus      ?? 0)),
      "system.agilite.raceMin":   null,
      "system.agilite.raceMax":   null,
      "system.force.score":       Math.max(0, (sd.force?.score        ?? 0) - (old.forceBonus        ?? 0)),
      "system.force.raceMin":     null,
      "system.force.raceMax":     null,
      "system.perception.score":  Math.max(0, (sd.perception?.score   ?? 0) - (old.perceptionBonus   ?? 0)),
      "system.perception.raceMin":   null,
      "system.perception.raceMax":   null,
      "system.resistance.score":  Math.max(0, (sd.resistance?.score   ?? 0) - (old.resistanceBonus   ?? 0)),
      "system.resistance.raceMin":   null,
      "system.resistance.raceMax":   null,
      "system.intelligence.score":Math.max(0, (sd.intelligence?.score ?? 0) - (old.intelligenceBonus ?? 0)),
      "system.intelligence.raceMin": null,
      "system.intelligence.raceMax": null,
      "system.volonte.score":     Math.max(0, (sd.volonte?.score      ?? 0) - (old.volonteBonus      ?? 0)),
      "system.volonte.raceMin":   null,
      "system.volonte.raceMax":   null,
      "system.charisma.score":    Math.max(0, (sd.charisma?.score     ?? 0) - (old.charismaBonus     ?? 0)),
      "system.charisma.raceMin":  null,
      "system.charisma.raceMax":  null,
      "system.creativite.score":  Math.max(0, (sd.creativite?.score   ?? 0) - (old.creativiteBonus   ?? 0)),
      "system.creativite.raceMin": null,
      "system.creativite.raceMax": null,
    };
    await this.actor.update(update);
  }

  // ── Drop d'un item de type peuple ──────────────────────────────────────
  /** @override */
  async _onDropItem(event, data) {
    const item = await Item.fromDropData(data);
    if (!item || item.type !== "peuple") {
      return super._onDropItem(event, data);
    }
    await this._applyPeuple(item);
  }

  async _applyPeuple(peupleItem) {
    const sd  = this.actor.system;
    const old = sd.peupleBonusApplique ?? {};
    const nw  = peupleItem.system;

    // Supprimer les compétences raciales de l'ancien peuple
    const oldCompIds = (sd.peupleCompetenceIds ?? []).filter(id => this.actor.items.has(id));
    if (oldCompIds.length) await this.actor.deleteEmbeddedDocuments("Item", oldCompIds);

    // Résoudre les compétences raciales du nouveau peuple
    // Priorité : champ sur l'item > table de config (par nom français)
    const peupleKey     = CONFIG.AGONE.peupleNomVersKey[peupleItem.name];
    const compRaciales  = (nw.competencesRaciales?.length > 0)
      ? nw.competencesRaciales
      : (CONFIG.AGONE.peuplesData[peupleKey]?.competencesRaciales ?? []);

    // Créer les nouvelles compétences raciales (score 5)
    let newCompIds = [];
    if (compRaciales.length) {
      const itemsData = compRaciales.map(c => ({
        name:   c.specialite ? `${c.nom} (${c.specialite})` : c.nom,
        type:   "competence",
        system: {
          nom:         c.nom,
          domaine:     c.domaine     ?? "",
          specialite:  c.specialite  ?? "",
          attributLie: c.attributLie ?? "agilite",
          score:       c.score       ?? 5,
        },
      }));
      const created = await this.actor.createEmbeddedDocuments("Item", itemsData);
      newCompIds = created.map(i => i.id);
    }

    // Retire l'ancien bonus appliqué, ajoute le nouveau bonus POSITIF uniquement.
    // Le max racial s'applique sur le score brut (acheté), soit total <= rawMax + posBonus.
    // Les malus (valeurs négatives) sont stockés dans peupleMalusEnAttente.
    const calcScoreCrea = (current, oldApplied, newPosBonus, newMax) => {
      let v = Math.max(0, (current ?? 0) - (oldApplied ?? 0) + newPosBonus);
      if (newMax != null) v = Math.min(v, newMax + newPosBonus);
      return v;
    };
    const posB = k => Math.max(0, nw[`${k}Bonus`] ?? 0);
    const negB = k => Math.min(0, nw[`${k}Bonus`] ?? 0);

    const update = {
      "system.peuple":                 peupleItem.name,
      "system.peupleId":               peupleItem.uuid,
      "system.tai":                    nw.taiBase ?? 0,
      "system.mvOverride":             nw.mvBase  ?? null,
      "system.peupleCompetenceIds":    newCompIds,
      // Bonus positifs uniquement (appliqués maintenant)
      "system.peupleBonusApplique.corpsBonus":        Math.max(0, nw.corpsBonus   ?? 0),
      "system.peupleBonusApplique.espritBonus":       Math.max(0, nw.espritBonus  ?? 0),
      "system.peupleBonusApplique.ameBonus":          Math.max(0, nw.ameBonus     ?? 0),
      "system.peupleBonusApplique.agiliteBonus":      posB('agilite'),
      "system.peupleBonusApplique.forceBonus":        posB('force'),
      "system.peupleBonusApplique.perceptionBonus":   posB('perception'),
      "system.peupleBonusApplique.resistanceBonus":   posB('resistance'),
      "system.peupleBonusApplique.intelligenceBonus": posB('intelligence'),
      "system.peupleBonusApplique.volonteBonus":      posB('volonte'),
      "system.peupleBonusApplique.charismaBonus":     posB('charisma'),
      "system.peupleBonusApplique.creativiteBonus":   posB('creativite'),
      // Malus négatifs en attente (appliqués à la fin de création)
      "system.peupleMalusEnAttente.corpsBonus":        Math.min(0, nw.corpsBonus  ?? 0),
      "system.peupleMalusEnAttente.espritBonus":       Math.min(0, nw.espritBonus ?? 0),
      "system.peupleMalusEnAttente.ameBonus":          Math.min(0, nw.ameBonus    ?? 0),
      "system.peupleMalusEnAttente.agiliteBonus":      negB('agilite'),
      "system.peupleMalusEnAttente.forceBonus":        negB('force'),
      "system.peupleMalusEnAttente.perceptionBonus":   negB('perception'),
      "system.peupleMalusEnAttente.resistanceBonus":   negB('resistance'),
      "system.peupleMalusEnAttente.intelligenceBonus": negB('intelligence'),
      "system.peupleMalusEnAttente.volonteBonus":      negB('volonte'),
      "system.peupleMalusEnAttente.charismaBonus":     negB('charisma'),
      "system.peupleMalusEnAttente.creativiteBonus":   negB('creativite'),
      // Aspects — bonus positifs uniquement
      "system.corps.score":  Math.max(0, (sd.corps?.score  ?? 0) - (old.corpsBonus  ?? 0) + Math.max(0, nw.corpsBonus  ?? 0)),
      "system.esprit.score": Math.max(0, (sd.esprit?.score ?? 0) - (old.espritBonus ?? 0) + Math.max(0, nw.espritBonus ?? 0)),
      "system.ame.score":    Math.max(0, (sd.ame?.score    ?? 0) - (old.ameBonus    ?? 0) + Math.max(0, nw.ameBonus    ?? 0)),
      // Attributs : bonus positif appliqué, clamp au max racial uniquement
      "system.agilite.score":      calcScoreCrea(sd.agilite?.score,      old.agiliteBonus,      posB('agilite'),      nw.agiliteMax),
      "system.force.score":        calcScoreCrea(sd.force?.score,        old.forceBonus,        posB('force'),        nw.forceMax),
      "system.perception.score":   calcScoreCrea(sd.perception?.score,   old.perceptionBonus,   posB('perception'),   nw.perceptionMax),
      "system.resistance.score":   calcScoreCrea(sd.resistance?.score,   old.resistanceBonus,   posB('resistance'),   nw.resistanceMax),
      "system.intelligence.score": calcScoreCrea(sd.intelligence?.score, old.intelligenceBonus, posB('intelligence'), nw.intelligenceMax),
      "system.volonte.score":      calcScoreCrea(sd.volonte?.score,      old.volonteBonus,      posB('volonte'),      nw.volonteMax),
      "system.charisma.score":     calcScoreCrea(sd.charisma?.score,     old.charismaBonus,     posB('charisma'),     nw.charismaMax),
      "system.creativite.score":   calcScoreCrea(sd.creativite?.score,   old.creativiteBonus,   posB('creativite'),   nw.creativiteMax),
      // Contraintes raciales persistantes
      "system.agilite.raceMin":      nw.agiliteMin      ?? null,
      "system.agilite.raceMax":      nw.agiliteMax      ?? null,
      "system.force.raceMin":        nw.forceMin        ?? null,
      "system.force.raceMax":        nw.forceMax        ?? null,
      "system.perception.raceMin":   nw.perceptionMin   ?? null,
      "system.perception.raceMax":   nw.perceptionMax   ?? null,
      "system.resistance.raceMin":   nw.resistanceMin   ?? null,
      "system.resistance.raceMax":   nw.resistanceMax   ?? null,
      "system.intelligence.raceMin": nw.intelligenceMin ?? null,
      "system.intelligence.raceMax": nw.intelligenceMax ?? null,
      "system.volonte.raceMin":      nw.volonteMin      ?? null,
      "system.volonte.raceMax":      nw.volonteMax      ?? null,
      "system.charisma.raceMin":     nw.charismaMin     ?? null,
      "system.charisma.raceMax":     nw.charismaMax     ?? null,
      "system.creativite.raceMin":   nw.creativiteMin   ?? null,
      "system.creativite.raceMax":   nw.creativiteMax   ?? null,
    };
    await this.actor.update(update);
    ui.notifications?.info(game.i18n.format("AGONE.PeupleApplique", { name: peupleItem.name }));
  }

  // Montée de niveau (dépense XP)
  // ==============================
  async _onLevelUp(event) {
    event.preventDefault();
    const btn    = event.currentTarget;
    const type   = btn.dataset.type;
    const key    = btn.dataset.key;
    const itemId = btn.dataset.itemId;
    const xpCout = Number(btn.dataset.cout);
    const sd     = this.actor.system;

    // Vérification du max racial (caracs seulement — seuil sur score brut hors bonus)
    if (type === "carac") {
      const pKeyRace  = CONFIG.AGONE?.peupleNomVersKey?.[sd.peuple] ?? "humain";
      const pDatRace  = CONFIG.AGONE?.peuplesData?.[pKeyRace] ?? {};
      const maxRacial = pDatRace[`${key}Max`] ?? null;
      const bonusApp  = sd.peupleBonusApplique?.[`${key}Bonus`] ?? 0;
      const rawScore  = (sd[key]?.score ?? 0) - bonusApp;
      if (maxRacial !== null && rawScore >= maxRacial) {
        return ui.notifications.warn(game.i18n.localize("AGONE.MaxRacialAtteint"));
      }
    }

    const isCarac  = (type === "aspect" || type === "carac");
    const pool     = isCarac ? sd.ptsCreationCarac : sd.ptsCreationComp;
    const restePts = (pool?.max ?? 0) - (pool?.depense ?? 0);
    const creaCout = Number(btn.dataset.creaCout) || null;

    const item     = (type === "competence") ? this.actor.items.get(itemId) : null;
    const localExp = isCarac ? (sd[key]?.exp ?? 0) : (item?.system.exp ?? 0);

    // ── MODE CRÉATION ────────────────────────────────────────
    if (sd.modeCreation) {
      if (type === "aspect") {
        return ui.notifications.warn(game.i18n.localize("AGONE.AspectsBloquesCrea"));
      }
      if (creaCout === null) {
        return ui.notifications.warn(game.i18n.localize("AGONE.NiveauMaxCrea"));
      }
      if (restePts < creaCout) {
        return ui.notifications.warn(
          game.i18n.format("AGONE.PasAssezPtsCrea", { cout: creaCout, actuel: restePts })
        );
      }
      const confirmed = await Dialog.confirm({
        title:   game.i18n.localize("AGONE.MonterNiveau"),
        content: `<p>${game.i18n.format("AGONE.ConfirmerMonteeNiveau", { cout: `${creaCout} ${game.i18n.localize("AGONE.PointsCreation")}` })}</p>`
      });
      if (!confirmed) return;

      if (isCarac) {
        await this.actor.update({
          [`system.${key}.score`]:          (sd[key].score ?? 0) + 1,
          "system.ptsCreationCarac.depense": (pool.depense ?? 0) + creaCout,
        });
      } else if (type === "competence") {
        if (!item) return;
        await Promise.all([
          item.update({ "system.score": item.system.score + 1 }),
          this.actor.update({ "system.ptsCreationComp.depense": (pool.depense ?? 0) + creaCout }),
        ]);
      }
      return;
    }

    // ── MODE XP NORMAL ───────────────────────────────────────
    const fromLocal   = Math.min(localExp, xpCout);
    const fromGeneral = xpCout - fromLocal;

    if (fromGeneral > sd.experience.courante) {
      return ui.notifications.warn(
        game.i18n.format("AGONE.PasAssezXP", { cout: xpCout, actuel: localExp + sd.experience.courante })
      );
    }

    const confirmed = await Dialog.confirm({
      title:   game.i18n.localize("AGONE.MonterNiveau"),
      content: `<p>${game.i18n.format("AGONE.ConfirmerMonteeNiveau", { cout: xpCout })}</p>`
    });
    if (!confirmed) return;

    if (isCarac) {
      await this.actor.update({
        [`system.${key}.score`]: (sd[key].score ?? 0) + 1,
        ...(fromLocal   > 0 ? { [`system.${key}.exp`]:       localExp - fromLocal                      } : {}),
        ...(fromGeneral > 0 ? { "system.experience.courante": sd.experience.courante - fromGeneral,
                                "system.experience.totale":   (sd.experience.totale ?? 0) + fromGeneral } : {}),
      });
    } else if (type === "competence") {
      if (!item) return;
      const updates = [];
      updates.push(item.update({
        "system.score": item.system.score + 1,
        ...(fromLocal > 0 ? { "system.exp": localExp - fromLocal } : {}),
      }));
      if (fromGeneral > 0) updates.push(this.actor.update({
        "system.experience.courante": sd.experience.courante - fromGeneral,
        "system.experience.totale":   (sd.experience.totale ?? 0) + fromGeneral,
      }));
      await Promise.all(updates);
    }
  }

  // Mode création — activer/désactiver
  // ==============================
  async _onToggleCreation(event) {
    event.preventDefault();
    await this.actor.update({ "system.modeCreation": !this.actor.system.modeCreation });
  }

  // Mode création — reset caractéristiques
  // ==============================
  async _onResetCaracs(event) {
    event.preventDefault();
    const confirmed = await Dialog.confirm({
      title:   game.i18n.localize("AGONE.ResetCreation"),
      content: `<p>${game.i18n.localize("AGONE.ResetCreationCaracConfirm")}</p>`
    });
    if (!confirmed) return;

    const sd = this.actor.system;
    const caracs  = ['agilite','force','perception','resistance','intelligence','volonte','charisma','creativite'];
    const aspects = ['corps','esprit','ame'];
    const upd = { "system.ptsCreationCarac.depense": 0 };

    for (const k of caracs) {
      const bonus = sd.peupleBonusApplique?.[`${k}Bonus`] ?? 0;
      upd[`system.${k}.score`] = Math.max(0, bonus);
    }
    for (const asp of aspects) {
      upd[`system.${asp}.score`] = 0;
    }

    await this.actor.update(upd);
    ui.notifications.info(game.i18n.localize("AGONE.ResetCreationDone"));
  }

  // Mode création — reset compétences
  // ==============================
  async _onResetComps(event) {
    event.preventDefault();
    const confirmed = await Dialog.confirm({
      title:   game.i18n.localize("AGONE.ResetCreation"),
      content: `<p>${game.i18n.localize("AGONE.ResetCreationCompConfirm")}</p>`
    });
    if (!confirmed) return;

    await this.actor.update({ "system.ptsCreationComp.depense": 0 });

    const compUpdates = this.actor.items
      .filter(i => ['competence', 'manoeuvre'].includes(i.type))
      .map(i => ({ _id: i.id, "system.score": 0, "system.exp": 0 }));
    if (compUpdates.length) await this.actor.updateEmbeddedDocuments("Item", compUpdates);

    ui.notifications.info(game.i18n.localize("AGONE.ResetCreationDone"));
  }

  // Mode création — valider (fin de création)
  // ==============================
  async _onValiderCreation(event) {
    event.preventDefault();
    const confirmed = await Dialog.confirm({
      title:   game.i18n.localize("AGONE.ValiderCreation"),
      content: `<p>${game.i18n.localize("AGONE.ValiderCreationConfirm")}</p>`
    });
    if (!confirmed) return;

    // Appliquer les malus raciaux en attente sur les scores
    const sd     = this.actor.system;
    const malus  = sd.peupleMalusEnAttente ?? {};
    const caracs = ['agilite','force','perception','resistance','intelligence','volonte','charisma','creativite'];
    const aspects = ['corps','esprit','ame'];
    const upd = { "system.modeCreation": false };

    for (const k of caracs) {
      const m = malus[`${k}Bonus`] ?? 0;
      if (m !== 0) {
        upd[`system.${k}.score`]                          = Math.max(0, (sd[k]?.score ?? 0) + m);
        upd[`system.peupleBonusApplique.${k}Bonus`]       = (sd.peupleBonusApplique?.[`${k}Bonus`] ?? 0) + m;
        upd[`system.peupleMalusEnAttente.${k}Bonus`]      = 0;
      }
    }
    for (const asp of aspects) {
      const m = malus[`${asp}Bonus`] ?? 0;
      if (m !== 0) {
        upd[`system.${asp}.score`]                         = Math.max(0, (sd[asp]?.score ?? 0) + m);
        upd[`system.peupleBonusApplique.${asp}Bonus`]      = (sd.peupleBonusApplique?.[`${asp}Bonus`] ?? 0) + m;
        upd[`system.peupleMalusEnAttente.${asp}Bonus`]     = 0;
      }
    }

    await this.actor.update(upd);
    ui.notifications.info(game.i18n.localize("AGONE.CreationTerminee"));
  }

  // Édition inline
  // ==============================
  async _onInlineEdit(event) {
    event.preventDefault();
    const el     = event.currentTarget;
    const itemId = el.dataset.itemId;
    const field  = el.dataset.field;
    const value  = el.type === "checkbox" ? el.checked : (isNaN(el.value) ? el.value : Number(el.value));
    const item   = this.actor.items.get(itemId);
    if (item && field) await item.update({ [field]: value });
  }
}
