import Link from "next/link";
import Image from "next/image";
import { BrandGlyph } from "@/components/fundora-brand";
import { SiteNav } from "@/components/site-nav";
import { getSession } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

const publicStories = [
  {
    type: "Don",
    tag: "Clôturé",
    title: "Aide aux familles en urgence",
    amount: "€1,2M",
    text: "Campagne entièrement financée pour couvrir les frais médicaux, le loyer et les besoins essentiels de familles confrontées à des situations difficiles.",
  },
  {
    type: "Prêt",
    tag: "Validé",
    title: "Expansion d’une petite entreprise",
    amount: "€3,4M",
    text: "Un prêt déjà accordé à un commerce local pour acheter du matériel, embaucher du personnel et consolider son activité commerciale.",
  },
  {
    type: "Don",
    tag: "Terminé",
    title: "Soutien aux étudiants",
    amount: "€860K",
    text: "Aide financée pour des frais de scolarité, logement et ressources pédagogiques afin d’éviter l’abandon des études.",
  },
  {
    type: "Prêt",
    tag: "Remboursé",
    title: "Projet de mobilité durable",
    amount: "€2,7M",
    text: "Financement de véhicules électriques, installation de bornes et accompagnement d’une transition écologique déjà mise en place.",
  },
  {
    type: "Don",
    tag: "Réalisé",
    title: "Aide aux personnes âgées",
    amount: "€1,9M",
    text: "Des dons collectés pour soutenir les soins, l’aide à domicile et les séjours essentiels des personnes les plus vulnérables.",
  },
  {
    type: "Prêt",
    tag: "Déjà financé",
    title: "Création d’une activité locale",
    amount: "€5,6M",
    text: "Financement de l’ouverture d’un commerce, d’un atelier de production et d’une structure de services pour la communauté locale.",
  },
];

const testimonials = [
  {
    name: "Mariam A.",
    role: "Bénéficiaire de don",
    quote: "J’ai reçu un soutien concret au bon moment. Grâce à cette aide, ma famille a pu payer les factures urgentes et retrouver un peu de stabilité.",
  },
  {
    name: "Paul K.",
    role: "Client financement",
    quote: "Le prêt m’a permis de lancer mon projet et de sécuriser ma trésorerie. Le suivi était clair, simple et très professionnel.",
  },
  {
    name: "Sofia L.",
    role: "Entrepreneuse",
    quote: "La structure était transparente et le financement a aidé mon activité à démarrer sans blocage. Je recommande vraiment ce modèle.",
  },
  {
    name: "Nicolas R.",
    role: "Chef de petite entreprise",
    quote: "Le financement m’a donné la marge pour acheter le matériel nécessaire et développer mon équipe. C’était une étape décisive.",
  },
  {
    name: "Amina D.",
    role: "Étudiante aidée",
    quote: "Le soutien a permis de couvrir mon logement et mes frais d’études. Sans cette aide, je n’aurais pas pu continuer mon parcours.",
  },
  {
    name: "Karim H.",
    role: "Bénéficiaire de projet solidaire",
    quote: "Tout était bien expliqué, humain et rapide. Cette aide a transformé une situation difficile en un vrai tournant positif.",
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
              <Image src="/fundora-logo.png" alt="Fundora" width={949} height={776} className="hero-brand-image" unoptimized />
            </h1>
            <div className="subtitle-line">Financement. Connexion. Données réelles.</div>
            <p>
              Les publications publiques de l’équipe et les succès de la communauté sont affichés ici,
              sans exposer les demandes individuelles des utilisateurs.
            </p>
            <div className="feature-pills">
              <div className="pill-item">
                <span className="pill-icon">€</span>
                <span>Prêts<br />réussis</span>
              </div>
              <div className="pill-item">
                <span className="pill-icon">♥</span>
                <span>Dons<br />réalisés</span>
              </div>
              <div className="pill-item">
                <span className="pill-icon">✓</span>
                <span>Projets<br />validés</span>
              </div>
            </div>
            <div className="hero-actions" style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link className="primary-button" href={startHref}>{session ? "Ouvrir mon espace" : "Créer un compte"}</Link>
              <Link className="secondary-button" href="/pret">Voir les prêts</Link>
            </div>
          </div>
          <div className="hero-visual" aria-label="Fundora">
            <div className="country-flag">Deutschland</div>
            <div className="city-photo" />
          </div>
        </div>
      </section>

      <section className="brand-showcase" aria-label="Fundora Brand">
        <div className="brand-showcase-mark">
          <span className="brand-showcase-shape">F</span>
        </div>
        <div className="brand-showcase-name">Fundora</div>
      </section>

      <section className="feature-section stats-section" id="dashboard">
        <div className="stats-banner">
          <div className="stats-copy">
            <span className="eyebrow">Impact réel</span>
            <h2>Des campagnes déjà financées et des résultats visibles.</h2>
            <p>Les chiffres ci-dessous reflètent des actions déjà réalisées et validées.</p>
          </div>
          <div className="stats-metrics">
            <div className="metric-box">
              <strong>124</strong>
              <span>Campagnes clôturées</span>
            </div>
            <div className="metric-box">
              <strong>€18,4M</strong>
              <span>Montants déjà mobilisés</span>
            </div>
            <div className="metric-box">
              <strong>96%</strong>
              <span>Personnes satisfaites</span>
            </div>
          </div>
        </div>
      </section>

      <section className="feature-section process-section">
        <div className="section-heading">
          <span className="eyebrow">Comment ça marche</span>
          <h2>Un compte, un dossier, une décision enregistrée.</h2>
        </div>
        <div className="process-grid">
          <div className="process-card">
            <div className="process-number">01</div>
            <h3>Créer un compte</h3>
            <p>L’inscription écrit un utilisateur dans fundora_users. La connexion vérifie le mot de passe haché en base.</p>
          </div>
          <div className="process-card">
            <div className="process-number">02</div>
            <h3>Déposer un dossier</h3>
            <p>Prêt ou don : les informations et les pièces sont stockées dans PostgreSQL, pas dans le navigateur.</p>
          </div>
          <div className="process-card">
            <div className="process-number">03</div>
            <h3>Suivre la décision</h3>
            <p>L’équipe valide ou refuse le dossier. Le statut public et votre espace personnel se mettent à jour.</p>
          </div>
        </div>
      </section>

      <section className="feature-section">
        <div className="section-heading">
          <span className="eyebrow">Dons et prêts déjà réalisés</span>
          <h2>Des campagnes et financements déjà clôturés, avec des résultats concrets.</h2>
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
          <span className="eyebrow">Témoignages</span>
          <h2>Des personnes satisfaites par les dons, les prêts et le soutien reçu.</h2>
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
            <span className="eyebrow">Démarrer</span>
            <h2>Prêt à déposer un vrai dossier sur Fundora ?</h2>
          </div>
          <Link className="primary-button" href={startHref}>
            {session ? "Aller à mon espace" : "S’inscrire"}
          </Link>
        </div>
      </section>

      <footer className="site-footer">
        <div className="brand footer-brand" aria-label="Fundora">
          <BrandGlyph />
        </div>
      </footer>
    </main>
  );
}
