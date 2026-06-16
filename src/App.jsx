import { useState, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import * as XLSX from "xlsx";
import About from "./About.jsx";
import { T } from "./tokens.js";

// ─── SPIN SHEET DATA ──────────────────────────────────────────────────────────
// Hardcoded fallback — also used as default until sheet-config.json loads.
// Only keep current + next; expired sheets are dropped.
const SHEETS_FALLBACK = [
  {
    id: "1UVrSQ4Yz9s7Fy3R4riSce824vv0a3pYyMwC7M7EPvW4",
    label: "Jun 6 – Jun 12",
    startSat: new Date("2026-06-06"),
  },
  {
    id: "1jzZ5U4Sttt4Dfg01D9ipprT0usEL7GVZeW2IAto3sUU",
    label: "Jun 13 – Jun 19",
    startSat: new Date("2026-06-13"),
  },
];

const csvUrl = (id, tab) =>
  `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;

// Returns exactly [currentSheet, nextSheet] — expired sheets are dropped.
// If only one sheet is available, returns a single-item array.
function getRelevantSheets(sheets) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sorted = [...sheets].sort((a, b) => a.startSat - b.startSat);
  let currentIdx = -1;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].startSat <= today) { currentIdx = i; break; }
  }
  if (currentIdx === -1) currentIdx = 0; // all sheets are future — show earliest
  return sorted.slice(currentIdx, currentIdx + 2);
}

// Loads sheet IDs from /sheet-config.json and reconstructs the SHEETS array.
// Uses SHEETS_FALLBACK entries for known IDs; extrapolates weekly for new ones.
async function loadSheetConfig() {
  try {
    const res = await fetch("/sheet-config.json");
    if (!res.ok) throw new Error("config not found");
    const data = await res.json();
    const ids  = data.sheetIds || [];
    if (!ids.length) throw new Error("empty config");

    // Build date lookup from the fallback for all known IDs
    const knownDates = {};
    SHEETS_FALLBACK.forEach(s => { knownDates[s.id] = s.startSat; });

    // Find the last known ID in the config to anchor extrapolation
    let anchorDate = null, anchorPos = -1;
    for (let i = ids.length - 1; i >= 0; i--) {
      if (knownDates[ids[i]]) { anchorDate = knownDates[ids[i]]; anchorPos = i; break; }
    }
    if (!anchorDate) return null; // no anchor found, use fallback

    return ids.map((id, i) => {
      const startSat = knownDates[id] ||
        new Date(anchorDate.getTime() + (i - anchorPos) * 7 * 86400000);
      const endFri = new Date(startSat.getTime() + 6 * 86400000);
      const fmt = d => d.toLocaleDateString("en-US", { month:"short", day:"numeric" });
      return { id, label: `${fmt(startSat)} – ${fmt(endFri)}`, startSat };
    });
  } catch {
    return null; // caller falls back to SHEETS_FALLBACK
  }
}

const FALLBACK = {
  "1UVrSQ4Yz9s7Fy3R4riSce824vv0a3pYyMwC7M7EPvW4": [
    { reg:"230385", cls:"B", sat:182, sun:40,  mon:28,  tue:327, wed:326, thu:163, fri:218 },
    { reg:"61843",  cls:"A", sat:237, sun:306, mon:741, tue:849, wed:61,  thu:585, fri:821 },
  ],
  "1jzZ5U4Sttt4Dfg01D9ipprT0usEL7GVZeW2IAto3sUU": [
    { reg:"230385", cls:"B", sat:9,   sun:250, mon:171, tue:318, wed:240, thu:157, fri:272 },
    { reg:"61843",  cls:"A", sat:326, sun:424, mon:605, tue:400, wed:33,  thu:209, fri:236 },
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
    .filter(v => v.status !== 'departed')
    .sort((a, b) => a.etaDate - b.etaDate)
    .slice(0, 6);
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

  // Split HTML at HOUSE WORK heading so we can parse each section separately
  const housePos   = html.search(/<h1><a[^>]+>HOUSE\s+WORK<\/a><\/h1>/i);
  const vesselHtml = housePos > -1 ? html.slice(0, housePos) : html;
  const houseHtml  = housePos > -1 ? html.slice(housePos)    : "";

  function parseRows(chunk) {
    const re = /<td><a[^>]+>([\s\S]*?)<\/a><\/td>/g;
    const cells = [];
    let m;
    while ((m = re.exec(chunk)) !== null) {
      const v = m[1].trim();
      cells.push(v === "&nbsp;" ? "" : v);
    }
    const rows = [];
    for (let i = 0; i + 12 <= cells.length; i += 12) {
      const row = cells.slice(i, i + 12);
      if (!row[0]) continue;
      rows.push({
        vessel:   row[0],
        terminal: row[1],
        // Named fields so JobRow can render labeled badges
        units:    row[2]  || '',   // e.g. "2-BACK", "4-NEW"
        cranes:   row[3]  || '',
        xmen:     row[4]  || '',
        skxmen:   row[5]  || '',
        pd:       row[6]  || '',
        lasher:   row[7]  || '',
        bus:      row[8]  || '',
        start:    row[11] || '',
        // Flat array kept for house work rendering
        details:  row.slice(2, 11).filter(c => c && c !== '0' && c !== 'update'),
      });
    }
    return rows;
  }

  return { date, shift, jobs: parseRows(vesselHtml), houseJobs: parseRows(houseHtml) };
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

// sheets defaults to SHEETS_FALLBACK so Onboarding can call without a param
async function fetchAllCSVs(sheets = SHEETS_FALLBACK) {
  const results = await Promise.all(
    sheets.map(sh =>
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
      <circle cx="17" cy="17" r="17" fill={T.yellow}/>
      <circle cx="17" cy="17" r="14" fill={T.navy}/>
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
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", fontFamily:T.fontBody }}>

      {/* ── TOP ZONE — navy ── */}
      <div style={{ background:T.navy, padding:"40px 24px 32px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:0 }}>
          <ILWUMark size={36} />
          <div>
            <div style={{ fontFamily:T.fontBody, fontWeight:700, fontSize:32, color:T.white, letterSpacing:"1.5px", lineHeight:1 }}>
              Dispatch App
            </div>
            <div style={{ fontFamily:T.fontMono, fontSize:11, color:"rgba(255,255,255,0.5)", marginTop:4, letterSpacing:"0.5px" }}>
              PORT OF TACOMA · DISPATCH
            </div>
          </div>
        </div>
        <div style={{ width:40, height:3, background:T.yellow, margin:`${T.space[3]}px 0 ${T.space[2]}px` }} aria-hidden="true" />
        <div style={{ fontSize:16, color:T.blue, fontFamily:T.fontBody, fontWeight:500, lineHeight:1.4 }}>
          Your spins. Your board. One tap.
        </div>
      </div>

      {/* ── BOTTOM ZONE — cream ── */}
      <div style={{ flex:1, background:T.cream, padding:`${T.space[3]}px ${T.space[3]}px ${T.space[5]}px` }}>

        {/* Privacy note first — addresses hesitation before the input */}
        <div style={{ fontSize:12, color:T.mutedText, marginBottom:20, lineHeight:1.6 }}>
          No account needed — stays on your device.
        </div>

        <label style={{ fontSize:12, fontWeight:600, color:T.mutedText, display:"block", marginBottom:8 }}>Registration #</label>
        <input
          type="tel" inputMode="numeric" placeholder="e.g. 61225"
          value={val} maxLength={8}
          onChange={e => { setVal(e.target.value); lookup(e.target.value); }}
          style={{
            width:"100%", boxSizing:"border-box", WebkitAppearance:"none", appearance:"none",
            border:"1.5px solid",
            borderColor: status==="found" ? T.blue : status==="notfound" ? T.error : T.border,
            borderRadius:12, padding:"16px", fontSize:26, fontFamily:T.fontMono,
            fontWeight:600, color:T.dark, letterSpacing:"4px", outline:"none",
            textAlign:"center", transition:'border-color 0.15s ease', marginBottom:12, background:T.white,
          }}
        />

        {/* Status feedback — no fixed height, collapses when empty */}
        <div style={{ minHeight:0 }}>
          {status==="searching" && (
            <div style={{ fontSize:T.text.sm, color:T.muted, textAlign:"center", padding:"12px 0" }}>Looking up...</div>
          )}
          {status==="found" && found && (
            <div style={{ display:"flex", alignItems:"center", gap:10, background:T.successBg, border:`1px solid ${T.blue}`, borderRadius:T.radius.md, padding:`${T.space[1]}px ${T.space[2]}px`, marginBottom:4 }}>
              <span style={{ fontSize:20 }}>✓</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:T.text.sm, fontWeight:700, color:T.blue }}>Found — {found.cls} Class</div>
                <div style={{ fontSize:T.text.xs, color:T.muted }}>Class auto-detected from sheet</div>
              </div>
              <div style={{ fontFamily:T.fontBody, fontWeight:700, fontSize:32, color:T.blue, lineHeight:1 }}>{found.cls}</div>
            </div>
          )}
          {status==="notfound" && (
            <div style={{ background:T.errorBg, border:`1px solid ${T.errorBorder}`, borderRadius:T.radius.md, padding:`${T.space[1]}px ${T.space[2]}px`, marginBottom:4 }}>
              <div style={{ fontWeight:700, fontSize:T.text.sm, color:T.error, marginBottom:4 }}>
                #{val} isn't in the current sheet
              </div>
              <div style={{ fontSize:T.text.xs, color:T.muted, lineHeight:1.6 }}>
                The sheet updates every Saturday. If you're a Casual, your tab may post later in the week.{' '}
                <a href="https://www.ilwulocal23.org" target="_blank" rel="noopener noreferrer" style={{ color:T.error, fontWeight:600 }}>
                  Verify at ilwulocal23.org ↗
                </a>
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
            width:"100%", background: active ? T.navy : T.border, color: active ? T.yellow : T.muted,
            borderRadius:12, padding:`${T.space[2]}px`, fontSize:16, fontFamily:T.fontBody, fontWeight:700,
            letterSpacing:"1px", cursor: active ? "pointer" : "default", border:"none", marginTop:12,
            transition:'background-color 0.2s ease, color 0.2s ease, opacity 0.2s ease',
          }}>
          Check My Spins →
        </button>

      </div>
    </div>
  );
}

// ─── WEEK CARD ────────────────────────────────────────────────────────────────
function WeekCard({ sheet, record, todayIdx, isCurrent, reg }) {
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
    <div style={{ background:T.white, borderRadius:T.radius.xl, border:`1.5px solid ${T.border}`, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.05)", transition:'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)' }}>
      <div style={{ height:4, background: isCurrent ? T.navy : T.blue }} />
      <div style={{ padding:`${T.space[1]}px ${T.space[2]}px 0`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontFamily:T.fontBody, fontWeight:700, fontSize:T.text.xs, color: isCurrent ? T.navy : T.muted, letterSpacing:"2px", textTransform:"uppercase" }}>
          {isCurrent ? "This Week" : "Next Week"}
        </span>
        <span style={{ fontSize:T.text.xs, color:T.muted, fontFamily:T.fontMono }}>{sheet.label}</span>
      </div>
      <div style={{ padding:`4px ${T.space[2]}px 0` }}>
        <div style={{ fontSize:T.text.xs, fontWeight:500, color:T.muted, textTransform:"uppercase", letterSpacing:"1px", marginBottom:2, minHeight:16, fontFamily:T.fontBody }}>
          {heroLabel}
        </div>
        <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:84, color:T.navy, letterSpacing:"-2px", lineHeight:1 }}>
          {heroSpin ?? "—"}
        </div>
        <div style={{ height:14 }} />
      </div>

      {/* Day grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, padding:`0 ${T.space[1]}px ${T.space[2]}px` }}>
        {DAYS_KEY.map((dk, di) => {
          const spin    = record?.[dk] ?? null;
          const rank    = rankMap[di] ?? -1;
          const isToday = isCurrent && di === todayIdx;
          const isTop1  = rank === 0;
          const isTop23 = rank === 1 || rank === 2;

          const bg          = isTop1 ? T.navy   : isTop23 ? T.blue  : T.cream;
          const borderColor = isTop1 ? T.yellow : isTop23 ? T.blue  : isToday ? T.navy : "transparent";
          const borderWidth = isTop1 ? "2px"    : "1.5px";
          const dayColor    = isTop1 ? T.yellow : isTop23 ? "rgba(255,255,255,0.7)" : isToday ? T.navy : T.muted;
          const numColor    = isTop1 ? T.yellow : isTop23 ? T.white : isToday ? T.navy : spin ? T.muted : "#ddd";

          return (
            <button
              key={dk}
              onClick={() => {
                setSelDay(di);
                window.posthog?.capture('day_selected', { day: DAYS_FULL[di], week: sheet.label });
              }}
              aria-label={`${DAYS_FULL[di]}: spin ${spin ?? "no data"}`}
              className={isTop1 ? 'best-day-cell' : undefined}
              style={{
                background:  bg,
                border:      `${borderWidth} solid ${borderColor}`,
                borderRadius:9, padding:`${T.space[1]}px 2px`, textAlign:"center", cursor:"pointer",
                minHeight:44, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                transition:'background-color 0.12s ease, border-color 0.12s ease',
              }}>
              {isTop1 && <div style={{ fontSize:9, color:T.yellow, lineHeight:1, marginBottom:1 }}>★</div>}
              <div style={{ fontSize:9, fontFamily:T.fontMono, fontWeight:600, color:dayColor, letterSpacing:"0.3px", marginBottom:2 }}>
                {DAYS_ABBR[di]}
              </div>
              <div style={{ fontFamily:T.fontMono, fontWeight:500, fontSize:18, lineHeight:1, color:numColor }}>
                {spin ?? "—"}
              </div>
            </button>
          );
        })}
      </div>

      {!record && (
        <div style={{ margin:`0 ${T.space[2]}px ${T.space[2]}px`, background:T.errorBg, border:`1px solid ${T.errorBorder}`, borderRadius:T.radius.md, padding:`${T.space[1]}px ${T.space[2]}px` }}>
          <div style={{ fontWeight:700, fontSize:T.text.sm, color:T.error, marginBottom:4 }}>
            #{reg} isn't in {sheet.label}
          </div>
          <div style={{ fontSize:T.text.xs, color:T.muted, lineHeight:1.6 }}>
            The sheet updates every Saturday. If you're a Casual, your tab may post later in the week.{' '}
            <a href="https://www.ilwulocal23.org" target="_blank" rel="noopener noreferrer" style={{ color:T.error, fontWeight:600 }}>
              Verify at ilwulocal23.org ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// sheets is already the relevant window (1–2 items from getRelevantSheets).
// Index 0 is always the current week; index 1 (if present) is next week.
function WeekCarousel({ sheets, records, todayIdx, reg }) {
  const [page, setPage] = useState(0);
  const hasNext = sheets.length > 1;
  return (
    <div style={{ marginBottom:T.space[2] }}>
      <WeekCard
        sheet={sheets[page]}
        record={records[sheets[page].id]}
        todayIdx={todayIdx}
        isCurrent={page === 0}
        reg={reg}
      />
      {hasNext && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:10, padding:"0 2px" }}>
          <button onClick={() => setPage(0)} aria-label="This week"
            style={{ padding:"8px 18px", minHeight:44, borderRadius:T.radius.pill, background: page===0 ? T.cream : T.navy, color: page===0 ? T.muted : T.white, fontSize:T.text.sm, fontWeight:600, border:"none", cursor: page===0 ? "default" : "pointer" }}>
            ← This Week
          </button>
          <div style={{ display:"flex", gap:6 }}>
            {sheets.map((_, i) => (
              <button key={i} onClick={() => setPage(i)} aria-label={`Week ${i+1}`}
                style={{ width: i===page ? 20 : 7, height:7, borderRadius:4, background: i===page ? T.navy : T.border, border:"none", cursor:"pointer", transition:'width 0.2s ease, background-color 0.2s ease', padding:0 }} />
            ))}
          </div>
          <button
            onClick={() => {
              if (page < sheets.length - 1) {
                window.posthog?.capture('next_week_viewed', { from_week: sheets[0].label });
                setPage(1);
              }
            }}
            aria-label="Next week"
            style={{ padding:"8px 18px", minHeight:44, borderRadius:T.radius.pill, background: page===1 ? T.cream : T.navy, color: page===1 ? T.muted : T.white, fontSize:T.text.sm, fontWeight:600, border:"none", cursor: page===1 ? "default" : "pointer" }}>
            Next Week →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── WORK BOARD ───────────────────────────────────────────────────────────────
function isValidCell(v) {
  return v && v !== '0' && v !== 'update';
}

const ANNOTATION_DAYS = /^(SUNDAY|MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY)$/i;
function isAnnotation(job) {
  return ANNOTATION_DAYS.test(job.terminal?.trim()) || job.vessel?.trim().startsWith('NO ');
}

// Compact labeled badge for the inline dispatch board
function DispatchBadge({ label, value, bg, color }) {
  return (
    <span style={{ background:bg, borderRadius:5, padding:"3px 7px", fontWeight:600,
      whiteSpace:"nowrap", display:"inline-flex", alignItems:"center", gap:3, flexShrink:0 }}>
      {label && (
        <span style={{ fontSize:8, fontWeight:700, color, textTransform:"uppercase",
          letterSpacing:"0.5px" }}>{label}</span>
      )}
      <span style={{ fontSize:10, fontWeight:700, color }}>{value}</span>
    </span>
  );
}

function JobRow({ job, isLast, isHouse }) {
  // Dispatcher annotations (e.g. "NO SCRAP, REPICK SUNDAY") — not real vessels
  if (!isHouse && isAnnotation(job)) {
    return (
      <div style={{ fontSize:12, color:T.muted, fontStyle:"italic",
        padding:`${T.space[1]}px ${T.space[2]}px`, borderTop:`1px solid ${T.border}` }}>
        {job.vessel}{job.terminal ? ` — ${job.terminal}` : ''}
      </div>
    );
  }

  return (
    <div style={{
      padding:`${T.space[1]}px ${T.space[2]}px`,
      borderBottom: isLast ? "none" : `1px solid ${isHouse ? T.border : T.cream}`,
      background: isHouse ? T.cream : T.white,
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
        <div style={{ minWidth:0 }}>
          <div style={{ fontWeight:600, fontSize:T.text.sm, color: isHouse ? T.mutedText : T.dark }}>{job.vessel}</div>
          <div style={{ fontSize:12, color:T.mutedText, marginTop:1 }}>
            {[job.terminal, job.start].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div style={{ display:"flex", gap:4, flexWrap:"wrap", justifyContent:"flex-end", flexShrink:0, maxWidth:"58%" }}>
          {isHouse ? (
            // House work: flat unlabeled chips (columns have no fixed semantic)
            job.details.map((d, di) => (
              <span key={di} style={{
                fontSize:10, borderRadius:5, padding:"3px 7px", fontWeight:600,
                whiteSpace:"nowrap", background:T.border, color:T.mutedText,
              }}>{d}</span>
            ))
          ) : (
            // Vessel work: labeled badges by fixed column position
            <>
              {isValidCell(job.units)  && <DispatchBadge label=""     value={job.units}  bg={T.dispatch.unitsBg} color={T.dispatch.unitsColor} />}
              {isValidCell(job.cranes) && <DispatchBadge label="CR"   value={job.cranes} bg={T.dispatch.crBg}    color={T.dispatch.crColor}    />}
              {isValidCell(job.xmen)   && <DispatchBadge label="X"    value={job.xmen}   bg={T.dispatch.xBg}     color={T.dispatch.xColor}     />}
              {isValidCell(job.skxmen) && <DispatchBadge label="SK"   value={job.skxmen} bg={T.dispatch.xBg}     color={T.dispatch.xColor}     />}
              {isValidCell(job.pd)     && <DispatchBadge label="PD"   value={job.pd}     bg={T.dispatch.pdBg}    color={T.dispatch.pdColor}    />}
              {isValidCell(job.lasher) && <DispatchBadge label="LASH" value={job.lasher} bg={T.dispatch.lasherBg} color={T.dispatch.lasherColor} />}
              {isValidCell(job.bus)    && <DispatchBadge label="BUS"  value={job.bus}    bg={T.dispatch.busBg}   color={T.dispatch.busColor}   />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function WorkBoard({ board, liveUrl, lastFetched }) {
  const isNight     = board?.shift?.toUpperCase().includes("NIGHT");
  const icon        = isNight ? "🌙" : "☀️";
  const accentColor = isNight ? T.navy : T.blue;

  const vesselJobs = board?.jobs      ?? [];
  const houseJobs  = board?.houseJobs ?? [];
  const hasVessel  = vesselJobs.length > 0;
  const hasHouse   = houseJobs.length  > 0;

  return (
    <div style={{ marginBottom:T.space[2] }}>
      {/* ── Header ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:T.space[1] }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:24, lineHeight:1 }} role="img" aria-label={isNight ? "Night" : "Day"}>
            {board ? icon : "⏳"}
          </span>
          <div>
            <div style={{ fontFamily:T.fontBody, fontWeight:700, fontSize:22, color:T.navy, letterSpacing:"2px", lineHeight:1 }}>
              {board ? board.shift : (isNight ? "NIGHT WORK" : "DAY WORK")}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:3 }}>
              {board?.date && (
                <span style={{ fontSize:12, color:T.mutedText, fontFamily:T.fontMono }}>{board.date}</span>
              )}
              <span style={{ fontSize:10, color:T.live, fontWeight:600, fontFamily:T.fontMono }}>
                {lastFetched ? timeSince(lastFetched) : "LIVE"}
              </span>
            </div>
          </div>
        </div>
        <a href={liveUrl} target="_blank" rel="noopener noreferrer"
          style={{ fontSize:12, color:T.blue, fontWeight:600, padding:"8px 0", display:"inline-block" }}
          onClick={() => window.posthog?.capture('external_link_clicked', {
            label: isNight ? 'Night Work Board' : 'Day Work Board', url: liveUrl,
          })}>
          Full board ↗
        </a>
      </div>

      {/* ── Card ── */}
      <div style={{ background:T.white, borderRadius:T.radius.lg, border:`1.5px solid ${T.border}`, borderLeft:`3px solid ${accentColor}`, overflow:"hidden" }}>
        {!board ? (
          <div style={{ textAlign:'center', padding:`${T.space[4]}px ${T.space[2]}px` }}>
            <div style={{ fontSize:20, marginBottom:T.space[1] }}>📋</div>
            <div style={{ fontFamily:T.fontBody, fontSize:T.text.sm, color:T.muted, lineHeight:1.6 }}>
              Fetching dispatch board...
            </div>
          </div>
        ) : !hasVessel && !hasHouse ? (
          <div style={{ padding:"18px 16px", textAlign:"center", color:T.mutedText, fontSize:T.text.sm }}>
            No jobs posted yet
          </div>
        ) : (
          <>
            {/* ── VESSEL WORK ── */}
            {hasVessel && (
              <>
                {/* Section label — only shown when house work also exists */}
                {hasHouse && (
                  <div style={{ padding:`${T.space[1]}px ${T.space[2]}px`, background:T.navy, display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontFamily:T.fontBody, fontWeight:700, fontSize:T.text.xs, color:"rgba(255,255,255,0.6)", letterSpacing:"2px", textTransform:"uppercase" }}>
                      🚢 VESSEL WORK
                    </span>
                  </div>
                )}
                {vesselJobs.map((job, i) => (
                  <JobRow key={i} job={job} isHouse={false}
                    isLast={i === vesselJobs.length - 1 && !hasHouse} />
                ))}
              </>
            )}

            {/* ── HOUSE WORK ── */}
            {hasHouse && (
              <>
                <div style={{ padding:`${T.space[1]}px ${T.space[2]}px`, background:T.blue, display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontFamily:T.fontBody, fontWeight:700, fontSize:T.text.xs, color:"rgba(255,255,255,0.75)", letterSpacing:"2px", textTransform:"uppercase" }}>
                    🏗 HOUSE WORK
                  </span>
                </div>
                {houseJobs.map((job, i) => (
                  <JobRow key={i} job={job} isHouse={true}
                    isLast={i === houseJobs.length - 1} />
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* Official source fallback */}
      <div style={{ textAlign:"center", marginTop:6 }}>
        <a href={`http://ilwu23.com/?screen=${isNight ? '1' : '2'}`}
          target="_blank" rel="noopener noreferrer"
          style={{ fontSize:11, color:T.mutedText, textDecoration:"none",
            display:"inline-block", padding:"4px 0" }}>
          Official board ↗
        </a>
      </div>
    </div>
  );
}

