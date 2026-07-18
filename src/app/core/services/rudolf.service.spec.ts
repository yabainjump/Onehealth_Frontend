import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TokenStorageService } from './token-storage.service';
import { RudolfService } from './rudolf.service';

describe('RudolfService', () => {
  let service: RudolfService;
  let http: HttpTestingController;
  let tokenStorage: TokenStorageService;

  beforeEach(() => {
    service = TestBed.inject(RudolfService);
    http = TestBed.inject(HttpTestingController);
    tokenStorage = TestBed.inject(TokenStorageService);
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

  it('parses progressive NDJSON fragments from the streaming endpoint', async () => {
    spyOn(tokenStorage, 'getToken').and.resolveTo('test-token');
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode('{"type":"delta","content":"Bonjour "}\n'),
        );
        controller.enqueue(
          encoder.encode(
            '{"type":"done","message":{"role":"assistant","content":"Bonjour One Health","createdAt":"2026-01-01T00:00:00.000Z"}}\n',
          ),
        );
        controller.close();
      },
    });
    const fetchSpy = spyOn(window, 'fetch').and.resolveTo(
      new Response(stream, {
        status: 200,
        headers: { 'Content-Type': 'application/x-ndjson' },
      }),
    );
    const deltas: string[] = [];

    const result = await service.streamMessage(
      '507f1f77bcf86cd799439011',
      'Question',
      (delta) => deltas.push(delta),
    );

    expect(deltas).toEqual(['Bonjour ']);
    expect(result.message.content).toBe('Bonjour One Health');
    const request = fetchSpy.calls.mostRecent().args;
    expect(request[0]).toContain('/rudolf/conversations/');
    expect((request[1]?.headers as Record<string, string>).Authorization).toBe(
      'Bearer test-token',
    );
  });
});
