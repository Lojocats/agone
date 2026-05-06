/**
 * Helper module : dialog de confirmation comme enfant d'une AppV2 (suit le pop-out parent).
 */
function confirmChildDialog(app, { title, content }) {
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
    app.renderChild(dialog);
  });
}

/**
 * Feuille de Compagnon / Monture — API ApplicationV2 / ActorSheetV2
 */
export class CompagnonSheet extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["agone", "sheet", "actor", "compagnon"],
    position: { width: 720, height: 650 },
    window: { resizable: true },
    form: { submitOnChange: true },
  };

  static PARTS = {
    form: {
      template: "systems/agone/templates/actors/compagnon-sheet.hbs",
      scrollable: [".sheet-body"],
    },
  };

  async _prepareContext(options) {
    const context = {};
    const system  = this.actor.system;
    context.system  = system;
    context.actor   = this.actor;
    context.isOwner = this.actor.isOwner;
    context.isGM    = game.user.isGM;
    context.armes   = this.actor.items.filter(i => i.type === "arme");
    context.armures = this.actor.items.filter(i => i.type === "armure");
    context.pdvPercent = system.pdv?.max > 0
      ? Math.round(Math.min(100, (system.pdv.valeur / system.pdv.max) * 100))
      : 0;
    // Compétences
    const _compagnComps = this.actor.items.filter(i => i.type === "competence")
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));
    context.competences = _compagnComps;
    const _compagnByScore = {};
    for (const c of _compagnComps) {
      const s = c.system.score ?? 0;
      if (!_compagnByScore[s]) _compagnByScore[s] = [];
      _compagnByScore[s].push(c);
    }
    context.competencesGroups = Object.entries(_compagnByScore)
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([score, comps]) => ({ label: `Niveau ${score}`, className: `score-${score}`, comps }));
    context.competencesNonAcquises = [];
    context.triCompsEstFamille = false;
    context.showLevelUp = false;
    context.showLevelUpComp = false;
    context.showLevelUpAspect = false;
    context.descriptionHTML = await TextEditor.enrichHTML(
      system.description ?? "", { async: true, secrets: this.actor.isOwner }
    );
    return context;
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);

    // Normaliser les inputs numériques vides (phase capture = avant autres handlers)
    this._renderSignal?.abort();
    this._renderSignal = new AbortController();
    this.element.addEventListener("change", (ev) => {
      if (ev.target.matches("input[type='number']")) {
        if (ev.target.value === "" || isNaN(Number(ev.target.value))) ev.target.value = "0";
      }
    }, { capture: true, signal: this._renderSignal.signal });

    // ── Sauvegarde automatique des champs nommés (acteur) ─────────────────
    const _actorForm = this.element.querySelector("form");
    if (_actorForm) {
      _actorForm.addEventListener("change", async (ev) => {
        const el = ev.target;
        if (!el.name) return;
        if (el.classList.contains("inline-edit")) return;
        if (el.classList.contains("arme-equipe")) return;
        if (el.classList.contains("armure-portee")) return;
        const value = el.type === "checkbox" ? el.checked
                    : el.type === "number"   ? Number(el.value)
                    : el.value;
        await this.actor.update(foundry.utils.expandObject({ [el.name]: value }));
      }, { signal: this._renderSignal.signal });
    }

    // Gestion des onglets
    const html = $(this.element);
    // Réinitialiser tous les handlers .agone pour éviter l'accumulation sur le frame persistant
    html.off(".agone");
    const activeTab = this._currentTab ?? "attributs";
    html.find(".sheet-tabs .item[data-tab]").each((_, el) => {
      el.classList.toggle("active", el.dataset.tab === activeTab);
    });
    html.find(".tab[data-tab]").each((_, el) => {
      el.classList.toggle("active", el.dataset.tab === activeTab);
    });
    html.on("click.agone", ".sheet-tabs .item[data-tab]", (e) => {
      const tab = e.currentTarget.dataset.tab;
      if (!tab) return;
      this._currentTab = tab;
      html.find(".sheet-tabs .item").removeClass("active");
      e.currentTarget.classList.add("active");
      html.find(".tab").removeClass("active");
      html.find(`.tab[data-tab="${tab}"]`).addClass("active");
    });

    if (!this.isEditable) return;
    html.on("click.agone", ".item-create", this._onItemCreate.bind(this));
    html.on("click.agone", ".item-edit", this._onItemEdit.bind(this));
    html.on("click.agone", ".item-delete", this._onItemDelete.bind(this));
    html.on("change.agone", ".inline-edit", async (e) => {
      const el = e.currentTarget;
      const item = this.actor.items.get(el.dataset.itemId);
      if (item && el.dataset.field) {
        const val = el.type === "checkbox" ? el.checked : (isNaN(el.value) ? el.value : Number(el.value));
        await item.update({ [el.dataset.field]: val });
      }
    });
    html.on("click.agone", "[data-action='rollInitiative']", async (e) => {
      e.preventDefault();
      const armeId = e.currentTarget.dataset.itemId ??
                     e.currentTarget.closest("[data-item-id]")?.dataset.itemId ?? null;
      await this.actor.rollInitiative(armeId);
    });
    html.on("click.agone", "[data-action='rollAttaque']", async (e) => {
      e.preventDefault();
      const armeId = e.currentTarget.closest("[data-item-id]")?.dataset.itemId;
      if (armeId) await this.actor.rollAttaque(armeId);
    });
    html.on("click.agone", "[data-action='rollParade']", async (e) => {
      e.preventDefault();
      const armeId = e.currentTarget.closest("[data-item-id]")?.dataset.itemId;
      if (armeId) await this.actor.rollParade(armeId);
    });
    html.on("click.agone", "[data-action='rollItemChat']", async (e) => {
      e.preventDefault();
      const armeId = e.currentTarget.dataset.itemId;
      if (armeId) await this.actor.items.get(armeId)?.toChat();
    });
    html.on("change.agone", ".arme-equipe", async (e) => {
      const itemId = e.currentTarget.dataset.itemId;
      await this.actor.items.get(itemId)?.update({ "system.equipe": e.currentTarget.checked });
    });
    html.on("change.agone", ".armure-portee", async (e) => {
      const itemId = e.currentTarget.dataset.itemId;
      const portee = e.currentTarget.checked;
      const batch = this.actor.items
        .filter(i => i.type === "armure")
        .map(i => ({ _id: i.id, "system.portee": i.id === itemId ? portee : false }));
      await this.actor.updateEmbeddedDocuments("Item", batch);
    });
    html.on("click.agone", ".compendium-browse", async (e) => {
      e.preventDefault();
      const packId = e.currentTarget.dataset.pack ?? "";
      if (packId === "agone.armes") {
        const { ArmesBrowser } = await import("../apps/armes-browser.mjs");
        if (!this._armesBrowser) this._armesBrowser = new ArmesBrowser(this.actor);
        this._armesBrowser.render(true);
      } else if (packId === "agone.armures") {
        const { ArmuresBrowser } = await import("../apps/armures-browser.mjs");
        if (!this._armuresBrowser) this._armuresBrowser = new ArmuresBrowser(this.actor);
        this._armuresBrowser.render(true);
      } else if (packId === "agone.competences") {
        const { CompetencesBrowser } = await import("../apps/competences-browser.mjs");
        if (!this._competencesBrowser) this._competencesBrowser = new CompetencesBrowser(this.actor);
        this._competencesBrowser.render(true);
      }
    });
    html.on("click.agone", "[data-action='rollCompetence']", async (e) => {
      e.preventDefault();
      const id = e.currentTarget.closest("[data-item-id]")?.dataset.itemId;
      if (id) await this.actor.rollCompetence(id);
    });
    html.on("input.agone", ".comp-search-input", (ev) => {
      const q = ev.currentTarget.value.trim().toLowerCase();
      const clearBtn = html.find(".comp-search-clear")[0];
      if (clearBtn) clearBtn.style.display = q ? "" : "none";
      html.find(".comp-group").each((_, g) => {
        let any = false;
        g.querySelectorAll(".comp-card.item-row").forEach(c => {
          const n = (c.querySelector(".comp-card-name")?.textContent ?? "").trim().toLowerCase();
          const v = !q || n.includes(q); c.style.display = v ? "" : "none";
          if (v) any = true;
        });
        g.style.display = (!q || any) ? "" : "none";
      });
      const na = html.find(".comps-na-section")[0];
      if (na) na.style.display = "none";
    });
    html.on("click.agone", ".comp-search-clear", () => {
      html.find(".comp-search-input").val("").trigger("input");
    });
  }

  async _onItemCreate(event) {
    event.preventDefault();
    const type = event.currentTarget.dataset.type;
    const key  = type.charAt(0).toUpperCase() + type.slice(1);
    return await Item.create({ name: game.i18n.localize(`AGONE.Nouvel${key}`), type }, { parent: this.actor });
  }
  _onItemEdit(event) {
    event.preventDefault();
    const li   = event.currentTarget.closest("[data-item-id]");
    const item = this.actor.items.get(li.dataset.itemId);
    if (item) this.renderChild(item.sheet);
  }
  async _onItemDelete(event) {
    event.preventDefault();
    const li   = event.currentTarget.closest("[data-item-id]");
    const item = this.actor.items.get(li.dataset.itemId);
    if (item && await confirmChildDialog(this, { title: game.i18n.localize("AGONE.Supprimer"), content: `<p>${item.name}</p>` })) {
      await item.delete();
    }
  }
}

