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
const pages = fs.readdirSync(ROOT).filter(f => f.endsWith(".html"));
const texts = pages.map(f => [f, fs.readFileSync(path.join(ROOT, f), "utf8")])
  .concat([["js/diagnose-data.js", fs.readFileSync(path.join(ROOT, "js/diagnose-data.js"), "utf8")]]);
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
  for (const m of t.matchAll(/href[=:]\s*"([a-z0-9-]+\.html)(#[^"]*)?"/g)) {
    if (!fs.existsSync(path.join(ROOT, m[1]))) { broken++; fail(`${f}: link to missing ${m[1]}`); }
  }
});
for (const m of fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8").matchAll(/ebikebuy\.com\/([a-z0-9-]+\.html)/g)) {
  if (!fs.existsSync(path.join(ROOT, m[1]))) { broken++; fail(`sitemap: ${m[1]} doesn't exist`); }
}
if (!broken) ok("all .html links and sitemap entries resolve");

/* ---------- 4. reminders (don't fail) ---------- */
if (!D.reviewed || /pending/i.test(D.reviewed)) warn("diagnose flows not yet signed off by a mechanic (DIAGNOSE.reviewed)");

console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
process.exit(failed ? 1 : 0);
