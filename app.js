// ------------------ Slugs ------------------
const SLUG_EXCEPCIONES_AEMET = {
  "La Bañeza": "baneza-la",
  "Valderrey": "valderrey-estacion-de-valderrey",
  "Manzanal del Puerto": "villagaton-branuelas",
  "Combarros": "brazuelo",
  "La Torre Del Valle": "torre-del-valle-la",
  "Covas": "rubia",
  "San Miguel de las Dueñas": "congosto"
};

const METEORED_OVERRIDES = {
  "la-torre-del-valle": "https://www.tiempo.com/torre-del-valle-la.htm",
  "pozuelo-del-paramo": "https://www.tiempo.com/pozuelo-del-paramo.htm",
  "valcavado-del-paramo": "https://www.tiempo.com/gn/3107055-xhoras.htm"
};

const slugify = (texto) =>
  String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n")
    .replace(/\s+/g, "-");

const slugAemet = (nombre) => SLUG_EXCEPCIONES_AEMET[nombre] ?? slugify(nombre);

// ------------------ Servicio / UI ------------------
let currentServicio = "aemet";

const openInNewTab = (url) => window.open(url, "_blank");

window.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const selectServicio = $("serviceSelect");
  const btnRadar = $("btnRadar");
  const btnPaneles = $("btnPaneles");

  selectServicio?.addEventListener("change", (e) => {
    currentServicio = e.target.value;
  });

  btnRadar?.addEventListener("click", () => {
    openInNewTab("https://www.tiempo.com/mapas-meteorologicos/");
  });

  btnPaneles?.addEventListener("click", () => {
    openInNewTab("https://www.wetterzentrale.de/es/topkarten.php?model=gfs&lid=OP");
  });
});

// ------------------ URLs ------------------
const buildUrlAemet = (nombre, codmun) => {
  const slug = slugAemet(nombre);
  return `https://www.aemet.es/es/eltiempo/prediccion/municipios/horas/${slug}-id${codmun}`;
};

const buildUrlMeteored = (nombre) => {
  const slug = slugify(nombre);
  const override = METEORED_OVERRIDES[slug];
  if (override) return override;
  if (!slug) return "";
  return `https://www.tiempo.com/${slug}/por-horas`;
};

function abrirPrediccion(nombre, codmun) {
  let url = "";

  if (currentServicio === "aemet") {
    url = buildUrlAemet(nombre, codmun);
  } else if (currentServicio === "meteored") {
    url = buildUrlMeteored(nombre);
  }

  if (url) openInNewTab(url);
}

// ------------------ Mapa (GeoJSON de PUNTOS) ------------------
const map = L.map("map");

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap"
}).addTo(map);

const PUNTO_STYLE_BASE = {
  radius: 25,
  color: "#444",
  weight: 1,
  fillColor: "#444",
  fillOpacity: 0.4
};

const PUNTO_STYLE_HOVER = {
  fillColor: "#f5d11b",
  fillOpacity: 0.9
};

const capaMunicipios = L.geoJSON(MUNICIPIOS, {
  // Para GeoJSON de tipo Point, Leaflet llama a esto
  pointToLayer: (feature, latlng) => L.circleMarker(latlng, PUNTO_STYLE_BASE),

  onEachFeature: (feature, layer) => {
    const { nombre, codmun } = feature.properties || {};

    if (nombre) layer.bindTooltip(nombre, { sticky: true });

    layer.on("mouseover", () => layer.setStyle(PUNTO_STYLE_HOVER));
    layer.on("mouseout", () => layer.setStyle(PUNTO_STYLE_BASE));

    layer.on("click", () => {
      if (nombre && codmun) abrirPrediccion(nombre, codmun);
    });
  }
}).addTo(map);

// Encadre inicial (con fallback por si algo va raro)
const bounds = capaMunicipios.getBounds();
if (bounds.isValid()) {
  map.fitBounds(bounds, { padding: [5, 5] });
} else {
  map.setView([40.4168, -3.7038], 6);
}
