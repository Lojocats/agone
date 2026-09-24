# Changelog

Toutes les évolutions notables du système Agone pour Foundry VTT.
Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) ; les versions suivent la numérotation de `system.json`.

## [1.9.3] — non publiée

### Ajouté
- **Description des bienfaits de Perfidie avant acquisition** : icône d'information (infobulle) à côté de chaque bienfait dans l'onglet Perfidie et dans le navigateur des peines, texte complet dans « Voir description » de la peine, et rappel dans la confirmation d'acquisition (+1 Perfidie).
- **Tracker de combat repensé** : bandeau « Au tour de… » avec le numéro de tour, navigation par tour et par round, barre d'outils MJ (initiative de tous / des PNJ, réinitialisation, ajout des tokens sélectionnés, fin du combat), alerte des combattants sans initiative, suivi automatique du combattant actif. Par combattant : clic sur le nom pour centrer la carte, repères DEF / ESQ / Mêlée, malus de blessure, blessures graves et critique, statuts rapides, combattants cachés aux joueurs (MJ).
- Tracker : un joueur ne voit ni les combattants cachés ni les PdV exacts des acteurs qu'il ne possède pas, seulement l'état de santé descriptif (comme au survol des tokens).
- **Calendrier repensé** : en-tête teinté selon la saison, date longue traduite, moment de la journée (aube, matin, midi, après-midi, soir, nuit) avec barre horaire, phases principales de la lune dans la grille, notes visibles au survol d'un jour, liste des notes du mois (clic pour y aller), navigation regroupée date / heure. Le widget en haut d'écran affiche l'icône du moment de la journée.

### Corrigé
- Les textes à paramètres affichaient leur modèle brut (« Seuil {n} », « Bienfait acquis : {nom} », info-bulles de montée de niveau, mémoire des danseurs, marges de qualité…) : le système remplaçait le helper `localize` de Foundry par une version qui ignorait les paramètres.
- Info-bulle des PdV max et notification de points de création des danseurs incomplètes.
- Tracker de combat : l'initiative d'un combattant était lancée deux fois ; les tokens non liés modifiaient l'acteur du monde au lieu de leur propre acteur ; les démons affichaient des PdV au lieu de leur Densité (tracker et info-bulle des tokens) ; le tracker ne se rafraîchissait pas quand un token changeait.
- Calendrier : la note du jour est enregistrée automatiquement en quittant le champ ; le calendrier ouvert se met à jour quand la date, la météo ou les notes changent (y compris chez les joueurs) ; rouvrir le calendrier ou le tracker ramène la fenêtre existante au lieu d'en créer une seconde.

- Navigateur de sorts : un sort est identifié par son nom **et** son type de magie. Les sorts homonymes de domaines différents (« Créer un familier », « Bénédiction ») n'étaient plus proposés une fois l'un d'eux appris, et le lancer improvisé pouvait utiliser la mauvaise version.

### Modifié
- README mis à jour (effets actifs, navigateurs, thème automatique, développement).
- Tests : suite unitaire Node (`npm test`, exécutée en CI) et suite Quench étendue à ~200 tests (formule de chaque jet, chaque statistique d'effet, fiches, éditeur d'effets, navigateurs, intégration).

## [1.9.2] — 2026-09-24

### Ajouté
- **Navigateurs de compendium** : section « Objets personnalisés » qui liste les objets du même type créés dans le monde ou dans vos compendiums (avec leurs effets actifs) ; ajout à la fiche en un clic et ouverture de leur fiche.
- Navigateurs : tri en cliquant sur les en-têtes de colonnes, focus automatique sur la recherche, Échap pour effacer la recherche.
- Thème **automatique** : sans choix explicite, le thème Agone suit le thème des applications Foundry (ou celui du système). Le bouton 🌙 fixe un choix clair/sombre.

