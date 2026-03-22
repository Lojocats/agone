# Agone — Système Foundry VTT

Système non-officiel pour le jeu de rôle [**Agone**](https://fr.wikipedia.org/wiki/Agone_(jeu_de_r%C3%B4le)) (Multisim) sur [Foundry VTT](https://foundryvtt.com/) v13.

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
- Système d'**avantages & défauts** (Dons) avec effets mécaniques automatiques
- Suivi des **Ténèbres & Perfidie** avec apparition automatique des démons intérieurs aux paliers

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
- Fiches Danseurs avec endurance, mémoire et liste de sorts
- Jets de sorts via danseurs avec seuil × 2 en improvisation
- Potentiel d'Emprise selon le type de mage

### Démons Intérieurs
- Type d'acteur dédié lié à la fiche personnage
- Création automatique lors du franchissement des paliers de Ténèbres
- Stats propres (AGI/FOR/PER/INT/VOL/CHA/CRÉ, densité, blessures)

### Combat
- Jets d'attributs et de compétences avec dé explodant d10
- Détection automatique des **fumbles** et **critiques**
- Cartes de chat enrichies avec détail des calculs
- Notes de compétences affichées dans le chat

### Compagnons & PNJ
- Fiches simplifiées pour compagnons et PNJ
- Liés à la fiche personnage (onglet Compagnons)

### Applications
- **Navigateurs** : armes, armures, compétences, sorts, pouvoirs, manœuvres, peuples, avantages, peines
- **Calendrier Saisonin** avec configuration des saisons et bonus saisonniers

---

## Compendiums inclus

| Compendium | Contenu |
|---|---|
| Compétences Agone | Toutes les compétences du livre de base |
| Peuples Agone | Les différents peuples jouables |
| Armes Agone | Armes de mêlée et à distance |
| Boucliers & Armures Agone | Armures et boucliers |
| Sorts & Œuvres Agone | Sorts des 4 domaines magiques |

---

## Compatibilité

| Foundry VTT | Statut |
|---|---|
| v13 | ✅ Vérifié |

---

## Crédits

- **Développeur** : Lojocats
- **Jeu original** : Agone — Multisim
- Code développé avec l'assistance de GitHub Copilot

## Licence

Ce système est distribué sous licence [MIT](LICENSE). Le contenu du jeu Agone (règles, univers, textes) reste la propriété de ses ayants droit.
