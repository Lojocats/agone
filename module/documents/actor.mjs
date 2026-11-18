import { effetsActeur, effetsNeutres } from "../helpers/effets.mjs";
import { issueJet } from "../helpers/roll-issue.mjs";
import { resoudreDomaineArts } from "../helpers/domaines-arts.mjs";
import { appliquerModeJet, modeHistorique, modeJetCourant } from "../helpers/mode-jet.mjs";
import {
  CLES_COMPETENCES, appliquerDeltasScores, bonusAspectAttribut, calculerCharges, cleBarreJeton, competenceConnue,
  cumulMalusJet, malusSurcharge, normaliserNom, scoreAttribut, sommeBonusSupp, totauxArme, valeurBarre,
} from "../helpers/derivations.mjs";
import {
  boutonsDialogueJet, champCase, champJetOuvert, champNombre, champSelect, contenuDialogueJet, echapper,
} from "../helpers/dialogue-jet.mjs";

/** Libellé localisé des cartes de jet (section AGONE.Des). */
const _L = (key, data) => data
  ? game.i18n.format(`AGONE.Des.${key}`, data)
  : game.i18n.localize(`AGONE.Des.${key}`);

/** Méthodes de jet rejouables depuis le chat (relance avec un point d'Héroïsme). */
export const METHODES_RELANCE = new Set([
  "rollAttribut", "rollCompetence", "rollCompetenceSansItem", "rollInitiative", "rollInitiativeMagique",
  "rollAttaque", "rollParade", "rollEsquive", "rollDefenseNaturelle", "rollVolBlessure3",
  "rollSort", "rollSortDanseur", "rollEmprise", "rollEmpriseAttr", "rollAptitudeMagie",
  "rollAptitudeConjuration", "rollConjurationDemonologie", "rollArtDomaine", "rollImprovisationDanseur",
]);

/** Identifiants des messages en cours de relance (verrou contre la double dépense). */
const RELANCES_EN_COURS = new Set();

/** Bonus au total accordé par un point d'Héroïsme (alternative à la relance). */
export const BONUS_HEROISME = 5;

/**
 * AgoneActor — Classe Actor étendue pour le système Agone
 * Gère les jets de dés et la préparation des données
 */
export class AgoneActor extends Actor {

  /** @override */
  prepareBaseData() {
    super.prepareBaseData();
    // Valeurs neutres des effets actifs : Foundry y cumule les modificateurs des items
    // pendant applyActiveEffects (clés flags.agone.effets.*, voir helpers/effets.mjs).
    foundry.utils.setProperty(this.flags, "agone.effets", effetsNeutres());
  }
  /**
   * Redirige les mises à jour des barres de jeton « pdv » (personnage, compagnon, PNJ) et « densite »
   * (démon) vers `system.<barre>.valeur` : le cœur écrirait `.value`, qui n'existe pas dans le schéma.
   * L'attribut reçu est relatif à `system` (« pdv ») ; l'ancien chemin « system.pdv » reste accepté.
   * @override
   */
  async modifyTokenAttribute(attribute, value, isDelta = false, isBar = true) {
    const cle = isBar ? cleBarreJeton(attribute) : null;
    const barre = cle ? this.system[cle] : null;
    if (!barre || typeof barre !== "object") return super.modifyTokenAttribute(attribute, value, isDelta, isBar);

    const courant  = barre.valeur ?? 0;
    const nouvelle = valeurBarre(courant, barre.max, value, isDelta);
    if (nouvelle === courant) return this;
    const updates = { [`system.${cle}.valeur`]: nouvelle };
    // Même hook que le cœur : un module peut modifier ou refuser la mise à jour
    const autorise = Hooks.call("modifyTokenAttribute", { attribute, value, isDelta, isBar }, updates, this);
    return autorise !== false ? this.update(updates) : this;
  }

  /**
   * Coerce les valeurs non-finies (NaN, Infinity) en 0 avant validation.
   * Dernier filet de sécurité avant que TypeDataModel.validate() ne soit appelé.
   * @override
   */
  async _preUpdate(changed, options, user) {
    if (changed.system) {
      const flat = foundry.utils.flattenObject(changed.system);
      for (const [k, v] of Object.entries(flat)) {
        if (typeof v === "number" && !Number.isFinite(v)) flat[k] = 0;
      }
      // Appliquer le plafond racial (max seulement — le min est une contrainte de création gérée par l'UI)
      // Le raceMax est une valeur brute (sans bonus). Le score stocké = rawScore + bonusAppliqué.
      // Donc plafond stocké = raceMax + bonusAppliqué.
      const attrs = ["agilite", "force", "perception", "resistance", "intelligence", "volonte", "charisma", "creativite"];
      for (const attr of attrs) {
        const scoreKey = `${attr}.score`;
        if (flat[scoreKey] !== undefined) {
          const raceMax     = this.system[attr]?.raceMax;
          const bonusOffset = this.system.peupleBonusApplique?.[`${attr}Bonus`] ?? 0;
          if (raceMax != null) flat[scoreKey] = Math.min(flat[scoreKey], raceMax + bonusOffset);
        }
      }
      changed.system = foundry.utils.expandObject(flat);
    }

    // — Peines : détection du franchissement des paliers démoniaques
    if (this.type === "personnage" && changed.system?.tenebres !== undefined) {
      const oldTene = this.system.tenebres ?? 0;
      const newTene = Number(changed.system.tenebres);
      const modeManuel = this.getFlag("agone", "tenebresModeManuel") ?? false;
      if (!modeManuel && newTene > oldTene) {
        const PALIERS_DEMON = [
          { palier: 10, origine: "diablotin"        },
          { palier: 30, origine: "demonFacetieux"   },
          { palier: 70, origine: "jumeauDemoniaque" },
          { palier: 92, origine: "siamoisTenebres"  },
        ];
        options._demonCreations = [];
        const _linkedDemonUuids = this.getFlag("agone", "demons") ?? [];
        for (const { palier, origine } of PALIERS_DEMON) {
          if (oldTene < palier && newTene >= palier) {
            const alreadyExistsItem = this.items.some(
              i => i.type === "demon" && i.system.origine === origine
            );
            const alreadyExistsActor = _linkedDemonUuids.some(uuid => {
              const doc = fromUuidSync?.(uuid);
              return doc?.system?.origine === origine;
            });
            if (!alreadyExistsItem && !alreadyExistsActor) options._demonCreations.push(origine);
          }
        }
      }
    }

    return super._preUpdate(changed, options, user);
  }

  /** @override */
  async _onUpdate(changed, options, userId) {
    await super._onUpdate(changed, options, userId);
    if (!options._demonCreations?.length) return;

    // Les joueurs n'ont en général pas le droit de créer des acteurs : la création est faite par le
    // client du MJ actif (les options de _preUpdate sont diffusées à tous les clients). Sans MJ
    // connecté, l'auteur de la mise à jour s'en charge s'il en a le droit.
    const gmActif = game.users.activeGM;
    const responsable = gmActif ? gmActif.isSelf : userId === game.user.id;
    if (!responsable) return;
    await this._creerDemonsPaliers(options._demonCreations);
  }

  /**
   * Crée les acteurs démons apparus au franchissement de paliers de Ténèbres et les lie au personnage.
   * @param {string[]} origines  Clés de palier (diablotin, demonFacetieux…)
   */
  async _creerDemonsPaliers(origines) {
    const NOM_DEMON = {
      diablotin:        "AGONE.Peine.diablotin",
      demonFacetieux:   "AGONE.Peine.demonFacetieux",
      jumeauDemoniaque: "AGONE.Peine.jumeauDemoniaque",
      siamoisTenebres:  "AGONE.Peine.siamoisTenebres",
    };
    const crees = [];
    for (const origine of origines) {
      const name = game.i18n.localize(NOM_DEMON[origine]) || origine;
      try {
        if (!game.user.can("ACTOR_CREATE")) throw new Error("permission ACTOR_CREATE manquante");
        // Le démon hérite des droits du personnage : son joueur peut ouvrir la fiche
        const newActor = await Actor.implementation.create({
          name,
          type:      "demon",
          system:    { origine },
          ownership: foundry.utils.deepClone(this.ownership ?? {}),
        });
        if (!newActor) continue;
        crees.push(newActor.uuid);
        ui.notifications.info(game.i18n.format("AGONE.DemonAutoApparu", { name }));
      } catch (err) {
        console.warn(`Agone | Création automatique du démon « ${name} » impossible`, err);
        ui.notifications.warn(game.i18n.format("AGONE.DemonAutoEchec", { name }));
      }
    }
    if (!crees.length) return;
    try {
      // Relire le drapeau juste avant l'écriture (les créations sont asynchrones)
      await this.setFlag("agone", "demons", [...(this.getFlag("agone", "demons") ?? []), ...crees]);
    } catch (err) {
      console.warn("Agone | Impossible de lier les démons créés au personnage", err);
    }
  }

  /** @override */
  prepareDerivedData() {
    const systemData = this.system;
    const estPersonnage = this.type === "personnage";

    // Un seul parcours des items : charge portée, compétences, avantages, armes, armures portées
    const competences = [];
    const dons = [];
    const armes = [];
    const armuresPortees = [];
    let chargeTotal = 0;
    for (const item of this.items) {
      switch (item.type) {
        case "competence": competences.push(item); break;
        case "don":        dons.push(item); break;
        case "equipement": chargeTotal += item.system.poidsTotal ?? 0; break;
        case "arme":
          armes.push(item);
          chargeTotal += item.system.poids ?? 0;
          break;
        case "armure":
          chargeTotal += item.system.poids ?? 0;
          if (item.system.portee) armuresPortees.push(item);
          break;
      }
    }
    // Cumul des effets actifs des items (ActiveEffect → flags.agone.effets, voir helpers/effets.mjs)
    const fx = effetsActeur(this);

    // Charge totale portée depuis l'inventaire
    if (estPersonnage || this.type === "compagnon") systemData.chargeActuelle = chargeTotal;

    if (estPersonnage) {
      // Effets mécaniques des avantages & défauts, puis stats qui dépendent des compétences
      this._applyAvantagesEffets(fx, dons);
      this._deriverStatsCompetences(competences);

      // Malus de surcharge : après les effets, qui modifient FOR, RÉS et TAI donc la charge maximale
      systemData.malusSurcharge = malusSurcharge(chargeTotal, systemData.demiCharge ?? 0, systemData.chargeMax ?? 0);

      // Bonus/malus d'attributs supplémentaires (bonusAttributsSupp) sur les stats dérivées finales.
      // Art, Emprise et Initiative sont intégrés dans _applyAvantagesEffets : d'autres stats en dépendent.
      const supp = systemData.bonusAttributsSupp ?? [];
      if (supp.length > 0) {
        const _bs = (k) => sommeBonusSupp(supp, k);
        systemData.melee            = (systemData.melee            ?? 0) + _bs("melee");
        systemData.tir              = (systemData.tir              ?? 0) + _bs("tir");
        systemData.initMagique      = (systemData.initMagique      ?? 0) + _bs("initMagique");
        systemData.defenseNaturelle = (systemData.defenseNaturelle ?? 0) + _bs("defenseNaturelle");
        systemData.bd               = (systemData.bd               ?? 0) + _bs("bd");
        systemData.esquiveTotal     = (systemData.esquiveTotal     ?? 0) + _bs("esquive");
      }

      // Effets actifs sur les stats dérivées (initiative, Art et Emprise : voir _applyAvantagesEffets)
      systemData.melee            += fx.melee_bonus;
      systemData.tir              += fx.tir_bonus;
      systemData.defenseNaturelle += fx.defense_bonus;
      systemData.esquiveTotal     += fx.esquive_bonus;
      systemData.bd               += fx.bd_bonus;
    }

    // Compagnon : protection et malus d'AGI dérivés des armures portées (transitoire, hors schéma)
    if (this.type === "compagnon") {
      systemData.armure = {
        protection: armuresPortees.reduce((s, i) => s + (i.system.protection ?? 0), 0),
        malusAgi:   armuresPortees.reduce((s, i) => s + (i.system.malusAgi   ?? 0), 0),
      };
    }

    // Esquive des acteurs simples (AGI + compétence Esquive + Bonus Corps + effets), comme le personnage
    if (!estPersonnage) {
      const scoreEsquive = competenceConnue(competences, "esquive")?.system.score ?? 0;
      systemData.esquiveCompScore = scoreEsquive; // transitoire — pour les tooltips
      systemData.esquiveTotal = this._scoreAttribut("agilite") + scoreEsquive + (systemData.bonusCorps ?? 0)
                              + fx.esquive_bonus;
    }

    // Totaux des armes portées : les items sont préparés avant les stats dérivées de l'acteur
    // (MÊL, TIR, initiative, BD, bonus Corps), ils ne peuvent donc être calculés qu'ici.
    for (const arme of armes) {
      const { initTotal, attackTotal, defenseTotal, dommagesTotal } = totauxArme(arme.system, systemData, competences);
      Object.assign(arme.system, { initTotal, attackTotal, defenseTotal, dommagesTotal });
    }
  }

