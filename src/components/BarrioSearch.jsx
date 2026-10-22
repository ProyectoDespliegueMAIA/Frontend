import { useId, useMemo, useState } from 'react';
import { BARRIOS, getZona } from '../data.js';

const normalize = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const INDEX = BARRIOS.map((b) => ({ barrio: b, key: normalize(`${b.nombre} ${b.comuna}`) }));

export default function BarrioSearch({ onSelect }) {
  const listId = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    if (q.length < 2) return [];
    return INDEX.filter((item) => item.key.includes(q))
      .slice(0, 8)
      .map((item) => item.barrio);
  }, [query]);

  const choose = (barrio) => {
    onSelect(barrio.id);
    setQuery('');
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const expanded = open && results.length > 0;

  return (
    <div className="search">
      <svg className="search__icon" viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
        <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="m10.5 10.5 3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        className="search__input"
        placeholder="Buscar barrio o comuna"
        role="combobox"
        aria-label="Buscar barrio o comuna"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded ? `${listId}-${active}` : undefined}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      {expanded && (
        <ul className="search__results" id={listId} role="listbox">
          {results.map((b, i) => (
            <li
              key={b.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={`search__option${i === active ? ' is-active' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(b);
              }}
              onMouseMove={(e) => (e.movementX || e.movementY) && setActive(i)}
            >
              <span className="search__name">{b.nombre}</span>
              <span className="search__meta">
                {b.comuna} · {getZona(b.municipioId).nombre}
              </span>
            </li>
          ))}
        </ul>
      )}
      {open && query.trim().length >= 2 && results.length === 0 && (
        <div className="search__results search__empty">Sin resultados</div>
      )}
    </div>
  );
}
