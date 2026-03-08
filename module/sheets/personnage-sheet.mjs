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
    const update = {
      "system.peuple":      "",
      "system.peupleId":     "",
      "system.tai":          0,
      "system.mvOverride":   null,
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

    // Retire l'ancien bonus, ajoute le nouveau, puis clamp sur [raceMin, raceMax]
    const calcScore = (current, oldBonus, newBonus, newMin, newMax) => {
      let v = Math.max(0, (current ?? 0) - (oldBonus ?? 0) + (newBonus ?? 0));
      if (newMin != null) v = Math.max(v, newMin);
      if (newMax != null) v = Math.min(v, newMax);
      return v;
    };

    const update = {
      "system.peuple":      peupleItem.name,
      "system.peupleId":     peupleItem.uuid,
      "system.tai":          nw.taiBase ?? 0,
      "system.mvOverride":   nw.mvBase  ?? null,
      "system.peupleBonusApplique.corpsBonus":        nw.corpsBonus        ?? 0,
      "system.peupleBonusApplique.espritBonus":       nw.espritBonus       ?? 0,
      "system.peupleBonusApplique.ameBonus":          nw.ameBonus          ?? 0,
      "system.peupleBonusApplique.agiliteBonus":      nw.agiliteBonus      ?? 0,
      "system.peupleBonusApplique.forceBonus":        nw.forceBonus        ?? 0,
      "system.peupleBonusApplique.perceptionBonus":   nw.perceptionBonus   ?? 0,
      "system.peupleBonusApplique.resistanceBonus":   nw.resistanceBonus   ?? 0,
      "system.peupleBonusApplique.intelligenceBonus": nw.intelligenceBonus ?? 0,
      "system.peupleBonusApplique.volonteBonus":      nw.volonteBonus      ?? 0,
      "system.peupleBonusApplique.charismaBonus":     nw.charismaBonus     ?? 0,
      "system.peupleBonusApplique.creativiteBonus":   nw.creativiteBonus   ?? 0,
      // Aspects
      "system.corps.score":  Math.max(0, (sd.corps?.score  ?? 0) - (old.corpsBonus  ?? 0) + (nw.corpsBonus  ?? 0)),
      "system.esprit.score": Math.max(0, (sd.esprit?.score ?? 0) - (old.espritBonus ?? 0) + (nw.espritBonus ?? 0)),
      "system.ame.score":    Math.max(0, (sd.ame?.score    ?? 0) - (old.ameBonus    ?? 0) + (nw.ameBonus    ?? 0)),
      // Attributs avec clamp sur min/max raciaux
      "system.agilite.score":      calcScore(sd.agilite?.score,      old.agiliteBonus,      nw.agiliteBonus,      nw.agiliteMin,      nw.agiliteMax),
      "system.force.score":        calcScore(sd.force?.score,        old.forceBonus,        nw.forceBonus,        nw.forceMin,        nw.forceMax),
      "system.perception.score":   calcScore(sd.perception?.score,   old.perceptionBonus,   nw.perceptionBonus,   nw.perceptionMin,   nw.perceptionMax),
      "system.resistance.score":   calcScore(sd.resistance?.score,   old.resistanceBonus,   nw.resistanceBonus,   nw.resistanceMin,   nw.resistanceMax),
      "system.intelligence.score": calcScore(sd.intelligence?.score, old.intelligenceBonus, nw.intelligenceBonus, nw.intelligenceMin, nw.intelligenceMax),
      "system.volonte.score":      calcScore(sd.volonte?.score,      old.volonteBonus,      nw.volonteBonus,      nw.volonteMin,      nw.volonteMax),
      "system.charisma.score":     calcScore(sd.charisma?.score,     old.charismaBonus,     nw.charismaBonus,     nw.charismaMin,     nw.charismaMax),
      "system.creativite.score":   calcScore(sd.creativite?.score,   old.creativiteBonus,   nw.creativiteBonus,   nw.creativiteMin,   nw.creativiteMax),
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
