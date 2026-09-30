import { listen } from "../helpers/dom.mjs";
import { resoudreDomaineArts } from "../helpers/domaines-arts.mjs";

/**
 * DomainesArtsConfig — Application GM pour gérer les domaines d'Arts Magiques personnalisés.
 *
 * Chaque domaine custom stocke :
 *   - nom        : string — nom du domaine (affiché dans la table et utilisé pour la compétence "Arts Magiques")
 *   - compLiee   : string — nom de la compétence mondaine liée (ex. "Chant"), utilisée en min avec Arts Magiques
 *   - attribut   : string — "" ou "art" (défaut, ART) ou une clé de CONFIG.AGONE.attributs (base du potentiel)
 *   - competence : string — "" (défaut, compétence "Arts Magiques" du domaine) ou le nom d'une compétence
 *                  dont le score remplace celui d'Arts Magiques (voir `resoudreDomaineArts`)
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
    const attributOptions = [
      { key: "art", label: game.i18n.localize("AGONE.DomainesArts.AttributArt") },
      ...Object.entries(CONFIG.AGONE.attributs).map(([key, cfg]) => ({
        key, label: `${game.i18n.localize(cfg.label)} (${cfg.abbr})`,
      })),
    ];
    const competenceNoms = [...new Set(CONFIG.AGONE.competences.map(c => c.name))]
      .sort((a, b) => a.localeCompare(b, "fr"));
    return {
      domainesStandard: this.constructor.STANDARD_DOMAINES,
      domainesCustom:   custom.map(d => ({ ...d, ...resoudreDomaineArts(d) })),
      attributOptions,
      competenceNoms,
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const root = this.element;

    // Ajouter un domaine
    listen(root, "[data-action='addDomaine']", "click", async () => {
      const nom        = root.querySelector(".dac-new-nom")?.value?.trim() ?? "";
      const compLiee   = root.querySelector(".dac-new-comp")?.value?.trim() ?? "";
      const attribut   = root.querySelector(".dac-new-attribut")?.value?.trim() || "art";
      const competence = root.querySelector(".dac-new-competence")?.value?.trim() ?? "";

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

      custom.push({ nom, compLiee, attribut, competence });
      await game.settings.set("agone", "domainesArtsCustom", custom);
      this._invalidateSheets();
      this.render(false);
    });

    // Modifier l'attribut de base du potentiel d'un domaine custom
    listen(root, "[data-action='editAttribut']", "change", async (e) => {
      const idx      = Number(e.currentTarget.dataset.idx);
      const attribut = e.currentTarget.value.trim() || "art";
      const custom   = [...(game.settings.get("agone", "domainesArtsCustom") ?? [])];
      if (!custom[idx]) return;
      custom[idx] = { ...custom[idx], attribut };
      await game.settings.set("agone", "domainesArtsCustom", custom);
      this._invalidateSheets();
    });

    // Modifier la compétence qui remplace le score d'Arts Magiques d'un domaine custom
    listen(root, "[data-action='editCompetence']", "change", async (e) => {
      const idx        = Number(e.currentTarget.dataset.idx);
      const competence = e.currentTarget.value.trim();
      const custom     = [...(game.settings.get("agone", "domainesArtsCustom") ?? [])];
      if (!custom[idx]) return;
      custom[idx] = { ...custom[idx], competence };
      await game.settings.set("agone", "domainesArtsCustom", custom);
      this._invalidateSheets();
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
