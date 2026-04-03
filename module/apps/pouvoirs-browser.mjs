import { POUVOIRS_DATA } from "../helpers/compendium-data.mjs";

/**
 * Navigateur de Pouvoirs de Flamme & Saisonins Agone — fenêtre de sélection avec filtres.
 */
export class PouvoirsBrowser extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {

  constructor(actor, options = {}) {
    super(options);
    this.actor          = actor;
    this._search        = "";
    this._filterCat     = "all";
    this._filterPossede = "all";
    this._expanded      = new Set();
  }

  static DEFAULT_OPTIONS = {
    id      : "agone-pouvoirs-browser",
    classes : ["agone", "pouvoirs-browser"],
    position: { width: 680, height: 560 },
    window  : { resizable: true },
  };

  static PARTS = {
    form: { template: "systems/agone/templates/apps/pouvoirs-browser.hbs" },
  };

  get title() {
    return game.i18n.format("AGONE.Browser.TitrePouvoirs", { nom: this.actor.name });
  }

  async _prepareContext(options) {
    const actorPouvoirNames = new Set(
      this.actor.items.filter(i => i.type === "pouvoir").map(i => i.name)
    );

    let items = POUVOIRS_DATA.map((d, idx) => ({
      idx         : String(idx),
      name        : d.name,
      categorie   : d.categorie,
      description : d.description ?? "",
      hasInActor  : actorPouvoirNames.has(d.name),
      expanded    : this._expanded.has(String(idx)),
    }));

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

    items.sort((a, b) => {
      if (a.categorie !== b.categorie) return a.categorie === "flamme" ? -1 : 1;
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

    html.find(".pvb-search").on("input", foundry.utils.debounce(e => {
      this._search = e.currentTarget.value.trim();
      this._refocusSelector = ".pvb-search";
      this.render();
    }, 250));

    html.find(".pvb-cat-filter").on("change", e => {
      this._filterCat = e.currentTarget.value;
      this.render();
    });

    html.find(".pvb-possede-filter").on("change", e => {
      this._filterPossede = e.currentTarget.value;
      this.render();
    });

    html.find(".pvb-clear").on("click", () => {
      this._search        = "";
      this._filterCat     = "all";
      this._filterPossede = "all";
      this._expanded.clear();
      this.render();
    });

    // Toggle description
    html.find("[data-action='togglePouvoirDesc']").on("click", e => {
      const idx = e.currentTarget.closest("[data-pouvoir-idx]")?.dataset?.pouvoirIdx;
      if (idx === undefined) return;
      const descRow = html.find(`.pvb-desc-row[data-pouvoir-idx="${idx}"]`);
      const icon    = e.currentTarget.querySelector("i");
      if (this._expanded.has(idx)) {
        this._expanded.delete(idx);
        descRow.slideUp(120);
        icon?.classList.replace("fa-chevron-down", "fa-chevron-right");
      } else {
        this._expanded.add(idx);
        descRow.slideDown(120);
        icon?.classList.replace("fa-chevron-right", "fa-chevron-down");
      }
    });

    html.find("[data-action='addPouvoir']").on("click", async e => {
      const idx = parseInt(e.currentTarget.closest("[data-pouvoir-idx]")?.dataset?.pouvoirIdx ?? "");
      if (isNaN(idx)) return;
      const d = POUVOIRS_DATA[idx];
      if (!d) return;

      await Item.create({
        name  : d.name,
        type  : "pouvoir",
        system: {
          categorie  : d.categorie   ?? "flamme",
          description: d.description ?? "",
        },
      }, { parent: this.actor });

      ui.notifications?.info(game.i18n.format("AGONE.Notif.PouvoirAjoute", { nom: d.name, acteur: this.actor.name }));
      this.render();
    });
  }

}
