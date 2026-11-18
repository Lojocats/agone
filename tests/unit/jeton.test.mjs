import "./foundry-stubs.mjs";
import { test, describe } from "node:test";
import assert from "node:assert/strict";

const { attributBarreSante, corrigerAttributBarre, correctionsBarres, defautsTokenPrototype } =await import("../../module/helpers/jeton.mjs");

describe("Jetons — attribut de la barre de santé", () => {
  test("chemin relatif à actor.system : pdv, ou densite pour un démon", () => {
    assert.equal(attributBarreSante("personnage"), "pdv");
    assert.equal(attributBarreSante("compagnon"), "pdv");
    assert.equal(attributBarreSante("pnj"), "pdv");
    assert.equal(attributBarreSante("demon"), "densite");
  });

  test("migration : « system.pdv » est corrigé selon le type d'acteur", () => {
    assert.equal(corrigerAttributBarre("system.pdv", "personnage"), "pdv");
    assert.equal(corrigerAttributBarre("system.pdv", "pnj"), "pdv");
    assert.equal(corrigerAttributBarre("system.pdv", "demon"), "densite");
    assert.equal(corrigerAttributBarre("system.densite", "demon"), "densite");
    assert.equal(corrigerAttributBarre("system.pdv", undefined), "pdv", "acteur introuvable : PdV");
  });

  test("migration : une barre de santé inexistante pour le type est remplacée", () => {
    assert.equal(corrigerAttributBarre("pdv", "demon"), "densite");
    assert.equal(corrigerAttributBarre("densite", "pnj"), "pdv");
  });

  test("migration : rien à corriger pour une barre correcte, absente ou étrangère", () => {
    assert.equal(corrigerAttributBarre("pdv", "personnage"), null);
    assert.equal(corrigerAttributBarre("densite", "demon"), null);
    assert.equal(corrigerAttributBarre(null, "personnage"), null);
    assert.equal(corrigerAttributBarre(undefined, "personnage"), null);
    assert.equal(corrigerAttributBarre("", "personnage"), null);
    assert.equal(corrigerAttributBarre("ph", "personnage"), null);
    assert.equal(corrigerAttributBarre("system.ph", "personnage"), null);
  });
});

describe("Jetons — migration 1.11.0 des barres de santé", () => {
  test("tokens prototypes : seuls les acteurs à corriger sont mis à jour", () => {
    const acteurs = [
      { id: "a1", attribut: "system.pdv", type: "personnage" },
      { id: "a2", attribut: "system.pdv", type: "demon" },
      { id: "a3", attribut: "pdv", type: "pnj" },
      { id: "a4", attribut: null, type: "pnj" },
      { id: "a5", attribut: "attributes.hp", type: "compagnon" },
    ];
    assert.deepEqual(correctionsBarres(acteurs, "prototypeToken.bar1.attribute"), [
      { _id: "a1", "prototypeToken.bar1.attribute": "pdv" },
      { _id: "a2", "prototypeToken.bar1.attribute": "densite" },
    ]);
  });

  test("tokens placés : même correction, acteur introuvable compris", () => {
    const tokens = [
      { id: "t1", attribut: "system.pdv", type: "pnj" },
      { id: "t2", attribut: "system.pdv", type: undefined },
      { id: "t3", attribut: "densite", type: "demon" },
    ];
    assert.deepEqual(correctionsBarres(tokens, "bar1.attribute"), [
      { _id: "t1", "bar1.attribute": "pdv" },
      { _id: "t2", "bar1.attribute": "pdv" },
    ]);
  });

  test("relance : plus rien à corriger", () => {
    const apres = [{ id: "a1", attribut: "pdv", type: "personnage" }, { id: "a2", attribut: "densite", type: "demon" }];
    assert.deepEqual(correctionsBarres(apres, "prototypeToken.bar1.attribute"), []);
  });
});

describe("Jetons — défauts du token prototype à la création", () => {
  test("personnage et compagnon : barre de PdV, barres visibles du propriétaire, token lié", () => {
    for (const type of ["personnage", "compagnon"]) {
      assert.deepEqual(defautsTokenPrototype(type, { name: "X", type }, 40), {
        "prototypeToken.bar1.attribute": "pdv",
        "prototypeToken.displayBars": 40,
        "prototypeToken.actorLink": true,
      });
    }
  });

  test("PNJ et démon : jamais liés d'office", () => {
    assert.deepEqual(defautsTokenPrototype("pnj", {}, 40), {
      "prototypeToken.bar1.attribute": "pdv",
      "prototypeToken.displayBars": 40,
    });
    assert.deepEqual(defautsTokenPrototype("demon", {}, 40), {
      "prototypeToken.bar1.attribute": "densite",
      "prototypeToken.displayBars": 40,
    });
  });

  test("import ou duplication : les réglages fournis sont conservés", () => {
    const data = { prototypeToken: { bar1: { attribute: "ph" }, displayBars: 0, actorLink: false } };
    assert.deepEqual(defautsTokenPrototype("personnage", data, 40), {});
    assert.deepEqual(defautsTokenPrototype("personnage", {
      "prototypeToken.bar1.attribute": "ph", "prototypeToken.displayBars": 0, "prototypeToken.actorLink": false,
    }, 40), {}, "clés pointées");
  });

  test("import : une barre vide reçoit la barre de santé, un chemin erroné est corrigé", () => {
    const vide = { prototypeToken: { bar1: { attribute: null }, displayBars: 50, actorLink: false } };
    assert.deepEqual(defautsTokenPrototype("pnj", vide, 40), { "prototypeToken.bar1.attribute": "pdv" });
    const errone = { prototypeToken: { bar1: { attribute: "system.pdv" }, displayBars: 50, actorLink: true } };
    assert.deepEqual(defautsTokenPrototype("demon", errone, 40), { "prototypeToken.bar1.attribute": "densite" });
  });
});
