import { MANOEUVRES_DATA } from "../helpers/compendium-data.mjs";

/**
 * Navigateur de manœuvres & bottes Agone — fenêtre de sélection avec filtres.
 */
export class ManoeuvresBrowser extends Application {

  constructor(actor, options = {}) {
    super(options);
    this.actor          = actor;
    this._search        = "";
    this._filterCat     = "all";   // "all" | "manoeuvre" | "botte"
    this._filterPossede = "all";   // "all" | "oui" | "non"
    this._expanded      = new Set();
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id        : "agone-manoeuvres-browser",
      classes   : ["agone", "manoeuvres-browser"],
      template  : "systems/agone/templates/apps/manoeuvres-browser.hbs",
      width     : 720,
      height    : 580,
      resizable : true,
    });
  }

  get title() {
    return `Manœuvres & Bottes — ${this.actor.name}`;
  }

  /** @override */
  async getData() {
    const actorManNames = new Set(
      this.actor.items.filter(i => i.type === "manoeuvre").map(i => i.name)
    );

    let items = MANOEUVRES_DATA.map((d, idx) => ({
      idx       : String(idx),
      name      : d.name,
      categorie : d.categorie,
      score     : d.score ?? 0,
      malus     : d.malus ?? 0,
      description: d.description ?? "",
      hasInActor: actorManNames.has(d.name),
      expanded  : this._expanded.has(String(idx)),
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

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    html.find(".mb-search").on("input", foundry.utils.debounce(e => {
      this._search = e.currentTarget.value.trim();
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
      this._expanded.clear();
      this.render();
    });

    // Toggle description (sans re-render)
    html.find("[data-action='toggleManDesc']").on("click", e => {
      const idx = e.currentTarget.closest("[data-man-idx]")?.dataset?.manIdx;
      if (idx === undefined) return;
      const descRow = html.find(`.mb-desc-row[data-man-idx="${idx}"]`);
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

    html.find("[data-action='addManoeuvre']").on("click", async e => {
      const idx = parseInt(e.currentTarget.closest("[data-man-idx]")?.dataset?.manIdx ?? "");
      if (isNaN(idx)) return;
      const d = MANOEUVRES_DATA[idx];
      if (!d) return;

      await Item.create({
        name  : d.name,
        type  : "manoeuvre",
        system: {
          categorie  : d.categorie  ?? "manoeuvre",
          score      : d.score       ?? 0,
          malus      : d.malus       ?? 0,
          description: d.description ?? "",
        },
      }, { parent: this.actor });

      ui.notifications?.info(`${d.name} ajouté(e) à ${this.actor.name}.`);
      this.render();
    });
  }
}
