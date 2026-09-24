import { ARMES_DATA, BOUCLIERS_DATA } from "../helpers/compendium-data.mjs";
import { AgoneBrowser } from "./agone-browser.mjs";

const _ALL_ARMES_DATA = [...ARMES_DATA, ...BOUCLIERS_DATA];

/**
 * Navigateur d'armes Agone — fenêtre de sélection avec filtres.
 */
export class ArmesBrowser extends AgoneBrowser {

  static FILTER_DEFAULTS = {
    _search       : "",
    _filterStyles : new Set(),
    _filterTypes  : new Set(),
    _filterReqFor : null,
    _filterPossede: "all",
  };

  static FILTERS = {
    ".ab-search"         : { kind: "text",   prop: "_search" },
    ".ab-all-style"      : { kind: "setAll", prop: "_filterStyles" },
    ".ab-style-check"    : { kind: "set",    prop: "_filterStyles" },
    ".ab-all-type"       : { kind: "setAll", prop: "_filterTypes" },
    ".ab-type-check"     : { kind: "set",    prop: "_filterTypes" },
    ".ab-req-for"        : { kind: "number", prop: "_filterReqFor", debounce: 300 },
    ".ab-possede-filter" : { kind: "select", prop: "_filterPossede" },
    ".ab-clear"          : { kind: "reset" },
  };

  static DEFAULT_OPTIONS = {
    id      : "agone-armes-browser",
    classes : ["agone", "armes-browser"],
    position: { width: 900, height: 640 },
    actions : { addArme: ArmesBrowser.#onAddArme },
  };

  static PARTS = {
    form: { template: "systems/agone/templates/apps/armes-browser.hbs" },
  };

  get title() {
    return game.i18n.format("AGONE.Browser.TitreArmes", { nom: this.actor.name });
  }

  async _prepareContext(options) {
    const actorArmeNames = new Set(
      this.actor.items.filter(i => i.type === "arme").map(i => i.name)
    );

    const STYLE_LABELS = {
      melee   : game.i18n.localize("AGONE.Melee"),
      trait   : game.i18n.localize("AGONE.Arme.Trait"),
      jet     : game.i18n.localize("AGONE.Lancer"),
      bouclier: game.i18n.localize("AGONE.Bouclier"),
    };
    const TYPE_LABELS = {
      P : game.i18n.localize("AGONE.Arme.Perforant"),
      T : game.i18n.localize("AGONE.Arme.Tranchant"),
      C : game.i18n.localize("AGONE.Arme.Contondant"),
      TC: game.i18n.localize("AGONE.TranchanteContondant"),
      PC: game.i18n.localize("AGONE.PercutanteContondant"),
      PT: game.i18n.localize("AGONE.Arme.PerforantTranchant"),
    };

    let armes = _ALL_ARMES_DATA.map((d, idx) => ({
      idx        : String(idx),
      name       : d.name,
      style      : d.style,
      styleLabel : STYLE_LABELS[d.style] ?? d.style,
      type       : d.type,
      tai        : d.tai,
      initBonus  : d.initBonus,
      attackBonus: d.attackBonus,
      defenseBonus: d.defenseBonus,
      dommages   : d.dommages,
      portee     : d.portee ?? "—",
      reqFor     : d.reqFor ?? 0,
      reqAgi     : d.reqAgi ?? 0,
      protection : d.protection ?? 0,
      malusAgi   : d.malusAgi ?? 0,
      description: d.description ?? "",
      hasInActor : actorArmeNames.has(d.name),
    }));

    // Filtres
    if (this._search) {
      const s = this._search.toLowerCase();
      armes = armes.filter(e => e.name.toLowerCase().includes(s));
    }
    if (this._filterStyles.size > 0) {
      armes = armes.filter(e => this._filterStyles.has(e.style));
    }
    if (this._filterTypes.size > 0) {
      armes = armes.filter(e => this._filterTypes.has(e.type));
    }
    if (this._filterReqFor !== null) {
      armes = armes.filter(e => e.reqFor <= this._filterReqFor);
    }
    if (this._filterPossede === "oui") {
      armes = armes.filter(e => e.hasInActor);
    } else if (this._filterPossede === "non") {
      armes = armes.filter(e => !e.hasInActor);
    }

    armes.sort((a, b) => a.name.localeCompare(b.name, "fr"));

    const allStyles = ["melee","trait","jet","bouclier"].map(s => ({
      value: s, label: STYLE_LABELS[s] ?? s, active: this._filterStyles.has(s)
    }));
    const allTypes = [...new Set(_ALL_ARMES_DATA.map(d => d.type).filter(Boolean))].sort()
      .map(t => ({ value: t, label: TYPE_LABELS[t] ?? t, active: this._filterTypes.has(t) }));

    return {
      armes,
      allStyles,
      allTypes,
      search          : this._search,
      filterReqFor    : this._filterReqFor ?? "",
      filterPossede   : this._filterPossede,
      allStylesSelected: this._filterStyles.size === 0,
      allTypesSelected : this._filterTypes.size === 0,
    };
  }

  static async #onAddArme(event, target) {
    const d = AgoneBrowser._entryFromTarget(target, _ALL_ARMES_DATA, "armeIdx");
    if (!d) return;
    await this._addItem({
      name  : d.name,
      type  : "arme",
      system: {
        style       : d.style        ?? "melee",
        type        : d.type         ?? "P",
        tai         : d.tai          ?? 0,
        initBonus   : d.initBonus    ?? 0,
        attackBonus : d.attackBonus  ?? 0,
        defenseBonus: d.defenseBonus ?? 0,
        dommages    : d.dommages     ?? 0,
        portee      : d.portee       ?? "",
        reqFor      : d.reqFor       ?? 0,
        reqAgi      : d.reqAgi       ?? 0,
        protection  : d.protection   ?? 0,
        malusAgi    : d.malusAgi     ?? 0,
        description : d.description  ?? "",
      },
    }, "AGONE.Notif.ArmeAjoutee");
  }

}
