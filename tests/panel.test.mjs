// Tests for the panel calculation logic (node --test), no browser needed.
import { test } from "node:test";
import assert from "node:assert/strict";

let Panel;
globalThis.HTMLElement = class {
  attachShadow() { return {}; }
};
globalThis.document = { getElementById: () => ({}), createElement: () => ({}), head: { appendChild() {} } };
// <ha-icon> exists in Home Assistant only. Tests switch it on with globalThis.haIcon = true.
globalThis.customElements = {
  define: (_n, cls) => { Panel = cls; },
  get: (name) => (name === "ha-icon" && globalThis.haIcon ? class {} : undefined),
};

await import("../custom_components/energyboard/frontend/energyboard-panel.js");

const st = (state, unit = "W") => ({ state: String(state), attributes: { unit_of_measurement: unit } });

function panel(config, states) {
  const p = new Panel();
  p._config = config;
  p._hass = { states };
  return p;
}

test("house from separate sensors (example from the README)", () => {
  const p = panel(
    { solar_power: ["pv1", "pv2"], grid_export: ["ge"], grid_import: ["gi"], battery_discharge: ["bd"] },
    { pv1: st(2000), pv2: st(1100), ge: st(0.4, "kW"), gi: st(0), bd: st(500) },
  );
  const c = p._current();
  assert.equal(c.solar, 3100);
  assert.equal(c.gridOut, 400);
  assert.equal(c.house, 3200);
  assert.equal(c.direct, 2700);
});

test("combined sensors are split into import/export and discharge/charge", () => {
  const p = panel(
    { grid_power: ["g"], battery_power: ["b"], solar_power: ["pv"] },
    { g: st(-0.4, "kW"), b: st(-1000), pv: st(3100) },
  );
  const c = p._current();
  assert.equal(c.gridIn, 0);
  assert.equal(c.gridOut, 400);
  assert.equal(c.discharge, 0);
  assert.equal(c.charge, 1000);
  assert.equal(c.house, 1700);
});

test("inverting the sign", () => {
  const p = panel(
    { grid_power: ["g"], invert_grid: true, battery_power: ["b"], invert_battery: true },
    { g: st(500), b: st(300) },
  );
  const c = p._current();
  assert.equal(c.gridOut, 500);
  assert.equal(c.gridIn, 0);
  assert.equal(c.charge, 300);
});

test("separate and combined sensors are added", () => {
  const p = panel({ grid_import: ["gi"], grid_power: ["g"] }, { gi: st(200), g: st(300) });
  assert.equal(p._current().gridIn, 500);
});

test("grid charging of the storage is subtracted from direct PV", () => {
  const p = panel(
    { solar_power: ["pv"], grid_export: ["ge"], battery_charge: ["bc"], battery_grid_charge: ["bgc"], grid_import: ["gi"] },
    { pv: st(3100), ge: st(400), bc: st(1000), bgc: st(600), gi: st(600) },
  );
  const c = p._current();
  assert.equal(c.house, 2300);
  assert.equal(c.direct, 2300);
});

test("without a grid-charge sensor all charging counts as PV", () => {
  const p = panel(
    { solar_power: ["pv"], battery_charge: ["bc"], grid_import: ["gi"] },
    { pv: st(3000), bc: st(1000), gi: st(0) },
  );
  assert.equal(p._current().direct, 2000);
});

test("direct PV is never negative and never above house or PV", () => {
  const p = new Panel();
  assert.equal(p._calcDirect({ solar: 500, gridOut: 800, charge: 0 }, 1000), 0);
  assert.equal(p._calcDirect({ solar: 5000, gridOut: 0, charge: 0 }, 1200), 1200);
  assert.equal(p._calcDirect({ solar: null }, 1000), null);
});

test("a house consumption sensor takes precedence over the calculation", () => {
  const p = panel({ house_power: "h", grid_import: ["gi"] }, { h: st(1.5, "kW"), gi: st(100) });
  assert.equal(p._current().house, 1500);
});

test("unavailable sensors give null, not 0", () => {
  const p = panel({ grid_import: ["gi"], solar_power: ["pv"] }, { gi: st("unavailable"), pv: st("unknown") });
  const c = p._current();
  assert.equal(c.gridIn, null);
  assert.equal(c.house, null);
  assert.equal(c.solar, null);
});

test("house is never negative", () => {
  const p = panel({ grid_import: ["gi"], grid_export: ["ge"] }, { gi: st(0), ge: st(900) });
  assert.equal(p._current().house, 0);
});

test("source mix sums to 100 %", () => {
  const p = new Panel();
  const m = p._mix({ house: 3200, gridIn: 200, discharge: 500, direct: 2500 });
  assert.ok(Math.abs(m.solar + m.battery + m.grid - 1) < 1e-9);
  assert.equal(p._mix({ house: 0 }), null);
});

test("history: buckets are summed and the house is calculated", () => {
  const p = panel({ solar_power: ["a", "b"], grid_import: ["gi"] }, {});
  const t0 = 0, t1 = 3600 * 1000;
  const rows = (v) => [{ s: String(v), lu: 0 }];
  const pts = p._buildSeries({ a: rows(100), b: rows(200), gi: rows(50) }, t0, t1);
  assert.equal(pts.length, 13);
  assert.equal(pts[0].v, 350);
  assert.equal(pts[12].v, 350);
  assert.equal(pts[12].d, 300);
});

test("UI strings: English by default, German for German Home Assistant", () => {
  const p = new Panel();
  assert.equal(p._t("house"), "House");
  p._hass = { language: "de" };
  assert.equal(p._t("house"), "Haus");
  assert.equal(p._t("ofProduction", { pct: 74 }), "74 % der Erzeugung");
  p._hass = { language: "de-AT" };
  assert.equal(p._t("gridImport"), "Netzbezug");
  p._hass = { language: "fr" };
  assert.equal(p._t("gridImport"), "Grid import");
});

const dev = (name, w) => ({ state: String(w), attributes: { unit_of_measurement: "W", friendly_name: name } });

test("devices are sorted by power, use friendly names and skip unavailable ones", () => {
  const p = panel(
    { device_power: ["a", "b", "c", "d"] },
    { a: dev("Fridge", 90), b: dev("Oven", 2500), c: { state: "unavailable", attributes: {} }, d: dev("TV", 120) },
  );
  assert.deepEqual(p._devices().map((d) => [d.name, d.w]), [["Oven", 2500], ["TV", 120], ["Fridge", 90]]);
});

test("device card: unmeasured rest, idle devices and no card without devices", () => {
  const p = panel(
    { device_power: ["a", "b", "c"] },
    { a: dev("Heat pump", 800), b: dev("Fridge", 100), c: dev("TV", 2) },
  );
  const html = p._renderDevices(1500);
  assert.match(html, /Heat pump/);
  assert.match(html, /Other \(not measured\)/);
  assert.match(html, /1 idle/);
  assert.doesNotMatch(html, /TV/);
  assert.equal(panel({}, {})._renderDevices(1000), "");
});

test("device card without unmeasured rest when devices explain the house", () => {
  const p = panel({ device_power: ["a"] }, { a: dev("Heat pump", 1000) });
  assert.doesNotMatch(p._renderDevices(1000), /not measured/);
  assert.doesNotMatch(p._renderDevices(null), /not measured/);
});

test("device names are HTML-escaped", () => {
  const p = panel({ device_power: ["a"] }, { a: dev('<img src=x onerror="x">', 100) });
  assert.doesNotMatch(p._renderDevices(200), /<img/);
});

