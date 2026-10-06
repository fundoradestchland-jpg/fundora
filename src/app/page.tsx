const landingFeatures = [
  {
    title: "Für Privatpersonen",
    text: "Du brauchst eine klare Lösung für deinen aktuellen Bedarf? Fundora hilft dir, deine Finanzierung verständlich zu strukturieren.",
  },
  {
    title: "Für Projekte & Ziele",
    text: "Projekte, Ideen und soziale Initiativen können auf Fundora sichtbar werden und die Unterstützung erhalten, die sie brauchen.",
  },
  {
    title: "Für Unterstützer",
    text: "Du möchtest Menschen oder Projekte mit Vertrauen fördern? Fundora macht den Weg transparent, nachvollziehbar und sicher.",
  },
];

const financingSteps = [
  "Konto erstellen",
  "Finanzierungsbedarf eingeben",
  "Dokumente und KYC hochladen",
  "Entscheidung und Vertragsabschluss",
];

const donationFields = [
  "Titel der Kampagne",
  "Beschreibung",
  "Zielbetrag",
  "Kategorie",
  "Beförderter / Empfänger",
  "Land",
  "Dokumente & Nachweise",
  "Bild / Medien",
  "Enddatum",
];

const fundingSummary = [
  { label: "Betrag", value: "€ 12.500" },
  { label: "Laufzeit", value: "36 Monate" },
  { label: "Monatsrate", value: "€ 388,74" },
  { label: "Zweck", value: "Geschäftsbedarf" },
];

const donationSummary = [
  { label: "Ziel", value: "€ 8.000" },
  { label: "Gesammelt", value: "€ 4.250" },
  { label: "Ende", value: "14.11.2026" },
  { label: "Kategorie", value: "Soziale Hilfe" },
];

const dashboardCards = [
  { label: "Gesamtprofil", value: "85%" },
  { label: "KYC Status", value: "In Prüfung" },
  { label: "Anträge", value: "02" },
  { label: "Spenden", value: "€ 420" },
];

const alerts = [
  "Dokumente zur Identitätsprüfung fehlen noch.",
  "Dein Finanzierungsvorschlag wurde geprüft.",
  "Eine neue Kampagne wurde erfolgreich gespeichert.",
];

const onboardingSteps = [
  "Konto erstellen",
  "Persönliche Daten bestätigen",
  "KYC-Upload prüfen",
  "Freigabe für Finanzierung",
];

const onboardingChecklist = [
  { label: "Personalausweis", value: "Erfolgreich hochgeladen" },
  { label: "Wohnsitznachweis", value: "In Prüfung" },
  { label: "Zweckbeschreibung", value: "Abgeschlossen" },
  { label: "Datenschutzeinwilligung", value: "Akzeptiert" },
];

const walletStats = [
  { label: "Revenus", value: "€ 4.820" },
  { label: "Demandes", value: "12" },
  { label: "Dons", value: "€ 2.130" },
];

const recentRequests = [
  { title: "Prêt personnel", amount: "€ 2.400", status: "Approuvé" },
  { title: "Aide familiale", amount: "€ 1.100", status: "En cours" },
  { title: "Projet social", amount: "€ 820", status: "Validé" },
];

const chartBars = [26, 42, 58, 64, 72, 88, 96];

function BrandGlyph() {
  return (
    <svg viewBox="0 0 440 300" className="brand-glyph" aria-hidden="true">
      <defs>
        <linearGradient id="fundoraLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0a62d9" />
          <stop offset="50%" stopColor="#1ea3ff" />
          <stop offset="100%" stopColor="#0d3e9f" />
        </linearGradient>
      </defs>

      <path
        d="M152 40L271 40L302 71L183 71L152 40Z"
        fill="rgba(255,255,255,0.22)"
      />
      <path
        d="M145 18L250 18L304 69L236 69L145 18Z"
        fill="url(#fundoraLogoGradient)"
      />
      <path
        d="M131 67L237 67L305 135L305 170L204 170L164 124L129 124L131 67Z"
        fill="url(#fundoraLogoGradient)"
      />
      <path
        d="M97 127L224 127L226 158L137 158L100 201L50 201L97 127Z"
        fill="url(#fundoraLogoGradient)"
      />
      <path
        d="M229 118L335 118L380 161L380 193L273 193L229 118Z"
        fill="url(#fundoraLogoGradient)"
      />
      <path
        d="M126 156L258 156L273 183L131 183L126 156Z"
        fill="#0d56bf"
      />
      <path
        d="M170 183L308 183L332 222L310 255H142L170 183Z"
        fill="url(#fundoraLogoGradient)"
      />
      <path
        d="M121 190L233 190L247 222L130 222L121 190Z"
        fill="rgba(255,255,255,0.22)"
      />
      <path
        d="M169 106L258 106L285 141L170 141L169 106Z"
        fill="rgba(255,255,255,0.2)"
      />
      <path
        d="M75 82L129 82L154 125L91 125L75 82Z"
        fill="rgba(255,255,255,0.18)"
      />
      <path
        d="M200 34L240 34L252 53L216 53L200 34Z"
        fill="rgba(255,255,255,0.35)"
      />
      <path
        d="M248 131L286 131L293 157L253 157L248 131Z"
        fill="rgba(255,255,255,0.16)"
      />
      <path
        d="M261 240L330 240L338 255H258L261 240Z"
        fill="rgba(255,255,255,0.15)"
      />
      <path
        d="M162 69L258 69L288 94L196 94L162 69Z"
        fill="rgba(255,255,255,0.12)"
      />
    </svg>
  );
}

