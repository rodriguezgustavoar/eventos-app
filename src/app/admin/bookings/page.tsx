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

export default function BookingsAgendaPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Filtros de fecha
  const [selectedMonth, setSelectedMonth] = useState<string>('all')
  const [selectedYear, setSelectedYear] = useState<string>('all')

  // Estado para modal de pagos
  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState<Booking | null>(null)
  const [paymentAmount, setPaymentAmount] = useState<string>('')
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    setLoading(true)

    // 1. Obtener la sesión del usuario activo
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('Usuario no autenticado o error de sesión:', authError)
      setLoading(false)
      return
    }

    // 2. Filtrar por la columna profile_id usando el ID del usuario activo
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('profile_id', user.id)
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true })

    if (error) {
      console.error('Error cargando agenda:', error)
      alert('Error al cargar la lista de eventos.')
    } else if (data) {
      setBookings(data)
    }

    setLoading(false)
  }

  // Filtrar ÚNICAMENTE eventos próximos
  const upcomingBookings = useMemo(() => {
    const now = new Date()

    return bookings.filter((item) => {
      if (!item.event_date) return false
      const endTimeString = item.end_time ? item.end_time.slice(0, 5) : '23:59'
      const eventEndDateTime = new Date(`${item.event_date}T${endTimeString}:00`)
      return eventEndDateTime >= now
    })
  }, [bookings])

  // Obtener lista única de años de los próximos eventos
  const availableYears = useMemo(() => {
    const years = new Set<string>()
    upcomingBookings.forEach((item) => {
      if (item.event_date) {
        const year = item.event_date.split('-')[0]
        if (year) years.add(year)
      }
    })
    return Array.from(years).sort()
  }, [upcomingBookings])

  // Filtrar eventos próximos por mes y año
  const filteredBookings = useMemo(() => {
    return upcomingBookings.filter((item) => {
      if (!item.event_date) return false
      const [year, month] = item.event_date.split('-')

      const matchesMonth = selectedMonth === 'all' || month === selectedMonth
      const matchesYear = selectedYear === 'all' || year === selectedYear

      return matchesMonth && matchesYear
    })
  }, [upcomingBookings, selectedMonth, selectedYear])

  // Registrar pago parcial
  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBookingForPayment) return

    const amountToAdd = parseFloat(paymentAmount)
    if (isNaN(amountToAdd) || amountToAdd <= 0) {
      alert('Por favor, ingresa un monto válido.')
      return
    }

    setIsSubmittingPayment(true)

    const currentDeposit = Number(selectedBookingForPayment.deposit_paid) || 0
    const newDepositTotal = currentDeposit + amountToAdd

    const { error } = await supabase
      .from('bookings')
      .update({ deposit_paid: newDepositTotal })
      .eq('id', selectedBookingForPayment.id)

    setIsSubmittingPayment(false)

    if (error) {
      alert('Error al registrar el pago: ' + error.message)
    } else {
      setBookings((prev) =>
        prev.map((item) =>
          item.id === selectedBookingForPayment.id
            ? { ...item, deposit_paid: newDepositTotal }
            : item
        )
      )
      alert(`💵 ¡Pago de $${amountToAdd.toLocaleString()} registrado con éxito!`)
      setSelectedBookingForPayment(null)
      setPaymentAmount('')
    }
  }

  // Eliminar evento
  const handleDeleteBooking = async (id: string, childName: string) => {
    const confirmed = window.confirm(
      `⚠️ ¿Estás seguro de que deseas eliminar la fiesta de "${childName}"?\nEsta acción borra el evento y no se puede deshacer.`
    )

    if (!confirmed) return

    setDeletingId(id)

    await supabase.from('rsvps').delete().eq('booking_id', id)

    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', id)

    setDeletingId(null)

    if (error) {
      alert('Error al eliminar el evento: ' + error.message)
    } else {
      setBookings((prev) => prev.filter((item) => item.id !== id))
      alert('🗑️ Evento eliminado con éxito.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center p-4">
        <p className="text-[#1F2937] font-medium text-xs">Cargando la agenda de eventos... 📅</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] p-4 md:p-8 max-w-5xl mx-auto space-y-6 text-[#1F2937] antialiased">
      {/* Encabezado */}
      <div className="flex justify-between items-center flex-wrap gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <span className="text-xs font-bold text-[#0D9488] bg-teal-50 px-3 py-1 rounded-full uppercase tracking-wider border border-teal-100">
            Panel de Control
          </span>
          <h1 className="text-2xl font-black text-[#1F2937] mt-1">Próximos Cumpleaños 🎈</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Eventos programados y gestión de cobros activos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/historial"
            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-[#1F2937] font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 border border-slate-200"
          >
            📜 Ver Historial
          </Link>
          <Link
            href="/evento/nuevo"
            className="py-2.5 px-4 bg-[#0D9488] hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm shadow-teal-600/20 transition-all flex items-center gap-1.5 active:scale-[0.99]"
          >
            ➕ Nuevo Evento
          </Link>
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
          Mostrando <span className="font-bold text-[#0D9488]">{filteredBookings.length}</span> evento(s) próximo(s)
        </div>
      </div>

      {/* Listado de Próximos Eventos */}
      <div className="space-y-4">
        {filteredBookings.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-3">
            <span className="text-4xl">🎈</span>
            <h3 className="font-bold text-[#1F2937]">No hay eventos próximos</h3>
            <p className="text-xs text-slate-500">
              No se encontraron cumpleaños agendados para el filtro seleccionado.
            </p>
          </div>
        ) : (
          filteredBookings.map((item) => {
            const totalPrice = Number(item.total_price) || 0
            const depositPaid = Number(item.deposit_paid) || 0
            const pendingBalance = totalPrice - depositPaid
            const isDeleting = deletingId === item.id

            return (
              <div
                key={item.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-4"
              >
                <div className="flex justify-between items-start flex-wrap gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-xs font-extrabold text-[#0D9488] bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-100">
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

                  {/* Acciones */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedBookingForPayment(item)
                        setPaymentAmount('')
                      }}
                      className="py-1.5 px-3 bg-teal-50 hover:bg-teal-100 text-[#0D9488] font-bold text-xs rounded-xl border border-teal-200 transition-colors flex items-center gap-1"
                      title="Registrar abono/pago"
                    >
                      💵 Agregar Pago
                    </button>

                    <button
                      onClick={() => handleDeleteBooking(item.id, item.child_name)}
                      disabled={isDeleting}
                      className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl border border-rose-100 transition-colors flex items-center gap-1 disabled:opacity-50"
                      title="Eliminar evento"
                    >
                      {isDeleting ? '⏳ Borrando...' : '🗑️ Eliminar'}
                    </button>

                    <Link
                      href={`/evento/${item.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-[#2563EB] font-bold text-xs rounded-xl border border-blue-100 transition-colors flex items-center gap-1"
                    >
                      📋 Ver Evento
                    </Link>
                  </div>
                </div>

                {/* Resumen Económico */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-[#F3F4F6] p-2.5 rounded-xl border border-slate-200/60">
                    <span className="text-slate-400 font-medium block text-[10px] uppercase">Total</span>
                    <span className="font-bold text-[#1F2937]">${totalPrice.toLocaleString()}</span>
                  </div>
                  <div className="bg-teal-50 p-2.5 rounded-xl border border-teal-100">
                    <span className="text-[#0D9488] font-medium block text-[10px] uppercase">Abonado / Seña</span>
                    <span className="font-bold text-teal-800">${depositPaid.toLocaleString()}</span>
                  </div>
                  <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-100">
                    <span className="text-amber-600 font-medium block text-[10px] uppercase">Saldo Pendiente</span>
                    <span className="font-bold text-amber-800">${pendingBalance.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal para Registrar Pago */}
      {selectedBookingForPayment && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-xl border border-slate-100">
            <div>
              <h3 className="text-lg font-black text-[#1F2937]">Registrar Nuevo Pago</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Evento: Cumple de {selectedBookingForPayment.child_name}
              </p>
            </div>

            <div className="bg-[#F3F4F6] p-3 rounded-2xl text-xs space-y-1 border border-slate-200/60">
              <div className="flex justify-between">
                <span className="text-slate-500">Total:</span>
                <span className="font-bold">${(Number(selectedBookingForPayment.total_price) || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Abonado hasta hoy:</span>
                <span className="font-bold text-[#0D9488]">${(Number(selectedBookingForPayment.deposit_paid) || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1 font-bold">
                <span className="text-slate-700">Saldo pendiente:</span>
                <span className="text-amber-600">
                  ${((Number(selectedBookingForPayment.total_price) || 0) - (Number(selectedBookingForPayment.deposit_paid) || 0)).toLocaleString()}
                </span>
              </div>
            </div>

            <form onSubmit={handleAddPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Monto a agregar ($)
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  placeholder="Ej: 5000"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F3F4F6] border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedBookingForPayment(null)}
                  className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-[#1F2937] font-bold text-xs rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="flex-1 py-2 px-3 bg-[#0D9488] hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  {isSubmittingPayment ? 'Guardando...' : 'Confirmar Pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}