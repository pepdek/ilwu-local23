const C = {
  navy:   "#00305b",
  blue:   "#377dbd",
  cream:  "#F7F6F2",
  yellow: "#fff216",
  white:  "#ffffff",
  dark:   "#0F0F0F",
  muted:  "#9CA3AF",
  border: "#E8E5DC",
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function SectionLabel({ children, light = false }) {
  return (
    <div style={{
      fontFamily: "'Bebas Neue', sans-serif",
      fontSize: 13,
      letterSpacing: "2px",
      color: light ? C.blue : C.navy,
      marginBottom: 16,
      opacity: 0.8,
    }}>
      {children}
    </div>
  );
}

// ─── STICKY NAV ───────────────────────────────────────────────────────────────
function Nav() {
  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 50,
      background: C.navy,
      padding: "12px 20px",
      display: "flex", justifyContent: "space-between", alignItems: "center",
    }}>
      {/* Left: anchor + wordmark */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 20 }}>⚓</span>
        <div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: C.white, letterSpacing: "2px", lineHeight: 1.1 }}>
            CheckMySpins
          </div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: C.blue, letterSpacing: "1px", lineHeight: 1 }}>
            ILWU LOCAL 23 · PORT OF TACOMA
          </div>
        </div>
      </div>
      {/* Right: links */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <a href="/" style={{ fontSize: 12, color: C.muted, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, textDecoration: "none" }}>
          ← Back to App
        </a>
        <a href="https://ilwu.pepdekker.com" target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 12, color: C.yellow, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, textDecoration: "none" }}>
          ilwu.pepdekker.com ↗
        </a>
      </div>
    </nav>
  );
}

// ─── HERO ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section style={{ background: C.navy, padding: "80px 24px 72px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        {/* Yellow rule */}
        <div style={{ width: 60, height: 4, background: C.yellow, marginBottom: 32 }} />

        <h1 style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: "clamp(44px, 10vw, 72px)",
          color: C.white,
          letterSpacing: "-1px",
          lineHeight: 1,
          margin: 0,
        }}>
          BUILT FOR THE HALL.<br />NOT THE CORNER OFFICE.
        </h1>

        {/* Yellow rule below headline */}
        <div style={{ width: 80, height: 3, background: C.yellow, margin: "24px 0" }} />

        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 18,
          color: C.blue,
          lineHeight: 1.6,
          margin: 0,
          maxWidth: 560,
        }}>
          An independent dispatch tool for ILWU Local 23 members
          at the Port of Tacoma — built by someone who gives a damn.
        </p>
      </div>
    </section>
  );
}

// ─── WHY ──────────────────────────────────────────────────────────────────────
function Why() {
  return (
    <section style={{ background: C.cream, padding: "72px 24px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <SectionLabel>01 · WHY WE BUILT THIS</SectionLabel>

        <h2 style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: "clamp(32px, 8vw, 48px)",
          color: C.navy,
          lineHeight: 1.1,
          margin: "0 0 32px",
        }}>
          Because a longshoreman shouldn't need three tabs open to decide if it's worth driving to the hall.
        </h2>

        <div style={{ maxWidth: 640 }}>
          {[
            `Every week, hundreds of ILWU Local 23 members do the same thing: open the spins sheet, search for their number, cross-reference the daily board, check the vessel schedule, and make a judgment call.`,
            `That process hasn't changed in twenty years. The information is public. The union posts it. Members use it. But the friction of pulling it all together — on a phone, at 5am, before a shift — is friction that shouldn't exist.`,
            `CheckMySpins doesn't tell you what to do.\nIt just puts everything you already look at in one place, so you spend less time looking and more time deciding.`,
            `That's it. That's the whole idea.`,
          ].map((p, i) => (
            <p key={i} style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 17,
              color: C.dark,
              lineHeight: 1.75,
              margin: "0 0 20px",
              whiteSpace: "pre-line",
            }}>{p}</p>
          ))}

          {/* Pull quote */}
          <blockquote style={{
            borderLeft: `4px solid ${C.yellow}`,
            paddingLeft: 24,
            margin: "36px 0 0",
          }}>
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 20,
              fontStyle: "italic",
              color: C.navy,
              lineHeight: 1.5,
              margin: 0,
            }}>
              "The information belongs to the members. We just made it easier to find."
            </p>
          </blockquote>
        </div>
      </div>
    </section>
  );
}