function settingsPanel(config, { admin = true, states = {} } = {}) {
  const p = new Panel();
  p._config = config;
  p._hass = { user: { is_admin: admin }, states };
  p._draft = p._normalize(config);
  p._ready = true;
  return p;
}

test("settings: normalize turns strings into lists and fills defaults", () => {
  const p = new Panel();
  const n = p._normalize({ grid_import: "sensor.gi", house_power: "", invert_grid: 1 });
  assert.deepEqual(n.grid_import, ["sensor.gi"]);
  assert.deepEqual(n.solar_power, []);
  assert.equal(n.house_power, null);
  assert.equal(n.invert_grid, true);
  assert.equal(n.invert_battery, false);
});

test("settings: add and remove sensors (multi, single and house sensor)", () => {
  const p = settingsPanel({ grid_import: ["a"], solar_power: ["pv1"] });
  p._draftAdd("solar_power", "pv2", "multi");
  p._draftAdd("solar_power", "pv2", "multi");
  assert.deepEqual(p._draft.solar_power, ["pv1", "pv2"]);
  p._draftAdd("grid_import", "b", "single");
  assert.deepEqual(p._draft.grid_import, ["b"]);
  p._draftAdd("house_power", "h", "single");
  assert.equal(p._draft.house_power, "h");
  assert.deepEqual(p._draftList("house_power"), ["h"]);
  p._draftRemove("house_power", "h");
  assert.equal(p._draft.house_power, null);
  p._draftRemove("solar_power", "pv1");
  assert.deepEqual(p._draft.solar_power, ["pv2"]);
});

test("settings: dirty detection and save is blocked without a source", () => {
  const p = settingsPanel({ grid_import: ["a"] });
  assert.equal(p._isDirty(), false);
  assert.equal(p._saveDisabled(), true); // nothing changed
  p._draftAdd("device_power", "oven", "multi");
  assert.equal(p._isDirty(), true);
  assert.equal(p._saveDisabled(), false);
  p._draftRemove("grid_import", "a");
  assert.equal(p._hasSource(), false);
  assert.equal(p._saveDisabled(), true);
  p._draftAdd("grid_power", "g", "multi");
  assert.equal(p._hasSource(), true);
});

test("settings: only administrators can save", () => {
  const p = settingsPanel({ grid_import: ["a"] }, { admin: false });
  p._draftAdd("device_power", "oven", "multi");
  assert.equal(p._isAdmin, false);
  assert.equal(p._saveDisabled(), true);
  const html = p._renderSettings();
  assert.doesNotMatch(html, /data-save/);
  assert.doesNotMatch(html, /data-add=/);
  assert.match(html, /Only administrators/);
});

test("settings: only power sensors are offered and names are escaped", () => {
  const states = {
    "sensor.p": { state: "1", attributes: { device_class: "power", friendly_name: '<b>"P"</b>' } },
    "sensor.t": { state: "1", attributes: { device_class: "temperature" } },
    "light.l": { state: "on", attributes: { device_class: "power" } },
  };
  const p = settingsPanel({ grid_import: ["sensor.p"] }, { states });
  assert.deepEqual(p._candidates().map((c) => c.id), ["sensor.p"]);
  const html = p._renderSettings();
  assert.doesNotMatch(html, /<b>/);
  assert.match(html, /&lt;b&gt;/);
});

const power = (name = "x") => ({ state: "10", attributes: { device_class: "power", unit_of_measurement: "W", friendly_name: name } });

function discoverPanel(config, states) {
  const p = new Panel();
  p._config = config;
  p._hass = { states };
  return p;
}

test("patterns: *_leistung finds every power sensor ending in _leistung", () => {
  const p = discoverPanel(
    { device_patterns: ["*_leistung"] },
    {
      "sensor.backofen_leistung": power(),
      "sensor.mikrowelle_leistung": power(),
      "sensor.leistung_total": power(), // does not end in _leistung
      "sensor.tv_verbrauch": power(),
    },
  );
  assert.deepEqual(p._discoverDevices(["*_leistung"]), ["sensor.backofen_leistung", "sensor.mikrowelle_leistung"]);
});

test("patterns: only sensor entities with device_class power count", () => {
  const states = {
    "sensor.a_leistung": power(),
    "sensor.b_leistung": { state: "1", attributes: { device_class: "temperature" } },
    "sensor.c_leistung": { state: "1", attributes: {} },
    "switch.d_leistung": power(),
  };
  assert.deepEqual(discoverPanel({}, states)._discoverDevices(["*_leistung"]), ["sensor.a_leistung"]);
});

test("patterns: sensors of the energy balance are never listed as devices", () => {
  const cfg = { solar_power: ["sensor.pv_leistung"], grid_import: ["sensor.netz_leistung"], house_power: "sensor.haus_leistung" };
  const states = {
    "sensor.pv_leistung": power(),
    "sensor.netz_leistung": power(),
    "sensor.haus_leistung": power(),
    "sensor.herd_leistung": power(),
  };
  assert.deepEqual(discoverPanel(cfg, states)._discoverDevices(["*_leistung"], cfg), ["sensor.herd_leistung"]);
});

test("patterns: wildcard rules, full ids, case and regex characters", () => {
  const states = { "sensor.k1_power": power(), "sensor.k22_power": power(), "sensor.kitchen_power": power(), "sensor.a+b_power": power() };
  const p = discoverPanel({}, states);
  assert.deepEqual(p._discoverDevices(["k?_power"]), ["sensor.k1_power"]);
  assert.deepEqual(p._discoverDevices(["sensor.k*"]), ["sensor.k1_power", "sensor.k22_power", "sensor.kitchen_power"]);
  assert.deepEqual(p._discoverDevices(["KITCHEN*"]), ["sensor.kitchen_power"]);
  assert.deepEqual(p._discoverDevices(["a+b*"]), ["sensor.a+b_power"]);
  assert.deepEqual(p._discoverDevices(["a.b*"]), []); // "." is a literal dot, not a wildcard
  assert.deepEqual(p._discoverDevices([]), []);
});

test("patterns: devices combine patterns and explicit sensors without duplicates", () => {
  const p = discoverPanel(
    { device_patterns: ["*_leistung"], device_power: ["sensor.herd_leistung", "sensor.kuehlschrank_power"] },
    {
      "sensor.herd_leistung": { state: "2000", attributes: { device_class: "power", unit_of_measurement: "W", friendly_name: "Herd" } },
      "sensor.ofen_leistung": { state: "800", attributes: { device_class: "power", unit_of_measurement: "W", friendly_name: "Ofen" } },
      "sensor.kuehlschrank_power": { state: "90", attributes: { friendly_name: "Kühlschrank" } },
    },
  );
  assert.deepEqual(p._devices().map((d) => d.name), ["Herd", "Ofen", "Kühlschrank"]);
});

test("patterns: the device card shows up with only patterns configured", () => {
  const p = discoverPanel({ device_patterns: ["*_leistung"] }, { "sensor.a_leistung": { state: "300", attributes: { device_class: "power", unit_of_measurement: "W", friendly_name: "A" } } });
  assert.match(p._renderDevices(500), /A/);
});

test("settings: patterns are validated, lowercased and previewed", () => {
  const states = { "sensor.herd_leistung": power("Herd") };
  const p = settingsPanel({ grid_import: ["sensor.g"] }, { states });
  p._edited = () => {}; // no shadow DOM in this test
  p._onChange({ target: { dataset: { add: "device_patterns", mode: "text" }, value: " *_Leistung " } });
  assert.deepEqual(p._draft.device_patterns, ["*_leistung"]);
  p._onChange({ target: { dataset: { add: "device_patterns", mode: "text" }, value: "bad pattern" } });
  assert.deepEqual(p._draft.device_patterns, ["*_leistung"]);
  assert.match(p._fieldError.device_patterns, /Only letters/);
  const html = p._renderSettings();
  assert.match(html, /1 matching/);
  assert.match(html, /Herd/);
});

