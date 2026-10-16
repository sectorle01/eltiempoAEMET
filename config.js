"use strict";

window.APP_CONFIG = Object.freeze({
  version: "3.0.0-beta.1",
  map: {
    fallbackCenter: [42.55, -6.2],
    fallbackZoom: 9,
    maxFitZoom: 12,
    tileUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors"
  },
  data: {
    pointsUrl: "puntos.geojson",
    sectionsUrl: "tramos.geojson"
  },
  externalServices: {
    radar: "https://www.tiempo.com/mapas-meteorologicos/",
    models: "https://www.wetterzentrale.de/es/topkarten.php?map=18&model=gfs&var=4&time=1&run=12&lid=OP&h=0&mv=0&tr=1"
  },
  operationalThresholds: {
    enabled: false,
    note: "Pendientes de validación por los responsables de conservación"
  }
});