/**
 * Feuille de Démon — API ApplicationV2 / ActorSheetV2
 */
export class DemonSheet extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["agone", "sheet", "actor", "demon"],
    position: { width: 700, height: 650 },
    window: { resizable: true },
    form: { submitOnChange: true },
  };

  static PARTS = {
    form: {
      template: "systems/agone/templates/actors/demon-sheet.hbs",
      scrollable: [".sheet-body"],
    },
  };

  async _prepareContext(options) {
    const context = {};
    context.system   = this.actor.system;
    context.isOwner  = this.actor.isOwner;
    context.armes    = this.actor.items.filter(i => i.type === "arme");
    context.pdvPercent = this.actor.system.densite?.max > 0
      ? Math.round(Math.min(100, (this.actor.system.densite.valeur / this.actor.system.densite.max) * 100))
      : 0;
    // Compétences
    const _demonComps = this.actor.items.filter(i => i.type === "competence")
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));
    context.competences = _demonComps;
    const _demonByScore = {};
    for (const c of _demonComps) {
      const s = c.system.score ?? 0;
      if (!_demonByScore[s]) _demonByScore[s] = [];
      _demonByScore[s].push(c);
    }
    context.competencesGroups = Object.entries(_demonByScore)
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([score, comps]) => ({ label: `Niveau ${score}`, className: `score-${score}`, comps }));
    context.competencesNonAcquises = [];
    context.triCompsEstFamille = false;
    context.showLevelUp = false;
    context.showLevelUpComp = false;
    context.showLevelUpAspect = false;
    // Sélecteur d'origine : types chromatiques + types de palier démoniaques
    const origineChoices = [
      { value: "",                label: "—" },
      { value: "opalin",          label: "Opalin" },
      { value: "azurin",          label: "Azurin" },
      { value: "saphirin",        label: "Saphirin" },
      { value: "ambre",           label: "Ambré" },
      { value: "safran",          label: "Safran" },
      { value: "carmin",          label: "Carmin" },
      { value: "vermillon",       label: "Vermillon" },
      { value: "obsidien",        label: "Obsidien" },
      { value: "diablotin",       label: game.i18n.localize("AGONE.Peine.diablotin") },
      { value: "demonFacetieux",  label: game.i18n.localize("AGONE.Peine.demonFacetieux") },
      { value: "jumeauDemoniaque",label: game.i18n.localize("AGONE.Peine.jumeauDemoniaque") },
      { value: "siamoisTenebres", label: game.i18n.localize("AGONE.Peine.siamoisTenebres") },
    ];
    context.origineOptions = origineChoices.map(o => ({ ...o, selected: this.actor.system.origine === o.value }));
    context.descriptionHTML = await TextEditor.enrichHTML(
      this.actor.system.description ?? "", { async: true, secrets: this.actor.isOwner }
    );
    context.connivancesHTML = await TextEditor.enrichHTML(
      this.actor.system.connivances ?? "", { async: true, secrets: this.actor.isOwner }
    );
    context.notesHTML = await TextEditor.enrichHTML(
      this.actor.system.notes ?? "", { async: true, secrets: this.actor.isOwner }
    );
    return context;
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);

    // Normaliser les inputs numériques vides (phase capture = avant autres handlers)
    this._renderSignal?.abort();
    this._renderSignal = new AbortController();
    this.element.addEventListener("change", (ev) => {
      if (ev.target.matches("input[type='number']")) {
        if (ev.target.value === "" || isNaN(Number(ev.target.value))) ev.target.value = "0";
      }
    }, { capture: true, signal: this._renderSignal.signal });

    // ── Sauvegarde automatique des champs nommés (acteur) ─────────────────
    const _actorForm = this.element.querySelector("form");
    if (_actorForm) {
      _actorForm.addEventListener("change", async (ev) => {
        const el = ev.target;
        if (!el.name) return;
        if (el.classList.contains("inline-edit")) return;
        if (el.classList.contains("arme-equipe")) return;
        if (el.classList.contains("armure-portee")) return;
        const value = el.type === "checkbox" ? el.checked
                    : el.type === "number"   ? Number(el.value)
                    : el.value;
        await this.actor.update(foundry.utils.expandObject({ [el.name]: value }));
      }, { signal: this._renderSignal.signal });
    }

    // Gestion des onglets
    const html = $(this.element);
    // Réinitialiser tous les handlers .agone pour éviter l'accumulation sur le frame persistant
    html.off(".agone");
    const activeTab = this._currentTab ?? "attributs";
    html.find(".sheet-tabs .item[data-tab]").each((_, el) => {
      el.classList.toggle("active", el.dataset.tab === activeTab);
    });
    html.find(".tab[data-tab]").each((_, el) => {
      el.classList.toggle("active", el.dataset.tab === activeTab);
    });
    html.on("click.agone", ".sheet-tabs .item[data-tab]", (e) => {
      const tab = e.currentTarget.dataset.tab;
      if (!tab) return;
      this._currentTab = tab;
      html.find(".sheet-tabs .item").removeClass("active");
      e.currentTarget.classList.add("active");
      html.find(".tab").removeClass("active");
      html.find(`.tab[data-tab="${tab}"]`).addClass("active");
    });

    if (!this.isEditable) return;
    html.on("click.agone", ".item-create", async (e) => {
      e.preventDefault();
      const type = e.currentTarget.dataset.type;
      const nameKey = type === "arme" ? "AGONE.NouvelleArme" : "AGONE.NouvelPouvoir";
      await Item.create({ name: game.i18n.localize(nameKey), type }, { parent: this.actor });
    });
    html.on("click.agone", ".item-edit", (e) => {
      e.preventDefault();
      const li   = e.currentTarget.closest("[data-item-id]");
      const item = this.actor.items.get(li.dataset.itemId);
      if (item) this.renderChild(item.sheet);
    });
    html.on("click.agone", ".item-delete", async (e) => {
      e.preventDefault();
      const li   = e.currentTarget.closest("[data-item-id]");
      const item = this.actor.items.get(li.dataset.itemId);
      if (item && await confirmChildDialog(this, { title: game.i18n.localize("AGONE.Supprimer"), content: `<p>${item.name}</p>` })) {
        await item.delete();
      }
    });
    html.on("change.agone", ".inline-edit", async (e) => {
      const el = e.currentTarget;
      const item = this.actor.items.get(el.dataset.itemId);
      if (item && el.dataset.field) {
        const val = el.type === "checkbox" ? el.checked : (isNaN(el.value) ? el.value : Number(el.value));
        await item.update({ [el.dataset.field]: val });
      }
    });
    html.on("click.agone", "[data-action='rollInitiative']", async (e) => {
      e.preventDefault();
      const armeId = e.currentTarget.dataset.itemId ??
                     e.currentTarget.closest("[data-item-id]")?.dataset.itemId ?? null;
      await this.actor.rollInitiative(armeId);
    });
    html.on("click.agone", "[data-action='rollAttaque']", async (e) => {
      e.preventDefault();
      const armeId = e.currentTarget.closest("[data-item-id]")?.dataset.itemId;
      if (armeId) await this.actor.rollAttaque(armeId);
    });
    html.on("click.agone", "[data-action='rollParade']", async (e) => {
      e.preventDefault();
      const armeId = e.currentTarget.closest("[data-item-id]")?.dataset.itemId;
      if (armeId) await this.actor.rollParade(armeId);
    });
    html.on("click.agone", "[data-action='rollItemChat']", async (e) => {
      e.preventDefault();
      const armeId = e.currentTarget.dataset.itemId;
      if (armeId) await this.actor.items.get(armeId)?.toChat();
    });
    html.on("change.agone", ".arme-equipe", async (e) => {
      const itemId = e.currentTarget.dataset.itemId;
      await this.actor.items.get(itemId)?.update({ "system.equipe": e.currentTarget.checked });
    });
    html.on("click.agone", ".compendium-browse", async (e) => {
      e.preventDefault();
      const packId = e.currentTarget.dataset.pack ?? "";
      if (packId === "agone.armes") {
        const { ArmesBrowser } = await import("../apps/armes-browser.mjs");
        if (!this._armesBrowser) this._armesBrowser = new ArmesBrowser(this.actor);
        this._armesBrowser.render(true);
      } else if (packId === "agone.competences") {
        const { CompetencesBrowser } = await import("../apps/competences-browser.mjs");
        if (!this._competencesBrowser) this._competencesBrowser = new CompetencesBrowser(this.actor);
        this._competencesBrowser.render(true);
      }
    });
    html.on("click.agone", "[data-action='rollCompetence']", async (e) => {
      e.preventDefault();
      const id = e.currentTarget.closest("[data-item-id]")?.dataset.itemId;
      if (id) await this.actor.rollCompetence(id);
    });
    html.on("input.agone", ".comp-search-input", (ev) => {
      const q = ev.currentTarget.value.trim().toLowerCase();
      const clearBtn = html.find(".comp-search-clear")[0];
      if (clearBtn) clearBtn.style.display = q ? "" : "none";
      html.find(".comp-group").each((_, g) => {
        let any = false;
        g.querySelectorAll(".comp-card.item-row").forEach(c => {
          const n = (c.querySelector(".comp-card-name")?.textContent ?? "").trim().toLowerCase();
          const v = !q || n.includes(q); c.style.display = v ? "" : "none";
          if (v) any = true;
        });
        g.style.display = (!q || any) ? "" : "none";
      });
      const na = html.find(".comps-na-section")[0];
      if (na) na.style.display = "none";
    });
    html.on("click.agone", ".comp-search-clear", () => {
      html.find(".comp-search-input").val("").trigger("input");
    });
  }
}

