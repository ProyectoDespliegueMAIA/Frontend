// Datos ilustrativos: series semanales sintéticas por municipio y por barrio.
// Las ubicaciones de barrios y comunas son reales (OpenStreetMap); los casos no.
// La semana 0 de la serie es el lunes 2 de enero de 2023.

import barriosGeo from './geo/barrios.json';
import comunasGeo from './geo/comunas.json';

const DAY_MS = 86400000;
const WEEK_MS = 7 * DAY_MS;
const ORIGIN = Date.UTC(2023, 0, 2);
const SERIES_LENGTH = 160;

export const HISTORY_WEEKS = 39; // semanas visibles antes de la fecha elegida
export const FORECAST_WEEKS = 8; // horizonte de la predicción
export const WINDOW_WEEKS = 52;
const LAST_LOADED_WEEK = 130; // última semana cargada en la base

export const MUNICIPIOS = [
  {
    id: 'cali',
    nombre: 'Cali',
    depto: 'Valle del Cauca',
    mapa: { x: 172, y: 430, label: 'left' },
    casosBase: 120,
    picoUmbral: 97,
    lluviaBase: 34,
    picoLluvia: 74,
    tempBase: 24.6,
    picoTemp: 70,
    seed: 11,
    // [semana central del brote, intensidad]
    brotes: [[-5, 2.2], [12, 1.3], [30, 2.4], [47, 2.1], [64, 1.3], [80, 2.3], [97, 2.2], [118, 2.4], [135, 2.0], [152, 2.2]],
  },
  {
    id: 'ibague',
    nombre: 'Ibagué',
    depto: 'Tolima',
    mapa: { x: 198, y: 412, label: 'right' },
    casosBase: 45,
    picoUmbral: 99.6,
    lluviaBase: 40,
    picoLluvia: 76.6,
    tempBase: 24.0,
    picoTemp: 74,
    seed: 23,
    brotes: [[-8, 2.2], [9, 2.0], [24, 1.3], [41, 2.3], [56, 2.1], [73, 2.3], [90.7, 2.1], [108.8, 2.2], [126, 2.3], [143, 2.1]],
  },
  {
    id: 'neiva',
    nombre: 'Neiva',
    depto: 'Huila',
    mapa: { x: 197, y: 438, label: 'right' },
    casosBase: 60,
    picoUmbral: 102,
    lluviaBase: 25,
    picoLluvia: 79,
    tempBase: 28.0,
    picoTemp: 78,
    seed: 37,
    brotes: [[-2, 2.0], [15, 2.2], [33, 1.3], [50, 2.3], [66, 2.1], [84, 1.3], [101, 2.2], [117, 2.3], [134, 2.0], [150, 2.2]],
  },
];

export const DEFAULT_MUNICIPIO = 'ibague';
export const DEFAULT_DATE = '2025-03-03';
export const MIN_DATE = isoFromWeek(HISTORY_WEEKS);
export const MAX_DATE = isoFromWeek(LAST_LOADED_WEEK);

// Cada barrio hereda el clima y los brotes de su municipio (con un leve desfase)
// y suma un riesgo local propio, así no todos los barrios coinciden con su ciudad.
export const BARRIOS = MUNICIPIOS.flatMap((m) =>
  barriosGeo[m.id].map(([nombre, lat, lng, comuna], k) => {
    const seed = m.seed * 1000 + k;
    const rand = mulberry32(seed);
    return {
      ...m,
      id: `${m.id}-${k}`,
      tipo: 'barrio',
      municipioId: m.id,
      nombre,
      comuna: comunasGeo[m.id][comuna].nombre,
      lat,
      lng,
      seed,
      casosBase: 4 + rand() * 10,
      picoUmbral: m.picoUmbral + (rand() - 0.5) * 4,
      riesgoLocal: -1.2 + rand() * 1.7,
      brotes: m.brotes.map(([centro, intensidad]) => [centro + (rand() - 0.5) * 5, intensidad]),
    };
  }),
);

for (const m of MUNICIPIOS) {
  const propios = BARRIOS.filter((b) => b.municipioId === m.id);
  m.tipo = 'municipio';
  m.centro = [
    propios.reduce((s, b) => s + b.lat, 0) / propios.length,
    propios.reduce((s, b) => s + b.lng, 0) / propios.length,
  ];
}

const ZONAS = new Map([...MUNICIPIOS, ...BARRIOS].map((z) => [z.id, z]));

export function getMunicipio(id) {
  return MUNICIPIOS.find((m) => m.id === id) ?? MUNICIPIOS[0];
}

export function getZona(id) {
  return ZONAS.get(id) ?? MUNICIPIOS[0];
}

