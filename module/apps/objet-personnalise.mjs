/**
 * Création d'un objet personnalisé depuis la barre d'outils Agone.
 *
 * Ouvre le dialogue natif de Foundry (type + nom) et crée un item du monde, dont la fiche
 * s'ouvre aussitôt. Les navigateurs de compendium listent les items du monde de leur type
 * dans leur section « Objets personnalisés » : c'est le lien entre les deux.
 * Les items sont rangés dans un dossier d'items « Objets personnalisés » (créé au besoin
 * par le MJ, marqué par le drapeau agone.objetsPersonnalises ; un joueur l'utilise s'il existe déjà).
 */

/** Dossier d'items des objets personnalisés (créé par le MJ s'il manque), ou null. */
async function _dossierPersonnalises() {
  const nom = game.i18n.localize("AGONE.Browser.Personnalises");
  // Dossiers d'items racine : d'abord celui marqué par le système, sinon par son nom
  const racines = game.folders?.filter(f => f.type === "Item" && !f.folder) ?? [];
  const existant = racines.find(f => f.getFlag("agone", "objetsPersonnalises"))
    ?? racines.find(f => f.name === nom);
  if (existant) return existant;
  if (!game.user?.isGM) return null;
  try {
    return await Folder.implementation.create({
      name: nom, type: "Item", flags: { agone: { objetsPersonnalises: true } },
    });
  } catch (err) {
    console.warn("Agone | Dossier des objets personnalisés non créé", err);
    return null;
  }
}

/**
 * Ouvre le dialogue de création d'item (types du système) et crée l'item dans le monde.
 * @returns {Promise<Item|null>} l'item créé, ou null si le dialogue est annulé
 */
export async function creerObjetPersonnalise() {
  if (!game.user?.can("ITEM_CREATE")) return null;
  const dossier = await _dossierPersonnalises();
  const data = dossier ? { folder: dossier.id } : {};
  return (await Item.implementation.createDialog(data, { renderSheet: true })) ?? null;
}