  /**
   * Applique les effets actifs des items (avantages, équipement… : ActiveEffect cumulés dans
   * flags.agone.effets) et les bonus d'attributs supplémentaires sur les stats du personnage.
   * Modifie uniquement les propriétés calculées (transient), jamais le stockage persistant.
   * @param {object} fx    Cumul des effets actifs (voir effetsActeur)
   * @param {Item[]} dons  Avantages & défauts du personnage
   */
  _applyAvantagesEffets(fx, dons) {
    const sd = this.system;
    const T  = CONFIG.AGONE;

    const _primairesSupp = ["agilite", "force", "resistance", "intelligence", "volonte", "charisma", "creativite", "perception", "corps", "esprit", "ame"];
    const supp = sd.bonusAttributsSupp ?? [];

    // Bonus/malus d'attributs supplémentaires sur stats primaires
    const b = { ...fx };
    for (const k of _primairesSupp) b[k] = (b[k] ?? 0) + sommeBonusSupp(supp, k);
    // … et sur les stats dérivées dont d'autres dépendent (potentiels magiques, initiative magique)
    const suppArt        = sommeBonusSupp(supp, "art");
    const suppEmprise    = sommeBonusSupp(supp, "emprise");
    const suppInitiative = sommeBonusSupp(supp, "initiative");

    // Charges des avantages & défauts : calculées même sans effet mécanique
    Object.assign(sd, calculerCharges(dons, b, sd.ptsCharges?.max ?? 0));

    // Rien à faire si aucun effet
    const anyDelta = suppArt !== 0 || suppEmprise !== 0 || suppInitiative !== 0
      || Object.entries(b).some(([k, v]) => {
        if (k === "mv_divisor")     return v > 1;
        if (k === "charges_double") return v === true;
        return typeof v === "number" && v !== 0;
      });
    if (!anyDelta) return;

    // --- 1. Application des deltas sur les stats brutes (plancher à 0, comme les acteurs simples) ---
    // avantageBonus mémorise le delta appliqué pour la séparation UI base / final (transient — jamais stocké)
    appliquerDeltasScores(sd, b, _primairesSupp);
    // Ajouter les noirs des dons aux totaux dérivés (pas aux champs stockés)
    sd.corpsNoirTotal  = (sd.corpsNoirTotal  ?? sd.corps.noir)  + b.corps_noir;
    sd.espritNoirTotal = (sd.espritNoirTotal ?? sd.esprit.noir) + b.esprit_noir;
    sd.ameNoirTotal    = (sd.ameNoirTotal    ?? sd.ame.noir)    + b.ame_noir;
    // taiEffectif = valeur TAI avec les bonus d'avantages, uniquement pour les dérivations.
    // sd.tai n'est PAS modifié pour éviter l'accumulation en BDD lors des sauvegardes.
    const taiEffectif = sd.tai + b.tai;

    // --- 1b. Points de création compétences (ex: Orphelin -10) ---
    if (b.ptsCreationComp_bonus !== 0) {
      sd.ptsCreationComp.max = Math.max(0, sd.ptsCreationComp.max + b.ptsCreationComp_bonus);
    }

    // --- 2. Re-dérivation des bonus/malus d'aspects (utilise les totaux dérivés) ---
    sd.bonusCorps  = sd.corps.score  - sd.corpsNoirTotal;
    sd.bonusEsprit = sd.esprit.score - sd.espritNoirTotal;
    sd.bonusAme    = sd.ame.score    - sd.ameNoirTotal;
    sd.flamme      = Math.min(sd.corps.score, sd.esprit.score, sd.ame.score);
    sd.flammeNoire = Math.min(sd.corpsNoirTotal, sd.espritNoirTotal, sd.ameNoirTotal);
    // PH max = Flamme x 2 quand il n'est pas saisi (valeur stockée à 0) : suit la Flamme modifiée
    if ((this._source?.system?.ph?.max ?? 0) === 0) sd.ph.max = sd.flamme * 2;

    // --- 3. Re-dérivation TAI (si TAI modifié) ---
    if (b.tai !== 0) {
      if (!sd.mvOverride) sd.mv = T.lookupTai(T.taiToMv, taiEffectif);
      sd.modPoids = T.lookupTai(T.taiToModPoids, taiEffectif);
    }

    // --- 4. Re-dérivation dépendant de force / résistance ---
    const peupleKey = T.peupleNomVersKey?.[sd.peuple] ?? "humain";
    const pData     = T.peuplesData?.[peupleKey] ?? T.peuplesData?.humain;
    const bpdv      = pData?.bpdv ?? T.lookupTai(T.taiToBpdv, taiEffectif);
    sd.pdv.max   = bpdv + sd.resistance.score * 3 + sd.pdv.bonusDe;
    // Alias de compatibilité modules (attributes.hp) : suit le maximum recalculé
    if (sd.attributes?.hp) sd.attributes.hp.max = sd.pdv.max;
    sd.bd        = T.lookupBd(sd.force.score, taiEffectif);
    sd.chargeMax = (sd.force.score + sd.resistance.score) * sd.modPoids;
    sd.demiCharge = Math.floor(sd.chargeMax / 2);
    sd.chargeJour = Math.floor(sd.chargeMax / 4);
    sd.seuilBlessureGrave    = Math.max(1, Math.floor(sd.pdv.max / 3));
    sd.seuilBlessureCritique = Math.max(1, Math.floor(sd.pdv.max / 2));

    // --- 5. Re-dérivation des caractéristiques secondaires ---
    sd.melee = Math.floor((sd.force.score + sd.agilite.score * 2) / 3);
    sd.tir   = Math.floor((sd.agilite.score + sd.perception.score) / 2);

    if (sd.typeMage === "jorniste")           sd.emprise = sd.intelligence.score;
    else if (sd.typeMage === "obscurantiste") sd.emprise = sd.volonte.score;
    else sd.emprise = Math.floor((sd.intelligence.score + sd.volonte.score) / 2);
    sd.emprise += b.emprise_bonus + suppEmprise;

    // Art : Fée Noire = CRÉ seul ; autres = ⌊(CHA + CRÉ) / 2⌋
    if (peupleKey === "feeNoire") {
      sd.art = sd.creativite.score + b.art_bonus + suppArt;
    } else {
      sd.art = Math.floor((sd.charisma.score + sd.creativite.score) / 2) + b.art_bonus + suppArt;
    }
    sd.initiative       = sd.agilite.score + sd.perception.score + sd.bonusCorps + b.initiative_bonus + suppInitiative;
    sd.initMagique      = sd.initiative + 10;
    sd.defenseNaturelle = sd.agilite.score + sd.bonusCorps;
    sd.noirceur         = Math.floor(sd.tenebres / 10);
    // Stockage des bonus d'avantages sur les stats dérivées (transient, pour affichage dans les tooltips)
    sd.avantageInitiativeBonus = b.initiative_bonus;
    sd.avantageArtBonus        = b.art_bonus;
    sd.avantageEmpriseBonus    = b.emprise_bonus;

    // MV diviseur (Boiteux ÷2, Un membre en moins ÷3)
    if (b.mv_divisor > 1) {
      sd.mv = Math.max(1, Math.floor(sd.mv / b.mv_divisor));
    }
  }

  /**
   * Stats du personnage qui dépendent de ses compétences (esquive, potentiels de conjuration, d'Arts
   * Magiques et d'Emprise). Calculées une seule fois, après les effets actifs.
   * @param {Item[]} competences
   */
  _deriverStatsCompetences(competences) {
    const sd = this.system;
    const score = (cle) => competenceConnue(competences, cle)?.system.score ?? 0;

    // Esquive totale (AGI + compétence Esquive + Bonus Corps)
    const scoreEsquive = score("esquive");
    sd.esquiveCompScore = scoreEsquive; // transient — pour les tooltips
    sd.esquiveTotal    = sd.agilite.score + scoreEsquive + sd.bonusCorps;
    sd.esquiveDistance = Math.round((sd.agilite.score + scoreEsquive) / 2);

    // Potentiel de conjuration (Noirceur + Démonologie + Bonus Âme)
    sd.aptitudeConjuration = sd.noirceur + score("demonologie") + sd.bonusAme;
    // Potentiel Arts Magiques (ART + Arts Magiques + Bonus Âme)
    sd.aptitudeArtsMagiques = sd.art + score("artsMagiques") + sd.bonusAme;
    // Potentiel d'Emprise (EMP + Conn. des Danseurs + Bonus Esprit)
    sd.aptitudeEmprise = (sd.emprise ?? 0) + score("danseurs") + (sd.bonusEsprit ?? 0);
  }

  /**
   * Malus d'AGI dû à l'armure (valeur négative ou nulle).
   * Personnage : armure et bouclier portés (`_malusAgiActif`) ; autres types : `system.armure.malusAgi`
   * (stocké en positif pour le PNJ, dérivé de l'armure portée pour le compagnon).
   */
  _malusAgiArmure() {
    const sd = this.system;
    if (this.type === "personnage") {
      return (sd.armure?._malusAgiActif ?? 0) + (sd.bouclier?._malusAgiActif ?? 0);
    }
    const malus = sd.armure?.malusAgi ?? 0;
    return malus ? -malus : 0;
  }

  /**
   * Malus d'armure applicable à un jet fondé sur une caractéristique : AGI (armure et bouclier),
   * PER (casque), aucun pour les autres.
   */
  _malusArmureAttribut(attributKey) {
    if (attributKey === "agilite") return this._malusAgiArmure();
    if (attributKey === "perception") return this.system.armure?._malusPerActif ?? 0;
    return 0;
  }

  /** Score d'une caractéristique : `{ score }` (personnage) ou nombre (compagnon, démon, PNJ). */
  _scoreAttribut(key) {
    return scoreAttribut(this.system, key);
  }

  /**
   * Modificateurs automatiques d'un jet : malus cumulés (armure, surcharge, blessures graves) et
   * bonus de Saisonin, avec la ligne de détail du Saisonin pour la carte de chat.
   * @param {number} [malusArmure=0]  Malus d'armure propre au jet
   */
  _modificateursJet(malusArmure = 0) {
    const bonusSaisonin = this._getBonusSaisonin();
    return {
      malus: cumulMalusJet(this.system, malusArmure),
      bonusSaisonin,
      detailSaisonin: bonusSaisonin > 0 ? { saisonin: `${_L("BonusSaisonin")} : +${bonusSaisonin}` } : {},
    };
  }

