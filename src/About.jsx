import { useEffect } from "react";
import { T } from "./tokens.js";

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function SectionLabel({ children, light = false }) {
  return (
    <div style={{
      fontFamily: T.fontBody,
      fontWeight: 700,
      fontSize: T.text.xs,
      letterSpacing: "2px",
      textTransform: "uppercase",
      lineHeight: 1,
      // yellow on navy passes AA; navy on cream passes AA — no opacity needed
      color: light ? T.yellow : T.navy,
      marginBottom: T.space[2],
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
      background: T.navy,
      padding: "0 20px",
      display: "flex", justifyContent: "space-between", alignItems: "center",
      minHeight: 52,
    }}>
      {/* Left: anchor + wordmark */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 18 }} aria-hidden="true">⚓</span>
        <div>
          <div style={{ fontFamily: T.fontBody, fontWeight: 700, fontSize: 16, color: T.white, letterSpacing: "2px", lineHeight: 1.1 }}>
            CheckMySpins
          </div>
          <div style={{ fontFamily: T.fontMono, fontSize: 10, color: "rgba(255,255,255,0.5)", letterSpacing: "1px", lineHeight: 1 }}>
            ILWU LOCAL 23 · PORT OF TACOMA
          </div>
        </div>
      </div>
      {/* Right: links */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <a href="/"
          style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", fontFamily: T.fontBody,
            fontWeight: 600, textDecoration: "none", padding: "14px 8px" }}>
          ← App
        </a>
        <a href="https://ilwu.pepdekker.com" target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 12, color: T.yellow, fontFamily: T.fontBody,
            fontWeight: 600, textDecoration: "none", padding: "14px 8px" }}>
          Union Site ↗
        </a>
      </div>
    </nav>
  );
}

// ─── HERO ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section style={{ background: T.navy, padding: "80px 24px 72px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div style={{ width: 60, height: 4, background: T.yellow, marginBottom: 32 }} aria-hidden="true" />

        <h1 style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: "clamp(44px, 10vw, 72px)",
          color: T.white,
          letterSpacing: "-1px",
          lineHeight: 1,
          margin: 0,
        }}>
          YOUR SPINS.<br />YOUR BOARD.<br />ONE SCREEN.
        </h1>

        <div style={{ width: 80, height: 3, background: T.yellow, margin: `${T.space[3]}px 0` }} aria-hidden="true" />

        <p style={{
          fontFamily: T.fontBody,
          fontSize: 18,
          color: T.blue,
          lineHeight: 1.6,
          margin: 0,
          maxWidth: 560,
        }}>
          An independent dispatch tool for ILWU Local 23 members
          at the Port of Tacoma - built by someone who gives a damn.
        </p>
      </div>
    </section>
  );
}

// ─── PRIVACY BLOCK ────────────────────────────────────────────────────────────
function PrivacyBlock() {
  return (
    <div style={{ background: T.white, borderTop: `4px solid ${T.yellow}`, padding: '28px 32px', maxWidth: '100%' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ fontFamily: T.fontBody, fontWeight: 700, fontSize: T.text.xs, color: T.blue, letterSpacing: 2, textTransform: 'uppercase', marginBottom: T.space[2] }}>
          How your data works
        </div>
        <div style={{ fontFamily: T.fontBody, fontSize: 16, color: T.dark, lineHeight: 1.7 }}>
          Your registration number is saved in your browser's local storage - the same mechanism a website uses to remember your dark mode preference. <strong>Nothing leaves your device.</strong> There is no CheckMySpins server. There is no account to create, breach, or delete. The spin data comes directly from the public Google Sheet Local 23 already posts every week. The vessel schedule comes from the Northwest Seaport Alliance's public schedule. We read public data and display it on your phone. That's the entire architecture.
        </div>
      </div>
    </div>
  );
}

