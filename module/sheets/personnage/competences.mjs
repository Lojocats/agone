import { bindCompetenceSearch } from "../sheet-helpers.mjs";
import { competencesParScore } from "../actor-context.mjs";

/**
 * Onglet Compétences : regroupement (famille / score), compétences non acquises, jets.
 */
export const CompetencesMixin = Base => class extends Base {

  /** Données de contexte de l'onglet. */
  _prepareCompetencesContext(context) {
    const actor  = this.actor;

    // Compétences non encore acquises par le personnage (pour jet avec malus -3)
    const _acquisNoms = new Set(actor.items.filter(i => i.type === "competence").map(i => i.name));
    context.competencesNonAcquises = (CONFIG.AGONE.competences ?? [])
      .filter(c => !_acquisNoms.has(c.name))
      .map(c => ({ ...c, displayName: c.name.replace(/\s*\([^)]*\)$/, '').trim() }));

    // Grouper les compétences acquises — adaptatif selon le flag de tri
    const _compFamilleMap = new Map((CONFIG.AGONE.competences ?? []).map(c => [c.name, c.famille ?? ""]));
    // Index supplémentaire par nom de base (sans la famille entre parenthèses) pour matcher les items raciaux
    const _compBaseMap = new Map((CONFIG.AGONE.competences ?? []).map(c => [
      c.name.replace(/\s*\([^)]*\)$/, '').trim(), c.famille ?? "",
    ]));
    const _getFamille = (name) => _compFamilleMap.get(name)
      || _compFamilleMap.get(name.replace(/\s*\([^)]*\)$/, '').trim())
      || _compBaseMap.get(name)
      || _compBaseMap.get(name.replace(/\s*\([^)]*\)$/, '').trim())
      || "Autre";
    const _triComps = actor.getFlag("agone", "triComps") ?? "famille";
    context.triCompsEstFamille = _triComps === "famille";

    if (!context.triCompsEstFamille) {
      // Par score décroissant
      context.competencesGroups = competencesParScore(context.competences);
    } else {
      // Par famille
      const ORDRE_FAMILLES = ["Épreuve", "Maraude", "Savoir", "Société", "Occulte"];
      const _byFam = {};
      for (const c of context.competences) {
        const fam = _getFamille(c.name);
        if (!_byFam[fam]) _byFam[fam] = [];
        _byFam[fam].push(c);
      }
      context.competencesGroups = [
        ...ORDRE_FAMILLES.filter(f => _byFam[f]).map(f => ({
          label: f, className: "fam-badge",
          comps: _byFam[f].sort((a, b) => a.name.localeCompare(b.name, "fr")),
        })),
        ...Object.keys(_byFam).filter(f => !ORDRE_FAMILLES.includes(f)).map(f => ({
          label: f, className: "fam-badge",
          comps: _byFam[f].sort((a, b) => a.name.localeCompare(b.name, "fr")),
        })),
      ];
    }
    context.competencesByDomaine = context.competencesGroups; // alias backward compat
  }

  /** Écouteurs délégués de l'onglet (voir PersonnageSheet#_onRender). */
  _bindCompetencesListeners(on, root) {
    // Jets de dés — Compétences
    on("click", "[data-action='rollCompetence']", this._onRollCompetence.bind(this));
    on("click", "[data-action='rollCompetenceNA']", this._onRollCompetenceNA.bind(this));
    on("click", "[data-action='apprendreCompetenceNA']", this._onApprendreCompetenceNA.bind(this));

    // Barre de recherche compétences
    bindCompetenceSearch(root, on, { nonAcquises: true });
    on("click", "[data-action='triCompsToggle']", this._onTriCompsToggle.bind(this));
  }

  async _onRollCompetenceNA(event) {
    event.preventDefault();
    const btn = event.currentTarget;
    await this.actor.rollCompetenceSansItem(
      btn.dataset.nom,
      btn.dataset.attributLie,
      btn.dataset.domaine
    );
  }

  async _onApprendreCompetenceNA(event) {
    event.preventDefault();
    const btn = event.currentTarget;
    await Item.create({
      name  : btn.dataset.nom,
      type  : "competence",
      system: { domaine: "", attributLie: btn.dataset.attributLie ?? "agilite", score: 0, exp: 0 },
    }, { parent: this.actor });
  }

  // Toggle tri des compétences
  async _onTriCompsToggle(event) {
    event.preventDefault();
    const cur = this.actor.getFlag("agone", "triComps") ?? "famille";
    await this.actor.setFlag("agone", "triComps", cur === "famille" ? "score" : "famille");
  }
};
