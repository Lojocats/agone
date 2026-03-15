import { PEUPLES_DATA } from "../helpers/compendium-data.mjs";

/**
 * Navigateur de peuples Agone — fenêtre de sélection avec filtres.
 * Applique un peuple sur l'acteur (via drag ou bouton Appliquer).
 */
export class PeuplesBrowser extends Application {

  constructor(actor, options = {}) {
    super(options);
    this.actor          = actor;
    this._search        = "";
    this._filterPossede = "all";   // "all" | "oui" | "non"
    this._expanded      = new Set();
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id        : "agone-peuples-browser",
      classes   : ["agone", "peuples-browser"],
      template  : "systems/agone/templates/apps/peuples-browser.hbs",
      width     : 680,
      height    : 540,
      resizable : true,
    });
  }

  get title() {
    return game.i18n.format("AGONE.Browser.TitrePeuples", { nom: this.actor.name });
  }

  /** @override */
  async getData() {
    const actorPeuple = this.actor.system.peuple ?? "";

    let items = PEUPLES_DATA.map((d, idx) => ({
      idx         : String(idx),
      name        : d.name,
      taiBase     : d.taiBase ?? 0,
      description : d.description ?? "",
      isActif     : actorPeuple === d.name,
      expanded    : this._expanded.has(String(idx)),
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

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

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
      this._expanded.clear();
      this.render();
    });

    // Toggle description
    html.find("[data-action='togglePeupleDesc']").on("click", e => {
      const idx = e.currentTarget.closest("[data-peuple-idx]")?.dataset?.peupleIdx;
      if (idx === undefined) return;
      const descRow = html.find(`.pb-desc-row[data-peuple-idx="${idx}"]`);
      const icon    = e.currentTarget.querySelector("i");
      if (this._expanded.has(idx)) {
        this._expanded.delete(idx);
        descRow.slideUp(120);
        icon?.classList.replace("fa-chevron-down", "fa-chevron-right");
      } else {
        this._expanded.add(idx);
        descRow.slideDown(120);
        icon?.classList.replace("fa-chevron-right", "fa-chevron-down");
      }
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
