'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'

const NAV = [
  {
    label: 'Panel',
    href: '/',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    label: 'Suscripciones',
    href: '/subscriptions',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
  },
  {
    label: 'Organizaciones',
    href: '/clients',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    label: 'Planes',
    href: '/plans',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0018 4.5h-2.25A2.25 2.25 0 0013.5 6.75v11.25A2.25 2.25 0 0015.75 20.25z" />
      </svg>
    ),
  },
  {
    label: 'Historial de Pagos',
    href: '/payments',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: 'Configuración',
    href: '/settings',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 1.143c.214.2.357.471.429.747a1.125 1.125 0 01-.234 1.105l-1.064.878a.75.75 0 00-.234.707v1.302a.75.75 0 00.234.707l1.064.878a1.125 1.125 0 01.234 1.105 1.125 1.125 0 01-.429.747l-1.296 1.143a1.125 1.125 0 01-1.37.49l-1.217-.456a1.125 1.125 0 00-1.075.124 6.47 6.47 0 01-.22.127c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-1.143a1.125 1.125 0 01-.23-1.105l1.064-.878a.75.75 0 00.234-.707v-1.302a.75.75 0 00-.234-.707l-1.064-.878a1.125 1.125 0 01-.234-1.105 1.125 1.125 0 01.43-.747l1.296-1.143a1.125 1.125 0 011.37-.49l1.217.456c.356.133.75.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(true)
  /** Expansión temporal al pasar el cursor cuando la barra está colapsada */
  const [hoverPeek, setHoverPeek] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const hoverLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const wide = open || hoverPeek

  useEffect(() => {
    if (open) setHoverPeek(false)
  }, [open])

  useEffect(() => {
    return () => {
      if (hoverLeaveTimerRef.current) clearTimeout(hoverLeaveTimerRef.current)
    }
  }, [])

  const clearHoverLeaveTimer = () => {
    if (hoverLeaveTimerRef.current) {
      clearTimeout(hoverLeaveTimerRef.current)
      hoverLeaveTimerRef.current = null
    }
  }

  const handleSidebarPointerEnter = () => {
    clearHoverLeaveTimer()
    if (!open) setHoverPeek(true)
  }

  const handleSidebarPointerLeave = () => {
    if (open) return
    clearHoverLeaveTimer()
    hoverLeaveTimerRef.current = setTimeout(() => {
      setHoverPeek(false)
      hoverLeaveTimerRef.current = null
    }, 220)
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    await logout()
    router.replace('/login')
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (open && sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setOpen(false)} />
      )}
      <div
        ref={sidebarRef}
        onMouseEnter={handleSidebarPointerEnter}
        onMouseLeave={handleSidebarPointerLeave}
        className={`fixed top-0 left-0 h-screen overflow-visible transition-[width,box-shadow] duration-300 ease-out ${
          !open && hoverPeek ? 'z-[60] shadow-[12px_0_40px_-8px_rgba(0,0,0,0.55)]' : 'z-50 shadow-none'
        }`}
        style={{ width: wide ? 224 : 64 }}
      >
        {/* Captura el cursor en el borde izquierdo del viewport (evita entrar/salir en bucle al expandir) */}
        <div
          className="absolute top-0 bottom-0 w-3 -left-3 z-[70] pointer-events-auto"
          aria-hidden
        />
        <aside className="relative z-[60] flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#1a1c2c] border-r border-white/[0.08]">
        <div className="flex min-h-[88px] min-w-0 items-stretch border-b border-white/[0.06] transition-[padding] duration-300 ease-out">
          <div className="flex w-16 shrink-0 items-center justify-center py-4">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-label={open ? 'Colapsar menú lateral' : 'Fijar menú lateral abierto'}
              className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg bg-[#1a2332] border border-white/[0.08] text-white/40 hover:text-white/80 hover:bg-[#1e2a3a] transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
          </div>
          {wide && (
            <div className="flex min-w-0 flex-1 items-center justify-center gap-3 overflow-hidden py-4 pr-2">
              <div className="min-w-0 text-center">
                <div className="text-white text-sm font-semibold leading-none truncate">TuCuadre</div>
                <div className="text-white/30 text-[10px] mt-0.5 truncate">Admin Panel</div>
              </div>
              <img
                src="/tucuadre-favicon.png"
                alt="TuCuadre"
                width={52}
                height={52}
                className="h-[52px] w-[52px] shrink-0 object-contain"
              />
            </div>
          )}
        </div>
        <nav className="flex-1 space-y-0.5 py-4 pl-0 pr-2 min-h-0 overflow-y-auto overflow-x-hidden">
          <div
            className="mb-2 flex min-h-[14px] min-w-0 items-center"
            aria-hidden={!wide}
          >
            <div className="w-16 shrink-0" aria-hidden />
            <div
              className={`min-w-0 flex-1 px-2.5 text-[9px] font-semibold uppercase tracking-widest ${
                wide ? 'text-white/20' : 'text-transparent'
              }`}
            >
              Gestion
            </div>
          </div>
          {NAV.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                title={!wide ? item.label : ''}
                className={`flex min-w-0 items-center gap-2.5 py-2 pr-2.5 rounded-lg text-sm transition-colors duration-200 ease-out ${
                  active ? 'bg-blue-500/15 text-blue-400 font-medium' : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
                }`}
              >
                <span
                  className={`flex w-16 shrink-0 items-center justify-center ${active ? 'text-blue-400' : 'text-white/30'}`}
                >
                  {item.icon}
                </span>
                {wide && (
                  <>
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {active && <span className="h-1 w-1 shrink-0 rounded-full bg-blue-400" />}
                  </>
                )}
              </Link>
            )
          })}
        </nav>
        <div className="space-y-1 border-t border-white/[0.06] py-3 pl-0 pr-2 shrink-0">
          <div className="flex min-w-0 items-center gap-2.5 transition-all duration-300 ease-out">
            <div className="flex w-16 shrink-0 justify-center">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/20 text-xs font-semibold text-blue-400">
                {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'A'}
              </div>
            </div>
            {wide && (
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium text-white/70">{user?.name || 'Admin'}</div>
                <div className="truncate text-[10px] text-white/25">{user?.email || 'TuCuadre Team'}</div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            title={!wide ? 'Cerrar sesión' : ''}
            className="flex w-full min-w-0 items-center gap-2.5 rounded-lg py-2 pr-2.5 text-xs font-medium text-red-400/70 transition-all duration-150 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="flex w-16 shrink-0 justify-center">
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
                />
              </svg>
            </span>
            {wide && (loggingOut ? 'Cerrando…' : 'Cerrar sesión')}
          </button>
        </div>
        </aside>
      </div>
      <div className="hidden md:block shrink-0 transition-[width] duration-300 ease-out" style={{ width: open ? 224 : 64 }} />
    </>
  )
}