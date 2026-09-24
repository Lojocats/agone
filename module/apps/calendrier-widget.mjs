/**
 * CalendrierWidget — HUD compact affiché en haut d'écran.
 * Classe simple (pas d'Application) pour éviter toute interférence
 * avec le pipeline de rendu de FoundryVTT.
 */
import { CalendrierAgone, etatCalendrier } from "./calendrier.mjs";

export class CalendrierWidget {
  constructor() {
    /** @type {HTMLElement|null} */
    this._container = null;
  }

  // ── Données ───────────────────────────────────────────────
  getData() {
    const etat = etatCalendrier();
    const { date, moisData } = etat;
    const saison = game.settings.get("agone", "saisonMonde") ?? "";
    return {
      ...etat,
      saison,
      saisonLabel: game.i18n.localize(CONFIG.AGONE.saisons?.[saison] ?? "—"),
      dateCourte : `${date.jour} ${moisData.nom} · ${game.i18n.localize("AGONE.Calendrier.An")} ${date.an}`,
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
      CalendrierAgone.ouvrir();
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
