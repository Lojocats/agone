import { pointsDeVie, libelleSante, couleurSante } from "../helpers/sante.mjs";

/** Statuts proposés en accès rapide (ids de CONFIG.statusEffects) et leur icône. */
const STATUTS_RAPIDES = [
  ["inconscient", "fa-moon"], ["blesse", "fa-tint"], ["epuise", "fa-battery-empty"],
  ["immobilise", "fa-ban"], ["contraint", "fa-lock"], ["aveugle", "fa-eye-slash"],
];

/** Hooks qui rafraîchissent le tracker (tokens : PdV des acteurs non liés). */
const HOOKS_RAFRAICHIR = [
  "updateActor", "updateToken", "updateCombat", "createCombatant", "deleteCombatant", "updateCombatant",
  "createCombat", "deleteCombat", "createActiveEffect", "deleteActiveEffect", "updateActiveEffect",
];

/**
 * AgoreCombatTracker — suivi de combat Agone.
 *
 *  - combattants triés par initiative, tour en cours mis en avant et suivi à l'écran ;
 *  - jet d'initiative par combattant (MJ ou propriétaire) ou pour tous ;
 *  - points de vie (Densité pour un démon), dégâts et soins, blessures graves et critique ;
 *  - statuts rapides, combattants cachés (MJ) ;
 *  - un joueur ne voit ni les combattants cachés, ni les PdV exacts de ce qu'il ne possède pas
 *    (seulement l'état de santé descriptif, comme au survol des tokens).
 */
export class AgoreCombatTracker extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {

  static DEFAULT_OPTIONS = {
    id      : "agone-combat-tracker",
    classes : ["agone", "agone-combat-tracker"],
    position: { width: 440, height: 620 },
    window  : { resizable: true },
    actions : {
      createCombat  : AgoreCombatTracker.#onCreateCombat,
      startCombat   : () => game.combat?.startCombat(),
      prevTurn      : () => game.combat?.previousTurn(),
      nextTurn      : () => game.combat?.nextTurn(),
      prevRound     : () => game.combat?.previousRound(),
      nextRound     : () => game.combat?.nextRound(),
      endCombat     : AgoreCombatTracker.#onEndCombat,
      rollAllInit   : () => game.combat?.rollAll(),
      rollNpcInit   : () => game.combat?.rollNPC(),
      resetInit     : () => game.combat?.resetAll(),
      addTokens     : AgoreCombatTracker.#onAddTokens,
      rollInit      : AgoreCombatTracker.#onRollInit,
      applyDamage   : (event, target) => AgoreCombatTracker.#modifierPv(target, "degats"),
      applySoin     : (event, target) => AgoreCombatTracker.#modifierPv(target, "soins"),
      toggleBlessure: AgoreCombatTracker.#onToggleBlessure,
      toggleStatus  : AgoreCombatTracker.#onToggleStatus,
      toggleDefeated: AgoreCombatTracker.#onToggleDefeated,
      toggleHidden  : AgoreCombatTracker.#onToggleHidden,
      openSheet     : (event, target) => AgoreCombatTracker.#acteur(target)?.sheet?.render(true),
      panToken      : AgoreCombatTracker.#onPanToken,
    },
  };

  static PARTS = {
    form: { template: "systems/agone/templates/apps/combat-tracker.hbs", scrollable: [".agone-ct-list"] },
  };

  get title() {
    return game.i18n.localize("AGONE.Combat.TitreTracker");
  }

  /** Ouvre le tracker, ou ramène au premier plan celui déjà ouvert. */
  static ouvrir() {
    const ouvert = foundry.applications.instances.get(AgoreCombatTracker.DEFAULT_OPTIONS.id);
    return (ouvert ?? new AgoreCombatTracker()).render({ force: true });
  }

  // ── Données ──────────────────────────────────────────────────────────────

  async _prepareContext(options) {
    const combat = game.combat;
    const isGM   = game.user.isGM;
    if (!combat) return { hasCombat: false, isGM };

    // combat.combatants est toujours complet ; combat.turns n'est calculé qu'après les initiatives
    const combatants = [...combat.combatants]
      .filter(c => isGM || !c.hidden)
      .sort((a, b) => (b.initiative ?? -Infinity) - (a.initiative ?? -Infinity) || a.name.localeCompare(b.name))
      .map(c => this._prepareCombattant(c, combat));

    const actif = combatants.find(c => c.isActive);
    return {
      hasCombat : true,
      isGM,
      round     : combat.round,
      isStarted : combat.started,
      tour      : combat.started ? game.i18n.format("AGONE.Combat.TourN", { n: (combat.turn ?? 0) + 1, total: combat.turns.length }) : "",
      actifNom  : actif?.name ?? "",
      sansInitiative: combatants.filter(c => !c.hasInitiative).length,
      combatants,
      statuts   : STATUTS_RAPIDES.map(([id, icone]) => ({
        id, icone, label: game.i18n.localize(CONFIG.statusEffects.find(s => s.id === id)?.name ?? id),
      })),
    };
  }

