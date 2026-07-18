import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { TestSupportModule } from 'src/testing/test-support.module';
import { AuthService } from '../services/auth/auth.service';

import { ProfilsPage } from './profils.page';

describe('ProfilsPage', () => {
  let component: ProfilsPage;
  let fixture: ComponentFixture<ProfilsPage>;
  let authService: AuthService;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ProfilsPage],
      imports: [IonicModule.forRoot(), TestSupportModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfilsPage);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('hides the admin action while an admin views another profile', () => {
    spyOn(authService, 'getCurrentUserSync').and.returnValue({
      uid: 'admin-user',
      role: 'admin',
    });
    component.currentUserId = 'admin-user';
    component.userId = 'other-user';

    fixture.detectChanges();

    expect(component.canAccessAdminDashboard).toBeFalse();
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="admin-dashboard-action"]',
      ),
    ).toBeNull();
  });

  it('shows the admin action only on the admin own profile', () => {
    spyOn(authService, 'getCurrentUserSync').and.returnValue({
      uid: 'admin-user',
      role: 'admin',
    });
    component.currentUserId = 'admin-user';
    component.userId = 'admin-user';

    fixture.detectChanges();

    expect(component.canAccessAdminDashboard).toBeTrue();
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="admin-dashboard-action"]',
      ),
    ).not.toBeNull();
  });
});
