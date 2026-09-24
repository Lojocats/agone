/**
 * Vérifications statiques des fichiers du système : traductions, templates, CSS, manifeste.
 */
import { fichier } from "./foundry-stubs.mjs";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";
import Handlebars from "handlebars";
import * as csstree from "css-tree";

const racine = fileURLToPath(fichier(""));
const lire = chemin => readFileSync(join(racine, chemin), "utf8").replace(/^\uFEFF/, "");
function fichiers(dossier, ext) {
  const out = [];
  (function parcourir(d) {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) parcourir(p);
      else if (p.endsWith(ext)) out.push(p);
    }
  })(join(racine, dossier));
  return out;
}
function aplatir(obj, prefixe = "") {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? aplatir(v, `${prefixe}${k}.`) : [[`${prefixe}${k}`, v]]);
}

const fr = Object.fromEntries(aplatir(JSON.parse(lire("lang/fr.json"))));
const en = Object.fromEntries(aplatir(JSON.parse(lire("lang/en.json"))));
const params = texte => [...String(texte).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
const templates = fichiers("templates", ".hbs");
const modules = fichiers("module", ".mjs");

describe("Traductions", () => {
  test("mêmes clés en français et en anglais", () => {
    assert.deepEqual(Object.keys(fr).filter(k => !(k in en)), [], "absentes de en.json");
    assert.deepEqual(Object.keys(en).filter(k => !(k in fr)), [], "absentes de fr.json");
  });

  test("mêmes paramètres {…} en français et en anglais", () => {
    for (const k of Object.keys(fr)) assert.deepEqual(params(en[k]), params(fr[k]), k);
  });

  test("aucune traduction vide", () => {
    for (const [k, v] of [...Object.entries(fr), ...Object.entries(en)]) assert.ok(String(v).trim(), k);
  });

  test("toute clé AGONE.* citée dans les templates et le code existe", () => {
    const manquantes = new Set();
    for (const f of [...templates, ...modules]) {
      for (const [, cle] of readFileSync(f, "utf8").matchAll(/["'`](AGONE\.[A-Za-z0-9_.]+?)["'`]/g)) {
        if (cle.endsWith(".")) continue;                          // préfixes construits dynamiquement
        const estPrefixe = Object.keys(fr).some(k => k.startsWith(`${cle}.`));
        if (!(cle in fr) && !estPrefixe && !cle.startsWith("AGONE.Nouvel")) manquantes.add(`${cle} (${relative(racine, f)})`);
      }
    }
    assert.deepEqual([...manquantes], []);
  });

  test("{{localize}} avec paramètres : tous les paramètres de la traduction sont fournis", () => {
    for (const f of templates) {
      for (const m of readFileSync(f, "utf8").matchAll(/\{\{localize "([^"]+)"((?:\s+\w+=(?:"[^"]*"|[^\s}]+))*)\s*\}\}/g)) {
        const attendus = params(fr[m[1]] ?? "");
        const fournis = [...m[2].matchAll(/(\w+)=/g)].map(x => x[1]);
        for (const p of attendus) assert.ok(fournis.includes(p), `${relative(racine, f)} : ${m[1]} sans ${p}`);
      }
    }
  });
});

describe("Templates Handlebars", () => {
  for (const f of templates) {
    test(`${relative(racine, f)} compile`, () => {
      assert.doesNotThrow(() => Handlebars.precompile(readFileSync(f, "utf8")));
    });
  }

  test("tout template ou partial cité existe", () => {
    const cites = new Set();
    for (const f of [...templates, ...modules]) {
      for (const [, chemin] of readFileSync(f, "utf8").matchAll(/systems\/agone\/(templates\/[\w/.-]+\.hbs)/g)) cites.add(chemin);
    }
    for (const chemin of cites) assert.ok(existsSync(join(racine, chemin)), chemin);
  });

  test("chaque type d'item et d'acteur a son template de fiche", () => {
    const manifeste = JSON.parse(lire("system.json"));
    for (const type of Object.keys(manifeste.documentTypes.Item)) {
      assert.ok(existsSync(join(racine, `templates/items/${type}-sheet.hbs`)), `item ${type}`);
    }
    for (const type of Object.keys(manifeste.documentTypes.Actor)) {
      assert.ok(existsSync(join(racine, `templates/actors/${type}-sheet.hbs`)), `acteur ${type}`);
    }
  });
});

describe("CSS", () => {
  for (const f of fichiers("css", ".css")) {
    test(`${relative(racine, f)} est valide`, () => {
      const erreurs = [];
      csstree.parse(readFileSync(f, "utf8"), { onParseError: e => erreurs.push(`${e.line}: ${e.message}`) });
      assert.deepEqual(erreurs, []);
    });
  }

  test("agone.css importe tous les fichiers partiels", () => {
    const imports = [...lire("css/agone.css").matchAll(/@import '([^']+)'/g)].map(m => m[1]);
    const partiels = readdirSync(join(racine, "css")).filter(f => f !== "agone.css");
    assert.deepEqual(partiels.filter(p => !imports.includes(p)), []);
  });
});

describe("Manifeste (system.json)", () => {
  const manifeste = JSON.parse(lire("system.json"));

  test("version au format X.Y.Z et entrée correspondante dans le CHANGELOG", () => {
    assert.match(manifeste.version, /^\d+\.\d+\.\d+$/);
    assert.ok(lire("CHANGELOG.md").includes(`## [${manifeste.version}]`), `CHANGELOG sans ${manifeste.version}`);
  });

  test("fichiers déclarés présents (module, styles, langues)", () => {
    for (const chemin of [...manifeste.esmodules, ...manifeste.styles, ...manifeste.languages.map(l => l.path)]) {
      assert.ok(existsSync(join(racine, chemin)), chemin);
    }
  });

  test("chaque type déclaré a son DataModel", () => {
    const agone = lire("module/agone.mjs");
    for (const type of [...Object.keys(manifeste.documentTypes.Actor), ...Object.keys(manifeste.documentTypes.Item)]) {
      assert.match(agone, new RegExp(`\\b${type}\\s*:\\s*\\w+Data\\b`), type);
    }
  });
});
