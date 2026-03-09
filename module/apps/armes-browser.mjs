import { ARMES_DATA } from "../helpers/compendium-data.mjs";

/**
 * Navigateur d'armes Agone — fenêtre de sélection avec filtres.
 */
export class ArmesBrowser extends Application {

  constructor(actor, options = {}) {
    super(options);
    this.actor          = actor;
    this._search        = "";
    this._filterStyles  = new Set();  // melee | trait | jet
    this._filterTypes   = new Set();  // P | T | C | TC | PC | PT
    this._filterReqFor  = null;       // null = pas de filtre, sinon Number (FOR max)
    this._filterPossede = "all";      // "all" | "oui" | "non"
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id        : "agone-armes-browser",
      classes   : ["agone", "armes-browser"],
      template  : "systems/agone/templates/apps/armes-browser.hbs",
      width     : 900,
      height    : 640,
      resizable : true,
    });
  }

  get title() {
    return `Armes — ${this.actor.name}`;
  }

  /** @override */
  async getData() {
    const actorArmeNames = new Set(
      this.actor.items.filter(i => i.type === "arme").map(i => i.name)
    );

    const STYLE_LABELS = { melee:"Mêlée", trait:"Trait", jet:"Lancer" };
    const TYPE_LABELS  = { P:"P (Perforant)", T:"T (Tranchant)", C:"C (Contondant)",
                           TC:"TC", PC:"PC", PT:"PT" };

    let armes = ARMES_DATA.map((d, idx) => ({
      idx        : String(idx),
      name       : d.name,
      style      : d.style,
      styleLabel : STYLE_LABELS[d.style] ?? d.style,
      type       : d.type,
      tai        : d.tai,
      initBonus  : d.initBonus,
      attackBonus: d.attackBonus,
      defenseBonus: d.defenseBonus,
      dommages   : d.dommages,
      portee     : d.portee ?? "—",
      reqFor     : d.reqFor ?? 0,
      reqAgi     : d.reqAgi ?? 0,
      description: d.description ?? "",
      hasInActor : actorArmeNames.has(d.name),
    }));

    // Filtres
    if (this._search) {
      const s = this._search.toLowerCase();
      armes = armes.filter(e => e.name.toLowerCase().includes(s));
    }
    if (this._filterStyles.size > 0) {
      armes = armes.filter(e => this._filterStyles.has(e.style));
    }
    if (this._filterTypes.size > 0) {
      armes = armes.filter(e => this._filterTypes.has(e.type));
    }
    if (this._filterReqFor !== null) {
      armes = armes.filter(e => e.reqFor <= this._filterReqFor);
    }
    if (this._filterPossede === "oui") {
      armes = armes.filter(e => e.hasInActor);
    } else if (this._filterPossede === "non") {
      armes = armes.filter(e => !e.hasInActor);
    }

    armes.sort((a, b) => a.name.localeCompare(b.name, "fr"));

    const allStyles = ["melee","trait","jet"].map(s => ({
      value: s, label: STYLE_LABELS[s] ?? s, active: this._filterStyles.has(s)
    }));
    const allTypes = [...new Set(ARMES_DATA.map(d => d.type).filter(Boolean))].sort()
      .map(t => ({ value: t, label: TYPE_LABELS[t] ?? t, active: this._filterTypes.has(t) }));

    return {
      armes,
      allStyles,
      allTypes,
      search          : this._search,
      filterReqFor    : this._filterReqFor ?? "",
      filterPossede   : this._filterPossede,
      allStylesSelected: this._filterStyles.size === 0,
      allTypesSelected : this._filterTypes.size === 0,
    };
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    html.find(".ab-search").on("input", foundry.utils.debounce(e => {
      this._search = e.currentTarget.value.trim();
      this.render();
    }, 250));

    html.find(".ab-all-style").on("change", () => {
      this._filterStyles.clear();
      this.render();
    });
    html.find(".ab-style-check").on("change", e => {
      const v = e.currentTarget.value;
      if (e.currentTarget.checked) this._filterStyles.add(v);
      else this._filterStyles.delete(v);
      this.render();
    });

    html.find(".ab-all-type").on("change", () => {
      this._filterTypes.clear();
      this.render();
    });
    html.find(".ab-type-check").on("change", e => {
      const v = e.currentTarget.value;
      if (e.currentTarget.checked) this._filterTypes.add(v);
      else this._filterTypes.delete(v);
      this.render();
    });

    html.find(".ab-req-for").on("input", foundry.utils.debounce(e => {
      const v = parseInt(e.currentTarget.value);
      this._filterReqFor = isNaN(v) ? null : v;
      this.render();
    }, 300));

    html.find(".ab-possede-filter").on("change", e => {
      this._filterPossede = e.currentTarget.value;
      this.render();
    });

    html.find(".ab-clear").on("click", () => {
      this._search        = "";
      this._filterStyles.clear();
      this._filterTypes.clear();
      this._filterReqFor  = null;
      this._filterPossede = "all";
      this.render();
    });

    html.find("[data-action='addArme']").on("click", async e => {
      const idx = parseInt(e.currentTarget.closest("[data-arme-idx]")?.dataset?.armeIdx ?? "");
      if (isNaN(idx)) return;
      const d = ARMES_DATA[idx];
      if (!d) return;

      await Item.create({
        name  : d.name,
        type  : "arme",
        system: {
          style       : d.style        ?? "melee",
          type        : d.type         ?? "P",
          tai         : d.tai          ?? 0,
          initBonus   : d.initBonus    ?? 0,
          attackBonus : d.attackBonus  ?? 0,
          defenseBonus: d.defenseBonus ?? 0,
          dommages    : d.dommages     ?? 0,
          portee      : d.portee       ?? "",
          reqFor      : d.reqFor       ?? 0,
          reqAgi      : d.reqAgi       ?? 0,
          description : d.description  ?? "",
        },
      }, { parent: this.actor });

      ui.notifications?.info(`${d.name} ajoutée à ${this.actor.name}.`);
      this.render();
    });
  }
}
