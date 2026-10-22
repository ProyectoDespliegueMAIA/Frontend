# Alerta Dengue · Frontend

Maqueta interactiva de la herramienta de alerta temprana de exceso de casos de dengue por municipio (Cali, Ibagué y Neiva), con detalle por barrio y comuna.

## Cómo correrlo

Requiere Node.js 18 o superior.

```bash
npm install
npm run dev
```

Abre http://localhost:5173

Para generar la versión de producción (archivos estáticos en `dist/`):

```bash
npm run build
```

## Pantallas

- **Panel**: mapa de Colombia con las tres ciudades. Al hacer clic en una ciudad se ven sus barrios agrupados; al hacer clic en un barrio se muestran su predicción y su evolución semanal (casos, umbral, lluvia y temperatura).
- **Modelo y datos**: explicación del modelo, descarga del formato `.xlsx` y carga de un archivo propio.

## Estructura

```
src/
  App.jsx                    pestañas y estado global
  data.js                    series, umbrales y predicciones
  geo/                       barrios, comunas y contorno de Colombia
  components/
    PanelView.jsx            pantalla Panel
    MapaColombia.jsx         mapa (Leaflet) con ciudades y barrios
    BarrioSearch.jsx         buscador de barrios y comunas
    EvolutionCharts.jsx      gráficas de evolución
    ModeloView.jsx           pantalla Modelo y datos
```

## Datos

- Los casos, umbrales y predicciones son **ilustrativos**; se reemplazan en `src/data.js` al conectar el modelo.
- Ubicación de barrios y límites de comunas: © colaboradores de [OpenStreetMap](https://www.openstreetmap.org/copyright) (ODbL).
- Límite de Colombia: [geoBoundaries](https://www.geoboundaries.org) (CC BY 4.0).
- Mapa base: © Esri.
