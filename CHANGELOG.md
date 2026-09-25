# Changelog

Toutes les évolutions notables du système Agone pour Foundry VTT.
Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) ; les versions suivent la numérotation de `system.json`.

## [1.9.8] — 2026-09-25

### Ajouté
- **Cartes de jet plus lisibles** : un liseré coloré signale l'issue du jet (vert pour un succès, rouge pour un échec, or pour un critique, rouge sombre pour un fumble), le total est plus grand, et un badge indique l'écart au seuil (« +12 », « −3 »). Les badges de sort et d'arme tiennent sur une ligne compacte.
- **Couleur d'accent par onglet** sur la fiche personnage : Ténèbres et Perfidie en noir bleuté, Magie en bleu, Combat en rouge, les autres en or. Elle souligne l'onglet actif et les titres de section.
- **Animations discrètes** : apparition des cartes de jet, ouverture des descriptions et changement d'onglet. Elles ne se déclenchent qu'au clic (pas lors des mises à jour de la fiche) et sont désactivées si le système demande moins d'animations.

### Corrigé
- Jet fermé : la carte de jet pouvait afficher « Succès » avec un total sous le seuil (ou l'inverse), car le résultat était calculé sur un premier jet différent de celui affiché. Le résultat suit maintenant le total affiché.
- Objets envoyés dans le chat : un objet sans image propre affichait l'icône par défaut de Foundry (le sac) en pleine largeur, et les pouvoirs, sorts, armures et dons avaient une carte sans mise en forme. Tous les objets utilisent maintenant la même carte stylée, sans image quand l'objet n'en a pas.

### Modifié
- **Mode sombre revu en profondeur** : toutes les couleurs passent par les couleurs du thème au lieu de corrections au cas par cas. Les écrans restent cohérents et lisibles en sombre, y compris le widget du calendrier et les boutons du tracker de combat, dont le texte était sombre sur fond sombre. Le mode clair est inchangé.
- **Boutons et actions plus faciles à viser** : boutons icône agrandis (26 px), corbeille, crayon et poignée de glisser-déposer visibles en permanence (atténués, pleins au survol de la ligne), survol des lignes marqué. Sur les cartes de compétences et de sorts, les actions ne recouvrent plus le nom. Un nom long passe sur deux lignes sans déborder sur la ligne du domaine.
- Titres de section harmonisés, scores alignés en colonnes.
- Icônes : les pictogrammes en caractères (⚙, 🎲, ★, ↻, ✕) sont remplacés par des icônes Font Awesome, nettes et adaptées au thème.
- README : cartes de jet, accent des onglets, animations.
- Tests : issue et écart au seuil (fonction pure), absence de couleurs codées en dur et de `!important` dans le mode sombre, pictogrammes interdits dans les templates, accent des onglets, taille des boutons, couleur de l'onglet actif, hauteur des noms de cartes, fichier d'animations et `prefers-reduced-motion` (tests unitaires) ; classe d'issue et badge d'écart des cartes de jet, onglet Paramètres, aucune animation rejouée après une mise à jour de fiche, carte de chat d'un objet avec ou sans image (Quench).

## [1.9.7] — 2026-09-25

### Ajouté
- **Navigation au clavier** : tous les boutons des fiches, des fiches d'objet et des navigateurs sont atteignables avec Tab et s'activent avec Entrée ou Espace, y compris les icônes modifier et supprimer. Le bouton qui a le focus est entouré d'un contour doré.
- **Recherche de compétences sans résultat** : quand la recherche ne trouve aucune compétence, la fiche l'indique par un message au lieu d'afficher une liste vide.

### Corrigé
- Mode sombre : le bouton Fumble des cartes de jet, les couleurs de saison du calendrier, les pastilles de type (démon, compagnon, PNJ…) et le bouton de bonus de PdV à la création restent lisibles sur fond sombre. Le mode clair est inchangé.
- Mode sombre : dans le tableau des paliers de l'onglet Ténèbres, les paliers non atteints étaient presque invisibles (numéro, peine, case et bienfait). Ils restent atténués mais lisibles.
- Mode sombre : le texte brun était peu lisible sur fond sombre, dans les fiches comme dans les cartes de jet du chat (seuil, détails du calcul, badges et description du sort). Le brun du thème sombre est éclairci, la description et les badges des cartes de jet prennent la couleur du texte courant, et les mentions volontairement pâles (valeurs nulles, « aucun… ») restent lisibles.
- Un sort lancé en improvisé depuis le navigateur de sorts, sans être sur la fiche, n'affichait sur la carte de jet ni sa description ni ses badges (portée, durée, danse).
- Foundry v14 : les icônes de tri des en-têtes de colonnes des navigateurs de compendium s'affichaient comme des carrés vides.

### Modifié
- **Infobulles uniformisées** : les infobulles des boutons et icônes utilisent désormais celles de Foundry (plus rapides et au style du thème) au lieu des bulles natives du navigateur. Les boutons composés d'une seule icône ont un libellé lu par les lecteurs d'écran.
- Fenêtres : la fiche d'objet s'ouvre plus grande (560 × 620) pour les longues descriptions, et les navigateurs de compendium s'ouvrent tous à la même taille (sauf celui des manœuvres, plus large).
- README : accessibilité et navigation au clavier.
- Tests : boutons icône sans libellé accessible, règle de focus, couleurs du mode sombre sans valeur codée en dur, tailles des fenêtres, contraste des couleurs de texte du mode sombre, police des icônes de tri (tests unitaires) ; message de recherche de compétences vide, activation au clavier d'un bouton modifier, description et badges d'un sort improvisé depuis le navigateur (Quench).

## [1.9.6] — 2026-09-24

### Corrigé
- Jet de sort : quand le sort est introuvable, `rollSort` renvoie `null` comme ses autres sorties (au lieu de `undefined`).
- Tests : 16 tests Quench remis à jour. Dans les navigateurs, la recherche lit la colonne du nom (la première colonne est désormais le chevron), et le chevron des descriptions pliables est retrouvé après chaque rendu. Le seuil maximal des sorts est testé sur un seuil existant. Le test des puces de couverture des armures et celui de l'éditeur d'effets attendent la fin du rendu, et l'éditeur d'effets accepte la valeur numérique qu'enregistre Foundry v14. Le jet de sort retrouve le sort créé par son type (Quench).

## [1.9.5] — 2026-09-24

### Ajouté
- **Détails des peines de Perfidie lisibles sans survol** (onglet Perfidie et navigateur des peines) : la description dépliable de chaque peine est organisée en trois sous-sections. **Description** donne le texte de la peine, **Effet de la peine** l'aspect noirci en toutes lettres (et, sur la fiche, les effets automatisés de la peine), **Bienfait** son nom et sa description (et, sur la fiche, s'il est acquis ou non), ou « Aucun bienfait ». Ces informations n'étaient jusqu'ici visibles qu'en infobulle.
- **Paliers de Ténèbres dépliables** : dans le tableau des paliers de l'onglet Ténèbres, chaque palier a son chevron, qui affiche la description de la peine et celle du bienfait (ou « Aucun bienfait »). Un bouton en tête du tableau ouvre ou ferme tous les paliers. Ces textes n'étaient visibles qu'en infobulle.