/**
 * Feuille de PNJ — API ApplicationV2 / ActorSheetV2
 */
export class PnjSheet extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["agone", "sheet", "actor", "pnj"],
    position: { width: 750, height: 700 },
    window: { resizable: true },
    form: { submitOnChange: true },
  };

  static PARTS = {
    form: {
      template: "systems/agone/templates/actors/pnj-sheet.hbs",
      scrollable: [".sheet-body"],
    },
  };

  async _prepareContext(options) {
    const context = {};
    const system  = this.actor.system;
    context.system  = system;
    context.actor   = this.actor;
    context.isOwner = this.actor.isOwner;
    context.isGM    = game.user.isGM;
    context.armes   = this.actor.items.filter(i => i.type === "arme");
    context.armures = this.actor.items.filter(i => i.type === "armure");
    context.pdvPercent = system.pdv?.max > 0
      ? Math.round(Math.min(100, (system.pdv.valeur / system.pdv.max) * 100))
      : 0;
    // Compétences
    const _pnjComps = this.actor.items.filter(i => i.type === "competence")
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));
    context.competences = _pnjComps;
    const _pnjByScore = {};
    for (const c of _pnjComps) {
      const s = c.system.score ?? 0;
      if (!_pnjByScore[s]) _pnjByScore[s] = [];
      _pnjByScore[s].push(c);
    }
    context.competencesGroups = Object.entries(_pnjByScore)
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([score, comps]) => ({ label: `Niveau ${score}`, className: `score-${score}`, comps }));
    context.competencesNonAcquises = [];
    context.triCompsEstFamille = false;
    context.showLevelUp = false;
    context.showLevelUpComp = false;
    context.showLevelUpAspect = false;
    // Sorts (pour l'onglet Magie)
    const _pnjSorts = this.actor.items.filter(i => i.type === "sort")
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));
    context.sorts = _pnjSorts;
    const _pnjBySeuil = {};
    for (const s of _pnjSorts) {
      const k = s.system.seuil ?? 0;
      if (!_pnjBySeuil[k]) _pnjBySeuil[k] = [];
      _pnjBySeuil[k].push(s);
    }
    context.sortsBySeuil = Object.entries(_pnjBySeuil)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([seuil, sorts]) => ({ seuil: Number(seuil), sorts }));

    // ── Magie : artsMagiquesByDomaine ────────────────────────────────────────
    const DOMAINES_ARTS_STD_PNJ = [
      { nom: "Accord",  compLiee: "Musique"   },
      { nom: "Décorum", compLiee: "Peinture"  },
      { nom: "Geste",   compLiee: "Poésie"    },
      { nom: "Cyse",    compLiee: "Sculpture" },
    ];
    const domainesCustomPnj = game.settings.get("agone", "domainesArtsCustom") ?? [];
    const TOUS_DOMAINES_PNJ = [
      ...DOMAINES_ARTS_STD_PNJ,
      ...domainesCustomPnj.map(d => ({ nom: d.nom, compLiee: d.compLiee ?? "" })),
    ];
    context.artsMagiquesByDomaine = TOUS_DOMAINES_PNJ.map(({ nom: domaine, compLiee: nomCompLiee }) => {
      const comp          = _pnjComps.find(c => c.name === "Arts Magiques" && c.system.domaine === domaine);
      const score         = comp ? (comp.system.score ?? 0) : 0;
      const specialite    = comp?.system.specialite ?? "";
      const compLiee      = _pnjComps.find(c => c.name === nomCompLiee);
      const scoreCompLiee = compLiee ? (compLiee.system.score ?? 0) : 0;
      const scoreEffectif = comp ? Math.min(score, scoreCompLiee) : 0;
      // PNJ : system.art est un nombre (dérivé), system.creativite est un nombre simple
      const potentiel     = comp ? (system.art ?? 0) + scoreEffectif + (system.bonusAme ?? 0) : null;
      const impro         = comp ? (system.creativite ?? 0) + scoreEffectif + (system.bonusAme ?? 0) : null;
      return {
        domaine, comp, potentiel, impro, specialite, nomCompLiee, compLiee, scoreCompLiee,
        scoreArtsMag: score, scoreEffectif,
        artVal:      system.art ?? 0,
        creVal:      system.creativite ?? 0,
        bonusAmeVal: system.bonusAme ?? 0,
      };
    });

    // ── Sorts : groupes et types pour le partial magie ───────────────────────
    const TYPE_LABELS_MAGIE_PNJ = {
      jorniste:      game.i18n.localize("AGONE.Jorniste"),
      obscurantiste: game.i18n.localize("AGONE.Obscurantiste"),
      eclipsiste:    game.i18n.localize("AGONE.Eclipsiste"),
      accord:        game.i18n.localize("AGONE.Accord"),
      cyse:          game.i18n.localize("AGONE.Cyse"),
      geste:         game.i18n.localize("AGONE.Geste"),
      decorum:       game.i18n.localize("AGONE.Decorum"),
    };
    context.sortTypes = [...new Set(_pnjSorts.map(s => s.system.typeMagie).filter(Boolean))]
      .sort()
      .map(t => ({ value: t, label: TYPE_LABELS_MAGIE_PNJ[t] ?? t }));
    const _triSortsPnj = this.actor.getFlag("agone", "triSorts") ?? "type";
    context.triSortsEstType = _triSortsPnj === "type";
    if (context.triSortsEstType) {
      const TYPE_ORDER_PNJ = ["jorniste", "obscurantiste", "eclipsiste", "accord", "cyse", "decorum", "geste"];
      const _byType = {};
      for (const s of _pnjSorts) {
        const type = s.system.typeMagie || "Autre";
        if (!_byType[type]) _byType[type] = [];
        _byType[type].push(s);
      }
      context.sortsGroups = [
        ...TYPE_ORDER_PNJ.filter(t => _byType[t]).map(t => ({ label: TYPE_LABELS_MAGIE_PNJ[t] ?? t, sorts: _byType[t] })),
        ...Object.keys(_byType).filter(t => !TYPE_ORDER_PNJ.includes(t)).map(t => ({ label: t, sorts: _byType[t] })),
      ];
    } else {
      context.sortsGroups = context.sortsBySeuil.map(g => ({
        label: `${game.i18n.localize("AGONE.Seuil")} ${g.seuil}`, sorts: g.sorts,
      }));
    }
    context.danseurs = [];

    context.descriptionHTML = await TextEditor.enrichHTML(
      system.description ?? "", { async: true, secrets: this.actor.isOwner }
    );
    return context;
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);

    // Normaliser les inputs numériques vides (phase capture = avant autres handlers)
    this._renderSignal?.abort();
    this._renderSignal = new AbortController();
    this.element.addEventListener("change", (ev) => {
      if (ev.target.matches("input[type='number']")) {
        if (ev.target.value === "" || isNaN(Number(ev.target.value))) ev.target.value = "0";
      }
    }, { capture: true, signal: this._renderSignal.signal });

    // ── Sauvegarde automatique des champs nommés (acteur) ─────────────────────
    const _actorForm = this.element.querySelector("form");
    if (_actorForm) {
      _actorForm.addEventListener("change", async (ev) => {
        const el = ev.target;
        if (!el.name) return;
        if (el.classList.contains("inline-edit")) return;
        if (el.classList.contains("arme-equipe")) return;
        if (el.classList.contains("armure-portee")) return;
        const value = el.type === "checkbox" ? el.checked
                    : el.type === "number"   ? Number(el.value)
                    : el.value;
        await this.actor.update(foundry.utils.expandObject({ [el.name]: value }));
      }, { signal: this._renderSignal.signal });
    }

    // Gestion des onglets
    const html = $(this.element);
    // Réinitialiser tous les handlers .agone pour éviter l'accumulation sur le frame persistant
    html.off(".agone");
    const activeTab = this._currentTab ?? "attributs";
    html.find(".sheet-tabs .item[data-tab]").each((_, el) => {
      el.classList.toggle("active", el.dataset.tab === activeTab);
    });
    html.find(".tab[data-tab]").each((_, el) => {
      el.classList.toggle("active", el.dataset.tab === activeTab);
    });
    html.on("click.agone", ".sheet-tabs .item[data-tab]", (e) => {
      const tab = e.currentTarget.dataset.tab;
      if (!tab) return;
      this._currentTab = tab;
      html.find(".sheet-tabs .item").removeClass("active");
      e.currentTarget.classList.add("active");
      html.find(".tab").removeClass("active");
      html.find(`.tab[data-tab="${tab}"]`).addClass("active");
    });

    if (!this.isEditable) return;
    html.on("click.agone", ".item-create", async (e) => {
      e.preventDefault();
      const type = e.currentTarget.dataset.type;
      const name = game.i18n.localize(`AGONE.Nouvel${type.charAt(0).toUpperCase() + type.slice(1)}`);
      await Item.create({ name, type }, { parent: this.actor });
    });
    html.on("click.agone", ".item-edit", (e) => {
      e.preventDefault();
      const li   = e.currentTarget.closest("[data-item-id]");
      const item = this.actor.items.get(li.dataset.itemId);
      if (item) this.renderChild(item.sheet);
    });
    html.on("click.agone", ".item-delete", async (e) => {
      e.preventDefault();
      const li   = e.currentTarget.closest("[data-item-id]");
      const item = this.actor.items.get(li.dataset.itemId);
      if (item && await confirmChildDialog(this, { title: game.i18n.localize("AGONE.Supprimer"), content: `<p>${item.name}</p>` })) {
        await item.delete();
      }
    });
    html.on("change.agone", ".inline-edit", async (e) => {
      const el = e.currentTarget;
      const item = this.actor.items.get(el.dataset.itemId);
      if (item && el.dataset.field) {
        const val = el.type === "checkbox" ? el.checked : (isNaN(el.value) ? el.value : Number(el.value));
        await item.update({ [el.dataset.field]: val });
      }
    });
    html.on("click.agone", "[data-action='rollInitiative']", async (e) => {
      e.preventDefault();
      const armeId = e.currentTarget.dataset.itemId ??
                     e.currentTarget.closest("[data-item-id]")?.dataset.itemId ?? null;
      await this.actor.rollInitiative(armeId);
    });
    html.on("click.agone", "[data-action='rollEsquive']", async (e) => {
      e.preventDefault();
      await this.actor.rollEsquive();
    });
    html.on("click.agone", "[data-action='rollDefenseNaturelle']", async (e) => {
      e.preventDefault();
      await this.actor.rollDefenseNaturelle();
    });
    html.on("click.agone", "[data-action='rollAttaque']", async (e) => {
      e.preventDefault();
      const armeId = e.currentTarget.closest("[data-item-id]")?.dataset.itemId;
      if (armeId) await this.actor.rollAttaque(armeId);
    });
    html.on("click.agone", "[data-action='rollParade']", async (e) => {
      e.preventDefault();
      const armeId = e.currentTarget.closest("[data-item-id]")?.dataset.itemId;
      if (armeId) await this.actor.rollParade(armeId);
    });
    html.on("click.agone", "[data-action='rollItemChat']", async (e) => {
      e.preventDefault();
      const armeId = e.currentTarget.dataset.itemId;
      if (armeId) await this.actor.items.get(armeId)?.toChat();
    });
    html.on("change.agone", ".arme-equipe", async (e) => {
      const itemId = e.currentTarget.dataset.itemId;
      await this.actor.items.get(itemId)?.update({ "system.equipe": e.currentTarget.checked });
    });
    html.on("change.agone", ".armure-portee", async (e) => {
      const itemId = e.currentTarget.dataset.itemId;
      const portee = e.currentTarget.checked;
      const batch = this.actor.items
        .filter(i => i.type === "armure")
        .map(i => ({ _id: i.id, "system.portee": i.id === itemId ? portee : false }));
      await this.actor.updateEmbeddedDocuments("Item", batch);
      const item = this.actor.items.get(itemId);
      if (portee && item) {
        await this.actor.update({
          "system.armure.protection": item.system.protection,
          "system.armure.malusAgi":   item.system.malusAgi,
        });
      } else if (!portee) {
        await this.actor.update({
          "system.armure.protection": 0,
          "system.armure.malusAgi":   0,
        });
      }
    });
    html.on("click.agone", ".compendium-browse", async (e) => {
      e.preventDefault();
      const packId = e.currentTarget.dataset.pack ?? "";
      if (packId === "agone.armes") {
        const { ArmesBrowser } = await import("../apps/armes-browser.mjs");
        if (!this._armesBrowser) this._armesBrowser = new ArmesBrowser(this.actor);
        this._armesBrowser.render(true);
      } else if (packId === "agone.armures") {
        const { ArmuresBrowser } = await import("../apps/armures-browser.mjs");
        if (!this._armuresBrowser) this._armuresBrowser = new ArmuresBrowser(this.actor);
        this._armuresBrowser.render(true);
      } else if (packId === "agone.competences") {
        const { CompetencesBrowser } = await import("../apps/competences-browser.mjs");
        if (!this._competencesBrowser) this._competencesBrowser = new CompetencesBrowser(this.actor);
        this._competencesBrowser.render(true);
      } else if (packId === "agone.sorts") {
        const { SortsBrowser } = await import("../apps/sorts-browser.mjs");
        if (!this._sortsBrowser) this._sortsBrowser = new SortsBrowser(this.actor);
        this._sortsBrowser.render(true);
      }
    });
    html.on("click.agone", "[data-action='rollCompetence']", async (e) => {
      e.preventDefault();
      const id = e.currentTarget.closest("[data-item-id]")?.dataset.itemId;
      if (id) await this.actor.rollCompetence(id);
    });
    html.on("input.agone", ".comp-search-input", (ev) => {
      const q = ev.currentTarget.value.trim().toLowerCase();
      const clearBtn = html.find(".comp-search-clear")[0];
      if (clearBtn) clearBtn.style.display = q ? "" : "none";
      html.find(".comp-group").each((_, g) => {
        let any = false;
        g.querySelectorAll(".comp-card.item-row").forEach(c => {
          const n = (c.querySelector(".comp-card-name")?.textContent ?? "").trim().toLowerCase();
          const v = !q || n.includes(q); c.style.display = v ? "" : "none";
          if (v) any = true;
        });
        g.style.display = (!q || any) ? "" : "none";
      });
      const na = html.find(".comps-na-section")[0];
      if (na) na.style.display = "none";
    });
    html.on("click.agone", ".comp-search-clear", () => {
      html.find(".comp-search-input").val("").trigger("input");
    });

    // ── Magie ────────────────────────────────────────────────────────────────
    html.on("click.agone", "[data-action='rollSort']", async (e) => {
      e.preventDefault();
      const id = e.currentTarget.closest("[data-item-id]")?.dataset.itemId ?? e.currentTarget.dataset.itemId;
      if (id) await this.actor.rollSort(id);
    });
    html.on("click.agone", "[data-action='rollSortImpro']", async (e) => {
      e.preventDefault();
      const id = e.currentTarget.closest("[data-item-id]")?.dataset.itemId ?? e.currentTarget.dataset.itemId;
      if (id) await this.actor.rollSort(id, { impro: true });
    });
    html.on("click.agone", "[data-action='rollArtDomaine']", async (e) => {
      e.preventDefault();
      const btn        = e.currentTarget;
      const domaine    = btn.dataset.domaine ?? "";
      const apt        = parseInt(btn.dataset.apt)        || 0;
      const specialite = btn.dataset.specialite ?? "";
      const artVal     = parseInt(btn.dataset.art)        || 0;
      const scoreArts  = parseInt(btn.dataset.scoreArts)  || 0;
      const scoreComp  = parseInt(btn.dataset.scoreComp)  || 0;
      const nomComp    = btn.dataset.nomComp ?? "";
      const scoreEff   = parseInt(btn.dataset.scoreEff)   || 0;
      const bonusAme   = parseInt(btn.dataset.bonusAme)   || 0;
      const label      = game.i18n.format("AGONE.PotentielArtLabel", { domaine });
      const modif      = await this.actor._dialogModificateur(label, { specialite });
      if (modif === null) return;
      const bonusSpe   = this.actor._lastBonusSpe ?? 0;
      const total      = apt + bonusSpe;
      const roll = new Roll("1d10x10 + @total + @modif", { total, modif });
      await roll.evaluate();
      const formule = `ART(${artVal}) + min(Arts:${scoreArts}, ${nomComp}:${scoreComp})→${scoreEff} + BonusÂme(${bonusAme})${bonusSpe ? ` + Spé(+${bonusSpe})` : ""}`;
      await this.actor._sendRollToChat(roll, label, {
        aptitude: `${formule} : ${apt}${bonusSpe ? ` +${bonusSpe}` : ""}`,
        modif: `Bonus/Malus : ${modif}`,
      });
    });
    html.on("click.agone", "[data-action='rollImpArtDomaine']", async (e) => {
      e.preventDefault();
      const btn        = e.currentTarget;
      const domaine    = btn.dataset.domaine ?? "";
      const apt        = parseInt(btn.dataset.apt)        || 0;
      const specialite = btn.dataset.specialite ?? "";
      const creVal     = parseInt(btn.dataset.cre)        || 0;
      const scoreArts  = parseInt(btn.dataset.scoreArts)  || 0;
      const scoreComp  = parseInt(btn.dataset.scoreComp)  || 0;
      const nomComp    = btn.dataset.nomComp ?? "";
      const scoreEff   = parseInt(btn.dataset.scoreEff)   || 0;
      const bonusAme   = parseInt(btn.dataset.bonusAme)   || 0;
      const label      = game.i18n.format("AGONE.ImproArtLabel", { domaine });
      const modif      = await this.actor._dialogModificateur(label, { specialite });
      if (modif === null) return;
      const bonusSpe   = this.actor._lastBonusSpe ?? 0;
      const total      = apt + bonusSpe;
      const roll = new Roll("1d10x10 + @total + @modif", { total, modif });
      await roll.evaluate();
      const formule = `CRÉ(${creVal}) + min(Arts:${scoreArts}, ${nomComp}:${scoreComp})→${scoreEff} + BonusÂme(${bonusAme})${bonusSpe ? ` + Spé(+${bonusSpe})` : ""}`;
      await this.actor._sendRollToChat(roll, label, {
        aptitude: `${formule} : ${apt}${bonusSpe ? ` +${bonusSpe}` : ""}`,
        modif: `Bonus/Malus : ${modif}`,
      });
    });
    html.on("click.agone", "[data-action='toggleSortDesc']", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const card  = e.currentTarget.closest(".sort-card");
      const panel = card?.querySelector(".sort-desc-panel");
      if (!panel) return;
      const isOpen = panel.style.display !== "none";
      panel.style.display = isOpen ? "none" : "";
      e.currentTarget.querySelector("i")?.classList.toggle("fa-chevron-right", isOpen);
      e.currentTarget.querySelector("i")?.classList.toggle("fa-chevron-down", !isOpen);
    });
    html.on("input.agone", ".smf-search", (ev) => {
      const q = ev.currentTarget.value.toLowerCase().trim();
      const sortsBlock = ev.currentTarget.closest(".sorts-block");
      if (!sortsBlock) return;
      sortsBlock.querySelectorAll(".sort-group").forEach(group => {
        let any = false;
        group.querySelectorAll(".sort-card").forEach(card => {
          const name = (card.querySelector(".sort-card-name")?.textContent ?? "").toLowerCase().trim();
          const show = !q || name.includes(q);
          card.style.display = show ? "" : "none";
          if (show) any = true;
        });
        group.style.display = (!q || any) ? "" : "none";
      });
    });
    html.on("change.agone", ".smf-check", (ev) => {
      const checks      = ev.currentTarget.closest(".smf-checks")?.querySelectorAll(".smf-check");
      const activeTypes = new Set([...(checks ?? [])].filter(c => c.checked).map(c => c.value));
      const sortsBlock  = ev.currentTarget.closest(".sorts-block");
      if (!sortsBlock) return;
      sortsBlock.querySelectorAll(".sort-group").forEach(group => {
        let any = false;
        group.querySelectorAll(".sort-card").forEach(card => {
          const cardType = (card.dataset.typeMagie ?? "");
          const show = activeTypes.size === 0 || activeTypes.has(cardType);
          card.style.display = show ? "" : "none";
          if (show) any = true;
        });
        group.style.display = (activeTypes.size === 0 || any) ? "" : "none";
      });
    });
    html.on("click.agone", "[data-action='triSortsToggle']", async (e) => {
      e.preventDefault();
      const cur = this.actor.getFlag("agone", "triSorts") ?? "type";
      await this.actor.setFlag("agone", "triSorts", cur === "type" ? "seuil" : "type");
    });
  }
}
