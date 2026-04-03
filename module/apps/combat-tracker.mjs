/**
 * AgoreCombatTracker — Application GM de suivi de combat pour Agone.
 *
 * Fonctionnalités :
 *   - Liste des combattants triés par initiative (descending)
 *   - Jet d'initiative par combattant ou pour tous
 *   - PdV en direct (barre + input éditable)
 *   - Blessures graves (3 cases) & blessure critique
 *   - Statuts rapides (inconscient, bloqué, aveugle, contraint, épuisé)
 *   - Tour / Round
 *   - Application de dégâts / soins rapides
 *   - Mise à jour en temps réel via Hooks
 */
export class AgoreCombatTracker extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {

  static DEFAULT_OPTIONS = {
    id      : "agone-combat-tracker",
    classes : ["agone", "agone-combat-tracker"],
    position: { width: 420 },
    window  : { resizable: true },
  };

  static PARTS = {
    form: { template: "systems/agone/templates/apps/combat-tracker.hbs" },
  };

  get title() {
    return game.i18n.localize("AGONE.Combat.TitreTracker");
  }

  _replaceHTML(result, content, options) {
    content.innerHTML = "";
    for (const html of Object.values(result)) content.insertAdjacentHTML("beforeend", html);
  }

  // ── Données ──────────────────────────────────────────────────────────────

  async _prepareContext(options) {
    const combat = game.combat;

    if (!combat) {
      return { hasCombat: false, isGM: game.user.isGM };
    }

    // combat.combatants est la collection source (toujours complète),
    // combat.turns est un tableau calculé après rollInitiative — on évite de l'utiliser.
    const combatants = Array.from(combat.combatants.values())
      .sort((a, b) => {
        const ia = a.initiative ?? null;
        const ib = b.initiative ?? null;
        if (ia === null && ib === null) return 0;
        if (ia === null) return 1;
        if (ib === null) return -1;
        return ib - ia; // descending
      })
      .map(c => {
      // c.token?.actor gère les tokens non-liés (PNJ synthétiques)
      const actor = c.token?.actor ?? c.actor;
      const sd = actor?.system ?? {};

      // PdV
      const pdvVal = sd.pdv?.valeur ?? 0;
      const pdvMax = sd.pdv?.max    ?? 1;
      const pdvPct = pdvMax > 0 ? Math.round(Math.min(100, (pdvVal / pdvMax) * 100)) : 0;

      // Blessures
      const bg1 = !!sd.blessureGrave1;
      const bg2 = !!sd.blessureGrave2;
      const bg3 = !!sd.blessureGrave3;
      const bc  = !!sd.blessuresCritique;

      // Statuts actifs
      const activeStatuts = (actor?.statuses ?? new Set());

      // Couleur barre PdV
      let pdvColor = "#4a9a4a";
      if (pdvPct <= 25) pdvColor = "#c04040";
      else if (pdvPct <= 50) pdvColor = "#c07820";

      return {
        id:          c.id,
        actorId:     actor?.id ?? null,
        tokenId:     c.token?.id ?? null,
        name:        c.name,
        img:         c.img ?? actor?.img ?? "icons/svg/mystery-man.svg",
        initiative:  c.initiative,
        hasInitiative: c.initiative !== null && c.initiative !== undefined,
        isActive:    c.id === combat.current?.combatantId,
        isDefeated:  c.defeated,
        isOwner:     actor?.isOwner ?? false,
        hasActor:    !!actor,
        pdvVal, pdvMax, pdvPct, pdvColor,
        bg1, bg2, bg3, bc,
        // Statuts
        inconscient: activeStatuts.has("inconscient"),
        blesse:      activeStatuts.has("blesse"),
        epuise:      activeStatuts.has("epuise"),
        immobilise:  activeStatuts.has("immobilise"),
        contraint:   activeStatuts.has("contraint"),
        aveugle:     activeStatuts.has("aveugle"),
        // Stats combat
        initiative_base: sd.initiative ?? 0,
        defense:         sd.defenseNaturelle ?? 0,
      };
    });

    return {
      hasCombat:   true,
      round:       combat.round,
      isStarted:   combat.started,
      sceneId:     combat.scene?.id ?? null,
      combatants,
      isGM:        game.user.isGM,
    };
  }

  // ── Listeners ────────────────────────────────────────────────────────────

