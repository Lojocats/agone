import { attendre, bac, DELAI, PERSO } from "./outils.mjs";
import {
  ARMURES_DATA, AVANTAGES_DATA, AVANTAGES_EFFETS, PEINES_PERFIDIE_DATA, PEUPLES_DATA, SORTS_DATA,
} from "../helpers/compendium-data.mjs";
import {
  porteeArme, conditionManoeuvreCorrespond, estVolant, TYPES_EMPRISE, TYPES_ARTS, instrumentsSorts,
} from "../helpers/filtres-navigateurs.mjs";

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

/** Texte (première ligne) d'une cellule d'une ligne. */
const cellule = (tr, selecteur) => tr.querySelector(selecteur)?.textContent.trim().split("\n")[0].trim() ?? "";

const NOMS_PEUPLES = PEUPLES_DATA.map(p => p.name);
const SEUIL_MIN_SORT = Math.min(...SORTS_DATA.map(s => s.seuil));

/**
 * Nouveaux filtres de chaque navigateur : propriétés posées sur l'application, et vérification
 * des lignes affichées (`verifier(lignes, total, app)`). `auMoinsUne` : la sélection n'est pas vide
 * avec les données du livre de base. `preparer(app)` : mise en place préalable (items de l'acteur,
 * supprimés avec lui par le bac). Ces cas tournent avant le test d'ajout d'une entrée à l'acteur.
 */
