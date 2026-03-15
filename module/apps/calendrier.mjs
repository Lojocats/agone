/**
 * CalendrierAgone — Calendrier d'Harmonde (10 mois x 30 jours)
 * Visible par tous les joueurs. Navigation réservée au MJ.
 */
export class CalendrierAgone extends Application {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id:        "agone-calendrier",
      title:     game.i18n.localize("AGONE.CalendrierHarmonde"),
      template:  "systems/agone/templates/apps/calendrier.hbs",
      width:     400,
      height:    "auto",
      resizable: false,
      classes:   ["agone", "agone-calendrier"],
    });
  }

  getData() {
    const date    = game.settings.get("agone", "calendrierDate") ?? { jour: 1, mois: 1, an: 1 };
    const moisArr = CONFIG.AGONE.calendrier.mois;
    const moisData = moisArr[(date.mois - 1)] ?? moisArr[0];
    const saison   = moisData.saison;
    const saisonLabel = CONFIG.AGONE.saisons?.[saison] ?? saison;

    const jours = Array.from({ length: 30 }, (_, i) => ({
      num:   i + 1,
      actif: i + 1 === date.jour,
    }));

    const noteKey  = `${date.an}-${date.mois}-${date.jour}`;
    const notes    = game.settings.get("agone", "calendrierNotes") ?? {};
    const noteJour = notes[noteKey] ?? "";

    const n = date.jour;
    const ordinal = `${n}${n === 1 ? "er" : "ème"} jour de ${moisData.nom}, An ${date.an}`;

    return { date, jours, moisData, saison, saisonLabel, ordinal, noteJour, isGM: game.user.isGM };
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Lecture seule pour les joueurs
    if (!game.user.isGM) return;

    // Navigation
    html.find("[data-nav]").on("click", async (e) => {
      const { delta, unit } = e.currentTarget.dataset;
      await this._navigate(Number(delta), unit);
    });

    // Clic sur un jour
    html.find(".cal-day").on("click", async (e) => {
      const jour = Number(e.currentTarget.dataset.jour);
      const date = game.settings.get("agone", "calendrierDate") ?? { jour: 1, mois: 1, an: 1 };
      await game.settings.set("agone", "calendrierDate", { ...date, jour });
      this.render(false);
    });

    // Sauvegarde de note
    html.find(".cal-note-save").on("click", async () => {
      const date    = game.settings.get("agone", "calendrierDate") ?? { jour: 1, mois: 1, an: 1 };
      const noteKey = `${date.an}-${date.mois}-${date.jour}`;
      const notes   = { ...(game.settings.get("agone", "calendrierNotes") ?? {}) };
      const val     = html.find(".cal-note-input").val()?.trim() ?? "";
      if (val) notes[noteKey] = val;
      else delete notes[noteKey];
      await game.settings.set("agone", "calendrierNotes", notes);
      ui.notifications.info(game.i18n.localize("AGONE.Calendrier.NoteSauvegardee"));
    });
  }

  async _navigate(delta, unit) {
    const date   = { ...(game.settings.get("agone", "calendrierDate") ?? { jour: 1, mois: 1, an: 1 }) };
    const nbMois = CONFIG.AGONE.calendrier.mois.length; // 10
    const jpp    = CONFIG.AGONE.calendrier.joursParMois; // 30

    if (unit === "jour") {
      date.jour += delta;
      if (date.jour > jpp) { date.jour = 1; date.mois++; }
      if (date.jour < 1)   { date.mois--; date.jour = jpp; }
    } else if (unit === "mois") {
      date.mois += delta;
    } else if (unit === "an") {
      date.an += delta;
    }

    // Overflow mois
    while (date.mois > nbMois) { date.mois -= nbMois; date.an++; }
    while (date.mois < 1)      { date.mois += nbMois; date.an--; }
    if (date.an < 1) date.an = 1;
    date.jour = Math.max(1, Math.min(jpp, date.jour));

    // Recalcul de la saison du monde
    const moisData  = CONFIG.AGONE.calendrier.mois[date.mois - 1];
    const newSaison = moisData?.saison ?? "";
    await game.settings.set("agone", "calendrierDate", date);
    if (newSaison !== game.settings.get("agone", "saisonMonde")) {
      await game.settings.set("agone", "saisonMonde", newSaison);
    }
    this.render(false);
  }
}
