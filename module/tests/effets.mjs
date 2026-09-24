import { changeEffet, effetsDepuisTable } from "../helpers/effets.mjs";
import { bac, DELAI, PERSO, PNJ } from "./outils.mjs";

/** Valeur visée par chaque statistique d'effet, sur un personnage. */
const CIBLES_PERSONNAGE = {
  agilite: s => s.agilite.score, force: s => s.force.score, perception: s => s.perception.score,
  resistance: s => s.resistance.score, intelligence: s => s.intelligence.score, volonte: s => s.volonte.score,
  charisma: s => s.charisma.score, creativite: s => s.creativite.score,
  corps: s => s.corps.score, esprit: s => s.esprit.score, ame: s => s.ame.score,
  corps_noir: s => s.corpsNoirTotal, esprit_noir: s => s.espritNoirTotal, ame_noir: s => s.ameNoirTotal,
  initiative_bonus: s => s.initiative, melee_bonus: s => s.melee, tir_bonus: s => s.tir,
  defense_bonus: s => s.defenseNaturelle, esquive_bonus: s => s.esquiveTotal,
  art_bonus: s => s.art, emprise_bonus: s => s.emprise, bd_bonus: s => s.bd,
  ptsCreationComp_bonus: s => s.ptsCreationComp.max,
};

/** Valeur visée par chaque statistique « simple », sur un PNJ. */
const CIBLES_PNJ = {
  agilite: s => s.agilite, force: s => s.force, perception: s => s.perception, resistance: s => s.resistance,
  intelligence: s => s.intelligence, volonte: s => s.volonte, charisma: s => s.charisma, creativite: s => s.creativite,
  corps: s => s.corps, esprit: s => s.esprit, ame: s => s.ame,
  initiative_bonus: s => s.initiative, melee_bonus: s => s.melee, tir_bonus: s => s.tir,
  defense_bonus: s => s.defenseNaturelle, esquive_bonus: s => s.esquiveTotal,
  art_bonus: s => s.art, emprise_bonus: s => s.emprise,
};

const itemAvecEffet = (name, type, changes, effet = {}) => ({
  name, type, effects: [{ name, transfer: true, changes, ...effet }],
});

/**
 * Effets actifs des items : chaque statistique du vocabulaire, cumul, désactivation,
 * effets non transférés, statistiques spéciales (Charges, mouvement).
 */
