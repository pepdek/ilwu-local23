import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";

// ─── COLOUR TOKENS ────────────────────────────────────────────────────────────
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

// ─── SPIN SHEET DATA ──────────────────────────────────────────────────────────
const SHEETS = [
  {
    id: "1hnw6TCvT7z71hxFv8Fn2L2G08yAaBdegwRLiUttyug8",
    label: "May 30 – Jun 5",
    startSat: new Date("2026-05-30"),
  },
  {
    id: "1UVrSQ4Yz9s7Fy3R4riSce824vv0a3pYyMwC7M7EPvW4",
    label: "Jun 6 – Jun 12",
    startSat: new Date("2026-06-06"),
  },
];

const csvUrl = (id, tab) =>
  `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;

function getActiveSheetIdx() {
  const today = new Date(); today.setHours(0,0,0,0);
  for (let i = SHEETS.length - 1; i >= 0; i--) {
    if (today >= SHEETS[i].startSat) return i;
  }
  return 0;
}

const FALLBACK = {
  "1hnw6TCvT7z71hxFv8Fn2L2G08yAaBdegwRLiUttyug8": [
    { reg:"230385", cls:"B", sat:108, sun:357, mon:350, tue:251, wed:261, thu:87,  fri:142 },
    { reg:"61843",  cls:"A", sat:593, sun:663, mon:163, tue:286, wed:413, thu:42,  fri:255 },
  ],
  "1UVrSQ4Yz9s7Fy3R4riSce824vv0a3pYyMwC7M7EPvW4": [
    { reg:"230385", cls:"B", sat:182, sun:40,  mon:28,  tue:327, wed:326, thu:163, fri:218 },
    { reg:"61843",  cls:"A", sat:237, sun:306, mon:741, tue:849, wed:61,  thu:585, fri:821 },
  ],
};

// ─── VESSEL FETCH ─────────────────────────────────────────────────────────────
const SEATTLE_EXCLUDE = ["T18","T5","T30","T46","Duwamish"];
const DAY_NAMES   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatETA(date) {
  return `${DAY_NAMES[date.getDay()]} ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
}

async function fetchVessels() {
  const DIRECT = "https://docs.nwseaportalliance.com/Vessel/Schedule.xls";
  const PROXY  = "/.netlify/functions/vessels";
  let buf;
  try {
    const res = await fetch(DIRECT);
    if (!res.ok) throw new Error("direct failed");
    buf = await res.arrayBuffer();
  } catch {
    try {
      const res = await fetch(PROXY);
      if (!res.ok) throw new Error("proxy failed");
      buf = await res.arrayBuffer();
    } catch { return null; }
  }

  const wb   = XLSX.read(buf, { type:"array", cellDates:true });
  const ws   = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header:1, raw:false });

  // Use regex so "Vessel  Name" (double space in the XLS) still matches
  const hi = rows.findIndex(r => r.some(c => /vessel\s+name/i.test(String(c))));
  if (hi === -1) return null;
  // Array.from fills sparse holes (index 0 is empty in this XLS); normalise spaces
  const h   = Array.from(rows[hi], c => String(c ?? "").trim().replace(/\s+/g, " "));
  const col = k => h.findIndex(x => x && x.includes(k));
  const cName = col("Vessel Name"), cTerm = col("Terminal"), cBerth = col("Berth"),
        cCargo = col("Cargo"),      cETA  = col("ETA"),      cETD   = col("ETD"),
        cWay   = col("Water");

  const now    = new Date();
  const minus1 = new Date(now - 86400000);
  const plus10 = new Date(now.getTime() + 10 * 86400000);

  return rows.slice(hi + 1)
    .filter(r => {
      const terminal = String(r[cTerm] || r[cBerth] || "").trim();
      const waterway = String(r[cWay]  || "").trim();
      const eta      = r[cETA] ? new Date(r[cETA]) : null;
      // Filter by waterway: Blair and Sitcum are Tacoma; E Duwamish is Seattle
      const isTacoma = (waterway === "Blair" || waterway.includes("Sitcum")) &&
                       !SEATTLE_EXCLUDE.some(t => waterway.includes(t) || terminal.includes(t));
      return isTacoma && eta && !isNaN(eta) && eta >= minus1 && eta <= plus10 && r[cName];
    })
    .map(r => {
      const eta = new Date(r[cETA]);
      const etd = r[cETD] ? new Date(r[cETD]) : null;
      const status = eta <= now && etd && etd >= now ? "in-port"
                   : etd && etd < now               ? "departed"
                   : "upcoming";
      return {
        name:     String(r[cName]).trim(),
        terminal: String(r[cTerm] || r[cBerth] || "").trim(),
        cargo:    String(r[cCargo] || "").trim(),
        eta:      formatETA(eta),
        etaDate:  eta,
        status,
      };
    })
    .sort((a, b) => a.etaDate - b.etaDate)
    .slice(0, 10);
}

