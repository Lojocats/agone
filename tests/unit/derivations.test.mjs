import { fichier, item } from "./foundry-stubs.mjs";
import { test, describe } from "node:test";
import assert from "node:assert/strict";

const d = await import(fichier("module/helpers/derivations.mjs"));
const ctx = await import(fichier("module/sheets/actor-context.mjs"));

const comp = (name, score = 0, system = {}) => item(name, "competence", { score, ...system });

describe("competenceParNom", () => {
  const items = [
    item("Épée", "arme"),
    comp("Esquive acrobatique", 9),
    comp("esquive", 4),
    comp("Démonologie", 5),
    comp("Connaissance des Danseurs", 6),
    comp("Arts Magiques", 2, { domaine: "Accord" }),
    comp("Arts Magiques", 7, { domaine: "Geste" }),
  ];

  test("comparaison sans accents ni casse", () => {
    assert.equal(d.competenceParNom(items, "DEMONOLOGIE").system.score, 5);
    assert.equal(d.competenceParNom(items, "Esquive").system.score, 4);
  });

  test("exact par défaut : un nom qui contient la clé ne suffit pas", () => {
    assert.equal(d.competenceParNom(items, "danseur"), null);
    assert.equal(d.competenceParNom([comp("Esquive acrobatique", 9)], "Esquive"), null);
  });

  test("partiel : repli sur le nom qui contient la clé, l'exact restant prioritaire", () => {
    assert.equal(d.competenceParNom(items, "danseur", { partiel: true }).system.score, 6);
    assert.equal(d.competenceParNom(items, "esquive", { partiel: true }).system.score, 4);
  });

  test("ignore les items qui ne sont pas des compétences, et les clés vides", () => {
    assert.equal(d.competenceParNom([item("Esquive", "arme")], "Esquive"), null);
    assert.equal(d.competenceParNom(items, ""), null);
    assert.equal(d.competenceParNom(null, "Esquive"), null);
  });

  test("filtre : domaine de la compétence", () => {
    const geste = d.competenceParNom(items, "Arts Magiques", { filtre: i => i.system.domaine === "Geste" });
    assert.equal(geste.system.score, 7);
  });

  test("competenceConnue : mêmes clés partout (Démonologie, Danseurs, Résonance, Esquive, Arts Magiques)", () => {
    assert.equal(d.competenceConnue(items, "demonologie").name, "Démonologie");
    assert.equal(d.competenceConnue([comp("Demonologie appliquée", 3)], "demonologie").system.score, 3);
    assert.equal(d.competenceConnue(items, "danseurs").name, "Connaissance des Danseurs");
    assert.equal(d.competenceConnue([comp("Résonance", 2)], "resonance").system.score, 2);
    assert.equal(d.competenceConnue(items, "esquive").system.score, 4);
    assert.equal(d.competenceConnue(items, "artsMagiques").system.score, 2);
    assert.equal(d.competenceConnue(items, "inconnue"), null);
  });
});

describe("bonusAspectAttribut / scoreAttribut", () => {
  const sd = { bonusCorps: 3, bonusEsprit: -1, bonusAme: 2, agilite: { score: 6 }, force: 4 };

  test("aspect de la caractéristique", () => {
    assert.equal(d.bonusAspectAttribut(sd, "agilite"), 3);
    assert.equal(d.bonusAspectAttribut(sd, "volonte"), -1);
    assert.equal(d.bonusAspectAttribut(sd, "charisma"), 2);
    assert.equal(d.bonusAspectAttribut(sd, "melee"), 3);
  });

  test("0 sans aspect connu ou sans bonus (compagnon, démon)", () => {
    assert.equal(d.bonusAspectAttribut(sd, "inconnu"), 0);
    assert.equal(d.bonusAspectAttribut({}, "agilite"), 0);
  });

  test("scoreAttribut : objet { score } ou nombre", () => {
    assert.equal(d.scoreAttribut(sd, "agilite"), 6);
    assert.equal(d.scoreAttribut(sd, "force"), 4);
    assert.equal(d.scoreAttribut(sd, "absent"), 0);
  });
});

