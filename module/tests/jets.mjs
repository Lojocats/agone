import { bac, DELAI, PERSO, PNJ, horsDes } from "./outils.mjs";
import { artsMagiquesParDomaine } from "../sheets/actor-context.mjs";
import { BONUS_HEROISME } from "../documents/actor.mjs";

const FF = { fastForward: true };

/**
 * Jets de dés : chaque jet est lancé sans dialogue et sa formule est vérifiée
 * (total − dés = valeur attendue), avec son message de chat.
 */
export function jetsBatch({ describe, it, assert, before, after }) {
  const tests = bac();
  after(async function () { this.timeout(DELAI); await tests.nettoyer(); });

  describe("Personnage", function () {
    this.timeout(DELAI);
    let actor, s, saisonin;
    before(async () => {
      actor = await tests.acteur("personnage", PERSO);
      s = actor.system;
      saisonin = actor._getBonusSaisonin();
    });

    const ASPECT = { agilite: "bonusCorps", force: "bonusCorps", perception: "bonusCorps", resistance: "bonusCorps",
                     intelligence: "bonusEsprit", volonte: "bonusEsprit", charisma: "bonusAme", creativite: "bonusAme" };
    for (const [carac, aspect] of Object.entries(ASPECT)) {
      it(`caractéristique ${carac} = score × 2 + bonus d'aspect`, async () => {
        const roll = await actor.rollAttribut(carac, FF);
        assert.equal(horsDes(roll), s[carac].score * 2 + s[aspect] + saisonin);
      });
    }

    it("chaque jet crée un message de chat de l'acteur", async () => {
      const avant = game.messages.filter(m => m.speaker?.actor === actor.id).length;
      await actor.rollAttribut("force", FF);
      const apres = game.messages.filter(m => m.speaker?.actor === actor.id).length;
      assert.equal(apres, avant + 1);
    });

    it("compétence = score + caractéristique + bonus d'aspect", async () => {
      const [comp] = await actor.createEmbeddedDocuments("Item", [
        { name: "Escalade", type: "competence", system: { attributLie: "agilite", score: 5 } },
      ]);
      const roll = await actor.rollCompetence(comp.id, FF);
      assert.equal(horsDes(roll), 5 + 4 + 2 + saisonin);
    });

    it("compétence à 0 : malus de −3", async () => {
      const [comp] = await actor.createEmbeddedDocuments("Item", [
        { name: "Nage", type: "competence", system: { attributLie: "force", score: 0 } },
      ]);
      const roll = await actor.rollCompetence(comp.id, FF);
      assert.equal(horsDes(roll), 0 + 3 + 2 - 3 + saisonin);
    });

    it("compétence non apprise : caractéristique + bonus d'aspect − 3", async () => {
      const roll = await actor.rollCompetenceSansItem("Équitation", "agilite", "", FF);
      assert.equal(horsDes(roll), 4 + 2 - 3 + saisonin);
    });

    it("initiative sans arme (d10 fermé) et avec bonus d'arme", async () => {
      let roll = await actor.rollInitiative(null, FF);
      assert.equal(horsDes(roll), s.initiative + saisonin);
      assert.equal(roll.dice[0].modifiers.length, 0, "dé non explosif");
      const [arme] = await actor.createEmbeddedDocuments("Item", [{ name: "Dague", type: "arme", system: { initBonus: 2 } }]);
      roll = await actor.rollInitiative(arme.id, FF);
      assert.equal(horsDes(roll), s.initiative + 2 + saisonin);
    });

    it("initiative magique", async () => {
      const roll = await actor.rollInitiativeMagique(FF);
      assert.equal(horsDes(roll), s.initMagique + saisonin);
    });

    it("attaque = Mêlée + compétence + bonus d'arme + bonus Corps", async () => {
      const [arme] = await actor.createEmbeddedDocuments("Item", [
        { name: "Épée", type: "arme", system: { style: "melee", attackBonus: 1, defenseBonus: 2 } },
      ]);
      const roll = await actor.rollAttaque(arme.id, FF);
      assert.equal(horsDes(roll), s.melee + 0 + 1 + s.bonusCorps + saisonin);
    });

    it("attaque avec compétence liée (domaine de la compétence)", async () => {
      await actor.createEmbeddedDocuments("Item", [
        { name: "Armes blanches", type: "competence", system: { attributLie: "melee", domaine: "Épée longue", score: 3 } },
      ]);
      const [arme] = await actor.createEmbeddedDocuments("Item", [
        { name: "Épée longue", type: "arme", system: { style: "melee", competence: "Épée longue", attackBonus: 0 } },
      ]);
      const roll = await actor.rollAttaque(arme.id, FF);
      assert.equal(horsDes(roll), s.melee + 3 + s.bonusCorps + saisonin);
    });

    it("parade = Mêlée + compétence + bonus de défense + bonus Corps", async () => {
      const [arme] = await actor.createEmbeddedDocuments("Item", [
        { name: "Bouclier", type: "arme", system: { style: "melee", defenseBonus: 2 } },
      ]);
      const roll = await actor.rollParade(arme.id, FF);
      assert.equal(horsDes(roll), s.melee + 0 + 2 + s.bonusCorps + saisonin);
    });

    it("esquive et défense naturelle", async () => {
      assert.equal(horsDes(await actor.rollEsquive(FF)), s.esquiveTotal + saisonin);
      assert.equal(horsDes(await actor.rollDefenseNaturelle(FF)), s.defenseNaturelle + saisonin);
    });

    it("sort = Art + Arts Magiques du domaine + bonus Âme", async () => {
      // L'ordre des documents renvoyés n'est pas garanti : on retrouve le sort par son type.
      const crees = await actor.createEmbeddedDocuments("Item", [
        { name: "Arts Magiques", type: "competence", system: { domaine: "Geste", score: 4, attributLie: "creativite" } },
        { name: "Sort de test", type: "sort", system: { typeMagie: "geste", seuil: 10 } },
      ]);
      const sort = crees.find(i => i.type === "sort");
      assert.ok(actor.items.get(sort?.id), "sort présent dans l'inventaire");
      const roll = await actor.rollSort(sort.id, FF);
      assert.ok(roll, "jet de sort lancé");
      assert.equal(horsDes(roll), actor.system.art + 4 + actor.system.bonusAme + saisonin);
    });

    it("sort sans Arts Magiques du domaine : refusé", async () => {
      const [sort] = await actor.createEmbeddedDocuments("Item", [{ name: "Sort Cyse", type: "sort", system: { typeMagie: "cyse", seuil: 5 } }]);
      assert.equal(await actor.rollSort(sort.id, FF), null);
    });

    it("sort improvisé : affiche description et badges (portée, durée, danse)", async () => {
      // Régression : le sort lancé en improvisé depuis le navigateur doit avoir description, portee, duree, danse
      await actor.createEmbeddedDocuments("Item", [
        { name: "Arts Magiques", type: "competence", system: { domaine: "Geste", score: 2, attributLie: "creativite" } },
      ]);
      const roll = await actor.rollSort({
        name: "Sort brut",
        typeMagie: "geste",
        seuil: 10,
        description: "<p>Desc brute</p>",
        portee: "10 m",
        duree: "1 tour",
        danse: "2 tours"
      }, { impro: true, fastForward: true });
      assert.ok(roll, "jet de sort improvisé lancé");

      // Récupérer le dernier message de chat de l'acteur
      const msg = game.messages.filter(m => m.speaker?.actor === actor.id).at(-1);
      assert.ok(msg, "message de chat créé");
      assert.include(msg.content, "Desc brute", "description affichée");
      assert.include(msg.content, "10 m", "portée affichée");
      assert.include(msg.content, "1 tour", "durée affichée");
      assert.include(msg.content, "2 tours", "danse affichée");
    });

    it("aptitude magique et conjuration", async () => {
      assert.equal(horsDes(await actor.rollAptitudeMagie(FF)), actor.system.aptitudeArtsMagiques);
      assert.equal(horsDes(await actor.rollAptitudeConjuration(FF)), actor.system.aptitudeConjuration);
      assert.equal(horsDes(await actor.rollConjurationDemonologie(FF)), actor.system.noirceur + 0);
    });

    it("Art par domaine : potentiel transmis", async () => {
      const roll = await actor.rollArtDomaine({ domaine: "Geste", apt: 7, art: 3, scoreArts: 4, scoreEff: 4, bonusAme: 3 }, FF);
      assert.equal(horsDes(roll), 7);
    });

    it("Emprise brute = Emprise + Résonance + bonus Esprit", async () => {
      assert.equal(horsDes(await actor.rollEmpriseAttr(FF)), actor.system.emprise + actor.system.bonusEsprit);
    });

    it("3e blessure grave : VOL × 2 + bonus Âme", async () => {
      const roll = await actor.rollVolBlessure3();
      assert.equal(horsDes(roll), s.volonte.score * 2 + s.bonusAme);
    });

    it("jet fermé : dé sans explosion", async () => {
      const roll = await actor._sendRollToChat(await new Roll("1d10x10 + 2").evaluate(), "Test", {}, { rollType: "ferme" });
      assert.notInclude(roll.formula, "x", "formule sans explosion");
      assert.equal(horsDes(roll), 2);
    });

    it("carte de jet : classe d'issue succès et badge d'écart au seuil", async () => {
      const seuilNumeric = 1; // seuil très bas : succès garanti (1d10 fermé + 2 ≥ 3)
      const roll = await actor._sendRollToChat(await new Roll("1d10x10 + 2").evaluate(), "Test seuil", {
        seuil:    { label: game.i18n.localize("AGONE.Des.Seuil"), value: seuilNumeric },
        resultat: game.i18n.localize("AGONE.Des.Succes")
      }, { rollType: "ferme", seuilNumeric });
      const msg = game.messages.filter(m => m.speaker?.actor === actor.id).at(-1);
      assert.include(msg.content, "roll-issue-succes", "classe d'issue succès sur la carte");
      const ecartAttendu = `+${roll.total - seuilNumeric}`;
      assert.include(msg.content, "roll-ecart-positif", "badge d'écart teinté positif");
      assert.include(msg.content, `>${ecartAttendu}<`, "badge d'écart = total − seuil");
    });

    it("carte de jet : classe d'issue échec et badge d'écart négatif", async () => {
      const seuilNumeric = 999; // seuil très haut : échec garanti
      const roll = await actor._sendRollToChat(await new Roll("1d10x10 + 2").evaluate(), "Test seuil", {
        seuil:    { label: game.i18n.localize("AGONE.Des.Seuil"), value: seuilNumeric },
        resultat: game.i18n.localize("AGONE.Des.Echec")
      }, { rollType: "ferme", seuilNumeric });
      const msg = game.messages.filter(m => m.speaker?.actor === actor.id).at(-1);
      assert.include(msg.content, "roll-issue-echec", "classe d'issue échec sur la carte");
      const ecartAttendu = `−${seuilNumeric - roll.total}`;
      assert.include(msg.content, "roll-ecart-negatif", "badge d'écart teinté négatif");
      assert.include(msg.content, `>${ecartAttendu}<`, "badge d'écart = total − seuil");
    });
  });

  describe("Personnage — danseurs (Emprise)", function () {
    this.timeout(DELAI);
    let actor, danseur;
    before(async () => {
      actor = await tests.acteur("personnage", PERSO);
      [danseur] = await actor.createEmbeddedDocuments("Item", [
        { name: "Danseur de test", type: "danseur", system: { modeCreation: false, enduranceActuelle: 2 } },
      ]);
    });
    const aptitude = () => actor.system.emprise + 0 + actor.system.bonusEsprit;

    it("potentiel d'Emprise = Emprise + Conn. Danseurs + bonus Esprit + bonus du danseur", async () => {
      const roll = await actor.rollEmprise(danseur.id, FF);
      assert.equal(horsDes(roll), aptitude() + (danseur.system.bonusEmprise ?? 0));
    });

    it("improvisation = CRÉ + Empathie du danseur + bonus Esprit", async () => {
      const roll = await actor.rollImprovisationDanseur(danseur.id, FF);
      assert.equal(horsDes(roll), 5 + (danseur.system.empathie ?? 0) + actor.system.bonusEsprit);
    });

    it("sort via danseur : consomme 1 point d'endurance", async () => {
      const roll = await actor.rollSortDanseur(danseur.id, { name: "Sort d'Emprise", seuil: 5 }, FF);
      assert.equal(horsDes(roll), aptitude() + (danseur.system.bonusEmprise ?? 0));
      assert.equal(actor.items.get(danseur.id).system.enduranceActuelle, 1);
    });

    it("danseur sans endurance : pas de jet", async () => {
      await danseur.update({ "system.enduranceActuelle": 0 });
      assert.isUndefined(await actor.rollSortDanseur(danseur.id, { name: "Sort", seuil: 5 }, FF));
    });
  });

  describe("Relance (point d'Héroïsme)", function () {
    this.timeout(DELAI);
    let actor;
    before(async () => {
      actor = await tests.acteur("personnage", { ...PERSO, ph: { valeur: 2, max: 2 } });
    });
    const dernierMessage = a => game.messages.filter(m => m.speaker?.actor === a.id).at(-1);

    it("un jet rejouable porte ses paramètres de relance dans les drapeaux du message", async () => {
      await actor.rollAttribut("force", FF);
      const relance = dernierMessage(actor).flags.agone.relance;
      assert.equal(relance.methode, "rollAttribut");
      assert.deepEqual(relance.args, ["force"]);
      assert.equal(relance.fait, false);
    });

    it("relancer dépense 1 point d'Héroïsme, marque l'ancien message, réutilise le même dialogue", async () => {
      const original = actor._dialogModificateur;
      actor._dialogModificateur = async () => ({ modif: 3, rollType: "ouvert", bonusSpe: 0 });
      let roll1;
      try {
        roll1 = await actor.rollAttribut("force", {});
      } finally {
        actor._dialogModificateur = original;
      }
      const msg1 = dernierMessage(actor);
      assert.equal(actor.system.ph.valeur, 2, "point d'Héroïsme pas encore dépensé");

      const roll2 = await actor.relancerMessage(msg1);
      assert.ok(roll2, "la relance a produit un jet");
      assert.equal(actor.system.ph.valeur, 1, "1 point d'Héroïsme dépensé");
      assert.equal(msg1.flags.agone.relance.fait, true, "ancien message marqué comme relancé");
      assert.equal(horsDes(roll2), horsDes(roll1), "même modificateur (3) donc même formule hors dés");

      const msg2 = dernierMessage(actor);
      assert.equal(msg2.flags.agone.estRelance, true, "nouveau message signalé comme relance");
    });

    it("aucun point d'Héroïsme : relance refusée, aucun nouveau message", async () => {
      await actor.update({ "system.ph.valeur": 0 });
      await actor.rollAttribut("force", FF);
      const msg = dernierMessage(actor);
      const avant = game.messages.filter(m => m.speaker?.actor === actor.id).length;
      assert.isNull(await actor.relancerMessage(msg));
      assert.equal(game.messages.filter(m => m.speaker?.actor === actor.id).length, avant, "pas de nouveau message");
    });

    it("un message déjà relancé ne peut pas l'être une seconde fois", async () => {
      await actor.update({ "system.ph.valeur": 5 });
      await actor.rollAttribut("force", FF);
      const msg = dernierMessage(actor);
      assert.ok(await actor.relancerMessage(msg), "première relance acceptée");
      assert.isNull(await actor.relancerMessage(msg), "seconde relance du même message refusée");
    });

    it("méthode absente de la liste blanche (drapeaux forgés) : relance refusée", async () => {
      await actor.update({ "system.ph.valeur": 5 });
      const msg = await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: "Message de test",
        flags: { agone: { relance: { methode: "delete", args: [], options: {}, dialog: null, fait: false } } },
      });
      assert.isNull(await actor.relancerMessage(msg));
    });

    it("relance d'un sort via danseur : ne consomme pas d'endurance supplémentaire", async () => {
      const actor2 = await tests.acteur("personnage", { ...PERSO, ph: { valeur: 2, max: 2 } });
      const [danseur2] = await actor2.createEmbeddedDocuments("Item", [
        { name: "Danseur relance", type: "danseur", system: { modeCreation: false, enduranceActuelle: 2 } },
      ]);
      await actor2.rollSortDanseur(danseur2.id, { name: "Sort d'Emprise", seuil: 5 }, FF);
      assert.equal(actor2.items.get(danseur2.id).system.enduranceActuelle, 1, "1er jet consomme 1 point d'endurance");

      const roll2 = await actor2.relancerMessage(dernierMessage(actor2));
      assert.ok(roll2, "la relance a produit un jet");
      assert.equal(actor2.items.get(danseur2.id).system.enduranceActuelle, 1, "la relance ne consomme pas d'endurance supplémentaire");
    });

    it("relance d'un sort : l'improvisation d'origine est préservée", async () => {
      const actor3 = await tests.acteur("personnage", { ...PERSO, ph: { valeur: 2, max: 2 } });
      await actor3.createEmbeddedDocuments("Item", [
        { name: "Arts Magiques", type: "competence", system: { domaine: "Geste", score: 4, attributLie: "creativite" } },
      ]);
      const [sort] = await actor3.createEmbeddedDocuments("Item", [
        { name: "Sort relance impro", type: "sort", system: { typeMagie: "geste", seuil: 10 } },
      ]);
      const roll1 = await actor3.rollSort(sort.id, { impro: true, fastForward: true });
      assert.ok(roll1, "premier jet lancé");
      assert.equal(horsDes(roll1), actor3.system.art + 4 + actor3.system.bonusAme, "sort improvisé : même aptitude ART + Arts + bonus Âme (seuil × 2)");
      assert.equal(dernierMessage(actor3).flags.agone.relance.options.impro, true, "impro mémorisé dans les drapeaux");

      const roll2 = await actor3.relancerMessage(dernierMessage(actor3));
      assert.ok(roll2, "relance effectuée");
      assert.equal(horsDes(roll2), horsDes(roll1), "la relance reste en improvisation (même formule)");
    });

    it("relance d'un sort à typeMagie inconnu : ne rouvre pas l'invite de type magique", async () => {
      const actor4 = await tests.acteur("personnage", { ...PERSO, ph: { valeur: 2, max: 2 } });
      await actor4.createEmbeddedDocuments("Item", [
        { name: "Arts Magiques", type: "competence", system: { domaine: "Cyse", score: 3, attributLie: "creativite" } },
      ]);
      const [sort] = await actor4.createEmbeddedDocuments("Item", [
        { name: "Sort mystère", type: "sort", system: { typeMagie: "mystere", seuil: 5 } },
      ]);
      let appels = 0;
      const original = actor4._promptMagicTypeFallback;
      actor4._promptMagicTypeFallback = async () => { appels++; return "cyse"; };
      try {
        const roll1 = await actor4.rollSort(sort.id, FF);
        assert.ok(roll1, "premier jet lancé");
        assert.equal(appels, 1, "invite affichée une fois pour le premier jet");
        const msg1 = dernierMessage(actor4);
        assert.equal(msg1.flags.agone.relance.options.typeMagie, "cyse", "type magique choisi mémorisé");

        const roll2 = await actor4.relancerMessage(msg1);
        assert.ok(roll2, "relance effectuée");
        assert.equal(appels, 1, "l'invite de type magique n'est pas rouverte lors de la relance");
      } finally {
        actor4._promptMagicTypeFallback = original;
      }
    });

    it("jet impossible à la relance (objet supprimé) : PH inchangé, message redevient relançable, retourne null", async () => {
      const actor5 = await tests.acteur("personnage", { ...PERSO, ph: { valeur: 2, max: 2 } });
      const [comp] = await actor5.createEmbeddedDocuments("Item", [
        { name: "Compétence éphémère", type: "competence", system: { attributLie: "agilite", score: 2 } },
      ]);
      await actor5.rollCompetence(comp.id, FF);
      const msg = dernierMessage(actor5);
      await comp.delete();

      const result = await actor5.relancerMessage(msg);
      assert.isNull(result, "compétence supprimée entre-temps : relance impossible");
      assert.equal(actor5.system.ph.valeur, 2, "aucun point d'Héroïsme dépensé");
      assert.equal(msg.flags.agone.relance.fait, false, "le message redevient relançable");
    });

    it("deux relances en parallèle sur le même message : une seule dépense de PH, un seul nouveau message", async () => {
      const actor6 = await tests.acteur("personnage", { ...PERSO, ph: { valeur: 3, max: 3 } });
      await actor6.rollAttribut("force", FF);
      const msg = dernierMessage(actor6);
      const avant = game.messages.filter(m => m.speaker?.actor === actor6.id).length;

      const [r1, r2] = await Promise.all([actor6.relancerMessage(msg), actor6.relancerMessage(msg)]);
      const reussies = [r1, r2].filter(Boolean);
      assert.equal(reussies.length, 1, "une seule des deux relances simultanées aboutit");
      assert.equal(actor6.system.ph.valeur, 2, "1 seul point d'Héroïsme dépensé au total");
      assert.equal(game.messages.filter(m => m.speaker?.actor === actor6.id).length, avant + 1, "un seul nouveau message créé");
    });

    it("message d'un autre acteur : relance refusée", async () => {
      const actorA = await tests.acteur("personnage", { ...PERSO, ph: { valeur: 2, max: 2 } });
      const actorB = await tests.acteur("personnage", { ...PERSO, ph: { valeur: 2, max: 2 } });
      await actorA.rollAttribut("force", FF);
      assert.isNull(await actorB.relancerMessage(dernierMessage(actorA)));
    });

    it("mode de jet conservé : un jet secret (gmroll) reste chuchoté de la même façon après relance", async () => {
      const actor7 = await tests.acteur("personnage", { ...PERSO, ph: { valeur: 2, max: 2 } });
      // v14 : core.rollMode est déprécié et ne relaie core.messageMode que de façon asynchrone ;
      // on règle directement le réglage réel (messageMode en v14, rollMode en v13).
      const v14 = game.settings.settings.has("core.messageMode");
      const cle = v14 ? "messageMode" : "rollMode";
      const modeOriginal = game.settings.get("core", cle);
      await game.settings.set("core", cle, v14 ? "gm" : "gmroll");
      try {
        await actor7.rollAttribut("force", FF);
      } finally {
        await game.settings.set("core", cle, modeOriginal);
      }
      const msg1 = dernierMessage(actor7);
      assert.equal(msg1.flags.agone.relance.rollMode, "gmroll", "mode de jet mémorisé dans les drapeaux");

      const roll2 = await actor7.relancerMessage(msg1);
      assert.ok(roll2, "relance effectuée");
      const msg2 = dernierMessage(actor7);
      assert.equal(msg2.flags.agone.relance.rollMode, "gmroll", "le nouveau message garde le mode gmroll mémorisé");
      assert.deepEqual([...msg2.whisper].sort(), [...msg1.whisper].sort(), "mêmes destinataires chuchotés que le message d'origine");
    });

    it("relance d'un sort de danseur à endurance déjà nulle : fonctionne quand même, reste à 0", async () => {
      const actor8 = await tests.acteur("personnage", { ...PERSO, ph: { valeur: 2, max: 2 } });
      const [danseur8] = await actor8.createEmbeddedDocuments("Item", [
        { name: "Danseur épuisé", type: "danseur", system: { modeCreation: false, enduranceActuelle: 1 } },
      ]);
      await actor8.rollSortDanseur(danseur8.id, { name: "Sort d'Emprise", seuil: 5 }, FF);
      assert.equal(actor8.items.get(danseur8.id).system.enduranceActuelle, 0, "1er jet consomme le dernier point d'endurance");

      const roll2 = await actor8.relancerMessage(dernierMessage(actor8));
      assert.ok(roll2, "la relance fonctionne malgré une endurance à 0");
      assert.equal(actor8.items.get(danseur8.id).system.enduranceActuelle, 0, "l'endurance reste à 0 après la relance");
    });

    it("compétence non apprise : la relance conserve l'attribut choisi au jet d'origine, pas celui par défaut", async () => {
      const actor9 = await tests.acteur("personnage", { ...PERSO, ph: { valeur: 2, max: 2 } });
      await actor9.rollCompetenceSansItem("Escrime", "agilite", "", FF);
      const msg = dernierMessage(actor9);
      assert.equal(msg.flags.agone.relance.dialog.attrChosen, "agilite", "attribut mémorisé dans le dialogue du message");

      // Simule un choix différent (volonté) lors du dialogue d'origine, sans repasser par la vraie boîte de dialogue.
      await msg.update({ "flags.agone.relance.dialog.attrChosen": "volonte" });

      const saisonin = actor9._getBonusSaisonin();
      const roll2 = await actor9.relancerMessage(msg);
      assert.ok(roll2, "relance effectuée");
      assert.equal(horsDes(roll2), actor9.system.volonte.score + actor9.system.bonusEsprit - 3 + saisonin,
        "la relance recalcule avec l'attribut mémorisé (volonté), pas l'attribut par défaut (agilité)");
    });

    // acteurRelancable (module/agone.mjs) n'est pas exportée : sa visibilité dans le menu contextuel
    // du chat (non-propriétaire, acteur sans PH, message déjà relancé) n'est pas testable directement
    // ici. Le comportement équivalent (PH manquant, message déjà relancé, acteur non correspondant)
    // est couvert côté AgoneActor#relancerMessage ci-dessus.

    it("bonus d'Héroïsme (+5) choisi dans le dialogue : total +5, 1 PH dépensé, carte marquée, non rejouable", async () => {
      const actorB1 = await tests.acteur("personnage", { ...PERSO, ph: { valeur: 2, max: 2 } });
      const rollNormal = await actorB1.rollAttribut("force", FF);
      assert.equal(actorB1.system.ph.valeur, 2, "un jet normal ne dépense aucun point d'Héroïsme");

      const rollBonus = await actorB1.rollAttribut("force", { fastForward: true, heroisme: true });
      assert.equal(horsDes(rollBonus), horsDes(rollNormal) + BONUS_HEROISME, `le bonus ajoute ${BONUS_HEROISME} au total`);
      assert.equal(actorB1.system.ph.valeur, 1, "1 point d'Héroïsme dépensé");

      const msg = dernierMessage(actorB1);
      assert.include(msg.content, game.i18n.localize("AGONE.Relance.DetailBonus"), "détail du bonus affiché");
      assert.include(msg.content, `+${BONUS_HEROISME}`, "valeur du bonus affichée");
      assert.equal(msg.flags.agone.issuHeroisme, "bonus", "carte signalée issue d'un bonus d'Héroïsme");

      assert.isNull(await actorB1.relancerMessage(msg), "une carte bonusée ne peut pas être relancée");
    });

    it("bonus d'Héroïsme demandé mais aucun point disponible : jet normal, pas de bonus, pas de drapeau", async () => {
      const actorB0 = await tests.acteur("personnage", { ...PERSO, ph: { valeur: 0, max: 2 } });
      const rollNormal = await actorB0.rollAttribut("force", FF);
      const rollTente  = await actorB0.rollAttribut("force", { fastForward: true, heroisme: true });
      assert.equal(horsDes(rollTente), horsDes(rollNormal), "pas de bonus sans point d'Héroïsme disponible");
      assert.equal(actorB0.system.ph.valeur, 0, "PH inchangé (toujours à 0)");
      assert.notOk(dernierMessage(actorB0).flags.agone.issuHeroisme, "pas de drapeau issuHeroisme sans bonus effectif");
    });

    it("bonus d'Héroïsme sur une compétence : même mécanique (+5, 1 PH, drapeau)", async () => {
      const actorC = await tests.acteur("personnage", { ...PERSO, ph: { valeur: 2, max: 2 } });
      const [comp] = await actorC.createEmbeddedDocuments("Item", [
        { name: "Escalade bonus", type: "competence", system: { attributLie: "agilite", score: 5 } },
      ]);
      const rollNormal = await actorC.rollCompetence(comp.id, FF);
      const rollBonus  = await actorC.rollCompetence(comp.id, { fastForward: true, heroisme: true });
      assert.equal(horsDes(rollBonus), horsDes(rollNormal) + BONUS_HEROISME, `le bonus ajoute ${BONUS_HEROISME} au total`);
      assert.equal(actorC.system.ph.valeur, 1, "1 point d'Héroïsme dépensé");
      assert.equal(dernierMessage(actorC).flags.agone.issuHeroisme, "bonus", "carte signalée issue d'un bonus d'Héroïsme");
    });

    it("bonus d'Héroïsme sur un sort : le seuil recalculé après le jet inclut le bonus", async () => {
      const actorS = await tests.acteur("personnage", { ...PERSO, ph: { valeur: 2, max: 2 } });
      await actorS.createEmbeddedDocuments("Item", [
        { name: "Arts Magiques", type: "competence", system: { domaine: "Geste", score: 4, attributLie: "creativite" } },
      ]);
      const saisonin  = actorS._getBonusSaisonin();
      const aptitude  = actorS.system.art + 4 + actorS.system.bonusAme;
      // Seuil calibré sur le pire des cas (dé = 1, jet ouvert non explosé) : échec garanti sans le
      // bonus, succès garanti avec (+5), quel que soit le résultat réel du dé (toujours ≥ 1).
      const seuil = aptitude + saisonin + 1 + BONUS_HEROISME;
      const [sortSeuil] = await actorS.createEmbeddedDocuments("Item", [
        { name: "Sort test seuil", type: "sort", system: { typeMagie: "geste", seuil } },
      ]);

      const rollBonus = await actorS.rollSort(sortSeuil.id, { fastForward: true, heroisme: true });
      assert.ok(rollBonus, "jet bonusé lancé");
      assert.equal(actorS.system.ph.valeur, 1, "1 point d'Héroïsme dépensé");
      // Un 1 au dé est un fumble (pénalité) et un 10 un critique : seul le jet « normal » est concluant.
      const de = rollBonus.dice[0].results[0].result;
      const contenu = dernierMessage(actorS).content;
      if (de === 1) assert.include(contenu, "roll-issue-fumble", "dé = 1 : fumble prioritaire");
      else if (de === 10) assert.include(contenu, "roll-issue-critique", "dé = 10 : critique prioritaire");
      else assert.include(contenu, "roll-issue-succes",
        "le seuil (échec garanti sans bonus) devient un succès grâce au bonus recalculé");
    });

    it("relance d'une carte normale dont le dialogue mémorisé porte heroisme:true (forgé) : pas de bonus supplémentaire", async () => {
      const actorR = await tests.acteur("personnage", { ...PERSO, ph: { valeur: 2, max: 2 } });
      await actorR.rollAttribut("force", FF);
      const msg = dernierMessage(actorR);
      // Simule une carte d'origine où le point d'Héroïsme aurait été coché dans le dialogue.
      await msg.update({ "flags.agone.relance.dialog.heroisme": true });

      const roll2 = await actorR.relancerMessage(msg);
      assert.ok(roll2, "relance effectuée");
      assert.equal(actorR.system.ph.valeur, 1, "seul le coût standard de la relance (1 PH) est prélevé");
      const attendu = actorR.system.force.score * 2 + actorR.system.bonusCorps + actorR._getBonusSaisonin();
      assert.equal(horsDes(roll2), attendu, "pas de bonus d'Héroïsme ajouté à la relance");
      assert.notEqual(dernierMessage(actorR).flags.agone.issuHeroisme, "bonus", "carte non signalée comme bonus");
    });

    it("_ligneHeroisme : case à cocher seulement à partir d'1 point d'Héroïsme disponible", async () => {
      const actorPH0 = await tests.acteur("personnage", { ...PERSO, ph: { valeur: 0, max: 2 } });
      assert.equal(actorPH0._ligneHeroisme(), "", "aucun point d'Héroïsme : pas de case à cocher");

      const actorPH1 = await tests.acteur("personnage", { ...PERSO, ph: { valeur: 1, max: 2 } });
      const ligne = actorPH1._ligneHeroisme();
      assert.match(ligne, /type="checkbox"/, "case à cocher présente");
      assert.match(ligne, /name="heroisme"/, "nom du champ heroisme");
    });

    it("_ligneHeroisme : acteur sans points d'Héroïsme (PNJ) : pas de case à cocher", async () => {
      const pnj = await tests.acteur("pnj", PNJ);
      assert.equal(pnj._ligneHeroisme(), "", "un PNJ n'a pas de points d'Héroïsme");
    });

    // rollInitiative → combat : nécessite de créer un Combat/Combattant actif dans le monde et de le
    // nettoyer sans perturber une éventuelle rencontre en cours ; ce coût d'installation dépasse le
    // cadre de ce batch (pas d'aide dans outils.mjs pour ça). La mise à jour de l'initiative utilise
    // déjà le jet final (bonusé) via `jetFinal` dans rollInitiative/rollInitiativeMagique : non testé ici.
  });

  describe("Domaines d'Arts Magiques personnalisés", function () {
    this.timeout(DELAI);
    let actor;
    before(async () => {
      actor = await tests.acteur("personnage", PERSO);
    });
    const dernierMessage = () => game.messages.filter(m => m.speaker?.actor === actor.id).at(-1);

    it("domaine custom avec compétence dédiée : ATTRIBUT + bonus d'aspect + compétence, sans besoin d'Arts Magiques", async () => {
      const original = game.settings.get("agone", "domainesArtsCustom") ?? [];
      await game.settings.set("agone", "domainesArtsCustom", [
        { nom: "Herbes", compLiee: "", attribut: "volonte", competence: "Herboristerie" },
      ]);
      try {
        await actor.createEmbeddedDocuments("Item", [
          { name: "Herboristerie", type: "competence", system: { score: 3, attributLie: "volonte" } },
        ]);
        const [sort] = await actor.createEmbeddedDocuments("Item", [
          { name: "Sort d'Herbes", type: "sort", system: { typeMagie: "herbes", seuil: 5 } },
        ]);
        const roll = await actor.rollSort(sort.id, FF);
        assert.ok(roll, "jet lancé sans Arts Magiques");
        assert.equal(horsDes(roll), actor.system.volonte.score + actor.system.bonusEsprit + 3);
      } finally {
        await game.settings.set("agone", "domainesArtsCustom", original);
      }
    });

    it("domaine custom avec compétence dédiée manquante : jet refusé", async () => {
      const original = game.settings.get("agone", "domainesArtsCustom") ?? [];
      await game.settings.set("agone", "domainesArtsCustom", [
        { nom: "Pierres", compLiee: "", attribut: "volonte", competence: "Lapidaire" },
      ]);
      try {
        const [sort] = await actor.createEmbeddedDocuments("Item", [
          { name: "Sort de Pierres", type: "sort", system: { typeMagie: "pierres", seuil: 5 } },
        ]);
        assert.isNull(await actor.rollSort(sort.id, FF));
      } finally {
        await game.settings.set("agone", "domainesArtsCustom", original);
      }
    });

    it("domaine custom avec seulement un attribut redéfini : attribut + bonus d'aspect + Arts Magiques du domaine", async () => {
      const original = game.settings.get("agone", "domainesArtsCustom") ?? [];
      await game.settings.set("agone", "domainesArtsCustom", [
        { nom: "Flammes", compLiee: "", attribut: "volonte", competence: "" },
      ]);
      try {
        await actor.createEmbeddedDocuments("Item", [
          { name: "Arts Magiques", type: "competence", system: { domaine: "Flammes", score: 2, attributLie: "volonte" } },
        ]);
        const [sort] = await actor.createEmbeddedDocuments("Item", [
          { name: "Sort de Flammes", type: "sort", system: { typeMagie: "flammes", seuil: 5 } },
        ]);
        const roll = await actor.rollSort(sort.id, FF);
        assert.ok(roll, "jet lancé");
        assert.equal(horsDes(roll), actor.system.volonte.score + actor.system.bonusEsprit + 2);
      } finally {
        await game.settings.set("agone", "domainesArtsCustom", original);
      }
    });

    it("artsMagiquesParDomaine (fiche) est cohérent avec rollSort pour un domaine custom (attribut + compétence)", async () => {
      const original = game.settings.get("agone", "domainesArtsCustom") ?? [];
      await game.settings.set("agone", "domainesArtsCustom", [
        { nom: "Rosée", compLiee: "", attribut: "volonte", competence: "Herboristerie" },
      ]);
      try {
        // "Herboristerie" (score 3) a été créée par le test précédent sur ce même acteur.
        const [sort] = await actor.createEmbeddedDocuments("Item", [
          { name: "Sort de Rosée", type: "sort", system: { typeMagie: "rosee", seuil: 5 } },
        ]);
        const roll = await actor.rollSort(sort.id, FF);
        assert.ok(roll, "jet lancé");

        const competences = actor.items.filter(i => i.type === "competence");
        const ligneRosee = artsMagiquesParDomaine(actor.system, competences, actor.system.creativite.score)
          .find(l => l.domaine === "Rosée");
        assert.ok(ligneRosee, "ligne du domaine Rosée présente dans le contexte de la fiche");
        assert.equal(ligneRosee.potentiel, horsDes(roll), "le potentiel affiché sur la fiche correspond à l'aptitude du jet");
        assert.equal(ligneRosee.compLabel, "Herboristerie", "le libellé de compétence reprend le nom personnalisé");
        assert.equal(ligneRosee.baseBonusLabel, "BonusEsprit", "bonus d'aspect Volonté = Esprit");
      } finally {
        await game.settings.set("agone", "domainesArtsCustom", original);
      }
    });

    it("rollArtDomaine : la carte de jet affiche le nom de compétence personnalisé et le bon bonus d'aspect (pas Arts/Bonus Âme)", async () => {
      const original = game.settings.get("agone", "domainesArtsCustom") ?? [];
      await game.settings.set("agone", "domainesArtsCustom", [
        { nom: "Rosée", compLiee: "", attribut: "volonte", competence: "Herboristerie" },
      ]);
      try {
        const competences = actor.items.filter(i => i.type === "competence");
        const ligneRosee = artsMagiquesParDomaine(actor.system, competences, actor.system.creativite.score)
          .find(l => l.domaine === "Rosée");
        assert.ok(ligneRosee, "ligne du domaine Rosée trouvée");

        const d = {
          domaine: ligneRosee.domaine, apt: ligneRosee.potentiel, specialite: ligneRosee.specialite,
          art: ligneRosee.artVal, baseAbbr: ligneRosee.baseAbbr, baseBonus: ligneRosee.baseBonusVal,
          baseBonusLabel: ligneRosee.baseBonusLabel, compLabel: ligneRosee.compLabel,
          cre: ligneRosee.creVal, scoreArts: ligneRosee.scoreArtsMag, scoreComp: ligneRosee.scoreCompLiee,
          nomComp: ligneRosee.nomCompLiee, scoreEff: ligneRosee.scoreEffectif, bonusAme: ligneRosee.bonusAmeVal,
        };
        const roll = await actor.rollArtDomaine(d, FF);
        assert.ok(roll, "jet d'Art Domaine lancé");

        const msg = dernierMessage();
        assert.include(msg.content, "Herboristerie", "compétence personnalisée nommée dans la formule détaillée");
        assert.include(msg.content, `${ligneRosee.baseAbbr}(`, "abréviation de l'attribut de base (VOL) affichée, pas ART");
        const labelEsprit = game.i18n.localize("AGONE.Des.BonusEsprit");
        const labelAme    = game.i18n.localize("AGONE.Des.BonusAme");
        assert.include(msg.content, labelEsprit, "bonus d'aspect Esprit affiché");
        if (labelEsprit !== labelAme) assert.notInclude(msg.content, labelAme, "pas le bonus Âme par défaut");
        assert.notInclude(msg.content, "Arts:", "le libellé de compétence par défaut « Arts » n'est pas utilisé");
      } finally {
        await game.settings.set("agone", "domainesArtsCustom", original);
      }
    });
  });

  describe("PNJ, compagnon, démon", function () {
    this.timeout(DELAI);
    it("PNJ : caractéristique × 2 + bonus d'aspect", async () => {
      const actor = await tests.acteur("pnj", PNJ);
      const saisonin = actor._getBonusSaisonin();
      assert.equal(horsDes(await actor.rollAttribut("volonte", FF)), 2 * 2 + 1 + saisonin);
      assert.equal(horsDes(await actor.rollAttribut("creativite", FF)), 5 * 2 + 3 + saisonin);
    });

    it("PNJ : l'armure portée réduit l'Agilité avant le ×2 (AGI effective affichée sur la fiche)", async () => {
      const actor = await tests.acteur("pnj", { ...PNJ, armure: { protection: 3, malusAgi: 2 } });
      const saisonin = actor._getBonusSaisonin();
      assert.equal(horsDes(await actor.rollAttribut("agilite", FF)), (4 - 2) * 2 + 2 + saisonin);
    });

    it("personnage : les malus d'armure réduisent AGI et PER avant le ×2", async () => {
      const actor = await tests.acteur("personnage", PERSO);
      await actor.update({ "system.armure.portee": true, "system.armure.malusAgi": 2, "system.armure.malusPer": 1 });
      const s = actor.system;
      const autres = s.bonusCorps + (s.malusSurcharge ?? 0) + (s.malusBlessureGrave ?? 0) + actor._getBonusSaisonin();
      assert.equal(s.armure._malusAgiActif, -2);
      assert.equal(horsDes(await actor.rollAttribut("agilite", FF)), (s.agilite.score - 2) * 2 + autres);
      assert.equal(horsDes(await actor.rollAttribut("perception", FF)), (s.perception.score - 1) * 2 + autres);
    });

    it("PNJ : compétence avec caractéristique numérique", async () => {
      const actor = await tests.acteur("pnj", PNJ);
      const [comp] = await actor.createEmbeddedDocuments("Item", [
        { name: "Vigilance", type: "competence", system: { attributLie: "perception", score: 4 } },
      ]);
      const roll = await actor.rollCompetence(comp.id, FF);
      assert.equal(horsDes(roll), 4 + 2 + 2 + actor._getBonusSaisonin());
    });

    it("compagnon et démon : caractéristique × 2, sans aspect", async () => {
      for (const [type, system] of [["compagnon", { force: 4 }], ["demon", { force: 4 }]]) {
        const actor = await tests.acteur(type, system);
        assert.equal(horsDes(await actor.rollAttribut("force", FF)), 8 + actor._getBonusSaisonin(), type);
      }
    });

    it("attaque d'un PNJ avec une arme", async () => {
      const actor = await tests.acteur("pnj", PNJ);
      const [arme] = await actor.createEmbeddedDocuments("Item", [{ name: "Hache", type: "arme", system: { attackBonus: 1 } }]);
      const roll = await actor.rollAttaque(arme.id, FF);
      assert.equal(horsDes(roll), actor.system.melee + 1 + actor.system.bonusCorps + actor._getBonusSaisonin());
    });

    it("compagnon et démon : esquive = AGI + compétence Esquive + bonus Corps", async () => {
      for (const type of ["compagnon", "demon"]) {
        const actor = await tests.acteur(type, { agilite: 4 });
        await actor.createEmbeddedDocuments("Item", [{ name: "Esquive", type: "competence", system: { score: 3 } }]);
        assert.equal(horsDes(await actor.rollEsquive(FF)), actor.system.esquiveTotal + actor._getBonusSaisonin(), type);
      }
    });

    it("PNJ : l'armure portée pénalise aussi la parade et l'esquive (malusAgi)", async () => {
      const sain = await tests.acteur("pnj", PNJ);
      const arme = await tests.acteur("pnj", { ...PNJ, armure: { protection: 3, malusAgi: 2 } });
      const [armeSain]   = await sain.createEmbeddedDocuments("Item", [{ name: "Hache", type: "arme", system: {} }]);
      const [armeArmure] = await arme.createEmbeddedDocuments("Item", [{ name: "Hache", type: "arme", system: {} }]);
      const paradeSain   = horsDes(await sain.rollParade(armeSain.id, FF));
      const paradeArmure = horsDes(await arme.rollParade(armeArmure.id, FF));
      assert.equal(paradeSain - paradeArmure, 2, "parade");
      const esquiveSain   = horsDes(await sain.rollEsquive(FF));
      const esquiveArmure = horsDes(await arme.rollEsquive(FF));
      assert.equal(esquiveSain - esquiveArmure, 2, "esquive");
    });

    it("compagnon : l'armure portée pénalise l'Agilité (malusAgi dérivé)", async () => {
      const actor = await tests.acteur("compagnon", { agilite: 4 });
      await actor.createEmbeddedDocuments("Item", [
        { name: "Cuirasse", type: "armure", system: { portee: true, protection: 2, malusAgi: 2 } },
      ]);
      const saisonin = actor._getBonusSaisonin();
      assert.equal(horsDes(await actor.rollAttribut("agilite", FF)), (4 - 2) * 2 + saisonin);
    });

    it("PNJ : Emprise brute = Emprise + Résonance + bonus Esprit", async () => {
      const actor = await tests.acteur("pnj", PNJ);
      assert.equal(horsDes(await actor.rollEmpriseAttr(FF)), actor.system.emprise + actor.system.bonusEsprit);
    });

    it("PNJ : initiative magique = Initiative + 10 (fermée)", async () => {
      const actor = await tests.acteur("pnj", PNJ);
      assert.equal(horsDes(await actor.rollInitiativeMagique(FF)), actor.system.initMagique);
    });

    it("PNJ : 3e blessure grave = VOL × 2 + bonus Âme", async () => {
      const actor = await tests.acteur("pnj", PNJ);
      const roll = await actor.rollVolBlessure3();
      assert.equal(horsDes(roll), actor.system.volonte * 2 + actor.system.bonusAme);
    });

    it("compagnon : arme de trait (style tir) utilise le Tir plutôt que la Mêlée", async () => {
      const actor = await tests.acteur("compagnon", { agilite: 3, force: 4, perception: 2 });
      const [arme] = await actor.createEmbeddedDocuments("Item", [
        { name: "Arc court", type: "arme", system: { style: "trait", attackBonus: 1 } },
      ]);
      const roll = await actor.rollAttaque(arme.id, FF);
      assert.equal(horsDes(roll), actor.system.tir + 1 + (actor.system.bonusCorps ?? 0) + actor._getBonusSaisonin());
    });
  });
}