// ─── WHY ──────────────────────────────────────────────────────────────────────
function Why() {
  return (
    <section style={{ background: T.cream, padding: "72px 24px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <SectionLabel>01 · WHY WE BUILT THIS</SectionLabel>

        <h2 style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: "clamp(32px, 8vw, 48px)",
          color: T.navy,
          lineHeight: 1.1,
          margin: "0 0 32px",
        }}>
          The uncertainty is real. The friction doesn't have to be.
        </h2>

        <div style={{ maxWidth: 640 }}>
          {[
            `Longshore work is uncertain by design. The dispatch system is fair - the spin system exists to make sure work rotates equitably. Nobody's arguing with that.`,
            `But the information about that uncertainty - your spin number, the vessels working, the board depth - takes fifteen minutes to find across three different websites on a phone at 5am. Meanwhile someone's waiting for a text. A kid needs to be picked up or not. Plans get made or don't.`,
            `CheckMySpins doesn't change the uncertainty. It cuts the time between "information available" and "family can plan" from fifteen minutes to fifteen seconds.`,
            `That's the whole thing.`,
          ].map((p, i) => (
            <p key={i} style={{
              fontFamily: T.fontBody,
              fontSize: T.text.md,
              color: T.dark,
              lineHeight: 1.75,
              margin: `0 0 ${T.space[3]}px`,
            }}>{p}</p>
          ))}

          <blockquote style={{
            borderLeft: `4px solid ${T.yellow}`,
            paddingLeft: 24,
            margin: "36px 0 0",
          }}>
            <p style={{
              fontFamily: T.fontBody,
              fontSize: T.text.lg,
              fontStyle: "italic",
              color: T.navy,
              lineHeight: 1.5,
              margin: 0,
            }}>
              "The hall controls the work. You control how fast the information gets home."
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
      background: T.white,
      border: `1.5px solid ${T.border}`,
      borderTop: `3px solid ${T.navy}`,
      borderRadius: 12,
      padding: `${T.space[3]}px`,
      flex: 1,
      minWidth: 0,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        background: T.yellow, color: T.navy,
        fontFamily: T.fontMono, fontWeight: 700, fontSize: 20,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: T.space[2],
      }} aria-hidden="true">
        {number}
      </div>
      <div style={{ fontFamily: T.fontBody, fontWeight: 700, fontSize: 18, color: T.navy, letterSpacing: "1px", marginBottom: T.space[1] }}>
        {title}
      </div>
      <p style={{ fontFamily: T.fontBody, fontSize: 14, color: T.dark, lineHeight: 1.7, margin: 0 }}>
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
      body: "Every week, Local 23 posts spin numbers to a public Google Sheet. CheckMySpins fetches it directly - no scraping, no copying, no delay. Your number, your week, your best days. Refreshes automatically when the new sheet drops.",
    },
    {
      number: "②",
      title: "The Work Board",
      body: "The daily dispatch board at ilwu23.com shows what's working. The vessel schedule from the Northwest Seaport Alliance shows what's coming. Both update in real time, without you opening a second tab.",
    },
    {
      number: "③",
      title: "Your Device",
      body: "Your registration number is saved to your phone - not a server, not a database, not us. It lives in your browser's local storage and goes nowhere. No account. No login. No data collection. Enter it once, never again.",
    },
  ];

  return (
    <section style={{ background: T.white, padding: "72px 24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <SectionLabel>02 · HOW IT WORKS</SectionLabel>

        <h2 style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: "clamp(30px, 7vw, 44px)",
          color: T.navy,
          lineHeight: 1.1,
          margin: "0 0 40px",
          maxWidth: 680,
        }}>
          Public data. Zero middlemen. Nothing we didn't already have.
        </h2>

        <style>{`@media(min-width:640px){.how-cards{flex-direction:row!important}}`}</style>
        <div className="how-cards" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {cards.map(c => <HowCard key={c.number} {...c} />)}
        </div>
      </div>
    </section>
  );
}