describe("malusSurcharge / cumulMalusJet / malusBlessuresGraves", () => {
  test("une seule implémentation, partagée avec les fiches", () => {
    assert.equal(ctx.malusSurcharge, d.malusSurcharge);
  });

  test("paliers de surcharge", () => {
    assert.equal(d.malusSurcharge(5, 5, 10), 0);
    assert.equal(d.malusSurcharge(6, 5, 10), -1);
    assert.equal(d.malusSurcharge(10, 5, 10), -1);
    assert.equal(d.malusSurcharge(11, 5, 10), -3);
    assert.equal(d.malusSurcharge(50, 0, 0), 0);
  });

  test("cumul armure + surcharge + blessures", () => {
    assert.equal(d.cumulMalusJet({ malusSurcharge: -1, malusBlessureGrave: -6 }, -2), -9);
    assert.equal(d.cumulMalusJet({ malusSurcharge: -3 }), -3);
    assert.equal(d.cumulMalusJet({}), 0);
  });

  test("table des blessures graves : 0, -2, -6, -12 (bornée)", () => {
    assert.deepEqual(CONFIG.AGONE.malusBlessuresGraves, [0, -2, -6, -12]);
    assert.deepEqual([0, 1, 2, 3].map(d.malusBlessuresGraves), [0, -2, -6, -12]);
    assert.equal(d.malusBlessuresGraves(7), -12);
    assert.equal(d.malusBlessuresGraves(undefined), 0);
  });
});

describe("sommeBonusSupp", () => {
  test("somme par attribut, valeurs non numériques ignorées", () => {
    const liste = [{ attribut: "art", valeur: 2 }, { attribut: "art", valeur: -1 }, { attribut: "emprise", valeur: "x" }];
    assert.equal(d.sommeBonusSupp(liste, "art"), 1);
    assert.equal(d.sommeBonusSupp(liste, "emprise"), 0);
    assert.equal(d.sommeBonusSupp(undefined, "art"), 0);
  });
});

describe("totauxArme", () => {
  const acteur = { melee: 7, tir: 5, initiative: 12, bd: 2, bonusCorps: 3, agilite: { score: 8 } };
  const armes = comp("Armes", 4, { domaine: "Mêlée", attributLie: "melee" });
  const arcs  = comp("Armes", 6, { domaine: "Tir", attributLie: "tir" });
  const fine  = comp("Armes", 2, { domaine: "Escrime", attributLie: "agilite" });
  const items = [item("Épée", "arme"), armes, arcs, fine];

  test("mêlée : MÊL + compétence + bonus d'arme + bonus Corps", () => {
    const t = d.totauxArme({ style: "melee", competence: "Mêlée", attackBonus: 1, defenseBonus: 2, initBonus: 3, dommages: 5 }, acteur, items);
    assert.equal(t.attackTotal, 7 + 4 + 1 + 3);
    assert.equal(t.defenseTotal, 7 + 4 + 2 + 3);
    assert.equal(t.initTotal, 15);
    assert.equal(t.dommagesTotal, 7);
    assert.equal(t.attributLie, "melee");
  });

  test("trait : TIR en attaque, MÊL en parade", () => {
    const t = d.totauxArme({ style: "trait", competence: "Tir" }, acteur, items);
    assert.equal(t.attackTotal, 5 + 6 + 3);
    assert.equal(t.defenseTotal, 7 + 6 + 3);
  });

  test("la caractéristique liée à la compétence prime sur le style (comme rollAttaque)", () => {
    const t = d.totauxArme({ style: "trait", competence: "Escrime" }, acteur, items);
    assert.equal(t.attributLie, "agilite");
    assert.equal(t.baseAttaque, 8);
    assert.equal(t.attackTotal, 8 + 2 + 3);
  });

  test("sans compétence liée : repli sur le style, score 0", () => {
    assert.equal(d.totauxArme({ style: "trait", competence: "Inconnue" }, acteur, items).attackTotal, 5 + 3);
    assert.equal(d.totauxArme({ competence: "" }, acteur, items).attackTotal, 7 + 3);
  });

  test("acteur simple (caractéristiques numériques, pas de bonus Corps)", () => {
    const t = d.totauxArme({ style: "melee", dommages: 3 }, { melee: 4, tir: 3, initiative: 6, bd: 1 }, []);
    assert.deepEqual(
      [t.initTotal, t.attackTotal, t.defenseTotal, t.dommagesTotal],
      [6, 4, 4, 4]
    );
  });
});

