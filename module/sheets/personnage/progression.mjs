import { sourcesEffets } from "../../helpers/effets.mjs";

/**
 * Onglet Attributs & progression : valeurs brutes / bonus, coûts XP et création, montée et rétrogradation,
 * mode création, bornes raciales, infobulles des stats dérivées.
 */
export const ProgressionMixin = Base => class extends Base {

  /** Données de contexte de l'onglet. */
  _prepareProgressionContext(context) {
    const actor  = this.actor;
    const system = actor.system;

    const peupleKey  = CONFIG.AGONE?.peupleNomVersKey?.[system.peuple] ?? "humain";
    const peupleData = CONFIG.AGONE?.peuplesData?.[peupleKey] ?? CONFIG.AGONE?.peuplesData?.humain;

    // Coûts XP pour la montée de niveau (multiplicateurs, après création)
    const m   = CONFIG.AGONE.xpMultipliers ?? { aspect: 7, carac: 5, competence: 5 };
    const tbl = CONFIG.AGONE.tableAchatCreation ?? [0, 1, 2, 3, 4, 5, 7, 10, 14, 19, 25];
    // Coût incrémental selon la table d'achat création : utilise le score BRUT (hors bonus racial)
    // rawScore = score stocké - bonus positif appliqué. Indice dans la table = niveau brut actuel.
    // Au-delà de la table, on extrapole en continuant le delta croissant.
    const lastDelta = tbl.length >= 2 ? tbl[tbl.length - 1] - tbl[tbl.length - 2] : 1;
    const creaDelta = (rawScore) => {
      if (rawScore + 1 < tbl.length) return tbl[rawScore + 1] - tbl[rawScore];
      return lastDelta + (rawScore - (tbl.length - 2));
    };
    const posBonus  = (k) => system.peupleBonusApplique?.[`${k}Bonus`] ?? 0;
    const avBonus   = (k) => system[k]?.avantageBonus ?? 0;
    const rawCarac  = (k) => Math.max(0, system[k].score - posBonus(k) - avBonus(k));
    // Modificateur racial net = appliqué (peupleBonusApplique) + en attente (peupleMalusEnAttente)
    // Utilisé uniquement pour l'affichage des badges — jamais pour rawCarac ni le stockage.
    const racialNet = (k) => posBonus(k) + (system.peupleMalusEnAttente?.[`${k}Bonus`] ?? 0);

    // Bonus raciaux exposés pour affichage (séparation valeur de base / bonus racial)
    context.bonusRacialAspect = {
      corps:  racialNet('corps'),
      esprit: racialNet('esprit'),
      ame:    racialNet('ame'),
    };
    // Bonus avantages/défauts exposés pour affichage (transient)
    context.bonusAvantageAspect = {
      corps:  avBonus('corps'),
      esprit: avBonus('esprit'),
      ame:    avBonus('ame'),
    };
    // Valeur de base des aspects (hors bonus racial et avantages) — affichée dans l'input
    context.rawAspect = {
      corps:  rawCarac('corps'),
      esprit: rawCarac('esprit'),
      ame:    rawCarac('ame'),
    };
    context.bonusRacialCarac = {};
    context.bonusAvantageCarac = {};
    context.rawCaracVal = {};
    for (const k of ['agilite','force','perception','resistance','intelligence','volonte','charisma','creativite']) {
      context.bonusRacialCarac[k]   = racialNet(k);
      context.bonusAvantageCarac[k] = avBonus(k);
      context.rawCaracVal[k]        = rawCarac(k);
    }

    // Bonus/malus personnalisés sur les stats dérivées (pour badges dans le template)
    context.bonusDeriveSupp = {};
    for (const k of ['melee','tir','art','initiative','initMagique','defenseNaturelle','bd','esquive','emprise']) {
      context.bonusDeriveSupp[k] = (system.bonusAttributsSupp ?? []).reduce((s, e) => e.attribut === k ? s + (Number(e.valeur) || 0) : s, 0);
    }
    // Bonus de dons (avantages/défauts) sur les stats dérivées à bonus dédié
    context.bonusDonArt        = system.avantageArtBonus        ?? 0;
    context.bonusDonInitiative = system.avantageInitiativeBonus ?? 0;
    context.bonusDonEmprise    = system.avantageEmpriseBonus    ?? 0;

    // Malus d'armure et bouclier sur AGI et PER (badges dans l'onglet attributs)
    context.malusArmureAgi = (system.armure?._malusAgiActif ?? 0) + (system.bouclier?._malusAgiActif ?? 0);
    context.malusArmurePer = system.armure?._malusPerActif ?? 0;
    // Valeurs effectives (score + malus armure) affichées dans le total
    context.agiliteEffectif    = (system.agilite?.score    ?? 0) + context.malusArmureAgi;
    context.perceptionEffectif = (system.perception?.score ?? 0) + context.malusArmurePer;

    context.xpCout = {
      corps:        (system.corps.score        + 1) * m.aspect,
      esprit:       (system.esprit.score       + 1) * m.aspect,
      ame:          (system.ame.score          + 1) * m.aspect,
      agilite:      (system.agilite.score      + 1) * m.carac,
      force:        (system.force.score        + 1) * m.carac,
      perception:   (system.perception.score   + 1) * m.carac,
      resistance:   (system.resistance.score   + 1) * m.carac,
      intelligence: (system.intelligence.score + 1) * m.carac,
      volonte:      (system.volonte.score      + 1) * m.carac,
      charisma:     (system.charisma.score     + 1) * m.carac,
      creativite:   (system.creativite.score   + 1) * m.carac,
    };
    context.creaCout = {
      corps:        creaDelta(rawCarac('corps')),
      esprit:       creaDelta(rawCarac('esprit')),
      ame:          creaDelta(rawCarac('ame')),
      agilite:      creaDelta(rawCarac('agilite')),
      force:        creaDelta(rawCarac('force')),
      perception:   creaDelta(rawCarac('perception')),
      resistance:   creaDelta(rawCarac('resistance')),
      intelligence: creaDelta(rawCarac('intelligence')),
      volonte:      creaDelta(rawCarac('volonte')),
      charisma:     creaDelta(rawCarac('charisma')),
      creativite:   creaDelta(rawCarac('creativite')),
    };
    for (const c of context.competences) {
      c.xpCout  = (c.system.score + 1) * m.competence;
      c.creaCout = creaDelta(c.system.score);
    }

    // Valeur affichée sur les boutons : table d'achat en création, multiplicateurs après
    const src = system.modeCreation ? context.creaCout : context.xpCout;
    context.coutAffiche = {
      corps:        src.corps,
      esprit:       src.esprit,
      ame:          src.ame,
      agilite:      src.agilite,
      force:        src.force,
      perception:   src.perception,
      resistance:   src.resistance,
      intelligence: src.intelligence,
      volonte:      src.volonte,
      charisma:     src.charisma,
      creativite:   src.creativite,
    };
    for (const c of context.competences)
      c.coutAffiche = system.modeCreation ? c.creaCout : c.xpCout;

    // ── Coûts de rétrogradation (remboursement) ──────────────
    context.creaCoutDown = {
      corps:        rawCarac('corps')  > 0 ? creaDelta(rawCarac('corps')  - 1) : 0,
      esprit:       rawCarac('esprit') > 0 ? creaDelta(rawCarac('esprit') - 1) : 0,
      ame:          rawCarac('ame')    > 0 ? creaDelta(rawCarac('ame')    - 1) : 0,
      agilite:      rawCarac('agilite')       > 0 ? creaDelta(rawCarac('agilite')       - 1) : 0,
      force:        rawCarac('force')         > 0 ? creaDelta(rawCarac('force')         - 1) : 0,
      perception:   rawCarac('perception')    > 0 ? creaDelta(rawCarac('perception')    - 1) : 0,
      resistance:   rawCarac('resistance')    > 0 ? creaDelta(rawCarac('resistance')    - 1) : 0,
      intelligence: rawCarac('intelligence')  > 0 ? creaDelta(rawCarac('intelligence')  - 1) : 0,
      volonte:      rawCarac('volonte')       > 0 ? creaDelta(rawCarac('volonte')       - 1) : 0,
      charisma:     rawCarac('charisma')      > 0 ? creaDelta(rawCarac('charisma')      - 1) : 0,
      creativite:   rawCarac('creativite')    > 0 ? creaDelta(rawCarac('creativite')    - 1) : 0,
    };
    context.xpCoutDown = {
      corps:        system.corps.score        * m.aspect,
      esprit:       system.esprit.score       * m.aspect,
      ame:          system.ame.score          * m.aspect,
      agilite:      system.agilite.score      * m.carac,
      force:        system.force.score        * m.carac,
      perception:   system.perception.score   * m.carac,
      resistance:   system.resistance.score   * m.carac,
      intelligence: system.intelligence.score * m.carac,
      volonte:      system.volonte.score      * m.carac,
      charisma:     system.charisma.score     * m.carac,
      creativite:   system.creativite.score   * m.carac,
    };
    context.coutAfficheDown = {};
    for (const k of Object.keys(context.creaCoutDown))
      context.coutAfficheDown[k] = system.modeCreation ? context.creaCoutDown[k] : context.xpCoutDown[k];
    for (const c of context.competences) {
      c.creaCoutDown    = c.system.score > 0 ? creaDelta(c.system.score - 1) : 0;
      c.xpCoutDown      = c.system.score * m.competence;
      c.coutAfficheDown = system.modeCreation ? c.creaCoutDown : c.xpCoutDown;
    }

    // Points de création restants (valeur décroissante)
    context.ptsCreationCaracRestant = system.ptsCreationCarac.max - system.ptsCreationCarac.depense;
    context.ptsCreationCompRestant  = system.ptsCreationComp.max  - system.ptsCreationComp.depense;
    context.modeCreation   = system.modeCreation;
    context.modeLevelUp    = !!system.modeLevelUp;

    // Visibilité des boutons de montée de niveau :
    //   - mode carac/comp : toujours visible en création, sinon si modeLevelUp toggleé
    //   - mode aspect      : seulement en XP normal avec modeLevelUp
    context.showLevelUp       = system.modeCreation || !!system.modeLevelUp;
    context.showLevelUpAspect = !system.modeCreation && !!system.modeLevelUp;
    context.showLevelUpComp   = system.modeCreation || !!system.modeLevelUp;

    // Min/Max raciaux par carac — seuils sur score BRUT (hors bonus racial)
    const caracsKeys = ['agilite', 'force', 'perception', 'resistance', 'intelligence', 'volonte', 'charisma', 'creativite'];
    const caracAtMax      = {};
    const caracBelowMin   = {};
    const caracEffectiveMax = {}; // max final affiché = raceMax + bonusAppliqué (raceMax est un plafond brut)
    const caracEffectiveMin = {}; // min final affiché = raceMin (raceMin est un plancher sur le score TOTAL)
    const caracAtMaxCreation = {};
    for (const k of caracsKeys) {
      const bonus    = system.peupleBonusApplique?.[`${k}Bonus`] ?? 0;
      const posBonus = Math.max(0, bonus);
      const rawScore = system[k].score - bonus;
      const raceMax  = peupleData?.[`${k}Max`] ?? null;
      const raceMin  = peupleData?.[`${k}Min`] ?? null;
      // raceMax est un plafond sur le score BRUT (achat) → total max = raceMax + posBonus
      caracAtMax[k]         = raceMax !== null && rawScore >= raceMax;
      // raceMin est un plancher sur le score TOTAL → comparer directement avec le score stocké
      caracBelowMin[k]      = system.modeCreation && raceMin !== null && system[k].score < raceMin;
      caracEffectiveMax[k]  = raceMax !== null ? raceMax + posBonus : null;
      // raceMin est déjà exprimé en score total, pas besoin d'ajouter le bonus
      caracEffectiveMin[k]  = raceMin ?? null;
      caracAtMaxCreation[k] = system.modeCreation && caracAtMax[k];
    }
    context.caracAtMax         = caracAtMax;
    context.caracBelowMin      = caracBelowMin;
    context.caracEffectiveMax  = caracEffectiveMax;
    context.caracEffectiveMin  = caracEffectiveMin;
    context.caracAtMaxCreation = caracAtMaxCreation;

    // ── Achetabilité des boutons ↑ : création (budget + max racial) ou XP (XP courant + réserve locale) ──
    const xpDispo = (localExp) => (localExp ?? 0) + (system.experience?.courante ?? 0);
    // Achat en XP : impossible seulement sans aucune XP courante ; sinon le clic propose de verser
    // l'XP courante dans la réserve locale (voir _onLevelUp), le bouton reste donc actif.
    const etatXp = (cout, localExp) => {
      const courante = system.experience?.courante ?? 0;
      const dispo    = xpDispo(localExp);
      if (cout <= dispo) return { disabled: false, raison: null };
      if (courante > 0) return {
        disabled: false,
        raison: game.i18n.format("AGONE.VerserReserveTooltip", { reserve: courante, cout, actuel: dispo }),
      };
      return { disabled: true, raison: game.i18n.format("AGONE.PasAssezXP", { cout, actuel: dispo }) };
    };
    context.achatCarac = {};
    for (const k of caracsKeys) {
      if (system.modeCreation) {
        const disabled = caracAtMax[k] || context.creaCout[k] > context.ptsCreationCaracRestant;
        context.achatCarac[k] = {
          disabled,
          raison: !disabled ? null : caracAtMax[k]
            ? game.i18n.localize("AGONE.MaxRacialAtteint")
            : game.i18n.format("AGONE.PasAssezPtsCrea", { cout: context.creaCout[k], actuel: context.ptsCreationCaracRestant }),
        };
      } else {
        context.achatCarac[k] = etatXp(context.xpCout[k], system[k]?.exp);
      }
    }
    context.achatAspect = {};
    for (const k of ['corps', 'esprit', 'ame']) {
      context.achatAspect[k] = etatXp(context.xpCout[k], system[k]?.exp);
    }
    for (const c of context.competences) {
      const scoreMax = (c.system.score ?? 0) >= 10;
      if (scoreMax) {
        c.achatDisabled = true;
        c.achatRaison   = game.i18n.localize("AGONE.MaxCompetenceAtteint");
      } else if (system.modeCreation) {
        c.achatDisabled = c.creaCout > context.ptsCreationCompRestant;
        c.achatRaison   = c.achatDisabled
          ? game.i18n.format("AGONE.PasAssezPtsCrea", { cout: c.creaCout, actuel: context.ptsCreationCompRestant })
          : null;
      } else {
        const etat = etatXp(c.xpCout, c.system.exp);
        c.achatDisabled = etat.disabled;
        c.achatRaison   = etat.raison;
      }
    }

    // ── Réserves locales : badge par caractéristique + total pour le panneau ────────────────────
    context.reserveCarac = {};
    let reserveTotale = 0;
    for (const k of [...caracsKeys, 'corps', 'esprit', 'ame']) {
      const exp = system[k]?.exp ?? 0;
      reserveTotale += exp;
      if (exp > 0) context.reserveCarac[k] = { valeur: exp, tooltip: game.i18n.format("AGONE.ReserveLocaleTooltip", { n: exp }) };
    }
    for (const c of context.competences) reserveTotale += c.system.exp ?? 0;

    // ── Panneau d'état (haut de fiche, visible par qui peut modifier la fiche) ──────────────────
    if (system.modeCreation) {
      const sousMin = caracsKeys.filter(k => caracBelowMin[k]);
      context.panneau = {
        enCreation:       true,
        caracRestant:     context.ptsCreationCaracRestant,
        caracMax:         system.ptsCreationCarac.max,
        caracJaugeClass:  context.ptsCreationCaracRestant < 0 ? "jauge-negative" : context.ptsCreationCaracRestant === 0 ? "jauge-zero" : "",
        compRestant:      context.ptsCreationCompRestant,
        compMax:          system.ptsCreationComp.max,
        compJaugeClass:   context.ptsCreationCompRestant < 0 ? "jauge-negative" : context.ptsCreationCompRestant === 0 ? "jauge-zero" : "",
        sousMinimumCount: sousMin.length,
        sousMinimumListe: sousMin.length
          ? game.i18n.format("AGONE.SousMinimumRacialTooltip", {
              liste: sousMin.map(k => game.i18n.localize(`AGONE.Attribut.${k.charAt(0).toUpperCase() + k.slice(1)}`)).join(", "),
            })
          : "",
      };
    } else {
      context.panneau = {
        enCreation:   false,
        xpCourante:   system.experience?.courante ?? 0,
        reserveTotale,
        modeLevelUp:  !!system.modeLevelUp,
      };
    }

    // ── Coût affiché : unité et couleur (création = pts, or / XP = XP, bleu) ────────────────────
    context.coutUnite    = system.modeCreation ? game.i18n.localize("AGONE.UnitePoints") : game.i18n.localize("AGONE.UniteXP");
    context.levelupClass = system.modeCreation ? "levelup-crea" : "levelup-xp";

    // ── Tooltips détaillés pour les stats dérivées ──────────────────────────────────────────────
    {
      // Sources des effets actifs par stat (items porteurs) — { pos: [...], neg: [...] }
      const statSrc = {};
      for (const [stat, sources] of Object.entries(sourcesEffets(actor))) {
        for (const { nom, valeur } of sources) {
          if (!valeur) continue;
          statSrc[stat] ??= { pos: [], neg: [] };
          (valeur > 0 ? statSrc[stat].pos : statSrc[stat].neg).push(`${valeur > 0 ? "+" : ""}${valeur} (${nom})`);
        }
      }
      // bonusAttributsSupp — contributions personnalisées
      for (const e of (system.bonusAttributsSupp ?? [])) {
        const v = Number(e.valeur) || 0;
        if (v === 0) continue;
        const k = e.attribut;
        if (!statSrc[k]) statSrc[k] = { pos: [], neg: [] };
        const label = e.description ? `${v > 0 ? "+" : ""}${v} (${e.description})` : `${v > 0 ? "+" : ""}${v}`;
        (v > 0 ? statSrc[k].pos : statSrc[k].neg).push(label);
      }
      const srcStr = (...stats) => {
        const pos = stats.flatMap(s => statSrc[s]?.pos ?? []);
        const neg = stats.flatMap(s => statSrc[s]?.neg ?? []);
        const parts = [];
        if (pos.length) parts.push(game.i18n.format("AGONE.Tooltip.Avantages", { liste: pos.join(", ") }));
        if (neg.length) parts.push(game.i18n.format("AGONE.Tooltip.Defauts",   { liste: neg.join(", ") }));
        return parts.length ? `\n  ${game.i18n.format("AGONE.Tooltip.Dont", { sources: parts.join(" | ") })}` : "";
      };
      const bsign = v => v === 0 ? "" : (v > 0 ? ` + ${v}` : ` − ${Math.abs(v)}`);

      const bC  = system.bonusCorps     ?? 0;
      const nC  = system.corpsNoirTotal ?? 0;
      const bonusCorpsDetail = game.i18n.format("AGONE.Tooltip.BonusCorps", { corps: system.corps.score, noir: nC, bonus: bC });

      const avInit    = system.avantageInitiativeBonus ?? 0;
      const avArt     = system.avantageArtBonus        ?? 0;
      const avEmp     = system.avantageEmpriseBonus    ?? 0;
      const escComp   = system.esquiveCompScore        ?? 0;

      let empriseFormule;
      if (system.typeMage === "jorniste")           empriseFormule = `INT ${system.intelligence.score}`;
      else if (system.typeMage === "obscurantiste") empriseFormule = `VOL ${system.volonte.score}`;
      else empriseFormule = `(INT ${system.intelligence.score} + VOL ${system.volonte.score}) ÷ 2`;

      context.tooltipsDerives = {
        melee:  `(FOR ${system.force.score} + AGI ${system.agilite.score}x2) ÷ 3 = ${system.melee}${srcStr("melee", "melee_bonus")}`,
        tir:    `(AGI ${system.agilite.score} + PER ${system.perception.score}) ÷ 2 = ${system.tir}${srcStr("tir", "tir_bonus")}`,
        art:    peupleKey === "feeNoire"
          ? `CRÉ ${system.creativite.score}${bsign(avArt)} = ${system.art}${srcStr("art_bonus","art")}`
          : `(CHA ${system.charisma.score} + CRÉ ${system.creativite.score}) ÷ 2↓${bsign(avArt)} = ${system.art}${srcStr("art_bonus","art")}`,
        initiative: `AGI ${system.agilite.score} + PER ${system.perception.score} + Bonus Corps ${bC}${bsign(avInit)} = ${system.initiative}\n${bonusCorpsDetail}${srcStr("initiative_bonus","initiative")}`,
        initMagique: `Initiative ${system.initiative} + 10 = ${system.initMagique}${srcStr("initiative_bonus","initiative")}`,
        defenseNaturelle: `AGI ${system.agilite.score} + Bonus Corps ${bC} = ${system.defenseNaturelle}\n${bonusCorpsDetail}${srcStr("defenseNaturelle", "defense_bonus")}`,
        bd:     `Tableau FOR ${system.force.score} + TAI ${system.tai} = ${system.bd}${srcStr("bd", "bd_bonus")}`,
        esquive: `AGI ${system.agilite.score} + Esquive ${escComp} + Bonus Corps ${bC} = ${system.esquiveTotal}\n${bonusCorpsDetail}${srcStr("esquive", "esquive_bonus")}`,
        emprise: `${empriseFormule}${bsign(avEmp)} = ${system.emprise}${srcStr("emprise_bonus","emprise")}`,
      };
    }
  }

  /** Écouteurs délégués de l'onglet (voir PersonnageSheet#_onRender). */
  _bindProgressionListeners(on, root) {
    // Jets de dés — Attributs
    on("click", "[data-action='rollAttribut']", this._onRollAttribut.bind(this));

    // Inputs "base" de scores (aspects + caracs) : pas de name= pour éviter le double-comptage
    // du bonus racial par le mécanisme de submit de FoundryVTT
    on("change", "[data-raw-input]", this._onRawInputChange.bind(this));

    // Montée de niveau (dépense XP)
    on("click", "[data-action='levelUp']", this._onLevelUp.bind(this));

    // Rétrogradation (remboursement XP / pts création)
    on("click", "[data-action='levelDown']", this._onLevelDown.bind(this));

    // Mode niveau — toggle visibilité boutons
    on("click", "[data-action='toggleLevelUp']", this._onToggleLevelUp.bind(this));

    // Mode création — toggle, resets locaux et validation
    on("click", "[data-action='toggleCreation']", this._onToggleCreation.bind(this));
    on("click", "[data-action='resetCaracs']", this._onResetCaracs.bind(this));
    on("click", "[data-action='resetComps']", this._onResetComps.bind(this));
    on("click", "[data-action='validerCreation']", this._onValiderCreation.bind(this));

    // Bonus/malus d'attributs supplémentaires
    on("click", ".bonus-supp-add", this._onBonusSuppAdd.bind(this));
    on("click", ".bonus-supp-delete", this._onBonusSuppDelete.bind(this));
    on("change", ".bonus-supp-field", this._onBonusSuppChange.bind(this));
  }

  // Jets de dés
  // Inputs "base" (aspects + caracs) : sans name= pour éviter le double-comptage
  // du bonus racial par le mécanisme de submit FoundryVTT
  async _onRawInputChange(event) {
    event.preventDefault();
    const input    = event.currentTarget;
    const field    = input.dataset.field;
    const key      = input.dataset.rawInput;
    const rawValue = Math.max(0, Number(input.value) || 0);
    const posB     = this.actor.system.peupleBonusApplique?.[`${key}Bonus`] ?? 0;
    await this.actor.update({ [field]: rawValue + posB });
  }

  // Montée de niveau (dépense XP)
  async _onLevelUp(event) {
    event.preventDefault();
    const btn    = event.currentTarget;
    const type   = btn.dataset.type;
    const key    = btn.dataset.key;
    const itemId = btn.dataset.itemId;
    const xpCout = Number(btn.dataset.cout);
    const sd     = this.actor.system;

    // Vérification du max racial (caracs seulement — seuil sur score brut hors bonus)
    if (type === "carac") {
      const pKeyRace  = CONFIG.AGONE?.peupleNomVersKey?.[sd.peuple] ?? "humain";
      const pDatRace  = CONFIG.AGONE?.peuplesData?.[pKeyRace] ?? {};
      const maxRacial = pDatRace[`${key}Max`] ?? null;
      const bonusApp  = sd.peupleBonusApplique?.[`${key}Bonus`] ?? 0;
      const avBonus   = sd[key]?.avantageBonus ?? 0;
      const rawScore  = (sd[key]?.score ?? 0) - avBonus - bonusApp;
      if (maxRacial !== null && rawScore >= maxRacial) {
        return ui.notifications.warn(game.i18n.localize("AGONE.MaxRacialAtteint"));
      }
    }

    // Vérification du plafond de score compétence (max 10)
    if (type === "competence") {
      const item0 = this.actor.items.get(itemId);
      if (item0 && (item0.system.score ?? 0) >= 10) {
        return ui.notifications.warn(game.i18n.localize("AGONE.MaxCompetenceAtteint"));
      }
    }

    const isCarac  = (type === "aspect" || type === "carac");
    const pool     = isCarac ? sd.ptsCreationCarac : sd.ptsCreationComp;
    const restePts = (pool?.max ?? 0) - (pool?.depense ?? 0);
    const creaCout = Number(btn.dataset.creaCout) || null;

    const item     = (type === "competence") ? this.actor.items.get(itemId) : null;
    const localExp = isCarac ? (sd[key]?.exp ?? 0) : (item?.system.exp ?? 0);

    // ── MODE CRÉATION ────────────────────────────────────────
    if (sd.modeCreation) {
      if (type === "aspect") {
        return ui.notifications.warn(game.i18n.localize("AGONE.AspectsBloquesCrea"));
      }
      if (creaCout === null) {
        return ui.notifications.warn(game.i18n.localize("AGONE.NiveauMaxCrea"));
      }
      if (restePts < creaCout) {
        return ui.notifications.warn(
          game.i18n.format("AGONE.PasAssezPtsCrea", { cout: creaCout, actuel: restePts })
        );
      }
      if (isCarac) {
        await this.actor.update({
          [`system.${key}.score`]:          ((sd[key].score ?? 0) - (sd[key]?.avantageBonus ?? 0)) + 1,
          "system.ptsCreationCarac.depense": (pool.depense ?? 0) + creaCout,
        });
      } else if (type === "competence") {
        if (!item) return;
        await Promise.all([
          item.update({ "system.score": item.system.score + 1 }),
          this.actor.update({ "system.ptsCreationComp.depense": (pool.depense ?? 0) + creaCout }),
        ]);
      }
      return;
    }

    // ── MODE XP NORMAL ───────────────────────────────────────
    const fromLocal   = Math.min(localExp, xpCout);
    const fromGeneral = xpCout - fromLocal;

    // XP insuffisants
    if (fromGeneral > sd.experience.courante) {
      const totalDispo = localExp + sd.experience.courante;
      // Si aucun XP disponible du tout → erreur directe
      if (sd.experience.courante === 0) {
        return ui.notifications.error(
          game.i18n.format("AGONE.PasAssezXP", { cout: xpCout, actuel: totalDispo })
        );
      }
      // Sinon, propose de verser les XP disponibles en réserve locale
      const aVerser = sd.experience.courante;
      const confirmed = await this._confirmChild({
        title:   game.i18n.localize("AGONE.XPInsuffisants"),
        content: `<p>${game.i18n.format("AGONE.PasAssezXPReserve", {
          cout:    xpCout,
          actuel:  totalDispo,
          reserve: aVerser
        })}</p>`
      });
      if (!confirmed) return;
      if (isCarac) {
        await this.actor.update({
          [`system.${key}.exp`]:           localExp + aVerser,
          "system.experience.courante":    0,
        });
      } else if (type === "competence" && item) {
        await Promise.all([
          item.update({ "system.exp": localExp + aVerser }),
          this.actor.update({ "system.experience.courante": 0 }),
        ]);
      }
      return;
    }

    if (isCarac) {
      await this.actor.update({
        [`system.${key}.score`]: ((sd[key].score ?? 0) - (sd[key]?.avantageBonus ?? 0)) + 1,
        ...(fromLocal   > 0 ? { [`system.${key}.exp`]:       localExp - fromLocal                      } : {}),
        ...(fromGeneral > 0 ? { "system.experience.courante": sd.experience.courante - fromGeneral      } : {}),
        "system.experience.totale": (sd.experience.totale ?? 0) + xpCout,
      });
    } else if (type === "competence") {
      if (!item) return;
      const updates = [];
      updates.push(item.update({
        "system.score": item.system.score + 1,
        ...(fromLocal > 0 ? { "system.exp": localExp - fromLocal } : {}),
      }));
      updates.push(this.actor.update({
        ...(fromGeneral > 0 ? { "system.experience.courante": sd.experience.courante - fromGeneral } : {}),
        "system.experience.totale": (sd.experience.totale ?? 0) + xpCout,
      }));
      await Promise.all(updates);
    }
  }

  // Rétrogradation (remboursement pts création ou XP)
  async _onLevelDown(event) {
    event.preventDefault();
    const btn    = event.currentTarget;
    const type   = btn.dataset.type;
    const key    = btn.dataset.key;
    const itemId = btn.dataset.itemId;
    const sd     = this.actor.system;

    const item         = (type === "competence") ? this.actor.items.get(itemId) : null;
    const currentScore = (type === "competence") ? (item?.system.score ?? 0) : (sd[key]?.score ?? 0);
    // sourceScore = valeur stockée en DB (score transient sans effets transitoires don/bonusSupp)
    const avBonus0     = (type === "carac" || type === "aspect") ? (sd[key]?.avantageBonus ?? 0) : 0;
    const sourceScore  = currentScore - avBonus0;

    if (sourceScore <= 0) {
      return ui.notifications.warn(game.i18n.localize("AGONE.ScoreDejaZero"));
    }

    const tbl       = CONFIG.AGONE.tableAchatCreation ?? [0, 1, 2, 3, 4, 5, 7, 10, 14, 19, 25];
    const lastDelta = tbl.length >= 2 ? tbl[tbl.length - 1] - tbl[tbl.length - 2] : 1;
    const creaDelta = (s) => s + 1 < tbl.length ? tbl[s + 1] - tbl[s] : lastDelta + (s - (tbl.length - 2));
    const m         = CONFIG.AGONE.xpMultipliers ?? { aspect: 7, carac: 5, competence: 5 };

    // ── MODE CRÉATION ────────────────────────────────────────
    if (sd.modeCreation) {
      if (type === "aspect") {
        return ui.notifications.warn(game.i18n.localize("AGONE.AspectsBloquesCrea"));
      }
      const pool      = (type === "carac") ? sd.ptsCreationCarac : sd.ptsCreationComp;
      const bonus     = (type === "carac") ? (sd.peupleBonusApplique?.[`${key}Bonus`] ?? 0) : 0;
      const rawScore  = Math.max(0, sourceScore - bonus);
      const raceMin   = (type === "carac") ? (sd[key]?.raceMin ?? 0) : 0;
      const posBonus  = Math.max(0, bonus);
      const forcedRaw = Math.max(bonus < 0 ? -bonus : 0, Math.max(0, raceMin - posBonus));

      if (rawScore <= forcedRaw) {
        return ui.notifications.warn(game.i18n.localize("AGONE.RemboursementImpossible"));
      }
      const remboursement = creaDelta(rawScore - 1);

      if (type === "carac") {
        await this.actor.update({
          [`system.${key}.score`]:           sourceScore - 1,
          "system.ptsCreationCarac.depense": Math.max(0, (pool.depense ?? 0) - remboursement),
        });
      } else if (type === "competence" && item) {
        await Promise.all([
          item.update({ "system.score": currentScore - 1 }),
          this.actor.update({ "system.ptsCreationComp.depense": Math.max(0, (pool.depense ?? 0) - remboursement) }),
        ]);
      }
      return;
    }

    // ── MODE XP NORMAL ───────────────────────────────────────
    const mult            = type === "aspect" ? m.aspect : type === "carac" ? m.carac : m.competence;
    const xpRemboursement = currentScore * mult;
    const isCaracOrAspect = (type === "carac" || type === "aspect");

    if (isCaracOrAspect) {
      await this.actor.update({
        [`system.${key}.score`]:       sourceScore - 1,
        "system.experience.courante":  (sd.experience.courante ?? 0) + xpRemboursement,
        "system.experience.totale":    Math.max(0, (sd.experience.totale ?? 0) - xpRemboursement),
      });
    } else if (type === "competence" && item) {
      await Promise.all([
        item.update({ "system.score": currentScore - 1 }),
        this.actor.update({
          "system.experience.courante": (sd.experience.courante ?? 0) + xpRemboursement,
          "system.experience.totale":   Math.max(0, (sd.experience.totale ?? 0) - xpRemboursement),
        }),
      ]);
    }
  }

  // Toggle visibilité boutons level-up
  async _onToggleLevelUp(event) {
    event.preventDefault();
    await this.actor.update({ "system.modeLevelUp": !this.actor.system.modeLevelUp });
  }

  // Mode création — activer/désactiver
  async _onToggleCreation(event) {
    event.preventDefault();
    await this.actor.update({ "system.modeCreation": !this.actor.system.modeCreation });
  }

  // Mode création — reset caractéristiques
  async _onResetCaracs(event) {
    event.preventDefault();
    const confirmed = await this._confirmChild({
      title:   game.i18n.localize("AGONE.ResetCreation"),
      content: `<p>${game.i18n.localize("AGONE.ResetCreationCaracConfirm")}</p>`
    });
    if (!confirmed) return;

    const sd = this.actor.system;
    const caracs  = ['agilite','force','perception','resistance','intelligence','volonte','charisma','creativite'];
    const aspects = ['corps','esprit','ame'];
    const _cTbl  = CONFIG.AGONE.tableAchatCreation ?? [0, 1, 2, 3, 4, 5, 7, 10, 14, 19, 25];
    const _cLast = _cTbl.length >= 2 ? _cTbl[_cTbl.length-1] - _cTbl[_cTbl.length-2] : 1;
    const _cCost = (n) => n <= 0 ? 0 : (n < _cTbl.length ? _cTbl[n] : _cTbl[_cTbl.length-1] + (n - _cTbl.length + 1) * _cLast);
    let initCost = 0;
    const upd = {};

    for (const k of caracs) {
      const bonus    = sd.peupleBonusApplique?.[`${k}Bonus`] ?? 0;
      const raceMin  = sd[k]?.raceMin ?? 0;
      const posBonus  = Math.max(0, bonus);
      const forcedRaw = Math.max(bonus < 0 ? -bonus : 0, Math.max(0, raceMin - posBonus));
      upd[`system.${k}.score`] = Math.max(0, bonus + forcedRaw);
      initCost += _cCost(forcedRaw);
    }
    upd["system.ptsCreationCarac.depense"] = initCost;
    for (const asp of aspects) {
      upd[`system.${asp}.score`] = 0;
    }

    await this.actor.update(upd);
    ui.notifications.info(game.i18n.localize("AGONE.ResetCreationDone"));
  }

  // Mode création — reset compétences
  async _onResetComps(event) {
    event.preventDefault();
    const confirmed = await this._confirmChild({
      title:   game.i18n.localize("AGONE.ResetCreation"),
      content: `<p>${game.i18n.localize("AGONE.ResetCreationCompConfirm")}</p>`
    });
    if (!confirmed) return;

    await this.actor.update({ "system.ptsCreationComp.depense": 0 });

    const compUpdates = this.actor.items
      .filter(i => ['competence', 'manoeuvre'].includes(i.type))
      .map(i => ({ _id: i.id, "system.score": 0, "system.exp": 0 }));
    if (compUpdates.length) await this.actor.updateEmbeddedDocuments("Item", compUpdates);

    ui.notifications.info(game.i18n.localize("AGONE.ResetCreationDone"));
  }

  // Récapitulatif affiché avant validation de la création : points non dépensés, caractéristiques
  // sous le minimum racial (avertissement non bloquant) et malus raciaux en attente d'application.
  _recapCreation() {
    const sd = this.actor.system;
    const caracs  = ['agilite','force','perception','resistance','intelligence','volonte','charisma','creativite'];
    const aspects = ['corps','esprit','ame'];
    const label   = (k) => game.i18n.localize(`AGONE.${caracs.includes(k) ? "Attribut." : ""}${k.charAt(0).toUpperCase() + k.slice(1)}`) || k;

    const peupleKey  = CONFIG.AGONE?.peupleNomVersKey?.[sd.peuple] ?? "humain";
    const peupleData = CONFIG.AGONE?.peuplesData?.[peupleKey] ?? CONFIG.AGONE?.peuplesData?.humain;

    const sousMinimum = [];
    for (const k of caracs) {
      const raceMin = peupleData?.[`${k}Min`] ?? null;
      const score   = sd[k]?.score ?? 0;
      if (raceMin !== null && score < raceMin) sousMinimum.push({ key: k, label: label(k), score, min: raceMin });
    }

    const malus = sd.peupleMalusEnAttente ?? {};
    const malusRaciaux = [];
    for (const k of [...caracs, ...aspects]) {
      const m = malus[`${k}Bonus`] ?? 0;
      if (m !== 0) malusRaciaux.push({ key: k, label: label(k), valeur: m });
    }

    return {
      ptsCaracRestant: (sd.ptsCreationCarac?.max ?? 0) - (sd.ptsCreationCarac?.depense ?? 0),
      ptsCompRestant:  (sd.ptsCreationComp?.max  ?? 0) - (sd.ptsCreationComp?.depense  ?? 0),
      sousMinimum,
      malusRaciaux,
    };
  }

  // Mode création — valider (fin de création)
  async _onValiderCreation(event) {
    event.preventDefault();
    const recap = this._recapCreation();
    const sections = [`<p>${game.i18n.localize("AGONE.ValiderCreationConfirm")}</p>`];

    if (recap.ptsCaracRestant > 0 || recap.ptsCompRestant > 0) {
      sections.push(`<p>${game.i18n.format("AGONE.RecapPtsNonDepenses", { carac: recap.ptsCaracRestant, comp: recap.ptsCompRestant })}</p>`);
    }
    if (recap.sousMinimum.length) {
      const liste = recap.sousMinimum.map(c => `${c.label} (${c.score}/${c.min})`).join(", ");
      sections.push(`<p class="agone-recap-avertissement">${game.i18n.format("AGONE.RecapSousMinimum", { liste })}</p>`);
    }
    if (recap.malusRaciaux.length) {
      const liste = recap.malusRaciaux.map(m => `${m.label} ${m.valeur > 0 ? "+" : ""}${m.valeur}`).join(", ");
      sections.push(`<p>${game.i18n.format("AGONE.RecapMalusRaciaux", { liste })}</p>`);
    }

    const confirmed = await this._confirmChild({
      title:   game.i18n.localize("AGONE.ValiderCreation"),
      content: sections.join("")
    });
    if (!confirmed) return;

    // Les malus raciaux sont désormais appliqués dès la sélection du peuple.
    // peupleMalusEnAttente est toujours à 0 — cette boucle n'a plus d'effet mais reste
    // présente à titre défensif pour des personnages créés avec l'ancienne version.
    const sd     = this.actor.system;
    const malus  = sd.peupleMalusEnAttente ?? {};
    const caracs = ['agilite','force','perception','resistance','intelligence','volonte','charisma','creativite'];
    const aspects = ['corps','esprit','ame'];
    const upd = { "system.modeCreation": false };

    for (const k of caracs) {
      const m = malus[`${k}Bonus`] ?? 0;
      if (m !== 0) {
        upd[`system.${k}.score`]                          = Math.max(0, (sd[k]?.score ?? 0) + m);
        upd[`system.peupleBonusApplique.${k}Bonus`]       = (sd.peupleBonusApplique?.[`${k}Bonus`] ?? 0) + m;
        upd[`system.peupleMalusEnAttente.${k}Bonus`]      = 0;
      }
    }
    for (const asp of aspects) {
      const m = malus[`${asp}Bonus`] ?? 0;
      if (m !== 0) {
        upd[`system.${asp}.score`]                         = Math.max(0, (sd[asp]?.score ?? 0) + m);
        upd[`system.peupleBonusApplique.${asp}Bonus`]      = (sd.peupleBonusApplique?.[`${asp}Bonus`] ?? 0) + m;
        upd[`system.peupleMalusEnAttente.${asp}Bonus`]     = 0;
      }
    }

    await this.actor.update(upd);
    ui.notifications.info(game.i18n.localize("AGONE.CreationTerminee"));
  }

  async _onBonusSuppAdd(event) {
    event.preventDefault();
    const entries = foundry.utils.deepClone(this.actor.system.bonusAttributsSupp ?? []);
    entries.push({ categorie: "avantage", attribut: "agilite", valeur: 0, description: "" });
    await this.actor.update({ "system.bonusAttributsSupp": entries });
  }

  async _onBonusSuppDelete(event) {
    event.preventDefault();
    const idx = Number(event.currentTarget.dataset.idx);
    const entries = foundry.utils.deepClone(this.actor.system.bonusAttributsSupp ?? []);
    entries.splice(idx, 1);
    await this.actor.update({ "system.bonusAttributsSupp": entries });
  }

  async _onBonusSuppChange(event) {
    const el    = event.currentTarget;
    const idx   = Number(el.closest("[data-idx]").dataset.idx);
    const field = el.dataset.field;
    const value = el.type === "number" ? (Number(el.value) || 0) : el.value;
    const entries = foundry.utils.deepClone(this.actor.system.bonusAttributsSupp ?? []);
    if (!entries[idx]) return;

    const tentative = foundry.utils.deepClone(entries);
    tentative[idx][field] = value;

    // Validation uniquement pour les stats primaires (les dérivées n'ont pas de plancher)
    const PRIMAIRES = ['agilite','force','perception','resistance','intelligence','volonte','charisma','creativite','corps','esprit','ame'];
    const sd  = this.actor.system;
    const tbl = CONFIG.AGONE?.tableAchatCreation ?? [0,1,2,3,4,5,7,10,14,19,25];
    const lastDelta = tbl[tbl.length-1] - tbl[tbl.length-2];
    const creaTotal = (n) => n <= 0 ? 0 : n < tbl.length ? tbl[n] : tbl[tbl.length-1] + (n - (tbl.length - 1)) * lastDelta;

    const update = { "system.bonusAttributsSupp": tentative };

    for (const k of PRIMAIRES) {
      if (!sd[k]) continue;
      const currentSuppBonus = entries.reduce((s, e)    => e.attribut === k ? s + (Number(e.valeur) || 0) : s, 0);
      const newSuppBonus     = tentative.reduce((s, e)  => e.attribut === k ? s + (Number(e.valeur) || 0) : s, 0);
      const delta            = newSuppBonus - currentSuppBonus;
      const newEffective     = (sd[k]?.score ?? 0) + delta;

      if (newEffective < 0) {
        const deficit = -newEffective;
        if (sd.modeCreation) {
          const racialBonus  = sd.peupleBonusApplique?.[`${k}Bonus`] ?? 0;
          // Valeur stockée en DB = score transient - avantageBonus (qui inclut don + bonusSupp courants)
          const dbStored = (sd[k]?.score ?? 0) - (sd[k]?.avantageBonus ?? 0);
          const rawBase  = Math.max(0, dbStored - racialBonus);
          const cost     = creaTotal(rawBase + deficit) - creaTotal(rawBase);
          const depense  = update["system.ptsCreationCarac.depense"] ?? sd.ptsCreationCarac.depense;
          const available = sd.ptsCreationCarac.max - depense;
          if (cost <= available) {
            const caracLabel = game.i18n.localize(`AGONE.Attribut.${k.charAt(0).toUpperCase() + k.slice(1)}`) || k;
            update[`system.${k}.score`] = dbStored + deficit;
            update["system.ptsCreationCarac.depense"] = depense + cost;
            ui.notifications.info(game.i18n.format("AGONE.BonusSuppCompensation", { carac: caracLabel, cost }));
          } else {
            ui.notifications.warn(game.i18n.format("AGONE.BonusSuppInsuffisantPts", { cost, available }));
            return;
          }
        } else {
          ui.notifications.warn(game.i18n.localize("AGONE.BonusSuppNegatifRefuse"));
          return;
        }
      }
    }
    await this.actor.update(update);
  }
};
