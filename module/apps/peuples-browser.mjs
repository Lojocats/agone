import { PEUPLES_DATA } from "../helpers/compendium-data.mjs";
import { avecSans, estVolant } from "../helpers/filtres-navigateurs.mjs";
import { AgoneBrowser } from "./agone-browser.mjs";

/**
 * Navigateur de peuples Agone — fenêtre de sélection avec filtres.
 * Applique un peuple sur l'acteur (via drag ou bouton Appliquer).
 */
export class PeuplesBrowser extends AgoneBrowser {

  static ITEM_TYPE = "peuple";

  static FILTER_DEFAULTS = {
    _search       : "",
    _filterSaison : "all",   // saison par défaut du peuple (clé de CONFIG.AGONE.saisons)
    _filterVol    : "all",   // "all" | "oui" (vitesse de vol > 0) | "non"
    _filterPossede: "all",
  };

  static FILTERS = {
    ".pb-search"         : { kind: "text",   prop: "_search" },
    ".pb-saison-filter"  : { kind: "select", prop: "_filterSaison" },
    ".pb-vol-filter"     : { kind: "select", prop: "_filterVol" },
    ".pb-possede-filter" : { kind: "select", prop: "_filterPossede" },
    ".pb-clear"          : { kind: "reset" },
  };

  static DEFAULT_OPTIONS = {
    id      : "agone-peuples-browser",
    classes : ["agone", "peuples-browser"],
    position: { width: 680, height: 540 },
    actions : { applyPeuple: PeuplesBrowser.#onApplyPeuple },
  };

  static PARTS = {
    form: { template: "systems/agone/templates/apps/peuples-browser.hbs" },
  };

  get title() {
    return game.i18n.format("AGONE.Browser.TitrePeuples", { nom: this.actor.name });
  }

  async _prepareContext(options) {
    const actorPeuple = this.actor.system.peuple ?? "";

    let items = PEUPLES_DATA.map((d, idx) => ({
      idx         : String(idx),
      name        : d.name,
      taiBase     : d.taiBase ?? 0,
      saison      : d.saisonDefaut ?? "",
      volant      : estVolant(d.mvVolBase),
      description : d.description ?? "",
      isActif     : actorPeuple === d.name,
    }));

    items = this._applySearch(items, ["name", "description"]);
    if (this._filterSaison !== "all") {
      items = items.filter(e => e.saison === this._filterSaison);
    }
    items = items.filter(e => avecSans(e.volant, this._filterVol));
    items = this._applyPossede(items, e => e.isActif);

    this._trier(items, (a, b) => a.name.localeCompare(b.name, "fr"));

    return {
      items,
      search        : this._search,
      filterPossede : this._filterPossede,
      filterSaison  : this._filterSaison,
      filterVol     : this._filterVol,
      saisons       : Object.entries(CONFIG.AGONE?.saisons ?? {}).filter(([k]) => k)
        .map(([value, label]) => ({ value, label: game.i18n.localize(label) })),
    };
  }

  static async #onApplyPeuple(event, target) {
    const d = AgoneBrowser._entryFromTarget(target, PEUPLES_DATA, "peupleIdx");
    if (!d) return;

    const pack  = game.packs.get("agone.peuples");
    const entry = pack ? (await pack.getIndex()).find(e => e.name === d.name) : null;
    const item  = entry ? await pack.getDocument(entry._id) : null;
    const sheet = this.actor.sheet;
    if (item && sheet?._applyPeuple) await sheet._applyPeuple(item);
    else                             await this.actor.update({ "system.peuple": d.name });

    ui.notifications?.info(game.i18n.format("AGONE.Notif.PeupleApplique", { nom: d.name, acteur: this.actor.name }));
    this.render();
  }

}
