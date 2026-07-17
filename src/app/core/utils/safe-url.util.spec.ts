import { normalizeSafeHttpUrl } from './safe-url.util';

describe('normalizeSafeHttpUrl', () => {
  const baseUrl = 'https://onehealth.example.com';

  it('accepts HTTP(S) and local paths', () => {
    expect(normalizeSafeHttpUrl('https://example.com/file.pdf', baseUrl)).toBe(
      'https://example.com/file.pdf',
    );
    expect(normalizeSafeHttpUrl('/uploads/post/file.pdf', baseUrl)).toBe(
      'https://onehealth.example.com/uploads/post/file.pdf',
    );
  });

  it('rejects executable and malformed URLs', () => {
    expect(normalizeSafeHttpUrl('javascript:alert(1)', baseUrl)).toBeNull();
    expect(normalizeSafeHttpUrl('data:text/html,test', baseUrl)).toBeNull();
    expect(normalizeSafeHttpUrl('', baseUrl)).toBeNull();
  });
});
