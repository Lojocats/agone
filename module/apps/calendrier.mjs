import { listen } from "../helpers/dom.mjs";

const DATE_DEFAUT = { jour: 1, mois: 1, an: 1, heure: 8, minute: 0 };

/** Moments de la journée : heure de début, icône, clé i18n (du plus tardif au plus tôt). */
const PERIODES = [
  { debut: 22, icone: "fa-moon",           label: "AGONE.Calendrier.Periode.Nuit"      },
  { debut: 18, icone: "fa-cloud-moon",     label: "AGONE.Calendrier.Periode.Soir"      },
  { debut: 14, icone: "fa-cloud-sun",      label: "AGONE.Calendrier.Periode.ApresMidi" },
  { debut: 12, icone: "fa-sun",            label: "AGONE.Calendrier.Periode.Midi"      },
  { debut: 8,  icone: "fa-sun",            label: "AGONE.Calendrier.Periode.Matin"     },
  { debut: 5,  icone: "fa-mountain-sun",   label: "AGONE.Calendrier.Periode.Aube"      },
  { debut: 0,  icone: "fa-moon",           label: "AGONE.Calendrier.Periode.Nuit"      },
];

/** Date courante du monde, heure et minute toujours renseignées. */
export function dateCalendrier() {
  return { ...DATE_DEFAUT, ...(game.settings.get("agone", "calendrierDate") ?? {}) };
}

/** Clé d'une note de jour dans le réglage « calendrierNotes ». */
function cleNote(an, mois, jour) {
  return `${an}-${mois}-${jour}`;
}

/**
 * État du calendrier partagé par la fenêtre et le widget : date, saison, lune, heure, météo.
 */
export function etatCalendrier() {
  const date     = dateCalendrier();
  const moisArr  = CONFIG.AGONE.calendrier.mois;
  const moisData = moisArr[date.mois - 1] ?? moisArr[0];
  const saison   = moisData.saison;
  const saisonLabel = CONFIG.AGONE.saisons?.[saison] ? game.i18n.localize(CONFIG.AGONE.saisons[saison]) : saison;

  const jourDeLAn = (date.mois - 1) * CONFIG.AGONE.calendrier.joursParMois + date.jour;
  const phase     = CalendrierAgone.moonPhase(jourDeLAn);

  const meteoId  = game.settings.get("agone", "calendrierMeteo") ?? "";
  const meteoObj = (CONFIG.AGONE.meteoTypes ?? []).find(m => m.id === meteoId) ?? { id: "", icon: "—", label: "—" };

  const periode = CalendrierAgone.periode(date.heure);
  return {
    date, moisData, saison, saisonLabel,
    isGM      : game.user.isGM,
    timeStr   : CalendrierAgone.fmtTime(date.heure, date.minute),
    periode   : { icone: periode.icone, label: game.i18n.localize(periode.label) },
    moonPhase : { ...phase, label: phase.label ? game.i18n.localize(phase.label) : "" },
    meteoId,
    meteoIcon : meteoObj.icon,
    meteoLabel: game.i18n.localize(meteoObj.label),
    dateLongue: game.i18n.format(date.jour === 1 ? "AGONE.Calendrier.DateLongue1" : "AGONE.Calendrier.DateLongue",
      { n: date.jour, mois: moisData.nom, an: date.an }),
  };
}

/**
 * CalendrierAgone — Calendrier d'Harmonde (10 mois x 30 jours).
 * Visible par tous les joueurs ; navigation, météo et notes réservées au MJ.
 * Se rafraîchit seul quand la date, la météo ou les notes changent (hook updateSetting, agone.mjs).
 */
export class CalendrierAgone extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {

  static DEFAULT_OPTIONS = {
    id      : "agone-calendrier",
    classes : ["agone", "agone-calendrier"],
    position: { width: 440 },
    window  : { resizable: false },
  };

  static PARTS = {
    form: { template: "systems/agone/templates/apps/calendrier.hbs" },
  };

  get title() {
    return game.i18n.localize("AGONE.CalendrierHarmonde");
  }

  /** Ouvre le calendrier, ou ramène au premier plan celui déjà ouvert. */
  static ouvrir() {
    const ouvert = foundry.applications.instances.get(CalendrierAgone.DEFAULT_OPTIONS.id);
    return (ouvert ?? new CalendrierAgone()).render({ force: true });
  }

  /** Re-rendu du calendrier s'il est ouvert. */
  static rafraichir() {
    const ouvert = foundry.applications.instances.get(CalendrierAgone.DEFAULT_OPTIONS.id);
    if (ouvert?.rendered) ouvert.render();
  }

  // ── Helpers statiques ───────────────────────────────────────────────────

  /** Index de la phase de lune (0-7) pour un jour de l'an (cycle de 28 jours). */
  static moonPhaseIndex(jourDeLAn) {
    return Math.floor(((jourDeLAn - 1) % 28) / 28 * 8);
  }

  /** Phase de lune d'un jour de l'an. */
  static moonPhase(jourDeLAn) {
    const phases = CONFIG.AGONE?.phasesLune ?? [];
    if (!phases.length) return { icon: "🌑", label: "" };
    return phases[Math.min(CalendrierAgone.moonPhaseIndex(jourDeLAn), phases.length - 1)];
  }

  /** Moment de la journée pour une heure (0-23). */
  static periode(heure) {
    return PERIODES.find(p => (heure ?? 0) >= p.debut) ?? PERIODES.at(-1);
  }

