import { CalendrierAgone, etatCalendrier } from "../apps/calendrier.mjs";
import { AgoreCombatTracker } from "../apps/combat-tracker.mjs";

/**
 * Intégration du système dans Foundry : manifeste, fiches enregistrées, compendiums,
 * traductions de la langue courante, templates, thème, calendrier, tracker, migrations.
 */
export function systemeBatch({ describe, it, assert }) {

  describe("Enregistrements", function () {
    it("chaque type déclaré a son DataModel", () => {
      for (const type of Object.keys(game.system.documentTypes.Actor)) assert.ok(CONFIG.Actor.dataModels[type], `acteur ${type}`);
      for (const type of Object.keys(game.system.documentTypes.Item)) assert.ok(CONFIG.Item.dataModels[type], `item ${type}`);
    });

    it("chaque type d'acteur a une fiche Agone par défaut", () => {
      for (const type of Object.keys(game.system.documentTypes.Actor)) {
        const fiches = Object.entries(CONFIG.Actor.sheetClasses[type] ?? {});
        assert.ok(fiches.some(([id, f]) => id.startsWith("agone.") && f.default), type);
      }
    });

    it("la fiche d'item Agone est la fiche par défaut", () => {
      for (const type of Object.keys(game.system.documentTypes.Item)) {
        const fiches = Object.entries(CONFIG.Item.sheetClasses[type] ?? {});
        assert.ok(fiches.some(([id, f]) => id.startsWith("agone.") && f.default), type);
      }
    });

    it("vocabulaire des effets et caractéristiques configurés", () => {
      assert.isAbove(Object.keys(CONFIG.AGONE.effets).length, 20);
      for (const k of ["agilite", "force", "perception", "resistance", "intelligence", "volonte", "charisma", "creativite"]) {
        assert.ok(CONFIG.AGONE.attributs[k], k);
      }
    });
  });

  describe("Compendiums du système", function () {
    this.timeout(15000);
    for (const nom of ["competences", "peuples", "armes", "armures", "sorts"]) {
      it(`agone.${nom} existe et contient des entrées`, async () => {
        const pack = game.packs.get(`agone.${nom}`);
        assert.ok(pack, "compendium présent");
        const index = await pack.getIndex();
        assert.isAbove(index.size, 0);
      });
    }
  });

  describe("Traductions (langue courante)", function () {
    this.timeout(15000);
    it(`toutes les clés du système sont traduites en « ${game.i18n.lang} »`, async () => {
      const cles = await (await fetch(`systems/${game.system.id}/lang/fr.json`)).json();
      const aplatir = (o, p = "") => Object.entries(o).flatMap(([k, v]) => typeof v === "object" ? aplatir(v, `${p}${k}.`) : [`${p}${k}`]);
      const manquantes = aplatir(cles).filter(k => !game.i18n.has(k));
      assert.deepEqual(manquantes, []);
    });
  });

  describe("Templates", function () {
    this.timeout(30000);
    it("chaque template préchargé se compile", async () => {
      const source = await (await fetch(`systems/${game.system.id}/module/agone.mjs`)).text();
      const chemins = [...new Set([...source.matchAll(/"(systems\/agone\/templates\/[^"]+\.hbs)"/g)].map(m => m[1]))];
      assert.isAbove(chemins.length, 10);
      for (const chemin of chemins) {
        const tpl = await foundry.applications.handlebars.getTemplate(chemin);
        assert.isFunction(tpl, chemin);
      }
    });
  });

  describe("Thème", function () {
    this.timeout(15000);
    it("le réglage sombre/clair applique la classe du body", async () => {
      const avant = game.settings.get("agone", "agoneTheme");
      try {
        await game.settings.set("agone", "agoneTheme", "dark");
        assert.ok(document.body.classList.contains("agone-dark"));
        await game.settings.set("agone", "agoneTheme", "light");
        assert.notOk(document.body.classList.contains("agone-dark"));
      } finally {
        await game.settings.set("agone", "agoneTheme", avant);
      }
    });
  });

  describe("Calendrier", function () {
    this.timeout(15000);
    it("moments de la journée et phases de lune", () => {
      assert.equal(CalendrierAgone.periode(3).label, "AGONE.Calendrier.Periode.Nuit");
      assert.equal(CalendrierAgone.periode(6).label, "AGONE.Calendrier.Periode.Aube");
      assert.equal(CalendrierAgone.periode(12).label, "AGONE.Calendrier.Periode.Midi");
      assert.equal(CalendrierAgone.periode(23).label, "AGONE.Calendrier.Periode.Nuit");
      assert.equal(CalendrierAgone.moonPhaseIndex(1), 0);
      assert.equal(CalendrierAgone.moonPhaseIndex(15), 4);
      assert.equal(CalendrierAgone.moonPhaseIndex(29), 0);
    });

    it("l'état du calendrier donne une date longue traduite", () => {
      const etat = etatCalendrier();
      assert.include(etat.dateLongue, etat.moisData.nom);
      assert.notInclude(etat.dateLongue, "{");
      assert.match(etat.timeStr, /^\d\d:\d\d$/);
    });

    it("le calendrier s'ouvre et affiche 30 jours", async () => {
      const app = await CalendrierAgone.ouvrir();
      try {
        assert.lengthOf(app.element.querySelectorAll(".cal-day"), CONFIG.AGONE.calendrier.joursParMois);
        assert.ok(app.element.querySelector(".cal-day.today"));
      } finally {
        await app.close();
      }
    });
  });

  describe("Tracker de combat", function () {
    this.timeout(15000);
    it("le tracker s'affiche (avec ou sans combat)", async () => {
      const dejaOuvert = foundry.applications.instances.get(AgoreCombatTracker.DEFAULT_OPTIONS.id);
      const app = await AgoreCombatTracker.ouvrir();
      try {
        const attendu = game.combat ? ".agone-ct-list" : ".agone-ct-empty";
        assert.ok(app.element.querySelector(attendu), attendu);
      } finally {
        if (!dejaOuvert) await app.close();
      }
    });
  });

  describe("Migrations", function () {
    it("la version de migration du monde n'est pas plus récente que le système", () => {
      const version = game.settings.get("agone", "systemMigrationVersion");
      if (!version) return;
      assert.notOk(foundry.utils.isNewerVersion(version, game.system.version), `${version} > ${game.system.version}`);
    });
  });
}
