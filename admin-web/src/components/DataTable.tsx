import type { ReactNode } from 'react';
import TablePager from './TablePager';

type Column = {
  key: string;
  label: string;
  render?: (row: any) => ReactNode;
};

export default function DataTable({
  columns,
  rows,
  emptyText = 'No data found',
  toolbarLeft,
  filter,
  pagination,
  header,
  tableMinHeight,
}: {
  columns: Column[];
  rows: any[];
  emptyText?: string;
  toolbarLeft?: ReactNode;
  filter?: {
    label?: string;
    value: string;
    options: Array<{ label: string; value: string }>;
    onChange: (value: string) => void;
  };
  pagination?: {
    page: number;
    total: number;
    onPage: (next: number) => void;
  };
  header?: {
    title: ReactNode;
    subtitle?: ReactNode;
    actions?: ReactNode;
  };
  tableMinHeight?: number;
}) {
  return (
    <div className="professional-table">
      {header ? (
        <div className="table-headline d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
          <div>
            <h5 className="mb-1">{header.title}</h5>
            {header.subtitle ? <p className="mb-0 small text-body-secondary">{header.subtitle}</p> : null}
          </div>
          <div className="d-flex gap-2">{header.actions}</div>
        </div>
      ) : null}
      {toolbarLeft || filter ? (
        <div className="table-toolbar d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div className="d-flex align-items-center gap-2 flex-grow-1">{toolbarLeft}</div>
          {filter ? (
            <div className="d-flex align-items-center gap-2">
              <label className="small text-body-secondary mb-0 d-flex align-items-center gap-1">
                <i className="bi bi-funnel"></i>
                {filter.label || 'Filter'}
              </label>
              <select
                className="form-select form-select-sm table-filter-select"
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
              >
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="table-responsive" style={tableMinHeight ? { minHeight: `${tableMinHeight}px` } : undefined}>
        <table className="table table-hover align-middle mb-0 professional-grid">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
            <tr className="table-empty-row">
              <td colSpan={columns.length} className="table-empty-cell text-center text-muted py-4">
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={row.id || row._id || row.adminId || row.roleId || index}>
                  {columns.map((column) => (
                    <td key={column.key}>{column.render ? column.render(row) : row[column.key] ?? '-'}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pagination ? <TablePager page={pagination.page} total={pagination.total} onPage={pagination.onPage} /> : null}
    </div>
  );
}
