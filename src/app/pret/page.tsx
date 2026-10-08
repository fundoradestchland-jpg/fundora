import Link from "next/link";
import { SiteNav } from "@/components/site-nav";

const requiredDocuments = [
  "Une pièce d’identité en cours de validité",
  "Des justificatifs de revenus et de dépenses",
  "Des relevés bancaires récents",
];

export default function LoanPage() {
  return (
    <main className="page-shell loan-page">
      <SiteNav current="pret" />

      <section className="donation-hero loan-application-hero">
        <span className="eyebrow">Demande de prêt</span>
        <h1>Présentez votre projet et faites votre demande de financement.</h1>
        <p>
          Complétez vos informations, indiquez votre besoin et joignez les justificatifs utiles.
          L’équipe Fundora étudiera ensuite votre dossier et vous informera de la suite dans votre espace.
        </p>
        <Link href="/pret/demande" className="primary-button">Faire une demande de prêt</Link>
      </section>

      <section className="loan-application-info" aria-label="Informations sur la demande de prêt">
        <article className="panel loan-info-card">
          <span className="eyebrow">Votre dossier</span>
          <h2>Les informations à préparer</h2>
          <p>Vous devrez indiquer votre identité et vos coordonnées, le montant souhaité, la durée envisagée, l’objet du prêt et votre situation financière.</p>
        </article>

        <article className="panel loan-info-card">
          <span className="eyebrow">Documents à joindre</span>
          <h2>Documents obligatoires à joindre</h2>
          <ul>
            {requiredDocuments.map((document) => <li key={document}>{document}</li>)}
          </ul>
          <p>Chaque document dispose de son propre emplacement dans le formulaire. Vous devrez joindre les trois pour envoyer votre demande.</p>
        </article>

        <article className="panel loan-info-card">
          <span className="eyebrow">Frais éventuels</span>
          <h2>Une information avant tout engagement</h2>
          <p>
            Certains documents ou démarches peuvent entraîner de petits frais. Le cas échéant,
            leur montant et leur motif vous seront communiqués dans votre espace avant toute étape
            concernée. Le dépôt de la demande ne déclenche aucun paiement automatique.
          </p>
        </article>
      </section>

      <section className="loan-application-next">
        <div>
          <span className="eyebrow">Prêt à commencer ?</span>
          <h2>Votre demande se fait en quelques étapes.</h2>
          <p>Vous pourrez relire les informations et les documents avant de transmettre votre dossier.</p>
        </div>
        <Link href="/pret/demande" className="primary-button">Commencer ma demande</Link>
      </section>
    </main>
  );
}
