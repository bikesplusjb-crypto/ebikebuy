/* ==========================================================
   My Garage: data kept on the rider's own phone.
   Everything here is plain functions over one object, so
   tests/run.js can check it in Node with a fake storage.
   Nothing is sent anywhere.

   Shape (version 1):
   { v: 1,
     bikes:     [{ id, name, brand, model, year, system, display, battery,
                   tires, tireSize, bought, boughtFrom, warrantyUntil, serial, notes }],
     log:       [{ id, bikeId, date, miles, work, parts, shop, notes }],
     reminders: [{ id, bikeId, what, due, done }],
     diagnoses: [{ id, bikeId, date, title, confidence, level, path }] }
   ========================================================== */
(function (root) {
  var KEY = "ebikebuy.garage.v1";
  var SYSTEMS = {
    bosch: { label: "Bosch", codes: "error-codes/bosch.html" },
    shimano: { label: "Shimano STEPS / EP", codes: "error-codes/shimano.html" },
    bafang: { label: "Bafang", codes: "error-codes/bafang.html" },
    yamaha: { label: "Yamaha" }, brose: { label: "Brose / QORE" }, specialized: { label: "Specialized" },
    other: { label: "Another make" }, unknown: { label: "I don't know" }
  };
  var BIKE_FIELDS = ["name", "brand", "model", "year", "system", "display", "battery", "tires", "tireSize", "bought", "boughtFrom", "warrantyUntil", "serial", "notes"];
  var LOG_FIELDS = ["bikeId", "date", "miles", "work", "parts", "shop", "notes"];

  function empty() { return { v: 1, bikes: [], log: [], reminders: [], diagnoses: [] }; }
  function id() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function str(x, max) { return x == null ? "" : String(x).trim().slice(0, max || 200); }
  function pick(src, fields, max) { var o = {}; fields.forEach(function (f) { o[f] = str(src[f], max); }); return o; }
  function isDate(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s || ""); }

  // Accept only the known shape; drop anything else. Used on load and import.
  function clean(raw) {
    var d = empty();
    if (!raw || typeof raw !== "object") return d;
    (Array.isArray(raw.bikes) ? raw.bikes : []).slice(0, 50).forEach(function (b) {
      if (!b || !b.id) return;
      var bike = pick(b, BIKE_FIELDS, 300); bike.id = str(b.id, 40);
      if (!SYSTEMS[bike.system]) bike.system = "unknown";
      if (!bike.name) bike.name = [bike.brand, bike.model].filter(Boolean).join(" ") || "My e-bike";
      d.bikes.push(bike);
    });
    var ids = {}; d.bikes.forEach(function (b) { ids[b.id] = true; });
    (Array.isArray(raw.log) ? raw.log : []).slice(0, 2000).forEach(function (e) {
      if (!e || !ids[e.bikeId] || !isDate(e.date)) return;
      var x = pick(e, LOG_FIELDS, 1000); x.id = str(e.id, 40) || id(); d.log.push(x);
    });
    (Array.isArray(raw.reminders) ? raw.reminders : []).slice(0, 500).forEach(function (r) {
      if (!r || !ids[r.bikeId] || !isDate(r.due) || !str(r.what)) return;
      d.reminders.push({ id: str(r.id, 40) || id(), bikeId: r.bikeId, what: str(r.what), due: r.due, done: !!r.done });
    });
    (Array.isArray(raw.diagnoses) ? raw.diagnoses : []).slice(0, 500).forEach(function (g) {
      if (!g || !isDate(g.date) || !str(g.title)) return;
      d.diagnoses.push({ id: str(g.id, 40) || id(), bikeId: ids[g.bikeId] ? g.bikeId : "", date: g.date, title: str(g.title),
        confidence: str(g.confidence, 40), level: str(g.level, 20), path: str(g.path, 300) });
    });
    return d;
  }

  function load(storage) {
    try { var s = storage.getItem(KEY); return s ? clean(JSON.parse(s)) : empty(); } catch (e) { return empty(); }
  }
  function save(storage, d) {
    try { storage.setItem(KEY, JSON.stringify(d)); return true; } catch (e) { return false; }
  }

  function addBike(d, fields) {
    var b = pick(fields, BIKE_FIELDS, 300); b.id = id();
    d.bikes = clean({ bikes: d.bikes.concat([b]) }).bikes; // fills in a name and a valid system
    return b.id;
  }
  function updateBike(d, bikeId, fields) {
    d.bikes = d.bikes.map(function (b) { if (b.id !== bikeId) return b; var n = pick(fields, BIKE_FIELDS, 300); n.id = b.id; return n; });
    d.bikes = clean({ bikes: d.bikes }).bikes;
  }
  function removeBike(d, bikeId) {
    d.bikes = d.bikes.filter(function (b) { return b.id !== bikeId; });
    d.log = d.log.filter(function (e) { return e.bikeId !== bikeId; });
    d.reminders = d.reminders.filter(function (r) { return r.bikeId !== bikeId; });
    d.diagnoses.forEach(function (g) { if (g.bikeId === bikeId) g.bikeId = ""; });
  }
  function addLog(d, fields) {
    var e = pick(fields, LOG_FIELDS, 1000); e.id = id();
    if (!isDate(e.date) || !d.bikes.some(function (b) { return b.id === e.bikeId; })) return null;
    d.log.push(e); return e.id;
  }
  function removeLog(d, logId) { d.log = d.log.filter(function (e) { return e.id !== logId; }); }
  function addReminder(d, bikeId, what, due) {
    if (!isDate(due) || !str(what) || !d.bikes.some(function (b) { return b.id === bikeId; })) return null;
    var r = { id: id(), bikeId: bikeId, what: str(what), due: due, done: false }; d.reminders.push(r); return r.id;
  }
  function setReminderDone(d, rid, done) { d.reminders.forEach(function (r) { if (r.id === rid) r.done = !!done; }); }
  function removeReminder(d, rid) { d.reminders = d.reminders.filter(function (r) { return r.id !== rid; }); }
  function addDiagnosis(d, g) {
    var x = { id: id(), bikeId: d.bikes.some(function (b) { return b.id === g.bikeId; }) ? g.bikeId : "", date: g.date,
      title: str(g.title), confidence: str(g.confidence, 40), level: str(g.level, 20), path: str(g.path, 300) };
    if (!isDate(x.date) || !x.title) return null;
    d.diagnoses.push(x); return x.id;
  }

  // Reminders due on or before `today` (YYYY-MM-DD), oldest first.
  function due(d, today) {
    return d.reminders.filter(function (r) { return !r.done && r.due <= today; }).sort(function (a, b) { return a.due < b.due ? -1 : 1; });
  }
  function logFor(d, bikeId) {
    return d.log.filter(function (e) { return e.bikeId === bikeId; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  }
  // The links that follow from knowing the bike: its error codes and its recalls.
  function linksFor(bike) {
    var s = SYSTEMS[bike.system] || {};
    return { codes: s.codes || "", systemLabel: s.label || "", recalls: bike.brand ? "recalls.html?q=" + encodeURIComponent(bike.brand) : "recalls.html" };
  }
  function exportText(d) { return JSON.stringify({ app: "EbikeBuy My Garage", exported: new Date().toISOString().slice(0, 10), data: d }, null, 2); }
  function importText(text) {
    var raw = JSON.parse(text); // throws on bad JSON; the page reports it
    return clean(raw && raw.data ? raw.data : raw);
  }

  var api = { KEY: KEY, SYSTEMS: SYSTEMS, empty: empty, clean: clean, load: load, save: save,
    addBike: addBike, updateBike: updateBike, removeBike: removeBike, addLog: addLog, removeLog: removeLog,
    addReminder: addReminder, setReminderDone: setReminderDone, removeReminder: removeReminder,
    addDiagnosis: addDiagnosis, due: due, logFor: logFor, linksFor: linksFor, exportText: exportText, importText: importText };
  if (typeof module !== "undefined") module.exports = api; else root.Garage = api;
})(this);
