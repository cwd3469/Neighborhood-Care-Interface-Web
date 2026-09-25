export default function CaregiverLoading() {
  return (
    <main className="mx-auto max-w-2xl space-y-8 p-6">
      <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    </main>
  );
}
