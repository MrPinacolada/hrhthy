import type { CityConfig } from '../types/weather';

const STORAGE_KEY = 'weather-widget-cities';

export class StorageService {
  static saveCities(cities: CityConfig[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cities));
  }

  static getCities(): CityConfig[] {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to parse stored cities:', error);
      return [];
    }
  }

  static clearStorage(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}