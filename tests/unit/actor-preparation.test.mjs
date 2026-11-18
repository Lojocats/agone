import { fichier, item } from "./foundry-stubs.mjs";
import { test, describe } from "node:test";
import assert from "node:assert/strict";

// AgoneActor étend la classe globale `Actor` : faux cœur minimal, propre à ce fichier de test
// (le cœur renvoie `this.system` lui-même depuis getRollData).
globalThis.Actor = class {
  getRollData() { return this.system; }
  async modifyTokenAttribute(...args) { this.appelCoeur = args; return this; }
};
const hooks = [];
globalThis.Hooks = { call: (...args) => { hooks.push(args); return true; } };

const { AgoneActor } = await import(fichier("module/documents/actor.mjs"));
const { effetsNeutres } = await import(fichier("module/helpers/effets.mjs"));
const { AGONE } = CONFIG;

/** `system` d'un personnage tel que le laisse PersonnageData#prepareDerivedData (avant les effets). */
function systemePersonnage({ scores = {}, aspects = {}, tai = 0, supp = [], phMax = 0 } = {}) {
  const s = { agilite: 5, force: 5, perception: 5, resistance: 5, intelligence: 5, volonte: 5, charisma: 5, creativite: 5, ...scores };
  const a = { corps: 3, esprit: 3, ame: 3, ...aspects };
  const sd = {
    peuple: "Humain", typeMage: "eclipsiste", tai, tenebres: 0, noirceur: 0, mvOverride: null,
    pdv: { valeur: 10, max: 0, bonusDe: 0 },
    ph: { valeur: 0, max: phMax },
    ptsCreationComp: { max: 120 }, ptsCharges: { max: 5 },
    bonusAttributsSupp: supp,
    armure: {}, bouclier: {},
  };
  for (const [k, v] of Object.entries(s)) sd[k] = { score: v };
  for (const [k, v] of Object.entries(a)) sd[k] = { score: v, noir: 0 };
  sd.corpsNoirTotal = sd.espritNoirTotal = sd.ameNoirTotal = 0;
  sd.bonusCorps = a.corps; sd.bonusEsprit = a.esprit; sd.bonusAme = a.ame;
  sd.flamme = Math.min(a.corps, a.esprit, a.ame);
  if (sd.ph.max === 0) sd.ph.max = sd.flamme * 2;
  const bpdv = AGONE.peuplesData.humain?.bpdv ?? AGONE.lookupTai(AGONE.taiToBpdv, tai);
  sd.pdv.max = bpdv + s.resistance * 3;
  sd.attributes = { hp: { value: sd.pdv.valeur, min: 0, max: sd.pdv.max } };
  sd.mv = AGONE.lookupTai(AGONE.taiToMv, tai);
  sd.bd = AGONE.lookupBd(s.force, tai);
  sd.modPoids = AGONE.lookupTai(AGONE.taiToModPoids, tai);
  sd.chargeMax = (s.force + s.resistance) * sd.modPoids;
  sd.demiCharge = Math.floor(sd.chargeMax / 2);
  sd.melee = Math.floor((s.force + s.agilite * 2) / 3);
  sd.tir = Math.floor((s.agilite + s.perception) / 2);
  sd.emprise = Math.floor((s.intelligence + s.volonte) / 2);
  sd.art = Math.floor((s.charisma + s.creativite) / 2);
  sd.initiative = s.agilite + s.perception + sd.bonusCorps;
  sd.initMagique = sd.initiative + 10;
  sd.defenseNaturelle = s.agilite + sd.bonusCorps;
  return sd;
}

/** Faux AgoneActor : prototype réel, données fournies. */
function acteur(type, system, { items = [], effets = {}, phSource = 0 } = {}) {
  const a = Object.create(AgoneActor.prototype);
  const mises = [];
  Object.assign(a, {
    type, system, items, id: "A1", mises,
    flags: { agone: { effets: { ...effetsNeutres(), ...effets } } },
    _source: { system: { ph: { max: phSource } } },
    update: async data => { mises.push(data); return a; },
  });
  return a;
}

const comp = (name, score, system = {}) => item(name, "competence", { score, ...system });

