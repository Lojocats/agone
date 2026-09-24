/**
 * Base commune des navigateurs Agone (armes, sorts, compétences, peuples…).
 *
 * Chaque navigateur déclare :
 *  - FILTER_DEFAULTS : valeurs initiales de ses filtres (propriétés de l'instance) ;
 *  - FILTERS         : liaison entre les contrôles du template et ces propriétés ;
 *  - DEFAULT_OPTIONS.actions : les boutons d'ajout (data-action dans le template).
 * La base gère la recherche avec debounce, la conservation du focus entre deux rendus,
 * les filtres select / nombre / cases à cocher et la réinitialisation.
 */
export class AgoneBrowser extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {

  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    this._resetFilters();
  }

  static DEFAULT_OPTIONS = {
    classes : ["agone"],
    position: { width: 680, height: 560 },
    window  : { resizable: true },
  };

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

  /** Filtre `items` sur la recherche courante, appliquée aux champs texte donnés. */
  _applySearch(items, fields = ["name"]) {
    if (!this._search) return items;
    const s = this._search.toLowerCase();
    return items.filter(e => fields.some(f => String(e[f] ?? "").toLowerCase().includes(s)));
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

  // ── Rendu ─────────────────────────────────────────────────────────────────

  _onRender(context, options) {
    super._onRender(context, options);
    this._restoreFocus();

    for (const [selector, spec] of Object.entries(this.constructor.FILTERS)) {
      for (const el of this.element.querySelectorAll(selector)) this._bindFilter(el, selector, spec);
    }
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
