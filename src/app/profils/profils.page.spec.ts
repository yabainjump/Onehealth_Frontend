import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { TestSupportModule } from 'src/testing/test-support.module';

import { ProfilsPage } from './profils.page';

describe('ProfilsPage', () => {
  let component: ProfilsPage;
  let fixture: ComponentFixture<ProfilsPage>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ProfilsPage ],
      imports: [IonicModule.forRoot(), TestSupportModule]
    }).compileComponents();

    fixture = TestBed.createComponent(ProfilsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