// ─── DISPATCH BOARD FETCH ────────────────────────────────────────────────────
// Parses the live ilwu23.com dispatch board HTML into a structured object.
// Each row has 12 columns: VESSEL, TERMINAL, UNITS, CRANES, X MAN, SK X-MEN,
// PD, LASHER, BUS, (empty), (empty), START TIME.
function parseDispatchHTML(html) {
  const dateMatch  = html.match(/<h1><a[^>]*>([\d/]+)<\/a><\/h1>/);
  const shiftMatch = html.match(/<h1><a[^>]+>((?:NIGHT|DAY)\s+WORK)<\/a><\/h1>/i);
  const date  = dateMatch?.[1]  ?? "";
  const shift = shiftMatch?.[1] ?? "";

  const cellRegex = /<td><a[^>]+>([\s\S]*?)<\/a><\/td>/g;
  const cells = [];
  let m;
  while ((m = cellRegex.exec(html)) !== null) {
    const v = m[1].trim();
    cells.push(v === "&nbsp;" ? "" : v);
  }

  const jobs = [];
  for (let i = 0; i + 12 <= cells.length; i += 12) {
    const row = cells.slice(i, i + 12);
    if (!row[0]) continue;
    jobs.push({
      vessel:   row[0],
      terminal: row[1],
      start:    row[11],
      details:  row.slice(2, 11).filter(c => c),
    });
  }
  return { date, shift, jobs };
}

async function fetchDispatchBoard(screen) {
  try {
    const res = await fetch(`/.netlify/functions/dispatch?screen=${screen}`);
    if (!res.ok) throw new Error("failed");
    return parseDispatchHTML(await res.text());
  } catch {
    return null;
  }
}

// ─── DAYS ─────────────────────────────────────────────────────────────────────
const DAYS_KEY  = ["sat","sun","mon","tue","wed","thu","fri"];
const DAYS_ABBR = ["SAT","SUN","MON","TUE","WED","THU","FRI"];
const DAYS_FULL = ["Saturday","Sunday","Monday","Tuesday","Wednesday","Thursday","Friday"];
const JS_TO_IDX = [1,2,3,4,5,6,0];
function getTodayIdx() { return JS_TO_IDX[new Date().getDay()]; }

// ─── CSV / SPIN FETCH ─────────────────────────────────────────────────────────
function parseSpinCSV(csv) {
  const rows = csv.trim().split("\n").map(r =>
    r.split(",").map(c => c.replace(/^"|"$/g,"").trim())
  );
  return rows
    .filter(r => r[0] && !isNaN(r[0]) && r[0] !== "")
    .map(r => ({
      reg: r[0].trim(), cls: r[1]?.trim() || "A",
      sat: parseInt(r[2]) || null, sun: parseInt(r[3]) || null,
      mon: parseInt(r[4]) || null, tue: parseInt(r[5]) || null,
      wed: parseInt(r[6]) || null, thu: parseInt(r[7]) || null,
      fri: parseInt(r[8]) || null,
    }));
}

// Fetch A + B in parallel, then probe Casual tab name variants sequentially
// until one returns actual data. The real tab is "C" but we try others as fallback.
async function fetchTabsForSheet(sheetId, label) {
  const [rA, rB] = await Promise.all([
    fetch(csvUrl(sheetId, "A")),
    fetch(csvUrl(sheetId, "B")),
  ]);
  const [cA, cB] = await Promise.all([rA.text(), rB.text()]);
  console.log(`[${label} / A] first 200:`, cA.slice(0, 200));
  console.log(`[${label} / B] first 200:`, cB.slice(0, 200));
  const spinsAB = [...parseSpinCSV(cA), ...parseSpinCSV(cB)];

  // Try Casual tab variants — "C" is the confirmed name, others are fallback
  let spinsC = [];
  for (const tabName of ["C", "Casual", "CASUAL", "casual"]) {
    try {
      const rC = await fetch(csvUrl(sheetId, tabName));
      const cC = await rC.text();
      const parsed = parseSpinCSV(cC);
      if (parsed.length > 0) {
        spinsC = parsed;
        console.log(`Casual tab found as: "${tabName}" — ${parsed.length} records. First reg: ${parsed[0]?.reg}`);
        break;
      }
    } catch { continue; }
  }

  return [...spinsAB, ...spinsC];
}

