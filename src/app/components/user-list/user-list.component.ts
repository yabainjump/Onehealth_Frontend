import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss'],
  
  standalone: false,
})
export class UserListComponent {

  @Input() item: any;
  @Output() selected: EventEmitter<any> = new EventEmitter();

  redirect() {
    this.selected.emit(this.item);
  }

}
