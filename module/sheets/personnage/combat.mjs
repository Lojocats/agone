/**
 * Onglets Combat & Équipement : jets de combat, arme équipée, armure portée, manœuvres et pouvoirs.
 */
export const CombatMixin = Base => class extends Base {

  /** Écouteurs délégués de l'onglet (voir PersonnageSheet#_onRender). */
  _bindCombatListeners(on, root) {
    // Jets de combat communs (initiative, attaque, parade, esquive, défense, Emprise,
    // manœuvres et pouvoirs au chat, jet de VOL à la 3e blessure grave) : AgoneActorSheet#_bindJetsCombat
    this._bindJetsCombat(on);
    on("click", "[data-action='rollBonusDe']", this._onRollBonusDe.bind(this));

    // Armure portée (une seule à la fois) : AgoneActorSheet#_onArmureItemPorteeChange.
    // Ses valeurs sont lues sur l'item à la préparation des données (helpers/armure.mjs).
    on("change", ".armure-portee", this._onArmureItemPorteeChange.bind(this));

    // Arme équipée (tenue en main) — un seul bouclier équipé à la fois
    on("change", ".arme-equipe", this._onArmeEquipeChange.bind(this));
  }

  async _onRollBonusDe(event) {
    event.preventDefault();
    const roll = await new Roll("1d10").evaluate();
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor:  game.i18n.localize("AGONE.BonusDePdvFlavor")
    });
    await this.actor.update({ "system.pdv.bonusDe": roll.total });
  }

  /**
   * Arme équipée (tenue en main). Équiper un bouclier range les autres boucliers ; ses valeurs
   * (défense, protection, malus d'AGI) sont lues sur l'item à la préparation des données.
   */
  async _onArmeEquipeChange(event) {
    event.preventDefault();
    const el     = event.currentTarget;
    const itemId = el.dataset.itemId;
    const equipe = el.checked;
    const item   = this.actor.items.get(itemId);
    if (!item) return;

    const batch = [{ _id: itemId, "system.equipe": equipe }];
    if (equipe && item.system.style === "bouclier") {
      for (const autre of this.actor.items) {
        if (autre.type === "arme" && autre.system.style === "bouclier" && autre.id !== itemId && autre.system.equipe) {
          batch.push({ _id: autre.id, "system.equipe": false });
        }
      }
    }
    await this.actor.updateEmbeddedDocuments("Item", batch);
  }
};
