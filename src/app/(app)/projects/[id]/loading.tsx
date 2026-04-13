export default function Loading() {
  return (
    <div>
      <div className="border-b bg-white px-8 py-4">
        <div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-5 w-64 animate-pulse rounded bg-slate-200" />
      </div>
      <div className="px-8 py-6">
        <div className="mb-6 flex gap-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-7 w-20 animate-pulse rounded bg-slate-100" />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card">
              <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200" />
              <div className="mt-3 h-3 w-full animate-pulse rounded bg-slate-100" />
              <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
