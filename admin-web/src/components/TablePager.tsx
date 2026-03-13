export default function TablePager({
  page,
  total,
  onPage,
}: {
  page: number;
  total: number;
  onPage: (next: number) => void;
}) {
  const safeTotal = Math.max(total, 1);
  const pages = Array.from({ length: safeTotal }, (_, i) => i + 1);
  const visiblePages = pages.filter((p) => p === 1 || p === safeTotal || Math.abs(p - page) <= 1);
  const withEllipsis: Array<number | 'dots'> = [];
  visiblePages.forEach((p, idx) => {
    withEllipsis.push(p);
    const next = visiblePages[idx + 1];
    if (next && next - p > 1) withEllipsis.push('dots');
  });

  return (
    <div className="table-pager d-flex flex-wrap justify-content-between align-items-center">
      <span className="small text-body-secondary">
        Page {page} of {safeTotal}
      </span>
      <div className="d-flex align-items-center gap-1">
        <button className="pager-btn" disabled={page <= 1} onClick={() => onPage(1)} aria-label="First page">
          <i className="bi bi-chevron-double-left"></i>
        </button>
        <button className="pager-btn" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <i className="bi bi-chevron-left"></i>
        </button>
        {withEllipsis.map((entry, idx) =>
          entry === 'dots' ? (
            <span key={`dots-${idx}`} className="pager-dots">
              ...
            </span>
          ) : (
            <button
              key={entry}
              className={`pager-btn ${entry === page ? 'active' : ''}`}
              onClick={() => onPage(entry)}
              aria-label={`Page ${entry}`}
            >
              {entry}
            </button>
          )
        )}
        <button className="pager-btn" disabled={page >= safeTotal} onClick={() => onPage(page + 1)} aria-label="Next page">
          <i className="bi bi-chevron-right"></i>
        </button>
        <button className="pager-btn" disabled={page >= safeTotal} onClick={() => onPage(safeTotal)} aria-label="Last page">
          <i className="bi bi-chevron-double-right"></i>
        </button>
      </div>
    </div>
  );
}
