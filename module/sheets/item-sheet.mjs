/**
 * Feuille d'item générique — API ApplicationV2 / ItemSheetV2
 */
export class AgoneItemSheet extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ItemSheetV2) {
  static get MAGIC_TYPE_DEFAULTS() {
    return ["jorniste", "obscurantiste", "eclipsiste", "accord", "cyse", "decorum", "geste"];
  }

  static DEFAULT_OPTIONS = {
    classes: ["agone", "sheet", "item"],
    position: { width: 520, height: 480 },
    window: { resizable: true },
  };

  // Le template est dynamique selon le type d'item, défini dans _prepareContext
  static PARTS = {
    form: {
      template: "systems/agone/templates/items/competence-sheet.hbs", // fallback par défaut
      scrollable: [".sheet-body"],
    },
  };

  /** @override — retourne le bon template selon le type d'item */
  async _preparePartContext(partId, context, options) {
    const ctx = await super._preparePartContext(partId, context, options);
    if (partId === "form") {
      ctx.template = `systems/agone/templates/items/${this.item.type}-sheet.hbs`;
    }
    return ctx;
  }

  async _prepareContext(options) {
    const context = {};
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

    // Options de type de charge pour la feuille de don
    if (this.item.type === "don") {
      context.typeChargeOptions = [
        { key: "charge",  label: game.i18n.localize("AGONE.CategorieCharges") },
        { key: "ame",     label: game.i18n.localize("AGONE.Ame") },
        { key: "corps",   label: game.i18n.localize("AGONE.Corps") },
        { key: "esprit",  label: game.i18n.localize("AGONE.Esprit") },
        { key: "societe", label: game.i18n.localize("AGONE.CategorieSociete") },
        { key: "emprise", label: game.i18n.localize("AGONE.Emprise") },
        { key: "arts",    label: game.i18n.localize("AGONE.CategorieArts") },
        { key: "saisons", label: game.i18n.localize("AGONE.CategorieSaisons") },
        { key: "flamme",  label: game.i18n.localize("AGONE.Flamme") },
      ];
    }
    const existingMagicTypes = game.items
      .filter(i => i.type === "sort")
      .map(i => (i.system?.typeMagie ?? "").trim().toLowerCase())
      .filter(Boolean);
    context.magicTypeOptions = [...new Set([
      ...this.constructor.MAGIC_TYPE_DEFAULTS,
      ...existingMagicTypes,
    ])].sort((a, b) => a.localeCompare(b, "fr"));

    return context;
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);

    // Normaliser les inputs numériques vides
    this.element.addEventListener("change", (ev) => {
      if (ev.target.matches("input[type='number']")) {
        if (ev.target.value === "" || isNaN(Number(ev.target.value))) ev.target.value = "0";
      }
    }, true);

    // Normaliser typeMagie en minuscule
    if (this.item.type === "sort") {
      this.element.addEventListener("change", (ev) => {
        if (ev.target.matches("input[name='system.typeMagie']")) {
          ev.target.value = ev.target.value.trim().toLowerCase();
        }
      });
    }

    // Gestion des onglets
    const html = $(this.element);
    const activeTab = this._currentTab ?? "description";
    html.find(".sheet-tabs .item[data-tab]").each((_, el) => {
      el.classList.toggle("active", el.dataset.tab === activeTab);
    });
    html.find(".tab[data-tab]").each((_, el) => {
      el.classList.toggle("active", el.dataset.tab === activeTab);
    });
    html.find(".sheet-tabs .item[data-tab]").on("click", (e) => {
      const tab = e.currentTarget.dataset.tab;
      if (!tab) return;
      this._currentTab = tab;
      html.find(".sheet-tabs .item").removeClass("active");
      e.currentTarget.classList.add("active");
      html.find(".tab").removeClass("active");
      html.find(`.tab[data-tab="${tab}"]`).addClass("active");
    });

    // Bouton "envoyer en chat"
    html.find("[data-action='toChat']").click(async (e) => {
      e.preventDefault();
      await this.item.toChat();
    });
  }
}
