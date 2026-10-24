/* ==========================================================
   Builds recalls.html from data/recalls.json.
   Run:  node tools/build-recalls.js        (writes the page)
         node tools/build-recalls.js --check (exit 1 if out of date)
   The page shell (header, help bar, styles) is copied from
   battery-safety.html so the look stays in step with the site.
   ========================================================== */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, "data/recalls.json"), "utf8"));
const OUT = path.join(ROOT, "recalls.html");

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
// "2026-03-19" → "March 19, 2026"; "2022-11" → "November 2022"; "2022" → "2022"
function fmtDate(d) {
  const [y, m, day] = d.split("-");
  if (!m) return y;
  return day ? `${MONTHS[+m - 1]} ${+day}, ${y}` : `${MONTHS[+m - 1]} ${y}`;
}

const shell = fs.readFileSync(path.join(ROOT, "battery-safety.html"), "utf8");
let top = shell.slice(0, shell.indexOf('<div class="masthead">'))
  .replace("https://ebikebuy.com/battery-safety.html", "https://ebikebuy.com/recalls.html")
  .replace(/<meta property="og:title"[^>]*>/, '<meta property="og:title" content="E-Bike Recalls and Safety Warnings (CPSC)">')
  .replace(/<meta property="og:description"[^>]*>/, '<meta property="og:description" content="Every U.S. e-bike, e-trike and e-bike battery recall and CPSC warning since 2022, searchable by brand and model.">')
  .replace(/<title>.*?<\/title>/, "<title>E-Bike Recalls and Safety Warnings — EbikeBuy</title>")
  .replace(/<meta name="description"[^>]*>/, '<meta name="description" content="Search U.S. e-bike, e-trike and e-bike battery recalls and CPSC safety warnings since 2022 by brand or model, with what to do and a link to each CPSC notice.">')
  .replace(/ aria-current="page"/g, "")
  .replace("</style>", `.find{width:100%;font:inherit;font-size:18px;padding:14px 16px;border:2px solid var(--line);border-radius:8px;margin:0 0 8px}
.find:focus{border-color:var(--lime);outline:none}
.count{font-size:14px;color:var(--grey);margin:0 0 14px}
.rc{list-style:none;padding:0;margin:0 0 18px;display:grid;gap:10px}
.rc li{border:1px solid var(--line);border-left:5px solid #D99A2B;border-radius:6px;padding:14px 16px}
.rc li.w{border-left-color:var(--alert);background:#FDF4F2}
.rc .meta{font-size:12.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--grey);margin:0 0 4px}
.rc .w .meta{color:var(--alert)}
.rc b{display:block;font-size:17px}
.rc .prod{margin:2px 0 8px}
.rc dl{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;margin:0 0 8px;font-size:15.5px}
.rc dt{font-weight:600}
.rc dd{margin:0}
</style>`);

const items = DATA.items.slice().sort((a, b) => b.date.localeCompare(a.date));
const card = r => `      <li class="${r.type === "warning" ? "w" : "r"}" data-q="${esc((r.brand + " " + r.product).toLowerCase())}">
        <p class="meta">${r.type === "warning" ? "CPSC warning" : "Recall"} · ${esc(fmtDate(r.date))}</p>
        <b>${esc(r.brand)}</b>
        <p class="prod">${esc(r.product)}</p>
        <dl><dt>Problem</dt><dd>${esc(r.hazard)}</dd><dt>What's offered</dt><dd>${esc(r.remedy)}</dd>${r.units ? `<dt>Units</dt><dd>About ${esc(r.units)}</dd>` : ""}</dl>
        <a href="${esc(r.url)}">Read the CPSC notice</a>
      </li>`;

