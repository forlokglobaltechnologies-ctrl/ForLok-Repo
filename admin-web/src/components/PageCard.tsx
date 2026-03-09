export default function PageCard({
  title,
  subtitle,
  actions,
  children,
}: {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="page-card rounded p-4 mb-4">
      {title || subtitle || actions ? (
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            {title ? <h6 className="mb-1">{title}</h6> : null}
            {subtitle ? <small className="text-muted">{subtitle}</small> : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </div>
  );
}
