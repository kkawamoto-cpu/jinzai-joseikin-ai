export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl p-8">
      <div className="mb-8">
        <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-8 w-64 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-3 w-96 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card">
            <div className="h-3 w-16 animate-pulse rounded bg-slate-200" />
            <div className="mt-3 h-8 w-12 animate-pulse rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card">
            <div className="mb-3 flex items-center justify-between">
              <div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
              <div className="h-5 w-16 animate-pulse rounded-full bg-slate-100" />
            </div>
            <div className="mb-3 h-6 w-3/4 animate-pulse rounded bg-slate-200" />
            <div className="h-1.5 w-full animate-pulse rounded-full bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
