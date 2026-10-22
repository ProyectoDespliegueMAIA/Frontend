import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import colombia from '../geo/colombia.json';
import comunasGeo from '../geo/comunas.json';
import { BARRIOS, MUNICIPIOS, getZona } from '../data.js';

const COLOMBIA_BOUNDS = L.latLngBounds(colombia);
const CITY_ZOOM = 12.5;
const BARRIO_ZOOM = 16;
const SHOW_BARRIOS_FROM = 10; // por debajo de este zoom solo se ven las ciudades
const SHOW_COMUNAS_FROM = 11;

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';
const BASEMAPS = {
  Topográfico: `${ESRI}/World_Topo_Map/MapServer/tile/{z}/{y}/{x}`,
  Calles: `${ESRI}/World_Street_Map/MapServer/tile/{z}/{y}/{x}`,
  Satélite: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
};
const ATTRIBUTION =
  'Mapa base © Esri · Barrios y comunas © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> · Límite © geoBoundaries';

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function cityIcon(m, exceso, selected) {
  return L.divIcon({
    className: `city-marker city-marker--label-${m.mapa.label}`,
    html:
      `<span class="city-marker__dot${exceso ? ' is-alert' : ''}${selected ? ' is-selected' : ''}"></span>` +
      `<span class="city-marker__label">${escapeHtml(m.nombre)}</span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function barrioIcon(exceso, selected) {
  const size = selected ? 22 : 14;
  return L.divIcon({
    className: 'barrio-marker',
    html: `<span class="barrio-marker__dot${exceso ? ' is-alert' : ''}${selected ? ' is-selected' : ''}"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function clusterIcon(cluster) {
  const children = cluster.getAllChildMarkers();
  const count = children.length;
  const alerts = children.filter((m) => m.options.exceso).length;
  const size = count < 10 ? 32 : count < 50 ? 40 : 48;
  return L.divIcon({
    className: 'cluster-marker',
    html:
      `<span class="cluster-marker__count">${count}</span>` +
      (alerts ? `<span class="cluster-marker__alerts" title="Barrios con exceso esperado">${alerts}</span>` : ''),
    iconSize: [size, size],
  });
}

function popupHtml(barrio, est) {
  return `
    <div class="map-popup">
      <div class="map-popup__title">${escapeHtml(barrio.nombre)}</div>
      <div class="map-popup__meta">${escapeHtml(barrio.comuna)} · ${escapeHtml(getZona(barrio.municipioId).nombre)}</div>
      <div class="map-popup__status${est.exceso ? ' is-alert' : ''}">${est.exceso ? 'Exceso esperado' : 'Sin exceso esperado'}</div>
      <dl class="map-popup__data">
        <div><dt>Casos última semana</dt><dd>${Math.round(est.casos)}</dd></div>
        <div><dt>Umbral</dt><dd>${Math.round(est.umbral)}</dd></div>
      </dl>
      <button type="button" class="map-popup__link" data-action="evolucion">Ver evolución ↓</button>
    </div>`;
}

const HomeControl = L.Control.extend({
  options: { position: 'topleft' },
  onAdd(map) {
    const bar = L.DomUtil.create('div', 'leaflet-bar');
    const btn = L.DomUtil.create('a', 'map-home', bar);
    btn.href = '#';
    btn.title = 'Ver toda Colombia';
    btn.setAttribute('role', 'button');
    btn.setAttribute('aria-label', 'Ver toda Colombia');
    btn.innerHTML =
      '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M2.5 7.5 8 3l5.5 4.5M4 6.5V13h3v-3.5h2V13h3V6.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    L.DomEvent.disableClickPropagation(bar);
    L.DomEvent.on(btn, 'click', (e) => {
      L.DomEvent.preventDefault(e);
      map.flyToBounds(COLOMBIA_BOUNDS, { duration: 1 });
    });
    return bar;
  },
});

const CoordsControl = L.Control.extend({
  options: { position: 'bottomleft' },
  onAdd(map) {
    const el = L.DomUtil.create('div', 'map-coords');
    const show = (ll) => {
      el.textContent = `${ll.lng.toFixed(3)} ${ll.lat.toFixed(3)} grados`;
    };
    show(map.getCenter());
    map.on('mousemove', (e) => show(e.latlng));
    return el;
  },
});

export default function MapaColombia({
  municipioId,
  barrioId,
  estados,
  onSelectMunicipio,
  onSelectBarrio,
  onVerEvolucion,
  children,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef(null);
  const clickedRef = useRef(null);
  const prevSelectionRef = useRef({ municipioId, barrioId });
  const latest = useRef({});
  latest.current = { estados, onSelectMunicipio, onSelectBarrio, onVerEvolucion };
  const [enCiudad, setEnCiudad] = useState(false);

  // Montaje del mapa (una sola vez).
  useEffect(() => {
    const map = L.map(containerRef.current, {
      zoomSnap: 0.5,
      maxZoom: 18,
      maxBounds: COLOMBIA_BOUNDS.pad(0.12),
      maxBoundsViscosity: 1,
      attributionControl: false,
    });
    map.fitBounds(COLOMBIA_BOUNDS, { padding: [8, 8] });
    map.setMinZoom(map.getZoom());

    const bases = Object.fromEntries(
      Object.entries(BASEMAPS).map(([name, url]) => [name, L.tileLayer(url, { maxZoom: 18, attribution: ATTRIBUTION })]),
    );
    bases.Topográfico.addTo(map);
    L.control.layers(bases, null, { position: 'topright' }).addTo(map);
    L.control.attribution({ prefix: false, position: 'bottomright' }).addTo(map);
    new HomeControl().addTo(map);
    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);
    new CoordsControl().addTo(map);

    // Todo lo que está fuera de Colombia se atenúa.
    map.createPane('mask').style.zIndex = 350;
    const world = [[-89, -180], [-89, 180], [89, 180], [89, -180]];
    L.polygon([world, colombia], {
      pane: 'mask',
      stroke: false,
      fillColor: '#eef2f1',
      fillOpacity: 0.86,
      interactive: false,
    }).addTo(map);
    L.polyline(colombia, { pane: 'mask', color: '#0c6b62', weight: 1.6, opacity: 0.8, interactive: false }).addTo(map);

    const comunas = L.layerGroup(
      Object.values(comunasGeo).flatMap((lista) =>
        lista.map((c) =>
          L.polyline(c.lineas, { color: '#5b45a8', weight: 1.4, opacity: 0.55, dashArray: '4 4' }).bindTooltip(
            escapeHtml(c.nombre),
            { sticky: true, className: 'map-tooltip' },
          ),
        ),
      ),
    );

    const cities = new Map(
      MUNICIPIOS.map((m) => [
        m.id,
        L.marker(m.centro, { icon: cityIcon(m, false, false), riseOnHover: true, keyboard: true, title: m.nombre }).on(
          'click',
          () => latest.current.onSelectMunicipio(m.id),
        ),
      ]),
    );
    const cityLayer = L.layerGroup([...cities.values()]);

    const cluster = L.markerClusterGroup({
      maxClusterRadius: 55,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 17,
      iconCreateFunction: clusterIcon,
    });
    const barrios = new Map(
      BARRIOS.map((b) => {
        const marker = L.marker([b.lat, b.lng], { icon: barrioIcon(false, false), exceso: false, keyboard: true })
          .bindTooltip(escapeHtml(b.nombre), { direction: 'top', offset: [0, -8], className: 'map-tooltip' })
          .bindPopup(() => popupHtml(b, latest.current.estados.get(b.id)), { maxWidth: 240, minWidth: 200 })
          .on('click', () => {
            clickedRef.current = b.id;
            latest.current.onSelectBarrio(b.id);
          });
        return [b.id, marker];
      }),
    );
    cluster.addLayers([...barrios.values()]);

    map.on('popupopen', (e) => {
      const link = e.popup.getElement()?.querySelector('[data-action="evolucion"]');
      link?.addEventListener('click', () => latest.current.onVerEvolucion());
    });

    const syncByZoom = () => {
      const z = map.getZoom();
      const showBarrios = z >= SHOW_BARRIOS_FROM;
      if (showBarrios) {
        map.removeLayer(cityLayer);
        map.addLayer(cluster);
      } else {
        map.removeLayer(cluster);
        map.addLayer(cityLayer);
      }
      if (z >= SHOW_COMUNAS_FROM) map.addLayer(comunas);
      else map.removeLayer(comunas);
      setEnCiudad(showBarrios);
    };
    map.on('zoomend', syncByZoom);
    syncByZoom();

    mapRef.current = map;
    layersRef.current = { cities, barrios, cluster };
    return () => {
      map.remove();
      mapRef.current = null;
      layersRef.current = null;
    };
  }, []);

  // Colores según la predicción y marcador seleccionado.
  useEffect(() => {
    const { cities, barrios, cluster } = layersRef.current;
    for (const m of MUNICIPIOS) {
      cities.get(m.id).setIcon(cityIcon(m, estados.get(m.id).exceso, m.id === municipioId));
    }
    let changed = false;
    for (const [id, marker] of barrios) {
      const exceso = estados.get(id).exceso;
      const key = `${exceso}-${id === barrioId}`;
      if (marker.options.key === key) continue;
      marker.options.key = key;
      marker.options.exceso = exceso;
      marker.setIcon(barrioIcon(exceso, id === barrioId));
      changed = true;
      if (marker.isPopupOpen()) marker.getPopup().update();
    }
    // Con la lista explícita funciona aunque el grupo no esté en el mapa (vista de país).
    if (changed) cluster.refreshClusters([...barrios.values()]);
  }, [estados, municipioId, barrioId]);

  // Mover la cámara cuando la selección cambia desde fuera del mapa.
  useEffect(() => {
    const prev = prevSelectionRef.current;
    if (prev.municipioId === municipioId && prev.barrioId === barrioId) return;
    prevSelectionRef.current = { municipioId, barrioId };

    const map = mapRef.current;
    if (!barrioId) {
      map.flyTo(getZona(municipioId).centro, CITY_ZOOM, { duration: 1.2 });
      return;
    }
    if (clickedRef.current === barrioId) return;
    const barrio = getZona(barrioId);
    const { barrios, cluster } = layersRef.current;
    map.flyTo([barrio.lat, barrio.lng], BARRIO_ZOOM, { duration: 1.2 });
    map.once('moveend', () => cluster.zoomToShowLayer(barrios.get(barrioId), () => barrios.get(barrioId).openPopup()));
  }, [municipioId, barrioId]);

  useEffect(() => {
    if (barrioId !== clickedRef.current) clickedRef.current = null;
  }, [barrioId]);

  return (
    <div className="map-wrap">
      <div ref={containerRef} className="map" />
      <div className="map-overlay">{children}</div>
      {!enCiudad && <div className="map-hint">Haz clic en una ciudad para ver sus barrios</div>}
    </div>
  );
}
