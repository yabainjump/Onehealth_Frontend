import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RudolfService } from './rudolf.service';

describe('RudolfService', () => {
  let service: RudolfService;
  let http: HttpTestingController;

  beforeEach(() => {
    service = TestBed.inject(RudolfService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends only the new user message to the backend', () => {
    service.sendMessage('Comment prévenir les zoonoses ?').subscribe();

    const request = http.expectOne((candidate) =>
      candidate.url.endsWith('/rudolf/messages'),
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      message: 'Comment prévenir les zoonoses ?',
    });
    request.flush({
      message: {
        role: 'assistant',
        content: 'Réponse',
        createdAt: new Date().toISOString(),
      },
    });
  });
});
