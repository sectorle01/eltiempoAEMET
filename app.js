"use strict";

const CONFIG = window.APP_CONFIG;
const FAVORITES_KEY = "sector-le01:favorites";

const AEMET_SLUG_OVERRIDES = Object.freeze({
  "La Bañeza": "baneza-la",
  "Valderrey": "valderrey-estacion-de-valderrey",
  "Manzanal del Puerto": "villagaton-branuelas",
  "Combarros": "brazuelo",
  "La Torre del Valle": "torre-del-valle-la",
  "Covas": "rubia",
  "San Miguel de las Dueñas": "congosto"
});

const METEORED_OVERRIDES = Object.freeze({
  "la-torre-del-valle": "https://www.tiempo.com/torre-del-valle-la.htm",
  "pozuelo-del-paramo": "https://www.tiempo.com/pozuelo-del-paramo.htm",
  "valcavado-del-paramo": "https://www.tiempo.com/gn/3107055-xhoras.htm"
});

const state = {
  map: null,
  selected: null,
  features: new Map(),
  layers: new Map(),
  favorites: loadFavorites(),
  locationLayer: null
};

const byId = (id) => document.getElementById(id);

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n")
    .trim()
    .replace(/\s+/g, "-");
}

function buildAemetUrl(properties) {
  if (!properties?.nombre || !properties?.codmun) return "";
  const slug = AEMET_SLUG_OVERRIDES[properties.nombre] || slugify(properties.nombre);
  return `https://www.aemet.es/es/eltiempo/prediccion/municipios/horas/${slug}-id${properties.codmun}`;
}

function buildMeteoredUrl(properties) {
  if (!properties?.nombre) return "";
  const slug = slugify(properties.nombre);
  return METEORED_OVERRIDES[slug] || `https://www.tiempo.com/${slug}/por-horas`;
}

function openExternal(url) {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

function loadFavorites() {
  try {
    return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function saveFavorites() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...state.favorites]));
}

function labelFor(feature) {
  const properties = feature.properties || {};
  return properties.nombre || properties.carretera || feature.id || "Elemento sin nombre";
}

function searchableText(feature) {
  const p = feature.properties || {};
  return [p.nombre, p.carretera, p.pk, p.tipo, p.observaciones]
    .filter(Boolean)
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function makeMarkerAccessible(layer, feature) {
  layer.on("add", () => {
    const element = layer.getElement?.();
    if (!element) return;
    element.setAttribute("tabindex", "0");
    element.setAttribute("role", "button");
    element.setAttribute("aria-label", `Abrir ficha de ${labelFor(feature)}`);
    element.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectFeature(feature.id, true);
      }
    });
  });
}

function addPointFeature(feature, latlng) {
  const marker = L.circleMarker(latlng, {
    radius: 6,
    color: "#082f49",
    weight: 2,
    fillColor: "#38bdf8",
    fillOpacity: 0.85
  });
  marker.bindTooltip(labelFor(feature), { sticky: true });
  marker.on("click", () => selectFeature(feature.id, true));
  makeMarkerAccessible(marker, feature);
  state.layers.set(feature.id, marker);
  return marker;
}

function addSectionFeature(feature, layer) {
  layer.bindTooltip(labelFor(feature), { sticky: true });
  layer.on("click", () => selectFeature(feature.id, true));
  state.layers.set(feature.id, layer);
}

function factsFor(feature) {
  const p = feature.properties || {};
  const rows = [];
  if (p.carretera) rows.push(["Carretera", p.carretera]);
  if (p.pk !== null && p.pk !== undefined && p.pk !== "") rows.push(["PK", p.pk]);
  if (p.cota !== null && p.cota !== undefined && p.cota !== "") rows.push(["Cota", `${p.cota} m`]);
  if (p.codmun) rows.push(["Código municipal", p.codmun]);
  if (p.base) rows.push(["Base responsable", p.base]);
  if (p.exposicion) rows.push(["Exposición", p.exposicion]);
  if (p.observaciones) rows.push(["Observaciones", p.observaciones]);
  return rows;
}

function selectFeature(id, focusPanel = false) {
  const feature = state.features.get(id);
  if (!feature) return;
  state.selected = feature;

  byId("emptyState").hidden = true;
  byId("featureCard").hidden = false;
  byId("featureName").textContent = labelFor(feature);
  byId("featureType").textContent = feature.properties?.tipo || "Punto de referencia";

  const facts = byId("featureFacts");
  facts.replaceChildren();
  for (const [term, value] of factsFor(feature)) {
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = term;
    dd.textContent = value;
    facts.append(dt, dd);
  }
  if (!facts.children.length) {
    const message = document.createElement("p");
    message.className = "muted";
    message.textContent = "Sin atributos operativos verificados todavía.";
    facts.append(message);
  }

  updateFavoriteButton();
  byId("btnAemet").disabled = !buildAemetUrl(feature.properties);
  byId("btnMeteored").disabled = !buildMeteoredUrl(feature.properties);

  const layer = state.layers.get(id);
  if (layer?.getBounds) state.map.fitBounds(layer.getBounds(), { padding: [30, 30] });
  else if (layer?.getLatLng) state.map.panTo(layer.getLatLng());

  if (focusPanel) byId("panelDetalle").focus({ preventScroll: true });
}

function updateFavoriteButton() {
  const button = byId("btnFavorito");
  const selectedId = state.selected?.id;
  const isFavorite = selectedId && state.favorites.has(selectedId);
  button.textContent = isFavorite ? "★" : "☆";
  button.setAttribute("aria-pressed", String(Boolean(isFavorite)));
  button.title = isFavorite ? "Quitar de favoritos" : "Guardar como favorito";
}