### Modifié
- **Descriptions dépliables plus ergonomiques** (fiches et navigateurs de compendium) : la ligne « ▶ Voir la description » sous chaque objet est remplacée par un chevron dans la ligne elle-même. La description s'ouvre juste sous l'objet et, dans les navigateurs, un clic n'importe où sur la ligne suffit. Un bouton en tête des tableaux ouvre ou ferme toutes les descriptions. Les descriptions ouvertes le restent après une mise à jour de la fiche, un filtre ou un tri, et le chevron reste utilisable en lecture seule. Les bienfaits acquis de l'onglet Perfidie se replient aussi, avec leur propre bouton « tout ouvrir ». Sur les cartes de sorts, le chevron précède le nom pour ne pas être recouvert par les boutons qui apparaissent au survol.
- README : descriptions repliables, détails des peines de Perfidie, paliers de Ténèbres dépliables.
- Tests : appariement chevron / description dans les templates (tests unitaires), ouverture, conservation et « tout ouvrir » dans chaque navigateur et sur la fiche personnage, chevron des cartes de sorts cliquable malgré les actions au survol, bienfaits acquis, sous-sections des peines sur la fiche et dans le navigateur, paliers de Ténèbres (dépliage, tout ouvrir, mode manuel, paliers atteints) (Quench) ; position du chevron des cartes de sorts (tests unitaires).

