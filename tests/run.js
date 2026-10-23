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
  .concat(fs.readdirSync(path.join(ROOT, "error-codes")).filter(f => f.endsWith(".html")).map(f => "error-codes/" + f));
const texts = pages.map(f => [f, fs.readFileSync(path.join(ROOT, f), "utf8")])
  .concat(["js/diagnose-data.js", "data/error-codes.json"].map(f => [f, fs.readFileSync(path.join(ROOT, f), "utf8")]));
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

/* ---------- 5. reminders (don't fail) ---------- */
if (!D.reviewed || /pending/i.test(D.reviewed)) warn("diagnose flows not yet signed off by a mechanic (DIAGNOSE.reviewed)");

console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
process.exit(failed ? 1 : 0);
