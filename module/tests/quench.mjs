import { systemeBatch } from "./systeme.mjs";
import { donneesBatch } from "./donnees.mjs";
import { jetsBatch } from "./jets.mjs";
import { effetsBatch } from "./effets.mjs";
import { fichesBatch } from "./fiches.mjs";
import { navigateursBatch } from "./navigateurs.mjs";

/**
 * Tests d'intégration exécutés dans Foundry avec le module Quench
 * (https://github.com/Ethaks/FVTT-Quench) : onglet « Quench » de la barre latérale.
 * Chaque batch crée ses documents dans un dossier dédié et les supprime ensuite.
 * Les tests unitaires hors Foundry sont dans tests/unit (npm test).
 */
export function registerQuenchTests(quench) {
  const batchs = [
    ["agone.systeme",     systemeBatch,     "Agone : intégration du système"],
    ["agone.donnees",     donneesBatch,     "Agone : valeurs dérivées"],
    ["agone.jets",        jetsBatch,        "Agone : jets de dés"],
    ["agone.effets",      effetsBatch,      "Agone : effets actifs"],
    ["agone.fiches",      fichesBatch,      "Agone : fiches et éditeur d'effets"],
    ["agone.navigateurs", navigateursBatch, "Agone : navigateurs de compendium"],
  ];
  for (const [id, batch, displayName] of batchs) quench.registerBatch(id, batch, { displayName });
}
