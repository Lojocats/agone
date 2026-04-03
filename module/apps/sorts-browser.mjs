import { SORTS_DATA } from "../helpers/compendium-data.mjs";

/**
 * Navigateur de sorts Agone — fenêtre de sélection avec filtres.
 * Remplace l'ouverture brute du compendium.
 */
export class SortsBrowser extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {

  constructor(actor, options = {}) {
    super(options);
    this.actor             = actor;
    this._search           = "";
    this._filterTypes      = new Set();
    this._filterSeuilMax   = null;
    this._filterSeuilExact = null;
    this._filterPossede    = "all";
    this._expanded         = new Set();
  }

  static DEFAULT_OPTIONS = {
    id      : "agone-sorts-browser",
    classes : ["agone", "sorts-browser"],
    position: { width: 820, height: 660 },
    window  : { resizable: true },
  };

  static PARTS = {
    form: { template: "systems/agone/templates/apps/sorts-browser.hbs" },
  };

  get title() {
    return game.i18n.format("AGONE.Browser.TitreSorts", { nom: this.actor.name });
  }

  _replaceHTML(result, content, options) {
    content.innerHTML = "";
    for (const html of Object.values(result)) content.insertAdjacentHTML("beforeend", html);
  }

  async _prepareContext(options) {
    const actorSortNames = new Set(
      this.actor.items.filter(i => i.type === "sort").map(i => i.name)
    );

    // Labels lisibles pour les types
    const TYPE_LABELS = {
      jorniste      : game.i18n.localize("AGONE.Jorniste"),
      obscurantiste : game.i18n.localize("AGONE.Obscurantiste"),
      eclipsiste    : game.i18n.localize("AGONE.Eclipsiste"),
      accord        : game.i18n.localize("AGONE.Accord"),
      cyse          : game.i18n.localize("AGONE.Cyse"),
      geste         : game.i18n.localize("AGONE.Geste"),
      decorum       : game.i18n.localize("AGONE.Decorum"),
    };

    let sorts = SORTS_DATA.map((d, idx) => ({
      idx       : String(idx),
      name      : d.name,
      typeMagie : d.typeMagie,
      instrument: d.instrument,
      seuil     : d.seuil,
      portee    : d.portee,
      duree     : d.duree,
      danse     : d.danse,
      description: d.description ?? "",
      hasInActor: actorSortNames.has(d.name),
      expanded  : this._expanded.has(String(idx)),
    }));

    // Filtres
    if (this._search) {
      const s = this._search.toLowerCase();
      sorts = sorts.filter(e =>
        e.name.toLowerCase().includes(s) ||
        e.description.toLowerCase().includes(s)
      );
    }
    if (this._filterTypes.size > 0) {
      sorts = sorts.filter(e => this._filterTypes.has(e.typeMagie));
    }
    if (this._filterSeuilExact !== null) {
      sorts = sorts.filter(e => e.seuil === this._filterSeuilExact);
    } else if (this._filterSeuilMax !== null) {
      sorts = sorts.filter(e => e.seuil <= this._filterSeuilMax);
    }
    if (this._filterPossede === "oui") {
      sorts = sorts.filter(e => e.hasInActor);
    } else if (this._filterPossede === "non") {
      sorts = sorts.filter(e => !e.hasInActor);
    }

    sorts.sort((a, b) => a.name.localeCompare(b.name, "fr"));

    const allTypes = [...new Set(SORTS_DATA.map(d => d.typeMagie).filter(Boolean))]
      .sort()
      .map(t => ({ value: t, label: TYPE_LABELS[t] ?? t, active: this._filterTypes.has(t) }));

    const allSeuils = [...new Set(SORTS_DATA.map(d => d.seuil).filter(v => v != null))]
      .sort((a, b) => a - b);

    return {
      sorts,
      allTypes,
      allSeuils,
      search          : this._search,
      filterSeuilMax  : this._filterSeuilMax ?? "",
      filterSeuilExact: this._filterSeuilExact,
      filterPossede   : this._filterPossede,
      allTypesSelected: this._filterTypes.size === 0,
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

    // Recherche (avec debounce)
    html.find(".sb-search").on("input", foundry.utils.debounce(e => {
      this._search = e.currentTarget.value.trim();
      this._refocusSelector = ".sb-search";
      this.render();
    }, 250));

    // Checkbox "Tous" — efface la sélection de type
    html.find(".sb-all-check").on("change", () => {
      this._filterTypes.clear();
      this.render();
    });

    // Checkboxes de type (multi-select)
    html.find(".sb-type-check").on("change", e => {
      const t = e.currentTarget.value;
      if (e.currentTarget.checked) this._filterTypes.add(t);
      else this._filterTypes.delete(t);
      this.render();
    });

    // Filtre seuil exact
    html.find(".sb-seuil-exact").on("change", e => {
      const v = parseInt(e.currentTarget.value);
      this._filterSeuilExact = isNaN(v) ? null : v;
      // Désactiver le filtre max si un exact est sélectionné
      if (this._filterSeuilExact !== null) this._filterSeuilMax = null;
      this.render();
    });

    // Filtre seuil max
    html.find(".sb-seuil-max").on("input", foundry.utils.debounce(e => {
      const v = parseInt(e.currentTarget.value);
      this._filterSeuilMax = isNaN(v) ? null : v;
      // Désactiver le filtre exact si le max est utilisé
      if (this._filterSeuilMax !== null) this._filterSeuilExact = null;
      this._refocusSelector = ".sb-seuil-max";
      this.render();
    }, 300));

    // Filtre possédé
    html.find(".sb-possede-filter").on("change", e => {
      this._filterPossede = e.currentTarget.value;
      this.render();
    });

    // Effacer les filtres
    html.find(".sb-clear").on("click", () => {
      this._search          = "";
      this._filterTypes.clear();
      this._filterSeuilMax   = null;
      this._filterSeuilExact = null;
      this._filterPossede    = "all";
      this.render();
    });

    // Toggle description (sans re-render)
    html.find("[data-action='toggleSortDescBrowser']").on("click", e => {
      const idx = e.currentTarget.closest("[data-sort-idx]")?.dataset?.sortIdx;
      if (idx === undefined) return;
      const descRow = html.find(`.sort-desc-row[data-sort-idx="${idx}"]`);
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

    // Jet improvisé depuis le navigateur
    html.find("[data-action='rollSortImpro']").on("click", async e => {
      const idx = parseInt(e.currentTarget.closest("[data-sort-idx]")?.dataset?.sortIdx ?? "");
      if (isNaN(idx)) return;
      const d = SORTS_DATA[idx];
      if (!d) return;

      // Sorts d'emprise (danseurs) : demander quel danseur utiliser
      const EMPRISE_TYPES = new Set(["jorniste", "obscurantiste", "eclipsiste"]);
      if (EMPRISE_TYPES.has(d.typeMagie)) {
        const danseurs = this.actor.items.filter(i => i.type === "danseur" && !i.system.modeCreation);
        if (!danseurs.length) {
          ui.notifications.warn(game.i18n.format("AGONE.Notif.AucunDanseurDisponible", { acteur: this.actor.name }));
          return;
        }
        let danseurId;
        if (danseurs.length === 1) {
          danseurId = danseurs[0].id;
        } else {
          const options = danseurs.map(dan => `<option value="${dan.id}">${dan.name}</option>`).join("");
          danseurId = await foundry.applications.api.DialogV2.prompt({
            window:  { title: game.i18n.format("AGONE.Browser.TitreDialogSortImpro", { nom: d.name }) },
            content: `<div class="form-group" style="margin:8px 0">
                        <label style="font-weight:600">${game.i18n.localize("AGONE.Browser.DanseurAUtiliser")}</label>
                        <select name="danseurId" style="width:100%;margin-top:4px">${options}</select>
                      </div>`,
            ok: { label: game.i18n.localize("AGONE.Lancer"), callback: (_ev, btn) => btn.form.elements.danseurId.value },
          });
          if (!danseurId) return;
        }
        await this.actor.rollSortImproDanseur(danseurId, { name: d.name, seuil: d.seuil });
        return;
      }

      // Sort normal (Arts Magiques)
      const actorItem = this.actor.items.find(i => i.type === "sort" && i.name === d.name);
      if (actorItem) {
        await this.actor.rollSort(actorItem.id, { impro: true });
      } else {
        await this.actor.rollSort(d, { impro: true });
      }
    });

    // Ajouter un sort au personnage
    html.find("[data-action='addSort']").on("click", async e => {
      const idx = parseInt(e.currentTarget.closest("[data-sort-idx]")?.dataset?.sortIdx ?? "");
      if (isNaN(idx)) return;
      const d = SORTS_DATA[idx];
      if (!d) return;

      await Item.create({
        name  : d.name,
        type  : "sort",
        system: {
          typeMagie  : d.typeMagie   ?? "",
          seuil      : d.seuil       ?? 0,
          portee     : d.portee      ?? "",
          duree      : d.duree       ?? "",
          danse      : d.danse       ?? "",
          instrument : d.instrument  ?? "",
          special    : d.special     ?? "",
          description: d.description ?? "",
        },
      }, { parent: this.actor });

      ui.notifications?.info(game.i18n.format("AGONE.Notif.SortAjoute", { nom: d.name, acteur: this.actor.name }));
      this.render(); // rafraîchit le checkmark
    });
  }

}
