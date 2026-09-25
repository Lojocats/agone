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

  test("descriptions pliables : chaque chevron a sa description, masquée par défaut", () => {
    for (const f of templates) {
      const src = readFileSync(f, "utf8");
      const nom = relative(racine, f);
      assert.doesNotMatch(src, /class="item-details/, `${nom} : <details> remplacé par .desc-bascule`);
      const chevrons = [...src.matchAll(/class="desc-bascule" data-desc="([^"]+)"/g)].map(m => m[1]);
      const descs = [...src.matchAll(/<[^>]*\bdesc-pliable\b[^>]*>/g)].map(m => m[0]);
      assert.equal(chevrons.length > 0, descs.length > 0, `${nom} : chevrons et descriptions vont ensemble`);
      for (const balise of descs) {
        assert.match(balise, /\shidden[\s>]/, `${nom} : description masquée par défaut`);
        const cle = balise.match(/data-desc-de="([^"]+)"/)?.[1];
        assert.ok(cle && chevrons.includes(cle), `${nom} : ${balise} sans chevron`);
      }
    }
  });

  test("carte de sort : le chevron précède le nom, pas de margin-left:auto qui le pousse sous les actions", () => {
    const magie = readFileSync(join(racine, "templates/actors/parts/magie.hbs"), "utf8");
    const carte = magie.match(/<div class="sort-card-top">[\s\S]*?<\/div>/)?.[0];
    assert.ok(carte, "bloc .sort-card-top trouvé");
    const posChevron = carte.indexOf("desc-bascule");
    const posNom = carte.indexOf("sort-card-name");
    assert.ok(posChevron >= 0 && posChevron < posNom, "le chevron précède le bouton du nom, hors de portée de .sort-card-actions");
    const css = readFileSync(join(racine, "css/magic.css"), "utf8");
    assert.doesNotMatch(css, /\.sort-card-top \.desc-bascule\s*\{\s*margin-left:\s*auto/, "le chevron n'est plus poussé à droite, sous .sort-card-actions");
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

  /** Hex codés en dur d'un extrait de CSS, hors d'un appel var(--jeton, #repli) actif. */
  function hexHorsVar(bloc) {
    return [...bloc.matchAll(/#[0-9a-fA-F]{3,6}\b/g)].filter(m => {
      const avant = bloc.slice(0, m.index);
      return avant.lastIndexOf("var(") <= avant.lastIndexOf(")");
    });
  }

  test("mode sombre : les jetons de texte contrastent assez avec le fond (≥ 6:1)", () => {
    const sombre = lire("css/base.css").match(/body\.agone-dark\s*\{[^}]*\}/)[0];
    const jeton = nom => sombre.match(new RegExp(`--agone-${nom}:\\s*(#[0-9a-f]{6})`, "i"))[1];
    const lum = hex => {
      const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map(c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const fond = lum(jeton("parchment"));
    for (const nom of ["dark-text", "brown", "brown-dark", "gold"]) {
      const ratio = (lum(jeton(nom)) + 0.05) / (fond + 0.05);
      assert.ok(ratio >= 6, `--agone-${nom} : contraste ${ratio.toFixed(1)}:1 sur le fond sombre`);
    }
  });

  test("icônes en CSS : la police Font Awesome 7 (Foundry v14) est citée avant la 6 (v13)", () => {
    for (const f of fichiers("css", ".css")) {
      for (const [, familles] of readFileSync(f, "utf8").matchAll(/font-family:\s*([^;]*Font Awesome[^;]*);/g)) {
        assert.match(familles, /"Font Awesome 7 Pro".*"Font Awesome 6 Pro"/, `${f} : ${familles}`);
      }
    }
  });

  test("paliers de Ténèbres non atteints : pas d'opacité sur la ligne entière en mode sombre", () => {
    // Une opacité sur la ligne s'ajoute à celle des cellules et rend le texte illisible
    const css = lire("css/base.css");
    assert.doesNotMatch(css, /\.palier-row:not\(\.palier-reached\)\s*\{[^}]*opacity/);
  });

  test("bouton fumble : couleurs sur jetons --agone-fumble-* avec repli, pas de hex en dur", () => {
    const css = lire("css/apps.css");
    for (const selecteur of [/\.agone \.fumble-btn\s*\{[^}]*\}/, /\.agone \.fumble-btn:hover\s*\{[^}]*\}/,
      /\.agone-fumble-btn\s*\{[^}]*\}/, /\.agone-fumble-btn:hover\s*\{[^}]*\}/]) {
      const bloc = css.match(selecteur)?.[0];
      assert.ok(bloc, `règle ${selecteur} introuvable dans apps.css`);
      assert.deepEqual(hexHorsVar(bloc), [], `hex en dur hors var() dans ${bloc}`);
    }
  });

  test("saisons du calendrier : couleurs sur jetons --agone-saison-* avec repli, pas de hex en dur", () => {
    const css = lire("css/apps.css");
    const bloc = css.match(/\.agone-calendrier-wrap \.cal-saison-printemps[\s\S]*?\.agone-calendrier-wrap \.cal-saison-hiver\s*\{[^}]*\}/)?.[0];
    assert.ok(bloc, "règles .cal-saison-* introuvables dans apps.css");
    assert.deepEqual(hexHorsVar(bloc), [], `hex en dur hors var() dans ${bloc}`);
  });
});

