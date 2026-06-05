import { useState, useEffect, useRef } from "react";

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

const memberUrl = (id, tab, reg) =>
  `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}&tq=${encodeURIComponent(`select * where A='${reg}'`)}`;

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

// ─── LIVE NIGHT BOARD 6/4/26 ─────────────────────────────────────────────────
// preferred = he prefers SSAT (Matson) and PCT
const NIGHT_WORK = [
  {
    vessel:"HMM GARAM",        terminal:"P 4",  start:"6 PM",
    strad:null, hust:39, sv:1,  pd:1,  preferred:false,
  },
  {
    vessel:"EVER SIGMA",       terminal:"PCT",  start:"6 PM",
    strad:12,   hust:null,sv:3, pd:3,  preferred:true,
  },
  {
    vessel:"CARL SCHUTTE",     terminal:"WUT",  start:"6 PM",
    strad:null, hust:18, sv:3,  pd:3,  preferred:false,
  },
  {
    vessel:"MATSON ANCHORAGE", terminal:"SSAT", start:"3 AM",
    strad:null, hust:15, sv:3,  pd:3,  preferred:true,
  },
];

const NIGHT_HOUSE = [
  { location:"P-4 YARD/GATE", strad:3,  note:null,         start:"6 PM",  preferred:false },
  { location:"WUT YARD",      strad:null,note:"6 R/STACK",  start:"5/6 PM",preferred:false },
];

// ─── LIVE DAY BOARD 6/5/26 ───────────────────────────────────────────────────
const DAY_WORK = [
  { vessel:"HMM GARAM",        terminal:"P 4",  start:"8 AM", strad:null, hust:27, pd:1,  preferred:false },
  { vessel:"EVER SIGMA",       terminal:"PCT",  start:"8 AM", strad:null, hust:6,  pd:null,preferred:false },
  { vessel:"CARL SCHUTTE",     terminal:"WUT",  start:"8 AM", strad:null, hust:18, pd:3,  preferred:false },
  { vessel:"MATSON ANCHORAGE", terminal:"SSAT", start:"8 AM", strad:null, hust:15, pd:3,  preferred:true  },
  { vessel:"RJ PFEIFFER",      terminal:"SSAT", start:"8 AM", strad:null, hust:15, pd:3,  preferred:true  },
];

const VESSELS = [
  { name:"Gaia Leader",     terminal:"Blair",     cargo:"Car Carrier", eta:"Jun 4", status:"departed" },
  { name:"LAKE SAINT ANNE", terminal:"Blair",     cargo:"Car Carrier", eta:"Jun 5", status:"in-port"  },
  { name:"Titania",         terminal:"Blair EB1", cargo:"Car Carrier", eta:"Jun 5", status:"in-port"  },
  { name:"GLOVIS TRUST",    terminal:"Blair",     cargo:"Car Carrier", eta:"Jun 7", status:"upcoming" },
  { name:"RCC Tianjin",     terminal:"Blair EB1", cargo:"Car Carrier", eta:"Jun 7", status:"upcoming" },
  { name:"Venus Spirit",    terminal:"Blair EB1", cargo:"Car Carrier", eta:"Jun 7", status:"upcoming" },
  { name:"Patara",          terminal:"Blair",     cargo:"Car Carrier", eta:"Jun 8", status:"upcoming" },
];

const DAYS_KEY  = ["sat","sun","mon","tue","wed","thu","fri"];
const DAYS_ABBR = ["SAT","SUN","MON","TUE","WED","THU","FRI"];
const DAYS_FULL = ["Saturday","Sunday","Monday","Tuesday","Wednesday","Thursday","Friday"];
const JS_TO_IDX = [1,2,3,4,5,6,0];
function getTodayIdx() { return JS_TO_IDX[new Date().getDay()]; }

// Parse the single CSV row returned by a gviz filtered query.
// The response may include a header row — skip any line whose first cell is non-numeric.
function parseSingleRow(csv) {
  if (!csv || !csv.trim()) return null;
  const lines = csv.trim().split("\n");
  for (const line of lines) {
    const cols = line.split(",").map(c => c.replace(/^"|"$/g,"").trim());
    if (cols[0] && !isNaN(cols[0]) && cols[0] !== "") {
      return {
        reg: cols[0].trim(),
        cls: cols[1]?.trim() || "A",
        sat: parseInt(cols[2]) || null,
        sun: parseInt(cols[3]) || null,
        mon: parseInt(cols[4]) || null,
        tue: parseInt(cols[5]) || null,
        wed: parseInt(cols[6]) || null,
        thu: parseInt(cols[7]) || null,
        fri: parseInt(cols[8]) || null,
      };
    }
  }
  return null;
}

