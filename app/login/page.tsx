'use client'

import { FormEvent, useState, useEffect, Suspense } from 'react'
import type { CSSProperties } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { errorMessage } from '@/lib/api'
import { clearAuthStorage, SUPERADMIN_DENIED_MESSAGE } from '@/lib/authSession'

function LoginPageContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { login, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('forbidden') === '1') {
      clearAuthStorage()
      setError(SUPERADMIN_DENIED_MESSAGE)
      window.history.replaceState(null, '', '/login')
    }
  }, [searchParams])

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace('/')
    }
  }, [authLoading, isAuthenticated, router])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await login(email, password)
      router.push('/')
    } catch (err) {
      setError(errorMessage(err, 'Error al iniciar sesión'))
    } finally {
      setIsLoading(false)
    }
  }

  if (authLoading || isAuthenticated) {
    return (
      <div style={styles.root}>
        <p style={{ color: '#94a3b8', fontSize: 14 }}>
          {isAuthenticated ? 'Redirigiendo…' : 'Cargando…'}
        </p>
      </div>
    )
  }

  return (
    <>
      <style>{css}</style>
      <div style={styles.root}>
        {/* Fondo decorativo */}
        <div style={styles.bgOrb1} />
        <div style={styles.bgOrb2} />
        <div style={styles.bgGrid} />

        {/* Modal centrado */}
        <div style={styles.card} className="login-card">
          {/* Header */}
          <div style={styles.cardHeader}>
            <div style={styles.brandBlock}>
              <img
                src="/logo-oscuro.png"
                alt="Strova"
                width={44}
                height={44}
                style={{ objectFit: 'contain', width: 44, height: 44, display: 'block' }}
              />
              <span style={styles.brandTitle}>Strova</span>
              <span style={styles.brandSubtitle}>Admin Panel</span>
            </div>
            <h1 style={styles.title}>Bienvenido</h1>
            <p style={styles.subtitle}>Inicia sesión para gestionar suscripciones</p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label htmlFor="email" style={styles.label}>Correo electrónico</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@ejemplo.com"
                required
                style={styles.input}
                className="login-input"
              />
            </div>

            <div style={styles.field}>
              <label htmlFor="password" style={styles.label}>Contraseña</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={styles.input}
                className="login-input"
              />
            </div>

            {error && (
              <div style={styles.errorBox} className="login-error">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" stroke="#f87171" strokeWidth="2"/>
                  <line x1="12" y1="8" x2="12" y2="12" stroke="#f87171" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="12" cy="16" r="1" fill="#f87171"/>
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              style={styles.button}
              className="login-btn"
            >
              {isLoading ? (
                <span style={styles.btnInner}>
                  <span style={styles.spinner} className="spinner" />
                  Iniciando sesión…
                </span>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </form>

          <p style={styles.footer}>Panel de administración · Strova</p>
        </div>
      </div>
    </>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div style={styles.root}>
          <p style={{ color: '#94a3b8', fontSize: 14 }}>Cargando…</p>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  )
}

const styles: Record<string, CSSProperties> = {
  root: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#080e1d',
    overflow: 'hidden',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  bgOrb1: {
    position: 'absolute',
    width: 600,
    height: 600,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
    top: '-10%',
    left: '-10%',
    pointerEvents: 'none',
  },
  bgOrb2: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
    bottom: '-10%',
    right: '-5%',
    pointerEvents: 'none',
  },
  bgGrid: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
    backgroundSize: '40px 40px',
    pointerEvents: 'none',
  },
  card: {
    position: 'relative',
    width: '100%',
    maxWidth: 420,
    margin: '0 16px',
    background: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: '40px 36px',
    boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(59,130,246,0.05)',
  },
  cardHeader: {
    marginBottom: 28,
  },
  brandBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: 20,
  },
  brandTitle: {
    margin: 0,
    marginTop: 12,
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 600,
    lineHeight: 1.15,
  },
  brandSubtitle: {
    margin: 0,
    marginTop: 4,
    color: '#6b8cbe',
    fontSize: 12,
    fontWeight: 500,
    lineHeight: 1.15,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.14em',
  },
  title: {
    fontSize: 26,
    fontWeight: 700,
    color: '#f1f5f9',
    margin: '0 0 6px',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 16,
  },
  field: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: '#94a3b8',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: 8,
    color: '#6b7fa3',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '10px 14px',
    background: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: 10,
    color: '#fca5a5',
    fontSize: 13,
    lineHeight: 1.5,
  },
  button: {
    width: '100%',
    padding: '11px 0',
    background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
    border: 'none',
    borderRadius: 10,
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s, transform 0.1s',
    marginTop: 4,
  },
  btnInner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  spinner: {
    width: 14,
    height: 14,
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    display: 'inline-block',
  },
  footer: {
    marginTop: 24,
    fontSize: 12,
    color: '#334155',
    textAlign: 'center' as const,
  },
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

  .login-card {
    animation: cardIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  @keyframes cardIn {
    from { opacity: 0; transform: translateY(20px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  /* Preflight / navegador suelen dejar el fondo blanco; forzar el color del diseño */
  .login-input {
    background-color: #232f45 !important;
    border: 1px solid rgba(255,255,255,0.05) !important;
    color: #6b7fa3 !important;
    border-radius: 8px !important;
    -webkit-appearance: none;
    appearance: none;
  }
  .login-input:-webkit-autofill,
  .login-input:-webkit-autofill:hover,
  .login-input:-webkit-autofill:focus {
    -webkit-text-fill-color:rgb(229, 233, 240) !important;
    box-shadow: 0 0 0 1000px #232f45 inset !important;
    border: 1px solid rgb(7, 0, 59) !important;
  }
  .login-input:focus {
    border-color: rgba(59,130,246,0.5) !important;
    box-shadow: 0 0 0 3px rgba(59,130,246,0.12) !important;
  }
  .login-input:focus:-webkit-autofill {
    -webkit-text-fill-color: #6b7fa3 !important;
    box-shadow: 0 0 0 1000px #232f45 inset, 0 0 0 3px rgba(59,130,246,0.12) !important;
    border-color: rgb(0, 14, 35) !important;
  }
  .login-input::placeholder {
    color: #334155;
  }

  .login-btn:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }
  .login-btn:active:not(:disabled) {
    transform: translateY(0);
  }
  .login-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .login-error {
    animation: shake 0.3s ease;
  }
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25%       { transform: translateX(-4px); }
    75%       { transform: translateX(4px); }
  }

  .spinner {
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`