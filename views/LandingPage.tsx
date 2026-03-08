import React, { useState, useEffect, useRef } from 'react';

/* ───────────────────── tiny helpers ───────────────────── */
const Section: React.FC<{ children: React.ReactNode; className?: string; id?: string }> = ({ children, className = '', id }) => (
  <section id={id} className={`px-5 sm:px-8 lg:px-12 py-20 sm:py-28 ${className}`}>{children}</section>
);
const Container: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`max-w-6xl mx-auto ${className}`}>{children}</div>
);
const Badge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-600 border border-brand-500/20 backdrop-blur-sm">
    <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
    {children}
  </span>
);

/* ───────────────────── Animated counter ───────────────── */
const Counter: React.FC<{ end: number; suffix?: string; duration?: number }> = ({ end, suffix = '', duration = 2000 }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const step = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.round(eased * end));
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
};

/* ───────────────────── Scroll-reveal wrapper ──────────── */
const Reveal: React.FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({ children, className = '', delay = 0 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisible(true);
    }, { threshold: 0.15 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

/* ───────────────────── Feature icons (inline SVG) ─────── */
const icons = {
  transactions: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  accounts: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />
    </svg>
  ),
  shared: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  currency: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  ai: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M3 3v18h18" /><path d="M18 17V9M13 17V5M8 17v-3" />
    </svg>
  ),
  debt: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  creditCard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <rect x="1" y="4" width="22" height="16" rx="2" /><path d="M1 10h22" /><path d="M6 16h4" />
    </svg>
  ),
  planner: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
    </svg>
  ),
  goals: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  ),
  transfer: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  ),
  support: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  language: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M5 8l6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6" />
    </svg>
  ),
};

/* ───────────────────── FEATURES DATA ──────────────────── */
const features = [
  { icon: icons.transactions, title: 'Control de transacciones', desc: 'Registra ingresos y gastos por categoria, fecha y cuenta. Todo organizado.' },
  { icon: icons.accounts, title: 'Multiples cuentas', desc: 'Maneja todas tus cuentas bancarias, billeteras y efectivo en un solo lugar.' },
  { icon: icons.shared, title: 'Cuentas compartidas', desc: 'Comparte gastos con pareja, roommates o equipo. Montos individuales, saldo compartido.' },
  { icon: icons.currency, title: 'Multi-moneda', desc: 'Cuentas en COP, USD, EUR o la moneda que necesites. Sin limites.' },
  { icon: icons.ai, title: 'Registro con IA', desc: 'Di "gaste 50k en uber" y la IA registra todo automaticamente. Asi de facil.' },
  { icon: icons.chart, title: 'Graficos mensuales', desc: 'Visualiza tu flujo de dinero con graficos claros. Entiende a donde va tu plata.' },
  { icon: icons.debt, title: 'Gestion de deudas', desc: 'Controla quien te debe y a quien le debes. Nunca pierdas el rastro.' },
  { icon: icons.creditCard, title: 'Tarjetas de credito', desc: 'Monitorea cupo usado, disponible y pagos. Controla la utilizacion de tus tarjetas.' },
  { icon: icons.planner, title: 'Planificador mensual', desc: 'Presupuesta tus gastos e ingresos. Compara lo planeado vs. lo real.' },
  { icon: icons.goals, title: 'Metas de ahorro', desc: 'Define metas, haz aportes y visualiza tu progreso hasta alcanzarlas.' },
  { icon: icons.transfer, title: 'Transferencias', desc: 'Mueve dinero entre cuentas de forma rapida. Todo queda registrado.' },
  { icon: icons.language, title: 'Multi-idioma', desc: 'Disponible en espanol e ingles, con soporte para diferentes zonas horarias.' },
];

