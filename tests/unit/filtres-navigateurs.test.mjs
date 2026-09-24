import { fichier } from "./foundry-stubs.mjs";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const {
  auMoins, auPlus, malusAuPlus, avecSans, porteeArme,
  categoriesConditionManoeuvre, conditionManoeuvreCorrespond, estVolant,
  TYPES_EMPRISE, TYPES_ARTS, familleSort, instrumentsSorts, cleInstrument,
} = await import(fichier("module/helpers/filtres-navigateurs.mjs"));
const data = await import(fichier("module/helpers/compendium-data.mjs"));

const PEUPLES = data.PEUPLES_DATA.map(p => p.name);

describe("Filtres des navigateurs : comparaisons numériques", () => {
  test("auMoins : filtre vide (null / undefined) laisse tout passer", () => {
    assert.equal(auMoins(0, null), true);
    assert.equal(auMoins(-5, undefined), true);
    assert.equal(auMoins("abc", null), true);
  });

  test("auMoins : borne incluse", () => {
    assert.equal(auMoins(5, 5), true);
    assert.equal(auMoins(6, 5), true);
    assert.equal(auMoins(4, 5), false);
    assert.equal(auMoins("7", 5), true, "chaîne numérique");
  });

  test("auMoins : valeur absente ou non numérique vaut 0", () => {
    assert.equal(auMoins(undefined, 0), true);
    assert.equal(auMoins("—", 1), false);
    assert.equal(auMoins(null, 1), false);
  });

  test("auPlus : filtre vide laisse tout passer, borne incluse", () => {
    assert.equal(auPlus(99, null), true);
    assert.equal(auPlus(99, undefined), true);
    assert.equal(auPlus(3, 3), true);
    assert.equal(auPlus(4, 3), false);
    assert.equal(auPlus(2, 3), true);
  });

  test("auPlus : valeur non numérique vaut 0", () => {
    assert.equal(auPlus("x", 0), true);
    assert.equal(auPlus(undefined, 0), true);
  });

  test("malusAuPlus compare la valeur absolue du malus", () => {
    assert.equal(malusAuPlus(2, 2), true);
    assert.equal(malusAuPlus(-2, 2), true, "malus saisi en négatif");
    assert.equal(malusAuPlus(-3, 2), false);
    assert.equal(malusAuPlus(3, 2), false);
    assert.equal(malusAuPlus(undefined, 0), true);
    assert.equal(malusAuPlus(-10, null), true, "filtre vide");
  });
});

describe("Filtres des navigateurs : trois états", () => {
  test("avec / oui exigent la présence", () => {
    for (const f of ["avec", "oui"]) {
      assert.equal(avecSans(true, f), true);
      assert.equal(avecSans("texte", f), true);
      assert.equal(avecSans(false, f), false);
      assert.equal(avecSans("", f), false);
    }
  });

  test("sans / non exigent l'absence", () => {
    for (const f of ["sans", "non"]) {
      assert.equal(avecSans(false, f), true);
      assert.equal(avecSans("", f), true);
      assert.equal(avecSans(true, f), false);
    }
  });

  test("all ou valeur inconnue laisse tout passer", () => {
    for (const f of ["all", undefined, "", "autre"]) {
      assert.equal(avecSans(true, f), true);
      assert.equal(avecSans(false, f), true);
    }
  });
});

describe("Filtres des navigateurs : armes", () => {
  test("une portée renseignée est « distance »", () => {
    assert.equal(porteeArme("40 m"), "distance");
    assert.equal(porteeArme("FORx2 m"), "distance");
    assert.equal(porteeArme("  20 m "), "distance");
  });

  test("vide, null, undefined ou « — » est « contact »", () => {
    for (const p of ["", "   ", null, undefined, "—", " — "]) assert.equal(porteeArme(p), "contact", String(p));
  });

  test("chaque arme du livre de base a une catégorie de portée, les deux existent", () => {
    const cats = [...data.ARMES_DATA, ...data.BOUCLIERS_DATA].map(a => porteeArme(a.portee));
    assert.ok(cats.includes("distance"));
    assert.ok(cats.includes("contact"));
  });
});

