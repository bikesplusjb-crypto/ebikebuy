/* ==========================================================
   Builds the error-code pages from data/error-codes.json.
   Run:  node tools/build-codes.js
   Output (committed, so Render serves them as-is):
     error-codes/index.html          pick your system
     error-codes/<system>.html       list of codes
     error-codes/<system>-<code>.html one page per code
   tests/run.js fails if these are out of date with the data.
   ========================================================== */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "error-codes");
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, "data/error-codes.json"), "utf8"));
const PHONE = "772-692-5505";

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fmtDate = iso => new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

// Reuse the site's shared look from the laws page so every page matches.
const laws = fs.readFileSync(path.join(ROOT, "florida-ebike-laws.html"), "utf8");
const STYLE = laws.slice(laws.indexOf("<style>"), laws.indexOf("</style>")).replace("<style>", "") + `
.codes{list-style:none;padding:0;margin:0 0 20px;display:grid;gap:8px}
.codes a{display:flex;gap:14px;align-items:baseline;border:1px solid var(--line);border-left:4px solid var(--lime);
  border-radius:6px;padding:12px 16px;text-decoration:none;font-size:16px}
.codes a:hover{border-color:var(--lime-dk)}
.codes b{font-family:var(--f-head);font-size:18px;min-width:3.2em}
.find{width:100%;font:inherit;font-size:18px;padding:14px 16px;border:2px solid var(--line);border-radius:8px;margin:0 0 16px}
.find:focus{border-color:var(--lime);outline:none}
.quote{border-left:4px solid var(--black);background:var(--wash);padding:14px 18px;border-radius:0 6px 6px 0;margin:0 0 14px;font-size:17px}
ol.pl{margin:0 0 14px;padding-left:22px}
ol.pl li{margin-bottom:8px;font-size:16.5px}
.sys{display:grid;gap:10px;margin-bottom:20px}
.sys a,.sys div{display:block;border:1px solid var(--line);border-radius:8px;padding:14px 16px;text-decoration:none}
.sys a{border-left:4px solid var(--lime)}
.sys strong{display:block;font-family:var(--f-head);font-size:18px}
.sys span{color:var(--grey);font-size:14.5px}
`;

