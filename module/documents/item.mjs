/**
 * AgoneItem — Classe Item étendue pour le système Agone
 */
export class AgoneItem extends Item {

  /** @override */
  prepareData() {
    super.prepareData();
  }

  /** @override */
  prepareDerivedData() {
    const sd = this.system;

    // Pour les armes: calculer les totaux si actor est disponible
    if (this.type === "arme" && this.actor) {
      const asd = this.actor.system;
      const style = sd.style ?? "melee";
      const baseAtk = style === "trait" ? (asd.tir ?? 0) : (asd.melee ?? 0);
      const bonusCorps = asd.bonusCorps ?? 0;

      // Trouver compétence liée par domaine
      let scoreComp = 0;
      if (sd.competence && this.actor.items) {
        const comp = this.actor.items.find(i =>
          i.type === "competence" && i.system.domaine === sd.competence
        );
        scoreComp = comp?.system.score ?? 0;
      }

      // Totaux calculés
      sd.initTotal     = (asd.initiative ?? 0) + (sd.initBonus ?? 0);
      sd.attackTotal   = baseAtk + scoreComp + (sd.attackBonus ?? 0) + bonusCorps;
      sd.defenseTotal  = (asd.melee ?? 0) + scoreComp + (sd.defenseBonus ?? 0) + bonusCorps;
      sd.dommagesTotal = (sd.dommages ?? 0) + (asd.bd ?? 0);
    }

    // Pour l'équipement: calculer poids total
    if (this.type === "equipement") {
      sd.poidsTotal = (sd.quantite ?? 1) * (sd.poidsUnit ?? 0);
    }
  }

  /**
   * Gestion du chat lorsque l'item est envoyé dans le chat
   */
  async toChat() {
    const sd = this.system;
    const descHTML = sd.description
      ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(sd.description, { async: true })
      : "";

    // ── Arme ─────────────────────────────────────────────────────────
    if (this.type === "arme") {
      const STYLE_LABELS = { melee: "Mêlée", jet: "Jet", trait: "Trait", bouclier: "Bouclier" };
      const content = await foundry.applications.handlebars.renderTemplate(
        "systems/agone/templates/chat/item-card.hbs",
        {
          item:       this,
          actor:      this.actor ?? null,
          typeLabel:  STYLE_LABELS[sd.style] ?? sd.style,
          styleLabel: STYLE_LABELS[sd.style] ?? sd.style,
          bd:         this.actor?.system.bd ?? 0,
          reqStr:     sd.reqFor > 0 || sd.reqAgi > 0,
          descHTML,
        }
      );
      return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), content });
    }

    // ── Manœuvre / Botte ─────────────────────────────────────────────
    if (this.type === "manoeuvre") {
      const catLabel  = sd.categorie === "botte" ? "Botte secrète" : "Manœuvre";
      const fmtMod = (v) => v === null || v === undefined ? "—" : (v >= 0 ? `+${v}` : `${v}`);
      const content = await foundry.applications.handlebars.renderTemplate(
        "systems/agone/templates/chat/item-card.hbs",
        {
          item:      this,
          actor:     this.actor ?? null,
          typeLabel: catLabel,
          hasMods:   sd.ini !== null || sd.att !== null || sd.def !== null || sd.dom !== "0",
          iniLabel:  fmtMod(sd.ini),
          attLabel:  fmtMod(sd.att),
          defLabel:  fmtMod(sd.def),
          descHTML,
        }
      );
      return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), content });
    }

    // ── Autres types (sort, armure, pouvoir, don…) ───────────────────
    let details = "";
    if (this.type === "armure") {
      details = `PRO : ${sd.protection ?? 0} | -AGI : ${sd.malusAgi ?? 0}`;
    } else if (this.type === "sort") {
      details = `Seuil : ${sd.seuil ?? 0} | Portée : ${sd.portee ?? "-"} | Durée : ${sd.duree ?? "-"}`;
    } else if (this.type === "pouvoir") {
      const catLabel = sd.categorie === "saisonin" ? "Saisonin" : "Pouvoir de Flamme";
      details = `<em>${catLabel}</em>`;
    }
    const content = `
      <div class="agone chat-item-card">
        <div class="card-header">
          <img src="${this.img}" class="item-img" />
          <h3>${this.name}</h3>
        </div>
        ${details ? `<p class="card-details">${details}</p>` : ""}
        ${descHTML ? `<div class="card-desc">${descHTML}</div>` : ""}
      </div>`;
    return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), content });
  }
}
