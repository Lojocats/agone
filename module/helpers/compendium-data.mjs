/**
 * Données de référence pour les compendiums Agone
 * Armes de mêlée, de trait, de lancer + Boucliers
 */

// Champs : name, style, initBonus, attackBonus, defenseBonus, dommages, type,
//          tai, reqFor, reqAgi, portee (optionnel), description (optionnel)

export const ARMES_DATA = [
  // ── MÊLÉE ────────────────────────────────────────────────────────────────
  { name:"Épinglette",       style:"melee", initBonus:-2, attackBonus: 2, defenseBonus:-1, dommages: 0, type:"P",  tai:-3, reqFor: 1, reqAgi: 1 },
  { name:"Lamelle",          style:"melee", initBonus:-4, attackBonus: 1, defenseBonus:-1, dommages: 0, type:"T",  tai:-3, reqFor: 1, reqAgi: 3 },
  { name:"Aiguillon",        style:"melee", initBonus:-2, attackBonus: 2, defenseBonus:-1, dommages: 0, type:"P",  tai:-2, reqFor: 1, reqAgi: 3 },
  { name:"Coutelle",         style:"melee", initBonus:-2, attackBonus: 1, defenseBonus:-1, dommages: 1, type:"T",  tai:-2, reqFor: 1, reqAgi: 3 },
  { name:"Demi-hache",       style:"melee", initBonus:-2, attackBonus: 0, defenseBonus:-1, dommages: 3, type:"T",  tai:-2, reqFor: 2, reqAgi: 2 },
  { name:"Matraque",         style:"melee", initBonus:-2, attackBonus: 1, defenseBonus:-1, dommages: 1, type:"C",  tai:-2, reqFor: 1, reqAgi: 1 },
  { name:"Canne",            style:"melee", initBonus: 0, attackBonus: 1, defenseBonus: 1, dommages: 2, type:"C",  tai:-1, reqFor: 2, reqAgi: 1 },
  { name:"Coutelas",         style:"melee", initBonus: 0, attackBonus: 1, defenseBonus: 0, dommages: 2, type:"PT", tai:-1, reqFor: 2, reqAgi: 3 },
  { name:"Dague",            style:"melee", initBonus: 0, attackBonus: 2, defenseBonus: 0, dommages: 1, type:"P",  tai:-1, reqFor: 1, reqAgi: 3 },
  { name:"Fouet",            style:"melee", initBonus:-1, attackBonus: 0, defenseBonus:-2, dommages: 0, type:"T",  tai:-1, reqFor: 1, reqAgi: 4 },
  { name:"Glaive",           style:"melee", initBonus:-1, attackBonus: 1, defenseBonus: 0, dommages: 3, type:"PT", tai:-1, reqFor: 2, reqAgi: 3 },
  { name:"Hachette",         style:"melee", initBonus:-1, attackBonus: 0, defenseBonus:-1, dommages: 4, type:"T",  tai:-1, reqFor: 3, reqAgi: 2 },
  { name:"Main gauche",      style:"melee", initBonus: 0, attackBonus: 0, defenseBonus: 3, dommages: 1, type:"P",  tai:-1, reqFor: 2, reqAgi: 4 },
  { name:"Massette",         style:"melee", initBonus:-1, attackBonus: 0, defenseBonus:-1, dommages: 3, type:"C",  tai:-1, reqFor: 3, reqAgi: 1 },
  { name:"Cimeterre",        style:"melee", initBonus: 1, attackBonus: 1, defenseBonus: 0, dommages: 4, type:"T",  tai: 0, reqFor: 4, reqAgi: 3 },
  { name:"Épée",             style:"melee", initBonus: 1, attackBonus: 1, defenseBonus: 1, dommages: 4, type:"PT", tai: 0, reqFor: 5, reqAgi: 3 },
  { name:"Épée ogre",        style:"melee", initBonus: 2, attackBonus: 1, defenseBonus: 1, dommages: 5, type:"TC", tai: 0, reqFor: 8, reqAgi: 3 },
  { name:"Étoile de fer",    style:"melee", initBonus: 0, attackBonus:-1, defenseBonus:-2, dommages: 7, type:"PC", tai: 0, reqFor: 6, reqAgi: 6 },
  { name:"Fléau d'arme",     style:"melee", initBonus: 0, attackBonus:-1, defenseBonus:-2, dommages: 6, type:"C",  tai: 0, reqFor: 5, reqAgi: 6 },
  { name:"Fleuret",          style:"melee", initBonus: 1, attackBonus: 2, defenseBonus: 1, dommages: 2, type:"P",  tai: 0, reqFor: 3, reqAgi: 4 },
  { name:"Fourchon",         style:"melee", initBonus: 3, attackBonus: 0, defenseBonus: 0, dommages: 4, type:"P",  tai: 0, reqFor: 5, reqAgi: 2 },
  { name:"Hache",            style:"melee", initBonus: 1, attackBonus: 0, defenseBonus:-1, dommages: 6, type:"T",  tai: 0, reqFor: 5, reqAgi: 2 },
  { name:"Hache ogre",       style:"melee", initBonus: 1, attackBonus: 0, defenseBonus:-2, dommages: 8, type:"T",  tai: 0, reqFor: 7, reqAgi: 2 },
  { name:"Marteau de guerre",style:"melee", initBonus: 0, attackBonus: 0, defenseBonus: 0, dommages: 5, type:"PC", tai: 0, reqFor: 5, reqAgi: 3 },
  { name:"Masse",            style:"melee", initBonus: 0, attackBonus: 1, defenseBonus:-1, dommages: 4, type:"C",  tai: 0, reqFor: 4, reqAgi: 1 },
  { name:"Massue",           style:"melee", initBonus: 0, attackBonus: 1, defenseBonus:-1, dommages: 5, type:"C",  tai: 0, reqFor: 5, reqAgi: 1 },
  { name:"Rapière",          style:"melee", initBonus: 2, attackBonus: 2, defenseBonus: 1, dommages: 5, type:"P",  tai: 0, reqFor: 4, reqAgi: 6 },
  { name:"Sabre",            style:"melee", initBonus: 1, attackBonus: 1, defenseBonus: 1, dommages: 4, type:"PT", tai: 0, reqFor: 5, reqAgi: 3 },
  { name:"Bâton ferré",      style:"melee", initBonus: 2, attackBonus: 2, defenseBonus: 2, dommages: 4, type:"C",  tai: 1, reqFor: 4, reqAgi: 3 },
  { name:"Espadon",          style:"melee", initBonus: 1, attackBonus: 0, defenseBonus:-1, dommages: 7, type:"TC", tai: 1, reqFor: 8, reqAgi: 3 },
  { name:"Grand fléau",      style:"melee", initBonus: 1, attackBonus:-1, defenseBonus:-2, dommages: 8, type:"C",  tai: 1, reqFor: 7, reqAgi: 6 },
  { name:"Grande lance",     style:"melee", initBonus: 5, attackBonus: 0, defenseBonus:-1, dommages: 4, type:"P",  tai: 1, reqFor: 5, reqAgi: 2 },
  { name:"Hache double",     style:"melee", initBonus: 1, attackBonus: 0, defenseBonus:-1, dommages: 8, type:"T",  tai: 1, reqFor: 9, reqAgi: 3 },
  { name:"Hallebarde",       style:"melee", initBonus: 4, attackBonus: 0, defenseBonus:-1, dommages:10, type:"T",  tai: 1, reqFor: 8, reqAgi: 3 },
  { name:"Lance",            style:"melee", initBonus: 4, attackBonus: 0, defenseBonus:-1, dommages: 4, type:"P",  tai: 1, reqFor: 4, reqAgi: 2 },
  { name:"Lance de cavalier",style:"melee", initBonus: 6, attackBonus: 0, defenseBonus:-2, dommages: 7, type:"P",  tai: 1, reqFor: 6, reqAgi: 4 },
  { name:"Maillet ogre",     style:"melee", initBonus: 1, attackBonus: 0, defenseBonus:-1, dommages: 8, type:"C",  tai: 1, reqFor:10, reqAgi: 1 },
  { name:"Pilum",            style:"melee", initBonus: 3, attackBonus: 0, defenseBonus:-1, dommages: 4, type:"P",  tai: 1, reqFor: 4, reqAgi: 2 },
  { name:"Pique",            style:"melee", initBonus: 6, attackBonus: 0, defenseBonus:-1, dommages: 4, type:"P",  tai: 1, reqFor: 6, reqAgi: 2 },
  { name:"Trident",          style:"melee", initBonus: 3, attackBonus: 0, defenseBonus: 0, dommages: 5, type:"P",  tai: 1, reqFor: 6, reqAgi: 2 },
  { name:"Épée géante",      style:"melee", initBonus: 3, attackBonus: 1, defenseBonus: 1, dommages: 8, type:"TC", tai: 2, reqFor:14, reqAgi: 3 },
  { name:"Hache géante",     style:"melee", initBonus: 2, attackBonus: 0, defenseBonus:-1, dommages:12, type:"T",  tai: 2, reqFor:14, reqAgi: 2 },
  { name:"Lance géante",     style:"melee", initBonus: 8, attackBonus: 0, defenseBonus:-1, dommages: 6, type:"P",  tai: 2, reqFor: 8, reqAgi: 2 },
  { name:"Masse géante",     style:"melee", initBonus: 2, attackBonus: 1, defenseBonus:-1, dommages: 8, type:"C",  tai: 2, reqFor:12, reqAgi: 1 },
  { name:"Tronc d'arbre",    style:"melee", initBonus: 3, attackBonus: 1, defenseBonus: 0, dommages: 6, type:"C",  tai: 2, reqFor:12, reqAgi: 1 },
  { name:"Maillet géant",    style:"melee", initBonus: 2, attackBonus: 1, defenseBonus:-1, dommages:12, type:"C",  tai: 3, reqFor:17, reqAgi: 1 },
  { name:"Pique géante",     style:"melee", initBonus:10, attackBonus: 0, defenseBonus:-1, dommages: 6, type:"P",  tai: 3, reqFor:15, reqAgi: 2 },

  // ── TRAIT ────────────────────────────────────────────────────────────────
  { name:"Arbalète farfadine",  style:"trait", initBonus:5, attackBonus:0, defenseBonus:0, dommages: 4, type:"P", portee:"40 m",   tai:-2, reqFor: 3, reqAgi: 3 },
  { name:"Arc lutin",           style:"trait", initBonus:4, attackBonus:0, defenseBonus:0, dommages: 2, type:"P", portee:"40 m",   tai:-2, reqFor: 2, reqAgi: 5 },
  { name:"Arbalète légère",     style:"trait", initBonus:5, attackBonus:1, defenseBonus:0, dommages: 6, type:"P", portee:"60 m",   tai:-1, reqFor: 5, reqAgi: 3 },
  { name:"Arc court",           style:"trait", initBonus:4, attackBonus:0, defenseBonus:0, dommages: 3, type:"P", portee:"60 m",   tai:-1, reqFor: 3, reqAgi: 5 },
  { name:"Arc court composite", style:"trait", initBonus:4, attackBonus:0, defenseBonus:0, dommages: 4, type:"P", portee:"80 m",   tai:-1, reqFor: 4, reqAgi: 4 },
  { name:"Arbalète",            style:"trait", initBonus:5, attackBonus:1, defenseBonus:0, dommages: 8, type:"P", portee:"120 m",  tai: 0, reqFor: 6, reqAgi: 3 },
  { name:"Arc",                 style:"trait", initBonus:4, attackBonus:0, defenseBonus:0, dommages: 7, type:"P", portee:"80 m",   tai: 0, reqFor: 4, reqAgi: 5 },
  { name:"Arc composite",       style:"trait", initBonus:4, attackBonus:0, defenseBonus:0, dommages: 8, type:"P", portee:"100 m",  tai: 0, reqFor: 5, reqAgi: 4 },
  { name:"Arbalète lourde",     style:"trait", initBonus:5, attackBonus:1, defenseBonus:0, dommages:12, type:"P", portee:"150 m",  tai: 1, reqFor: 7, reqAgi: 3 },
  { name:"Arc long",            style:"trait", initBonus:4, attackBonus:0, defenseBonus:0, dommages: 8, type:"P", portee:"150 m",  tai: 1, reqFor: 6, reqAgi: 5 },
  { name:"Baliste",             style:"trait", initBonus:5, attackBonus:1, defenseBonus:0, dommages:16, type:"P", portee:"300 m",  tai: 3, reqFor:17, reqAgi: 3 },

  // ── LANCER ───────────────────────────────────────────────────────────────
  { name:"Épinglette (lancer)",   style:"jet", initBonus:2, attackBonus: 0, defenseBonus:0, dommages: 0, type:"P", portee:"FOR×2 m",  tai:-3, reqFor: 2, reqAgi: 6 },
  { name:"Aiguillon (lancer)",    style:"jet", initBonus:2, attackBonus: 0, defenseBonus:0, dommages: 0, type:"P", portee:"FOR×2 m",  tai:-2, reqFor: 2, reqAgi: 6 },
  { name:"Bille (fronde)",        style:"jet", initBonus:0, attackBonus: 1, defenseBonus:0, dommages: 2, type:"C", portee:"60 m",     tai:-2, reqFor: 1, reqAgi: 5 },
  { name:"Caillou",               style:"jet", initBonus:2, attackBonus: 1, defenseBonus:0, dommages: 0, type:"C", portee:"FOR×4 m",  tai:-2, reqFor: 2, reqAgi: 2 },
  { name:"Caillou (fronde)",      style:"jet", initBonus:0, attackBonus: 0, defenseBonus:0, dommages: 2, type:"C", portee:"60 m",     tai:-2, reqFor: 1, reqAgi: 5 },
  { name:"Demi-hache (lancer)",   style:"jet", initBonus:2, attackBonus: 1, defenseBonus:0, dommages: 3, type:"T", portee:"FOR×4 m",  tai:-2, reqFor: 3, reqAgi: 5 },
  { name:"Boulet",                style:"jet", initBonus:2, attackBonus: 1, defenseBonus:0, dommages: 4, type:"C", portee:"FOR×4 m",  tai:-1, reqFor: 8, reqAgi: 2 },
  { name:"Dague (lancer)",        style:"jet", initBonus:2, attackBonus: 0, defenseBonus:0, dommages: 1, type:"P", portee:"FOR×4 m",  tai:-1, reqFor: 2, reqAgi: 6 },
  { name:"Hachette (lancer)",     style:"jet", initBonus:2, attackBonus: 1, defenseBonus:0, dommages: 4, type:"T", portee:"FOR×4 m",  tai:-1, reqFor: 3, reqAgi: 5 },
  { name:"Javelot",               style:"jet", initBonus:1, attackBonus: 0, defenseBonus:0, dommages: 4, type:"P", portee:"FOR×6 m",  tai:-1, reqFor: 4, reqAgi: 6 },
  { name:"Fourchon (lancer)",     style:"jet", initBonus:1, attackBonus: 0, defenseBonus:0, dommages: 4, type:"P", portee:"FOR×4 m",  tai: 0, reqFor: 6, reqAgi: 6 },
  { name:"Hache de lancer",       style:"jet", initBonus:2, attackBonus: 1, defenseBonus:0, dommages: 6, type:"T", portee:"FOR×4 m",  tai: 0, reqFor: 6, reqAgi: 5 },
  { name:"Lance (lancer)",        style:"jet", initBonus:1, attackBonus: 0, defenseBonus:0, dommages: 4, type:"P", portee:"FOR×5 m",  tai: 0, reqFor: 6, reqAgi: 6 },
  { name:"Pierre",                style:"jet", initBonus:2, attackBonus: 1, defenseBonus:0, dommages: 3, type:"C", portee:"FOR×4 m",  tai: 0, reqFor: 6, reqAgi: 2 },
  { name:"Boulet (fronde)",       style:"jet", initBonus:0, attackBonus: 1, defenseBonus:0, dommages: 6, type:"C", portee:"55 m",     tai: 1, reqFor:11, reqAgi: 5 },
  { name:"Filet",                 style:"jet", initBonus:0, attackBonus:-1, defenseBonus:0, dommages: 0, type:"P", portee:"FOR×1 m",  tai: 1, reqFor: 3, reqAgi: 5, description:"Immobilise la cible — aucun dommage direct." },
  { name:"Hache double (lancer)", style:"jet", initBonus:2, attackBonus: 1, defenseBonus:0, dommages: 8, type:"T", portee:"FOR×4 m",  tai: 1, reqFor:14, reqAgi: 5 },
  { name:"Pavé",                  style:"jet", initBonus:2, attackBonus: 1, defenseBonus:0, dommages: 4, type:"C", portee:"FOR×4 m",  tai: 1, reqFor: 8, reqAgi: 2 },
  { name:"Pavé (fronde)",         style:"jet", initBonus:0, attackBonus: 1, defenseBonus:0, dommages: 6, type:"C", portee:"55 m",     tai: 1, reqFor:11, reqAgi: 5 },
  { name:"Pique (lancer)",        style:"jet", initBonus:1, attackBonus: 0, defenseBonus:0, dommages: 4, type:"P", portee:"FOR×5 m",  tai: 1, reqFor:12, reqAgi: 6 },
  { name:"Trident (lancer)",      style:"jet", initBonus:1, attackBonus: 0, defenseBonus:0, dommages: 5, type:"P", portee:"FOR×4 m",  tai: 1, reqFor: 6, reqAgi: 6 },
  { name:"Hache géante (lancer)", style:"jet", initBonus:2, attackBonus: 1, defenseBonus:0, dommages:12, type:"T", portee:"FOR×3 m",  tai: 2, reqFor:18, reqAgi: 5 },
  { name:"Lance géante (lancer)", style:"jet", initBonus:1, attackBonus: 0, defenseBonus:0, dommages: 6, type:"P", portee:"FOR×4 m",  tai: 2, reqFor:16, reqAgi: 6 },
  { name:"Rocher",                style:"jet", initBonus:2, attackBonus: 1, defenseBonus:0, dommages: 6, type:"C", portee:"FOR×2 m",  tai: 2, reqFor:16, reqAgi: 2 },
  { name:"Rocher (fronde)",       style:"jet", initBonus:0, attackBonus: 0, defenseBonus:0, dommages: 8, type:"C", portee:"20 m",     tai: 2, reqFor:17, reqAgi: 5 },
];