test("exclude: excluded sensors are not added by a pattern", () => {
  const states = { "sensor.a_leistung": power("A"), "sensor.b_leistung": power("B"), "sensor.c_leistung": power("C") };
  const cfg = { device_patterns: ["*_leistung"], device_exclude: ["sensor.b_leistung"] };
  const p = discoverPanel(cfg, states);
  assert.deepEqual(p._discoverDevices(cfg.device_patterns, cfg), ["sensor.a_leistung", "sensor.c_leistung"]);
  assert.deepEqual(p._devices().map((d) => d.name), ["A", "C"].sort());
});

test("exclude: sensors picked explicitly stay in the list even if excluded", () => {
  const states = { "sensor.a_leistung": power("A"), "sensor.b_leistung": power("B") };
  const p = discoverPanel(
    { device_patterns: ["*_leistung"], device_exclude: ["sensor.a_leistung", "sensor.b_leistung"], device_power: ["sensor.b_leistung"] },
    states,
  );
  assert.deepEqual(p._devices().map((d) => d.name), ["B"]);
});

function matchPanel(admin = true) {
  const states = {
    "sensor.herd_leistung": power("Herd"),
    "sensor.ofen_leistung": power("Ofen"),
    "sensor.licht_flur_leistung": power("Licht Flur"),
    "sensor.licht_bad_leistung": power("Licht Bad"),
  };
  const p = settingsPanel({ grid_import: ["sensor.g"], device_patterns: ["*_leistung"] }, { admin, states });
  p._edited = () => {}; // no shadow DOM in this test
  return p;
}
const checkbox = (id, checked) => ({ target: { dataset: { device: id }, checked } });
const click = (sel, data = {}) => ({ target: { closest: (s) => (s === sel ? { dataset: data } : null) } });

test("matches: unticking a match excludes it, ticking brings it back", () => {
  const p = matchPanel();
  p._onChange(checkbox("sensor.ofen_leistung", false));
  p._onChange(checkbox("sensor.ofen_leistung", false)); // no duplicate
  assert.deepEqual(p._draft.device_exclude, ["sensor.ofen_leistung"]);
  assert.deepEqual(p._discoverDevices(p._draft.device_patterns, p._draft), ["sensor.herd_leistung", "sensor.licht_bad_leistung", "sensor.licht_flur_leistung"]);
  p._onChange(checkbox("sensor.ofen_leistung", true));
  assert.deepEqual(p._draft.device_exclude, []);
});

test("matches: excluded sensors stay in the list (unticked) so they can be re-included", () => {
  const p = matchPanel();
  p._onChange(checkbox("sensor.ofen_leistung", false));
  const html = p._renderSettings();
  assert.match(html, /4 matching, 1 excluded/);
  const box = (id) => html.match(new RegExp(`<input type="checkbox" data-device="${id}"[^>]*>`))[0];
  assert.doesNotMatch(box("sensor.ofen_leistung"), /checked/);
  assert.match(box("sensor.herd_leistung"), /checked/);
  assert.match(html, /mrow ex/);
});

test("matches: filter narrows the list and bulk actions only touch the shown sensors", () => {
  const p = matchPanel();
  p._filter = "licht";
  assert.deepEqual(p._matchList().shown, ["sensor.licht_bad_leistung", "sensor.licht_flur_leistung"]);
  p._onClick(click("[data-bulk]", { bulk: "exclude" }));
  assert.deepEqual(p._draft.device_exclude.sort(), ["sensor.licht_bad_leistung", "sensor.licht_flur_leistung"]);
  p._filter = "";
  p._onChange(checkbox("sensor.ofen_leistung", false));
  p._filter = "licht";
  p._onClick(click("[data-bulk]", { bulk: "include" }));
  assert.deepEqual(p._draft.device_exclude, ["sensor.ofen_leistung"]); // only the shown ones came back
});

test("matches: the filter also finds sensors by entity id", () => {
  const p = matchPanel();
  p._filter = "ofen_leis";
  assert.deepEqual(p._matchList().shown, ["sensor.ofen_leistung"]);
  p._filter = "nothing";
  assert.deepEqual(p._matchList().shown, []);
  assert.match(p._renderMatchRows(false), /No power sensor matches yet/);
});

test("matches: administrators only", () => {
  const p = matchPanel(false);
  p._onChange(checkbox("sensor.ofen_leistung", false));
  p._onClick(click("[data-bulk]", { bulk: "exclude" }));
  assert.deepEqual(p._draft.device_exclude, []);
  const html = p._renderSettings();
  assert.doesNotMatch(html, /data-bulk/);
  assert.match(html, /disabled/);
});

test("device card: only the strongest devices show, the rest folds away", () => {
  const states = {};
  const ids = [];
  for (let i = 1; i <= 12; i++) {
    ids.push(`sensor.d${i}`);
    states[`sensor.d${i}`] = { state: String(i * 100), attributes: { unit_of_measurement: "W", friendly_name: `Dev ${i}` } };
  }
  const p = discoverPanel({ device_power: ids }, states);
  let html = p._renderDevices(null);
  assert.equal((html.match(/class="dev"/g) || []).length, 8);
  assert.match(html, /Dev 12/);
  assert.doesNotMatch(html, /Dev 4</);
  assert.match(html, /Show all 12/);
  p._onClick(click("[data-devtoggle]"));
  html = p._renderDevices(null);
  assert.equal((html.match(/class="dev"/g) || []).length, 12);
  assert.match(html, /Show less/);
});

test("device card: no toggle for a short list and the unmeasured rest is always shown", () => {
  const states = {};
  for (let i = 1; i <= 10; i++) states[`sensor.d${i}`] = { state: String(i * 100), attributes: { unit_of_measurement: "W", friendly_name: `Dev ${i}` } };
  const p = discoverPanel({ device_power: Object.keys(states) }, states);
  assert.match(p._renderDevices(9000), /Other \(not measured\)/); // folded list still shows the rest row
  const short = discoverPanel({ device_power: ["sensor.d1", "sensor.d2"] }, states);
  assert.doesNotMatch(short._renderDevices(null), /data-devtoggle/);
});

function excludePatternPanel(extra = {}) {
  const states = {
    "sensor.backofen_leistung": power("Backofen"),
    "sensor.alpha_ess_string_1_leistung": power("String 1"),
    "sensor.alpha_ess_string_2_leistung": power("String 2"),
    "sensor.abzugshaube_leistung": power("Abzugshaube"),
  };
  return discoverPanel({ device_patterns: ["*_leistung"], device_exclude_patterns: ["alpha_ess_*"], ...extra }, states);
}

test("exclude patterns: matching sensors are left out of the device list", () => {
  const p = excludePatternPanel();
  assert.deepEqual(p._discoverDevices(p._cfg.device_patterns, p._cfg), ["sensor.abzugshaube_leistung", "sensor.backofen_leistung"]);
  assert.deepEqual(p._devices().map((d) => d.name).sort(), ["Abzugshaube", "Backofen"]);
});

test("exclude patterns: combine with the exclude list and explicitly picked sensors stay", () => {
  const p = excludePatternPanel({ device_exclude: ["sensor.backofen_leistung"], device_power: ["sensor.alpha_ess_string_1_leistung"] });
  assert.deepEqual(p._devices().map((d) => d.name).sort(), ["Abzugshaube", "String 1"]);
});

