import { appliquerModeJet } from "../helpers/mode-jet.mjs";
import { totauxArme } from "../helpers/derivations.mjs";

/**
 * AgoneItem — Classe Item étendue pour le système Agone
 */
export class AgoneItem extends Item {

  /** @override */
  prepareDerivedData() {
    const sd = this.system;

    // Armes : totaux (initiative, attaque, parade, dommages) d'après les stats de l'acteur.
    // Pendant la préparation de l'acteur, ses items sont préparés AVANT ses stats dérivées :
    // AgoneActor#prepareDerivedData calcule alors les totaux en fin de préparation. Ici, on ne traite
    // que l'arme préparée seule, quand les stats dérivées de l'acteur existent déjà.
    if (this.type === "arme") this.preparerTotauxArme();

    // Pour l'équipement: calculer poids total
    if (this.type === "equipement") {
      sd.poidsTotal = (sd.quantite ?? 1) * (sd.poidsUnit ?? 0);
    }
  }

  /**
   * Totaux d'une arme portée, écrits sur `system` (transitoires). Sans effet tant que les stats
   * dérivées de l'acteur (MÊL) ne sont pas calculées.
   * @returns {boolean} true si les totaux ont été calculés
   */
  preparerTotauxArme() {
    const asd = this.actor?.system;
    if (this.type !== "arme" || !asd || asd.melee === undefined) return false;
    const { initTotal, attackTotal, defenseTotal, dommagesTotal } = totauxArme(this.system, asd, this.actor.items);
    Object.assign(this.system, { initTotal, attackTotal, defenseTotal, dommagesTotal });
    return true;
  }

  /**
   * Gestion du chat lorsque l'item est envoyé dans le chat
   */
  async toChat() {
    const sd = this.system;
    const descHTML = sd.description
      ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(sd.description, { async: true })
      : "";
    const DEFAULT_ICON = this.constructor.DEFAULT_ICON ?? foundry.documents.BaseItem.DEFAULT_ICON;
    const img = this.img && this.img !== DEFAULT_ICON ? this.img : null;

    // ── Arme ─────────────────────────────────────────────────────────
    if (this.type === "arme") {
      const STYLE_LABELS = {
        melee:    game.i18n.localize("AGONE.Melee"),
        jet:      game.i18n.localize("AGONE.Jet"),
        trait:    game.i18n.localize("AGONE.Trait"),
        bouclier: game.i18n.localize("AGONE.Bouclier"),
      };
      const content = await foundry.applications.handlebars.renderTemplate(
        "systems/agone/templates/chat/item-card.hbs",
        {
          item:       this,
          img,
          actor:      this.actor ?? null,
          typeLabel:  STYLE_LABELS[sd.style] ?? sd.style,
          styleLabel: STYLE_LABELS[sd.style] ?? sd.style,
          bd:         this.actor?.system.bd ?? 0,
          reqStr:     sd.reqFor > 0 || sd.reqAgi > 0,
          descHTML,
        }
      );
      return ChatMessage.create(appliquerModeJet(
        { speaker: ChatMessage.getSpeaker({ actor: this.actor }), content }
      ));
    }

    // ── Manœuvre / Botte ─────────────────────────────────────────────
    if (this.type === "manoeuvre") {
      const catLabel  = sd.categorie === "botte"
        ? game.i18n.localize("AGONE.BotteSecrete")
        : game.i18n.localize("AGONE.Manoeuvre");
      const fmtMod = (v) => v === null || v === undefined ? "—" : (v >= 0 ? `+${v}` : `${v}`);
      const content = await foundry.applications.handlebars.renderTemplate(
        "systems/agone/templates/chat/item-card.hbs",
        {
          item:      this,
          img,
          actor:     this.actor ?? null,
          typeLabel: catLabel,
          hasMods:   sd.ini !== null || sd.att !== null || sd.def !== null || sd.dom !== "0",
          iniLabel:  fmtMod(sd.ini),
          attLabel:  fmtMod(sd.att),
          defLabel:  fmtMod(sd.def),
          descHTML,
        }
      );
      return ChatMessage.create(appliquerModeJet(
        { speaker: ChatMessage.getSpeaker({ actor: this.actor }), content }
      ));
    }

    // ── Autres types (sort, armure, pouvoir, don…) ───────────────────
    let details = "";
    let typeLabel = "";
    if (this.type === "armure") {
      details = `${game.i18n.localize("AGONE.Des.ProAbr")} : ${sd.protection ?? 0} | -AGI : ${sd.malusAgi ?? 0}`;
    } else if (this.type === "sort") {
      details = `${game.i18n.localize("AGONE.Seuil")} : ${sd.seuil ?? 0} | ${game.i18n.localize("AGONE.Portee")} : ${sd.portee ?? "-"} | ${game.i18n.localize("AGONE.Duree")} : ${sd.duree ?? "-"}`;
    } else if (this.type === "pouvoir") {
      typeLabel = sd.categorie === "saisonin"
        ? game.i18n.localize("AGONE.Saisonin")
        : game.i18n.localize("AGONE.PouvoirFlamme");
    }
    const content = await foundry.applications.handlebars.renderTemplate(
      "systems/agone/templates/chat/item-card.hbs",
      {
        item: this,
        img,
        actor: this.actor ?? null,
        typeLabel,
        details,
        descHTML,
      }
    );
    return ChatMessage.create(appliquerModeJet(
      { speaker: ChatMessage.getSpeaker({ actor: this.actor }), content }
    ));
  }
}
