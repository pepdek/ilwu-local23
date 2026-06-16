import { useState, useRef } from "react";
import { T } from "./tokens.js";
import { fetchAllCSVs, FALLBACK } from "./spinData.js";

// ─── EMBEDDED ONBOARDING — condensed reg lookup that lives in the hero ───────
function EmbeddedOnboarding() {
  const [val, setVal]       = useState('');
  const [status, setStatus] = useState(null);
  const [found, setFound]   = useState(null);
  const debounceRef         = useRef(null);

  function lookup(reg) {
    setFound(null); setStatus(null);
    if (reg.length < 4) return;
    setStatus('searching');
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const trimmed = reg.trim();
      try {
        const allSpins = await fetchAllCSVs();
        let match = null;
        for (const spins of Object.values(allSpins)) {
          match = spins.find(s => s.reg === trimmed) || null;
          if (match) break;
        }
        if (!match) {
          for (const arr of Object.values(FALLBACK)) {
            match = arr.find(s => s.reg === trimmed) || null;
            if (match) break;
          }
        }
        if (match) { setFound(match); setStatus('found'); }
        else setStatus('notfound');
        window.posthog?.capture('reg_lookup', {
          reg_number: trimmed,
          result: match ? 'found' : 'not_found',
          cls: match?.cls,
        });
      } catch (err) {
        console.error('lookup error', err);
        let match = null;
        for (const arr of Object.values(FALLBACK)) {
          match = arr.find(s => s.reg === trimmed) || null;
          if (match) break;
        }
        if (match) { setFound(match); setStatus('found'); }
        else setStatus('notfound');
      }
    }, 400);
  }

  function handleGo() {
    if (!found) return;
    window.posthog?.capture('member_onboarded', { reg_number: found.reg, cls: found.cls });
    localStorage.setItem('ilwu23_member', JSON.stringify({ reg: found.reg, cls: found.cls }));
    window.location.href = '/app';
  }

  return (
    <div>
      <input
        type="tel" inputMode="numeric"
        placeholder="e.g. 230456"
        value={val} maxLength={8}
        onChange={e => { setVal(e.target.value); lookup(e.target.value); }}
        style={{ width:'100%', background:'rgba(255,255,255,0.1)', border:`1.5px solid ${status==='found'?T.success:status==='notfound'?T.error:'rgba(255,255,255,0.2)'}`, borderRadius:T.radius.md, padding:'14px', fontSize:24, fontFamily:T.fontMono, fontWeight:600, color:T.white, letterSpacing:'4px', outline:'none', textAlign:'center', marginBottom:12 }}
      />
      {status==='searching' && (
        <div style={{ fontSize:T.text.xs, color:'#90A4B7', marginBottom:12 }}>Looking up...</div>
      )}
      {status==='found' && found && (
        <div style={{ fontSize:T.text.xs, color:'#4ade80', marginBottom:12 }}>
          ✓ Found - {found.cls} Class
        </div>
      )}
      {status==='notfound' && (
        <div style={{ fontSize:T.text.xs, color:'#fca5a5', marginBottom:12 }}>
          Not in current sheet · <a href="https://www.ilwulocal23.org" target="_blank" rel="noopener noreferrer" style={{ color:'#fca5a5' }}>Verify at ilwulocal23.org ↗</a>
        </div>
      )}
      <button onClick={handleGo} disabled={status!=='found'}
        style={{ width:'100%', background:status==='found'?T.yellow:'rgba(255,255,255,0.1)', color:status==='found'?T.navy:'rgba(255,255,255,0.3)', fontFamily:T.fontDisplay, fontSize:18, fontWeight:700, padding:'14px', borderRadius:T.radius.md, border:'none', cursor:status==='found'?'pointer':'default', letterSpacing:1 }}>
        CHECK MY SPINS →
      </button>
    </div>
  );
}