const html = top + `<div class="masthead">
  <div class="wrap">
    <p class="tag">Recalls</p>
    <h1>E-bike recalls<br>and warnings</h1>
    <p>U.S. recalls and Consumer Product Safety Commission warnings for e-bikes, e-trikes and e-bike batteries since 2022. Type your bike's brand or model to check it.</p>
    <p class="upd">Checked against cpsc.gov: ${esc(fmtDate(DATA.checked_on))}.</p>
  </div>
</div>

<main class="wrap">
  <section id="search">
    <label for="find" class="srcs">Brand or model</label>
    <input id="find" class="find" autocomplete="off" spellcheck="false" placeholder="e.g. Rad, Trek, Heckler">
    <p class="count" id="count" aria-live="polite">${items.length} notices</p>
    <ul class="rc" id="list">
${items.map(card).join("\n")}
    </ul>
    <p id="none" class="callout" hidden>Nothing on our list matches. That's a good sign, but our list only covers e-bikes since 2022. Search <a href="https://www.cpsc.gov/Recalls">CPSC's full recall list</a> to be sure.</p>
  </section>

  <section id="if-listed">
    <h2>If your bike is on the list</h2><div class="rule"></div>
    <ul class="pl">
      <li><b>Recall:</b> the maker has offered a fix, a replacement or a refund. Follow the CPSC notice; it has the maker's contact details. Until it's fixed, don't ride it if the problem is the frame, fork, brakes or wheels.</li>
      <li><b>CPSC warning:</b> no fix was offered. CPSC says to stop using the product. For a battery, don't charge it, don't throw it in the trash, and take it to a household hazardous-waste site.</li>
      <li>Not sure your exact model is the one listed? Compare the model name and serial number with the CPSC notice, or bring it to Bikes Plus and we'll check.</li>
    </ul>
    <div class="btnrow">
      <a class="btn" href="tel:7726925505">Call Bikes Plus</a>
      <a class="btn btn--ghost" href="battery-safety.html">Battery safety</a>
    </div>
  </section>

  <section id="notices">
    <h2>Other CPSC safety notices</h2><div class="rule"></div>
${DATA.notices.map(n => `    <p><b>${esc(n.title)}</b> (${esc(fmtDate(n.date))}). ${esc(n.detail)} <a href="${esc(n.url)}">Read the CPSC notice</a>.</p>`).join("\n")}
  </section>

  <section id="sources">
    <h2>Sources</h2><div class="rule"></div>
    <p class="srcs">Every entry links to its notice on cpsc.gov, the U.S. Consumer Product Safety Commission. Full list: <a href="https://www.cpsc.gov/Recalls">cpsc.gov/Recalls</a>. Report a problem with your own bike or battery at <a href="https://www.saferproducts.gov/">SaferProducts.gov</a>.</p>
    <div class="callout">This list is a convenience, not an official record, and it may miss a notice. CPSC's site is the authority. EbikeBuy isn't affiliated with CPSC.</div>
  </section>
</main>

<footer class="ftr">
  <div class="wrap">
    <a href="index.html">Back to shop</a> · <a href="battery-safety.html">Battery safety</a> · <a href="diagnose.html">Diagnose my e-bike</a> · <a href="broke-down.html">Broke down?</a> · <a href="policies.html#privacy">Privacy</a><br><br>
    EbikeBuy is an independent buying guide and service resource. Brand and product names are the property of their respective owners.
  </div>
</footer>

<script>
document.getElementById("hdrPhone").href = "tel:7726925505";
(function () {
  var f = document.getElementById("find"), items = [].slice.call(document.querySelectorAll("#list li")),
      none = document.getElementById("none"), count = document.getElementById("count");
  f.addEventListener("input", function () {
    var words = f.value.toLowerCase().split(/\\s+/).filter(Boolean), shown = 0;
    items.forEach(function (li) {
      var q = li.getAttribute("data-q"), on = words.every(function (w) { return q.indexOf(w) !== -1; });
      li.hidden = !on; if (on) shown++;
    });
    none.hidden = shown > 0;
    count.textContent = words.length ? shown + " of " + items.length + " notices match" : items.length + " notices";
  });
})();
</script>
</body>
</html>
`;

const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : null;
if (process.argv.includes("--check")) {
  if (cur !== html) { console.log("recalls.html is out of date"); process.exit(1); }
} else if (cur !== html) { fs.writeFileSync(OUT, html); console.log("Wrote recalls.html"); }
else console.log("recalls.html unchanged");
