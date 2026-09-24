import { AgoneActorSheet } from "./agone-actor-sheet.mjs";
import { competencesParScore, caracsParAspect } from "./actor-context.mjs";

/**
 * Feuille de Compagnon / Monture.
 */
export class CompagnonSheet extends AgoneActorSheet {

  static DEFAULT_OPTIONS = {
    classes : ["compagnon"],
    position: { width: 720, height: 650 },
  };

  static PARTS = {
    form: {
      template  : "systems/agone/templates/actors/compagnon-sheet.hbs",
      scrollable: [".sheet-body"],
    },
  };

  /** @override */
  async _prepareContext(options) {
    const actor  = this.actor;
    const system = actor.system;
    const competences = actor.items.filter(i => i.type === "competence")
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));

    return {
      system, actor,
      isOwner : actor.isOwner,
      isGM    : game.user.isGM,
      editable: this.isEditable,
      // Caractéristiques (partial caracs-simples.hbs) : le nom lance le jet
      caracGroups: caracsParAspect(system, actor._source.system, ["agilite", "force", "perception", "resistance"]),
      caracExtras: [{ key: "chargeMax", labelKey: "AGONE.ChargeMax", value: system.chargeMax }],
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
      descriptionHTML: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        system.description ?? "", { async: true, secrets: actor.isOwner }
      ),
    };
  }
}
