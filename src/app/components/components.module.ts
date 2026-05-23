import { EmptyScreenComponent } from './empty-screen/empty-screen.component';
import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatBoxComponent } from './chat-box/chat-box.component';



@NgModule({
  declarations: [
    EmptyScreenComponent,
    ChatBoxComponent
  ],
  imports: [
    CommonModule,
    IonicModule
  ],
  exports: [EmptyScreenComponent, ChatBoxComponent]
})
export class ComponentsModule { }
