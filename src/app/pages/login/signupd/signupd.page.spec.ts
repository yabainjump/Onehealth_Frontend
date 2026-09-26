import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { TestSupportModule } from 'src/testing/test-support.module';

import { SignupdPage } from './signupd.page';
import { AuthService } from 'src/app/services/auth/auth.service';

describe('SignupdPage', () => {
  let component: SignupdPage;
  let fixture: ComponentFixture<SignupdPage>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ SignupdPage ],
      imports: [IonicModule.forRoot(), TestSupportModule]
    }).compileComponents();

    fixture = TestBed.createComponent(SignupdPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('submits registration without logging its password', () => {
    const auth = TestBed.inject(AuthService);
    const register = spyOn(auth, 'register').and.returnValue(
      new Promise(() => undefined),
    );
    const log = spyOn(console, 'log');
    component.signupForm.setValue({
      username: 'Test',
      email: 'test@example.invalid',
      password: 'test-password',
    });
    component.onSubmit();
    expect(register).toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });
});