describe("Filtres des navigateurs : conditions de manœuvre", () => {
  test("sans condition", () => {
    assert.deepEqual(categoriesConditionManoeuvre(""), ["sans"]);
    assert.deepEqual(categoriesConditionManoeuvre("   "), ["sans"]);
    assert.deepEqual(categoriesConditionManoeuvre(null), ["sans"]);
    assert.deepEqual(categoriesConditionManoeuvre(undefined), ["sans"]);
  });

  test("réaction, avec ou sans accent ni casse", () => {
    assert.deepEqual(categoriesConditionManoeuvre("Réaction"), ["reaction"]);
    assert.deepEqual(categoriesConditionManoeuvre("Réaction — contre une charge"), ["reaction"]);
    assert.deepEqual(categoriesConditionManoeuvre("Obtenir une MR ≥ 10 — réaction/action gratuite"), ["reaction"]);
  });

  test("« … uniquement » relève du peuple", () => {
    assert.deepEqual(categoriesConditionManoeuvre("Ogre uniquement"), ["peuple"]);
    assert.deepEqual(categoriesConditionManoeuvre("Farfadet uniquement", PEUPLES), ["peuple"]);
  });

  test("« Ogre, réaction » : réaction et peuple quand Ogre est un peuple connu", () => {
    assert.deepEqual(categoriesConditionManoeuvre("Ogre, réaction", ["Humain", "Ogre"]), ["reaction", "peuple"]);
    assert.deepEqual(categoriesConditionManoeuvre("Ogre, réaction", PEUPLES), ["reaction", "peuple"]);
  });

  test("sans liste de peuples, « Ogre, réaction » n'est qu'une réaction", () => {
    assert.deepEqual(categoriesConditionManoeuvre("Ogre, réaction"), ["reaction"]);
  });

  test("un peuple cité hors tête de condition ne compte pas (« Arme : Hache Ogre » → autre)", () => {
    assert.deepEqual(categoriesConditionManoeuvre("Arme : Hache Ogre — Rareté 12", PEUPLES), ["autre"]);
  });

  test("une condition ordinaire relève de « autre »", () => {
    assert.deepEqual(categoriesConditionManoeuvre("Avoir l'initiative", PEUPLES), ["autre"]);
    assert.deepEqual(categoriesConditionManoeuvre("Avoir une arme perforante"), ["autre"]);
  });

  test("« autre » n'accompagne jamais une autre catégorie", () => {
    for (const c of ["", "Réaction", "Ogre uniquement", "Ogre, réaction"]) {
      assert.ok(!categoriesConditionManoeuvre(c, PEUPLES).includes("autre"), c);
    }
  });

  test("conditionManoeuvreCorrespond : all / vide laisse tout passer", () => {
    assert.equal(conditionManoeuvreCorrespond("Avoir l'initiative", "all", PEUPLES), true);
    assert.equal(conditionManoeuvreCorrespond("Avoir l'initiative", "", PEUPLES), true);
    assert.equal(conditionManoeuvreCorrespond("Avoir l'initiative", undefined, PEUPLES), true);
  });

  test("conditionManoeuvreCorrespond : catégorie exigée", () => {
    assert.equal(conditionManoeuvreCorrespond("", "sans", PEUPLES), true);
    assert.equal(conditionManoeuvreCorrespond("Réaction", "sans", PEUPLES), false);
    assert.equal(conditionManoeuvreCorrespond("Ogre, réaction", "reaction", PEUPLES), true);
    assert.equal(conditionManoeuvreCorrespond("Ogre, réaction", "peuple", PEUPLES), true);
    assert.equal(conditionManoeuvreCorrespond("Lutin uniquement", "reaction", PEUPLES), false);
    assert.equal(conditionManoeuvreCorrespond("Avoir l'initiative", "autre", PEUPLES), true);
    assert.equal(conditionManoeuvreCorrespond("Réaction", "autre", PEUPLES), false);
    assert.equal(conditionManoeuvreCorrespond("", "autre", PEUPLES), false);
  });

  test("répartition des manœuvres du livre de base : 8 sans, 7 réaction, 12 peuple, le reste autre", () => {
    const compte = { sans: 0, reaction: 0, peuple: 0, autre: 0 };
    for (const m of data.MANOEUVRES_DATA) {
      for (const c of categoriesConditionManoeuvre(m.condition, PEUPLES)) compte[c]++;
    }
    // Recalcul indépendant des catégories à partir du texte brut
    const brut = m => (m.condition ?? "").trim();
    const norm = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    assert.equal(compte.sans, data.MANOEUVRES_DATA.filter(m => !brut(m)).length);
    assert.equal(compte.reaction, data.MANOEUVRES_DATA.filter(m => /\breaction\b/.test(norm(brut(m)))).length);
    const { autre, ...principales } = compte;
    assert.deepEqual(principales, { sans: 8, reaction: 7, peuple: 12 });
    assert.ok(autre > 0);
  });

  test("sans, réaction ∪ peuple et autre couvrent toutes les manœuvres, sans chevauchement", () => {
    const groupes = { sans: 0, reactionPeuple: 0, autre: 0 };
    for (const m of data.MANOEUVRES_DATA) {
      const cats = categoriesConditionManoeuvre(m.condition, PEUPLES);
      assert.ok(cats.length > 0, `« ${m.condition} » (${m.name}) sans catégorie`);
      const g = [cats.includes("sans"), cats.includes("reaction") || cats.includes("peuple"), cats.includes("autre")];
      assert.equal(g.filter(Boolean).length, 1, `${m.name} : ${cats.join(", ")}`);
      if (g[0]) groupes.sans++;
      else if (g[1]) groupes.reactionPeuple++;
      else groupes.autre++;
    }
    assert.equal(groupes.sans + groupes.reactionPeuple + groupes.autre, data.MANOEUVRES_DATA.length);
    assert.ok(groupes.autre > 0, "des conditions « autre »");
  });
});

