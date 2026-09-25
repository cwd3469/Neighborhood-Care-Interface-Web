export default function AdminLoading() {
  return (
    <main className="mx-auto max-w-5xl space-y-10 p-6">
      <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
      {[1, 2, 3].map((i) => (
        <section key={i} className="space-y-3">
          <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
          <div className="h-40 animate-pulse rounded-lg bg-gray-100" />
        </section>
      ))}
    </main>
  );
}
