import { fichier, item, acteur } from "./foundry-stubs.mjs";
import { test, describe } from "node:test";
import assert from "node:assert/strict";

const ctx = await import(fichier("module/sheets/actor-context.mjs"));

const comp = (name, score, domaine = "", extra = {}) => item(name, "competence", { score, domaine, ...extra });
const sort = (name, typeMagie, seuil, danseurNom = "") => item(name, "sort", { typeMagie, seuil, danseurNom });

describe("competencesParScore", () => {
  test("groupes par score décroissant, compétences dans l'ordre reçu", () => {
    const g = ctx.competencesParScore([comp("A", 2), comp("B", 5), comp("C", 2), comp("D", 0)]);
    assert.deepEqual(g.map(x => x.className), ["score-5", "score-2", "score-0"]);
    assert.deepEqual(g[1].comps.map(c => c.name), ["A", "C"]);
  });

  test("score absent compté comme 0", () => {
    const [g] = ctx.competencesParScore([item("X", "competence", {})]);
    assert.equal(g.className, "score-0");
  });

  test("liste vide : aucun groupe", () => {
    assert.deepEqual(ctx.competencesParScore([]), []);
  });
});

describe("artsMagiquesParDomaine", () => {
  const system = { art: 3, bonusAme: 1 };

  test("sans Arts Magiques : domaines standards présents mais sans potentiel", () => {
    const lignes = ctx.artsMagiquesParDomaine(system, [], 4);
    assert.deepEqual(lignes.map(l => l.domaine), ["Décorum", "Geste", "Cyse"]);
    for (const l of lignes) assert.equal(l.potentiel, null);
  });

  test("POT = ART + min(Arts, compétence liée) + bonus Âme ; IMPRO = CRÉ + … ", () => {
    const comps = [comp("Arts Magiques", 6, "Décorum"), comp("Peinture", 4)];
    const decorum = ctx.artsMagiquesParDomaine(system, comps, 5).find(l => l.domaine === "Décorum");
    assert.equal(decorum.scoreEffectif, 4);
    assert.equal(decorum.potentiel, 3 + 4 + 1);
    assert.equal(decorum.impro, 5 + 4 + 1);
  });

  test("Accord : une ligne par instrument connu", () => {
    const comps = [comp("Arts Magiques", 5, "Accord"), comp("Musique", 3, "harpe"), comp("Musique", 7, "flute")];
    const accord = ctx.artsMagiquesParDomaine(system, comps, 2).filter(l => l.domaine === "Accord");
    assert.deepEqual(accord.map(l => [l.instrument, l.scoreEffectif]), [["harpe", 3], ["flute", 5]]);
  });

  test("Accord sans instrument : une ligne sans contrainte", () => {
    const [accord] = ctx.artsMagiquesParDomaine(system, [comp("Arts Magiques", 5, "Accord")], 2);
    assert.equal(accord.instrument, "");
    assert.equal(accord.scoreEffectif, 5);
  });

  test("domaine personnalisé (réglage du monde), avec ou sans compétence liée", () => {
    game.settings.set("agone", "domainesArtsCustom", [{ nom: "Sève", compLiee: "Botanique" }, { nom: "Brume", compLiee: "" }]);
    try {
      const comps = [comp("Arts Magiques", 6, "Sève"), comp("Botanique", 2), comp("Arts Magiques", 4, "Brume")];
      const lignes = ctx.artsMagiquesParDomaine(system, comps, 0);
      assert.equal(lignes.find(l => l.domaine === "Sève").scoreEffectif, 2);
      assert.equal(lignes.find(l => l.domaine === "Brume").scoreEffectif, 4, "sans compétence liée : score Arts");
    } finally {
      game.settings.set("agone", "domainesArtsCustom", []);
    }
  });
});

describe("sortsContext", () => {
  const sorts = [sort("S1", "accord", 10), sort("S2", "jorniste", 5), sort("S3", "accord", 5), sort("S4", "geste", 15, "Danseur A")];

  test("types présents triés, y compris ceux des sorts mémorisés", () => {
    const { sortTypes } = ctx.sortsContext(acteur(), sorts);
    assert.deepEqual(sortTypes.map(t => t.value), ["accord", "geste", "jorniste"]);
  });

  test("les sorts mémorisés par un danseur sont hors de la grille", () => {
    const { sortsBySeuil } = ctx.sortsContext(acteur(), sorts);
    assert.ok(!sortsBySeuil.flatMap(g => g.sorts).some(s => s.name === "S4"));
  });

  test("tri par type (défaut) : ordre des obédiences puis des domaines", () => {
    const { triSortsEstType, sortsGroups } = ctx.sortsContext(acteur(), sorts);
    assert.ok(triSortsEstType);
    assert.deepEqual(sortsGroups.map(g => g.label), ["AGONE.Jorniste", "AGONE.Accord"]);
  });

  test("tri par seuil (flag) : groupes par seuil croissant", () => {
    const { triSortsEstType, sortsGroups } = ctx.sortsContext(acteur({ triSorts: "seuil" }), sorts);
    assert.ok(!triSortsEstType);
    assert.deepEqual(sortsGroups.map(g => g.sorts.map(s => s.name)), [["S2", "S3"], ["S1"]]);
  });

  test("type inconnu : groupé à la fin sous son nom", () => {
    const { sortsGroups } = ctx.sortsContext(acteur(), [sort("X", "maison", 1), sort("Y", "cyse", 1)]);
    assert.deepEqual(sortsGroups.map(g => g.label), ["AGONE.Cyse", "maison"]);
  });
});

describe("caracsParAspect", () => {
  test("groupes Corps / Esprit / Âme dans l'ordre, groupes vides omis", () => {
    const g = ctx.caracsParAspect({ agilite: 1, charisma: 2 }, { agilite: 1, charisma: 2 }, ["agilite", "charisma"]);
    assert.deepEqual(g.map(x => x.label), ["AGONE.Corps", "AGONE.Ame"]);
  });

  test("valeur saisie = stockée, bonus des effets = préparée − stockée", () => {
    const [corps] = ctx.caracsParAspect({ force: 5 }, { force: 3 }, ["force"]);
    assert.deepEqual([corps.caracs[0].score, corps.caracs[0].total, corps.caracs[0].bonus], [3, 5, 2]);
  });

  test("caractéristique dérivée : affiche la valeur préparée, sans bonus", () => {
    const [corps] = ctx.caracsParAspect({ resistance: 4 }, { resistance: 0 }, ["resistance"], { derivees: { resistance: "RÉS" } });
    assert.deepEqual([corps.caracs[0].score, corps.caracs[0].bonus, corps.caracs[0].derivee], [4, 0, "RÉS"]);
  });

  test("données supplémentaires fusionnées (montée de niveau)", () => {
    const [corps] = ctx.caracsParAspect({ agilite: 2 }, { agilite: 2 }, ["agilite"], { extra: { agilite: { cout: 2 } } });
    assert.equal(corps.caracs[0].cout, 2);
  });
});
