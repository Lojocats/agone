import { descriptionBienfaitPeine } from "../../helpers/compendium-data.mjs";
import { lireChange } from "../../helpers/effets.mjs";

/** Seuils du tableau des paliers de Ténèbres, dans l'ordre d'affichage. */
const SEUILS_TENEBRES = [10, 20, 30, 40, 50, 55, 60, 65, 70, 75, 78, 81, 84, 87, 90, 92, 94, 96, 98, 99, 100];
/** Seuils accordant un bienfait. */
const SEUILS_BIENFAITS = [10, 20, 30, 70, 75, 78, 81, 92, 98, 99];

/** Suffixe AGONE.Peine.* du nom de la peine de chaque palier. */
const PALIERS_PEINES = {
  10: "diablotin", 20: "cauchemars", 30: "demonFacetieux", 40: "somnambule", 50: "insomniaque",
  55: "mepris", 60: "devianceSexuelle", 65: "scarificationsLunaires", 70: "jumeauDemoniaque",
  75: "obsessionOmbre", 78: "presenceOppressante", 81: "alterationSens", 84: "sangNoir",
  87: "apparenceDemoniaque", 90: "ombrePerfidie", 92: "siamoisTenebres", 94: "malediction",
  96: "ombreVivante", 98: "portailInterieur", 99: "marqueHautsDiables", 100: "dechu",
};
/** Suffixe AGONE.Bienfait.* du nom du bienfait de chaque palier qui en accorde un. */
const PALIERS_BIENFAITS = {
  10: "cercle1", 20: "diablotin2", 30: "cercle2", 70: "cercle3", 75: "nyctalopie",
  78: "parlerMorts", 81: "detecterDemons", 92: "cercle4", 98: "cercle5", 99: "detecterTenebres",
};

/** Libellés lisibles des effets automatisés propres à une peine (hors effets de son bienfait). */
function effetsLisiblesPeine(peine) {
  const libelles = [];
  for (const effect of peine.effects) {
    if (!effect.active || effect.getFlag("agone", "bienfait")) continue;
    for (const change of effect.changes) {
      const { def, connu, value } = lireChange(change);
      if (!connu) continue;
      const label = game.i18n.localize(def.label);
      libelles.push(def.booleen ? label : `${label} : ${Number(value) >= 0 ? "+" : ""}${value}`);
    }
  }
  return libelles;
}

/**
 * Onglets Ténèbres & Perfidie : paliers (auto / manuel), bienfaits, conjuration, démons (items et acteurs liés).
 */
