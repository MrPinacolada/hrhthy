import axios from 'axios';
import type { WeatherData, CityConfig, GeocodeResponse } from '../types/weather';

const API_KEY = '5dfd0744e791c79f9bea358d2a4a4236';
const WEATHER_URL = 'https://api.openweathermap.org/data/2.5/weather';
const GEO_URL = 'https://api.openweathermap.org/geo/1.0';

interface OpenWeatherResponse {
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
  };
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  wind?: {
    speed: number;
    deg?: number;
  };
  clouds?: {
    all: number;
  };
  visibility?: number;
  name: string;
  sys: {
    country: string;
    sunrise?: number;
    sunset?: number;
  };
}

export class WeatherService {
  private apiKey: string;

  constructor(apiKey: string = API_KEY) {
    this.apiKey = apiKey;
  }

  async getCurrentWeather(lat: number, lon: number): Promise<WeatherData> {
    const response = await axios.get<OpenWeatherResponse>(WEATHER_URL, {
      params: {
        lat,
        lon,
        appid: this.apiKey,
        units: 'metric'
      }
    });

    return this.formatWeatherData(response.data);
  }

  async searchCities(query: string): Promise<CityConfig[]> {
    const response = await axios.get<GeocodeResponse[]>(`${GEO_URL}/direct`, {
      params: {
        q: query,
        appid: this.apiKey,
        limit: 5
      }
    });

    return response.data.map((city) => ({
      id: `${city.lat}-${city.lon}`,
      name: city.name,
      lat: city.lat,
      lon: city.lon,
      country: city.country
    }));
  }

  getCurrentPosition(): Promise<{ lat: number; lon: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        },
        (error) => {
          reject(error);
        }
      );
    });
  }

  private async getCityName(lat: number, lon: number): Promise<{ city: string; country: string }> {
    try {
      const response = await axios.get(`${GEO_URL}/reverse`, {
        params: {
          lat,
          lon,
          appid: this.apiKey,
          limit: 1
        }
      });
      
      if (response.data && response.data.length > 0) {
        const location = response.data[0];
        return {
          city: location.name || 'Unknown',
          country: location.country || 'Unknown'
        };
      }
    } catch (error) {
      console.warn('Failed to get city name:', error);
    }
    
    return { city: 'Unknown', country: 'Unknown' };
  }

  private formatWeatherData(data: OpenWeatherResponse): WeatherData {
    return {
      city: data.name,
      country: data.sys.country,
      temperature: Math.round(data.main.temp),
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      feelsLike: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      windSpeed: Math.round((data.wind?.speed || 0) * 10) / 10,
      pressure: data.main.pressure,
      uvIndex: 0,
      visibility: Math.round((data.visibility || 0) / 1000),
      clouds: data.clouds?.all || 0,
      dewPoint: 0,
      sunrise: data.sys?.sunrise || 0,
      sunset: data.sys?.sunset || 0,
      timezone: ''
    };
  }
}