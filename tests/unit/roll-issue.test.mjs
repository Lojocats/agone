import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { issueJet } from "../../module/helpers/roll-issue.mjs";

describe("Issue d'un jet (carte de résultat)", () => {
  test("sans seuil : neutre, aucun écart", () => {
    assert.deepEqual(issueJet({ total: 12 }), {
      issueClass: null, resultatSucces: null, ecartSeuil: null, ecartSigne: null,
    });
  });

  test("seuil atteint : succès, écart positif", () => {
    const r = issueJet({ total: 15, seuil: 12 });
    assert.equal(r.issueClass, "succes");
    assert.equal(r.resultatSucces, true);
    assert.equal(r.ecartSeuil, "+3");
    assert.equal(r.ecartSigne, "positif");
  });

  test("seuil non atteint : échec, écart négatif avec signe typographique −", () => {
    const r = issueJet({ total: 9, seuil: 12 });
    assert.equal(r.issueClass, "echec");
    assert.equal(r.resultatSucces, false);
    assert.equal(r.ecartSeuil, "−3");
    assert.equal(r.ecartSigne, "negatif");
  });

  test("seuil exactement atteint : succès, écart +0 positif", () => {
    const r = issueJet({ total: 12, seuil: 12 });
    assert.equal(r.issueClass, "succes");
    assert.equal(r.ecartSeuil, "+0");
    assert.equal(r.ecartSigne, "positif");
  });

  test("seuil fourni en chaîne", () => {
    const r = issueJet({ total: 15, seuil: "12" });
    assert.equal(r.issueClass, "succes");
    assert.equal(r.ecartSeuil, "+3");
  });

  test("seuil non numérique (NaN, vide, absent) : traité comme neutre", () => {
    for (const seuil of [undefined, null, "", "abc", NaN]) {
      const r = issueJet({ total: 15, seuil });
      assert.equal(r.issueClass, null, `seuil=${seuil}`);
      assert.equal(r.resultatSucces, null, `seuil=${seuil}`);
      assert.equal(r.ecartSeuil, null, `seuil=${seuil}`);
    }
  });

  test("priorité : fumble prime sur critique et sur succès/échec", () => {
    const r = issueJet({ total: 20, seuil: 5, fumble: true, critique: true });
    assert.equal(r.issueClass, "fumble");
    // L'écart au seuil reste calculé indépendamment de la priorité d'affichage
    assert.equal(r.ecartSeuil, "+15");
  });

  test("priorité : critique prime sur succès/échec quand pas de fumble", () => {
    const r = issueJet({ total: 3, seuil: 12, critique: true });
    assert.equal(r.issueClass, "critique");
    assert.equal(r.ecartSeuil, "−9");
  });

  test("fumble ou critique sans seuil numérique : classe posée, pas d'écart", () => {
    assert.equal(issueJet({ total: 1, fumble: true }).issueClass, "fumble");
    assert.equal(issueJet({ total: 1, fumble: true }).ecartSeuil, null);
    assert.equal(issueJet({ total: 15, critique: true }).issueClass, "critique");
  });
});
