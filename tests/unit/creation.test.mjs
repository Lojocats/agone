import "./foundry-stubs.mjs";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { coutCreationNiveau, coutCreationTotal, achatForce, bornesRaciales } from "../../module/helpers/creation.mjs";

describe("Table d'achat de création", () => {
  // CONFIG.AGONE.tableAchatCreation = [0, 1, 2, 3, 4, 5, 7, 10, 14, 19, 25]

  test("coût du niveau suivant : écart entre deux lignes de la table", () => {
    assert.deepEqual([0, 4, 5, 6, 9].map(s => coutCreationNiveau(s)), [1, 1, 2, 3, 6]);
  });

  test("au-delà de la table : l'écart continue de croître de 1 par niveau (comme l'achat point par point)", () => {
    assert.deepEqual([10, 11, 12].map(s => coutCreationNiveau(s)), [7, 8, 9]);
  });

  test("coût total d'un score : valeur de la table", () => {
    assert.deepEqual([0, 1, 5, 6, 10].map(n => coutCreationTotal(n)), [0, 1, 5, 7, 25]);
    assert.equal(coutCreationTotal(-2), 0);
  });

  test("coût total = somme des achats point par point, y compris au-delà de la table", () => {
    for (const n of [3, 10, 11, 12, 15]) {
      let somme = 0;
      for (let s = 0; s < n; s++) somme += coutCreationNiveau(s);
      assert.equal(coutCreationTotal(n), somme, `score ${n}`);
    }
    assert.deepEqual([11, 12].map(n => coutCreationTotal(n)), [32, 40]);
  });

  test("table fournie : utilisée à la place de celle de la configuration", () => {
    assert.equal(coutCreationNiveau(1, [0, 2, 5]), 3);
    assert.equal(coutCreationNiveau(2, [0, 2, 5]), 4);
    assert.equal(coutCreationTotal(3, [0, 2, 5]), 9);
  });
});

describe("achatForce (achat minimum imposé par le peuple)", () => {
  test("malus racial : il faut acheter de quoi revenir à 0", () => {
    assert.equal(achatForce(-2, null), 2);
  });
  test("minimum racial : diminué du bonus racial positif", () => {
    assert.equal(achatForce(1, 4), 3);
    assert.equal(achatForce(5, 4), 0);
  });
  test("ni malus ni minimum : rien d'imposé", () => {
    assert.equal(achatForce(0, null), 0);
    assert.equal(achatForce(undefined, undefined), 0);
  });
});

describe("bornesRaciales", () => {
  const carac = (raceMin = null, raceMax = null) => ({ score: 5, raceMin, raceMax });

  test("les bornes enregistrées sur l'acteur (item Peuple appliqué) priment sur la table du peuple", () => {
    const system = { peuple: "Humain", force: carac(2, 7) };
    assert.deepEqual(bornesRaciales(system, "force"), { min: 2, max: 7 });
  });

  test("peuple personnalisé inconnu de la table : seules ses bornes enregistrées comptent", () => {
    assert.deepEqual(bornesRaciales({ peuple: "Peuple maison", force: carac(null, 6) }, "force"), { min: null, max: 6 });
    assert.deepEqual(bornesRaciales({ peuple: "Peuple maison", force: carac() }, "force"), { min: null, max: null });
  });

  test("sans borne enregistrée : repli sur la table du peuple nommé", () => {
    const humain = CONFIG.AGONE.peuplesData.humain;
    assert.deepEqual(bornesRaciales({ peuple: "Humain", force: carac() }, "force"),
      { min: humain.forceMin ?? null, max: humain.forceMax ?? null });
  });

  test("sans peuple : repli sur l'Humain, à l'affichage comme au contrôle", () => {
    const humain = CONFIG.AGONE.peuplesData.humain;
    assert.deepEqual(bornesRaciales({ peuple: "", agilite: carac() }, "agilite"),
      { min: humain.agiliteMin ?? null, max: humain.agiliteMax ?? null });
  });

  test("données absentes : aucune borne, sans erreur", () => {
    assert.deepEqual(bornesRaciales({ peuple: "Peuple maison" }, "force"), { min: null, max: null });
  });
});
