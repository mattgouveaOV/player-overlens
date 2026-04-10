export default function LobbyLoading() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="h-14 border-b border-zinc-800" />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <div className="mb-8">
          <div className="h-8 w-64 bg-zinc-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl h-56 animate-pulse" />
          ))}
        </div>
      </main>
    </div>
  )
}