export const TenebresMixin = Base => class extends Base {

  /** Données de contexte de l'onglet. */
  async _prepareTenebresContext(context) {
    const actor  = this.actor;

    const bySort = (a, b) => (a.sort ?? 0) - (b.sort ?? 0);
    // Peines de Perfidie
    context.peines = actor.items.filter(i => i.type === "peine").sort(bySort);
    // Description du bienfait (propre à la peine, sinon texte du livre), consultable avant de l'acquérir
    for (const peine of context.peines) {
      const { html, texte } = descriptionBienfaitPeine(peine);
      peine._bienfaitDescription = texte;
      peine._bienfaitHTML        = html;
      peine._noirEffectLabel = peine.system.noirEffect === "corps" ? game.i18n.localize("AGONE.PerfidieCorpsNoir1")
                              : peine.system.noirEffect === "ame"   ? game.i18n.localize("AGONE.PerfidieAmeNoire1")
                              : game.i18n.localize("AGONE.Aucun");
      peine._effetsPeine = effetsLisiblesPeine(peine);
      peine._bienfaitEtatLabel = peine.system.bienfait
        ? game.i18n.localize(peine.system.bienfaitAcquis ? "AGONE.BienfaitAcquis" : "AGONE.PerfidieNonAcquis")
        : "";
    }
    // Bienfaits actifs : peines avec bienfaitAcquis=true, dedupliqué par nom de bienfait
    const bienfaitsMap = new Map();
    for (const peine of context.peines) {
      if (peine.system.bienfaitAcquis && peine.system.bienfait) {
        const key = peine.system.bienfait;
        if (!bienfaitsMap.has(key)) {
          bienfaitsMap.set(key, { name: key, sources: [], description: peine._bienfaitHTML });
        }
        bienfaitsMap.get(key).sources.push(peine.name);
      }
    }
    context.bienfaitsActifsPerfidie = [...bienfaitsMap.values()].map(b => {
      return {
        ...b,
        sourceNames : b.sources.join(", "),
      };
    });

    // ── Démons intérieurs (acteurs liés par UUID) ──────────────────────────
    const demonUUIDs = this.actor.getFlag("agone", "demons") ?? [];
    context.demonActors = [];
    for (const dUuid of demonUUIDs) {
      const dActor = await fromUuid(dUuid).catch(() => null);
      if (!dActor) continue;
      const ds = dActor.system;
      const densiteVal = ds.densite?.valeur ?? 0;
      const densiteMax = ds.densite?.max   ?? 0;
      const densitePct = densiteMax > 0 ? Math.round(Math.min(100, (densiteVal / densiteMax) * 100)) : 0;
      const densiteColor = densitePct >= 75 ? '#4a9a4a' : densitePct >= 50 ? '#8a8a00' : densitePct >= 25 ? '#c06000' : '#9a1a1a';
      context.demonActors.push({
        uuid:      dActor.uuid,
        name:      dActor.name,
        img:       dActor.img ?? 'icons/svg/mystery-man.svg',
        origine:   ds.origine ?? '',
        dif:       ds.dif      ?? 0,
        opacite:   ds.opacite  ?? 0,
        melee:     ds.melee    ?? 0,
        initiative:ds.initiative ?? 0,
        densiteVal, densiteMax, densitePct, densiteColor,
      });
    }

    // ── Ténèbres : mode manuel des paliers ────────────────────────────
    context.tenebresModeManuel = this.actor.getFlag("agone", "tenebresModeManuel") ?? false;
    const paliersManuels   = context.tenebresModeManuel ? (this.actor.getFlag("agone", "paliersManuels")   ?? {}) : {};
    const bienfaitsManuels = context.tenebresModeManuel ? (this.actor.getFlag("agone", "bienfaitsManuels") ?? {}) : {};
    if (context.tenebresModeManuel) {
      context.paliersManuels   = paliersManuels;
      context.bienfaitsManuels = bienfaitsManuels;
    }

    // Tableau des Paliers / Peines / Bienfaits
    const tenebresScore = actor.system.tenebres ?? 0;
    context.tableauPaliers = SEUILS_TENEBRES.map(seuil => {
      const bienfaitCle = PALIERS_BIENFAITS[seuil] ?? "";
      return {
        seuil,
        peineNom     : game.i18n.localize(`AGONE.Peine.${PALIERS_PEINES[seuil]}`),
        bienfaitNom  : bienfaitCle ? game.i18n.localize(`AGONE.Bienfait.${bienfaitCle}`) : "",
        tooltipPeine   : game.i18n.localize(`AGONE.TenebresPalierTooltip${seuil}`),
        tooltipBienfait: bienfaitCle ? game.i18n.localize(`AGONE.TenebresBienfaitTooltip${seuil}`) : "",
        atteint      : context.tenebresModeManuel ? !!paliersManuels[String(seuil)] : tenebresScore >= seuil,
        bienfaitCoche: !!bienfaitsManuels[String(seuil)],
      };
    });
  }

  /** Écouteurs délégués de l'onglet (voir PersonnageSheet#_onRender). */
  _bindTenebresListeners(on, root) {
    on("click", "[data-action='rollAptitudeConjuration']", this._onRollAptitudeConjuration.bind(this));
    on("click", "[data-action='rollConjurationDemonologie']", this._onRollConjurationDemonologie.bind(this));
    on("click", "[data-action='toggleTenebresModeManuel']", this._onToggleTenebresModeManuel.bind(this));
    on("click", "[data-action='togglePalierManuel']",   this._onTogglePalierManuel.bind(this));
    on("click", "[data-action='toggleBienfaitManuel']", this._onToggleBienfaitManuel.bind(this));

    // Valider / réactiver mode création démon
    on("click", "[data-action='validerCreationDemon']", this._onValiderCreationDemon.bind(this));
    on("click", "[data-action='reactiverCreationDemon']", this._onReactiverCreationDemon.bind(this));

    // Édition inline des stats démon
    on("change", ".demon-inline-num", this._onDemonStatEdit.bind(this));

    // Acquérir un bienfait de Perfidie (+1 Perfidie, bienfaitAcquis = true)
    on("click", "[data-action='acquerirBienfait']", this._onAcquerirBienfait.bind(this));

    // ── Démons (acteurs liés) ──────────────────────────────────────────────
    on("click", ".demon-actor-open", this._onOpenDemonActor.bind(this));
    on("click", ".demon-actor-remove", this._onRemoveDemonActor.bind(this));
    on("click", "[data-action='createDemonActor']", this._onCreateDemonActor.bind(this));
    // Feedback visuel drag-over sur la zone démons
    root.querySelectorAll(".demons-drop-zone").forEach(el => {
      el.addEventListener("dragover", (ev) => {
        ev.preventDefault();
        el.classList.add("drag-over");
      });
      el.addEventListener("dragleave", (ev) => {
        if (!el.contains(ev.relatedTarget)) el.classList.remove("drag-over");
      });
      el.addEventListener("drop", () => el.classList.remove("drag-over"));
    });
  }

  async _onRollAptitudeConjuration(event) {
    event.preventDefault();
    await this.actor.rollAptitudeConjuration();
  }

  async _onRollConjurationDemonologie(event) {
    event.preventDefault();
    await this.actor.rollConjurationDemonologie();
  }

  async _onToggleTenebresModeManuel(event) {
    event.preventDefault();
    const cur = this.actor.getFlag("agone", "tenebresModeManuel") ?? false;
    const activating = !cur;

    if (activating) {
      // Passage auto → manuel : initialiser paliersManuels et bienfaitsManuels depuis la valeur courante.
      const ten = this.actor.system.tenebres ?? 0;
      const paliers = {};
      for (const s of SEUILS_TENEBRES) paliers[String(s)] = ten >= s;
      await this.actor.setFlag("agone", "paliersManuels", paliers);
      const bienfaits = {};
      for (const s of SEUILS_BIENFAITS) bienfaits[String(s)] = ten >= s;
      await this.actor.setFlag("agone", "bienfaitsManuels", bienfaits);
    }

    await this.actor.setFlag("agone", "tenebresModeManuel", activating);
  }

  async _onToggleBienfaitManuel(event) {
    event.preventDefault();
    const seuil    = event.currentTarget.dataset.seuil;
    const bienfaits = foundry.utils.deepClone(this.actor.getFlag("agone", "bienfaitsManuels") ?? {});
    bienfaits[seuil] = !bienfaits[seuil];
    await this.actor.setFlag("agone", "bienfaitsManuels", bienfaits);
  }

  async _onTogglePalierManuel(event) {
    event.preventDefault();
    const seuil     = event.currentTarget.dataset.seuil;
    const paliers   = foundry.utils.deepClone(this.actor.getFlag("agone", "paliersManuels") ?? {});
    const wasActive = !!paliers[seuil];
    paliers[seuil]  = !wasActive;
    await this.actor.setFlag("agone", "paliersManuels", paliers);

    // Si on active un palier démon, créer le démon correspondant s'il n'existe pas encore
    const PALIERS_DEMON = { "10": "diablotin", "30": "demonFacetieux", "70": "jumeauDemoniaque", "92": "siamoisTenebres" };
    const NOM_DEMON = {
      diablotin:        "AGONE.Peine.diablotin",
      demonFacetieux:   "AGONE.Peine.demonFacetieux",
      jumeauDemoniaque: "AGONE.Peine.jumeauDemoniaque",
      siamoisTenebres:  "AGONE.Peine.siamoisTenebres",
    };
    const origine = PALIERS_DEMON[seuil];
    if (origine && !wasActive) {
      const alreadyExistsItem = this.actor.items.some(
        i => i.type === "demon" && i.system.origine === origine
      );
      const linkedUuids = this.actor.getFlag("agone", "demons") ?? [];
      const alreadyExistsActor = linkedUuids.some(uuid => {
        const doc = fromUuidSync?.(uuid);
        return doc?.system?.origine === origine;
      });
      if (!alreadyExistsItem && !alreadyExistsActor) {
        const name = game.i18n.localize(NOM_DEMON[origine]) || origine;
        const newActor = await Actor.create({ name, type: "demon", system: { origine } });
        if (newActor) {
          await this.actor.setFlag("agone", "demons", [...linkedUuids, newActor.uuid]);
          ui.notifications.info(game.i18n.format("AGONE.DemonAutoApparu", { name }));
        }
      }
    }
  }

  // Démon — valider la création
  async _onValiderCreationDemon(event) {
    event.preventDefault();
    const id    = event.currentTarget.dataset.itemId;
    const demon = this.actor.items.get(id);
    if (!demon) return;
    await demon.update({ "system.modeCreation": false });
  }

  // Démon — réactiver le mode création
  async _onReactiverCreationDemon(event) {
    event.preventDefault();
    const id    = event.currentTarget.dataset.itemId;
    const demon = this.actor.items.get(id);
    if (!demon) return;
    await demon.update({ "system.modeCreation": true });
  }

  // Démon — édition inline d'un champ
  async _onDemonStatEdit(event) {
    event.preventDefault();
    const input  = event.currentTarget;
    const itemId = input.dataset.itemId;
    const field  = input.dataset.field;
    const value  = Number(input.value);
    const demon  = this.actor.items.get(itemId);
    if (!demon || !field) return;
    await demon.update({ [`system.${field}`]: value });
  }

  // Démons acteurs — créer / ouvrir / retirer
  async _onCreateDemonActor(event) {
    event.preventDefault();
    const newActor = await Actor.create({
      name: game.i18n.localize("AGONE.NouveauDemon"),
      type: "demon",
    });
    if (!newActor) return;
    const current = this.actor.getFlag("agone", "demons") ?? [];
    await this.actor.setFlag("agone", "demons", [...current, newActor.uuid]);
    this.renderChild(newActor.sheet);
  }

  async _onOpenDemonActor(event) {
    event.preventDefault();
    const uuid  = event.currentTarget.dataset.uuid;
    const actor = await fromUuid(uuid).catch(() => null);
    if (actor) this.renderChild(actor.sheet);
  }

  async _onRemoveDemonActor(event) {
    event.preventDefault();
    const uuid    = event.currentTarget.dataset.uuid;
    const current = this.actor.getFlag("agone", "demons") ?? [];
    await this.actor.setFlag("agone", "demons", current.filter(u => u !== uuid));
  }

  // Acquérir un bienfait de Perfidie (+1 Perfidie, bienfaitAcquis = true)
  async _onAcquerirBienfait(ev) {
    ev.preventDefault();
    const itemId = ev.currentTarget.dataset.itemId;
    const peine  = this.actor.items.get(itemId);
    if (!peine) return;
    const { html: description } = descriptionBienfaitPeine(peine);
    const confirmed = await this._confirmChild({
      title  : game.i18n.localize("AGONE.AcquerirBienfait"),
      content: `<p>${game.i18n.format("AGONE.AcquerirBienfaitConfirm", { bienfait: `<strong>${peine.system.bienfait}</strong>` })}</p>`
             + (description ? `<div class="bienfait-perfidie-desc"><em>${description}</em></div>` : ""),
    });
    if (!confirmed) return;
    await peine.update({ "system.bienfaitAcquis": true });
    await this.actor.update({ "system.perfidie": (this.actor.system.perfidie ?? 0) + 1 });
    ui.notifications?.info(game.i18n.format("AGONE.Notif.BienfaitAcquis", { bienfait: peine.system.bienfait }));
  }
};
