import { useEffect, useState } from 'react';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import PanelView from './components/PanelView.jsx';
import ModeloView from './components/ModeloView.jsx';
import { DEFAULT_DATE, DEFAULT_MUNICIPIO, getZona } from './data.js';

const TABS = ['panel', 'modelo'];

function tabFromHash() {
  const hash = window.location.hash.replace('#', '');
  return TABS.includes(hash) ? hash : 'panel';
}

export default function App() {
  const [tab, setTab] = useState(tabFromHash);
  const [municipioId, setMunicipioId] = useState(DEFAULT_MUNICIPIO);
  const [barrioId, setBarrioId] = useState(null);
  const [fecha, setFecha] = useState(DEFAULT_DATE);

  useEffect(() => {
    const onHashChange = () => {
      setTab(tabFromHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const goTo = (next) => {
    window.location.hash = next;
  };

  const selectMunicipio = (id) => {
    setMunicipioId(id);
    setBarrioId(null);
  };

  const selectBarrio = (id) => {
    setMunicipioId(getZona(id).municipioId);
    setBarrioId(id);
  };

  return (
    <div className="app">
      <Header tab={tab} onTabChange={goTo} />
      <main className="container main">
        {tab === 'panel' ? (
          <PanelView
            municipioId={municipioId}
            barrioId={barrioId}
            onMunicipioChange={selectMunicipio}
            onBarrioChange={selectBarrio}
            fecha={fecha}
            onFechaChange={setFecha}
            onVerModelo={() => goTo('modelo')}
          />
        ) : (
          <ModeloView onVerPanel={() => goTo('panel')} />
        )}
      </main>
      <Footer />
    </div>
  );
}