export default function Home() {
  return (
    <main className="page-shell">
      <section className="hero-section hero-wide">
        <nav className="topbar" aria-label="Hauptnavigation">
          <div className="brand" aria-label="Fundora brand">
            <BrandGlyph />
            <span className="brand-word">Fundora</span>
          </div>
          <div className="nav-links">
            <a href="#financing">Finanzierung</a>
            <a href="#donation">Spenden</a>
            <a href="/pret">Prêt</a>
            <a href="/dons">Dons</a>
            <a href="/dashboard">Dashboard</a>
            <a href="/login">Connexion</a>
          </div>
          <a className="nav-button" href="/login">
            Jetzt starten
          </a>
        </nav>

        <div className="hero-content hero-split">
          <div className="hero-copy">
            <div className="logo-mark-large" aria-label="Fundora Logo">
              <span className="logo-mark-shape">F</span>
            </div>
            <h1>Fundora</h1>
            <div className="subtitle-line">Finanzierung. Verbindung. Wachstum.</div>
            <p>
              Gemeinsam Projekte ermöglichen, Menschen unterstützen und eine bessere Zukunft
              gestalten.
            </p>

            <div className="feature-pills">
              <div className="pill-item">
                <span className="pill-icon">€</span>
                <span>Faire<br />Finanzierung</span>
              </div>
              <div className="pill-item">
                <span className="pill-icon">♥</span>
                <span>Gemeinnützige<br />Projekte</span>
              </div>
              <div className="pill-item">
                <span className="pill-icon">✓</span>
                <span>Sicher &amp;<br />Transparent</span>
              </div>
            </div>
          </div>

          <div className="hero-visual" aria-label="Berlin city photo">
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

      <section className="feature-section story-section" id="financing">
        <div className="story-block">
          <div className="story-copy">
            <span className="eyebrow">Prêts pour tous</span>
            <h2>Des solutions claires pour financer un projet, une urgence ou une croissance.</h2>
            <p>
              Fundora aide les particuliers, les familles et les petites entreprises à accéder à des
              financements transparents, rapides et adaptés à leur situation réelle.
            </p>
            <ul className="check-list">
              <li>Montants flexibles selon le besoin</li>
              <li>Processus simple et rassurant</li>
              <li>Un accompagnement humain et transparent</li>
            </ul>
            <button className="primary-button">Obtenir un prêt</button>
          </div>
          <div className="story-visual visual-loan" aria-label="Personne bénéficiant d'un prêt" />
        </div>
      </section>

      <section className="feature-section impact-section" id="donation">
        <div className="section-heading">
          <span className="eyebrow">Soutien & dons</span>
          <h2>Mettre des projets utiles en visibilité et mobiliser l’aide autour d’eux.</h2>
        </div>

        <div className="impact-grid">
          <article className="impact-card">
            <div className="impact-image image-community" aria-label="Communauté soutenue" />
            <div className="impact-content">
              <h3>Des projets qui changent des vies</h3>
              <p>
                Les associations, initiatives sociales et projets locaux peuvent obtenir le soutien
                financier nécessaire pour se développer et aider davantage de personnes.
              </p>
            </div>
          </article>

          <article className="impact-card">
            <div className="impact-image image-donation" aria-label="Donateur" />
            <div className="impact-content">
              <h3>Des dons bien placés</h3>
              <p>
                Les donneurs peuvent soutenir des causes concrètes avec confiance, en suivant la
                transparence, la traçabilité et l’impact réel des contributions.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className="feature-section process-section">
        <div className="section-heading">
          <span className="eyebrow">Comment ça marche</span>
          <h2>Un modèle simple pour aider chacun à avancer.</h2>
        </div>

        <div className="process-grid">
          <div className="process-card">
            <div className="process-number">01</div>
            <h3>Publier un besoin</h3>
            <p>Une personne ou une organisation présente son besoin de financement ou de soutien.</p>
          </div>
          <div className="process-card">
            <div className="process-number">02</div>
            <h3>Vérifier la demande</h3>
            <p>Les informations sont vérifiées pour sécuriser les échanges et la confiance.</p>
          </div>
          <div className="process-card">
            <div className="process-number">03</div>
            <h3>Recevoir l’aide</h3>
            <p>Le prêt ou le don est mis en place pour soutenir concrètement la personne ou le projet.</p>
          </div>
        </div>
      </section>

      <section className="feature-section stats-section" id="dashboard">
        <div className="stats-banner">
          <div className="stats-copy">
            <span className="eyebrow">Impact</span>
            <h2>Une plateforme pensée pour l’accès au financement et au soutien social.</h2>
          </div>
          <div className="stats-metrics">
            <div className="metric-box">
              <strong>€ 8,5M</strong>
              <span>Financements accompagnés</span>
            </div>
            <div className="metric-box">
              <strong>12k</strong>
              <span>Personnes aidées</span>
            </div>
            <div className="metric-box">
              <strong>94%</strong>
              <span>Clients satisfaits</span>
            </div>
          </div>
        </div>
      </section>

      <section className="feature-section login-section" id="login">
        <div className="login-layout">
          <div className="login-visual" aria-label="Connexion Fundora">
            <div className="login-badge">Compte sécurisé</div>
          </div>

          <div className="login-panel">
            <span className="eyebrow">Connexion</span>
            <h2>Accédez à votre espace personnel.</h2>
            <div className="login-form">
              <label className="field">
                <span>E-mail</span>
                <input value="anna.mueller@email.de" readOnly />
              </label>
              <label className="field">
                <span>Mot de passe</span>
                <input value="••••••••••" readOnly />
              </label>
              <div className="login-options">
                <label className="remember-me">
                  <input type="checkbox" defaultChecked />
                  <span>Se souvenir de moi</span>
                </label>
                <a href="#">Mot de passe oublié ?</a>
              </div>
              <button className="primary-button login-button">Se connecter</button>
            </div>
          </div>
        </div>
      </section>

      <section className="feature-section dashboard-section" id="dashboard">
        <div className="dashboard-shell">
          <aside className="dashboard-sidebar">
            <div className="sidebar-brand">
              <BrandGlyph />
              <span>Fundora</span>
            </div>

            <nav className="sidebar-nav" aria-label="Navigation du dashboard">
              <a className="active" href="#">Accueil</a>
              <a href="#">Demandes</a>
              <a href="#">Dons</a>
              <a href="#">Transactions</a>
              <a href="#">Paramètres</a>
            </nav>

            <div className="sidebar-card">
              <span>Protection</span>
              <strong>Vérification KYC</strong>
              <small>Complété à 96%</small>
            </div>
          </aside>

          <div className="dashboard-main">
            <header className="dashboard-topbar">
              <div>
                <span className="eyebrow">Mon compte</span>
                <h2>Bonjour Anna</h2>
              </div>
              <div className="topbar-actions">
                <button className="secondary-button small">Paramètres</button>
                <button className="primary-button small">Retirer</button>
              </div>
            </header>

            <div className="wallet-grid">
              <div className="main-wallet">
                <div className="balance-card">
                  <span>Solde disponible</span>
                  <strong>€ 12.840</strong>
                  <div className="mini-actions">
                    <button className="primary-button small">Retirer</button>
                    <button className="secondary-button small">Historique</button>
                  </div>
                </div>

                <div className="chart-card">
                  <div className="chart-header">
                    <h3>Statistiques</h3>
                    <span>6 mois</span>
                  </div>
                  <div className="chart-bars" aria-label="Graphique de statistiques">
                    {chartBars.map((height, index) => (
                      <span key={index} style={{ height: `${height}%` }} />
                    ))}
                  </div>
                </div>
              </div>

              <aside className="virtual-card">
                <div className="card-top-row">
                  <span>Carte virtuelle</span>
                  <span>Fundora</span>
                </div>
                <div className="card-chip" />
                <strong>•••• 2048</strong>
                <div className="card-meta">
                  <div>
                    <small>Solde</small>
                    <strong>€ 12.840</strong>
                  </div>
                  <div>
                    <small>Statut</small>
                    <strong>Actif</strong>
                  </div>
                </div>
              </aside>
            </div>

            <div className="dashboard-bottom">
              <div className="panel">
                <div className="panel-header">
                  <h3>Demandes récentes</h3>
                  <span>3 éléments</span>
                </div>
                <ul className="request-list">
                  {recentRequests.map((request) => (
                    <li key={request.title}>
                      <div>
                        <strong>{request.title}</strong>
                        <span>{request.amount}</span>
                      </div>
                      <em>{request.status}</em>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <h3>Vue d’ensemble</h3>
                  <span>Compte</span>
                </div>
                <div className="stat-grid">
                  {walletStats.map((stat) => (
                    <div key={stat.label} className="stat-box">
                      <span>{stat.label}</span>
                      <strong>{stat.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="feature-section" id="contact">
        <div className="cta-panel">
          <div>
            <span className="eyebrow">Starten</span>
            <h2>Prêt à faire avancer votre projet ou votre besoin avec Fundora?</h2>
          </div>
          <a className="primary-button" href="/login">
            Nous contacter
          </a>
        </div>
      </section>

      <footer className="site-footer">
        <div className="brand footer-brand" aria-label="Fundora brand footer">
          <BrandGlyph />
          <span className="brand-word">Fundora</span>
        </div>
      </footer>
    </main>
  );
}
