import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { TestSupportModule } from 'src/testing/test-support.module';
import { ImageFallbackDirective } from 'src/app/shared/directives/image-fallback.directive';

import { DashbordPage } from './dashbord.page';

describe('DashbordPage', () => {
  let component: DashbordPage;
  let fixture: ComponentFixture<DashbordPage>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [DashbordPage],
      imports: [
        IonicModule.forRoot(),
        TestSupportModule,
        ImageFallbackDirective,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashbordPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
