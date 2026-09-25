import { ARMURES_DATA } from "../helpers/compendium-data.mjs";
import { auMoins, malusAuPlus } from "../helpers/filtres-navigateurs.mjs";
import { AgoneBrowser } from "./agone-browser.mjs";

/**
 * Navigateur d'armures & boucliers Agone — fenêtre de sélection avec filtres.
 */
export class ArmuresBrowser extends AgoneBrowser {

  static ITEM_TYPE = "armure";

  static FILTER_DEFAULTS = {
    _search           : "",
    _filterCouv       : new Set(),   // couvertures "0" | "1" | "2" (vide = toutes)
    _filterProtMin    : null,
    _filterMalusAgiMax: null,        // malus d'Agilité au plus X (valeur absolue)
    _filterPossede    : "all",
  };

  static FILTERS = {
    ".arb-search"         : { kind: "text",   prop: "_search" },
    ".arb-all-couv"       : { kind: "setAll", prop: "_filterCouv" },
    ".arb-couv-check"     : { kind: "set",    prop: "_filterCouv" },
    ".arb-prot-min"       : { kind: "number", prop: "_filterProtMin", debounce: 300 },
    ".arb-malus-agi-max"  : { kind: "number", prop: "_filterMalusAgiMax", debounce: 300 },
    ".arb-possede-filter" : { kind: "select", prop: "_filterPossede" },
    ".arb-clear"          : { kind: "reset" },
  };

  static DEFAULT_OPTIONS = {
    id      : "agone-armures-browser",
    classes : ["agone", "armures-browser"],
    actions : { addArmure: ArmuresBrowser.#onAddArmure },
  };

  static PARTS = {
    form: { template: "systems/agone/templates/apps/armures-browser.hbs" },
  };

  get title() {
    return game.i18n.format("AGONE.Browser.TitreArmures", { nom: this.actor.name });
  }

  async _prepareContext(options) {
    const actorArmureNames = new Set(
      this.actor.items.filter(i => i.type === "armure").map(i => i.name)
    );

    const TYPE_LABELS = {
      "0": game.i18n.localize("AGONE.Armure.VesteSeule"),
      "1": game.i18n.localize("AGONE.Armure.Partielle"),
      "2": game.i18n.localize("AGONE.Armure.Complete"),
    };

    let items = ARMURES_DATA.map((d, idx) => ({
      idx       : `a${idx}`,
      label     : d.name,
      type      : String(d.type ?? "0"),
      typeLabel : TYPE_LABELS[d.type] ?? d.type,
      protection: d.protection,
      malusAgi  : d.malusAgi ?? 0,
      malusPer  : d.malusPer ?? 0,
      hasInActor: actorArmureNames.has(d.name),
      raw        : d,
    }));

    // Filtres
    items = this._applySearch(items, ["label", "typeLabel"]);
    if (this._filterCouv.size > 0) {
      items = items.filter(e => this._filterCouv.has(e.type));
    }
    items = items.filter(e => auMoins(e.protection, this._filterProtMin)
      && malusAuPlus(e.malusAgi, this._filterMalusAgiMax));
    items = this._applyPossede(items);

    this._trier(items, (a, b) => (a.label ?? "").localeCompare(b.label ?? "", "fr"));

    return {
      items,
      search          : this._search,
      filterPossede   : this._filterPossede,
      filterProtMin   : this._filterProtMin ?? "",
      filterMalusAgiMax: this._filterMalusAgiMax ?? "",
      allCouv         : Object.entries(TYPE_LABELS).map(([value, label]) => ({
        value, label, active: this._filterCouv.has(value),
      })),
      allCouvSelected : this._filterCouv.size === 0,
    };
  }

  /** @override */
  static async #onAddArmure(event, target) {
    const idxRaw = target.closest("[data-armure-idx]")?.dataset?.armureIdx ?? "";
    const d = idxRaw.startsWith("a") ? ARMURES_DATA[parseInt(idxRaw.slice(1))] : null;
    if (!d) return;
    await this._addItem({
      name  : d.name,
      type  : "armure",
      system: {
        type       : d.type        ?? "0",
        protection : d.protection  ?? 0,
        malusAgi   : d.malusAgi    ?? 0,
        malusPer   : d.malusPer    ?? 0,
        description: d.description ?? "",
      },
    }, "AGONE.Notif.ArmureAjoutee");
  }

}
