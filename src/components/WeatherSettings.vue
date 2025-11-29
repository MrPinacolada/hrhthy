<template>
  <div class="weather-settings">
    <div class="weather-settings__header">
      <h3 class="weather-settings__title">Weather Settings</h3>
      <button class="weather-settings__close-btn" @click="handleClose">>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
        </svg>
      </button>
    </div>

    <div class="weather-settings__cities">
      <h4 class="weather-settings__cities-title">Cities</h4>
      
      <div class="weather-settings__add-city">
        <div class="search-form">
          <input 
            v-model="searchQuery" 
            type="text" 
            class="search-form__input"
            placeholder="Search for a city..."
            :disabled="isSearching"
          />
          <div v-if="isSearching" class="search-form__loading">Searching...</div>
          <div v-else-if="searchError" class="search-form__error">{{ searchError }}</div>
          <div v-else-if="searchResults.length > 0" class="search-form__results">
            <div 
              v-for="city in searchResults" 
              :key="city.id"
              class="search-form__result"
              @click="addCity(city)"
            >
              {{ city.name }}, {{ city.country }}
            </div>
          </div>
        </div>
      </div>

      <div class="city-list">
        <draggable 
          v-model="cityList" 
          @end="updateCityOrder"
          item-key="id"
          handle=".city-item__drag-handle"
        >
          <template #item="{ element: city }">
            <div class="city-item">
              <div class="city-item__drag-handle">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3,15H21V13H3V15M3,19H21V17H3V19M3,11H21V9H3V11M3,5V7H21V5H3Z"/>
                </svg>
              </div>
              <div class="city-item__info">
                <span class="city-item__name">{{ city.name }}</span>
                <span class="city-item__details">{{ city.country }}</span>
              </div>
              <button class="city-item__remove-btn" @click="removeCity(city.id)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
                </svg>
              </button>
            </div>
          </template>
        </draggable>
        
        <div v-if="cityList.length === 0" class="city-list__empty">
          No cities added yet. Search and add cities above.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, watch, nextTick } from 'vue';
import draggable from 'vuedraggable';
import { WeatherService } from '../services/weatherService';
import type { CityConfig } from '../types/weather';

const SEARCH_DEBOUNCE_DELAY = 300;
const MIN_SEARCH_LENGTH = 2;
const MAX_SEARCH_RESULTS = 8;

interface Props {
  cities: CityConfig[];
}

interface Emits {
  close: [];
  updateCities: [cities: CityConfig[]];
}

const emit = defineEmits<Emits>();
const props = defineProps<Props>();

const searchQuery = ref('');
const searchResults = reactive<CityConfig[]>([]);
const cityList = ref<CityConfig[]>([]);
const isSearching = ref(false);
const searchError = ref('');

const weatherService = new WeatherService();
let searchTimeout: NodeJS.Timeout | null = null;

const clearSearchResults = (): void => {
  searchResults.splice(0, searchResults.length);
  searchError.value = '';
};

const clearSearchTimeout = (): void => {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
    searchTimeout = null;
  }
};

const searchCities = async (): Promise<void> => {
  clearSearchTimeout();
  
  const query = searchQuery.value.trim();
  
  if (!query || query.length < MIN_SEARCH_LENGTH) {
    clearSearchResults();
    isSearching.value = false;
    return;
  }

  isSearching.value = true;
  searchError.value = '';

  searchTimeout = setTimeout(async () => {
    try {
      const results = await weatherService.searchCities(query);
      const limitedResults = results.slice(0, MAX_SEARCH_RESULTS);
      
      clearSearchResults();
      searchResults.splice(0, 0, ...limitedResults);
      
      if (results.length === 0) {
        searchError.value = 'No cities found';
      }
    } catch (error) {
      console.error('City search error:', error);
      searchError.value = 'Search failed. Please try again.';
      clearSearchResults();
    } finally {
      isSearching.value = false;
    }
  }, SEARCH_DEBOUNCE_DELAY);
};

const addCity = async (city: CityConfig): Promise<void> => {
  const exists = cityList.value.some(c => c.id === city.id);
  if (exists) {
    searchError.value = 'City already added';
    return;
  }
  
  const newCity = { ...city };
  cityList.value = [...cityList.value, newCity];
  
  searchQuery.value = '';
  clearSearchResults();
  
  emit('updateCities', [...cityList.value]);
  
  await nextTick();
};

const removeCity = (cityId: string): void => {
  const filteredCities = cityList.value.filter(c => c.id !== cityId);
  cityList.value = filteredCities;
  emit('updateCities', [...cityList.value]);
};

const updateCityOrder = (): void => {
  emit('updateCities', [...cityList.value]);
};

const handleClose = (): void => {
  clearSearchTimeout();
  emit('close');
};

const syncCityList = (newCities: CityConfig[]): void => {
  cityList.value = [...newCities];
};

onMounted(() => {
  syncCityList(props.cities);
});

onUnmounted(() => {
  clearSearchTimeout();
});

watch(
  () => props.cities,
  (newCities) => {
    syncCityList(newCities);
  },
  { deep: true }
);

watch(
  searchQuery,
  () => {
    searchCities();
  }
);
</script>