test("exclude patterns: wildcards, full ids and case", () => {
  const p = excludePatternPanel({ device_exclude_patterns: ["*_STRING_?_leistung", "sensor.back*"] });
  assert.deepEqual(p._discoverDevices(["*_leistung"], p._cfg), ["sensor.abzugshaube_leistung"]);
});

test("exclude patterns: ignoreExclude lists every match", () => {
  const p = excludePatternPanel({ device_exclude: ["sensor.backofen_leistung"] });
  assert.equal(p._discoverDevices(["*_leistung"], p._cfg, { ignoreExclude: true }).length, 4);
});

test("exclude patterns: the settings list shows them excluded and locked", () => {
  const p = excludePatternPanel();
  p._hass.user = { is_admin: true };
  p._draft = p._normalize(p._cfg);
  p._ready = true;
  const html = p._renderSettings();
  assert.match(html, /4 matching, 2 excluded/);
  const box = (id) => html.match(new RegExp(`<input type="checkbox" data-device="${id}"[^>]*>`))[0];
  assert.match(box("sensor.alpha_ess_string_1_leistung"), /disabled/);
  assert.doesNotMatch(box("sensor.alpha_ess_string_1_leistung"), /checked/);
  assert.match(box("sensor.backofen_leistung"), /checked/);
  assert.doesNotMatch(box("sensor.backofen_leistung"), /disabled/);
  assert.match(html, /Excluded by an exclude pattern/);
});

test("exclude patterns: bulk exclude skips sensors already excluded by a pattern", () => {
  const p = excludePatternPanel();
  p._hass.user = { is_admin: true };
  p._draft = p._normalize(p._cfg);
  p._edited = () => {};
  p._onClick({ target: { closest: (sel) => (sel === "[data-bulk]" ? { dataset: { bulk: "exclude" } } : null) } });
  assert.deepEqual(p._draft.device_exclude.sort(), ["sensor.abzugshaube_leistung", "sensor.backofen_leistung"]);
});

test("exclude patterns: input is validated and stored in lowercase", () => {
  const p = excludePatternPanel();
  p._hass.user = { is_admin: true };
  p._draft = p._normalize(p._cfg);
  p._edited = () => {};
  const add = (value) => p._onChange({ target: { dataset: { add: "device_exclude_patterns", mode: "text" }, value } });
  add(" Foo_* ");
  assert.deepEqual(p._draft.device_exclude_patterns, ["alpha_ess_*", "foo_*"]);
  add("no spaces");
  assert.deepEqual(p._draft.device_exclude_patterns, ["alpha_ess_*", "foo_*"]);
  assert.ok(p._fieldError.device_exclude_patterns);
  p._onClick({ target: { closest: () => null } }); // any other action clears the message
  assert.deepEqual(p._fieldError, {});
});

test("device card: the share of the house power is shown next to the value", () => {
  const p = discoverPanel(
    { device_power: ["sensor.a", "sensor.b"] },
    {
      "sensor.a": { state: "1400", attributes: { unit_of_measurement: "W", friendly_name: "Wallbox" } },
      "sensor.b": { state: "100", attributes: { unit_of_measurement: "W", friendly_name: "Router" } },
    },
  );
  const html = p._renderDevices(2000);
  assert.match(html, /Wallbox[\s\S]*?<small class="pct">70 %<\/small>/);
  assert.match(html, /Router[\s\S]*?<small class="pct">5 %<\/small>/);
  // the unmeasured rest has a share too: 2000 - 1500 = 500 W = 25 %
  assert.match(html, /Other \(not measured\)[\s\S]*?<small class="pct">25 %<\/small>/);
  assert.match(html, /title="70 % of house"/);
});

test("device card: no percentage when the house power is unknown", () => {
  const p = discoverPanel(
    { device_power: ["sensor.a"] },
    { "sensor.a": { state: "1400", attributes: { unit_of_measurement: "W", friendly_name: "Wallbox" } } },
  );
  assert.doesNotMatch(p._renderDevices(null), /class="pct"/);
  assert.doesNotMatch(p._renderDevices(0), /class="pct"/);
});

function areaPanel(config = { device_patterns: ["*_leistung"] }, registry = {}) {
  const dev = (name, w) => ({ state: String(w), attributes: { device_class: "power", unit_of_measurement: "W", friendly_name: name } });
  const states = {
    "sensor.herd_leistung": dev("Herd", 21),
    "sensor.kuehl_leistung": dev("Kühlschrank", 11),
    "sensor.media_leistung": dev("Media", 124),
    "sensor.server_leistung": dev("Server", 88),
    "sensor.wallbox_leistung": dev("Wallbox", 1400),
    "sensor.keller_leistung": dev("Keller-Pumpe", 0),
  };
  const p = discoverPanel(config, states);
  p._hass.entities = registry.entities ?? {
    "sensor.herd_leistung": { area_id: "kueche" },
    "sensor.kuehl_leistung": { area_id: "kueche" },
    "sensor.media_leistung": { area_id: "wohnzimmer" },
    "sensor.server_leistung": { device_id: "d1" }, // area comes from the device
    "sensor.keller_leistung": { area_id: "keller" },
  };
  p._hass.devices = registry.devices ?? { d1: { area_id: "technik" } };
  p._hass.areas = registry.areas ?? { kueche: { name: "Küche" }, wohnzimmer: { name: "Wohnzimmer" }, technik: { name: "Technik" }, keller: { name: "Keller" } };
  return p;
}

test("areas: the device list is summed up per area (own area or the area of the device)", () => {
  const byName = Object.fromEntries(areaPanel()._areas().map((a) => [a.name, a]));
  assert.equal(byName["Küche"].w, 32);
  assert.equal(byName["Küche"].n, 2);
  assert.equal(byName["Wohnzimmer"].w, 124);
  assert.equal(byName["Technik"].w, 88); // via the device
  assert.equal(byName["No area"].w, 1400);
  assert.equal(byName["No area"].none, true);
});

test("areas: an entity's own area wins over the area of its device", () => {
  const p = areaPanel(undefined, {
    entities: { "sensor.server_leistung": { area_id: "keller", device_id: "d1" } },
    devices: { d1: { area_id: "technik" } },
  });
  const names = p._areas().map((a) => a.name);
  assert.ok(names.includes("Keller"));
  assert.ok(!names.includes("Technik"));
});

test("areas: uses the same filters as the devices", () => {
  const p = areaPanel({ device_patterns: ["*_leistung"], device_exclude: ["sensor.media_leistung"], device_exclude_patterns: ["sensor.wallbox*"] });
  const byName = Object.fromEntries(p._areas().map((a) => [a.name, a.w]));
  assert.equal(byName["Wohnzimmer"], undefined); // Media excluded
  assert.equal(byName["No area"], undefined); // Wallbox excluded by pattern
  assert.equal(byName["Küche"], 32);
});

test("areas: card lists areas strongest first, with the device count, share and \"No area\" last", () => {
  const html = areaPanel()._renderAreas(2000);
  assert.match(html, /Areas/);
  const order = ["Wohnzimmer", "Technik", "Küche", "No area"].map((n) => html.indexOf(n));
  assert.ok(order.every((i) => i > -1));
  assert.deepEqual([...order].sort((a, b) => a - b), order); // Wohnzimmer, Technik, Küche, No area
  assert.match(html, /2 devices/);
  assert.match(html, /1 device</);
  assert.match(html, /Wohnzimmer[\s\S]*?<small class="pct">6 %<\/small>/);
  assert.match(html, /title="6 % of house · Media 124 W"/);
});

