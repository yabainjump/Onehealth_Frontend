import { resolveMediaUrl } from './media-url.util';

describe('resolveMediaUrl', () => {
  it('converts a legacy gs URI to a browser-compatible Firebase URL', () => {
    expect(
      resolveMediaUrl('gs://one-health.appspot.com/profile/user 1.png'),
    ).toBe(
      'https://firebasestorage.googleapis.com/v0/b/one-health.appspot.com/o/profile%2Fuser%201.png?alt=media',
    );
  });

  it('keeps an existing Firebase download URL unchanged', () => {
    const url =
      'https://firebasestorage.googleapis.com/v0/b/one-health.appspot.com/o/profile%2Fuser.png?alt=media&token=test';
    expect(resolveMediaUrl(url)).toBe(url);
  });
});