  // ==============================
  // Méthodes de jet de dés
  // ==============================

  /**
   * Jet d'attribut principal
   * Formule: 1d10 explodant + Attribut*2 + BonusAspect + modificateurs
   */
  async rollAttribut(attributKey, options = {}) {
    const sd = this.system;
    const attrConfig = CONFIG.AGONE.attributs[attributKey];
    if (!attrConfig) return;

    const attrScore = this._scoreAttribut(attributKey);
    const hasAspects = sd.bonusCorps !== undefined;
    const bonusAspect = bonusAspectAttribut(sd, attributKey);

    const label = game.i18n.localize(attrConfig.label);
    // Le malus d'armure réduit la caractéristique elle-même (AGI/PER effective affichée sur la fiche) : il est doublé
    const malusArmure = this._malusArmureAttribut(attributKey);
    const scoreEffectif = Math.max(0, attrScore + malusArmure);
    const baseScore = scoreEffectif * 2 + bonusAspect;

    const jet = await this._dialogModificateur(label, options);
    if (!jet) return;
    const { modif } = jet;

    const { malus, bonusSaisonin, detailSaisonin } = this._modificateursJet();

    const roll = new Roll(
      "1d10x10 + @base + @malus + @modif",
      { base: baseScore, malus, modif: modif + bonusSaisonin }
    );
    await roll.evaluate();
    const jetPoste = await this._sendRollToChat(roll, label, {
      base:   `${_L("AttributX2", { attribut: label })} : ${scoreEffectif * 2}`,
      ...(hasAspects ? { aspect: `${_L("BonusAspect")} : ${bonusAspect}` } : {}),
      modif:  `${_L("BonusMalus")} : ${modif + malus}`,
      ...detailSaisonin
    }, { rollType: jet.rollType, relance: this._infoRelance("rollAttribut", [attributKey], options, jet) });
    return jetPoste ?? roll;
  }

  /**
   * Jet de compétence
   * Formule: 1d10 explodant + Compétence + Attribut + BonusAspect + modificateurs
   */
  async rollCompetence(itemId, options = {}) {
    const item = this.items.get(itemId);
    if (!item || item.type !== "competence") return;

    const sd = this.system;
    const compData  = item.system;
    const compScore = compData.score ?? 0;
    const attrKey   = compData.attributLie ?? "agilite";
    const attrScore = this._scoreAttribut(attrKey);

    const attrConfig = CONFIG.AGONE.attributs[attrKey] ?? {};
    const bonusAspect = bonusAspectAttribut(sd, attrKey);

    const specialite = compData.specialite ?? "";
    const label = item.name + (compData.domaine ? ` [${compData.domaine}]` : "");
    const jet = await this._dialogModificateur(label, { ...options, specialite });
    if (!jet) return;
    const { modif } = jet;

    const bonusSpe    = jet.bonusSpe;
    const malusComp0  = compScore === 0 ? -3 : 0;
    const { malus, bonusSaisonin, detailSaisonin } = this._modificateursJet(this._malusArmureAttribut(attrKey));

    const roll = new Roll(
      "1d10x10 + @comp + @attr + @bonus + @modif",
      {
        comp: compScore,
        attr: attrScore,
        bonus: bonusAspect + bonusSpe,
        modif: modif + malusComp0 + malus + bonusSaisonin
      }
    );
    await roll.evaluate();
    const jetPoste = await this._sendRollToChat(roll, label, {
      competence: `${label} : ${compScore}${compScore === 0 ? ` (${game.i18n.localize("AGONE.MalusCompNonApprise")})` : ""}`,
      attribut:  `${game.i18n.localize(attrConfig.label ?? attrKey)} : ${attrScore}`,
      aspect:    `${_L("BonusAspect")} : ${bonusAspect}${bonusSpe ? ` + ${_L("Specialite")} : +${bonusSpe}` : ""}`,
      modif:     `${_L("BonusMalus")} : ${modif + malusComp0 + malus}`,
      ...detailSaisonin,
      ...(compData.notes    ? { notes:    compData.notes } : {})
    }, { rollType: jet.rollType, relance: this._infoRelance("rollCompetence", [itemId], options, jet) });
    return jetPoste ?? roll;
  }

  // Jet d'une compétence non acquise (score 0, malus -3 automatique)
  async rollCompetenceSansItem(nom, attributLie, domaine, { fastForward = false, relance = null, heroisme = false } = {}) {
    const sd     = this.system;
    const attrKey = attributLie ?? "agilite"; // défaut pour la présélection dans le dialog

    const label = nom;

    // Construire les options du sélecteur d'attribut
    const attrOptions = Object.entries(CONFIG.AGONE.attributs).map(([key, cfg]) => ({
      value:    key,
      label:    `${game.i18n.localize(cfg.label ?? key)} (${cfg.abbr}) : ${this._scoreAttribut(key)}`,
      selected: key === attrKey,
    }));

    // fastForward : caractéristique liée, sans modificateur, jet ouvert (tests, macros)
    // relance (point d'Héroïsme) : mêmes choix que le jet d'origine
    const result = relance?.dialog ? { ...relance.dialog, heroisme: false }
      : fastForward ? { attrChosen: attrKey, modif: 0, type: "ouvert", heroisme: !!heroisme } : await foundry.applications.api.DialogV2.wait({
      window:  { title: label },
      content: contenuDialogueJet(label, [
        champSelect("attrChosen", game.i18n.localize("AGONE.AttributLie"), attrOptions),
        champNombre("modif", game.i18n.localize("AGONE.BonusMalus"), { autofocus: true }),
        champJetOuvert(),
        this._ligneHeroisme(),
      ]),
      buttons: boutonsDialogueJet(el => ({
        attrChosen: el.attrChosen.value,
        modif:      parseInt(el.modif.value) || 0,
        type:       el.typeJet.checked ? "ouvert" : "ferme",
        heroisme:   !!el.heroisme?.checked,
      })),
      rejectClose: false,
    });

    if (!result || typeof result === "string") return null;
    const rollType = result.type;

    const chosenKey = result.attrChosen ?? attrKey;
    const chosenScore = this._scoreAttribut(chosenKey);
    const chosenCfg   = CONFIG.AGONE.attributs[chosenKey] ?? {};
    const modif = result.modif;

    const bonusAspect = bonusAspectAttribut(sd, chosenKey);
    const { malus, bonusSaisonin, detailSaisonin } = this._modificateursJet(this._malusArmureAttribut(chosenKey));

    const roll = new Roll(
      "1d10x10 + @comp + @attr + @bonus + @modif",
      {
        comp:  0,
        attr:  chosenScore,
        bonus: bonusAspect,
        modif: modif - 3 + malus + bonusSaisonin
      }
    );
    await roll.evaluate();
    const jetPoste = await this._sendRollToChat(roll, label, {
      competence: `${label} : 0 (${game.i18n.localize("AGONE.MalusCompNonApprise")})`,
      attribut:  `${game.i18n.localize(chosenCfg.label ?? chosenKey)} : ${chosenScore}`,
      aspect:    `${_L("BonusAspect")} : ${bonusAspect}`,
      modif:     `${_L("BonusMalus")} : ${modif - 3 + malus}`,
      ...detailSaisonin
    }, {
      rollType,
      relance: this._infoRelance("rollCompetenceSansItem", [nom, attributLie, domaine], { relance },
        { attrChosen: chosenKey, modif, type: rollType, heroisme: !relance && !!result.heroisme }),
    });
    return jetPoste ?? roll;
  }

  /**
   * Expose les statistiques dérivées pour les formules de jet FoundryVTT
   * (p. ex. CONFIG.Combat.initiative.formula = "1d10 + @initiative").
   * Renvoie une copie : le cœur renvoie `this.system` lui-même, et y écrire donnerait un
   * `bonusCorps` aux compagnons et démons (qui n'ont pas d'aspects).
   * @override
   */
  getRollData() {
    const sd = this.system;
    return {
      ...super.getRollData(),
      initiative:  sd.initiative  ?? 0,
      initMagique: sd.initMagique ?? 0,
      bonusCorps:  sd.bonusCorps  ?? 0,
      bonusEsprit: sd.bonusEsprit ?? 0,
      bonusAme:    sd.bonusAme    ?? 0,
    };
  }

  /**
   * Jet d'initiative : 1d10 fermé (jamais explosif, ni fumble ni critique) + Initiative + bonus d'arme.
   * Le total affiché est celui reporté dans le tracker de combat.
   * @param {string|null} [armeId]  Arme utilisée (bonus d'initiative), ou null
   * @param {object} [options]      Options de dialogue (fastForward, relance, heroisme)
   * @param {string} [options.combatantId]  Combattant à mettre à jour dans le combat actif
   *   (défaut : le combattant du jeton de l'acteur, sinon le premier combattant de cet acteur)
   */
  async rollInitiative(armeId = null, options = {}) {
    // Tolère rollInitiative({ combatantId }) : options sans arme
    if (armeId && typeof armeId === "object") {
      options = armeId;
      armeId = null;
    }
    const { combatantId = null, ...optionsJet } = options ?? {};
    const sd = this.system;
    let base = sd.initiative ?? 0;
    let label = game.i18n.localize("AGONE.Initiative");

    let armeInit = null;
    if (armeId) {
      const arme = this.items.get(armeId);
      if (arme) {
        base += arme.system.initBonus ?? 0;
        label += ` (${arme.name})`;
        armeInit = arme;
      }
    }

    const jet = await this._dialogModificateur(label, { ...optionsJet, ferme: true });
    if (!jet) return;
    const { modif } = jet;

    const { malus, bonusSaisonin, detailSaisonin } = this._modificateursJet();
    const roll = new Roll(
      "1d10 + @base + @modif",
      { base, modif: modif + malus + bonusSaisonin }
    );
    await roll.evaluate();
    const jetFinal = await this._sendRollToChat(roll, label, {
      base:  `${_L("Initiative")} : ${base}`,
      modif: `${_L("BonusMalus")} : ${modif + malus}`,
      ...detailSaisonin
    }, {
      rollType: "ferme",
      relance: this._infoRelance("rollInitiative", [armeId], optionsJet, jet, combatantId ? { combatantId } : {}),
      ...(armeInit ? {
        arme:        armeInit,
        typeJet:     "initiative",
        description: armeInit.system.description ?? "",
        armeMeta: {
          dommages:      armeInit.system.dommages ?? "",
          dommagesTotal: armeInit.system.dommagesTotal ?? null,
          portee:        armeInit.system.portee || null,
          style:         armeInit.system.style ?? "melee",
        }
      } : {}),
    });

    // Mettre à jour le tracker de combat
    await this._setInitiativeInCombat(Math.max(0, (jetFinal ?? roll).total), combatantId);
    return jetFinal ?? roll;
  }

