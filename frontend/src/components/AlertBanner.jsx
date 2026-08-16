const NIVEAUX = {
  bloquant: { label: 'ALERTE BLOQUANTE', cls: 'banner-block' },
  informatif: { label: 'ALERTE INFORMATIVE', cls: 'banner-info' },
  ok: { label: 'CONFORME', cls: 'banner-ok' },
};

export default function AlertBanner({ niveau, titre, message, compact, alerte }) {
  const n = NIVEAUX[niveau] || NIVEAUX.ok;
  return (
    <div className={`banner ${n.cls}${compact ? ' compact' : ''}`}>
      <span className="banner-icon">
        {niveau === 'bloquant' ? '⛔' : niveau === 'informatif' ? '⚠️' : '✅'}
      </span>
      <div className="banner-body">
        <div className="banner-title">{titre || n.label}</div>
        {message && <div className="banner-msg">{message}</div>}
        {compact && alerte && (
          <div className="banner-msg">
            <strong>{alerte.prenom} {alerte.nom}</strong> · Liste {alerte.liste} ·{' '}
            <span className="score">{alerte.score}%</span> de correspondance
            {alerte.motif ? ` — ${alerte.motif}` : ''}
            {alerte.reference ? ` · Ref. ${alerte.reference}` : ''}
          </div>
        )}
      </div>
    </div>
  );
}
