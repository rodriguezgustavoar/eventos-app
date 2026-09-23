import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-6 antialiased">
      {/* Encabezado / Branding */}
      <header className="pt-8 text-center max-w-sm mx-auto">
        <div className="inline-flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-teal-600/10 text-teal-600 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-2xl font-bold text-slate-900 tracking-tight">
            EventosApp
          </span>
        </div>
        <p className="text-slate-500 text-sm leading-relaxed">
          Tu agenda de eventos, salones y proveedores en un solo lugar.
        </p>
      </header>

      {/* Ilustración / Tarjeta destacada */}
      <main className="my-auto">
        <div className="bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 max-w-sm mx-auto text-center space-y-5">
          <div className="w-14 h-14 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center mx-auto border border-teal-100/60">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">
              Organizá tu próximo evento
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Encontrá salones, catering, animación y gestioná todos tus recordatorios de forma sencilla.
            </p>
          </div>
        </div>
      </main>

      {/* Botón de acción principal */}
      <footer className="space-y-3 max-w-sm w-full mx-auto pb-6">
        <Link
          href="/login"
          className="w-full block text-center py-3.5 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 transition-all shadow-md shadow-teal-600/20 active:scale-[0.99]"
        >
          Ingresar o Registrarse
        </Link>
      </footer>
    </div>
  )
}