async function fetchAllCSVs() {
  const results = await Promise.all(
    SHEETS.map(sh =>
      fetchTabsForSheet(sh.id, sh.label)
        .then(spins => ({ sheetId: sh.id, spins }))
        .catch(err => {
          console.warn(`fetch failed [${sh.label}]`, err);
          return { sheetId: sh.id, spins: [] };
        })
    )
  );
  const map = {};
  for (const { sheetId, spins } of results) {
    if (!map[sheetId]) map[sheetId] = [];
    const existing = new Set(map[sheetId].map(s => s.reg));
    map[sheetId].push(...spins.filter(s => !existing.has(s.reg)));
  }
  return map;
}

// ─── ILWU LOGO MARK ──────────────────────────────────────────────────────────
function ILWUMark({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="17" cy="17" r="17" fill={C.yellow}/>
      <circle cx="17" cy="17" r="14" fill={C.navy}/>
      <ellipse cx="17" cy="17" rx="5.5" ry="14" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" fill="none"/>
      <line x1="3" y1="17" x2="31" y2="17" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8"/>
      <ellipse cx="17" cy="17" rx="14" ry="5.5" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" fill="none"/>
      <ellipse cx="17" cy="17" rx="14" ry="14" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" fill="none"/>
      <text x="17" y="20.5" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="900" fontSize="8" fill="white" letterSpacing="0.5">ILWU</text>
    </svg>
  );
}

// ─── ONBOARDING ──────────────────────────────────────────────────────────────
function Onboarding({ onSave }) {
  const [val, setVal]               = useState("");
  const [status, setStatus]         = useState(null);
  const [found, setFound]           = useState(null);
  const [spinsCache, setSpinsCache] = useState(null);
  const debounceRef                 = useRef(null);

  function lookup(reg) {
    setFound(null);
    if (reg.length < 4) { setStatus(null); return; }
    setStatus("searching");
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const trimmed = reg.trim();
      try {
        const allSpins = await fetchAllCSVs();
        setSpinsCache(allSpins);
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
        if (match) { setFound(match); setStatus("found"); }
        else setStatus("notfound");
        window.posthog?.capture('reg_lookup', {
          reg_number: trimmed,
          result: match ? 'found' : 'not_found',
          cls: match?.cls,
        });
      } catch (err) {
        console.error("lookup error", err);
        let match = null;
        for (const arr of Object.values(FALLBACK)) {
          match = arr.find(s => s.reg === trimmed) || null;
          if (match) break;
        }
        if (match) { setFound(match); setStatus("found"); }
        else setStatus("notfound");
        window.posthog?.capture('reg_lookup', {
          reg_number: trimmed,
          result: match ? 'found' : 'not_found',
          cls: match?.cls,
        });
      }
    }, 400);
  }

  const active = status === "found";
  return (
    <div style={{ minHeight:"100vh", background:C.cream, display:"flex", alignItems:"center", justifyContent:"center", padding:20, fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ background:C.white, borderRadius:20, width:"100%", maxWidth:400, overflow:"hidden", boxShadow:"0 4px 24px rgba(0,0,0,0.10)" }}>
        <div style={{ height:6, background:C.navy }} />
        <div style={{ padding:"32px 28px 36px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:32 }}>
            <ILWUMark size={40} />
            <div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:15, color:C.navy, letterSpacing:"2px", lineHeight:1.1 }}>ILWU LOCAL 23</div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:12, color:C.blue, letterSpacing:"3px", lineHeight:1.1 }}>DISPATCH</div>
            </div>
          </div>
          <div style={{ fontSize:22, fontWeight:700, color:C.dark, lineHeight:1.25, marginBottom:8 }}>What's your registration number?</div>
          <div style={{ fontSize:15, color:C.muted, marginBottom:28 }}>Enter it once. We'll remember it.</div>
          <label style={{ fontSize:12, fontWeight:600, color:"#555", display:"block", marginBottom:8 }}>Registration #</label>
          <input
            type="tel" inputMode="numeric" placeholder="e.g. 61225"
            value={val} maxLength={8}
            onChange={e => { setVal(e.target.value); lookup(e.target.value); }}
            style={{
              width:"100%", boxSizing:"border-box", WebkitAppearance:"none", appearance:"none",
              border:"1.5px solid",
              borderColor: status==="found" ? C.blue : status==="notfound" ? "#DC2626" : C.border,
              borderRadius:12, padding:"16px", fontSize:26, fontFamily:"'DM Mono',monospace",
              fontWeight:600, color:C.dark, letterSpacing:"4px", outline:"none",
              textAlign:"center", transition:"border-color 0.2s", marginBottom:12, background:C.white,
            }}
          />
          <div style={{ minHeight:60 }}>
            {status==="searching" && (
              <div style={{ fontSize:13, color:C.muted, textAlign:"center", padding:"16px 0" }}>Looking up...</div>
            )}
            {status==="found" && found && (
              <div style={{ display:"flex", alignItems:"center", gap:10, background:"#EFF6FF", border:`1px solid ${C.blue}`, borderRadius:10, padding:"12px 16px" }}>
                <span style={{ fontSize:20 }}>✓</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.blue }}>Found — {found.cls} Class</div>
                  <div style={{ fontSize:11, color:C.muted }}>Class auto-detected from sheet</div>
                </div>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:32, color:C.blue, lineHeight:1 }}>{found.cls}</div>
              </div>
            )}
            {status==="notfound" && (
              <div style={{ background:"#FFF5F5", border:"1px solid #FECACA", borderRadius:10, padding:"12px 16px" }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#DC2626" }}>Not found in current sheets</div>
                <div style={{ fontSize:11, color:C.muted, marginTop:3 }}>
                  B/Casual tabs may not be loaded yet.{" "}
                  <a href="https://www.ilwulocal23.org" target="_blank" rel="noopener noreferrer" style={{ color:C.blue, fontWeight:600 }}>Verify at ilwulocal23.org ↗</a>
                </div>
              </div>
            )}
          </div>
          <button
            disabled={!active}
            onClick={() => {
              if (!found) return;
              window.posthog?.capture('member_onboarded', { reg_number: found.reg, cls: found.cls });
              onSave({ reg: found.reg, cls: found.cls }, spinsCache);
            }}
            aria-label="Get started"
            style={{
              width:"100%", background: active ? C.navy : C.border, color: active ? C.yellow : C.muted,
              borderRadius:12, padding:"17px", fontSize:16, fontFamily:"'Bebas Neue',sans-serif",
              letterSpacing:"1px", cursor: active ? "pointer" : "default", border:"none", marginTop:16,
              transition:"background 0.2s, color 0.2s",
            }}>
            Check My Spins →
          </button>
          <div style={{ fontSize:12, color:C.muted, textAlign:"center", marginTop:14 }}>Saved to your device only. No account needed.</div>
        </div>
      </div>
    </div>
  );
}

