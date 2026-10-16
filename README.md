# El tiempo · Sector LE-01

Aplicación web estática para consultar información meteorológica relevante para el sector de conservación LE-01. Está alojada en GitHub Pages y funciona también como PWA.

> **Estado del proyecto:** las fases 1 y 2 proporcionan la estructura del cuadro de mando y mantienen enlaces a predicciones externas. Todavía no se muestran predicciones ni avisos dentro de la aplicación. AEMET OpenData se incorporará en la fase 3.

## Objeto y ámbito

La aplicación permite:

- localizar puntos de referencia del sector en un mapa;
- buscar por localidad y, cuando se incorporen datos verificados, por carretera y PK;
- abrir una ficha sin abandonar el mapa;
- conservar favoritos en el propio navegador;
- abrir la predicción municipal de AEMET o Meteored;
- acceder al radar y a mapas de modelos externos;
- utilizar ubicación del dispositivo y modo de alto contraste.

No sustituye los avisos oficiales, los procedimientos internos ni la evaluación de los responsables de conservación.

## Fuentes

- **AEMET:** fuente oficial de predicciones y, en fases posteriores, avisos meteorológicos.
- **Meteored:** enlace secundario de consulta.
- **Wetterzentrale:** mapas de modelos numéricos de apoyo.
- **OpenStreetMap:** cartografía base.

La interfaz distingue los enlaces externos de los datos integrados. En la versión actual no existe predicción meteorológica embebida ni semáforo operativo calculado.

## Estructura

```text
index.html          interfaz y componentes accesibles
config.js           configuración no sensible
app.js              mapa, búsqueda, fichas y favoritos
estilos.css         presentación y diseño adaptable
puntos.geojson      puntos de referencia
tramos.geojson      tramos verificados (vacío hasta recibir datos oficiales)
service-worker.js   caché de la PWA y aviso de actualización
scripts/quality.mjs validaciones automáticas
```

### Esquema de `puntos.geojson`

Cada elemento debe ser un `Feature` con geometría `Point`, identificador estable y estas propiedades:

| Propiedad | Tipo | Descripción |
|---|---|---|
| `nombre` | texto | Nombre visible |
| `tipo` | texto | municipio, puerto, puente, base, estación… |
| `codmun` | texto o `null` | Código municipal para construir el enlace de AEMET |
| `carretera` | texto o `null` | Denominación oficial |
| `pk` | número/texto o `null` | Punto kilométrico |
| `cota` | número o `null` | Altitud en metros |
| `observaciones` | texto o `null` | Nota operativa contrastada |

### Esquema previsto de `tramos.geojson`

Las geometrías serán `LineString` y las propiedades mínimas serán `nombre`, `carretera`, `pk_inicial`, `pk_final`, `altitud_min`, `altitud_max`, `base`, `exposicion` y `observaciones`. El fichero se mantiene vacío para no inventar datos del sector.

## Estados operativos

La interfaz reserva cuatro niveles futuros:

- **verde:** situación normal;
- **amarillo:** vigilancia;
- **naranja:** posible necesidad de actuación;
- **rojo:** aviso oficial o umbral crítico.

Los umbrales están desactivados hasta que sean validados. Una temperatura del aire próxima a 0 °C no se presentará como hielo confirmado.

## Desarrollo local

El navegador debe servir los GeoJSON por HTTP; abrir `index.html` como `file://` no es suficiente.

```bash
python3 -m http.server 8080
```

Después abre `http://localhost:8080`.

## Controles de calidad

No hay dependencias de npm. Se usa Node.js únicamente para validar los ficheros:

```bash
npm test
```

La comprobación verifica:

- sintaxis y estructura básica de los GeoJSON;
- identificadores únicos y coordenadas válidas;
- referencias a ficheros locales;
- integridad SRI de Leaflet;
- ausencia de patrones habituales de secretos;
- caché de los recursos esenciales.

GitHub Actions ejecuta la misma validación en cada `push` y `pull_request`.

## Despliegue

GitHub Pages publica la rama configurada en **Settings → Pages**. El procedimiento recomendado es:

1. crear una rama de trabajo;
2. ejecutar `npm test` localmente;
3. abrir una pull request;
4. revisar la vista previa y las comprobaciones;
5. fusionar en `main` únicamente tras la aprobación.

No deben añadirse claves API al repositorio. La futura clave de AEMET se guardará en GitHub Secrets y solo será utilizada por GitHub Actions para generar JSON públicos reducidos.

## Limitaciones conocidas

- no hay todavía tramos, PK, cotas ni puntos críticos verificados;
- no se muestran datos meteorológicos dentro de la aplicación;
- los enlaces de terceros pueden cambiar sin aviso;
- el mapa base requiere conexión, aunque la estructura de la aplicación esté en caché;
- los favoritos son locales a cada navegador.

## Licencias y atribución

La cartografía base procede de OpenStreetMap y conserva su atribución en el mapa. Los datos meteorológicos pertenecen a sus respectivos proveedores y se consultan bajo sus condiciones de uso.
