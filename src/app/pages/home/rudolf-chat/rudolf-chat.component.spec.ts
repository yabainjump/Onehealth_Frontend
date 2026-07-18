import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { of } from 'rxjs';
import {
  RudolfConversationSummary,
  RudolfService,
} from 'src/app/core/services/rudolf.service';
import { TestSupportModule } from 'src/testing/test-support.module';
import { RudolfChatComponent } from './rudolf-chat.component';

describe('RudolfChatComponent', () => {
  let component: RudolfChatComponent;
  let fixture: ComponentFixture<RudolfChatComponent>;
  let service: jasmine.SpyObj<RudolfService>;

  const conversation: RudolfConversationSummary = {
    id: '507f1f77bcf86cd799439011',
    title: 'Prévenir les zoonoses',
    preview: '',
    messageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    service = jasmine.createSpyObj<RudolfService>('RudolfService', [
      'listConversations',
      'createConversation',
      'getConversation',
      'deleteConversation',
      'streamMessage',
    ]);
    service.listConversations.and.returnValue(
      of({ configured: true, model: 'test', conversations: [] }),
    );
    service.createConversation.and.returnValue(
      of({
        configured: true,
        model: 'test',
        conversation,
        messages: [],
      }),
    );

    await TestBed.configureTestingModule({
      declarations: [RudolfChatComponent],
      imports: [IonicModule.forRoot(), TestSupportModule],
      providers: [{ provide: RudolfService, useValue: service }],
    }).compileComponents();

    fixture = TestBed.createComponent(RudolfChatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('shows a new empty conversation when there is no history', () => {
    expect(component).toBeTruthy();
    expect(service.listConversations).toHaveBeenCalled();
    expect(component.activeConversationId).toBeNull();
    expect(component.messages).toEqual([]);
  });

  it('renders streamed fragments before replacing them with the stored message', async () => {
    service.streamMessage.and.callFake(
      async (_conversationId, _message, onDelta) => {
        onDelta('Réponse ');
        expect(component.messages[component.messages.length - 1]?.content).toBe(
          'Réponse ',
        );
        onDelta('progressive');
        expect(component.messages[component.messages.length - 1]?.content).toBe(
          'Réponse progressive',
        );
        return {
          message: {
            role: 'assistant',
            content: 'Réponse progressive',
            createdAt: new Date().toISOString(),
          },
          conversation: {
            ...conversation,
            preview: 'Réponse progressive',
            messageCount: 2,
          },
        };
      },
    );

    component.input = 'Question One Health';
    await component.sendMessage();

    expect(service.createConversation).toHaveBeenCalled();
    expect(service.streamMessage).toHaveBeenCalled();
    expect(component.messages.map((message) => message.role)).toEqual([
      'user',
      'assistant',
    ]);
    expect(component.messages[1].content).toBe('Réponse progressive');
  });
});
