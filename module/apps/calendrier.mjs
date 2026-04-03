/**
 * CalendrierAgone — Calendrier d'Harmonde (10 mois x 30 jours)
 * Visible par tous les joueurs. Navigation réservée au MJ.
 * v2 : heure/minute (quarts), phases de lune, météo
 */
export class CalendrierAgone extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {

  static DEFAULT_OPTIONS = {
    id      : "agone-calendrier",
    classes : ["agone", "agone-calendrier"],
    position: { width: 420 },
    window  : { resizable: false },
  };

  static PARTS = {
    form: { template: "systems/agone/templates/apps/calendrier.hbs" },
  };

  get title() {
    return game.i18n.localize("AGONE.CalendrierHarmonde");
  }

  // ── Helpers statiques ───────────────────────────────────────────────────

  /** Calcule la phase de lune depuis le jour de l'an (cycle 28 jours). */
  static moonPhase(jourDeLAn) {
    const phases = CONFIG.AGONE?.phasesLune ?? [];
    if (!phases.length) return { icon: "🌑", label: "" };
    const idx = Math.floor(((jourDeLAn - 1) % 28) / 28 * 8);
    return phases[Math.min(idx, phases.length - 1)];
  }

  /** Pad HH:MM */
  static fmtTime(h, m) {
    return `${String(h ?? 0).padStart(2, "0")}:${String(m ?? 0).padStart(2, "0")}`;
  }

  // ── Contexte ────────────────────────────────────────────────────────────

  async _prepareContext(options) {
    const date     = game.settings.get("agone", "calendrierDate") ?? { jour: 1, mois: 1, an: 1, heure: 8, minute: 0 };
    const meteoId  = game.settings.get("agone", "calendrierMeteo") ?? "";
    const moisArr  = CONFIG.AGONE.calendrier.mois;
    const moisData = moisArr[(date.mois - 1)] ?? moisArr[0];
    const saison   = moisData.saison;
    const saisonLabel = CONFIG.AGONE.saisons?.[saison] ?? saison;

    // Jours de l'an (pour la phase de lune, 300 jours / an)
    const jourDeLAn = (date.mois - 1) * CONFIG.AGONE.calendrier.joursParMois + date.jour;
    const moonPhase = CalendrierAgone.moonPhase(jourDeLAn);

    // Météo
    const meteoObj  = (CONFIG.AGONE.meteoTypes ?? []).find(m => m.id === meteoId) ?? { id: "", icon: "—", label: "—" };

    // Notes
    const noteKey  = `${date.an}-${date.mois}-${date.jour}`;
    const notes    = game.settings.get("agone", "calendrierNotes") ?? {};
    const noteJour = notes[noteKey] ?? "";

    // Jours du mois avec indicateur de note
    const jours = Array.from({ length: 30 }, (_, i) => {
      const n = i + 1;
      const k = `${date.an}-${date.mois}-${n}`;
      return { num: n, actif: n === date.jour, hasNote: !!notes[k] };
    });

    const heure  = date.heure  ?? 8;
    const minute = date.minute ?? 0;
    const timeStr = CalendrierAgone.fmtTime(heure, minute);

    const n = date.jour;
    const ordinal = `${n}${n === 1 ? "er" : "ème"} jour de ${moisData.nom}, An ${date.an}`;

    return {
      date, jours, moisData, saison, saisonLabel,
      ordinal, noteJour, isGM: game.user.isGM,
      heure, minute, timeStr,
      moonPhase,
      meteoId, meteoIcon: meteoObj.icon, meteoLabel: meteoObj.label,
      meteoTypes: CONFIG.AGONE.meteoTypes ?? [],
    };
  }

  // ── Listeners ───────────────────────────────────────────────────────────

