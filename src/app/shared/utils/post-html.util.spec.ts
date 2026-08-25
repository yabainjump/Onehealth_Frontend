import { buildPostHtml, extractHashtags, hashtagFromClick } from './post-html.util';

/**
 * Le résultat de `buildPostHtml` est passé à `bypassSecurityTrustHtml` :
 * le sanitizer d'Angular est donc désactivé et cette fonction est la SEULE
 * barrière anti-XSS du fil. Ces tests verrouillent son comportement pour
 * qu'une évolution ne rouvre pas la faille silencieusement.
 */
describe('buildPostHtml — barrière anti-XSS', () => {
  it('échappe les balises HTML', () => {
    const html = buildPostHtml('<script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  // On vérifie ce que le navigateur construira réellement, pas la chaîne :
  // du texte échappé peut contenir « onerror= » sans jamais devenir un attribut.
  const analyser = (source: string) => {
    const hote = document.createElement('div');
    hote.innerHTML = buildPostHtml(source);
    const elements = hote.querySelectorAll('*');
    const balises: string[] = [];
    const attributsEvenement: string[] = [];
    const liens: string[] = [];

    for (let i = 0; i < elements.length; i += 1) {
      const element = elements[i];
      balises.push(element.tagName);

      for (let j = 0; j < element.attributes.length; j += 1) {
        const nom = element.attributes[j].name;
        if (nom.toLowerCase().indexOf('on') === 0) {
          attributsEvenement.push(nom);
        }
      }

      const href = element.getAttribute('href');
      const src = element.getAttribute('src');
      if (href !== null) {
        liens.push(href);
      }
      if (src !== null) {
        liens.push(src);
      }
    }

    return { balises, attributsEvenement, liens };
  };

  it('ne crée aucun élément ni gestionnaire d’événement injecté', () => {
    const analyse = analyser('<img src=x onerror=alert(1)>');
    expect(analyse.balises).toEqual([]);
    expect(analyse.attributsEvenement).toEqual([]);
  });

  it('ne laisse pas sortir d’un attribut href', () => {
    const html = buildPostHtml('https://ok.test/a" onmouseover="alert(1)');
    expect(html).not.toMatch(/onmouseover\s*=\s*"/);
    expect(html).toContain('&quot;');
  });

  it('ne crée pas de lien pour un schéma javascript:', () => {
    const html = buildPostHtml('javascript:alert(1)');
    expect(html).not.toContain('href="javascript:');
  });

  it('ne crée pas de lien pour un schéma data:', () => {
    const html = buildPostHtml('data:text/html;base64,PHNjcmlwdD4=');
    expect(html).not.toContain('href="data:');
  });

  it('n’émet que des attributs entre guillemets doubles', () => {
    const html = buildPostHtml("https://ok.test/a'b #tag");
    expect(html).not.toMatch(/=\s*'/);
  });

  it('limite les hashtags aux caractères de mot', () => {
    const html = buildPostHtml('#tag"><script>alert(1)</script>');
    expect(html).toContain('data-tag="tag"');
    expect(html).not.toContain('<script>');
  });

  it('conserve les fonctionnalités attendues', () => {
    const html = buildPostHtml('Voir https://ok.test\n#zoonose');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('<br>');
    expect(html).toContain('data-tag="zoonose"');
  });

  it('renvoie une chaîne vide pour une valeur absente', () => {
    expect(buildPostHtml(null)).toBe('');
    expect(buildPostHtml(undefined)).toBe('');
    expect(buildPostHtml('')).toBe('');
  });

  // Toute balise autre que celles générées signifierait une évasion.
  it('ne produit que les éléments qu’il génère lui-même', () => {
    const analyse = analyser(
      '<svg/onload=alert(1)><iframe src=x></iframe><a href="javascript:alert(1)">x</a>' +
        ' https://ok.test #tag',
    );
    const autorisees = ['A', 'SPAN', 'BR'];
    expect(analyse.balises.every((balise) => autorisees.includes(balise))).toBe(
      true,
    );
    expect(analyse.attributsEvenement).toEqual([]);
    expect(
      analyse.liens.every((lien) => /^https?:\/\//i.test(lien)),
    ).toBe(true);
  });
});

describe('extractHashtags / hashtagFromClick', () => {
  it('extrait les hashtags en minuscules et sans doublon', () => {
    expect(extractHashtags('#Zoonose #zoonose #Grippe')).toEqual([
      'zoonose',
      'grippe',
    ]);
  });

  it('ne renvoie un tag que pour un élément .hashtag', () => {
    const span = document.createElement('span');
    span.className = 'hashtag';
    span.setAttribute('data-tag', 'zoonose');
    expect(hashtagFromClick({ target: span } as unknown as Event)).toBe('zoonose');

    const autre = document.createElement('div');
    expect(hashtagFromClick({ target: autre } as unknown as Event)).toBeNull();
  });
});