export default function HomePage() {
  // Redirect returning members straight to their data — no homepage flash.
  const saved = localStorage.getItem('ilwu23_member');
  if (saved) { window.location.replace('/app'); return null; }

  return (
    <div style={{ fontFamily:T.fontBody, background:T.cream, minHeight:'100vh' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@500&family=Bebas+Neue&display=swap'); *{box-sizing:border-box;margin:0;padding:0;}`}</style>

      {/* HERO */}
      <div style={{ background:T.navy, padding:'60px 24px 48px', textAlign:'center' }}>
        <div style={{ width:60, height:4, background:T.yellow, margin:'0 auto 32px' }} />
        <h1 style={{ fontFamily:T.fontDisplay, fontSize:'clamp(48px,10vw,80px)', color:T.white, lineHeight:1, letterSpacing:'-1px', maxWidth:700, margin:'0 auto 20px' }}>
          BUILT FOR THE HALL.<br/>AND FOR HOME.
        </h1>
        <p style={{ fontSize:T.text.md, color:'#90A4B7', maxWidth:520, margin:'0 auto 40px', lineHeight:1.7 }}>
          Longshore work is uncertain by design. But the information
          about that uncertainty doesn't have to take fifteen minutes
          to find. Your family's waiting. Let's make it fifteen seconds.
        </p>
        {/* Embedded mini onboarding — reg input + CTA */}
        <div style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:T.radius.xl, padding:'28px 24px', maxWidth:400, margin:'0 auto' }}>
          <EmbeddedOnboarding />
        </div>
        <p style={{ fontSize:T.text.xs, color:'#4A6A82', marginTop:16 }}>
          Free · No account · Your reg number stays on your phone
        </p>
      </div>

      {/* WHY */}
      <div style={{ padding:'56px 24px', maxWidth:680, margin:'0 auto' }}>
        <div style={{ fontSize:T.text.xs, fontWeight:700, color:T.blue, textTransform:'uppercase', letterSpacing:'2px', marginBottom:16 }}>
          Why it exists
        </div>
        <h2 style={{ fontFamily:T.fontDisplay, fontSize:'clamp(32px,6vw,48px)', color:T.navy, lineHeight:1.1, marginBottom:24 }}>
          THE UNCERTAINTY IS REAL.<br/>THE FRICTION DOESN'T HAVE TO BE.
        </h2>
        <div style={{ fontSize:T.text.md, color:'#444', lineHeight:1.8 }}>
          <p style={{ marginBottom:16 }}>
            A longshoreman finds out at 3pm he's on the night shift.
            His ex-wife has the kids. He needs to coordinate a pickup.
            He's got three tabs open on his phone trying to confirm
            he's even going in - spins sheet, the board, the vessel schedule.
          </p>
          <p style={{ marginBottom:16 }}>
            CheckMySpins puts all three in one place.
            Type your reg number once. See your full week,
            your best day highlighted, the vessels due in,
            and the night and day boards - all on one screen.
          </p>
          <p style={{ borderLeft:`4px solid ${T.yellow}`, paddingLeft:20, color:T.navy, fontWeight:600, fontSize:T.text.lg }}>
            The hall controls the work. You control how fast
            the information gets home.
          </p>
        </div>
      </div>

      {/* WHAT'S IN IT */}
      <div style={{ background:T.navy, padding:'48px 24px' }}>
        <div style={{ maxWidth:680, margin:'0 auto' }}>
          <div style={{ fontSize:T.text.xs, fontWeight:700, color:T.blue, textTransform:'uppercase', letterSpacing:'2px', marginBottom:16 }}>
            What's here now
          </div>
          <h2 style={{ fontFamily:T.fontDisplay, fontSize:'clamp(28px,5vw,40px)', color:T.white, marginBottom:28 }}>
            VERSION 1. FOCUSED. NO FLUFF.
          </h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:16 }}>
            {[
              { icon:'🔢', title:'Spin Number Lookup', body:'Type your reg once. See your full week instantly. Best day auto-highlighted.' },
              { icon:'📅', title:'This Week + Next Week', body:"Next week's numbers loaded before Saturday. Plan ahead." },
              { icon:'⚓', title:'10-Day Vessel Schedule', body:'Every ship due into Tacoma - terminal, cargo, ETA, live ship tracker.' },
              { icon:'📋', title:'Night + Day Work Board', body:'Mobile-readable dispatch board. No more pinching and zooming.' },
              { icon:'🔔', title:'Friday Reminder', body:'One tap sets a weekly calendar alert for when the new sheet drops.' },
              { icon:'↗', title:'Share My Week', body:'Send your spin card to anyone who needs to know your schedule.' },
            ].map(({ icon, title, body }) => (
              <div key={title} style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:T.radius.lg, padding:'20px 18px' }}>
                <div style={{ fontSize:24, marginBottom:10 }}>{icon}</div>
                <div style={{ fontWeight:700, fontSize:T.text.base, color:T.white, marginBottom:6 }}>{title}</div>
                <div style={{ fontSize:T.text.sm, color:'#90A4B7', lineHeight:1.6 }}>{body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ROADMAP — condensed */}
      <div style={{ padding:'48px 24px', maxWidth:680, margin:'0 auto' }}>
        <div style={{ fontSize:T.text.xs, fontWeight:700, color:T.blue, textTransform:'uppercase', letterSpacing:'2px', marginBottom:16 }}>
          What's next
        </div>
        <h2 style={{ fontFamily:T.fontDisplay, fontSize:'clamp(28px,5vw,40px)', color:T.navy, marginBottom:28 }}>
          BUILT ON FEEDBACK.<br/>SHIPPING FAST.
        </h2>
        {[
          { label:'LIVE', color:'#059669', bg:'#ECFDF5', title:'Dispatch Intelligence', body:'Spin lookup, vessel schedule, work board, Friday reminder, share card.' },
          { label:'BUILDING', color:'#1D4ED8', bg:'#EFF6FF', title:'Shift Log', body:'Log your shifts as you work them. Date, terminal, job type, hours. Lives on your device.' },
          { label:'PLANNED', color:'#92400E', bg:'#FFFBEB', title:'Pay Protection', body:'Enter your paystub gross. We calculate what you should have been paid. Flag discrepancies before the week is over.' },
          { label:'ROADMAP', color:'#374151', bg:'#F3F4F6', title:'Collective Intelligence', body:"Opt-in anonymized signal. What terminals are moving? Are B men getting their share? Intel the BA needs but can't see." },
        ].map(({ label, color, bg, title, body }) => (
          <div key={title} style={{ display:'flex', gap:16, marginBottom:20, alignItems:'flex-start' }}>
            <div style={{ background:bg, color, fontSize:T.text.xs, fontWeight:700, padding:'4px 10px', borderRadius:T.radius.pill, whiteSpace:'nowrap', marginTop:3 }}>
              {label}
            </div>
            <div>
              <div style={{ fontWeight:700, fontSize:T.text.base, color:T.navy, marginBottom:4 }}>{title}</div>
              <div style={{ fontSize:T.text.sm, color:'#555', lineHeight:1.6 }}>{body}</div>
            </div>
          </div>
        ))}
      </div>

      {/* PRIVACY STATEMENT */}
      <div style={{ background:T.navy, padding:'40px 24px', textAlign:'center' }}>
        <div style={{ maxWidth:560, margin:'0 auto' }}>
          <h2 style={{ fontFamily:T.fontDisplay, fontSize:'clamp(28px,5vw,36px)', color:T.white, marginBottom:16 }}>
            NOTHING LEAVES YOUR PHONE.
          </h2>
          <p style={{ fontSize:T.text.base, color:'#90A4B7', lineHeight:1.8, marginBottom:24 }}>
            Your reg number is saved in your browser's local storage -
            the same way a website remembers your dark mode preference.
            There is no CheckMySpins server. No account to create,
            breach, or delete. We read public data from sources the
            union already posts. That's the entire architecture.
          </p>
          <a href="/app" style={{ display:'inline-block', background:T.yellow, color:T.navy, fontFamily:T.fontDisplay, fontSize:18, fontWeight:700, padding:'14px 32px', borderRadius:T.radius.md, textDecoration:'none', letterSpacing:1 }}>
            CHECK MY SPINS →
          </a>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ padding:'24px', textAlign:'center', borderTop:`1px solid ${T.border}` }}>
        <div style={{ fontSize:T.text.xs, color:T.muted }}>
          CheckMySpins · Independent project · Not affiliated with ILWU or Local 23
        </div>
        <div style={{ fontSize:T.text.xs, color:T.muted, marginTop:4 }}>
          <a href="/app" style={{ color:T.blue }}>Open App</a>
          {' · '}
          <a href="https://ilwu.pepdekker.com" target="_blank" rel="noopener noreferrer" style={{ color:T.blue }}>Union Site</a>
        </div>
      </div>
    </div>
  );
}
