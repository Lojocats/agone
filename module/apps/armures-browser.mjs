import { ARMURES_DATA } from "../helpers/compendium-data.mjs";
import { AgoneBrowser } from "./agone-browser.mjs";

/**
 * Navigateur d'armures & boucliers Agone — fenêtre de sélection avec filtres.
 */
export class ArmuresBrowser extends AgoneBrowser {

  static ITEM_TYPE = "armure";

  static FILTER_DEFAULTS = {
    _search       : "",
    _filterPossede: "all",
  };

  static FILTERS = {
    ".arb-search"         : { kind: "text",   prop: "_search" },
    ".arb-possede-filter" : { kind: "select", prop: "_filterPossede" },
    ".arb-clear"          : { kind: "reset" },
  };

  static DEFAULT_OPTIONS = {
    id      : "agone-armures-browser",
    classes : ["agone", "armures-browser"],
    position: { width: 700, height: 560 },
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
      typeLabel : TYPE_LABELS[d.type] ?? d.type,
      protection: d.protection,
      malusAgi  : d.malusAgi ?? 0,
      malusPer  : d.malusPer ?? 0,
      hasInActor: actorArmureNames.has(d.name),
      raw        : d,
    }));

    // Filtres
    if (this._search) {
      const s = this._search.toLowerCase();
      items = items.filter(e => e.label.toLowerCase().includes(s));
    }
    if (this._filterPossede === "oui") {
      items = items.filter(e => e.hasInActor);
    } else if (this._filterPossede === "non") {
      items = items.filter(e => !e.hasInActor);
    }

    items.sort((a, b) => (a.label ?? "").localeCompare(b.label ?? "", "fr"));

    return {
      items,
      search          : this._search,
      filterPossede   : this._filterPossede,
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