const FILTRES = {
  armes: [
    { nom: "dommages minimum", filtres: { _filterDomMin: 8 }, auMoinsUne: true,
      verifier: ls => ls.forEach(tr => exiger(Number(cellule(tr, ".ab-dom")) >= 8, cellule(tr, ".ab-name"))) },
    { nom: "Agilité requise maximale", filtres: { _filterReqAgi: 2 }, auMoinsUne: true,
      verifier: ls => ls.forEach(tr => exiger(Number(cellule(tr, ".ab-req").split("/")[1]) <= 2, cellule(tr, ".ab-name"))) },
    { nom: "portée : à distance", filtres: { _filterPortee: "distance" }, auMoinsUne: true,
      verifier: ls => ls.forEach(tr => exiger(porteeArme(cellule(tr, ".ab-portee")) === "distance", cellule(tr, ".ab-name"))) },
    { nom: "portée : contact", filtres: { _filterPortee: "contact" }, auMoinsUne: true,
      verifier: ls => ls.forEach(tr => exiger(porteeArme(cellule(tr, ".ab-portee")) === "contact", cellule(tr, ".ab-name"))) },
  ],
  armures: [
    { nom: "couverture (Set)", filtres: () => ({ _filterCouv: new Set(["1"]) }), auMoinsUne: true,
      verifier: ls => exiger(ls.length === ARMURES_DATA.filter(d => String(d.type ?? "0") === "1").length, "nombre d'armures de couverture 1") },
    { nom: "protection minimum", filtres: { _filterProtMin: 7 }, auMoinsUne: true,
      verifier: ls => ls.forEach(tr => exiger(Number(cellule(tr, ".arb-prot")) >= 7, cellule(tr, ".arb-name"))) },
    { nom: "malus d'Agilité maximal", filtres: { _filterMalusAgiMax: 2 }, auMoinsUne: true,
      verifier: ls => ls.forEach(tr => exiger(Math.abs(Number(cellule(tr, ".arb-malus"))) <= 2, cellule(tr, ".arb-name"))) },
  ],
  avantages: [
    { nom: "avec prérequis", filtres: { _filterPrerequis: "avec" }, auMoinsUne: true,
      verifier: ls => exiger(memesNoms(ls, ".avb-name", AVANTAGES_DATA.filter(d => (d.prerequis ?? "").trim())),
        "avantages avec prérequis") },
    { nom: "sans prérequis", filtres: { _filterPrerequis: "sans" }, auMoinsUne: true },
    { nom: "avec effet automatisé", filtres: { _filterEffet: "avec" }, auMoinsUne: true,
      verifier: ls => exiger(memesNoms(ls, ".avb-name", AVANTAGES_DATA.filter(d => (AVANTAGES_EFFETS[d.name]?.length ?? 0) > 0)),
        "avantages à effet automatisé") },
    { nom: "sans effet automatisé", filtres: { _filterEffet: "sans" }, auMoinsUne: true },
  ],
  competences: [
    { nom: "attribut lié", filtres: () => ({ _filterAttribut: CONFIG.AGONE.competences[0].attributLie }), auMoinsUne: true,
      verifier: ls => {
        const label = game.i18n.localize(CONFIG.AGONE.attributs[CONFIG.AGONE.competences[0].attributLie].label);
        ls.forEach(tr => exiger(cellule(tr, ".cb-attr") === label, cellule(tr, ".cb-name")));
      } },
  ],
  manoeuvres: ["sans", "reaction", "peuple", "autre"].map(cat => ({
    nom: `condition : ${cat}`, filtres: { _filterCondition: cat }, auMoinsUne: true,
    verifier: ls => ls.forEach(tr => exiger(
      conditionManoeuvreCorrespond(cellule(tr, ".mb-condition"), cat, NOMS_PEUPLES), cellule(tr, ".mb-name"))),
  })),
  peines: [
    { nom: "possédées : la seule peine du personnage", filtres: { _filterPossede: "oui" }, preparer: peinePossedee,
      verifier: ls => exiger(ls.length === 1 && cellule(ls[0], ".pnb-name") === PEINES_PERFIDIE_DATA[0].name,
        `seule « ${PEINES_PERFIDIE_DATA[0].name} » listée`) },
    { nom: "non possédées : toutes sauf une", filtres: { _filterPossede: "non" }, preparer: peinePossedee, auMoinsUne: true,
      verifier: (ls, total) => exiger(ls.length === total - 1
        && !ls.some(tr => cellule(tr, ".pnb-name") === PEINES_PERFIDIE_DATA[0].name), "toutes les peines sauf la possédée") },
  ],
  peuples: [
    { nom: "saison", filtres: { _filterSaison: "hiver" }, auMoinsUne: true,
      verifier: ls => exiger(
        ls.map(tr => cellule(tr, ".pb-name")).sort().join("|")
          === PEUPLES_DATA.filter(p => p.saisonDefaut === "hiver").map(p => p.name).sort().join("|"),
        "peuples d'hiver") },
    { nom: "volants", filtres: { _filterVol: "oui" }, auMoinsUne: true,
      verifier: ls => exiger(
        ls.map(tr => cellule(tr, ".pb-name")).sort().join("|")
          === PEUPLES_DATA.filter(p => estVolant(p.mvVolBase)).map(p => p.name).sort().join("|"),
        "peuples volants") },
    { nom: "non volants", filtres: { _filterVol: "non" }, auMoinsUne: true,
      verifier: ls => exiger(ls.length === PEUPLES_DATA.filter(p => !estVolant(p.mvVolBase)).length, "peuples non volants") },
  ],
  sorts: [
    { nom: "famille Emprise", filtres: { _filterFamille: "emprise" }, auMoinsUne: true,
      verifier: ls => ls.forEach(tr => exiger(TYPES_EMPRISE.includes(cellule(tr, ".sb-type").split("/")[0].trim().toLowerCase()), cellule(tr, ".sb-name"))) },
    { nom: "famille Arts magiques", filtres: { _filterFamille: "arts" }, auMoinsUne: true,
      verifier: ls => ls.forEach(tr => exiger(TYPES_ARTS.includes(cellule(tr, ".sb-type").split("/")[0].trim().toLowerCase()), cellule(tr, ".sb-name"))) },
    { nom: "instrument", filtres: { _filterInstrument: "harpe" }, auMoinsUne: true,
      verifier: ls => ls.forEach(tr => exiger(cellule(tr, ".sb-type").split("/")[1]?.trim() === "harpe", cellule(tr, ".sb-name"))) },
  ],
};

/** Vrai si les noms affichés (cellule `selecteur`) sont exactement ceux des entrées `attendues`. */
function memesNoms(ls, selecteur, attendues) {
  const affiches = ls.map(tr => cellule(tr, selecteur)).sort().join("|");
  return affiches === attendues.map(d => d.name).sort().join("|");
}

