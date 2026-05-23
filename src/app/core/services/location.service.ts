import { Injectable } from '@angular/core';
import {
  LocationCity,
  LocationCountry,
  LocationService as LegacyLocationService,
} from '../../services/location/location.service';

@Injectable({ providedIn: 'root' })
export class LocationService {
  constructor(private readonly legacyLocationService: LegacyLocationService) {}

  country(): LocationCountry[] {
    return this.legacyLocationService.country();
  }

  city(countryId?: string): LocationCity[] {
    return this.legacyLocationService.city(countryId);
  }
}
