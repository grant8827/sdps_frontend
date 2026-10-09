/** Previous / next paging for a server-paged list, with "Showing 26–50 of 312". */
export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (page: number) => void }) {
  if (total <= pageSize) return null;
  const pages = Math.ceil(total / pageSize);
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);
  return (
    <nav className="action-row" aria-label="Pages" style={{ justifyContent: 'space-between' }}>
      <span className="field-label" style={{ margin: 0 }}>Showing {first}–{last} of {total}</span>
      <span className="action-row">
        <button type="button" className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
        <span className="field-label" style={{ margin: 0, alignSelf: 'center' }}>Page {page} of {pages}</span>
        <button type="button" className="btn btn-secondary btn-sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
      </span>
    </nav>
  );
}
