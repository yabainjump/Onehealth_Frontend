import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-chat-box',
  templateUrl: './chat-box.component.html',
  styleUrls: ['./chat-box.component.scss'],
  
  standalone: false,
})
export class ChatBoxComponent {

  @Input() chat: any;
  @Input() current_user_id: any;

}
