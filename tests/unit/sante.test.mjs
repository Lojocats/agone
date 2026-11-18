import "./foundry-stubs.mjs";
import { test, describe } from "node:test";
import assert from "node:assert/strict";

const { pointsDeVie, libelleSante, couleurSante } = await import("../../module/helpers/sante.mjs");

const acteur = (valeur, max, type = "personnage") =>
  ({ type, system: { [type === "demon" ? "densite" : "pdv"]: { valeur, max } } });

describe("Santé — points de vie", () => {
  test("un démon a une Densité, les autres des PdV", () => {
    assert.deepEqual(pointsDeVie(acteur(3, 10)), { valeur: 3, max: 10, champ: "pdv" });
    assert.deepEqual(pointsDeVie(acteur(4, 20, "demon")), { valeur: 4, max: 20, champ: "densite" });
    assert.deepEqual(pointsDeVie(null), { valeur: 0, max: 0, champ: "pdv" });
  });
});

describe("Santé — libellé descriptif", () => {
  test("sans maximum de points de vie : aucun libellé", () => {
    assert.equal(libelleSante(acteur(0, 0)), null);
    assert.equal(libelleSante(null), null);
  });

  test("paliers : bornes inclusives à 100, 75, 50 et 25 %, puis > 0 et 0", () => {
    const cas = [
      [100, "100"], [120, "100"],
      [99, "75"], [75, "75"],
      [74, "50"], [50, "50"],
      [49, "25"], [25, "25"],
      [24, "10"], [1, "10"],
      [0, "0"], [-5, "0"],
    ];
    for (const [valeur, palier] of cas) {
      assert.equal(libelleSante(acteur(valeur, 100)), `AGONE.SanteLabel${palier}Defaut`, `${valeur} / 100`);
    }
  });

  test("la Densité d'un démon suit les mêmes paliers", () => {
    assert.equal(libelleSante(acteur(10, 20, "demon")), "AGONE.SanteLabel50Defaut");
  });

  test("réglage vide ou blanc : texte traduit ; réglage renseigné : texte du MJ", () => {
    game.settings.set("agone", "santeLabel50", "   ");
    assert.equal(libelleSante(acteur(5, 10)), "AGONE.SanteLabel50Defaut");
    game.settings.set("agone", "santeLabel50", "tient encore debout");
    assert.equal(libelleSante(acteur(5, 10)), "tient encore debout");
    assert.equal(libelleSante(acteur(10, 10)), "AGONE.SanteLabel100Defaut", "les autres paliers ne changent pas");
    game.settings.set("agone", "santeLabel50", "");
  });

  test("les textes par défaut existent en français et en anglais", async () => {
    const { readFileSync } = await import("node:fs");
    const { fichier } = await import("./foundry-stubs.mjs");
    for (const langue of ["fr", "en"]) {
      const agone = JSON.parse(readFileSync(fichier(`lang/${langue}.json`), "utf8").replace(/^\uFEFF/, "")).AGONE;
      for (const palier of ["100", "75", "50", "25", "10", "0"]) {
        assert.ok(agone[`SanteLabel${palier}Defaut`]?.trim(), `${langue} : SanteLabel${palier}Defaut`);
      }
    }
  });
});

describe("Santé — couleur de la barre", () => {
  test("rouge jusqu'à 25 %, orange jusqu'à 50 %, vert au-delà", () => {
    assert.match(couleurSante(0), /rouge/);
    assert.match(couleurSante(25), /rouge/);
    assert.match(couleurSante(26), /orange/);
    assert.match(couleurSante(50), /orange/);
    assert.match(couleurSante(51), /vert/);
    assert.match(couleurSante(100), /vert/);
    // Jetons « -clair » des jauges : les jetons de texte, plus sombres, assombrissaient la barre
    assert.equal(couleurSante(10), "var(--agone-txt-rouge-clair)");
    assert.equal(couleurSante(40), "var(--agone-txt-orange-clair)");
    assert.equal(couleurSante(90), "var(--agone-txt-vert-clair)");
  });
});
