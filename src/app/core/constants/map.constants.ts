/**
 * `ngsw-bypass` empêche le service worker Angular d'intercepter les tuiles.
 * Elles restent chargées directement comme images par le navigateur.
 */
export const OPENSTREETMAP_TILE_URL =
  'https://tile.openstreetmap.org/{z}/{x}/{y}.png?ngsw-bypass=true';

export const OPENSTREETMAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
