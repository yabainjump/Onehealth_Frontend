import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { TestSupportModule } from 'src/testing/test-support.module';

import { LoginPage } from './login.page';
import { AuthService } from 'src/app/services/auth/auth.service';

describe('LoginPage', () => {
  let component: LoginPage;
  let fixture: ComponentFixture<LoginPage>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ LoginPage ],
      imports: [IonicModule.forRoot(), TestSupportModule]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('submits credentials without writing the password to the console', () => {
    const auth = TestBed.inject(AuthService);
    const login = spyOn(auth, 'login').and.returnValue(
      new Promise(() => undefined),
    );
    const log = spyOn(console, 'log');
    component.form.setValue({
      email: 'test@example.invalid',
      password: 'test-password',
    });
    component.onSubmit();
    expect(login).toHaveBeenCalledWith('test@example.invalid', 'test-password');
    expect(log).not.toHaveBeenCalled();
  });
});