function renderFavorites() {
  const container = byId("favoritesList");
  container.replaceChildren();
  const available = [...state.favorites]
    .map((id) => state.features.get(id))
    .filter(Boolean)
    .sort((a, b) => labelFor(a).localeCompare(labelFor(b), "es"));

  if (!available.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No hay favoritos guardados.";
    container.append(empty);
    return;
  }

  for (const feature of available) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "link-button";
    button.textContent = labelFor(feature);
    button.addEventListener("click", () => selectFeature(feature.id, true));
    container.append(button);
  }
}

function renderSearch(query) {
  const container = byId("searchResults");
  container.replaceChildren();
  const normalized = query
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  if (!normalized) return;

  const matches = [...state.features.values()]
    .filter((feature) => searchableText(feature).includes(normalized))
    .slice(0, 8);

  if (!matches.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "Sin resultados.";
    container.append(empty);
    return;
  }

  for (const feature of matches) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "search-result";
    button.textContent = labelFor(feature);
    button.addEventListener("click", () => {
      selectFeature(feature.id, true);
      byId("searchResults").replaceChildren();
    });
    container.append(button);
  }
}

async function loadGeoJson(url) {
  const response = await fetch(url, { cache: "no-cache" });
  if (!response.ok) throw new Error(`No se pudo cargar ${url}: ${response.status}`);
  const data = await response.json();
  if (data?.type !== "FeatureCollection" || !Array.isArray(data.features)) {
    throw new Error(`${url} no contiene una FeatureCollection válida`);
  }
  return data;
}

async function initializeMap() {
  state.map = L.map("map", { zoomControl: true });
  L.tileLayer(CONFIG.map.tileUrl, {
    attribution: CONFIG.map.attribution,
    maxZoom: 19
  }).addTo(state.map);

  try {
    const [points, sections] = await Promise.all([
      loadGeoJson(CONFIG.data.pointsUrl),
      loadGeoJson(CONFIG.data.sectionsUrl)
    ]);
    [...points.features, ...sections.features].forEach((feature) => {
      if (feature.id) state.features.set(String(feature.id), feature);
    });

    const pointsLayer = L.geoJSON(points, { pointToLayer: addPointFeature }).addTo(state.map);
    const sectionsLayer = L.geoJSON(sections, {
      style: { color: "#f97316", weight: 5, opacity: 0.85 },
      onEachFeature: addSectionFeature
    }).addTo(state.map);

    const bounds = L.featureGroup([pointsLayer, sectionsLayer]).getBounds();
    if (bounds.isValid()) state.map.fitBounds(bounds, { padding: [8, 8], maxZoom: CONFIG.map.maxFitZoom });
    else state.map.setView(CONFIG.map.fallbackCenter, CONFIG.map.fallbackZoom);
    renderFavorites();
  } catch (error) {
    console.error(error);
    state.map.setView(CONFIG.map.fallbackCenter, CONFIG.map.fallbackZoom);
    byId("dataNotice").innerHTML = '<span class="status-dot status-dot--error" aria-hidden="true"></span><span>No se han podido cargar los datos geográficos.</span>';
  }
}

function locateUser() {
  if (!navigator.geolocation) {
    byId("dataNotice").lastElementChild.textContent = "Este navegador no permite obtener la ubicación.";
    return;
  }
  navigator.geolocation.getCurrentPosition(({ coords }) => {
    const latlng = [coords.latitude, coords.longitude];
    if (state.locationLayer) state.locationLayer.remove();
    state.locationLayer = L.circle(latlng, {
      radius: Math.max(coords.accuracy, 25),
      color: "#2563eb",
      fillOpacity: 0.15
    }).addTo(state.map).bindTooltip("Tu ubicación aproximada");
    state.map.setView(latlng, 13);
  }, () => {
    byId("dataNotice").lastElementChild.textContent = "No se pudo obtener la ubicación. Revisa el permiso del navegador.";
  }, { enableHighAccuracy: true, timeout: 10000 });
}

function bindUi() {
  byId("btnRadar").addEventListener("click", () => openExternal(CONFIG.externalServices.radar));
  byId("btnPaneles").addEventListener("click", () => openExternal(CONFIG.externalServices.models));
  byId("btnUbicacion").addEventListener("click", locateUser);
  byId("btnContraste").addEventListener("click", (event) => {
    const active = document.body.classList.toggle("high-contrast");
    event.currentTarget.setAttribute("aria-pressed", String(active));
  });
  byId("searchInput").addEventListener("input", (event) => renderSearch(event.target.value));
  byId("btnFavorito").addEventListener("click", () => {
    const id = state.selected?.id;
    if (!id) return;
    if (state.favorites.has(id)) state.favorites.delete(id);
    else state.favorites.add(id);
    saveFavorites();
    updateFavoriteButton();
    renderFavorites();
  });
  byId("btnAemet").addEventListener("click", () => openExternal(buildAemetUrl(state.selected?.properties)));
  byId("btnMeteored").addEventListener("click", () => openExternal(buildMeteoredUrl(state.selected?.properties)));
}

function initializeServiceWorker() {
  if (!("serviceWorker" in navigator) || (location.protocol !== "https:" && location.hostname !== "localhost")) return;
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    location.reload();
  });
  navigator.serviceWorker.register("./service-worker.js").then((registration) => {
    const showUpdate = () => {
      byId("updateBanner").hidden = false;
      byId("btnUpdate").onclick = () => registration.waiting?.postMessage({ type: "SKIP_WAITING" });
    };
    if (registration.waiting) showUpdate();
    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      worker?.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) showUpdate();
      });
    });
  }).catch((error) => console.error("No se pudo registrar el service worker", error));
}

window.addEventListener("DOMContentLoaded", () => {
  bindUi();
  initializeMap();
  initializeServiceWorker();
});