test("areas: idle areas are only counted", () => {
  const html = areaPanel()._renderAreas(2000);
  assert.doesNotMatch(html, /Keller</); // 0 W
  assert.match(html, /1 idle/);
});

test("areas: no card when no sensor belongs to an area or there are no devices", () => {
  assert.equal(areaPanel(undefined, { entities: {}, devices: {} })._renderAreas(2000), "");
  assert.equal(areaPanel({})._renderAreas(2000), "");
  const noRegistry = areaPanel();
  noRegistry._hass.entities = undefined;
  noRegistry._hass.devices = undefined;
  assert.equal(noRegistry._renderAreas(2000), "");
});

test("areas: the card folds like the device card and has its own toggle", () => {
  const states = {};
  const entities = {};
  const areas = {};
  for (let i = 1; i <= 12; i++) {
    states[`sensor.s${i}_leistung`] = { state: String(i * 100), attributes: { device_class: "power", unit_of_measurement: "W", friendly_name: `S${i}` } };
    entities[`sensor.s${i}_leistung`] = { area_id: `a${i}` };
    areas[`a${i}`] = { name: `Area ${i}` };
  }
  const p = discoverPanel({ device_patterns: ["*_leistung"] }, states);
  p._hass.entities = entities;
  p._hass.devices = {};
  p._hass.areas = areas;
  let html = p._renderAreas(null);
  assert.equal((html.match(/class="dev"/g) || []).length, 8);
  assert.match(html, /data-areatoggle/);
  assert.match(html, /Show all 12/);
  p._onClick({ target: { closest: (s) => (s === "[data-areatoggle]" ? {} : null) } });
  html = p._renderAreas(null);
  assert.equal((html.match(/class="dev"/g) || []).length, 12);
  assert.doesNotMatch(html, /<small class="pct">/); // house power unknown
});

test("areas: area names are HTML-escaped", () => {
  const p = areaPanel(undefined, { areas: { kueche: { name: '<img src=x onerror="x">' }, wohnzimmer: { name: "W" }, technik: { name: "T" }, keller: { name: "K" } } });
  p._hass.entities["sensor.herd_leistung"] = { area_id: "kueche" };
  assert.doesNotMatch(p._renderAreas(2000), /<img/);
});

function filterPanel() {
  const dev = (name, w) => ({ state: String(w), attributes: { device_class: "power", unit_of_measurement: "W", friendly_name: name } });
  const states = {
    "sensor.a_leistung": dev("A", 500), // active
    "sensor.b_leistung": dev("B", 120), // active
    "sensor.c_leistung": dev("C", 2), // inactive
    "sensor.d_leistung": dev("D", 0), // inactive
    "sensor.e_leistung": { state: "unavailable", attributes: { device_class: "power", friendly_name: "E" } }, // no value
  };
  const p = settingsPanel({ grid_import: ["sensor.g"], device_patterns: ["*_leistung"], device_exclude: ["sensor.b_leistung"], device_exclude_patterns: ["d_*"] }, { states });
  p._edited = () => {};
  return p;
}
const seg = (value) => ({ target: { closest: (s) => (s === "[data-seg]" ? { dataset: { seg: value } } : null) } });

test("list filters: counts for active, inactive, included and excluded", () => {
  const { counts } = filterPanel()._matchList();
  assert.deepEqual(counts, { all: 5, active: 2, idle: 3, included: 3, excluded: 2 });
});

test("list filters: activity filter (inactive also covers sensors without a value)", () => {
  const p = filterPanel();
  p._onClick(seg("state:active"));
  assert.deepEqual(p._matchList().shown, ["sensor.a_leistung", "sensor.b_leistung"]);
  p._onClick(seg("state:idle"));
  assert.deepEqual(p._matchList().shown, ["sensor.c_leistung", "sensor.d_leistung", "sensor.e_leistung"]);
  p._onClick(seg("state:all"));
  assert.equal(p._matchList().shown.length, 5);
});

test("list filters: selection filter (excluded by list or by pattern)", () => {
  const p = filterPanel();
  p._onClick(seg("sel:excluded"));
  assert.deepEqual(p._matchList().shown, ["sensor.b_leistung", "sensor.d_leistung"]);
  p._onClick(seg("sel:included"));
  assert.deepEqual(p._matchList().shown, ["sensor.a_leistung", "sensor.c_leistung", "sensor.e_leistung"]);
});

test("list filters: the filters combine with each other and with the text filter", () => {
  const p = filterPanel();
  p._onClick(seg("state:idle"));
  p._onClick(seg("sel:included"));
  assert.deepEqual(p._matchList().shown, ["sensor.c_leistung", "sensor.e_leistung"]);
  p._filter = "c_leis";
  assert.deepEqual(p._matchList().shown, ["sensor.c_leistung"]);
  p._filter = "";
  p._onClick(seg("state:active"));
  p._onClick(seg("sel:excluded"));
  assert.deepEqual(p._matchList().shown, ["sensor.b_leistung"]);
});

test("list filters: bulk exclude acts on what the filters show, e.g. all inactive sensors", () => {
  const p = filterPanel();
  p._onClick(seg("state:idle"));
  p._onClick({ target: { closest: (s) => (s === "[data-bulk]" ? { dataset: { bulk: "exclude" } } : null) } });
  // c and e are new, d is already excluded by a pattern and not copied into the list, b was there before
  assert.deepEqual(p._draft.device_exclude.sort(), ["sensor.b_leistung", "sensor.c_leistung", "sensor.e_leistung"]);
  p._onClick(seg("state:all"));
  assert.deepEqual(p._matchList().counts, { all: 5, active: 2, idle: 3, included: 1, excluded: 4 });
});

test("list filters: the buttons show the counts and mark the chosen filters", () => {
  const p = filterPanel();
  p._onClick(seg("state:active"));
  const html = p._renderSettings();
  assert.match(html, /class="seg on" data-seg="state:active"[^>]*>Active <small>2<\/small>/);
  assert.match(html, /class="seg" data-seg="state:idle"[^>]*>Inactive <small>3<\/small>/);
  assert.match(html, /class="seg on" data-seg="sel:all"[^>]*>All <small>5<\/small>/);
  assert.match(html, /Activity/);
  assert.match(html, /Selection/);
});

test("list filters: also usable by non-admins (they only change the view)", () => {
  const p = filterPanel();
  p._hass.user = { is_admin: false };
  p._onClick(seg("state:active"));
  assert.equal(p._matchList().shown.length, 2);
});

function labelPanel(config = { label_ids: ["klima", "licht"], device_patterns: ["*_leistung"] }) {
  const dev = (name, w) => ({ state: String(w), attributes: { device_class: "power", unit_of_measurement: "W", friendly_name: name } });
  const states = {
    "sensor.klimaanlage_leistung": dev("Klimaanlage", 900),
    "sensor.lueftung_leistung": dev("Lüftung", 120),
    "sensor.split": dev("Split", 600), // no *_leistung name, the label decides
    "sensor.klima_alt_leistung": dev("Alt", 500),
    "sensor.netz_leistung": dev("Netz", 4000),
    "sensor.licht_flur_leistung": dev("Licht Flur", 15),
    "sensor.temperatur": { state: "21", attributes: { device_class: "temperature", friendly_name: "Temp" } },
  };
  const p = discoverPanel({ grid_import: ["sensor.netz_leistung"], device_exclude: ["sensor.klima_alt_leistung"], ...config }, states);
  p._labelData = {
    labels: [
      { label_id: "klima", name: "Klima", color: "blue" },
      { label_id: "licht", name: "Licht", color: null },
      { label_id: "unbenutzt", name: "Unbenutzt", color: null },
    ],
    entities: {
      "sensor.klimaanlage_leistung": ["klima"],
      "sensor.lueftung_leistung": ["klima"],
      "sensor.split": ["klima"],
      "sensor.klima_alt_leistung": ["klima"],
      "sensor.netz_leistung": ["klima"],
      "sensor.licht_flur_leistung": ["licht"],
      "sensor.temperatur": ["klima"],
    },
  };
  return p;
}

