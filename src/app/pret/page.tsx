import Link from "next/link";
import { SiteNav } from "@/components/site-nav";

const requiredDocuments = [
  "Una identificación vigente",
  "Extractos bancarios recientes",
];

export default function LoanPage() {
  return (
    <main className="page-shell loan-page">
      <SiteNav current="pret" />

      <section className="donation-hero loan-application-hero">
        <span className="eyebrow">Solicitud de préstamo</span>
        <h1>Presenta tu proyecto y haz tu solicitud de financiación.</h1>
        <p>
          Completa tu información, indica tu necesidad y adjunta los documentos útiles.
          El equipo de Fundación Amira Aldahab revisará tu expediente y te informará del siguiente paso en tu espacio.
        </p>
        <Link href="/pret/demande" className="primary-button">Hacer una solicitud de préstamo</Link>
      </section>

      <section className="loan-application-info" aria-label="Información sobre la solicitud de préstamo">
        <article className="panel loan-info-card">
          <span className="eyebrow">Tu expediente</span>
          <h2>Información que debes preparar</h2>
          <p>Deberás indicar tu identidad y datos de contacto, el monto solicitado, la duración en meses, el motivo del préstamo y tu situación financiera.</p>
        </article>

        <article className="panel loan-info-card">
          <span className="eyebrow">Documentos a adjuntar</span>
          <h2>Documentos obligatorios</h2>
          <ul>
            {requiredDocuments.map((document) => <li key={document}>{document}</li>)}
          </ul>
          <p>Cada documento tiene su propio campo en el formulario. Deberás adjuntar los dos para enviar tu solicitud.</p>
        </article>

        <article className="panel loan-info-card">
          <span className="eyebrow">Posibles gastos</span>
          <h2>Información antes de comprometerse</h2>
          <p>
            Algunos documentos o trámites pueden implicar pequeños gastos. En ese caso,
            su importe y motivo te serán comunicados en tu espacio antes de cualquier paso relacionado.
            El envío de la solicitud no activa ningún pago automático.
          </p>
        </article>
      </section>

      <section className="loan-application-next">
        <div>
          <span className="eyebrow">¿Listo para empezar?</span>
          <h2>Tu solicitud se realiza en pocos pasos.</h2>
          <p>Puedes revisar la información y los documentos antes de enviar tu expediente.</p>
        </div>
        <Link href="/pret/demande" className="primary-button">Comenzar mi solicitud</Link>
      </section>
    </main>
  );
}
