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

  /** @override — template dynamique selon le type d'item */
  async _renderHTML(context, options) {
    const template = `systems/agone/templates/items/${this.item.type}-sheet.hbs`;
    const html = await foundry.applications.handlebars.renderTemplate(template, context);
    const el = document.createElement("div");
    el.innerHTML = html;
    const partNode = el.firstElementChild ?? el;
    partNode.setAttribute("data-application-part", "form");
    return { form: partNode };
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

    if (this.item.type === "competence") {
      // Toutes les compétences connues (monde + acteurs) — game.actors est une Collection, pas un Array
      const allComps = [
        ...game.items.filter(i => i.type === "competence"),
        ...[...game.actors].flatMap(a => [...a.items.filter(i => i.type === "competence")]),
      ];

      // Domaines des compétences "Arts Magiques"
      const existingArtsDomaines = allComps
        .filter(i => i.name === "Arts Magiques")
        .map(i => i.system?.domaine ?? "").filter(Boolean);
      const customArtsDomaines = (game.settings.get("agone", "domainesArtsCustom") ?? []).map(d => d.nom);
      context.artsDomainOptions = [...new Set([
        "Accord", "Cyse", "Décorum", "Geste",
        ...customArtsDomaines,
        ...existingArtsDomaines,
      ])].sort((a, b) => a.localeCompare(b, "fr"));

      context.musicDomainOptions    = ["harpe", "flute", "viole", "tambour", "cistre"];
      context.saisonDomainOptions   = ["printemps", "ete", "automne", "hiver"];
      context.resonanceDomainOptions = ["jorniste", "eclipsiste", "obscurantiste"];
    }

    return context;
  }

  /** @override — sauvegarde/restaure le scroll autour du remplacement DOM */
  _replaceHTML(result, content, options) {
    const scrollEl = content.querySelector(".sheet-body");
    const savedScroll = scrollEl ? scrollEl.scrollTop : 0;
    super._replaceHTML(result, content, options);
    if (savedScroll > 0) {
      const newScrollEl = content.querySelector(".sheet-body");
      if (newScrollEl) newScrollEl.scrollTop = savedScroll;
    }
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);

    // ── Sauvegarde automatique de tous les champs nommés ─────────────────
    // AbortController : évite l'accumulation du listener si le form persiste
    this._renderSignal?.abort();
    this._renderSignal = new AbortController();
    const form = this.element.querySelector("form");
    if (form) {
      form.addEventListener("change", async (ev) => {
        const el = ev.target;
        if (!el.name) return;
        // Normaliser nombres
        if (el.type === "number") {
          if (el.value === "" || isNaN(Number(el.value))) el.value = "0";
        }
        // Normaliser typeMagie
        if (el.name === "system.typeMagie") {
          el.value = el.value.trim().toLowerCase();
        }
        const value = el.type === "checkbox" ? el.checked
                    : el.type === "number"   ? Number(el.value)
                    : el.value;
        await this.item.update(foundry.utils.expandObject({ [el.name]: value }));
      }, { signal: this._renderSignal.signal });
    }

    // Gestion des onglets
    const html = $(this.element);
    html.off(".agone");
    const activeTab = this._currentTab ?? "description";
    html.find(".sheet-tabs .item[data-tab]").each((_, el) => {
      el.classList.toggle("active", el.dataset.tab === activeTab);
    });
    html.find(".tab[data-tab]").each((_, el) => {
      el.classList.toggle("active", el.dataset.tab === activeTab);
    });
    html.on("click.agone", ".sheet-tabs .item[data-tab]", (e) => {
      const tab = e.currentTarget.dataset.tab;
      if (!tab) return;
      this._currentTab = tab;
      html.find(".sheet-tabs .item").removeClass("active");
      e.currentTarget.classList.add("active");
      html.find(".tab").removeClass("active");
      html.find(`.tab[data-tab="${tab}"]`).addClass("active");
    });

    // Bouton "envoyer en chat"
    html.on("click.agone", "[data-action='toChat']", async (e) => {
      e.preventDefault();
      await this.item.toChat();
    });
  }
}
