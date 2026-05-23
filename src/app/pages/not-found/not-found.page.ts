import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-not-found',
  templateUrl: './not-found.page.html',
  styleUrls: ['./not-found.page.scss'],
  standalone: false,
})
export class NotFoundPage {
  constructor(private readonly router: Router) {}

  goHome() {
    void this.router.navigateByUrl('/tabs/dashbord');
  }
}
