import './styles/main.scss';
declare class WeatherWidgetElement extends HTMLElement {
    private app;
    private widgetContainer;
    connectedCallback(): void;
    getPositionStyles(position: string): string;
    disconnectedCallback(): void;
}
export default WeatherWidgetElement;
