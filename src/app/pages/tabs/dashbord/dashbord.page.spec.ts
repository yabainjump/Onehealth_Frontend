import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { TestSupportModule } from 'src/testing/test-support.module';

import { DashbordPage } from './dashbord.page';

describe('DashbordPage', () => {
  let component: DashbordPage;
  let fixture: ComponentFixture<DashbordPage>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ DashbordPage ],
      imports: [IonicModule.forRoot(), TestSupportModule]
    }).compileComponents();

    fixture = TestBed.createComponent(DashbordPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
