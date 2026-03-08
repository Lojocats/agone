/**
 * Feuille de Compagnon / Monture
 */
export class CompagnonSheet extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["agone", "sheet", "actor", "compagnon"],
      template: "systems/agone/templates/actors/compagnon-sheet.hbs",
      width: 720,
      height: 600,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "infos" }]
    });
  }

  async getData(options = {}) {
    const context = await super.getData(options);
    context.system = this.actor.system;
    context.armes  = this.actor.items.filter(i => i.type === "arme");
    context.descriptionHTML = await TextEditor.enrichHTML(
      this.actor.system.description ?? "", { async: true, secrets: this.actor.isOwner }
    );
    return context;
  }

  /** @override */
  async _onSubmit(event, options = {}) {
    if (this.form) {
      this.form.querySelectorAll("input[type='number']").forEach(el => {
        if (el.value === "" || isNaN(Number(el.value))) el.value = "0";
      });
    }
    return super._onSubmit(event, options);
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;
    html.find(".item-create").click(this._onItemCreate.bind(this));
    html.find(".item-edit").click(this._onItemEdit.bind(this));
    html.find(".item-delete").click(this._onItemDelete.bind(this));
    html.find("[data-action='rollInitiative']").click(async (e) => {
      e.preventDefault();
      await this.actor.rollInitiative();
    });
    html.find("[data-action='rollAttaque']").click(async (e) => {
      e.preventDefault();
      const armeId = e.currentTarget.closest("[data-item-id]")?.dataset.itemId;
      if (armeId) await this.actor.rollAttaque(armeId);
    });
  }

  async _onItemCreate(event) {
    event.preventDefault();
    const type = event.currentTarget.dataset.type;
    const key  = type.charAt(0).toUpperCase() + type.slice(1);
    return await Item.create({ name: game.i18n.localize(`AGONE.Nouvel${key}`), type }, { parent: this.actor });
  }
  _onItemEdit(event) {
    event.preventDefault();
    const li = event.currentTarget.closest("[data-item-id]");
    this.actor.items.get(li.dataset.itemId)?.sheet.render(true);
  }
  async _onItemDelete(event) {
    event.preventDefault();
    const li   = event.currentTarget.closest("[data-item-id]");
    const item = this.actor.items.get(li.dataset.itemId);
    if (item && await Dialog.confirm({ title: game.i18n.localize("AGONE.Supprimer"), content: `<p>${item.name}</p>` })) {
      await item.delete();
    }
  }
}

/**
 * Feuille de Démon
 */
export class DemonSheet extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["agone", "sheet", "actor", "demon"],
      template: "systems/agone/templates/actors/demon-sheet.hbs",
      width: 700,
      height: 650,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "infos" }]
    });
  }

  async getData(options = {}) {
    const context = await super.getData(options);
    context.system = this.actor.system;
    context.pouvoirs = this.actor.items.filter(i => i.type === "pouvoir");
    context.descriptionHTML = await TextEditor.enrichHTML(
      this.actor.system.description ?? "", { async: true, secrets: this.actor.isOwner }
    );
    context.connivancesHTML = await TextEditor.enrichHTML(
      this.actor.system.connivances ?? "", { async: true, secrets: this.actor.isOwner }
    );
    return context;
  }

  /** @override */
  async _onSubmit(event, options = {}) {
    if (this.form) {
      this.form.querySelectorAll("input[type='number']").forEach(el => {
        if (el.value === "" || isNaN(Number(el.value))) el.value = "0";
      });
    }
    return super._onSubmit(event, options);
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;
    html.find(".item-create").click(async (e) => {
      e.preventDefault();
      const type = e.currentTarget.dataset.type;
      await Item.create({ name: game.i18n.localize("AGONE.NouvelPouvoir"), type }, { parent: this.actor });
    });
    html.find(".item-edit").click((e) => {
      e.preventDefault();
      const li = e.currentTarget.closest("[data-item-id]");
      this.actor.items.get(li.dataset.itemId)?.sheet.render(true);
    });
    html.find(".item-delete").click(async (e) => {
      e.preventDefault();
      const li   = e.currentTarget.closest("[data-item-id]");
      const item = this.actor.items.get(li.dataset.itemId);
      if (item && await Dialog.confirm({ title: game.i18n.localize("AGONE.Supprimer"), content: `<p>${item.name}</p>` })) {
        await item.delete();
      }
    });
  }
}

/**
 * Feuille de PNJ
 */
export class PnjSheet extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["agone", "sheet", "actor", "pnj"],
      template: "systems/agone/templates/actors/pnj-sheet.hbs",
      width: 750,
      height: 680,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "attributs" }]
    });
  }

  async getData(options = {}) {
    const context = await super.getData(options);
    context.system = this.actor.system;
    context.armes  = this.actor.items.filter(i => i.type === "arme");
    context.armures = this.actor.items.filter(i => i.type === "armure");
    context.descriptionHTML = await TextEditor.enrichHTML(
      this.actor.system.description ?? "", { async: true, secrets: this.actor.isOwner }
    );
    return context;
  }

  /** @override */
  async _onSubmit(event, options = {}) {
    if (this.form) {
      this.form.querySelectorAll("input[type='number']").forEach(el => {
        if (el.value === "" || isNaN(Number(el.value))) el.value = "0";
      });
    }
    return super._onSubmit(event, options);
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;
    html.find(".item-create").click(async (e) => {
      e.preventDefault();
      const type = e.currentTarget.dataset.type;
      const name = game.i18n.localize(`AGONE.Nouvel${type.charAt(0).toUpperCase() + type.slice(1)}`);
      await Item.create({ name, type }, { parent: this.actor });
    });
    html.find(".item-edit").click((e) => {
      e.preventDefault();
      const li = e.currentTarget.closest("[data-item-id]");
      this.actor.items.get(li.dataset.itemId)?.sheet.render(true);
    });
    html.find(".item-delete").click(async (e) => {
      e.preventDefault();
      const li   = e.currentTarget.closest("[data-item-id]");
      const item = this.actor.items.get(li.dataset.itemId);
      if (item && await Dialog.confirm({ title: game.i18n.localize("AGONE.Supprimer"), content: `<p>${item.name}</p>` })) {
        await item.delete();
      }
    });
    html.find("[data-action='rollInitiative']").click(async (e) => {
      e.preventDefault();
      await this.actor.rollInitiative();
    });
    html.find("[data-action='rollAttaque']").click(async (e) => {
      e.preventDefault();
      const armeId = e.currentTarget.closest("[data-item-id]")?.dataset.itemId;
      if (armeId) await this.actor.rollAttaque(armeId);
    });
  }
}
