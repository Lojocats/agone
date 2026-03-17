/**
 * DomainesArtsConfig — Application GM pour gérer les domaines d'Arts Magiques personnalisés.
 *
 * Chaque domaine custom stocke :
 *   - nom      : string — nom du domaine (affiché dans la table et utilisé pour la compétence "Arts Magiques")
 *   - compLiee : string — nom de la compétence mondaine liée (ex. "Chant")
 *
 * La clé de sort (typeMagie) est dérivée automatiquement : nom.trim().toLowerCase() sans accents.
 *
 * Données persistées dans le setting monde "domainesArtsCustom" (Array).
 */
export class DomainesArtsConfig extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id:        "agone-domaines-arts-config",
      title:     game.i18n.localize("AGONE.DomainesArts.TitreConfig"),
      template:  "systems/agone/templates/apps/domaines-arts-config.hbs",
      width:     500,
      height:    "auto",
      resizable: false,
      classes:   ["agone", "agone-domaines-arts-config"],
    });
  }

  /** Domaines standards intégrés au système (non éditables). */
  static get STANDARD_DOMAINES() {
    return [
      { nom: "Accord",  compLiee: "Musique",   readonly: true },
      { nom: "Cyse",    compLiee: "Sculpture",  readonly: true },
      { nom: "Décorum", compLiee: "Peinture",   readonly: true },
      { nom: "Geste",   compLiee: "Poésie",     readonly: true },
    ];
  }

  getData() {
    const custom = game.settings.get("agone", "domainesArtsCustom") ?? [];
    return {
      domainesStandard: this.constructor.STANDARD_DOMAINES,
      domainesCustom:   custom,
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Ajouter un domaine
    html.find("[data-action='addDomaine']").on("click", async () => {
      const nom      = html.find(".dac-new-nom").val()?.trim() ?? "";
      const compLiee = html.find(".dac-new-comp").val()?.trim() ?? "";

      if (!nom) {
        ui.notifications.warn(game.i18n.localize("AGONE.DomainesArts.NomObligatoire"));
        return;
      }

      const custom = [...(game.settings.get("agone", "domainesArtsCustom") ?? [])];
      const allNoms = [
        ...this.constructor.STANDARD_DOMAINES.map(d => d.nom.toLowerCase()),
        ...custom.map(d => d.nom.toLowerCase()),
      ];
      if (allNoms.includes(nom.toLowerCase())) {
        ui.notifications.warn(game.i18n.format("AGONE.DomainesArts.NomExistant", { nom }));
        return;
      }

      custom.push({ nom, compLiee });
      await game.settings.set("agone", "domainesArtsCustom", custom);
      this._invalidateSheets();
      this.render(false);
    });

    // Modifier la compétence liée d'un domaine custom
    html.find("[data-action='editCompLiee']").on("change", async (e) => {
      const idx      = Number(e.currentTarget.dataset.idx);
      const compLiee = e.currentTarget.value.trim();
      const custom   = [...(game.settings.get("agone", "domainesArtsCustom") ?? [])];
      if (!custom[idx]) return;
      custom[idx] = { ...custom[idx], compLiee };
      await game.settings.set("agone", "domainesArtsCustom", custom);
      this._invalidateSheets();
    });

    // Supprimer un domaine custom
    html.find("[data-action='removeDomaine']").on("click", async (e) => {
      const idx    = Number(e.currentTarget.dataset.idx);
      const custom = [...(game.settings.get("agone", "domainesArtsCustom") ?? [])];
      const cible  = custom[idx];
      if (!cible) return;

      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window:  { title: game.i18n.localize("AGONE.DomainesArts.SupprimerConfirmTitre") },
        content: game.i18n.format("AGONE.DomainesArts.SupprimerConfirm", { nom: cible.nom }),
      });
      if (!confirmed) return;

      custom.splice(idx, 1);
      await game.settings.set("agone", "domainesArtsCustom", custom);
      this._invalidateSheets();
      this.render(false);
    });
  }

  /** Force le re-rendu de toutes les fiches de personnage ouvertes. */
  _invalidateSheets() {
    for (const actor of game.actors ?? []) {
      if (actor.sheet?.rendered) actor.sheet.render(false);
    }
  }
}
