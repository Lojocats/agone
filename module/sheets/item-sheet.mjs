/**
 * Feuille d'item générique – gère tous les types d'items Agone.
 */
export class AgoneItemSheet extends foundry.appv1.sheets.ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["agone", "sheet", "item"],
      width: 520,
      height: 480,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
    });
  }

  get template() {
    return `systems/agone/templates/items/${this.item.type}-sheet.hbs`;
  }

  async getData(options = {}) {
    const context = await super.getData(options);
    context.system = this.item.system;
    context.item   = this.item;
    context.config = CONFIG.AGONE;
    context.descriptionHTML = await TextEditor.enrichHTML(
      this.item.system.description ?? "", { async: true, secrets: this.item.isOwner }
    );
    // Listes de choix utiles pour les templates
    context.typesArme       = CONFIG.AGONE.typesArme;
    context.stylesArme      = CONFIG.AGONE.stylesArme;
    context.typesArmure     = CONFIG.AGONE.typesArmure;
    context.domainesCompetence = CONFIG.AGONE.domainesCompetence;
    context.attributsLies   = CONFIG.AGONE.attributsLies;
    context.typesMagie      = CONFIG.AGONE.typesMagie;
    context.categoriesDon   = CONFIG.AGONE.categoriesDon;
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
    // Bouton "envoyer en chat"
    html.find("[data-action='toChat']").click(async (e) => {
      e.preventDefault();
      await this.item.toChat();
    });
  }
}