// ─── WEEK CARD ────────────────────────────────────────────────────────────────
function WeekCard({ sheet, record, todayIdx, isCurrent }) {
  // Initial state: today for current week, Saturday (0) for next week.
  // useEffect below will update to best day once record loads.
  const [selDay, setSelDay] = useState(isCurrent ? todayIdx : 0);

  // Whenever record arrives or changes, jump to the best spin day.
  useEffect(() => {
    if (!record) return;
    const best = DAYS_KEY
      .map((dk, i) => ({ i, spin: record[dk] ?? Infinity }))
      .filter(d => d.spin !== Infinity)
      .sort((a, b) => a.spin - b.spin)[0];
    if (best !== undefined) setSelDay(best.i);
  }, [record?.reg, sheet.id]); // re-run when the member or sheet changes

  // Top-3 for cell highlighting (re-computed each render)
  const rankedDays = DAYS_KEY
    .map((dk, i) => ({ day:i, spin: record?.[dk] ?? Infinity }))
    .filter(d => d.spin !== Infinity && d.spin !== null)
    .sort((a, b) => a.spin - b.spin)
    .slice(0, 3);
  const rankMap = {};
  rankedDays.forEach((d, i) => { rankMap[d.day] = i; });

  // Single best index — null when record not yet loaded
  const bestIdx = record
    ? DAYS_KEY
        .map((dk, i) => ({ i, spin: record[dk] ?? Infinity }))
        .sort((a, b) => a.spin - b.spin)[0]?.i
    : null;

  const heroSpin = record?.[DAYS_KEY[selDay]] ?? null;

  const heroLabel =
    bestIdx !== null && selDay === bestIdx && isCurrent  ? "BEST THIS WEEK" :
    bestIdx !== null && selDay === bestIdx && !isCurrent ? "BEST NEXT WEEK" :
    isCurrent && selDay === todayIdx                     ? `TODAY · ${DAYS_FULL[selDay].toUpperCase()}` :
    DAYS_FULL[selDay].toUpperCase();

  return (
    <div style={{ background:C.white, borderRadius:18, border:`1.5px solid ${C.border}`, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
      <div style={{ height:4, background: isCurrent ? C.navy : C.blue }} />
      <div style={{ padding:"12px 18px 0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:13, color: isCurrent ? C.navy : C.muted, letterSpacing:"1px" }}>
          {isCurrent ? "This Week" : "Next Week"}
        </span>
        <span style={{ fontSize:11, color:C.muted, fontFamily:"'DM Mono',monospace" }}>{sheet.label}</span>
      </div>
      <div style={{ padding:"4px 18px 0" }}>
        <div style={{ fontSize:11, fontWeight:500, color:C.muted, textTransform:"uppercase", letterSpacing:"1px", marginBottom:2, minHeight:16, fontFamily:"'DM Sans',sans-serif" }}>
          {heroLabel}
        </div>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:84, lineHeight:0.9, color:C.navy, letterSpacing:"-2px" }}>
          {heroSpin ?? "—"}
        </div>
        <div style={{ height:14 }} />
      </div>

      {/* Day grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, padding:"0 10px 14px" }}>
        {DAYS_KEY.map((dk, di) => {
          const spin    = record?.[dk] ?? null;
          const rank    = rankMap[di] ?? -1;
          const isToday = isCurrent && di === todayIdx;
          const isTop1  = rank === 0;
          const isTop23 = rank === 1 || rank === 2;

          const bg          = isTop1 ? C.navy   : isTop23 ? C.blue  : C.cream;
          const borderColor = isTop1 ? C.yellow : isTop23 ? C.blue  : isToday ? C.navy : "transparent";
          const borderWidth = isTop1 ? "2px"    : "1.5px";
          const dayColor    = isTop1 ? C.yellow : isTop23 ? "rgba(255,255,255,0.7)" : isToday ? C.navy : C.muted;
          const numColor    = isTop1 ? C.yellow : isTop23 ? C.white : isToday ? C.navy : spin ? C.muted : "#ddd";

          return (
            <button
              key={dk}
              onClick={() => {
                setSelDay(di);
                window.posthog?.capture('day_selected', { day: DAYS_FULL[di], week: sheet.label });
              }}
              aria-label={`${DAYS_FULL[di]}: spin ${spin ?? "no data"}`}
              style={{
                background:  bg,
                border:      `${borderWidth} solid ${borderColor}`,
                borderRadius:9, padding:"6px 2px", textAlign:"center", cursor:"pointer",
                minHeight:44, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
              }}>
              {isTop1 && <div style={{ fontSize:9, color:C.yellow, lineHeight:1, marginBottom:1 }}>★</div>}
              <div style={{ fontSize:9, fontFamily:"'DM Mono',monospace", fontWeight:600, color:dayColor, letterSpacing:"0.3px", marginBottom:2 }}>
                {DAYS_ABBR[di]}
              </div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, lineHeight:1, color:numColor }}>
                {spin ?? "—"}
              </div>
            </button>
          );
        })}
      </div>

      {!record && (
        <div style={{ margin:"0 14px 14px", padding:"10px 14px", background:"#FFF5F5", border:"1px solid #FECACA", borderRadius:8, fontSize:12, color:"#DC2626" }}>
          Reg # not found in {sheet.label}.{" "}
          <a href="https://www.ilwulocal23.org" target="_blank" rel="noopener noreferrer" style={{ color:C.blue, fontWeight:600 }}>Check ilwulocal23.org ↗</a>
        </div>
      )}
    </div>
  );
}

function WeekCarousel({ sheets, records, todayIdx, activeIdx }) {
  const [page, setPage] = useState(0);
  const atStart = page === 0;
  const atEnd   = page === sheets.length - 1;
  return (
    <div style={{ marginBottom:12 }}>
      <WeekCard sheet={sheets[page]} record={records[sheets[page].id]} todayIdx={todayIdx} isCurrent={page === activeIdx} />
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:10, padding:"0 2px" }}>
        <button onClick={() => setPage(p => Math.max(0, p-1))} aria-label="Previous week"
          style={{ padding:"8px 18px", minHeight:44, borderRadius:20, background: atStart ? C.cream : C.navy, color: atStart ? C.muted : C.white, fontSize:13, fontWeight:600, border:"none", cursor: atStart ? "default" : "pointer" }}>
          ← This Week
        </button>
        <div style={{ display:"flex", gap:6 }}>
          {sheets.map((_, i) => (
            <button key={i} onClick={() => setPage(i)} aria-label={`Week ${i+1}`}
              style={{ width: i===page ? 20 : 7, height:7, borderRadius:4, background: i===page ? C.navy : C.border, border:"none", cursor:"pointer", transition:"all 0.2s", padding:0 }} />
          ))}
        </div>
        <button
          onClick={() => {
            setPage(p => {
              const next = Math.min(sheets.length - 1, p + 1);
              if (next > p) window.posthog?.capture('next_week_viewed', { from_week: sheets[activeIdx].label });
              return next;
            });
          }}
          aria-label="Next week"
          style={{ padding:"8px 18px", minHeight:44, borderRadius:20, background: atEnd ? C.cream : C.navy, color: atEnd ? C.muted : C.white, fontSize:13, fontWeight:600, border:"none", cursor: atEnd ? "default" : "pointer" }}>
          Next Week →
        </button>
      </div>
    </div>
  );
}

// ─── WORK BOARD ───────────────────────────────────────────────────────────────
function WorkBoard({ board, liveUrl }) {
  const isNight = board?.shift?.toUpperCase().includes("NIGHT");
  const icon    = isNight ? "🌙" : "☀️";
  const accentColor = isNight ? C.navy : C.blue;

  return (
    <div style={{ marginBottom:16 }}>
      {/* ── Header ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:24, lineHeight:1 }} role="img" aria-label={isNight ? "Night" : "Day"}>
            {board ? icon : "⏳"}
          </span>
          <div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:C.navy, letterSpacing:"2px", lineHeight:1 }}>
              {board ? board.shift : (isNight ? "NIGHT WORK" : "DAY WORK")}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:3 }}>
              {board?.date && (
                <span style={{ fontSize:11, color:C.muted, fontFamily:"'DM Mono',monospace" }}>{board.date}</span>
              )}
              <span style={{ width:7, height:7, borderRadius:"50%", background:"#22c55e", display:"inline-block" }} />
              <span style={{ fontSize:10, color:"#22c55e", fontWeight:700, letterSpacing:"0.5px", fontFamily:"'DM Sans',sans-serif" }}>LIVE</span>
            </div>
          </div>
        </div>
        <a href={liveUrl} target="_blank" rel="noopener noreferrer"
          style={{ fontSize:12, color:C.blue, fontWeight:600, marginTop:4 }}
          onClick={() => window.posthog?.capture('external_link_clicked', {
            label: isNight ? 'Night Work Board' : 'Day Work Board', url: liveUrl,
          })}>
          Full board ↗
        </a>
      </div>

      {/* ── Job list ── */}
      <div style={{ background:C.white, borderRadius:14, border:`1.5px solid ${C.border}`, borderLeft:`3px solid ${accentColor}`, overflow:"hidden" }}>
        {!board ? (
          <div style={{ padding:"18px 16px", textAlign:"center", color:C.muted, fontSize:13 }}>
            Loading dispatch board…
          </div>
        ) : board.jobs.length === 0 ? (
          <div style={{ padding:"18px 16px", textAlign:"center", color:C.muted, fontSize:13 }}>
            No jobs posted yet
          </div>
        ) : board.jobs.map((job, i) => (
          <div key={i} style={{ padding:"11px 16px", borderBottom:i < board.jobs.length-1 ? `1px solid ${C.cream}` : "none" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
              <div style={{ minWidth:0 }}>
                <div style={{ fontWeight:600, fontSize:13, color:C.dark }}>{job.vessel}</div>
                <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>{job.terminal} · {job.start}</div>
              </div>
              {job.details.length > 0 && (
                <div style={{ display:"flex", gap:4, flexWrap:"wrap", justifyContent:"flex-end", flexShrink:0, maxWidth:"55%" }}>
                  {job.details.slice(0, 3).map((d, di) => (
                    <span key={di} style={{ fontSize:10, background:C.cream, color:C.navy, borderRadius:5, padding:"3px 7px", fontWeight:600, whiteSpace:"nowrap" }}>
                      {d}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── VESSEL BADGE ─────────────────────────────────────────────────────────────
function VesselBadge({ status }) {
  const map = {
    "in-port":  { bg:C.navy,  color:C.white, border:"none",                  label:"IN PORT"  },
    "arriving": { bg:C.blue,  color:C.white, border:"none",                  label:"ARRIVING" },
    "upcoming": { bg:C.cream, color:C.navy,  border:`1px solid ${C.navy}`,   label:"UPCOMING" },
    "departed": { bg:C.cream, color:C.muted, border:"1px solid transparent", label:"DEPARTED" },
  };
  const s = map[status] || map["upcoming"];
  return (
    <span style={{ display:"inline-block", fontSize:9, fontWeight:700, padding:"3px 9px", borderRadius:20, background:s.bg, color:s.color, border:s.border, fontFamily:"'DM Mono',monospace", letterSpacing:"0.5px" }}>
      {s.label}
    </span>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [member,   setMember]   = useState(null);
  const [allSpins, setAllSpins] = useState({});
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [vessels,     setVessels]     = useState([]);
  const [vesselError, setVesselError] = useState(false);
  const [nightBoard,  setNightBoard]  = useState(null);
  const [dayBoard,    setDayBoard]    = useState(null);
  const todayIdx  = getTodayIdx();
  const activeIdx = getActiveSheetIdx();

  useEffect(() => {
    try { const s = localStorage.getItem("ilwu23_member"); if(s) setMember(JSON.parse(s)); } catch{}
  }, []);

  useEffect(() => {
    if (!member?.reg) return;
    setLoading(true); setError(null);
    fetchAllCSVs()
      .then(map => { setAllSpins(map); setLoading(false); })
      .catch(() => { setError("Using cached data."); setLoading(false); });
  }, [member?.reg]);

  useEffect(() => {
    fetchVessels().then(v => {
      if (v) setVessels(v);
      else setVesselError(true);
    });
  }, []);

  // Live dispatch boards — fetch on mount, auto-refresh every 60 s
  useEffect(() => {
    async function loadBoards() {
      const [night, day] = await Promise.all([
        fetchDispatchBoard("1"),
        fetchDispatchBoard("2"),
      ]);
      if (night) setNightBoard(night);
      if (day)   setDayBoard(day);
    }
    loadBoards();
    const interval = setInterval(loadBoards, 60000);
    return () => clearInterval(interval);
  }, []);

  function saveMember(m, spinsFromLookup) {
    localStorage.setItem("ilwu23_member", JSON.stringify(m));
    setMember(m);
    if (spinsFromLookup) setAllSpins(spinsFromLookup);
  }
  function resetMember() {
    localStorage.removeItem("ilwu23_member");
    setMember(null);
    setAllSpins({});
  }
  function findRecord(sheetId) {
    const live = allSpins[sheetId]?.find(s => s.reg === member?.reg);
    if (live) return live;
    return FALLBACK[sheetId]?.find(s => s.reg === member?.reg) || null;
  }

  // ─── PULL TO REFRESH ─────────────────────────────────────────────────────
  const [refreshing, setRefreshing] = useState(false);
  const ptrStartY = useRef(null);
  const ptrEl     = useRef(null);

  function onTouchStartPtr(e) { ptrStartY.current = e.touches[0].clientY; }
  function onTouchMovePtr(e) {
    if (ptrStartY.current === null) return;
    const dy = e.touches[0].clientY - ptrStartY.current;
    if (dy > 0 && window.scrollY === 0 && ptrEl.current) {
      ptrEl.current.style.height  = Math.min(dy * 0.4, 56) + "px";
      ptrEl.current.style.opacity = Math.min(dy / 80, 1);
    }
  }
  async function onTouchEndPtr() {
    if (!ptrEl.current) return;
    const h = parseFloat(ptrEl.current.style.height || "0");
    ptrEl.current.style.height  = "0px";
    ptrEl.current.style.opacity = "0";
    ptrStartY.current = null;
    if (h > 40) {
      setRefreshing(true);
      try {
        const [map, v, night, day] = await Promise.all([
          fetchAllCSVs(),
          fetchVessels(),
          fetchDispatchBoard("1"),
          fetchDispatchBoard("2"),
        ]);
        setAllSpins(map);
        if (v)     setVessels(v);
        if (night) setNightBoard(night);
        if (day)   setDayBoard(day);
      } catch {}
      setRefreshing(false);
    }
  }

  if (!member) return <Onboarding onSave={saveMember} />;

  const resolvedRecords = {};
  SHEETS.forEach(sh => { resolvedRecords[sh.id] = findRecord(sh.id); });

  // Vessel stats
  const atBerth  = vessels.filter(v => v.status === "in-port").length;
  const next72   = vessels.filter(v => v.status === "upcoming" && v.etaDate <= new Date(Date.now() + 3*86400000)).length;
  const thisWeek = vessels.filter(v => v.etaDate <= new Date(Date.now() + 7*86400000)).length;

  return (
    <div
      style={{ minHeight:"100vh", background:C.cream, fontFamily:"'DM Sans',sans-serif", maxWidth:430, margin:"0 auto" }}
      onTouchStart={onTouchStartPtr}
      onTouchMove={onTouchMovePtr}
      onTouchEnd={onTouchEndPtr}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@500&family=Bebas+Neue&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; -webkit-tap-highlight-color:transparent; }
        button { cursor:pointer; border:none; background:none; font:inherit; }
        input:focus { border-color:${C.blue} !important; box-shadow:0 0 0 3px rgba(55,125,189,0.15) !important; }
        a { text-decoration:none; color:inherit; }
      `}</style>

      {/* Pull-to-refresh */}
      <div ref={ptrEl} style={{ height:0, opacity:0, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", transition:"height 0.1s", background:C.cream }}>
        <span style={{ fontSize:13, color:C.navy, fontWeight:600 }}>↓ Release to refresh</span>
      </div>
      {refreshing && (
        <div style={{ background:C.navy, color:C.white, textAlign:"center", fontSize:12, fontWeight:600, padding:"8px", letterSpacing:"0.5px" }}>
          Refreshing...
        </div>
      )}

      {/* TOP BAR */}
      <div style={{ background:C.navy, padding:"12px 18px", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, zIndex:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:11 }}>
          <ILWUMark size={36} />
          <div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:14, color:C.white, letterSpacing:"2px", lineHeight:1.15 }}>ILWU LOCAL 23</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:12, color:C.yellow, letterSpacing:"3px", lineHeight:1.15 }}>DISPATCH</div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:C.blue, marginTop:2 }}>#{member.reg} · {member.cls} CLASS</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {loading && <span style={{ fontSize:13, color:"rgba(255,255,255,0.5)" }}>↻</span>}
          {error   && <span style={{ fontSize:13, color:C.yellow }}>⚠</span>}
          <button onClick={resetMember} aria-label="Change registration number"
            style={{ background:C.blue, borderRadius:20, padding:"8px 16px", minHeight:36, fontSize:12, fontWeight:700, color:C.white, border:"none", letterSpacing:"0.3px" }}>
            Change #
          </button>
        </div>
      </div>

      <div style={{ padding:"14px 14px 64px" }}>

        <WeekCarousel sheets={SHEETS} records={resolvedRecords} todayIdx={todayIdx} activeIdx={activeIdx} />

        {/* NIGHT BOARD — live from ilwu23.com, refreshes every 60s */}
        <WorkBoard board={nightBoard} liveUrl="http://ilwu23.com/?screen=1" />

        {/* DAY BOARD — live from ilwu23.com, refreshes every 60s */}
        <WorkBoard board={dayBoard} liveUrl="http://ilwu23.com/?screen=2" />

        {/* VESSELS */}
        <div style={{ marginBottom:12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:13, color:C.navy, letterSpacing:"1px" }}>Vessels · Tacoma</div>
            <a href="https://www.nwseaportalliance.com/cargo-operations/vessel-schedules-and-calendar"
              target="_blank" rel="noopener noreferrer"
              style={{ fontSize:12, color:C.blue, fontWeight:600 }}
              onClick={() => window.posthog?.capture('external_link_clicked', {
                label: 'Full Vessel Schedule', url: 'https://www.nwseaportalliance.com/cargo-operations/vessel-schedules-and-calendar',
              })}>Full schedule ↗</a>
          </div>

          {/* Stat tiles */}
          {vessels.length > 0 && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:10 }}>
              {[
                { label:"AT BERTH",    value: atBerth  },
                { label:"NEXT 72 HRS", value: next72   },
                { label:"THIS WEEK",   value: thisWeek },
              ].map(({ label, value }) => (
                <div key={label} style={{ background:C.navy, borderRadius:10, padding:"12px 8px", textAlign:"center" }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:36, color:C.yellow, lineHeight:1 }}>{value}</div>
                  <div style={{ fontSize:9, color:C.white, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", marginTop:3, fontFamily:"'DM Sans',sans-serif" }}>{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Vessel list */}
          {vesselError ? (
            <div style={{ background:C.white, borderRadius:14, border:`1.5px solid ${C.border}`, padding:"16px", fontSize:13, color:C.muted, textAlign:"center" }}>
              Vessel schedule unavailable ·{" "}
              <a href="https://www.nwseaportalliance.com/cargo-operations/vessel-schedules-and-calendar" target="_blank" rel="noopener noreferrer" style={{ color:C.blue, fontWeight:600 }}>Full schedule ↗</a>
            </div>
          ) : vessels.length === 0 ? (
            <div style={{ background:C.white, borderRadius:14, border:`1.5px solid ${C.border}`, padding:"16px", fontSize:13, color:C.muted, textAlign:"center" }}>
              Loading vessel schedule...
            </div>
          ) : (
            <div style={{ background:C.white, borderRadius:14, border:`1.5px solid ${C.border}`, overflow:"hidden" }}>
              {vessels.map((v, i) => (
                <div key={`${v.name}-${i}`} style={{ display:"flex", alignItems:"center", padding:"12px 16px", borderBottom:i<vessels.length-1?`1px solid ${C.cream}`:"none" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:14, color: v.status==="departed" ? C.muted : C.dark }}>{v.name}</div>
                    <div style={{ fontSize:12, color:C.muted, marginTop:1 }}>{v.terminal} · {v.cargo}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:11, color:C.muted, fontFamily:"'DM Mono',monospace", marginBottom:4 }}>ETA {v.eta}</div>
                    <VesselBadge status={v.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* DISCLAIMER */}
      <div style={{
        textAlign:"center", fontSize:11, color:C.muted,
        fontFamily:"'DM Sans',sans-serif", padding:"16px 20px 8px",
        paddingBottom:"calc(8px + env(safe-area-inset-bottom))",
      }}>
        This is an independent project. Not affiliated with ILWU or Local 23.
      </div>
    </div>
  );
}
