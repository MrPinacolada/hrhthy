import type { WeatherData, CityConfig } from '../types/weather';
export declare class WeatherService {
    private apiKey;
    constructor(apiKey?: string);
    getCurrentWeather(lat: number, lon: number): Promise<WeatherData>;
    searchCities(query: string): Promise<CityConfig[]>;
    getCurrentPosition(): Promise<{
        lat: number;
        lon: number;
    }>;
    private getCityName;
    private formatWeatherData;
}
