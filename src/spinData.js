// ─── SPIN SHEET DATA ──────────────────────────────────────────────────────────
// Hardcoded fallback — also used as default until sheet-config.json loads.
// Only keep current + next; expired sheets are dropped.
export const SHEETS_FALLBACK = [
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
  {
    id: "1utm3j8J_63ZnHo_zNigIA_PUbzv3XpXG3YQHQrmNtTo",
    label: "Jun 20 – Jun 26",
    startSat: new Date("2026-06-20"),
  },
];

export const csvUrl = (id, tab) =>
  `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;

// Returns exactly [currentSheet, nextSheet] — expired sheets are dropped.
// If only one sheet is available, returns a single-item array.
export function getRelevantSheets(sheets) {
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
export async function loadSheetConfig() {
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

export const FALLBACK = {
  "1UVrSQ4Yz9s7Fy3R4riSce824vv0a3pYyMwC7M7EPvW4": [
    { reg:"230234", cls:"B", sat:182, sun:40,  mon:28,  tue:327, wed:326, thu:163, fri:218 },
    { reg:"61843",  cls:"A", sat:237, sun:306, mon:741, tue:849, wed:61,  thu:585, fri:821 },
  ],
  "1jzZ5U4Sttt4Dfg01D9ipprT0usEL7GVZeW2IAto3sUU": [
    { reg:"230234", cls:"B", sat:9,   sun:250, mon:171, tue:318, wed:240, thu:157, fri:272 },
    { reg:"61843",  cls:"A", sat:326, sun:424, mon:605, tue:400, wed:33,  thu:209, fri:236 },
  ],
};

// ─── CSV / SPIN FETCH ─────────────────────────────────────────────────────────
export function parseSpinCSV(csv) {
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
export async function fetchTabsForSheet(sheetId, label) {
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

// sheets defaults to SHEETS_FALLBACK so callers can call without a param
export async function fetchAllCSVs(sheets = SHEETS_FALLBACK) {
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
