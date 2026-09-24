import { AVANTAGES_DATA, AVANTAGES_EFFETS } from "../helpers/compendium-data.mjs";
import { effetsDepuisTable } from "../helpers/effets.mjs";
import { AgoneBrowser } from "./agone-browser.mjs";

// Libellés lisibles des catégories
function _buildCatLabels() {
  return {
    charge  : game.i18n.localize("AGONE.CategorieCharges"),
    ame     : game.i18n.localize("AGONE.Ame"),
    corps   : game.i18n.localize("AGONE.Corps"),
    esprit  : game.i18n.localize("AGONE.Esprit"),
    societe : game.i18n.localize("AGONE.CategorieSociete"),
    emprise : game.i18n.localize("AGONE.Emprise"),
    arts    : game.i18n.localize("AGONE.CategorieArts"),
    saisons : game.i18n.localize("AGONE.CategorieSaisons"),
    flamme  : game.i18n.localize("AGONE.Flamme"),
  };
}

/**
 * Navigateur d'avantages & défauts (données PDF) — fenêtre de sélection avec filtres.
 */
export class AvantagesBrowser extends AgoneBrowser {

  constructor(actor, options = {}) {
    super(actor, options);
    this._filterType = options.filterType ?? "all";
  }

  static ITEM_TYPE = "don";

  static FILTER_DEFAULTS = {
    _search           : "",
    _filterSection    : "all",
    _filterType       : "all",
    _filterPossede    : "all",
    _filterChargeExact: null,
  };

  static FILTERS = {
    ".avb-search"         : { kind: "text",   prop: "_search" },
    ".avb-section-filter" : { kind: "select", prop: "_filterSection" },
    ".avb-type-filter"    : { kind: "select", prop: "_filterType" },
    ".avb-charge-filter"  : { kind: "number", prop: "_filterChargeExact" },
    ".avb-possede-filter" : { kind: "select", prop: "_filterPossede" },
    ".avb-clear"          : { kind: "reset" },
  };

