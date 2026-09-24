# Agone — Système Foundry VTT

Système non-officiel pour le jeu de rôle [**Agone**](https://fr.wikipedia.org/wiki/Agone_(jeu_de_r%C3%B4le)) (Multisim) sur [Foundry VTT](https://foundryvtt.com/) v13 / v14.

> ⚠️ Ce système est un projet communautaire non affilié à Multisim ou aux ayants droit d'Agone.

---

## Installation

### Via le manifeste (recommandé)

Dans Foundry VTT → **Configuration** → **Systèmes de jeu** → **Installer un système** :

```
https://raw.githubusercontent.com/Lojocats/agone/main/system.json
```

### Manuellement

1. Téléchargez la dernière release depuis [GitHub Releases](https://github.com/Lojocats/agone/releases/latest)
2. Extrayez l'archive dans `FoundryVTT/Data/systems/agone`
3. Redémarrez Foundry VTT

---

## Fonctionnalités

### Personnages
- Fiche complète avec les **trois Aspects** (Corps, Esprit, Âme) et leurs noirs
- **8 caractéristiques primaires** : Agilité, Force, Perception, Résistance, Intelligence, Volonté, Charisme, Créativité
- **Stats dérivées** automatiques : Mêlée, Tir, Art, Emprise, Initiative, Défense, PdV, Charge
- Gestion des **bonus raciaux** avec min/max et malus en attente
- Système d'**avantages & défauts** (Dons) dont les bonus et malus sont des effets actifs modifiables (voir ci-dessous)
- Suivi des **Ténèbres & Perfidie** avec apparition automatique des démons intérieurs aux paliers

### Effets actifs des objets
- Les avantages, défauts, armes, armures, équipements, pouvoirs et peines peuvent **donner des bonus ou des malus** au personnage qui les possède
- Statistiques modifiables : caractéristiques, aspects et aspects noirs, Initiative, Mêlée, Tir, Défense, Esquive, Art, Emprise, BD, TAI, points de création, coût des Charges, mouvement
- Éditeur dans la **fiche de l'objet** : ajouter, modifier, désactiver ou supprimer un modificateur en choisissant la statistique dans une liste
- Ce sont de vrais **Active Effects** Foundry : l'éditeur avancé (durées, statuts) reste accessible
- Fonctionne aussi dans les **compendiums** : créez vos propres objets avec leurs effets, ils les conservent en passant sur une fiche
- S'applique à tous les types d'acteur : personnages, compagnons, démons et PNJ
- Les avantages du livre de base reçoivent automatiquement leurs effets

### Ténèbres & Paliers
- Tableau interactif des 20 paliers avec peines et bienfaits
- **Mode automatique** : les paliers s'activent selon la valeur de Ténèbres
- **Mode manuel** : bascule par bouton, paliers cochés individuellement ; initialisé depuis la valeur de Ténèbres courante
- En mode manuel, la modification de la valeur de Ténèbres n'affecte plus les paliers
- Création automatique des démons intérieurs (Diablotin, Démon facétieux, Jumeau démoniaque, Siamois des Ténèbres) au franchissement du palier correspondant — en mode auto via la valeur de Ténèbres, en mode manuel via la case à cocher
- **Jet de Conjuration** : 1d10 explosif + Noirceur + Démonologie

### Peuples
- Drag & drop d'un item Peuple sur la fiche pour appliquer les bonus raciaux
- Import automatique des compétences raciales
- Conservation des valeurs achetées lors d'un changement de peuple

### Magie — Arts Magiques
- 4 domaines : **Accord, Cyse, Décorum, Geste**
- 3 obédiences : **Jorniste, Obscurantiste, Éclipsiste**
- Calcul de l'aptitude par domaine exact lors du lancer
- Support des compétences alternatives (compAlt)
- **Fée Noire** : Art = CRÉ uniquement

### Magie — Emprise & Danseurs
- Fiches Danseurs avec système de **création par points** (17 pts à répartir, 4 statistiques indépendantes, niveaux 1–7)
- Jet 3d10 par statistique selon le tableau officiel
- Suivi de mémoire basé sur la somme des seuils de sorts vs capacité seuil
- Jets de sorts via danseurs avec seuil × 2 en improvisation
- Potentiel d'Emprise selon le type de mage

### Démons
- Type d'acteur dédié lié à la fiche personnage
- Création automatique lors du franchissement des paliers de Ténèbres (modes auto et manuel)
- Stats propres (AGI/FOR/PER/INT/VOL/CHA/CRÉ, densité, blessures)

### Combat & jets
- Jets de caractéristiques, de compétences, d'attaque, de parade, d'esquive et de défense avec dé explosif d10 (jet ouvert ou fermé)
- Détection automatique des **fumbles** et **critiques**
- Cartes de chat enrichies avec détail des calculs, en français et en anglais
- Notes de compétences affichées dans le chat

### Compagnons, Démons & PNJ
- Fiches dédiées pour compagnons, démons et PNJ, construites sur la même base que la fiche personnage
- Caractéristiques **regroupées par aspect** (Corps, Esprit, Âme) : cliquer sur une caractéristique lance le jet, comme pour un personnage
- Onglet Magie des PNJ (sorts, Arts Magiques, filtres et tri)
- Liés à la fiche personnage (onglet Compagnons)

### Objets
- Fiche pour chaque type d'objet, dont les peines de Perfidie et les démons
- **Descriptions en texte riche** : mise en forme (gras, listes, liens, tableaux…) rendue dans les fiches, les navigateurs et le chat

### Applications
- **Navigateurs** : armes, armures, compétences, sorts, pouvoirs, manœuvres, peuples, avantages, peines
  - Recherche et filtres, **tri en cliquant sur les colonnes**, Échap pour effacer la recherche
  - Section **Objets personnalisés** : les objets du même type créés dans le monde ou dans vos compendiums, avec leurs effets, ajoutés en un clic
- **Calendrier d'Harmonde** : suivi du jour/mois/année, phases de lune, notes journalières, heure par quarts
- **Météo dynamique** : sélection via le calendrier, appliquée automatiquement à la scène active (effets de particules + filtres + luminosité selon l'heure)
- **Tracker de combat** : initiative et ordre du tour custom, passage de round, gestion de l'état des combattants
- **Mode sombre** : par défaut, le thème Agone suit le thème des applications Foundry ; le bouton 🌙 de la barre d'outils Agone fixe un choix clair ou sombre, mémorisé par joueur. Les cartes de jet du chat et les widgets suivent le même thème.

### Langues & mises à jour
- Interface en **français** et en **anglais**
- **Migrations automatiques** : à la première connexion du MJ après une mise à jour, les données du monde sont adaptées (par exemple, effets des avantages existants)
- Historique des versions : [CHANGELOG](CHANGELOG.md)

---

## Météo & Effets de scène

Le calendrier permet de sélectionner une météo qui s'applique automatiquement à la scène active à chaque changement d'heure ou de météo :

| Météo | Effets |
|---|---|
| ☀️ Ensoleillé | Tinte chaude, luminosité +15% |
| ⛅ Nuageux | Nuages flottants, tinte grise |
| 🌧️ Pluie | Particules de pluie, tinte grise-bleue |
| ⛈️ Orage | Pluie dense + éclairs, très sombre |
| 🌫️ Brouillard | Particules de brouillard, tinte brumeuse |
| ❄️ Neige | Particules de neige, tinte froide |
| 🌨️ Grêle | Grêle + nuages lourds |
| 🌪️ Blizzard | Tempête de neige dense, luminosité -30% |
| 🔆 Chaleur accablante | Filtre bloom + tinte orangée, luminosité +20% |
| 🌙 Nuit étoilée | Étoiles + filtre bleu nuit profond |
| 🍂 Vent d'automne | Feuilles mortes + tinte ambre-dorée |
| 🌋 Pluie de cendres | Braises grises + tinte désaturée sombre |
| 🌅 Brume de chaleur | Distorsion thermique + tinte chaude |

La luminosité de la scène varie automatiquement selon l'heure du jour (nuit → 0, journée → 0.75) et est modulée par la météo.

> **Module FXMaster requis** pour les effets de particules et filtres avancés. Sans ce module, un fallback vers les effets météo natifs de Foundry est utilisé (pluie, neige, brouillard).

---

## Compendiums inclus

| Compendium | Contenu |
|---|---|
| Compétences Agone | Toutes les compétences du livre de base |
| Peuples Agone | Les différents peuples jouables |
| Armes Agone | Armes de mêlée et à distance |
| Boucliers & Armures Agone | Armures et boucliers |
| Sorts & Œuvres Agone | Sorts des 4 domaines magiques (Accord, Cyse, Décorum, Geste) + domaines Emprise (Jorniste, Éclipsiste, Obscurantiste) |

---

## Modules recommandés

| Module | Utilité |
|---|---|
| [FXMaster](https://foundryvtt.com/packages/fxmaster) | Effets météo avancés (particules + filtres) — fortement recommandé |
| [Quench](https://foundryvtt.com/packages/quench) | Tests d'intégration du système (pour le développement uniquement) |

---

## Compatibilité

| Foundry VTT | Statut |
|---|---|
| v13 | ✅ Vérifié |
| v14 | ✅ Vérifié |

---

## Développement

Le système est servi tel quel par Foundry (modules ES natifs, sans étape de build) : le dépôt se place directement dans `FoundryVTT/Data/systems/agone`, et un rechargement du monde (F5) suffit pour tester une modification.

```bash
npm install      # outillage de développement uniquement
npm run lint     # vérification ESLint du code (module/, tests/)
npm test         # tests unitaires hors Foundry (tests/unit)
```

- **Tests unitaires** (`tests/unit`, Node) : logique des effets, données de contexte des fiches, intégrité des données de compendium, traductions fr/en, compilation des templates, validité du CSS, cohérence du manifeste et du CHANGELOG.
- ESLint et les tests unitaires sont exécutés par GitHub Actions à chaque push et pull request.
- **Tests d'intégration** (`module/tests`, Quench) : activez le module Quench dans un monde de test, puis lancez les batchs « Agone » depuis son onglet — intégration du système, valeurs dérivées, formules de chaque jet, chaque statistique d'effet sur chaque type d'acteur, fiches et éditeur d'effets, navigateurs de compendium.
- **Publication** : augmentez `version` dans `system.json`, complétez le [CHANGELOG](CHANGELOG.md), puis poussez un tag `vX.Y.Z` : la release et `agone.zip` sont créés automatiquement.
- Les contenus des compendiums du système sont générés depuis `module/helpers/compendium-data.mjs` ; les modifications de données persistantes passent par une migration (`module/migration.mjs`).

---

## Crédits

- **Développeur** : Lojocats
- **Jeu original** : Agone — Multisim
- Code développé avec l'assistance de Claude Code

## Licence

Ce système est distribué sous licence [MIT](LICENSE). Le contenu du jeu Agone (règles, univers, textes) reste la propriété de ses ayants droit.
