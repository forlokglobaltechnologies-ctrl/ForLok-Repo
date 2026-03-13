export default function KpiCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: string;
}) {
  return (
    <div className="col-sm-6 col-xl-3">
      <div className="dashboard-kpi-card h-100">
        <div className="dashboard-kpi-glow dashboard-kpi-glow-lg"></div>
        <div className="dashboard-kpi-glow dashboard-kpi-glow-sm"></div>
        <div className="dashboard-kpi-top">
          <div className="dashboard-kpi-icon-wrap">
            <i className={`${icon} dashboard-kpi-icon`}></i>
          </div>
          <span className="dashboard-kpi-pill">Live</span>
        </div>
        <div className="dashboard-kpi-body">
          <p className="dashboard-kpi-title mb-2">{title}</p>
          <h3 className="dashboard-kpi-value mb-1">{value}</h3>
          <div className="dashboard-kpi-meta">
            <span className="dashboard-kpi-dot"></span>
            <span>Updated from latest stats</span>
          </div>
        </div>
      </div>
    </div>
  );
}
