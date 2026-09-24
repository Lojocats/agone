import { AgoneActorSheet } from "./agone-actor-sheet.mjs";
import { competencesParScore, caracsParAspect } from "./actor-context.mjs";

// Caractéristiques achetables du démon (échelle 0–5) ; la RÉSistance est dérivée de la Densité
const CARACS_DEMON = ["agilite", "force", "perception", "intelligence", "volonte", "charisma", "creativite"];
const CARAC_MAX = 5;
const COUT_CARAC = 2;  // XP par point de caractéristique
const COUT_COMP  = 1;  // XP par point de compétence

// Origines : couleurs chromatiques (noms propres) + démons intérieurs des paliers de Ténèbres
const ORIGINES_CHROMATIQUES = ["Opalin", "Azurin", "Saphirin", "Ambré", "Safran", "Carmin", "Vermillon", "Obsidien"];
const ORIGINES_PALIERS = ["diablotin", "demonFacetieux", "jumeauDemoniaque", "siamoisTenebres"];

/**
 * Feuille de Démon (dont les démons intérieurs créés par les paliers de Ténèbres).
 */
export class DemonSheet extends AgoneActorSheet {

  static DEFAULT_OPTIONS = {
    classes : ["demon"],
    position: { width: 700, height: 650 },
  };

  static PARTS = {
    form: {
      template  : "systems/agone/templates/actors/demon-sheet.hbs",
      scrollable: [".sheet-body"],
    },
  };

