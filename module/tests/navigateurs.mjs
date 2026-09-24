import { attendre, bac, DELAI, PERSO } from "./outils.mjs";

/** Navigateurs : [fichier, classe, action d'ajout (null = pas d'ajout direct testé)] */
const NAVIGATEURS = [
  ["armes", "ArmesBrowser", "addArme"],
  ["armures", "ArmuresBrowser", "addArmure"],
  ["avantages", "AvantagesBrowser", "addAvantage"],
  ["competences", "CompetencesBrowser", "addCompetence"],
  ["manoeuvres", "ManoeuvresBrowser", "addManoeuvre"],
  ["peines", "PeinesBrowser", "addPeine"],
  ["peuples", "PeuplesBrowser", null],
  ["pouvoirs", "PouvoirsBrowser", "addPouvoir"],
  ["sorts", "SortsBrowser", "addSort"],
];

/** Lignes principales du tableau (hors descriptions, hors ligne « aucun résultat »). */
const lignes = app => [...app.element.querySelectorAll("table:not(.browser-perso-table) tbody tr")]
  .filter(tr => !/-desc-row\b/.test(tr.className) && !tr.querySelector("td[colspan]"));

/**
 * Navigateurs de compendium : affichage, recherche, réinitialisation, tri, ajout à l'acteur,
 * objets personnalisés du monde.
 */
export function navigateursBatch({ describe, it, assert, before, after }) {
  const tests = bac();
  after(async function () { this.timeout(DELAI); await tests.nettoyer(); });

  for (const [fichier, classe, action] of NAVIGATEURS) {
    describe(`Navigateur ${fichier}`, function () {
      this.timeout(DELAI);
      let actor, app;
      before(async () => {
        actor = await tests.acteur("personnage", PERSO);
        const module = await import(`../apps/${fichier}-browser.mjs`);
        app = new module[classe](actor);
        await app.render({ force: true });
        await attendre(() => app.rendered, "navigateur rendu");
      });
      after(async () => { await app?.close({ animate: false }); });

      it("affiche les entrées du livre de base", () => {
        assert.isAbove(lignes(app).length, 0);
      });

      it("recherche sans résultat, puis réinitialisation", async () => {
        const total = lignes(app).length;
        app._search = "zzzz-aucun-resultat";
        await app.render();
        assert.equal(lignes(app).length, 0);
        app._resetFilters();
        await app.render();
        assert.equal(lignes(app).length, total);
      });

      it("la recherche tapée filtre la liste", async () => {
        const [selecteur] = Object.entries(app.constructor.FILTERS).find(([, s]) => s.kind === "text");
        const premier = lignes(app)[0].cells[0].textContent.trim().split("\n")[0].trim();
        const input = app.element.querySelector(selecteur);
        input.value = premier;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        await attendre(() => app._search === premier, "recherche prise en compte", 3000);
        await attendre(() => lignes(app).length > 0 && lignes(app).length <= 10, "liste filtrée");
        app._resetFilters();
        await app.render();
      });

      it("recherche sans accent ni casse : l'entrée arrive en tête, surlignée", async () => {
        const nom = lignes(app)[0].querySelector("td[class$='-name']")?.textContent.trim().split("\n")[0].trim();
        assert.ok(nom, "nom de la première entrée");
        app._search = nom.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
        await app.render();
        const premiere = lignes(app)[0];
        assert.ok(premiere, "au moins un résultat");
        assert.include(premiere.textContent, nom);
        assert.ok(premiere.querySelector("mark.agone-surligne"), "correspondance surlignée");
        app._resetFilters();
        await app.render();
      });

      it("une faute de frappe donne des résultats approchants", async () => {
        const nom = lignes(app).map(tr => tr.querySelector("td[class$='-name']")?.textContent.trim().split("\n")[0].trim())
          .find(n => n && /^[a-z]{6,}$/i.test(n));
        if (!nom) return;  // aucun nom d'un seul mot assez long dans ce navigateur
        app._search = nom.slice(0, -1) + (nom.endsWith("z") ? "y" : "z");
        await app.render();
        assert.isAbove(lignes(app).length, 0);
        assert.ok(app.element.querySelector(".browser-recherche-approx"), "bandeau résultats approchants");
        app._resetFilters();
        await app.render();
      });

      it("tri par colonne (clic sur l'en-tête)", async () => {
        const th = app.element.querySelector("table:not(.browser-perso-table) th.browser-triable");
        assert.ok(th, "colonne triable");
        th.click();
        assert.ok(th.classList.contains("tri-asc"));
        th.click();
        assert.ok(th.classList.contains("tri-desc"));
      });

      if (action) {
        it("ajouter une entrée à l'acteur", async () => {
          const avant = actor.items.size;
          const bouton = app.element.querySelector(`table:not(.browser-perso-table) [data-action='${action}']`);
          assert.ok(bouton, `bouton ${action}`);
          bouton.click();
          await attendre(() => actor.items.size === avant + 1, "item ajouté");
        });
      }
    });
  }

  describe("Objets personnalisés", function () {
    this.timeout(DELAI);
    it("un item du monde apparaît et s'ajoute avec ses effets", async () => {
      const { changeEffet } = await import("../helpers/effets.mjs");
      await tests.item({
        name: "Lame de test personnalisée", type: "arme",
        effects: [{ name: "Fil", transfer: true, changes: [changeEffet("melee_bonus", 1)] }],
      });
      const actor = await tests.acteur("personnage", PERSO);
      const { ArmesBrowser } = await import("../apps/armes-browser.mjs");
      const app = new ArmesBrowser(actor);
      await app.render({ force: true });
      await attendre(() => app.element?.querySelector(".browser-perso-row"), "section personnalisée");
      const ligne = [...app.element.querySelectorAll(".browser-perso-row")]
        .find(tr => tr.textContent.includes("Lame de test personnalisée"));
      assert.ok(ligne, "item du monde listé");
      assert.ok(ligne.querySelector(".browser-perso-effets"), "effets signalés");
      const melee = actor.system.melee;
      ligne.querySelector("[data-action='persoAjouter']").click();
      await attendre(() => actor.items.some(i => i.name === "Lame de test personnalisée"), "item ajouté");
      assert.equal(actor.system.melee, melee + 1, "effet conservé");
      await app.close({ animate: false });
    });
  });
}
