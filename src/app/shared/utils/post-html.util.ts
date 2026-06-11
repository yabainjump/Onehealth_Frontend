/**
 * Construit le HTML d'un contenu de post : échappe le HTML (anti-XSS),
 * transforme les URLs et les #hashtags en éléments cliquables, puis les
 * sauts de ligne en <br>. Renvoie une chaîne HTML (à passer ensuite à
 * bypassSecurityTrustHtml côté pipe/composant).
 *
 * Les hashtags deviennent <span class="hashtag" data-tag="..."> : la
 * navigation est gérée par la page (délégation de clic) pour rester dans
 * la SPA (pas de rechargement complet).
 */
export function buildPostHtml(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  // 1) Échappement HTML (anti-injection)
  const escaped = value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  // 2) Liens http(s):// et www.
  const urlRegex = /((https?:\/\/|www\.)[^\s<]+)/gi;
  const linkified = escaped.replace(urlRegex, (match: string) => {
    const href = match.startsWith('http') ? match : `https://${match}`;
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${match}</a>`;
  });

  // 3) Hashtags #mot (lettres accentuées, chiffres, _ ; 1 à 50 caractères)
  //    Le tag stocké (data-tag) est en minuscules pour une recherche cohérente.
  const hashtagRegex = /(^|\s)#([\p{L}\p{N}_]{1,50})/gu;
  const withHashtags = linkified.replace(
    hashtagRegex,
    (_full: string, prefix: string, tag: string) =>
      `${prefix}<span class="hashtag" data-tag="${tag.toLowerCase()}">#${tag}</span>`,
  );

  // 4) Sauts de ligne
  return withHashtags.replace(/\n/g, '<br>');
}

/**
 * Si un clic a eu lieu sur un #hashtag rendu, renvoie le tag (minuscules),
 * sinon null. Permet à chaque page de naviguer vers /tags/:tag sans recharger.
 */
export function hashtagFromClick(event: Event): string | null {
  const el = event.target as HTMLElement | null;
  if (el && el.classList && el.classList.contains('hashtag')) {
    return el.getAttribute('data-tag');
  }
  return null;
}

/** Extrait la liste des hashtags (minuscules, uniques) d'un texte. */
export function extractHashtags(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }
  const hashtagRegex = /(^|\s)#([\p{L}\p{N}_]{1,50})/gu;
  const tags = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = hashtagRegex.exec(value)) !== null) {
    tags.add(match[2].toLowerCase());
  }
  return [...tags];
}
