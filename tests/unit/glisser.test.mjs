import "./foundry-stubs.mjs";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { indexPlusProche, estMultiColonnes, deposerAvant } from "../../module/helpers/glisser.mjs";

const rect = (left, top, width = 100, height = 40) => ({ left, top, right: left + width, bottom: top + height, width, height });

describe("Cible d'un dépôt de réordonnancement", () => {
  // Grille de deux colonnes : A B / C D
  const grille = [rect(0, 0), rect(110, 0), rect(0, 50), rect(110, 50)];
  // Liste simple : une ligne par item
  const liste = [rect(0, 0, 300), rect(0, 40, 300), rect(0, 80, 300)];

  test("grille : la carte de la bonne colonne est choisie, pas la première de la ligne", () => {
    assert.equal(indexPlusProche(grille, 150, 20), 1);
    assert.equal(indexPlusProche(grille, 150, 70), 3);
    assert.equal(indexPlusProche(grille, 20, 70), 2);
  });

  test("pointeur dans une gouttière ou hors des cartes : la carte la plus proche sur les deux axes", () => {
    assert.equal(indexPlusProche(grille, 104, 20), 0);
    assert.equal(indexPlusProche(grille, 106, 20), 1);
    assert.equal(indexPlusProche(grille, 150, 120), 3);
  });

  test("aucune ligne : -1", () => {
    assert.equal(indexPlusProche([], 10, 10), -1);
  });

  test("détection d'une disposition en colonnes", () => {
    assert.ok(estMultiColonnes(grille));
    assert.ok(!estMultiColonnes(liste));
    assert.ok(!estMultiColonnes([rect(0, 0)]));
  });

  test("liste : avant / après selon la moitié haute ou basse de la ligne", () => {
    assert.ok(deposerAvant(liste[1], 250, 45, false));
    assert.ok(!deposerAvant(liste[1], 10, 75, false));
  });

  test("grille : avant / après selon la moitié gauche ou droite de la carte", () => {
    assert.ok(deposerAvant(grille[1], 120, 38, true));
    assert.ok(!deposerAvant(grille[1], 200, 2, true));
  });
});