## [1.9.4] — 2026-09-24

### Ajouté
- **Vue limitée des fiches d'acteur** : avec la permission « Limité », un joueur ne voit plus que le portrait, le nom, le peuple (ou l'espèce, l'origine, la race) et la description publique, au lieu de la fiche complète.
- **Peines et bienfaits modifiables** : la fiche de peine sépare les effets de la peine (appliqués dès qu'elle est possédée) et les **effets du bienfait**, suspendus tant que le bienfait n'est pas acquis puis appliqués automatiquement. La description du bienfait est modifiable (le texte du livre sert par défaut et peut être repris pour être adapté), avec suggestions de noms de bienfaits. L'onglet Perfidie affiche cette description et ouvre la fiche de la peine d'un clic sur son nom.
- **Recherche des navigateurs de compendium** : sans accent ni majuscule, plusieurs mots dans n'importe quel ordre et n'importe quel champ, `"expression exacte"`, `-mot` pour exclure, `nom:mot` pour ne chercher que dans le nom. Sans résultat exact, une faute de frappe par mot est tolérée (bandeau « résultats approchants »). Résultats classés par pertinence, correspondances surlignées dans les noms, aide au survol du champ. Les armes se cherchent aussi par style et type, les armures par type, les compétences par famille, les sorts par type de magie.
- Calendrier : la météo se choisit avec un bouton par type de météo (au lieu d'une liste déroulante).
- Instructions pour les messages de commit générés par Copilot (`.github/copilot-instructions.md`).
- **Tag et release automatiques** : quand la version de `system.json` change sur `main`, une GitHub Action lance le lint et les tests, crée le tag `vX.Y.Z` puis publie la release (`agone.zip`). Pousser un tag à la main fonctionne toujours.
- **Nouveaux filtres des navigateurs de compendium** : armes (dommages minimum, AGI requise maximum, à distance / sans portée), armures (couverture, protection minimum, malus d'AGI maximum), avantages (avec / sans prérequis, avec / sans effet automatisé), compétences (caractéristique liée), manœuvres (sans condition, réaction, réservée à un peuple, autre condition), peines (possédées ou non), peuples (saison, volants), sorts (Emprise / Arts magiques, instrument ou saison selon le type, seuil maximum).
- **Bouton « Créer un objet personnalisé »** (marteau) dans la barre d'outils Agone : crée un objet du monde de n'importe quel type, rangé dans le dossier « Objets personnalisés », qui apparaît ensuite dans le navigateur correspondant.

### Corrigé
- Fiches en lecture seule (permission « Observateur ») : les champs restaient modifiables et une modification provoquait une erreur de permission, parce que les champs des templates échappaient à la désactivation automatique de Foundry. Champs et jets sont désormais désactivés ; ouvrir un objet (en lecture), l'envoyer au chat, la recherche de compétences et les filtres de sorts restent disponibles.
- Fiches d'objet en lecture seule (objet d'un acteur observé, compendium verrouillé) : mêmes corrections.

### Modifié
- **Barre de filtres des navigateurs repensée** : recherche, effacement et nombre de résultats sur une seule ligne, filtres regroupés et étiquetés, cases à cocher en pastilles. Le bouton d'effacement des compétences remet désormais tous les filtres à zéro ; la colonne Caractéristique des compétences est traduite.
- README : permissions des fiches, peines et bienfaits, syntaxe de recherche des navigateurs.
- Tests : moteur de recherche (tests unitaires), vue limitée et lecture seule de chaque fiche, effets de bienfait, recherche des navigateurs (Quench) ; filtres des navigateurs (tests unitaires et Quench), bouton de création d'objet personnalisé (Quench).

### Supprimé
- Template inutilisé `templates/actors/creature-sheet.hbs`.

## [1.9.3] — 2026-09-24

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
