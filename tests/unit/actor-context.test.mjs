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

describe("danseurMemoire", () => {
  const sortSeuil = (id, seuil, danseurNom = "") => ({ id, name: id, seuil, danseurNom });

  test("mémoire utilisée = somme des seuils des sorts assignés", () => {
    const r = ctx.danseurMemoire({ capaciteSeuil: 20, enduranceActuelle: 2, enduranceMax: 4 },
      [sortSeuil("A", 5), sortSeuil("B", 3)], []);
    assert.equal(r.memoireUtilisee, 8);
  });

  test("isFull dès que la capacité est atteinte (égalité incluse), pas avant", () => {
    const atteinte = ctx.danseurMemoire({ capaciteSeuil: 10, enduranceActuelle: 1, enduranceMax: 1 }, [sortSeuil("A", 10)], []);
    assert.equal(atteinte.isFull, true);
    const sous = ctx.danseurMemoire({ capaciteSeuil: 10, enduranceActuelle: 1, enduranceMax: 1 }, [sortSeuil("A", 9)], []);
    assert.equal(sous.isFull, false);
  });

  test("pourcentages à 0 sans NaN quand la capacité ou l'endurance max valent 0", () => {
    const r = ctx.danseurMemoire({ capaciteSeuil: 0, enduranceActuelle: 0, enduranceMax: 0 }, [], []);
    assert.deepEqual([r.memoirePct, r.endurancePct], [0, 0]);
  });

  test("pourcentages plafonnés à 100 même si la valeur dépasse le maximum", () => {
    const r = ctx.danseurMemoire({ capaciteSeuil: 10, enduranceActuelle: 20, enduranceMax: 10 }, [sortSeuil("A", 15)], []);
    assert.deepEqual([r.memoirePct, r.endurancePct], [100, 100]);
  });

  test("enduranceVide vrai seulement quand l'endurance actuelle est nulle", () => {
    assert.equal(ctx.danseurMemoire({ enduranceActuelle: 0, enduranceMax: 3 }, [], []).enduranceVide, true);
    assert.equal(ctx.danseurMemoire({ enduranceActuelle: 1, enduranceMax: 3 }, [], []).enduranceVide, false);
  });

  test("sortsMemorisables exclut ceux qui dépasseraient la capacité restante, garde ceux d'un autre danseur", () => {
    const autres = [
      sortSeuil("Libre", 5),
      sortSeuil("TropLourd", 20),
      sortSeuil("AutreDanseur", 4, "Danseur B"),
    ];
    const r = ctx.danseurMemoire({ capaciteSeuil: 20, enduranceActuelle: 1, enduranceMax: 1 }, [sortSeuil("Deja", 6)], autres);
    assert.deepEqual(r.sortsMemorisables.map(s => s.id), ["Libre", "AutreDanseur"]);
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

  test("sans badges détaillés : badge générique des effets actifs", () => {
    const [corps] = ctx.caracsParAspect({ force: 5 }, { force: 3 }, ["force"]);
    assert.deepEqual(corps.caracs[0].badges.map(b => [b.texte, b.classe]), [["+2", "racial-pos"]]);
  });

  test("badges détaillés repris tels quels ; malus au jet (armure) compté dans le total", () => {
    const badges = ctx.badgesBonus({ racial: { agilite: 1 }, malusAgi: -2, armureNom: "Cuirasse" });
    const [corps] = ctx.caracsParAspect({ agilite: 4 }, { agilite: 3 }, ["agilite"], { badges });
    const c = corps.caracs[0];
    assert.deepEqual(c.badges.map(b => b.texte), ["+1", "-2"]);
    assert.deepEqual([c.score, c.total, c.bonus], [3, 2, -1]);
  });

  test("caractéristique dérivée : badges affichés, valeur préparée", () => {
    const badges = { resistance: [{ valeur: 1, texte: "+1", classe: "racial-pos", tooltip: "x" }] };
    const [corps] = ctx.caracsParAspect({ resistance: 5 }, { resistance: 0 }, ["resistance"], { derivees: { resistance: "RÉS" }, badges });
    assert.deepEqual([corps.caracs[0].score, corps.caracs[0].badges.length], [5, 1]);
  });
});

describe("badgesBonus", () => {
  test("un badge par origine : peuple, effets (cumulés, sources en infobulle), armure", () => {
    const b = ctx.badgesBonus({
      racial : { resistance: 2, charisma: -1 },
      peuple : "Nain",
      sources: { resistance: [{ nom: "Anneau", valeur: 1 }, { nom: "Fièvre", valeur: -2 }] },
      malusAgi: -1, armureNom: "Cotte",
    });
    assert.deepEqual(b.resistance.map(x => x.texte), ["+2", "-1"]);
    assert.equal(b.resistance[0].tooltip, "AGONE.BonusRacialPeuple Nain");
    assert.equal(b.resistance[1].tooltip, "AGONE.Effets.Titre : +1 (Anneau), −2 (Fièvre)");
    assert.equal(b.charisma[0].classe, "racial-neg");
    assert.equal(b.charisma[0].tooltip, "AGONE.MalusRacialPeuple Nain");
    assert.deepEqual([b.agilite[0].valeur, b.agilite[0].jet, b.agilite[0].tooltip], [-1, true, "AGONE.MalusAgi (Cotte)"]);
  });

  test("statistiques d'effet dérivées rattachées à la stat de combat affichée", () => {
    const b = ctx.badgesBonus({ sources: {
      melee_bonus: [{ nom: "Épée", valeur: 1 }], defense_bonus: [{ nom: "Écu", valeur: 2 }],
      esquive_bonus: [{ nom: "Bottes", valeur: 1 }], bd_bonus: [{ nom: "Gantelet", valeur: 1 }],
    } });
    assert.deepEqual(Object.keys(b).sort(), ["bd", "defenseNaturelle", "esquive", "melee"]);
  });

  test("valeurs nulles ou qui s'annulent : aucun badge", () => {
    const b = ctx.badgesBonus({ racial: { force: 0 }, sources: { tir_bonus: [{ nom: "A", valeur: 1 }, { nom: "B", valeur: -1 }] } });
    assert.deepEqual(b, {});
  });
});

describe("formulesStatsSimples", () => {
  const system = { agilite: 4, force: 3, perception: 2, intelligence: 5, volonte: 3,
    initiative: 7, initMagique: 17, melee: 4, tir: 3, defenseNaturelle: 4, esquiveTotal: 6, esquiveCompScore: 2, emprise: 4 };

  test("formules détaillées avec la valeur finale", () => {
    const f = ctx.formulesStatsSimples(system);
    assert.equal(f.melee, "(FOR 3 + AGI 4×2) ÷ 3 = 4");
    assert.equal(f.tir, "(AGI 4 + PER 2) ÷ 2 = 3");
    assert.equal(f.initMagique, "AGONE.Initiative 7 + 10 = 17");
    assert.equal(f.esquive, "AGI 4 + AGONE.Esquive 2 = 6");
    assert.equal(f.emprise, "(INT 5 + VOL 3) ÷ 2 = 4");
  });

  test("bonus des effets actifs de la stat ajouté à la formule", () => {
    const f = ctx.formulesStatsSimples({ ...system, melee: 5 }, { melee: [{ valeur: 1 }] });
    assert.equal(f.melee, "(FOR 3 + AGI 4×2) ÷ 3 + 1 = 5");
  });

  test("emprise selon le type de mage", () => {
    assert.equal(ctx.formulesStatsSimples({ ...system, typeMage: "jorniste" }).emprise, "INT 5 = 4");
    assert.equal(ctx.formulesStatsSimples({ ...system, typeMage: "obscurantiste" }).emprise, "VOL 3 = 4");
  });
});

describe("jaugePct", () => {
  test("valeur médiane arrondie", () => {
    assert.equal(ctx.jaugePct(5, 8), 63);
  });

  test("max nul ou négatif : 0", () => {
    assert.equal(ctx.jaugePct(5, 0), 0);
    assert.equal(ctx.jaugePct(5, -3), 0);
  });

  test("dépassement au-delà du max : borné à 100", () => {
    assert.equal(ctx.jaugePct(20, 10), 100);
  });

  test("valeur négative : bornée à 0", () => {
    assert.equal(ctx.jaugePct(-5, 10), 0);
  });
});

describe("trierItems", () => {
  const armeA = item("Épée", "arme", {}, { sort: 200 });
  const armeB = item("Arc", "arme", {}, { sort: 100 });
  const armeC = item("Écu", "armure", {}, { sort: 50 });
  const actor = { items: [armeA, armeB, armeC] };

  test("filtre par type puis trie par sort", () => {
    assert.deepEqual(ctx.trierItems(actor, "arme").map(i => i.name), ["Arc", "Épée"]);
  });

  test("sort manquant compté comme 0, puis nom (locale fr)", () => {
    const x = item("Zèbre", "arme", {}, {});
    const y = item("Âne", "arme", {}, {});
    assert.deepEqual(ctx.trierItems({ items: [x, y] }, "arme").map(i => i.name), ["Âne", "Zèbre"]);
  });

  test("type absent : liste vide", () => {
    assert.deepEqual(ctx.trierItems(actor, "sort"), []);
  });
});

describe("malusSurcharge", () => {
  test("sous la demi-charge : aucun malus", () => {
    assert.equal(ctx.malusSurcharge(3, 5, 10), 0);
  });

  test("au-delà de la demi-charge : -1", () => {
    assert.equal(ctx.malusSurcharge(6, 5, 10), -1);
  });

  test("au-delà de la charge max : -3", () => {
    assert.equal(ctx.malusSurcharge(11, 5, 10), -3);
  });

  test("demi-charge ou charge max nulles : ignorées", () => {
    assert.equal(ctx.malusSurcharge(100, 0, 0), 0);
  });
});

describe("statsCombatSimples", () => {
  const system = {
    initiative: 5, melee: 3, tir: 2, defenseNaturelle: 4, esquiveTotal: 6, bd: 7,
    armure: { protection: 2 }, initMagique: 15, emprise: 8,
  };

  test("compagnon : ni initMagique/emprise (PNJ), ni protection retirée (armure lue), ni BD retiré", () => {
    const stats = ctx.statsCombatSimples(system, "compagnon");
    const cles = stats.map(s => s.cle);
    assert.ok(!cles.includes("initMagique"));
    assert.ok(!cles.includes("emprise"));
    assert.ok(!cles.includes("bd"), "BD absent pour un compagnon");
    assert.ok(cles.includes("protection"));
  });

  test("démon : pas de protection ni d'emprise/initMagique, BD présent", () => {
    const cles = ctx.statsCombatSimples(system, "demon").map(s => s.cle);
    assert.ok(!cles.includes("protection"));
    assert.ok(!cles.includes("initMagique"));
    assert.ok(cles.includes("bd"));
  });

  test("PNJ : initMagique et emprise présents avec leurs actions de jet", () => {
    const stats = ctx.statsCombatSimples(system, "pnj");
    const initMag = stats.find(s => s.cle === "initMagique");
    const emprise = stats.find(s => s.cle === "emprise");
    assert.equal(initMag.action, "rollInitiativeMagique");
    assert.equal(emprise.action, "rollEmpriseAttr");
  });

  test("esquive et défense naturelle : boutons de jet sur les trois types", () => {
    for (const type of ["compagnon", "demon", "pnj"]) {
      const stats = ctx.statsCombatSimples(system, type);
      assert.equal(stats.find(s => s.cle === "esquive").action, "rollEsquive");
      assert.equal(stats.find(s => s.cle === "defenseNaturelle").action, "rollDefenseNaturelle");
    }
  });

  test("valeur manquante remplacée par 0", () => {
    const stats = ctx.statsCombatSimples({}, "pnj");
    assert.equal(stats.find(s => s.cle === "initiative").valeur, 0);
  });

  test("badges et formule portés par chaque stat", () => {
    const badges = { melee: [{ valeur: 1, texte: "+1" }] };
    const stats  = ctx.statsCombatSimples({ ...system, force: 3, agilite: 3 }, "pnj", badges);
    const melee  = stats.find(s => s.cle === "melee");
    assert.deepEqual(melee.badges, badges.melee);
    assert.match(melee.formule, /^\(FOR 3 \+ AGI 3×2\) ÷ 3 \+ 1 = 3$/);
    assert.deepEqual(stats.find(s => s.cle === "tir").badges, []);
    assert.equal(stats.find(s => s.cle === "protection").formule, "");
  });
});

describe("peupleDepuisRace", () => {
  test("nom ou clé du peuple, sans casse ni accents", async () => {
    const { peupleDepuisRace } = await import(fichier("module/helpers/config.mjs"));
    assert.equal(peupleDepuisRace("Nain"), "nain");
    assert.equal(peupleDepuisRace("  geant "), "geant");
    assert.equal(peupleDepuisRace("feeNoire"), "feeNoire");
  });

  test("race vide ou inconnue : null", async () => {
    const { peupleDepuisRace } = await import(fichier("module/helpers/config.mjs"));
    assert.equal(peupleDepuisRace(""), null);
    assert.equal(peupleDepuisRace("Gobelin"), null);
  });
});