function page({ file, title, description, tag, h1, lede, updated, body }) {
  const canonical = "https://ebikebuy.com/error-codes/" + file;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<title>${esc(title)} — EbikeBuy</title>
<meta name="description" content="${esc(description)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@700;800;900&display=swap" rel="stylesheet">
<style>${STYLE}</style>
</head>
<body>

<header class="hdr">
  <div class="bar">
    <a class="logo" href="../index.html">
      <span class="logo-badge"><svg viewBox="0 0 24 24"><path d="M13 2L4.5 13.5H11L9.5 22 19 10h-6.5z"/></svg></span>
      <span class="logo-txt">EBIKEBUY<small>.COM</small></span>
    </a>
    <nav class="nav">
      <a href="../index.html#bikes">E-Bikes</a>
      <a href="../diagnose.html">Diagnose</a>
      <a href="index.html">Error codes</a>
      <a href="../index.html#bench">Assembly</a>
      <a href="../about.html">About</a>
      <a href="../about.html#contact">Contact</a>
    </nav>
    <a class="hdr-phone" href="tel:${PHONE.replace(/\D/g, "")}">${PHONE}</a>
  </div>
</header>

<div class="masthead">
  <div class="wrap">
    <p class="tag">${esc(tag)}</p>
    <h1>${h1}</h1>
    ${lede ? `<p>${esc(lede)}</p>` : ""}
    ${updated ? `<p class="upd">${esc(updated)}</p>` : ""}
  </div>
</div>

<main class="wrap">
${body}
</main>

<footer class="ftr">
  <div class="wrap">
    <a href="../index.html">Back to shop</a> · <a href="../diagnose.html">Diagnose my e-bike</a> · <a href="../battery-safety.html">Battery safety</a> · <a href="index.html">Error codes</a> · <a href="../policies.html#privacy">Privacy</a><br><br>
    EbikeBuy is an independent buying guide and service resource, not affiliated with or endorsed by any motor-system maker. Brand and product names are the property of their respective owners.
  </div>
</footer>
</body>
</html>
`;
}

const files = {};

/* ---------- one page per code ---------- */
const bySystem = {};
for (const c of DATA.codes) {
  const sys = DATA.systems[c.system];
  (bySystem[c.system] = bySystem[c.system] || []).push(c);
  const file = `${c.system}-${c.code}.html`.replace("bosch-classic", "bosch");
  c._file = file;
  const next = c.severity === "dealer"
    ? "If the code comes back after one restart, stop using the assist and have the bike checked with Bosch's diagnostic tool. Bikes Plus has diagnostic tools for Bosch and most other major motor systems."
    : "If the code comes back after a restart, have it checked. A diagnostic tool can read the full fault history; Bikes Plus has them for Bosch and most other major motor systems.";
  files[file] = page({
    file,
    title: `${sys.name} error ${c.code}: ${c.title}`,
    description: `What ${sys.name} e-bike error code ${c.code} (${c.title}) means and what to do, from Bosch's own help center, in plain English.`,
    tag: sys.label,
    h1: `${esc(sys.name)} error ${esc(c.code)}<br>${esc(c.title)}`,
    lede: c.plain,
    updated: `Checked against ${sys.name}'s help center: ${fmtDate(c.verified_on)}.`,
    body: `
  ${c.battery ? `<div class="callout callout--warn"><b>Battery hot, swollen, leaking or smells strange?</b> Stop and read <a href="../battery-safety.html">battery safety</a> first. If there's smoke, get away and call 911.</div>` : ""}
  <section id="bosch">
    <h2>What ${esc(sys.name)} says</h2><div class="rule"></div>
    <p class="quote">${esc(c.bosch_says)}</p>
    <h3>${esc(sys.name)}'s recommended steps</h3>
    <ol class="pl">${c.bosch_fix.map(s => `<li>${esc(s)}</li>`).join("")}</ol>
    <p class="srcs">Summarized from <a href="${esc(c.source_url)}">${c.source_type === "manual" ? esc(DATA.manual_label) + " (error " + esc(c.code) + ")" : esc(sys.name) + "'s help page for error " + esc(c.code)}</a>, checked ${esc(fmtDate(c.verified_on))}. Follow the link for ${esc(sys.name)}'s exact wording.</p>
  </section>

  <section id="next">
    <h2>If it keeps coming back</h2><div class="rule"></div>
    <p>${esc(next)}</p>
    <p>Write down the code and what you were doing when it appeared. That saves time at the shop.</p>
    <div class="btnrow">
      <a class="btn" href="tel:${PHONE.replace(/\D/g, "")}">Call Bikes Plus</a>
      <a class="btn btn--ghost" href="../about.html#contact">Email a photo</a>
    </div>
  </section>

  <section id="check">
    <h2>Make sure it's a ${esc(sys.name)} code</h2><div class="rule"></div>
    <p>Error numbers mean different things on different systems. This page covers ${esc(sys.applies)}</p>
    <div class="btnrow">
      <a class="btn btn--ghost" href="${c.system.replace("bosch-classic", "bosch")}.html">All ${esc(sys.name)} codes</a>
      <a class="btn btn--ghost" href="../diagnose.html">Step-by-step checks</a>
    </div>
  </section>
`
  });
}

/* ---------- list page per system ---------- */
for (const [sid, codes] of Object.entries(bySystem)) {
  const sys = DATA.systems[sid];
  const file = sid.replace("bosch-classic", "bosch") + ".html";
  const key = c => c.code.replace(/x/g, "9"); // "7xx" sorts after 6xx
  codes.sort((a, b) => key(a).localeCompare(key(b), "en", { numeric: true }));
  files[file] = page({
    file,
    title: `${sys.label}: what they mean`,
    description: `${sys.label} explained in plain English, each checked against ${sys.name}'s own help center with the date we checked it.`,
    tag: "Error code library",
    h1: `${esc(sys.label)}`,
    lede: sys.applies,
    body: `
  <section>
    <label for="find" class="srcs">Type the code from your display</label>
    <input id="find" class="find" inputmode="numeric" autocomplete="off" placeholder="e.g. 503">
    <ul class="codes" id="codes">
${codes.map(c => `      <li data-code="${esc(c.code)}"><a href="${esc(c._file)}"><b>${esc(c.code)}</b>${esc(c.title)}</a></li>`).join("\n")}
    </ul>
    <p id="none" class="callout" hidden>We haven't verified that code yet, so we won't guess. Check <a href="${esc(sys.official)}">${esc(sys.official_label)}</a>, or send us a photo of the display.</p>
    <p class="srcs">We're adding codes as we check each one against ${esc(sys.name)}'s own pages. Not listed? <a href="${esc(sys.official)}">${esc(sys.official_label)}</a> has the full list.</p>
  </section>
<script>
(function(){
  var f=document.getElementById("find"),items=[].slice.call(document.querySelectorAll("#codes li")),none=document.getElementById("none");
  f.addEventListener("input",function(){
    var q=f.value.trim().toLowerCase(),shown=0;
    items.forEach(function(li){var on=!q||li.getAttribute("data-code").toLowerCase().indexOf(q)===0;li.hidden=!on;if(on)shown++;});
    none.hidden=shown>0;
  });
})();
</script>
`
  });
}

