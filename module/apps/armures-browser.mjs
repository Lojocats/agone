import { ARMURES_DATA } from "../helpers/compendium-data.mjs";

/**
 * Navigateur d'armures & boucliers Agone — fenêtre de sélection avec filtres.
 */
export class ArmuresBrowser extends Application {

  constructor(actor, options = {}) {
    super(options);
    this.actor          = actor;
    this._search        = "";
    this._filterPossede = "all";      // "all" | "oui" | "non"
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id        : "agone-armures-browser",
      classes   : ["agone", "armures-browser"],
      template  : "systems/agone/templates/apps/armures-browser.hbs",
      width     : 700,
      height    : 560,
      resizable : true,
    });
  }

  get title() {
    return `Armures — ${this.actor.name}`;
  }

  /** @override */
  async getData() {
    const actorArmureNames = new Set(
      this.actor.items.filter(i => i.type === "armure").map(i => i.name)
    );

    const TYPE_LABELS = { "0":"Veste seule", "1":"Partielle", "2":"Complète" };

    let items = ARMURES_DATA.map((d, idx) => ({
      idx       : `a${idx}`,
      name      : d.name,
      typeLabel : TYPE_LABELS[d.type] ?? d.type,
      protection: d.protection,
      malusAgi  : d.malusAgi ?? 0,
      hasInActor: actorArmureNames.has(d.name),
      raw        : d,
    }));

    // Filtres
    if (this._search) {
      const s = this._search.toLowerCase();
      items = items.filter(e => e.name.toLowerCase().includes(s));
    }
    if (this._filterPossede === "oui") {
      items = items.filter(e => e.hasInActor);
    } else if (this._filterPossede === "non") {
      items = items.filter(e => !e.hasInActor);
    }

    items.sort((a, b) => a.name.localeCompare(b.name, "fr"));

    return {
      items,
      search          : this._search,
      filterPossede   : this._filterPossede,
    };
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    html.find(".arb-search").on("input", foundry.utils.debounce(e => {
      this._search = e.currentTarget.value.trim();
      this._refocusSelector = ".arb-search";
      this.render();
    }, 250));

    html.find(".arb-possede-filter").on("change", e => {
      this._filterPossede = e.currentTarget.value;
      this.render();
    });

    html.find(".arb-clear").on("click", () => {
      this._search        = "";
      this._filterPossede = "all";
      this.render();
    });

    html.find("[data-action='addArmure']").on("click", async e => {
      const idxRaw = e.currentTarget.closest("[data-armure-idx]")?.dataset?.armureIdx ?? "";
      const d = idxRaw.startsWith("a") ? ARMURES_DATA[parseInt(idxRaw.slice(1))] : null;
      if (!d) return;

      await Item.create({
        name  : d.name,
        type  : "armure",
        system: {
          type       : d.type        ?? "0",
          protection : d.protection  ?? 0,
          malusAgi   : d.malusAgi    ?? 0,
          malusPer   : d.malusPer    ?? 0,
          description: d.description ?? "",
        },
      }, { parent: this.actor });

      ui.notifications?.info(`${d.name} ajoutée à ${this.actor.name}.`);
      this.render();
    });
  }

  /** @override */
  async _render(force, options) {
    await super._render(force, options);
    const sel = this._refocusSelector;
    if (sel) {
      this._refocusSelector = null;
      requestAnimationFrame(() => {
        const el = this.element.find(sel)[0];
        if (el) {
          el.focus();
          if (typeof el.setSelectionRange === "function") {
            try { el.setSelectionRange(el.value.length, el.value.length); } catch {}
          }
        }
      });
    }
  }
}