describe("AgoneActor#prepareDerivedData — personnage", () => {
  test("totaux d'arme calculés en fin de préparation, d'après les stats après effets", () => {
    const epee = item("Épée", "arme", { style: "melee", competence: "Mêlée", attackBonus: 1, defenseBonus: 2, initBonus: 1, dommages: 4, poids: 1 });
    const a = acteur("personnage", systemePersonnage(), {
      items: [epee, comp("Armes", 3, { domaine: "Mêlée", attributLie: "melee" })],
      effets: { melee_bonus: 2 },
    });
    a.prepareDerivedData();
    const sd = a.system;
    assert.equal(sd.melee, 5 + 2);
    assert.equal(epee.system.attackTotal, sd.melee + 3 + 1 + sd.bonusCorps);
    assert.equal(epee.system.defenseTotal, sd.melee + 3 + 2 + sd.bonusCorps);
    assert.equal(epee.system.initTotal, sd.initiative + 1);
    assert.equal(epee.system.dommagesTotal, 4 + sd.bd);
  });

  test("surcharge jugée sur la capacité après effets (FOR augmentée par un effet)", () => {
    const base = systemePersonnage();
    const charge = base.chargeMax + 1;
    const sac = () => item("Sac", "equipement", { poidsTotal: charge });

    const sans = acteur("personnage", systemePersonnage(), { items: [sac()] });
    sans.prepareDerivedData();
    assert.equal(sans.system.malusSurcharge, -3);

    const avec = acteur("personnage", systemePersonnage(), { items: [sac()], effets: { force: 5 } });
    avec.prepareDerivedData();
    assert.ok(avec.system.chargeMax > charge);
    assert.notEqual(avec.system.malusSurcharge, -3, "la charge max augmentée doit compter");
  });

  test("bonus supplémentaires d'Art, d'Emprise et d'Initiative intégrés avant les stats qui en dépendent", () => {
    const supp = [{ attribut: "art", valeur: 2 }, { attribut: "emprise", valeur: 1 }, { attribut: "initiative", valeur: 3 }];
    const a = acteur("personnage", systemePersonnage({ supp }), {
      items: [comp("Arts Magiques", 4), comp("Connaissance des Danseurs", 2)],
    });
    a.prepareDerivedData();
    const sd = a.system;
    assert.equal(sd.art, 5 + 2);
    assert.equal(sd.emprise, 5 + 1);
    assert.equal(sd.initiative, 13 + 3);
    assert.equal(sd.aptitudeArtsMagiques, sd.art + 4 + sd.bonusAme);
    assert.equal(sd.aptitudeEmprise, sd.emprise + 2 + sd.bonusEsprit);
    assert.equal(sd.initMagique, sd.initiative + 10);
    // Les bonus d'avantages affichés dans les infobulles ne comptent que les effets actifs
    assert.equal(sd.avantageArtBonus, 0);
  });

  test("sans effet ni bonus : potentiels calculés une fois, à partir des compétences", () => {
    const a = acteur("personnage", systemePersonnage(), {
      items: [comp("Esquive", 3), comp("Démonologie", 2), comp("Arts Magiques", 1)],
    });
    a.prepareDerivedData();
    const sd = a.system;
    assert.equal(sd.esquiveTotal, 5 + 3 + 3);
    assert.equal(sd.esquiveCompScore, 3);
    assert.equal(sd.aptitudeConjuration, 0 + 2 + 3);
    assert.equal(sd.aptitudeArtsMagiques, 5 + 1 + 3);
    assert.equal(sd.malusSurcharge, 0);
  });

  test("après effets : PH max, attributes.hp.max et scores bornés à 0", () => {
    const a = acteur("personnage", systemePersonnage(), { effets: { corps: 2, esprit: 2, ame: 2, resistance: 2, force: -9 } });
    a.prepareDerivedData();
    const sd = a.system;
    assert.equal(sd.flamme, 5);
    assert.equal(sd.ph.max, 10, "PH max dérivé de la Flamme modifiée");
    assert.equal(sd.attributes.hp.max, sd.pdv.max);
    assert.equal(sd.force.score, 0);
    assert.equal(sd.force.avantageBonus, -5, "delta réellement appliqué (valeur stockée = score − bonus)");
  });

  test("PH max saisi à la main : conservé", () => {
    const a = acteur("personnage", systemePersonnage({ phMax: 3 }), { effets: { corps: 2, esprit: 2, ame: 2 }, phSource: 3 });
    a.prepareDerivedData();
    assert.equal(a.system.ph.max, 3);
  });
});