### Corrigé
- **Mode sombre** : plus de 600 couleurs codées en dur passent par des jetons de thème ; les éléments qui restaient clairs (cartes, bordures, badges, textes colorés, nouvelles sections d'effets et de caractéristiques) s'adaptent au mode sombre. Le mode clair est inchangé.
- Les cartes de jet du chat, le widget calendrier et le tracker de combat suivent désormais le mode sombre.

## [1.9.1] — 2026-09-24

### Ajouté
- **Effets actifs sur les objets** : avantages, défauts, armes, armures, équipements, pouvoirs et peines peuvent donner des bonus ou malus sur les caractéristiques, les aspects et les stats dérivées (Initiative, Mêlée, Tir, Défense, Esquive, Art, Emprise, BD…). Un éditeur dans la fiche de l'objet permet d'ajouter, modifier, désactiver ou supprimer ces modificateurs, y compris sur les objets de compendium. Les effets sont de vrais Active Effects Foundry, compatibles avec l'éditeur avancé (durées, statuts).
- Les effets s'appliquent aussi aux **compagnons, démons et PNJ**.
- **Jets de caractéristique** sur les fiches compagnon, démon et PNJ : le nom de la caractéristique lance le jet, comme sur la fiche personnage.
- Caractéristiques des compagnons, démons et PNJ **regroupées par aspect** (Corps, Esprit, Âme). La Résistance du démon (Densité max ÷ 5) est affichée.
- **Descriptions des objets en texte riche** : éditeur de mise en forme (gras, listes, liens, tableaux…) sur toutes les fiches d'objet ; le HTML est rendu dans les fiches, les navigateurs et le chat. Les descriptions existantes sont converties automatiquement.
- Fiches pour les objets **Peine de Perfidie** et **Démon**, qui ne s'ouvraient pas faute de modèle.
- Traduction anglaise complète des cartes de jet, notifications, infobulles, calendrier et fiches.
- **Migrations de données** automatiques au chargement du monde (MJ) : les avantages existants reçoivent leurs effets.
- Tests d'intégration avec le module **Quench** (fiches, jets, effets).
- Vérification du code par ESLint à chaque push (GitHub Actions).

### Modifié
- Fiches compagnon, démon et PNJ réécrites sur une base commune avec la fiche personnage (sauvegarde automatique, objets, navigateurs, jets, onglet Magie).
- Les jets d'Art par domaine, d'aptitude magique et de conjuration sont calculés par l'acteur, identiques sur toutes les fiches.
- Navigateurs de compendium (armes, sorts, compétences…) réécrits sur une base commune.
- Fiche personnage découpée par onglet ; suppression de jQuery.

### Corrigé
- Le solde de **Charges** n'était pas calculé quand aucun avantage ne modifiait de statistique.
- Le filtre par type de magie de l'onglet Magie des PNJ masquait tous les sorts.
- Les jets d'attaque, de compétence non apprise, d'instrument et d'improvisation des PNJ, compagnons et démons ignoraient la caractéristique liée.
- Un fumble sur un sort lancé via un danseur ne recalculait pas le succès.
- Deux jets rapprochés pouvaient mélanger leur type (ouvert / fermé) ou leur bonus de spécialité.
- Le bouton de configuration des domaines d'Arts Magiques ne réagissait pas sur la fiche PNJ.
- Utilisation de l'API `TextEditor` dépréciée en v13.

### Supprimé
- Navigateur de dons et fenêtre de configuration de saison, qui n'étaient plus accessibles.

## [1.8.4] — 2026-09-01
### Corrigé
- Clés de traduction manquantes pour la défense.

## [1.8.3] — 2026-09-01
### Ajouté
- Option « sort instantané » (seuil doublé) dans le dialogue de jet de sort.

## [1.8.2] — 2026-09-01
### Ajouté
- Arme : Corne.

## [1.8.1] — 2026-08-25
### Ajouté
- Bienfaits cochables en mode manuel dans le tableau des Ténèbres.

## [1.8.0] — 2026-08-13
### Modifié
- Choix de la compétence liée amélioré sur la fiche d'arme.
- Accord : une entrée par instrument connu dans l'onglet Magie.

## [1.7.5] — 2026-08-04
### Ajouté
- Réglages séparés pour les couleurs et les particules météo.
### Modifié
- Malus de Perception distincts selon le type d'armure.

## [1.7.4] — 2026-07-07
### Ajouté
- Alias PdV `attributes.hp` (compatibilité modules) et statut « Ralenti ».

## [1.7.3] — 2026-06-24
### Modifié
- L'attaque utilise la caractéristique de la compétence liée.

## [1.7.2] — 2026-06-09
### Ajouté
- Caractéristiques Mêlée et Tir, et leurs traductions.

## [1.7.1] — 2026-06-02
### Ajouté
- Montée de niveau des démons ; éditeurs prose-mirror.

## [1.7.0] — 2026-05-30
### Ajouté
- Réserves d'XP et rétrogradation des danseurs.

## [1.6.9] — 2026-05-19
### Modifié
- Les messages de jet respectent le mode de jet choisi.

## [1.6.8] — 2026-05-19
### Modifié
- Champs de texte riche en prose-mirror avec sauvegarde automatique.

## [1.6.7] — 2026-05-16
### Modifié
- Position de défilement des fiches conservée.

## [1.6.6] — 2026-05-12
### Ajouté
- Jet d'Emprise depuis la caractéristique.

## [1.6.5] — 2026-05-12
### Ajouté
- Carte de chat pour les objets ; informations d'arme dans les jets.

## [1.6.4] — 2026-05-12
### Corrigé
- Le seuil est recalculé en cas de fumble.

## [1.6.3] — 2026-05-05
### Ajouté
- Informations du sort (portée, durée…) dans les cartes de jet.

## [1.6.2] — 2026-05-05
### Ajouté
- Résultat, seuil et description du sort dans les cartes de jet.

## [1.6.1] — 2026-04-30
### Ajouté
- Réglage d'application automatique de la météo.

## [1.6.0] — 2026-04-30
### Ajouté
- Météo avec effets FXMaster et luminosité de scène selon l'heure.

## [1.5.3] — 2026-04-21
### Ajouté
- Sauvegarde automatique des fiches ; nouveaux sorts.

## [1.5.2] — 2026-04-16
### Modifié
- Défilement interne des fiches.

## [1.5.1] — 2026-04-16
### Modifié
- Fiches migrées vers ApplicationV2 (Foundry v14).

## [1.5.0] — 2026-04-14
### Modifié
- Traductions anglaises mises à jour.

## [1.4.2] — 2026-04-14
### Ajouté
- Mode manuel des Ténèbres.

## [1.4.1] — 2026-04-14
### Ajouté
- Nouveaux sorts.

## [1.4.0] — 2026-04-03
### Ajouté
- Widget de calendrier et thème sombre par joueur.

## [1.2.0] — 2026-03-29
### Ajouté
- Bonus/malus d'attributs personnalisés ; bonus des avantages visibles sur les stats dérivées.

## [1.1.3] — 2026-03-24
### Ajouté
- Choix de la caractéristique pour les compétences non apprises ; augmentation du seuil des sorts.

## [1.1.2] — 2026-03-23
### Ajouté
- Défense et traits sur les fiches d'acteur.

## [1.1.1] — 2026-03-22
### Modifié
- Fée Noire : Art = CRÉ.

## [1.1.0] — 2026-03-19
### Ajouté
- Tracker de combat MJ ; configuration des domaines d'Arts Magiques.

## [1.0.0] — 2026-03-15
Première version publique : personnages, peuples, création et progression, compétences, magie (Arts Magiques et Emprise), danseurs, démons, Ténèbres et Perfidie, compagnons et PNJ, calendrier d'Harmonde, navigateurs de compendium.
