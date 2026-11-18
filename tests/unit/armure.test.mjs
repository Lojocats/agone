import { item } from "./foundry-stubs.mjs";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { armureEffective, bouclierEffectif, armureStockeeAReinitialiser } from "../../module/helpers/armure.mjs";

const armure = (name, system) => item(name, "armure", { portee: false, protection: 0, malusAgi: 0, malusPer: 0, type: "0", ...system });
const bouclier = (name, system) => item(name, "arme", { style: "bouclier", equipe: false, ...system });

describe("armureEffective", () => {
  const stockee = { nom: "Fantôme", type: "2", portee: true, protection: 6, malusAgi: 3, malusPer: 3 };

  test("armure portée : les valeurs viennent de l'item, pas de la copie stockée", () => {
    const items = [armure("Cuir", { portee: true, protection: 2, malusAgi: 1, malusPer: 1, type: "1" })];
    assert.deepEqual(armureEffective(stockee, items),
      { nom: "Cuir", type: "1", portee: true, protection: 2, malusAgi: 1, malusPer: 1 });
  });

  test("modifier l'item porté se répercute aussitôt", () => {
    const cuir = armure("Cuir", { portee: true, protection: 2 });
    assert.equal(armureEffective(stockee, [cuir]).protection, 2);
    cuir.system.protection = 4;
    assert.equal(armureEffective(stockee, [cuir]).protection, 4);
  });

  test("des armures mais aucune portée : pas d'armure (plus de protection fantôme)", () => {
    const items = [armure("Cuir", { protection: 2, malusAgi: 1 })];
    assert.deepEqual(armureEffective(stockee, items),
      { nom: "", type: "0", portee: false, protection: 0, malusAgi: 0, malusPer: 0 });
  });

  test("plusieurs armures portées : protection et malus d'AGI cumulés, malus de PER le plus fort", () => {
    const items = [
      armure("Cuirasse", { portee: true, protection: 2, malusAgi: 1, malusPer: 1, type: "1" }),
      armure("Casque",   { portee: true, protection: 1, malusAgi: 0, malusPer: 3, type: "2" }),
      armure("Rangée",   { protection: 5, malusAgi: 5 }),
    ];
    const a = armureEffective(stockee, items);
    assert.deepEqual([a.protection, a.malusAgi, a.malusPer, a.nom], [3, 1, 3, "Cuirasse, Casque"]);
  });

  test("aucun item d'armure : les valeurs stockées restent utilisées (saisie par macro ou import)", () => {
    assert.deepEqual(armureEffective(stockee, [bouclier("Écu", { equipe: true })]), stockee);
    assert.deepEqual(armureEffective({ protection: 3, malusAgi: 2 }, []), { protection: 3, malusAgi: 2 });
  });

  test("données absentes : pas d'erreur", () => {
    assert.deepEqual(armureEffective(undefined, undefined), {});
  });
});

describe("bouclierEffectif", () => {
  const stocke = { nom: "Fantôme", portee: true, defenseBonus: 3, protection: 2, malusAgi: 1 };

  test("bouclier équipé : valeurs de l'item", () => {
    const items = [bouclier("Rondache", { equipe: true, defenseBonus: 1, protection: 1, malusAgi: 0 })];
    assert.deepEqual(bouclierEffectif(stocke, items),
      { nom: "Rondache", portee: true, defenseBonus: 1, protection: 1, malusAgi: 0 });
  });

  test("des boucliers mais aucun équipé : pas de bouclier", () => {
    assert.deepEqual(bouclierEffectif(stocke, [bouclier("Rondache", { defenseBonus: 1 })]),
      { nom: "", portee: false, defenseBonus: 0, protection: 0, malusAgi: 0 });
  });

  test("une arme équipée qui n'est pas un bouclier ne compte pas", () => {
    const epee = item("Épée", "arme", { style: "melee", equipe: true, defenseBonus: 2 });
    assert.deepEqual(bouclierEffectif(stocke, [epee]), stocke);
  });
});

describe("Migration 1.11.0 : copies d'armure et de bouclier stockées sur l'acteur", () => {
  const defaut = { armure: { nom: "", type: "0", portee: false, protection: 0, malusAgi: 0, malusPer: 0 },
                   bouclier: { nom: "", portee: false, defenseBonus: 0, protection: 0, malusAgi: 0 } };

  test("personnage : copie d'une armure supprimée remise à zéro", () => {
    const system = { ...defaut, armure: { nom: "Cuir", type: "1", portee: true, protection: 2, malusAgi: 1, malusPer: 1 } };
    const maj = armureStockeeAReinitialiser("personnage", system, []);
    assert.equal(maj["system.armure.portee"], false);
    assert.equal(maj["system.armure.protection"], 0);
    assert.equal(maj["system.armure.malusAgi"], 0);
    assert.equal(maj["system.armure.nom"], "");
    assert.ok(!("system.bouclier.portee" in maj));
  });

  test("personnage sans item d'armure : valeurs saisies sans nom (macro, import) conservées", () => {
    const system = { ...defaut, armure: { nom: "", type: "0", portee: true, protection: 2, malusAgi: 1, malusPer: 0 } };
    assert.equal(armureStockeeAReinitialiser("personnage", system, []), null);
  });

  test("personnage : copie d'un bouclier supprimé remise à zéro", () => {
    const system = { ...defaut, bouclier: { nom: "Écu", portee: true, defenseBonus: 2, protection: 1, malusAgi: 1 } };
    const maj = armureStockeeAReinitialiser("personnage", system, []);
    assert.equal(maj["system.bouclier.portee"], false);
    assert.equal(maj["system.bouclier.defenseBonus"], 0);
  });

  test("PNJ avec une armure portée : la copie stockée est effacée (la valeur vient désormais de l'item)", () => {
    const items = [armure("Cuir", { portee: true, protection: 3, malusAgi: 2 })];
    assert.deepEqual(armureStockeeAReinitialiser("pnj", { armure: { protection: 3, malusAgi: 2 } }, items),
      { "system.armure.protection": 0, "system.armure.malusAgi": 0 });
  });

  test("PNJ sans item d'armure : la saisie stockée est conservée", () => {
    assert.equal(armureStockeeAReinitialiser("pnj", { armure: { protection: 3, malusAgi: 2 } }, []), null);
  });

  test("déjà à zéro, autre type d'acteur ou données absentes : rien à faire", () => {
    assert.equal(armureStockeeAReinitialiser("personnage", defaut, []), null);
    assert.equal(armureStockeeAReinitialiser("compagnon", { armure: { protection: 3 } }, []), null);
    assert.equal(armureStockeeAReinitialiser("personnage", undefined, undefined), null);
  });
});
