export default function Loading() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <div className="h-8 w-40 bg-gray-200 rounded animate-pulse mb-6" />
      <ul className="space-y-3">
        {[1, 2, 3].map((i) => (
          <li key={i} className="h-20 rounded-lg bg-gray-100 animate-pulse" />
        ))}
      </ul>
    </main>
  );
}
