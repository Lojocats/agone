import { item } from "./foundry-stubs.mjs";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { danseurDuSort, sortEstLibre, sortsDuDanseur, lienDanseurDepuisNom } from "../../module/helpers/danseurs.mjs";

const danseur = (id, name = id) => item(name, "danseur", {}, { id });
const sort = (name, danseurId = "", danseurNom = "") => item(name, "sort", { danseurId, danseurNom });

describe("Lien sort → danseur par identifiant", () => {
  const danseurs = [danseur("d1", "Lyre"), danseur("d2", "Brume")];

  test("le sort appartient au danseur dont l'id correspond", () => {
    assert.equal(danseurDuSort(sort("S", "d2"), danseurs)?.id, "d2");
  });

  test("renommer le danseur ne casse pas le lien (le nom enregistré est ignoré)", () => {
    assert.equal(danseurDuSort(sort("S", "d1", "Ancien nom"), danseurs)?.id, "d1");
  });

  test("sans danseurId : sort libre, même si un ancien nom est enregistré", () => {
    assert.equal(danseurDuSort(sort("S", "", "Lyre"), danseurs), null);
    assert.ok(sortEstLibre(sort("S", "", "Lyre"), danseurs));
  });

  test("danseur supprimé (id introuvable) : le sort redevient libre", () => {
    assert.equal(danseurDuSort(sort("S", "disparu", "Lyre"), danseurs), null);
    assert.ok(sortEstLibre(sort("S", "disparu"), danseurs));
    assert.ok(!sortEstLibre(sort("S", "d1"), danseurs));
  });

  test("sortsDuDanseur : uniquement les sorts liés à ce danseur", () => {
    const sorts = [sort("A", "d1"), sort("B", "d2"), sort("C"), sort("D", "d1"), item("Arme", "arme", { danseurId: "d1" })];
    assert.deepEqual(sortsDuDanseur(sorts, "d1").map(s => s.name), ["A", "D"]);
    assert.deepEqual(sortsDuDanseur(sorts, "").map(s => s.name), []);
  });
});

describe("Migration 1.11.0 : danseurId depuis danseurNom", () => {
  const danseurs = [danseur("d1", "Lyre"), danseur("d2", "Brume")];

  test("ancien sort lié par nom : reçoit l'id du danseur de ce nom", () => {
    assert.deepEqual(lienDanseurDepuisNom({ danseurNom: "Brume" }, danseurs), { "system.danseurId": "d2" });
  });

  test("déjà migré : rien à faire (idempotent)", () => {
    assert.equal(lienDanseurDepuisNom({ danseurNom: "Brume", danseurId: "d2" }, danseurs), null);
  });

  test("sort libre, nom inconnu ou données absentes : rien à faire, sans erreur", () => {
    assert.equal(lienDanseurDepuisNom({ danseurNom: "" }, danseurs), null);
    assert.equal(lienDanseurDepuisNom({ danseurNom: "Inconnu" }, danseurs), null);
    assert.equal(lienDanseurDepuisNom({}, danseurs), null);
    assert.equal(lienDanseurDepuisNom(undefined, undefined), null);
  });
});
