/*
 * One Health PWA worker bootstrap — version 2026.07.25.1.
 *
 * Le nom et cette version permettent au navigateur de remplacer l'ancien
 * ngsw-worker.js, dont la CSP ne permettait pas les avatars Firebase.
 * Lors d'une future modification de CSP du worker, incrémenter cette version.
 */
importScripts('./ngsw-worker.js');