/* ───────────────────── MAIN COMPONENT ─────────────────── */
export const LandingPage: React.FC<{ onGoToApp: () => void }> = ({ onGoToApp }) => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  // Enable body scroll for landing page (body has overflow-hidden for the app)
  useEffect(() => {
    document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleWaitlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    // TODO: connect to actual waitlist API (e.g. Firebase collection, Mailchimp, etc.)
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
    setEmail('');
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenu(false);
  };

  /* ───────── TERMS MODAL ───────── */
  const TermsModal = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowTerms(false)}>
      <div className="bg-white dark:bg-[#151520] rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-zinc-200 dark:border-white/10" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Terminos y Condiciones</h2>
          <button onClick={() => setShowTerms(false)} className="text-zinc-400 hover:text-zinc-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="prose prose-sm dark:prose-invert max-w-none text-zinc-600 dark:text-zinc-400 space-y-4 text-sm leading-relaxed">
          <p><strong>Ultima actualizacion:</strong> Marzo 2026</p>
          <h3 className="text-zinc-900 dark:text-white text-base font-semibold">1. Aceptacion de los terminos</h3>
          <p>Al acceder y utilizar uFlow ("el Servicio"), aceptas estar sujeto a estos Terminos y Condiciones. Si no estas de acuerdo con alguna parte de estos terminos, no podras acceder al servicio.</p>
          <h3 className="text-zinc-900 dark:text-white text-base font-semibold">2. Descripcion del servicio</h3>
          <p>uFlow es una plataforma de gestion financiera personal que permite a los usuarios registrar transacciones, gestionar cuentas, establecer metas de ahorro y recibir asistencia de inteligencia artificial para el manejo de sus finanzas.</p>
          <h3 className="text-zinc-900 dark:text-white text-base font-semibold">3. Cuentas de usuario</h3>
          <p>Para utilizar el Servicio debes crear una cuenta proporcionando informacion precisa y completa. Eres responsable de mantener la confidencialidad de tu cuenta y contrasena, y de restringir el acceso a tu dispositivo.</p>
          <h3 className="text-zinc-900 dark:text-white text-base font-semibold">4. Uso aceptable</h3>
          <p>Te comprometes a utilizar el Servicio unicamente para fines legales y de acuerdo con estos Terminos. No debes: (a) usar el Servicio de forma que infrinja leyes aplicables, (b) intentar acceder sin autorizacion a otros sistemas, (c) transmitir virus o codigo malicioso.</p>
          <h3 className="text-zinc-900 dark:text-white text-base font-semibold">5. Funcionalidad de IA</h3>
          <p>El Servicio incluye funcionalidades basadas en inteligencia artificial que proporcionan sugerencias y asistencia financiera. Estas sugerencias son solo informativas y no constituyen asesoria financiera profesional. No nos hacemos responsables de decisiones financieras tomadas basandose en las sugerencias de la IA.</p>
          <h3 className="text-zinc-900 dark:text-white text-base font-semibold">6. Propiedad intelectual</h3>
          <p>Todo el contenido, caracteristicas y funcionalidad del Servicio son propiedad exclusiva de uFlow y estan protegidos por leyes de propiedad intelectual.</p>
          <h3 className="text-zinc-900 dark:text-white text-base font-semibold">7. Limitacion de responsabilidad</h3>
          <p>uFlow se proporciona "tal cual" y "segun disponibilidad". No garantizamos que el Servicio sera ininterrumpido, seguro o libre de errores. En ningún caso seremos responsables por danos indirectos, incidentales o consecuentes.</p>
          <h3 className="text-zinc-900 dark:text-white text-base font-semibold">8. Modificaciones</h3>
          <p>Nos reservamos el derecho de modificar estos Terminos en cualquier momento. Los cambios entraran en vigor al publicarse en la plataforma. El uso continuado del Servicio despues de cualquier cambio constituye la aceptacion de los nuevos terminos.</p>
          <h3 className="text-zinc-900 dark:text-white text-base font-semibold">9. Contacto</h3>
          <p>Para preguntas sobre estos Terminos, contactanos a traves del sistema de soporte integrado en la aplicacion.</p>
        </div>
      </div>
    </div>
  );

  /* ───────── PRIVACY MODAL ───────── */
  const PrivacyModal = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowPrivacy(false)}>
      <div className="bg-white dark:bg-[#151520] rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-zinc-200 dark:border-white/10" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Politica de Privacidad</h2>
          <button onClick={() => setShowPrivacy(false)} className="text-zinc-400 hover:text-zinc-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="prose prose-sm dark:prose-invert max-w-none text-zinc-600 dark:text-zinc-400 space-y-4 text-sm leading-relaxed">
          <p><strong>Ultima actualizacion:</strong> Marzo 2026</p>
          <h3 className="text-zinc-900 dark:text-white text-base font-semibold">1. Informacion que recopilamos</h3>
          <p>Recopilamos la informacion que proporcionas directamente: nombre, correo electronico, datos de transacciones financieras, cuentas, metas de ahorro y deudas que registras en la plataforma.</p>
          <h3 className="text-zinc-900 dark:text-white text-base font-semibold">2. Como usamos tu informacion</h3>
          <p>Utilizamos tu informacion para: (a) proporcionar y mantener el Servicio, (b) generar analisis y graficos de tus finanzas, (c) alimentar el asistente de IA con contexto personalizado, (d) mejorar la experiencia del usuario.</p>
          <h3 className="text-zinc-900 dark:text-white text-base font-semibold">3. Almacenamiento y seguridad</h3>
          <p>Tus datos se almacenan de forma segura en Firebase (Google Cloud Platform) con encriptacion en transito y en reposo. Utilizamos autenticacion segura mediante Firebase Authentication con soporte para Google OAuth.</p>
          <h3 className="text-zinc-900 dark:text-white text-base font-semibold">4. Uso de inteligencia artificial</h3>
          <p>Cuando utilizas el asistente de IA, tus mensajes y contexto financiero (cuentas, categorias, tarjetas) se envian de forma segura a nuestro servidor y de ahi a la API de Anthropic (Claude) para generar respuestas. No almacenamos el contenido de las conversaciones de IA de forma permanente en nuestros servidores.</p>
          <h3 className="text-zinc-900 dark:text-white text-base font-semibold">5. Compartir informacion</h3>
          <p>No vendemos, comercializamos ni transferimos tu informacion personal a terceros. Los unicos servicios externos que reciben datos son: (a) Firebase/Google para almacenamiento, (b) Anthropic para funcionalidad de IA. Ambos cumplen con estandares de privacidad y seguridad.</p>
          <h3 className="text-zinc-900 dark:text-white text-base font-semibold">6. Cuentas compartidas</h3>
          <p>Al crear o unirte a una cuenta compartida, las transacciones en esa cuenta seran visibles para todos los miembros. Solo se comparten los datos de la cuenta compartida, no los de tus cuentas individuales.</p>
          <h3 className="text-zinc-900 dark:text-white text-base font-semibold">7. Retencion de datos</h3>
          <p>Mantenemos tus datos mientras tu cuenta este activa. Puedes solicitar la eliminacion de tu cuenta y todos los datos asociados en cualquier momento a traves de la configuracion de la aplicacion.</p>
          <h3 className="text-zinc-900 dark:text-white text-base font-semibold">8. Tus derechos</h3>
          <p>Tienes derecho a: (a) acceder a tus datos personales, (b) rectificar informacion inexacta, (c) solicitar la eliminacion de tus datos, (d) exportar tus datos en formato legible. Contactanos a traves del soporte integrado para ejercer estos derechos.</p>
          <h3 className="text-zinc-900 dark:text-white text-base font-semibold">9. Cambios en esta politica</h3>
          <p>Nos reservamos el derecho de actualizar esta politica. Notificaremos cambios significativos a traves de la aplicacion. El uso continuado del Servicio constituye la aceptacion de la politica actualizada.</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-dark-bg text-zinc-900 dark:text-white font-sans overflow-x-hidden selection:bg-brand-500/20 selection:text-brand-700">

      {/* ═══════════════ NAVBAR ═══════════════ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 dark:bg-dark-bg/80 backdrop-blur-xl shadow-sm border-b border-zinc-200/50 dark:border-white/5' : ''}`}>
        <Container className="flex items-center justify-between h-16 sm:h-20">
          <div className="flex items-center gap-2">
            <img src="/icon.png" alt="uFlow" className="w-8 h-8 sm:w-9 sm:h-9" />
            <span className="text-lg sm:text-xl font-bold tracking-tight">uFlow</span>
          </div>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8 text-sm text-zinc-500">
            <button onClick={() => scrollTo('features')} className="hover:text-zinc-900 dark:hover:text-white transition-colors">Funciones</button>
            <button onClick={() => scrollTo('demo')} className="hover:text-zinc-900 dark:hover:text-white transition-colors">Demo</button>
            <button onClick={() => scrollTo('waitlist')} className="hover:text-zinc-900 dark:hover:text-white transition-colors">Lista de espera</button>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={onGoToApp} className="hidden sm:inline-flex text-sm text-zinc-600 dark:text-zinc-400 hover:text-brand-600 dark:hover:text-brand-400 font-medium transition-colors">
              Iniciar sesion
            </button>
            <button onClick={() => scrollTo('waitlist')} className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-brand-500 rounded-full shadow-neon-sm hover:shadow-neon transition-all hover:brightness-110 active:scale-95">
              Unirse gratis
            </button>
            {/* Mobile hamburger */}
            <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden p-2 text-zinc-500">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                {mobileMenu ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </Container>

        {/* Mobile menu */}
        {mobileMenu && (
          <div className="md:hidden bg-white/95 dark:bg-dark-bg/95 backdrop-blur-xl border-b border-zinc-200/50 dark:border-white/5 pb-4">
            <Container className="flex flex-col gap-3 pt-2">
              <button onClick={() => scrollTo('features')} className="text-sm text-left px-2 py-2 text-zinc-600 hover:text-brand-600 transition-colors">Funciones</button>
              <button onClick={() => scrollTo('demo')} className="text-sm text-left px-2 py-2 text-zinc-600 hover:text-brand-600 transition-colors">Demo</button>
              <button onClick={() => scrollTo('waitlist')} className="text-sm text-left px-2 py-2 text-zinc-600 hover:text-brand-600 transition-colors">Lista de espera</button>
              <button onClick={onGoToApp} className="text-sm text-left px-2 py-2 text-brand-600 font-medium">Iniciar sesion</button>
            </Container>
          </div>
        )}
      </nav>

      {/* ═══════════════ HERO ═══════════════ */}
      <Section className="pt-32 sm:pt-40 pb-16 sm:pb-20 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-brand-500/[0.04] rounded-full blur-[120px]" />
          <div className="absolute top-40 right-0 w-[400px] h-[400px] bg-fuchsia-500/[0.03] rounded-full blur-[100px]" />
        </div>

        <Container className="relative">
          <div className="max-w-3xl mx-auto text-center">
            <Reveal>
              <Badge>Tu copiloto financiero personal</Badge>
            </Reveal>

            <Reveal delay={100}>
              <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08]">
                Tus finanzas,
                <br />
                <span className="bg-gradient-to-r from-brand-600 via-brand-500 to-fuchsia-500 bg-clip-text text-transparent">bajo control total</span>
              </h1>
            </Reveal>

            <Reveal delay={200}>
              <p className="mt-6 text-base sm:text-lg text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto leading-relaxed">
                Registra gastos con IA, gestiona multiples cuentas, comparte finanzas con quien quieras y toma decisiones con datos reales. Todo en una sola app.
              </p>
            </Reveal>

            <Reveal delay={300}>
              <form onSubmit={handleWaitlist} className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="flex-1 px-5 py-3 rounded-full bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50 shadow-sm placeholder:text-zinc-400"
                />
                <button
                  type="submit"
                  className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-brand-500 rounded-full shadow-neon-sm hover:shadow-neon transition-all hover:brightness-110 active:scale-95 whitespace-nowrap"
                >
                  {submitted ? 'Te avisaremos!' : 'Unirme a la lista'}
                </button>
              </form>
              <p className="mt-3 text-xs text-zinc-400">Gratis. Sin spam. Te avisamos cuando este listo.</p>
            </Reveal>

            {/* Hero mockup / phone frame */}
            <Reveal delay={400}>
              <div className="mt-14 relative">
                {/* Glow behind */}
                <div className="absolute inset-0 bg-gradient-to-t from-brand-500/10 to-transparent rounded-3xl blur-2xl -z-10 scale-95" />
                <div className="bg-white dark:bg-dark-surface rounded-2xl sm:rounded-3xl border border-zinc-200/80 dark:border-white/10 shadow-premium overflow-hidden">
                  {/* Browser bar */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-zinc-50 dark:bg-white/5 border-b border-zinc-200/50 dark:border-white/5">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 ml-3">
                      <div className="max-w-xs mx-auto px-3 py-1 bg-white dark:bg-white/10 rounded-md text-[10px] text-zinc-400 font-mono text-center">app.uflow.com</div>
                    </div>
                  </div>
                  {/* App screenshot placeholder */}
                  <div className="aspect-[16/9] bg-gradient-to-br from-brand-50 via-white to-fuchsia-50 dark:from-dark-bg dark:via-dark-surface dark:to-brand-950 flex items-center justify-center relative">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto bg-brand-500/10 rounded-2xl flex items-center justify-center mb-4">
                        <img src="/icon.png" alt="uFlow" className="w-10 h-10" />
                      </div>
                      <p className="text-sm text-zinc-400 font-medium">Vista previa del dashboard</p>
                      <p className="text-xs text-zinc-300 mt-1">Proximamente</p>
                    </div>
                    {/* Decorative floating cards */}
                    <div className="absolute top-8 right-8 px-4 py-3 bg-white dark:bg-white/10 rounded-xl shadow-lg border border-zinc-200/50 dark:border-white/10 hidden sm:block animate-float">
                      <p className="text-[10px] text-zinc-400 font-mono">BALANCE</p>
                      <p className="text-lg font-bold text-green-600 font-mono">+$2,450,000</p>
                    </div>
                    <div className="absolute bottom-8 left-8 px-4 py-3 bg-white dark:bg-white/10 rounded-xl shadow-lg border border-zinc-200/50 dark:border-white/10 hidden sm:block animate-float" style={{ animationDelay: '2s' }}>
                      <p className="text-[10px] text-zinc-400 font-mono">AI</p>
                      <p className="text-xs text-zinc-600 dark:text-zinc-300">"Registre 50k en transporte"</p>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </Container>
      </Section>

      {/* ═══════════════ SOCIAL PROOF BAR ═══════════════ */}
      <div className="border-y border-zinc-200/50 dark:border-white/5 bg-zinc-50/50 dark:bg-white/[0.02]">
        <Container className="py-8 sm:py-10">
          <Reveal>
            <div className="flex flex-wrap justify-center gap-x-10 gap-y-4 items-center">
              <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider w-full sm:w-auto text-center">Construido con</p>
              <span className="text-zinc-300 dark:text-zinc-600 font-bold text-sm">React</span>
              <span className="text-zinc-300 dark:text-zinc-600 font-bold text-sm">Firebase</span>
              <span className="text-zinc-300 dark:text-zinc-600 font-bold text-sm">Claude AI</span>
              <span className="text-zinc-300 dark:text-zinc-600 font-bold text-sm">TypeScript</span>
              <span className="text-zinc-300 dark:text-zinc-600 font-bold text-sm">Tailwind</span>
            </div>
          </Reveal>
        </Container>
      </div>

      {/* ═══════════════ FEATURES GRID ═══════════════ */}
      <Section id="features">
        <Container>
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Reveal>
              <Badge>Funcionalidades</Badge>
            </Reveal>
            <Reveal delay={100}>
              <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight">Todo lo que necesitas para tus finanzas</h2>
            </Reveal>
            <Reveal delay={200}>
              <p className="mt-4 text-zinc-500 text-base">Cada funcion fue disenada para que manejar tu dinero sea rapido, simple y hasta satisfactorio.</p>
            </Reveal>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {features.map((f, i) => (
              <Reveal key={i} delay={i * 60}>
                <div className="group p-5 sm:p-6 rounded-2xl bg-white dark:bg-white/[0.03] border border-zinc-200/60 dark:border-white/5 hover:border-brand-500/30 dark:hover:border-brand-500/20 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center mb-4 group-hover:bg-brand-500 group-hover:text-white group-hover:shadow-neon-sm transition-all duration-300">
                    {f.icon}
                  </div>
                  <h3 className="font-semibold text-sm mb-1.5">{f.title}</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      {/* ═══════════════ AI HIGHLIGHT ═══════════════ */}
      <Section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-500/[0.03] via-transparent to-fuchsia-500/[0.03] pointer-events-none" />
        <Container>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <Reveal>
              <div>
                <Badge>Inteligencia artificial</Badge>
                <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight">
                  Di lo que gastaste.<br />
                  <span className="text-brand-500">La IA hace el resto.</span>
                </h2>
                <p className="mt-4 text-zinc-500 leading-relaxed">
                  Escribe "almorce 15k con nequi" y uFlow registra el gasto, selecciona la categoria, asigna la cuenta correcta y elige la fecha. Sin formularios. Sin clicks innecesarios.
                </p>
                <div className="mt-6 space-y-3">
                  {[
                    'Registro de transacciones en lenguaje natural',
                    'Deteccion automatica de categoria y cuenta',
                    'Consejero financiero personal 24/7',
                    'Multiples gastos en un solo mensaje',
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0 mt-0.5">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3"><path d="M20 6L9 17l-5-5" /></svg>
                      </div>
                      <span className="text-sm text-zinc-600 dark:text-zinc-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={200}>
              <div className="relative">
                <div className="absolute inset-0 bg-brand-500/5 rounded-3xl blur-2xl -z-10" />
                <div className="bg-white dark:bg-dark-surface rounded-2xl border border-zinc-200/60 dark:border-white/10 shadow-premium p-5 space-y-3">
                  {/* Chat simulation */}
                  <div className="flex justify-end">
                    <div className="px-4 py-2.5 bg-brand-500 text-white rounded-2xl rounded-tr-md text-sm max-w-[80%]">
                      Almorce 15k y gaste 8k en uber ayer
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="px-4 py-2.5 bg-zinc-100 dark:bg-white/5 rounded-2xl rounded-tl-md text-sm max-w-[85%] text-zinc-700 dark:text-zinc-300">
                      <p className="font-medium mb-2">Listo! Registre 2 transacciones:</p>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between px-3 py-2 bg-white dark:bg-white/5 rounded-lg">
                          <span>Food - Almuerzo</span>
                          <span className="font-mono font-bold text-zinc-900 dark:text-white">-$15,000</span>
                        </div>
                        <div className="flex justify-between px-3 py-2 bg-white dark:bg-white/5 rounded-lg">
                          <span>Transport - Uber</span>
                          <span className="font-mono font-bold text-zinc-900 dark:text-white">-$8,000</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="px-4 py-2.5 bg-brand-500 text-white rounded-2xl rounded-tr-md text-sm max-w-[80%]">
                      Cuanto llevo gastado este mes?
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="px-4 py-2.5 bg-zinc-100 dark:bg-white/5 rounded-2xl rounded-tl-md text-sm max-w-[85%] text-zinc-700 dark:text-zinc-300">
                      Llevas $847,000 en gastos este mes. Tu categoria mas alta es Food con $230,000. Vas bien comparado con el mes pasado!
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </Container>
      </Section>

      {/* ═══════════════ VIDEO DEMO ═══════════════ */}
      <Section id="demo" className="bg-zinc-50/80 dark:bg-white/[0.02]">
        <Container>
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Reveal>
              <Badge>Demo</Badge>
            </Reveal>
            <Reveal delay={100}>
              <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight">Mira uFlow en accion</h2>
            </Reveal>
            <Reveal delay={200}>
              <p className="mt-4 text-zinc-500">Un recorrido rapido por las funcionalidades principales de la app.</p>
            </Reveal>
          </div>

          <Reveal delay={300}>
            <div className="relative max-w-4xl mx-auto">
              <div className="absolute inset-0 bg-gradient-to-t from-brand-500/10 to-fuchsia-500/5 rounded-3xl blur-2xl -z-10 scale-95" />
              <div className="aspect-video bg-white dark:bg-dark-surface rounded-2xl sm:rounded-3xl border border-zinc-200/60 dark:border-white/10 shadow-premium flex items-center justify-center overflow-hidden">
                {/* Video placeholder — replace src with actual video */}
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto rounded-full bg-brand-500/10 flex items-center justify-center mb-4 group cursor-pointer hover:bg-brand-500/20 transition-colors">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-brand-500 ml-1">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <p className="text-sm text-zinc-400 font-medium">Video proximamente</p>
                  <p className="text-xs text-zinc-300 dark:text-zinc-600 mt-1">Estamos grabando algo increible</p>
                </div>
              </div>
            </div>
          </Reveal>
        </Container>
      </Section>

      {/* ═══════════════ STATS ═══════════════ */}
      <Section>
        <Container>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {[
              { value: 12, suffix: '+', label: 'Funcionalidades integradas' },
              { value: 3, suffix: 's', label: 'Para registrar un gasto con IA' },
              { value: 5, suffix: '+', label: 'Monedas soportadas' },
              { value: 100, suffix: '%', label: 'Gratis durante el beta' },
            ].map((stat, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="text-center">
                  <p className="text-3xl sm:text-4xl lg:text-5xl font-bold text-brand-500">
                    <Counter end={stat.value} suffix={stat.suffix} />
                  </p>
                  <p className="mt-2 text-xs sm:text-sm text-zinc-500">{stat.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      {/* ═══════════════ SHARED ACCOUNTS HIGHLIGHT ═══════════════ */}
      <Section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-l from-brand-500/[0.03] via-transparent to-fuchsia-500/[0.03] pointer-events-none" />
        <Container>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <Reveal delay={200} className="order-2 lg:order-1">
              <div className="relative">
                <div className="absolute inset-0 bg-fuchsia-500/5 rounded-3xl blur-2xl -z-10" />
                <div className="bg-white dark:bg-dark-surface rounded-2xl border border-zinc-200/60 dark:border-white/10 shadow-premium p-6 space-y-4">
                  {/* Shared account simulation */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-fuchsia-500 flex items-center justify-center text-white text-sm font-bold">
                        {icons.shared}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">Apartamento</p>
                        <p className="text-[10px] text-zinc-400 font-mono">3 MIEMBROS</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-zinc-400">Saldo compartido</p>
                      <p className="font-bold font-mono text-brand-500">$1,250,000</p>
                    </div>
                  </div>
                  <div className="h-px bg-zinc-200 dark:bg-white/5" />
                  <div className="space-y-2">
                    {['Karoll — $450,000', 'Andres — $400,000', 'Laura — $400,000'].map((m, i) => (
                      <div key={i} className="flex justify-between text-xs px-3 py-2 bg-zinc-50 dark:bg-white/5 rounded-lg">
                        <span className="text-zinc-600 dark:text-zinc-300">{m.split(' — ')[0]}</span>
                        <span className="font-mono font-bold text-zinc-900 dark:text-white">{m.split(' — ')[1]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal className="order-1 lg:order-2">
              <div>
                <Badge>Cuentas compartidas</Badge>
                <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight">
                  Finanzas en equipo,
                  <br />
                  <span className="text-brand-500">sin complicaciones.</span>
                </h2>
                <p className="mt-4 text-zinc-500 leading-relaxed">
                  Crea cuentas compartidas con tu pareja, roommates o equipo. Cada quien registra sus gastos, ven el saldo real en tiempo real y mantienen cuentas claras — sin WhatsApp ni excels.
                </p>
                <div className="mt-6 space-y-3">
                  {[
                    'Montos individuales por miembro',
                    'Saldo compartido en tiempo real',
                    'Historial de transacciones unificado',
                    'Invita con un codigo unico',
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0 mt-0.5">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3"><path d="M20 6L9 17l-5-5" /></svg>
                      </div>
                      <span className="text-sm text-zinc-600 dark:text-zinc-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </Container>
      </Section>

      {/* ═══════════════ FINAL CTA ═══════════════ */}
      <Section id="waitlist" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-500/[0.04] via-brand-500/[0.02] to-transparent pointer-events-none" />
        <Container>
          <Reveal>
            <div className="relative max-w-2xl mx-auto text-center">
              <div className="absolute inset-0 bg-brand-500/5 rounded-3xl blur-3xl -z-10 scale-110" />
              <div className="bg-white dark:bg-dark-surface rounded-3xl border border-zinc-200/60 dark:border-white/10 shadow-premium p-8 sm:p-12">
                <div className="w-14 h-14 mx-auto bg-brand-500/10 rounded-2xl flex items-center justify-center mb-6">
                  <img src="/icon.png" alt="uFlow" className="w-9 h-9" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  Se de los primeros en usar uFlow
                </h2>
                <p className="mt-3 text-zinc-500 text-sm sm:text-base max-w-md mx-auto">
                  Estamos en beta privado. Dejanos tu email y te avisaremos cuando tengas acceso. Sin spam, lo prometemos.
                </p>
                <form onSubmit={handleWaitlist} className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                  <input
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="flex-1 px-5 py-3 rounded-full bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50 placeholder:text-zinc-400"
                  />
                  <button
                    type="submit"
                    className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-brand-500 rounded-full shadow-neon-sm hover:shadow-neon transition-all hover:brightness-110 active:scale-95 whitespace-nowrap"
                  >
                    {submitted ? 'Listo!' : 'Unirme gratis'}
                  </button>
                </form>
                {submitted && (
                  <p className="mt-3 text-sm text-green-600 font-medium animate-in fade-in slide-in-from-bottom-2 duration-300">
                    Genial! Te notificaremos cuando tu acceso este listo.
                  </p>
                )}
              </div>
            </div>
          </Reveal>
        </Container>
      </Section>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="border-t border-zinc-200/50 dark:border-white/5 bg-white/50 dark:bg-dark-bg">
        <Container className="py-12 sm:py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <img src="/icon.png" alt="uFlow" className="w-8 h-8" />
                <span className="text-lg font-bold">uFlow</span>
              </div>
              <p className="text-sm text-zinc-500 leading-relaxed max-w-xs">
                Tu copiloto financiero personal. Controla, planifica y crece — todo desde un solo lugar.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold text-sm mb-3">Producto</h4>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li><button onClick={() => scrollTo('features')} className="hover:text-brand-500 transition-colors">Funcionalidades</button></li>
                <li><button onClick={() => scrollTo('demo')} className="hover:text-brand-500 transition-colors">Demo</button></li>
                <li><button onClick={() => scrollTo('waitlist')} className="hover:text-brand-500 transition-colors">Lista de espera</button></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold text-sm mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li><button onClick={() => setShowTerms(true)} className="hover:text-brand-500 transition-colors">Terminos y condiciones</button></li>
                <li><button onClick={() => setShowPrivacy(true)} className="hover:text-brand-500 transition-colors">Politica de privacidad</button></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold text-sm mb-3">Soporte</h4>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li><button onClick={onGoToApp} className="hover:text-brand-500 transition-colors">Iniciar sesion</button></li>
                <li><span>Contacto via app</span></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-zinc-200/50 dark:border-white/5 flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-xs text-zinc-400">&copy; {new Date().getFullYear()} uFlow. Todos los derechos reservados.</p>
            <div className="flex gap-4 text-xs text-zinc-400">
              <button onClick={() => setShowTerms(true)} className="hover:text-brand-500 transition-colors">Terminos</button>
              <button onClick={() => setShowPrivacy(true)} className="hover:text-brand-500 transition-colors">Privacidad</button>
            </div>
          </div>
        </Container>
      </footer>

      {/* ═══════════════ MODALS ═══════════════ */}
      {showTerms && <TermsModal />}
      {showPrivacy && <PrivacyModal />}
    </div>
  );
};