  /**
   * Jet d'initiative magique (Initiative + 10, 1d10 fermé : ni fumble ni critique)
   * @param {object} [options]      Options de dialogue (fastForward, relance, heroisme)
   * @param {string} [options.combatantId]  Combattant à mettre à jour dans le combat actif
   */
  async rollInitiativeMagique(options = {}) {
    const { combatantId = null, ...optionsJet } = options ?? {};
    const sd    = this.system;
    const base  = sd.initMagique ?? 0;
    const label = game.i18n.localize("AGONE.InitMagique");

    const jet = await this._dialogModificateur(label, { ...optionsJet, ferme: true });
    if (!jet) return;
    const { modif } = jet;

    const { malus, bonusSaisonin, detailSaisonin } = this._modificateursJet();
    const roll = new Roll(
      "1d10 + @base + @modif",
      { base, modif: modif + malus + bonusSaisonin }
    );
    await roll.evaluate();
    const jetFinal = await this._sendRollToChat(roll, label, {
      base:  `${_L("InitiativeMagique")} : ${base}`,
      modif: `${_L("BonusMalus")} : ${modif + malus}`,
      ...detailSaisonin
    }, {
      rollType: "ferme",
      relance: this._infoRelance("rollInitiativeMagique", [], optionsJet, jet, combatantId ? { combatantId } : {}),
    });

    // Mettre à jour le tracker de combat
    await this._setInitiativeInCombat(Math.max(0, (jetFinal ?? roll).total), combatantId);
    return jetFinal ?? roll;
  }

  /**
   * Jet d'attaque avec arme
   */
  async rollAttaque(armeId, options = {}) {
    const arme = this.items.get(armeId);
    if (!arme) return;

    const style = arme.system.style ?? "melee";

    // Compétence liée et caractéristique de base (attributLie de la compétence, sinon repli sur le
    // style de l'arme) : mêmes formules que les totaux affichés sur la fiche (helpers/derivations.mjs)
    const { scoreComp, attributLie, baseAttaque: baseAttack, attackBonus, bonusCorps, attackTotal: total }
      = totauxArme(arme.system, this.system, this.items);
    const baseAttackLabel = attributLie === "tir" ? "TIR" : attributLie === "melee" ? "MÊL" : attributLie.toUpperCase();

    const label = `${game.i18n.localize("AGONE.Attaque")} — ${arme.name}`;
    const jet = await this._dialogModificateur(label, options);
    if (!jet) return;
    const { modif } = jet;

    const { malus, bonusSaisonin, detailSaisonin } = this._modificateursJet();
    const roll = new Roll(
      "1d10x10 + @total + @modif",
      { total, modif: modif + malus + bonusSaisonin }
    );
    await roll.evaluate();
    const jetPoste = await this._sendRollToChat(roll, label, {
      style:     `${baseAttackLabel} : ${baseAttack}`,
      competence:`${_L("Competence")} : ${scoreComp}`,
      arme:      `${_L("BonusArme")} : ${attackBonus}`,
      aspect:    `${_L("BonusCorps")} : ${bonusCorps}`,
      modif:     `${_L("BonusMalus")} : ${modif + malus}`,
      ...detailSaisonin
    }, {
      rollType: jet.rollType, relance: this._infoRelance("rollAttaque", [armeId], options, jet),
      arme,
      typeJet: "attaque",
      description: arme.system.description ?? "",
      armeMeta: {
        dommages:      arme.system.dommages ?? "",
        dommagesTotal: arme.system.dommagesTotal ?? null,
        portee:        arme.system.portee || null,
        style:         style,
      }
    });
    return jetPoste ?? roll;
  }

  /**
   * Jet de parade avec arme
   */
  async rollParade(armeId, options = {}) {
    const arme = this.items.get(armeId);
    if (!arme) return;

    const { melee, scoreComp, defenseBonus, bonusCorps, defenseTotal: total }
      = totauxArme(arme.system, this.system, this.items);

    const label = `${game.i18n.localize("AGONE.Parade")} — ${arme.name}`;
    const jet = await this._dialogModificateur(label, options);
    if (!jet) return;
    const { modif } = jet;

    const { malus, bonusSaisonin, detailSaisonin } = this._modificateursJet(this._malusAgiArmure());
    const roll = new Roll(
      "1d10x10 + @total + @modif",
      { total, modif: modif + malus + bonusSaisonin }
    );
    await roll.evaluate();
    const jetPoste = await this._sendRollToChat(roll, label, {
      melee:     `MÊL : ${melee}`,
      competence:`${_L("Competence")} : ${scoreComp}`,
      arme:      `${_L("BonusArme")} : ${defenseBonus}`,
      aspect:    `${_L("BonusCorps")} : ${bonusCorps}`,
      modif:     `${_L("BonusMalus")} : ${modif + malus}`,
      ...detailSaisonin
    }, {
      rollType: jet.rollType, relance: this._infoRelance("rollParade", [armeId], options, jet),
      arme,
      typeJet: "parade",
      description: arme.system.description ?? "",
      armeMeta: {
        dommages:      arme.system.dommages ?? "",
        dommagesTotal: arme.system.dommagesTotal ?? null,
        portee:        arme.system.portee || null,
        style:         arme.system.style ?? "melee",
      }
    });
    return jetPoste ?? roll;
  }

  /**
   * Jet d'esquive
   */
  async rollEsquive(options = {}) {
    const sd = this.system;
    const total = sd.esquiveTotal ?? (this._scoreAttribut("agilite"));
    const label = game.i18n.localize("AGONE.Esquive");
    const jet = await this._dialogModificateur(label, options);
    if (!jet) return;
    const { modif } = jet;

    const { malus, bonusSaisonin, detailSaisonin } = this._modificateursJet(this._malusAgiArmure());
    const roll = new Roll(
      "1d10x10 + @total + @modif",
      { total, modif: modif + malus + bonusSaisonin }
    );
    await roll.evaluate();
    const jetPoste = await this._sendRollToChat(roll, label, {
      base:  `${_L("Esquive")} : ${total}`,
      modif: `${_L("BonusMalus")} : ${modif + malus}`,
      ...detailSaisonin
    }, { rollType: jet.rollType, relance: this._infoRelance("rollEsquive", [], options, jet) });
    return jetPoste ?? roll;
  }

  /**
   * Jet de Défense Naturelle
   */
  async rollDefenseNaturelle(options = {}) {
    const sd = this.system;
    const total = sd.defenseNaturelle ?? (this._scoreAttribut("agilite"));
    const label = game.i18n.localize("AGONE.DefenseNaturelle");
    const jet = await this._dialogModificateur(label, options);
    if (!jet) return;
    const { modif } = jet;

    const { malus, bonusSaisonin, detailSaisonin } = this._modificateursJet(this._malusAgiArmure());
    const roll = new Roll(
      "1d10x10 + @total + @modif",
      { total, modif: modif + malus + bonusSaisonin }
    );
    await roll.evaluate();
    const jetPoste = await this._sendRollToChat(roll, label, {
      base:  `${_L("DefenseNaturelle")} : ${total}`,
      modif: `${_L("BonusMalus")} : ${modif + malus}`,
      ...detailSaisonin
    }, { rollType: jet.rollType, relance: this._infoRelance("rollDefenseNaturelle", [], options, jet) });
    return jetPoste ?? roll;
  }

  /**
   * Jet de VOL à Difficulté 10 pour la 3e blessure grave
   * (sans malus de blessures selon la règle)
   */
  async rollVolBlessure3(options = {}) {
    const sd = this.system;
    const volScore = this._scoreAttribut("volonte");
    const bonusAme = sd.bonusAme ?? 0;
    const base = volScore * 2 + bonusAme;
    const label = game.i18n.localize("AGONE.JetVolBlessure3");
    const DIFFICULTE = 10;

    // On force le type ouvert pour que _sendRollToChat gère fumbles & critiques
    const roll = new Roll("1d10x10 + @base", { base });
    await roll.evaluate();

    const finalRoll = await this._sendRollToChat(roll, label, {
      volonte: `${game.i18n.localize("AGONE.Attribut.Volonte")} x2 : ${volScore * 2}`,
      ame:     `${game.i18n.localize("AGONE.BonusAme")} : ${bonusAme}`,
      diff:    `${game.i18n.localize("AGONE.Difficulte")} : ${DIFFICULTE}`,
    }, { rollType: "ouvert", relance: this._infoRelance("rollVolBlessure3", [], options) });

    // Fumble (dé = 1) = échec automatique, sinon on compare le total
    const firstFace = finalRoll?.dice[0]?.results?.[0]?.result ?? null;
    const isFumble  = firstFace === 1;
    const succes    = !isFumble && (finalRoll?.total ?? 0) >= DIFFICULTE;

    if (!succes) {
      ui.notifications.warn(`${this.name} — ${game.i18n.localize("AGONE.VolBlessureEchec")}`);
    }
    return finalRoll;
  }

  /**
   * Jet de Fumble : 1d10 fermé → pénalité à soustraire du jet raté
   */
  async rollFumble() {
    const label = game.i18n.localize("AGONE.Fumble");
    const roll = new Roll("1d10");
    await roll.evaluate();

    const content = await foundry.applications.handlebars.renderTemplate(
      "systems/agone/templates/chat/roll-result.hbs",
      {
        actor:        this,
        label,
        roll,
        total:        roll.total,
        details:      [{ label: game.i18n.localize("AGONE.PenaliteFumble"), value: roll.total }],
        rollType:     "ferme",
        isFumble:     true,
        fumblePenalty: roll.total,
        fumbleTotal:  null,
        isCritique:   false,
      }
    );

    await ChatMessage.create(appliquerModeJet(
      { speaker: ChatMessage.getSpeaker({ actor: this }), content, rolls: [roll] }
    ));
    return roll;
  }

