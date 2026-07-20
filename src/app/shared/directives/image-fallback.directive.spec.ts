import { ImageFallbackDirective } from './image-fallback.directive';

describe('ImageFallbackDirective', () => {
  it('replaces an unavailable remote image with the local profile image', () => {
    const directive = new ImageFallbackDirective();
    const image = document.createElement('img');
    image.src = 'https://firebasestorage.googleapis.com/missing.png';

    directive.onImageError({ target: image } as unknown as Event);

    expect(image.getAttribute('src')).toBe('assets/default-profile.png');
  });
});