// ─── HOW ──────────────────────────────────────────────────────────────────────
function HowCard({ number, title, body }) {
  return (
    <div style={{
      background: C.white,
      border: `1.5px solid ${C.border}`,
      borderTop: `3px solid ${C.navy}`,
      borderRadius: 12,
      padding: 24,
      flex: 1,
      minWidth: 0,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        background: C.yellow, color: C.navy,
        fontFamily: "'Bebas Neue', sans-serif", fontSize: 20,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 16,
      }}>
        {number}
      </div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: C.navy, letterSpacing: "1px", marginBottom: 10 }}>
        {title}
      </div>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: C.dark, lineHeight: 1.7, margin: 0 }}>
        {body}
      </p>
    </div>
  );
}

function How() {
  const cards = [
    {
      number: "①",
      title: "The Spin Sheet",
      body: "Every week, Local 23 posts the spin numbers to a public Google Sheet. CheckMySpins fetches that sheet directly — no scraping, no copying, no delay. Your number, your week, your best days. Updated automatically every Thursday when the new sheet drops.",
    },
    {
      number: "②",
      title: "The Work Board",
      body: "The daily dispatch board at ilwu23.com tells you what's moving. We pull the vessel schedule from the Northwest Seaport Alliance and show you what's coming into Tacoma over the next 10 days — all terminals, all cargo types, no filtering.",
    },
    {
      number: "③",
      title: "Your Device",
      body: "Your registration number is saved to your phone. Not a server. Not a database. Not us. It lives in your browser's local storage and goes nowhere. No account. No login. No data collection. Enter it once, never again.",
    },
  ];

  return (
    <section style={{ background: C.white, padding: "72px 24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <SectionLabel>02 · HOW IT WORKS</SectionLabel>

        <h2 style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: "clamp(30px, 7vw, 44px)",
          color: C.navy,
          lineHeight: 1.1,
          margin: "0 0 40px",
          maxWidth: 680,
        }}>
          Public data. Zero middlemen. Nothing we didn't already have.
        </h2>

        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}>
          <style>{`@media(min-width:640px){.how-cards{flex-direction:row!important}}`}</style>
          <div className="how-cards" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {cards.map(c => <HowCard key={c.number} {...c} />)}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── WHAT ──────────────────────────────────────────────────────────────────────
function What() {
  const features = [
    { label: "Spin Number Lookup",    desc: "Type your reg number once. See your full week instantly." },
    { label: "Best Day Highlighted",  desc: "Your lowest spin — closest to the top of the board — is automatically surfaced. No math required." },
    { label: "This Week + Next Week", desc: "Swipe between the current week and next week's numbers before Saturday even arrives." },
    { label: "10-Day Vessel Schedule",desc: "Every ship due into Tacoma — terminal, cargo type, ETA. Pulled live from the Northwest Seaport Alliance." },
    { label: "Live Work Boards",      desc: "One tap to the day and night dispatch boards. No hunting through bookmarks." },
    { label: "Works on Any Phone",    desc: "No app store. No install. Open the browser, bookmark it, add it to your home screen. Done." },
  ];

  return (
    <section style={{ background: C.navy, padding: "72px 24px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <SectionLabel light>03 · WHAT'S HERE NOW</SectionLabel>

        <h2 style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: "clamp(30px, 7vw, 44px)",
          color: C.white,
          lineHeight: 1.1,
          margin: "0 0 40px",
        }}>
          Version 1. Focused. No fluff.
        </h2>

        <style>{`@media(min-width:600px){.feature-grid{grid-template-columns:1fr 1fr!important}}`}</style>
        <div className="feature-grid" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>
          {features.map(f => (
            <div key={f.label} style={{ display: "flex", gap: 14 }}>
              <span style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 22,
                color: C.yellow,
                lineHeight: 1,
                flexShrink: 0,
                marginTop: 1,
              }}>✓</span>
              <div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600, color: C.white, marginBottom: 4 }}>
                  {f.label}
                </div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: C.blue, lineHeight: 1.6 }}>
                  {f.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── ROADMAP ──────────────────────────────────────────────────────────────────
const PHASES = [
  {
    phase: "Phase 1",
    status: "LIVE",
    statusBg: "#D1FAE5", statusColor: "#065F46",
    title: "Dispatch Intelligence",
    desc: "Spin lookup, vessel schedule, best-day highlighting, this week and next week. The core decision tool — should I go in today?",
    active: true,
  },
  {
    phase: "Phase 2",
    status: "BUILDING",
    statusBg: "#EFF6FF", statusColor: "#1D4ED8",
    title: "Shift Log",
    desc: "Log your shifts as you work them. Date, terminal, job classification, hours, shift type. Simple, fast, no friction. Your work history lives on your device. This is the foundation for everything that comes next.",
    active: true,
  },
  {
    phase: "Phase 3",
    status: "PLANNED",
    statusBg: "#FFFBEB", statusColor: "#92400E",
    title: "Pay Protection",
    desc: "Enter your weekly gross from your paystub. We calculate what you should have been paid based on your logged shifts and the PMA contract rates. If the numbers don't match, you know before the week is over — not three months later in a grievance.",
    active: false,
  },
  {
    phase: "Phase 4",
    status: "ROADMAP",
    statusBg: "#F3F4F6", statusColor: "#374151",
    title: "Collective Intelligence",
    desc: "Opt-in, anonymized, aggregated. Which terminals are dispatching most? Are B men getting their fair share of strad work? What does dispatch look like across the full board — not just for one member, but for all of them? This is the data the BA needs to see dispatch patterns and prevent grievances before they happen. Built for the hall, not just the individual.",
    active: false,
  },
];

function Roadmap() {
  return (
    <section style={{ background: C.cream, padding: "72px 24px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <SectionLabel>04 · WHERE WE'RE GOING</SectionLabel>

        <h2 style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: "clamp(30px, 7vw, 44px)",
          color: C.navy,
          lineHeight: 1.1,
          margin: "0 0 20px",
        }}>
          Built in phases. Driven by what members actually ask for.
        </h2>

        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 16,
          color: C.dark,
          lineHeight: 1.7,
          margin: "0 0 48px",
          maxWidth: 580,
        }}>
          Every feature on this roadmap came from a conversation with a Local 23 member.
          Not a product manager. Not a focus group. A longshoreman in Tacoma who said
          "it'd be nice if..." — and we wrote it down.
        </p>

        {/* Timeline */}
        <div style={{ position: "relative" }}>
          {/* Vertical connector line */}
          <div style={{
            position: "absolute",
            left: 19,
            top: 0,
            bottom: 0,
            width: 2,
            background: C.border,
            zIndex: 0,
          }} />

          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {PHASES.map((p, i) => (
              <div key={p.phase} style={{ display: "flex", gap: 20, position: "relative", zIndex: 1 }}>
                {/* Dot */}
                <div style={{
                  width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                  background: p.active ? C.yellow : C.border,
                  border: `3px solid ${p.active ? C.navy : C.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 14, color: C.navy, fontWeight: 700,
                }}>
                  {i + 1}
                </div>

                {/* Card */}
                <div style={{
                  flex: 1,
                  background: C.white,
                  border: `1.5px solid ${C.border}`,
                  borderRadius: 12,
                  padding: "20px 24px",
                  marginBottom: 8,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                    <span style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 11,
                      color: C.muted,
                    }}>{p.phase}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      padding: "2px 8px", borderRadius: 20,
                      background: p.statusBg, color: p.statusColor,
                      fontFamily: "'DM Mono', monospace", letterSpacing: "0.5px",
                    }}>{p.status}</span>
                  </div>
                  <div style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 20, color: C.navy,
                    letterSpacing: "1px", marginBottom: 10,
                  }}>{p.title}</div>
                  <p style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 14, color: C.dark,
                    lineHeight: 1.7, margin: 0,
                  }}>{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── STATEMENT OF INDEPENDENCE ────────────────────────────────────────────────
function Independence() {
  return (
    <section style={{ background: C.navy, padding: "72px 24px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
        <h2 style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: "clamp(28px, 7vw, 40px)",
          color: C.white,
          letterSpacing: "1px",
          margin: "0 0 32px",
        }}>
          Independent. Transparent. Yours.
        </h2>

        {[
          "CheckMySpins is an independent project built by a developer in Tacoma who believes union members deserve better tools.",
          "We are not affiliated with ILWU, ILWU Local 23, PMA, or any employer or government body. We don't speak for the union. We don't negotiate on anyone's behalf.",
          "What we do: take public information the union already posts, and make it faster to access on a phone at 5am.",
          "No ads. No data selling. No venture capital.\nNo agenda except making the hall work better for the people who work in it.",
          "If you work at Local 23 and want to shape what gets built — we want to hear from you.",
        ].map((p, i) => (
          <p key={i} style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 16,
            color: "rgba(255,255,255,0.85)",
            lineHeight: 1.8,
            margin: "0 0 20px",
            whiteSpace: "pre-line",
          }}>{p}</p>
        ))}

        <a
          href="mailto:checkmyspins@gmail.com"
          style={{
            display: "inline-block",
            marginTop: 16,
            fontFamily: "'DM Mono', monospace",
            fontSize: 13,
            color: C.yellow,
            textDecoration: "none",
            borderBottom: `1px solid rgba(255,242,22,0.3)`,
            paddingBottom: 2,
          }}
        >
          checkmyspins@gmail.com
        </a>
      </div>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────
function CTA() {
  return (
    <section style={{ background: C.cream, padding: "72px 24px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
        <style>{`@media(min-width:400px){.cta-buttons{flex-direction:row!important}}`}</style>
        <div className="cta-buttons" style={{ display: "flex", flexDirection: "column", gap: 12, justifyContent: "center" }}>
          <a href="/" style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 16, letterSpacing: "1.5px",
            background: C.navy, color: C.yellow,
            padding: "16px 28px", borderRadius: 10,
            textDecoration: "none", textAlign: "center",
          }}>
            CHECK MY SPINS →
          </a>
          <a href="https://ilwu.pepdekker.com" target="_blank" rel="noopener noreferrer" style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 16, letterSpacing: "1.5px",
            background: "transparent",
            color: C.navy,
            border: `2px solid ${C.navy}`,
            padding: "14px 28px", borderRadius: 10,
            textDecoration: "none", textAlign: "center",
          }}>
            VIEW THE UNION SITE ↗
          </a>
        </div>

        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 12, color: C.muted,
          marginTop: 24, lineHeight: 1.5,
        }}>
          This is an independent project. Not affiliated with ILWU or Local 23.
        </p>
      </div>
    </section>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function About() {
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", maxWidth: 430, margin: "0 auto" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&family=Bebas+Neue&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        a { color: inherit; }
        @media(min-width: 640px) {
          .about-page { max-width: 100% !important; }
          .about-page section > div { max-width: 900px; margin: 0 auto; }
        }
      `}</style>
      <div className="about-page" style={{ maxWidth: 430, margin: "0 auto" }}>
        <Nav />
        <Hero />
        <Why />
        <How />
        <What />
        <Roadmap />
        <Independence />
        <CTA />
      </div>
    </div>
  );
}
