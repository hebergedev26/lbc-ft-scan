import { useEffect, useState } from 'react';
import { getClientProfile } from '../services/api.js';

const NIVEAU_LABEL = {
  fort: 'Correspondance forte',
  probable: 'Correspondance probable',
  faible: 'Correspondance faible',
};

export default function ClientProfile({ summary, formatFcfa }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getClientProfile(summary.id).then(({ client }) => {
      if (active) {
        setData(client);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [summary.id]);

  if (loading) return <div className="card profile-card">Chargement du profil…</div>;
  if (!data) return null;

  return (
    <div className="card profile-card">
      <div className="profile-head">
        <div className="avatar">{data.prenom?.[0]}{data.nom?.[0]}</div>
        <div>
          <div className="profile-name">
            {data.prenom} {data.nom}
            <span className="tag tag-blue">Score {summary.score}%</span>
            <span className="tag tag-muted">{NIVEAU_LABEL[summary.niveau] || summary.niveau}</span>
          </div>
          <div className="profile-meta">
            ID {data.id} · Né(e) le {data.date_naissance} · {data.sexe === 'M' ? 'M.' : 'Mme'} · {data.profession}
          </div>
          <div className="profile-meta">
            {data.telephone} · {data.adresse}
          </div>
        </div>
      </div>

      <div className="balance-box">
        <div className="balance-label">Solde global consolidé</div>
        <div className="balance-value">{formatFcfa(data.totalSolde)}</div>
        <div className="balance-sub">
          {data.nbComptes} compte{data.nbComptes > 1 ? 's' : ''} au total ·{' '}
          {data.sexe === 'M' ? 'M.' : 'Mme'} {data.nom} possède {data.nbComptes} compte{data.nbComptes > 1 ? 's' : ''}
        </div>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>N° compte</th>
            <th>Type</th>
            <th>Ouverture</th>
            <th>Statut</th>
            <th className="num">Solde</th>
          </tr>
        </thead>
        <tbody>
          {data.comptes.map((a) => (
            <tr key={a.numero}>
              <td className="mono">{a.numero}</td>
              <td>{a.type}</td>
              <td>{a.date_ouverture}</td>
              <td>
                <span className={`badge ${a.statut === 'actif' ? 'badge-green' : 'badge-gray'}`}>{a.statut}</span>
              </td>
              <td className={`num ${a.solde < 0 ? 'neg' : ''}`}>{formatFcfa(a.solde)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
