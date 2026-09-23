'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NavbarAdmin() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<any>(null)
  const [venueName, setVenueName] = useState<string>('')
  const [logoUrl, setLogoUrl] = useState<string>('')
  const [userRole, setUserRole] = useState<string>('')
  const [loading, setLoading] = useState(true)
  
  // Estado para abrir/cerrar el menú en celulares
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    checkUserSession()

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser(session.user)
          fetchVenueInfo(session.user)
        } else {
          setUser(null)
          setVenueName('')
          setLogoUrl('')
          setUserRole('')
        }
        setLoading(false)
      }
    )

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  // Cerrar menú móvil al cambiar de ruta
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  const checkUserSession = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session?.user) {
      setUser(session.user)
      await fetchVenueInfo(session.user)
    } else {
      setUser(null)
    }
    setLoading(false)
  }

  const fetchVenueInfo = async (currentUser: any) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name, logo_url')
      .eq('id', currentUser.id)
      .maybeSingle()

    if (profile?.role) {
      setUserRole(profile.role)
    }

    if (profile?.logo_url) {
      setLogoUrl(profile.logo_url)
    }

    const metadataName =
      currentUser.user_metadata?.venue_name || currentUser.user_metadata?.full_name

    if (profile?.full_name) {
      setVenueName(profile.full_name)
    } else if (metadataName) {
      setVenueName(metadataName)
    } else {
      const emailPrefix = currentUser.email?.split('@')[0] || 'Mi Pelotero'
      setVenueName(emailPrefix)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (pathname.startsWith('/invitacion') || pathname.startsWith('/evento')) {
    return null
  }

  if (loading || !user) {
    return null
  }

  const navLinks = [
    { href: '/admin', label: 'Inicio' },
    { href: '/admin/bookings', label: 'Agenda' },
    { href: '/admin/historial', label: 'Historial' },
    { href: '/admin/cuenta', label: 'Mi Cuenta' },
  ]

  if (userRole === 'admin') {
    navLinks.push({ href: '/admin/superadmin', label: 'Panel Admin' })
  }

  const displayName = venueName || 'Magic Kids'

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 antialiased">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Logo de la Empresa + Nombre del Pelotero */}
        <Link href="/admin" className="flex items-center gap-3 group">
          {logoUrl ? (
            <div className="w-9 h-9 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 shrink-0 shadow-sm transition-transform group-hover:scale-105">
              <img
                src={logoUrl}
                alt={`Logo de ${displayName}`}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-teal-600/10 text-teal-600 font-semibold text-sm flex items-center justify-center shrink-0 border border-teal-100/60 shadow-sm transition-transform group-hover:scale-105">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex flex-col">
            <span className="font-semibold text-sm sm:text-base text-slate-900 tracking-tight leading-tight group-hover:text-teal-600 transition-colors">
              {displayName}
            </span>
            <span
              className={`text-[10px] font-medium uppercase px-2 py-0.2 rounded-md border self-start ${
                userRole === 'admin'
                  ? 'bg-teal-50 text-teal-700 border-teal-100'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {userRole === 'admin' ? 'Admin' : 'Usuario'}
            </span>
          </div>
        </Link>

        {/* Links de Navegación (Escritorio / Tablets) */}
        <nav className="hidden md:flex items-center gap-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-teal-50 text-teal-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {link.label}
              </Link>
            )
          })}

          <Link
            href="/evento/nuevo"
            className="bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-4 rounded-xl text-xs transition-all shadow-sm shadow-teal-600/20 active:scale-[0.99] ml-1"
          >
            + Crear
          </Link>

          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-xs font-medium ml-1"
            title="Cerrar sesión"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </nav>

        {/* Botón Hamburguesa (Móvil) */}
        <div className="flex items-center gap-2 md:hidden">
          <Link
            href="/evento/nuevo"
            className="bg-teal-600 text-white font-medium py-1.5 px-3 rounded-lg text-xs shadow-sm"
          >
            + Crear
          </Link>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Abrir menú"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Menú Desplegable (Móvil) */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 space-y-1.5 shadow-lg animate-fadeIn">
          {navLinks.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`block px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-teal-50 text-teal-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {link.label}
              </Link>
            )
          })}

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between px-2">
            <span className="text-xs text-slate-400 font-medium truncate max-w-[200px]">
              {user.email}
            </span>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-bold py-2 px-3 rounded-lg hover:bg-rose-50 transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      )}
    </header>
  )
}