describe("Fenêtres (fiches et navigateurs)", () => {
  test("la fiche d'objet est redimensionnable et mesure 560×620", () => {
    const source = lire("module/sheets/item-sheet.mjs");
    const position = source.match(/position:\s*\{\s*width:\s*(\d+),\s*height:\s*(\d+)\s*\}/);
    assert.ok(position, "position introuvable dans item-sheet.mjs");
    assert.equal(Number(position[1]), 560);
    assert.equal(Number(position[2]), 620);
    assert.match(source, /window\s*:\s*\{\s*resizable:\s*true\s*\}/, "la fiche d'objet doit être resizable");
  });

  test("les navigateurs héritent du gabarit commun 900×660 d'AgoneBrowser, sauf besoin réel", () => {
    const base = lire("module/apps/agone-browser.mjs");
    assert.match(base, /position:\s*\{\s*width:\s*900,\s*height:\s*660\s*\}/, "gabarit commun 900×660 dans la classe de base");
    assert.match(base, /window\s*:\s*\{\s*resizable:\s*true\s*\}/, "la base des navigateurs doit être resizable");

    // Les navigateurs sans besoin de largeur particulière n'ont plus de surcharge de position.
    // manoeuvres-browser garde la sienne (980×600) : ses colonnes (portée, dégâts, type, description…)
    // sont plus nombreuses que dans les autres navigateurs et ont besoin de cette largeur supplémentaire.
    for (const nom of ["armes-browser", "armures-browser", "sorts-browser", "pouvoirs-browser",
      "competences-browser", "peines-browser", "peuples-browser", "avantages-browser"]) {
      const src = lire(`module/apps/${nom}.mjs`);
      assert.doesNotMatch(src, /position:\s*\{/, `${nom} ne doit plus surcharger position`);
    }
  });
});

describe("Accessibilité", () => {
  /** Un <button> ne contenant qu'une icône (fa-*, pas de texte visible) a besoin d'un aria-label. */
  function estIconeSeule(interieur) {
    let s = interieur;
    s = s.replace(/<i\b[^<>]*>[\s\S]*?<\/i>/g, "");
    s = s.replace(/<i\b[^<>]*\/?>/g, "");
    s = s.replace(/\{\{#(if|unless|each)\b[^}]*\}\}/g, "");
    s = s.replace(/\{\{\/(if|unless|each)\}\}/g, "");
    s = s.replace(/\{\{else\}\}/g, "");
    s = s.replace(/<[^>]+>/g, "");
    return s.trim() === "";
  }

  test("tout <button> ne contenant qu'une icône a un aria-label", () => {
    const manquants = [];
    for (const f of templates) {
      const src = readFileSync(f, "utf8");
      for (const m of src.matchAll(/<button\b([^<>]*)>([\s\S]*?)<\/button>/g)) {
        const [, attrs, interieur] = m;
        if (estIconeSeule(interieur) && !/\baria-label=/.test(attrs)) {
          manquants.push(`${relative(racine, f)} : <button${attrs}>`);
        }
      }
    }
    assert.deepEqual(manquants, []);
  });

  test("css/controls.css définit un anneau de focus clavier cohérent (:focus-visible)", () => {
    const css = lire("css/controls.css");
    const regle = css.match(/([^{}]*:focus-visible[^{}]*)\{([^}]*)\}/);
    assert.ok(regle, "règle :focus-visible introuvable dans controls.css");
    const [, selecteurs, corps] = regle;
    for (const cible of [".agone button", ".agone [role=\"button\"]", ".agone a",
      ".roll-btn-small", ".btn-icon", ".sheet-tabs .item"]) {
      assert.ok(selecteurs.includes(cible), `${cible} absent du sélecteur :focus-visible`);
    }
    assert.match(corps, /outline:\s*2px solid var\(--agone-gold/, "outline sur --agone-gold avec repli");
    assert.match(corps, /outline-offset:\s*1px/, "outline-offset: 1px");
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
