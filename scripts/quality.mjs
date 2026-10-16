import { readFile, readdir } from "node:fs/promises";
import { extname, join } from "node:path";

const root = new URL("../", import.meta.url);
const errors = [];

async function text(path) {
  return readFile(new URL(path, root), "utf8");
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function validateFeatureCollection(data, filename, geometryTypes) {
  assert(data.type === "FeatureCollection", `${filename}: type debe ser FeatureCollection`);
  assert(Array.isArray(data.features), `${filename}: features debe ser un array`);
  const ids = new Set();
  for (const [index, feature] of (data.features || []).entries()) {
    assert(Boolean(feature.id), `${filename}: feature ${index} no tiene id`);
    assert(!ids.has(feature.id), `${filename}: id duplicado ${feature.id}`);
    ids.add(feature.id);
    assert(geometryTypes.includes(feature.geometry?.type), `${filename}: geometría no admitida en ${feature.id || index}`);
    assert(Boolean(feature.properties?.nombre), `${filename}: falta nombre en ${feature.id || index}`);
    if (feature.geometry?.type === "Point") {
      const [lon, lat] = feature.geometry.coordinates || [];
      assert(Number.isFinite(lon) && lon >= -180 && lon <= 180, `${filename}: longitud inválida en ${feature.id}`);
      assert(Number.isFinite(lat) && lat >= -90 && lat <= 90, `${filename}: latitud inválida en ${feature.id}`);
    }
  }
}

async function collectFiles(directory = ".") {
  const result = [];
  for (const entry of await readdir(new URL(directory, root), { withFileTypes: true })) {
    if ([".git", "node_modules"].includes(entry.name)) continue;
    const relative = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await collectFiles(`${relative}/`));
    else result.push(relative);
  }
  return result;
}

const points = JSON.parse(await text("puntos.geojson"));
const sections = JSON.parse(await text("tramos.geojson"));
validateFeatureCollection(points, "puntos.geojson", ["Point"]);
validateFeatureCollection(sections, "tramos.geojson", ["LineString", "MultiLineString"]);
assert(points.features.length === 20, "puntos.geojson: se esperaban los 20 puntos existentes");

const index = await text("index.html");
for (const resource of ["config.js", "app.js", "estilos.css", "manifest.json"]) {
  assert(index.includes(resource), `index.html: no referencia ${resource}`);
}
assert(index.includes("integrity=\\"sha256-"), "index.html: Leaflet debe llevar integridad SRI");
assert(index.includes("crossorigin=\\"anonymous\\""), "index.html: Leaflet debe declarar crossorigin");

const worker = await text("service-worker.js");
for (const resource of ["config.js", "app.js", "estilos.css", "puntos.geojson", "tramos.geojson"]) {
  assert(worker.includes(resource), `service-worker.js: no incluye ${resource}`);
}

const secretPatterns = [
  /AEMET(?:_OPEN_DATA)?_?API_?KEY\\s*[:=]\\s*["'][^"']+/i,
  /(?:github_pat_|ghp_)[A-Za-z0-9_]{20,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/
];
const textExtensions = new Set([".html", ".css", ".js", ".mjs", ".json", ".geojson", ".md", ".yml", ".yaml"]);
for (const file of await collectFiles()) {
  if (!textExtensions.has(extname(file))) continue;
  const content = await text(file.replace(/^\\.\\//, ""));
  for (const pattern of secretPatterns) assert(!pattern.test(content), `${file}: posible secreto detectado`);
}

if (errors.length) {
  console.error(`Fallaron ${errors.length} comprobaciones:\\n- ${errors.join("\\n- ")}`);
  process.exit(1);
}

console.log(`Calidad correcta: ${points.features.length} puntos, ${sections.features.length} tramos y ningún secreto detectado.`);
