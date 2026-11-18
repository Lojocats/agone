import "./foundry-stubs.mjs";
import { test, describe } from "node:test";
import assert from "node:assert/strict";

const { luminositeMeteo, effetMeteoNatif, effetsFXMeteo, changementsScene, METEO_FX } = await import("../../module/helpers/meteo.mjs");
const { estMJActif, creerFile } = await import("../../module/helpers/mj.mjs");

describe("Météo — luminosité de la scène", () => {
  test("selon l'heure, sans météo", () => {
    assert.equal(luminositeMeteo(23, ""), 0);
    assert.equal(luminositeMeteo(4, ""), 0);
    assert.equal(luminositeMeteo(5, ""), 0.75);
    assert.equal(luminositeMeteo(6, ""), 0.45);
    assert.equal(luminositeMeteo(8, ""), 0.75);
    assert.equal(luminositeMeteo(18, ""), 0.35);
    assert.equal(luminositeMeteo(20, ""), 0.15);
    assert.equal(luminositeMeteo(undefined, ""), 0.75, "heure absente : 8 h");
  });

  test("la météo module la luminosité, bornée entre 0 et 1 et arrondie", () => {
    assert.equal(luminositeMeteo(12, "ensoleille"), 0.9);
    assert.equal(luminositeMeteo(12, "orage"), 0.5);
    assert.equal(luminositeMeteo(23, "orage"), 0);
    assert.equal(luminositeMeteo(12, "inconnue"), 0.75);
  });

  test("chaque météo du calendrier a une luminosité valide", () => {
    for (const { id } of CONFIG.AGONE.meteoTypes) {
      const l = luminositeMeteo(12, id);
      assert.ok(l >= 0 && l <= 1, id);
    }
  });
});

describe("Météo — effets", () => {
  test("effet natif de Foundry", () => {
    assert.equal(effetMeteoNatif("pluie"), "rain");
    assert.equal(effetMeteoNatif("orage"), "rainstorm");
    assert.equal(effetMeteoNatif("ensoleille"), "");
    assert.equal(effetMeteoNatif(""), "");
  });

  test("effets FXMaster filtrés selon les préférences du MJ", () => {
    assert.equal(effetsFXMeteo("pluie").length, 2);
    assert.deepEqual(effetsFXMeteo("pluie", { couleur: false }).map(e => e.type), ["rain"]);
    assert.deepEqual(effetsFXMeteo("pluie", { particules: false }).map(e => e.type), ["color"]);
    assert.deepEqual(effetsFXMeteo("orage", { couleur: false, particules: false }).map(e => e.type), ["lightning"]);
    assert.deepEqual(effetsFXMeteo(""), []);
  });

  test("les météos à effets FXMaster sont des météos du calendrier", () => {
    const ids = new Set(CONFIG.AGONE.meteoTypes.map(m => m.id));
    for (const id of Object.keys(METEO_FX)) assert.ok(ids.has(id), id);
  });
});

describe("Météo — mise à jour de la scène", () => {
  test("aucune modification si la scène est déjà dans l'état voulu", () => {
    assert.deepEqual(changementsScene({ weather: "rain", luminosite: 0.6 }, { weather: "rain", luminosite: 0.6 }), {});
    assert.deepEqual(changementsScene({ weather: "", luminosite: 0.9000000001 }, { weather: "", luminosite: 0.9 }), {});
    assert.deepEqual(changementsScene({ weather: null, luminosite: 0 }, { weather: "", luminosite: 0 }), {});
  });

  test("seuls les champs différents sont envoyés", () => {
    assert.deepEqual(changementsScene({ weather: "rain", luminosite: 0.6 }, { weather: "", luminosite: 0.6 }), { weather: "" });
    assert.deepEqual(changementsScene({ weather: "", luminosite: 0.6 }, { weather: "", luminosite: 0.75 }),
      { "environment.globalLight.luminosity": 0.75 });
    assert.deepEqual(changementsScene({}, { weather: "snow", luminosite: 0.7 }),
      { weather: "snow", "environment.globalLight.luminosity": 0.7 });
  });
});

describe("MJ actif", () => {
  const sauvegarde = { users: game.users, user: game.user };
  const restaurer = () => { game.users = sauvegarde.users; game.user = sauvegarde.user; };

  test("seul le client du MJ actif est retenu", () => {
    try {
      game.user = { isGM: true };
      game.users = { activeGM: { isSelf: true } };
      assert.equal(estMJActif(), true);
      game.users = { activeGM: { isSelf: false } };
      assert.equal(estMJActif(), false, "second MJ connecté");
    } finally { restaurer(); }
  });

  test("sans MJ actif connu : repli sur game.user.isGM", () => {
    try {
      game.users = { activeGM: null };
      game.user = { isGM: true };
      assert.equal(estMJActif(), true);
      game.user = { isGM: false };
      assert.equal(estMJActif(), false);
      game.users = undefined;
      game.user = undefined;
      assert.equal(estMJActif(), false);
    } finally { restaurer(); }
  });
});

describe("File d'attente", () => {
  const pause = ms => new Promise(r => setTimeout(r, ms));

  test("les tâches s'exécutent une à une, dans l'ordre des appels", async () => {
    const enfiler = creerFile();
    const journal = [];
    const tache = (nom, ms) => async () => { journal.push(`${nom}+`); await pause(ms); journal.push(`${nom}-`); return nom; };
    const resultats = await Promise.all([enfiler(tache("a", 20)), enfiler(tache("b", 1)), enfiler(tache("c", 5))]);
    assert.deepEqual(resultats, ["a", "b", "c"]);
    assert.deepEqual(journal, ["a+", "a-", "b+", "b-", "c+", "c-"]);
  });

  test("une tâche lit l'état laissé par la précédente", async () => {
    const enfiler = creerFile();
    let compteur = 0;
    const incrementer = async () => { const lu = compteur; await pause(2); compteur = lu + 1; };
    await Promise.all([enfiler(incrementer), enfiler(incrementer), enfiler(incrementer)]);
    assert.equal(compteur, 3);
  });

  test("l'échec d'une tâche est rendu à son appelant sans bloquer les suivantes", async () => {
    const enfiler = creerFile();
    const echec = enfiler(() => { throw new Error("raté"); });
    const suite = enfiler(() => "ok");
    await assert.rejects(echec, /raté/);
    assert.equal(await suite, "ok");
  });
});
