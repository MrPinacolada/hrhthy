<template>
  <div class="weather-widget">
    <div class="weather-widget__header">
      <h3 class="weather-widget__title">Weather</h3>
      <button class="weather-widget__settings-btn" @click="toggleSettings" :class="{ 'weather-widget__settings-btn--active': state.isSettingsOpen }">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.82,11.69,4.82,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
        </svg>
      </button>
    </div>

    <div v-if="!state.isSettingsOpen" class="weather-widget__content">
      <div v-if="state.isLoading" class="weather-widget__loading">Loading...</div>
      <div v-else-if="error" class="weather-widget__error">{{ error }}</div>
      <div v-else-if="state.cities.length === 0" class="weather-widget__no-data">
        No cities configured. Click the gear icon to add cities.
      </div>
      <div v-else class="weather-widget__cards">
        <div v-for="city in state.cities" :key="city.id" class="weather-card">
          <div v-if="state.currentWeather[city.id]">
            <div class="weather-card__location">
              <span class="weather-card__city">{{ state.currentWeather[city.id].city }}</span>
              <span class="weather-card__country">{{ state.currentWeather[city.id].country }}</span>
            </div>
            <div class="weather-card__info">
              <div class="weather-card__temperature">{{ state.currentWeather[city.id].temperature }}°C</div>
              <div class="weather-card__icon">
                <img :src="`https://openweathermap.org/img/w/${state.currentWeather[city.id].icon}.png`" 
                     :alt="state.currentWeather[city.id].description" />
              </div>
            </div>
            <div class="weather-card__description">{{ state.currentWeather[city.id].description }}</div>
            <div class="weather-card__details">
              <span>Feels like: {{ state.currentWeather[city.id].feelsLike }}°C</span>
              <span>Humidity: {{ state.currentWeather[city.id].humidity }}%</span>
              <span>Wind: {{ state.currentWeather[city.id].windSpeed }} m/s</span>
              <span>Pressure: {{ state.currentWeather[city.id].pressure }} hPa</span>
              <span>UV Index: {{ state.currentWeather[city.id].uvIndex }}</span>
              <span>Visibility: {{ state.currentWeather[city.id].visibility }} km</span>
            </div>
          </div>
          <div v-else class="weather-card__loading">Loading {{ city.name }}...</div>
        </div>
      </div>
    </div>

    <WeatherSettings 
      v-if="state.isSettingsOpen" 
      :cities="state.cities"
      @update-cities="updateCities"
      @close="state.isSettingsOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import WeatherSettings from './WeatherSettings.vue';
import { WeatherService } from '../services/weatherService';
import { StorageService } from '../services/storageService';
import type { WeatherData, CityConfig, WidgetState } from '../types/weather';

interface Props {
  apiKey?: string;
  cities?: string[] | null;
  autoRefresh?: number;
}

const props = withDefaults(defineProps<Props>(), {
  apiKey: '5dfd0744e791c79f9bea358d2a4a4236',
  cities: null,
  autoRefresh: 300000
});

const WEATHER_REFRESH_INTERVAL = props.autoRefresh;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 2000;

const state = reactive<WidgetState>({
  cities: [],
  currentWeather: {},
  isSettingsOpen: false,
  isLoading: false
});

const error = ref('');
const weatherService = new WeatherService(props.apiKey);
let refreshInterval: NodeJS.Timeout | null = null;
let retryCount = 0;

const hasValidData = computed(() => {
  return state.cities.length > 0 && Object.keys(state.currentWeather).length > 0;
});

const toggleSettings = async (): Promise<void> => {
  state.isSettingsOpen = !state.isSettingsOpen;
  if (state.isSettingsOpen) {
    await nextTick();
  }
};

const updateCities = async (newCities: CityConfig[]): Promise<void> => {
  state.cities = [...newCities];
  try {
    StorageService.saveCities(state.cities);
    await loadWeatherData();
  } catch (err) {
    console.error('Failed to update cities:', err);
    error.value = 'Failed to update cities configuration';
  }
};

