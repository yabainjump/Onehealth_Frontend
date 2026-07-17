import { isBackendApiRequest } from './auth.interceptor';

describe('isBackendApiRequest', () => {
  const apiBaseUrl = 'https://backend.example.com/api';

  it('accepts only the configured backend API', () => {
    expect(isBackendApiRequest(`${apiBaseUrl}/posts`, apiBaseUrl)).toBeTrue();
    expect(isBackendApiRequest(`${apiBaseUrl}/posts?page=1`, apiBaseUrl)).toBeTrue();
  });

  it('rejects external and lookalike URLs', () => {
    expect(isBackendApiRequest('https://api.groq.com/openai/v1', apiBaseUrl)).toBeFalse();
    expect(isBackendApiRequest('https://backend.example.com/api.evil/posts', apiBaseUrl)).toBeFalse();
    expect(isBackendApiRequest('/assets/i18n/fr.json', apiBaseUrl)).toBeFalse();
  });
});
