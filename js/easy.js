/* ==========================================================
   Easier to read: a small button on every page with
   - Bigger text (remembered on this phone only)
   - Read this page aloud (the phone's own voice; nothing is sent anywhere)
   Loaded with <script src="js/easy.js" defer> in each page's head.
   ========================================================== */
(function () {
  var KEY = "ebikebuy.bigText";
  var root = document.documentElement;
  function load() { try { return localStorage.getItem(KEY) === "1"; } catch (e) { return false; } }
  function save(on) { try { localStorage.setItem(KEY, on ? "1" : "0"); } catch (e) {} }
  if (load()) root.classList.add("easy-big");

  var css = document.createElement("style");
  css.textContent =
    "html.easy-big body{zoom:1.18}" +
    ".easy-btn{position:fixed;right:max(12px,env(safe-area-inset-right,0px));bottom:max(12px,env(safe-area-inset-bottom,0px));z-index:90;" +
    "font:700 15px/1 'Inter',system-ui,sans-serif;background:#0D0D0D;color:#fff;border:2px solid #8DC63F;border-radius:999px;padding:12px 16px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25)}" +
    ".easy-panel{position:fixed;right:max(12px,env(safe-area-inset-right,0px));bottom:calc(max(12px,env(safe-area-inset-bottom,0px)) + 54px);z-index:90;" +
    "background:#fff;color:#1A1A1A;border:2px solid #0D0D0D;border-radius:12px;padding:14px;display:grid;gap:10px;width:240px;box-shadow:0 8px 24px rgba(0,0,0,.25);font-family:'Inter',system-ui,sans-serif}" +
    ".easy-panel button{font:600 16px/1.2 'Inter',system-ui,sans-serif;text-align:left;background:#F6F6F4;color:#1A1A1A;border:2px solid #E3E3E1;border-radius:8px;padding:12px 14px;cursor:pointer;min-height:48px}" +
    ".easy-panel button[aria-pressed=true]{border-color:#77AC2F;background:#EEF6E4}" +
    ".easy-panel[hidden]{display:none}" +
    ".easy-panel p{margin:0;font-size:13px;color:#6B7280}" +
    "@media print{.easy-btn,.easy-panel{display:none}}";
  document.head.appendChild(css);

  function start() {
    var btn = document.createElement("button");
    btn.type = "button"; btn.className = "easy-btn"; btn.textContent = "Aa  Easier to read";
    btn.setAttribute("aria-expanded", "false"); btn.setAttribute("aria-controls", "easyPanel");
    var panel = document.createElement("div");
    panel.className = "easy-panel"; panel.id = "easyPanel"; panel.hidden = true;
    panel.setAttribute("role", "group"); panel.setAttribute("aria-label", "Easier to read");

    var big = document.createElement("button");
    big.type = "button"; big.textContent = "Bigger text";
    big.setAttribute("aria-pressed", String(root.classList.contains("easy-big")));
    big.onclick = function () {
      var on = !root.classList.contains("easy-big");
      root.classList.toggle("easy-big", on); big.setAttribute("aria-pressed", String(on)); save(on);
    };
    panel.appendChild(big);

    var canSpeak = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
    var read = document.createElement("button");
    read.type = "button";
    read.textContent = canSpeak ? "Read this page aloud" : "Reading aloud isn't available on this browser";
    read.disabled = !canSpeak;
    var speaking = false;
    function stop() { window.speechSynthesis.cancel(); speaking = false; read.textContent = "Read this page aloud"; read.setAttribute("aria-pressed", "false"); }
    read.onclick = function () {
      if (speaking) { stop(); return; }
      // On the diagnose page read the current question or answer; elsewhere the main content.
      var area = document.getElementById("dx") || document.querySelector("main") || document.body;
      var text = (area.innerText || "").replace(/\s+/g, " ").trim();
      if (!text) return;
      // Short chunks, because some phones stop long speech partway through.
      var parts = text.match(/[^.!?]+[.!?]*/g) || [text];
      window.speechSynthesis.cancel();
      speaking = true; read.textContent = "Stop reading"; read.setAttribute("aria-pressed", "true");
      parts.forEach(function (p, i) {
        var u = new SpeechSynthesisUtterance(p.trim());
        u.lang = "en-US"; u.rate = 0.95;
        if (i === parts.length - 1) u.onend = stop;
        window.speechSynthesis.speak(u);
      });
    };
    panel.appendChild(read);
    var note = document.createElement("p");
    note.textContent = "Bigger text is remembered on this phone. Reading uses your phone's own voice.";
    panel.appendChild(note);

    btn.onclick = function () {
      var open = panel.hidden;
      panel.hidden = !open; btn.setAttribute("aria-expanded", String(open));
    };
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !panel.hidden) { panel.hidden = true; btn.setAttribute("aria-expanded", "false"); btn.focus(); } });
    window.addEventListener("hashchange", function () { if (speaking) stop(); });
    document.body.appendChild(panel);
    document.body.appendChild(btn);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
