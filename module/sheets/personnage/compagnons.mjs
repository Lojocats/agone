/**
 * Onglet Compagnons : acteurs liés par glisser-déposer.
 */
export const CompagnonsMixin = Base => class extends Base {

  /** Données de contexte de l'onglet. */
  async _prepareCompagnonsContext(context) {
    // ── Compagnons (acteurs liés par UUID) ──────────────────────────────────
    const companionUUIDs = this.actor.getFlag("agone", "companions") ?? [];
    context.companions = [];
    for (const uuid of companionUUIDs) {
      const cActor = await fromUuid(uuid).catch(() => null);
      if (!cActor) continue;
      const cs = cActor.system;
      const type = cActor.type; // personnage | compagnon | pnj

      // PdV commun
      const pdvVal = cs.pdv?.valeur ?? 0;
      const pdvMax = cs.pdv?.max   ?? 0;
      const pdvPct = pdvMax > 0 ? Math.round(Math.min(100, (pdvVal / pdvMax) * 100)) : 0;
      const pdvColor = pdvPct >= 75 ? '#4a9a4a' : pdvPct >= 50 ? '#8a8a00' : pdvPct >= 25 ? '#c06000' : '#9a1a1a';

      // Blessures graves
      const bg1 = !!cs.blessureGrave1;
      const bg2 = !!cs.blessureGrave2;
      const bg3 = !!cs.blessureGrave3;
      const bgMalus = cs.malusBlessureGrave ?? 0;
      const bcActive = !!cs.blessuresCritique;

      // Stats spécifiques par type
      const stats = [];
      if (type === 'personnage') {
        if ((cs.flamme ?? 0) > 0 || cs.flamme === 0)
          stats.push({ icon: 'fas fa-fire',        label: game.i18n.localize("AGONE.Flamme"),  val: cs.flamme ?? 0, cls: 'csp-flamme' });
        stats.push({ icon: 'fas fa-bolt',           label: game.i18n.localize("AGONE.Des.InitAbr"),   val: cs.initiative ?? (cs.agilite?.score ?? 0) + (cs.perception?.score ?? 0), cls: '' });
        stats.push({ icon: 'fas fa-shoe-prints',    label: game.i18n.localize("AGONE.Des.MvAbr"),      val: cs.mv ?? 0, cls: '' });
        if ((cs.bonusCorps  ?? null) !== null) stats.push({ icon: null, label: game.i18n.localize("AGONE.Des.AspectsAbr"), val: `${cs.bonusCorps}/${cs.bonusEsprit}/${cs.bonusAme}`, cls: 'csp-aspects' });
      } else if (type === 'compagnon') {
        stats.push({ icon: 'fas fa-bolt',           label: game.i18n.localize("AGONE.Des.InitAbr"),   val: cs.initiative ?? 0, cls: '' });
        stats.push({ icon: 'fas fa-sword',          label: game.i18n.localize("AGONE.Melee"),  val: cs.melee ?? 0, cls: '' });
        stats.push({ icon: 'fas fa-shoe-prints',    label: game.i18n.localize("AGONE.Des.MvAbr"),      val: cs.mv ?? 0, cls: '' });
        if ((cs.mvVol ?? 0) > 0)
          stats.push({ icon: 'fas fa-dove',         label: game.i18n.localize("AGONE.Des.VolAbr"),     val: cs.mvVol, cls: '' });
      } else if (type === 'pnj') {
        stats.push({ icon: 'fas fa-bolt',           label: game.i18n.localize("AGONE.Des.InitAbr"),   val: cs.initiative ?? 0, cls: '' });
        stats.push({ icon: 'fas fa-sword',          label: game.i18n.localize("AGONE.Melee"),  val: cs.melee ?? 0, cls: '' });
        stats.push({ icon: 'fas fa-bullseye',       label: game.i18n.localize("AGONE.Tir"),     val: cs.tir ?? 0, cls: '' });
        if ((cs.armure?.protection ?? 0) > 0)
          stats.push({ icon: 'fas fa-shield-alt',   label: game.i18n.localize("AGONE.Des.ProAbr"),     val: cs.armure.protection, cls: '' });
        if ((cs.flamme ?? 0) > 0)
          stats.push({ icon: 'fas fa-fire',         label: game.i18n.localize("AGONE.Flamme"),  val: cs.flamme, cls: 'csp-flamme' });
      }

      // Sous-titre (espèce / race / peuple)
      const subtitle = type === 'compagnon' ? (cs.espece ?? '') :
                       type === 'pnj'       ? (cs.race   ?? '') :
                       type === 'personnage'? (cs.peuple ?? '') : '';

      context.companions.push({
        uuid, name: cActor.name, img: cActor.img ?? 'icons/svg/mystery-man.svg',
        type, subtitle,
        pdvVal, pdvMax, pdvPct, pdvColor,
        bg1, bg2, bg3, bgMalus, bcActive,
        stats,
        // rétrocompat
        pdv: cs.pdv ?? null,
        flamme: type === 'personnage' ? (cs.flamme ?? null) : null,
      });
    }
  }

  /** Écouteurs délégués de l'onglet (voir PersonnageSheet#_onRender). */
  _bindCompagnonsListeners(on, root) {
    // ── Compagnons ────────────────────────────────────────────────────────
    on("click", ".companion-open", this._onOpenCompanion.bind(this));
    on("click", ".companion-remove", this._onRemoveCompanion.bind(this));
    // Feedback visuel drag-over sur la zone compagnons
    root.querySelectorAll(".companions-drop-zone").forEach(el => {
      el.addEventListener("dragover", (ev) => {
        ev.preventDefault();
        el.classList.add("drag-over");
      });
      el.addEventListener("dragleave", (ev) => {
        if (!el.contains(ev.relatedTarget)) el.classList.remove("drag-over");
      });
      el.addEventListener("drop", () => el.classList.remove("drag-over"));
    });
  }

  // Drop d'acteur (companions)
  /** @override */
  async _onDropActor(event, data) {
    if (event.target?.closest(".companions-drop-zone")) {
      const uuid = data.uuid;
      if (!uuid || uuid === this.actor.uuid) return;
      const current = this.actor.getFlag("agone", "companions") ?? [];
      if (current.includes(uuid)) return;
      await this.actor.setFlag("agone", "companions", [...current, uuid]);
      return;
    }
    if (event.target?.closest(".demons-drop-zone")) {
      const uuid = data.uuid;
      if (!uuid || uuid === this.actor.uuid) return;
      const dropped = await fromUuid(uuid).catch(() => null);
      if (!dropped) return;
      // Normaliser : Actor sidebar OU token canvas
      const droppedActor = (dropped.documentName === "Actor") ? dropped : (dropped.actor ?? null);
      if (!droppedActor || droppedActor.type !== "demon") {
        ui.notifications.warn(game.i18n.localize("AGONE.DemonDropWrongType"));
        return;
      }
      const actorUuid = droppedActor.uuid;
      const current = this.actor.getFlag("agone", "demons") ?? [];
      if (current.includes(actorUuid)) return;
      await this.actor.setFlag("agone", "demons", [...current, actorUuid]);
      return;
    }
    // Pas d'autre comportement de drop d'acteur par défaut
  }

  // Compagnons — ouvrir / retirer
  async _onOpenCompanion(event) {
    event.preventDefault();
    const uuid  = event.currentTarget.dataset.uuid;
    const actor = await fromUuid(uuid).catch(() => null);
    if (actor) this.renderChild(actor.sheet);
  }

  async _onRemoveCompanion(event) {
    event.preventDefault();
    const uuid    = event.currentTarget.dataset.uuid;
    const current = this.actor.getFlag("agone", "companions") ?? [];
    await this.actor.setFlag("agone", "companions", current.filter(u => u !== uuid));
  }
};
