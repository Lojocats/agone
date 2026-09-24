import { PEINES_PERFIDIE_DATA, descriptionBienfaitPeine } from "../helpers/compendium-data.mjs";
import { AgoneBrowser } from "./agone-browser.mjs";

// Libellés lisibles des catégories de peines de Perfidie
function _buildCatLabels() {
  return {
    creature_masque : game.i18n.localize("AGONE.PerfidieCatCreatures"),
    lieu_perfidie   : game.i18n.localize("AGONE.PerfidieCatLieu"),
    autre           : game.i18n.localize("AGONE.PerfidieCatAutres"),
  };
}

/**
 * Navigateur des Peines de Perfidie — fenêtre de sélection avec filtres.
 */
export class PeinesBrowser extends AgoneBrowser {

  static ITEM_TYPE = "peine";

  static FILTER_DEFAULTS = {
    _search         : "",
    _filterCategorie: "all",
    _filterNoir     : "all",
    _filterPossede  : "all",
  };

  static FILTERS = {
    ".pnb-search"     : { kind: "text",   prop: "_search" },
    ".pnb-cat-filter" : { kind: "select", prop: "_filterCategorie" },
    ".pnb-noir-filter": { kind: "select", prop: "_filterNoir" },
    ".pnb-possede-filter": { kind: "select", prop: "_filterPossede" },
    ".pnb-clear"      : { kind: "reset" },
  };

  static DEFAULT_OPTIONS = {
    id      : "agone-peines-browser",
    classes : ["agone", "peines-browser"],
    position: { width: 720, height: 560 },
    actions : { addPeine: PeinesBrowser.#onAddPeine },
  };

  static PARTS = {
    form: { template: "systems/agone/templates/apps/peines-browser.hbs" },
  };

  get title() {
    return game.i18n.format("AGONE.Browser.TitrePerfidie", { nom: this.actor.name });
  }

  async _prepareContext(options) {
    const actorPeineNames = new Set(
      this.actor.items.filter(i => i.type === "peine").map(i => i.name)
    );

    let items = PEINES_PERFIDIE_DATA.map((d, idx) => {
      const bienfaitInfo = descriptionBienfaitPeine({ system: { bienfait: d.bienfait, bienfaitDescription: "" } });
      return {
        idx          : String(idx),
        name         : d.name,
        categorie    : d.categorie,
        categorieLabel: _buildCatLabels()[d.categorie] ?? d.categorie,
        noirEffect   : d.noirEffect,   // "corps" | "ame" | ""
        noirLabel    : d.noirEffect === "corps" ? game.i18n.localize("AGONE.Corps") : d.noirEffect === "ame" ? game.i18n.localize("AGONE.Ame") : "—",
        noirEffectLabel: d.noirEffect === "corps" ? game.i18n.localize("AGONE.PerfidieCorpsNoir1")
                        : d.noirEffect === "ame"   ? game.i18n.localize("AGONE.PerfidieAmeNoire1")
                        : game.i18n.localize("AGONE.Aucun"),
        bienfait     : d.bienfait ?? "",
        bienfaitDescription: bienfaitInfo.texte,
        bienfaitHTML : bienfaitInfo.html,
        description  : d.description ?? "",
        hasInActor   : actorPeineNames.has(d.name),
      };
    });

    // Filtres
    items = this._applySearch(items, ["name", "bienfait", "description"]);
    if (this._filterCategorie !== "all") {
      items = items.filter(e => e.categorie === this._filterCategorie);
    }
    if (this._filterNoir !== "all") {
      items = items.filter(e => e.noirEffect === this._filterNoir);
    }
    items = this._applyPossede(items);

    this._trier(items, (a, b) => {
      if (a.categorie !== b.categorie) return a.categorie.localeCompare(b.categorie, "fr");
      return a.name.localeCompare(b.name, "fr");
    });

    return {
      items,
      search          : this._search,
      filterCategorie : this._filterCategorie,
      filterNoir      : this._filterNoir,
      filterPossede   : this._filterPossede,
      categories      : Object.entries(_buildCatLabels()).map(([k, v]) => ({ key: k, label: v })),
    };
  }

  static async #onAddPeine(event, target) {
    const d = AgoneBrowser._entryFromTarget(target, PEINES_PERFIDIE_DATA, "pnIdx");
    if (!d) return;
    await this._addItem({
      name  : d.name,
      type  : "peine",
      system: {
        categorie     : d.categorie,
        noirEffect    : d.noirEffect,
        bienfait      : d.bienfait ?? "",
        bienfaitAcquis: false,
        description   : d.description ?? "",
      },
    }, "AGONE.Notif.PeineAjoutee");
  }

}
