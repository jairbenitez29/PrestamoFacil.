export function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }
  return (
    <div className={`animate-spin rounded-full border-2 border-white/10 border-t-primary-500 ${sizes[size]} ${className}`} />
  )
}

export function PageLoader() {
  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center">
          <span className="text-2xl font-bold text-primary-400">P</span>
        </div>
        <Spinner size="md" />
        <p className="text-slate-500 text-sm">Cargando PrestamosFácil...</p>
      </div>
    </div>
  )
}
