import { SortsBrowser }      from "../apps/sorts-browser.mjs";
import { CompetencesBrowser } from "../apps/competences-browser.mjs";
import { ArmesBrowser }      from "../apps/armes-browser.mjs";
import { ArmuresBrowser }    from "../apps/armures-browser.mjs";
import { AvantagesBrowser }  from "../apps/avantages-browser.mjs";
import { ManoeuvresBrowser } from "../apps/manoeuvres-browser.mjs";
import { PeuplesBrowser }    from "../apps/peuples-browser.mjs";
import { PouvoirsBrowser }   from "../apps/pouvoirs-browser.mjs";
import { PeinesBrowser }     from "../apps/peines-browser.mjs";
import { delegate, activerClavier } from "../helpers/dom.mjs";
import { lierDescriptions } from "../helpers/descriptions.mjs";
import { bindTabs, bindCompetenceSearch, appliquerLectureSeule } from "./sheet-helpers.mjs";

/** Template de la vue limitée, commun à tous les types d'acteur. */
const TEMPLATE_LIMITEE = "systems/agone/templates/actors/limitee-sheet.hbs";

/** Navigateur ouvert par un bouton `.compendium-browse` selon son `data-pack`. */
const BROWSERS = {
  "agone.sorts"      : SortsBrowser,
  "agone.competences": CompetencesBrowser,
  "agone.armes"      : ArmesBrowser,
  "agone.armures"    : ArmuresBrowser,
  "agone.dons"       : AvantagesBrowser,
  "agone.manoeuvres" : ManoeuvresBrowser,
  "agone.peuples"    : PeuplesBrowser,
  "agone.pouvoirs"   : PouvoirsBrowser,
  "agone.peines"     : PeinesBrowser,
};

/**
 * Base commune des fiches d'acteur Agone (personnage, compagnon, démon, PNJ).
 *
 * Gère à chaque rendu : la normalisation des champs numériques, la sauvegarde automatique
 * des champs nommés et des éditeurs de texte, les onglets, puis appelle
 *  - `_bindViewListeners(on, root)` : écouteurs actifs même en lecture seule ;
 *  - `_bindListeners(on, root)`     : écouteurs d'édition (fiche modifiable uniquement).
 * Fournit les gestionnaires communs (items, jets, navigateurs, sorts et Arts Magiques).
 *
 * Niveaux de permission :
 *  - Limité       : vue limitée (portrait, nom, peuple ou espèce, description publique) ;
 *  - Observateur  : fiche complète en lecture seule, consultation des objets, recherche et filtres ;
 *  - Propriétaire : fiche complète modifiable, jets.
 */
export class AgoneActorSheet extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {

  static DEFAULT_OPTIONS = {
    classes: ["agone", "sheet", "actor"],
    window : { resizable: true },
    form   : { submitOnChange: true },
  };

  /**
   * Champs exclus de la sauvegarde automatique : ils ont un gestionnaire dédié.
   * @type {{ classes: string[], names: string[] }}
   */
  static AUTOSAVE_SKIP = {
    classes: ["inline-edit", "arme-equipe", "armure-portee"],
    names  : [],
  };

  /** Onglet affiché à la première ouverture. */
  static DEFAULT_TAB = "attributs";

  /** La recherche de compétences parcourt aussi les compétences non acquises (fiche personnage). */
  static RECHERCHE_NON_ACQUISES = false;

  /**
   * Listes réordonnables par glisser-déposer (poignée `.item-drag-handle`) : [ligne, conteneur].
   * @type {Array<[string, string]>}
   */
  static REORDER = [
    [".comp-cards-grid:not(.comp-na-cards) .comp-card", ".comp-cards-grid:not(.comp-na-cards)"],
    [".armes-table tbody .item-row",                    ".armes-table tbody"],
    [".manoeuvres-table tbody .item-row",               ".manoeuvres-table tbody"],
    [".equip-table tbody .item-row",                    ".equip-table tbody"],
  ];

  /** Cocher la 3e blessure grave lance le jet de VOL Difficulté 10. */
  static JET_VOL_BLESSURE3 = true;

