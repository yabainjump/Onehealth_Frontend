import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { TestSupportModule } from 'src/testing/test-support.module';

import { EmptyScreenComponent } from './empty-screen.component';

describe('EmptyScreenComponent', () => {
  let component: EmptyScreenComponent;
  let fixture: ComponentFixture<EmptyScreenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EmptyScreenComponent ],
      imports: [IonicModule.forRoot(), TestSupportModule]
    }).compileComponents();

    fixture = TestBed.createComponent(EmptyScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
