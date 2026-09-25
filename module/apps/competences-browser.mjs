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
    _filterAttribut: "all",   // clé de CONFIG.AGONE.attributs
    _filterPossede: "all",
  };

  static FILTERS = {
    ".cb-search"         : { kind: "text",   prop: "_search" },
    ".cb-all-check"      : { kind: "setAll", prop: "_filterFams" },
    ".cb-fam-check"      : { kind: "set",    prop: "_filterFams" },
    ".cb-attribut-filter": { kind: "select", prop: "_filterAttribut" },
    ".cb-possede-select" : { kind: "select", prop: "_filterPossede" },
    ".cb-clear"          : { kind: "reset", refocus: ".cb-search" },
  };

  static DEFAULT_OPTIONS = {
    id      : "agone-competences-browser",
    classes : ["agone", "competences-browser"],
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

    // Libellé localisé d'un attribut lié (clé brute à défaut)
    const ATTRIBUTS = CONFIG.AGONE?.attributs ?? {};
    const libelleAttribut = cle => ATTRIBUTS[cle] ? game.i18n.localize(ATTRIBUTS[cle].label) : cle;

    let competences = (CONFIG.AGONE?.competences ?? []).map(d => ({
      name        : d.name,
      displayName : d.name.replace(/\s*\([^)]*\)$/, '').trim(),
      famille     : d.famille,
      attributLie : d.attributLie,
      attributLabel: libelleAttribut(d.attributLie),
      count       : compCount[d.name] ?? 0,
    }));

    // Filtres
    competences = this._applySearch(competences, ["name", "famille"]);
    if (this._filterFams.size > 0) {
      competences = competences.filter(c => this._filterFams.has(c.famille));
    }
    if (this._filterAttribut !== "all") {
      competences = competences.filter(c => c.attributLie === this._filterAttribut);
    }
    competences = this._applyPossede(competences, c => c.count > 0);

    this._trier(competences, (a, b) => a.name.localeCompare(b.name, "fr"));

    const allFamilles = FAMILLES.map(f => ({
      value : f,
      label : f,
      active: this._filterFams.has(f),
    }));

    // Attributs liés à au moins une compétence de la liste de référence, dans l'ordre de CONFIG
    const utilises = new Set((CONFIG.AGONE?.competences ?? []).map(d => d.attributLie));
    const allAttributs = Object.keys(ATTRIBUTS).filter(k => utilises.has(k))
      .map(k => ({ value: k, label: libelleAttribut(k) }));

    return {
      competences,
      allFamilles,
      allAttributs,
      filterAttribut      : this._filterAttribut,
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