  /** @override */
  async _prepareContext(options) {
    const actor  = this.actor;
    const system = actor.system;
    const levelUp = !!system.modeLevelUp;
    const enrich  = html => foundry.applications.ux.TextEditor.implementation.enrichHTML(
      html ?? "", { async: true, secrets: actor.isOwner }
    );

    const competences = actor.items.filter(i => i.type === "competence")
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));
    // Coût XP fixe des compétences (affiché sur les boutons du partial)
    for (const c of competences) {
      c.xpCout = c.creaCout = COUT_COMP;
      c.coutAffiche = c.coutAfficheDown = `${COUT_COMP} XP`;
    }

    const origines = [
      { value: "", label: "—" },
      ...ORIGINES_CHROMATIQUES.map(label => ({ value: label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(), label })),
      ...ORIGINES_PALIERS.map(value => ({ value, label: game.i18n.localize(`AGONE.Peine.${value}`) })),
    ];

    return {
      system, actor,
      isOwner : actor.isOwner,
      editable: this.isEditable,
      armes   : actor.items.filter(i => i.type === "arme"),
      pdvPercent: system.densite?.max > 0
        ? Math.round(Math.min(100, (system.densite.valeur / system.densite.max) * 100))
        : 0,
      // Partial competences.hbs : montée de niveau via le mode level-up du démon
      competences,
      competencesGroups     : competencesParScore(competences),
      competencesNonAcquises: [],
      triCompsEstFamille    : false,
      showLevelUp           : levelUp,
      showLevelUpComp       : levelUp,
      showLevelUpAspect     : levelUp,
      // Caractéristiques (partial caracs-simples.hbs) : le nom lance le jet ; montée de niveau par XP
      caracGroups: caracsParAspect(system, actor._source.system, ["agilite", "force", "perception", "resistance", ...CARACS_DEMON.slice(3)], {
        derivees: { resistance: game.i18n.localize("AGONE.ResistanceDemonHint") },
        extra   : Object.fromEntries(CARACS_DEMON.map(k => [k, {
          shortLabel: CONFIG.AGONE.attributs[k].abbr,
          expField  : `${k}Exp`,
          localExp  : system[`${k}Exp`] ?? 0,
          cout      : COUT_CARAC,
          coutDown  : COUT_CARAC,
          canDown   : (system[k] ?? 0) > 0,
          canUp     : (system[k] ?? 0) < CARAC_MAX,
        }])),
      }),
      origineOptions : origines.map(o => ({ ...o, selected: system.origine === o.value })),
      descriptionHTML: await enrich(system.description),
      connivancesHTML: await enrich(system.connivances),
      notesHTML      : await enrich(system.notes),
    };
  }

  /** @override */
  _bindListeners(on, root) {
    super._bindListeners(on, root);
    on("click", "[data-action='toggleLevelUpDemon']", this._onToggleLevelUp.bind(this));
    on("click", "[data-action='levelUpCaracDemon']", this._onLevelUpCarac.bind(this));
    on("click", "[data-action='levelDownCaracDemon']", this._onLevelDownCarac.bind(this));
    on("click", "[data-action='levelUp'][data-type='competence']", this._onLevelUpComp.bind(this));
    on("click", "[data-action='levelDown'][data-type='competence']", this._onLevelDownComp.bind(this));
  }

  // ── Montée de niveau (XP du démon + réserve locale de la stat) ───────────

  async _onToggleLevelUp(event) {
    event.preventDefault();
    await this.actor.update({ "system.modeLevelUp": !this.actor.system.modeLevelUp });
  }

  /**
   * Répartit un coût entre la réserve locale d'une stat et l'XP du démon.
   * Si l'XP ne suffit pas, propose de verser toute l'XP dans la réserve locale.
   * @returns {Promise<{fromLocal: number, fromExp: number}|null>}  null si rien à dépenser maintenant
   */
  async _payerXP(cout, localExp, verserDansReserve) {
    const experience = this.actor.system.experience ?? 0;
    const fromLocal  = Math.min(localExp, cout);
    const fromExp    = cout - fromLocal;
    if (fromExp <= experience) return { fromLocal, fromExp };

    const actuel = localExp + experience;
    if (experience === 0) {
      ui.notifications.error(game.i18n.format("AGONE.PasAssezXP", { cout, actuel }));
      return null;
    }
    const confirmed = await this._confirmChild({
      title  : game.i18n.localize("AGONE.XPInsuffisants"),
      content: `<p>${game.i18n.format("AGONE.PasAssezXPReserve", { cout, actuel, reserve: experience })}</p>`,
    });
    if (confirmed) await verserDansReserve(localExp + experience);
    return null;
  }

  _confirmLevel(key, data) {
    return this._confirmChild({
      title  : game.i18n.localize("AGONE.LevelUpDemon"),
      content: `<p>${game.i18n.format(key, { nom: this.actor.name, ...data })}</p>`,
    });
  }

  async _onLevelUpCarac(event) {
    event.preventDefault();
    const { key, expField, label = key } = event.currentTarget.dataset;
    const sd = this.actor._source.system;   // valeurs stockées, sans les effets actifs
    const localExp = sd[expField] ?? 0;
    const paiement = await this._payerXP(COUT_CARAC, localExp,
      reserve => this.actor.update({ [`system.${expField}`]: reserve, "system.experience": 0 }));
    if (!paiement) return;
    if (!await this._confirmLevel("AGONE.ConfirmerLevelUpCaracDemon", { stat: label, cout: COUT_CARAC })) return;

    const updates = { [`system.${key}`]: (sd[key] ?? 0) + 1 };
    if (paiement.fromLocal) updates[`system.${expField}`] = localExp - paiement.fromLocal;
    if (paiement.fromExp)   updates["system.experience"]  = (sd.experience ?? 0) - paiement.fromExp;
    await this.actor.update(updates);
  }

  async _onLevelDownCarac(event) {
    event.preventDefault();
    const { key, label = key } = event.currentTarget.dataset;
    const sd = this.actor._source.system;   // valeurs stockées, sans les effets actifs
    if ((sd[key] ?? 0) <= 0) return;
    if (!await this._confirmLevel("AGONE.ConfirmerLevelDownCaracDemon", { stat: label, cout: COUT_CARAC })) return;
    await this.actor.update({
      [`system.${key}`]:   (sd[key] ?? 0) - 1,
      "system.experience": (sd.experience ?? 0) + COUT_CARAC,
    });
  }

  async _onLevelUpComp(event) {
    event.preventDefault();
    const item = this.actor.items.get(event.currentTarget.dataset.itemId);
    if (!item) return;
    const localExp = item.system.exp ?? 0;
    const paiement = await this._payerXP(COUT_COMP, localExp,
      reserve => Promise.all([item.update({ "system.exp": reserve }), this.actor.update({ "system.experience": 0 })]));
    if (!paiement) return;
    if (!await this._confirmLevel("AGONE.ConfirmerLevelUpCompDemon", { nom: item.name, cout: COUT_COMP })) return;

    const itemUpdates = { "system.score": (item.system.score ?? 0) + 1 };
    if (paiement.fromLocal) itemUpdates["system.exp"] = localExp - paiement.fromLocal;
    await Promise.all([
      item.update(itemUpdates),
      ...(paiement.fromExp ? [this.actor.update({ "system.experience": (this.actor.system.experience ?? 0) - paiement.fromExp })] : []),
    ]);
  }

  async _onLevelDownComp(event) {
    event.preventDefault();
    const item = this.actor.items.get(event.currentTarget.dataset.itemId);
    if (!item || (item.system.score ?? 0) <= 0) return;
    if (!await this._confirmLevel("AGONE.ConfirmerLevelDownCompDemon", { nom: item.name, cout: COUT_COMP })) return;
    await Promise.all([
      item.update({ "system.score": (item.system.score ?? 0) - 1 }),
      this.actor.update({ "system.experience": (this.actor.system.experience ?? 0) + COUT_COMP }),
    ]);
  }
}
