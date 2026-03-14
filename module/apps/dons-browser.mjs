import { DONS_DATA } from "../helpers/compendium-data.mjs";

/**
 * Navigateur d'avantages & défauts (Dons) Agone — fenêtre de sélection avec filtres.
 */
export class DonsBrowser extends Application {

  constructor(actor, options = {}) {
    super(options);
    this.actor          = actor;
    this._search        = "";
    this._filterCat     = "all";   // "all" | "avantage" | "defaut"
    this._filterPossede = "all";   // "all" | "oui" | "non"
    this._expanded      = new Set();
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id        : "agone-dons-browser",
      classes   : ["agone", "dons-browser"],
      template  : "systems/agone/templates/apps/dons-browser.hbs",
      width     : 700,
      height    : 560,
      resizable : true,
    });
  }

  get title() {
    return `Avantages & Défauts — ${this.actor.name}`;
  }

  /** @override */
  async getData() {
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
      expanded   : this._expanded.has(String(idx)),
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

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

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
      this._expanded.clear();
      this.render();
    });

    // Toggle description (sans re-render)
    html.find("[data-action='toggleDonDesc']").on("click", e => {
      const idx = e.currentTarget.closest("[data-don-idx]")?.dataset?.donIdx;
      if (idx === undefined) return;
      const descRow = html.find(`.db-desc-row[data-don-idx="${idx}"]`);
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

      ui.notifications?.info(`${d.name} ajouté à ${this.actor.name}.`);
      this.render();
    });
  }

  /** @override */
  async _render(force, options) {
    await super._render(force, options);
    const sel = this._refocusSelector;
    if (sel) {
      this._refocusSelector = null;
      requestAnimationFrame(() => {
        const el = this.element.find(sel)[0];
        if (el) {
          el.focus();
          if (typeof el.setSelectionRange === "function") {
            try { el.setSelectionRange(el.value.length, el.value.length); } catch {}
          }
        }
      });
    }
  }
}