  /**
   * Jet de sort / magie
   */
  async rollSort(itemIdOrData, { impro = false, ...options } = {}) {
    const sd = this.system;
    let sort;
    if (typeof itemIdOrData === "string") {
      sort = this.items.get(itemIdOrData);
      if (!sort || sort.type !== "sort") return null;
    } else {
      // Données brutes depuis le navigateur de sorts (SORTS_DATA)
      sort = { name: itemIdOrData.name, system: {
        seuil       : itemIdOrData.seuil       ?? 0,
        typeMagie   : itemIdOrData.typeMagie   ?? "",
        compAlt     : itemIdOrData.compAlt     ?? "",
        attrAlt     : itemIdOrData.attrAlt     ?? "",
        description : itemIdOrData.description ?? "",
        portee      : itemIdOrData.portee      ?? "",
        duree       : itemIdOrData.duree       ?? "",
        danse       : itemIdOrData.danse       ?? "",
        instrument  : itemIdOrData.instrument  ?? "",
      }};
    }

    // ── Guard : le personnage doit avoir Arts Magiques pour ce domaine ──────
    // Correspondance typeMagie (clé minuscule de SORTS_DATA) → domaine réel dans les compétences
    const TYPES_TO_DOMAINE = {
      accord:        "Accord",
      cyse:          "Cyse",
      decorum:       "Décorum",
      geste:         "Geste",
      // jorniste / obscurantiste / eclipsiste → vérification sans domaine précis
    };
    // Intégrer les domaines custom (clé = nom normalisé sans accents + minuscule)
    const _customDomaines = game.settings.get("agone", "domainesArtsCustom") ?? [];
    for (const d of _customDomaines) {
      const key = normaliserNom(d.nom);
      if (key) TYPES_TO_DOMAINE[key] = d.nom;
    }
    const EMPRISE_TYPES = new Set(["jorniste", "obscurantiste", "eclipsiste"]);
    const typeMagie  = sort.system.typeMagie?.trim().toLowerCase() ?? "";
    let typeMagieResolved = typeMagie;
    const compAltNomGuard = sort.system.compAlt?.trim() ?? "";
    if (!compAltNomGuard && typeMagie && !TYPES_TO_DOMAINE[typeMagie] && !EMPRISE_TYPES.has(typeMagie)) {
      // Relance (point d'Héroïsme) : réutiliser le type choisi lors du jet d'origine
      const selectedType = (options.relance && options.typeMagie) || await this._promptMagicTypeFallback(typeMagie);
      if (!selectedType) return null;
      typeMagieResolved = selectedType;
    }

    if (!compAltNomGuard) {
      const domaineCible = TYPES_TO_DOMAINE[typeMagieResolved] ?? null;
      const domaineCustomGuard = domaineCible ? _customDomaines.find(d => d.nom === domaineCible) : null;
      const { competence: compNomGuard } = resoudreDomaineArts(domaineCustomGuard, Object.keys(CONFIG.AGONE.attributs));
      if (compNomGuard) {
        // Domaine custom lié à une compétence précise : elle remplace l'exigence d'Arts Magiques
        const hasComp = this.items.some(i => i.type === "competence" && i.name === compNomGuard);
        if (!hasComp) {
          ui.notifications.warn(game.i18n.format("AGONE.Notif.PasCompetenceDomaine",
            { acteur: this.name, competence: compNomGuard, domaine: domaineCible }));
          return null;
        }
      } else {
        const hasArts = !!competenceConnue(this.items, "artsMagiques", {
          filtre: i => domaineCible === null || i.system.domaine === domaineCible,
        });
        if (!hasArts) {
          const domainLabel = domaineCible ?? (typeMagieResolved || "—");
          ui.notifications.warn(game.i18n.format("AGONE.Notif.PasArtsMagiques", { acteur: this.name, domaine: domainLabel }));
          return null;
        }
      }
    }

    const seuilBase = sort.system.seuil ?? 0;

    // Aptitude : utilise le score de la compétence "Arts Magiques" du domaine exact du sort
    // (ou, pour un domaine custom, l'attribut et/ou la compétence redéfinis)
    const domaineCibleApt = TYPES_TO_DOMAINE[typeMagieResolved] ?? null;
    let aptitude;
    let aptitudeDomainLabel;
    if (domaineCibleApt) {
      const domaineCustomApt = _customDomaines.find(d => d.nom === domaineCibleApt);
      const { attribut, competence: compNomApt } = resoudreDomaineArts(domaineCustomApt, Object.keys(CONFIG.AGONE.attributs));

      let baseScore, baseLabel;
      if (attribut === "art") {
        baseScore = (sd.art ?? 0) + (sd.bonusAme ?? 0);
        baseLabel = "ART";
      } else {
        const attrCfg = CONFIG.AGONE.attributs[attribut] ?? {};
        baseScore = this._scoreAttribut(attribut) + bonusAspectAttribut(sd, attribut);
        baseLabel = attrCfg.abbr ?? attribut.toUpperCase();
      }

      let compScore, compLabel;
      if (compNomApt) {
        const compCustomItem = this.items.find(i => i.type === "competence" && i.name === compNomApt);
        compScore = compCustomItem?.system.score ?? 0;
        compLabel = compNomApt;
      } else {
        const compArtsExact = competenceConnue(this.items, "artsMagiques", {
          filtre: i => i.system.domaine === domaineCibleApt,
        });
        compScore = compArtsExact?.system.score ?? 0;
        compLabel = _L("ArtsMagiquesDomaine", { domaine: domaineCibleApt });
      }

      aptitude = baseScore + compScore;
      aptitudeDomainLabel = (attribut === "art" && !compNomApt)
        ? `${compLabel} : ${aptitude}`
        : `${baseLabel} + ${compLabel} : ${aptitude}`;
    } else {
      // Pas de domaine précis (jorniste / obscurantiste / eclipsiste)
      aptitude = sd.aptitudeArtsMagiques ?? sd.art ?? 0;
      aptitudeDomainLabel = `${_L("ArtsMagiques")} : ${aptitude}`;
    }

    // Compétence alternative : min(artsMagiques, compAlt + attrAlt + bonusAspect)
    const compAltNom = sort.system.compAlt?.trim() ?? "";
    if (compAltNom) {
      const compAltItem = this.items.find(i => i.type === "competence" && i.name === compAltNom);
      if (compAltItem) {
        const attrAltKey  = sort.system.attrAlt || compAltItem.system.attributLie || "charisma";
        const attrAltScore = this._scoreAttribut(attrAltKey);
        const bonusAlt    = bonusAspectAttribut(sd, attrAltKey);
        const altAptitude = compAltItem.system.score + attrAltScore + bonusAlt;
        aptitude = Math.min(aptitude, altAptitude);
      }
    }

    // Accord : contraindre par la compétence dont le domaine correspond à l'instrument du sort
    const instrument = (typeMagieResolved === "accord" && !compAltNom)
      ? (sort.system.instrument?.trim().toLowerCase() ?? "")
      : "";
    let compInstrumentLabel = "";
    if (instrument) {
      const compInstrument = this.items.find(i =>
        i.type === "competence" && i.system.domaine?.trim().toLowerCase() === instrument
      );
      if (!compInstrument) {
        ui.notifications.warn(game.i18n.format("AGONE.Notif.PasInstrument", { acteur: this.name, instrument: sort.system.instrument }));
        return null;
      }
      const attrInstrKey   = compInstrument.system.attributLie || "charisma";
      const attrInstrScore = this._scoreAttribut(attrInstrKey);
      const bonusInstr     = bonusAspectAttribut(sd, attrInstrKey);
      const instrAptitude = compInstrument.system.score + attrInstrScore + bonusInstr;
      aptitude = Math.min(aptitude, instrAptitude);
      compInstrumentLabel = compInstrument.name
        + (compInstrument.system.domaine ? ` (${compInstrument.system.domaine})` : "");
    }

    const label = impro ? _L("SortImprovise", { sort: sort.name }) : sort.name;
    const jet = await this._dialogSort(label, seuilBase, impro, options);
    if (!jet) return null;
    const { modif, seuilBonus, instantane } = jet;

    const seuilEffectif = instantane ? seuilBase * 2 : seuilBase;
    const seuilFinal = impro ? (seuilEffectif + seuilBonus) * 2 : seuilEffectif + seuilBonus;

    const bonusSaisonin = this._getBonusSaisonin();
    const roll = new Roll(
      "1d10x10 + @aptitude + @modif",
      { aptitude, modif: modif + bonusSaisonin }
    );
    await roll.evaluate();

    const succes = roll.total >= seuilFinal;
    const aptitudeAutre = compAltNom || compInstrumentLabel;
    const aptitudeLabel = aptitudeAutre
      ? `${_L("MinAvec", { label: aptitudeDomainLabel.replace(/ : \d+$/, ""), autre: aptitudeAutre })} : ${aptitude}`
      : aptitudeDomainLabel;
    const inst = _L("Instantane"), imp = _L("Improvise");
    let seuilCalc = "";
    if (impro && instantane && seuilBonus > 0) seuilCalc = `((${seuilBase} × 2 + ${seuilBonus}) × 2, ${inst} + ${imp})`;
    else if (impro && instantane)              seuilCalc = `(${seuilBase} × 2 × 2, ${inst} + ${imp})`;
    else if (instantane && seuilBonus > 0)     seuilCalc = `(${seuilBase} × 2 + ${seuilBonus}, ${inst})`;
    else if (instantane)                       seuilCalc = `(${seuilBase} × 2, ${inst})`;
    else if (impro && seuilBonus > 0)          seuilCalc = `((${seuilBase} + ${seuilBonus}) × 2, ${imp})`;
    else if (impro)                            seuilCalc = `(${seuilBase} × 2, ${imp})`;
    else if (seuilBonus > 0)                   seuilCalc = `(${seuilBase} + ${seuilBonus} ${_L("Augmente")})`;
    const seuilLabel = `${_L("Seuil")} : ${seuilFinal}${seuilCalc ? ` ${seuilCalc}` : ""}`;
    const jetPoste = await this._sendRollToChat(roll, label, {
      aptitude: aptitudeLabel,
      seuil:    seuilLabel,
      resultat: _L(succes ? "Succes" : "Echec"),
      modif:    `${_L("BonusMalus")} : ${modif}`,
      ...(bonusSaisonin > 0 ? { saisonin: `${_L("BonusSaisonin")} : +${bonusSaisonin}` } : {})
    }, {
      rollType: jet.rollType, relance: this._infoRelance("rollSort", [itemIdOrData], options, jet, { impro, typeMagie: typeMagieResolved }),
      seuilNumeric: seuilFinal,
      description: sort.system.description ?? "",
      sortMeta: {
        typeMagie: sort.system.typeMagie ?? "",
        portee:    sort.system.portee    ?? "",
        duree:     sort.system.duree     ?? "",
        danse:     sort.system.danse     ?? "",
      }
    });
    return jetPoste ?? roll;
  }

  /**
   * Source du score d'Emprise selon l'obédience (affichée en tooltip).
   */
  _empriseSourceLabel() {
    const sd = this.system;
    if (sd.typeMage === "jorniste")      return `INT (${this._scoreAttribut("intelligence")}) — ${game.i18n.localize("AGONE.Jorniste")}`;
    if (sd.typeMage === "obscurantiste") return `VOL (${this._scoreAttribut("volonte")}) — ${game.i18n.localize("AGONE.Obscurantiste")}`;
    return `(INT ${this._scoreAttribut("intelligence")} + VOL ${this._scoreAttribut("volonte")}) / 2 — ${game.i18n.localize("AGONE.Eclipsiste")}`;
  }

  /**
   * Aptitude d'Emprise via un danseur : EMP + Conn. Danseurs + bonus Esprit,
   * avec les lignes de détail communes pour la carte de chat.
   */
  _aptitudeEmpriseDanseur(danseur) {
    const sd = this.system;
    const compDanseurs      = competenceConnue(this.items, "danseurs");
    const scoreConnDanseurs = compDanseurs?.system.score ?? 0;
    const bonusEsprit       = sd.bonusEsprit ?? 0;
    const aptitude          = (sd.emprise ?? 0) + scoreConnDanseurs + bonusEsprit;
    const bonusDanseur      = danseur.system.bonusEmprise ?? 0;
    const details = {
      empBase:   { label: _L("EmpriseBase"), value: sd.emprise ?? 0, tooltip: this._empriseSourceLabel() },
      connDans:  { label: compDanseurs?.name ?? _L("ConnDanseurs"), value: `+${scoreConnDanseurs}` },
      esprit:    { label: _L("BonusEsprit"), value: `+${bonusEsprit}`,
                   tooltip: _L("BonusEspritTooltip", { esprit: this._scoreAttribut("esprit"), noir: sd.esprit?.noir ?? 0 }) },
      aptTotal:  { label: _L("TotalEmprise"), value: aptitude },
      bonusDans: { label: _L("BonusEmpriseDanseur", { danseur: danseur.name }), value: `+${bonusDanseur}` },
    };
    return { aptitude, bonusDanseur, details };
  }

