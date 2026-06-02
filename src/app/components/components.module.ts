import { EmptyScreenComponent } from './empty-screen/empty-screen.component';
import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatBoxComponent } from './chat-box/chat-box.component';
import { PostGalleryComponent } from './post-gallery/post-gallery.component';



@NgModule({
  declarations: [
    EmptyScreenComponent,
    ChatBoxComponent,
    PostGalleryComponent
  ],
  imports: [
    CommonModule,
    IonicModule
  ],
  exports: [EmptyScreenComponent, ChatBoxComponent, PostGalleryComponent]
})
export class ComponentsModule { }
