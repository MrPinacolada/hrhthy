import type { CityConfig } from '../types/weather';
export declare class StorageService {
    static saveCities(cities: CityConfig[]): void;
    static getCities(): CityConfig[];
    static clearStorage(): void;
}
