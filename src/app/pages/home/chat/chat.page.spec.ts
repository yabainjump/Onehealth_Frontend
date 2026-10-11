import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { TestSupportModule } from 'src/testing/test-support.module';

import { ChatPage } from './chat.page';

describe('ChatPage', () => {
  let component: ChatPage;
  let fixture: ComponentFixture<ChatPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ChatPage],
      imports: [IonicModule.forRoot(), TestSupportModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatPage);
    component = fixture.componentInstance;
    spyOn(component, 'scrollToBottom');
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('sends on Enter and preserves Shift+Enter for a new line', () => {
    const send = spyOn(component, 'sendMessage').and.resolveTo();
    const enter = {
      key: 'Enter',
      shiftKey: false,
      isComposing: false,
      repeat: false,
      preventDefault: jasmine.createSpy('preventDefault'),
    } as unknown as KeyboardEvent;
    const shiftEnter = {
      ...enter,
      shiftKey: true,
      preventDefault: jasmine.createSpy('preventDefaultShiftEnter'),
    } as unknown as KeyboardEvent;

    component.onComposerKeydown(enter);
    component.onComposerKeydown(shiftEnter);

    expect(enter.preventDefault).toHaveBeenCalledTimes(1);
    expect(shiftEnter.preventDefault).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('does not send Enter while an input method is composing text', () => {
    const send = spyOn(component, 'sendMessage').and.resolveTo();
    const event = {
      key: 'Enter',
      shiftKey: false,
      isComposing: true,
      repeat: false,
      preventDefault: jasmine.createSpy('preventDefault'),
    } as unknown as KeyboardEvent;

    component.onComposerKeydown(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
});
