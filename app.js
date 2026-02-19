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
    openInNewTab("https://www.wetterzentrale.de/es/topkarten.php?map=18&model=gfs&var=4&time=1&run=12&lid=OP&h=0&mv=0&tr=1");
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

const PUNTO_STYLE_VISIBLE = {
  radius: 4,         // punto pequeño
  color: "#111",     // borde del punto
  weight: 2,
  fillOpacity: 0     // sin relleno, se ve como “punto”
};

const PUNTO_STYLE_VISIBLE_HOVER = {
  radius: 4,
  color: "#f5d11b",
  weight: 3,
  fillOpacity: 0
};

const PUNTO_STYLE_HITAREA = {
  radius: 12,        // área cómoda para dedo
  weight: 0,
  fillOpacity: 0     // invisible
};

const capaMunicipios = L.geoJSON(MUNICIPIOS, {
  pointToLayer: (feature, latlng) => L.circleMarker(latlng, PUNTO_STYLE_VISIBLE),

  onEachFeature: (feature, layer) => {
    const { nombre, codmun } = feature.properties || {};
    if (nombre) layer.bindTooltip(nombre, { sticky: true });

    // Hit area invisible (añadida al mapa, pero no se devuelve como feature)
    const hit = L.circleMarker(layer.getLatLng(), PUNTO_STYLE_HITAREA).addTo(map);

    const hoverOn = () => layer.setStyle(PUNTO_STYLE_VISIBLE_HOVER);
    const hoverOff = () => layer.setStyle(PUNTO_STYLE_VISIBLE);

    layer.on("mouseover", hoverOn);
    layer.on("mouseout", hoverOff);

    const abrir = () => {
      if (nombre && codmun) abrirPrediccion(nombre, codmun);
    };

    layer.on("click", abrir);
    hit.on("click", abrir);

    // Para que el hit no se quede “suelo” si quitas la capa, lo encadenamos:
    layer.on("remove", () => map.removeLayer(hit));
  }
}).addTo(map);

// Encadre inicial (con fallback por si algo va raro)
const bounds = capaMunicipios.getBounds();

if (bounds && bounds.isValid && bounds.isValid()) {
  map.fitBounds(bounds, { padding: [5, 5], maxZoom: 12 });
} else {
  map.setView([42.6, -5.6], 8); // mejor fallback para León que Madrid 🙂
}