const loadWeatherDataWithRetry = async (attempt: number = 1): Promise<void> => {
  try {
    await loadWeatherData();
    retryCount = 0;
  } catch (err) {
    if (attempt < MAX_RETRY_ATTEMPTS) {
      console.warn(`Weather data loading failed, attempt ${attempt}/${MAX_RETRY_ATTEMPTS}:`, err);
      setTimeout(() => loadWeatherDataWithRetry(attempt + 1), RETRY_DELAY * attempt);
    } else {
      throw err;
    }
  }
};

const loadWeatherData = async (): Promise<void> => {
  if (state.cities.length === 0) {
    state.currentWeather = {};
    return;
  }
  
  state.isLoading = true;
  error.value = '';
  const newWeatherData: Record<string, WeatherData> = {};

  try {
    const weatherPromises = state.cities.map(async (city): Promise<{ cityId: string; weather: WeatherData }> => {
      const weather = await weatherService.getCurrentWeather(city.lat, city.lon);
      return { cityId: city.id, weather };
    });
    
    const results = await Promise.allSettled(weatherPromises);
    
    let hasErrors = false;
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const { cityId, weather } = result.value;
        newWeatherData[cityId] = weather;
      } else {
        console.error(`Failed to load weather for city ${state.cities[index].name}:`, result.reason);
        hasErrors = true;
      }
    });
    
    state.currentWeather = newWeatherData;
    
    if (hasErrors && Object.keys(newWeatherData).length === 0) {
      throw new Error('Failed to load weather data for all cities');
    }
    
    if (hasErrors) {
      error.value = 'Some weather data could not be loaded';
    }
  } catch (err) {
    error.value = 'Failed to load weather data. Please check your connection.';
    console.error('Weather data loading error:', err);
    throw err;
  } finally {
    state.isLoading = false;
  }
};

const startAutoRefresh = (): void => {
  if (refreshInterval) clearInterval(refreshInterval);
  
  refreshInterval = setInterval(() => {
    if (!state.isLoading && hasValidData.value) {
      loadWeatherDataWithRetry();
    }
  }, WEATHER_REFRESH_INTERVAL);
};

const stopAutoRefresh = (): void => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
};

const initializeWidget = async (): Promise<void> => {
  try {
    const savedCities = StorageService.getCities();
    
    if (savedCities.length > 0) {
      state.cities = [...savedCities];
    } else if (props.cities && props.cities.length > 0) {
      const citiesConfig: CityConfig[] = props.cities.map((cityName, index) => ({
        id: `prop-${index}`,
        name: cityName,
        lat: 0,
        lon: 0,
        country: ''
      }));
      state.cities = citiesConfig;
      StorageService.saveCities(state.cities);
    } else {
      try {
        await initializeWithUserLocation();
        return;
      } catch (geoErr) {
        console.warn('Geolocation failed, using default city London');
        try {
          const londonCities = await weatherService.searchCities('London');
          if (londonCities.length > 0) {
            state.cities = [londonCities[0]];
          } else {
            const defaultCity: CityConfig = {
              id: 'default-london',
              name: 'London',
              lat: 51.5074,
              lon: -0.1278,
              country: 'GB'
            };
            state.cities = [defaultCity];
          }
          StorageService.saveCities(state.cities);
        } catch (searchErr) {
          console.error('Failed to search for default city:', searchErr);
          error.value = 'Failed to load default location';
        }
      }
    }
    
    await loadWeatherDataWithRetry();
    startAutoRefresh();
  } catch (err) {
    console.error('Widget initialization failed:', err);
  }
};

const initializeWithUserLocation = async (): Promise<void> => {
  try {
    const position = await weatherService.getCurrentPosition();
    const weather = await weatherService.getCurrentWeather(position.lat, position.lon);
    
    const userCity: CityConfig = {
      id: `${position.lat}-${position.lon}`,
      name: weather.city,
      lat: position.lat,
      lon: position.lon,
      country: weather.country
    };
    
    state.cities = [userCity];
    StorageService.saveCities(state.cities);
    await loadWeatherData();
  } catch (err) {
    console.warn('Could not get user location:', err);
    error.value = 'Please add cities manually using the settings.';
  }
};

onMounted(() => {
  initializeWidget();
});

onUnmounted(() => {
  stopAutoRefresh();
});
</script>

<style lang="scss">
@import '../styles/main.scss';
</style>