// ─── WHAT ─────────────────────────────────────────────────────────────────────
function What() {
  const features = [
    { label: "Spin Number Lookup",     desc: "Type your reg number once. See your full week instantly." },
    { label: "Best Day Highlighted",   desc: "Your lowest spin is automatically surfaced. No math required." },
    { label: "This Week + Next Week",  desc: "Swipe between current and next week's numbers before Saturday arrives." },
    { label: "10-Day Vessel Schedule", desc: "Every ship due into Tacoma - terminal, cargo type, ETA. Pulled live from the Northwest Seaport Alliance." },
    { label: "Live Work Boards",       desc: "One tap to the day and night dispatch boards. No hunting through bookmarks." },
    { label: "Works on Any Phone",     desc: "No app store. No install. Open the browser, bookmark it, add it to your home screen." },
  ];

  return (
    <section style={{ background: T.navy, padding: "72px 24px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <SectionLabel light>03 · WHAT'S HERE NOW</SectionLabel>

        <h2 style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: "clamp(30px, 7vw, 44px)",
          color: T.white,
          lineHeight: 1.1,
          margin: "0 0 40px",
        }}>
          Version 1. Focused. No fluff.
        </h2>

        <style>{`@media(min-width:600px){.feature-grid{grid-template-columns:1fr 1fr!important}}`}</style>
        <div className="feature-grid" style={{ display: "grid", gridTemplateColumns: "1fr", gap: T.space[3] }}>
          {features.map(f => (
            <div key={f.label} style={{ display: "flex", gap: 14 }}>
              <span style={{
                fontFamily: T.fontBody,
                fontWeight: 700,
                fontSize: 22,
                color: T.yellow,
                lineHeight: 1,
                flexShrink: 0,
                marginTop: 1,
              }} aria-hidden="true">✓</span>
              <div>
                <div style={{ fontFamily: T.fontBody, fontSize: T.text.base, fontWeight: 600, color: T.white, marginBottom: 4 }}>
                  {f.label}
                </div>
                {/* rgba white gives ~8:1 on navy — passes WCAG AA */}
                <div style={{ fontFamily: T.fontBody, fontSize: 14, color: "rgba(255,255,255,0.72)", lineHeight: 1.6 }}>
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
    desc: "Spin lookup, vessel schedule, best-day highlighting, this week and next week. The core decision tool - should I go in today?",
    active: true,
  },
  {
    phase: "Phase 2",
    status: "BUILDING",
    statusBg: "#EFF6FF", statusColor: "#1D4ED8",
    title: "Shift Log",
    desc: "Log your shifts as you work them. Date, terminal, job classification, hours, shift type. Simple, fast, no friction. Your work history lives on your device - the foundation for everything that comes next.",
    active: true,
  },
  {
    phase: "Phase 3",
    status: "PLANNED",
    statusBg: "#FFFBEB", statusColor: "#92400E",
    title: "Pay Protection",
    desc: "Enter your weekly gross from your paystub. We calculate what you should have been paid based on your logged shifts and the PMA contract rates. If the numbers don't match, you know before the week is over - not three months later in a grievance.",
    active: false,
  },
  {
    phase: "Phase 4",
    status: "ROADMAP",
    statusBg: "#F3F4F6", statusColor: "#374151",
    title: "Collective Intelligence",
    desc: "Opt-in, anonymized, aggregated. Which terminals are dispatching most? Are B men getting their fair share of strad work? What does dispatch look like across the full board - not just for one member, but for all of them? The data the BA needs to see patterns and prevent grievances before they happen.",
    active: false,
  },
];

function Roadmap() {
  return (
    <section style={{ background: T.cream, padding: "72px 24px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <SectionLabel>04 · WHERE WE'RE GOING</SectionLabel>

        <h2 style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: "clamp(30px, 7vw, 44px)",
          color: T.navy,
          lineHeight: 1.1,
          margin: "0 0 20px",
        }}>
          Built in phases. Driven by what members actually ask for.
        </h2>

        <p style={{
          fontFamily: T.fontBody,
          fontSize: 16,
          color: T.dark,
          lineHeight: 1.7,
          margin: "0 0 48px",
          maxWidth: 580,
        }}>
          Every feature on this roadmap came from a conversation with a Local 23 member -
          not a product manager, not a focus group. A longshoreman in Tacoma who said
          "it'd be nice if..." and we wrote it down.
        </p>

        <div style={{ position: "relative" }}>
          <div style={{
            position: "absolute",
            left: 19, top: 0, bottom: 0,
            width: 2,
            background: T.border,
            zIndex: 0,
          }} aria-hidden="true" />

          <div style={{ display: "flex", flexDirection: "column", gap: T.space[4] }}>
            {PHASES.map((p, i) => (
              <div key={p.phase} style={{ display: "flex", gap: T.space[3], position: "relative", zIndex: 1 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                  background: p.active ? T.yellow : T.border,
                  border: `3px solid ${p.active ? T.navy : T.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: T.fontMono,
                  fontSize: 14, color: T.navy, fontWeight: 700,
                }} aria-hidden="true">
                  {i + 1}
                </div>

                <div style={{
                  flex: 1,
                  background: T.white,
                  border: `1.5px solid ${T.border}`,
                  borderRadius: 12,
                  padding: `${T.space[3]}px ${T.space[3]}px`,
                  marginBottom: 8,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: T.space[1], marginBottom: T.space[1], flexWrap: "wrap" }}>
                    <span style={{
                      fontFamily: T.fontMono,
                      fontSize: 12,
                      color: T.mutedText,
                    }}>{p.phase}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      padding: "2px 8px", borderRadius: 20,
                      background: p.statusBg, color: p.statusColor,
                      fontFamily: T.fontMono, letterSpacing: "0.5px",
                    }}>{p.status}</span>
                  </div>
                  <div style={{
                    fontFamily: T.fontBody,
                    fontWeight: 700,
                    fontSize: 20, color: T.navy,
                    letterSpacing: "1px", marginBottom: T.space[1],
                  }}>{p.title}</div>
                  <p style={{
                    fontFamily: T.fontBody,
                    fontSize: 14, color: T.dark,
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
    <section style={{ background: T.navy, padding: "72px 24px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
        <h2 style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: "clamp(28px, 7vw, 40px)",
          color: T.white,
          letterSpacing: "1px",
          margin: "0 0 32px",
        }}>
          Independent. Transparent. Yours.
        </h2>

        {[
          "CheckMySpins is an independent project built by a developer in Tacoma who believes union members deserve better tools.",
          "We are not affiliated with ILWU, ILWU Local 23, PMA, or any employer or government body. We don't speak for the union. We don't negotiate on anyone's behalf.",
          "The data sources - spin sheets, dispatch boards, vessel schedules - are all public. We surface them in one place without asking for an account, a subscription, or your personal information.",
          "No ads. No data selling. No venture capital. No agenda except making the hall work better for the people who work in it.",
          "If you work at Local 23 and want to shape what gets built - we want to hear from you.",
        ].map((p, i) => (
          <p key={i} style={{
            fontFamily: T.fontBody,
            fontSize: 16,
            color: "rgba(255,255,255,0.85)",
            lineHeight: 1.8,
            margin: `0 0 ${T.space[3]}px`,
          }}>{p}</p>
        ))}

        <a
          href="mailto:checkmyspins@gmail.com"
          style={{
            display: "inline-block",
            marginTop: T.space[2],
            fontFamily: T.fontMono,
            fontSize: 13,
            color: T.yellow,
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
    <section style={{ background: T.cream, padding: "72px 24px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
        <style>{`@media(min-width:400px){.cta-buttons{flex-direction:row!important}}`}</style>
        <div className="cta-buttons" style={{ display: "flex", flexDirection: "column", gap: 12, justifyContent: "center" }}>
          <a href="/" style={{
            fontFamily: T.fontBody,
            fontWeight: 700,
            fontSize: 16, letterSpacing: "1.5px",
            background: T.navy, color: T.yellow,
            padding: "16px 28px", borderRadius: 10,
            textDecoration: "none", textAlign: "center",
          }}>
            CHECK MY SPINS →
          </a>
          <a href="https://ilwu.pepdekker.com" target="_blank" rel="noopener noreferrer" style={{
            fontFamily: T.fontBody,
            fontWeight: 700,
            fontSize: 16, letterSpacing: "1.5px",
            background: "transparent",
            color: T.navy,
            border: `2px solid ${T.navy}`,
            padding: "14px 28px", borderRadius: 10,
            textDecoration: "none", textAlign: "center",
          }}>
            VIEW THE UNION SITE ↗
          </a>
        </div>
      </div>
    </section>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function About() {
  useEffect(() => { document.title = "CheckMySpins - About & Roadmap"; }, []);

  return (
    <div style={{ fontFamily: T.fontBody }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&family=Bebas+Neue&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        a { color: inherit; }
        button, a { transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, opacity 0.15s ease; }
      `}</style>
      <Nav />
      <Hero />
      <PrivacyBlock />
      <Why />
      <How />
      <What />
      <Roadmap />
      <Independence />
      <CTA />
    </div>
  );
}