// Fetch a single member's record across all tabs for every sheet simultaneously.
// Returns { [sheetId]: record | null }
const TABS = ["A", "B", "Casual"];
async function fetchMemberRecords(reg) {
  const results = await Promise.all(
    SHEETS.map(async sh => {
      const csvs = await Promise.all(
        TABS.map(tab => fetch(memberUrl(sh.id, tab, reg)).then(r => r.text()).catch(() => ""))
      );
      let record = null;
      for (const csv of csvs) {
        record = parseSingleRow(csv);
        if (record) break;
      }
      return { id: sh.id, record };
    })
  );
  const map = {};
  results.forEach(({ id, record }) => { map[id] = record ? [record] : []; });
  return map;
}

function spinLabel(n) {
  if (!n) return { text:"", color:"#C8C5BE", bg:"#F7F7F5" };
  return { text:"", color:"#0F0F0F", bg:"#F7F7F5" };
}

// ─── ONBOARDING ──────────────────────────────────────────────────────────────
function Onboarding({ onSave }) {
  const [val, setVal]       = useState("");
  const [status, setStatus] = useState(null);
  const [found, setFound]   = useState(null);
  const debounceRef         = useRef(null);

  async function lookup(reg) {
    setFound(null);
    if (reg.length < 4) { setStatus(null); return; }
    setStatus("searching");
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      // Check hardcoded fallbacks first (instant)
      for (const arr of Object.values(FALLBACK)) {
        const fb = arr.find(s => s.reg === reg.trim());
        if (fb) { setFound(fb); setStatus("found"); return; }
      }
      // Query both sheets across all tabs simultaneously
      try {
        const fetches = SHEETS.flatMap(sh =>
          TABS.map(tab =>
            fetch(memberUrl(sh.id, tab, reg.trim())).then(r => r.text()).catch(() => "")
          )
        );
        const csvs = await Promise.all(fetches);
        for (const csv of csvs) {
          const record = parseSingleRow(csv);
          if (record) { setFound(record); setStatus("found"); return; }
        }
        setStatus("notfound");
      } catch {
        setStatus("notfound");
      }
    }, 400);
  }

  return (
    <div style={{ minHeight:"100vh", background:"#F7F7F5", display:"flex", alignItems:"center", justifyContent:"center", padding:20, fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ background:"#fff", borderRadius:20, width:"100%", maxWidth:400, overflow:"hidden", boxShadow:"0 4px 24px rgba(0,0,0,0.08)" }}>
        <div style={{ height:6, background:"#C41230" }} />
        <div style={{ padding:"32px 28px 36px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:32 }}>
            <div style={{ width:36, height:36, borderRadius:8, background:"#C41230", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", color:"#fff", fontSize:18 }}>23</div>
            <div>
              <div style={{ fontWeight:700, fontSize:17, color:"#0F0F0F" }}>ILWU Local 23</div>
              <div style={{ fontSize:12, color:"#999" }}>Port of Tacoma</div>
            </div>
          </div>
          <div style={{ fontSize:22, fontWeight:700, color:"#0F0F0F", lineHeight:1.25, marginBottom:8 }}>What's your registration number?</div>
          <div style={{ fontSize:15, color:"#888", marginBottom:28 }}>Enter it once. We'll remember it.</div>
          <label style={{ fontSize:12, fontWeight:600, color:"#555", display:"block", marginBottom:8 }}>Registration #</label>
          <input type="tel" inputMode="numeric" placeholder="e.g. 230456"
            value={val} maxLength={8}
            onChange={e => { setVal(e.target.value); lookup(e.target.value); }}
            style={{
              width:"100%", boxSizing:"border-box", WebkitAppearance:"none", appearance:"none",
              border:"1.5px solid", borderColor:status==="found"?"#059669":status==="notfound"?"#DC2626":"#E5E3DE",
              borderRadius:12, padding:"16px", fontSize:26, fontFamily:"'DM Mono',monospace",
              fontWeight:600, color:"#0F0F0F", letterSpacing:"4px", outline:"none",
              textAlign:"center", transition:"border-color 0.2s", marginBottom:12,
            }}
          />
          <div style={{ minHeight:56 }}>
            {status==="searching" && <div style={{ fontSize:13, color:"#bbb", textAlign:"center", padding:"16px 0" }}>Looking up...</div>}
            {status==="found" && found && (
              <div style={{ display:"flex", alignItems:"center", gap:10, background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:10, padding:"12px 16px" }}>
                <span style={{ fontSize:20 }}>✓</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#059669" }}>Found — {found.cls} Class</div>
                  <div style={{ fontSize:11, color:"#6B7280" }}>Class auto-detected from sheet</div>
                </div>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:32, color:"#059669", lineHeight:1 }}>{found.cls}</div>
              </div>
            )}
            {status==="notfound" && (
              <div style={{ background:"#FFF5F5", border:"1px solid #FECACA", borderRadius:10, padding:"12px 16px" }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#DC2626" }}>Not found in current sheets</div>
                <div style={{ fontSize:11, color:"#9CA3AF", marginTop:3 }}>
                  B/Casual tabs may not be loaded yet.{" "}
                  <a href="https://www.ilwulocal23.org" target="_blank" rel="noopener noreferrer" style={{ color:"#C41230", fontWeight:600 }}>Verify at ilwulocal23.org ↗</a>
                </div>
              </div>
            )}
          </div>
          <button disabled={status!=="found"}
            onClick={() => found && onSave({ reg:found.reg, cls:found.cls })}
            style={{ width:"100%", background:status==="found"?"#C41230":"#E5E3DE", color:status==="found"?"#fff":"#aaa", borderRadius:12, padding:"17px", fontSize:16, fontWeight:700, cursor:status==="found"?"pointer":"default", border:"none", marginTop:16 }}>
            Get Started →
          </button>
          <div style={{ fontSize:12, color:"#bbb", textAlign:"center", marginTop:14 }}>Saved to your device only. No account needed.</div>
        </div>
      </div>
    </div>
  );
}

// ─── WEEK CARD ────────────────────────────────────────────────────────────────
function WeekCard({ sheet, record, todayIdx, isCurrent }) {
  const [selDay, setSelDay] = useState(isCurrent ? todayIdx : 0);
  const heroSpin = isCurrent
    ? (record?.[DAYS_KEY[todayIdx]] ?? null)
    : (record?.[DAYS_KEY[selDay]]  ?? null);
  const lbl = spinLabel(heroSpin);

  return (
    <div style={{ background:"#fff", borderRadius:18, border:"1.5px solid #EFEDE8", overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{ padding:"14px 18px 0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
          {isCurrent && <div style={{ width:7, height:7, borderRadius:"50%", background:"#059669" }} />}
          <span style={{ fontSize:12, fontWeight:700, color:isCurrent?"#0F0F0F":"#999", textTransform:"uppercase", letterSpacing:"0.8px" }}>
            {isCurrent ? "This Week" : "Next Week"}
          </span>
        </div>
        <span style={{ fontSize:11, color:"#bbb", fontFamily:"'DM Mono',monospace" }}>{sheet.label}</span>
      </div>
      <div style={{ padding:"6px 18px 0" }}>
        <div style={{ fontSize:11, color:"#999", fontWeight:500, marginBottom:2 }}>
          {isCurrent ? `Today · ${DAYS_FULL[todayIdx]}` : DAYS_FULL[selDay]}
        </div>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:84, lineHeight:0.9, color:"#0F0F0F", letterSpacing:"-2px" }}>
          {heroSpin ?? "—"}
        </div>
        <div style={{ fontSize:13, fontWeight:600, color:lbl.color, marginTop:6, marginBottom:14 }}>

        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4, padding:"0 10px 14px" }}>
        {DAYS_KEY.map((dk, di) => {
          const spin    = record?.[dk] ?? null;
          const isToday = isCurrent && di===todayIdx;
          const isSel   = di===selDay;
          const sl      = spinLabel(spin);
          return (
            <button key={dk} onClick={() => setSelDay(di)}
              style={{
                background:  isSel?"#0F0F0F": isToday?sl.bg:"#F7F7F5",
                border:"1.5px solid",
                borderColor: isSel?"#0F0F0F": isToday?"#C41230":"transparent",
                borderRadius:9, padding:"8px 3px", textAlign:"center", cursor:"pointer",
              }}>
              <div style={{ fontSize:9, fontFamily:"'DM Mono',monospace", fontWeight:600,
                color:isSel?"#888":isToday?"#C41230":"#bbb", marginBottom:4, letterSpacing:"0.3px" }}>
                {DAYS_ABBR[di]}
              </div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:19, lineHeight:1,
                color:isSel?"#fff":spin?"#0F0F0F":"#ddd" }}>
                {spin ?? "—"}
              </div>
            </button>
          );
        })}
      </div>
      {!record && (
        <div style={{ margin:"0 14px 14px", padding:"10px 14px", background:"#FFF5F5", border:"1px solid #FECACA", borderRadius:8, fontSize:12, color:"#DC2626" }}>
          Reg # not found in {sheet.label}.{" "}
          <a href="https://www.ilwulocal23.org" target="_blank" rel="noopener noreferrer" style={{ color:"#C41230", fontWeight:600 }}>Check ilwulocal23.org ↗</a>
        </div>
      )}
    </div>
  );
}

