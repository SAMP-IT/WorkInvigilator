export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4 text-ink-muted">Loading...</p>
      </div>
    </div>
  );
}

export function PageLoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-12">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-3 text-sm text-ink-muted">Loading...</p>
      </div>
    </div>
  );
}

export function TableLoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 bg-surface-hover rounded"></div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-16 bg-surface-hover rounded"></div>
      ))}
    </div>
  );
}
