import { environment } from 'src/environments/environment';

/**
 * Origine du backend (sans le suffixe `/api`), deduite de `apiBaseUrl`.
 * Ex: `https://backend.example.com/api` -> `https://backend.example.com`
 */
const BACKEND_ORIGIN = (environment.apiBaseUrl || '')
  .replace(/\/api\/?$/, '')
  .replace(/\/+$/, '');

/**
 * Normalise une URL de media servie par le backend.
 *
 * Certaines donnees historiques contiennent des URLs absolues codees en dur
 * (ex: `http://localhost:3000/uploads/...`) car `PUBLIC_BASE_URL` n'etait pas
 * configure au moment de l'upload. On ignore l'origine stockee et on force
 * l'origine du backend courant : les medias deviennent resilients quel que soit
 * l'environnement (dev/prod) et les donnees existantes sont reparees a l'affichage.
 */
export function resolveMediaUrl(raw?: string | null): string {
  const value = `${raw ?? ''}`.trim();
  if (!value) {
    return '';
  }

  // Donnees inline ou assets locaux du frontend : ne pas toucher.
  if (
    value.startsWith('data:') ||
    value.startsWith('blob:') ||
    value.startsWith('assets/') ||
    value.startsWith('/assets')
  ) {
    return value;
  }

  // Tout chemin `/uploads/...` (relatif ou avec une origine erronee) est
  // reconstruit sur l'origine du backend configure.
  const uploadsIndex = value.indexOf('/uploads/');
  if (uploadsIndex >= 0) {
    return `${BACKEND_ORIGIN}${value.substring(uploadsIndex)}`;
  }

  return value;
}
