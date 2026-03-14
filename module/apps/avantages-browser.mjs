import { AVANTAGES_DATA } from "../helpers/compendium-data.mjs";

// Libellés lisibles des catégories
const CAT_LABELS = {
  charge  : "Charges",
  ame     : "Âme",
  corps   : "Corps",
  esprit  : "Esprit",
  societe : "Société",
  emprise : "Emprise",
  arts    : "Arts",
  saisons : "Saisons",
  flamme  : "Flamme",
};

/**
 * Navigateur d'avantages & défauts (données PDF) — fenêtre de sélection avec filtres.
 */
export class AvantagesBrowser extends Application {

  constructor(actor, options = {}) {
    super(options);
    this.actor          = actor;
    this._search        = "";
    this._filterSection = "all";   // "all" | "charge" | "ame" | "corps" | ...
    this._filterType    = "all";   // "all" | "avantage" | "defaut"
    this._filterPossede = "all";   // "all" | "oui" | "non"
    this._expanded      = new Set();
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id        : "agone-avantages-browser",
      classes   : ["agone", "avantages-browser"],
      template  : "systems/agone/templates/apps/avantages-browser.hbs",
      width     : 740,
      height    : 580,
      resizable : true,
    });
  }

  get title() {
    return `Avantages & Défauts — ${this.actor.name}`;
  }

  /** @override */
  async getData() {
    const actorDonNames = new Set(
      this.actor.items.filter(i => i.type === "don").map(i => i.name)
    );

    let items = AVANTAGES_DATA.map((d, idx) => ({
      idx        : String(idx),
      name       : d.name,
      section    : d.categorie,
      sectionLabel: CAT_LABELS[d.categorie] ?? d.categorie,
      type       : d.type,
      charge     : d.charge,
      chargeAbs  : Math.abs(d.charge),
      prerequis  : d.prerequis ?? "",
      description: d.description ?? "",
      hasInActor : actorDonNames.has(d.name),
      expanded   : this._expanded.has(String(idx)),
    }));

    // Filtres
    if (this._search) {
      const s = this._search.toLowerCase();
      items = items.filter(e =>
        e.name.toLowerCase().includes(s) ||
        e.description.toLowerCase().includes(s) ||
        e.prerequis.toLowerCase().includes(s)
      );
    }
    if (this._filterSection !== "all") {
      items = items.filter(e => e.section === this._filterSection);
    }
    if (this._filterType !== "all") {
      items = items.filter(e => e.type === this._filterType);
    }
    if (this._filterPossede === "oui") {
      items = items.filter(e => e.hasInActor);
    } else if (this._filterPossede === "non") {
      items = items.filter(e => !e.hasInActor);
    }

    items.sort((a, b) => {
      // Avantages avant défauts, puis par section, puis par nom
      if (a.type !== b.type) return a.type === "avantage" ? -1 : 1;
      if (a.section !== b.section) return a.section.localeCompare(b.section, "fr");
      return a.name.localeCompare(b.name, "fr");
    });

    return {
      items,
      search        : this._search,
      filterSection : this._filterSection,
      filterType    : this._filterType,
      filterPossede : this._filterPossede,
      sections      : Object.entries(CAT_LABELS).map(([k, v]) => ({ key: k, label: v })),
    };
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    html.find(".avb-search").on("input", foundry.utils.debounce(e => {
      this._search = e.currentTarget.value.trim();
      this._refocusSelector = ".avb-search";
      this.render();
    }, 250));

    html.find(".avb-section-filter").on("change", e => {
      this._filterSection = e.currentTarget.value;
      this.render();
    });

    html.find(".avb-type-filter").on("change", e => {
      this._filterType = e.currentTarget.value;
      this.render();
    });

    html.find(".avb-possede-filter").on("change", e => {
      this._filterPossede = e.currentTarget.value;
      this.render();
    });

    html.find(".avb-clear").on("click", () => {
      this._search        = "";
      this._filterSection = "all";
      this._filterType    = "all";
      this._filterPossede = "all";
      this._expanded.clear();
      this.render();
    });

    // Toggle description (sans re-render)
    html.find("[data-action='toggleAvDesc']").on("click", e => {
      const idx = e.currentTarget.closest("[data-av-idx]")?.dataset?.avIdx;
      if (idx === undefined) return;
      const descRow = html.find(`.avb-desc-row[data-av-idx="${idx}"]`);
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

    html.find("[data-action='addAvantage']").on("click", async e => {
      const idx = parseInt(e.currentTarget.closest("[data-av-idx]")?.dataset?.avIdx ?? "");
      if (isNaN(idx)) return;
      const d = AVANTAGES_DATA[idx];
      if (!d) return;

      // Description enrichie avec prérequis si présents
      let desc = d.description ?? "";
      if (d.prerequis) desc = `<em>Prérequis : ${d.prerequis}</em><br>${desc}`;

      await Item.create({
        name  : d.name,
        type  : "don",
        system: {
          categorie  : d.type,          // "avantage" | "defaut"
          cout       : d.charge,
          description: desc,
        },
      }, { parent: this.actor });

      ui.notifications?.info(`${d.name} ajouté à ${this.actor.name}.`);
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
