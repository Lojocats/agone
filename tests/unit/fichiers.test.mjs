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

describe("Traductions sans clé morte", () => {
  // Clés produites par un constructeur dynamique (aucune citation littérale possible) :
  const manifeste = JSON.parse(lire("system.json"));
  const typesItem = Object.keys(manifeste.documentTypes.Item).map(t => t.charAt(0).toUpperCase() + t.slice(1));
  const CLES_DYNAMIQUES = [
    /^TYPES\./,                                          // noms de types lus par Foundry
    /^AGONE\.Des\./,                                     // _L("…") de documents/actor.mjs
    /^AGONE\.(Attribut|Abr)\./,                          // `AGONE.Attribut.${Cle}`, `AGONE.Abr.${cle}`
    /^AGONE\.(Peine|Bienfait)\./,                        // paliers de Ténèbres, origines de démon
    /^AGONE\.Tenebres(Palier|Bienfait)Tooltip\d+$/,      // `AGONE.TenebresPalierTooltip${seuil}`
    /^AGONE\.SanteLabel\d+(Hint|Defaut)?$/,              // réglages santeLabel* et sante.mjs
    new RegExp(`^AGONE\\.Nouvel(${typesItem.join("|")})$`), // `AGONE.Nouvel${Type}` à la création d'un objet
    /^AGONE\.Peuple(Changer|Retirer)Avertissement$/,     // cle.replace(/Confirm$/, "Avertissement")
  ];

  test("toute clé de lang/fr.json est citée dans le code ou les templates, ou produite dynamiquement", () => {
    const citees = new Set();
    for (const f of [...templates, ...modules]) {
      for (const [cle] of readFileSync(f, "utf8").matchAll(/AGONE\.[A-Za-z0-9_.]*[A-Za-z0-9_]/g)) citees.add(cle);
    }
    const mortes = Object.keys(fr).filter(k => !citees.has(k) && !CLES_DYNAMIQUES.some(re => re.test(k)));
    assert.deepEqual(mortes, [], "clés de traduction que plus rien n'utilise : à retirer de fr.json et en.json");
  });

  test("chaque motif de clé dynamique correspond encore à des clés existantes", () => {
    for (const re of CLES_DYNAMIQUES) assert.ok(Object.keys(fr).some(k => re.test(k)), `motif sans clé : ${re}`);
  });
});

