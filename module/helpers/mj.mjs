/**
 * MJ actif et sérialisation des tâches du monde.
 *
 * Les tâches qui écrivent dans le monde (migrations, compendiums, météo de la scène) ne doivent
 * tourner que sur un seul client : celui du MJ actif désigné par Foundry.
 */

/**
 * Vrai si le client courant est celui du MJ actif (`game.users.activeGM`).
 * À défaut de cette information, tout MJ connecté est accepté.
 */
export function estMJActif() {
  const actif = game.users?.activeGM;
  if (actif) return !!actif.isSelf;
  return !!game.user?.isGM;
}

/**
 * File d'attente : les tâches passées à la fonction renvoyée s'exécutent l'une après l'autre,
 * dans l'ordre des appels. L'échec d'une tâche n'empêche pas les suivantes.
 * @returns {(tache: () => Promise<*>|*) => Promise<*>}  promesse du résultat de la tâche
 */
export function creerFile() {
  let fin = Promise.resolve();
  return tache => {
    const resultat = fin.then(tache);
    fin = resultat.catch(() => {});
    return resultat;
  };
}
