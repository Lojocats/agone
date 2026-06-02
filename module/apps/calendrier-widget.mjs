/**
 * CalendrierWidget — HUD compact affiché en haut d'écran.
 * Classe simple (pas d'Application) pour éviter toute interférence
 * avec le pipeline de rendu de FoundryVTT.
 */
import { CalendrierAgone } from "./calendrier.mjs";

export class CalendrierWidget {
  constructor() {
    /** @type {HTMLElement|null} */
    this._container = null;
  }

  // ── Données ───────────────────────────────────────────────
  getData() {
    const date    = game.settings.get("agone", "calendrierDate") ?? { jour: 1, mois: 1, an: 1, heure: 8, minute: 0 };
    const meteoId = game.settings.get("agone", "calendrierMeteo") ?? "";
    const saison  = game.settings.get("agone", "saisonMonde") ?? "";

    const moisArr   = CONFIG.AGONE.calendrier.mois;
    const moisData  = moisArr[(date.mois - 1)] ?? moisArr[0];
    const saisonLabel = CONFIG.AGONE.saisons?.[saison] ?? "—";

    const jourDeLAn = (date.mois - 1) * CONFIG.AGONE.calendrier.joursParMois + date.jour;
    const phases    = CONFIG.AGONE.phasesLune ?? [];
    const phaseIdx  = Math.floor(((jourDeLAn - 1) % 28) / 28 * 8);
    const moonPhase = phases[phaseIdx] ?? { icon: "🌑", label: "" };

    const meteoObj  = (CONFIG.AGONE.meteoTypes ?? []).find(m => m.id === meteoId) ?? { id: "", icon: "—", label: "—" };

    const heure   = date.heure  ?? 8;
    const minute  = date.minute ?? 0;
    const timeStr = `${String(heure).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const dateCourte = `${date.jour} ${moisData.nom} · An ${date.an}`;

    return {
      isGM: game.user.isGM,
      saison, saisonLabel, dateCourte, timeStr,
      moonPhase,
      meteoIcon:  meteoObj.icon,
      meteoLabel: meteoObj.label,
      meteoId,
    };
  }

  // ── Rendu ────────────────────────────────────────────────────
  async render(_force = false) {
    const data = this.getData();
    const html = await foundry.applications.handlebars.renderTemplate(
      "systems/agone/templates/apps/calendrier-widget.hbs",
      data
    );

    if (!this._container) {
      this._container = document.createElement("div");
      this._container.id = "agone-cal-widget-container";
      document.body.appendChild(this._container);
      // Écouteurs délégués (une seule fois)
      this._container.addEventListener("click", this._onClick.bind(this));
    }

    this._container.innerHTML = html;
  }

  // ── Événements ──────────────────────────────────────────────
  _onClick(e) {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === "openCalendrier") {
      new CalendrierAgone().render(true);
    } else if (action === "cycleMeteo" && game.user.isGM) {
      this._cycleMeteo();
    }
  }

  async _cycleMeteo() {
    const types   = CONFIG.AGONE.meteoTypes ?? [];
    const current = game.settings.get("agone", "calendrierMeteo") ?? "";
    const idx     = types.findIndex(m => m.id === current);
    const next    = types[(idx + 1) % types.length];
    await game.settings.set("agone", "calendrierMeteo", next.id);
  }
}
