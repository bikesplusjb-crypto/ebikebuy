/* ==========================================================
   Site checks — run with:  node tests/run.js
   No dependencies. Exits non-zero if anything fails.
   ========================================================== */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const D = require("../js/diagnose-data.js");

let failed = 0;
const fail = msg => { failed++; console.log("  FAIL  " + msg); };
const ok = msg => console.log("  ok    " + msg);
const warn = msg => console.log("  WARN  " + msg);

/* ---------- 1. diagnose flows are well formed ---------- */
console.log("Diagnose flows");
const flowIds = Object.keys(D.flows);

D.start.options.forEach(o => {
  if (!D.flows[o.flow]) fail(`start option "${o.label}" points at missing flow "${o.flow}"`);
});

function checkStep(where, s) {
  if (s.result) {
    if (!["danger", "stop", "check"].includes(s.level)) fail(`${where}: bad level "${s.level}"`);
    if (!["Likely", "Possible", "Needs a mechanic"].includes(s.confidence)) fail(`${where}: bad confidence "${s.confidence}"`);
    if (!s.title || !s.why) fail(`${where}: result needs a title and a why`);
    (s.links || []).forEach(l => {
      if (l.flow && !D.flows[l.flow]) fail(`${where}: link to missing flow "${l.flow}"`);
      if (!l.flow && !l.href) fail(`${where}: link "${l.label}" has no target`);
    });
  } else {
    if (!s.q || !Array.isArray(s.options) || s.options.length < 2) fail(`${where}: a question needs text and at least two options`);
  }
}

Object.entries(D.shared).forEach(([id, s]) => checkStep("shared/" + id, s));

flowIds.forEach(fid => {
  const f = D.flows[fid];
  if (!f.steps[f.first]) fail(`${fid}: first step "${f.first}" is missing`);
  Object.entries(f.steps).forEach(([id, s]) => {
    if (D.shared[id]) fail(`${fid}/${id}: clashes with a shared step id`);
    checkStep(`${fid}/${id}`, s);
    (s.options || []).forEach(o => {
      const n = o.next === "@flow" ? f.first : o.next;
      if (!f.steps[n] && !D.shared[n]) fail(`${fid}/${id}: option "${o.label}" points at missing step "${o.next}"`);
    });
  });

  // every step reachable from the battery check; every path ends in a result
  const seen = new Set();
  const walk = (id, depth) => {
    if (depth > 30) return fail(`${fid}: path too deep at "${id}" (loop?)`);
    const s = D.shared[id] || f.steps[id];
    if (!s) return; // already reported as a missing step above
    seen.add(id);
    if (s.result) return;
    s.options.forEach(o => walk(o.next === "@flow" ? f.first : o.next, depth + 1));
  };
  walk("battery-check", 0);
  Object.keys(f.steps).forEach(id => { if (!seen.has(id)) fail(`${fid}/${id}: can't be reached`); });
  if (!seen.has("battery-danger")) fail(`${fid}: battery-danger result not reachable`);
});
if (D.shared["battery-check"].options.find(o => o.label === "Yes").next !== "battery-danger")
  fail("battery check: Yes must lead to battery-danger");
if (!D.shared["battery-danger"].call911) fail("battery-danger must show the Call 911 button");
if (!failed) ok(`${flowIds.length} flows, all steps reachable, every path ends in a result, battery check first`);

/* ---------- 2. no unsafe advice anywhere ---------- */
console.log("Unsafe-advice phrases");
const BANNED = [
  /bypass(ing)? the (bms|battery)/i,
  /disable (the )?(bms|battery protection)/i,
  /(remove|unlock|raise|increase) the speed limit/i,
  /de-?restrict/i,
  /open (up )?the battery( pack| case)? (and|to)/i,
  /rebuild (the|your) battery/i,
  /any charger (will|works)/i
];
const pages = fs.readdirSync(ROOT).filter(f => f.endsWith(".html"))
  .concat(...["error-codes", "learn"].map(d => fs.readdirSync(path.join(ROOT, d)).filter(f => f.endsWith(".html")).map(f => d + "/" + f)));
const texts = pages.map(f => [f, fs.readFileSync(path.join(ROOT, f), "utf8")])
  .concat(["js/diagnose-data.js", "data/error-codes.json", "data/learn.json"].map(f => [f, fs.readFileSync(path.join(ROOT, f), "utf8")]));
let unsafe = 0;
texts.forEach(([f, t]) => BANNED.forEach(re => {
  const m = t.match(re);
  if (m) { unsafe++; fail(`${f}: unsafe phrase "${m[0]}"`); }
}));
if (!unsafe) ok(`${texts.length} files clean`);

