import { useEffect, useMemo, useState } from 'react';
import MapaColombia from './MapaColombia.jsx';
import BarrioSearch from './BarrioSearch.jsx';
import EvolutionCharts from './EvolutionCharts.jsx';
import {
  MAX_DATE,
  MIN_DATE,
  MUNICIPIOS,
  barriosDe,
  estadosEn,
  getMunicipio,
  getZona,
  isDateLoaded,
  serieVentana,
} from '../data.js';

const MENSAJES = {
  exceso: {
    titulo: 'Exceso esperado',
    texto: 'Se prevé que los casos superen el umbral en las próximas semanas. Reforzar la vigilancia y las acciones de control.',
  },
  normal: {
    titulo: 'Sin exceso esperado',
    texto: 'Se prevé que los casos se mantengan dentro del rango normal. Continuar con la vigilancia regular.',
  },
};

function FechaField({ fecha, onChange }) {
  const [draft, setDraft] = useState(fecha);
  useEffect(() => setDraft(fecha), [fecha]);
  const invalid = draft !== fecha && !isDateLoaded(draft);

  return (
    <div className="field">
      <label className="field__label" htmlFor="fecha">
        Fecha de la predicción
      </label>
      <input
        id="fecha"
        type="date"
        className="input"
        min={MIN_DATE}
        max={MAX_DATE}
        value={draft}
        aria-invalid={invalid}
        onChange={(e) => {
          setDraft(e.target.value);
          if (isDateLoaded(e.target.value)) onChange(e.target.value);
        }}
        onBlur={() => setDraft(fecha)}
      />
      <p className={`field__hint${invalid ? ' field__hint--error' : ''}`}>Solo fechas con datos cargados.</p>
    </div>
  );
}

function BarriosEnAlerta({ municipio, estados, barrioId, onSelect }) {
  const barrios = barriosDe(municipio.id);
  const enAlerta = barrios
    .map((b) => ({ barrio: b, estado: estados.get(b.id) }))
    .filter((x) => x.estado.exceso)
    .sort((a, b) => b.estado.ratio - a.estado.ratio);

  return (
    <section className="card alerts">
      <h2 className="card__title card__title--tight">Barrios con exceso esperado</h2>
      <p className="card__subtitle">
        <strong className="alerts__count">{enAlerta.length}</strong> de {barrios.length} barrios de {municipio.nombre}
      </p>
      <div className="alerts__body">
        {enAlerta.length === 0 ? (
          <p className="alerts__empty">Ningún barrio con exceso esperado para esta fecha.</p>
        ) : (
          <ul className="alerts__list">
            {enAlerta.map(({ barrio, estado }) => (
              <li key={barrio.id}>
                <button
                  type="button"
                  className={`alerts__item${barrio.id === barrioId ? ' is-selected' : ''}`}
                  onClick={() => onSelect(barrio.id)}
                >
                  <span className="alerts__name">{barrio.nombre}</span>
                  <span className="alerts__meta">{barrio.comuna}</span>
                  <span className="alerts__ratio">+{Math.round((estado.ratio - 1) * 100)} %</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default function PanelView({
  municipioId,
  barrioId,
  onMunicipioChange,
  onBarrioChange,
  fecha,
  onFechaChange,
  onVerModelo,
}) {
  const municipio = getMunicipio(municipioId);
  const zona = barrioId ? getZona(barrioId) : municipio;
  const estados = useMemo(() => estadosEn(fecha), [fecha]);
  const serie = useMemo(() => serieVentana(zona.id, fecha), [zona.id, fecha]);
  const { exceso } = estados.get(zona.id);
  const mensaje = exceso ? MENSAJES.exceso : MENSAJES.normal;

  const verEvolucion = () => document.getElementById('evolucion')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="panel">
      <div className="panel-top">
        <section className="card map-card">
          <div className="map-card__head">
            <h2 className="card__title">1. Elige un municipio</h2>
            <select
              id="municipio"
              aria-label="Municipio"
              className="input select map-card__select"
              value={municipioId}
              onChange={(e) => onMunicipioChange(e.target.value)}
            >
              {MUNICIPIOS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre} · {m.depto}
                </option>
              ))}
            </select>
          </div>

          <MapaColombia
            municipioId={municipioId}
            barrioId={barrioId}
            estados={estados}
            onSelectMunicipio={onMunicipioChange}
            onSelectBarrio={onBarrioChange}
            onVerEvolucion={verEvolucion}
          >
            <BarrioSearch onSelect={onBarrioChange} />
          </MapaColombia>

          <div className="legend legend--map">
            <span className="legend__item">
              <span className="dot dot--red" /> Exceso esperado
            </span>
            <span className="legend__item">
              <span className="dot dot--teal" /> Sin exceso
            </span>
            <span className="legend__item">
              <span className="dot dot--cluster" /> Grupo de barrios (clic para acercar)
            </span>
            <span className="legend__item">
              <span className="line line--comuna" /> Límite de comuna
            </span>
          </div>
        </section>

        <div className="panel-side">
          <section className="card prediction" aria-live="polite">
            <h2 className="card__title prediction__title">2. Predicción para {zona.nombre}</h2>
            {barrioId && (
              <p className="prediction__context">
                {zona.comuna} · {municipio.nombre}{' '}
                <button type="button" className="link-button" onClick={() => onMunicipioChange(municipio.id)}>
                  Ver todo {municipio.nombre}
                </button>
              </p>
            )}
            <p className={`prediction__status${exceso ? ' prediction__status--alert' : ''}`}>{mensaje.titulo}</p>
            <p className="prediction__text">{mensaje.texto}</p>
            <FechaField fecha={fecha} onChange={onFechaChange} />
          </section>

          <BarriosEnAlerta municipio={municipio} estados={estados} barrioId={barrioId} onSelect={onBarrioChange} />
        </div>
      </div>

      <section className="card" id="evolucion">
        <h2 className="card__title card__title--tight">
          3. Cómo ha evolucionado {barrioId ? `${zona.nombre} (${municipio.nombre})` : municipio.nombre}
        </h2>
        <p className="card__subtitle">Las franjas rojas son épocas de alto riesgo: los casos superaron el umbral.</p>
        <EvolutionCharts serie={serie} exceso={exceso} />
      </section>

      <div className="callout">
        <span>¿Cómo se calcula esta predicción?</span>
        <a
          href="#modelo"
          className="link"
          onClick={(e) => {
            e.preventDefault();
            onVerModelo();
          }}
        >
          Ver modelo y datos →
        </a>
      </div>
    </div>
  );
}