  /**
   * Jet de sort d'emprise lancé via un danseur. Consomme 1 point d'endurance du danseur.
   * @param {string} danseurId
   * @param {object} sortData  Données du sort ({ name, seuil, description, typeMagie, portee, duree, danse })
   * @param {object} [options]
   * @param {boolean} [options.impro=false]  Sort improvisé (non mémorisé) : seuil × 2
   */
  async rollSortDanseur(danseurId, sortData, { impro = false, ...options } = {}) {
    const danseur = this.items.get(danseurId);
    if (!danseur) return;

    // Une relance (point d'Héroïsme) ne consomme pas à nouveau d'endurance
    const estRelance = !!options.relance;
    if (!estRelance && (danseur.system.enduranceActuelle ?? 0) <= 0) {
      ui.notifications.warn(game.i18n.format("AGONE.Notif.DanseurEpuise", { danseur: danseur.name }));
      return;
    }

    const seuilBase = sortData.seuil ?? 0;
    const seuil     = impro ? seuilBase * 2 : seuilBase;
    const label     = impro
      ? _L("SortImproviseVia", { sort: sortData.name, danseur: danseur.name })
      : _L("SortVia", { sort: sortData.name, danseur: danseur.name });

    const { aptitude, bonusDanseur, details } = this._aptitudeEmpriseDanseur(danseur);

    const jet = await this._dialogModificateur(label, options);
    if (!jet) return;
    const { modif } = jet;

    // Endurance lue après le dialogue : elle a pu changer pendant qu'il était ouvert
    const endBefore = danseur.system.enduranceActuelle ?? 0;
    if (!estRelance && endBefore <= 0) {
      ui.notifications.warn(game.i18n.format("AGONE.Notif.DanseurEpuise", { danseur: danseur.name }));
      return;
    }
    const newEnd    = estRelance ? endBefore : Math.max(0, endBefore - 1);

    const roll = new Roll("1d10x10 + @apt + @bd + @modif", {
      apt: aptitude, bd: bonusDanseur, modif,
    });
    await roll.evaluate();

    const succes = roll.total >= seuil;
    const jetPoste = await this._sendRollToChat(roll, label, {
      sort:      { label: _L("Sort"),      value: sortData.name },
      seuil:     impro
        ? { label: _L("Seuil"), value: `${seuil} (${seuilBase} × 2, ${_L("Improvise")})` }
        : { label: _L("Seuil"), value: seuil, tooltip: _L("SeuilTooltip") },
      resultat:  { label: _L("Resultat"),  value: _L(succes ? "Succes" : "Echec") },
      danseur:   { label: _L("Danseur"),   value: danseur.name },
      endurance: { label: _L("Endurance"), value: estRelance
        ? `${endBefore} / ${danseur.system.enduranceMax ?? 0}`
        : `${endBefore} → ${newEnd} / ${danseur.system.enduranceMax ?? 0}` },
      ...details,
      modif:     { label: _L("BonusMalus"), value: modif >= 0 ? `+${modif}` : modif },
    }, {
      rollType: jet.rollType, relance: this._infoRelance("rollSortDanseur", [danseurId, sortData], options, jet, { impro }),
      seuilNumeric: seuil,
      description: sortData.description ?? "",
      sortMeta: {
        typeMagie: sortData.typeMagie ?? "",
        portee:    sortData.portee    ?? "",
        duree:     sortData.duree     ?? "",
        danse:     sortData.danse     ?? "",
      }
    });

    // Valeur relue juste avant l'écriture (l'envoi du message est asynchrone)
    if (!estRelance) {
      await danseur.update({ "system.enduranceActuelle": Math.max(0, (danseur.system.enduranceActuelle ?? 0) - 1) });
    }
    return jetPoste ?? roll;
  }

  /**
   * Jet de sort d'emprise improvisé via un danseur (depuis le browser de sorts).
   */
  async rollSortImproDanseur(danseurId, sortData) {
    return this.rollSortDanseur(danseurId, sortData, { impro: true });
  }

  /**
   * Jet de potentiel d'Emprise d'un danseur.
   */
  async rollEmprise(danseurId, options = {}) {
    const danseur = this.items.get(danseurId);
    if (!danseur) return;

    const label = game.i18n.format("AGONE.PotentielEmpriseLabel", { nom: danseur.name });
    const { aptitude, bonusDanseur, details } = this._aptitudeEmpriseDanseur(danseur);

    const jet = await this._dialogModificateur(label, options);
    if (!jet) return;
    const { modif } = jet;

    const roll = new Roll("1d10x10 + @apt + @bd + @modif", {
      apt: aptitude, bd: bonusDanseur, modif
    });
    await roll.evaluate();
    const jetPoste = await this._sendRollToChat(roll, label, {
      danseur:   { label: _L("Danseur"),          value: danseur.name },
      endurance: { label: _L("EnduranceDanseur"), value: `${danseur.system.enduranceActuelle ?? 0} / ${danseur.system.enduranceMax ?? 0}` },
      ...details,
      modif:     { label: _L("BonusMalus"),       value: modif >= 0 ? `+${modif}` : modif },
    }, { rollType: jet.rollType, relance: this._infoRelance("rollEmprise", [danseurId], options, jet) });
    return jetPoste ?? roll;
  }

  /**
   * Jet d'Emprise brut : EMP + Résonance + bonus Esprit (ajouté au total, comme
   * aptitudeEmprise et le bonus d'aspect de rollAttribut). Identique pour tous les types d'acteur.
   * Formule : 1d10 explosif + EMP + Résonance + bonus Esprit + modificateurs.
   */
  async rollEmpriseAttr(options = {}) {
    const sd    = this.system;
    const label = game.i18n.localize("AGONE.JeterEmprise");

    const compResonance = competenceConnue(this.items, "resonance");
    const scoreResonance = compResonance?.system.score ?? 0;
    const bonusEsprit    = sd.bonusEsprit ?? 0;
    const empriseBase    = sd.emprise ?? 0;

    const jet = await this._dialogModificateur(label, options);
    if (!jet) return;
    const { modif } = jet;

    const roll = new Roll("1d10x10 + @emp + @res + @esp + @modif", {
      emp: empriseBase, res: scoreResonance, esp: bonusEsprit, modif
    });
    await roll.evaluate();
    const jetPoste = await this._sendRollToChat(roll, label, {
      empBase:   { label: _L("EmpriseBase"), value: empriseBase, tooltip: this._empriseSourceLabel() },
      resonance: { label: compResonance?.name ?? _L("Resonance"), value: `+${scoreResonance}` },
      ...(bonusEsprit ? { esprit: { label: _L("BonusEsprit"), value: `+${bonusEsprit}` } } : {}),
      modif:     { label: _L("BonusMalus"),  value: modif >= 0 ? `+${modif}` : modif },
    }, { rollType: jet.rollType, relance: this._infoRelance("rollEmpriseAttr", [], options, jet) });
    return jetPoste ?? roll;
  }

  /**
   * Jet d'aptitude aux Arts Magiques (ART + Arts Magiques + bonus Âme).
   */
  async rollAptitudeMagie(options = {}) {
    const apt   = this.system.aptitudeArtsMagiques ?? 0;
    const label = game.i18n.localize("AGONE.AptitudeArtsMagiques");
    const jet = await this._dialogModificateur(label, options);
    if (!jet) return;
    const { modif } = jet;
    const roll = new Roll("1d10x10 + @apt + @modif", { apt, modif });
    await roll.evaluate();
    const jetPoste = await this._sendRollToChat(roll, label, {
      aptitude: `${label} : ${apt}`,
      modif:    `${_L("BonusMalus")} : ${modif}`,
    }, { rollType: jet.rollType, relance: this._infoRelance("rollAptitudeMagie", [], options, jet) });
    return jetPoste ?? roll;
  }

  /**
   * Jet d'aptitude à la conjuration (Noirceur + Démonologie + bonus Âme).
   */
  async rollAptitudeConjuration(options = {}) {
    const apt   = this.system.aptitudeConjuration ?? 0;
    const label = game.i18n.localize("AGONE.AptitudeConjuration");
    const jet = await this._dialogModificateur(label, options);
    if (!jet) return;
    const { modif } = jet;
    const roll = new Roll("1d10x10 + @apt + @modif", { apt, modif });
    await roll.evaluate();
    const jetPoste = await this._sendRollToChat(roll, label, {
      aptitude: `${label} : ${apt}`,
      modif:    `${_L("BonusMalus")} : ${modif}`,
    }, { rollType: jet.rollType, relance: this._infoRelance("rollAptitudeConjuration", [], options, jet) });
    return jetPoste ?? roll;
  }

  /**
   * Jet de conjuration : Noirceur + compétence Démonologie.
   */
  async rollConjurationDemonologie(options = {}) {
    const label = game.i18n.localize("AGONE.RollConjurationDemonologie");
    const jet = await this._dialogModificateur(label, options);
    if (!jet) return;
    const { modif } = jet;
    const compDemon = competenceConnue(this.items, "demonologie");
    const scoreComp = compDemon?.system?.score ?? 0;
    const noirceur  = this.system.noirceur ?? 0;
    const roll = new Roll("1d10x10 + @noirceur + @comp + @modif", { noirceur, comp: scoreComp, modif });
    await roll.evaluate();
    const jetPoste = await this._sendRollToChat(roll, label, {
      noirceur:    `${_L("Noirceur")} : ${noirceur}`,
      demonologie: `${_L("Demonologie")} : ${scoreComp}`,
      modif:       `${_L("BonusMalus")} : ${modif}`,
    }, { rollType: jet.rollType, relance: this._infoRelance("rollConjurationDemonologie", [], options, jet) });
    return jetPoste ?? roll;
  }

  /**
   * Jet d'Art Magique pour un domaine : potentiel (ART) ou improvisation (CRÉ).
   * @param {object} d  Composantes affichées dans l'onglet Magie
   *   ({ domaine, apt, specialite, art, baseAbbr, baseBonus, baseBonusLabel, compLabel, cre,
   *      scoreArts, scoreComp, nomComp, scoreEff, bonusAme })
   *   `baseAbbr` (défaut "ART") : abréviation de l'attribut de base du potentiel (domaine custom)
   *   `baseBonus`/`baseBonusLabel` (défaut bonusAme/"BonusAme") : bonus d'aspect du potentiel et sa clé i18n
   *   `compLabel` (défaut "Arts") : nom affiché pour la compétence de score (Arts Magiques ou remplacement custom)
   * @param {object} [options]
   * @param {boolean} [options.impro=false]  Improvisation (CRÉ) au lieu du potentiel (ART)
   */
  async rollArtDomaine(d, { impro = false, ...options } = {}) {
    const label = game.i18n.format(impro ? "AGONE.ImproArtLabel" : "AGONE.PotentielArtLabel", { domaine: d.domaine });
    const jet = await this._dialogModificateur(label, { ...options, specialite: d.specialite });
    if (!jet) return;
    const { modif, bonusSpe } = jet;

    const roll = new Roll("1d10x10 + @total + @modif", { total: d.apt + bonusSpe, modif });
    await roll.evaluate();

    // Formule détaillée visible dans le chat
    // Potentiel : attribut de base (ART, ou celui du domaine custom) + bonus d'aspect associé.
    // Improvisation : toujours CRÉ + bonus Âme (inchangé par le domaine custom).
    const compLabel  = d.compLabel || "Arts";
    const bonusLabel = impro ? "BonusAme" : (d.baseBonusLabel || "BonusAme");
    const bonusVal   = impro ? d.bonusAme : (d.baseBonus ?? d.bonusAme);
    const base    = impro ? `CRÉ(${d.cre})` : `${d.baseAbbr || "ART"}(${d.art})`;
    const arts    = d.nomComp
      ? `min(${compLabel}:${d.scoreArts}, ${d.nomComp}:${d.scoreComp})→${d.scoreEff}`
      : `${compLabel}:${d.scoreArts}`;
    const spe     = bonusSpe ? ` + ${_L("SpeAbr")}(+${bonusSpe})` : "";
    const formule = `${base} + ${arts} + ${_L(bonusLabel)}(${bonusVal})${spe}`;
    const jetPoste = await this._sendRollToChat(roll, label, {
      aptitude: `${formule} : ${d.apt}${bonusSpe ? ` +${bonusSpe}` : ""}`,
      modif:    `${_L("BonusMalus")} : ${modif}`,
    }, { rollType: jet.rollType, relance: this._infoRelance("rollArtDomaine", [d], options, jet, { impro }) });
    return jetPoste ?? roll;
  }