describe("Templates Handlebars", () => {
  for (const f of templates) {
    test(`${relative(racine, f)} compile`, () => {
      assert.doesNotThrow(() => Handlebars.precompile(readFileSync(f, "utf8")));
    });
  }

  test("tout partial {{> …}} utilisé dans un template est enregistré dans loadTemplates", () => {
    // Liste passée à loadTemplates dans agone.mjs (tableau nommé ou littéral) ; à défaut, tout le fichier
    const agone = lire("module/agone.mjs");
    const variable = agone.match(/loadTemplates\(\s*(\w+)\s*\)/)?.[1];
    const liste = (variable && agone.match(new RegExp(`\\b${variable}\\s*=\\s*\\[([\\s\\S]*?)\\]`))?.[1])
      ?? agone.match(/loadTemplates\(\s*\[([\s\S]*?)\]/)?.[1]
      ?? agone;
    const enregistres = new Set([...liste.matchAll(/["'`]([^"'`]+\.hbs)["'`]/g)].map(m => m[1]));
    assert.ok(enregistres.size > 0, "liste des templates de loadTemplates trouvée dans agone.mjs");

    // Parcours de l'AST Handlebars : partials appelés et partials {{#*inline}} définis sur place
    const manquants = new Set();
    for (const f of templates) {
      const utilises = new Set();
      const enLigne = new Set();
      (function visiter(noeud) {
        if (!noeud || typeof noeud !== "object") return;
        if (Array.isArray(noeud)) return noeud.forEach(visiter);
        if (noeud.type === "PartialStatement" || noeud.type === "PartialBlockStatement") {
          // Un nom dynamique ({{> (lookup …)}}) ne peut pas être vérifié statiquement
          if (noeud.name.type !== "SubExpression") utilises.add(String(noeud.name.original));
        }
        if (noeud.type === "DecoratorBlock" && noeud.path?.original === "inline") {
          enLigne.add(String(noeud.params[0]?.original));
        }
        for (const cle of ["body", "program", "inverse"]) visiter(noeud[cle]);
      })(Handlebars.parse(readFileSync(f, "utf8")));
      for (const nom of utilises) {
        if (nom === "@partial-block" || enLigne.has(nom) || enregistres.has(nom)) continue;
        manquants.add(`${nom} (${relative(racine, f)})`);
      }
    }
    assert.deepEqual([...manquants], []);
  });

  describe("helpers", () => {
    // Fournis par Handlebars ou par le cœur de Foundry (client/applications/handlebars.mjs)
    const HELPERS_NATIFS = new Set([
      "if", "unless", "each", "with", "lookup", "log",
      "localize", "eq", "ne", "lt", "gt", "lte", "gte", "not", "and", "or", "concat", "checked", "disabled",
      "selectOptions", "numberFormat", "numberInput", "formInput", "formGroup", "formField", "editor",
      "filePicker", "ifThen", "object", "radioBoxes", "rangePicker", "timeSince",
    ]);
    const enregistres = new Set([...lire("module/helpers/handlebars.mjs").matchAll(/registerHelper\("(\w+)"/g)].map(m => m[1]));

    /** Helpers appelés dans un template : blocs, sous-expressions et moustaches avec arguments. */
    function helpersAppeles(source) {
      const noms = new Set();
      (function visiter(noeud) {
        if (!noeud || typeof noeud !== "object") return;
        if (Array.isArray(noeud)) return noeud.forEach(visiter);
        const chemin = noeud.path;
        if (["MustacheStatement", "BlockStatement", "SubExpression"].includes(noeud.type) && chemin?.type === "PathExpression") {
          const nomSimple = chemin.parts.length === 1 && !chemin.data && chemin.depth === 0 && chemin.original === chemin.parts[0];
          const appel = noeud.type !== "MustacheStatement" || noeud.params.length > 0 || Boolean(noeud.hash);
          if (nomSimple && appel) noms.add(chemin.original);
        }
        for (const cle of ["body", "program", "inverse", "params", "hash", "pairs", "value"]) visiter(noeud[cle]);
      })(Handlebars.parse(source));
      return noms;
    }
    const appeles = new Map();
    for (const f of templates) {
      for (const nom of helpersAppeles(readFileSync(f, "utf8"))) appeles.set(nom, relative(racine, f));
    }

    test("le parcours repère blocs, sous-expressions et moustaches avec arguments", () => {
      assert.deepEqual([...helpersAppeles("{{#ifGT a 1}}{{multiply b 2}}{{/ifGT}}{{#if (or c d)}}{{e}}{{f.g}}{{/if}}")].sort(),
        ["if", "ifGT", "multiply", "or"]);
    });

    test("tout helper appelé par un template est enregistré par le système ou fourni par Foundry", () => {
      const inconnus = [...appeles].filter(([nom]) => !enregistres.has(nom) && !HELPERS_NATIFS.has(nom))
        .map(([nom, fichier]) => `${nom} (${fichier})`);
      assert.deepEqual(inconnus, []);
    });

    test("tout helper enregistré par le système est appelé par un template", () => {
      assert.ok(enregistres.size > 0, "helpers trouvés dans module/helpers/handlebars.mjs");
      assert.deepEqual([...enregistres].filter(nom => !appeles.has(nom)), [], "helpers inutilisés : à retirer de handlebars.mjs");
    });
  });

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

  test("carte de sort : la boîte d'actions est sur sa propre ligne, pas superposée au reste de la carte", () => {
    // Depuis la 1.9.13, .sort-card-actions n'est plus en position absolute dans le coin
    // haut-droit (qui recouvrait le chevron et nécessitait le hack pointer-events) : elle suit
    // le flux normal, en dernière ligne de la carte, donc ne peut plus rien recouvrir.
    const css = readFileSync(join(racine, "css/magic.css"), "utf8");
    const actions = css.match(/\.agone \.sort-card-actions\s*\{[^}]*\}/)?.[0];
    assert.ok(actions, ".sort-card-actions trouvée");
    assert.doesNotMatch(actions, /position:\s*absolute/, ".sort-card-actions ne doit plus être positionnée par-dessus la carte");
  });

  test("carte de compétence : actions sous la carte, pas de largeur réservée sur l'en-tête", () => {
    const controls = readFileSync(join(racine, "css/controls.css"), "utf8");
    const compActions = controls.match(/\.agone \.comp-card-actions\s*\{[^}]*\}/)?.[0];
    assert.ok(compActions, ".comp-card-actions trouvée");
    assert.doesNotMatch(compActions, /position:\s*absolute/, ".comp-card-actions ne doit plus être positionnée par-dessus la carte");

    const compHeader = controls.match(/\.agone \.comp-card-header\s*\{[^}]*\}/)?.[0];
    assert.ok(compHeader, ".comp-card-header trouvée");
    assert.doesNotMatch(compHeader, /padding-right/, ".comp-card-header ne réserve plus de place pour les actions");

    const magie = readFileSync(join(racine, "css/magic.css"), "utf8");
    const sortTop = magie.match(/\.agone \.sort-card-top\s*\{[^}]*\}/)?.[0];
    assert.ok(sortTop, ".sort-card-top trouvée");
    assert.doesNotMatch(sortTop, /padding-right/, ".sort-card-top ne réserve plus de place pour les actions");
  });

  test("lignes de dons, pouvoirs et armures : passent à la ligne plutôt que de déborder sur un nom long", () => {
    const magie  = readFileSync(join(racine, "css/magic.css"), "utf8");
    const combat = readFileSync(join(racine, "css/combat.css"), "utf8");
    for (const [nom, css] of [["don-row", magie], ["pouvoir-row", magie], ["armure-row", combat]]) {
      const bloc = css.match(new RegExp(`\\.agone \\.${nom}\\s*\\{[^}]*\\}`))?.[0];
      assert.ok(bloc, `.${nom} trouvée`);
      assert.match(bloc, /flex-wrap:\s*wrap/, `.${nom} doit passer à la ligne (flex-wrap)`);
    }
  });

  test("dons et pouvoirs : boutons éditer/supprimer regroupés dans .row-actions", () => {
    const avantages = readFileSync(join(racine, "templates/actors/parts/avantages.hbs"), "utf8");
    const magie     = readFileSync(join(racine, "templates/actors/parts/magie.hbs"), "utf8");
    for (const [nom, src] of [["avantages.hbs", avantages], ["magie.hbs", magie]]) {
      const blocs = [...src.matchAll(/<div class="row-actions">[\s\S]*?<\/div>/g)].map(m => m[0]);
      assert.ok(blocs.length > 0, `${nom} : au moins une .row-actions trouvée`);
      for (const bloc of blocs) {
        assert.match(bloc, /item-edit/, `${nom} : .row-actions contient item-edit`);
        assert.match(bloc, /item-delete/, `${nom} : .row-actions contient item-delete`);
      }
    }
  });

  test("carte de jet : classes d'issue et badge d'écart au seuil", () => {
    const src = lire("templates/chat/roll-result.hbs");
    assert.match(src, /roll-issue-\{\{issueClass\}\}/, "classe d'issue absente de .agone-roll-card");
    assert.match(src, /roll-ecart/, "badge d'écart au seuil absent");
    assert.match(src, /AGONE\.Des\.EcartSeuil/, "clé de traduction de l'écart absente");
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

  describe("classes mortes", () => {
    // Préfixes de classes assemblées à l'exécution (`prefixe-{{valeur}}` ou `prefixe-${valeur}`)
    const PREFIXES_DYNAMIQUES = ["cmp-type-", "av-sect-", "pnb-cat-", "cal-saison-", "man-badge-", "score-"];
    // Classes posées par Foundry (fenêtres, éditeur) ou conventions de fiches reprises telles quelles
    const CLASSES_FOUNDRY = new Set(["window-app", "window-header", "window-title", "header-button", "editor",
      "item-control", "rollable"]);
    const sources = [...templates, ...modules].map(f => readFileSync(f, "utf8")).join("\n");
    const jetons = new Set(sources.match(/[A-Za-z_][\w-]*/g));

    /** Classes d'une feuille de style que rien ne référence (jeton entier dans templates/ ou module/). */
    function classesMortes(css) {
      const mortes = new Set();
      csstree.walk(csstree.parse(css), noeud => {
        if (noeud.type !== "ClassSelector") return;
        const nom = noeud.name;
        if (jetons.has(nom) || CLASSES_FOUNDRY.has(nom) || PREFIXES_DYNAMIQUES.some(p => nom.startsWith(p))) return;
        mortes.add(nom);
      });
      return [...mortes];
    }

    test("toute classe définie dans css/ est utilisée par un template ou un module", () => {
      const mortes = fichiers("css", ".css").flatMap(f => classesMortes(readFileSync(f, "utf8")).map(c => `.${c} (${relative(racine, f)})`));
      assert.deepEqual(mortes, [], "classes CSS que plus rien n'utilise : supprimer leurs règles");
    });

    test("une classe inconnue est bien signalée, une classe dynamique ou de Foundry ne l'est pas", () => {
      assert.deepEqual(classesMortes(".agone .classe-jamais-utilisee-zz, .agone .score-7, .window-app .roll-btn { color: red; }"),
        ["classe-jamais-utilisee-zz"]);
    });

    test("chaque préfixe dynamique déclaré est réellement assemblé dans un template ou un module", () => {
      for (const p of PREFIXES_DYNAMIQUES) assert.ok(sources.includes(`${p}{{`) || sources.includes(`${p}$` + "{"),`préfixe ${p} jamais assemblé`);
    });
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

  test("aucun emoji ou pictogramme unicode utilisé comme icône dans les templates", () => {
    // Liste fermée de codepoints d'icônes (engrenage, dé, étoile, croix, flèche de reset, lune…)
    // remplacés par des <i class="fas fa-…">. Les autres caractères spéciaux (tirets typographiques,
    // guillemets, flèches de commentaire, opérateurs mathématiques dans les données) sont légitimes.
    const INTERDITS = [0x2699, 0x2726, 0x2605, 0x2606, 0x2713, 0x2714, 0x2715, 0x2716, 0x21BB, 0x1F319, 0x1F3B2];
    const trouves = [];
    for (const f of templates) {
      const src = readFileSync(f, "utf8");
      for (const car of src) {
        if (INTERDITS.includes(car.codePointAt(0))) trouves.push(`${relative(racine, f)} : U+${car.codePointAt(0).toString(16)} (${car})`);
      }
    }
    assert.deepEqual(trouves, []);
  });

  test("jeton --agone-accent posé par onglet (ténèbres/perfidie, magie, combat)", () => {
    const css = lire("css/header.css");
    assert.match(css, /\[data-tab="tenebres"\][\s\S]{0,80}--agone-accent:\s*var\(--agone-noir\)/);
    assert.match(css, /\[data-tab="perfidie"\][\s\S]{0,120}--agone-accent:\s*var\(--agone-noir\)/);
    assert.match(css, /\[data-tab="magie"\][\s\S]{0,80}--agone-accent:\s*var\(--agone-txt-bleu/);
    assert.match(css, /\[data-tab="combat"\][\s\S]{0,80}--agone-accent:\s*var\(--agone-red\)/);
  });

  test("onglet actif : le texte reste doré, l'accent ne colore que le filet (contraste sur la barre brune)", () => {
    const css = lire("css/header.css");
    const bloc = css.match(/\.agone \.sheet-tabs \.item\.active\s*\{([^}]*)\}/)?.[1];
    assert.ok(bloc, "règle .sheet-tabs .item.active introuvable dans header.css");
    assert.match(bloc, /color:\s*var\(--agone-gold\)/, "le texte de l'onglet actif doit rester doré");
    assert.doesNotMatch(bloc, /^\s*color:\s*var\(--agone-accent/m, "le texte de l'onglet actif ne doit pas utiliser --agone-accent");
    assert.match(bloc, /border-bottom-color:\s*var\(--agone-accent/, "le filet actif porte l'accent");
  });

  test("boutons icône : taille ≥ 26px (.roll-btn-small, .btn-icon, .item-create, .item-edit, .item-delete)", () => {
    const css = lire("css/controls.css");
    const regles = [
      /\.agone \.roll-btn-small\s*\{([^}]*)\}/,
      /\.agone \.btn-icon,\s*\n\.agone \.item-create\s*\{([^}]*)\}/,
      /\.agone \.item-edit, \.agone \.item-delete\s*\{([^}]*)\}/,
    ];
    for (const re of regles) {
      const bloc = css.match(re)?.[1];
      assert.ok(bloc, `règle ${re} introuvable dans controls.css`);
      const largeur = Number(bloc.match(/width:\s*(\d+)px/)?.[1]);
      const hauteur = Number(bloc.match(/height:\s*(\d+)px/)?.[1]);
      assert.ok(largeur >= 26, `largeur ${largeur}px < 26px dans ${bloc.trim()}`);
      assert.ok(hauteur >= 26, `hauteur ${hauteur}px < 26px dans ${bloc.trim()}`);
    }
  });

  test("noms des cartes de compétences et de sorts : hauteur automatique (noms sur deux lignes)", () => {
    for (const [f, sel] of [["css/controls.css", "comp-card-name"], ["css/magic.css", "sort-card-name"]]) {
      const bloc = lire(f).match(new RegExp(`\\.agone \\.${sel}\\s*\\{[^}]*\\}`))?.[0];
      assert.ok(bloc, `règle .${sel} introuvable dans ${f}`);
      assert.match(bloc, /height:\s*auto/, `.${sel} doit avoir height: auto`);
    }
  });

  test("Flamme et Flamme noire : libellés colorés par jetons du thème", () => {
    const css = lire("css/attributes.css");
    assert.match(css, /\.txt-flamme\.txt-flamme\s*\{\s*color:\s*var\(--agone-txt-orange\)/);
    assert.match(css, /\.txt-flamme-noire\.txt-flamme-noire\s*\{\s*color:\s*var\(--agone-txt-violet\)/);
    for (const f of ["templates/actors/parts/attributs.hbs", "templates/actors/personnage-sheet.hbs"]) {
      const hbs = lire(f);
      assert.match(hbs, /class="txt-flamme">\{\{localize "AGONE\.Flamme"\}\}/, `${f} : libellé Flamme`);
      assert.match(hbs, /class="txt-flamme-noire">\{\{localize "AGONE\.FlammeNoire"\}\}/, `${f} : libellé Flamme noire`);
      // Même valeur de Flamme noire (classes identiques, halo compris) dans l'en-tête et l'onglet Attributs
      assert.match(hbs, /txt-flamme-noire flamme-glow"[^>]*>\{\{system\.flammeNoire\}\}/, `${f} : valeur de Flamme noire`);
    }
    // Plus de règle .flamme-noire propre à l'en-tête qui écraserait la couleur commune
    assert.doesNotMatch(lire("css/header.css"), /\.flamme-noire\s*[,{]/);
    assert.match(css, /\.flamme-glow\.txt-flamme\s*\{[^}]*text-shadow/);
    assert.match(css, /\.flamme-glow\.txt-flamme-noire\s*\{[^}]*text-shadow/);
  });

  test("paliers de Ténèbres non atteints : pas d'opacité sur la ligne entière en mode sombre", () => {
    // Une opacité sur la ligne s'ajoute à celle des cellules et rend le texte illisible
    const css = lire("css/base.css");
    assert.doesNotMatch(css, /\.palier-row:not\(\.palier-reached\)\s*\{[^}]*opacity/);
  });

  test("saisons du calendrier : couleurs sur jetons --agone-saison-* avec repli, pas de hex en dur", () => {
    const css = lire("css/apps.css");
    const bloc = css.match(/\.agone-calendrier-wrap \.cal-saison-printemps[\s\S]*?\.agone-calendrier-wrap \.cal-saison-hiver\s*\{[^}]*\}/)?.[0];
    assert.ok(bloc, "règles .cal-saison-* introuvables dans apps.css");
    assert.deepEqual(hexHorsVar(bloc), [], `hex en dur hors var() dans ${bloc}`);
  });

  /** base.css sans commentaires. */
  const baseSansCommentaires = () => lire("css/base.css").replace(/\/\*[\s\S]*?\*\//g, "");

  test("mode sombre : pas de couleur hex recopiée dans les surcharges de base.css (hors jetons des sections 1 et 1a)", () => {
    // Plafond fixé au nombre restant après le passage aux jetons : le mode sombre doit passer
    // par les jetons --agone-* (règle claire avec repli), pas par de nouvelles surcharges en hex.
    const PLAFOND = 0;
    const jetons = /^body\.agone-dark( \.(application|window-app)\.agone)?$/;
    const trouves = [];
    for (const [, selecteur, decl] of baseSansCommentaires().matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const parties = selecteur.split(",").map(s => s.trim().replace(/\s+/g, " "));
      if (!parties.some(s => s.startsWith("body.agone-dark")) || parties.every(s => jetons.test(s))) continue;
      trouves.push(...hexHorsVar(decl).map(m => `${parties[0]} : ${m[0]}`));
    }
    assert.ok(trouves.length <= PLAFOND, `${trouves.length} hex en dur (plafond ${PLAFOND}) :\n${trouves.join("\n")}`);
  });

  test("base.css : aucun !important nouveau", () => {
    // Plafond : le seul restant bat le fond thématisé que Foundry pose sur la fenêtre (section 1a)
    const PLAFOND = 1;
    const n = baseSansCommentaires().match(/!important/g)?.length ?? 0;
    assert.ok(n <= PLAFOND, `${n} !important dans base.css (plafond ${PLAFOND})`);
  });

  test("animations.css est importé en dernier et neutralise prefers-reduced-motion", () => {
    const imports = [...lire("css/agone.css").matchAll(/@import '([^']+)'/g)].map(m => m[1]);
    assert.equal(imports.at(-1), "animations.css", "animations.css doit être importé en dernier");
    const anim = lire("css/animations.css");
    assert.match(anim, /@media \(prefers-reduced-motion:\s*reduce\)/, "bloc prefers-reduced-motion absent");
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
