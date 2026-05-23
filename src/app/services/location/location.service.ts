import { Injectable } from '@angular/core';
import { City, Country } from 'country-state-city';

export interface LocationCountry {
  id: string;
  name: string;
  flag: string;
  phoneCode: string;
  dialCode: string;
}

export interface LocationCity {
  id: string;
  name: string;
}

@Injectable({
  providedIn: 'root',
})
export class LocationService {
  private readonly countriesCache: LocationCountry[];
  private readonly cityCache = new Map<string, LocationCity[]>();

  constructor() {
    this.countriesCache = this.buildCountries();
  }

  country(): LocationCountry[] {
    return this.countriesCache;
  }

  city(countryId?: string): LocationCity[] {
    const countryCode = (countryId || '').toUpperCase().trim();

    if (!countryCode) {
      return [];
    }

    const cachedCities = this.cityCache.get(countryCode);
    if (cachedCities) {
      return cachedCities;
    }

    const rawCities = City.getCitiesOfCountry(countryCode) || [];
    const uniqueCities = new Map<string, LocationCity>();

    for (const city of rawCities) {
      const cityName = (city?.name || '').trim();
      if (!cityName) {
        continue;
      }

      const cityKey = cityName.toLocaleLowerCase('fr');
      if (!uniqueCities.has(cityKey)) {
        uniqueCities.set(cityKey, {
          id: countryCode,
          name: cityName,
        });
      }
    }

    const normalizedCities = Array.from(uniqueCities.values()).sort((a, b) =>
      a.name.localeCompare(b.name, 'fr'),
    );

    this.cityCache.set(countryCode, normalizedCities);
    return normalizedCities;
  }

  private buildCountries(): LocationCountry[] {
    return (Country.getAllCountries() || [])
      .map((country) => ({
        id: country.isoCode,
        name: country.name,
        flag: country.flag || this.toFlagEmoji(country.isoCode),
        phoneCode: (country.phonecode || '').toString().trim(),
        dialCode: this.toDialCode((country.phonecode || '').toString().trim()),
      }))
      .filter((country) => !!country.id && !!country.name)
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }

  private toDialCode(phoneCode: string): string {
    const trimmed = (phoneCode || '').trim();
    if (!trimmed) {
      return '';
    }
    return trimmed.startsWith('+') ? trimmed : `+${trimmed}`;
  }

  private toFlagEmoji(isoCode: string): string {
    const countryCode = (isoCode || '').trim().toUpperCase();
    if (countryCode.length !== 2) {
      return '';
    }
    return countryCode
      .split('')
      .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
      .join('');
  }
}
