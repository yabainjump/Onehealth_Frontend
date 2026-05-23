import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService as CoreApiService } from '../../core/services/api.service';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  items: any[] = [
    {
      id: 1,
      name: 'CHolera explain by Dr Takal ...',
      price: 700,
      category: 'Ndokotie',
      img: '../../../assets/images/giphy.gif',
      img1: '../../../assets/images/cholera1.webp',
      desc: 'Cholera health awareness content.',
    },
    {
      id: 2,
      name: 'Benefits of chilli',
      price: 500,
      category: 'Akwa',
      img: '../../../assets/images/duck.gif',
      img1: '../../../assets/images/piment.optimized.jpg',
      desc: 'Nutrition and prevention tips.',
    },
    {
      id: 3,
      name: 'Benefits of Sport',
      price: 400,
      category: 'Limbe',
      img: '../../../assets/images/football.gif',
      img1: '../../../assets/images/sport.jpg',
      desc: 'Physical activity recommendations.',
    },
  ];

  constructor(private readonly coreApi: CoreApiService) {}

  getItem(id: number | string) {
    return this.items.find((x) => x.id === Number(id));
  }

  get<T>(endpoint: string): Observable<T> {
    return this.coreApi.get<T>(endpoint);
  }

  post<T, B = unknown>(endpoint: string, body: B): Observable<T> {
    return this.coreApi.post<T, B>(endpoint, body);
  }
}