  async rollImprovisationDanseur(danseurId, options = {}) {
    const danseur = this.items.get(danseurId);
    if (!danseur) return;

    const sd    = this.system;
    const label = game.i18n.format("AGONE.ImprovisationEmpriseLabel", { nom: danseur.name });

    const cre         = this._scoreAttribut("creativite");
    const empathie    = danseur.system.empathie ?? 0;
    const bonusEsprit = sd.bonusEsprit ?? 0;
    const aptitude    = cre + empathie + bonusEsprit;
    const endAct      = danseur.system.enduranceActuelle ?? 0;
    const endMax      = danseur.system.enduranceMax     ?? 0;

    const jet = await this._dialogModificateur(label, options);
    if (!jet) return;
    const { modif } = jet;

    const roll = new Roll("1d10x10 + @apt + @modif", { apt: aptitude, modif });
    await roll.evaluate();
    const jetPoste = await this._sendRollToChat(roll, label, {
      danseur:   { label: _L("Danseur"),                      value: danseur.name },
      endurance: { label: _L("EnduranceDanseur"),            value: `${endAct} / ${endMax}` },
      cre:       { label: _L("CreativiteCre"),              value: cre },
      empathie:  { label: _L("EmpathieDanseur", { danseur: danseur.name }),  value: `+${empathie}` },
      esprit:    { label: _L("BonusEsprit"),                 value: `+${bonusEsprit}`,
                   tooltip: _L("BonusEspritTooltip", { esprit: this._scoreAttribut("esprit"), noir: sd.esprit?.noir ?? 0 }) },
      aptTotal:  { label: _L("TotalImprovisation"),          value: aptitude },
      modif:     { label: _L("BonusMalus"),                value: modif >= 0 ? `+${modif}` : modif },
    }, { rollType: jet.rollType, relance: this._infoRelance("rollImprovisationDanseur", [danseurId], options, jet) });
    return jetPoste ?? roll;
  }

  // ==============================
  // Private helpers
  // ==============================

  /**
   * Met à jour l'initiative du combattant lié à cet acteur dans le combat actif.
   * Utilise game.combat.setInitiative() qui est l'API officielle.
   * @param {number} value
   * @param {string|null} [combatantId]  Combattant visé (plusieurs combattants peuvent partager l'acteur)
   */
  async _setInitiativeInCombat(value, combatantId = null) {
    const combat = game.combat;
    if (!combat) return;
    // Priorité 0 : le combattant désigné par l'appelant (tracker de combat)
    let combatant = combatantId ? combat.combatants.get(combatantId) : null;
    // Priorité 1 : via le TokenDocument associé à cet acteur (fonctionne même pour les tokens non-liés)
    const token = this.token;
    if (!combatant && token) combatant = combat.combatants.find(c => c.tokenId === token.id);
    // Priorité 2 : via actorId (tokens liés dont la feuille est ouverte depuis le sidebar)
    if (!combatant) combatant = combat.combatants.find(c => c.actorId === this.id);
    if (combatant) await combat.setInitiative(combatant.id, value);
  }

  /**
   * Retourne +1 si la saison du monde correspond à la saison personnelle du personnage
   * (via saisonPerso ou un item de type danseur avec saison correspondante).
   */
  _getBonusSaisonin() {
    try {
      const saisonMonde = game.settings?.get("agone", "saisonMonde") ?? "";
      if (!saisonMonde) return 0;
      const sd = this.system;
      if (sd.saisonPerso && sd.saisonPerso === saisonMonde) return 1;
      return this.items.some(i => i.type === "danseur" && i.system.saison === saisonMonde) ? 1 : 0;
    } catch { return 0; }
  }

  /**
   * Ouvre un DialogV2 comme enfant de la fiche active (suit le pop-out parent).
   * Fallback sur DialogV2.wait si aucune fiche n'est rendue.
   */
  async _renderChildDialog(options) {
    const sheet = Object.values(this.apps || {}).find(a => a.rendered);
    if (typeof sheet?.renderChild !== "function") return foundry.applications.api.DialogV2.wait(options);
    return new Promise(resolve => {
      let settled = false;
      const settle = (v) => { if (!settled) { settled = true; resolve(v); } };
      const buttons = (options.buttons ?? []).map(btn => ({
        ...btn,
        callback: (event, button, dialog) => {
          const result = btn.callback?.(event, button, dialog) ?? btn.action;
          settle(result);
          return result;
        },
      }));
      const dialog = new foundry.applications.api.DialogV2({ ...options, buttons });
      dialog.addEventListener("close", () => settle(null), { once: true });
      sheet.renderChild(dialog);
    });
  }

  /**
   * Dialogue de jet de sort : bonus/malus, augmentation du seuil, sort instantané, jet ouvert ou fermé.
   * @param {string} label       Titre du dialogue (texte brut, échappé à l'affichage)
   * @param {number} seuilBase   Seuil de base du sort (affiché à titre indicatif)
   * @param {boolean} impro      Si vrai, le seuil sera doublé
   * @param {object} [options]
   * @param {boolean} [options.fastForward=false]  Lancer sans dialogue (modificateur 0, jet ouvert)
   * @returns {Promise<{modif: number, seuilBonus: number, instantane: boolean, rollType: string}|null>}
   */
  async _dialogSort(label, seuilBase = 0, impro = false, { fastForward = false, relance = null, heroisme = false } = {}) {
    // Relance (point d'Héroïsme) : réutiliser les choix du jet d'origine sans rouvrir le dialogue
    if (relance?.dialog) return { ...relance.dialog, heroisme: false };
    if (fastForward) return { modif: 0, seuilBonus: 0, instantane: false, rollType: "ouvert", heroisme: !!heroisme };

    const seuilInfo = impro
      ? `${seuilBase} × 2 = ${seuilBase * 2} (${_L("Improvise")})`
      : `${seuilBase}`;

    const result = await this._renderChildDialog({
      window:  { title: label },
      content: contenuDialogueJet(label, [
        champNombre("modif", game.i18n.localize("AGONE.BonusMalus"), { autofocus: true }),
        champNombre("seuilBonus",
          `${game.i18n.localize("AGONE.AugmentationSeuil")} <em>(${_L("Base")} : ${echapper(seuilInfo)})</em>`, { min: 0 }),
        champCase("sortInstantane", game.i18n.localize("AGONE.SortInstantane")),
        champJetOuvert(),
        this._ligneHeroisme(),
      ]),
      buttons: boutonsDialogueJet(el => ({
        modif:      parseInt(el.modif.value)      || 0,
        seuilBonus: parseInt(el.seuilBonus.value) || 0,
        type:       el.typeJet.checked ? "ouvert" : "ferme",
        instantane: el.sortInstantane.checked,
        heroisme:   !!el.heroisme?.checked,
      })),
      rejectClose: false,
    });

    if (!result || typeof result === "string") return null;
    return { modif: result.modif, seuilBonus: Math.max(0, result.seuilBonus), instantane: !!result.instantane, rollType: result.type, heroisme: !!result.heroisme };
  }

  /**
   * Dialogue de jet standard : bonus/malus, jet ouvert ou fermé, bonus de spécialité.
   * @param {string} label  Titre du dialogue (texte brut, échappé à l'affichage)
   * @param {object} [options]
   * @param {string}  [options.specialite]          Spécialité proposée (+1)
   * @param {boolean} [options.fastForward=false]   Lancer sans dialogue (modificateur 0)
   * @param {boolean} [options.ferme=false]         Jet toujours fermé (initiative) : pas de case « Jet ouvert »
   * @returns {Promise<{modif: number, rollType: string, bonusSpe: number}|null>}
   */
  async _dialogModificateur(label, { specialite = "", fastForward = false, relance = null, heroisme = false, ferme = false } = {}) {
    // Relance (point d'Héroïsme) : réutiliser les choix du jet d'origine sans rouvrir le dialogue
    if (relance?.dialog) return { ...relance.dialog, heroisme: false };
    if (fastForward) return { modif: 0, rollType: ferme ? "ferme" : "ouvert", bonusSpe: 0, heroisme: !!heroisme };

    const result = await this._renderChildDialog({
      window:  { title: label },
      content: contenuDialogueJet(label, [
        champNombre("modif", game.i18n.localize("AGONE.BonusMalus"), { autofocus: true }),
        ferme ? "" : champJetOuvert(),
        this._ligneHeroisme(),
        specialite
          ? champCase("bonusSpe", `${game.i18n.localize("AGONE.BonusSpecialite")} <em>${echapper(specialite)}</em> (+1)`)
          : "",
      ]),
      buttons: boutonsDialogueJet(el => ({
        modif:    parseInt(el.modif.value) || 0,
        type:     (ferme || !el.typeJet?.checked) ? "ferme" : "ouvert",
        bonusSpe: specialite && el.bonusSpe?.checked ? 1 : 0,
        heroisme: !!el.heroisme?.checked,
      })),
      rejectClose: false,
    });

    if (!result || typeof result === "string") return null;
    return { modif: result.modif, rollType: result.type, bonusSpe: result.bonusSpe ?? 0, heroisme: !!result.heroisme };
  }

  async _promptMagicTypeFallback(unknownType) {
    const domaineToType = {
      accord: "accord",
      cyse: "cyse",
      decorum: "decorum",
      geste: "geste",
    };

    const labelByType = {
      jorniste: game.i18n.localize("AGONE.Jorniste"),
      obscurantiste: game.i18n.localize("AGONE.Obscurantiste"),
      eclipsiste: game.i18n.localize("AGONE.Eclipsiste"),
      accord: game.i18n.localize("AGONE.Accord"),
      cyse: game.i18n.localize("AGONE.Cyse"),
      decorum: game.i18n.localize("AGONE.Decorum"),
      geste: game.i18n.localize("AGONE.Geste"),
    };

    const options = [];
    const added = new Set();
    const addOption = (type) => {
      if (!type || added.has(type)) return;
      added.add(type);
      options.push({ value: type, label: labelByType[type] ?? type });
    };

    const typeMage = (this.system?.typeMage ?? "").trim().toLowerCase();
    if (["jorniste", "obscurantiste", "eclipsiste"].includes(typeMage)) addOption(typeMage);

    for (const i of this.items) {
      if (i.type !== "competence" || normaliserNom(i.name) !== CLES_COMPETENCES.artsMagiques.cle) continue;
      addOption(domaineToType[normaliserNom(i.system?.domaine)]);
    }

    if (!options.length) {
      ui.notifications.warn(game.i18n.localize("AGONE.AucunTypeMagieDisponible"));
      return null;
    }

    const result = await foundry.applications.api.DialogV2.wait({
      window: { title: game.i18n.localize("AGONE.ChoisirTypeMagie") },
      content: contenuDialogueJet(
        game.i18n.format("AGONE.TypeMagieInconnu", { type: echapper(unknownType) }),
        [champSelect("typeMagie", game.i18n.localize("AGONE.TypeMagie"), options)],
        { titreHtml: true }
      ),
      buttons: [
        {
          action: "ok",
          icon: "fas fa-check",
          label: game.i18n.localize("AGONE.Confirmer"),
          default: true,
          callback: (_event, button) => button.form.elements.typeMagie.value,
        },
        {
          action: "cancel",
          icon: "fas fa-times",
          label: game.i18n.localize("AGONE.Annuler"),
        },
      ],
      rejectClose: false,
    });

    if (!result || typeof result !== "string") return null;
    return result;
  }

