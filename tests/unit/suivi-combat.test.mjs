import "./foundry-stubs.mjs";
import { test, describe } from "node:test";
import assert from "node:assert/strict";

const { estDeplacementSeul, concerneCombat } = await import("../../module/helpers/suivi-combat.mjs");

const acteur = (id, extra = {}) => ({ id, uuid: `Actor.${id}`, documentName: "Actor", ...extra });
const heros = acteur("heros");
const baseGobelin = acteur("gobelin");
const gobelinToken = acteur("gobelin", { uuid: "Scene.s.Token.t2.Actor.gobelin", isToken: true });
const combat = {
  id: "c1",
  combatants: [
    { id: "cb1", actorId: "heros", tokenId: "t1", actor: heros, token: { id: "t1", actor: heros } },
    { id: "cb2", actorId: "gobelin", tokenId: "t2", actor: gobelinToken, token: { id: "t2", actor: gobelinToken } },
  ],
};

describe("Tracker de combat — déplacement d'un token", () => {
  test("x / y seuls (et autres champs de position) : déplacement", () => {
    assert.equal(estDeplacementSeul({ _id: "t1", x: 100, y: 200 }), true);
    assert.equal(estDeplacementSeul({ x: 100 }), true);
    assert.equal(estDeplacementSeul({ _id: "t1", x: 1, y: 2, elevation: 5, rotation: 90 }), true);
  });

  test("tout autre champ, ou aucune modification : pas un simple déplacement", () => {
    assert.equal(estDeplacementSeul({ _id: "t1", x: 1, hidden: true }), false);
    assert.equal(estDeplacementSeul({ _id: "t1", name: "Gobelin" }), false);
    assert.equal(estDeplacementSeul({ _id: "t1", delta: { system: { pdv: { valeur: 3 } } } }), false);
    assert.equal(estDeplacementSeul({ _id: "t1" }), false);
    assert.equal(estDeplacementSeul(undefined), false);
  });
});

describe("Tracker de combat — évènements à redessiner", () => {
  test("combats : toujours, même sans combat actif", () => {
    for (const nom of ["createCombat", "updateCombat", "deleteCombat"]) {
      assert.equal(concerneCombat(nom, { id: "autre" }, {}, null), true, nom);
      assert.equal(concerneCombat(nom, { id: "autre" }, {}, combat), true, nom);
    }
  });

  test("sans combat actif : rien d'autre ne redessine", () => {
    assert.equal(concerneCombat("updateActor", heros, {}, null), false);
    assert.equal(concerneCombat("updateToken", { id: "t1" }, { hidden: true }, null), false);
    assert.equal(concerneCombat("createCombatant", { parent: { id: "c1" } }, {}, null), false);
  });

  test("combattants : seulement ceux du combat actif", () => {
    assert.equal(concerneCombat("updateCombatant", { parent: combat }, {}, combat), true);
    assert.equal(concerneCombat("createCombatant", { parent: { id: "c1" } }, {}, combat), true);
    assert.equal(concerneCombat("deleteCombatant", { parent: { id: "c2" } }, {}, combat), false);
  });

  test("acteurs : ceux du combat, y compris l'acteur d'un token non lié et son acteur de base", () => {
    assert.equal(concerneCombat("updateActor", heros, {}, combat), true);
    assert.equal(concerneCombat("updateActor", gobelinToken, {}, combat), true);
    assert.equal(concerneCombat("updateActor", { ...gobelinToken }, {}, combat), true, "même uuid, autre instance");
    assert.equal(concerneCombat("updateActor", baseGobelin, {}, combat), true);
    assert.equal(concerneCombat("updateActor", acteur("passant"), {}, combat), false);
    const autreToken = acteur("gobelin", { uuid: "Scene.s.Token.t9.Actor.gobelin", isToken: true });
    assert.equal(concerneCombat("updateActor", autreToken, {}, combat), false, "autre token du même acteur de base");
  });

  test("tokens : ceux du combat, sauf pour un simple déplacement", () => {
    assert.equal(concerneCombat("updateToken", { id: "t1" }, { _id: "t1", x: 5, y: 6 }, combat), false);
    assert.equal(concerneCombat("updateToken", { id: "t1" }, { _id: "t1", hidden: true }, combat), true);
    assert.equal(concerneCombat("updateToken", { id: "t9" }, { _id: "t9", hidden: true }, combat), false);
  });

  test("effets actifs : sur un acteur du combat ou sur un de ses items", () => {
    assert.equal(concerneCombat("createActiveEffect", { parent: heros }, {}, combat), true);
    assert.equal(concerneCombat("updateActiveEffect", { parent: { documentName: "Item", parent: heros } }, {}, combat), true);
    assert.equal(concerneCombat("deleteActiveEffect", { parent: acteur("passant") }, {}, combat), false);
    assert.equal(concerneCombat("createActiveEffect", { parent: { documentName: "Item", parent: null } }, {}, combat), false);
  });
});
