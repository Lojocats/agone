import { fichier } from "./foundry-stubs.mjs";
import { test, describe } from "node:test";
import assert from "node:assert/strict";

const dj = await import(fichier("module/helpers/dialogue-jet.mjs"));
const fx = await import(fichier("module/helpers/effets.mjs"));

describe("Dialogues de jet", () => {
  test("le titre est échappé", () => {
    const html = dj.contenuDialogueJet(`Attaque — <img src=x onerror="alert(1)">`, []);
    assert.ok(!html.includes("<img"), "pas de balise injectée");
    assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
    assert.match(html, /class="agone-roll-dialog"/);
  });

  test("les lignes vides sont ignorées", () => {
    const html = dj.contenuDialogueJet("Jet", ["", dj.champNombre("modif", "Bonus", { autofocus: true }), null]);
    assert.match(html, /<input type="number" id="modif" name="modif" value="0" autofocus\/>/);
    assert.ok(!html.includes("null"));
  });

  test("champNombre : minimum facultatif", () => {
    assert.match(dj.champNombre("seuilBonus", "Seuil", { min: 0 }), /name="seuilBonus" value="0" min="0"\/>/);
  });

  test("champCase : cochée ou non, libellé relié", () => {
    assert.match(dj.champCase("typeJet", "Ouvert", { coche: true }), /name="typeJet" checked \/>\s*<label for="typeJet">Ouvert<\/label>/);
    assert.ok(!dj.champCase("heroisme", "PH").includes("checked"));
  });

  test("champSelect : options échappées, sélection", () => {
    const html = dj.champSelect("attrChosen", "Attribut", [
      { value: "agilite", label: "Agilité <b>", selected: true },
      { value: `x"y`, label: "Autre" },
    ]);
    assert.match(html, /<option value="agilite" selected>Agilité &lt;b&gt;<\/option>/);
    assert.match(html, /<option value="x&quot;y">Autre<\/option>/);
  });

  test("boutons : Lancer lit le formulaire, Annuler sans callback", () => {
    const [lancer, annuler] = dj.boutonsDialogueJet(el => ({ modif: Number(el.modif.value) }));
    assert.equal(lancer.action, "lancer");
    assert.equal(lancer.default, true);
    assert.deepEqual(lancer.callback(null, { form: { elements: { modif: { value: "3" } } } }), { modif: 3 });
    assert.equal(annuler.action, "annuler");
    assert.equal(annuler.callback, undefined);
  });
});

describe("changeEffet sans CONST.ACTIVE_EFFECT_MODES (déprécié en v14)", () => {
  test("modes numériques stables, sans lire la constante dépréciée", () => {
    const original = globalThis.CONST;
    globalThis.CONST = new Proxy({}, { get(_c, prop) { throw new Error(`CONST.${String(prop)} lu`); } });
    try {
      assert.equal(fx.changeEffet("agilite", 2).mode, 2);
      assert.equal(fx.changeEffet("mv_divisor", 3).mode, 4);
      assert.equal(fx.changeEffet("charges_double", true).mode, 5);
    } finally {
      globalThis.CONST = original;
    }
  });
});
