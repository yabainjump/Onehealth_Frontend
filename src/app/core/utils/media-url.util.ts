import { environment } from 'src/environments/environment';

/**
 * Origine du backend (sans le suffixe `/api`), deduite de `apiBaseUrl`.
 * Ex: `https://backend.example.com/api` -> `https://backend.example.com`
 */
const BACKEND_ORIGIN = (environment.apiBaseUrl || '')
  .replace(/\/api\/?$/, '')
  .replace(/\/+$/, '');

/** Base de l'API (avec le suffixe /api), utilisee pour les endpoints media. */
const API_BASE = (environment.apiBaseUrl || '').replace(/\/+$/, '');

/**
 * Version des URLs media. Sert de "cache-buster" : l'incrementer cree une
 * nouvelle cle d'URL cote proxy/CDN (LiteSpeed) -> contourne tout 404 fige en
 * cache. A incrementer si le cache edge se re-empoisonne un jour.
 */
const MEDIA_URL_VERSION = '2';
const FIREBASE_STORAGE_HOST = 'firebasestorage.googleapis.com';

/** Extrait la portion `/uploads/...` d'une URL, ou '' si absente. */
function uploadsPath(rawUrl?: string | null): string {
  const value = `${rawUrl ?? ''}`.trim();
  const index = value.indexOf('/uploads/');
  return index >= 0 ? value.substring(index) : '';
}

/**
 * Les anciennes photos Firebase ne sont pas gérées par notre cache PWA.
 * `ngsw-bypass` indique au worker Angular de laisser le navigateur effectuer
 * directement la requête <img>, évitant qu'une ancienne CSP du worker bloque
 * ces médias externes.
 */
function bypassServiceWorkerForFirebase(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    if (url.hostname.toLowerCase() !== FIREBASE_STORAGE_HOST) {
      return rawUrl;
    }
    url.searchParams.set('ngsw-bypass', 'true');
    return url.toString();
  } catch {
    return rawUrl;
  }
}

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

  // Anciennes migrations Firebase peuvent contenir une URI `gs://`, qui
  // n'est pas affichable directement par un navigateur. La convertir vers
  // l'endpoint de lecture Firebase permet de conserver les objets publics.
  const firebaseStorageMatch = value.match(/^gs:\/\/([^/]+)\/(.+)$/i);
  if (firebaseStorageMatch) {
    const [, bucket, objectPath] = firebaseStorageMatch;
    return bypassServiceWorkerForFirebase(
      `https://${FIREBASE_STORAGE_HOST}/v0/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(objectPath)}?alt=media`,
    );
  }

  // Tout chemin `/uploads/...` (relatif ou avec une origine erronee) est
  // reconstruit sur l'origine du backend configure.
  const uploadsIndex = value.indexOf('/uploads/');
  if (uploadsIndex >= 0) {
    return `${BACKEND_ORIGIN}${value.substring(uploadsIndex)}`;
  }

  return bypassServiceWorkerForFirebase(value);
}

/**
 * URL d'une miniature redimensionnee servie par le backend (sharp, mise en cache).
 * Pour une image d'upload, pointe vers `/api/media/thumb`. Sinon, renvoie l'URL
 * normalisee telle quelle (assets locaux, data:, etc.).
 */
export function mediaThumbUrl(rawUrl?: string | null, width = 800): string {
  const value = `${rawUrl ?? ''}`.trim();
  if (!value) {
    return '';
  }

  const path = uploadsPath(value);
  if (!path) {
    return resolveMediaUrl(value);
  }

  return `${API_BASE}/media/thumb?path=${encodeURIComponent(path)}&w=${width}&v=${MEDIA_URL_VERSION}`;
}

/**
 * URL du poster (1ʳᵉ frame) d'une video d'upload, genere par le backend (ffmpeg).
 * Renvoie '' si l'URL n'est pas une video d'upload.
 */
export function mediaPosterUrl(rawUrl?: string | null): string {
  const path = uploadsPath(rawUrl);
  if (!path) {
    return '';
  }

  return `${API_BASE}/media/poster?path=${encodeURIComponent(path)}&v=${MEDIA_URL_VERSION}`;
}