describe("AgoneActor — acteurs simples", () => {
  const systemeCompagnon = () => ({ agilite: 4, force: 3, perception: 2, resistance: 3, melee: 3, tir: 3, initiative: 6, pdv: { valeur: 5, max: 9 } });

  test("getRollData ne modifie pas system (pas de bonusCorps fantôme)", () => {
    const a = acteur("compagnon", systemeCompagnon());
    const data = a.getRollData();
    assert.equal(data.bonusCorps, 0);
    assert.equal(data.initiative, 6);
    assert.equal(data.agilite, 4);
    assert.notEqual(data, a.system);
    assert.equal("bonusCorps" in a.system, false);
  });

  test("compagnon : esquive, armure portée et totaux d'arme", () => {
    const griffes = item("Griffes", "arme", { style: "melee", competence: "", attackBonus: 1, dommages: 2 });
    const a = acteur("compagnon", systemeCompagnon(), {
      items: [griffes, comp("esquive", 2), item("Barde", "armure", { portee: true, protection: 2, malusAgi: 1, poids: 4 })],
    });
    a.prepareDerivedData();
    assert.equal(a.system.esquiveTotal, 4 + 2);
    assert.deepEqual(a.system.armure, { protection: 2, malusAgi: 1 });
    assert.equal(a.system.chargeActuelle, 4);
    assert.equal(griffes.system.attackTotal, 3 + 1);
    assert.equal(griffes.system.initTotal, 6);
  });
});

describe("AgoneActor#modifyTokenAttribute", () => {
  test("barre « pdv » : écrit system.pdv.valeur, borné à 0..max", async () => {
    const a = acteur("pnj", { pdv: { valeur: 5, max: 9 } });
    await a.modifyTokenAttribute("pdv", -3, true, true);
    await a.modifyTokenAttribute("pdv", 50, false, true);
    await a.modifyTokenAttribute("system.pdv", -99, true, true);
    assert.deepEqual(a.mises, [{ "system.pdv.valeur": 2 }, { "system.pdv.valeur": 9 }, { "system.pdv.valeur": 0 }]);
    assert.equal(hooks.at(-1)[0], "modifyTokenAttribute");
  });

  test("barre « densite » du démon", async () => {
    const a = acteur("demon", { densite: { valeur: 10, max: 20 } });
    await a.modifyTokenAttribute("densite", 4, true, true);
    assert.deepEqual(a.mises, [{ "system.densite.valeur": 14 }]);
  });

  test("valeur inchangée : aucune mise à jour ; autre attribut : comportement du cœur", async () => {
    const a = acteur("pnj", { pdv: { valeur: 9, max: 9 }, ph: { valeur: 1, max: 2 } });
    await a.modifyTokenAttribute("pdv", 5, true, true);
    assert.deepEqual(a.mises, []);
    await a.modifyTokenAttribute("ph", 1, true, true);
    assert.deepEqual(a.appelCoeur, ["ph", 1, true, true]);
    await a.modifyTokenAttribute("pdv", 1, false, false);
    assert.deepEqual(a.appelCoeur, ["pdv", 1, false, false]);
  });
});

describe("AgoneActor#_setInitiativeInCombat", () => {
  const combat = () => {
    const liste = [{ id: "c1", actorId: "A1", tokenId: "t1" }, { id: "c2", actorId: "A1", tokenId: "t2" }];
    const recu = [];
    return {
      recu,
      combatants: { get: id => liste.find(c => c.id === id), find: fn => liste.find(fn) },
      setInitiative: async (id, valeur) => { recu.push([id, valeur]); },
    };
  };

  test("combatantId fourni : ce combattant, pas le premier du même acteur", async () => {
    game.combat = combat();
    await acteur("pnj", {})._setInitiativeInCombat(12, "c2");
    assert.deepEqual(game.combat.recu, [["c2", 12]]);
  });

  test("sans combatantId (ou inconnu) : jeton de l'acteur, sinon premier combattant de l'acteur", async () => {
    game.combat = combat();
    const a = acteur("pnj", {});
    await a._setInitiativeInCombat(7);
    await a._setInitiativeInCombat(8, "inconnu");
    a.token = { id: "t2" };
    await a._setInitiativeInCombat(9);
    assert.deepEqual(game.combat.recu, [["c1", 7], ["c1", 8], ["c2", 9]]);
    game.combat = null;
  });
});
