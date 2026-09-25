import { rechercher, comparerPertinence, plagesSurlignage } from "../helpers/recherche.mjs";
import { lierDescriptions } from "../helpers/descriptions.mjs";
import { activerClavier } from "../helpers/dom.mjs";

/**
 * Base commune des navigateurs Agone (armes, sorts, compétences, peuples…).
 *
 * Chaque navigateur déclare :
 *  - FILTER_DEFAULTS : valeurs initiales de ses filtres (propriétés de l'instance) ;
 *  - FILTERS         : liaison entre les contrôles du template et ces propriétés ;
 *  - DEFAULT_OPTIONS.actions : les boutons d'ajout (data-action dans le template).
 * La base gère la recherche (helpers/recherche.mjs : sans accent, plusieurs mots, exclusions,
 * fautes de frappe, pertinence, surlignage) avec debounce, la conservation du focus entre deux rendus,
 * les filtres select / nombre / cases à cocher et la réinitialisation, le tri par colonne,
 * les descriptions pliables (chevron ou clic sur la ligne, état conservé entre deux rendus),
 * et la section « objets personnalisés » (items du type ITEM_TYPE créés dans le monde ou
 * dans des compendiums autres que ceux du système, avec leurs effets actifs).
 */
export class AgoneBrowser extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {

  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    this._resetFilters();
  }

  static DEFAULT_OPTIONS = {
    classes : ["agone", "agone-browser"],
    position: { width: 900, height: 660 },
    window  : { resizable: true },
    actions : {
      persoAjouter: AgoneBrowser.#onPersoAjouter,
      persoOuvrir : AgoneBrowser.#onPersoOuvrir,
    },
  };

  /** Type d'item proposé par le navigateur (section des objets personnalisés). */
  static ITEM_TYPE = null;

  /**
   * Valeurs initiales des filtres. Un Set est recopié à chaque réinitialisation.
   * @type {Record<string, *>}
   */
  static FILTER_DEFAULTS = { _search: "" };

  /**
   * Contrôles de filtre : { [sélecteur CSS]: spec }.
   *   kind "text"   — saisie texte (debounce), valeur trimée
   *   kind "select" — valeur brute du contrôle
   *   kind "number" — entier ou null ; `debounce` pour un champ saisi au clavier
   *   kind "set"    — cases à cocher alimentant un Set
   *   kind "setAll" — case « Tous » qui vide le Set
   *   kind "reset"  — bouton qui remet `props` (ou tous les filtres) à leur valeur initiale
   * `onChange(value)` est appelé (avec this = l'application) après la mise à jour.
   * @type {Record<string, {kind: string, prop?: string, props?: string[], debounce?: number, onChange?: Function}>}
   */
  static FILTERS = {};

  /** Remet les filtres indiqués (ou tous) à leur valeur initiale. */
  _resetFilters(props = null) {
    const defaults = this.constructor.FILTER_DEFAULTS;
    for (const key of props ?? Object.keys(defaults)) {
      const v = defaults[key];
      this[key] = v instanceof Set ? new Set(v) : v;
    }
  }

  // ── Aides de filtrage pour _prepareContext ────────────────────────────────

  /**
   * Filtre `items` sur la recherche courante, appliquée aux champs texte donnés (le premier est le nom).
   * Retient la pertinence de chaque résultat pour `_trier`. La liste principale (`principale`)
   * indique si les résultats sont approchants (faute de frappe tolérée).
   */
  _applySearch(items, fields = ["name"], { principale = true } = {}) {
    const r = rechercher(items, this._search, fields);
    this._pertinence ??= new Map();
    for (const [e, s] of r.scores) this._pertinence.set(e, s);
    if (principale) this._rechercheApprox = r.approximatif;
    return r.resultats;
  }

  /** Trie `items` : par pertinence si une recherche est active, puis selon `ordre`. */
  _trier(items, ordre) {
    return items.sort(comparerPertinence(this._pertinence, ordre));
  }

  /** @override — pertinences recalculées à chaque rendu (avant _prepareContext des sous-classes) */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    this._pertinence = new Map();
    this._rechercheApprox = false;
  }

  /** Filtre `items` selon `_filterPossede` ("all" | "oui" | "non") et le prédicat `owned`. */
  _applyPossede(items, owned = e => e.hasInActor) {
    if (this._filterPossede === "oui") return items.filter(owned);
    if (this._filterPossede === "non") return items.filter(e => !owned(e));
    return items;
  }

  /** Récupère l'entrée de `data` désignée par l'attribut data-* du plus proche parent. */
  static _entryFromTarget(target, data, datasetKey) {
    const raw = target.closest(`[data-${datasetKey.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)}]`)?.dataset?.[datasetKey];
    const idx = parseInt(raw ?? "");
    return isNaN(idx) ? null : (data[idx] ?? null);
  }

  /** Crée un item sur l'acteur, notifie et rafraîchit le navigateur. */
  async _addItem(itemData, notifKey) {
    await Item.create(itemData, { parent: this.actor });
    if (notifKey) ui.notifications?.info(game.i18n.format(notifKey, { nom: itemData.name, acteur: this.actor.name }));
    this.render();
  }

  // ── Objets personnalisés (monde et compendiums hors système) ──────────────

  /** @override — ajoute la liste des objets personnalisés au contexte du template. */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    if (this.constructor.ITEM_TYPE) context.personnalises = await this._objetsPersonnalises();
    return context;
  }

  /**
   * Items du type ITEM_TYPE : items du monde et des compendiums d'items qui n'appartiennent
   * pas au système (les compendiums du système reprennent les tables du livre de base).
   * La recherche et le filtre « possédé » du navigateur s'y appliquent aussi.
   */
  async _objetsPersonnalises() {
    const type = this.constructor.ITEM_TYPE;
    const possedes = new Set(this.actor.items.filter(i => i.type === type).map(i => i.name));
    const entrees = game.items
      .filter(i => i.type === type)
      .map(i => ({
        uuid: i.uuid, name: i.name, img: i.img, description: i.system.description ?? "",
        effets: i.effects.size > 0, source: game.i18n.localize("AGONE.Browser.SourceMonde"),
      }));

    for (const pack of game.packs) {
      if (pack.documentName !== "Item" || pack.metadata.packageName === game.system.id) continue;
      if (!pack.visible) continue;
      const index = await pack.getIndex({ fields: ["type", "img", "system.description", "effects"] });
      for (const e of index) {
        if (e.type !== type) continue;
        entrees.push({
          uuid: e.uuid, name: e.name, img: e.img, description: e.system?.description ?? "",
          effets: (e.effects?.length ?? 0) > 0, source: pack.metadata.label,
        });
      }
    }

    let liste = entrees.map(e => ({ ...e, possede: possedes.has(e.name), hasInActor: possedes.has(e.name) }));
    liste = this._applySearch(liste, ["name", "description"], { principale: false });
    liste = this._applyPossede(liste);
    return this._trier(liste, (a, b) => a.name.localeCompare(b.name, "fr"));
  }

  /** Ajoute l'objet personnalisé à l'acteur, avec ses effets actifs. */
  static async #onPersoAjouter(event, target) {
    const doc = await fromUuid(target.closest("[data-uuid]")?.dataset.uuid);
    if (!doc) return;
    // Un peuple s'applique à la fiche (bonus raciaux) au lieu d'être ajouté comme item
    if (doc.type === "peuple" && this.actor.sheet?._applyPeuple) {
      await this.actor.sheet._applyPeuple(doc);
      ui.notifications?.info(game.i18n.format("AGONE.Notif.PeupleApplique", { nom: doc.name, acteur: this.actor.name }));
      return this.render();
    }
    const data = doc.toObject();
    delete data._id;
    await this._addItem(data, "AGONE.Notif.ObjetAjoute");
  }

  static async #onPersoOuvrir(event, target) {
    const doc = await fromUuid(target.closest("[data-uuid]")?.dataset.uuid);
    doc?.sheet.render(true);
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  _onRender(context, options) {
    super._onRender(context, options);
    this._restoreFocus();

    for (const [selector, spec] of Object.entries(this.constructor.FILTERS)) {
      for (const el of this.element.querySelectorAll(selector)) this._bindFilter(el, selector, spec);
    }
    this._bindTri();
    this._bindClavier(options);
    this._afficherRecherche();

    this._descSignal?.abort();
    this._descSignal = new AbortController();
    lierDescriptions(this.element, this._descOuvertes ??= new Set(),
      { signal: this._descSignal.signal, ligneCliquable: true });
    activerClavier(this.element, this._descSignal.signal);
  }

  /**
   * Retour visuel de la recherche : correspondances surlignées dans les noms,
   * bandeau quand les résultats sont approchants (faute de frappe tolérée).
   */
  _afficherRecherche() {
    if (!this._search) return;
    for (const cellule of this.element.querySelectorAll("td[class$='-name'], .browser-perso-nom")) {
      surligner(cellule, this._search);
    }
    const table = this.element.querySelector("table:not(.browser-perso-table)");
    if (this._rechercheApprox && table) {
      const bandeau = document.createElement("div");
      bandeau.className = "browser-recherche-approx";
      bandeau.innerHTML = `<i class="fas fa-spell-check"></i> ${game.i18n.format("AGONE.Browser.RechercheApprochante", { requete: foundry.utils.escapeHTML(this._search) })}`;
      table.before(bandeau);
    }
  }

  /**
   * Tri de la liste principale en cliquant sur un en-tête de colonne (croissant, puis décroissant).
   * Les lignes de description (`*-desc-row`) suivent leur ligne. Le tri survit aux rendus.
   */
  _bindTri() {
    const table = this.element.querySelector("table:not(.browser-perso-table)");
    if (!table?.tBodies[0]) return;
    [...table.tHead?.rows[0]?.cells ?? []].forEach((th, col) => {
      if (!th.textContent.trim()) return;
      th.classList.add("browser-triable");
      th.addEventListener("click", () => {
        this._tri = { col, dir: this._tri?.col === col ? -this._tri.dir : 1 };
        this._appliquerTri(table);
      });
    });
    this._appliquerTri(table);
  }

  _appliquerTri(table) {
    [...table.tHead.rows[0].cells].forEach((th, col) => {
      th.classList.toggle("tri-asc",  this._tri?.col === col && this._tri.dir === 1);
      th.classList.toggle("tri-desc", this._tri?.col === col && this._tri.dir === -1);
    });
    if (!this._tri) return;

    // Groupes : une ligne principale et ses lignes de description
    const tbody = table.tBodies[0];
    const groupes = [];
    for (const tr of [...tbody.rows]) {
      if (/-desc-row\b/.test(tr.className) && groupes.length) groupes.at(-1).push(tr);
      else groupes.push([tr]);
    }
    const cle = groupe => {
      const texte = groupe[0].cells[this._tri.col]?.textContent.trim() ?? "";
      return { texte, nombre: parseFloat(texte.replace(",", ".")) };
    };
    groupes.sort((a, b) => {
      const ka = cle(a), kb = cle(b);
      const diff = (!isNaN(ka.nombre) && !isNaN(kb.nombre))
        ? ka.nombre - kb.nombre
        : ka.texte.localeCompare(kb.texte, "fr", { numeric: true });
      return diff * this._tri.dir;
    });
    for (const groupe of groupes) tbody.append(...groupe);
  }

  /** Focus sur la recherche à l'ouverture ; Échap efface la recherche avant de fermer. */
  _bindClavier(options) {
    const [selecteur] = Object.entries(this.constructor.FILTERS).find(([, spec]) => spec.kind === "text") ?? [];
    const recherche = selecteur ? this.element.querySelector(selecteur) : null;
    if (!recherche) return;
    recherche.title = game.i18n.localize("AGONE.Browser.RechercheAide");
    if (options.isFirstRender) requestAnimationFrame(() => recherche.focus());
    recherche.addEventListener("keydown", ev => {
      if (ev.key !== "Escape" || !recherche.value) return;
      ev.preventDefault();
      ev.stopPropagation();
      this._search = "";
      this._refocusSelector = selecteur;
      this.render();
    });
  }

  _restoreFocus() {
    const sel = this._refocusSelector;
    if (!sel) return;
    this._refocusSelector = null;
    requestAnimationFrame(() => {
      const el = this.element?.querySelector(sel);
      if (!el) return;
      el.focus();
      try { el.setSelectionRange?.(el.value.length, el.value.length); } catch { /* input number */ }
    });
  }

  _bindFilter(el, selector, spec) {
    const update = (value, refocus = false) => {
      if (spec.prop) this[spec.prop] = value;
      spec.onChange?.call(this, value);
      if (refocus) this._refocusSelector = selector;
      this.render();
    };

    switch (spec.kind) {
      case "text":
        el.addEventListener("input", foundry.utils.debounce(
          e => update(e.target.value.trim(), true), spec.debounce ?? 250));
        break;
      case "select":
        el.addEventListener("change", e => update(e.target.value));
        break;
      case "number": {
        const parse = e => { const v = parseInt(e.target.value); return isNaN(v) ? null : v; };
        if (spec.debounce) el.addEventListener("input", foundry.utils.debounce(e => update(parse(e), true), spec.debounce));
        else               el.addEventListener("change", e => update(parse(e)));
        break;
      }
      case "set":
        el.addEventListener("change", e => {
          const set = this[spec.prop];
          if (e.target.checked) set.add(e.target.value);
          else                  set.delete(e.target.value);
          spec.onChange?.call(this, set);
          this.render();
        });
        break;
      case "setAll":
        el.addEventListener("change", () => {
          this[spec.prop].clear();
          this.render();
        });
        break;
      case "reset":
        el.addEventListener("click", () => {
          this._resetFilters(spec.props ?? null);
          if (spec.refocus) this._refocusSelector = spec.refocus;
          this.render();
        });
        break;
    }
  }
}

/**
 * Entoure de <mark> les correspondances de la recherche dans les nœuds texte d'un élément
 * (le texte d'origine est conservé : accents, casse).
 */
function surligner(element, requete) {
  const marcheur = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const noeuds = [];
  while (marcheur.nextNode()) noeuds.push(marcheur.currentNode);
  for (const noeud of noeuds) {
    const texte = noeud.nodeValue;
    const plages = plagesSurlignage(texte, requete);
    if (!plages.length) continue;
    const fragment = document.createDocumentFragment();
    let pos = 0;
    for (const [debut, fin] of plages) {
      if (debut > pos) fragment.append(texte.slice(pos, debut));
      const mark = document.createElement("mark");
      mark.className = "agone-surligne";
      mark.textContent = texte.slice(debut, fin);
      fragment.append(mark);
      pos = fin;
    }
    if (pos < texte.length) fragment.append(texte.slice(pos));
    noeud.replaceWith(fragment);
  }
}
