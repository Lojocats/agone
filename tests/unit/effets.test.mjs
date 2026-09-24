import { fichier } from "./foundry-stubs.mjs";
import { test, describe } from "node:test";
import assert from "node:assert/strict";

const fx = await import(fichier("module/helpers/effets.mjs"));
const { AVANTAGES_EFFETS, AVANTAGES_DATA } = await import(fichier("module/helpers/compendium-data.mjs"));
const { AGONE } = CONFIG;

describe("Vocabulaire des effets (CONFIG.AGONE.effets)", () => {
  test("chaque statistique a un libellé i18n", () => {
    for (const [stat, def] of Object.entries(AGONE.effets)) {
      assert.match(def.label, /^AGONE\./, `libellé de ${stat}`);
    }
  });

  test("valeurs neutres : 0, sauf diviseur de mouvement (1) et Charges doublées (false)", () => {
    const n = fx.effetsNeutres();
    for (const stat of Object.keys(AGONE.effets)) {
      const attendu = stat === "mv_divisor" ? 1 : stat === "charges_double" ? false : 0;
      assert.equal(n[stat], attendu, stat);
    }
  });
});

describe("changeEffet / lireChange", () => {
  test("statistique additive : mode ADD, valeur en texte", () => {
    const c = fx.changeEffet("agilite", 2);
    assert.deepEqual(c, { key: "flags.agone.effets.agilite", mode: 2, value: "2" });
  });

  test("diviseur de mouvement : mode UPGRADE", () => {
    assert.equal(fx.changeEffet("mv_divisor", 3).mode, 4);
  });

  test("statistique booléenne : mode OVERRIDE et valeur forcée à true", () => {
    const c = fx.changeEffet("charges_double", 0);
    assert.equal(c.mode, 5);
    assert.equal(c.value, "true");
  });

  test("aller-retour pour toutes les statistiques", () => {
    for (const stat of Object.keys(AGONE.effets)) {
      const lu = fx.lireChange(fx.changeEffet(stat, 1));
      assert.equal(lu.stat, stat);
      assert.ok(lu.connu);
    }
  });

  test("clé hors vocabulaire : non reconnue", () => {
    assert.equal(fx.lireChange({ key: "system.pdv.max", value: "5" }).connu, false);
    assert.equal(fx.lireChange({ key: "flags.agone.effets.inconnue", value: "1" }).connu, false);
  });
});

describe("effetsDepuisTable (avantages du livre de base)", () => {
  test("chaque statistique de la table existe dans le vocabulaire", () => {
    for (const [nom, effets] of Object.entries(AVANTAGES_EFFETS)) {
      for (const e of effets) assert.ok(AGONE.effets[e.stat], `${nom} : ${e.stat}`);
    }
  });

  test("chaque avantage à effet existe dans AVANTAGES_DATA", () => {
    const noms = new Set(AVANTAGES_DATA.map(a => a.name));
    for (const nom of Object.keys(AVANTAGES_EFFETS)) assert.ok(noms.has(nom), nom);
  });

  test("un effet transféré par avantage, un modificateur par entrée de la table", () => {
    for (const [nom, effets] of Object.entries(AVANTAGES_EFFETS)) {
      const [effet, ...reste] = fx.effetsDepuisTable(nom);
      assert.equal(reste.length, 0);
      assert.equal(effet.transfer, true);
      assert.equal(effet.changes.length, effets.length, nom);
    }
  });

  test("valeurs reprises de la table (Colosse : TAI +1, FOR +1)", () => {
    const [effet] = fx.effetsDepuisTable("Colosse");
    assert.deepEqual(effet.changes.map(c => [fx.lireChange(c).stat, c.value]), [["tai", "1"], ["force", "1"]]);
  });

  test("avantage sans effet ou inconnu : aucun effet", () => {
    assert.deepEqual(fx.effetsDepuisTable("Inexistant"), []);
  });
});

describe("effetsActeur", () => {
  test("complète les cumuls de l'acteur avec les valeurs neutres", () => {
    const e = fx.effetsActeur({ flags: { agone: { effets: { force: 2 } } } });
    assert.equal(e.force, 2);
    assert.equal(e.agilite, 0);
    assert.equal(e.mv_divisor, 1);
  });

  test("acteur sans flags : valeurs neutres", () => {
    assert.deepEqual(fx.effetsActeur(null), fx.effetsNeutres());
  });
});
