import { listen } from "../helpers/dom.mjs";

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
export class DomainesArtsConfig extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {

  static DEFAULT_OPTIONS = {
    id      : "agone-domaines-arts-config",
    classes : ["agone", "agone-domaines-arts-config"],
    position: { width: 500 },
    window  : { resizable: false },
  };

  static PARTS = {
    form: { template: "systems/agone/templates/apps/domaines-arts-config.hbs" },
  };

  get title() {
    return game.i18n.localize("AGONE.DomainesArts.TitreConfig");
  }

  /** Domaines standards intégrés au système (non éditables). */
  static get STANDARD_DOMAINES() {
    return [
      { nom: "Accord",  compLiee: "",          readonly: true },
      { nom: "Cyse",    compLiee: "Sculpture",  readonly: true },
      { nom: "Décorum", compLiee: "Peinture",   readonly: true },
      { nom: "Geste",   compLiee: "Poésie",     readonly: true },
    ];
  }

  async _prepareContext(options) {
    const custom = game.settings.get("agone", "domainesArtsCustom") ?? [];
    return {
      domainesStandard: this.constructor.STANDARD_DOMAINES,
      domainesCustom:   custom,
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const root = this.element;

    // Ajouter un domaine
    listen(root, "[data-action='addDomaine']", "click", async () => {
      const nom      = root.querySelector(".dac-new-nom")?.value?.trim() ?? "";
      const compLiee = root.querySelector(".dac-new-comp")?.value?.trim() ?? "";

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
    listen(root, "[data-action='editCompLiee']", "change", async (e) => {
      const idx      = Number(e.currentTarget.dataset.idx);
      const compLiee = e.currentTarget.value.trim();
      const custom   = [...(game.settings.get("agone", "domainesArtsCustom") ?? [])];
      if (!custom[idx]) return;
      custom[idx] = { ...custom[idx], compLiee };
      await game.settings.set("agone", "domainesArtsCustom", custom);
      this._invalidateSheets();
    });

    // Supprimer un domaine custom
    listen(root, "[data-action='removeDomaine']", "click", async (e) => {
      const idx    = Number(e.currentTarget.dataset.idx);
      const custom = [...(game.settings.get("agone", "domainesArtsCustom") ?? [])];
      const cible  = custom[idx];
      if (!cible) return;

      const confirmed = await new Promise(resolve => {
        let s = false;
        const settle = v => { if (!s) { s = true; resolve(v); } };
        const d = new foundry.applications.api.DialogV2({
          window:  { title: game.i18n.localize("AGONE.DomainesArts.SupprimerConfirmTitre") },
          content: game.i18n.format("AGONE.DomainesArts.SupprimerConfirm", { nom: cible.nom }),
          buttons: [
            { action: "yes", icon: "fas fa-check", label: game.i18n.localize("Yes"), default: true,
              callback: () => settle(true) },
            { action: "no",  icon: "fas fa-times", label: game.i18n.localize("No"),
              callback: () => settle(false) },
          ],
          rejectClose: false,
        });
        d.addEventListener("close", () => settle(false), { once: true });
        this.renderChild(d);
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
