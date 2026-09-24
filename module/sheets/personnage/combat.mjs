/**
 * Onglets Combat & Équipement : jets de combat, arme équipée, calcul d'armure, manœuvres et pouvoirs.
 */
export const CombatMixin = Base => class extends Base {

  /** Écouteurs délégués de l'onglet (voir PersonnageSheet#_onRender). */
  _bindCombatListeners(on, root) {
    // Jets de dés — Combat
    on("click", "[data-action='rollInitiative']", this._onRollInitiative.bind(this));
    on("click", "[data-action='rollInitiativeMagique']", this._onRollInitiativeMagique.bind(this));
    on("click", "[data-action='rollAttaque']", this._onRollAttaque.bind(this));
    on("click", "[data-action='rollParade']", this._onRollParade.bind(this));
    on("click", "[data-action='rollEsquive']", this._onRollEsquive.bind(this));
    on("click", "[data-action='rollDefenseNaturelle']", this._onRollDefenseNaturelle.bind(this));
    on("click", "[data-action='rollFumble']", this._onRollFumble.bind(this));
    on("click", "[data-action='rollBonusDe']", this._onRollBonusDe.bind(this));

    // Armure portée — clic sur checkbox d'item
    on("change", ".armure-portee", this._onArmureItemPorteeChange.bind(this));

    // Armure portée — calcul auto
    on("change", "[name='system.armure.portee']", this._onArmurePorteeChange.bind(this));
    on("change", "[name='system.armure.malusAgi']", this._onArmureMalusChange.bind(this));
    on("change", "[name='system.armure.type']", this._onArmureMalusChange.bind(this));

    // Arme équipée (tenue en main) — boucliers : sync actor.bouclier
    on("change", ".arme-equipe", this._onArmeEquipeChange.bind(this));

    // 3e blessure grave → jet de VOL Difficulté 10
    on("change", "[name='system.blessureGrave3']", async (e) => {
      if (e.currentTarget.checked) {
        await this.actor.rollVolBlessure3();
      }
    });

    // Envoyer manœuvre/botte dans le chat
    on("click", "[data-action='rollManoeuvre']", this._onChatManoeuvre.bind(this));

    // Envoyer pouvoir de flamme dans le chat
    on("click", "[data-action='chatPouvoir']", this._onChatPouvoir.bind(this));
  }

  async _onRollInitiative(event) {
    event.preventDefault();
    const armeId = event.currentTarget.dataset.armeId ?? null;
    await this.actor.rollInitiative(armeId);
  }

  async _onRollInitiativeMagique(event) {
    event.preventDefault();
    await this.actor.rollInitiativeMagique();
  }

  async _onRollAttaque(event) {
    event.preventDefault();
    const li     = event.currentTarget.closest("[data-item-id]");
    const armeId = li?.dataset.itemId ?? event.currentTarget.dataset.armeId;
    await this.actor.rollAttaque(armeId);
  }

  async _onRollParade(event) {
    event.preventDefault();
    const li     = event.currentTarget.closest("[data-item-id]");
    const armeId = li?.dataset.itemId ?? event.currentTarget.dataset.armeId;
    await this.actor.rollParade(armeId);
  }

  async _onRollEsquive(event) {
    event.preventDefault();
    await this.actor.rollEsquive();
  }

  async _onRollDefenseNaturelle(event) {
    event.preventDefault();
    await this.actor.rollDefenseNaturelle();
  }

  async _onRollFumble(event) {
    event.preventDefault();
    await this.actor.rollFumble();
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

  // Arme équipée (tenue en main)
  async _onArmeEquipeChange(event) {
    event.preventDefault();
    const el     = event.currentTarget;
    const itemId = el.dataset.itemId;
    const equipe = el.checked;
    const item   = this.actor.items.get(itemId);
    if (!item) return;

    await item.update({ "system.equipe": equipe });

    // Pour les boucliers : déséquiper les autres et synchroniser actor.bouclier
    if (item.system.style === "bouclier") {
      const updateBatch = this.actor.items
        .filter(i => i.type === "arme" && i.system.style === "bouclier" && i.id !== itemId)
        .map(i => ({ _id: i.id, "system.equipe": false }));
      if (updateBatch.length) await this.actor.updateEmbeddedDocuments("Item", updateBatch);

      if (equipe) {
        await this.actor.update({
          "system.bouclier.portee":       true,
          "system.bouclier.nom":          item.name,
          "system.bouclier.defenseBonus": item.system.defenseBonus ?? 0,
          "system.bouclier.protection":   item.system.protection   ?? 0,
          "system.bouclier.malusAgi":     item.system.malusAgi     ?? 0,
        });
      } else {
        await this.actor.update({
          "system.bouclier.portee":       false,
          "system.bouclier.nom":          "",
          "system.bouclier.defenseBonus": 0,
          "system.bouclier.protection":   0,
          "system.bouclier.malusAgi":     0,
        });
      }
    }
  }

  // Calcul automatique armure
  async _onArmureItemPorteeChange(event) {
    event.preventDefault();
    const el     = event.currentTarget;
    const itemId = el.dataset.itemId;
    const portee = el.checked;

    // Dé-équiper toutes les armures d'abord
    const updateBatch = this.actor.items
      .filter(i => i.type === "armure")
      .map(i => ({ _id: i.id, "system.portee": i.id === itemId ? portee : false }));
    await this.actor.updateEmbeddedDocuments("Item", updateBatch);

    // Synchroniser les stats d'armure de l'acteur
    if (portee) {
      const item = this.actor.items.get(itemId);
      if (item) {
        await this.actor.update({
          "system.armure.portee":     true,
          "system.armure.nom":        item.name,
          "system.armure.type":       item.system.type,
          "system.armure.protection": item.system.protection,
          "system.armure.malusAgi":   item.system.malusAgi,
          "system.armure.malusPer":   item.system.malusPer
        });
      }
    } else {
      await this.actor.update({
        "system.armure.portee":     false,
        "system.armure.nom":        "",
        "system.armure.protection": 0,
        "system.armure.malusAgi":   0,
        "system.armure.malusPer":   0
      });
    }
  }

  async _onArmurePorteeChange(event) {
    const portee = event.currentTarget.checked;
    if (!portee) {
      await this.actor.update({
        "system.armure.portee": false
      });
    }
  }

  async _onArmureMalusChange(event) {
    // Déclenche la mise à jour pour recalculer malusPer
    const form     = this.element.querySelector("form");
    const malusAgi = parseInt(form?.querySelector("[name='system.armure.malusAgi']")?.value) || 0;
    const type     = form?.querySelector("[name='system.armure.type']")?.value;
    let malusPer = 0;
    if (type === "1") malusPer = Math.floor(malusAgi / 2);
    if (type === "2") malusPer = malusAgi;
    await this.actor.update({ "system.armure.malusPer": malusPer });
  }

  // Envoyer manœuvre/botte dans le chat
  async _onChatManoeuvre(event) {
    event.preventDefault();
    const id   = event.currentTarget.dataset.itemId;
    const item = this.actor.items.get(id);
    if (item) await item.toChat();
  }

  // Envoyer pouvoir de flamme dans le chat
  async _onChatPouvoir(event) {
    event.preventDefault();
    const id   = event.currentTarget.dataset.itemId;
    const item = this.actor.items.get(id);
    if (item) await item.toChat();
  }
};
