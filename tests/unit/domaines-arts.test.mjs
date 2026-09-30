import "./foundry-stubs.mjs";
import { fichier } from "./foundry-stubs.mjs";
import { test, describe } from "node:test";
import assert from "node:assert/strict";

const { resoudreDomaineArts } = await import(fichier("module/helpers/domaines-arts.mjs"));

describe("resoudreDomaineArts", () => {
  test("entrée absente ou vide : ART par défaut, pas de compétence de remplacement", () => {
    assert.deepEqual(resoudreDomaineArts(null), { attribut: "art", competence: "" });
    assert.deepEqual(resoudreDomaineArts(undefined), { attribut: "art", competence: "" });
    assert.deepEqual(resoudreDomaineArts({}), { attribut: "art", competence: "" });
  });

  test("attribut vide ou \"art\" : équivalents (comportement standard)", () => {
    assert.equal(resoudreDomaineArts({ attribut: "" }).attribut, "art");
    assert.equal(resoudreDomaineArts({ attribut: "art" }).attribut, "art");
  });

  test("valeurs personnalisées coupées des espaces superflus", () => {
    const r = resoudreDomaineArts({ attribut: "  volonte  ", competence: "  Herboristerie  " });
    assert.deepEqual(r, { attribut: "volonte", competence: "Herboristerie" });
  });

  test("attribut et compétence personnalisés conservés tels quels", () => {
    assert.deepEqual(
      resoudreDomaineArts({ attribut: "volonte", competence: "Herboristerie" }),
      { attribut: "volonte", competence: "Herboristerie" }
    );
  });

  test("clé d'attribut inconnue : transmise telle quelle, sans validation contre CONFIG.AGONE.attributs", () => {
    assert.equal(resoudreDomaineArts({ attribut: "bidon" }).attribut, "bidon");
  });

  test("compétence absente : chaîne vide (comportement standard, Arts Magiques du domaine)", () => {
    assert.equal(resoudreDomaineArts({ attribut: "volonte" }).competence, "");
  });

  test("avec clesValides : une clé d'attribut valide est conservée", () => {
    const r = resoudreDomaineArts({ attribut: "volonte" }, ["agilite", "volonte", "charisma"]);
    assert.equal(r.attribut, "volonte");
  });

  test("avec clesValides : une clé d'attribut invalide retombe sur \"art\"", () => {
    const r = resoudreDomaineArts({ attribut: "bidon" }, ["agilite", "volonte"]);
    assert.equal(r.attribut, "art");
  });

  test("avec clesValides : \"art\" reste \"art\" (jamais rejeté par la liste)", () => {
    const r = resoudreDomaineArts({ attribut: "art" }, ["agilite", "volonte"]);
    assert.equal(r.attribut, "art");
  });

  test("sans clesValides : aucune validation, même une clé farfelue passe telle quelle", () => {
    assert.equal(resoudreDomaineArts({ attribut: "bidon" }).attribut, "bidon");
  });
});
