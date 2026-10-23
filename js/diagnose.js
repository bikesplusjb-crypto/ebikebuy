/* ==========================================================
   DIAGNOSE — engine
   Walks the flows in js/diagnose-data.js one question per
   screen. The path lives in the URL hash, e.g.
     #no-assist/battery-check/na-code
   so the phone's back button and shared links both work.
   All text is inserted with textContent, never as HTML.
   ========================================================== */
(function () {
  const D = DIAGNOSE;
  const root = document.getElementById("dx");
  const PHONE = "772-692-5505";

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  function stepFor(flowId, id) {
    if (D.shared[id]) return D.shared[id];
    const f = D.flows[flowId];
    return f && f.steps[id];
  }

  // Turn the hash into a checked path; anything unknown falls back to the start.
  function readPath() {
    let raw;
    try { raw = decodeURIComponent(location.hash.slice(1)); } catch (e) { return null; }
    const parts = raw.split("/").filter(Boolean);
    if (!parts.length || !D.flows[parts[0]]) return null;
    for (const id of parts.slice(1)) if (!stepFor(parts[0], id)) return null;
    if (parts.length === 1) parts.push("battery-check");
    return parts;
  }

  function go(parts) { location.hash = parts.map(encodeURIComponent).join("/"); }

  function nextId(flowId, next) { return next === "@flow" ? D.flows[flowId].first : next; }

  function navRow(showBack) {
    const row = el("div", "dx-nav");
    if (showBack) {
      const back = el("button", "dx-link", "← Back");
      back.type = "button";
      back.onclick = () => history.back();
      row.appendChild(back);
    }
    const again = el("button", "dx-link", "Start over");
    again.type = "button";
    again.onclick = () => { location.hash = ""; };
    row.appendChild(again);
    return row;
  }

  function renderStart() {
    root.textContent = "";
    root.appendChild(el("h2", "dx-q", D.start.q));
    const list = el("div", "dx-opts");
    D.start.options.forEach(o => {
      const b = el("button", "dx-opt", o.label);
      b.type = "button";
      b.onclick = () => go([o.flow, "battery-check"]);
      list.appendChild(b);
    });
    root.appendChild(list);
  }

  function renderQuestion(parts, step) {
    const flowId = parts[0];
    root.textContent = "";
    root.appendChild(el("p", "dx-kicker", D.flows[flowId].title + " · question " + (parts.length - 1)));
    root.appendChild(el("h2", "dx-q", step.q));
    if (step.help) root.appendChild(el("p", "dx-help", step.help));
    const list = el("div", "dx-opts");
    step.options.forEach(o => {
      const b = el("button", "dx-opt", o.label);
      b.type = "button";
      b.onclick = () => go(parts.concat(nextId(flowId, o.next)));
      list.appendChild(b);
    });
    root.appendChild(list);
    root.appendChild(navRow(true));
  }

  function renderResult(parts, r) {
    root.textContent = "";
    const card = el("div", "dx-result dx-" + r.level);
    card.appendChild(el("p", "dx-badge", r.confidence));
    card.appendChild(el("h2", "dx-title", r.title));
    card.appendChild(el("p", "dx-why", r.why));
    if (r.checks && r.checks.length) {
      card.appendChild(el("h3", "", r.level === "check" ? "Safe things to check" : "What to do now"));
      const ol = el("ol", "dx-checks");
      r.checks.forEach(c => ol.appendChild(el("li", "", c)));
      card.appendChild(ol);
    }
    if (r.help) card.appendChild(el("p", "dx-helpline", r.help));

    const btns = el("div", "btnrow");
    if (r.call911) {
      const a = el("a", "btn btn--alert", "Call 911");
      a.href = "tel:911";
      btns.appendChild(a);
    }
    (r.links || []).forEach(l => {
      const a = el("a", "btn btn--ghost", l.label);
      if (l.flow) { a.href = "#" + l.flow + "/" + D.flows[l.flow].first; }
      else {
        a.href = l.href;
        if (/^https?:/.test(l.href)) { a.target = "_blank"; a.rel = "noopener"; }
      }
      btns.appendChild(a);
    });
    const call = el("a", "btn", "Call Bikes Plus");
    call.href = "tel:" + PHONE.replace(/\D/g, "");
    btns.appendChild(call);
    const mail = el("a", "btn btn--ghost", "Email photos");
    mail.href = "about.html#contact";
    btns.appendChild(mail);
    card.appendChild(btns);

    root.appendChild(card);
    root.appendChild(el("p", "dx-note",
      "This is a checklist to help you narrow things down, not a diagnosis. If anything about the brakes, steering or battery feels wrong, don't ride it."));
    root.appendChild(navRow(true));
  }

  function render() {
    const parts = readPath();
    if (!parts) { renderStart(); }
    else {
      const step = stepFor(parts[0], parts[parts.length - 1]);
      step.result ? renderResult(parts, step) : renderQuestion(parts, step);
    }
    const h = root.querySelector("h2");
    if (h && location.hash) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
    if (location.hash) root.scrollIntoView({ block: "start" });
  }

  window.addEventListener("hashchange", render);
  render();
})();
