import { attendre, bac, DELAI, PERSO, PNJ } from "./outils.mjs";

/**
 * Valeurs dérivées des DataModels : formules du livre pour chaque type d'acteur.
 */
export function donneesBatch({ describe, it, assert, before, after }) {
  const tests = bac();
  after(async function () { this.timeout(DELAI); await tests.nettoyer(); });

  describe("Personnage", function () {
    this.timeout(DELAI);
    let s;
    before(async () => { s = (await tests.acteur("personnage", PERSO)).system; });

    it("bonus d'aspect = aspect − noir", () => {
      assert.equal(s.bonusCorps, 2);
      assert.equal(s.bonusEsprit, 2);
      assert.equal(s.bonusAme, 3);
    });
    it("Flamme = plus petit aspect", () => assert.equal(s.flamme, 2));
    it("Mêlée = ⌊(FOR + AGI×2) / 3⌋", () => assert.equal(s.melee, Math.floor((3 + 4 * 2) / 3)));
    it("Tir = ⌊(AGI + PER) / 2⌋", () => assert.equal(s.tir, 3));
    it("Initiative = AGI + PER + bonus Corps ; magique = +10", () => {
      assert.equal(s.initiative, 4 + 2 + 2);
      assert.equal(s.initMagique, s.initiative + 10);
    });
    it("Défense naturelle = AGI + bonus Corps", () => assert.equal(s.defenseNaturelle, 6));
    it("Esquive = AGI + compétence Esquive + bonus Corps", () => assert.equal(s.esquiveTotal, 6));
    it("Art = ⌊(CHA + CRÉ) / 2⌋", () => assert.equal(s.art, 3));
    it("Emprise éclipsiste = ⌊(INT + VOL) / 2⌋", () => assert.equal(s.emprise, 2));
    it("PdV max = BPdV + RÉS×3 + bonus de dé", () => {
      const bpdv = s.pdv.max - 3 * 3 - s.pdv.bonusDe;
      assert.isAbove(bpdv, 0);
    });
    it("Noirceur = ⌊Ténèbres / 10⌋", () => assert.equal(s.noirceur, 0));
    it("Charges calculées (aucun avantage)", () => {
      assert.equal(s.chargesDepensees, 0);
      assert.isNumber(s.chargesSolde);
    });
  });

  describe("Personnage — obédiences et blessures", function () {
    this.timeout(DELAI);
    it("Emprise jorniste = INT, obscurantiste = VOL", async () => {
      const actor = await tests.acteur("personnage", { ...PERSO, typeMage: "jorniste" });
      assert.equal(actor.system.emprise, 3);
      await actor.update({ "system.typeMage": "obscurantiste" });
      assert.equal(actor.system.emprise, 2);
    });
    it("malus de blessures graves : 0 / −2 / −6 / −12", async () => {
      const actor = await tests.acteur("personnage", PERSO);
      const attendus = [0, -2, -6, -12];
      for (let n = 0; n <= 3; n++) {
        await actor.update({ "system.blessureGrave1": n >= 1, "system.blessureGrave2": n >= 2, "system.blessureGrave3": n >= 3 });
        assert.equal(actor.system.malusBlessureGrave, attendus[n], `${n} blessure(s)`);
      }
    });
    it("une peine de Perfidie noircit son aspect", async () => {
      const actor = await tests.acteur("personnage", PERSO);
      await actor.createEmbeddedDocuments("Item", [{ name: "Peine", type: "peine", system: { noirEffect: "ame" } }]);
      assert.equal(actor.system.ameNoirTotal, 2);
      assert.equal(actor.system.bonusAme, 2);
    });
  });

  describe("Ténèbres", function () {
    this.timeout(DELAI);
    it("le palier 10 noircit l'Esprit et crée le Diablotin", async () => {
      const actor = await tests.acteur("personnage", PERSO);
      await actor.update({ "system.tenebres": 10 });
      assert.equal(actor.system.noirceur, 1);
      assert.equal(actor.system.espritNoirTotal, 1);
      // Le démon est créé de façon asynchrone après la mise à jour
      await attendre(() => (actor.getFlag("agone", "demons") ?? []).length === 1, "démon lié");
      const uuids = actor.getFlag("agone", "demons");
      const demon = await fromUuid(uuids[0]);
      assert.equal(demon?.type, "demon");
    });
    it("mode manuel : les paliers cochés comptent, pas la valeur de Ténèbres", async () => {
      const actor = await tests.acteur("personnage", PERSO);
      await actor.setFlag("agone", "tenebresModeManuel", true);
      await actor.setFlag("agone", "paliersManuels", { 30: true });
      assert.equal(actor.system.corpsNoirTotal, 1 + 1, "palier 30 : Corps noir +1");
      assert.equal(actor.system.espritNoirTotal, 0, "paliers 10 et 20 non cochés");
    });
  });

  describe("PNJ", function () {
    this.timeout(DELAI);
    let s;
    before(async () => { s = (await tests.acteur("pnj", PNJ)).system; });
    it("bonus d'aspect = aspect", () => assert.deepEqual([s.bonusCorps, s.bonusEsprit, s.bonusAme], [2, 1, 3]));
    it("Flamme = plus petit aspect", () => assert.equal(s.flamme, 1));
    it("Mêlée, Tir, Initiative, Défense", () => {
      assert.equal(s.melee, Math.floor((3 + 8) / 3));
      assert.equal(s.tir, 3);
      assert.equal(s.initiative, 6);
      assert.equal(s.defenseNaturelle, 4);
    });
    it("Art = ⌊(CHA + CRÉ) / 2⌋", () => assert.equal(s.art, 3));
    it("Emprise jorniste = INT + Esprit", () => assert.equal(s.emprise, 3 + 1));
    it("Esquive = AGI + compétence + bonus Corps", () => assert.equal(s.esquiveTotal, 4 + 0 + 2));
  });

  describe("Compagnon et démon", function () {
    this.timeout(DELAI);
    it("compagnon : Initiative, Mêlée, Défense, demi-charge", async () => {
      const s = (await tests.acteur("compagnon", { agilite: 3, force: 4, perception: 2, chargeMax: 9 })).system;
      assert.equal(s.initiative, 5);
      assert.equal(s.melee, Math.floor((4 + 6) / 3));
      assert.equal(s.defenseNaturelle, 3);
      assert.equal(s.demiCharge, 4);
    });
    it("démon : RÉS = ⌊Densité max / 5⌋, seuils de blessure", async () => {
      const s = (await tests.acteur("demon", { densite: { valeur: 12, max: 12 }, agilite: 2, perception: 1 })).system;
      assert.equal(s.resistance, 2);
      assert.equal(s.seuilBlessureGrave, 4);
      assert.equal(s.seuilBlessureCritique, 6);
      assert.equal(s.initiative, 3);
    });
  });
}
