import { POUVOIRS_DATA } from "../helpers/compendium-data.mjs";
import { AgoneBrowser } from "./agone-browser.mjs";

/**
 * Navigateur de Pouvoirs de Flamme & Saisonins Agone — fenêtre de sélection avec filtres.
 */
export class PouvoirsBrowser extends AgoneBrowser {

  static ITEM_TYPE = "pouvoir";

  static FILTER_DEFAULTS = {
    _search       : "",
    _filterCat    : "all",
    _filterPossede: "all",
  };

  static FILTERS = {
    ".pvb-search"         : { kind: "text",   prop: "_search" },
    ".pvb-cat-filter"     : { kind: "select", prop: "_filterCat" },
    ".pvb-possede-filter" : { kind: "select", prop: "_filterPossede" },
    ".pvb-clear"          : { kind: "reset" },
  };

  static DEFAULT_OPTIONS = {
    id      : "agone-pouvoirs-browser",
    classes : ["agone", "pouvoirs-browser"],
    position: { width: 680, height: 560 },
    actions : { addPouvoir: PouvoirsBrowser.#onAddPouvoir },
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
    }));

    items = this._applySearch(items, ["name", "description"]);
    if (this._filterCat !== "all") {
      items = items.filter(e => e.categorie === this._filterCat);
    }
    if (this._filterPossede === "oui") {
      items = items.filter(e => e.hasInActor);
    } else if (this._filterPossede === "non") {
      items = items.filter(e => !e.hasInActor);
    }

    this._trier(items, (a, b) => {
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

  static async #onAddPouvoir(event, target) {
    const d = AgoneBrowser._entryFromTarget(target, POUVOIRS_DATA, "pouvoirIdx");
    if (!d) return;
    await this._addItem({
      name  : d.name,
      type  : "pouvoir",
      system: {
        categorie  : d.categorie   ?? "flamme",
        description: d.description ?? "",
      },
    }, "AGONE.Notif.PouvoirAjoute");
  }

}
