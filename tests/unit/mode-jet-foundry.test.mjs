/**
 * Mode de jet courant et application à un message (Foundry v14 : core.messageMode, applyMode).
 */
import "./foundry-stubs.mjs";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { modeJetCourant, appliquerModeJet } from "../../module/helpers/mode-jet.mjs";

/**
 * Installe un faux Foundry : `reglages` = valeurs des réglages core, `enregistres` = clés
 * déclarées dans game.settings.settings, `methodes` = méthodes de ChatMessage disponibles.
 * Renvoie le journal des appels à ChatMessage.
 */
function foundryFactice({ reglages = {}, enregistres = [], methodes = [] }) {
  const appels = [];
  const lus = [];
  game.settings = {
    settings: new Map(enregistres.map(cle => [cle, {}])),
    get(ns, cle) {
      lus.push(`${ns}.${cle}`);
      return reglages[`${ns}.${cle}`];
    },
  };
  globalThis.ChatMessage = Object.fromEntries(methodes.map(nom => [nom, (data, mode) => {
    appels.push({ nom, data, mode });
    return { ...data, applique: `${nom}:${mode}` };
  }]));
  return { appels, lus };
}

// v14 garde applyRollMode (déprécié) et n'a plus le réglage core.rollMode
const v14 = (messageMode) => foundryFactice({
  reglages: { "core.messageMode": messageMode },
  enregistres: ["core.messageMode"],
  methodes: ["applyRollMode", "applyMode"],
});

describe("modeJetCourant", () => {
  test("v14 : lit core.messageMode et le convertit en nom historique", () => {
    for (const [message, historique] of [["public", "publicroll"], ["gm", "gmroll"], ["blind", "blindroll"], ["self", "selfroll"]]) {
      const { lus } = v14(message);
      assert.equal(modeJetCourant(), historique);
      assert.deepEqual(lus, ["core.messageMode"]);
    }
  });

  test("réglage vide : jet public par défaut", () => {
    v14("");
    assert.equal(modeJetCourant(), "publicroll");
  });

});

describe("appliquerModeJet", () => {
  const chatData = { content: "jet" };

  test("v14 : applyMode avec le nom v14, quelle que soit la forme reçue", () => {
    for (const [recu, attendu] of [["gmroll", "gm"], ["gm", "gm"], ["blindroll", "blind"], ["selfroll", "self"], ["publicroll", "public"]]) {
      const { appels } = v14("public");
      const resultat = appliquerModeJet(chatData, recu);
      assert.deepEqual(appels, [{ nom: "applyMode", data: chatData, mode: attendu }]);
      assert.equal(resultat.applique, `applyMode:${attendu}`);
    }
  });

  test("sans mode : le mode courant du chat est appliqué", () => {
    const { appels } = v14("self");
    appliquerModeJet(chatData);
    assert.deepEqual(appels.map(a => [a.nom, a.mode]), [["applyMode", "self"]]);
  });

  test("sans mode et réglage vide : jet public", () => {
    const { appels } = v14(undefined);
    appliquerModeJet(chatData);
    assert.equal(appels[0].mode, "public");
  });

  test("mode vide explicite : transmis vide à Foundry (pas de repli sur le mode courant)", () => {
    const { appels } = v14("gm");
    appliquerModeJet(chatData, null);
    assert.deepEqual(appels.map(a => [a.nom, a.mode]), [["applyMode", null]]);
  });
});
