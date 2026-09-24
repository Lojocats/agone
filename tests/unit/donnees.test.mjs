import { fichier } from "./foundry-stubs.mjs";
import { test, describe } from "node:test";
import assert from "node:assert/strict";

const data = await import(fichier("module/helpers/compendium-data.mjs"));
const { texteEnHTML } = await import(fichier("module/migration.mjs"));
const { AGONE } = CONFIG;

const doublons = liste => liste.filter((n, i) => liste.indexOf(n) !== i);

describe("Données des compendiums (compendium-data.mjs)", () => {
  test("SORTS_DATA : sans doublon (nom + type de magie : un nom peut exister dans plusieurs domaines)", () => {
    assert.deepEqual(doublons(data.SORTS_DATA.map(s => `${s.name}|${s.typeMagie}`)), []);
  });

  for (const nom of ["ARMES_DATA", "BOUCLIERS_DATA", "ARMURES_DATA", "MANOEUVRES_DATA", "POUVOIRS_DATA",
                     "PEUPLES_DATA", "AVANTAGES_DATA", "PEINES_PERFIDIE_DATA", "BIENFAITS_PERFIDIE_DATA"]) {
    test(`${nom} : entrées nommées, sans doublon`, () => {
      const table = data[nom];
      assert.ok(Array.isArray(table) && table.length > 0, "table non vide");
      for (const e of table) assert.ok(typeof e.name === "string" && e.name.trim(), JSON.stringify(e).slice(0, 80));
      assert.deepEqual(doublons(table.map(e => e.name)), []);
    });
  }

  test("sorts : type de magie connu et seuil numérique", () => {
    const types = new Set(["jorniste", "obscurantiste", "eclipsiste", "accord", "cyse", "decorum", "geste"]);
    for (const s of data.SORTS_DATA) {
      assert.ok(types.has(s.typeMagie), `${s.name} : ${s.typeMagie}`);
      assert.equal(typeof s.seuil, "number", s.name);
    }
  });

  test("armes : style et type de dommages connus", () => {
    const styles = new Set(["melee", "jet", "trait", "bouclier"]);
    for (const a of [...data.ARMES_DATA, ...data.BOUCLIERS_DATA]) {
      assert.ok(styles.has(a.style ?? "melee"), `${a.name} : ${a.style}`);
    }
  });

  test("avantages : type avantage/défaut et coût de signe cohérent", () => {
    for (const a of data.AVANTAGES_DATA) {
      assert.ok(["avantage", "defaut"].includes(a.type), a.name);
      if (a.type === "defaut") assert.ok(a.charge <= 0, `${a.name} : coût ${a.charge}`);
    }
  });

  test("chaque bienfait cité par une peine a une description", () => {
    for (const p of data.PEINES_PERFIDIE_DATA.filter(p => p.bienfait)) {
      assert.ok(data.descriptionBienfait(p.bienfait), `${p.name} → ${p.bienfait}`);
    }
  });

  test("descriptionBienfait : chaîne vide pour un nom inconnu", () => {
    assert.equal(data.descriptionBienfait("Inconnu"), "");
    assert.equal(data.descriptionBienfait(undefined), "");
  });

  test("descriptionBienfaitPeine : texte du livre, sinon description propre de la peine", () => {
    const livre = data.descriptionBienfaitPeine({ system: { bienfait: "Hargne", bienfaitDescription: "" } });
    assert.equal(livre.texte, data.descriptionBienfait("Hargne"));
    assert.ok(livre.html.startsWith("<p>"));
    assert.equal(livre.personnalisee, false);

    const propre = data.descriptionBienfaitPeine({ system: { bienfait: "Hargne", bienfaitDescription: "<p>Texte <strong>maison</strong></p>" } });
    assert.equal(propre.html, "<p>Texte <strong>maison</strong></p>");
    assert.equal(propre.texte, "Texte maison");
    assert.equal(propre.personnalisee, true);

    const aucun = data.descriptionBienfaitPeine({ system: { bienfait: "", bienfaitDescription: "" } });
    assert.deepEqual(aucun, { html: "", texte: "", personnalisee: false });
  });

  test("compétences du système : nom, famille et caractéristique liée connue", () => {
    for (const c of AGONE.competences) {
      assert.ok(c.name, JSON.stringify(c));
      assert.ok(AGONE.attributs[c.attributLie], `${c.name} : ${c.attributLie}`);
    }
    assert.deepEqual(doublons(AGONE.competences.map(c => c.name)), []);
  });
});

describe("Migration : texteEnHTML", () => {
  test("paragraphes et retours à la ligne", () => {
    assert.equal(texteEnHTML("Ligne 1\nLigne 2\n\nParagraphe 2"), "<p>Ligne 1<br>Ligne 2</p><p>Paragraphe 2</p>");
  });

  test("caractères spéciaux échappés", () => {
    assert.equal(texteEnHTML("3 < 5 & 2 > 1"), "<p>3 &lt; 5 &amp; 2 &gt; 1</p>");
  });

  test("déjà du HTML, vide ou non textuel : pas de conversion", () => {
    assert.equal(texteEnHTML("<p>déjà</p>"), null);
    assert.equal(texteEnHTML("   "), null);
    assert.equal(texteEnHTML(""), null);
    assert.equal(texteEnHTML(undefined), null);
  });
});
