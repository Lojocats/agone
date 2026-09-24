import { AgoneActorSheet } from "./agone-actor-sheet.mjs";
import { AVANTAGES_DATA } from "../helpers/compendium-data.mjs";
import { CompetencesMixin } from "./personnage/competences.mjs";
import { CombatMixin }      from "./personnage/combat.mjs";
import { MagieMixin }       from "./personnage/magie.mjs";
import { TenebresMixin }    from "./personnage/tenebres.mjs";
import { ProgressionMixin } from "./personnage/progression.mjs";
import { CompagnonsMixin }  from "./personnage/compagnons.mjs";

/**
 * Feuille de personnage Agone (Personnage Joueur)
 * API ApplicationV2 / ActorSheetV2 — compatible Foundry 14
 *
 * La logique propre à chaque onglet vit dans les mixins de ./personnage/ :
 * chacun fournit sa préparation de contexte, ses écouteurs (_bind…Listeners) et ses gestionnaires.
 */
export class PersonnageSheet extends ProgressionMixin(CompetencesMixin(CombatMixin(MagieMixin(TenebresMixin(CompagnonsMixin(
  AgoneActorSheet
)))))) {

  static DEFAULT_OPTIONS = {
    classes : ["personnage"],
    position: { width: 870, height: 800 },
  };

  static AUTOSAVE_SKIP = {
    classes: ["inline-edit", "arme-equipe", "armure-portee", "danseur-inline-num", "demon-inline-num"],
    // Champs d'armure dont le gestionnaire recalcule des valeurs dérivées
    names  : ["system.armure.portee", "system.armure.malusAgi", "system.armure.type"],
  };

  static RECHERCHE_NON_ACQUISES = true;

  static PARTS = {
    form: {
      template: "systems/agone/templates/actors/personnage-sheet.hbs",
      scrollable: [".sheet-body"],
    },
  };

  /** @override */
  async _prepareContext(options) {
    const context = {};
    const actor    = this.actor;
    const system   = actor.system;

    context.system    = system;
    context.actor     = actor;
    context.isOwner   = actor.isOwner;
    context.editable  = this.isEditable;
    context.isGM      = game.user.isGM;

    // Tri des items par type
    const bySort = (a, b) => (a.sort ?? 0) - (b.sort ?? 0);
    context.competences = actor.items.filter(i => i.type === "competence")
      .sort((a, b) => bySort(a, b) || a.name.localeCompare(b.name, "fr"));
    context.armes        = actor.items.filter(i => i.type === "arme").sort(bySort);
    context.armures      = actor.items.filter(i => i.type === "armure");
    context.dons         = actor.items.filter(i => i.type === "don" && i.system.categorie === "avantage").sort(bySort);
    context.avantages    = context.dons;  // alias pour avantages.hbs
    context.defauts      = actor.items.filter(i => i.type === "don" && i.system.categorie === "defaut").sort(bySort);
    context.bonusAttributsSupp = system.bonusAttributsSupp ?? [];

    // Enrichit chaque avantage/défaut avec sa catégorie thématique (Âme, Corps, etc.)
    const AV_SECT_LABELS = {
      charge: game.i18n.localize("AGONE.CategorieCharges"),
      ame: game.i18n.localize("AGONE.Ame"),
      corps: game.i18n.localize("AGONE.Corps"),
      esprit: game.i18n.localize("AGONE.Esprit"),
      societe: game.i18n.localize("AGONE.CategorieSociete"),
      emprise: game.i18n.localize("AGONE.Emprise"),
      arts: game.i18n.localize("AGONE.CategorieArts"),
      saisons: game.i18n.localize("AGONE.CategorieSaisons"),
      flamme: game.i18n.localize("AGONE.Flamme"),
    };
    const avDataByName = new Map(AVANTAGES_DATA.map(d => [d.name, d]));
    for (const don of [...context.avantages, ...context.defauts]) {
      const sd = avDataByName.get(don.name);
      // Préférer le typeCharge saisi manuellement sur l'item, sinon fallback sur la donnée statique
      don._avSection      = don.system.typeCharge || sd?.categorie || "";
      don._avSectionLabel = AV_SECT_LABELS[don._avSection] ?? "";
    }
    context.sorts        = actor.items.filter(i => i.type === "sort").sort(bySort);
    context.equipements  = actor.items.filter(i => i.type === "equipement").sort(bySort);
    context.pouvoirs     = actor.items.filter(i => i.type === "pouvoir");
    context.manoeuvres   = actor.items.filter(i => i.type === "manoeuvre").sort(bySort);
    context.demons       = actor.items.filter(i => i.type === "demon").sort((a, b) => a.name.localeCompare(b.name, "fr"));

    // Enrichissement de la description HTML
    context.descriptionHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      system.description ?? "", { async: true, secrets: actor.isOwner }
    );
    context.historiqueHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      system.historique ?? "", { async: true, secrets: actor.isOwner }
    );

    // Config pour les selects
    context.peuples   = Object.entries(CONFIG.AGONE.peuples).map(([k, v]) => ({
      value: k, label: game.i18n.localize(v)
    }));
    context.saisons = Object.entries(CONFIG.AGONE.saisons ?? {}).map(([value, label]) => ({ value, label: game.i18n.localize(label) }));
    context.attributsConfig = CONFIG.AGONE.attributs;
    context.typsArme  = CONFIG.AGONE.typesArme;
    context.competencesListe = CONFIG.AGONE.competences;

    // ── Visibilité des onglets ──────────────────────────────────────────────
    const defaultTabsVisible = {
      competences: true, combat: true, magie: true,  avantages: true,
      tenebres: true,    perfidie: true, equipement: true, identite: true,
      notes: true,       companions: true,
    };
    context.tabsVisible = foundry.utils.mergeObject(
      defaultTabsVisible,
      this.actor.getFlag("agone", "tabsVisible") ?? {}
    );

    // BPdV de la race (pour affichage dans la formule PdV)
    const peupleKey  = CONFIG.AGONE?.peupleNomVersKey?.[system.peuple] ?? "humain";
    const peupleData = CONFIG.AGONE?.peuplesData?.[peupleKey] ?? CONFIG.AGONE?.peuplesData?.humain;
    context.bpdv = peupleData?.bpdv ?? 25;
    context.pdvPercent = system.pdv.max > 0
      ? Math.round(Math.min(100, (system.pdv.valeur / system.pdv.max) * 100))
      : 0;

    // Données propres à chaque onglet (mixins) — l'ordre compte : la progression
    // enrichit context.competences, préparé plus haut.
    this._prepareCompetencesContext(context);
    this._prepareMagieContext(context);
    this._prepareProgressionContext(context);
    await this._prepareTenebresContext(context);
    await this._prepareCompagnonsContext(context);

    return context;
  }

  /**
   * @override
   * Sauvegarde le nom du champ focalisé ET la position de scroll AVANT le re-render.
   */
  async _renderHTML(context, options) {
    const focused = document.activeElement;
    const isOurInput = this.element?.contains(focused) &&
      ["INPUT", "SELECT", "TEXTAREA"].includes(focused?.tagName ?? "");
    this._pendingFocusName = isOurInput ? (focused.name || null) : null;
    const scrollEl = this.element?.querySelector(".sheet-body");
    this._pendingScrollTop = scrollEl ? scrollEl.scrollTop : 0;
    return super._renderHTML(context, options);
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);

    // Restaurer le focus et le scroll après re-render
    if (this._pendingFocusName) {
      const name = this._pendingFocusName;
      this._pendingFocusName = null;
      requestAnimationFrame(() => {
        const el = this.element.querySelector(`[name="${CSS.escape(name)}"]`);
        if (el) el.focus();
      });
    }
    if (this._pendingScrollTop > 0) {
      const st = this._pendingScrollTop;
      this._pendingScrollTop = 0;
      requestAnimationFrame(() => {
        const scrollEl = this.element?.querySelector(".sheet-body");
        if (scrollEl) scrollEl.scrollTop = st;
      });
    }
  }

  /** @override */
  _bindViewListeners(on, root) {
    super._bindViewListeners(on, root);
    // Sections dépliables
    on("click", ".section-toggle", this._onToggleSection.bind(this));
  }

  /** @override */
  _bindListeners(on, root) {
    // Items — créer / éditer / supprimer / chat / édition inline / navigateurs
    this._bindItemListeners(on);

    // Réordonnancement items par glisser-déposer
    this._setupDragReorder(root, ".comp-cards-grid:not(.comp-na-cards) .comp-card", ".comp-cards-grid:not(.comp-na-cards)");
    this._setupDragReorder(root, ".manoeuvres-table tbody .item-row", ".manoeuvres-table tbody");
    this._setupDragReorder(root, ".armes-table tbody .item-row", ".armes-table tbody");
    this._setupDragReorder(root, ".equip-table tbody .item-row", ".equip-table tbody");
    this._setupDragReorder(root, ".dons-list .item-row", ".dons-list");
    this._setupDragReorder(root, ".peines-table tbody .item-row", ".peines-table tbody");

    // Retirer le peuple actuel
    on("click", ".peuple-clear", this._onClearPeuple.bind(this));

    // Drag & drop inline items
    root.querySelectorAll(".item-drag").forEach(li => {
      li.setAttribute("draggable", true);
      li.addEventListener("dragstart", this._onDragStart.bind(this));
    });

    // ── Visibilité des onglets (paramètres) ───────────────────────────────
    on("change", "[data-action='toggleTabVisibility']", this._onToggleTabVisibility.bind(this));

    // ── Écouteurs propres à chaque onglet (mixins) ────────────────────────
    this._bindProgressionListeners(on, root);
    this._bindCompetencesListeners(on, root);
    this._bindCombatListeners(on, root);
    this._bindMagieListeners(on, root);
    this._bindTenebresListeners(on, root);
    this._bindCompagnonsListeners(on, root);
  }

  // Sections dépliables
  _onToggleSection(event) {
    event.preventDefault();
    const btn = event.currentTarget;
    const section = btn.closest(".agone-section");
    if (!section) return;
    const content = section.querySelector(".section-content");
    if (!content) return;
    const isOpen = !section.classList.contains("collapsed");
    section.classList.toggle("collapsed", isOpen);
    btn.querySelector("i")?.classList.toggle("fa-chevron-down", isOpen);
    btn.querySelector("i")?.classList.toggle("fa-chevron-right", !isOpen);
  }

  // Gestion des Items
  async _onItemCreate(event) {
    event.preventDefault();
    const btn  = event.currentTarget;
    const type = btn.dataset.type;
    let name = game.i18n.localize(`AGONE.Nouvel${type.charAt(0).toUpperCase() + type.slice(1)}`);
    if (type === "danseur") {
      const baseName = name;
      const taken = new Set(this.actor.items.filter(i => i.type === "danseur").map(i => i.name));
      if (taken.has(name)) {
        let n = 2;
        while (taken.has(`${baseName} ${n}`)) n++;
        name = `${baseName} ${n}`;
      }
    }
    const itemData = { name, type, system: {} };
    // data-categorie permet de pré-remplir la catégorie pour les "don" (avantage|défaut)
    if (type === "don" && btn.dataset.categorie) {
      itemData.system.categorie = btn.dataset.categorie;
    }
    return await Item.create(itemData, { parent: this.actor });
  }

  _setupDragReorder(root, rowSel, containerSel) {
    root.querySelectorAll(rowSel).forEach(el => {
      const handle = el.querySelector(".item-drag-handle");
      if (!handle) return;
      handle.addEventListener("mousedown", () => { el._fromDragHandle = true; });
      el.addEventListener("mouseup", () => { el._fromDragHandle = false; });
      el.setAttribute("draggable", true);
      el.addEventListener("dragstart", evt => {
        if (!el._fromDragHandle) { evt.preventDefault(); return; }
        el._fromDragHandle = false;
        const itemId = el.dataset.itemId;
        if (!itemId) return;
        evt.dataTransfer.effectAllowed = "move";
        evt.dataTransfer.setData("text/plain", JSON.stringify({ type: "item-reorder", itemId }));
        el.classList.add("dragging");
      });
      el.addEventListener("dragend", () => el.classList.remove("dragging"));
    });
    root.querySelectorAll(containerSel).forEach(container => {
      container.addEventListener("dragover",  this._onDragOverItemReorder.bind(this));
      container.addEventListener("dragleave", this._onDragLeaveItemReorder.bind(this));
      container.addEventListener("drop",      this._onDropItemReorder.bind(this));
    });
  }

  _onDragOverItemReorder(event) {
    let data;
    try { data = JSON.parse(event.dataTransfer.getData("text/plain")); } catch { }
    if (data?.type !== "item-reorder" && !event.dataTransfer.types.includes("text/plain")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const container = event.currentTarget;
    const rows = [...container.querySelectorAll(".item-row[data-item-id]")];
    const targetRow = rows.find(row => {
      const rect = row.getBoundingClientRect();
      return event.clientY >= rect.top && event.clientY <= rect.bottom;
    });
    container.querySelectorAll(".item-drop-above, .item-drop-below")
      .forEach(el => el.classList.remove("item-drop-above", "item-drop-below"));
    if (!targetRow) return;
    const rect = targetRow.getBoundingClientRect();
    targetRow.classList.add(event.clientY < rect.top + rect.height / 2 ? "item-drop-above" : "item-drop-below");
  }

  _onDragLeaveItemReorder(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      event.currentTarget.querySelectorAll(".item-drop-above, .item-drop-below")
        .forEach(el => el.classList.remove("item-drop-above", "item-drop-below"));
    }
  }

  async _onDropItemReorder(event) {
    const container = event.currentTarget;
    container.querySelectorAll(".item-drop-above, .item-drop-below")
      .forEach(el => el.classList.remove("item-drop-above", "item-drop-below"));
    event.preventDefault();
    let data;
    try { data = JSON.parse(event.dataTransfer.getData("text/plain")); } catch { return; }
    if (data?.type !== "item-reorder") return;
    const draggedItem = this.actor.items.get(data.itemId);
    if (!draggedItem) return;
    const rows = [...container.querySelectorAll(".item-row[data-item-id]")];
    const targetRow = rows.find(row => {
      const rect = row.getBoundingClientRect();
      return event.clientY >= rect.top && event.clientY <= rect.bottom;
    });
    if (!targetRow || targetRow.dataset.itemId === data.itemId) return;
    const targetItem = this.actor.items.get(targetRow.dataset.itemId);
    if (!targetItem || targetItem.type !== draggedItem.type) return;
    const rect = targetRow.getBoundingClientRect();
    const sortBefore = event.clientY < rect.top + rect.height / 2;
    const siblings   = this.actor.items.filter(i => i.type === draggedItem.type && i.id !== draggedItem.id);
    const sortHelper = foundry.utils.SortingHelpers ?? globalThis.SortingHelpers;
    const updates    = sortHelper.performIntegerSort(draggedItem, { target: targetItem, siblings, sortBefore });
    if (updates.length) {
      await this.actor.updateEmbeddedDocuments("Item",
        updates.map(u => ({ _id: u.target.id, sort: u.update.sort }))
      );
    }
  }

  async _onClearPeuple(event) {
    event.preventDefault();
    const sd  = this.actor.system;
    const old = sd.peupleBonusApplique ?? {};

    // Supprimer les compétences raciales de l'ancien peuple
    const oldCompIds = (sd.peupleCompetenceIds ?? []).filter(id => this.actor.items.has(id));
    if (oldCompIds.length) await this.actor.deleteEmbeddedDocuments("Item", oldCompIds);

    const update = {
      "system.peuple":                 "",
      "system.peupleId":               "",
      "system.tai":                    0,
      "system.mvOverride":             null,
      "system.mvVol":                  0,
      "system.peupleCompetenceIds":    [],
      "system.peupleBonusApplique.corpsBonus":        0,
      "system.peupleBonusApplique.espritBonus":       0,
      "system.peupleBonusApplique.ameBonus":          0,
      "system.peupleBonusApplique.agiliteBonus":      0,
      "system.peupleBonusApplique.forceBonus":        0,
      "system.peupleBonusApplique.perceptionBonus":   0,
      "system.peupleBonusApplique.resistanceBonus":   0,
      "system.peupleBonusApplique.intelligenceBonus": 0,
      "system.peupleBonusApplique.volonteBonus":      0,
      "system.peupleBonusApplique.charismaBonus":     0,
      "system.peupleBonusApplique.creativiteBonus":   0,
      "system.peupleMalusEnAttente.corpsBonus":        0,
      "system.peupleMalusEnAttente.espritBonus":       0,
      "system.peupleMalusEnAttente.ameBonus":          0,
      "system.peupleMalusEnAttente.agiliteBonus":      0,
      "system.peupleMalusEnAttente.forceBonus":        0,
      "system.peupleMalusEnAttente.perceptionBonus":   0,
      "system.peupleMalusEnAttente.resistanceBonus":   0,
      "system.peupleMalusEnAttente.intelligenceBonus": 0,
      "system.peupleMalusEnAttente.volonteBonus":      0,
      "system.peupleMalusEnAttente.charismaBonus":     0,
      "system.peupleMalusEnAttente.creativiteBonus":   0,
      "system.corps.score":       Math.max(0, (sd.corps?.score  ?? 0) - (old.corpsBonus  ?? 0)),
      "system.esprit.score":      Math.max(0, (sd.esprit?.score ?? 0) - (old.espritBonus ?? 0)),
      "system.ame.score":         Math.max(0, (sd.ame?.score    ?? 0) - (old.ameBonus    ?? 0)),
      "system.agilite.score":     Math.max(0, (sd.agilite?.score      ?? 0) - (old.agiliteBonus      ?? 0)),
      "system.agilite.raceMin":   null,
      "system.agilite.raceMax":   null,
      "system.force.score":       Math.max(0, (sd.force?.score        ?? 0) - (old.forceBonus        ?? 0)),
      "system.force.raceMin":     null,
      "system.force.raceMax":     null,
      "system.perception.score":  Math.max(0, (sd.perception?.score   ?? 0) - (old.perceptionBonus   ?? 0)),
      "system.perception.raceMin":   null,
      "system.perception.raceMax":   null,
      "system.resistance.score":  Math.max(0, (sd.resistance?.score   ?? 0) - (old.resistanceBonus   ?? 0)),
      "system.resistance.raceMin":   null,
      "system.resistance.raceMax":   null,
      "system.intelligence.score":Math.max(0, (sd.intelligence?.score ?? 0) - (old.intelligenceBonus ?? 0)),
      "system.intelligence.raceMin": null,
      "system.intelligence.raceMax": null,
      "system.volonte.score":     Math.max(0, (sd.volonte?.score      ?? 0) - (old.volonteBonus      ?? 0)),
      "system.volonte.raceMin":   null,
      "system.volonte.raceMax":   null,
      "system.charisma.score":    Math.max(0, (sd.charisma?.score     ?? 0) - (old.charismaBonus     ?? 0)),
      "system.charisma.raceMin":  null,
      "system.charisma.raceMax":  null,
      "system.creativite.score":  Math.max(0, (sd.creativite?.score   ?? 0) - (old.creativiteBonus   ?? 0)),
      "system.creativite.raceMin": null,
      "system.creativite.raceMax": null,
    };
    await this.actor.update(update);
  }

  // ── Drop d'un item de type peuple (API V2) ────────────────────────────
  /** @override */
  async _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if (data?.type === "Item") {
      const item = await Item.fromDropData(data);
      if (item?.type === "peuple") {
        await this._applyPeuple(item);
        return;
      }
    }
    return super._onDrop(event);
  }

  async _applyPeuple(peupleItem) {
    const sd  = this.actor.system;
    const old = sd.peupleBonusApplique ?? {};
    const nw  = peupleItem.system;

    // Supprimer les compétences raciales de l'ancien peuple
    const oldCompIds = (sd.peupleCompetenceIds ?? []).filter(id => this.actor.items.has(id));
    if (oldCompIds.length) await this.actor.deleteEmbeddedDocuments("Item", oldCompIds);

    // Résoudre les compétences raciales du nouveau peuple
    // Priorité : champ sur l'item > table de config (par nom français)
    const peupleKey     = CONFIG.AGONE.peupleNomVersKey[peupleItem.name];
    const compRaciales  = (nw.competencesRaciales?.length > 0)
      ? nw.competencesRaciales
      : (CONFIG.AGONE.peuplesData[peupleKey]?.competencesRaciales ?? []);

    // Créer les nouvelles compétences raciales (score 5)
    let newCompIds = [];
    if (compRaciales.length) {
      const VALID_ATTRS = ["agilite","force","perception","resistance","intelligence","volonte","charisma","creativite","melee","tir"];
      const itemsData = compRaciales.map(c => ({
        name:   c.nom,
        type:   "competence",
        system: {
          nom:         c.nom,
          domaine:     c.famille     ?? "",
          specialite:  c.specialite  ?? "",
          attributLie: VALID_ATTRS.includes(c.attributLie) ? c.attributLie : "agilite",
          score:       c.score       ?? 5,
        },
      }));
      const created = await this.actor.createEmbeddedDocuments("Item", itemsData);
      newCompIds = created.map(i => i.id);
    }

    // Retire l'ancien bonus appliqué, ajoute le nouveau bonus POSITIF uniquement.
    // Le max racial s'applique sur le score brut (acheté), soit total <= rawMax + posBonus.
    // Tous les modificateurs raciaux (bonus ET malus) sont appliqués immédiatement.
    const totB = k => nw[`${k}Bonus`] ?? 0;

    // Coût de création forcé : raceMin et compensation des malus négatifs (score plancher 0)
    const _creaTbl  = CONFIG.AGONE.tableAchatCreation ?? [0, 1, 2, 3, 4, 5, 7, 10, 14, 19, 25];
    const _creaLast = _creaTbl.length >= 2 ? _creaTbl[_creaTbl.length-1] - _creaTbl[_creaTbl.length-2] : 1;
    const _creaCost = (n) => n <= 0 ? 0 : (n < _creaTbl.length ? _creaTbl[n] : _creaTbl[_creaTbl.length-1] + (n - _creaTbl.length + 1) * _creaLast);
    // forcedRaw = achat minimum imposé en points de création (hors bonus racial)
    const _forcedRaw = (k) => {
      const bon = totB(k);
      const pos = Math.max(0, bon);
      return Math.max(
        bon < 0 ? -bon : 0,
        Math.max(0, (nw[`${k}Min`] ?? 0) - pos)
      );
    };
    let _forcedCost = 0;
    for (const _k of ['agilite','force','perception','resistance','intelligence','volonte','charisma','creativite'])
      _forcedCost += _creaCost(_forcedRaw(_k));

    const update = {
      "system.peuple":                 peupleItem.name,
      "system.peupleId":               peupleItem.uuid,
      "system.tai":                    nw.taiBase ?? 0,
      "system.mvOverride":             nw.mvBase  ?? (CONFIG.AGONE.peuplesData[peupleKey]?.mvBase ?? null),
      "system.mvVol":                  nw.mvVolBase || (CONFIG.AGONE.peuplesData[peupleKey]?.mvVolBase ?? 0),
      "system.peupleCompetenceIds":    newCompIds,
      "system.peupleBonusApplique.corpsBonus":        nw.corpsBonus   ?? 0,
      "system.peupleBonusApplique.espritBonus":       nw.espritBonus  ?? 0,
      "system.peupleBonusApplique.ameBonus":          nw.ameBonus     ?? 0,
      "system.peupleBonusApplique.agiliteBonus":      totB('agilite'),
      "system.peupleBonusApplique.forceBonus":        totB('force'),
      "system.peupleBonusApplique.perceptionBonus":   totB('perception'),
      "system.peupleBonusApplique.resistanceBonus":   totB('resistance'),
      "system.peupleBonusApplique.intelligenceBonus": totB('intelligence'),
      "system.peupleBonusApplique.volonteBonus":      totB('volonte'),
      "system.peupleBonusApplique.charismaBonus":     totB('charisma'),
      "system.peupleBonusApplique.creativiteBonus":   totB('creativite'),
      // Malus déjà appliqués — peupleMalusEnAttente toujours à 0
      "system.peupleMalusEnAttente.corpsBonus":        0,
      "system.peupleMalusEnAttente.espritBonus":       0,
      "system.peupleMalusEnAttente.ameBonus":          0,
      "system.peupleMalusEnAttente.agiliteBonus":      0,
      "system.peupleMalusEnAttente.forceBonus":        0,
      "system.peupleMalusEnAttente.perceptionBonus":   0,
      "system.peupleMalusEnAttente.resistanceBonus":   0,
      "system.peupleMalusEnAttente.intelligenceBonus": 0,
      "system.peupleMalusEnAttente.volonteBonus":      0,
      "system.peupleMalusEnAttente.charismaBonus":     0,
      "system.peupleMalusEnAttente.creativiteBonus":   0,
      // Aspects : conserve les valeurs, retire l'ancien bonus racial, ajoute le nouveau (total)
      "system.corps.score":  Math.max(1, (sd.corps?.score  ?? 1) - (old.corpsBonus  ?? 0)) + totB('corps'),
      "system.esprit.score": Math.max(1, (sd.esprit?.score ?? 1) - (old.espritBonus ?? 0)) + totB('esprit'),
      "system.ame.score":    Math.max(1, (sd.ame?.score    ?? 1) - (old.ameBonus    ?? 0)) + totB('ame'),
      // Reset total : attributs remis au minimum forcé (racial total + achat minimum imposé)
      "system.agilite.score":      Math.max(0, totB('agilite')      + _forcedRaw('agilite')),
      "system.force.score":        Math.max(0, totB('force')        + _forcedRaw('force')),
      "system.perception.score":   Math.max(0, totB('perception')   + _forcedRaw('perception')),
      "system.resistance.score":   Math.max(0, totB('resistance')   + _forcedRaw('resistance')),
      "system.intelligence.score": Math.max(0, totB('intelligence') + _forcedRaw('intelligence')),
      "system.volonte.score":      Math.max(0, totB('volonte')      + _forcedRaw('volonte')),
      "system.charisma.score":     Math.max(0, totB('charisma')     + _forcedRaw('charisma')),
      "system.creativite.score":   Math.max(0, totB('creativite')   + _forcedRaw('creativite')),
      // Contraintes raciales persistantes
      "system.agilite.raceMin":      nw.agiliteMin      ?? null,
      "system.agilite.raceMax":      nw.agiliteMax      ?? null,
      "system.force.raceMin":        nw.forceMin        ?? null,
      "system.force.raceMax":        nw.forceMax        ?? null,
      "system.perception.raceMin":   nw.perceptionMin   ?? null,
      "system.perception.raceMax":   nw.perceptionMax   ?? null,
      "system.resistance.raceMin":   nw.resistanceMin   ?? null,
      "system.resistance.raceMax":   nw.resistanceMax   ?? null,
      "system.intelligence.raceMin": nw.intelligenceMin ?? null,
      "system.intelligence.raceMax": nw.intelligenceMax ?? null,
      "system.volonte.raceMin":      nw.volonteMin      ?? null,
      "system.volonte.raceMax":      nw.volonteMax      ?? null,
      "system.charisma.raceMin":     nw.charismaMin     ?? null,
      "system.charisma.raceMax":     nw.charismaMax     ?? null,
      "system.creativite.raceMin":   nw.creativiteMin   ?? null,
      "system.creativite.raceMax":   nw.creativiteMax   ?? null,
      // Réinitialisation des points de création (coût initial = minimums raciaux forcés)
      "system.ptsCreationCarac.depense": _forcedCost,
      "system.ptsCreationComp.depense":  0,
      "system.saisonPerso":          nw.saisonDefaut || (CONFIG.AGONE.peuplesData[peupleKey]?.saisonDefaut ?? ""),
    };
    await this.actor.update(update);
    // Reset des scores de toutes les compétences non-raciales
    const compsToReset = this.actor.items.filter(i => i.type === "competence" && !newCompIds.includes(i.id));
    if (compsToReset.length) {
      await this.actor.updateEmbeddedDocuments("Item", compsToReset.map(i => ({
        _id: i.id, "system.score": 0, "system.exp": 0,
      })));
    }
    ui.notifications?.info(game.i18n.format("AGONE.PeupleApplique", { name: peupleItem.name }));
  }

  // Paramètres — visibilité onglets
  async _onToggleTabVisibility(event) {
    const tab     = event.currentTarget.dataset.tab;
    const checked = event.currentTarget.checked;
    // Si l'onglet actif est masqué, repasser sur Attributs
    if (!checked && this._tabs?.[0]?.active === tab) {
      this._tabs[0].activate("attributs");
    }
    const current = this.actor.getFlag("agone", "tabsVisible") ?? {};
    await this.actor.setFlag("agone", "tabsVisible", { ...current, [tab]: checked });
  }
}
