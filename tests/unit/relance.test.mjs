import "./foundry-stubs.mjs";
import { fichier } from "./foundry-stubs.mjs";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// AgoneActor étend la classe globale Foundry `Actor` : le module n'est pas importable tel quel
// hors Foundry (voir foundry-stubs.mjs). On vérifie donc la cohérence de METHODES_RELANCE par
// analyse statique de la source, sans exécuter le module.
const source = readFileSync(fichier("module/documents/actor.mjs"), "utf8");

describe("METHODES_RELANCE", () => {
  const match = source.match(/METHODES_RELANCE\s*=\s*new Set\(\[([\s\S]*?)\]\)/);
  const methodes = [...(match?.[1].matchAll(/"([a-zA-Z0-9]+)"/g) ?? [])].map(m => m[1]);

  test("la liste est trouvée et non vide", () => {
    assert.ok(methodes.length > 0, "METHODES_RELANCE doit lister au moins une méthode");
  });

  test("chaque méthode listée existe bien sur AgoneActor (async <nom>(...)", () => {
    for (const nom of methodes) {
      assert.match(source, new RegExp(`\\basync ${nom}\\s*\\(`),
        `AgoneActor#${nom} introuvable alors qu'elle est listée dans METHODES_RELANCE`);
    }
  });
});
