/* ==========================================================
   Builds the Learn section from data/learn.json.
   Run:  node tools/build-learn.js          (writes learn/*.html + sitemap block)
         node tools/build-learn.js --check  (exit 1 if out of date)
   The page shell (head, header, help bar, styles) is taken from
   error-codes/index.html, which lives one folder down like learn/,
   so the links and look stay in step with the rest of the site.
   ========================================================== */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "learn");
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, "data/learn.json"), "utf8"));
const FLOWS = { "no-power": "Won't turn on", "no-assist": "Turns on, but no assist", "no-charge": "Battery won't charge", "error-code": "Error code on the display" };

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const fmtDate = d => { const [y, m, day] = d.split("-"); return `${MONTHS[+m - 1]} ${+day}, ${y}`; };
const bySlug = Object.fromEntries(DATA.articles.map(a => [a.slug, a]));

const shellSrc = fs.readFileSync(path.join(ROOT, "error-codes/index.html"), "utf8");
const head = shellSrc.slice(0, shellSrc.indexOf('<div class="masthead">'))
  .replace(/ aria-current="page"/g, "")
  .replace("</style>", `.art dl{display:grid;gap:4px;margin:0 0 14px}
.aka{color:var(--grey);font-size:15px;margin:0 0 14px}
.lede-big{font-size:18px}
.rel{display:flex;flex-wrap:wrap;gap:8px;list-style:none;padding:0;margin:0 0 14px}
.rel a{display:inline-block;border:1px solid var(--line);border-radius:999px;padding:7px 14px;text-decoration:none;font-size:15px}
.rel a:hover{border-color:var(--lime-dk)}
.cat{margin:0 0 26px}
.cat h2{margin-bottom:4px}
.alist{list-style:none;padding:0;margin:0;display:grid;gap:8px}
@media(min-width:720px){.alist{grid-template-columns:1fr 1fr}}
.alist a{display:block;border:1px solid var(--line);border-left:4px solid var(--lime);border-radius:6px;padding:12px 16px;text-decoration:none}
.alist a:hover{border-color:var(--lime-dk)}
.alist b{display:block;font-size:16.5px}
.alist span{color:var(--grey);font-size:14.5px}
.hits{list-style:none;padding:0;margin:0 0 20px;display:grid;gap:8px}
.hits a{display:block;border:2px solid var(--lime);border-radius:8px;padding:12px 16px;text-decoration:none}
.hits small{display:block;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--lime-dk)}
.hits b{font-size:16.5px}
</style>`);

function page({ file, title, description, tag, h1, lede, updated, body, script }) {
  const canonical = "https://ebikebuy.com/learn/" + file;
  return head
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${canonical}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(title)}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(description)}">`)
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)} — EbikeBuy</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(description)}">`)
    + `<div class="masthead">
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
    <a href="../index.html">Back to shop</a> · <a href="index.html">Learn</a> · <a href="../diagnose.html">Diagnose my e-bike</a> · <a href="../error-codes/index.html">Error codes</a> · <a href="../battery-safety.html">Battery safety</a> · <a href="../policies.html#privacy">Privacy</a><br><br>
    EbikeBuy is an independent buying guide and service resource. This is general information, not a substitute for your bike's manual or a qualified mechanic.
  </div>
</footer>
${script || ""}</body>
</html>
`;
}

const files = {};
const reviewed = `Reviewed ${fmtDate(DATA.reviewed_on)}.`;
const list = (title, items) => items && items.length ? `    <h3>${title}</h3>\n    <ul class="pl">${items.map(i => `<li>${esc(i)}</li>`).join("")}</ul>\n` : "";

for (const a of DATA.articles) {
  const rel = a.related.filter(s => bySlug[s]);
  files[a.slug + ".html"] = page({
    file: a.slug + ".html",
    title: `${a.title}: what it is on an e-bike`,
    description: `${a.what} ${a.does}`.slice(0, 155).replace(/\s+\S*$/, "") + "…",
    tag: a.category,
    h1: esc(a.title),
    lede: a.what,
    updated: reviewed,
    body: `  <section class="art">
    ${a.aka.length ? `<p class="aka">Also called: ${esc(a.aka.join(", "))}</p>` : ""}
    <h2>What it does</h2><div class="rule"></div>
    <p class="lede-big">${esc(a.does)}</p>
${list("Signs of a problem", a.symptoms)}${list("Safe things to check", a.checks)}${list("Looking after it", a.care)}  </section>
  ${a.diagnose || a.links.length ? `<section>
    <h2>Next steps</h2><div class="rule"></div>
    <div class="btnrow">
      ${a.diagnose ? `<a class="btn" href="../diagnose.html#${a.diagnose}/battery-check">Step-by-step: ${esc(FLOWS[a.diagnose])}</a>` : ""}
      ${a.links.map(l => `<a class="btn btn--ghost" href="${esc(l.href)}">${esc(l.label)}</a>`).join("\n      ")}
    </div>
  </section>` : ""}
  ${rel.length ? `<section>
    <h2>Related</h2><div class="rule"></div>
    <ul class="rel">${rel.map(s => `<li><a href="${s}.html">${esc(bySlug[s].title)}</a></li>`).join("")}</ul>
  </section>` : ""}`
  });
}

