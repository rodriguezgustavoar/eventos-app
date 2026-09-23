'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // 1. Iniciar sesión con Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData.user) {
      setError('Credenciales inválidas. Verificá tu email y contraseña.')
      setLoading(false)
      return
    }

    // 2. Verificar que exista su perfil en la base de datos
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .maybeSingle()

    if (profileError || !profile) {
      setError('Error al consultar el perfil de usuario.')
      setLoading(false)
      return
    }

    // 3. Ambos roles (admin y user) van a la ruta /admin
    router.push('/admin')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 antialiased">
      <div className="bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 max-w-md w-full space-y-6">
        {/* Encabezado con Isotipo */}
        <div className="space-y-2">
          <div className="w-10 h-10 rounded-xl bg-teal-600/10 text-teal-600 flex items-center justify-center mb-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Iniciar Sesión</h1>
          <p className="text-sm text-slate-500">Ingresá al panel de control de tu espacio</p>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-600 border border-rose-100 p-3 rounded-xl text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 text-sm bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 text-sm bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm rounded-xl transition-all shadow-md shadow-teal-600/20 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Ingresando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}