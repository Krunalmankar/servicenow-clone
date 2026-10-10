export function ErrorBanner({ error }: { error?: string }) {
  if (!error) return null;
  return <div className="mb-3 rounded border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800">{error}</div>;
}

export function InfoBanner({ children }: { children: React.ReactNode }) {
  return <div className="mb-3 rounded border border-sky-300 bg-sky-50 px-4 py-2 text-sm text-sky-900">{children}</div>;
}
