export function PaginationControls(props: {
  page: number;
  totalPages: number;
  pageStart: number;
  pageEnd: number;
  total: number;
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
}): JSX.Element {
  const { page, totalPages, pageStart, pageEnd, total, onFirst, onPrev, onNext, onLast } = props;
  return (
    <div className="pagination-row">
      <span className="pagination-meta">
        Showing {pageStart}-{pageEnd} of {total}
      </span>
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