describe("Filtres des navigateurs : peuples", () => {
  test("estVolant : vitesse de vol positive", () => {
    assert.equal(estVolant(18), true);
    assert.equal(estVolant("9"), true);
    assert.equal(estVolant(0), false);
    assert.equal(estVolant(undefined), false);
    assert.equal(estVolant(null), false);
    assert.equal(estVolant(-1), false);
  });

  test("le livre de base a des peuples volants et non volants", () => {
    const volants = data.PEUPLES_DATA.filter(p => estVolant(p.mvVolBase));
    assert.ok(volants.length > 0);
    assert.ok(volants.length < data.PEUPLES_DATA.length);
  });
});

describe("Filtres des navigateurs : sorts", () => {
  test("familles : Emprise et Arts magiques disjoints", () => {
    assert.deepEqual(TYPES_EMPRISE, ["jorniste", "obscurantiste", "eclipsiste"]);
    assert.deepEqual(TYPES_ARTS, ["accord", "cyse", "geste", "decorum"]);
    assert.equal(TYPES_EMPRISE.filter(t => TYPES_ARTS.includes(t)).length, 0);
  });

  test("familleSort, insensible à la casse", () => {
    assert.equal(familleSort("jorniste"), "emprise");
    assert.equal(familleSort("Eclipsiste"), "emprise");
    assert.equal(familleSort("ACCORD"), "arts");
    assert.equal(familleSort("decorum"), "arts");
  });

  test("familleSort : type inconnu ou vide → chaîne vide", () => {
    assert.equal(familleSort("inconnu"), "");
    assert.equal(familleSort(""), "");
    assert.equal(familleSort(null), "");
    assert.equal(familleSort(undefined), "");
  });

  test("chaque sort du livre de base a une famille", () => {
    const sansFamille = data.SORTS_DATA.filter(s => !familleSort(s.typeMagie)).map(s => `${s.name} (${s.typeMagie})`);
    assert.deepEqual(sansFamille, []);
  });

  test("instrumentsSorts : distincts, trimés, non vides, triés", () => {
    const sorts = [
      { instrument: "viole" }, { instrument: " harpe " }, { instrument: "" }, { instrument: null },
      {}, { instrument: "harpe" }, { instrument: "ete" }, { instrument: "cistre" },
    ];
    assert.deepEqual(instrumentsSorts(sorts), ["cistre", "ete", "harpe", "viole"]);
    assert.deepEqual(instrumentsSorts([]), []);
  });

  test("les sorts d'Accord utilisent 5 instruments", () => {
    const accord = instrumentsSorts(data.SORTS_DATA.filter(s => s.typeMagie === "accord"));
    assert.equal(accord.length, 5);
  });

  test("cleInstrument : clé i18n capitalisée", () => {
    assert.equal(cleInstrument("ete"), "AGONE.Ete");
    assert.equal(cleInstrument("flute"), "AGONE.Flute");
    assert.equal(cleInstrument(""), "AGONE.");
    assert.equal(cleInstrument(undefined), "AGONE.");
  });

  test("chaque instrument / saison des sorts a son libellé en fr et en", () => {
    const lire = chemin => JSON.parse(readFileSync(fichier(chemin), "utf8").replace(/^\uFEFF/, ""));
    const fr = lire("lang/fr.json"), en = lire("lang/en.json");
    const valeur = (o, cle) => cle.split(".").reduce((v, k) => v?.[k], o);
    for (const i of instrumentsSorts(data.SORTS_DATA)) {
      const cle = cleInstrument(i);
      assert.equal(typeof valeur(fr, cle), "string", `fr ${cle}`);
      assert.equal(typeof valeur(en, cle), "string", `en ${cle}`);
    }
  });
});