test("labels: the power sensors of a label are summed up", () => {
  const groups = labelPanel()._labelGroups();
  const klima = groups.find((g) => g.name === "Klima");
  assert.equal(klima.w, 900 + 120 + 600);
  assert.equal(klima.n, 3);
  assert.equal(groups.find((g) => g.name === "Licht").w, 15);
});

test("labels: same exclusions as the devices, but no name pattern is needed", () => {
  const members = labelPanel()._labelMembers("klima");
  assert.ok(members.includes("sensor.split")); // name does not match *_leistung
  assert.ok(!members.includes("sensor.klima_alt_leistung")); // on the exclude list
  assert.ok(!members.includes("sensor.netz_leistung")); // sensor of the energy balance
  assert.ok(!members.includes("sensor.temperatur")); // not a power sensor
  const withPattern = labelPanel({ label_ids: ["klima"], device_exclude_patterns: ["klima*", "lueft*"] })._labelMembers("klima");
  assert.deepEqual(withPattern, ["sensor.split"]);
});

test("labels: only selected labels that still exist are shown", () => {
  assert.deepEqual(labelPanel({ label_ids: ["licht", "geloescht"] })._labelGroups().map((g) => g.name), ["Licht"]);
  assert.deepEqual(labelPanel({ label_ids: [] })._labelGroups(), []);
  assert.equal(labelPanel({ label_ids: [] })._renderLabels(2000), "");
  const noData = labelPanel();
  noData._labelData = null;
  assert.equal(noData._renderLabels(2000), "");
});