function WeekCarousel({ sheets, records, todayIdx, activeIdx }) {
  const [page, setPage] = useState(0);
  return (
    <div style={{ marginBottom:12 }}>
      <WeekCard sheet={sheets[page]} record={records[sheets[page].id]} todayIdx={todayIdx} isCurrent={page===activeIdx} />
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:10, padding:"0 2px" }}>
        <button onClick={() => setPage(p => Math.max(0,p-1))}
          style={{ padding:"8px 18px", borderRadius:20, background:page>0?"#0F0F0F":"#F2F0EB", color:page>0?"#fff":"#ccc", fontSize:13, fontWeight:600, border:"none", cursor:page>0?"pointer":"default" }}>
          ← This Week
        </button>
        <div style={{ display:"flex", gap:6 }}>
          {sheets.map((_,i) => (
            <button key={i} onClick={() => setPage(i)}
              style={{ width:i===page?20:7, height:7, borderRadius:4, background:i===page?"#1B3A6B":"#E0DDD8", border:"none", cursor:"pointer", transition:"all 0.2s", padding:0 }} />
          ))}
        </div>
        <button onClick={() => setPage(p => Math.min(sheets.length-1,p+1))}
          style={{ padding:"8px 18px", borderRadius:20, background:page<sheets.length-1?"#0F0F0F":"#F2F0EB", color:page<sheets.length-1?"#fff":"#ccc", fontSize:13, fontWeight:600, border:"none", cursor:page<sheets.length-1?"pointer":"default" }}>
          Next Week →
        </button>
      </div>
    </div>
  );
}

