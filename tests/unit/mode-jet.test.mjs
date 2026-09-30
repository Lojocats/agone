import "./foundry-stubs.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { modeHistorique, modeMessage } from "../../module/helpers/mode-jet.mjs";

test("modeHistorique : noms v14 convertis, noms historiques conservés", () => {
  assert.equal(modeHistorique("public"), "publicroll");
  assert.equal(modeHistorique("gm"), "gmroll");
  assert.equal(modeHistorique("blind"), "blindroll");
  assert.equal(modeHistorique("self"), "selfroll");
  assert.equal(modeHistorique("gmroll"), "gmroll");
  assert.equal(modeHistorique(null), null);
  assert.equal(modeHistorique(""), null);
});

test("modeMessage : noms historiques convertis, noms v14 conservés", () => {
  assert.equal(modeMessage("publicroll"), "public");
  assert.equal(modeMessage("gmroll"), "gm");
  assert.equal(modeMessage("blindroll"), "blind");
  assert.equal(modeMessage("selfroll"), "self");
  assert.equal(modeMessage("gm"), "gm");
  assert.equal(modeMessage(undefined), null);
});

test("aller-retour stable entre les deux formes", () => {
  for (const m of ["publicroll", "gmroll", "blindroll", "selfroll"]) {
    assert.equal(modeHistorique(modeMessage(m)), m);
  }
});
