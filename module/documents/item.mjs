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

      // Trouver compétence liée
      let scoreComp = 0;
      if (sd.competence && this.actor.items) {
        const comp = this.actor.items.find(i =>
          i.type === "competence" && i.name === sd.competence
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
    // Carte générique d'item pour le chat
    let details = "";
    if (this.type === "arme") {
      details = `<em>${sd.type ?? ""} · ${sd.style ?? ""}</em><br>Dom : ${sd.dommages ?? "-"} | ATT : ${sd.attackTotal ?? sd.attackBonus ?? 0} | DEF : ${sd.defenseTotal ?? sd.defenseBonus ?? 0}`;
    } else if (this.type === "armure") {
      details = `PRO : ${sd.protection ?? 0} | -AGI : ${sd.malusAgi ?? 0}`;
    } else if (this.type === "sort") {
      details = `Seuil : ${sd.seuil ?? 0} | Portée : ${sd.portee ?? "-"} | Durée : ${sd.duree ?? "-"}`;
    } else if (this.type === "pouvoir") {
      const catLabel = sd.categorie === "saisonin" ? "Saisonin" : "Pouvoir de Flamme";
      details = `<em>${catLabel}</em>`;
    } else if (this.type === "manoeuvre") {
      const catLabel = sd.categorie === "botte" ? "Botte secrète" : "Manœuvre";
      const parts = [`<em>${catLabel}</em>`];
      if (sd.score) parts.push(`Score : ${sd.score}`);
      if (sd.malus) parts.push(`Malus : ${sd.malus}`);
      details = parts.join(" · ");
    }
    const descHTML = sd.description ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(sd.description, { async: true }) : "";

    const content = `
      <div class="agone chat-item-card">
        <div class="card-header">
          <img src="${this.img}" class="item-img" />
          <h3>${this.name}</h3>
        </div>
        ${details ? `<p class="card-details">${details}</p>` : ""}
        ${descHTML ? `<div class="card-desc">${descHTML}</div>` : ""}
      </div>`;
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content
    });
  }
}