// ─── WORK BOARD SECTION ───────────────────────────────────────────────────────
function WorkBoard({ jobs, houseJobs, date, shift, liveUrl }) {
  const totalStrad = [
    ...jobs.map(j => j.strad||0),
    ...houseJobs.map(j => j.strad||0),
  ].reduce((a,b) => a+b, 0);

  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#bbb", textTransform:"uppercase", letterSpacing:"1px" }}>
            {shift} Work
          </div>
          <div style={{ fontSize:10, color:"#bbb", fontFamily:"'DM Mono',monospace" }}>{date}</div>
          {totalStrad > 0 && (
            <div style={{ background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:6, padding:"2px 8px", display:"flex", alignItems:"center", gap:4 }}>
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:"#1D4ED8", lineHeight:1 }}>{totalStrad}</span>
              <span style={{ fontSize:9, fontWeight:700, color:"#1D4ED8", textTransform:"uppercase", letterSpacing:"0.5px" }}>Strad</span>
            </div>
          )}
        </div>
        <a href={liveUrl} target="_blank" rel="noopener noreferrer"
          style={{ fontSize:12, color:"#C41230", fontWeight:600 }}>Live ↗</a>
      </div>

      <div style={{ background:"#fff", borderRadius:14, border:"1.5px solid #EFEDE8", overflow:"hidden" }}>
        {jobs.map((job, i) => (
          <div key={job.vessel} style={{
            padding:"11px 16px",
            borderBottom: i < jobs.length-1 || houseJobs.length > 0 ? "1px solid #F5F3EE":"none",
            background: job.preferred ? "#FAFFFE" : "#fff",
          }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <div style={{ fontWeight:600, fontSize:13, color:"#0F0F0F" }}>{job.vessel}</div>
                  {job.preferred && <span style={{ fontSize:9, background:"#D1FAE5", color:"#059669", borderRadius:4, padding:"2px 6px", fontWeight:700 }}>★ PREF</span>}
                </div>
                <div style={{ fontSize:11, color:"#999", marginTop:1 }}>{job.terminal} · {job.start}</div>
              </div>
              <div style={{ display:"flex", gap:5, flexWrap:"wrap", justifyContent:"flex-end" }}>
                {job.strad && <span style={{ fontSize:11, background:"#EFF6FF", color:"#1D4ED8", borderRadius:5, padding:"3px 8px", fontWeight:700 }}>Strad {job.strad}</span>}
                {job.hust  && <span style={{ fontSize:11, background:"#F5F5F5", color:"#555",    borderRadius:5, padding:"3px 8px", fontWeight:600 }}>Hust {job.hust}</span>}
                {job.pd    && <span style={{ fontSize:11, background:"#FFFBEB", color:"#D97706", borderRadius:5, padding:"3px 8px", fontWeight:600 }}>PD {job.pd}</span>}
                {job.sv    && <span style={{ fontSize:11, background:"#F5F5F5", color:"#555",    borderRadius:5, padding:"3px 8px", fontWeight:600 }}>SV {job.sv}</span>}
              </div>
            </div>
          </div>
        ))}

        {houseJobs.map((job, i) => (
          <div key={job.location} style={{ padding:"11px 16px", borderBottom:i<houseJobs.length-1?"1px solid #F5F3EE":"none", background:"#FAFAFA" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:"#555" }}>{job.location}</div>
                <div style={{ fontSize:11, color:"#bbb", marginTop:1 }}>House · {job.start}</div>
              </div>
              <div style={{ display:"flex", gap:5 }}>
                {job.strad && <span style={{ fontSize:11, background:"#EFF6FF", color:"#1D4ED8", borderRadius:5, padding:"3px 8px", fontWeight:700 }}>Strad {job.strad}</span>}
                {job.note  && <span style={{ fontSize:11, background:"#F5F5F5", color:"#777",    borderRadius:5, padding:"3px 8px", fontWeight:600 }}>{job.note}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [member,   setMember]   = useState(null);
  const [allSpins, setAllSpins] = useState({});
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const todayIdx  = getTodayIdx();
  const activeIdx = getActiveSheetIdx();

  useEffect(() => {
    try { const s = localStorage.getItem("ilwu23_member"); if(s) setMember(JSON.parse(s)); } catch{}
  }, []);

  // Fetch spin numbers for the saved member whenever their reg changes
  useEffect(() => {
    if (!member?.reg) { setLoading(false); return; }
    setLoading(true); setError(null);
    fetchMemberRecords(member.reg)
      .then(map => { setAllSpins(map); setLoading(false); })
      .catch(() => { setError("Using cached data."); setLoading(false); });
  }, [member?.reg]);

  function saveMember(m) { localStorage.setItem("ilwu23_member", JSON.stringify(m)); setMember(m); }
  function resetMember() { localStorage.removeItem("ilwu23_member"); setMember(null); setAllSpins({}); }

  function findRecord(sheetId) {
    const live = allSpins[sheetId]?.find(s => s.reg === member?.reg);
    if (live) return live;
    const fb = FALLBACK[sheetId]?.find(s => s.reg === member?.reg);
    return fb || null;
  }

  // ─── PULL TO REFRESH ─────────────────────────────────────────────────────
  const [refreshing, setRefreshing] = useState(false);
  const ptrStartY = useRef(null);
  const ptrEl = useRef(null);

  function onTouchStartPtr(e) { ptrStartY.current = e.touches[0].clientY; }
  function onTouchMovePtr(e) {
    if (ptrStartY.current === null) return;
    const dy = e.touches[0].clientY - ptrStartY.current;
    if (dy > 0 && window.scrollY === 0 && ptrEl.current) {
      ptrEl.current.style.height = Math.min(dy * 0.4, 56) + "px";
      ptrEl.current.style.opacity = Math.min(dy / 80, 1);
    }
  }
  async function onTouchEndPtr() {
    if (!ptrEl.current) return;
    const h = parseFloat(ptrEl.current.style.height || "0");
    ptrEl.current.style.height = "0px";
    ptrEl.current.style.opacity = "0";
    ptrStartY.current = null;
    if (h > 40 && member?.reg) {
      setRefreshing(true);
      try {
        const map = await fetchMemberRecords(member.reg);
        setAllSpins(map);
      } catch {}
      setRefreshing(false);
    }
  }

  if (!member) return <Onboarding onSave={saveMember} />;

  const resolvedRecords = {};
  SHEETS.forEach(sh => { resolvedRecords[sh.id] = findRecord(sh.id); });

  return (
    <div
      style={{ minHeight:"100vh", background:"#F7F7F5", fontFamily:"'DM Sans',sans-serif", maxWidth:430, margin:"0 auto" }}
      onTouchStart={onTouchStartPtr}
      onTouchMove={onTouchMovePtr}
      onTouchEnd={onTouchEndPtr}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@500&family=Bebas+Neue&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; -webkit-tap-highlight-color:transparent; }
        button { cursor:pointer; border:none; background:none; font:inherit; }
        input:focus { border-color:#1B3A6B !important; }
        a { text-decoration:none; color:inherit; }
      `}</style>

      {/* Pull to refresh indicator */}
      <div ref={ptrEl} style={{ height:0, opacity:0, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", transition:"height 0.1s", background:"#F7F7F5" }}>
        <span style={{ fontSize:13, color:"#C41230", fontWeight:600 }}>↓ Release to refresh</span>
      </div>
      {refreshing && (
        <div style={{ background:"#C41230", color:"#fff", textAlign:"center", fontSize:12, fontWeight:600, padding:"8px", letterSpacing:"0.5px" }}>
          Refreshing...
        </div>
      )}

      <div style={{ background:"#fff", borderBottom:"1px solid #EFEDE8", padding:"13px 18px", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, zIndex:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <div style={{ width:30, height:30, borderRadius:7, background:"#C41230", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", color:"#fff", fontSize:16 }}>23</div>
          <div>
            <span style={{ fontWeight:700, fontSize:16, color:"#0F0F0F" }}>ILWU Local 23</span>
            <div style={{ fontSize:11, color:"#999", fontFamily:"'DM Mono',monospace" }}>#{member.reg} · {member.cls} Class</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {loading && <span style={{ fontSize:11, color:"#ccc" }}>↻</span>}
          {error   && <span style={{ fontSize:11, color:"#D97706" }}>⚠</span>}
          <button onClick={resetMember}
            style={{ background:"#1B3A6B", borderRadius:20, padding:"7px 14px", fontSize:12, fontWeight:700, color:"#fff", border:"none", letterSpacing:"0.3px" }}>
            Change #
          </button>
        </div>
      </div>

      <div style={{ padding:"14px 14px 56px" }}>

        <WeekCarousel sheets={SHEETS} records={resolvedRecords} todayIdx={todayIdx} activeIdx={activeIdx} />

        {/* NIGHT BOARD — primary, his preference */}
        <WorkBoard
          jobs={NIGHT_WORK}
          houseJobs={NIGHT_HOUSE}
          date="6/4/26"
          shift="Night"
          liveUrl="http://ilwu23.com/?screen=1"
        />

        {/* DAY BOARD — secondary */}
        <WorkBoard
          jobs={DAY_WORK}
          houseJobs={[]}
          date="6/5/26"
          shift="Day"
          liveUrl="http://ilwu23.com/?screen=2"
        />

        {/* VESSELS */}
        <div style={{ marginBottom:12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#bbb", textTransform:"uppercase", letterSpacing:"1px" }}>Vessels · Tacoma</div>
            <a href="https://www.nwseaportalliance.com/cargo-operations/vessel-schedules-and-calendar" target="_blank" rel="noopener noreferrer"
              style={{ fontSize:12, color:"#C41230", fontWeight:600 }}>Full schedule ↗</a>
          </div>
          <div style={{ background:"#fff", borderRadius:14, border:"1.5px solid #EFEDE8", overflow:"hidden" }}>
            {VESSELS.map((v,i) => (
              <div key={v.name} style={{ display:"flex", alignItems:"center", padding:"12px 16px", borderBottom:i<VESSELS.length-1?"1px solid #F5F3EE":"none" }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:14, color:v.status==="departed"?"#ccc":"#0F0F0F" }}>{v.name}</div>
                  <div style={{ fontSize:12, color:"#999", marginTop:1 }}>{v.terminal} · {v.cargo}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:11, color:"#888", fontFamily:"'DM Mono',monospace" }}>ETA {v.eta}</div>
                  <div style={{
                    display:"inline-block", marginTop:4, fontSize:9, fontWeight:700, padding:"3px 9px", borderRadius:20,
                    background:v.status==="in-port"?"#D1FAE5":v.status==="upcoming"?"#EFF6FF":"#F3F4F6",
                    color:     v.status==="in-port"?"#065F46":v.status==="upcoming"?"#1D4ED8":"#9CA3AF",
                  }}>
                    {v.status==="in-port"?"IN PORT":v.status==="upcoming"?"UPCOMING":"DEPARTED"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