describe("calculerCharges", () => {
  const don = (name, categorie, cout, typeCharge = "charge") => item(name, "don", { categorie, cout, typeCharge });
  const dons = [don("Allié", "avantage", 3), don("Jeune", "avantage", 2), don("Myope", "defaut", -4), don("Rang", "avantage", 5, "social")];

  test("sans effet : dépense, récupération, solde", () => {
    const c = d.calculerCharges(dons, { charges_double: false, charges_reduction: 0 }, 5);
    assert.equal(c.chargesDepensees, 10);
    assert.equal(c.chargesRecuperees, 4);
    assert.equal(c.chargesDisponibles, 9);
    assert.equal(c.chargesSolde, -1);
    assert.equal(c.chargesSoldeClass, "charges-deficit");
    assert.equal(c.chargesJeune, false);
    assert.equal(c.chargesVieillard, false);
  });

  test("Jeune : coût doublé sauf pour Jeune et hors Charges", () => {
    const c = d.calculerCharges(dons, { charges_double: true, charges_reduction: 0 }, 20);
    assert.equal(c.chargesDepensees, 6 + 2 + 5);
    assert.equal(c.chargesSoldeClass, "charges-ok");
    assert.equal(c.chargesJeune, true);
  });

  test("Vieillard : réduction, plancher à 1", () => {
    const c = d.calculerCharges(dons, { charges_double: false, charges_reduction: 5 }, 5);
    assert.equal(c.chargesDepensees, 1 + 1 + 5);
    assert.equal(c.chargesVieillard, true);
  });
});

describe("appliquerDeltasScores", () => {
  test("plancher à 0 et delta réellement appliqué", () => {
    const sd = { force: { score: 2 }, agilite: { score: 5 } };
    d.appliquerDeltasScores(sd, { force: -5, agilite: 2 }, ["force", "agilite"]);
    assert.deepEqual(sd.force, { score: 0, avantageBonus: -2 });
    assert.deepEqual(sd.agilite, { score: 7, avantageBonus: 2 });
  });
});

describe("Barre de jeton", () => {
  test("attributs gérés : pdv, densite, avec ou sans préfixe system.", () => {
    assert.equal(d.cleBarreJeton("pdv"), "pdv");
    assert.equal(d.cleBarreJeton("densite"), "densite");
    assert.equal(d.cleBarreJeton("system.pdv"), "pdv");
    assert.equal(d.cleBarreJeton("system.densite"), "densite");
    assert.equal(d.cleBarreJeton("ph"), null);
    assert.equal(d.cleBarreJeton(undefined), null);
  });

  test("valeur absolue ou delta, bornée entre 0 et le maximum", () => {
    assert.equal(d.valeurBarre(10, 20, 15), 15);
    assert.equal(d.valeurBarre(10, 20, -3, true), 7);
    assert.equal(d.valeurBarre(10, 20, 30, true), 20);
    assert.equal(d.valeurBarre(10, 20, -30, true), 0);
    assert.equal(d.valeurBarre(10, 20, 99), 20);
  });
});
