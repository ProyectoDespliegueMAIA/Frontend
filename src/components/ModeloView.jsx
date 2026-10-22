import { useState } from 'react';

const COLUMNAS = ['Municipio', 'Semana epidemiológica', 'Casos', '[Variable 1]', '[Variable 2]'];
const OBLIGATORIAS = COLUMNAS.slice(0, 3);

async function descargarFormato() {
  const XLSX = await import('xlsx');
  const hoja = XLSX.utils.aoa_to_sheet([COLUMNAS]);
  hoja['!cols'] = COLUMNAS.map((c) => ({ wch: Math.max(14, c.length + 4) }));
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Datos');
  XLSX.writeFile(libro, 'formato-alerta-dengue.xlsx');
}

async function leerArchivo(file) {
  const XLSX = await import('xlsx');
  const libro = XLSX.read(await file.arrayBuffer());
  const filas = XLSX.utils.sheet_to_json(libro.Sheets[libro.SheetNames[0]], { header: 1, blankrows: false });
  const encabezado = (filas[0] ?? []).map((c) => String(c).trim());
  const faltantes = OBLIGATORIAS.filter((c) => !encabezado.includes(c));
  return { faltantes, filas: Math.max(0, filas.length - 1) };
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M8 2v8m0 0L4.5 6.5M8 10l3.5-3.5M3 13.5h10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ModeloView({ onVerPanel }) {
  const [archivo, setArchivo] = useState(null);

  const onArchivo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return setArchivo(null);
    try {
      const { faltantes, filas } = await leerArchivo(file);
      setArchivo({
        nombre: file.name,
        ok: faltantes.length === 0,
        texto: faltantes.length
          ? `Faltan columnas: ${faltantes.join(', ')}.`
          : `${filas} ${filas === 1 ? 'fila lista' : 'filas listas'} para predecir.`,
      });
    } catch {
      setArchivo({ nombre: file.name, ok: false, texto: 'No se pudo leer el archivo. Usa el formato .xlsx descargado.' });
    }
  };

  return (
    <div className="modelo">
      <h1 className="page-title">Modelo y datos</h1>
      <p className="page-subtitle">Qué hay detrás de la predicción y cómo usar tus propios datos.</p>

      <div className="modelo-grid">
        <section className="card">
          <h2 className="card__title">Cómo funciona</h2>

          <h3 className="info__label">Herramienta</h3>
          <div className="code-box">[Algoritmo del equipo]</div>
          <p className="info__caption">Un modelo distinto por municipio.</p>

          <h3 className="info__label">Qué es un exceso de casos</h3>
          <p className="info__text">
            Hay exceso cuando los casos de una semana superan el <strong>percentil 75</strong> del rango normal (canal
            endémico) de ese municipio: lo que ocurrió en las mismas semanas de años anteriores.
          </p>

          <h3 className="info__label">De dónde salen los datos</h3>
          <p className="info__text">
            Boletín epidemiológico semanal, ya cargado en la base. No se actualiza en tiempo real. Corte:{' '}
            <code className="mono">[fecha de corte]</code>
          </p>
        </section>

        <section className="card">
          <h2 className="card__title">Usar tus propios datos</h2>
          <p className="card__lead">Sube un periodo nuevo y consulta las predicciones sin tocar el código.</p>

          <h3 className="step__label">1. Descarga el formato</h3>
          <button type="button" className="btn btn--outline" onClick={descargarFormato}>
            <DownloadIcon />
            Descargar formato (.xlsx)
          </button>
          <div className="chips">
            {COLUMNAS.map((c) => (
              <span key={c} className="chip">
                {c}
              </span>
            ))}
          </div>

          <h3 className="step__label">2. Sube el archivo lleno</h3>
          <label className="file-picker">
            <input
              type="file"
              className="visually-hidden"
              accept=".xlsx,.xls,.csv"
              onChange={onArchivo}
              aria-describedby="archivo-estado"
            />
            <span className="file-picker__button">Seleccionar archivo</span>
            <span className="file-picker__name">{archivo?.nombre ?? 'Ningún archivo seleccionado'}</span>
          </label>
          {archivo && (
            <p id="archivo-estado" className={`file-status${archivo.ok ? '' : ' file-status--error'}`}>
              {archivo.texto}
            </p>
          )}

          <button type="button" className="btn btn--primary" onClick={onVerPanel}>
            3. Ver predicción en el Panel
          </button>
        </section>
      </div>
    </div>
  );
}
