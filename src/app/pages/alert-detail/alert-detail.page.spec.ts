import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute, Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, of, throwError } from 'rxjs';

import {
  AlertsService,
  HealthAlert,
} from '../../core/services/alerts.service';
import { InteractionGuardService } from '../../core/services/interaction-guard.service';
import { AuthService } from '../../services/auth/auth.service';
import { PublishService } from '../../services/publish/publish.service';
import { AlertDetailPage } from './alert-detail.page';

describe('AlertDetailPage', () => {
  let routeParams$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let alertsService: jasmine.SpyObj<AlertsService>;

  const makeAlert = (id: string): HealthAlert => ({
    id,
    category: 'animal',
    title: `Alerte ${id}`,
    description: 'Description',
    country: 'Cameroun',
    city: 'Yaoundé',
    lat: null,
    lng: null,
    severity: 'medium',
    verificationStatus: 'pending',
    reviewedAt: null,
    imageUrls: [],
    author: null,
    likesCount: 0,
    userHasLiked: false,
    commentsCount: 0,
    comments: [],
    createdAt: '2026-07-25T10:00:00.000Z',
  });

  beforeEach(() => {
    routeParams$ = new BehaviorSubject(convertToParamMap({ id: 'alert-1' }));
    alertsService = jasmine.createSpyObj<AlertsService>('AlertsService', [
      'getById',
    ]);

    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { paramMap: routeParams$.asObservable() },
        },
        {
          provide: Router,
          useValue: jasmine.createSpyObj<Router>('Router', ['navigate']),
        },
        { provide: AlertsService, useValue: alertsService },
        {
          provide: AuthService,
          useValue: {
            getCurrentUserSync: () => null,
            getAuthState: () => of(null),
          },
        },
        {
          provide: InteractionGuardService,
          useValue: jasmine.createSpyObj<InteractionGuardService>(
            'InteractionGuardService',
            ['requireAuth'],
          ),
        },
        {
          provide: PublishService,
          useValue: jasmine.createSpyObj<PublishService>('PublishService', [
            'uploadImage',
          ]),
        },
        {
          provide: ToastController,
          useValue: jasmine.createSpyObj<ToastController>('ToastController', [
            'create',
          ]),
        },
        {
          provide: AlertController,
          useValue: jasmine.createSpyObj<AlertController>('AlertController', [
            'create',
          ]),
        },
      ],
    });
  });

  function createPage(): AlertDetailPage {
    return TestBed.runInInjectionContext(() => new AlertDetailPage());
  }

  it('loads the alert matching the current route id', fakeAsync(() => {
    alertsService.getById.and.returnValue(of(makeAlert('alert-1')));
    const page = createPage();

    page.ngOnInit();
    tick(301);

    expect(alertsService.getById).toHaveBeenCalledOnceWith('alert-1');
    expect(page.alert?.id).toBe('alert-1');
    expect(page.loading).toBeFalse();
    expect(page.loadError).toBeFalse();
  }));

  it('reloads the detail when Ionic reuses the page for another id', fakeAsync(() => {
    alertsService.getById.and.callFake((id) => of(makeAlert(id)));
    const page = createPage();
    page.ngOnInit();

    routeParams$.next(convertToParamMap({ id: 'alert-2' }));
    tick(301);

    expect(alertsService.getById.calls.allArgs()).toEqual([
      ['alert-1'],
      ['alert-2'],
    ]);
    expect(page.alert?.id).toBe('alert-2');
  }));

  it('shows a recoverable error and retries the request', fakeAsync(() => {
    alertsService.getById.and.returnValues(
      throwError(() => ({ status: 503 })),
      of(makeAlert('alert-1')),
    );
    const page = createPage();
    page.ngOnInit();

    expect(page.alert).toBeUndefined();
    expect(page.loading).toBeFalse();
    expect(page.loadError).toBeTrue();

    page.retryLoad();
    tick(301);

    expect(alertsService.getById).toHaveBeenCalledTimes(2);
    expect(page.alert?.id).toBe('alert-1');
    expect(page.loadError).toBeFalse();
  }));
});