/* ---------- system picker ---------- */
files["index.html"] = page({
  file: "index.html",
  title: "E-bike error codes",
  description: "Look up what your e-bike's error code means, by motor system, checked against the maker's own documentation.",
  tag: "Error code library",
  h1: "E-bike error codes",
  lede: "The same number means different things on different bikes, so start with your motor system. The brand is usually printed on the motor, the display or the battery, and it's often not the bike's brand.",
  body: `
  <section>
    <div class="sys">
${Object.entries(DATA.systems).map(([sid, s]) => `      <a href="${sid.replace("bosch-classic", "bosch")}.html"><strong>${esc(s.label)}</strong><span>${(bySystem[sid] || []).length} codes so far · ${esc(s.applies.split(".")[0])}.</span></a>`).join("\n")}
      <div><strong>Shimano STEPS / EP</strong><span>Coming next. For now, see <a href="https://si.shimano.com/">Shimano's manuals</a>. W codes are warnings; E codes are errors.</span></div>
      <div><strong>Bafang, and everything else</strong><span>Not yet. Check your display's manual, or <a href="../about.html#contact">send us a photo</a>.</span></div>
    </div>
    <p>Not sure what's wrong? <a href="../diagnose.html">Try the step-by-step checks</a>.</p>
  </section>
`
});

/* ---------- write (or check) ---------- */
const checkOnly = process.argv.includes("--check");
let stale = [];

// sitemap: everything between the markers is generated
const SM = path.join(ROOT, "sitemap.xml");
const sm = fs.readFileSync(SM, "utf8");
const START = "  <!-- error-codes:start (generated by tools/build-codes.js) -->", END = "  <!-- error-codes:end -->";
const block = START + "\n" + Object.keys(files).sort((a, b) => a === "index.html" ? -1 : b === "index.html" ? 1 : a.localeCompare(b, "en", { numeric: true }))
  .map(f => `  <url>\n    <loc>https://ebikebuy.com/error-codes/${f}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>${f === "index.html" ? "0.8" : f.includes("-") ? "0.6" : "0.7"}</priority>\n  </url>`).join("\n") + "\n" + END;
const nextSm = sm.includes(START)
  ? sm.slice(0, sm.indexOf(START)) + block + sm.slice(sm.indexOf(END) + END.length)
  : sm.replace("</urlset>", block + "\n</urlset>");
if (nextSm !== sm) { stale.push("sitemap.xml"); if (!checkOnly) fs.writeFileSync(SM, nextSm); }
const want = new Set(Object.keys(files));
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);
for (const [name, html] of Object.entries(files)) {
  const p = path.join(OUT, name);
  const cur = fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
  if (cur !== html) { stale.push(name); if (!checkOnly) fs.writeFileSync(p, html); }
}
for (const f of fs.readdirSync(OUT)) if (f.endsWith(".html") && !want.has(f)) {
  stale.push(f + " (no longer in data)");
  if (!checkOnly) fs.unlinkSync(path.join(OUT, f));
}
if (checkOnly) { if (stale.length) { console.log("Out of date: " + stale.join(", ")); process.exit(1); } }
else console.log(`Wrote ${Object.keys(files).length} pages` + (stale.length ? ` (${stale.length} changed)` : " (no changes)"));
module.exports = { files };
