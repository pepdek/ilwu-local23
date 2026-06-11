import type { Config } from "@netlify/functions";

// Runs every Thursday at 6am Pacific (14:00 UTC)
export const config: Config = {
  schedule: "0 14 * * 4",
};

export default async function handler() {
  try {
    // Fetch the ILWU Local 23 homepage and look for Google Sheets URLs
    const res  = await fetch("https://www.ilwulocal23.org/");
    const html = await res.text();

    // Extract all Google Sheets IDs from the page
    const sheetPattern = /spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/g;
    const matches = [...html.matchAll(sheetPattern)];
    const ids = [...new Set(matches.map(m => m[1]))];

    if (ids.length === 0) {
      console.log("No sheet IDs found on ilwulocal23.org");
      return;
    }

    // Verify each candidate is a valid spin sheet (has A tab with reg numbers)
    for (const id of ids.slice(0, 3)) {
      const testUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&sheet=A`;
      const testRes = await fetch(testUrl);
      const csv     = await testRes.text();
      // Valid spin sheet has "Reg" header and numeric reg numbers
      if (csv.includes("Reg") && csv.match(/\n\d{4,}/)) {
        const firstLine = csv.split("\n")[0];
        console.log(`Found valid spin sheet: ${id} — ${firstLine}`);

        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        const REPO         = process.env.GITHUB_REPO; // "pepdek/ilwu-local23"

        if (!GITHUB_TOKEN || !REPO) {
          console.log("GitHub token or repo not configured — skipping auto-push");
          console.log("New sheet ID to add manually:", id);
          return;
        }

        // Get current config file from GitHub
        const cfgRes = await fetch(
          `https://api.github.com/repos/${REPO}/contents/public/sheet-config.json`,
          { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, "User-Agent": "checkmyspins" } }
        );

        let existingIds: string[] = [];
        let sha: string | undefined;

        if (cfgRes.ok) {
          const cfgData = await cfgRes.json();
          sha = cfgData.sha;
          const decoded = JSON.parse(atob(cfgData.content));
          existingIds = decoded.sheetIds || [];
        }

        if (existingIds.includes(id)) {
          console.log("Sheet ID already in config — no update needed");
          return;
        }

        // Keep only the 3 most recent IDs: last week (buffer) + current + next
        const updatedIds = [...existingIds, id].slice(-3);
        const newContent = btoa(JSON.stringify({ sheetIds: updatedIds }, null, 2));

        // Compute next Saturday's date for the commit message label
        const now       = new Date();
        const daysToSat = (6 - now.getDay() + 7) % 7 || 7;
        const nextSat   = new Date(now.getTime() + daysToSat * 86400000);
        const nextFri   = new Date(nextSat.getTime() + 6 * 86400000);
        const fmt       = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const label     = `${fmt(nextSat)} – ${fmt(nextFri)}`;

        await fetch(
          `https://api.github.com/repos/${REPO}/contents/public/sheet-config.json`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${GITHUB_TOKEN}`,
              "Content-Type": "application/json",
              "User-Agent": "checkmyspins",
            },
            body: JSON.stringify({
              message: `Auto-update spin sheet: ${label}`,
              content: newContent,
              ...(sha ? { sha } : {}),
            }),
          }
        );

        console.log(`Config updated with new sheet: ${id} (${label})`);
        return;
      }
    }

    console.log("No valid spin sheet found among candidates");
  } catch (err) {
    console.error("update-sheet-config error:", err);
  }
}
