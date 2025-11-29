import { createApp } from 'vue';
import WeatherWidgetComponent from './components/WeatherWidget.vue';
import './styles/main.scss';

class WeatherWidgetElement extends HTMLElement {
  private app: any = null;
  private widgetContainer: HTMLElement | null = null;

  connectedCallback() {
    const apiKey = this.getAttribute('api-key') || '5dfd0744e791c79f9bea358d2a4a4236';
    const citiesAttr = this.getAttribute('cities');
    const autoRefresh = parseInt(this.getAttribute('auto-refresh') || '300000');
    const position = this.getAttribute('position') || 'bottom-right';

    const parsedCities = citiesAttr ? 
      citiesAttr.split(',').map(city => city.trim()).filter(city => city.length > 0) : 
      null;

    const widgetContainer = document.createElement('div');
    widgetContainer.style.cssText = this.getPositionStyles(position);
    
    document.body.appendChild(widgetContainer);

    this.app = createApp(WeatherWidgetComponent, {
      apiKey,
      cities: parsedCities,
      autoRefresh
    });

    this.app.mount(widgetContainer);
    
    this.widgetContainer = widgetContainer;
  }

  getPositionStyles(position: string): string {
    const baseStyles = `
      position: fixed;
      z-index: 10000;
      pointer-events: auto;
    `;
    
    switch(position) {
      case 'top-left':
        return baseStyles + 'top: 20px; left: 20px;';
      case 'top-right':
        return baseStyles + 'top: 20px; right: 20px;';
      case 'top-center':
        return baseStyles + 'top: 20px; left: 50%; transform: translateX(-50%);';
      case 'bottom-left':
        return baseStyles + 'bottom: 20px; left: 20px;';
      case 'bottom-right':
        return baseStyles + 'bottom: 20px; right: 20px;';
      case 'bottom-center':
        return baseStyles + 'bottom: 20px; left: 50%; transform: translateX(-50%);';
      case 'left-middle':
        return baseStyles + 'left: 20px; top: 50%; transform: translateY(-50%);';
      case 'right-middle':
        return baseStyles + 'right: 20px; top: 50%; transform: translateY(-50%);';
      case 'center':
        return baseStyles + 'top: 50%; left: 50%; transform: translate(-50%, -50%);';
      default:
        return baseStyles + 'bottom: 20px; right: 20px;';
    }
  }

  disconnectedCallback() {
    if (this.app) {
      this.app.unmount();
      this.app = null;
    }
    if (this.widgetContainer) {
      document.body.removeChild(this.widgetContainer);
      this.widgetContainer = null;
    }
  }
}

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  customElements.define('weather-widget', WeatherWidgetElement);
}

export default WeatherWidgetElement;