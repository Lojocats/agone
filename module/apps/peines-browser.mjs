import { PEINES_PERFIDIE_DATA } from "../helpers/compendium-data.mjs";

// Libellés lisibles des catégories de peines de Perfidie
const CAT_LABELS = {
  creature_masque : "Créatures du Masque",
  lieu_perfidie   : "Lieu de Perfidie",
  autre           : "Autres circonstances",
};

/**
 * Navigateur des Peines de Perfidie — fenêtre de sélection avec filtres.
 */
export class PeinesBrowser extends Application {

  constructor(actor, options = {}) {
    super(options);
    this.actor            = actor;
    this._search          = "";
    this._filterCategorie = "all";  // "all" | "creature_masque" | "lieu_perfidie" | "autre"
    this._filterNoir      = "all";  // "all" | "corps" | "ame"
    this._expanded        = new Set();
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id        : "agone-peines-browser",
      classes   : ["agone", "peines-browser"],
      template  : "systems/agone/templates/apps/peines-browser.hbs",
      width     : 720,
      height    : 560,
      resizable : true,
    });
  }

  get title() {
    return `Peines de Perfidie — ${this.actor.name}`;
  }

  /** @override */
  async getData() {
    const actorPeineNames = new Set(
      this.actor.items.filter(i => i.type === "peine").map(i => i.name)
    );

    let items = PEINES_PERFIDIE_DATA.map((d, idx) => ({
      idx          : String(idx),
      name         : d.name,
      categorie    : d.categorie,
      categorieLabel: CAT_LABELS[d.categorie] ?? d.categorie,
      noirEffect   : d.noirEffect,   // "corps" | "ame" | ""
      noirLabel    : d.noirEffect === "corps" ? "Corps" : d.noirEffect === "ame" ? "Âme" : "—",
      bienfait     : d.bienfait ?? "",
      description  : d.description ?? "",
      hasInActor   : actorPeineNames.has(d.name),
      expanded     : this._expanded.has(String(idx)),
    }));

    // Filtres
    if (this._search) {
      const s = this._search.toLowerCase();
      items = items.filter(e =>
        e.name.toLowerCase().includes(s) ||
        e.description.toLowerCase().includes(s) ||
        (e.bienfait ?? "").toLowerCase().includes(s)
      );
    }
    if (this._filterCategorie !== "all") {
      items = items.filter(e => e.categorie === this._filterCategorie);
    }
    if (this._filterNoir !== "all") {
      items = items.filter(e => e.noirEffect === this._filterNoir);
    }

    items.sort((a, b) => {
      if (a.categorie !== b.categorie) return a.categorie.localeCompare(b.categorie, "fr");
      return a.name.localeCompare(b.name, "fr");
    });

    return {
      items,
      search          : this._search,
      filterCategorie : this._filterCategorie,
      filterNoir      : this._filterNoir,
      categories      : Object.entries(CAT_LABELS).map(([k, v]) => ({ key: k, label: v })),
    };
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    html.find(".pnb-search").on("input", foundry.utils.debounce(e => {
      this._search = e.currentTarget.value.trim();
      this.render();
    }, 250));

    html.find(".pnb-cat-filter").on("change", e => {
      this._filterCategorie = e.currentTarget.value;
      this.render();
    });

    html.find(".pnb-noir-filter").on("change", e => {
      this._filterNoir = e.currentTarget.value;
      this.render();
    });

    html.find(".pnb-clear").on("click", () => {
      this._search          = "";
      this._filterCategorie = "all";
      this._filterNoir      = "all";
      this._expanded.clear();
      this.render();
    });

    // Toggle description (sans re-render)
    html.find("[data-action='togglePeineDesc']").on("click", e => {
      const idx     = e.currentTarget.closest("[data-pn-idx]")?.dataset?.pnIdx;
      if (idx === undefined) return;
      const descRow = html.find(`.pnb-desc-row[data-pn-idx="${idx}"]`);
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

    html.find("[data-action='addPeine']").on("click", async e => {
      const idx = parseInt(e.currentTarget.closest("[data-pn-idx]")?.dataset?.pnIdx ?? "");
      if (isNaN(idx)) return;
      const d = PEINES_PERFIDIE_DATA[idx];
      if (!d) return;

      await Item.create({
        name  : d.name,
        type  : "peine",
        system: {
          categorie    : d.categorie,
          noirEffect   : d.noirEffect,
          bienfait     : d.bienfait ?? "",
          bienfaitAcquis: false,
          description  : d.description ?? "",
        },
      }, { parent: this.actor });

      ui.notifications?.info(`${d.name} ajoutée à ${this.actor.name}.`);
      this.render();
    });
  }
}
