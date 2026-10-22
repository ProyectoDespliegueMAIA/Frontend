const TABS = [
  { id: 'panel', label: 'Panel' },
  { id: 'modelo', label: 'Modelo y datos' },
];

function Logo() {
  return (
    <svg className="brand__logo" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M7 17h4.2l2.6-6 4.4 11 2.8-7H25"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Header({ tab, onTabChange }) {
  return (
    <header className="topbar">
      <div className="container topbar__row">
        <div className="brand">
          <Logo />
          <div>
            <div className="brand__title">Alerta Dengue</div>
            <div className="brand__subtitle">Alerta temprana de exceso de casos por municipio</div>
          </div>
        </div>
        <div className="topbar__note">Maqueta · datos ilustrativos</div>
      </div>

      <nav className="container tabs" role="tablist" aria-label="Secciones">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`tab${tab === t.id ? ' tab--active' : ''}`}
            onClick={() => onTabChange(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