  /**
   * Envoie un résultat de jet dans le chat
   */
  async _sendRollToChat(roll, label, details = {}, extra = {}) {
    const rollType = extra.rollType ?? "ouvert";

    // Si jet fermé: recalculer sans explosion
    let finalRoll = roll;
    if (rollType === "ferme" && roll.formula.includes("1d10x10")) {
      const formula = roll.formula.replace("1d10x10", "1d10");
      const r = new Roll(formula, roll.data);
      await r.evaluate();
      finalRoll = r;
    }

    // Point d'Héroïsme choisi dans le dialogue (jamais sur une relance) : dépensé ici, au moment où
    // le jet est réellement envoyé (un jet abandonné ne coûte rien), puis +BONUS_HEROISME à la formule
    const bonusHeroisme = (extra.relance?.dialog?.heroisme && !extra.relance?.heroisme)
      ? await this._depenserHeroisme() : 0;
    if (bonusHeroisme) finalRoll = await this._jetAvecBonus(finalRoll, bonusHeroisme);

    // Valeur brute du dé (premier dé de la formule)
    const diceResult = finalRoll.dice[0]?.total ?? "?";
    const diceLabel  = _L(rollType === "ferme" ? "DeFerme" : "DeOuvert");

    // Convertir les détails en tableau {label, value}
    // Extraire resultat et seuil pour les afficher en permanence
    const _resultat = details.resultat ?? null;
    const _seuil    = details.seuil    ?? null;
    const _filtered = Object.entries(details)
      .filter(([k]) => k !== "resultat" && k !== "seuil")
      .map(([, v]) => v);
    const detailsArr = [
      { label: diceLabel, value: diceResult },
      ...(_seuil    ? [typeof _seuil    === "object" ? _seuil    : { label: _L("Seuil"), value: _seuil }] : []),
      ..._filtered.map(v => {
        if (typeof v === "object" && v !== null) return v;
        const idx = v.lastIndexOf(" : ");
        return idx !== -1
          ? { label: v.slice(0, idx), value: v.slice(idx + 3) }
          : { label: v, value: "" };
      }),
      ...(extra.relance?.heroisme === "relance" ? [{ label: game.i18n.localize("AGONE.Relance.Detail"), value: game.i18n.localize("AGONE.Relance.Cout") }] : []),
      ...(bonusHeroisme ? [{ label: game.i18n.localize("AGONE.Relance.DetailBonus"), value: `+${bonusHeroisme}` }] : [])
    ];

    // Résultat succès/échec (affiché hors details)
    const resultatLabel = _resultat
      ? (typeof _resultat === "object" ? _resultat.value : _resultat)
      : null;
    const seuilValue = _seuil
      ? (typeof _seuil === "object" ? _seuil.value : _seuil)
      : null;

    // Détection fumble (dé = 1) et critique (dé explosé ≥ 10), jets ouverts seulement
    const firstFace  = finalRoll.dice[0]?.results?.[0]?.result ?? null;
    const isFumble   = rollType !== "ferme" && firstFace === 1;
    const isCritique = rollType !== "ferme" && (finalRoll.dice[0]?.total ?? 0) >= 10;

    // Pénalité de fumble : 1d10 fermé soustrait du total
    let fumblePenalty = 0;
    let isMegaFumble  = false;
    if (isFumble) {
      const fumbleRoll = new Roll("1d10");
      await fumbleRoll.evaluate();
      fumblePenalty = fumbleRoll.total;
      isMegaFumble  = fumblePenalty === 10;
      if (isMegaFumble) Hooks.callAll("agone.megaFumble", { actor: this, roll: finalRoll, fumbleRoll });
    }

    // Total sur lequel juger le seuil : ajusté de la pénalité de fumble le cas échéant. Un jet fermé
    // relance le dé sans explosion (ci-dessus) : ce total final peut différer de celui que l'appelant
    // a utilisé pour calculer son résultat avant l'appel ; on le recalcule donc toujours ici pour que
    // le libellé Succès/Échec et le badge d'écart restent cohérents avec le total réellement affiché.
    const totalPourSeuil = isFumble ? finalRoll.total - fumblePenalty : finalRoll.total;
    const { issueClass, resultatSucces: succesCoherent, ecartSeuil, ecartSigne } = issueJet({
      total:    totalPourSeuil,
      seuil:    extra.seuilNumeric,
      fumble:   isFumble,
      critique: isCritique
    });
    const finalResultat = (resultatLabel !== null && succesCoherent !== null)
      ? _L(succesCoherent ? "Succes" : "Echec")
      : resultatLabel;

    const content = await foundry.applications.handlebars.renderTemplate(
      "systems/agone/templates/chat/roll-result.hbs",
      {
        actor:         this,
        label,
        roll:          finalRoll,
        total:         finalRoll.total,
        details:       detailsArr,
        rollType,
        resultat:      finalResultat,
        resultatSucces: finalResultat === _L("Succes"),
        seuil:         seuilValue,
        issueClass,
        ecartSeuil,
        ecartSigne,
        isFumble,
        fumblePenalty,
        fumbleTotal:   finalRoll.total - fumblePenalty,
        isMegaFumble,
        isCritique,
        actorId:       this.id,
        arme:          extra.arme ?? null,
        typeJetCombat: extra.typeJet ?? null,
        description:   extra.description || null,
        sortMeta:      extra.sortMeta     || null,
        armeMeta:      extra.armeMeta     || null
      }
    );

    // Drapeaux : type de jet (style du message) et paramètres de relance (point d'Héroïsme)
    // Une relance reprend le mode de jet du message d'origine (un jet secret reste secret)
    const rollMode = modeHistorique(extra.relance?.rollMode) ?? modeJetCourant();
    const flags = { agone: { rollType } };
    if (extra.relance?.methode) {
      const { methode, args = [], options = {}, dialog = null, heroisme = null } = extra.relance;
      flags.agone.relance = { methode, args, options, dialog, rollMode, fait: false };
      // Carte issue d'un point d'Héroïsme : plus aucune action d'Héroïsme possible
      if (heroisme) flags.agone.issuHeroisme = heroisme;
      if (heroisme === "relance") flags.agone.estRelance = true;
    }
    if (bonusHeroisme) flags.agone.issuHeroisme = "bonus";

    await ChatMessage.create(appliquerModeJet(
      { speaker: ChatMessage.getSpeaker({ actor: this }), content, rolls: [finalRoll], flags },
      rollMode
    ));
    // Relance : renvoyer à relancerMessage le jet réellement affiché
    if (extra.relance?.sortie) extra.relance.sortie.roll = finalRoll;
    return finalRoll;
  }

  /**
   * Paramètres d'un jet à conserver dans le message pour une relance ultérieure.
   * @param {string} methode   Nom de la méthode de jet (voir METHODES_RELANCE)
   * @param {Array}  args      Arguments sérialisables (ids, données brutes, jamais de documents)
   * @param {object} options   Options reçues par la méthode (détecte une relance en cours)
   * @param {object|null} dialog  Résultat du dialogue (modif, rollType, bonusSpe, seuilBonus…)
   * @param {object} [optionsJet]  Options propres au jet à rejouer (ex. { impro })
   */
  _infoRelance(methode, args, options = {}, dialog = null, optionsJet = {}) {
    const r = options.relance;
    return {
      methode, args, options: optionsJet, dialog,
      heroisme: r ? "relance" : null,
      ...(r?.rollMode ? { rollMode: r.rollMode } : {}),
      ...(r?.sortie ? { sortie: r.sortie } : {}),
    };
  }

  /**
   * Jet déjà évalué augmenté d'un bonus fixe (terme numérique ajouté), sans relancer les dés.
   * @param {Roll} roll
   * @param {number} bonus
   * @returns {Promise<Roll>}
   */
  async _jetAvecBonus(roll, bonus) {
    const ajout = (await new Roll(`0 + ${bonus}`).evaluate()).terms.slice(1);
    return Roll.fromTerms([...roll.terms, ...ajout]);
  }

  /** Case « Dépenser 1 point d'Héroïsme : +5 » des dialogues de jet (vide sans point disponible). */
  _ligneHeroisme() {
    if (!this._peutHeroisme()) return "";
    return champCase("heroisme",
      game.i18n.format("AGONE.Relance.CaseBonus", { bonus: BONUS_HEROISME, valeur: this.system.ph.valeur }));
  }

  /** Le dialogue de jet peut-il proposer de dépenser un point d'Héroïsme ? */
  _peutHeroisme() {
    return (this.system.ph?.valeur ?? 0) >= 1;
  }

  /**
   * Dépense 1 point d'Héroïsme pour le bonus de jet.
   * @returns {Promise<number>} BONUS_HEROISME, ou 0 s'il ne reste aucun point
   */
  async _depenserHeroisme() {
    if (!this._peutHeroisme()) {
      ui.notifications.warn(game.i18n.localize("AGONE.Relance.PasDePoint"));
      return 0;
    }
    await this.update({ "system.ph.valeur": Math.max(0, (this.system.ph?.valeur ?? 0) - 1) });
    return BONUS_HEROISME;
  }

  /**
   * Mode de jet d'un message : drapeau enregistré, sinon déduit de whisper/blind.
   * @param {ChatMessage} message
   * @returns {string}
   */
  static _rollModeMessage(message) {
    const enregistre = message.flags?.agone?.relance?.rollMode;
    if (enregistre) return enregistre;
    if (message.blind) return "blindroll";
    const whisper = message.whisper ?? [];
    if (!whisper.length) return "publicroll";
    return (whisper.length === 1 && whisper[0] === game.user.id) ? "selfroll" : "gmroll";
  }

  /**
   * Relance un jet depuis le chat en dépensant 1 point d'Héroïsme (une seule fois par jet d'origine,
   * jamais sur une relance ni sur un jet déjà bonifié) : mêmes paramètres et choix de dialogue, nouveaux dés.
   * @param {ChatMessage} message
   * @returns {Promise<Roll|null>}  Le jet réellement affiché, ou null
   */
  async relancerMessage(message) {
    const relance = message?.flags?.agone?.relance;
    if (!relance?.methode || relance.fait || !METHODES_RELANCE.has(relance.methode)) return null;
    if (message.flags.agone.issuHeroisme || message.flags.agone.estRelance) return null;
    if (typeof this[relance.methode] !== "function") return null;
    if (message.speaker?.actor !== this.id) return null;
    if (RELANCES_EN_COURS.has(message.id)) return null;

    const ph = this.system.ph;
    if (!ph) return null;
    if ((ph.valeur ?? 0) < 1) {
      ui.notifications.warn(game.i18n.localize("AGONE.Relance.PasDePoint"));
      return null;
    }

    RELANCES_EN_COURS.add(message.id);
    try {
      // Marquer d'abord : si c'est impossible, on abandonne sans dépenser de point
      try {
        await message.update({ "flags.agone.relance.fait": true, "flags.agone.heroisme": "relance" });
      } catch (err) {
        console.warn("Agone | Impossible de marquer le message comme relancé", err);
        return null;
      }

      const args = foundry.utils.deepClone(relance.args ?? []);
      const sortie = {};
      const opts = {
        ...(relance.options ?? {}),
        relance: {
          sortie,
          // Une relance ne rejoue jamais la dépense d'un point d'Héroïsme choisie dans le dialogue
          dialog: relance.dialog ? { ...relance.dialog, heroisme: false } : null,
          rollMode: AgoneActor._rollModeMessage(message),
        },
        fastForward: true,
      };
      let roll = null;
      try {
        const retour = await this[relance.methode](...args, opts);
        // Jet réellement affiché (un jet fermé est relancé dans _sendRollToChat)
        roll = retour ? (sortie.roll ?? retour) : null;
      } finally {
        // Jet impossible (objet supprimé, garde…) : l'ancien message redevient utilisable, aucun point dépensé
        if (!roll) {
          await message.update({ "flags.agone.relance.fait": false, "flags.agone.heroisme": null }).catch(() => {});
        }
      }
      if (roll) await this.update({ "system.ph.valeur": Math.max(0, (this.system.ph?.valeur ?? 1) - 1) });
      return roll;
    } finally {
      RELANCES_EN_COURS.delete(message.id);
    }
  }
}
