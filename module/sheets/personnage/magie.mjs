import { artsMagiquesParDomaine, sortsContext, danseurMemoire } from "../actor-context.mjs";
import { DANSEUR_TABLE } from "../../data/item-data.mjs";

/**
 * Onglet Magie : sorts, danseurs (Emprise), Arts Magiques par domaine, glisser-déposer des sorts.
 */
export const MagieMixin = Base => class extends Base {

  /** Données de contexte de l'onglet. */
  _prepareMagieContext(context) {
    const actor  = this.actor;
    const system = actor.system;

    const danseurItems = actor.items.filter(i => i.type === "danseur")
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));
    context.danseurs = danseurItems.map(d => {
      const assignedSorts = actor.items
        .filter(s => s.type === "sort" && s.system.danseurNom === d.name)
        .map(s => ({ id: s.id, name: s.name, typeMagie: s.system.typeMagie, seuil: s.system.seuil, portee: s.system.portee, duree: s.system.duree, danse: s.system.danse, description: s.system.description ?? "" }));
      const autresSorts = actor.items
        .filter(s => s.type === "sort" && s.system.danseurNom !== d.name)
        .map(s => ({ id: s.id, name: s.name, seuil: s.system.seuil ?? 0, danseurNom: s.system.danseurNom || "" }));
      const sd = d.system;

      // Table officielle Agône (colonnes : niv 1–7)
      const TBL = DANSEUR_TABLE;

      // Données en mode création : +/- par stat, coût = niveau
      const ptsBudget   = sd.ptsCreationMax ?? 17;
      const ptsDepense  = sd.ptsCreationDepense ?? 4;
      const ptsRestants = sd.ptsCreationRestants ?? (ptsBudget - ptsDepense);
      const creaNiveaux = [
        { stat: "memoire",   nivField: "memoireNiveau",   label: game.i18n.localize("AGONE.Memoire"),   niv: sd.memoireNiveau   ?? 1, val: sd.memoireMax,   prefix: "" },
        { stat: "emprise",   nivField: "empriseNiveau",   label: game.i18n.localize("AGONE.Emprise"),   niv: sd.empriseNiveau   ?? 1, val: sd.bonusEmprise, prefix: "+" },
        { stat: "empathie",  nivField: "empathieNiveau",  label: game.i18n.localize("AGONE.Empathie"),  niv: sd.empathieNiveau  ?? 1, val: sd.empathie,     prefix: "" },
        { stat: "endurance", nivField: "enduranceNiveau", label: game.i18n.localize("AGONE.Endurance"), niv: sd.enduranceNiveau ?? 1, val: sd.enduranceMax, prefix: "" },
      ].map(x => ({
        ...x,
        cout:    x.niv,                    // coût actuel = niveau
        canDown: x.niv > 1,
        canUp:   x.niv < 7 && ptsRestants >= (x.niv + 1 - x.niv),  // il faut 1 pt de plus
        nextVal: x.niv < 7 ? TBL[x.stat][x.niv] : null,
        nextNiv: x.niv < 7 ? x.niv + 1 : null,
      }));

      // Données de montée de niveau (mode XP) : coût = (niveauSuivant) × 3
      const MULT_DANSEUR = 3;
      const levelUpStats = [
        { stat: "memoire",   nivField: "memoireNiveau",   expField: "memoireExp",   label: game.i18n.localize("AGONE.Memoire"),   niv: sd.memoireNiveau   ?? 1, localExp: sd.memoireExp   ?? 0 },
        { stat: "emprise",   nivField: "empriseNiveau",   expField: "empriseExp",   label: game.i18n.localize("AGONE.Emprise"),   niv: sd.empriseNiveau   ?? 1, localExp: sd.empriseExp   ?? 0 },
        { stat: "empathie",  nivField: "empathieNiveau",  expField: "empathieExp",  label: game.i18n.localize("AGONE.Empathie"),  niv: sd.empathieNiveau  ?? 1, localExp: sd.empathieExp  ?? 0 },
        { stat: "endurance", nivField: "enduranceNiveau", expField: "enduranceExp", label: game.i18n.localize("AGONE.Endurance"), niv: sd.enduranceNiveau ?? 1, localExp: sd.enduranceExp ?? 0 },
      ].map(x => ({
        ...x,
        cout:     (x.niv + 1) * MULT_DANSEUR,
        coutDown: x.niv * MULT_DANSEUR,
        canUp:    x.niv < 7,
        canDown:  x.niv > 1,
      }));

      const capaciteSeuil = sd.capaciteSeuil ?? (sd.memoireMax * 5);
      const memoire = danseurMemoire(
        { capaciteSeuil, enduranceActuelle: sd.enduranceActuelle, enduranceMax: sd.enduranceMax },
        assignedSorts, autresSorts
      );
      const sortsMemorisables = memoire.sortsMemorisables.map(s => ({
        id: s.id,
        label: s.danseurNom
          ? game.i18n.format("AGONE.Ui.SortMemorisableAutre", { sort: s.name, seuil: s.seuil, danseur: s.danseurNom })
          : game.i18n.format("AGONE.Ui.SortMemorisable", { sort: s.name, seuil: s.seuil }),
      }));

      return {
        id: d.id, name: d.name, img: d.img,
        system: d.system,
        assignedSorts,
        assignedCount: assignedSorts.length,
        memoireUtilisee: memoire.memoireUtilisee,
        isFull: memoire.isFull,
        memoirePct: memoire.memoirePct,
        endurancePct: memoire.endurancePct,
        enduranceVide: memoire.enduranceVide,
        sortsMemorisables,
        creaNiveaux,
        levelUpStats,
        ptsDepense, ptsRestants, ptsBudget,
        capaciteSeuil,
        potentielEmprise: (context.system.aptitudeEmprise ?? 0) + (sd.bonusEmprise ?? 0),
        potentielImpro: (context.system.creativite?.score ?? 0) + (sd.empathie ?? 0) + (context.system.bonusEsprit ?? 0),
      };
    });

    // Sorts : types présents (mini-filtre), groupes par seuil et selon le tri choisi
    Object.assign(context, sortsContext(actor, context.sorts));

    // Compétences Arts Magiques par domaine (Accord par instrument, Cyse, Décorum, Geste + domaines custom)
    context.artsMagiquesByDomaine = artsMagiquesParDomaine(system, context.competences, system.creativite?.score ?? 0);
  }

  /** Écouteurs délégués de l'onglet (voir PersonnageSheet#_onRender). */
  _bindMagieListeners(on, root) {
    // Sorts, Arts Magiques, mini-filtre et tri (communs avec la fiche PNJ)
    this._bindSortsListeners(on);

    // Emprise & danseurs
    on("click", "[data-action='rollEmprise']", this._onRollEmprise.bind(this));
    on("click", "[data-action='rollEmpriseAttr']", this._onRollEmpriseAttr.bind(this));
    on("click", "[data-action='rollImprovisation']", this._onRollImprovisation.bind(this));

    on("click", "[data-action='rollAptitudeMagie']", this._onRollAptitudeMagie.bind(this));

    // Drag & drop sorts → danseurs (mémorisation) + réordonnancement
    // Tracking mousedown pour détecter si le drag vient bien de la poignée
    on("mousedown", ".sort-card-drag-handle", () => { this._sortDragFromHandle = true; });
    on("mouseup", ".sort-card", () => { this._sortDragFromHandle = false; });
    root.querySelectorAll(".sort-card[draggable]").forEach(el => {
      el.addEventListener("dragstart", this._onDragSortStart.bind(this));
      el.addEventListener("dragend",   this._onDragSortEnd.bind(this));
    });
    root.querySelectorAll(".danseur-slots").forEach(el => {
      el.addEventListener("dragover",  this._onDragOverDanseur.bind(this));
      el.addEventListener("dragleave", this._onDragLeaveDanseur.bind(this));
      el.addEventListener("drop",      this._onDropSortOnDanseur.bind(this));
    });
    // Déposer sur la grille de cartes pour réordonner
    root.querySelectorAll(".sorts-cards-container").forEach(el => {
      el.addEventListener("dragover",  this._onDragOverSortReorder.bind(this));
      el.addEventListener("dragleave", this._onDragLeaveSortReorder.bind(this));
      el.addEventListener("drop",      this._onDropSortReorder.bind(this));
    });
    on("click", ".slot-remove", this._onRetireSortDanseur.bind(this));
    on("click", "[data-action='rollSortDanseur']", this._onRollSortDanseur.bind(this));
    on("change", ".danseur-memoriser", this._onMemoriserSortSelect.bind(this));

    // Jauges endurance : +/- et récupération complète
    on("click", "[data-action='danseurEndurance']", this._onDanseurEndurance.bind(this));
    on("click", "[data-action='danseurRecupererEndurance']", this._onDanseurRecupererEndurance.bind(this));

    // Drag & drop pour réordonner les sorts dans les slots danseurs
    this._setupDanseurSlotsDrag(root);

    // Montée de niveau danseur
    on("click", "[data-action='levelUpDanseur']", this._onLevelUpDanseur.bind(this));
    on("click", "[data-action='levelDownDanseur']", this._onLevelDownDanseur.bind(this));

    // Création danseur — +/- niveau par stat
    on("click", "[data-action='danseurNiveauUp']", ev   => this._onDanseurNiveau(ev, +1));
    on("click", "[data-action='danseurNiveauDown']", ev => this._onDanseurNiveau(ev, -1));
    on("click", "[data-action='danseurRollStatIndiv']", this._onDanseurRollStatIndiv.bind(this));

    // Valider / réactiver mode création danseur
    on("click", "[data-action='validerCreationDanseur']", this._onValiderCreationDanseur.bind(this));
    on("click", "[data-action='reactiverCreationDanseur']", this._onReactiverCreationDanseur.bind(this));

    // Édition inline des stats courantes du danseur
    on("change", ".danseur-inline-num", this._onDanseurStatEdit.bind(this));
  }

  // Emprise & Improvisation Danseur
  async _onRollEmprise(event) {
    event.preventDefault();
    await this.actor.rollEmprise(event.currentTarget.dataset.itemId);
  }

  async _onRollEmpriseAttr(event) {
    event.preventDefault();
    await this.actor.rollEmpriseAttr();
  }

  async _onRollImprovisation(event) {
    event.preventDefault();
    const itemId = event.currentTarget.dataset.itemId;
    await this.actor.rollImprovisationDanseur(itemId);
  }

  async _onRollAptitudeMagie(event) {
    event.preventDefault();
    await this.actor.rollAptitudeMagie();
  }

  // Drag & drop sorts → danseurs
  _onDragSortStart(event) {
    // Drag uniquement si initié depuis la poignée (tracké via mousedown)
    if (!this._sortDragFromHandle) {
      event.preventDefault();
      return;
    }
    this._sortDragFromHandle = false;
    const itemId = event.currentTarget.dataset.itemId;
    if (!itemId) return;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", JSON.stringify({ type: "sort-assign", itemId }));
    event.currentTarget.classList.add("dragging");
  }

  _onDragSortEnd(event) {
    event.currentTarget.classList.remove("dragging");
  }

  _onDragOverDanseur(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    event.currentTarget.classList.add("drag-over");
  }

  _onDragLeaveDanseur(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      event.currentTarget.classList.remove("drag-over");
    }
  }

  async _onDropSortOnDanseur(event) {
    event.preventDefault();
    const zone = event.currentTarget;
    zone.classList.remove("drag-over");
    let data;
    try { data = JSON.parse(event.dataTransfer.getData("text/plain")); } catch { return; }
    if (data?.type !== "sort-assign") return;

    const danseurId = zone.dataset.danseurId;
    const danseur    = this.actor.items.get(danseurId);
    const sort       = this.actor.items.get(data.itemId);
    if (!danseur || !sort) return;
    await this._memoriserSort(danseur, sort);
  }

  /** Mémorise un sort chez un danseur, en vérifiant que sa capacité restante le permet. */
  async _memoriserSort(danseur, sort) {
    const capaciteSeuil  = danseur.system.capaciteSeuil ?? (danseur.system.memoireMax * 5);
    const assignedSorts  = this.actor.items.filter(i =>
      i.type === "sort" && i.system.danseurNom === danseur.name
    );
    const memoireUtilisee = assignedSorts.reduce((sum, i) => sum + (i.system.seuil ?? 0), 0);
    const sortSeuil       = sort.system.seuil ?? 0;

    // Bloquer seulement si c'est un nouveau sort ET qu'il ne rentre plus
    if (sort.system.danseurNom !== danseur.name && capaciteSeuil > 0 && memoireUtilisee + sortSeuil > capaciteSeuil) {
      ui.notifications.warn(
        game.i18n.format("AGONE.DanseurMemoirePleine", { nom: danseur.name, max: capaciteSeuil })
      );
      return false;
    }
    await sort.update({ "system.danseurNom": danseur.name });
    return true;
  }

  /** Mémorisation d'un sort via le <select> (alternative au glisser-déposer). */
  async _onMemoriserSortSelect(event) {
    const select  = event.currentTarget;
    const sortId  = select.value;
    select.value  = "";
    if (!sortId) return;
    const danseur = this.actor.items.get(select.dataset.danseurId);
    const sort    = this.actor.items.get(sortId);
    if (!danseur || !sort) return;
    await this._memoriserSort(danseur, sort);
  }

  // Endurance courante du danseur : +/-, remise à niveau maximal
  async _onDanseurEndurance(event) {
    event.preventDefault();
    const btn     = event.currentTarget;
    const danseur = this.actor.items.get(btn.dataset.itemId);
    if (!danseur) return;
    const delta = Number(btn.dataset.delta) || 0;
    const next  = Math.max(0, Math.min(danseur.system.enduranceMax, (danseur.system.enduranceActuelle ?? 0) + delta));
    await danseur.update({ "system.enduranceActuelle": next });
  }

  async _onDanseurRecupererEndurance(event) {
    event.preventDefault();
    const danseur = this.actor.items.get(event.currentTarget.dataset.itemId);
    if (!danseur) return;
    await danseur.update({ "system.enduranceActuelle": danseur.system.enduranceMax });
  }

  // Réordonnancement des sorts
  _getTargetSortCard(event, container) {
    for (const card of container.querySelectorAll(".sort-card")) {
      const rect = card.getBoundingClientRect();
      if (event.clientY >= rect.top && event.clientY <= rect.bottom) return card;
    }
    return null;
  }

  _clearSortDropIndicators(container) {
    container.querySelectorAll(".sort-drop-above, .sort-drop-below").forEach(el => {
      el.classList.remove("sort-drop-above", "sort-drop-below");
    });
  }

  _onDragOverSortReorder(event) {
    let data;
    try { data = JSON.parse(event.dataTransfer.getData("text/plain")); } catch { /* ok */ }
    if (data?.type !== "sort-assign" && !event.dataTransfer.types.includes("text/plain")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const container  = event.currentTarget;
    const targetCard = this._getTargetSortCard(event, container);
    this._clearSortDropIndicators(container);
    if (!targetCard) return;
    const rect   = targetCard.getBoundingClientRect();
    const before = event.clientY < rect.top + rect.height / 2;
    targetCard.classList.add(before ? "sort-drop-above" : "sort-drop-below");
  }

  _onDragLeaveSortReorder(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      this._clearSortDropIndicators(event.currentTarget);
    }
  }

  async _onDropSortReorder(event) {
    const container = event.currentTarget;
    this._clearSortDropIndicators(container);
    // Le drop→danseur est prioritaire ; ne pas intercepter si la target est une zone danseur
    if (event.target.closest(".danseur-slots")) return;
    event.preventDefault();
    let data;
    try { data = JSON.parse(event.dataTransfer.getData("text/plain")); } catch { return; }
    if (data?.type !== "sort-assign") return;

    const draggedSort = this.actor.items.get(data.itemId);
    if (!draggedSort || draggedSort.type !== "sort") return;

    const targetCard = this._getTargetSortCard(event, container);
    if (!targetCard || targetCard.dataset.itemId === data.itemId) return;

    const targetSort = this.actor.items.get(targetCard.dataset.itemId);
    if (!targetSort) return;

    const rect       = targetCard.getBoundingClientRect();
    const sortBefore = event.clientY < rect.top + rect.height / 2;
    const siblings   = this.actor.items.filter(i => i.type === "sort" && i.id !== draggedSort.id);

    const sortHelper = foundry.utils.SortingHelpers ?? globalThis.SortingHelpers;
    const updates    = sortHelper.performIntegerSort(draggedSort, { target: targetSort, siblings, sortBefore });
    if (updates.length) {
      await this.actor.updateEmbeddedDocuments("Item",
        updates.map(u => ({ _id: u.target.id, sort: u.update.sort }))
      );
    }
  }

  async _onRetireSortDanseur(event) {
    event.preventDefault();
    event.stopPropagation();
    const sortId = event.currentTarget.dataset.sortId;
    const sort   = this.actor.items.get(sortId);
    if (sort) await sort.update({ "system.danseurNom": "" });
  }

  async _onRollSortDanseur(event) {
    event.preventDefault();
    event.stopPropagation();
    const { sortId, danseurId } = event.currentTarget.dataset;
    const sort = this.actor.items.get(sortId);
    if (!sort) return;
    const { seuil, description, typeMagie, portee, duree, danse } = sort.system;
    await this.actor.rollSortDanseur(danseurId, { name: sort.name, seuil, description, typeMagie, portee, duree, danse });
  }

  // Drag & drop réordonnancement dans les slots danseurs
  _setupDanseurSlotsDrag(root) {
    root.querySelectorAll(".danseur-slot-sort").forEach(el => {
      const sortId = el.dataset.sortId;
      if (!sortId) return;
      el.setAttribute("draggable", true);
      el.addEventListener("dragstart", evt => {
        evt.stopPropagation();
        evt.dataTransfer.effectAllowed = "move";
        evt.dataTransfer.setData("text/plain", JSON.stringify({ type: "slot-reorder", sortId }));
        el.classList.add("dragging");
      });
      el.addEventListener("dragend", () => el.classList.remove("dragging"));
    });
    root.querySelectorAll(".danseur-slots").forEach(container => {
      container.addEventListener("dragover", evt => {
        let data;
        try { data = JSON.parse(evt.dataTransfer.getData("text/plain")); } catch { }
        if (data?.type !== "slot-reorder") return;
        evt.preventDefault();
        evt.dataTransfer.dropEffect = "move";
        const slots = [...container.querySelectorAll(".danseur-slot-sort")];
        container.querySelectorAll(".slot-drop-above, .slot-drop-below")
          .forEach(s => s.classList.remove("slot-drop-above", "slot-drop-below"));
        const target = slots.find(s => {
          const r = s.getBoundingClientRect();
          return evt.clientY >= r.top && evt.clientY <= r.bottom;
        });
        if (!target) return;
        const r = target.getBoundingClientRect();
        target.classList.add(evt.clientY < r.top + r.height / 2 ? "slot-drop-above" : "slot-drop-below");
      });
      container.addEventListener("dragleave", evt => {
        if (!container.contains(evt.relatedTarget)) {
          container.querySelectorAll(".slot-drop-above, .slot-drop-below")
            .forEach(s => s.classList.remove("slot-drop-above", "slot-drop-below"));
        }
      });
      container.addEventListener("drop", async evt => {
        container.querySelectorAll(".slot-drop-above, .slot-drop-below")
          .forEach(s => s.classList.remove("slot-drop-above", "slot-drop-below"));
        let data;
        try { data = JSON.parse(evt.dataTransfer.getData("text/plain")); } catch { return; }
        if (data?.type !== "slot-reorder") return;
        evt.preventDefault();
        evt.stopPropagation();
        const danseurId    = container.dataset.danseurId;
        const danseur      = this.actor.items.get(danseurId);
        const draggedSort  = this.actor.items.get(data.sortId);
        if (!danseur || !draggedSort) return;
        const slots = [...container.querySelectorAll(".danseur-slot-sort")];
        const targetSlot = slots.find(s => {
          const r = s.getBoundingClientRect();
          return evt.clientY >= r.top && evt.clientY <= r.bottom;
        });
        if (!targetSlot || targetSlot.dataset.sortId === data.sortId) return;
        const targetSort = this.actor.items.get(targetSlot.dataset.sortId);
        if (!targetSort) return;
        const r = targetSlot.getBoundingClientRect();
        const sortBefore = evt.clientY < r.top + r.height / 2;
        const siblings   = this.actor.items.filter(i =>
          i.type === "sort" && i.id !== draggedSort.id && i.system.danseurNom === danseur.name
        );
        const sortHelper = foundry.utils.SortingHelpers ?? globalThis.SortingHelpers;
        const updates    = sortHelper.performIntegerSort(draggedSort, { target: targetSort, siblings, sortBefore });
        if (updates.length) {
          await this.actor.updateEmbeddedDocuments("Item",
            updates.map(u => ({ _id: u.target.id, sort: u.update.sort }))
          );
        }
      });
    });
  }

  // Montée de niveau d'un Danseur (dépense XP personnage + réserve locale)
  async _onLevelUpDanseur(event) {
    event.preventDefault();
    const btn     = event.currentTarget;
    const itemId  = btn.dataset.itemId;
    const stat    = btn.dataset.stat;
    const cout    = Number(btn.dataset.cout);
    const label   = btn.dataset.label ?? stat;
    const danseur = this.actor.items.get(itemId);
    if (!danseur) return;

    const sd        = this.actor.system;
    const expField  = stat.replace("Niveau", "Exp");    // ex. "memoireNiveau" → "memoireExp"
    const localExp  = danseur.system[expField] ?? 0;    // réserve par stat
    const fromLocal = Math.min(localExp, cout);
    const fromGeneral = cout - fromLocal;

    // XP du personnage insuffisants
    if (fromGeneral > (sd.experience?.courante ?? 0)) {
      const totalDispo = localExp + (sd.experience?.courante ?? 0);
      // Aucun XP du tout → erreur directe
      if ((sd.experience?.courante ?? 0) === 0) {
        return ui.notifications.error(
          game.i18n.format("AGONE.PasAssezXP", { cout, actuel: totalDispo })
        );
      }
      // Propose de verser les XP disponibles en réserve de cette stat
      const aVerser    = sd.experience.courante;
      const confirmed  = await this._confirmChild({
        title:   game.i18n.localize("AGONE.XPInsuffisants"),
        content: `<p>${game.i18n.format("AGONE.PasAssezXPReserve", {
          cout,
          actuel:  totalDispo,
          reserve: aVerser
        })}</p>`
      });
      if (!confirmed) return;
      await Promise.all([
        danseur.update({ [`system.${expField}`]: localExp + aVerser }),
        this.actor.update({ "system.experience.courante": 0 }),
      ]);
      return;
    }

    const confirmed = await this._confirmChild({
      title:   game.i18n.localize("AGONE.MonterNiveauDanseur"),
      content: `<p>${game.i18n.format("AGONE.ConfirmerLevelUpDanseur", { nom: danseur.name, stat: label, cout })}</p>`
    });
    if (!confirmed) return;

    await Promise.all([
      danseur.update({
        [`system.${stat}`]:       (danseur.system[stat] ?? 0) + 1,
        ...(fromLocal > 0 ? { [`system.${expField}`]: localExp - fromLocal } : {}),
      }),
      this.actor.update({
        ...(fromGeneral > 0 ? { "system.experience.courante": (sd.experience?.courante ?? 0) - fromGeneral } : {}),
        "system.experience.totale": (sd.experience?.totale ?? 0) + cout,
      }),
    ]);
  }

  // Rétrogradation d'un Danseur (remboursement XP vers pool général)
  async _onLevelDownDanseur(event) {
    event.preventDefault();
    const btn      = event.currentTarget;
    const itemId   = btn.dataset.itemId;
    const stat     = btn.dataset.stat;
    const coutDown = Number(btn.dataset.coutDown);
    const danseur  = this.actor.items.get(itemId);
    if (!danseur) return;

    const nivActuel = danseur.system[stat] ?? 1;
    if (nivActuel <= 1) return;

    const label  = btn.dataset.label ?? stat;
    const sd     = this.actor.system;
    const confirmed = await this._confirmChild({
      title:   game.i18n.localize("AGONE.MonterNiveauDanseur"),
      content: `<p>${game.i18n.format("AGONE.ConfirmerLevelDownDanseur", { nom: danseur.name, stat: label, cout: coutDown })}</p>`
    });
    if (!confirmed) return;

    await Promise.all([
      danseur.update({ [`system.${stat}`]: nivActuel - 1 }),
      this.actor.update({
        "system.experience.courante": (sd.experience?.courante ?? 0) + coutDown,
        "system.experience.totale":   Math.max(0, (sd.experience?.totale ?? 0) - coutDown),
      }),
    ]);
  }

  // Danseur — jet 3d10 pour une stat en mode création
  // Danseur — jet 3d10 individuel pour une stat
  async _onDanseurRollStatIndiv(event) {
    event.preventDefault();
    const btn     = event.currentTarget;
    const itemId  = btn.dataset.itemId;
    const stat    = btn.dataset.stat;     // ex. "memoireNiveau"
    const statKey = btn.dataset.statKey; // ex. "memoire"
    const label   = btn.dataset.label;   // ex. "Mémoire"
    const prefix  = btn.dataset.prefix ?? "";
    const danseur = this.actor.items.get(itemId);
    if (!danseur) return;

    const SEUILS = [3, 4, 12, 17, 24, 28, 30];
    const TBL = DANSEUR_TABLE;

    const roll  = await new Roll("3d10").evaluate();
    const total = roll.total;
    let niveau  = 1;
    for (let i = 0; i < SEUILS.length; i++) {
      if (total >= SEUILS[i]) niveau = i + 1;
    }
    const valeur = TBL[statKey][niveau - 1];

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `<strong>${danseur.name}</strong> — ${label} (3d10) : <strong>${total}</strong> → Niv.\u00a0${niveau} (${prefix}${valeur})`
    });
    await danseur.update({ [`system.${stat}`]: niveau });
  }

  // Danseur — +/- niveau en mode création
  async _onDanseurNiveau(event, delta) {
    event.preventDefault();
    const btn     = event.currentTarget;
    const itemId  = btn.dataset.itemId;
    const stat    = btn.dataset.stat;   // ex. "memoireNiveau"
    const danseur = this.actor.items.get(itemId);
    if (!danseur) return;
    const current = danseur.system[stat] ?? 1;
    const next    = Math.max(1, Math.min(7, current + delta));
    if (next === current) return;
    // Vérifier le budget si montée (coût = delta en pts)
    if (delta > 0 && (danseur.system.ptsCreationRestants ?? 0) < 1) {
      return ui.notifications.warn(game.i18n.format("AGONE.PasAssezPtsCrea", { cout: 1, actuel: danseur.system.ptsCreationRestants ?? 0 }));
    }
    await danseur.update({ [`system.${stat}`]: next });
  }

  // Danseur — valider la création
  async _onValiderCreationDanseur(event) {
    event.preventDefault();
    const id      = event.currentTarget.dataset.itemId;
    const danseur = this.actor.items.get(id);
    if (!danseur) return;
    const sd = danseur.system;
    const confirmed = await this._confirmChild({
      title:   game.i18n.localize("AGONE.DanseurValiderCrea"),
      content: `<p>${game.i18n.format("AGONE.DanseurValiderCreaConfirm", { nom: danseur.name })}</p>`
    });
    if (!confirmed) return;
    // Initialise les valeurs courantes = max
    await danseur.update({
      "system.modeCreation":      false,
      "system.memoireActuelle":   sd.memoireMax,
      "system.enduranceActuelle": sd.enduranceMax,
    });
  }

  // Danseur — réactiver le mode création
  async _onReactiverCreationDanseur(event) {
    event.preventDefault();
    const id = event.currentTarget.dataset.itemId;
    const danseur = this.actor.items.get(id);
    if (!danseur) return;
    await danseur.update({ "system.modeCreation": true });
  }

  // Danseur — édition inline stat courante (memoireActuelle, enduranceActuelle, experience)
  async _onDanseurStatEdit(event) {
    event.preventDefault();
    const input   = event.currentTarget;
    const itemId  = input.dataset.itemId;
    const field   = input.dataset.field;
    const value   = Number(input.value);
    const danseur = this.actor.items.get(itemId);
    if (!danseur || !field) return;
    await danseur.update({ [`system.${field}`]: value });
  }
};