test("labels: card with sums, shares, sensor counts, colors and tooltips", () => {
  const html = labelPanel()._renderLabels(2000);
  assert.match(html, /Labels/);
  assert.match(html, /Klima[\s\S]*?3 power sensors/);
  assert.match(html, /<small class="pct">81 %<\/small>/); // 1620 of 2000 W
  assert.match(html, /Licht[\s\S]*?1 power sensor</);
  assert.ok(html.indexOf("Klima") < html.indexOf("Licht")); // strongest first
  assert.match(html, /var\(--blue-color/);
  assert.match(html, /title="81 % of house · Klimaanlage 900 W/);
});

test("labels: the card folds like the others and has its own toggle", () => {
  const ids = Array.from({ length: 10 }, (_, i) => `l${i}`);
  const p = labelPanel({ label_ids: ids });
  p._labelData.labels = ids.map((id, i) => ({ label_id: id, name: `Label ${i}`, color: null }));
  p._labelData.entities = {};
  ids.forEach((id, i) => {
    p._hass.states[`sensor.x${i}_leistung`] = { state: String((i + 1) * 100), attributes: { device_class: "power", unit_of_measurement: "W", friendly_name: `X${i}` } };
    p._labelData.entities[`sensor.x${i}_leistung`] = [id];
  });
  let html = p._renderLabels(null);
  assert.equal((html.match(/class="dev"/g) || []).length, 8);
  assert.match(html, /data-labeltoggle/);
  p._onClick({ target: { closest: (s) => (s === "[data-labeltoggle]" ? {} : null) } });
  html = p._renderLabels(null);
  assert.equal((html.match(/class="dev"/g) || []).length, 10);
});

test("labels: the settings list shows the existing labels with their sensor counts", () => {
  const p = labelPanel();
  p._hass.user = { is_admin: true };
  p._draft = p._normalize(p._cfg);
  p._ready = true;
  const html = p._renderSettings();
  assert.match(html, /data-label="klima" checked/);
  assert.doesNotMatch(html, /data-label="unbenutzt"/); // no power sensors, so it is not offered
  // same count as the card: klimaanlage, lüftung, split (the excluded and the grid sensor do not count)
  assert.match(html, /Klima<\/span><\/span><span class="mi">3 power sensors · 1\.6 kW/);
  assert.match(html, /Licht<\/span><\/span><span class="mi">1 power sensor · 15 W</);
});

test("labels: ticking a label in the settings selects it", () => {
  const p = labelPanel({ label_ids: [] });
  p._hass.user = { is_admin: true };
  p._draft = p._normalize(p._cfg);
  p._edited = () => {};
  p._onChange({ target: { dataset: { label: "klima" }, checked: true } });
  p._onChange({ target: { dataset: { label: "klima" }, checked: true } });
  assert.deepEqual(p._draft.label_ids, ["klima"]);
  p._onChange({ target: { dataset: { label: "klima" }, checked: false } });
  assert.deepEqual(p._draft.label_ids, []);
});

test("labels: read-only for non-admins, hint when no labels exist, escaped names", () => {
  const ro = labelPanel();
  ro._hass.user = { is_admin: false };
  ro._draft = ro._normalize(ro._cfg);
  ro._ready = true;
  assert.match(ro._renderSettings().match(/<input type="checkbox" data-label="klima"[^>]*>/)[0], /disabled/);
  ro._edited = () => {};
  ro._onChange({ target: { dataset: { label: "licht" }, checked: true } });
  assert.deepEqual(ro._draft.label_ids, ["klima", "licht"]); // unchanged

  const none = labelPanel();
  none._hass.user = { is_admin: true };
  none._draft = none._normalize(none._cfg);
  none._ready = true;
  none._labelData = { labels: [], entities: {} };
  assert.match(none._renderSettings(), /No labels exist in Home Assistant yet/);

  const evil = labelPanel();
  evil._hass.user = { is_admin: true };
  evil._draft = evil._normalize(evil._cfg);
  evil._ready = true;
  evil._labelData.labels = [{ label_id: "x", name: '<img src=x onerror="x">', color: 'red"><script>' }];
  const html = evil._renderSettings();
  assert.doesNotMatch(html, /<img/);
  assert.doesNotMatch(html, /<script>/);
});


function pickerPanel(selected = []) {
  const p = labelPanel({ label_ids: selected });
  p._hass.user = { is_admin: true };
  p._draft = p._normalize(p._cfg);
  p._ready = true;
  p._edited = () => {};
  return p;
}
const lseg = (value) => ({ target: { closest: (s) => (s === "[data-lseg]" ? { dataset: { lseg: value } } : null) } });
const names = (p) => p._labelPicker().shown.map((x) => x.label.name);

test("label picker: only labels with power sensors are offered", () => {
  const p = pickerPanel();
  assert.deepEqual(names(p), ["Klima", "Licht"]);
  assert.equal(p._labelPicker().counts.all, 2);
});

test("label picker: a selected label without power sensors stays so it can be unselected", () => {
  const p = pickerPanel(["unbenutzt"]);
  assert.deepEqual(names(p), ["Klima", "Licht", "Unbenutzt"]);
  const html = p._renderSettings();
  assert.match(html, /data-label="unbenutzt" checked/);
  p._onChange({ target: { dataset: { label: "unbenutzt" }, checked: false } });
  assert.deepEqual(names(p), ["Klima", "Licht"]);
});

test("label picker: hint when no label has power sensors", () => {
  const p = pickerPanel();
  p._labelData.entities = {};
  assert.match(p._renderSettings(), /No label has power sensors yet/);
});

test("label picker: activity filter uses the summed power of the label", () => {
  const p = pickerPanel();
  p._hass.states["sensor.licht_flur_leistung"].state = "2"; // Licht drops below 5 W
  assert.deepEqual(p._labelPicker().counts, { all: 2, active: 1, idle: 1, selected: 0, unselected: 2 });
  p._onClick(lseg("state:active"));
  assert.deepEqual(names(p), ["Klima"]);
  p._onClick(lseg("state:idle"));
  assert.deepEqual(names(p), ["Licht"]);
  p._onClick(lseg("state:all"));
  assert.deepEqual(names(p), ["Klima", "Licht"]);
});

test("label picker: selection filter and combination with the text filter", () => {
  const p = pickerPanel(["klima"]);
  p._onClick(lseg("sel:selected"));
  assert.deepEqual(names(p), ["Klima"]);
  p._onClick(lseg("sel:unselected"));
  assert.deepEqual(names(p), ["Licht"]);
  p._onClick(lseg("sel:all"));
  p._lFilter = "lic";
  assert.deepEqual(names(p), ["Licht"]);
  p._onClick(lseg("state:idle"));
  assert.deepEqual(names(p), []);
  assert.match(p._renderLabelRows(false), /No label matches the filters/);
});

test("label picker: the filter also finds labels by their id", () => {
  const p = pickerPanel();
  p._labelData.labels[0].name = "Raumklima";
  p._lFilter = "klima";
  assert.deepEqual(names(p), ["Raumklima"]);
});

test("label picker: buttons show counts and mark the chosen filter, read-only for non-admins still filters", () => {
  const p = pickerPanel(["klima"]);
  p._onClick(lseg("sel:selected"));
  const html = p._renderSettings();
  assert.match(html, /class="seg on" data-lseg="sel:selected"[^>]*>Selected <small>1<\/small>/);
  assert.match(html, /class="seg" data-lseg="sel:unselected"[^>]*>Not selected <small>1<\/small>/);
  assert.match(html, /data-lfilter/);
  assert.match(html, /id="llist"/);
  p._hass.user = { is_admin: false };
  p._onClick(lseg("sel:all"));
  assert.equal(names(p).length, 2);
});


function withIcons(fn) {
  globalThis.haIcon = true;
  try {
    fn();
  } finally {
    globalThis.haIcon = false;
  }
}

test("icons: areas show their Home Assistant icon, with defaults for areas without one and for no area", () => {
  withIcons(() => {
    const p = areaPanel(undefined, {
      areas: { kueche: { name: "Küche", icon: "mdi:silverware-fork-knife" }, wohnzimmer: { name: "Wohnzimmer" }, technik: { name: "Technik" }, keller: { name: "Keller" } },
    });
    const html = p._renderAreas(2000);
    assert.match(html, /<ha-icon class="ico" icon="mdi:silverware-fork-knife"><\/ha-icon><span class="nt">Küche/);
    assert.match(html, /<ha-icon class="ico" icon="mdi:texture-box"><\/ha-icon><span class="nt">Wohnzimmer/); // no icon set
    assert.match(html, /<ha-icon class="ico" icon="mdi:help-circle-outline"><\/ha-icon><span class="nt">No area/);
  });
});

test("icons: labels show their icon tinted with the label color, default mdi:label", () => {
  withIcons(() => {
    const p = labelPanel();
    p._labelData.labels[0].icon = "mdi:snowflake"; // Klima, color blue
    const html = p._renderLabels(2000);
    assert.match(html, /<ha-icon class="ico" icon="mdi:snowflake" style="color:var\(--blue-color, var\(--eb-muted\)\)"><\/ha-icon><span class="nt">Klima/);
    assert.match(html, /<ha-icon class="ico" icon="mdi:label"><\/ha-icon><span class="nt">Licht/); // no icon, no color
  });
});

test("icons: the label picker uses the icons too", () => {
  withIcons(() => {
    const p = pickerPanel();
    p._labelData.labels[0].icon = "mdi:snowflake";
    const html = p._renderSettings();
    assert.match(html, /<ha-icon class="ico" icon="mdi:snowflake"[^>]*><\/ha-icon><span class="nt">Klima/);
    assert.match(html, /<ha-icon class="ico" icon="mdi:label"><\/ha-icon><span class="nt">Licht/);
  });
});

test("icons: without the ha-icon element a colored label falls back to a dot, areas show nothing", () => {
  const labels = labelPanel()._renderLabels(2000);
  assert.doesNotMatch(labels, /ha-icon/);
  assert.match(labels, /<i class="dot" style="background:var\(--blue-color/); // Klima
  assert.doesNotMatch(areaPanel()._renderAreas(2000), /ha-icon|class="dot"/);
});

test("icons: invalid icon names and colors are not put into the page", () => {
  withIcons(() => {
    const p = labelPanel();
    p._labelData.labels[0].icon = 'x" onmouseover="alert(1)';
    p._labelData.labels[0].color = 'red;background:url(x)';
    const html = p._renderLabels(2000);
    assert.doesNotMatch(html, /onmouseover/);
    assert.doesNotMatch(html, /url\(x\)/);
    assert.match(html, /<span class="name"[^>]*><span class="nt">Klima/); // neither icon nor dot
  });
});

function renamePanel({ admin = true, names = {}, fail = false } = {}) {
  const dev = (name, w) => ({ state: String(w), attributes: { device_class: "power", unit_of_measurement: "W", friendly_name: name } });
  const states = {
    "sensor.wallbox_leistung": dev("Wallbox 3EM Leistung", 1400),
    "sensor.herd_leistung": dev("Herd Leistung", 900),
  };
  const p = discoverPanel({ device_patterns: ["*_leistung"], device_names: names }, states);
  p._hass.user = { is_admin: admin };
  p._hass.calls = [];
  p._hass.callWS = async (msg) => {
    p._hass.calls.push(msg);
    if (fail) throw new Error("boom");
    // like the real backend: the complete settings come back
    return { ...p._cfg, device_names: msg.config.device_names };
  };
  p._draft = p._normalize(p._cfg);
  p._render = () => {}; // no shadow DOM in this test
  p.shadowRoot = { getElementById: () => ({ querySelector: () => null }) };
  p._editName = "sensor.wallbox_leistung";
  return p;
}

test("names: an own name wins over the friendly name, which wins over the entity id", () => {
  const p = renamePanel({ names: { "sensor.wallbox_leistung": "Wallbox" } });
  assert.equal(p._deviceName("sensor.wallbox_leistung"), "Wallbox");
  assert.equal(p._deviceName("sensor.herd_leistung"), "Herd Leistung");
  assert.equal(p._deviceName("sensor.unknown"), "sensor.unknown");
});

test("names: the device list shows own names, sorting stays by power, the original is kept", () => {
  const p = renamePanel({ names: { "sensor.herd_leistung": "AAA first in the alphabet" } });
  const [first, second] = p._devices();
  assert.equal(first.name, "Wallbox 3EM Leistung"); // strongest first
  assert.equal(second.name, "AAA first in the alphabet");
  assert.equal(second.original, "Herd Leistung");
});

test("names: admins get a pencil on every device row but not on the unmeasured rest", () => {
  const p = renamePanel();
  p._editName = null;
  const html = p._renderDevices(2500);
  assert.equal((html.match(/data-rename="/g) || []).length, 2);
  assert.match(html, /data-rename="sensor.wallbox_leistung"/);
  assert.match(html, /Other \(not measured\)/);
  assert.doesNotMatch(html.slice(html.indexOf("Other (not measured)")), /data-rename/);
});

test("names: no pencil and no editing for non-admins", async () => {
  const p = renamePanel({ admin: false });
  assert.doesNotMatch(p._renderDevices(2500), /data-rename|rename/);
  await p._commitRename("sensor.wallbox_leistung", "Hacked");
  assert.deepEqual(p._hass.calls, []);
  assert.equal(p._deviceName("sensor.wallbox_leistung"), "Wallbox 3EM Leistung");
});

test("names: the row in edit mode is a text field with the own name as value and the original as placeholder", () => {
  const p = renamePanel({ names: { "sensor.wallbox_leistung": "Wallbox" } });
  const html = p._renderDevices(2500);
  const input = html.match(/<input class="rename"[^>]*>/)[0];
  assert.match(input, /data-rename-input="sensor.wallbox_leistung"/);
  assert.match(input, /value="Wallbox"/);
  assert.match(input, /placeholder="Wallbox 3EM Leistung"/);
  assert.match(input, /maxlength="80"/);
  assert.match(html, /data-rename="sensor.herd_leistung"/); // the other row stays a normal row
  const plain = renamePanel();
  assert.match(plain._renderDevices(2500).match(/<input class="rename"[^>]*>/)[0], /value=""/); // no own name yet
});

test("names: the tooltip names the original when a row was renamed", () => {
  const html = renamePanel({ names: { "sensor.wallbox_leistung": "Wallbox" } })._renderDevices(2500);
  assert.match(html, /title="[^"]*Original: Wallbox 3EM Leistung"/);
});

test("names: names and placeholders are HTML-escaped", () => {
  const p = renamePanel({ names: { "sensor.wallbox_leistung": '<img src=x onerror="x">' } });
  const html = p._renderDevices(2500);
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;img/);
});

test("names: saving sends all names, shows the new name at once and keeps the draft in sync", async () => {
  const p = renamePanel({ names: { "sensor.herd_leistung": "Herd" } });
  await p._commitRename("sensor.wallbox_leistung", "  Wallbox  ");
  assert.deepEqual(p._hass.calls, [
    { type: "energyboard/update_config", config: { device_names: { "sensor.herd_leistung": "Herd", "sensor.wallbox_leistung": "Wallbox" } } },
  ]);
  assert.equal(p._deviceName("sensor.wallbox_leistung"), "Wallbox");
  assert.deepEqual(p._draft.device_names, { "sensor.herd_leistung": "Herd", "sensor.wallbox_leistung": "Wallbox" });
  assert.equal(p._editName, null);
  assert.equal(p._isDirty(), false); // the settings form sees no unsaved change
});

test("names: an empty name or the original name resets the own name", async () => {
  const p = renamePanel({ names: { "sensor.wallbox_leistung": "Wallbox", "sensor.herd_leistung": "Herd" } });
  await p._commitRename("sensor.wallbox_leistung", "   ");
  assert.deepEqual(p._hass.calls[0].config.device_names, { "sensor.herd_leistung": "Herd" });
  p._editName = "sensor.herd_leistung";
  await p._commitRename("sensor.herd_leistung", "Herd Leistung"); // typed the original again
  assert.deepEqual(p._hass.calls[1].config.device_names, {});
  assert.equal(p._deviceName("sensor.herd_leistung"), "Herd Leistung");
});

test("names: nothing is sent when the name did not change, or when editing already ended", async () => {
  const p = renamePanel({ names: { "sensor.wallbox_leistung": "Wallbox" } });
  await p._commitRename("sensor.wallbox_leistung", "Wallbox");
  assert.deepEqual(p._hass.calls, []);
  assert.equal(p._editName, null);
  await p._commitRename("sensor.wallbox_leistung", "Other"); // e.g. blur after Enter or Escape
  assert.deepEqual(p._hass.calls, []);
});

test("names: names are cut at 80 characters", async () => {
  const p = renamePanel();
  await p._commitRename("sensor.wallbox_leistung", "x".repeat(120));
  assert.equal(p._hass.calls[0].config.device_names["sensor.wallbox_leistung"].length, 80);
});

test("names: a failed save takes the new name back", async () => {
  const p = renamePanel({ names: { "sensor.wallbox_leistung": "Wallbox" }, fail: true });
  const warn = console.warn;
  console.warn = () => {};
  try {
    await p._commitRename("sensor.wallbox_leistung", "Neu");
  } finally {
    console.warn = warn;
  }
  assert.equal(p._deviceName("sensor.wallbox_leistung"), "Wallbox");
  assert.deepEqual(p._draft.device_names, { "sensor.wallbox_leistung": "Wallbox" });
});

test("names: cancelling does not save", () => {
  const p = renamePanel();
  p._endRename();
  assert.equal(p._editName, null);
  assert.deepEqual(p._hass.calls, []);
});

test("names: only an admin can start editing", () => {
  const p = renamePanel({ admin: false });
  p._editName = null;
  p._startRename("sensor.wallbox_leistung");
  assert.equal(p._editName, null);
});

test("names: own names also appear in the tooltips of areas and labels", () => {
  const a = areaPanel();
  a._config = { ...a._cfg, device_names: { "sensor.media_leistung": "Fernseher" } };
  assert.match(a._renderAreas(2000), /Fernseher 124 W/);
  const l = labelPanel();
  l._config = { ...l._cfg, device_names: { "sensor.klimaanlage_leistung": "Split Büro" } };
  assert.match(l._renderLabels(2000), /Split Büro 900 W/);
});

test("names: the names survive the settings form (normalize keeps them)", () => {
  const p = new Panel();
  assert.deepEqual(p._normalize({ device_names: { "sensor.a": "A" } }).device_names, { "sensor.a": "A" });
  assert.deepEqual(p._normalize({}).device_names, {});
});

// Fake page content with expanded lists (`.devlist`), each belonging to a card with a title.
function fakeContent(lists) {
  const make = (title, top = 0) => ({
    scrollTop: top,
    closest: () => ({ querySelector: () => ({ textContent: title }) }),
  });
  const content = {
    els: lists.map(([title, top]) => make(title, top)),
    next: [],
    querySelectorAll: () => content.els,
  };
  Object.defineProperty(content, "innerHTML", {
    set(html) {
      content.html = html;
      content.els = content.next.map((title) => make(title, 0)); // new elements start at the top
    },
  });
  return content;
}

test("live updates: an expanded list keeps its scroll position when the page is redrawn", () => {
  const p = new Panel();
  const content = fakeContent([["Devices", 300], ["Areas", 60]]);
  content.next = ["Devices", "Areas"];
  p._swapMarkup(content, "<new/>");
  assert.equal(content.html, "<new/>");
  assert.deepEqual(content.els.map((e) => e.scrollTop), [300, 60]);
});

test("live updates: scroll positions stay with their own list when lists come and go", () => {
  const p = new Panel();
  const content = fakeContent([["Areas", 60]]);
  content.next = ["Devices", "Areas"]; // the device list was expanded as well
  p._swapMarkup(content, "<new/>");
  assert.deepEqual(content.els.map((e) => e.scrollTop), [0, 60]);
  const later = fakeContent([["Devices", 200], ["Areas", 60]]);
  later.next = ["Areas"]; // the device list was folded
  p._swapMarkup(later, "<new/>");
  assert.deepEqual(later.els.map((e) => e.scrollTop), [60]);
});

test("live updates: redrawing works without any expanded list", () => {
  const p = new Panel();
  const content = fakeContent([]);
  content.next = [];
  p._swapMarkup(content, "<plain/>");
  assert.equal(content.html, "<plain/>");
});