  _onRender(context, options) {
    super._onRender(context, options);
    const html = $(this.element);

    // Lecture seule pour les joueurs
    if (!game.user.isGM) return;

    // Navigation (jours, mois, ans, heures, minutes)
    html.find("[data-nav]").on("click", async (e) => {
      const { delta, unit } = e.currentTarget.dataset;
      await this._navigate(Number(delta), unit);
    });

    // Boutons rapides avancer de N heures
    html.find("[data-advance-hours]").on("click", async (e) => {
      const h = Number(e.currentTarget.dataset.advanceHours);
      if (!isNaN(h) && h > 0) await this._navigate(h, "heure");
    });

    // Changement d'année via label interactif
    html.find("[data-open-year-picker]").on("click", async () => {
      const currentYear = Number((game.settings.get("agone", "calendrierDate") ?? { an: 1 }).an) || 1;
      const content = `
        <form class="agone-year-picker-form">
          <div class="form-group">
            <label>${game.i18n.localize("AGONE.Calendrier.An")}</label>
            <input type="number" name="annee" min="1" step="1" value="${currentYear}" />
          </div>
        </form>
      `;
      new Dialog({
        title: game.i18n.localize("AGONE.Calendrier.ChangerAnnee"),
        content,
        buttons: {
          cancel: { label: game.i18n.localize("AGONE.Fermer") },
          ok: {
            label: game.i18n.localize("AGONE.Confirmer"),
            callback: async (dialogHtml) => {
              const yearInput = Number(dialogHtml.find("input[name='annee']").val());
              await this._setYear(yearInput);
            },
          },
        },
        default: "ok",
        render: (dialogHtml) => {
          const input = dialogHtml.find("input[name='annee']");
          input.trigger("focus");
          input.trigger("select");
        },
      }).render(true);
    });

    // Clic sur un jour
    html.find(".cal-day").on("click", async (e) => {
      const jour = Number(e.currentTarget.dataset.jour);
      const date = game.settings.get("agone", "calendrierDate") ?? { jour: 1, mois: 1, an: 1, heure: 8, minute: 0 };
      await game.settings.set("agone", "calendrierDate", { ...date, jour });
      this.render();
    });

    // Changement météo via select (GM)
    html.find(".cal-meteo-select").on("change", async (e) => {
      await game.settings.set("agone", "calendrierMeteo", e.currentTarget.value);
      this.render();
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

  // ── Navigation ──────────────────────────────────────────────────────────

  async _navigate(delta, unit) {
    const date   = { ...(game.settings.get("agone", "calendrierDate") ?? { jour: 1, mois: 1, an: 1, heure: 8, minute: 0 }) };
    const nbMois = CONFIG.AGONE.calendrier.mois.length; // 10
    const jpp    = CONFIG.AGONE.calendrier.joursParMois; // 30

    // Assurer les champs heure/minute existent
    date.heure  = date.heure  ?? 8;
    date.minute = date.minute ?? 0;

    if (unit === "minute") {
      date.minute += delta * 15;
      // overflow minutes → heures
      while (date.minute >= 60) { date.minute -= 60; date.heure++; }
      while (date.minute < 0)   { date.minute += 60; date.heure--; }
    }

    if (unit === "heure") {
      date.heure += delta;
    }

    if (unit === "heure" || unit === "minute") {
      // overflow heures → jours
      while (date.heure >= 24) { date.heure -= 24; date.jour++; }
      while (date.heure < 0)   { date.heure += 24; date.jour--; }
    }

    if (unit === "jour" || unit === "heure" || unit === "minute") {
      if (unit === "jour") date.jour += delta;
      // overflow jours → mois
      while (date.jour > jpp) { date.jour -= jpp; date.mois++; }
      while (date.jour < 1)   { date.mois--;      date.jour += jpp; }
    } else if (unit === "mois") {
      date.mois += delta;
    } else if (unit === "an") {
      date.an += delta;
    }

    // Overflow mois → années
    while (date.mois > nbMois) { date.mois -= nbMois; date.an++; }
    while (date.mois < 1)      { date.mois += nbMois; date.an--; }
    if (date.an < 1) date.an = 1;
    date.jour = Math.max(1, Math.min(jpp, date.jour));

    // Recalcul saison du monde
    const moisData  = CONFIG.AGONE.calendrier.mois[date.mois - 1];
    const newSaison = moisData?.saison ?? "";
    await game.settings.set("agone", "calendrierDate", date);
    if (newSaison !== game.settings.get("agone", "saisonMonde")) {
      await game.settings.set("agone", "saisonMonde", newSaison);
    }
    this.render();
  }

  async _setYear(year) {
    if (!Number.isInteger(year) || year < 1) return;
    const date = { ...(game.settings.get("agone", "calendrierDate") ?? { jour: 1, mois: 1, an: 1 }) };
    if (date.an === year) return;
    date.an = year;
    await game.settings.set("agone", "calendrierDate", date);
    this.render();
  }

  async _cycleMeteo() {
    const types   = CONFIG.AGONE.meteoTypes ?? [];
    const current = game.settings.get("agone", "calendrierMeteo") ?? "";
    const idx     = types.findIndex(m => m.id === current);
    const next    = types[(idx + 1) % types.length];
    await game.settings.set("agone", "calendrierMeteo", next.id);
  }
}
