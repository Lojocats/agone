/**
 * Navigateur de compétences Agone — fenêtre de sélection avec filtres.
 * Permet d'ajouter des compétences depuis la liste de référence CONFIG.AGONE.competences.
 * Une même compétence peut être ajoutée plusieurs fois (ex : Arts Magiques avec domaines différents).
 */
export class CompetencesBrowser extends Application {

  constructor(actor, options = {}) {
    super(options);
    this.actor         = actor;
    this._search       = "";
    this._filterFams   = new Set();   // sous-ensemble de Épreuve/Maraude/Savoir/Société/Occulte
    this._filterPossede = "all";      // "all" | "oui" | "non"
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id        : "agone-competences-browser",
      classes   : ["agone", "competences-browser"],
      template  : "systems/agone/templates/apps/competences-browser.hbs",
      width     : 660,
      height    : 560,
      resizable : true,
    });
  }

  get title() {
    return game.i18n.format("AGONE.Browser.TitreComp", { nom: this.actor.name });
  }

  /** @override */
  async getData() {
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

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Recherche (avec debounce)
    html.find(".cb-search").on("input", foundry.utils.debounce(e => {
      this._search = e.currentTarget.value.trim();
      this._refocusSelector = ".cb-search";
      this.render();
    }, 250));

    // Effacer la recherche
    html.find(".cb-search-clear").on("click", () => {
      this._search = "";
      this._refocusSelector = ".cb-search";
      this.render();
    });

    // Checkbox "Tous" — efface le filtre de famille
    html.find(".cb-all-check").on("change", () => {
      this._filterFams.clear();
      this.render();
    });

    // Checkboxes de famille
    html.find(".cb-fam-check").on("change", e => {
      const f = e.currentTarget.value;
      if (e.currentTarget.checked) this._filterFams.add(f);
      else                         this._filterFams.delete(f);
      this.render();
    });

    // Filtre possédées
    html.find(".cb-possede-select").on("change", e => {
      this._filterPossede = e.currentTarget.value;
      this.render();
    });

    // Bouton ajouter
    html.find("[data-action='addCompetence']").on("click", async e => {
      const btn          = e.currentTarget;
      const name         = btn.dataset.name;
      const attributLie  = btn.dataset.attributLie ?? "agilite";
      await Item.create({
        name,
        type  : "competence",
        system: { domaine: "", attributLie, score: 0, exp: 0 }
      }, { parent: this.actor });
      this.render();
    });
  }

  /** @override */
  async _render(force, options) {
    await super._render(force, options);
    const sel = this._refocusSelector;
    if (sel) {
      this._refocusSelector = null;
      requestAnimationFrame(() => {
        const el = this.element.find(sel)[0];
        if (el) {
          el.focus();
          if (typeof el.setSelectionRange === "function") {
            try { el.setSelectionRange(el.value.length, el.value.length); } catch {}
          }
        }
      });
    }
  }
}
