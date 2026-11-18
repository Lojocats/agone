import { fichier } from "./foundry-stubs.mjs";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const { systemDepuis, TYPES_EMPRISE } = await import("../../module/helpers/filtres-navigateurs.mjs");
const { ARMES_DATA, SORTS_DATA } = await import("../../module/helpers/compendium-data.mjs");

describe("Navigateurs — données system d'un item ajouté", () => {
  test("les champs demandés sont repris de l'entrée, les autres ignorés", () => {
    const entree = { name: "Épée", style: "melee", dommages: 4, inconnu: "x" };
    assert.deepEqual(systemDepuis(entree, { style: "trait", dommages: 0 }), { style: "melee", dommages: 4 });
  });

  test("champ absent ou null : valeur par défaut ; 0 et chaîne vide sont conservés", () => {
    assert.deepEqual(systemDepuis({ a: null, c: 0, d: "" }, { a: 1, b: "b", c: 9, d: "z" }), { a: 1, b: "b", c: 0, d: "" });
    assert.deepEqual(systemDepuis(undefined, { a: 1 }), { a: 1 });
  });

  test("une arme et un sort du livre de base gardent leurs valeurs", () => {
    const arme = ARMES_DATA[0];
    const sysArme = systemDepuis(arme, { style: "melee", type: "P", dommages: 0, description: "" });
    assert.equal(sysArme.style, arme.style ?? "melee");
    assert.equal(sysArme.dommages, arme.dommages ?? 0);
    const sort = SORTS_DATA[0];
    const sysSort = systemDepuis(sort, { typeMagie: "", seuil: 0, special: "" });
    assert.equal(sysSort.typeMagie, sort.typeMagie ?? "");
    assert.equal(sysSort.seuil, sort.seuil ?? 0);
    assert.equal(typeof sysSort.special, "string");
  });
});

describe("Navigateurs — conventions des fenêtres", () => {
  const dossier = fichier("module/apps/");
  const navigateurs = readdirSync(dossier).filter(f => f.endsWith("-browser.mjs") && f !== "agone-browser.mjs");

  test("identifiant de fenêtre unique par instance ({id}) : deux fiches ne partagent pas un id DOM", () => {
    assert.ok(navigateurs.length >= 9);
    for (const f of navigateurs) {
      const src = readFileSync(new URL(f, dossier), "utf8");
      assert.match(src, /id\s*:\s*"agone-[a-z]+-browser-\{id\}"/, f);
    }
  });

  test("la liste conserve son défilement entre deux rendus (scrollable)", () => {
    for (const f of navigateurs) {
      const src = readFileSync(new URL(f, dossier), "utf8");
      const selecteur = src.match(/scrollable:\s*\["(\.[\w-]+)"/)?.[1];
      assert.ok(selecteur, `${f} : scrollable absent`);
      const gabarit = readFileSync(fichier(`templates/apps/${f.replace(".mjs", ".hbs")}`), "utf8");
      assert.ok(gabarit.includes(`class="${selecteur.slice(1)}`), `${f} : ${selecteur} absent du template`);
    }
  });

  test("le navigateur de sorts réutilise TYPES_EMPRISE", () => {
    const src = readFileSync(new URL("sorts-browser.mjs", dossier), "utf8");
    assert.match(src, /TYPES_EMPRISE/);
    assert.doesNotMatch(src, /EMPRISE_TYPES/);
    assert.deepEqual(TYPES_EMPRISE, ["jorniste", "obscurantiste", "eclipsiste"]);
  });
});

describe("Calendrier — icônes de météo et de lune", () => {
  const FA = /^fa[srb] fa-[a-z-]+( fa-[a-z-]+)*$/;

  test("classes Font Awesome, jamais d'emoji", () => {
    for (const m of CONFIG.AGONE.meteoTypes) assert.match(m.icon, FA, `météo ${m.id}`);
    for (const p of CONFIG.AGONE.phasesLune) assert.match(p.icon, FA, p.label);
    assert.equal(CONFIG.AGONE.phasesLune.length, 8);
  });

  test("les templates du calendrier rendent ces icônes dans un <i>", () => {
    for (const f of ["templates/apps/calendrier.hbs", "templates/apps/calendrier-widget.hbs"]) {
      const src = readFileSync(fichier(f), "utf8");
      assert.match(src, /<i class="\{\{moonPhase\.icon\}\}"><\/i>/, f);
      assert.match(src, /<i class="\{\{meteoIcon\}\}"><\/i>/, f);
      assert.doesNotMatch(src, />\s*\{\{(moonPhase\.icon|meteoIcon|m\.icon|j\.lune)\}\}/, `${f} : icône rendue en texte`);
    }
  });
});
