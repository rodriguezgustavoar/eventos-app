import Link from 'next/link'
import Image from 'next/image'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white flex flex-col justify-between antialiased">
      
      {/* BARRA DE MENÚ SUPERIOR (NAVBAR) */}
      <header className="w-full border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          
          {/* Logo a la izquierda */}
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.png"
              alt="Festejamos Logo"
              width={160}
              height={55}
              className="object-contain"
              priority
            />
          </Link>

          {/* Opciones del menú a la derecha */}
          <nav className="flex items-center gap-8">
            <Link href="/" className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors">
              Inicio
            </Link>
            <Link href="/clientes" className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors">
              Clientes
            </Link>
            <Link href="/contacto" className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors">
              Contacto
            </Link>
            
            {/* Botón de Ingresar */}
            <Link
              href="/login"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-pink-500 text-white text-sm font-semibold rounded-xl hover:opacity-95 transition-all shadow-md shadow-pink-500/20 active:scale-[0.98]"
            >
              Ingresar
            </Link>
          </nav>

        </div>
      </header>

      {/* Sección Central: Funcionalidades */}
      <main className="max-w-6xl mx-auto w-full px-6 my-12 space-y-12 flex-grow">

        {/* SECCIÓN DE FUNCIONALIDADES */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <h3 className="text-3xl font-extrabold text-[#0B2545]">
              Todo lo que podés hacer con Festejamos
            </h3>
            <p className="text-sm text-slate-500">
              Herramientas diseñadas para que cada celebración sea inolvidable.
            </p>
          </div>

          {/* Grid configurado a 4 columnas con imágenes en cada tarjeta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Tarjeta 1: Agenda y Turnos */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-md shadow-slate-200/50 border border-slate-100 hover:border-blue-200 transition-all flex flex-col justify-between">
              <div className="relative h-36 w-full bg-slate-100">
                <Image
                  src="/agenda.jpg"
                  alt="Agenda y Turnos"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-5 space-y-2">
                <h4 className="font-bold text-[#0B2545] text-base">Agenda y Turnos</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Reservá fechas y gestioná los turnos de tus clientes.
                </p>
              </div>
            </div>

            {/* Tarjeta 2: Control de Eventos */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-md shadow-slate-200/50 border border-slate-100 hover:border-pink-200 transition-all flex flex-col justify-between">
              <div className="relative h-36 w-full bg-slate-100">
                <Image
                  src="/eventocreado.jpg"
                  alt="Control de Eventos"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-5 space-y-2">
                <h4 className="font-bold text-[#0B2545] text-base">Control de Eventos</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Tus clientes podrán gestionar sus eventos, viendo detalles e invitados confirmados.
                </p>
              </div>
            </div>

            {/* Tarjeta 3: Precios Claros */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-md shadow-slate-200/50 border border-slate-100 hover:border-amber-200 transition-all flex flex-col justify-between">
              <div className="relative h-36 w-full bg-slate-100">
                <Image
                  src="/turnostarifas.jpg"
                  alt="Precios Claros"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-5 space-y-2">
                <h4 className="font-bold text-[#0B2545] text-base">Precios Claros</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Defini turnos y tarifas según días, feriados, o como lo quieras organizar.
                </p>
              </div>
            </div>

            {/* Tarjeta 4: Invitaciones */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-md shadow-slate-200/50 border border-slate-100 hover:border-teal-200 transition-all flex flex-col justify-between">
              <div className="relative h-36 w-full bg-slate-100">
                <Image
                  src="/invitacion.jpg"
                  alt="Invitaciones Digitales"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-5 space-y-2">
                <h4 className="font-bold text-[#0B2545] text-base">Invitaciones</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Enviá invitaciones y gestioná confirmaciones en tiempo real.
                </p>
              </div>
            </div>

          </div>
        </section>

      </main>

      {/* Pie de página sencillo */}
      <footer className="w-full border-t border-slate-100 py-6 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} Festejamos. Todos los derechos reservados.</p>
      </footer>

    </div>
  )
}