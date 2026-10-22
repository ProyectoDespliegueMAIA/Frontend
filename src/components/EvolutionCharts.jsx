import { useLayoutEffect, useRef, useState } from 'react';
import { FORECAST_WEEKS, HISTORY_WEEKS, formatDate } from '../data.js';

const INSET = 8;
const CASES_H = 88;
const MINI_H = 48;
const SELECTED = HISTORY_WEEKS;

function useWidth(ref) {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    setWidth(el.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

const round = (v) => Math.round(v * 10) / 10;

// Catmull-Rom convertido a curvas Bézier para trazos suaves.
function curve(points) {
  let d = '';
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${round(c1[0])},${round(c1[1])} ${round(c2[0])},${round(c2[1])} ${round(p2[0])},${round(p2[1])}`;
  }
  return d;
}

function linePath(points) {
  if (points.length === 0) return '';
  return `M${round(points[0][0])},${round(points[0][1])}${curve(points)}`;
}

function areaPath(top, bottom) {
  const back = [...bottom].reverse();
  return `${linePath(top)} L${round(back[0][0])},${round(back[0][1])}${curve(back)} Z`;
}

function linearScale([d0, d1], [r0, r1]) {
  return (v) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
}

function paddedDomain(values, padBottom, padTop) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return [min - range * padBottom, max + range * padTop];
}

function riskRuns(serie) {
  const runs = [];
  for (const p of serie) {
    if (!p.exceso) continue;
    const last = runs[runs.length - 1];
    if (last && last[1] === p.i - 1) last[1] = p.i;
    else runs.push([p.i, p.i]);
  }
  return runs;
}

function RiskBands({ runs, x, height }) {
  return runs.map(([a, b]) => {
    const x0 = Math.max(INSET, x(a - 0.5));
    const x1 = Math.min(x(SELECTED), x(b + 0.5));
    return <rect key={a} x={x0} y={0} width={Math.max(0, x1 - x0)} height={height} fill="var(--risk)" />;
  });
}

function Baseline({ width, y }) {
  return <line x1={INSET} x2={width - INSET} y1={y + 0.5} y2={y + 0.5} stroke="var(--axis)" strokeWidth="1" />;
}

function HoverGuide({ x, height }) {
  return <line x1={x} x2={x} y1={0} y2={height} stroke="var(--guide)" strokeWidth="1" strokeDasharray="2 2" />;
}

function CasesChart({ serie, width, x, runs, exceso, hover, hoverProps }) {
  const values = serie
    .flatMap((p) => [p.bandaBaja, p.bandaAlta, p.umbral, p.casos, p.pred])
    .filter((v) => v != null);
  const y = linearScale(paddedDomain(values, 0.22, 0.45), [CASES_H, 0]);
  const points = (key) => serie.filter((p) => p[key] != null).map((p) => [x(p.i), y(p[key])]);

  const xSel = x(SELECTED);
  const xForecastEnd = x(Math.min(SELECTED + FORECAST_WEEKS, serie.length - 1));
  const hovered = hover != null ? serie[hover] : null;
  const hoveredValue = hovered ? (hovered.casos ?? hovered.pred) : null;

  return (
    <svg className="chart" width={width} height={CASES_H + 20} {...hoverProps}>
      <RiskBands runs={runs} x={x} height={CASES_H} />
      <rect
        x={xSel}
        y={0}
        width={xForecastEnd - xSel}
        height={CASES_H}
        fill={exceso ? 'var(--risk)' : 'var(--forecast)'}
      />
      <path d={areaPath(points('bandaAlta'), points('bandaBaja'))} fill="var(--band)" />
      <path d={linePath(points('umbral'))} fill="none" stroke="var(--threshold)" strokeWidth="1.5" strokeDasharray="5 4" />
      <path d={linePath(points('casos'))} fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
      <path d={linePath(points('pred'))} fill="none" stroke="var(--teal-dark)" strokeWidth="2.5" strokeDasharray="3 3" />
      <Baseline width={width} y={CASES_H} />

      <line x1={xSel} x2={xSel} y1={0} y2={CASES_H + 3} stroke="var(--ink)" strokeWidth="1" />
      <text
        className="chart__marker"
        x={Math.min(Math.max(xSel, 34), width - 34)}
        y={CASES_H + 15}
        textAnchor="middle"
      >
        Fecha elegida
      </text>

      {hovered && (
        <>
          <HoverGuide x={x(hover)} height={CASES_H} />
          {hoveredValue != null && (
            <circle cx={x(hover)} cy={y(hoveredValue)} r="3.5" fill="var(--ink)" stroke="#fff" strokeWidth="1.5" />
          )}
        </>
      )}
    </svg>
  );
}

function MiniChart({ values, color, padding, width, x, runs, hover, hoverProps }) {
  const y = linearScale(paddedDomain(values, ...padding), [MINI_H, 0]);
  const points = values.map((v, i) => [x(i), y(v)]);

  return (
    <svg className="chart" width={width} height={MINI_H + 1} {...hoverProps}>
      <RiskBands runs={runs} x={x} height={MINI_H} />
      <path d={linePath(points)} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Baseline width={width} y={MINI_H} />
      {hover != null && (
        <>
          <HoverGuide x={x(hover)} height={MINI_H} />
          <circle cx={points[hover][0]} cy={points[hover][1]} r="3.5" fill={color} stroke="#fff" strokeWidth="1.5" />
        </>
      )}
    </svg>
  );
}

function Legend() {
  return (
    <div className="legend legend--chart">
      <span className="legend__item">
        <span className="swatch" />
        Rango normal
      </span>
      <span className="legend__item">
        <svg width="18" height="6" aria-hidden="true">
          <line x1="0" y1="3" x2="18" y2="3" stroke="var(--threshold)" strokeWidth="1.5" strokeDasharray="4 3" />
        </svg>
        Umbral
      </span>
      <span className="legend__item">
        <svg width="18" height="6" aria-hidden="true">
          <line x1="0" y1="3" x2="18" y2="3" stroke="var(--ink)" strokeWidth="2" />
        </svg>
        Casos reales
      </span>
      <span className="legend__item">
        <svg width="18" height="6" aria-hidden="true">
          <line x1="0" y1="3" x2="18" y2="3" stroke="var(--teal-dark)" strokeWidth="2.5" strokeDasharray="3 3" />
        </svg>
        Predicción
      </span>
    </div>
  );
}

function Tooltip({ point, x, width }) {
  const flip = x > width - 190;
  const value = point.casos ?? point.pred;
  return (
    <div className="tooltip" style={flip ? { right: width - x + 12 } : { left: x + 12 }}>
      <div className="tooltip__head">
        <strong>{point.semana}</strong>
        <span>{formatDate(point.fecha)}</span>
      </div>
      <dl>
        <div>
          <dt>{point.casos != null ? 'Casos reales' : 'Predicción'}</dt>
          <dd>{value != null ? Math.round(value) : '—'}</dd>
        </div>
        <div>
          <dt>Umbral</dt>
          <dd>{Math.round(point.umbral)}</dd>
        </div>
        <div>
          <dt>Lluvia</dt>
          <dd>{Math.round(point.lluvia)} mm</dd>
        </div>
        <div>
          <dt>Temperatura</dt>
          <dd>{point.temperatura.toFixed(1)} °C</dd>
        </div>
      </dl>
    </div>
  );
}

export default function EvolutionCharts({ serie, exceso }) {
  const ref = useRef(null);
  const width = useWidth(ref);
  const [hover, setHover] = useState(null);

  const n = serie.length;
  const step = (width - 2 * INSET) / (n - 1);
  const x = (i) => INSET + i * step;
  const runs = riskRuns(serie);
  const ticks = [
    [0, 'start'],
    [Math.floor(n / 2) - 1, 'middle'],
    [n - 1, 'end'],
  ];

  const hoverProps = {
    onPointerMove: (e) => {
      const i = Math.round((e.clientX - e.currentTarget.getBoundingClientRect().left - INSET) / step);
      setHover(Math.max(0, Math.min(n - 1, i)));
    },
    onPointerLeave: () => setHover(null),
  };
  const shared = { width, x, runs, hover, hoverProps };

  return (
    <div ref={ref} className="charts">
      {width > 0 && (
        <>
          <h3 className="chart__label">Casos por semana</h3>
          <div className="chart__wrap">
            <CasesChart serie={serie} exceso={exceso} {...shared} />
            {hover != null && <Tooltip point={serie[hover]} x={x(hover)} width={width} />}
          </div>
          <Legend />

          <h3 className="chart__label">Lluvia</h3>
          <MiniChart values={serie.map((p) => p.lluvia)} color="var(--rain)" padding={[0.15, 0.45]} {...shared} />

          <h3 className="chart__label">Temperatura</h3>
          <MiniChart values={serie.map((p) => p.temperatura)} color="var(--temp)" padding={[1.6, 2.2]} {...shared} />

          <div className="chart__axis">
            {ticks.map(([i, align]) => (
              <span key={align} className={`chart__tick chart__tick--${align}`} style={{ left: x(i) }}>
                {serie[i].semana}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
