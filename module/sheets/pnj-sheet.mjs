import { AgoneActorSheet } from "./agone-actor-sheet.mjs";
import { competencesParScore, artsMagiquesParDomaine, sortsContext, caracsParAspect } from "./actor-context.mjs";

/**
 * Feuille de PNJ.
 */
export class PnjSheet extends AgoneActorSheet {

  static DEFAULT_OPTIONS = {
    classes : ["pnj"],
    position: { width: 750, height: 700 },
  };

  static PARTS = {
    form: {
      template  : "systems/agone/templates/actors/pnj-sheet.hbs",
      scrollable: [".sheet-body"],
    },
  };

  /** @override */
  async _prepareContext(options) {
    const actor  = this.actor;
    const system = actor.system;
    const byName = (a, b) => a.name.localeCompare(b.name, "fr");
    const competences = actor.items.filter(i => i.type === "competence").sort(byName);
    const sorts       = actor.items.filter(i => i.type === "sort").sort(byName);

    return {
      system, actor,
      source  : actor._source.system,   // valeurs stockées (saisie), sans les effets actifs
      isOwner : actor.isOwner,
      isGM    : game.user.isGM,
      editable: this.isEditable,
      // Caractéristiques (partial caracs-simples.hbs) : le nom lance le jet
      caracGroups: caracsParAspect(system, actor._source.system, ["agilite", "force", "perception", "resistance",
                                            "intelligence", "volonte", "charisma", "creativite"]),
      caracExtras: [{ key: "bd", labelKey: "AGONE.BD", value: system.bd }],
      armes   : actor.items.filter(i => i.type === "arme"),
      armures : actor.items.filter(i => i.type === "armure"),
      pdvPercent: system.pdv?.max > 0
        ? Math.round(Math.min(100, (system.pdv.valeur / system.pdv.max) * 100))
        : 0,
      // Partial competences.hbs : pas de tri par famille ni de montée de niveau
      competences,
      competencesGroups     : competencesParScore(competences),
      competencesNonAcquises: [],
      triCompsEstFamille    : false,
      showLevelUp           : false,
      showLevelUpComp       : false,
      showLevelUpAspect     : false,
      // Partial magie.hbs (sans danseurs) ; la Créativité d'un PNJ est un nombre simple
      sorts,
      ...sortsContext(actor, sorts),
      artsMagiquesByDomaine: artsMagiquesParDomaine(system, competences, system.creativite ?? 0),
      danseurs: [],
      descriptionHTML: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        system.description ?? "", { async: true, secrets: actor.isOwner }
      ),
    };
  }

  /** @override */
  _bindListeners(on, root) {
    super._bindListeners(on, root);
    this._bindSortsListeners(on);
  }

  /**
   * @override
   * Une seule armure portée ; ses valeurs alimentent l'armure de la fiche.
   */
  async _onArmureItemPorteeChange(event) {
    await super._onArmureItemPorteeChange(event);
    const item = event.currentTarget.checked ? this.actor.items.get(event.currentTarget.dataset.itemId) : null;
    await this.actor.update({
      "system.armure.protection": item?.system.protection ?? 0,
      "system.armure.malusAgi":   item?.system.malusAgi   ?? 0,
    });
  }
}
