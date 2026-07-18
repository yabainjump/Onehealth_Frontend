import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AlertsService } from './alerts.service';

describe('AlertsService', () => {
  let service: AlertsService;
  let http: HttpTestingController;

  beforeEach(() => {
    service = TestBed.inject(AlertsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends category and verification filters when listing alerts', () => {
    service
      .list({ category: 'animal', verificationStatus: 'verified', limit: 25 })
      .subscribe();

    const request = http.expectOne(
      (candidate) =>
        candidate.url.includes(
          '/alerts?category=animal&verificationStatus=verified&limit=25',
        ) && candidate.params.has('_'),
    );
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('sends the verification filter for nearby alerts', () => {
    service.near(3.8, 11.5, 200, 'human', 'pending').subscribe();

    const request = http.expectOne(
      (candidate) =>
        candidate.url.includes('/alerts/near?') &&
        candidate.url.includes('verificationStatus=pending') &&
        candidate.params.has('_'),
    );
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });
});
