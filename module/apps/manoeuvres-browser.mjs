import { MANOEUVRES_DATA } from "../helpers/compendium-data.mjs";
import { AgoneBrowser } from "./agone-browser.mjs";

/**
 * Navigateur de manœuvres & bottes Agone — fenêtre de sélection avec filtres.
 */
export class ManoeuvresBrowser extends AgoneBrowser {

  static ITEM_TYPE = "manoeuvre";

  static FILTER_DEFAULTS = {
    _search       : "",
    _filterCat    : "all",
    _filterPossede: "all",
  };

  static FILTERS = {
    ".mb-search"         : { kind: "text",   prop: "_search" },
    ".mb-cat-filter"     : { kind: "select", prop: "_filterCat" },
    ".mb-possede-filter" : { kind: "select", prop: "_filterPossede" },
    ".mb-clear"          : { kind: "reset" },
  };

  static DEFAULT_OPTIONS = {
    id      : "agone-manoeuvres-browser",
    classes : ["agone", "manoeuvres-browser"],
    position: { width: 980, height: 600 },
    actions : { addManoeuvre: ManoeuvresBrowser.#onAddManoeuvre },
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

  static async #onAddManoeuvre(event, target) {
    const d = AgoneBrowser._entryFromTarget(target, MANOEUVRES_DATA, "manIdx");
    if (!d) return;
    await this._addItem({
      name  : d.name,
      type  : "manoeuvre",
      system: {
        categorie  : d.categorie   ?? "manoeuvre",
        ini        : d.ini         ?? 0,
        att        : d.att         ?? 0,
        def        : d.def         ?? 0,
        dom        : d.dom         ?? "0",
        condition  : d.condition   ?? "",
        description: d.description ?? "",
      },
    }, "AGONE.Notif.ManoeuvreAjoutee");
  }

}
