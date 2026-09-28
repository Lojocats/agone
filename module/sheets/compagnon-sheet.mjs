import { AgoneActorSheet } from "./agone-actor-sheet.mjs";
import { caracsParAspect, contexteActeurSimple, jaugePct, trierItems, malusSurcharge } from "./actor-context.mjs";

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

  /** Le compagnon n'a pas de VOLonté : pas de jet à la 3e blessure grave. */
  static JET_VOL_BLESSURE3 = false;

  /** @override */
  async _prepareContext(options) {
    const actor   = this.actor;
    const context = await contexteActeurSimple(actor, this);
    const system  = context.system;

    return {
      ...context,
      // Caractéristiques (partial caracs-simples.hbs) : le nom lance le jet
      caracGroups: caracsParAspect(system, context.source, ["agilite", "force", "perception", "resistance"], { badges: context.badges }),
      caracExtras: [{ key: "chargeMax", labelKey: "AGONE.ChargeMax", value: system.chargeMax }],
      pdvPercent : jaugePct(system.pdv?.valeur, system.pdv?.max),
      manoeuvres : trierItems(actor, "manoeuvre"),
      // Onglet Équipement (partial equipement-tab.hbs) : surcharge affichée, sans malus appliqué aux jets
      equipements          : trierItems(actor, "equipement"),
      malusSurchargeAffiche: malusSurcharge(system.chargeActuelle ?? 0, system.demiCharge ?? 0, system.chargeMax ?? 0),
      notesHTML: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        system.notes ?? "", { async: true, secrets: actor.isOwner }
      ),
    };
  }
}
