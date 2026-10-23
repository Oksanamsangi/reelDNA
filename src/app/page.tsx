const features = [
  {
    number: "01",
    title: "Reel Intelligence",
    description:
      "Analyze the hook, pacing, visuals and structure of your video. Get specific, actionable editing recommendations.",
    tag: "VIDEO ANALYSIS",
  },
  {
    number: "02",
    title: "Personal SMM Strategist",
    description:
      "Build a content strategy around your profile, audience, goals and previous publishing results.",
    tag: "YOUR STRATEGY",
  },
  {
    number: "03",
    title: "Performance Intelligence",
    description:
      "Compare content performance, discover patterns and turn observations into measurable experiments.",
    tag: "LEARN & IMPROVE",
  },
];

export default function Home() {
  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="REEL DNA home">
          <span className="brand-mark">R<span>.</span></span>
          <span className="brand-name">REEL DNA</span>
        </a>

        <nav className="nav-links" aria-label="Main navigation">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#pricing">Pricing</a>
        </nav>

        <a className="nav-cta" href="#get-started">
          Get started <span aria-hidden="true">↗</span>
        </a>
      </header>

      <section className="hero" id="get-started">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="status-dot" />
            YOUR PERSONAL AI CONTENT LAB
          </div>

          <h1>
            Stop guessing.
            <br />
            Start creating
            <br />
            <span className="gradient-text">with intention.</span>
          </h1>

          <p className="hero-description">
            Your Reels are more than content. They are data.
            REEL DNA helps you understand what to improve, what to test
            and how to build a smarter social media strategy.
          </p>

          <div className="hero-actions">
            <a className="button-primary" href="#features">
              Explore REEL DNA <span aria-hidden="true">↗</span>
            </a>
            <a className="button-secondary" href="#how-it-works">
              Discover how it works <span aria-hidden="true">↓</span>
            </a>
          </div>

          <div className="hero-note">
            <span className="note-icon">✳</span>
            Built around your content, your goals and your results.
          </div>
        </div>

        <div className="hero-visual" aria-label="Illustration of a Reel analysis dashboard">
          <div className="orb orb-one" />
          <div className="orb orb-two" />

          <div className="analysis-card">
            <div className="card-top">
              <div>
                <div className="card-kicker">REEL INTELLIGENCE</div>
                <h2>Content breakdown</h2>
              </div>
              <span className="ai-badge">AI CONCEPT</span>
            </div>

            <div className="video-preview">
              <div className="video-glow" />
              <div className="play-button">▶</div>
              <div className="video-caption">YOUR NEXT IDEA</div>
              <div className="video-timeline">
                <span />
              </div>
              <div className="video-time">00:07 / 00:18</div>
            </div>

            <div className="insight-heading">
              <span>ANALYSIS PREVIEW</span>
              <span className="preview-label">ILLUSTRATIVE</span>
            </div>

            <div className="insight-row">
              <div className="insight-icon purple">↗</div>
              <div className="insight-copy">
                <strong>The opening hook</strong>
                <span>Review the first seconds</span>
              </div>
              <span className="insight-arrow">→</span>
            </div>

            <div className="insight-row">
              <div className="insight-icon mint">◷</div>
              <div className="insight-copy">
                <strong>Pacing &amp; structure</strong>
                <span>Find opportunities to improve</span>
              </div>
              <span className="insight-arrow">→</span>
            </div>

            <div className="insight-row">
              <div className="insight-icon peach">◎</div>
              <div className="insight-copy">
                <strong>Audience alignment</strong>
                <span>Test whether the message is clear</span>
              </div>
              <span className="insight-arrow">→</span>
            </div>

            <div className="card-foot">
              <span className="foot-dot" />
              An example of the future analysis experience
            </div>
          </div>

          <div className="floating-note">
            <span className="floating-symbol">✳</span>
            <div>
              <strong>Learn from every Reel.</strong>
              <span>Improve with evidence.</span>
            </div>
          </div>
        </div>

        <div className="hero-index">
          <span>01 — INTELLIGENCE</span>
          <span>BUILT FOR CREATORS</span>
        </div>
      </section>

      <section className="intro-strip" id="how-it-works">
        <p>LESS GUESSWORK.</p>
        <p className="intro-accent">MORE UNDERSTANDING.</p>
        <p>BETTER DECISIONS.</p>
      </section>

      <section className="features-section" id="features">
        <div className="section-heading">
          <div>
            <div className="eyebrow">ONE CONNECTED WORKSPACE</div>
            <h2>
              Understand your content.
              <br />
              <span className="muted-heading">Build your next move.</span>
            </h2>
          </div>
          <p>
            Analysis, strategy and performance insights designed to work
            together — so recommendations become part of a bigger picture.
          </p>
        </div>

        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.number}>
              <div className="feature-card-top">
                <span className="feature-number">{feature.number}</span>
                <span className="feature-arrow">↗</span>
              </div>
              <div className="feature-tag">{feature.tag}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              <a href="#get-started" className="text-link">
                Explore the concept <span aria-hidden="true">→</span>
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="closing-section" id="pricing">
        <div className="closing-orb" />
        <div className="eyebrow">YOUR CONTENT. YOUR DATA. YOUR DIRECTION.</div>
        <h2>
          Make every
          <br />
          <span className="gradient-text">next Reel smarter.</span>
        </h2>
        <p>
          A more thoughtful way to create, test and learn — built around
          your own social media journey.
        </p>
        <a className="button-primary" href="#get-started">
          Discover the platform <span aria-hidden="true">↗</span>
        </a>
      </section>

      <footer className="footer">
        <a className="brand footer-brand" href="#">
          <span className="brand-mark">R<span>.</span></span>
          <span className="brand-name">REEL DNA</span>
        </a>
        <span className="footer-copy">
          An intelligence layer for your social content.
        </span>
        <span className="footer-year">© 2026 REEL DNA</span>
      </footer>
    </main>
  );
}