// ── ARMURES ──────────────────────────────────────────────────────────────────
// type "0" = Veste seule | "1" = Partielle | "2" = Complète
// malusAgi stocké en valeur positive
export const ARMURES_DATA = [
  // Vêtements lourds
  { name:"Vêtements lourds (Veste seule)",  type:"0", protection: 1, malusAgi: 0 },
  { name:"Vêtements lourds (Partielle)",    type:"1", protection: 1, malusAgi: 0 },
  { name:"Vêtements lourds (Complète)",     type:"2", protection: 2, malusAgi: 0 },
  // Cuir
  { name:"Cuir (Veste seule)",              type:"0", protection: 2, malusAgi: 1 },
  { name:"Cuir (Partielle)",               type:"1", protection: 3, malusAgi: 1 },
  { name:"Cuir (Complète)",                type:"2", protection: 4, malusAgi: 2 },
  // Cuir et métal
  { name:"Cuir et métal (Veste seule)",     type:"0", protection: 3, malusAgi: 1 },
  { name:"Cuir et métal (Partielle)",      type:"1", protection: 5, malusAgi: 2 },
  { name:"Cuir et métal (Complète)",       type:"2", protection: 6, malusAgi: 4 },
  // Écailles
  { name:"Écailles (Veste seule)",          type:"0", protection: 4, malusAgi: 2 },
  { name:"Écailles (Partielle)",           type:"1", protection: 7, malusAgi: 4 },
  { name:"Écailles (Complète)",            type:"2", protection: 8, malusAgi: 6 },
  // Lamelles
  { name:"Lamelles (Veste seule)",          type:"0", protection: 5, malusAgi: 3 },
  { name:"Lamelles (Partielle)",           type:"1", protection: 9, malusAgi: 6 },
  { name:"Lamelles (Complète)",            type:"2", protection:10, malusAgi:10 },
  // Cotte de mailles
  { name:"Cotte de mailles (Veste seule)", type:"0", protection: 6, malusAgi: 4 },
  { name:"Cotte de mailles (Partielle)",   type:"1", protection:11, malusAgi: 8 },
  { name:"Cotte de mailles (Complète)",    type:"2", protection:12, malusAgi:12 },
  // Plaques
  { name:"Plaques (Veste seule)",          type:"0", protection: 7, malusAgi: 5 },
  { name:"Plaques (Partielle)",            type:"1", protection:13, malusAgi:10 },
  { name:"Plaques (Complète)",             type:"2", protection:14, malusAgi:14 },
];

// ── BOUCLIERS ─────────────────────────────────────────────────────────────────
// type "2" = Bouclier (ArmureData)
export const BOUCLIERS_DATA = [
  { name:"Petite targe",   type:"2", protection: 3, malusAgi:0 },
  { name:"Targe",          type:"2", protection: 5, malusAgi:1 },
  { name:"Bouclier",       type:"2", protection: 7, malusAgi:2 },
  { name:"Grand bouclier", type:"2", protection:10, malusAgi:3 },
  { name:"Pavois",         type:"2", protection:14, malusAgi:5 },
];
