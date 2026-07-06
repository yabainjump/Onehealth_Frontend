import { ShareLinkService } from './share-link.service';

describe('ShareLinkService', () => {
  const service = new ShareLinkService();
  it('builds a versioned public link for a post', () => {
    expect(service.buildPostShareUrl('abc123')).toBe(
      'https://onehealthnetwork.yaba-in.com/posts/abc123?v=5',
    );
  });

  it('builds a versioned public link for a profile', () => {
    expect(service.buildProfileShareUrl('user123')).toBe(
      'https://onehealthnetwork.yaba-in.com/profils/user123?v=5',
    );
  });
});
