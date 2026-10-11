import Link from "next/link";
import Image from "next/image";
import { BrandGlyph } from "@/components/fundora-brand";
import { SiteNav } from "@/components/site-nav";
import { getSession } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

const publicStories = [
  {
    type: "Donación",
    tag: "Cerrado",
    title: "Ayuda a familias en emergencia",
    amount: "1,2M $",
    text: "Campaña totalmente financiada para cubrir los gastos médicos, el alquiler y las necesidades esenciales de familias que atraviesan situaciones difíciles.",
  },
  {
    type: "Préstamo",
    tag: "Validado",
    title: "Expansión de una pequeña empresa",
    amount: "3,4M $",
    text: "Un préstamo ya concedido a un comercio local para comprar material, contratar personal y consolidar su actividad comercial.",
  },
  {
    type: "Donación",
    tag: "Finalizado",
    title: "Apoyo a estudiantes",
    amount: "860K $",
    text: "Ayuda financiada para matrícula, alojamiento y recursos educativos para evitar el abandono de los estudios.",
  },
  {
    type: "Préstamo",
    tag: "Reembolsado",
    title: "Proyecto de movilidad sostenible",
    amount: "2,7M $",
    text: "Financiamiento de vehículos eléctricos, instalación de estaciones y acompañamiento de una transición ecológica ya en marcha.",
  },
  {
    type: "Donación",
    tag: "Realizado",
    title: "Ayuda a personas mayores",
    amount: "1,9M $",
    text: "Donaciones reunidas para apoyar cuidados, ayuda a domicilio y estancias esenciales para las personas más vulnerables.",
  },
  {
    type: "Préstamo",
    tag: "Ya financiado",
    title: "Creación de una actividad local",
    amount: "5,6M $",
    text: "Financiamiento para la apertura de un comercio, taller de producción y estructura de servicios para la comunidad local.",
  },
];

const testimonials = [
  {
    name: "Mariam A.",
    role: "Beneficiaria de donación",
    quote: "Recibí un apoyo concreto en el momento correcto. Gracias a esta ayuda, mi familia pudo pagar facturas urgentes y recuperar algo de estabilidad.",
  },
  {
    name: "Paul K.",
    role: "Cliente de financiación",
    quote: "El préstamo me permitió lanzar mi proyecto y asegurar mi flujo de caja. El seguimiento fue claro, simple y muy profesional.",
  },
  {
    name: "Sofia L.",
    role: "Empresaria",
    quote: "La estructura fue transparente y la financiación ayudó a mi actividad a arrancar sin bloqueos. Recomiendo este modelo sinceramente.",
  },
  {
    name: "Nicolas R.",
    role: "Jefe de pequeña empresa",
    quote: "La financiación me dio margen para comprar el material necesario y desarrollar mi equipo. Fue un paso decisivo.",
  },
  {
    name: "Amina D.",
    role: "Estudiante apoyada",
    quote: "El apoyo permitió cubrir mi vivienda y mis gastos de estudios. Sin esta ayuda, no habría podido continuar mi camino.",
  },
  {
    name: "Karim H.",
    role: "Beneficiario de proyecto solidario",
    quote: "Todo estaba bien explicado, humano y rápido. Esta ayuda transformó una situación difícil en un verdadero punto de inflexión positivo.",
  },
];