/** Donne au personnage de test la première peine du livre de base (une seule fois). */
async function peinePossedee(app) {
  const nom = PEINES_PERFIDIE_DATA[0].name;
  if (app.actor.items.some(i => i.type === "peine" && i.name === nom)) return;
  await Item.create({ name: nom, type: "peine" }, { parent: app.actor });
}

/** Vérification d'une ligne filtrée (cas déclarés hors du batch, sans l'`assert` de Quench). */
function exiger(condition, message) {
  if (!condition) throw new Error(`Ligne hors filtre : ${message}`);
}

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
        const premier = cellule(lignes(app)[0], "td[class$='-name']");
        assert.ok(premier, "nom de la première entrée");
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

      it("descriptions pliables : chevron, clic sur la ligne, état conservé, tout ouvrir", async () => {
        const table = () => app.element.querySelector("table:not(.browser-perso-table)");
        const premierChevron = table().querySelector(".desc-bascule[data-desc]");
        if (!premierChevron) return;  // navigateur sans description dépliable
        const cle = premierChevron.dataset.desc;
        // Re-requêté à chaque usage : un `app.render()` remplace le DOM, l'ancien nœud est détaché.
        const chevron = () => table().querySelector(`.desc-bascule[data-desc="${CSS.escape(cle)}"]`);
        const desc = () => table().querySelector(`[data-desc-de="${CSS.escape(cle)}"]`);
        assert.ok(desc().hidden, "description masquée par défaut");
        chevron().click();
        assert.notOk(desc().hidden, "ouverte au clic sur le chevron");
        assert.equal(chevron().getAttribute("aria-expanded"), "true");
        await app.render();
        assert.notOk(desc().hidden, "toujours ouverte après un rendu");
        chevron().closest("tr").querySelector("td[class$='-name']").click();
        await app.render();
        assert.ok(desc().hidden, "refermée au clic sur la ligne");

        const tout = table().querySelector(".desc-bascule-tout");
        assert.ok(tout, "bouton tout ouvrir");
        tout.click();
        assert.ok([...table().querySelectorAll(".desc-pliable")].every(d => !d.hidden), "toutes ouvertes");
        tout.click();
        assert.ok([...table().querySelectorAll(".desc-pliable")].every(d => d.hidden), "toutes fermées");
        assert.equal(app._descOuvertes.size, 0);
      });

      it("tri par colonne (clic sur l'en-tête)", async () => {
        const th = app.element.querySelector("table:not(.browser-perso-table) th.browser-triable");
        assert.ok(th, "colonne triable");
        th.click();
        assert.ok(th.classList.contains("tri-asc"));
        th.click();
        assert.ok(th.classList.contains("tri-desc"));
      });

      it("chaque contrôle de filtre déclaré est présent dans la barre", () => {
        for (const selecteur of Object.keys(app.constructor.FILTERS)) {
          assert.ok(app.element.querySelector(selecteur), selecteur);
        }
        assert.ok(app.element.querySelector(".agone-filtres-tete"), "tête de filtres partagée");
      });

      for (const cas of FILTRES[fichier] ?? []) {
        it(`filtre ${cas.nom}`, async () => {
          await cas.preparer?.(app);
          app._resetFilters();
          await app.render();
          const total = lignes(app).length;
          Object.assign(app, typeof cas.filtres === "function" ? cas.filtres() : cas.filtres);
          await app.render();
          const filtrees = lignes(app);
          assert.isAtMost(filtrees.length, total);
          if (cas.auMoinsUne) {
            assert.isAbove(filtrees.length, 0, "au moins une entrée");
            assert.isBelow(filtrees.length, total, "le filtre écarte des entrées");
          }
          cas.verifier?.(filtrees, total, app);
          app._resetFilters();
          await app.render();
          assert.equal(lignes(app).length, total, "réinitialisation");
        });
      }

      it("la réinitialisation remet chaque filtre à sa valeur initiale (Set recopié)", async () => {
        app._resetFilters();
        await app.render();
        const total = lignes(app).length;
        for (const cas of FILTRES[fichier] ?? []) {
          Object.assign(app, typeof cas.filtres === "function" ? cas.filtres() : cas.filtres);
        }
        await app.render();
        app._resetFilters();
        const defauts = app.constructor.FILTER_DEFAULTS;
        for (const [cle, valeur] of Object.entries(defauts)) {
          if (valeur instanceof Set) {
            assert.instanceOf(app[cle], Set, cle);
            assert.equal(app[cle].size, 0, cle);
            assert.notStrictEqual(app[cle], valeur, `${cle} : copie du Set par défaut`);
          } else {
            assert.strictEqual(app[cle], valeur, cle);
          }
        }
        await app.render();
        assert.equal(lignes(app).length, total);
      });

      if (fichier === "armures") {
        it("un clic sur une puce de couverture bascule le Set", async () => {
          app._resetFilters();
          await app.render();
          const total = lignes(app).length;
          const attendu = ARMURES_DATA.filter(d => String(d.type ?? "0") === "1").length;
          const puce = () => app.element.querySelector(".arb-couv-check[value='1']");
          assert.equal(puce().closest(".agone-chip")?.querySelector("input[type='checkbox']"), puce(), "case réelle dans la puce");

          puce().closest(".agone-chip").click();
          await attendre(() => app._filterCouv.has("1") && lignes(app).length === attendu, "couverture cochée");
          assert.ok(puce().checked, "case cochée après rendu");
          assert.notOk(app.element.querySelector(".arb-all-couv").checked, "« Tous » décoché");

          puce().closest(".agone-chip").click();
          await attendre(() => !app._filterCouv.has("1") && lignes(app).length === total, "couverture décochée");

          puce().closest(".agone-chip").click();
          await attendre(() => app._filterCouv.size === 1 && lignes(app).length === attendu && puce().checked,
            "couverture recochée");
          app.element.querySelector(".arb-all-couv").closest(".agone-chip").click();
          await attendre(() => app._filterCouv.size === 0 && lignes(app).length === total
            && app.element.querySelector(".arb-all-couv").checked, "« Tous » vide le Set");
        });
      }

      if (fichier === "avantages") {
        it("prérequis et effet automatisé : « avec » et « sans » partagent la liste", async () => {
          app._resetFilters();
          await app.render();
          const total = lignes(app).length;
          for (const prop of ["_filterPrerequis", "_filterEffet"]) {
            const compte = {};
            for (const v of ["avec", "sans"]) {
              app._resetFilters();
              app[prop] = v;
              await app.render();
              compte[v] = lignes(app).length;
            }
            assert.equal(compte.avec + compte.sans, total, prop);
          }
          app._resetFilters();
          await app.render();
        });
      }

      if (fichier === "competences") {
        it("le bouton d'effacement réinitialise recherche et filtres", async () => {
          app._resetFilters();
          await app.render();
          const total = lignes(app).length;
          assert.notOk(app.element.querySelector(".cb-search-clear"), "ancien bouton retiré");
          app._search = "zzzz-aucun-resultat";
          app._filterAttribut = CONFIG.AGONE.competences[0].attributLie;
          app._filterPossede = "oui";
          await app.render();
          app.element.querySelector(".cb-clear").click();
          await attendre(() => app._search === "" && app._filterAttribut === "all" && app._filterPossede === "all"
            && lignes(app).length === total, "filtres effacés");
        });

        it("le sélecteur d'attribut ne propose que des attributs liés à une compétence", () => {
          const utilises = new Set(CONFIG.AGONE.competences.map(c => c.attributLie));
          const options = [...app.element.querySelectorAll(".cb-attribut-filter option")].map(o => o.value);
          assert.equal(options[0], "all");
          assert.isAbove(options.length, 1);
          for (const v of options.slice(1)) assert.ok(utilises.has(v), v);
        });
      }

      if (fichier === "sorts") {
        it("seuil maximal et seuil exact sont exclusifs", async () => {
          app._resetFilters();
          await app.render();
          const saisirMax = valeur => {
            const input = app.element.querySelector(".sb-seuil-max");
            input.value = valeur;
            input.dispatchEvent(new Event("input", { bubbles: true }));
          };
          const choisirExact = valeur => {
            const select = app.element.querySelector(".sb-seuil-exact");
            select.value = valeur;
            select.dispatchEvent(new Event("change", { bubbles: true }));
          };

          saisirMax(String(SEUIL_MIN_SORT));
          await attendre(() => app._filterSeuilMax === SEUIL_MIN_SORT, "seuil max saisi", 3000);
          await attendre(() => lignes(app).every(tr => Number(cellule(tr, ".sb-seuil")) <= SEUIL_MIN_SORT), "liste au seuil max");
          assert.isAbove(lignes(app).length, 0);

          const exact = [...app.element.querySelectorAll(".sb-seuil-exact option")].map(o => o.value).find(v => v !== "");
          choisirExact(exact);
          await attendre(() => app._filterSeuilExact === Number(exact), "seuil exact choisi");
          assert.isNull(app._filterSeuilMax, "seuil max effacé");
          await attendre(() => app.element.querySelector(".sb-seuil-max")?.value === "", "champ seuil max vidé");
          await attendre(() => lignes(app).length > 0
            && lignes(app).every(tr => Number(cellule(tr, ".sb-seuil")) === Number(exact)), "liste au seuil exact");

          saisirMax("5");
          await attendre(() => app._filterSeuilMax === 5, "seuil max ressaisi", 3000);
          assert.isNull(app._filterSeuilExact, "seuil exact effacé");
          await attendre(() => app.element.querySelector(".sb-seuil-exact")?.value === "", "sélecteur seuil exact vidé");

          app._resetFilters();
          await app.render();
        });

        it("les instruments proposés suivent le filtre de type", async () => {
          const options = () => [...app.element.querySelectorAll(".sb-instrument-filter option")]
            .map(o => o.value).filter(v => v !== "all");

          app._resetFilters();
          app._filterTypes = new Set(["accord"]);
          await app.render();
          assert.deepEqual(options(), instrumentsSorts(SORTS_DATA.filter(s => s.typeMagie === "accord")));

          app._resetFilters();
          app._filterFamille = "emprise";
          await app.render();
          const emprise = instrumentsSorts(SORTS_DATA.filter(s => TYPES_EMPRISE.includes(s.typeMagie)));
          if (emprise.length) assert.deepEqual(options(), emprise);
          else assert.notOk(app.element.querySelector(".sb-instrument-filter"), "aucun instrument pour l'Emprise");

          app._resetFilters();
          await app.render();
          assert.deepEqual(options(), instrumentsSorts(SORTS_DATA));
        });

        it("l'instrument choisi reste proposé quand le type ne l'utilise plus", async () => {
          app._resetFilters();
          app._filterInstrument = "harpe";
          app._filterFamille = "emprise";
          await app.render();
          const select = app.element.querySelector(".sb-instrument-filter");
          assert.ok(select, "sélecteur présent");
          assert.equal(select.value, "harpe");
          app._resetFilters();
          await app.render();
        });
      }

      if (fichier === "peines") {
        it("la ligne dépliable d'une peine avec bienfait détaille l'effet noir et le bienfait", async () => {
          const table = () => app.element.querySelector("table:not(.browser-perso-table)");
          const avecBienfait = PEINES_PERFIDIE_DATA.findIndex(d => d.bienfait && d.noirEffect);
          assert.isAbove(avecBienfait, -1, "au moins une peine du livre avec bienfait");
          const d = PEINES_PERFIDIE_DATA[avecBienfait];
          const chevron = table().querySelector(`.desc-bascule[data-desc="${avecBienfait}"]`);
          const desc = table().querySelector(`[data-desc-de="${avecBienfait}"]`);
          assert.ok(chevron, "chevron de la peine");
          chevron.click();
          assert.notOk(desc.hidden, "ouverte au clic");
          const noirLabelKey = d.noirEffect === "corps" ? "AGONE.PerfidieCorpsNoir1" : "AGONE.PerfidieAmeNoire1";
          assert.include(desc.textContent, game.i18n.localize(noirLabelKey), "effet noir en toutes lettres");
          assert.include(desc.textContent, d.bienfait, "nom du bienfait");
          const { descriptionBienfait } = await import("../helpers/compendium-data.mjs");
          const texteLivre = descriptionBienfait(d.bienfait);
          if (texteLivre) assert.include(desc.textContent, texteLivre, "description du bienfait");
        });
      }

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