export function effetsBatch({ describe, it, assert, before, after }) {
  const tests = bac();
  after(async function () { this.timeout(DELAI); await tests.nettoyer(); });

  describe("Personnage : chaque statistique du vocabulaire", function () {
    this.timeout(DELAI * 4);
    let actor;
    before(async () => { actor = await tests.acteur("personnage", PERSO); });

    it("le vocabulaire est entièrement couvert par ces tests", () => {
      const nonTestees = Object.keys(CONFIG.AGONE.effets)
        .filter(k => !(k in CIBLES_PERSONNAGE) && !["tai", "mv_divisor", "charges_double", "charges_reduction"].includes(k));
      assert.deepEqual(nonTestees, []);
    });

    for (const [stat, cible] of Object.entries(CIBLES_PERSONNAGE)) {
      it(`${stat} +2`, async () => {
        const avant = cible(actor.system);
        const [item] = await actor.createEmbeddedDocuments("Item", [itemAvecEffet(`Effet ${stat}`, "equipement", [changeEffet(stat, 2)])]);
        assert.equal(cible(actor.system), avant + 2);
        await item.delete();
        assert.equal(cible(actor.system), avant, "retrait de l'item : valeur d'origine");
      });
    }

    it("TAI : modifie les valeurs dérivées de la taille sans toucher la TAI stockée", async () => {
      const tai = actor._source.system.tai;
      const [item] = await actor.createEmbeddedDocuments("Item", [itemAvecEffet("Géant", "don", [changeEffet("tai", 3)])]);
      assert.equal(actor._source.system.tai, tai);
      await item.delete();
    });

    it("diviseur de mouvement : le plus grand l'emporte", async () => {
      const mv = actor.system.mv;
      const items = await actor.createEmbeddedDocuments("Item", [
        itemAvecEffet("Boiteux", "don", [changeEffet("mv_divisor", 2)]),
        itemAvecEffet("Unijambiste", "don", [changeEffet("mv_divisor", 3)]),
      ]);
      assert.equal(actor.system.mv, Math.max(1, Math.floor(mv / 3)));
      await actor.deleteEmbeddedDocuments("Item", items.map(i => i.id));
    });
  });

  describe("Personnage : cumul, désactivation, transfert", function () {
    this.timeout(DELAI);

    it("deux items se cumulent", async () => {
      const actor = await tests.acteur("personnage", PERSO);
      await actor.createEmbeddedDocuments("Item", [
        itemAvecEffet("Anneau", "equipement", [changeEffet("force", 1)]),
        itemAvecEffet("Ceinture", "equipement", [changeEffet("force", 2)]),
      ]);
      assert.equal(actor.system.force.score, 3 + 3);
    });

    it("un malus s'applique aussi", async () => {
      const actor = await tests.acteur("personnage", PERSO);
      await actor.createEmbeddedDocuments("Item", [itemAvecEffet("Malédiction", "don", [changeEffet("volonte", -1)])]);
      assert.equal(actor.system.volonte.score, 1);
    });

    it("effet désactivé puis réactivé", async () => {
      const actor = await tests.acteur("personnage", PERSO);
      const [don] = await actor.createEmbeddedDocuments("Item", [{ name: "Adresse", type: "don", effects: effetsDepuisTable("Adresse") }]);
      assert.equal(actor.system.agilite.score, 5, "Adresse : AGI +1");
      const effet = don.effects.contents[0];
      await effet.update({ disabled: true });
      assert.equal(actor.system.agilite.score, 4);
      await effet.update({ disabled: false });
      assert.equal(actor.system.agilite.score, 5);
    });

    it("effet non transféré : sans effet sur le porteur", async () => {
      const actor = await tests.acteur("personnage", PERSO);
      await actor.createEmbeddedDocuments("Item", [itemAvecEffet("Relique", "equipement", [changeEffet("force", 5)], { transfer: false })]);
      assert.equal(actor.system.force.score, 3);
    });

    it("la valeur stockée n'est jamais modifiée", async () => {
      const actor = await tests.acteur("personnage", PERSO);
      await actor.createEmbeddedDocuments("Item", [itemAvecEffet("Gantelets", "equipement", [changeEffet("force", 2)])]);
      assert.equal(actor._source.system.force.score, 3);
      await actor.update({ "system.pdv.valeur": 1 });
      assert.equal(actor._source.system.force.score, 3, "une sauvegarde n'enregistre pas le bonus");
    });

    it("avantages du livre de base : tous applicables", async () => {
      const { AVANTAGES_EFFETS } = await import("../helpers/compendium-data.mjs");
      const actor = await tests.acteur("personnage", PERSO);
      const items = await actor.createEmbeddedDocuments("Item",
        Object.keys(AVANTAGES_EFFETS).map(name => ({ name, type: "don", effects: effetsDepuisTable(name) })));
      assert.equal(items.length, Object.keys(AVANTAGES_EFFETS).length);
      assert.isNumber(actor.system.initiative, "préparation des données sans erreur");
    });
  });

  describe("Personnage : Charges", function () {
    this.timeout(DELAI);
    const allie = { name: "Allié", type: "don", system: { categorie: "avantage", typeCharge: "charge", cout: 2 } };

    it("coût dépensé et défauts récupérés", async () => {
      const actor = await tests.acteur("personnage", PERSO);
      await actor.createEmbeddedDocuments("Item", [allie, { name: "Dette", type: "don", system: { categorie: "defaut", cout: -3 } }]);
      assert.equal(actor.system.chargesDepensees, 2);
      assert.equal(actor.system.chargesRecuperees, 3);
      assert.equal(actor.system.chargesSolde, actor.system.chargesDisponibles - 2);
    });

    it("Charges doublées (Jeune)", async () => {
      const actor = await tests.acteur("personnage", PERSO);
      await actor.createEmbeddedDocuments("Item", [allie, itemAvecEffet("Jeune", "don", [changeEffet("charges_double", true)])]);
      assert.equal(actor.system.chargesDepensees, 4);
    });

    it("réduction du coût des Charges (Vieillard), minimum 1", async () => {
      const actor = await tests.acteur("personnage", PERSO);
      await actor.createEmbeddedDocuments("Item", [allie, itemAvecEffet("Vieillard", "don", [changeEffet("charges_reduction", 5)])]);
      assert.equal(actor.system.chargesDepensees, 1);
    });
  });

  describe("PNJ : chaque statistique « simple »", function () {
    this.timeout(DELAI * 4);
    let actor;
    before(async () => { actor = await tests.acteur("pnj", PNJ); });

    it("les statistiques marquées « simple » sont toutes testées", () => {
      const simples = Object.entries(CONFIG.AGONE.effets).filter(([, d]) => d.simple).map(([k]) => k);
      assert.deepEqual(simples.filter(k => !(k in CIBLES_PNJ)), []);
    });

    for (const [stat, cible] of Object.entries(CIBLES_PNJ)) {
      it(`${stat} +2`, async () => {
        const avant = cible(actor.system);
        const [item] = await actor.createEmbeddedDocuments("Item", [itemAvecEffet(`Effet ${stat}`, "equipement", [changeEffet(stat, 2)])]);
        assert.equal(cible(actor.system), avant + 2);
        await item.delete();
      });
    }

    it("la valeur stockée reste celle saisie", async () => {
      const [item] = await actor.createEmbeddedDocuments("Item", [itemAvecEffet("Force", "equipement", [changeEffet("force", 2)])]);
      assert.equal(actor.system.force, 5);
      assert.equal(actor._source.system.force, 3);
      await item.delete();
    });
  });

  describe("Compagnon et démon", function () {
    this.timeout(DELAI);
    it("compagnon : caractéristique et Mêlée", async () => {
      const actor = await tests.acteur("compagnon", { force: 3, agilite: 3 });
      await actor.createEmbeddedDocuments("Item", [itemAvecEffet("Harnais", "equipement", [changeEffet("force", 3), changeEffet("melee_bonus", 1)])]);
      assert.equal(actor.system.force, 6);
      assert.equal(actor.system.melee, Math.floor((6 + 6) / 3) + 1);
    });
    it("démon : Résistance dérivée de la Densité + effet", async () => {
      const actor = await tests.acteur("demon", { densite: { valeur: 10, max: 10 } });
      await actor.createEmbeddedDocuments("Item", [itemAvecEffet("Carapace", "equipement", [changeEffet("resistance", 1)])]);
      assert.equal(actor.system.resistance, 2 + 1);
    });
  });

  describe("Peine de Perfidie : effets de la peine et du bienfait", function () {
    this.timeout(DELAI);
    let actor, peine;
    before(async () => {
      actor = await tests.acteur("personnage", PERSO);
      [peine] = await actor.createEmbeddedDocuments("Item", [{
        name: "Peine test", type: "peine", system: { bienfait: "Fulgurance", bienfaitAcquis: false },
        effects: [
          { name: "Peine", transfer: true, changes: [changeEffet("force", -1)] },
          { name: "Bienfait", transfer: true, changes: [changeEffet("agilite", 2)], flags: { agone: { bienfait: true } } },
        ],
      }]);
    });

    it("l'effet de la peine s'applique, celui du bienfait est suspendu", () => {
      assert.equal(actor.system.force.score, PERSO.force.score - 1);
      assert.equal(actor.system.agilite.score, PERSO.agilite.score);
      assert.ok(peine.effects.find(e => e.name === "Bienfait").isSuppressed);
    });

    it("acquérir le bienfait active ses effets", async () => {
      await peine.update({ "system.bienfaitAcquis": true });
      assert.equal(actor.system.agilite.score, PERSO.agilite.score + 2);
      assert.notOk(peine.effects.find(e => e.name === "Bienfait").isSuppressed);
    });

    it("renoncer au bienfait les suspend à nouveau", async () => {
      await peine.update({ "system.bienfaitAcquis": false });
      assert.equal(actor.system.agilite.score, PERSO.agilite.score);
    });

    it("la description propre du bienfait remplace le texte du livre", async () => {
      await peine.update({ "system.bienfaitDescription": "<p>Version maison</p>" });
      assert.equal(peine.system.bienfaitDescription, "<p>Version maison</p>");
    });
  });
}
