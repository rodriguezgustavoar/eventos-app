'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Booking {
  id: string
  child_name: string
  child_age: number
  parent_name: string
  parent_phone: string
  event_date: string
  start_time: string
  end_time: string
  theme?: string
  total_price?: number
  deposit_paid?: number
  created_at: string
  profile_id?: string
}

const MONTHS = [
  { value: 'all', label: 'Todos los meses' },
  { value: '01', label: 'Enero' },
  { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' },
  { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
]

export default function HistoryPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [selectedMonth, setSelectedMonth] = useState<string>('all')
  const [selectedYear, setSelectedYear] = useState<string>('all')

  const supabase = createClient()

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    setLoading(true)

    // 1. Obtener la sesión del usuario actual
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('Error al obtener el usuario o no hay sesión activa:', authError)
      setLoading(false)
      return
    }

    // 2. Consultar las reservas filtrando únicamente por profile_id
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('profile_id', user.id)
      .order('event_date', { ascending: false })

    if (error) {
      console.error('Error cargando historial:', error)
      alert('Error al cargar el historial.')
    } else if (data) {
      setBookings(data)
    }

    setLoading(false)
  }

  // Filtrar ÚNICAMENTE eventos pasados
  const pastBookings = useMemo(() => {
    const now = new Date()

    return bookings.filter((item) => {
      if (!item.event_date) return false
      const endTimeString = item.end_time ? item.end_time.slice(0, 5) : '23:59'
      const eventEndDateTime = new Date(`${item.event_date}T${endTimeString}:00`)
      return eventEndDateTime < now
    })
  }, [bookings])

  // Obtener lista de años del historial
  const availableYears = useMemo(() => {
    const years = new Set<string>()
    pastBookings.forEach((item) => {
      if (item.event_date) {
        const year = item.event_date.split('-')[0]
        if (year) years.add(year)
      }
    })
    return Array.from(years).sort().reverse()
  }, [pastBookings])

  // Filtrar eventos por mes y año
  const filteredBookings = useMemo(() => {
    return pastBookings.filter((item) => {
      if (!item.event_date) return false
      const [year, month] = item.event_date.split('-')

      const matchesMonth = selectedMonth === 'all' || month === selectedMonth
      const matchesYear = selectedYear === 'all' || year === selectedYear

      return matchesMonth && matchesYear
    })
  }, [pastBookings, selectedMonth, selectedYear])

  // Cálculo de estadísticas globales / filtradas
  const stats = useMemo(() => {
    let totalRevenue = 0
    let totalEvents = filteredBookings.length

    filteredBookings.forEach((item) => {
      totalRevenue += Number(item.total_price) || 0
    })

    return {
      totalEvents,
      totalRevenue,
    }
  }, [filteredBookings])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center p-4">
        <p className="text-[#1F2937] font-medium text-xs">Cargando el historial de eventos... 📜</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] p-4 md:p-8 max-w-5xl mx-auto space-y-6 text-[#1F2937] antialiased">
      {/* Encabezado */}
      <div className="flex justify-between items-center flex-wrap gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-wider border border-slate-200">
            Archivo Histórico
          </span>
          <h1 className="text-2xl font-black text-[#1F2937] mt-1">Historial de Eventos 📜</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Registro de cumpleaños finalizados (solo lectura).
          </p>
        </div>

        <Link
          href="/admin"
          className="py-2.5 px-4 bg-[#0D9488] hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm shadow-teal-600/20 transition-all flex items-center gap-1.5 active:scale-[0.99]"
        >
          ⬅️ Volver a Próximos Eventos
        </Link>
      </div>

      {/* Sección de Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#0D9488] border border-teal-100 flex items-center justify-center text-xl font-bold">
            🎉
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Eventos Realizados
            </span>
            <span className="text-2xl font-black text-[#1F2937]">{stats.totalEvents}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#0D9488] border border-teal-100 flex items-center justify-center text-xl font-bold">
            💰
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Facturado
            </span>
            <span className="text-2xl font-black text-[#0D9488]">
              ${stats.totalRevenue.toLocaleString('es-AR')}
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">📅 Mes:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 bg-[#F3F4F6] border border-slate-200 rounded-xl text-xs font-bold text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">📆 Año:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-1.5 bg-[#F3F4F6] border border-slate-200 rounded-xl text-xs font-bold text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
            >
              <option value="all">Todos los años</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {(selectedMonth !== 'all' || selectedYear !== 'all') && (
            <button
              onClick={() => {
                setSelectedMonth('all')
                setSelectedYear('all')
              }}
              className="text-xs text-[#0D9488] font-bold hover:underline px-2"
            >
              Restablecer
            </button>
          )}
        </div>

        <div className="text-xs font-medium text-slate-500">
          Mostrando <span className="font-bold text-[#0D9488]">{filteredBookings.length}</span> evento(s) en historial
        </div>
      </div>

      {/* Listado de Historial */}
      <div className="space-y-4">
        {filteredBookings.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-3">
            <span className="text-4xl">📜</span>
            <h3 className="font-bold text-[#1F2937]">No hay eventos en el historial</h3>
            <p className="text-xs text-slate-500">
              No se encontraron eventos pasados registrados para la selección actual.
            </p>
          </div>
        ) : (
          filteredBookings.map((item) => {
            const totalPrice = Number(item.total_price) || 0
            const depositPaid = Number(item.deposit_paid) || 0
            const pendingBalance = totalPrice - depositPaid

            return (
              <div
                key={item.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm opacity-90 space-y-4"
              >
                <div className="flex justify-between items-start flex-wrap gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-xs font-extrabold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                      📅 {item.event_date} | ⏰ {item.start_time.slice(0, 5)} - {item.end_time.slice(0, 5)} hs
                    </span>
                    <h2 className="text-lg font-black text-[#1F2937] mt-2">
                      Cumple de {item.child_name} ({item.child_age} años)
                    </h2>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">
                      👤 {item.parent_name} {item.parent_phone && `| 📞 ${item.parent_phone}`}
                    </p>
                    {item.theme && (
                      <p className="text-xs text-[#0D9488] font-bold mt-1">
                        🎨 Temática: {item.theme}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center">
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 uppercase tracking-wider flex items-center gap-1">
                      🔒 Finalizado (Solo lectura)
                    </span>
                  </div>
                </div>

                {/* Resumen Económico */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-[#F3F4F6] p-2.5 rounded-xl border border-slate-200/60">
                    <span className="text-slate-400 font-medium block text-[10px] uppercase">Total</span>
                    <span className="font-bold text-[#1F2937]">${totalPrice.toLocaleString('es-AR')}</span>
                  </div>
                  <div className="bg-teal-50 p-2.5 rounded-xl border border-teal-100">
                    <span className="text-[#0D9488] font-medium block text-[10px] uppercase">Abonado / Seña</span>
                    <span className="font-bold text-teal-800">${depositPaid.toLocaleString('es-AR')}</span>
                  </div>
                  <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-100">
                    <span className="text-amber-600 font-medium block text-[10px] uppercase">Saldo Pendiente</span>
                    <span className="font-bold text-amber-800">${pendingBalance.toLocaleString('es-AR')}</span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}