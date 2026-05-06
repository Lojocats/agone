import { PEUPLES_DATA } from "../helpers/compendium-data.mjs";

/**
 * Navigateur de peuples Agone — fenêtre de sélection avec filtres.
 * Applique un peuple sur l'acteur (via drag ou bouton Appliquer).
 */
export class PeuplesBrowser extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {

  constructor(actor, options = {}) {
    super(options);
    this.actor          = actor;
    this._search        = "";
    this._filterPossede = "all";
  }

  static DEFAULT_OPTIONS = {
    id      : "agone-peuples-browser",
    classes : ["agone", "peuples-browser"],
    position: { width: 680, height: 540 },
    window  : { resizable: true },
  };

  static PARTS = {
    form: { template: "systems/agone/templates/apps/peuples-browser.hbs" },
  };

  get title() {
    return game.i18n.format("AGONE.Browser.TitrePeuples", { nom: this.actor.name });
  }

  async _prepareContext(options) {
    const actorPeuple = this.actor.system.peuple ?? "";

    let items = PEUPLES_DATA.map((d, idx) => ({
      idx         : String(idx),
      name        : d.name,
      taiBase     : d.taiBase ?? 0,
      description : d.description ?? "",
      isActif     : actorPeuple === d.name,
    }));

    if (this._search) {
      const s = this._search.toLowerCase();
      items = items.filter(e =>
        e.name.toLowerCase().includes(s) ||
        e.description.toLowerCase().includes(s)
      );
    }
    if (this._filterPossede === "oui") {
      items = items.filter(e => e.isActif);
    } else if (this._filterPossede === "non") {
      items = items.filter(e => !e.isActif);
    }

    items.sort((a, b) => a.name.localeCompare(b.name, "fr"));

    return {
      items,
      search        : this._search,
      filterPossede : this._filterPossede,
    };
  }

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

    html.find(".pb-search").on("input", foundry.utils.debounce(e => {
      this._search = e.currentTarget.value.trim();
      this._refocusSelector = ".pb-search";
      this.render();
    }, 250));

    html.find(".pb-possede-filter").on("change", e => {
      this._filterPossede = e.currentTarget.value;
      this.render();
    });

    html.find(".pb-clear").on("click", () => {
      this._search        = "";
      this._filterPossede = "all";
      this.render();
    });

    // Appliquer un peuple
    html.find("[data-action='applyPeuple']").on("click", async e => {
      const idx = parseInt(e.currentTarget.closest("[data-peuple-idx]")?.dataset?.peupleIdx ?? "");
      if (isNaN(idx)) return;
      const d = PEUPLES_DATA[idx];
      if (!d) return;

      // Chercher l'item peuple dans le compendium pour déclencher _applyPeuple
      const pack = game.packs.get("agone.peuples");
      if (pack) {
        const index = await pack.getIndex();
        const entry = index.find(e => e.name === d.name);
        if (entry) {
          const item = await pack.getDocument(entry._id);
          if (item) {
            const sheet = this.actor.sheet;
            if (sheet?._applyPeuple) {
              await sheet._applyPeuple(item);
              ui.notifications?.info(game.i18n.format("AGONE.Notif.PeupleApplique", { nom: d.name, acteur: this.actor.name }));
              this.render();
              return;
            }
          }
        }
      }
      // Fallback : mettre le nom directement
      await this.actor.update({ "system.peuple": d.name });
      ui.notifications?.info(game.i18n.format("AGONE.Notif.PeupleApplique", { nom: d.name, acteur: this.actor.name }));
      this.render();
    });
  }

}
