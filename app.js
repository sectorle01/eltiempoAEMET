const AEMET_SLUG_EXCEPCIONES = {
  "La Bañeza": "baneza-la",
  "Valderrey": "valderrey-estacion-de-valderrey",
  "Villagatón": "villagaton-branuelas"
};

function slugAemetFinal(nombre) {
  return AEMET_SLUG_EXCEPCIONES[nombre]
    ?? nombre
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ñ/g, "n")
        .replace(/\s+/g, "-");
}

const map = L.map('map');

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap'
}).addTo(map);

const capaMunicipios = L.geoJSON(MUNICIPIOS, {
  style: {
    color: '#444',
    weight: 1,
    fillOpacity: 0.3
  },
  onEachFeature: function (feature, layer) {

    const nombre = feature.properties.nombre;
    const codmun = feature.properties.codmun;

    layer.bindTooltip(nombre, { sticky: true });

    layer.on('mouseover', () => {
      layer.setStyle({
        fillColor: '#f5d11b',
        fillOpacity: 0.6
      });
    });

    layer.on('mouseout', () => {
      layer.setStyle({
        fillColor: '#444',
        fillOpacity: 0.3
      });
    });

    layer.on('click', () => {
      const slug = slugAemetFinal(nombre);
      window.open(
        'https://www.aemet.es/es/eltiempo/prediccion/municipios/horas/'
        + slug + '-id' + codmun,
        '_blank'
      );
    });
  }
}).addTo(map);

map.fitBounds(capaMunicipios.getBounds(), {
  padding: [20, 20]
});
