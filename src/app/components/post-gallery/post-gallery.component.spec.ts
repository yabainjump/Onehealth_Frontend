import { PostGalleryComponent } from './post-gallery.component';

describe('PostGalleryComponent', () => {
  let component: PostGalleryComponent;
  let image: HTMLImageElement;

  beforeEach(() => {
    component = new PostGalleryComponent();
    image = document.createElement('img');
    image.setAttribute('src', 'https://api.example.test/api/media/thumb?id=1');
  });

  it('falls back once from the thumbnail to the original image', () => {
    const original = 'https://api.example.test/uploads/post/image.webp';

    component.onImgError({ target: image } as unknown as Event, original);

    expect(image.src).toBe(original);
    expect(image.dataset['fallbackApplied']).toBe('true');
    expect(image.classList.contains('is-unavailable')).toBeFalse();
  });

  it('marks the tile unavailable when the original also fails', () => {
    const original = 'https://api.example.test/uploads/post/image.webp';
    component.onImgError({ target: image } as unknown as Event, original);

    component.onImgError({ target: image } as unknown as Event, original);

    expect(image.classList.contains('is-unavailable')).toBeTrue();
  });

  it('does not retry forever when thumbnail and original are identical', () => {
    const original = image.getAttribute('src') || '';

    component.onImgError({ target: image } as unknown as Event, original);

    expect(image.classList.contains('is-unavailable')).toBeTrue();
  });
});
