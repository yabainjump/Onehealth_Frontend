import { fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { ForegroundPoller } from './foreground-poller';

describe('ForegroundPoller', () => {
  beforeEach(() => {
    spyOnProperty(document, 'hidden', 'get').and.returnValue(false);
    spyOnProperty(navigator, 'onLine', 'get').and.returnValue(true);
  });

  it('never overlaps slow requests and stops after the owner leaves', fakeAsync(() => {
    let finish!: () => void;
    const task = jasmine.createSpy().and.callFake(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const poller = new ForegroundPoller(task, 4_000);
    poller.start();
    tick(20_000);
    expect(task).toHaveBeenCalledTimes(1);
    finish();
    flushMicrotasks();
    tick(4_000);
    expect(task).toHaveBeenCalledTimes(2);
    poller.stop();
    finish();
    flushMicrotasks();
    tick(20_000);
    expect(task).toHaveBeenCalledTimes(2);
  }));

  it('pauses hidden/offline tabs and refreshes on return', fakeAsync(() => {
    const hidden = Object.getOwnPropertyDescriptor(document, 'hidden')!
      .get as jasmine.Spy;
    const online = Object.getOwnPropertyDescriptor(navigator, 'onLine')!
      .get as jasmine.Spy;
    const task = jasmine.createSpy().and.resolveTo();
    const poller = new ForegroundPoller(task, 4_000);
    hidden.and.returnValue(true);
    poller.start();
    tick(8_000);
    expect(task).not.toHaveBeenCalled();
    hidden.and.returnValue(false);
    online.and.returnValue(false);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(task).not.toHaveBeenCalled();
    online.and.returnValue(true);
    window.dispatchEvent(new Event('online'));
    flushMicrotasks();
    expect(task).toHaveBeenCalledTimes(1);
    poller.stop();
  }));
});