  _prepareCombattant(c, combat) {
    const actor  = c.token?.actor ?? c.actor;     // tokens non liés : acteur synthétique
    const sd     = actor?.system ?? {};
    const visible = game.user.isGM || !!actor?.isOwner;
    const { valeur, max, champ } = pointsDeVie(actor);
    const pct = max > 0 ? Math.round(Math.min(100, (valeur / max) * 100)) : 0;
    const statuts = actor?.statuses ?? new Set();
    return {
      id           : c.id,
      name         : c.name,
      img          : c.img ?? actor?.img ?? "icons/svg/mystery-man.svg",
      initiative   : c.initiative,
      hasInitiative: c.initiative !== null && c.initiative !== undefined,
      isActive     : combat.started && c.id === combat.combatant?.id,
      isDefeated   : c.defeated,
      isHidden     : c.hidden,
      canRollInit  : game.user.isGM || c.isOwner,
      visible,
      // Points de vie : chiffres pour le MJ et le propriétaire, état descriptif sinon
      pv: { valeur, max, pct, couleur: couleurSante(pct), champ, label: game.i18n.localize(champ === "densite" ? "AGONE.Densite" : "AGONE.PdV") },
      sante        : libelleSante(actor) ?? "",
      // Repères de combat (MJ et propriétaire)
      stats        : visible ? [
        { label: "AGONE.Combat.Def", valeur: sd.defenseNaturelle },
        { label: "AGONE.Combat.Esq", valeur: sd.esquiveTotal },
        { label: "AGONE.Melee",      valeur: sd.melee },
      ].filter(s => s.valeur !== undefined) : [],
      malus        : sd.malusBlessureGrave ?? 0,
      blessures    : [1, 2, 3].map(n => ({ champ: `blessureGrave${n}`, actif: !!sd[`blessureGrave${n}`], n })),
      critique     : !!sd.blessuresCritique,
      statuts      : STATUTS_RAPIDES.map(([id]) => statuts.has(id)),
    };
  }

  // ── Rendu ────────────────────────────────────────────────────────────────

  _onFirstRender(context, options) {
    super._onFirstRender(context, options);
    this._hookIds = HOOKS_RAFRAICHIR.map(nom => [nom, Hooks.on(nom, () => this.render())]);
  }

  _onRender(context, options) {
    super._onRender(context, options);
    // Garder le combattant actif visible
    this.element.querySelector(".ct-active")?.scrollIntoView({ block: "nearest" });

    // Saisies directes : initiative et points de vie
    for (const input of this.element.querySelectorAll(".ct-init-input")) {
      input.addEventListener("change", ev => {
        const valeur = Number(ev.currentTarget.value);
        if (!isNaN(valeur)) game.combat?.setInitiative(AgoreCombatTracker.#combattant(ev.currentTarget)?.id, valeur);
      });
    }
    for (const input of this.element.querySelectorAll(".ct-pdv-input")) {
      input.addEventListener("change", ev => {
        const actor = AgoreCombatTracker.#acteur(ev.currentTarget);
        if (!actor) return;
        const { max, champ } = pointsDeVie(actor);
        const valeur = Math.max(0, Math.min(max, Number(ev.currentTarget.value) || 0));
        actor.update({ [`system.${champ}.valeur`]: valeur });
      });
    }
  }

  /** @override */
  async close(options = {}) {
    for (const [nom, id] of this._hookIds ?? []) Hooks.off(nom, id);
    this._hookIds = null;
    return super.close(options);
  }

  // ── Résolution ───────────────────────────────────────────────────────────

  static #combattant(el) {
    return game.combat?.combatants.get(el.closest("[data-combatant-id]")?.dataset.combatantId) ?? null;
  }

