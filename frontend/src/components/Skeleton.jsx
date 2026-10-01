const widths = {
  short: "w-1/4",
  medium: "w-1/2",
  long: "w-3/4",
  full: "w-full",
};

export function Skeleton({ className = "" }) {
  return (
    <span
      aria-hidden="true"
      className={`skeleton-pulse block rounded-md bg-slate-200 ${className}`}
    />
  );
}

export function PageSkeleton() {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-label="Loading page"
      aria-live="polite"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="w-full space-y-3 md:max-w-md">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-11 w-full rounded-xl md:w-80" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="card space-y-4 p-5" key={index}>
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ))}
      </div>

      <div className="card space-y-5 p-5">
        <Skeleton className="h-6 w-48" />
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton
            className={`h-10 ${widths[["full", "long", "medium", "full", "short"][index]]}`}
            key={index}
          />
        ))}
      </div>
      <span className="sr-only">Loading page content</span>
    </div>
  );
}

export function TableSkeletonRows({ columns, rows = 5 }) {
  return Array.from({ length: rows }, (_, rowIndex) => (
    <tr aria-hidden="true" className="border-t border-slate-200" key={rowIndex}>
      {Array.from({ length: columns }, (_, columnIndex) => (
        <td className="px-5 py-4" key={columnIndex}>
          <Skeleton
            className={`h-4 ${columnIndex === 0 ? "w-3/4" : "w-1/2"}`}
          />
        </td>
      ))}
    </tr>
  ));
}
