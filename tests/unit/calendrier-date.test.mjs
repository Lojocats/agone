import "./foundry-stubs.mjs";
import { test, describe } from "node:test";
import assert from "node:assert/strict";

const { avancerDate } = await import("../../module/helpers/calendrier-date.mjs");

const CAL = { nbMois: CONFIG.AGONE.calendrier.mois.length, joursParMois: CONFIG.AGONE.calendrier.joursParMois };
const date = (jour, mois, an, heure = 8, minute = 0) => ({ jour, mois, an, heure, minute });
const dernierMois = CAL.nbMois, dernierJour = CAL.joursParMois;

describe("Calendrier — avancer la date", () => {
  test("la date reçue n'est pas modifiée", () => {
    const d = date(1, 1, 1);
    avancerDate(d, 3, "jour", CAL);
    assert.deepEqual(d, date(1, 1, 1));
  });

  test("jours, mois et années simples", () => {
    assert.deepEqual(avancerDate(date(5, 2, 10), 1, "jour", CAL), date(6, 2, 10));
    assert.deepEqual(avancerDate(date(5, 2, 10), -1, "jour", CAL), date(4, 2, 10));
    assert.deepEqual(avancerDate(date(5, 2, 10), 1, "mois", CAL), date(5, 3, 10));
    assert.deepEqual(avancerDate(date(5, 2, 10), -1, "an", CAL), date(5, 2, 9));
  });

  test("deux avances successives s'additionnent (clics rapides)", () => {
    const une = avancerDate(date(5, 2, 10), 1, "jour", CAL);
    assert.deepEqual(avancerDate(une, 1, "jour", CAL), date(7, 2, 10));
  });

  test("débordements : jour → mois → année", () => {
    assert.deepEqual(avancerDate(date(dernierJour, 1, 3), 1, "jour", CAL), date(1, 2, 3));
    assert.deepEqual(avancerDate(date(1, 2, 3), -1, "jour", CAL), date(dernierJour, 1, 3));
    assert.deepEqual(avancerDate(date(dernierJour, dernierMois, 3), 1, "jour", CAL), date(1, 1, 4));
    assert.deepEqual(avancerDate(date(1, 1, 4), -1, "jour", CAL), date(dernierJour, dernierMois, 3));
    assert.deepEqual(avancerDate(date(4, dernierMois, 3), 1, "mois", CAL), date(4, 1, 4));
    assert.deepEqual(avancerDate(date(4, 1, 3), -1, "mois", CAL), date(4, dernierMois, 2));
  });

  test("débordements : minute (quart d'heure) → heure → jour", () => {
    assert.deepEqual(avancerDate(date(1, 1, 1, 8, 45), 1, "minute", CAL), date(1, 1, 1, 9, 0));
    assert.deepEqual(avancerDate(date(1, 1, 1, 8, 0), -1, "minute", CAL), date(1, 1, 1, 7, 45));
    assert.deepEqual(avancerDate(date(1, 1, 1, 23, 45), 1, "minute", CAL), date(2, 1, 1, 0, 0));
    assert.deepEqual(avancerDate(date(3, 1, 1, 20, 0), 12, "heure", CAL), date(4, 1, 1, 8, 0));
    assert.deepEqual(avancerDate(date(3, 1, 1, 2, 0), -3, "heure", CAL), date(2, 1, 1, 23, 0));
  });

  test("l'an 1 est le plancher", () => {
    assert.equal(avancerDate(date(1, 1, 1), -1, "an", CAL).an, 1);
    assert.equal(avancerDate(date(1, 1, 1), -1, "mois", CAL).an, 1);
  });

  test("delta invalide : date inchangée", () => {
    assert.deepEqual(avancerDate(date(5, 2, 10), NaN, "jour", CAL), date(5, 2, 10));
  });
});
