import { DONS_DATA } from "../helpers/compendium-data.mjs";

/**
 * Navigateur d'avantages & défauts (Dons) Agone — fenêtre de sélection avec filtres.
 */
export class DonsBrowser extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {

  constructor(actor, options = {}) {
    super(options);
    this.actor          = actor;
    this._search        = "";
    this._filterCat     = "all";
    this._filterPossede = "all";
  }

  static DEFAULT_OPTIONS = {
    id      : "agone-dons-browser",
    classes : ["agone", "dons-browser"],
    position: { width: 700, height: 560 },
    window  : { resizable: true },
  };

  static PARTS = {
    form: { template: "systems/agone/templates/apps/dons-browser.hbs" },
  };

  get title() {
    return game.i18n.format("AGONE.Browser.TitreAvantages", { nom: this.actor.name });
  }

  async _prepareContext(options) {
    const actorDonNames = new Set(
      this.actor.items.filter(i => i.type === "don").map(i => i.name)
    );

    let dons = DONS_DATA.map((d, idx) => ({
      idx        : String(idx),
      name       : d.name,
      categorie  : d.categorie,
      cout       : d.cout,
      coutAbs    : Math.abs(d.cout),
      description: d.description ?? "",
      hasInActor : actorDonNames.has(d.name),
    }));

    // Filtres
    if (this._search) {
      const s = this._search.toLowerCase();
      dons = dons.filter(e =>
        e.name.toLowerCase().includes(s) ||
        e.description.toLowerCase().includes(s)
      );
    }
    if (this._filterCat !== "all") {
      dons = dons.filter(e => e.categorie === this._filterCat);
    }
    if (this._filterPossede === "oui") {
      dons = dons.filter(e => e.hasInActor);
    } else if (this._filterPossede === "non") {
      dons = dons.filter(e => !e.hasInActor);
    }

    dons.sort((a, b) => {
      // Avantages avant défauts, puis par nom
      if (a.categorie !== b.categorie) return a.categorie === "avantage" ? -1 : 1;
      return a.name.localeCompare(b.name, "fr");
    });

    return {
      dons,
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

    html.find(".db-search").on("input", foundry.utils.debounce(e => {
      this._search = e.currentTarget.value.trim();
      this._refocusSelector = ".db-search";
      this.render();
    }, 250));

    html.find(".db-cat-filter").on("change", e => {
      this._filterCat = e.currentTarget.value;
      this.render();
    });

    html.find(".db-possede-filter").on("change", e => {
      this._filterPossede = e.currentTarget.value;
      this.render();
    });

    html.find(".db-clear").on("click", () => {
      this._search        = "";
      this._filterCat     = "all";
      this._filterPossede = "all";
      this.render();
    });

    html.find("[data-action='addDon']").on("click", async e => {
      const idx = parseInt(e.currentTarget.closest("[data-don-idx]")?.dataset?.donIdx ?? "");
      if (isNaN(idx)) return;
      const d = DONS_DATA[idx];
      if (!d) return;

      await Item.create({
        name  : d.name,
        type  : "don",
        system: {
          categorie  : d.categorie   ?? "avantage",
          cout       : d.cout        ?? 0,
          description: d.description ?? "",
        },
      }, { parent: this.actor });

      ui.notifications?.info(game.i18n.format("AGONE.Notif.DonAjoute", { nom: d.name, acteur: this.actor.name }));
      this.render();
    });
  }

}
