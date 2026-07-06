import { environment } from 'src/environments/environment';
import { ShareLinkService } from './share-link.service';

describe('ShareLinkService', () => {
  const service = new ShareLinkService();
  const apiBase = environment.apiBaseUrl.replace(/\/+$/, '');

  it('builds a backend share page for a post', () => {
    expect(service.buildPostShareUrl('abc123')).toBe(
      `${apiBase}/share/post/abc123`,
    );
  });

  it('builds a backend share page for a profile', () => {
    expect(service.buildProfileShareUrl('user123')).toBe(
      `${apiBase}/share/profile/user123`,
    );
  });
});
