import { SORTS_DATA } from "../helpers/compendium-data.mjs";
import { AgoneBrowser } from "./agone-browser.mjs";

/**
 * Navigateur de sorts Agone — fenêtre de sélection avec filtres.
 * Remplace l'ouverture brute du compendium.
 */
export class SortsBrowser extends AgoneBrowser {

  static ITEM_TYPE = "sort";

  static FILTER_DEFAULTS = {
    _search          : "",
    _filterTypes     : new Set(),
    _filterSeuilMax  : null,
    _filterSeuilExact: null,
    _filterPossede   : "all",
  };

  static FILTERS = {
    ".sb-search"         : { kind: "text",   prop: "_search" },
    ".sb-all-check"      : { kind: "setAll", prop: "_filterTypes" },
    ".sb-type-check"     : { kind: "set",    prop: "_filterTypes" },
    // Seuil exact et seuil max sont exclusifs
    ".sb-seuil-exact"    : { kind: "number", prop: "_filterSeuilExact",
                             onChange(v) { if (v !== null) this._filterSeuilMax = null; } },
    ".sb-seuil-max"      : { kind: "number", prop: "_filterSeuilMax", debounce: 300,
                             onChange(v) { if (v !== null) this._filterSeuilExact = null; } },
    ".sb-possede-filter" : { kind: "select", prop: "_filterPossede" },
    ".sb-clear"          : { kind: "reset" },
  };

  static DEFAULT_OPTIONS = {
    id      : "agone-sorts-browser",
    classes : ["agone", "sorts-browser"],
    position: { width: 820, height: 660 },
    actions : { addSort: SortsBrowser.#onAddSort, rollSortImpro: SortsBrowser.#onRollSortImpro },
  };

  static PARTS = {
    form: { template: "systems/agone/templates/apps/sorts-browser.hbs" },
  };

  get title() {
    return game.i18n.format("AGONE.Browser.TitreSorts", { nom: this.actor.name });
  }

  async _prepareContext(options) {
    // Un même nom peut exister dans plusieurs domaines (Créer un familier, Bénédiction…) :
    // un sort est identifié par son nom ET son type de magie
    const cleSort = (nom, type) => `${nom}|${(type ?? "").toLowerCase()}`;
    const actorSortNames = new Set(
      this.actor.items.filter(i => i.type === "sort").map(i => cleSort(i.name, i.system.typeMagie))
    );

    // Labels lisibles pour les types
    const TYPE_LABELS = {
      jorniste      : game.i18n.localize("AGONE.Jorniste"),
      obscurantiste : game.i18n.localize("AGONE.Obscurantiste"),
      eclipsiste    : game.i18n.localize("AGONE.Eclipsiste"),
      accord        : game.i18n.localize("AGONE.Accord"),
      cyse          : game.i18n.localize("AGONE.Cyse"),
      geste         : game.i18n.localize("AGONE.Geste"),
      decorum       : game.i18n.localize("AGONE.Decorum"),
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
      hasInActor: actorSortNames.has(cleSort(d.name, d.typeMagie)),
    }));

    // Filtres
    sorts = this._applySearch(sorts, ["name", "typeMagie", "description"]);
    if (this._filterTypes.size > 0) {
      sorts = sorts.filter(e => this._filterTypes.has(e.typeMagie));
    }
    if (this._filterSeuilExact !== null) {
      sorts = sorts.filter(e => e.seuil === this._filterSeuilExact);
    } else if (this._filterSeuilMax !== null) {
      sorts = sorts.filter(e => e.seuil <= this._filterSeuilMax);
    }
    if (this._filterPossede === "oui") {
      sorts = sorts.filter(e => e.hasInActor);
    } else if (this._filterPossede === "non") {
      sorts = sorts.filter(e => !e.hasInActor);
    }

    this._trier(sorts, (a, b) => a.name.localeCompare(b.name, "fr"));

    const allTypes = [...new Set(SORTS_DATA.map(d => d.typeMagie).filter(Boolean))]
      .sort()
      .map(t => ({ value: t, label: TYPE_LABELS[t] ?? t, active: this._filterTypes.has(t) }));

    const allSeuils = [...new Set(SORTS_DATA.map(d => d.seuil).filter(v => v != null))]
      .sort((a, b) => a - b);

    return {
      sorts,
      allTypes,
      allSeuils,
      search          : this._search,
      filterSeuilMax  : this._filterSeuilMax ?? "",
      filterSeuilExact: this._filterSeuilExact,
      filterPossede   : this._filterPossede,
      allTypesSelected: this._filterTypes.size === 0,
    };
  }

  static async #onRollSortImpro(event, target) {
    const d = AgoneBrowser._entryFromTarget(target, SORTS_DATA, "sortIdx");
    if (!d) return;

    // Sorts d'emprise (danseurs) : demander quel danseur utiliser
    const EMPRISE_TYPES = new Set(["jorniste", "obscurantiste", "eclipsiste"]);
    if (EMPRISE_TYPES.has(d.typeMagie)) {
      const danseurs = this.actor.items.filter(i => i.type === "danseur" && !i.system.modeCreation);
      if (!danseurs.length) {
        ui.notifications.warn(game.i18n.format("AGONE.Notif.AucunDanseurDisponible", { acteur: this.actor.name }));
        return;
      }
      let danseurId;
      if (danseurs.length === 1) {
        danseurId = danseurs[0].id;
      } else {
        const options = danseurs.map(dan => `<option value="${dan.id}">${dan.name}</option>`).join("");
        danseurId = await foundry.applications.api.DialogV2.prompt({
          window:  { title: game.i18n.format("AGONE.Browser.TitreDialogSortImpro", { nom: d.name }) },
          content: `<div class="form-group" style="margin:8px 0">
                      <label style="font-weight:600">${game.i18n.localize("AGONE.Browser.DanseurAUtiliser")}</label>
                      <select name="danseurId" style="width:100%;margin-top:4px">${options}</select>
                    </div>`,
          ok: { label: game.i18n.localize("AGONE.Lancer"), callback: (_ev, btn) => btn.form.elements.danseurId.value },
        });
        if (!danseurId) return;
      }
      await this.actor.rollSortImproDanseur(danseurId, { name: d.name, seuil: d.seuil, description: d.description ?? "", typeMagie: d.typeMagie ?? "", portee: d.portee ?? "", duree: d.duree ?? "", danse: d.danse ?? "" });
      return;
    }

    // Sort normal (Arts Magiques)
    const actorItem = this.actor.items.find(i => i.type === "sort" && i.name === d.name
      && (i.system.typeMagie ?? "").toLowerCase() === (d.typeMagie ?? "").toLowerCase());
    if (actorItem) {
      await this.actor.rollSort(actorItem.id, { impro: true });
    } else {
      await this.actor.rollSort(d, { impro: true });
    }
  }

  static async #onAddSort(event, target) {
    const d = AgoneBrowser._entryFromTarget(target, SORTS_DATA, "sortIdx");
    if (!d) return;
    await this._addItem({
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
    }, "AGONE.Notif.SortAjoute");
  }

}
