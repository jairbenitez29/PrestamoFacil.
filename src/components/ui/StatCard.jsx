import { TrendingUp, TrendingDown } from 'lucide-react'

export function StatCard({ titulo, valor, subtitulo, icono: Icono, colorIcono = 'primary', tendencia, tendenciaNota }) {
  const colores = {
    primary: 'bg-primary-500/15 text-primary-400 border-primary-500/20',
    gold:    'bg-gold-500/15 text-gold-400 border-gold-500/20',
    emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    red:     'bg-red-500/15 text-red-400 border-red-500/20',
    slate:   'bg-slate-500/15 text-slate-400 border-slate-500/20',
  }

  return (
    <div className="stat-card animate-fade-in">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${colores[colorIcono]}`}>
          {Icono && <Icono size={18} />}
        </div>
        {tendencia !== undefined && (
          <span className={`flex items-center gap-1 text-xs font-medium ${tendencia >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {tendencia >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(tendencia)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-white tracking-tight">{valor}</p>
        <p className="text-sm font-medium text-slate-400 mt-0.5">{titulo}</p>
        {subtitulo && <p className="text-xs text-slate-500 mt-1">{subtitulo}</p>}
        {tendenciaNota && <p className="text-xs text-slate-500 mt-1">{tendenciaNota}</p>}
      </div>
    </div>
  )
}