  /** L'utilisateur n'a qu'un accès limité à l'acteur (jamais le MJ) : vue réduite. */
  get vueLimitee() {
    return this.document.limited;
  }

  /** @override — fenêtre compacte pour la vue limitée */
  _initializeApplicationOptions(options) {
    options = super._initializeApplicationOptions(options);
    if (options.document?.limited) {
      options.position = { ...options.position, width: 460, height: "auto" };
      options.classes.push("agone-limitee");
    }
    return options;
  }

  /** @override — la vue limitée remplace le template de la fiche */
  _configureRenderParts(options) {
    const parts = super._configureRenderParts(options);
    if (this.vueLimitee) parts.form = { ...parts.form, template: TEMPLATE_LIMITEE, scrollable: [".limitee-description"] };
    return parts;
  }

  /** @override */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    if (this.vueLimitee) context.limitee = await this._prepareLimiteeContext();
    return context;
  }

  /** Contexte de la vue limitée : identité publique et description (sans les blocs secrets). */
  async _prepareLimiteeContext() {
    const actor = this.actor;
    const s = actor.system;
    const sousTitre = { personnage: s.peuple, compagnon: s.espece, demon: s.origine, pnj: s.race }[actor.type] ?? "";
    return {
      nom      : actor.name,
      img      : actor.img,
      type     : game.i18n.localize(`TYPES.Actor.${actor.type}`),
      sousTitre,
      description: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        s.description ?? "", { secrets: false, relativeTo: actor }),
    };
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    this.element.classList.toggle("agone-limitee", this.vueLimitee);
    if (this.vueLimitee) return;

    // AbortController : retire les écouteurs du rendu précédent (l'élément racine persiste)
    this._renderSignal?.abort();
    this._renderSignal = new AbortController();
    const signal = this._renderSignal.signal;

    // Normaliser les inputs numériques vides (phase capture = avant les autres gestionnaires)
    this.element.addEventListener("change", (ev) => {
      if (ev.target.matches("input[type='number']")) {
        if (ev.target.value === "" || isNaN(Number(ev.target.value))) ev.target.value = "0";
      }
    }, { capture: true, signal });

    // Sauvegarde des éditeurs prose-mirror à la perte de focus
    for (const pm of this.element.querySelectorAll("prose-mirror[name]")) {
      pm.addEventListener("focusout", (ev) => {
        if (pm.contains(ev.relatedTarget)) return; // focus resté dans l'éditeur
        pm.dispatchEvent(new Event("change", { bubbles: true }));
      }, { signal });
    }

    // Sauvegarde automatique des champs nommés de l'acteur
    this.element.querySelector("form")?.addEventListener("change", async (ev) => {
      const el = ev.target;
      if (!this.isEditable || !el.name || this._skipAutosave(el)) return;
      const value = el.type === "checkbox" ? el.checked
                  : el.type === "number"   ? Number(el.value)
                  : el.value;
      await this.actor.update(foundry.utils.expandObject({ [el.name]: value }));
    }, { signal });

    const root = this.element;
    const on   = (type, selector, handler) => delegate(root, type, selector, handler, { signal });
    bindTabs(this, root, on, this.constructor.DEFAULT_TAB);
    this._bindViewListeners(on, root);
    lierDescriptions(root, this._descOuvertes ??= new Set(), { signal });
    activerClavier(root, signal);

    appliquerLectureSeule(root, !this.isEditable);
    if (this.isEditable) this._bindListeners(on, root);
  }

  /** Le champ a-t-il un gestionnaire dédié (et doit échapper à la sauvegarde automatique) ? */
  _skipAutosave(el) {
    const { classes, names } = this.constructor.AUTOSAVE_SKIP;
    return classes.some(c => el.classList.contains(c)) || names.includes(el.name);
  }

  /**
   * Écouteurs actifs même en lecture seule (observateur) : consultation sans modification.
   * Les contrôles concernés sont listés dans CONTROLES_CONSULTATION (sheet-helpers.mjs).
   */
  _bindViewListeners(on, root) {
    on("click", ".item-edit", this._onItemEdit.bind(this));
    on("click", ".item-send-chat", this._onItemSendChat.bind(this));
    on("click", "[data-action='rollItemChat']", this._onItemSendChat.bind(this));
    bindCompetenceSearch(root, on, { nonAcquises: this.constructor.RECHERCHE_NON_ACQUISES });
    on("input", ".smf-search", this._onFiltreSorts.bind(this));
    on("change", ".smf-check", this._onFiltreTypeSorts.bind(this));
  }

  /** Écouteurs d'édition par défaut : items, réordonnancement, jets de combat et compétences. */
  _bindListeners(on, root) {
    this._bindItemListeners(on);
    this._bindDragReorder(root);
    this._bindJetsCombat(on);
    on("click", "[data-action='rollAttribut']", this._onRollAttribut.bind(this));
    on("change", ".arme-equipe", this._onArmeEquipeChange.bind(this));
    on("change", ".armure-portee", this._onArmureItemPorteeChange.bind(this));
    on("click", "[data-action='rollCompetence']", this._onRollCompetence.bind(this));
  }

  /**
   * Jets de combat communs à toutes les fiches : initiative (globale ou par arme), initiative magique,
   * attaque, parade, esquive, défense naturelle, Emprise, envoi au chat des manœuvres et pouvoirs,
   * et jet de VOL à la 3e blessure grave (si `JET_VOL_BLESSURE3`).
   */
  _bindJetsCombat(on) {
    on("click", "[data-action='rollInitiative']", this._onRollInitiative.bind(this));
    on("click", "[data-action='rollInitiativeMagique']", this._onRollInitiativeMagique.bind(this));
    on("click", "[data-action='rollAttaque']", this._onRollAttaque.bind(this));
    on("click", "[data-action='rollParade']", this._onRollParade.bind(this));
    on("click", "[data-action='rollEsquive']", this._onRollEsquive.bind(this));
    on("click", "[data-action='rollDefenseNaturelle']", this._onRollDefenseNaturelle.bind(this));
    on("click", "[data-action='rollEmpriseAttr']", this._onRollEmpriseAttr.bind(this));
    on("click", "[data-action='rollManoeuvre']", this._onItemSendChat.bind(this));
    on("click", "[data-action='chatPouvoir']", this._onItemSendChat.bind(this));
    on("change", "[name='system.blessureGrave3']", this._onBlessureGrave3Change.bind(this));
  }

  /** 3e blessure grave cochée : jet de VOL Difficulté 10 (sauf fiches sans VOL). */
  async _onBlessureGrave3Change(event) {
    if (!this.constructor.JET_VOL_BLESSURE3 || !event.currentTarget.checked) return;
    await this.actor.rollVolBlessure3();
  }

  /** Items : créer, supprimer, édition inline, navigateurs (ouverture et chat : _bindViewListeners). */
  _bindItemListeners(on) {
    on("click", ".item-create", this._onItemCreate.bind(this));
    on("click", ".item-delete", this._onItemDelete.bind(this));
    on("change", ".inline-edit", this._onInlineEdit.bind(this));
    on("click", ".compendium-browse", this._onBrowseCompendium.bind(this));
  }

  /** Onglet Magie (partial magie.hbs) : sorts, Arts Magiques, tri (mini-filtre : _bindViewListeners). */
  _bindSortsListeners(on) {
    on("click", "[data-action='rollSort']", this._onRollSort.bind(this));
    on("click", "[data-action='rollSortImpro']", this._onRollSortImpro.bind(this));
    on("click", "[data-action='rollArtDomaine']", ev => this._onRollArtDomaine(ev, false));
    on("click", "[data-action='rollImpArtDomaine']", ev => this._onRollArtDomaine(ev, true));
    on("click", "[data-action='openDomainesConfig']", () => this._renderChildApp(new game.agone.DomainesArtsConfig()));
    on("click", "[data-action='triSortsToggle']", this._onTriSortsToggle.bind(this));
  }

  // ── Items ──────────────────────────────────────────────────────────────

  /** Élément `[data-item-id]` le plus proche de la cible et l'item correspondant. */
  _itemFromEvent(event) {
    const id = event.currentTarget.closest("[data-item-id]")?.dataset.itemId ?? event.currentTarget.dataset.itemId;
    return id ? this.actor.items.get(id) ?? null : null;
  }

  async _onItemCreate(event) {
    event.preventDefault();
    const type = event.currentTarget.dataset.type;
    const name = game.i18n.localize(`AGONE.Nouvel${type.charAt(0).toUpperCase() + type.slice(1)}`);
    return Item.create({ name, type }, { parent: this.actor });
  }

  _onItemEdit(event) {
    event.preventDefault();
    // renderChild : la fiche d'item s'ouvre dans la même fenêtre (pop-out ou non)
    const item = this._itemFromEvent(event);
    if (item) this.renderChild(item.sheet);
  }

  async _onItemDelete(event) {
    event.preventDefault();
    const item = this._itemFromEvent(event);
    if (!item) return;
    const confirmed = await this._confirmChild({
      title  : game.i18n.localize("AGONE.Supprimer"),
      content: `<p>${game.i18n.format("AGONE.ConfirmationSuppression", { nom: item.name })}</p>`,
    });
    if (confirmed) await item.delete();
  }

  async _onItemSendChat(event) {
    event.preventDefault();
    await this._itemFromEvent(event)?.toChat?.();
  }

  async _onInlineEdit(event) {
    event.preventDefault();
    const el    = event.currentTarget;
    const field = el.dataset.field;
    const item  = this.actor.items.get(el.dataset.itemId);
    const value = el.type === "checkbox" ? el.checked : (isNaN(el.value) ? el.value : Number(el.value));
    if (item && field) await item.update({ [field]: value });
  }

  async _onArmeEquipeChange(event) {
    await this.actor.items.get(event.currentTarget.dataset.itemId)?.update({ "system.equipe": event.currentTarget.checked });
  }

  /** Une seule armure portée à la fois. */
  async _onArmureItemPorteeChange(event) {
    const itemId = event.currentTarget.dataset.itemId;
    const portee = event.currentTarget.checked;
    const batch  = this.actor.items
      .filter(i => i.type === "armure")
      .map(i => ({ _id: i.id, "system.portee": i.id === itemId ? portee : false }));
    await this.actor.updateEmbeddedDocuments("Item", batch);
  }

  // ── Réordonnancement par glisser-déposer ───────────────────────────────

  /** Active le réordonnancement de chaque liste de `static REORDER`. */
  _bindDragReorder(root) {
    for (const [rowSel, containerSel] of this.constructor.REORDER) this._setupDragReorder(root, rowSel, containerSel);
  }

  /**
   * Rend les lignes `rowSel` déplaçables par leur poignée `.item-drag-handle` et
   * les conteneurs `containerSel` cibles du dépôt (même type d'item uniquement).
   */
  _setupDragReorder(root, rowSel, containerSel) {
    const signal = this._renderSignal?.signal;
    root.querySelectorAll(rowSel).forEach(el => {
      const handle = el.querySelector(".item-drag-handle");
      if (!handle) return;
      handle.addEventListener("mousedown", () => { el._fromDragHandle = true; }, { signal });
      el.addEventListener("mouseup", () => { el._fromDragHandle = false; }, { signal });
      el.setAttribute("draggable", true);
      el.addEventListener("dragstart", evt => {
        if (!el._fromDragHandle) { evt.preventDefault(); return; }
        el._fromDragHandle = false;
        const itemId = el.dataset.itemId;
        if (!itemId) return;
        evt.dataTransfer.effectAllowed = "move";
        evt.dataTransfer.setData("text/plain", JSON.stringify({ type: "item-reorder", itemId }));
        el.classList.add("dragging");
      }, { signal });
      el.addEventListener("dragend", () => el.classList.remove("dragging"), { signal });
    });
    root.querySelectorAll(containerSel).forEach(container => {
      container.addEventListener("dragover",  this._onDragOverItemReorder.bind(this), { signal });
      container.addEventListener("dragleave", this._onDragLeaveItemReorder.bind(this), { signal });
      container.addEventListener("drop",      this._onDropItemReorder.bind(this), { signal });
    });
  }

  /** Ligne `.item-row[data-item-id]` du conteneur située sous le pointeur. */
  _ligneSousPointeur(container, clientY) {
    return [...container.querySelectorAll(".item-row[data-item-id]")].find(row => {
      const rect = row.getBoundingClientRect();
      return clientY >= rect.top && clientY <= rect.bottom;
    });
  }

  _effacerMarquesDepot(container) {
    container.querySelectorAll(".item-drop-above, .item-drop-below")
      .forEach(el => el.classList.remove("item-drop-above", "item-drop-below"));
  }

  _onDragOverItemReorder(event) {
    let data;
    try { data = JSON.parse(event.dataTransfer.getData("text/plain")); } catch { /* données non JSON */ }
    if (data?.type !== "item-reorder" && !event.dataTransfer.types.includes("text/plain")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const container = event.currentTarget;
    const targetRow = this._ligneSousPointeur(container, event.clientY);
    this._effacerMarquesDepot(container);
    if (!targetRow) return;
    const rect = targetRow.getBoundingClientRect();
    targetRow.classList.add(event.clientY < rect.top + rect.height / 2 ? "item-drop-above" : "item-drop-below");
  }

  _onDragLeaveItemReorder(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) this._effacerMarquesDepot(event.currentTarget);
  }

  async _onDropItemReorder(event) {
    const container = event.currentTarget;
    this._effacerMarquesDepot(container);
    event.preventDefault();
    let data;
    try { data = JSON.parse(event.dataTransfer.getData("text/plain")); } catch { return; }
    if (data?.type !== "item-reorder") return;
    const draggedItem = this.actor.items.get(data.itemId);
    if (!draggedItem) return;
    const targetRow = this._ligneSousPointeur(container, event.clientY);
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

  // ── Navigateurs & dialogues enfants ────────────────────────────────────

  async _onBrowseCompendium(event) {
    event.preventDefault();
    const packId = event.currentTarget.dataset.pack ?? "agone.competences";
    const Browser = BROWSERS[packId];
    if (!Browser) {
      // Autres compendiums : comportement standard
      const pack = game.packs.get(packId);
      if (!pack) return ui.notifications?.warn(game.i18n.localize("AGONE.CompendiumIntrouvable"));
      return pack.render(true);
    }
    this._browsers ??= {};
    const filterType = event.currentTarget.dataset.filterType ?? "all";
    const browser = this._browsers[packId] ??= new Browser(this.actor, { filterType });
    // Avantages & défauts : filtre demandé par le bouton (avantages / défauts)
    if (packId === "agone.dons") browser._filterType = filterType;
    await this._renderChildApp(browser);
  }

  /** Ouvre une application comme enfant de la fiche (suit le pop-out). */
  async _renderChildApp(app) {
    await this.renderChild(app);
  }

  /** Dialogue de confirmation oui / non ouvert comme enfant de la fiche. */
  _confirmChild({ title, content }) {
    return new Promise(resolve => {
      let settled = false;
      const settle = (v) => { if (!settled) { settled = true; resolve(v); } };
      const dialog = new foundry.applications.api.DialogV2({
        window: { title },
        content,
        buttons: [
          { action: "yes", icon: "fas fa-check", label: game.i18n.localize("Yes"), default: true,
            callback: () => settle(true) },
          { action: "no",  icon: "fas fa-times", label: game.i18n.localize("No"),
            callback: () => settle(false) },
        ],
        rejectClose: false,
      });
      dialog.addEventListener("close", () => settle(false), { once: true });
      this.renderChild(dialog);
    });
  }

  // ── Jets ───────────────────────────────────────────────────────────────

  /** Jet de caractéristique : bouton portant `data-carac`. */
  async _onRollAttribut(event) {
    event.preventDefault();
    await this.actor.rollAttribut(event.currentTarget.dataset.carac);
  }

  async _onRollInitiative(event) {
    event.preventDefault();
    await this.actor.rollInitiative(this._itemFromEvent(event)?.id ?? null);
  }

  async _onRollAttaque(event) {
    event.preventDefault();
    const arme = this._itemFromEvent(event);
    if (arme) await this.actor.rollAttaque(arme.id);
  }

  async _onRollParade(event) {
    event.preventDefault();
    const arme = this._itemFromEvent(event);
    if (arme) await this.actor.rollParade(arme.id);
  }

  async _onRollInitiativeMagique(event) {
    event.preventDefault();
    await this.actor.rollInitiativeMagique();
  }

  async _onRollEsquive(event) {
    event.preventDefault();
    await this.actor.rollEsquive();
  }

  async _onRollEmpriseAttr(event) {
    event.preventDefault();
    await this.actor.rollEmpriseAttr();
  }

  async _onRollDefenseNaturelle(event) {
    event.preventDefault();
    await this.actor.rollDefenseNaturelle();
  }

  async _onRollCompetence(event) {
    event.preventDefault();
    const comp = this._itemFromEvent(event);
    if (comp) await this.actor.rollCompetence(comp.id);
  }

  // ── Sorts & Arts Magiques ──────────────────────────────────────────────

  async _onRollSort(event) {
    event.preventDefault();
    const sort = this._itemFromEvent(event);
    if (sort) await this.actor.rollSort(sort.id);
  }

  async _onRollSortImpro(event) {
    event.preventDefault();
    const sort = this._itemFromEvent(event);
    if (sort) await this.actor.rollSort(sort.id, { impro: true });
  }

  /** Jet d'Art Magique d'une ligne de l'onglet Magie (potentiel, ou improvisation si `impro`). */
  async _onRollArtDomaine(event, impro) {
    event.preventDefault();
    const ds  = event.currentTarget.dataset;
    const num = v => parseInt(v) || 0;
    await this.actor.rollArtDomaine({
      domaine   : ds.domaine ?? "",
      specialite: ds.specialite ?? "",
      nomComp   : ds.nomComp ?? "",
      apt       : num(ds.apt),
      art       : num(ds.art),
      cre       : num(ds.cre),
      scoreArts : num(ds.scoreArts),
      scoreComp : num(ds.scoreComp),
      scoreEff  : num(ds.scoreEff),
      bonusAme  : num(ds.bonusAme),
    }, { impro });
  }

  async _onTriSortsToggle(event) {
    event.preventDefault();
    const cur = this.actor.getFlag("agone", "triSorts") ?? "type";
    await this.actor.setFlag("agone", "triSorts", cur === "type" ? "seuil" : "type");
  }

  /** Masque les cartes de sort (et les groupes vides) selon `test(card)`. */
  _filtrerCartesSorts(from, test) {
    const sortsBlock = from.closest(".sorts-block");
    sortsBlock?.querySelectorAll(".sort-group").forEach(group => {
      let anyVisible = false;
      group.querySelectorAll(".sort-card").forEach(card => {
        const show = test(card);
        card.style.display = show ? "" : "none";
        if (show) anyVisible = true;
      });
      group.style.display = anyVisible ? "" : "none";
    });
  }

  /** Mini-filtre texte : nom ou badge de type. */
  _onFiltreSorts(event) {
    const query = event.currentTarget.value.toLowerCase().trim();
    this._filtrerCartesSorts(event.currentTarget, card => {
      if (!query) return true;
      const name = (card.querySelector(".sort-card-name")?.textContent ?? "").toLowerCase().trim();
      const type = (card.querySelector(".sort-type-badge")?.textContent ?? "").toLowerCase().trim();
      return name.includes(query) || type.includes(query);
    });
  }

  /** Mini-filtre par cases à cocher de type de magie (aucune cochée = tout afficher). */
  _onFiltreTypeSorts(event) {
    const checks      = event.currentTarget.closest(".smf-checks")?.querySelectorAll(".smf-check");
    const activeTypes = new Set([...(checks ?? [])].filter(c => c.checked).map(c => c.value));
    this._filtrerCartesSorts(event.currentTarget, card => {
      if (!activeTypes.size) return true;
      const cardType = (card.querySelector(".sort-type-badge")?.textContent?.trim() ?? "").split(" / ")[0];
      return activeTypes.has(cardType);
    });
  }
}
