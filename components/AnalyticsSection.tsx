'use client'

import { MOCK_ANALYTICS } from '@/lib/data'

const data = MOCK_ANALYTICS

const cardBox =
  'bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.06] rounded-xl p-4 shadow-sm dark:shadow-none'

function Delta({ value }: { value: number }) {
  const up = value >= 0
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        up ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
      }`}
    >
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
          d={up ? 'M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18' : 'M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3'} />
      </svg>
      {Math.abs(value)}%
    </span>
  )
}

function Bar({ visits, max }: { visits: number; max: number }) {
  const pct = Math.round((visits / max) * 100)
  return (
    <div className="flex flex-col items-center gap-1.5 flex-1">
      <span className="text-[10px] text-slate-500 dark:text-white/30 tabular-nums">{visits}</span>
      <div className="w-full flex items-end" style={{ height: 48 }}>
        <div
          className="w-full rounded-t-sm bg-blue-400/50 dark:bg-blue-500/40 hover:bg-blue-500/70 transition-colors"
          style={{ height: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function AnalyticsSection() {
  const maxVisits = Math.max(...data.dailyVisits.map((d) => d.visits))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-white/80">Tráfico del sitio</h2>
          <p className="text-xs text-slate-500 dark:text-white/30 mt-0.5">TuCuadre · últimos 7 días · datos de ejemplo</p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 dark:bg-emerald-500/10 dark:border-emerald-500/20 rounded-lg px-3 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">{data.activeSessions} activos ahora</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Visitas totales', value: data.totalVisits.toLocaleString(), delta: data.totalVisitsDelta },
          { label: 'Visitantes únicos', value: data.uniqueVisitors.toLocaleString(), delta: data.uniqueVisitorsDelta },
          { label: 'Tasa de conversión', value: `${data.conversionRate}%`, delta: data.conversionRateDelta },
        ].map((m) => (
          <div key={m.label} className={cardBox}>
            <div className="text-xs text-slate-500 dark:text-white/30 mb-2">{m.label}</div>
            <div className="text-2xl font-semibold text-slate-900 dark:text-white/80 tabular-nums">{m.value}</div>
            <div className="mt-1 flex items-center gap-1.5">
              <Delta value={m.delta} />
              <span className="text-xs text-slate-400 dark:text-white/20">vs semana anterior</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className={cardBox}>
          <div className="text-xs font-medium text-slate-500 dark:text-white/40 uppercase tracking-wide mb-4">
            Visitas por día
          </div>
          <div className="flex items-end gap-1.5">
            {data.dailyVisits.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <Bar visits={d.visits} max={maxVisits} />
                <span className="text-[10px] text-slate-400 dark:text-white/25">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={cardBox}>
          <div className="text-xs font-medium text-slate-500 dark:text-white/40 uppercase tracking-wide mb-4">
            Páginas más visitadas
          </div>
          <div className="space-y-2.5">
            {data.topPages.map((p) => (
              <div key={p.page}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-600 dark:text-white/50 font-mono">{p.page}</span>
                  <span className="text-xs text-slate-500 dark:text-white/30 tabular-nums">{p.visits}</span>
                </div>
                <div className="h-1 bg-slate-200 dark:bg-white/[0.05] rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500/60 dark:bg-blue-500/50 rounded-full" style={{ width: `${p.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`${cardBox} md:col-span-2`}>
          <div className="text-xs font-medium text-slate-500 dark:text-white/40 uppercase tracking-wide mb-4">
            Origen del tráfico
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {data.sources.map((s, i) => {
              const colors = [
                'bg-blue-100 text-blue-700 dark:bg-blue-500/40 dark:text-blue-400',
                'bg-purple-100 text-purple-700 dark:bg-purple-500/40 dark:text-purple-400',
                'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/40 dark:text-emerald-400',
                'bg-amber-100 text-amber-700 dark:bg-amber-500/40 dark:text-amber-400',
              ]
              const bars = [
                'bg-blue-500/60 dark:bg-blue-500/50',
                'bg-purple-500/60 dark:bg-purple-500/50',
                'bg-emerald-500/60 dark:bg-emerald-500/50',
                'bg-amber-500/60 dark:bg-amber-500/50',
              ]
              return (
                <div key={s.name} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600 dark:text-white/40">{s.name}</span>
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${colors[i]}`}>{s.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 dark:bg-white/[0.05] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${bars[i]}`} style={{ width: `${s.pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
