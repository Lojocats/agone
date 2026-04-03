/**
 * SaisonConfig — Application GM pour configurer la saison du monde
 */
export class SaisonConfig extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id      : "agone-saison-config",
    classes : ["agone", "agone-saison-config"],
    window  : { resizable: false, title: "Saison du Monde" },
    position: { width: 360 },
  };

  static PARTS = {
    form: { template: "systems/agone/templates/apps/saison-config.hbs" },
  };

  _replaceHTML(result, content, options) {
    content.innerHTML = "";
    for (const html of Object.values(result)) content.insertAdjacentHTML("beforeend", html);
  }

  async _prepareContext(options) {
    const current = game.settings.get("agone", "saisonMonde") ?? "";
    return {
      saisons: Object.entries(CONFIG.AGONE.saisons ?? {}).map(([value, label]) => ({ value, label })),
      current,
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    $(this.element).find(".saison-select").on("change", async (e) => {
      const val = e.currentTarget.value;
      await game.settings.set("agone", "saisonMonde", val);
      this.render(false);
    });
  }
}