// ─── VESSEL BADGE ─────────────────────────────────────────────────────────────
function VesselBadge({ status }) {
  const map = {
    "in-port":  { bg:T.navy,  color:T.white, border:"none",                  label:"IN PORT"  },
    "arriving": { bg:T.blue,  color:T.white, border:"none",                  label:"ARRIVING" },
    "upcoming": { bg:T.cream, color:T.navy,  border:`1px solid ${T.navy}`,   label:"UPCOMING" },
    "departed": { bg:T.cream, color:T.muted, border:"1px solid transparent", label:"DEPARTED" },
  };
  const s = map[status] || map["upcoming"];
  return (
    <span style={{ display:"inline-block", fontSize:9, fontWeight:700, padding:"3px 9px", borderRadius:T.radius.pill, background:s.bg, color:s.color, border:s.border, fontFamily:T.fontMono, letterSpacing:"0.5px" }}>
      {s.label}
    </span>
  );
}

// ─── TIMESTAMP HELPER ─────────────────────────────────────────────────────────
function timeSince(date) {
  if (!date) return null;
  const secs = Math.floor((Date.now() - date) / 1000);
  if (secs < 60)   return "Updated just now";
  if (secs < 120)  return "Updated 1 min ago";
  if (secs < 3600) return `Updated ${Math.floor(secs / 60)}m ago`;
  return `Updated ${Math.floor(secs / 3600)}h ago`;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
function DispatchApp() {
  const [sheets,   setSheets]   = useState(SHEETS_FALLBACK);
  const [member,   setMember]   = useState(null);
  const [allSpins, setAllSpins] = useState({});
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [vessels,     setVessels]     = useState([]);
  const [vesselError, setVesselError] = useState(false);
  const [nightBoard,        setNightBoard]        = useState(null);
  const [dayBoard,          setDayBoard]          = useState(null);
  const [lastFetched,       setLastFetched]       = useState(null);
  const [boardsLastFetched, setBoardsLastFetched] = useState(null);
  const [vesselsLastFetched,setVesselsLastFetched]= useState(null);
  const [tick,        setTick]        = useState(0); // increments every 60s to re-render timeSince
  const todayIdx       = getTodayIdx();
  const relevantSheets = getRelevantSheets(sheets);

  // Tick every 60s so timeSince() stays accurate while the app is open
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    try { const s = localStorage.getItem("ilwu23_member"); if(s) setMember(JSON.parse(s)); } catch{}
  }, []);

  // Load dynamic sheet config (falls back to SHEETS_FALLBACK if unavailable)
  useEffect(() => {
    loadSheetConfig().then(loaded => { if (loaded) setSheets(loaded); });
  }, []);

  useEffect(() => {
    if (!member?.reg) return;
    setLoading(true); setError(null);
    fetchAllCSVs(getRelevantSheets(sheets))
      .then(map => { setAllSpins(map); setLoading(false); setLastFetched(new Date()); })
      .catch(() => { setError("Using cached data."); setLoading(false); });
  }, [member?.reg]);

  useEffect(() => {
    fetchVessels().then(v => {
      if (v) { setVessels(v); setVesselsLastFetched(Date.now()); }
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
      if (night || day) setBoardsLastFetched(Date.now());
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
          fetchAllCSVs(getRelevantSheets(sheets)),
          fetchVessels(),
          fetchDispatchBoard("1"),
          fetchDispatchBoard("2"),
        ]);
        setAllSpins(map);
        if (v)     { setVessels(v); setVesselsLastFetched(Date.now()); }
        if (night) setNightBoard(night);
        if (day)   setDayBoard(day);
        if (night || day) setBoardsLastFetched(Date.now());
        setLastFetched(new Date());
      } catch {}
      setRefreshing(false);
    }
  }

  if (!member) return <Onboarding onSave={saveMember} />;

  const resolvedRecords = {};
  relevantSheets.forEach(sh => { resolvedRecords[sh.id] = findRecord(sh.id); });

  // Vessel stats
  const atBerth  = vessels.filter(v => v.status === "in-port").length;
  const next72   = vessels.filter(v => v.status === "upcoming" && v.etaDate <= new Date(Date.now() + 3*86400000)).length;
  const thisWeek = vessels.filter(v => v.etaDate <= new Date(Date.now() + 7*86400000)).length;

  return (
    <div
      style={{ minHeight:"100vh", background:T.cream, fontFamily:T.fontBody, maxWidth:430, margin:"0 auto" }}
      onTouchStart={onTouchStartPtr}
      onTouchMove={onTouchMovePtr}
      onTouchEnd={onTouchEndPtr}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@500&family=Bebas+Neue&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; -webkit-tap-highlight-color:transparent; }
        button { cursor:pointer; border:none; background:none; font:inherit; }
        input:focus { border-color:${T.blue} !important; box-shadow:0 0 0 3px rgba(55,125,189,0.15) !important; }
        a { text-decoration:none; color:inherit; }
        button, a { transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, opacity 0.15s ease; }
        @keyframes bestDayIn {
          0%   { transform: scale(0.92); opacity: 0.6; }
          60%  { transform: scale(1.04); }
          100% { transform: scale(1);    opacity: 1; }
        }
        .best-day-cell { animation: bestDayIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
      `}</style>

      {/* Pull-to-refresh */}
      <div ref={ptrEl} style={{ height:0, opacity:0, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", transition:"height 0.1s", background:T.cream }}>
        <span style={{ fontSize:13, color:T.navy, fontWeight:600 }}>↓ Release to refresh</span>
      </div>
      {refreshing && (
        <div style={{ background:T.navy, color:T.white, textAlign:"center", fontSize:12, fontWeight:600, padding:`${T.space[1]}px`, letterSpacing:"0.5px" }}>
          Refreshing...
        </div>
      )}

      {/* TOP BAR */}
      <div style={{ background:T.navy, padding:`${T.space[1]}px ${T.space[2]}px`, display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, zIndex:10 }}>
        {/* Left: mark + wordmark */}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <ILWUMark size={34} />
          <div style={{ fontFamily:T.fontBody, fontWeight:700, fontSize:19, color:T.white, letterSpacing:"1px", lineHeight:1 }}>
            Dispatch App
          </div>
        </div>

        {/* Right: error indicator · reg button */}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {error && (
            <span role="status" aria-label="Using cached data" style={{ fontSize:10, color:T.warning, fontFamily:T.fontMono }}>⚠</span>
          )}
          <button
            onClick={resetMember}
            aria-label={`Reg #${member.reg} — tap to change`}
            style={{
              background:"rgba(255,255,255,0.1)",
              border:"1px solid rgba(255,255,255,0.2)",
              borderRadius:T.radius.pill,
              padding:`${T.space[1]}px ${T.space[2]}px`,
              minHeight:36,
              fontSize:12,
              fontFamily:T.fontMono,
              fontWeight:600,
              color:T.white,
              letterSpacing:"0.5px",
              cursor:"pointer",
            }}>
            #{member.reg}
          </button>
        </div>
      </div>

      <div style={{ padding:`${T.space[2]}px ${T.space[2]}px 64px` }}>

        <WeekCarousel sheets={relevantSheets} records={resolvedRecords} todayIdx={todayIdx} reg={member?.reg} />

        {/* NIGHT BOARD — live, refreshes every 60s */}
        <WorkBoard board={nightBoard} liveUrl="https://ilwu.pepdekker.com/board?shift=night" lastFetched={boardsLastFetched} />

        {/* DAY BOARD — live, refreshes every 60s */}
        <WorkBoard board={dayBoard}   liveUrl="https://ilwu.pepdekker.com/board?shift=day"   lastFetched={boardsLastFetched} />

        {/* VESSELS */}
        <div style={{ marginBottom:T.space[2] }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:T.space[1] }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:24, lineHeight:1 }} role="img" aria-label="Vessels">🚢</span>
              <div>
                <div style={{ fontFamily:T.fontBody, fontWeight:700, fontSize:22, color:T.navy, letterSpacing:"2px", lineHeight:1 }}>
                  Vessels · Tacoma
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:3 }}>
                  <span style={{ fontSize:10, color:T.live, fontWeight:600, fontFamily:T.fontMono }}>
                    {vesselsLastFetched ? timeSince(vesselsLastFetched) : "LIVE"}
                  </span>
                </div>
              </div>
            </div>
            <a href="https://www.nwseaportalliance.com/cargo-operations/vessel-schedules-and-calendar"
              target="_blank" rel="noopener noreferrer"
              style={{ fontSize:12, color:T.blue, fontWeight:600, padding:"8px 0", display:"inline-block" }}
              onClick={() => window.posthog?.capture('external_link_clicked', {
                label: 'Full Vessel Schedule', url: 'https://www.nwseaportalliance.com/cargo-operations/vessel-schedules-and-calendar',
              })}>Full schedule ↗</a>
          </div>

          {/* Stat tiles */}
          {vessels.length > 0 && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:T.space[1] }}>
              {[
                { label:"AT BERTH",    value: atBerth  },
                { label:"NEXT 72 HRS", value: next72   },
                { label:"THIS WEEK",   value: thisWeek },
              ].map(({ label, value }) => (
                <div key={label} style={{ background:T.navy, borderRadius:T.radius.md, padding:`${T.space[2]}px ${T.space[1]}px`, textAlign:"center" }}>
                  <div style={{ fontFamily:T.fontMono, fontWeight:700, fontSize:36, color:T.yellow, lineHeight:1 }}>{value}</div>
                  <div style={{ fontSize:9, color:T.white, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", marginTop:3, fontFamily:T.fontBody }}>{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Vessel list */}
          {vesselError ? (
            <div style={{ background:T.white, borderRadius:T.radius.lg, border:`1.5px solid ${T.border}`, textAlign:'center', padding:`${T.space[4]}px ${T.space[2]}px` }}>
              <div style={{ fontSize:24, marginBottom:T.space[1] }}>🌊</div>
              <div style={{ fontFamily:T.fontBody, fontWeight:600, fontSize:T.text.base, color:T.dark, marginBottom:6 }}>
                Schedule unavailable right now
              </div>
              <div style={{ fontSize:T.text.sm, color:T.muted, lineHeight:1.6, marginBottom:T.space[2] }}>
                The NWSA updates their schedule throughout the day.<br/>Try again in a few minutes.
              </div>
              <a href="https://www.nwseaportalliance.com/cargo-operations/vessel-schedules-and-calendar"
                target="_blank" rel="noopener noreferrer"
                style={{ fontSize:T.text.sm, color:T.blue, fontWeight:600 }}>
                View directly at NWSA ↗
              </a>
            </div>
          ) : vessels.length === 0 ? (
            <div style={{ background:T.white, borderRadius:T.radius.lg, border:`1.5px solid ${T.border}`, textAlign:'center', padding:`${T.space[5]}px ${T.space[2]}px` }}>
              <div style={{ fontSize:28, marginBottom:T.space[1] }}>⚓</div>
              <div style={{ fontFamily:T.fontBody, fontSize:T.text.sm, color:T.muted, lineHeight:1.6 }}>
                Fetching vessel schedule<br/>
                <span style={{ color:T.blue }}>from Northwest Seaport Alliance...</span>
              </div>
            </div>
          ) : (
            <div style={{ background:T.white, borderRadius:T.radius.lg, border:`1.5px solid ${T.border}`, overflow:"hidden" }}>
              {vessels.map((v, i) => (
                <div key={`${v.name}-${i}`} style={{ display:"flex", alignItems:"center", padding:`${T.space[1]}px ${T.space[2]}px`, borderBottom:i<vessels.length-1?`1px solid ${T.cream}`:"none" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center" }}>
                      <span style={{ fontWeight:600, fontSize:14, color: v.status==="departed" ? T.muted : T.dark }}>{v.name}</span>
                      <a
                        href={`https://www.vesselfinder.com/?name=${encodeURIComponent(v.name)}`}
                        target="_blank" rel="noopener noreferrer"
                        onClick={() => window.posthog?.capture('ship_tracker_clicked', { vessel: v.name })}
                        style={{ fontSize:12, color:T.blue, fontFamily:T.fontMono, fontWeight:600, textDecoration:"none", marginLeft:8, whiteSpace:"nowrap", padding:"6px 0", display:"inline-block" }}>
                        ⚓ TRACK
                      </a>
                    </div>
                    <div style={{ fontSize:12, color:T.mutedText, marginTop:1 }}>{v.terminal} · {v.cargo}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:12, color:T.mutedText, fontFamily:T.fontMono, marginBottom:4 }}>ETA {v.eta}</div>
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
        textAlign:"center", fontSize:12, color:T.mutedText,
        fontFamily:T.fontBody, padding:"16px 20px 8px",
        paddingBottom:"calc(8px + env(safe-area-inset-bottom))",
        lineHeight:1.6,
      }}>
        This is an independent project. Not affiliated with ILWU or Local 23.{" "}
        <a href="/about" style={{ color:T.blue, textDecoration:"none", fontWeight:600, display:"inline-block", padding:"4px 0" }}>About & Roadmap →</a>
        <div style={{ marginTop:8 }}>
          <a href="https://ilwu.pepdekker.com" target="_blank" rel="noopener noreferrer"
            style={{ color:T.blue, textDecoration:"none", fontWeight:600, display:"inline-block", padding:"4px 0" }}>
            ILWU Local 23 Site →
          </a>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DispatchApp />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </BrowserRouter>
  );
}