  _onRender(context, options) {
    super._onRender(context, options);
    if (!this._hookIds) this._registerHooks();
    const html = $(this.element);

    // ── Navigation de tour ──────────────────────────────────────────────
    html.find("[data-action='prevTurn']").on("click", () => game.combat?.previousTurn());
    html.find("[data-action='nextTurn']").on("click", () => game.combat?.nextTurn());
    html.find("[data-action='startCombat']").on("click", () => game.combat?.startCombat());
    html.find("[data-action='endCombat']").on("click", async () => {
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        title:   game.i18n.localize("AGONE.Combat.TerminerCombat"),
        content: `<p>${game.i18n.localize("AGONE.Combat.TerminerCombatConfirm")}</p>`,
      });
      if (confirmed) game.combat?.endCombat();
    });

    // ── Initiative ──────────────────────────────────────────────────────
    html.find("[data-action='rollInit']").on("click", async (e) => {
      const row  = e.currentTarget.closest("[data-combatant-id]");
      const id   = row.dataset.combatantId;
      const c    = game.combat?.combatants.get(id);
      if (!c) return;
      const actor = this._resolveActor(row) ?? c.actor;
      if (actor?.rollInitiative) await actor.rollInitiative();
      // Met à jour l'initiative dans le combat FVTT
      const sd  = actor?.system ?? {};
      const roll = new Roll("1d10 + @init", { init: sd.initiative ?? 0 });
      await roll.evaluate();
      await game.combat.setInitiative(id, roll.total);
      this.render(false);
    });

    html.find("[data-action='rollAllInit']").on("click", async () => {
      if (!game.combat) return;
      await game.combat.rollAll();
      this.render(false);
    });

    html.find("[data-action='resetInit']").on("click", async () => {
      if (!game.combat) return;
      await game.combat.resetAll();
      this.render(false);
    });

    // ── Édition initiative inline ───────────────────────────────────────
    html.find(".ct-init-input").on("change", async (e) => {
      const id  = e.currentTarget.closest("[data-combatant-id]").dataset.combatantId;
      const val = Number(e.currentTarget.value);
      if (!isNaN(val)) await game.combat?.setInitiative(id, val);
    });

    // ── PdV inline ──────────────────────────────────────────────────────
    html.find(".ct-pdv-input").on("change", async (e) => {
      const row   = e.currentTarget.closest("[data-combatant-id]");
      const actor = this._resolveActor(row);
      if (!actor) return;
      const val = Math.max(0, Math.min(actor.system.pdv?.max ?? 0, Number(e.currentTarget.value) || 0));
      await actor.update({ "system.pdv.valeur": val });
    });

    // ── Dégâts / soins rapides ──────────────────────────────────────────
    html.find("[data-action='applyDamage']").on("click", async (e) => {
      const row = e.currentTarget.closest("[data-combatant-id]");
      await this._promptDeltaPdv(row, "degats");
    });

    html.find("[data-action='applySoin']").on("click", async (e) => {
      const row = e.currentTarget.closest("[data-combatant-id]");
      await this._promptDeltaPdv(row, "soins");
    });

    // ── Blessures graves ────────────────────────────────────────────────
    html.find(".ct-bg-cell").on("click", async (e) => {
      const cell  = e.currentTarget;
      const row   = cell.closest("[data-combatant-id]");
      const actor = this._resolveActor(row);
      if (!actor) return;
      const field = cell.dataset.field;
      await actor.update({ [`system.${field}`]: !actor.system[field] });
    });

    // ── Statuts rapides ─────────────────────────────────────────────────
    html.find("[data-action='toggleStatus']").on("click", async (e) => {
      const btn    = e.currentTarget;
      const row    = btn.closest("[data-combatant-id]");
      const actor  = this._resolveActor(row);
      if (!actor) return;
      const statusId = btn.dataset.status;
      // Préférer le token sur la scène active pour que le status soit visible sur la carte
      const tokenId  = row.dataset.tokenId;
      const sceneId  = row.dataset.sceneId;
      const scene    = sceneId ? game.scenes.get(sceneId) : game.scenes.current;
      const tokenDoc = scene?.tokens.get(tokenId);
      const token    = tokenDoc?.object ?? actor.getActiveTokens(true)?.[0];
      if (token) {
        await token.toggleEffect(CONFIG.statusEffects.find(s => s.id === statusId));
      } else {
        const effect = CONFIG.statusEffects.find(s => s.id === statusId);
        if (effect) {
          const existing = actor.effects.find(ef => ef.statuses.has(statusId));
          if (existing) await existing.delete();
          else await ActiveEffect.create({ name: effect.label, icon: effect.icon, statuses: [statusId] }, { parent: actor });
        }
      }
    });

    // ── Ouvrir la fiche acteur ──────────────────────────────────────────
    html.find("[data-action='openSheet']").on("click", (e) => {
      const row   = e.currentTarget.closest("[data-combatant-id]");
      const actor = this._resolveActor(row);
      actor?.sheet?.render(true);
    });

    // ── Marquer vaincu ─────────────────────────────────────────────────
    html.find("[data-action='toggleDefeated']").on("click", async (e) => {
      const id = e.currentTarget.closest("[data-combatant-id]").dataset.combatantId;
      const c  = game.combat?.combatants.get(id);
      if (c) await c.update({ defeated: !c.defeated });
    });

    // ── Créer un nouveau combat ─────────────────────────────────────────
    html.find("[data-action='createCombat']").on("click", async () => {
      const combat = await Combat.create({ scene: canvas.scene?.id, active: true });
      if (combat) ui.notifications.info(game.i18n.localize("AGONE.Combat.CombatCree"));
    });

    // ── Ajouter les tokens sélectionnés au combat ───────────────────────
    html.find("[data-action='addTokens']").on("click", async () => {
      const tokens = canvas.tokens?.controlled ?? [];
      if (!tokens.length) {
        ui.notifications.warn(game.i18n.localize("AGONE.Combat.AucunTokenSelectionne"));
        return;
      }
      const combat = game.combat;
      if (!combat) return;
      const creates = tokens
        .filter(t => !combat.combatants.find(c => c.tokenId === t.id))
        .map(t => ({
          tokenId: t.id,
          sceneId: canvas.scene.id,
          actorId: t.actor?.id ?? null,
          hidden:  t.document.hidden,
        }));
      if (creates.length) {
        await combat.createEmbeddedDocuments("Combatant", creates);
        ui.notifications.info(game.i18n.format("AGONE.Combat.TokensAjoutes", { count: creates.length }));
      } else {
        ui.notifications.info(game.i18n.localize("AGONE.Combat.TokensDejaPresents"));
      }
    });
  }

  // ── Méthodes privées ─────────────────────────────────────────────────────

  /**
   * Résout l'acteur depuis un élément DOM (.agone-ct-row).
   * Utilise actorId en priorité, puis cherche via tokenId sur la scène active.
   */
  _resolveActor(rowEl) {
    const actorId = rowEl.dataset.actorId;
    if (actorId) return game.actors.get(actorId) ?? null;
    const tokenId = rowEl.dataset.tokenId;
    const sceneId = rowEl.dataset.sceneId;
    const scene   = sceneId ? game.scenes.get(sceneId) : game.scenes.current;
    return scene?.tokens.get(tokenId)?.actor ?? null;
  }

  async _promptDeltaPdv(rowEl, mode) {
    const actor = this._resolveActor(rowEl);
    if (!actor) return;
    const isHeal   = mode === "soins";
    const titleKey = isHeal ? "AGONE.Combat.AppliquerSoins" : "AGONE.Combat.AppliquerDegats";

    const result = await foundry.applications.api.DialogV2.prompt({
      title:   game.i18n.localize(titleKey),
      content: `<div class="form-group">
        <label>${game.i18n.localize(isHeal ? "AGONE.Combat.Soins" : "AGONE.Combat.Degats")}</label>
        <input type="number" name="delta" min="0" value="0" style="width:80px;text-align:center" autofocus />
      </div>`,
      ok: {
        label:    game.i18n.localize("AGONE.Appliquer"),
        callback: (event, button, dialog) => Number(button.form.elements.delta.value) || 0,
      },
    });
    if (!result) return;

    const current = actor.system.pdv.valeur;
    const max     = actor.system.pdv.max;
    const newVal  = isHeal
      ? Math.min(max, current + result)
      : Math.max(0,   current - result);
    await actor.update({ "system.pdv.valeur": newVal });
  }

  // ── Hooks temps réel ─────────────────────────────────────────────────────

  /** Enregistre les hooks pour le re-rendu automatique. */
  _registerHooks() {
    this._hookIds = [
      Hooks.on("updateActor",      () => this.render(false)),
      Hooks.on("updateCombat",     () => this.render(false)),
      Hooks.on("createCombatant",  () => this.render(false)),
      Hooks.on("deleteCombatant",  () => this.render(false)),
      Hooks.on("updateCombatant",  () => this.render(false)),
      Hooks.on("createCombat",     () => this.render(false)),
      Hooks.on("deleteCombat",     () => this.render(false)),
      Hooks.on("createActiveEffect",() => this.render(false)),
      Hooks.on("deleteActiveEffect",() => this.render(false)),
    ];
  }

  /** @override */
  async close(options = {}) {
    if (this._hookIds) {
      const hookNames = [
        "updateActor","updateCombat","createCombatant","deleteCombatant",
        "updateCombatant","createCombat","deleteCombat","createActiveEffect","deleteActiveEffect",
      ];
      hookNames.forEach((n, i) => Hooks.off(n, this._hookIds[i]));
      this._hookIds = null;
    }
    return super.close(options);
  }
}