export function barriosDe(municipioId) {
  return BARRIOS.filter((b) => b.municipioId === municipioId);
}

// ---------- fechas ----------

export function weekFromISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.floor((Date.UTC(y, m - 1, d) - ORIGIN) / WEEK_MS);
}

export function isoFromWeek(t) {
  return new Date(ORIGIN + t * WEEK_MS).toISOString().slice(0, 10);
}

export function isDateLoaded(iso) {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && iso >= MIN_DATE && iso <= MAX_DATE;
}

function isoWeek(t) {
  const d = new Date(ORIGIN + t * WEEK_MS);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  return { week: Math.ceil(((d - yearStart) / DAY_MS + 1) / 7), year: d.getUTCFullYear() };
}

export function weekLabel(t) {
  const { week, year } = isoWeek(t);
  return `Sem ${week} · ${year}`;
}

const dateFormatter = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return dateFormatter.format(new Date(Date.UTC(y, m - 1, d)));
}

// ---------- series sintéticas ----------

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const noiseCache = new Map();

// Ruido suavizado y determinista para que la maqueta siempre muestre lo mismo.
function noise(m, channel) {
  const key = `${m.id}-${channel}`;
  if (!noiseCache.has(key)) {
    const rand = mulberry32(m.seed * 100 + channel);
    const raw = Array.from({ length: SERIES_LENGTH + 2 }, () => rand() * 2 - 1);
    noiseCache.set(key, raw.slice(1, -1).map((v, i) => (raw[i] + v + raw[i + 2]) / 3));
  }
  return noiseCache.get(key);
}

const TWO_PI = Math.PI * 2;

function umbral(m, t) {
  return m.casosBase * (1 + 0.18 * Math.cos((TWO_PI * (t - m.picoUmbral)) / 26));
}

function riesgo(m, t) {
  let r = -1.6 + (m.riesgoLocal ?? 0) + 0.06 * Math.sin(t * 0.7 + m.seed);
  for (const [centro, intensidad] of m.brotes) r += intensidad * Math.exp(-((t - centro) ** 2) / 32);
  return r;
}

function senal(m, t) {
  return umbral(m, t) * (1 + 0.16 * riesgo(m, t));
}

function casosObservados(m, t) {
  return senal(m, t) * (1 + 0.025 * noise(m, 1)[t]);
}

function lluvia(m, t) {
  const v = m.lluviaBase * (1 + 0.55 * Math.cos((TWO_PI * (t - m.picoLluvia)) / 26));
  return v * (1 + 0.08 * noise(m, 2)[t]);
}

function temperatura(m, t) {
  return m.tempBase + 0.9 * Math.cos((TWO_PI * (t - m.picoTemp)) / 52) + 0.12 * noise(m, 3)[t];
}

// Predicción a FORECAST_WEEKS semanas: arranca en el último dato observado y converge a la señal del modelo.
function prediccion(m, semana) {
  const ultimo = casosObservados(m, semana);
  const desvio = ultimo - senal(m, semana);
  return Array.from({ length: FORECAST_WEEKS + 1 }, (_, k) =>
    k === 0 ? ultimo : senal(m, semana + k) + desvio * Math.max(0, 1 - k / 3),
  );
}

// `ratio` es el pico de la predicción frente al umbral (> 1 significa exceso).
export function estado(zonaId, fechaISO) {
  const m = getZona(zonaId);
  const semana = weekFromISO(fechaISO);
  const pred = prediccion(m, semana);
  const ratio = Math.max(...pred.slice(1).map((v, k) => v / umbral(m, semana + k + 1)));
  return { exceso: ratio > 1, ratio, casos: pred[0], umbral: umbral(m, semana) };
}

export function estadosEn(fechaISO) {
  return new Map([...ZONAS.keys()].map((id) => [id, estado(id, fechaISO)]));
}

export function serieVentana(zonaId, fechaISO) {
  const m = getZona(zonaId);
  const semana = weekFromISO(fechaISO);
  const pred = prediccion(m, semana);
  const inicio = semana - HISTORY_WEEKS;

  return Array.from({ length: WINDOW_WEEKS }, (_, i) => {
    const t = inicio + i;
    const u = umbral(m, t);
    const observado = t <= semana;
    const casos = observado ? casosObservados(m, t) : null;
    const k = t - semana;
    return {
      i,
      t,
      fecha: isoFromWeek(t),
      semana: weekLabel(t),
      bandaBaja: u * 0.79,
      bandaAlta: u * 0.9,
      umbral: u,
      casos,
      pred: k >= 0 && k <= FORECAST_WEEKS ? pred[k] : null,
      lluvia: lluvia(m, t),
      temperatura: temperatura(m, t),
      exceso: observado && casos > u,
    };
  });
}
