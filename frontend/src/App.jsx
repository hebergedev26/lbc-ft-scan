import { useEffect, useState, useCallback } from 'react';
import SearchBar from './components/SearchBar.jsx';
import ClientProfile from './components/ClientProfile.jsx';
import AlertBanner from './components/AlertBanner.jsx';
import AlertHistory from './components/AlertHistory.jsx';
import StatsCards from './components/StatsCards.jsx';
import { searchClient, getStats, getAlertHistory, hydrateCache, isApiReachable, getSyncErrors, resetLocalState } from './services/api.js';
import { clearCache } from './services/offline.js';

function formatFcfa(n) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
}

export default function App() {
  const [online, setOnline] = useState(navigator.onLine);
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState(null);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [searched, setSearched] = useState(false);
  const [cacheReady, setCacheReady] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const refreshStats = useCallback(async () => {
    const { stats: s } = await getStats();
    setStats(s);
  }, []);

  const sync = useCallback(async () => {
    setSyncing(true);
    await hydrateCache();
    setCacheReady(true);
    setSyncing(false);
    refreshStats();
  }, [refreshStats]);

  useEffect(() => {
    const on = () => {
      setOnline(true);
      sync();
    };
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, [sync]);

  useEffect(() => {
    sync();
  }, [sync]);

  const apiReachable = isApiReachable();
  const syncErrors = getSyncErrors();

  const resetAndReload = async () => {
    setSyncing(true);
    try {
      await clearCache();
    } catch {}
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
      }
    }
    resetLocalState();
    location.reload();
  };

  useEffect(() => {
    refreshStats();
    getAlertHistory().then(({ alerts }) => setHistory(alerts));
  }, [refreshStats]);

  const handleSearch = async (name, dob) => {
    setSearching(true);
    setSearched(true);
    const t0 = performance.now();
    const res = await searchClient(name, dob);
    const elapsed = res.offline ? res.timeMs : Math.round(performance.now() - t0);
    res.timeMs = elapsed;
    setResult(res);
    setSearching(false);
    refreshStats();
    getAlertHistory().then(({ alerts }) => setHistory(alerts));
  };

  const topAlert = result?.alerts?.[0];
  const overall = !result
    ? null
    : topAlert?.niveau === 'bloquant'
      ? 'bloquant'
      : topAlert?.niveau === 'informatif'
        ? 'informatif'
        : 'ok';

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <img src="/icon.svg" alt="" width="34" height="34" />
            <div>
              <div className="brand-name">LBC-FT-Scan</div>
              <div className="brand-sub">Conformité LBC/FT/FP · IMF</div>
            </div>
          </div>
          <div className="topbar-right">
            <span className={`status-pill ${online ? 'on' : 'off'}`}>
              <span className="dot" />
              {online ? 'En ligne' : 'Hors ligne'}
            </span>
            {cacheReady && <span className="status-pill neutral">Cache local OK</span>}
          </div>
        </div>
      </header>

      <main className="main">
        <section className="hero">
          <h1>Scan de conformité client</h1>
          <p className="hero-sub">
            Filtrer les listes de sanctions (ONU · UE · BCEAO), détecter les personnes politiquement exposées
            et consulter le solde consolidé du client — même sans connexion.
          </p>
          <SearchBar onSearch={handleSearch} disabled={searching} />
          {apiReachable === false && (
            <div className="banner banner-neutral">
              <span>
                API inaccessible — le mode local (cache) est actif. Les données restent disponibles pour la
                recherche hors ligne.{' '}
                <button className="btn-link" onClick={sync} disabled={syncing}>
                  {syncing ? 'Synchronisation…' : 'Réessayer la connexion'}
                </button>
                <button className="btn-link" onClick={resetAndReload}>
                  Vider le cache et recharger
                </button>
                {syncErrors.length > 0 && (
                  <div className="sync-errors">
                    {[...new Set(syncErrors)].slice(0, 4).map((e) => (
                      <div key={e}>· {e}</div>
                    ))}
                  </div>
                )}
              </span>
            </div>
          )}
          {searching && <div className="banner banner-neutral">Analyse en cours…</div>}
        </section>

        <StatsCards stats={stats} formatFcfa={formatFcfa} />

        {result && !searching && (
          <>
            <div className="result-header">
              <span className="result-label">
                Résultat pour « <strong>{result.query.name}</strong>
                {result.query.dob ? ` · ${result.query.dob}` : ''} »
              </span>
              <span className={`result-time ${result.offline ? 'offline' : ''}`}>
                {result.offline ? '⚡ Mode hors ligne (cache)' : `⚡ ${result.timeMs} ms`}
              </span>
            </div>

            {overall === 'bloquant' && (
              <AlertBanner
                niveau="bloquant"
                titre="Client bloqué — Interdiction d'ouverture de compte"
                message="Correspondance forte avec une liste de sanctions terroriste ou financière. Refusez toute opération et déclarez à la cellule LBC/FT."
              />
            )}
            {overall === 'informatif' && (
              <AlertBanner
                niveau="informatif"
                titre="Client à surveiller — Personne Politiquement Exposée ou correspondance partielle"
                message="Une vigilance renforcée s'impose. Appliquez les mesures de contrôle renforcé et documentez le dossier."
              />
            )}
            {overall === 'ok' && (
              <AlertBanner
                niveau="ok"
                titre="Aucune correspondance trouvée"
                message="Le client ne figure pas dans les listes de sanctions ou de personnes exposées. Vous pouvez poursuivre l'ouverture du dossier."
              />
            )}

            {result.alerts?.length > 0 && (
              <div className="alerts-list">
                <h3>Détail des correspondances ({result.alerts.length})</h3>
                {result.alerts.map((a, i) => (
                  <AlertBanner key={i} niveau={a.niveau} compact alerte={a} />
                ))}
              </div>
            )}

            {result.clients?.length > 0 ? (
              <div className="profiles">
                {result.clients.map((c) => (
                  <ClientProfile key={c.id} summary={c} formatFcfa={formatFcfa} />
                ))}
              </div>
            ) : (
              searched && (
                <div className="banner banner-neutral">
                  Aucun client trouvé dans la base de l'IMF pour ce nom.
                </div>
              )
            )}
          </>
        )}

        <AlertHistory history={history} formatFcfa={formatFcfa} />
      </main>

      <footer className="footer">
        Prototype Hackathon — Thématique 01 · Conformité LBC/FT/FP · Données 100% fictives à des fins de démonstration.
      </footer>
    </div>
  );
}
