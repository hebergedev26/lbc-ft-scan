export default function AlertHistory({ history }) {
  return (
    <section className="section">
      <h2>Historique des alertes</h2>
      {history.length === 0 ? (
        <div className="banner banner-neutral">Aucune alerte enregistrée pour l'instant. Lancez une recherche pour démarrer.</div>
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Recherche</th>
                <th>Correspondance</th>
                <th>Niveau</th>
                <th className="num">Score</th>
                <th>Liste</th>
                <th>Référence</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td className="mono">{new Date(h.date_creation).toLocaleString('fr-FR')}</td>
                  <td>{h.nom}{h.date_naissance ? ` (${h.date_naissance})` : ''}</td>
                  <td>{h.nom_match}</td>
                  <td>
                    <span className={`badge ${h.niveau === 'bloquant' ? 'badge-red' : h.niveau === 'informatif' ? 'badge-orange' : 'badge-gray'}`}>
                      {h.niveau}
                    </span>
                  </td>
                  <td className="num">{h.score}%</td>
                  <td>{h.liste}</td>
                  <td className="mono">{h.reference || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
