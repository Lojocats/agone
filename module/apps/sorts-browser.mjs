import { SORTS_DATA } from "../helpers/compendium-data.mjs";

/**
 * Navigateur de sorts Agone — fenêtre de sélection avec filtres.
 * Remplace l'ouverture brute du compendium.
 */
export class SortsBrowser extends Application {

  constructor(actor, options = {}) {
    super(options);
    this.actor          = actor;
    this._search        = "";
    this._filterTypes   = new Set();   // multi-select : ensemble de typeMagie
    this._filterSeuilMax = null;       // null = pas de filtre, sinon Number
    this._filterPossede  = "all";      // "all" | "oui" | "non"
    this._expanded = new Set(); // set of string idx
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id        : "agone-sorts-browser",
      classes   : ["agone", "sorts-browser"],
      template  : "systems/agone/templates/apps/sorts-browser.hbs",
      width     : 820,
      height    : 660,
      resizable : true,
    });
  }

  get title() {
    return `Sorts — ${this.actor.name}`;
  }

  /** @override */
  async getData() {
    const actorSortNames = new Set(
      this.actor.items.filter(i => i.type === "sort").map(i => i.name)
    );

    // Labels lisibles pour les types
    const TYPE_LABELS = {
      jorniste      : "Jorniste",
      obscurantiste : "Obscurantiste",
      eclipsiste    : "Éclipsiste",
      accord        : "Accord",
      cyse          : "Cyse",
      geste         : "Geste",
      decorum       : "Décorum",
    };

    let sorts = SORTS_DATA.map((d, idx) => ({
      idx       : String(idx),
      name      : d.name,
      typeMagie : d.typeMagie,
      instrument: d.instrument,
      seuil     : d.seuil,
      portee    : d.portee,
      duree     : d.duree,
      danse     : d.danse,
      description: d.description ?? "",
      hasInActor: actorSortNames.has(d.name),
      expanded  : this._expanded.has(String(idx)),
    }));

    // Filtres
    if (this._search) {
      const s = this._search.toLowerCase();
      sorts = sorts.filter(e =>
        e.name.toLowerCase().includes(s) ||
        e.description.toLowerCase().includes(s)
      );
    }
    if (this._filterTypes.size > 0) {
      sorts = sorts.filter(e => this._filterTypes.has(e.typeMagie));
    }
    if (this._filterSeuilMax !== null) {
      sorts = sorts.filter(e => e.seuil <= this._filterSeuilMax);
    }
    if (this._filterPossede === "oui") {
      sorts = sorts.filter(e => e.hasInActor);
    } else if (this._filterPossede === "non") {
      sorts = sorts.filter(e => !e.hasInActor);
    }

    sorts.sort((a, b) => a.name.localeCompare(b.name, "fr"));

    const allTypes = [...new Set(SORTS_DATA.map(d => d.typeMagie).filter(Boolean))]
      .sort()
      .map(t => ({ value: t, label: TYPE_LABELS[t] ?? t, active: this._filterTypes.has(t) }));

    return {
      sorts,
      allTypes,
      search         : this._search,
      filterSeuilMax : this._filterSeuilMax ?? "",
      filterPossede  : this._filterPossede,
      allTypesSelected: this._filterTypes.size === 0,
    };
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Recherche (avec debounce)
    html.find(".sb-search").on("input", foundry.utils.debounce(e => {
      this._search = e.currentTarget.value.trim();
      this.render();
    }, 250));

    // Checkbox "Tous" — efface la sélection de type
    html.find(".sb-all-check").on("change", () => {
      this._filterTypes.clear();
      this.render();
    });

    // Checkboxes de type (multi-select)
    html.find(".sb-type-check").on("change", e => {
      const t = e.currentTarget.value;
      if (e.currentTarget.checked) this._filterTypes.add(t);
      else this._filterTypes.delete(t);
      this.render();
    });

    // Filtre seuil max
    html.find(".sb-seuil-max").on("input", foundry.utils.debounce(e => {
      const v = parseInt(e.currentTarget.value);
      this._filterSeuilMax = isNaN(v) ? null : v;
      this.render();
    }, 300));

    // Filtre possédé
    html.find(".sb-possede-filter").on("change", e => {
      this._filterPossede = e.currentTarget.value;
      this.render();
    });

    // Effacer les filtres
    html.find(".sb-clear").on("click", () => {
      this._search        = "";
      this._filterTypes.clear();
      this._filterSeuilMax = null;
      this._filterPossede  = "all";
      this.render();
    });

    // Toggle description (sans re-render)
    html.find("[data-action='toggleSortDescBrowser']").on("click", e => {
      const idx = e.currentTarget.closest("[data-sort-idx]")?.dataset?.sortIdx;
      if (idx === undefined) return;
      const descRow = html.find(`.sort-desc-row[data-sort-idx="${idx}"]`);
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

    // Ajouter un sort au personnage
    html.find("[data-action='addSort']").on("click", async e => {
      const idx = parseInt(e.currentTarget.closest("[data-sort-idx]")?.dataset?.sortIdx ?? "");
      if (isNaN(idx)) return;
      const d = SORTS_DATA[idx];
      if (!d) return;

      await Item.create({
        name  : d.name,
        type  : "sort",
        system: {
          typeMagie  : d.typeMagie   ?? "",
          seuil      : d.seuil       ?? 0,
          portee     : d.portee      ?? "",
          duree      : d.duree       ?? "",
          danse      : d.danse       ?? "",
          instrument : d.instrument  ?? "",
          special    : d.special     ?? "",
          description: d.description ?? "",
        },
      }, { parent: this.actor });

      ui.notifications?.info(`${d.name} ajouté à ${this.actor.name}.`);
      this.render(); // rafraîchit le checkmark
    });
  }
}
