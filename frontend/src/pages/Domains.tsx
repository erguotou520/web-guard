export default function Domains() {
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Domains</h1>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
            Add Domain
          </button>
        </div>
        <div className="bg-white rounded-lg shadow">
          <div className="p-8 text-center text-slate-500">
            No domains yet. Add your first domain to start monitoring.
          </div>
        </div>
      </div>
    </div>
  )
}