  /** Pad HH:MM */
  static fmtTime(h, m) {
    return `${String(h ?? 0).padStart(2, "0")}:${String(m ?? 0).padStart(2, "0")}`;
  }

  // ── Contexte ────────────────────────────────────────────────────────────

  async _prepareContext(options) {
    const etat  = etatCalendrier();
    const { date } = etat;
    const isGM  = etat.isGM;
    const jpp   = CONFIG.AGONE.calendrier.joursParMois;
    const notes = game.settings.get("agone", "calendrierNotes") ?? {};
    const phases = CONFIG.AGONE.phasesLune ?? [];

    // Grille du mois : note (texte pour le MJ seulement) et phases principales de la lune
    // (nouvelle, quartiers, pleine) le jour où elles commencent
    const jours = Array.from({ length: jpp }, (_, i) => {
      const n = i + 1;
      const note = notes[cleNote(date.an, date.mois, n)] ?? "";
      const jourDeLAn = (date.mois - 1) * jpp + n;
      const idx = CalendrierAgone.moonPhaseIndex(jourDeLAn);
      const debutPhase = jourDeLAn === 1 || idx !== CalendrierAgone.moonPhaseIndex(jourDeLAn - 1);
      const lune = debutPhase && idx % 2 === 0 && phases[idx] ? phases[idx] : null;
      const titre = [lune ? game.i18n.localize(lune.label) : "", isGM ? note : ""].filter(Boolean).join(" — ");
      return { num: n, actif: n === date.jour, hasNote: !!note, lune: lune?.icon ?? "", titre };
    });

    // Notes du mois (MJ)
    const notesMois = isGM
      ? jours.filter(j => j.hasNote).map(j => ({ jour: j.num, texte: notes[cleNote(date.an, date.mois, j.num)], actif: j.actif }))
      : [];

    // Position dans la journée (barre horaire)
    const progressionJour = Math.round(((date.heure * 60 + date.minute) / 1440) * 1000) / 10;

    return {
      ...etat,
      jours, notesMois, progressionJour,
      noteJour  : notes[cleNote(date.an, date.mois, date.jour)] ?? "",
      meteoTypes: CONFIG.AGONE.meteoTypes ?? [],
    };
  }

  // ── Listeners ───────────────────────────────────────────────────────────

  _onRender(context, options) {
    super._onRender(context, options);
    const root = this.element;

    // Lecture seule pour les joueurs
    if (!game.user.isGM) return;

    // Navigation (jours, mois, ans, heures, minutes)
    listen(root, "[data-nav]", "click", async (e) => {
      const { delta, unit } = e.currentTarget.dataset;
      await this._navigate(Number(delta), unit);
    });

    // Boutons rapides avancer de N heures
    listen(root, "[data-advance-hours]", "click", async (e) => {
      const h = Number(e.currentTarget.dataset.advanceHours);
      if (!isNaN(h) && h > 0) await this._navigate(h, "heure");
    });

    // Changement d'année via label interactif
    listen(root, "[data-open-year-picker]", "click", async () => {
      const content = `
        <div class="agone-year-picker-form">
          <div class="form-group">
            <label>${game.i18n.localize("AGONE.Calendrier.An")}</label>
            <input type="number" name="annee" min="1" step="1" value="${dateCalendrier().an}" autofocus />
          </div>
        </div>
      `;
      const annee = await foundry.applications.api.DialogV2.prompt({
        window : { title: game.i18n.localize("AGONE.Calendrier.ChangerAnnee") },
        content,
        ok     : {
          label   : game.i18n.localize("AGONE.Confirmer"),
          callback: (_event, button) => Number(button.form.elements.annee.value),
        },
        rejectClose: false,
      });
      if (annee) await this._setYear(annee);
    });

    // Clic sur un jour de la grille ou de la liste des notes
    listen(root, "[data-jour]", "click", async (e) => {
      const jour = Number(e.currentTarget.dataset.jour);
      if (jour) await game.settings.set("agone", "calendrierDate", { ...dateCalendrier(), jour });
    });

    // Changement météo : un bouton par type (MJ)
    listen(root, "[data-meteo]", "click", async (e) => {
      const meteo = e.currentTarget.dataset.meteo;
      if (meteo !== game.settings.get("agone", "calendrierMeteo")) await game.settings.set("agone", "calendrierMeteo", meteo);
    });

    // Note du jour : enregistrée en quittant le champ
    listen(root, ".cal-note-input", "change", async (e) => {
      const { an, mois, jour } = dateCalendrier();
      const notes = { ...(game.settings.get("agone", "calendrierNotes") ?? {}) };
      const val   = e.currentTarget.value.trim();
      if (val) notes[cleNote(an, mois, jour)] = val;
      else delete notes[cleNote(an, mois, jour)];
      await game.settings.set("agone", "calendrierNotes", notes);
    });
  }

  // ── Navigation ──────────────────────────────────────────────────────────

  async _navigate(delta, unit) {
    const date   = dateCalendrier();
    const nbMois = CONFIG.AGONE.calendrier.mois.length; // 10
    const jpp    = CONFIG.AGONE.calendrier.joursParMois; // 30

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
  }

  async _setYear(year) {
    if (!Number.isInteger(year) || year < 1) return;
    const date = dateCalendrier();
    if (date.an === year) return;
    await game.settings.set("agone", "calendrierDate", { ...date, an: year });
  }
}
