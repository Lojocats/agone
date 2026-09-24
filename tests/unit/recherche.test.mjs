import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  normaliser, analyserRequete, distance, rechercher, comparerPertinence, plagesSurlignage,
} from "../../module/helpers/recherche.mjs";

const SORTS = [
  { name: "Boule de feu",        description: "Une sphère de flammes." },
  { name: "Mur de flammes",      description: "Un rideau de feu infranchissable." },
  { name: "Œil du démon",        description: "Voir à travers les ténèbres." },
  { name: "Fulgurance",          description: "Rapidité hors du commun." },
  { name: "Lame d'éther",        description: "<p>Une <strong>lame</strong> immatérielle.</p>" },
];
const noms = r => r.resultats.map(e => e.name);

describe("Recherche des navigateurs", () => {
  test("normalisation : accents, casse, ligatures, apostrophes", () => {
    assert.equal(normaliser("Œil du Démon"), "oeil du demon");
    assert.equal(normaliser("Lame d’Éther"), "lame d'ether");
  });

  test("analyse : termes, expressions, exclusions, nom:", () => {
    const r = analyserRequete(`feu "mur de" -boule nom:lame`);
    assert.deepEqual(r.termes, [
      { texte: "feu", nomSeul: false }, { texte: "mur de", nomSeul: false }, { texte: "lame", nomSeul: true },
    ]);
    assert.deepEqual(r.exclus, ["boule"]);
  });

  test("distance d'édition bornée", () => {
    assert.equal(distance("fulgurance", "fulgurence"), 1);
    assert.equal(distance("abc", "abc"), 0);
    assert.equal(distance("abcdef", "uvwxyz", 2), 3);
  });

  test("requête vide : tout, inactif", () => {
    const r = rechercher(SORTS, "  ", ["name", "description"]);
    assert.equal(r.actif, false);
    assert.equal(r.resultats.length, SORTS.length);
  });

  test("sans accent ni casse", () => {
    assert.deepEqual(noms(rechercher(SORTS, "OEIL demon", ["name"])), ["Œil du démon"]);
    assert.deepEqual(noms(rechercher(SORTS, "ether", ["name"])), ["Lame d'éther"]);
  });

  test("plusieurs mots dans n'importe quel ordre et n'importe quel champ", () => {
    assert.deepEqual(noms(rechercher(SORTS, "feu mur", ["name", "description"])), ["Mur de flammes"]);
  });

  test("exclusion", () => {
    assert.deepEqual(noms(rechercher(SORTS, "feu -boule", ["name", "description"])), ["Mur de flammes"]);
  });

  test("nom: ne cherche que dans le nom", () => {
    assert.deepEqual(noms(rechercher(SORTS, "nom:feu", ["name", "description"])), ["Boule de feu"]);
  });

  test("le HTML des descriptions est ignoré", () => {
    assert.deepEqual(noms(rechercher(SORTS, "strong", ["name", "description"])), []);
    assert.deepEqual(noms(rechercher(SORTS, "immaterielle", ["name", "description"])), ["Lame d'éther"]);
  });

  test("faute de frappe : résultats approchants", () => {
    const r = rechercher(SORTS, "fulgurence", ["name"]);
    assert.equal(r.approximatif, true);
    assert.deepEqual(noms(r), ["Fulgurance"]);
    assert.equal(rechercher(SORTS, "fulgurance", ["name"]).approximatif, false);
    assert.deepEqual(noms(rechercher(SORTS, "zzz", ["name"])), []);
  });

  test("pertinence : le nom passe avant la description", () => {
    const r = rechercher(SORTS, "feu", ["name", "description"]);
    const tries = [...r.resultats].sort(comparerPertinence(r.scores, (a, b) => a.name.localeCompare(b.name)));
    assert.deepEqual(tries.map(e => e.name), ["Boule de feu", "Mur de flammes"]);
  });

  test("sans recherche, l'ordre habituel est conservé", () => {
    const ordre = (a, b) => a.name.localeCompare(b.name);
    assert.equal(comparerPertinence(new Map(), ordre), ordre);
  });

  test("surlignage : plages dans le texte d'origine", () => {
    assert.deepEqual(plagesSurlignage("Boule de feu", "feu boule"), [[0, 5], [9, 12]]);
    assert.deepEqual(plagesSurlignage("Œil du démon", "oeil demon"), [[0, 3], [7, 12]]);
    assert.deepEqual(plagesSurlignage("Fulgurance", "-fulgurance"), []);
  });
});