/* ---------- 3. every internal link points at a real page ---------- */
console.log("Internal links");
let broken = 0;
texts.forEach(([f, t]) => {
  for (const m of t.matchAll(/href[=:]\s*"((?:\.\.\/)?(?:[a-z0-9-]+\/)?[a-z0-9-]+\.html)(#[^"]*)?"/g)) {
    // pages resolve links from their own folder; data files are used by pages at the site root
    const base = f.endsWith(".html") ? path.dirname(f) : "";
    const target = path.join(ROOT, base, m[1]);
    if (!fs.existsSync(target)) { broken++; fail(`${f}: link to missing ${m[1]}`); }
  }
});
for (const m of fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8").matchAll(/ebikebuy\.com\/((?:[a-z0-9-]+\/)?[a-z0-9-]+\.html)/g)) {
  if (!fs.existsSync(path.join(ROOT, m[1]))) { broken++; fail(`sitemap: ${m[1]} doesn't exist`); }
}
if (!broken) ok("all .html links and sitemap entries resolve");
let wrongCur = 0;
texts.forEach(([f, t]) => {
  const bar = (t.match(/<nav class="helpbar"[\s\S]*?<\/nav>/) || [""])[0];
  const cur = (bar.match(/href="([^"]+)" aria-current="page"/) || [])[1];
  if (cur && !f.startsWith("error-codes/") && path.basename(cur) !== path.basename(f)) { wrongCur++; fail(`${f}: help bar marks ${cur} as the current page`); }
});
if (!wrongCur) ok("help bar marks the right page as current");

/* ---------- 4. error-code data ---------- */
console.log("Error codes");
const EC = JSON.parse(fs.readFileSync(path.join(ROOT, "data/error-codes.json"), "utf8"));
const seenCodes = new Set();
let ecBad = 0;
EC.codes.forEach(c => {
  const id = `${c.system}/${c.code}`;
  const bad = m => { ecBad++; fail(`${id}: ${m}`); };
  if (!EC.systems[c.system]) bad("unknown system");
  if (seenCodes.has(id)) bad("listed twice");
  seenCodes.add(id);
  const sys = EC.systems[c.system] || {};
  let host = ""; try { host = new URL(c.source_url).hostname; } catch (e) {}
  if (!/^https:/.test(c.source_url || "") || !(sys.source_domains || []).some(d => host === d || host.endsWith("." + d)))
    bad(`needs a source URL on the maker's own site (${(sys.source_domains || []).join(", ")})`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.verified_on || "")) bad("needs a verified_on date (YYYY-MM-DD)");
  if (!["help-center", "manual"].includes(c.source_type)) bad("source_type must be help-center or manual");
  if (!["check", "dealer"].includes(c.severity)) bad("severity must be check or dealer");
  if (!c.title || !c.maker_says || !c.plain || !(c.maker_fix || []).length) bad("needs title, maker_says, maker_fix and plain");
});
if (!ecBad) ok(`${EC.codes.length} codes, each with a maker source and date, no duplicates`);
const { execFileSync } = require("child_process");
try { execFileSync("node", [path.join(ROOT, "tools/build-codes.js"), "--check"], { stdio: "pipe" }); ok("error-code pages match the data"); }
catch (e) { fail("error-code pages are out of date: run node tools/build-codes.js (" + String(e.stdout).trim() + ")"); }
const sm = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
const missingSm = fs.readdirSync(path.join(ROOT, "error-codes")).filter(f => f.endsWith(".html") && !sm.includes("error-codes/" + f));
if (missingSm.length) fail(`sitemap is missing ${missingSm.length} error-code page(s); run node tools/build-codes.js`); else ok("every error-code page is in the sitemap");

/* ---------- 5. recalls ---------- */
console.log("Recalls");
const RC = JSON.parse(fs.readFileSync(path.join(ROOT, "data/recalls.json"), "utf8"));
let rcBad = 0;
RC.items.concat(RC.notices).forEach((r, i) => {
  const bad = m => { rcBad++; fail(`recall ${r.brand || r.title} (${r.date}): ${m}`); };
  let host = ""; try { host = new URL(r.url).hostname; } catch (e) {}
  if (!/^https:/.test(r.url || "") || !(host === "cpsc.gov" || host.endsWith(".cpsc.gov"))) bad("needs a cpsc.gov URL");
  if (!/^\d{4}(-\d{2}(-\d{2})?)?$/.test(r.date || "")) bad("date must be YYYY, YYYY-MM or YYYY-MM-DD");
  if (r.type && !["recall", "warning"].includes(r.type)) bad("type must be recall or warning");
});
if (!/^\d{4}-\d{2}-\d{2}$/.test(RC.checked_on || "")) fail("recalls: checked_on date missing");
if (!rcBad) ok(`${RC.items.length} recalls and warnings, each linked to cpsc.gov`);
try { execFileSync("node", [path.join(ROOT, "tools/build-recalls.js"), "--check"], { stdio: "pipe" }); ok("recalls page matches the data"); }
catch (e) { fail("recalls.html is out of date: run node tools/build-recalls.js"); }

