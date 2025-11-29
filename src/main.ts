import { createApp } from 'vue';
import WeatherWidgetComponent from './components/WeatherWidget.vue';
import './styles/main.scss';

class WeatherWidgetElement extends HTMLElement {
  private app: any = null;

  connectedCallback() {
    const apiKey = this.getAttribute('api-key') || '5dfd0744e791c79f9bea358d2a4a4236';
    const cities = this.getAttribute('cities') || 'London';
    const autoRefresh = parseInt(this.getAttribute('auto-refresh') || '300000');

    const parsedCities = cities.split(',').map(city => city.trim()).filter(city => city.length > 0);

    this.app = createApp(WeatherWidgetComponent, {
      apiKey,
      cities: parsedCities,
      autoRefresh
    });

    this.app.mount(this);
  }

  disconnectedCallback() {
    if (this.app) {
      this.app.unmount();
      this.app = null;
    }
  }
}

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  customElements.define('weather-widget', WeatherWidgetElement);
}

export default WeatherWidgetElement;