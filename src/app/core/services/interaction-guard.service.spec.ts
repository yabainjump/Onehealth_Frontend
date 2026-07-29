import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular';

import { AuthPromptComponent } from '../../components/auth-prompt/auth-prompt.component';
import { AuthService } from '../../services/auth/auth.service';
import { InteractionGuardService } from './interaction-guard.service';

describe('InteractionGuardService', () => {
  let service: InteractionGuardService;
  let auth: jasmine.SpyObj<AuthService>;
  let modalController: jasmine.SpyObj<ModalController>;
  let router: jasmine.SpyObj<Router>;

  const prepareModal = (role: string | undefined) => {
    const modal = {
      present: jasmine.createSpy('present').and.resolveTo(),
      onDidDismiss: jasmine
        .createSpy('onDidDismiss')
        .and.resolveTo({ data: null, role }),
    };
    modalController.create.and.resolveTo(modal as never);
    return modal;
  };

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['isAuthenticated']);
    modalController = jasmine.createSpyObj<ModalController>('ModalController', ['create']);
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    router.navigateByUrl.and.resolveTo(true);

    TestBed.configureTestingModule({
      providers: [
        InteractionGuardService,
        { provide: AuthService, useValue: auth },
        { provide: ModalController, useValue: modalController },
        { provide: Router, useValue: router },
      ],
    });

    service = TestBed.inject(InteractionGuardService);
  });

  it('autorise directement un utilisateur connecté', async () => {
    auth.isAuthenticated.and.resolveTo(true);

    await expectAsync(service.requireAuth()).toBeResolvedTo(true);

    expect(modalController.create).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('redirige le choix connexion vers /login après la fermeture du popup', async () => {
    auth.isAuthenticated.and.resolveTo(false);
    const modal = prepareModal('login');

    await expectAsync(service.requireAuth()).toBeResolvedTo(false);

    expect(modalController.create).toHaveBeenCalledOnceWith({
      component: AuthPromptComponent,
      cssClass: 'auth-prompt-modal',
    });
    expect(modal.present).toHaveBeenCalled();
    expect(modal.onDidDismiss).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/login');
  });

  it('redirige le choix inscription vers /register', async () => {
    auth.isAuthenticated.and.resolveTo(false);
    prepareModal('register');

    await expectAsync(service.requireAuth()).toBeResolvedTo(false);

    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/register');
  });

  it('reste sur la page courante lorsque le popup est annulé', async () => {
    auth.isAuthenticated.and.resolveTo(false);
    prepareModal('cancel');

    await expectAsync(service.requireAuth()).toBeResolvedTo(false);

    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
