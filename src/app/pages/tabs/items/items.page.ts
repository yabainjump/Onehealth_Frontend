import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular';
import { take } from 'rxjs';
import { ApiService } from 'src/app/services/api/api.service';

@Component({
  selector: 'app-items',
  templateUrl: './items.page.html',
  styleUrls: ['./items.page.scss'],
  
  standalone: false,
})
export class ItemsPage implements OnInit {

  item: any;

  constructor(
    public navCtrl: NavController,
    private route: ActivatedRoute,
    private apiService: ApiService
  ) { }

  ngOnInit() {
    this.route.paramMap.pipe(take(1)).subscribe(paramMap => {
      console.log(paramMap);
      if(!paramMap.has('id')) {
        this.navCtrl.back();
        return;
      }
      const id = paramMap.get('id');
      console.log(id);
      this.item = this.apiService.getItem(id);
      console.log(this.item);
    })
  }

}
