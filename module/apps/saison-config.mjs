/**
 * SaisonConfig — Application GM pour configurer la saison du monde
 */
export class SaisonConfig extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id:        "agone-saison-config",
      title:     "Saison du Monde",
      template:  "systems/agone/templates/apps/saison-config.hbs",
      width:     360,
      height:    "auto",
      resizable: false,
      classes:   ["agone", "agone-saison-config"],
    });
  }

  getData() {
    const current = game.settings.get("agone", "saisonMonde") ?? "";
    return {
      saisons: Object.entries(CONFIG.AGONE.saisons ?? {}).map(([value, label]) => ({ value, label })),
      current,
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".saison-select").on("change", async (e) => {
      const val = e.currentTarget.value;
      await game.settings.set("agone", "saisonMonde", val);
      this.render(false);
    });
  }
}
