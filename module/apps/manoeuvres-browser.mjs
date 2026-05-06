import { MANOEUVRES_DATA } from "../helpers/compendium-data.mjs";

/**
 * Navigateur de manœuvres & bottes Agone — fenêtre de sélection avec filtres.
 */
export class ManoeuvresBrowser extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {

  constructor(actor, options = {}) {
    super(options);
    this.actor          = actor;
    this._search        = "";
    this._filterCat     = "all";
    this._filterPossede = "all";
  }

  static DEFAULT_OPTIONS = {
    id      : "agone-manoeuvres-browser",
    classes : ["agone", "manoeuvres-browser"],
    position: { width: 980, height: 600 },
    window  : { resizable: true },
  };

  static PARTS = {
    form: { template: "systems/agone/templates/apps/manoeuvres-browser.hbs" },
  };

  get title() {
    return game.i18n.format("AGONE.Browser.TitreManoeuvres", { nom: this.actor.name });
  }

  async _prepareContext(options) {
    const actorManNames = new Set(
      this.actor.items.filter(i => i.type === "manoeuvre").map(i => i.name)
    );

    let items = MANOEUVRES_DATA.map((d, idx) => ({
      idx       : String(idx),
      name      : d.name,
      categorie : d.categorie,
      ini       : d.ini,
      att       : d.att,
      def       : d.def,
      dom       : d.dom ?? "0",
      condition : d.condition ?? "",
      description: d.description ?? "",
      hasInActor: actorManNames.has(d.name),
    }));

    // Filtres
    if (this._search) {
      const s = this._search.toLowerCase();
      items = items.filter(e =>
        e.name.toLowerCase().includes(s) ||
        e.description.toLowerCase().includes(s)
      );
    }
    if (this._filterCat !== "all") {
      items = items.filter(e => e.categorie === this._filterCat);
    }
    if (this._filterPossede === "oui") {
      items = items.filter(e => e.hasInActor);
    } else if (this._filterPossede === "non") {
      items = items.filter(e => !e.hasInActor);
    }

    // Manœuvres d'abord, puis bottes ; alphabétique dans chaque groupe
    items.sort((a, b) => {
      if (a.categorie !== b.categorie) return a.categorie === "manoeuvre" ? -1 : 1;
      return a.name.localeCompare(b.name, "fr");
    });

    return {
      items,
      search        : this._search,
      filterCat     : this._filterCat,
      filterPossede : this._filterPossede,
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const sel = this._refocusSelector;
    if (sel) {
      this._refocusSelector = null;
      requestAnimationFrame(() => {
        const el = this.element.querySelector(sel);
        if (el) { el.focus(); try { el.setSelectionRange?.(el.value.length, el.value.length); } catch {} }
      });
    }
    const html = $(this.element);

    html.find(".mb-search").on("input", foundry.utils.debounce(e => {
      this._search = e.currentTarget.value.trim();
      this._refocusSelector = ".mb-search";
      this.render();
    }, 250));

    html.find(".mb-cat-filter").on("change", e => {
      this._filterCat = e.currentTarget.value;
      this.render();
    });

    html.find(".mb-possede-filter").on("change", e => {
      this._filterPossede = e.currentTarget.value;
      this.render();
    });

    html.find(".mb-clear").on("click", () => {
      this._search        = "";
      this._filterCat     = "all";
      this._filterPossede = "all";
      this.render();
    });

    html.find("[data-action='addManoeuvre']").on("click", async e => {
      const idx = parseInt(e.currentTarget.closest("[data-man-idx]")?.dataset?.manIdx ?? "");
      if (isNaN(idx)) return;
      const d = MANOEUVRES_DATA[idx];
      if (!d) return;

      await Item.create({
        name  : d.name,
        type  : "manoeuvre",
        system: {
          categorie : d.categorie  ?? "manoeuvre",
          ini       : d.ini        ?? 0,
          att       : d.att        ?? 0,
          def       : d.def        ?? 0,
          dom       : d.dom        ?? "0",
          condition : d.condition  ?? "",
          description: d.description ?? "",
        },
      }, { parent: this.actor });

      ui.notifications?.info(game.i18n.format("AGONE.Notif.ManoeuvreAjoutee", { nom: d.name, acteur: this.actor.name }));
      this.render();
    });
  }

}
