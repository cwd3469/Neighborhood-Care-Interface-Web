export default function Loading() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-1" />
      <div className="h-4 w-32 bg-gray-100 rounded animate-pulse mb-6" />
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 rounded-lg bg-gray-100 animate-pulse" />
        ))}
      </div>
    </main>
  );
}