export default async function Home() {
  const session = await getSession();
  const startHref = session?.role === "admin" ? "/admin/dossiers" : session ? `/dashboard/${session.user}` : "/login";

  return (
    <main className="page-shell">
      <section className="hero-section hero-wide">
        <SiteNav current="home" />
        <div className="hero-content hero-split">
          <div className="hero-copy">
            <h1 className="hero-logo-heading">
              <Image src="/logo2.jpeg" alt="Fundación Amira Aldahab" width={949} height={776} className="hero-brand-image" unoptimized />
            </h1>
            <div className="subtitle-line">Financiación. Acceso. Datos reales.</div>
            <p>
              Las publicaciones públicas del equipo y los éxitos de la comunidad se muestran aquí,
              sin exponer las solicitudes individuales de los usuarios.
            </p>
            <div className="feature-pills">
              <div className="pill-item">
                <span className="pill-icon">$</span>
                <span>Préstamos<br />exitosos</span>
              </div>
              <div className="pill-item">
                <span className="pill-icon">♥</span>
                <span>Donaciones<br />realizadas</span>
              </div>
              <div className="pill-item">
                <span className="pill-icon">✓</span>
                <span>Proyectos<br />validados</span>
              </div>
            </div>
            <div className="hero-actions" style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link className="primary-button" href={startHref}>{session ? "Abrir mi espacio" : "Crear cuenta"}</Link>
              <Link className="secondary-button" href="/pret">Ver préstamos</Link>
            </div>
          </div>
          <div className="hero-visual" aria-label="Fundación Amira Aldahab">
            <div className="country-flag">Deutschland</div>
            <div className="city-photo" />
          </div>
        </div>
      </section>

      <section className="brand-showcase" aria-label="Fundación Amira Aldahab Brand">
        <div className="brand-showcase-mark">
          <span className="brand-showcase-shape">A</span>
        </div>
        <div className="brand-showcase-name">Fundación Amira Aldahab</div>
      </section>

      <section className="feature-section stats-section" id="dashboard">
        <div className="stats-banner">
          <div className="stats-copy">
            <span className="eyebrow">Impact real</span>
            <h2>Campañas ya financiadas y resultados visibles.</h2>
            <p>Las cifras que siguen reflejan acciones ya realizadas y validadas.</p>
          </div>
          <div className="stats-metrics">
            <div className="metric-box">
              <strong>124</strong>
              <span>Campañas cerradas</span>
            </div>
            <div className="metric-box">
              <strong>18,4M $</strong>
              <span>Montos ya movilizados</span>
            </div>
            <div className="metric-box">
              <strong>96%</strong>
              <span>Personas satisfechas</span>
            </div>
          </div>
        </div>
      </section>

      <section className="feature-section process-section">
        <div className="section-heading">
          <span className="eyebrow">Cómo funciona</span>
          <h2>Una cuenta, un expediente y una decisión registrada.</h2>
        </div>
        <div className="process-grid">
          <div className="process-card">
            <div className="process-number">01</div>
            <h3>Crear una cuenta</h3>
            <p>El registro crea un usuario en fundora_users. El inicio de sesión verifica la contraseña cifrada en la base de datos.</p>
          </div>
          <div className="process-card">
            <div className="process-number">02</div>
            <h3>Presentar un expediente</h3>
            <p>Préstamo o donación: la información y los documentos se almacenan en PostgreSQL, no en el navegador.</p>
          </div>
          <div className="process-card">
            <div className="process-number">03</div>
            <h3>Seguir la decisión</h3>
            <p>El equipo valida o rechaza el expediente. El estado público y tu espacio personal se actualizan.</p>
          </div>
        </div>
      </section>

      <section className="feature-section">
        <div className="section-heading">
          <span className="eyebrow">Donaciones y préstamos ya realizados</span>
          <h2>Campañas y financiaciones ya cerradas, con resultados concretos.</h2>
        </div>
        <div className="story-grid">
          {publicStories.map((story) => (
            <article key={story.title} className="story-card">
              <div className="story-meta">
                <span className="story-type">{story.type}</span>
                <span className="story-tag">{story.tag}</span>
              </div>
              <h3>{story.title}</h3>
              <div className="story-amount">{story.amount}</div>
              <p>{story.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="feature-section">
        <div className="section-heading">
          <span className="eyebrow">Testimonios</span>
          <h2>Personas satisfechas con las donaciones, préstamos y apoyo recibido.</h2>
        </div>
        <div className="testimonial-grid">
          {testimonials.map((item) => (
            <article key={item.name} className="testimonial-card">
              <div className="quote-mark">“</div>
              <p>{item.quote}</p>
              <div className="testimonial-author">
                <strong>{item.name}</strong>
                <span>{item.role}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="feature-section" id="contact">
        <div className="cta-panel">
          <div>
            <span className="eyebrow">Comenzar</span>
            <h2>¿Listo para presentar un expediente real en Fundación Amira Aldahab?</h2>
          </div>
          <Link className="primary-button" href={startHref}>
            {session ? "Ir a mi espacio" : "Registrarme"}
          </Link>
        </div>
      </section>

      <footer className="site-footer">
        <div className="brand footer-brand" aria-label="Fundación Amira Aldahab">
          <BrandGlyph />
        </div>
      </footer>
    </main>
  );
}
