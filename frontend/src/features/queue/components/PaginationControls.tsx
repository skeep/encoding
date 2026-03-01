export function PaginationControls(props: {
  page: number;
  totalPages: number;
  pageStart: number;
  pageEnd: number;
  total: number;
  pageSize: number;
  onPageSizeChange?: (value: number) => void;
  pageSizeOptions?: number[];
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
}): JSX.Element {
  const {
    page,
    totalPages,
    pageStart,
    pageEnd,
    total,
    pageSize,
    onPageSizeChange,
    pageSizeOptions,
    onFirst,
    onPrev,
    onNext,
    onLast
  } = props;
  return (
    <div className="pagination-row">
      <div className="pagination-left">
        <span className="pagination-meta">
          Showing {pageStart}-{pageEnd} of {total}
        </span>
        {pageSizeOptions && onPageSizeChange ? (
          <label className="rows-per-page-control">
            <span>Rows</span>
            <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
              {pageSizeOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <div className="pagination-controls">
        <button disabled={page <= 1} onClick={onFirst}>
          First
        </button>
        <button disabled={page <= 1} onClick={onPrev}>
          Previous
        </button>
        <span className="pagination-page-indicator">
          Page {page} / {totalPages}
        </span>
        <button disabled={page >= totalPages} onClick={onNext}>
          Next
        </button>
        <button disabled={page >= totalPages} onClick={onLast}>
          Last
        </button>
      </div>
    </div>
  );
}
