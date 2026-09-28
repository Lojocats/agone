import { AgoneActorSheet } from "./agone-actor-sheet.mjs";
import { artsMagiquesParDomaine, sortsContext, caracsParAspect, contexteActeurSimple, jaugePct, trierItems } from "./actor-context.mjs";

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
    const actor   = this.actor;
    const context = await contexteActeurSimple(actor, this);
    const system  = context.system;
    const sorts   = actor.items.filter(i => i.type === "sort").sort((a, b) => a.name.localeCompare(b.name, "fr"));

    return {
      ...context,
      // Caractéristiques (partial caracs-simples.hbs) : le nom lance le jet
      caracGroups: caracsParAspect(system, context.source, ["agilite", "force", "perception", "resistance",
                                            "intelligence", "volonte", "charisma", "creativite"], { badges: context.badges }),
      caracExtras: [{ key: "bd", labelKey: "AGONE.BD", value: context.source.bd, badges: context.badges.bd ?? [], total: system.bd }],
      pdvPercent : jaugePct(system.pdv?.valeur, system.pdv?.max),
      // Suggestions du champ Race : un peuple reconnu applique ses modificateurs raciaux
      peuplesNoms: Object.keys(CONFIG.AGONE.peupleNomVersKey),
      manoeuvres : trierItems(actor, "manoeuvre"),
      // Partial magie.hbs sans danseurs ; la Créativité d'un PNJ est un nombre simple
      sorts,
      ...sortsContext(actor, sorts),
      artsMagiquesByDomaine: artsMagiquesParDomaine(system, context.competences, system.creativite ?? 0),
      danseurs    : [],
      sansDanseurs: true,
      pouvoirs    : trierItems(actor, "pouvoir"),
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
