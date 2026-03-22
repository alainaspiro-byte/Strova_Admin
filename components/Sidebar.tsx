'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'

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
  const [open, setOpen] = useState(true)
  const sidebarRef = useRef<HTMLDivElement>(null)

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
      <aside
        ref={sidebarRef}
        className={`fixed top-0 left-0 z-50 h-screen bg-[#111827] border-r border-white/[0.06] flex flex-col transition-all duration-200 ease-in-out`}
        style={{ width: open ? 224 : 64 }}
      >
        <div className={`flex items-center justify-between px-3 py-3 border-b border-white/[0.06] transition-all duration-200 ${open ? 'pt-5 pb-4' : 'px-2 justify-center'}`}>
          <div className={`flex items-center gap-2.5 flex-1 ${!open && 'hidden'}`}>
            <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center text-white text-sm font-bold shrink-0">S</div>
            <div className="min-w-0">
              <div className="text-white text-sm font-semibold leading-none">Strova</div>
              <div className="text-white/30 text-[10px] mt-0.5">Admin Panel</div>
            </div>
          </div>
          {open && (
            <button
              onClick={() => setOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1a2332] border border-white/[0.08] text-white/40 hover:text-white/80 hover:bg-[#1e2a3a] transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
          )}
          {!open && (
            <button
              onClick={() => setOpen(true)}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1a2332] border border-white/[0.08] text-white/40 hover:text-white/80 hover:bg-[#1e2a3a] transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
          )}
        </div>
        <nav className="flex-1 px-2 py-4 space-y-0.5">
          <div className={`text-[9px] font-semibold text-white/20 uppercase tracking-widest px-2 mb-2 transition-all duration-200 ${!open && 'hidden'}`}>Gestion</div>
          {NAV.map((item) => {
            const active = pathname === item.href
            return (
              <Link 
                key={item.href} 
                href={item.href}
                title={!open ? item.label : ''}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all duration-150 ${open ? 'justify-start' : active ? 'justify-end' : 'justify-center'} ${active ? 'bg-blue-500/15 text-blue-400 font-medium' : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'}`}
              >
                <span className={active ? 'text-blue-400' : 'text-white/30'}>{item.icon}</span>
                {open && (
                  <>
                    {item.label}
                    {active && <span className="ml-auto w-1 h-1 rounded-full bg-blue-400" />}
                  </>
                )}
              </Link>
            )
          })}
        </nav>
        <div className={`px-2 py-4 border-t border-white/[0.06] transition-all duration-200 ${!open && 'hidden'}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-white/60 text-xs font-medium shrink-0">A</div>
            <div className="min-w-0">
              <div className="text-white/70 text-xs font-medium truncate">Admin</div>
              <div className="text-white/25 text-[10px]">Strova Team</div>
            </div>
          </div>
        </div>
      </aside>
      <div className="hidden md:block shrink-0 transition-all duration-200" style={{ width: open ? 224 : 64 }} />
    </>
  )
}