/* ---------- index with search ---------- */
const cats = [...new Set(DATA.articles.map(a => a.category))];
const index = DATA.articles.map(a => ({ s: a.slug, t: a.title, w: [a.title, ...a.aka, ...a.keywords].join(" | ").toLowerCase(), d: a.diagnose || "" }));
files["index.html"] = page({
  file: "index.html",
  title: "Learn about e-bikes",
  description: "Plain-English explanations of e-bike motors, batteries, sensors, brakes and upkeep, with what goes wrong and what's safe to check.",
  tag: "Learn",
  h1: "Learn about<br>your e-bike",
  lede: "Plain-English explanations of the parts that make an e-bike work, what goes wrong with them, and what's safe to check yourself.",
  body: `  <section>
    <label for="find" class="srcs">Search, or describe the problem in your own words</label>
    <input id="find" class="find" autocomplete="off" placeholder="e.g. motor cuts out, range dropped, BMS">
    <ul class="hits" id="hits" aria-live="polite"></ul>
  </section>
${cats.map(c => `  <section class="cat">
    <h2>${esc(c)}</h2><div class="rule"></div>
    <ul class="alist">
${DATA.articles.filter(a => a.category === c).map(a => `      <li><a href="${a.slug}.html"><b>${esc(a.title)}</b><span>${esc(a.what)}</span></a></li>`).join("\n")}
    </ul>
  </section>`).join("\n")}`,
  script: `<script>
(function () {
  var IDX = ${JSON.stringify(index)};
  var FLOWS = ${JSON.stringify(FLOWS)};
  var f = document.getElementById("find"), hits = document.getElementById("hits");
  function el(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x) n.textContent = x; return n; }
  f.addEventListener("input", function () {
    var words = f.value.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\\s+/).filter(function (w) { return w.length > 1; });
    hits.textContent = "";
    if (!words.length) return;
    var scored = IDX.map(function (a) {
      var s = 0; words.forEach(function (w) { if (a.w.indexOf(w) !== -1) s += a.t.toLowerCase().indexOf(w) !== -1 ? 3 : 1; });
      if (a.w.indexOf(words.join(" ")) !== -1) s += 4;
      return [s, a];
    }).filter(function (x) { return x[0] > 0; }).sort(function (x, y) { return y[0] - x[0]; }).slice(0, 5);
    var flow = scored.length && scored[0][1].d;
    if (flow) {
      var li = el("li"), a = el("a"); a.href = "../diagnose.html#" + flow + "/battery-check";
      a.appendChild(el("small", "", "Step-by-step checks")); a.appendChild(el("b", "", FLOWS[flow]));
      li.appendChild(a); hits.appendChild(li);
    }
    scored.forEach(function (x) {
      var li = el("li"), a = el("a"); a.href = x[1].s + ".html";
      a.appendChild(el("small", "", "Article")); a.appendChild(el("b", "", x[1].t));
      li.appendChild(a); hits.appendChild(li);
    });
    if (!scored.length) { var li = el("li"); li.appendChild(el("p", "srcs", "Nothing matched. Try other words, or start the step-by-step checks.")); hits.appendChild(li); }
  });
})();
</script>
`
});

/* ---------- write or check, plus sitemap block ---------- */
const checkOnly = process.argv.includes("--check");
const stale = [];
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);
for (const [name, html] of Object.entries(files)) {
  const p = path.join(OUT, name);
  if ((fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null) !== html) { stale.push(name); if (!checkOnly) fs.writeFileSync(p, html); }
}
for (const f of fs.readdirSync(OUT)) if (f.endsWith(".html") && !files[f]) { stale.push(f + " (no longer in data)"); if (!checkOnly) fs.unlinkSync(path.join(OUT, f)); }

const SM = path.join(ROOT, "sitemap.xml"), sm = fs.readFileSync(SM, "utf8");
const START = "  <!-- learn:start (generated by tools/build-learn.js) -->", END = "  <!-- learn:end -->";
const block = START + "\n" + Object.keys(files).sort((a, b) => a === "index.html" ? -1 : b === "index.html" ? 1 : a.localeCompare(b))
  .map(f => `  <url>\n    <loc>https://ebikebuy.com/learn/${f}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>${f === "index.html" ? "0.8" : "0.6"}</priority>\n  </url>`).join("\n") + "\n" + END;
const nextSm = sm.includes(START) ? sm.slice(0, sm.indexOf(START)) + block + sm.slice(sm.indexOf(END) + END.length) : sm.replace("</urlset>", block + "\n</urlset>");
if (nextSm !== sm) { stale.push("sitemap.xml"); if (!checkOnly) fs.writeFileSync(SM, nextSm); }

if (checkOnly) { if (stale.length) { console.log("Out of date: " + stale.join(", ")); process.exit(1); } }
else console.log(`Wrote ${Object.keys(files).length} learn pages` + (stale.length ? ` (${stale.length} changed)` : " (no changes)"));