/* ---------- 6. learn ---------- */
console.log("Learn");
const LN = JSON.parse(fs.readFileSync(path.join(ROOT, "data/learn.json"), "utf8"));
const slugs = new Set(LN.articles.map(a => a.slug));
let lnBad = 0;
LN.articles.forEach(a => {
  const bad = m => { lnBad++; fail(`learn/${a.slug}: ${m}`); };
  if (!/^[a-z0-9-]+$/.test(a.slug)) bad("slug must be lowercase letters, numbers and dashes");
  if (!a.title || !a.what || !a.does || !a.category) bad("needs title, what, does and category");
  (a.related || []).forEach(s => { if (!slugs.has(s)) bad(`related article "${s}" doesn't exist`); });
  if (a.diagnose && !D.flows[a.diagnose]) bad(`diagnose flow "${a.diagnose}" doesn't exist`);
  if (!(a.keywords || []).length) bad("needs search keywords");
});
if (slugs.size !== LN.articles.length) fail("learn: duplicate slugs");
if (!lnBad) ok(`${LN.articles.length} articles, related links and diagnose links all valid`);
try { execFileSync("node", [path.join(ROOT, "tools/build-learn.js"), "--check"], { stdio: "pipe" }); ok("learn pages and sitemap match the data"); }
catch (e) { fail("learn pages are out of date: run node tools/build-learn.js (" + String(e.stdout).trim() + ")"); }

/* ---------- 7. My garage data ---------- */
console.log("My garage");
{
  const G = require("../js/garage-store.js");
  const mem = {}; const storage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
  let gBad = 0; const check = (c, m) => { if (!c) { gBad++; fail("garage: " + m); } };
  let d = G.load(storage);
  check(d.bikes.length === 0, "a new phone starts empty");
  const id = G.addBike(d, { brand: "Rad", model: "RadWagon 4", system: "nonsense", serial: "ABC123" });
  check(d.bikes.length === 1 && d.bikes[0].name === "Rad RadWagon 4", "bike gets a name from brand and model");
  check(d.bikes[0].system === "unknown", "unknown motor systems are stored as unknown");
  check(G.addLog(d, { bikeId: id, date: "2026-10-01", work: "New rear tire" }), "service entry saves");
  check(G.addLog(d, { bikeId: "nope", date: "2026-10-01", work: "x" }) === null, "entry for a missing bike is refused");
  check(G.addLog(d, { bikeId: id, date: "10/01/2026", work: "x" }) === null, "entry with a bad date is refused");
  check(G.addReminder(d, id, "Lube chain", "2026-10-10") && G.addReminder(d, id, "Shop check", "2027-04-01"), "reminders save");
  check(G.due(d, "2026-10-23").map(r => r.what).join() === "Lube chain", "only reminders on or before today are due");
  check(G.addDiagnosis(d, { bikeId: id, date: "2026-10-23", title: "A brake lever may be cutting the motor", path: "no-assist/battery-check" }), "saved check stores");
  check(G.save(storage, d), "saves to storage");
  const back = G.load(storage);
  check(back.bikes.length === 1 && back.log.length === 1 && back.reminders.length === 2 && back.diagnoses.length === 1, "everything survives a reload");
  check(G.linksFor(back.bikes[0]).recalls === "recalls.html?q=Rad", "bike links to its brand's recalls");
  check(G.linksFor({ system: "bosch" }).codes === "error-codes/bosch.html", "bike links to its error codes");
  const restored = G.importText(G.exportText(back));
  check(JSON.stringify(restored) === JSON.stringify(back), "a backup file restores exactly");
  check(G.importText('{"bikes":[{"id":"x","name":"<img src=x onerror=alert(1)>","system":"bosch","evil":"y"}],"log":[{"bikeId":"zz","date":"2026-01-01","work":"orphan"}]}').log.length === 0, "imported entries for missing bikes are dropped");
  check(!("evil" in G.importText('{"bikes":[{"id":"x","evil":"y"}]}').bikes[0]), "unknown fields are dropped on import");
  let threw = false; try { G.importText("not json"); } catch (e) { threw = true; }
  check(threw, "a file that isn't a backup is rejected");
  G.removeBike(back, id);
  check(back.bikes.length === 0 && back.log.length === 0 && back.reminders.length === 0 && back.diagnoses[0].bikeId === "", "removing a bike removes its log and reminders but keeps saved checks");
  storage.setItem(G.KEY, "{broken");
  check(G.load(storage).bikes.length === 0, "corrupt saved data loads as an empty garage instead of crashing");
  if (!gBad) ok("bikes, service log, reminders, saved checks, backup and import all behave");
}

/* ---------- 8. reminders (don't fail) ---------- */
if (!D.reviewed || /pending/i.test(D.reviewed)) warn("diagnose flows not yet signed off by a mechanic (DIAGNOSE.reviewed)");

console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
process.exit(failed ? 1 : 0);
