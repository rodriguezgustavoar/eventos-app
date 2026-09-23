'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface AdminHeaderProps {
  venueName?: string
  adminEmail?: string
}

export default function AdminHeader({ venueName, adminEmail }: AdminHeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="bg-gray-900 text-white p-4 px-6 rounded-3xl flex justify-between items-center shadow-md mb-6">
      <div>
        <span className="text-[10px] font-bold text-purple-400 bg-purple-950 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
          Panel Administrador
        </span>
        <h1 className="text-xl font-black mt-1">{venueName || 'Mi Espacio'}</h1>
        {adminEmail && <p className="text-xs text-gray-400">Sesión: {adminEmail}</p>}
      </div>

      <button
        onClick={handleLogout}
        className="py-2 px-3.5 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white font-bold text-xs rounded-xl transition-all border border-red-500/30"
      >
        🚪 Cerrar Sesión
      </button>
    </header>
  )
}