  static DEFAULT_OPTIONS = {
    id      : "agone-avantages-browser",
    classes : ["agone", "avantages-browser"],
    position: { width: 740, height: 580 },
    actions : { addAvantage: AvantagesBrowser.#onAddAvantage },
  };

  static PARTS = {
    form: { template: "systems/agone/templates/apps/avantages-browser.hbs" },
  };

  get title() {
    return game.i18n.format("AGONE.Browser.TitreAvantages", { nom: this.actor.name });
  }

  async _prepareContext(options) {
    const actorDonNames = new Set(
      this.actor.items.filter(i => i.type === "don").map(i => i.name)
    );

    let items = AVANTAGES_DATA.map((d, idx) => ({
      idx        : String(idx),
      name       : d.name,
      section    : d.categorie,
      sectionLabel: _buildCatLabels()[d.categorie] ?? d.categorie,
      type       : d.type,
      charge     : d.charge,
      chargeAbs  : Math.abs(d.charge),
      prerequis  : d.prerequis ?? "",
      description: d.description ?? "",
      hasInActor : actorDonNames.has(d.name),
    }));

    // Filtres
    items = this._applySearch(items, ["name", "description", "prerequis"]);
    if (this._filterSection !== "all") {
      items = items.filter(e => e.section === this._filterSection);
    }
    if (this._filterType !== "all") {
      items = items.filter(e => e.type === this._filterType);
    }
    if (this._filterPossede === "oui") {
      items = items.filter(e => e.hasInActor);
    } else if (this._filterPossede === "non") {
      items = items.filter(e => !e.hasInActor);
    }
    if (this._filterChargeExact !== null) {
      items = items.filter(e => e.charge === this._filterChargeExact);
    }

    this._trier(items, (a, b) => {
      // Avantages avant défauts, puis par section, puis par nom
      if (a.type !== b.type) return a.type === "avantage" ? -1 : 1;
      if (a.section !== b.section) return a.section.localeCompare(b.section, "fr");
      return a.name.localeCompare(b.name, "fr");
    });

    const allCharges = [...new Set(AVANTAGES_DATA.map(d => d.charge).filter(v => v != null))]
      .sort((a, b) => a - b);

    return {
      items,
      search            : this._search,
      filterSection     : this._filterSection,
      filterType        : this._filterType,
      filterPossede     : this._filterPossede,
      filterChargeExact : this._filterChargeExact,
      allCharges,
      sections          : Object.entries(_buildCatLabels()).map(([k, v]) => ({ key: k, label: v })),
    };
  }

  static async #onAddAvantage(event, target) {
    const d = AgoneBrowser._entryFromTarget(target, AVANTAGES_DATA, "avIdx");
    if (!d) return;

    // ----- Validation : effets négatifs sur stats primaires -----
    const PRIMAIRES   = ['agilite','force','perception','resistance','intelligence','volonte','charisma','creativite','corps','esprit','ame'];
    const effets      = AVANTAGES_EFFETS[d.name] ?? [];
    const sd          = this.actor.system;
    const tbl         = CONFIG.AGONE?.tableAchatCreation ?? [0,1,2,3,4,5,7,10,14,19,25];
    const lastDelta   = tbl[tbl.length-1] - tbl[tbl.length-2];
    const creaTotal   = (n) => n <= 0 ? 0 : n < tbl.length ? tbl[n] : tbl[tbl.length-1] + (n - (tbl.length - 1)) * lastDelta;
    const update      = {};

    for (const effet of effets) {
      const k = effet.stat;
      if (!PRIMAIRES.includes(k) || effet.delta === undefined || effet.delta >= 0) continue;
      const newEffective = (sd[k]?.score ?? 0) + effet.delta;
      if (newEffective >= 0) continue;

      const deficit = -newEffective;
      if (sd.modeCreation) {
        const racialBonus = sd.peupleBonusApplique?.[`${k}Bonus`] ?? 0;
        const dbStored    = (sd[k]?.score ?? 0) - (sd[k]?.avantageBonus ?? 0);
        const rawBase     = Math.max(0, dbStored - racialBonus);
        const cost        = creaTotal(rawBase + deficit) - creaTotal(rawBase);
        const depense     = update["system.ptsCreationCarac.depense"] ?? sd.ptsCreationCarac.depense;
        const available   = sd.ptsCreationCarac.max - depense;
        if (cost <= available) {
          const caracLabel = game.i18n.localize(`AGONE.Attribut.${k.charAt(0).toUpperCase() + k.slice(1)}`) || k;
          update[`system.${k}.score`] = dbStored + deficit;
          update["system.ptsCreationCarac.depense"] = depense + cost;
          ui.notifications.info(game.i18n.format("AGONE.BonusSuppCompensation", { carac: caracLabel, cost }));
        } else {
          ui.notifications.warn(game.i18n.format("AGONE.BonusSuppInsuffisantPts", { cost, available }));
          return;
        }
      } else {
        ui.notifications.warn(game.i18n.localize("AGONE.BonusSuppNegatifRefuse"));
        return;
      }
    }

    // Appliquer la compensation avant de créer l'item
    if (Object.keys(update).length > 0) {
      await this.actor.update(update);
    }

    // Description enrichie avec prérequis si présents
    let desc = d.description ?? "";
    if (d.prerequis) desc = `<em>${game.i18n.localize("AGONE.Prerequis")} : ${d.prerequis}</em><br>${desc}`;

    await Item.create({
      name  : d.name,
      type  : "don",
      // Effets mécaniques (bonus/malus) : ActiveEffect modifiables depuis la fiche de l'item
      effects: effetsDepuisTable(d.name),
      system: {
        categorie  : d.type,        // "avantage" | "defaut"
        typeCharge : d.categorie,   // thème : charge | ame | corps | ...
        cout       : d.charge,
        description: desc,
      },
    }, { parent: this.actor });

    ui.notifications?.info(game.i18n.format("AGONE.Notif.AvantageAjoute", { nom: d.name, acteur: this.actor.name }));
    this.render();
  }

}
