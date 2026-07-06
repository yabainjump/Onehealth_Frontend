import { ShareLinkService } from './share-link.service';

describe('ShareLinkService', () => {
  const service = new ShareLinkService();
  it('builds a versioned public link for a post', () => {
    expect(service.buildPostShareUrl('abc123')).toBe(
      'https://onehealthnetwork.yaba-in.com/post-detail?id=abc123&v=3',
    );
  });

  it('builds a versioned public link for a profile', () => {
    expect(service.buildProfileShareUrl('user123')).toBe(
      'https://onehealthnetwork.yaba-in.com/profils/user123?v=3',
    );
  });
});
