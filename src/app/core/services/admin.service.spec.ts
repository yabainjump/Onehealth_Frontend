import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  let service: AdminService;
  let http: HttpTestingController;

  beforeEach(() => {
    service = TestBed.inject(AdminService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends the verification status when filtering moderated alerts', () => {
    void service.listAlerts('ebola', 2, 'pending');

    const request = http.expectOne((candidate) =>
      candidate.url.includes(
        '/admin/alerts?page=2&limit=20&search=ebola&verificationStatus=pending',
      ),
    );
    expect(request.request.method).toBe('GET');
    request.flush({ items: [], total: 0, page: 2, limit: 20 });
  });
});
