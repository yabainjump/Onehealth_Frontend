import { Component, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AlertController, IonContent } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import {
  RudolfConversationSummary,
  RudolfMessage,
  RudolfService,
  RudolfStreamError,
} from 'src/app/core/services/rudolf.service';

@Component({
  selector: 'app-rudolf-chat',
  templateUrl: './rudolf-chat.component.html',
  styleUrls: ['./rudolf-chat.component.scss'],
  standalone: false,
})
export class RudolfChatComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContent', { static: false }) messagesContent?: IonContent;

  conversations: RudolfConversationSummary[] = [];
  messages: RudolfMessage[] = [];
  activeConversationId: string | null = null;
  input = '';
  configured = true;
  loading = true;
  sending = false;
  historyOpen = false;
  error = '';
  streamingMessageCreatedAt: string | null = null;

  private abortController: AbortController | null = null;
  private scrollQueued = false;
  private destroyed = false;

  constructor(
    private readonly rudolfService: RudolfService,
    private readonly translate: TranslateService,
    private readonly alertController: AlertController,
    private readonly zone: NgZone,
  ) {}

  ngOnInit(): void {
    void this.loadConversations();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.abortController?.abort();
  }

  get activeConversation(): RudolfConversationSummary | undefined {
    return this.conversations.find(
      (conversation) => conversation.id === this.activeConversationId,
    );
  }

  get activeTitle(): string {
    return (
      this.activeConversation?.title ||
      this.translate.instant('RUDOLF.NEW_CONVERSATION')
    );
  }

  async loadConversations(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      const result = await firstValueFrom(
        this.rudolfService.listConversations(),
      );
      this.configured = result.configured;
      this.conversations = result.conversations;
      if (this.conversations.length > 0) {
        await this.openConversation(this.conversations[0].id);
      } else {
        this.startNewConversation();
      }
    } catch {
      this.error = this.translate.instant('RUDOLF.LOAD_ERROR');
    } finally {
      this.loading = false;
    }
  }

  async openConversation(conversationId: string): Promise<void> {
    if (this.sending || conversationId === this.activeConversationId) {
      this.historyOpen = false;
      return;
    }

    this.loading = true;
    this.error = '';
    this.activeConversationId = conversationId;
    this.historyOpen = false;
    try {
      const result = await firstValueFrom(
        this.rudolfService.getConversation(conversationId),
      );
      this.configured = result.configured;
      this.messages = result.messages;
      if (result.conversation) this.upsertConversation(result.conversation);
      this.queueScroll();
    } catch {
      this.error = this.translate.instant('RUDOLF.LOAD_ERROR');
    } finally {
      this.loading = false;
    }
  }

  startNewConversation(): void {
    if (this.sending) return;
    this.activeConversationId = null;
    this.messages = [];
    this.input = '';
    this.error = '';
    this.streamingMessageCreatedAt = null;
    this.historyOpen = false;
    this.loading = false;
  }

  async sendMessage(): Promise<void> {
    const question = this.input.trim();
    if (!question || this.sending || !this.configured) return;

    const previousMessages = [...this.messages];
    this.sending = true;
    this.error = '';
    this.input = '';

    try {
      if (!this.activeConversationId) {
        const created = await firstValueFrom(
          this.rudolfService.createConversation(),
        );
        if (!created.conversation) throw new Error('Missing conversation');
        this.activeConversationId = created.conversation.id;
        this.upsertConversation(created.conversation);
      }

      const userMessage: RudolfMessage = {
        role: 'user',
        content: question,
        createdAt: new Date().toISOString(),
      };
      const assistantMessage: RudolfMessage = {
        role: 'assistant',
        content: '',
        createdAt: new Date(Date.now() + 1).toISOString(),
      };
      this.streamingMessageCreatedAt = assistantMessage.createdAt;
      this.messages = [...this.messages, userMessage, assistantMessage];
      this.queueScroll();

      this.abortController = new AbortController();
      const result = await this.rudolfService.streamMessage(
        this.activeConversationId,
        question,
        (delta) => {
          this.zone.run(() => {
            const index = this.messages.findIndex(
              (message) => message.createdAt === this.streamingMessageCreatedAt,
            );
            if (index < 0) return;
            const updated = {
              ...this.messages[index],
              content: this.messages[index].content + delta,
            };
            this.messages = [
              ...this.messages.slice(0, index),
              updated,
              ...this.messages.slice(index + 1),
            ];
            this.queueScroll();
          });
        },
        this.abortController.signal,
      );

      const streamedIndex = this.messages.findIndex(
        (message) => message.createdAt === this.streamingMessageCreatedAt,
      );
      if (streamedIndex >= 0) {
        this.messages = [
          ...this.messages.slice(0, streamedIndex),
          result.message,
          ...this.messages.slice(streamedIndex + 1),
        ];
      }
      if (result.conversation) this.upsertConversation(result.conversation);
    } catch (error: unknown) {
      if (!this.destroyed) {
        this.messages = previousMessages;
        this.input = question;
        this.error = this.translate.instant(this.errorKey(error));
      }
    } finally {
      this.abortController = null;
      this.streamingMessageCreatedAt = null;
      this.sending = false;
      this.queueScroll();
    }
  }

  useSuggestion(key: string): void {
    this.input = this.translate.instant(key);
    void this.sendMessage();
  }

  toggleHistory(): void {
    this.historyOpen = !this.historyOpen;
  }

  async confirmDelete(
    event: Event,
    conversation: RudolfConversationSummary,
  ): Promise<void> {
    event.stopPropagation();
    if (this.sending) return;

    const alert = await this.alertController.create({
      header: this.translate.instant('RUDOLF.DELETE_TITLE'),
      message: this.translate.instant('RUDOLF.DELETE_TEXT'),
      buttons: [
        {
          text: this.translate.instant('RUDOLF.CANCEL'),
          role: 'cancel',
        },
        {
          text: this.translate.instant('RUDOLF.DELETE_CONFIRM'),
          role: 'destructive',
          handler: () => void this.deleteConversation(conversation.id),
        },
      ],
    });
    await alert.present();
  }

  formatDate(value: string): string {
    const date = new Date(value);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString(this.translate.currentLang || 'fr', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return date.toLocaleDateString(this.translate.currentLang || 'fr', {
      day: '2-digit',
      month: 'short',
    });
  }

  trackConversation(_index: number, item: RudolfConversationSummary): string {
    return item.id;
  }

  trackMessage(index: number, item: RudolfMessage): string {
    return `${item.createdAt}-${item.role}-${index}`;
  }

  private async deleteConversation(conversationId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.rudolfService.deleteConversation(conversationId),
      );
      this.conversations = this.conversations.filter(
        (conversation) => conversation.id !== conversationId,
      );
      if (this.activeConversationId === conversationId) {
        this.startNewConversation();
      }
    } catch {
      this.error = this.translate.instant('RUDOLF.DELETE_ERROR');
    }
  }

  private upsertConversation(summary: RudolfConversationSummary): void {
    this.conversations = [
      summary,
      ...this.conversations.filter(
        (conversation) => conversation.id !== summary.id,
      ),
    ];
  }

  private errorKey(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 409) {
      return 'RUDOLF.CONVERSATION_LIMIT';
    }
    if (error instanceof RudolfStreamError) {
      if (error.code === 'rate_limit') return 'RUDOLF.LIMIT_ERROR';
      if (error.code === 'conversation_limit') {
        return 'RUDOLF.CONVERSATION_LIMIT';
      }
      if (error.code === 'timeout') return 'RUDOLF.TIMEOUT_ERROR';
      if (error.code === 'not_found') return 'RUDOLF.NOT_FOUND_ERROR';
    }
    return 'RUDOLF.SEND_ERROR';
  }

  private queueScroll(): void {
    if (this.scrollQueued) return;
    this.scrollQueued = true;
    requestAnimationFrame(() => {
      this.scrollQueued = false;
      void this.messagesContent?.scrollToBottom(0);
    });
  }
}