  /** Acteur d'une ligne : celui du token pour un token non lié (et non l'acteur du monde). */
  static #acteur(el) {
    const c = AgoreCombatTracker.#combattant(el);
    return c?.token?.actor ?? c?.actor ?? null;
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  static async #onCreateCombat() {
    const combat = await Combat.create({ scene: canvas.scene?.id, active: true });
    if (combat) ui.notifications.info(game.i18n.localize("AGONE.Combat.CombatCree"));
  }

  static async #onEndCombat() {
    const confirme = await foundry.applications.api.DialogV2.confirm({
      window : { title: game.i18n.localize("AGONE.Combat.TerminerCombat") },
      content: `<p>${game.i18n.localize("AGONE.Combat.TerminerCombatConfirm")}</p>`,
    });
    if (confirme) await game.combat?.endCombat();
  }

  static async #onAddTokens() {
    const combat = game.combat;
    const tokens = canvas.tokens?.controlled ?? [];
    if (!combat) return;
    if (!tokens.length) return ui.notifications.warn(game.i18n.localize("AGONE.Combat.AucunTokenSelectionne"));
    const creations = tokens
      .filter(t => !combat.combatants.some(c => c.tokenId === t.id))
      .map(t => ({ tokenId: t.id, sceneId: canvas.scene.id, actorId: t.actor?.id ?? null, hidden: t.document.hidden }));
    if (!creations.length) return ui.notifications.info(game.i18n.localize("AGONE.Combat.TokensDejaPresents"));
    await combat.createEmbeddedDocuments("Combatant", creations);
    ui.notifications.info(game.i18n.format("AGONE.Combat.TokensAjoutes", { count: creations.length }));
  }

  /** Jet d'initiative d'un combattant : le jet Agone de l'acteur l'inscrit au combat. */
  static async #onRollInit(event, target) {
    const c = AgoreCombatTracker.#combattant(target);
    const actor = AgoreCombatTracker.#acteur(target);
    if (!c) return;
    if (typeof actor?.rollInitiative === "function" && actor.system) await actor.rollInitiative(null);
    else await game.combat.rollInitiative([c.id]);
  }

  /** Dégâts ou soins : dialogue de saisie, appliqués aux PdV (Densité pour un démon). */
  static async #modifierPv(target, mode) {
    const actor = AgoreCombatTracker.#acteur(target);
    if (!actor) return;
    const soins = mode === "soins";
    const montant = await foundry.applications.api.DialogV2.prompt({
      window : { title: game.i18n.localize(soins ? "AGONE.Combat.AppliquerSoins" : "AGONE.Combat.AppliquerDegats") },
      content: `<div class="form-group">
        <label>${game.i18n.localize(soins ? "AGONE.Combat.Soins" : "AGONE.Combat.Degats")}</label>
        <input type="number" name="delta" min="0" value="0" autofocus />
      </div>`,
      ok: {
        label   : game.i18n.localize("AGONE.Appliquer"),
        callback: (ev, button) => Number(button.form.elements.delta.value) || 0,
      },
      rejectClose: false,
    });
    if (!montant) return;
    const { valeur, max, champ } = pointsDeVie(actor);
    const nouveau = soins ? Math.min(max, valeur + montant) : Math.max(0, valeur - montant);
    await actor.update({ [`system.${champ}.valeur`]: nouveau });
  }

  static async #onToggleBlessure(event, target) {
    const actor = AgoreCombatTracker.#acteur(target);
    const champ = target.dataset.field;
    if (actor && champ) await actor.update({ [`system.${champ}`]: !actor.system[champ] });
  }

  /** Statut rapide : sur le token de la scène si possible (visible sur la carte), sinon sur l'acteur. */
  static async #onToggleStatus(event, target) {
    const actor = AgoreCombatTracker.#acteur(target);
    const statut = target.dataset.status;
    if (actor && statut) await actor.toggleStatusEffect(statut);
  }

  static async #onToggleDefeated(event, target) {
    const c = AgoreCombatTracker.#combattant(target);
    if (c) await c.update({ defeated: !c.defeated });
  }

  static async #onToggleHidden(event, target) {
    const c = AgoreCombatTracker.#combattant(target);
    if (c) await c.update({ hidden: !c.hidden });
  }

  /** Centre la carte sur le token du combattant (clic sur le nom). */
  static #onPanToken(event, target) {
    const token = AgoreCombatTracker.#combattant(target)?.token?.object;
    if (!token) return;
    canvas.animatePan({ x: token.center.x, y: token.center.y });
    if (token.isOwner) token.control({ releaseOthers: true });
  }
}
