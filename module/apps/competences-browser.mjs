import { AgoneBrowser } from "./agone-browser.mjs";

/**
 * Navigateur de compétences Agone — fenêtre de sélection avec filtres.
 * Permet d'ajouter des compétences depuis la liste de référence CONFIG.AGONE.competences.
 * Une même compétence peut être ajoutée plusieurs fois (ex : Arts Magiques avec domaines différents).
 */
export class CompetencesBrowser extends AgoneBrowser {

  static ITEM_TYPE = "competence";

  static FILTER_DEFAULTS = {
    _search       : "",
    _filterFams   : new Set(),
    _filterPossede: "all",
  };

  static FILTERS = {
    ".cb-search"         : { kind: "text",   prop: "_search" },
    ".cb-search-clear"   : { kind: "reset",  props: ["_search"], refocus: ".cb-search" },
    ".cb-all-check"      : { kind: "setAll", prop: "_filterFams" },
    ".cb-fam-check"      : { kind: "set",    prop: "_filterFams" },
    ".cb-possede-select" : { kind: "select", prop: "_filterPossede" },
  };

  static DEFAULT_OPTIONS = {
    id      : "agone-competences-browser",
    classes : ["agone", "competences-browser"],
    position: { width: 660, height: 560 },
    actions : { addCompetence: CompetencesBrowser.#onAddCompetence },
  };

  static PARTS = {
    form: { template: "systems/agone/templates/apps/competences-browser.hbs" },
  };

  get title() {
    return game.i18n.format("AGONE.Browser.TitreComp", { nom: this.actor.name });
  }

  async _prepareContext(options) {
    const FAMILLES = ["Épreuve", "Maraude", "Savoir", "Société", "Occulte"];

    // Compter combien de fois chaque compétence est possédée
    const compCount = {};
    for (const item of this.actor.items) {
      if (item.type !== "competence") continue;
      compCount[item.name] = (compCount[item.name] ?? 0) + 1;
    }

    let competences = (CONFIG.AGONE?.competences ?? []).map(d => ({
      name        : d.name,
      displayName : d.name.replace(/\s*\([^)]*\)$/, '').trim(),
      famille     : d.famille,
      attributLie : d.attributLie,
      count       : compCount[d.name] ?? 0,
    }));

    // Filtres
    if (this._search) {
      const s = this._search.toLowerCase();
      competences = competences.filter(c => c.name.toLowerCase().includes(s));
    }
    if (this._filterFams.size > 0) {
      competences = competences.filter(c => this._filterFams.has(c.famille));
    }
    if (this._filterPossede === "oui") {
      competences = competences.filter(c => c.count > 0);
    } else if (this._filterPossede === "non") {
      competences = competences.filter(c => c.count === 0);
    }

    competences.sort((a, b) => a.name.localeCompare(b.name, "fr"));

    const allFamilles = FAMILLES.map(f => ({
      value : f,
      label : f,
      active: this._filterFams.has(f),
    }));

    return {
      competences,
      allFamilles,
      search              : this._search,
      filterPossede       : this._filterPossede,
      allFamillesSelected : this._filterFams.size === 0,
    };
  }

  static async #onAddCompetence(event, target) {
    const { name, attributLie = "agilite" } = target.dataset;
    await this._addItem({
      name,
      type  : "competence",
      system: { domaine: "", attributLie, score: 0, exp: 0 },
    });
  }

}
