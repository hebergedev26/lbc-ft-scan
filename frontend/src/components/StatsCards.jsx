export default function StatsCards({ stats, formatFcfa }) {
  if (!stats) return null;
  return (
    <section className="stats">
      <div className="stat-card">
        <div className="stat-label">Clients en base</div>
        <div className="stat-value">{stats.totalClients}</div>
        <div className="stat-sub">{stats.totalComptes} comptes</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Encours total</div>
        <div className="stat-value">{formatFcfa(stats.totalSolde)}</div>
        <div className="stat-sub">tous clients confondus</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Listes intégrées</div>
        <div className="stat-value">{stats.sanctions}</div>
        <div className="stat-sub">sanctions (ONU / UE / BCEAO) + {stats.ppe} PPE</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Alertes déclenchées</div>
        <div className="stat-value">{stats.alertes}</div>
        <div className="stat-sub">depuis le début de la démo</div>
      </div>
    </section>
  );
}
