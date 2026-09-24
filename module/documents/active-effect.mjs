/**
 * Effets actifs Agone.
 *
 * Un effet porté par une peine de Perfidie peut appartenir à son bienfait (flag `agone.bienfait`) :
 * il ne s'applique qu'une fois le bienfait acquis (`system.bienfaitAcquis`). Les autres effets
 * de la peine s'appliquent dès qu'elle est possédée.
 */
export class AgoneActiveEffect extends foundry.documents.ActiveEffect {

  /** L'effet appartient au bienfait de sa peine. */
  get estBienfait() {
    return !!this.getFlag("agone", "bienfait");
  }

  /** @override — effet de bienfait suspendu tant que le bienfait n'est pas acquis */
  get isSuppressed() {
    const peine = this.parent;
    if (this.estBienfait && peine?.type === "peine" && !peine.system?.bienfaitAcquis) return true;
    return super.isSuppressed;
  }
}
