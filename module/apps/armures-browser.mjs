import { ARMURES_DATA } from "../helpers/compendium-data.mjs";

/**
 * Navigateur d'armures & boucliers Agone — fenêtre de sélection avec filtres.
 */
export class ArmuresBrowser extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {

  constructor(actor, options = {}) {
    super(options);
    this.actor          = actor;
    this._search        = "";
    this._filterPossede = "all";
  }

  static DEFAULT_OPTIONS = {
    id      : "agone-armures-browser",
    classes : ["agone", "armures-browser"],
    position: { width: 700, height: 560 },
    window  : { resizable: true },
  };

  static PARTS = {
    form: { template: "systems/agone/templates/apps/armures-browser.hbs" },
  };

  get title() {
    return game.i18n.format("AGONE.Browser.TitreArmures", { nom: this.actor.name });
  }

  _replaceHTML(result, content, options) {
    content.innerHTML = "";
    for (const html of Object.values(result)) content.insertAdjacentHTML("beforeend", html);
  }

  async _prepareContext(options) {
    const actorArmureNames = new Set(
      this.actor.items.filter(i => i.type === "armure").map(i => i.name)
    );

    const TYPE_LABELS = {
      "0": game.i18n.localize("AGONE.Armure.VesteSeule"),
      "1": game.i18n.localize("AGONE.Armure.Partielle"),
      "2": game.i18n.localize("AGONE.Armure.Complete"),
    };

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
  _onRender(context, options) {
    super._onRender(context, options);
    const sel = this._refocusSelector;
    if (sel) {
      this._refocusSelector = null;
      requestAnimationFrame(() => {
        const el = this.element.querySelector(sel);
        if (el) { el.focus(); try { el.setSelectionRange?.(el.value.length, el.value.length); } catch {} }
      });
    }
    const html = $(this.element);

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

      ui.notifications?.info(game.i18n.format("AGONE.Notif.ArmureAjoutee", { nom: d.name, acteur: this.actor.name }));
      this.render();
    });
  }

}
