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

await import("../custom_components/energy_assistant/frontend/energy-assistant-panel.js");

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

test("separate sensors win over the combined one, the combined only fills the gaps", () => {
  // a combined meter often shows the same flow again: adding both would count it twice
  const p = panel({ grid_import: ["gi"], grid_power: ["g"] }, { gi: st(200), g: st(300) });
  assert.equal(p._current().gridIn, 200);
  assert.equal(p._current().gridOut, 0);
  // no separate export sensor: the negative part of the combined sensor is the export
  const q = panel({ grid_import: ["gi"], grid_power: ["g"] }, { gi: st(0), g: st(-300) });
  assert.equal(q._current().gridIn, 0);
  assert.equal(q._current().gridOut, 300);
});

test("separate production, import and export sensors ignore negative readings", () => {
  const p = panel(
    { solar_power: ["pv1", "pv2"], grid_import: ["gi"], grid_export: ["ge"] },
    { pv1: st(2000), pv2: st(-50), gi: st(-90), ge: st(-10) },
  );
  const c = p._current();
  assert.equal(c.solar, 2000);
  assert.equal(c.gridIn, 0);
  assert.equal(c.gridOut, 0);
});

test("a signed meter that is also the import sensor does not make import and export at the same time", () => {
  // PV 2978 W, the meter reads -90 W (feeding in), the import sensor shows the same meter as -90 W
  const p = panel(
    { solar_power: ["pv"], grid_power: ["meter"], grid_import: ["imp"] },
    { pv: st(2978), meter: st(-90), imp: st(-90) },
  );
  const c = p._current();
  assert.equal(c.gridIn, 0);
  assert.equal(c.gridOut, 90);
  assert.equal(c.house, 2888); // 2978 - 90, not 2798
  assert.equal(c.direct, 2888);
});

test("autarky: the share of the consumption that does not come from the grid", () => {
  const some = panel({ solar_power: ["pv"], grid_import: ["gi"], house_power: "h" }, { pv: st(1000), gi: st(250), h: st(1000) });
  assert.equal(some._current().autarky, 75);
  const none = panel({ grid_import: ["gi"], house_power: "h" }, { gi: st(800), h: st(800) });
  assert.equal(none._current().autarky, 0);
  const full = panel({ solar_power: ["pv"], grid_import: ["gi"], house_power: "h" }, { pv: st(2000), gi: st(0), h: st(1500) });
  assert.equal(full._current().autarky, 100);
  const over = panel({ grid_import: ["gi"], house_power: "h" }, { gi: st(900), h: st(800) }); // import above the house power
  assert.equal(over._current().autarky, 0);
  const unknown = panel({ grid_export: ["ge"], house_power: "h" }, { ge: st(0), h: st(500) }); // no import information
  assert.equal(unknown._current().autarky, null);
  const idle = panel({ grid_import: ["gi"], house_power: "h" }, { gi: st(0), h: st(0) });
  assert.equal(idle._current().autarky, null);
});

test("autarky: shows as a tile on the Power tab", () => {
  const p = panel({ solar_power: ["pv"], grid_import: ["gi"], house_power: "h" }, { pv: st(1000), gi: st(250), h: st(1000) });
  p._ready = true;
  p._hass.language = "en";
  assert.match(p._renderHouse(), /Self-sufficiency<\/div><div class="eb-value">75<small>%/);
  const none = panel({ grid_export: ["ge"], house_power: "h" }, { ge: st(0), h: st(500) });
  none._ready = true;
  none._hass.language = "en";
  assert.doesNotMatch(none._renderHouse(), /Self-sufficiency/);
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

test("areas: the power sensors are summed up per area (own area or the area of the device)", () => {
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

test("areas: card lists areas strongest first, with the sensor count, share and \"No area\" last", () => {
  const html = areaPanel()._renderAreas(2000);
  assert.match(html, /Areas/);
  const order = ["Wohnzimmer", "Technik", "Küche", "No area"].map((n) => html.indexOf(n));
  assert.ok(order.every((i) => i > -1));
  assert.deepEqual([...order].sort((a, b) => a - b), order); // Wohnzimmer, Technik, Küche, No area
  assert.match(html, /2 power sensors/);
  assert.match(html, /1 power sensor</);
  assert.match(html, /Wohnzimmer[\s\S]*?<small class="pct">6 %<\/small>/);
  assert.match(html, /title="6 % of house · Media 124 W"/);
});

test("areas: idle areas are only counted", () => {
  const html = areaPanel()._renderAreas(2000);
  assert.doesNotMatch(html, /Keller</); // 0 W
  assert.match(html, /1 idle/);
});

test("areas: no card when no sensor belongs to an area", () => {
  assert.equal(areaPanel(undefined, { entities: {}, devices: {} })._renderAreas(2000), "");
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
  assert.match(html, /Klima<\/span><\/span><span class="mi">3 power sensors · 1[.,\s]?620 W/);
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
const names = (p) => p._labelPicker().shown.map((x) => x.item.name);

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
    assert.match(html, /<span class="name"[^>]*><span class="chev"[^>]*>▶<\/span><span class="nt">Klima/); // neither icon nor dot
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
    { type: "energy_assistant/update_config", config: { device_names: { "sensor.herd_leistung": "Herd", "sensor.wallbox_leistung": "Wallbox" } } },
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

// Panel with `devices` active power sensors, spread over `areas` areas, and `labels` selected labels
// that each carry one sensor. `idle` of the devices are below 5 W.
function limitPanel({ devices, areas = 0, labels = 0, idle = 0 }) {
  const states = { "sensor.netz_leistung": { state: "9000", attributes: { device_class: "power", unit_of_measurement: "W", friendly_name: "Netz" } } };
  const entities = {};
  const labelEntities = {};
  for (let i = 0; i < devices; i++) {
    const id = `sensor.d${i}_leistung`;
    states[id] = { state: String(i < idle ? 2 : 100 + i), attributes: { device_class: "power", unit_of_measurement: "W", friendly_name: `D${i}` } };
    if (areas) entities[id] = { area_id: `a${i % areas}` };
    if (i < labels) labelEntities[id] = [`l${i}`];
  }
  const cfg = {
    grid_import: ["sensor.netz_leistung"],
    device_patterns: ["*_leistung"],
    label_ids: Array.from({ length: labels }, (_, i) => `l${i}`),
  };
  const p = discoverPanel(cfg, states);
  p._hass.entities = entities;
  p._hass.devices = {};
  p._hass.areas = Object.fromEntries(Array.from({ length: areas }, (_, i) => [`a${i}`, { name: `Area ${i}` }]));
  p._labelData = {
    labels: Array.from({ length: labels }, (_, i) => ({ label_id: `l${i}`, name: `Label ${i}`, color: null })),
    entities: labelEntities,
  };
  p._ready = true;
  return p;
}

test("fold limit: follows the shortest list (here the labels)", () => {
  assert.equal(limitPanel({ devices: 13, areas: 9, labels: 6 })._collapsedLimit(), 6);
  assert.equal(limitPanel({ devices: 13, areas: 7, labels: 12 })._collapsedLimit(), 7);
});

test("fold limit: at least 5 and at most 8 rows", () => {
  assert.equal(limitPanel({ devices: 13, areas: 9, labels: 2 })._collapsedLimit(), 5);
  assert.equal(limitPanel({ devices: 20, areas: 12, labels: 10 })._collapsedLimit(), 8);
});

test("fold limit: only the cards that exist count, idle rows are not counted", () => {
  assert.equal(limitPanel({ devices: 7 })._collapsedLimit(), 7); // no areas, no labels
  assert.equal(limitPanel({ devices: 10, idle: 4 })._collapsedLimit(), 6); // 6 active devices
  assert.equal(limitPanel({ devices: 0 })._collapsedLimit(), 5);
  const none = new Panel();
  none._config = {};
  none._hass = { states: {} };
  assert.equal(none._collapsedLimit(), 8); // nothing configured
});

test("fold limit: the page shows that many rows per list and unfolds the rest per list", () => {
  const p = limitPanel({ devices: 13, areas: 9, labels: 6 });
  let html = p._renderHouse();
  const card = (title) => {
    const start = html.indexOf(`<span class="eb-title">${title}</span>`);
    const end = html.indexOf('<div class="eb-card', start + 10);
    return html.slice(start, end > 0 ? end : undefined);
  };
  const rows = (title) => (card(title).match(/class="dev"/g) || []).length;
  assert.equal(rows("Devices"), 7); // 6 devices + the unmeasured rest
  assert.equal(rows("Areas"), 7); // 6 areas + the unmeasured rest (no area selected)
  assert.equal(rows("Labels"), 6);
  assert.match(html, /Show all 13/); // devices fold
  assert.match(html, /Show all 9/); // areas fold
  assert.equal((html.match(/data-labeltoggle/g) || []).length, 0); // labels have exactly 6, nothing to fold
  p._devExpanded = true;
  html = p._renderHouse();
  assert.equal(rows("Devices"), 14); // all 13 + the rest
  assert.equal(rows("Areas"), 7); // the others stay folded
});

test("fold limit: the cards still unfold fully with a custom limit", () => {
  const p = limitPanel({ devices: 13, areas: 9, labels: 6 });
  p._areaExpanded = true;
  const html = p._renderAreas(null, 6);
  assert.equal((html.match(/class="dev"/g) || []).length, 9);
  assert.match(html, /Show less/);
});


test("areas: no name pattern is needed, every power sensor in the area counts", () => {
  const p = areaPanel({}); // no device patterns at all
  const byName = Object.fromEntries(p._areas().map((a) => [a.name, a.w]));
  assert.equal(byName["Küche"], 32);
  assert.equal(byName["Technik"], 88);
  assert.equal(byName["No area"], 1400);
  assert.notEqual(p._renderAreas(2000), "");
});

test("areas: the sensors of the energy balance and excluded sensors never count", () => {
  const p = areaPanel({ grid_import: ["sensor.herd_leistung"], device_exclude: ["sensor.media_leistung"], device_exclude_patterns: ["sensor.wallbox*"] });
  assert.deepEqual(p._areaMembers("kueche"), ["sensor.kuehl_leistung"]); // herd is the grid sensor here
  assert.deepEqual(p._areaMembers("wohnzimmer"), []); // media excluded
  assert.deepEqual(p._noAreaMembers(), []); // wallbox excluded by pattern
});

test("areas: with a selection only the selected areas are shown, in the order of the selection", () => {
  const p = areaPanel({ area_ids: ["technik", "kueche"] });
  assert.deepEqual(p._areas().map((a) => a.name), ["Technik", "Küche"]);
  assert.ok(!p._areas().some((a) => a.none)); // no "No area" row in the selected view
});

test("areas: a selected area without power sensors stays as an idle row, unknown ids are ignored", () => {
  const p = areaPanel({ area_ids: ["keller", "wohnzimmer", "geloescht"] });
  p._hass.areas.leer = { name: "Leer" };
  p._config = { ...p._cfg, area_ids: ["leer", "wohnzimmer", "geloescht"] };
  const groups = p._areas();
  assert.deepEqual(groups.map((a) => a.name), ["Leer", "Wohnzimmer"]);
  assert.equal(groups[0].w, 0);
  const html = p._renderAreas(2000);
  assert.match(html, /1 idle/);
  assert.doesNotMatch(html, />Leer</); // idle rows are only counted
});

test("areas: the card is empty for a selection of unknown areas", () => {
  assert.equal(areaPanel({ area_ids: ["geloescht"] })._renderAreas(2000), "");
});

function areaPickerPanel(selected = []) {
  const p = areaPanel({ area_ids: selected });
  p._hass.user = { is_admin: true };
  p._hass.areas.leer = { name: "Leer", icon: "mdi:tree" }; // no power sensors
  p._draft = p._normalize(p._cfg);
  p._ready = true;
  p._edited = () => {};
  return p;
}
const aseg = (value) => ({ target: { closest: (s) => (s === "[data-aseg]" ? { dataset: { aseg: value } } : null) } });
const areaNames = (p) => p._picker("area").shown.map((x) => x.item.name);

test("area picker: lists the areas of Home Assistant that have power sensors", () => {
  const p = areaPickerPanel();
  assert.deepEqual(areaNames(p), ["Keller", "Küche", "Technik", "Wohnzimmer"]); // sorted by name, "Leer" has no sensors
  assert.equal(p._picker("area").counts.all, 4);
});

test("area picker: a selected area without power sensors stays so it can be unselected", () => {
  assert.ok(areaNames(areaPickerPanel(["leer"])).includes("Leer"));
});

test("area picker: ticking an area selects it, unticking removes it", () => {
  const p = areaPickerPanel();
  p._onChange({ target: { dataset: { area: "kueche" }, checked: true } });
  p._onChange({ target: { dataset: { area: "kueche" }, checked: true } });
  assert.deepEqual(p._draft.area_ids, ["kueche"]);
  p._onChange({ target: { dataset: { area: "kueche" }, checked: false } });
  assert.deepEqual(p._draft.area_ids, []);
});

test("area picker: filters for activity, selection and text", () => {
  const p = areaPickerPanel(["wohnzimmer"]);
  p._onClick(aseg("state:idle"));
  assert.deepEqual(areaNames(p), ["Keller"]); // 0 W
  p._onClick(aseg("state:active"));
  assert.deepEqual(areaNames(p), ["Küche", "Technik", "Wohnzimmer"]);
  p._onClick(aseg("sel:selected"));
  assert.deepEqual(areaNames(p), ["Wohnzimmer"]);
  p._onClick(aseg("sel:all"));
  p._aFilter = "tech";
  assert.deepEqual(areaNames(p), ["Technik"]);
  p._aFilter = "nothing";
  assert.match(p._renderPickerRows("area", false), /No area matches the filters/);
});

test("area picker: the filters of areas and labels are independent", () => {
  const p = areaPickerPanel();
  p._labelData = { labels: [{ label_id: "klima", name: "Klima" }], entities: { "sensor.herd_leistung": ["klima"] } };
  p._onClick(aseg("state:idle"));
  assert.equal(p._aState, "idle");
  assert.equal(p._lState, undefined);
});

test("area picker: the settings show the picker, the hint for an empty selection and the section", () => {
  const p = areaPickerPanel();
  const html = p._renderSettings();
  assert.match(html, /id="alist"/);
  assert.match(html, /data-afilter/);
  assert.match(html, /data-area="kueche"/);
  assert.match(html, /Nothing selected: all areas with power sensors are shown/);
  assert.match(html, /Areas \(their power sensors are summed up per area\)/);
  p._onChange({ target: { dataset: { area: "kueche" }, checked: true } });
  assert.doesNotMatch(p._renderSettings(), /Nothing selected: all areas/);
});

test("area picker: rows show the area icon with default, the sensor count and the power", () => {
  globalThis.haIcon = true;
  try {
    const p = areaPickerPanel();
    p._hass.areas.kueche.icon = "mdi:silverware-fork-knife";
    const html = p._renderPickerRows("area", false);
    assert.match(html, /icon="mdi:silverware-fork-knife"[^>]*><\/ha-icon><span class="nt">Küche/);
    assert.match(html, /icon="mdi:texture-box"[^>]*><\/ha-icon><span class="nt">Technik/);
    assert.match(html, /Küche<\/span><\/span><span class="mi">2 power sensors · 32 W/);
  } finally {
    globalThis.haIcon = false;
  }
});

test("area picker: read-only for non-admins, without areas in Home Assistant a hint", () => {
  const ro = areaPickerPanel();
  ro._hass.user = { is_admin: false };
  assert.match(ro._renderPickerRows("area", true).match(/<input type="checkbox" data-area="kueche"[^>]*>/)[0], /disabled/);
  ro._onChange({ target: { dataset: { area: "kueche" }, checked: true } });
  assert.deepEqual(ro._draft.area_ids, []);
  const none = areaPickerPanel();
  none._hass.areas = {};
  assert.match(none._renderSettings(), /No areas exist in Home Assistant yet/);
});

test("area picker: area names are HTML-escaped", () => {
  const p = areaPickerPanel();
  p._hass.areas.kueche.name = '<img src=x onerror="x">';
  assert.doesNotMatch(p._renderPickerRows("area", false), /<img/);
});

test("area ids survive the settings form (normalize keeps them)", () => {
  assert.deepEqual(new Panel()._normalize({ area_ids: ["kueche"] }).area_ids, ["kueche"]);
  assert.deepEqual(new Panel()._normalize({}).area_ids, []);
});


// Sum shown in the header of a card (the small label right of the title).
const headerTotal = (html) => html.match(/class="eb-label">([^<]*)</)[1];
// The panel shows whole watts. The thousands separator depends on the locale, so only digits count.
const watts = (text) => parseFloat(text.replace(/[^\d]/g, ""));

test("totals: the device card total includes the unmeasured rest and so equals the house power", () => {
  const p = renamePanel();
  p._editName = null;
  // devices: 1400 + 900 W = 2300 W, house 2500 W -> rest 200 W
  const html = p._renderDevices(2500);
  assert.match(html, /Other \(not measured\)/);
  assert.ok(Math.abs(watts(headerTotal(html)) - 2500) < 1); // exactly the house power
});

test("totals: without a rest the total is the sum of the devices", () => {
  const p = renamePanel();
  p._editName = null;
  const html = p._renderDevices(2300); // house = devices
  assert.doesNotMatch(html, /Other \(not measured\)/);
  assert.ok(Math.abs(watts(headerTotal(html)) - 2300) < 1);
  const over = p._renderDevices(1000); // devices exceed the house (overlapping sensors): no negative rest
  assert.doesNotMatch(over, /Other \(not measured\)/);
  assert.ok(Math.abs(watts(headerTotal(over)) - 2300) < 1);
});

test("totals: the areas card without a selection shows the rest and its total equals the house power", () => {
  const p = areaPanel(); // area sensors add up to 1644 W
  const html = p._renderAreas(2000);
  assert.match(html, /Other \(not measured\)/);
  assert.ok(Math.abs(watts(headerTotal(html)) - 2000) < 1);
  assert.match(html, /Other \(not measured\)[\s\S]*?<small class="pct">18 %<\/small>/); // 356 of 2000 W
});

test("totals: the areas card with a selection is only a part of the house, no rest row", () => {
  const p = areaPanel({ area_ids: ["kueche", "technik"] });
  const html = p._renderAreas(2000);
  assert.doesNotMatch(html, /Other \(not measured\)/);
  assert.ok(Math.abs(watts(headerTotal(html)) - 120) < 1); // 32 + 88 W
});

test("totals: without a known house power there is no rest and the total is the sum", () => {
  const html = areaPanel()._renderAreas(null);
  assert.doesNotMatch(html, /Other \(not measured\)/);
  assert.ok(Math.abs(watts(headerTotal(html)) - 1644) < 1);
});

test("totals: the labels card stays a part of the house, no rest row", () => {
  const html = labelPanel()._renderLabels(2000);
  assert.doesNotMatch(html, /Other \(not measured\)/);
});


test("display: power is always shown in whole watts, never in kW and without decimals", () => {
  const html = limitPanel({ devices: 3 })._renderHouse();
  assert.doesNotMatch(html, /kW/);
  assert.match(html, /9[.,\s]?000<small>W<\/small>|9[.,\s]?000\s*W/); // the 9000 W grid import
  assert.doesNotMatch(html, /\d[.,]\d{1,2}\s*<small>W|\d[.,]\d\s*W\b/); // no decimal digits next to a W unit
});

test("display: sensors in kW are converted and shown in watts", () => {
  const p = panel({ house_power: "h" }, { h: st(1.9, "kW") });
  const c = p._current();
  assert.equal(c.house, 1900);
  assert.doesNotMatch(p._renderHouse.call(Object.assign(p, { _ready: true, _labelData: null })), /kW/);
});

// Clicking an area or label row opens the list of the sensors that were summed up.
function clickOpen(p, key) {
  const el = { dataset: { open: key } };
  p._onClick({ target: { closest: (sel) => (sel === "[data-open]" ? el : null) } });
}

test("drill-down: area rows can be opened and show every sensor of the area, strongest first", () => {
  const p = limitPanel({ devices: 4, areas: 1 });
  p._render = () => {};
  let html = p._renderAreas(null);
  assert.match(html, /data-open="area:a0"/);
  assert.match(html, /aria-expanded="false"/);
  assert.doesNotMatch(html, /class="subs"/);
  clickOpen(p, "area:a0");
  html = p._renderAreas(null);
  assert.match(html, /aria-expanded="true"/);
  const subs = html.slice(html.indexOf('class="subs"'));
  assert.equal((subs.match(/class="s( idle)?"/g) || []).length, 4);
  assert.ok(subs.indexOf("D3") < subs.indexOf("D0")); // strongest first
  clickOpen(p, "area:a0");
  assert.doesNotMatch(p._renderAreas(null), /class="subs"/);
});

test("drill-down: label rows open too, and the open state is per row", () => {
  const p = limitPanel({ devices: 3, areas: 1, labels: 2 });
  p._render = () => {};
  clickOpen(p, "label:l0");
  const labels = p._renderLabels(null);
  assert.equal((labels.match(/aria-expanded="true"/g) || []).length, 1);
  assert.equal((labels.match(/aria-expanded="false"/g) || []).length, 1);
  assert.match(labels, /class="subs"/);
  assert.doesNotMatch(p._renderAreas(null), /class="subs"/);
});

test("drill-down: sensor names in the opened list are HTML-escaped; devices and rest rows are not expandable", () => {
  const p = limitPanel({ devices: 2, areas: 1 });
  p._render = () => {};
  p._hass.states["sensor.d0_leistung"].attributes.friendly_name = "<b>x</b>";
  clickOpen(p, "area:a0");
  const html = p._renderAreas(null);
  assert.doesNotMatch(html, /<b>x<\/b>/);
  assert.match(html, /&lt;b&gt;x&lt;\/b&gt;/);
  assert.doesNotMatch(p._renderDevices(9000), /data-open/);
});

// --- optional link to the PV Assistant integration ---------------------------------------------
// The backend reads PV Assistant and answers with the settings that fit, notes and the plants.
const PV_OFFER = {
  targets: {
    solar_power: ["sensor.wr1_pv1", "sensor.wr1_pv2", "sensor.wr2_pv"],
    battery_power: ["sensor.batt"],
    invert_battery: false,
    grid_import: ["sensor.bezug"],
    grid_export: ["sensor.einsp"],
  },
  notes: { feed_in_negative: false, storage_absolute: false },
  plants: [
    { name: "Wechselrichter Haus", sensors: ["sensor.wr1_pv1", "sensor.wr1_pv2"] },
    { name: "Garage", sensors: ["sensor.wr2_pv"] },
  ],
};

function pvPanel({ solar = [], reply = PV_OFFER, admin = true } = {}) {
  const p = new Panel();
  p._config = { solar_power: solar, grid_import: ["sensor.netz"] };
  p._draft = p._normalize(p._config);
  p._ready = true;
  p._render = () => {};
  p._hass = {
    user: { is_admin: admin },
    states: { "sensor.wr1_pv1": st(1200), "sensor.wr1_pv2": st(800), "sensor.wr2_pv": st(300), "sensor.netz": st(100) },
    calls: [],
    callWS: async (msg) => {
      p._hass.calls.push(msg.type);
      if (reply instanceof Error) throw reply;
      return reply;
    },
  };
  return p;
}

test("pv assistant: the panel asks the backend, never PV Assistant itself", async () => {
  const p = pvPanel();
  await p._loadPv();
  assert.deepEqual(p._hass.calls, ["energy_assistant/pv_suggestion"]);
  assert.deepEqual(p._pv.targets, PV_OFFER.targets);
  assert.equal(p._pv.plants.length, 2);
});

test("pv assistant: no offer, an empty answer or an error change nothing", async () => {
  for (const reply of [null, {}, { targets: {} }, new Error("unknown command")]) {
    const p = pvPanel({ reply });
    await p._loadPv();
    assert.equal(p._pv, null);
    assert.equal(p._renderIntegrations(false), "");
    assert.equal(p._renderPvPlants(), "");
  }
});

test("pv assistant: the settings ask whether to take over the sensors, admins can do it", async () => {
  const p = pvPanel();
  await p._loadPv();
  let html = p._renderSettings();
  assert.match(html, /PV Assistant is installed\. Do you want to take over its sensors\?/);
  assert.match(html, /Solar production: 3 sensors/);
  assert.match(html, /Storage: combined 1/);
  assert.match(html, /Grid: import 1, feed-in 1/);
  assert.match(html, /data-pvapply/);
  p._edited = () => {};
  p._onClick({ target: { closest: (sel) => (sel === "[data-pvapply]" ? {} : null) } });
  assert.deepEqual(p._draft.solar_power, PV_OFFER.targets.solar_power);
  assert.deepEqual(p._draft.battery_power, ["sensor.batt"]);
  assert.deepEqual(p._draft.grid_import, ["sensor.bezug"]); // replaces the sensor that was there
  assert.deepEqual(p._draft.grid_export, ["sensor.einsp"]);
  assert.equal(p._draft.invert_battery, false);
  html = p._renderSettings();
  assert.match(html, /sensors of PV Assistant are in use/);
  assert.doesNotMatch(html, /data-pvapply/);
});

test("pv assistant: the sign settings of the offer are applied too", async () => {
  const p = pvPanel({ reply: { ...PV_OFFER, targets: { ...PV_OFFER.targets, invert_battery: true, grid_power: ["sensor.zaehler"], invert_grid: false } } });
  await p._loadPv();
  p._edited = () => {};
  p._draft.invert_grid = true;
  p._onClick({ target: { closest: (sel) => (sel === "[data-pvapply]" ? {} : null) } });
  assert.equal(p._draft.invert_battery, true);
  assert.equal(p._draft.invert_grid, false);
  assert.deepEqual(p._draft.grid_power, ["sensor.zaehler"]);
});

test("pv assistant: the notes of the backend show as hints", async () => {
  const p = pvPanel({ reply: { ...PV_OFFER, notes: { feed_in_negative: true, storage_absolute: true } } });
  await p._loadPv();
  const html = p._renderSettings();
  assert.match(html, /used as the combined grid sensor/);
  assert.match(html, /count with their magnitude/);
});

test("pv assistant: read-only users get the information but no button", async () => {
  const p = pvPanel({ admin: false });
  await p._loadPv();
  const html = p._renderSettings();
  assert.match(html, /Detected integrations/);
  assert.doesNotMatch(html, /data-pvapply/);
});

test("pv assistant: the PV tab lists the plants with power and share, strongest first", async () => {
  const p = pvPanel({ solar: PV_OFFER.targets.solar_power });
  await p._loadPv();
  const html = p._renderPvPlants();
  assert.match(html, /PV by plant/);
  assert.ok(html.indexOf("Wechselrichter Haus") < html.indexOf("Garage"));
  assert.match(html, /Wechselrichter Haus<\/span>[\s\S]*2[.,\s]?000<small>W<\/small><small class="pct">87 %/); // 2000 of 2300 W
  assert.match(html, /Garage<\/span>[\s\S]*300<small>W<\/small><small class="pct">13 %/);
  assert.match(html, /2[.,\s]?300 W/); // total in the header
  assert.doesNotMatch(html, /data-open/);
});

test("pv assistant: a single plant adds no row", async () => {
  const p = pvPanel({ reply: { ...PV_OFFER, plants: [{ name: "Garage", sensors: ["sensor.wr2_pv"] }] } });
  await p._loadPv();
  assert.equal(p._renderPvPlants(), "");
});

test("display: separate charging and discharging sensors count with their magnitude", () => {
  const p = panel({ battery_charge: ["c"], battery_discharge: ["d"] }, { c: st(-250), d: st(-100) });
  const cur = p._current();
  assert.equal(cur.charge, 250);
  assert.equal(cur.discharge, 100);
});

test("display: a feed-in sensor with negative values as combined grid sensor counts as export", () => {
  const p = panel({ grid_power: ["e"], grid_import: ["b"] }, { e: st(-400), b: st(0) });
  const c = p._current();
  assert.equal(c.gridOut, 400);
  assert.equal(c.gridIn, 0);
});

// --- optional data from Tariffy (prices) -------------------------------------------------------
function costPanel({ price = "0.298", unit = "EUR/kWh", attrs = {}, feedIn = "0.08", tariffy = true, grid = {} } = {}) {
  const states = {
    "sensor.t_preis": { state: price, attributes: { unit_of_measurement: unit, ...attrs } },
    "sensor.t_einsp": { state: feedIn, attributes: { unit_of_measurement: unit } },
    pv: st(3000), gi: st(grid.gi ?? 2000), ge: st(grid.ge ?? 500), h: st(4500),
  };
  const p = panel({ solar_power: ["pv"], grid_import: ["gi"], grid_export: ["ge"], house_power: "h" }, states);
  p._hass.language = "en";
  p._int = tariffy ? { tariffy: { price: "sensor.t_preis", feed_in: feedIn === null ? null : "sensor.t_einsp" } } : {};
  return p;
}

test("tariffy: money flows per hour from the price, the feed-in tariff and the live power", () => {
  const p = costPanel();
  const html = p._renderCosts(p._current());
  assert.match(html, /Costs right now/);
  assert.match(html, /Electricity price<\/div><div class="eb-value">29\.8<small>ct\/kWh/);
  assert.match(html, /Grid import costs<\/div><div class="eb-value">0\.60<small>[^<]*\/h/); // 2 kW x 0.298
  assert.match(html, /Feed-in earns<\/div><div class="eb-value">0\.04<small>[^<]*\/h/); // 0.5 kW x 0.08
  assert.match(html, /Solar saves<\/div><div class="eb-value">0\.75<small>[^<]*\/h/); // direct 2.5 kW x 0.298
});

test("tariffy: the live price of a dynamic tariff wins over the average", () => {
  const p = costPanel({ price: "0.25", attrs: { arbeitspreis_aktuell: 0.4 } });
  assert.equal(p._price().value, 0.4);
  assert.match(p._renderCosts(p._current()), /40\.0<small>ct\/kWh/);
});

test("tariffy: without a feed-in sensor there is no feed-in tile; without Tariffy nothing is shown", () => {
  const p = costPanel({ feedIn: null });
  assert.doesNotMatch(p._renderCosts(p._current()), /Feed-in earns/);
  const none = costPanel({ tariffy: false });
  assert.equal(none._renderCosts(none._current()), "");
  const unknown = costPanel({ price: "unavailable" });
  assert.equal(unknown._renderCosts(unknown._current()), "");
});

test("tariffy: other currencies show the price with their unit", () => {
  const p = costPanel({ unit: "CHF/kWh", price: "0.3" });
  const html = p._renderCosts(p._current());
  assert.match(html, /0\.3<small>CHF\/kWh/);
});

test("tariffy: the costs are the Costs tab, with the contract figures", () => {
  const p = costPanel();
  p._ready = true;
  p._tab = "costs";
  p._int.tariffy.cost_so_far = "sensor.t_cost";
  p._int.tariffy.balance = "sensor.t_bal";
  p._int.tariffy.forecast = "sensor.t_fc";
  p._hass.states["sensor.t_cost"] = { state: "812.4", attributes: { unit_of_measurement: "EUR" } };
  p._hass.states["sensor.t_bal"] = { state: "-261", attributes: { unit_of_measurement: "EUR" } };
  p._hass.states["sensor.t_fc"] = { state: "unknown", attributes: {} };
  const html = p._renderPage();
  assert.match(html, /Costs right now/);
  assert.match(html, /<span class="eb-title">Contract<\/span>/);
  assert.match(html, /Cost so far<\/div><div class="eb-value">812\.40/);
  assert.match(html, /Balance so far<\/div><div class="eb-value">-261\.00/);
  assert.doesNotMatch(html, /Balance at contract end/); // unknown values are left out
  assert.doesNotMatch(p._renderHouse(), /Costs right now/);
});

test("integrations: the panel asks the backend and an error leaves nothing to show", async () => {
  const p = costPanel({ tariffy: false });
  p._render = () => {};
  p._hass.callWS = async (msg) => ({ type: msg.type, tariffy: { price: "sensor.t_preis" } });
  await p._loadIntegrations();
  assert.equal(p._int.tariffy.price, "sensor.t_preis");
  const broken = costPanel();
  broken._render = () => {};
  broken._hass.callWS = async () => { throw new Error("nope"); };
  await broken._loadIntegrations();
  assert.deepEqual(broken._int, {});
});

// --- optional data from EV Assistant (wallbox and vehicle) --------------------------------------
function evPanel({ live = {}, key = "evcc_live", kwh = "12.4", cost = "3.1", recommend = "off", vehicles } = {}) {
  const states = {
    "sensor.ev_home": { state: "812", attributes: { [key]: live, solaranteil_pct: 55 } },
    "sensor.ev_kwh_day": { state: kwh, attributes: { unit_of_measurement: "kWh" } },
    "sensor.ev_cost_day": { state: cost, attributes: { unit_of_measurement: "EUR" } },
    "binary_sensor.ev_vor_pv": { state: recommend, attributes: {} },
  };
  const p = panel({ house_power: "h" }, { ...states, h: st(4000) });
  p._hass.language = "en";
  p._int = {
    ev_assistant: {
      vehicles: vehicles ?? [{ name: "ID.3", live: "sensor.ev_home", kwh_today: "sensor.ev_kwh_day", cost_today: "sensor.ev_cost_day", recommend: "binary_sensor.ev_vor_pv" }],
    },
  };
  return p;
}

test("ev assistant: a charging vehicle shows its power in W, charge level, solar share and today's figures", () => {
  const html = evPanel({ live: { charge_power: 7.4, charging: true, connected: true, vehicle_soc: 61.4, session_solar_pct: 72 } })._renderEv();
  assert.match(html, />Wallbox</);
  assert.match(html, /ID\.3<\/div><div class="eb-value">7[.,\s]?400<small>W/); // 7.4 kW in whole watts
  assert.match(html, /Charge level<\/div><div class="eb-value">61<small>%/);
  assert.match(html, /Solar share<\/div><div class="eb-value">72<small>%/);
  assert.match(html, /Charged today<\/div><div class="eb-value">12\.4<small>kWh/);
  assert.match(html, /Charging cost today<\/div><div class="eb-value">3\.10<small>[^<]*</);
});

test("ev assistant: without evcc the generic live data is used; idle states say connected or not connected", () => {
  assert.match(evPanel({ key: "home_generic_live", live: { charge_power: 3.7, charging: true, connected: true } })._renderEv(), /ID\.3<\/div><div class="eb-value">3[.,\s]?700<small>W/);
  assert.match(evPanel({ live: { charge_power: 0, charging: false, connected: true } })._renderEv(), /ID\.3<\/div><div class="eb-value">Connected</);
  assert.match(evPanel({ live: { charge_power: 0, charging: false, connected: false } })._renderEv(), /ID\.3<\/div><div class="eb-value">Not connected</);
});

test("ev assistant: the advice to charge before PV shows only when it is on", () => {
  assert.doesNotMatch(evPanel({ live: {} })._renderEv(), /Charge before PV/);
  assert.match(evPanel({ live: {}, recommend: "on" })._renderEv(), /Charge before PV is recommended/);
});

test("ev assistant: nothing without the integration, without values or with unusable states", () => {
  assert.equal(evPanel({ vehicles: [] })._renderEv(), "");
  const p = evPanel({ kwh: "unavailable", cost: "unknown" });
  p._hass.states["sensor.ev_home"].attributes = {};
  assert.equal(p._renderEv(), "");
  const none = panel({ house_power: "h" }, { h: st(1) });
  none._int = {};
  assert.equal(none._renderEv(), "");
});

test("ev assistant: the EV tab contains the wallbox block, the Power tab does not", () => {
  const p = evPanel({ live: { charge_power: 7.4, charging: true, connected: true } });
  p._ready = true;
  p._tab = "ev";
  assert.match(p._renderPage(), /<span class="eb-title">Wallbox<\/span>/);
  assert.doesNotMatch(p._renderHouse(), /<span class="eb-title">Wallbox<\/span>/); // only as a row of the device list
});

// --- optional data from PV Assistant (day figures, forecast, plant fault) -----------------------
const PV_DAY = {
  production_today: "sensor.pv_prod",
  feed_in_today: "sensor.pv_feed",
  self_consumption_rate_today: "sensor.pv_self",
  autarky_today: "sensor.pv_autarky",
  forecast_reached_today: "sensor.pv_fc",
  benefit_today: "sensor.pv_benefit",
  expected_feed_in_tomorrow: "sensor.pv_exp",
  best_window_tomorrow: "sensor.pv_window",
  storage_usable: "sensor.pv_stor",
  storage_empty_at: "sensor.pv_empty",
  string_fault: "binary_sensor.pv_fault",
};

function pvDayPanel({ entities = PV_DAY, fault = "off", empty = "2026-11-12T22:30:00+00:00" } = {}) {
  const e = (state, attributes = {}) => ({ state, attributes });
  const p = panel({ house_power: "h" }, {
    h: st(1),
    "sensor.pv_prod": e("18.46"), "sensor.pv_feed": e("7.2"), "sensor.pv_self": e("61.2"), "sensor.pv_autarky": e("74.6"),
    "sensor.pv_fc": e("92.3"), "sensor.pv_benefit": e("4.2", { unit_of_measurement: "EUR" }),
    "sensor.pv_exp": e("9.8"), "sensor.pv_window": e("2026-11-13T10:00:00+00:00", { end: "2026-11-13T13:00:00+00:00", energy: 8.1 }),
    "sensor.pv_stor": e("5.4"), "sensor.pv_empty": e(empty),
    "binary_sensor.pv_fault": e(fault, { plants: ["Garage", "Carport"] }),
  });
  p._hass.language = "en";
  p._int = { pv_assistant: { entities } };
  return p;
}

test("pv assistant day: today's figures, tomorrow's forecast and the storage show as tiles", () => {
  const html = pvDayPanel()._renderPvDay();
  assert.match(html, /PV today and tomorrow/);
  assert.match(html, /Production<\/div><div class="eb-value">18\.5<small>kWh/);
  assert.match(html, /Feed-in<\/div><div class="eb-value">7\.2<small>kWh/);
  assert.match(html, /Self-consumption<\/div><div class="eb-value">61<small>%/);
  assert.match(html, /Self-sufficiency<\/div><div class="eb-value">75<small>%/);
  assert.match(html, /Forecast reached<\/div><div class="eb-value">92<small>%/);
  assert.match(html, /Benefit<\/div><div class="eb-value">4\.20<small>[^<]*</);
  assert.match(html, /Expected feed-in<\/div><div class="eb-value">9\.8<small>kWh/);
  assert.match(html, /Best window<\/div><div class="eb-value">[^<]*\d[^<]*–[^<]*\d/);
  assert.match(html, />Storage<\/div>/); // own group, not part of tomorrow
  assert.ok(html.indexOf("Storage usable") < html.indexOf(">Tomorrow<"));
  assert.match(html, /Storage usable<\/div><div class="eb-value">5\.4<small>kWh/);
  assert.match(html, /Storage empty at<\/div><div class="eb-value">[^<]*\d/);
  assert.doesNotMatch(html, /class="alert"/);
});

test("pv assistant day: a plant fault shows a warning with the plants", () => {
  const html = pvDayPanel({ fault: "on" })._renderPvDay();
  assert.match(html, /class="alert">⚠ Plant fault: Garage, Carport/);
});

test("pv assistant day: unknown values and missing entities leave tiles out, nothing without any", () => {
  const p = pvDayPanel({ entities: { production_today: "sensor.pv_prod" }, empty: "unknown" });
  const html = p._renderPvDay();
  assert.match(html, /Production/);
  assert.doesNotMatch(html, /Tomorrow|Storage|Feed-in/);
  assert.equal(pvDayPanel({ entities: {} })._renderPvDay().includes("tile"), false);
  const none = panel({ house_power: "h" }, { h: st(1) });
  none._int = {};
  assert.equal(none._renderPvDay(), "");
  const unavailable = pvDayPanel({ entities: { storage_empty_at: "sensor.pv_empty" }, empty: "unavailable" });
  assert.equal(unavailable._renderPvDay(), "");
});

test("pv assistant day: the card is the PV tab, the Power tab does not have it", () => {
  const p = pvDayPanel();
  p._ready = true;
  p._tab = "pv";
  assert.match(p._renderPage(), /PV today and tomorrow/);
  assert.doesNotMatch(p._renderHouse(), /PV today and tomorrow/);
});

// --- optional data from Amortix (savings and payback) -------------------------------------------
function amortixPanel({ entries, states = {} } = {}) {
  const e = (state, attributes = {}) => ({ state, attributes });
  const p = panel({ house_power: "h" }, {
    h: st(1),
    "sensor.am_sav": e("1234.5", { unit_of_measurement: "EUR" }),
    "sensor.am_inv": e("5000", { unit_of_measurement: "EUR" }),
    "sensor.am_prog": e("24.7"),
    "sensor.am_rem": e("3765.5", { unit_of_measurement: "EUR" }),
    "sensor.am_day": e("3.2", { unit_of_measurement: "EUR" }),
    "sensor.am_days": e("1177.4"),
    "sensor.am_date": e("2029-12-31T12:00:00+00:00"),
    ...states,
  });
  p._hass.language = "en";
  p._int = {
    amortix: {
      entries: entries ?? [
        { title: "Anlage", mode: "overview", entities: { einsparung: "sensor.am_sav", investition: "sensor.am_inv", fortschritt: "sensor.am_prog", verbleibend: "sensor.am_rem", tagesschnitt: "sensor.am_day", resttage: "sensor.am_days", datum: "sensor.am_date" } },
      ],
    },
  };
  return p;
}

test("amortix: savings, investment, progress, remaining, per day, days and date show as tiles", () => {
  const html = amortixPanel()._renderAmortix();
  assert.match(html, /<span class="eb-title">Payback<\/span>/);
  assert.match(html, />Anlage<\/div>/);
  assert.match(html, /Savings total<\/div><div class="eb-value">1,234\.50<small>[^<]*</);
  assert.match(html, /Investment<\/div><div class="eb-value">5,000\.00<small>[^<]*</);
  assert.match(html, /Progress<\/div><div class="eb-value">24\.7<small>%<\/small><\/div><div class="amo-bar"><div style="width:24\.7%">/);
  assert.match(html, /Remaining<\/div><div class="eb-value">3,765\.50/);
  assert.match(html, /Savings per day<\/div><div class="eb-value">3\.20/);
  assert.match(html, /Time left<\/div><div class="eb-value">1,177<small>days/);
  assert.match(html, /Payback date<\/div><div class="eb-value">[^<]*2029[^<]*</);
});

test("amortix: the progress bar stays between 0 and 100 percent", () => {
  const over = amortixPanel({ states: { "sensor.am_prog": { state: "140", attributes: {} } } })._renderAmortix();
  assert.match(over, /style="width:100%"/);
  const under = amortixPanel({ states: { "sensor.am_prog": { state: "-5", attributes: {} } } })._renderAmortix();
  assert.match(under, /style="width:0%"/);
});

test("amortix: unknown values are left out, nothing without values or without Amortix", () => {
  const p = amortixPanel({ states: { "sensor.am_date": { state: "unknown", attributes: {} }, "sensor.am_days": { state: "unavailable", attributes: {} } } });
  const html = p._renderAmortix();
  assert.doesNotMatch(html, /Payback date|Time left/);
  assert.match(html, /Savings total/);
  const empty = amortixPanel({ entries: [{ title: "x", entities: { einsparung: "sensor.missing" } }] });
  assert.equal(empty._renderAmortix(), "");
  const none = panel({ house_power: "h" }, { h: st(1) });
  none._int = {};
  assert.equal(none._renderAmortix(), "");
});

test("amortix: several entries show one block each; the card is the Payback tab", () => {
  const entries = [
    { title: "Balkon", entities: { einsparung: "sensor.am_sav" } },
    { title: "Wallbox", entities: { einsparung: "sensor.am_inv" } },
  ];
  const p = amortixPanel({ entries });
  const html = p._renderAmortix();
  assert.ok(html.indexOf("Balkon") < html.indexOf("Wallbox"));
  p._ready = true;
  p._tab = "amortix";
  assert.match(p._renderPage(), /<span class="eb-title">Payback<\/span>/);
  assert.doesNotMatch(p._renderHouse(), /Payback/);
});


// --- the notice lists every sibling integration that was found ----------------------------------
test("integrations notice: lists PV Assistant, Tariffy, EV Assistant and Amortix when they are found", () => {
  const p = pvPanel();
  p._pv = { targets: { solar_power: ["a"] }, notes: {}, plants: [] };
  p._int = {
    pv_assistant: { entities: { production_today: "sensor.x" } },
    tariffy: { price: "sensor.p" },
    ev_assistant: { vehicles: [{ name: "ID.3" }, { name: "Zoe" }] },
    amortix: { entries: [{ title: "Anlage", entities: {} }] },
  };
  const html = p._renderIntegrations(false);
  assert.match(html, /Detected integrations/);
  assert.match(html, /Do you want to take over its sensors/);
  assert.match(html, /PV Assistant: day figures, forecast and plant fault/);
  assert.match(html, /Tariffy: electricity price/);
  assert.match(html, /EV Assistant: wallbox and today.s charging in the EV tab \(ID\.3, Zoe\)/);
  assert.match(html, /Amortix: savings and payback/);
});

test("integrations notice: shows without a PV Assistant offer, and says nothing when nothing was found", () => {
  const p = pvPanel();
  p._pv = null;
  p._int = { tariffy: { price: "sensor.p" }, amortix: { entries: [{ title: "x", entities: {} }] } };
  const html = p._renderIntegrations(false);
  assert.match(html, /Tariffy/);
  assert.match(html, /Amortix/);
  assert.doesNotMatch(html, /data-pvapply|PV Assistant/);
  p._int = {};
  assert.equal(p._renderIntegrations(false), "");
  p._int = { pv_assistant: { entities: { production_today: "sensor.x" } } };
  assert.match(p._renderIntegrations(false), /PV Assistant: day figures/);
});


// --- tabs come with the integrations --------------------------------------------------------------
test("tabs: Power is always there, the others only for the integrations that were found, in a fixed order", () => {
  const p = panel({ house_power: "h" }, { h: st(1) });
  assert.deepEqual(p._tabs(), ["house"]);
  p._int = { amortix: { entries: [{}] }, tariffy: { price: "x" }, ev_assistant: { vehicles: [{}] }, pv_assistant: { entities: {} } };
  assert.deepEqual(p._tabs(), ["house", "pv", "ev", "costs", "amortix"]);
  p._int = { ev_assistant: { vehicles: [] }, amortix: { entries: [] } };
  assert.deepEqual(p._tabs(), ["house"]);
});

test("tabs: the PV tab also exists when PV Assistant offers at least two plants", () => {
  const p = panel({ house_power: "h" }, { h: st(1) });
  p._int = {};
  p._pv = { targets: {}, notes: {}, plants: [{ name: "a", sensors: [] }, { name: "b", sensors: [] }] };
  assert.deepEqual(p._tabs(), ["house", "pv"]);
  p._pv.plants = [{ name: "a", sensors: [] }];
  assert.deepEqual(p._tabs(), ["house"]);
});

test("tabs: labels follow the language, an empty tab says so", () => {
  const p = panel({ house_power: "h" }, { h: st(1) });
  p._hass.language = "de";
  assert.deepEqual(["house", "pv", "ev", "costs", "amortix"].map((t) => p._tabLabel(t)), ["Leistung", "PV", "EV", "Kosten", "Amortisation"]);
  p._ready = true;
  p._int = {};
  p._tab = "ev";
  assert.match(p._renderPage(), /class="stack"><div class="eb-card"><div class="empty">–/);
});

test("tabs: the Power tab holds the house, history and lists only", () => {
  const p = limitPanel({ devices: 6, areas: 2, labels: 2 });
  p._int = {
    tariffy: { price: "sensor.netz_leistung" },
    ev_assistant: { vehicles: [{ name: "x", live: "sensor.netz_leistung" }] },
    amortix: { entries: [{ title: "a", entities: { einsparung: "sensor.netz_leistung" } }] },
  };
  const html = p._renderHouse();
  assert.doesNotMatch(html, /Costs right now|Wallbox|Payback|PV today and tomorrow|PV by plant/);
  assert.match(html, /Devices/);
});


// --- where the solar production goes ------------------------------------------------------------
const splitOf = (cfg, states) => {
  const p = panel(cfg, states);
  const cur = p._current();
  return p._pvSplit(cur, cur.direct);
};

test("pv split: the production goes to the house, the storage and the grid, adding up to 100 %", () => {
  // PV 4329 W, house 1782 W, 50 W from the grid, 2597 W into the storage: 40 % house, 60 % storage
  const split = splitOf(
    { solar_power: ["pv"], grid_import: ["gi"], battery_charge: ["bc"], house_power: "h" },
    { pv: st(4329), gi: st(50), bc: st(2597), h: st(1782) },
  );
  assert.deepEqual(split, [{ key: "house", pct: 40 }, { key: "storage", pct: 60 }]);
});

test("pv split: export shows as grid, grid charging of the storage does not count as solar", () => {
  const withExport = splitOf(
    { solar_power: ["pv"], grid_export: ["ge"], grid_import: ["gi"], battery_charge: ["bc"], house_power: "h" },
    { pv: st(4000), ge: st(1000), gi: st(0), bc: st(1000), h: st(2000) },
  );
  assert.deepEqual(withExport, [{ key: "house", pct: 50 }, { key: "storage", pct: 25 }, { key: "grid", pct: 25 }]);
  const gridCharged = splitOf(
    { solar_power: ["pv"], grid_import: ["gi"], battery_charge: ["bc"], battery_grid_charge: ["bgc"], house_power: "h" },
    { pv: st(2000), gi: st(500), bc: st(1000), bgc: st(500), h: st(1500) },
  );
  assert.deepEqual(gridCharged, [{ key: "house", pct: 75 }, { key: "storage", pct: 25 }]); // 1500 W solar to the house, 500 W solar into the storage
});

test("pv split: whole percentages always add up to 100, parts that round to 0 % are left out", () => {
  const split = splitOf(
    { solar_power: ["pv"], grid_export: ["ge"], grid_import: ["gi"], battery_charge: ["bc"], house_power: "h" },
    { pv: st(3000), ge: st(1000), gi: st(0), bc: st(1000), h: st(1000) },
  );
  assert.equal(split.reduce((a, p) => a + p.pct, 0), 100); // 33.3 / 33.3 / 33.3
  const tiny = splitOf(
    { solar_power: ["pv"], grid_export: ["ge"], grid_import: ["gi"], house_power: "h" },
    { pv: st(3000), ge: st(3), gi: st(0), h: st(2997) },
  );
  assert.deepEqual(tiny, [{ key: "house", pct: 100 }]);
});

test("pv split: nothing without production", () => {
  assert.equal(splitOf({ grid_import: ["gi"], house_power: "h" }, { gi: st(500), h: st(500) }), null);
  assert.equal(splitOf({ solar_power: ["pv"], grid_import: ["gi"], house_power: "h" }, { pv: st(0), gi: st(500), h: st(500) }), null);
});

test("pv split: shows as the line under the direct tile", () => {
  const p = panel(
    { solar_power: ["pv"], grid_import: ["gi"], battery_charge: ["bc"], house_power: "h" },
    { pv: st(4329), gi: st(50), bc: st(2597), h: st(1782) },
  );
  p._ready = true;
  p._hass.language = "en";
  assert.match(p._renderHouse(), /1[.,]?732<small>W<\/small><\/div> <div class="eb-label"[^>]*>40 % House · 60 % Storage</);
  p._hass.language = "de";
  assert.match(p._renderHouse(), />40 % Haus · 60 % Speicher</);
});


// --- the wallbox as a row of the device list ------------------------------------------------------
function evDevicePanel({ cfg = {}, vehicles, live = { charge_power: 7.4, charging: true, session_solar_pct: 72 }, extraStates = {} } = {}) {
  const states = {
    "sensor.herd_leistung": { state: "900", attributes: { device_class: "power", unit_of_measurement: "W", friendly_name: "Herd" } },
    "sensor.ev_home": { state: "812", attributes: { evcc_live: live } },
    h: st(10000),
    ...extraStates,
  };
  const p = panel({ house_power: "h", device_power: ["sensor.herd_leistung"], ...cfg }, states);
  p._hass.language = "en";
  p._hass.user = { is_admin: true };
  p._int = { ev_assistant: { vehicles: vehicles ?? [{ name: "ID.3", live: "sensor.ev_home", wallbox_power: "sensor.wallbox_leistung" }] } };
  return p;
}

test("ev rows: the wallbox is a row of the device list, with its solar share as tooltip", () => {
  const p = evDevicePanel();
  const rows = p._devices();
  assert.deepEqual(rows.map((d) => [d.name, Math.round(d.w)]), [["Wallbox · ID.3", 7400], ["Herd", 900]]);
  const html = p._renderDevices(10000);
  assert.match(html, /Wallbox · ID\.3/);
  assert.match(html, /Solar share 72 %/);
});

test("ev rows: the total in the header still equals the house power and the rest shrinks", () => {
  const p = evDevicePanel();
  const html = p._renderDevices(10000);
  assert.match(html, /10[.,\s]?000 W/); // 7400 + 900 + rest 1700
  assert.match(html, /1[.,\s]?700<small>W/); // "Other (not measured)" without the wallbox would be 9100
});

test("ev rows: nothing is counted twice when the wallbox sensor is already a device", () => {
  const p = evDevicePanel({ cfg: { device_power: ["sensor.herd_leistung", "sensor.wallbox_leistung"] }, extraStates: { "sensor.wallbox_leistung": { state: "7400", attributes: { device_class: "power", unit_of_measurement: "W", friendly_name: "Wallbox" } } } });
  assert.deepEqual(p._devices().map((d) => d.name), ["Wallbox", "Herd"]);
});

test("ev rows: an excluded wallbox sensor stays out, also the virtual row", () => {
  assert.deepEqual(evDevicePanel({ cfg: { device_exclude: ["sensor.wallbox_leistung"] } })._devices().map((d) => d.name), ["Herd"]);
  assert.deepEqual(evDevicePanel({ cfg: { device_exclude_patterns: ["*wallbox*"] } })._devices().map((d) => d.name), ["Herd"]);
});

test("ev rows: no row without live data, an idle wallbox shows as idle, the row works without configured devices", () => {
  assert.deepEqual(evDevicePanel({ live: {} })._devices().map((d) => d.name), ["Herd"]);
  const idle = evDevicePanel({ live: { charge_power: 0, charging: false } });
  assert.deepEqual(idle._devices().map((d) => d.name), ["Herd", "Wallbox · ID.3"]);
  assert.match(idle._renderDevices(2000), /1 idle|idle/); // 0 W is counted as idle, not listed
  const alone = evDevicePanel({ cfg: { device_power: [] } });
  assert.match(alone._renderDevices(10000), /Wallbox · ID\.3/);
  const gone = evDevicePanel({ cfg: { device_power: [] }, vehicles: [] });
  assert.equal(gone._renderDevices(10000), "");
});

// --- cards can be folded -------------------------------------------------------------------------
function foldCard(title, { glow = false, noRow = false } = {}) {
  const classes = new Set(glow ? ["eb-card", "eb-card--glow"] : ["eb-card"]);
  const attrs = {};
  const card = {
    classes,
    classList: {
      contains: (c) => classes.has(c),
      toggle: (c, on) => {
        const next = on === undefined ? !classes.has(c) : on;
        if (next) classes.add(c);
        else classes.delete(c);
      },
    },
    querySelector: (sel) => (sel === ":scope > .row" && !noRow ? row : null),
  };
  const row = {
    attrs,
    setAttribute: (k, v) => { attrs[k] = v; },
    querySelector: (sel) => (sel === ".eb-title" ? { textContent: `  ${title}  ` } : null),
    closest: () => card,
  };
  return { card, row };
}

function withStorage(initial, fn) {
  const store = { ...initial };
  const old = globalThis.localStorage;
  globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
  try { return fn(store); } finally { globalThis.localStorage = old; }
}

test("fold: every card with a title row can be folded, the house card stays open", () => {
  withStorage({}, () => {
    const p = new Panel();
    const house = foldCard("Haus", { glow: true });
    const devices = foldCard("Devices");
    const plain = foldCard("x", { noRow: true });
    p._applyCollapse({ querySelectorAll: () => [house.card, devices.card, plain.card] });
    assert.equal(devices.row.attrs["data-collapse-toggle"], "");
    assert.equal(devices.row.attrs["aria-expanded"], "true");
    assert.equal(devices.row.attrs.role, "button");
    assert.equal(house.row.attrs["data-collapse-toggle"], undefined);
    assert.equal(devices.card.classes.has("collapsed"), false);
  });
});

test("fold: a click folds the card and the choice is remembered, also after a redraw", () => {
  withStorage({}, (store) => {
    const p = new Panel();
    const devices = foldCard("Devices");
    p._toggleCollapse(devices.row);
    assert.equal(devices.card.classes.has("collapsed"), true);
    assert.equal(devices.row.attrs["aria-expanded"], "false");
    assert.deepEqual(JSON.parse(store["energy_assistant.collapsed"]), ["Devices"]);
    // a redraw delivers new markup: the state is applied again
    const fresh = foldCard("Devices");
    p._applyCollapse({ querySelectorAll: () => [fresh.card] });
    assert.equal(fresh.card.classes.has("collapsed"), true);
    // a second click unfolds again
    p._toggleCollapse(fresh.row);
    assert.equal(fresh.card.classes.has("collapsed"), false);
    assert.deepEqual(JSON.parse(store["energy_assistant.collapsed"]), []);
  });
});

test("fold: the remembered state is read from the browser storage", () => {
  withStorage({ "energy_assistant.collapsed": JSON.stringify(["Areas", 5, null]) }, () => {
    const p = new Panel();
    const areas = foldCard("Areas");
    const labels = foldCard("Labels");
    p._applyCollapse({ querySelectorAll: () => [areas.card, labels.card] });
    assert.equal(areas.card.classes.has("collapsed"), true);
    assert.equal(labels.card.classes.has("collapsed"), false);
  });
});

test("fold: without usable storage everything still works for the session", () => {
  const old = globalThis.localStorage;
  globalThis.localStorage = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
  try {
    const p = new Panel();
    const devices = foldCard("Devices");
    p._applyCollapse({ querySelectorAll: () => [devices.card] });
    p._toggleCollapse(devices.row);
    assert.equal(devices.card.classes.has("collapsed"), true);
  } finally {
    globalThis.localStorage = old;
  }
  const none = new Panel(); // no storage at all
  const card = foldCard("Devices");
  none._toggleCollapse(card.row);
  assert.equal(card.card.classes.has("collapsed"), true);
});

// --- the history chart (in the style of the power chart of PV Assistant, from our own sensors) -----
const T0 = Date.UTC(2026, 10, 12, 0, 0, 0);
function historyPoints({ storage = true, gridOut = true } = {}) {
  const pts = [];
  for (let k = 0; k <= 288; k++) {
    const hour = k / 12;
    const solar = hour > 8 && hour < 16 ? 4000 : 0;
    const charge = hour > 11 && hour < 14 ? 2500 : 0;
    pts.push({
      t: T0 + k * 5 * 60000,
      v: 400 + (hour > 9 && hour < 10 ? 10000 : 0),
      d: Math.min(solar, 1500),
      solar,
      gridOut: gridOut ? (hour > 13 ? 300 : 0) : null,
      gridIn: hour > 9 && hour < 10 ? 9500 : 100,
      net: storage ? (hour > 18 ? 800 : -charge) : null,
    });
  }
  return pts;
}

test("history chart: the axis rounds like the power chart of PV Assistant", () => {
  const p = new Panel();
  assert.deepEqual(p._niceTicks(-3500, 11500), [-5000, 0, 5000, 10000, 15000]);
  assert.deepEqual(p._niceTicks(0, 0), [0, 0.25, 0.5, 0.75, 1]);
  assert.deepEqual(p._niceTicks(0, 4300), [0, 2000, 4000, 6000]);
});

test("history chart: the series come in the order and with the legend of PV Assistant, empty ones are left out", () => {
  const p = new Panel();
  p._hass = { language: "en" };
  const all = p._historySeries(historyPoints());
  assert.deepEqual(all.map((s) => s.key), ["prod", "feed", "net", "direct", "grid", "house"]);
  assert.deepEqual(all.map((s) => s.name), ["Production", "Feed-in", "Storage", "Used directly", "Grid import", "House consumption"]);
  assert.deepEqual(all[2].legendItems.map((i) => i.name), ["From storage (+)", "To storage (−)"]);
  const none = p._historySeries(historyPoints({ storage: false, gridOut: false }));
  assert.deepEqual(none.map((s) => s.key), ["prod", "direct", "grid", "house"]);
  p._hass = { language: "de" };
  assert.deepEqual(p._historySeries(historyPoints()).map((s) => s.name), ["Erzeugung", "Einspeisung", "Speicher", "Direkt verbraucht", "Netzbezug", "Hausverbrauch"]);
});

test("history chart: markup with lines, legend, end labels, storage in two colors and the table", () => {
  const p = new Panel();
  p._hass = { language: "en" };
  const html = p._historyChart(historyPoints());
  assert.match(html, /class="hchart"/);
  assert.equal((html.match(/<path d="M/g) || []).length, 6 + 1 + 1); // 6 lines, the storage drawn twice (above/below zero), plus the area
  assert.match(html, /<path d="M[^"]*Z" fill="var\(--ea-prod\)" opacity="\.12"\/>/); // light area under the production
  assert.match(html, /clip-path="url\(#ea-clip-n\)"/);
  assert.match(html, /<span><i style="background:var\(--ea-bout\)"><\/i>From storage \(\+\)<\/span>/);
  assert.match(html, /<span><i style="background:var\(--ea-bin\)"><\/i>To storage \(−\)<\/span>/);
  for (const label of ["Production", "Feed-in", "Storage", "Direct", "Grid", "House"]) assert.match(html, new RegExp(`class="hend"[^>]*>${label}<`));
  assert.match(html, /<summary>Show as table<\/summary>/);
  assert.ok((html.match(/<tr><th>/g) || []).length >= 24); // one row per hour
  assert.match(html, />-?5[.,]?000<\/text>/); // axis in whole watts
});

test("history chart: a narrow chart has no end labels, the table state is kept", () => {
  const p = new Panel();
  p._hass = { language: "en" };
  p._chartW = 400;
  assert.doesNotMatch(p._historyChart(historyPoints()), /class="hend"/);
  assert.doesNotMatch(p._historyChart(historyPoints()), /<details class="tableview" open>/);
  p._tableOpen = true;
  assert.match(p._historyChart(historyPoints()), /<details class="tableview" open>/);
});

test("history chart: names in the table and legend are HTML-escaped; too little data says so", () => {
  const p = new Panel();
  p._hass = { language: "en" };
  assert.match(p._historyChart([{ t: T0, v: 100 }, { t: T0 + 300000, v: null }]), /No history available yet/);
  assert.match(p._historyChart([]), /No history available yet/);
  assert.equal(p._hv, null);
});

test("history chart: the tooltip shows the nearest bucket with all values, the storage in the color of its direction", () => {
  const p = new Panel();
  p._hass = { language: "en" };
  p._historyChart(historyPoints());
  const at = (hour) => p._tipAt(T0 + hour * 3600000 + 60000); // a minute after the full hour
  const noon = at(12); // charging 2500 W
  const storageNoon = noon.rows.find((r) => r.name === "Storage (+ discharge / − charge)");
  assert.equal(storageNoon.value, -2500);
  assert.equal(storageNoon.color, "--ea-bin");
  assert.equal(noon.ts, T0 + 12 * 3600000);
  const evening = at(19);
  const out = evening.rows.find((r) => r.name === "Storage (+ discharge / − charge)");
  assert.deepEqual([out.value, out.color], [800, "--ea-bout"]);
  assert.equal(noon.rows.length, 6);
  assert.equal(p._tipAt(T0 - 99999999).ts, T0); // outside: the first bucket
  const none = new Panel();
  assert.equal(none._tipAt(0), null);
});

// points with the data of the sources, as _buildSeries delivers them
function partsPoints(extra) {
  const pts = historyPoints();
  Object.assign(pts[0], { sp: [168, 2241, 633, 167] }); // overwritten below for the tested bucket
  pts.meta = { solarNames: ["Anbau", "Garage", "BKW 1", "BKW 2"] };
  return { pts, set: (k, o) => Object.assign(pts[k], o) };
}

test("tooltip parts: the production shows its plants with their share, the direct use what it is made of", () => {
  const p = new Panel();
  p._hass = { language: "en" };
  const { pts, set } = partsPoints();
  const k = 12 * 12; // 12:00
  set(k, { solar: 3209, sp: [168, 2241, 633, 167], v: 3107, d: 3107, measured: true, gridIn: 0, discharge: 0, gridOut: 103, charge: 0 });
  p._historyChart(pts);
  const tip = p._tipAt(pts[k].t);
  const prod = tip.rows.find((r) => r.name === "Production");
  assert.deepEqual(prod.parts.map((x) => [x.name, x.value, x.note]), [["Anbau", 168, "5 %"], ["Garage", 2241, "70 %"], ["BKW 1", 633, "20 %"], ["BKW 2", 167, "5 %"]]);
  // measured house: the house consumption minus import and storage; zero parts are left out
  const direct = tip.rows.find((r) => r.name === "Used directly");
  assert.deepEqual(direct.parts.map((x) => [x.name, x.value]), [["House consumption", 3107]]);
  // a house that is only calculated: production minus feed-in and charging
  set(k, { measured: false, gridOut: 103, charge: 500, gridCharge: 0, d: 2606, v: 2606 });
  p._historyChart(pts);
  const calc = p._tipAt(pts[k].t).rows.find((r) => r.name === "Used directly");
  assert.deepEqual(calc.parts.map((x) => [x.name, x.value]), [["Production", 3209], ["− Feed-in", -103], ["− To storage", -500]]);
});

test("tooltip parts: a single plant has no split, other series have none", () => {
  const p = new Panel();
  p._hass = { language: "en" };
  const { pts, set } = partsPoints();
  pts.meta = { solarNames: ["Garage"] };
  set(12 * 12, { sp: [3000], solar: 3000 });
  p._historyChart(pts);
  const tip = p._tipAt(pts[12 * 12].t);
  assert.deepEqual(tip.rows.find((r) => r.name === "Production").parts, []);
  assert.deepEqual(tip.rows.find((r) => r.name === "Grid import").parts, []);
});

test("history: the buckets carry production, feed-in, import and the storage balance", () => {
  const p = panel(
    { solar_power: ["pv"], grid_import: ["gi"], grid_export: ["ge"], battery_charge: ["bc"], battery_discharge: ["bd"] },
    {},
  );
  const rows = (v) => [{ s: String(v), lu: 0 }];
  const pts = p._buildSeries({ pv: rows(3000), gi: rows(100), ge: rows(200), bc: rows(500), bd: rows(50) }, 0, 3600 * 1000);
  assert.equal(pts[0].solar, 3000);
  assert.equal(pts[0].gridIn, 100);
  assert.equal(pts[0].gridOut, 200);
  assert.equal(pts[0].net, -450); // 50 W out, 500 W in
  assert.equal(pts[0].discharge, 50);
  assert.equal(pts[0].charge, 500);
  assert.deepEqual(pts[0].sp, [3000]);
  assert.deepEqual(pts.meta.solarNames, ["pv"]);
  assert.equal(pts[0].measured, false);
  const without = panel({ solar_power: ["pv"], grid_import: ["gi"] }, {})._buildSeries({ pv: rows(3000), gi: rows(100) }, 0, 3600 * 1000);
  assert.equal(without[0].net, null);
});

// --- the balance tab (energy counters, long-term statistics) -----------------------------------------
const ENERGY_CFG = {
  energy_solar: ["sensor.pv_e", "sensor.balkon_e"],
  energy_grid_import: ["sensor.imp_e"],
  energy_grid_export: ["sensor.exp_e"],
  energy_battery_charge: ["sensor.chg_e"],
  energy_battery_discharge: ["sensor.dis_e"],
};
function balPanel(cfg = ENERGY_CFG, extra = {}) {
  const p = panel({ house_power: "h", ...cfg }, { h: st(1), ...extra });
  p._hass.language = "en";
  p._ready = true;
  p._render = () => {};
  return p;
}

test("balance: the periods are a day per hour, a week from Monday, a month per day and a year per month", () => {
  const p = balPanel();
  const day = p._balWindow("day", 0);
  assert.equal(day.bucket, "hour");
  assert.ok([23, 24, 25].includes(day.edges.length - 1)); // 23 or 25 on the days of the clock change
  assert.equal(new Date(day.start).getHours(), 0);
  const week = p._balWindow("week", 0);
  assert.equal(week.edges.length - 1, 7);
  assert.equal(new Date(week.start).getDay(), 1); // Monday
  const month = p._balWindow("month", 0);
  assert.equal(new Date(month.start).getDate(), 1);
  assert.ok([28, 29, 30, 31].includes(month.edges.length - 1));
  const year = p._balWindow("year", 0);
  assert.equal(year.edges.length - 1, 12);
  assert.equal(new Date(year.start).getMonth(), 0);
  for (const range of ["day", "week", "month", "year"]) {
    assert.equal(p._balWindow(range, -1).end, p._balWindow(range, 0).start); // the previous period ends where this one starts
  }
  assert.equal(p._balWindow("nonsense", 0).bucket, "hour");
});

test("balance: the changes of the counters are summed per bucket and category", () => {
  const p = balPanel();
  const win = p._balWindow("week", 0);
  const day = (i) => win.edges[i];
  const res = {
    "sensor.pv_e": [{ start: day(0), change: 5 }, { start: day(2), change: 7.5 }],
    "sensor.balkon_e": [{ start: new Date(day(0)).toISOString(), change: 1 }, { start: day(2), change: null }],
    "sensor.imp_e": [{ start: day(1), change: 3 }, { start: win.start - 86400000, change: 99 }, { start: win.end + 1, change: 99 }],
  };
  const b = p._balBuckets(win, res);
  assert.deepEqual(b.solar, [6, null, 7.5, null, null, null, null]);
  assert.deepEqual(b.imp, [null, 3, null, null, null, null, null]);
  assert.equal(b.house, undefined); // no counter for the house
  assert.deepEqual(Object.keys(b).sort(), ["chg", "dis", "exp", "imp", "solar"]);
});

test("balance: consumption, self-consumption and self-sufficiency", () => {
  const p = balPanel();
  const win = p._balWindow("week", 0);
  const n = 7;
  const zero = Array(n).fill(null);
  const set = (arr, i, v) => { const a = [...arr]; a[i] = v; return a; };
  const buckets = {
    solar: set(zero, 0, 10), imp: set(zero, 0, 4), exp: set(zero, 0, 2), chg: set(zero, 0, 3), dis: set(zero, 0, 1),
  };
  const { rows, totals } = p._balCompute(buckets, win);
  assert.equal(rows[0].cons, 10 + 4 + 1 - 2 - 3); // 10
  assert.equal(totals.cons, 10);
  assert.equal(totals.self, 80); // (10 - 2) / 10
  assert.equal(totals.autarky, 60); // (10 - 4) / 10
  // a measured house counter wins
  const measured = p._balCompute({ ...buckets, house: set(zero, 0, 12) }, win);
  assert.equal(measured.totals.cons, 12);
  // without the import counter the consumption is unknown
  const noImp = p._balCompute({ solar: set(zero, 0, 10) }, win);
  assert.equal(noImp.totals.cons, null);
  assert.equal(noImp.totals.autarky, null);
  assert.equal(noImp.totals.self, 100);
  // no production: no self-consumption share
  assert.equal(p._balCompute({ imp: set(zero, 0, 5) }, win).totals.self, null);
});

test("balance: the statistics are asked for with the counters, the period and kWh", async () => {
  const p = balPanel();
  const calls = [];
  p._hass.callWS = async (msg) => { calls.push(msg); return {}; };
  p._tab = "balance";
  p._maybeLoadBalance();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(calls.length, 2); // this period and the one before
  const first = calls[0];
  assert.equal(first.type, "recorder/statistics_during_period");
  assert.equal(first.period, "hour");
  assert.deepEqual(first.types, ["change"]);
  assert.deepEqual(first.units, { energy: "kWh" });
  assert.deepEqual([...first.statistic_ids].sort(), ["sensor.balkon_e", "sensor.chg_e", "sensor.dis_e", "sensor.exp_e", "sensor.imp_e", "sensor.pv_e"]);
  assert.equal(p._bal.range, "day");
  p._maybeLoadBalance(); // fresh data: no new request
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(calls.length, 2);
  p._balRange = "month";
  p._maybeLoadBalance();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(calls.length, 4);
  assert.equal(calls[2].period, "day");
});

test("balance: a failing request says there is no data instead of breaking", async () => {
  const p = balPanel();
  p._hass.callWS = async () => { throw new Error("no recorder"); };
  await p._loadBalance();
  assert.equal(p._bal.failed, true);
  assert.match(p._renderBalance(), /No data for this period/);
});

function loadedBalance(extra = {}, off = 0) {
  const p = balPanel(ENERGY_CFG, extra);
  const win = p._balWindow("week", off);
  const col = (...v) => v.concat(Array(7 - v.length).fill(null));
  const buckets = { solar: col(10, 20), imp: col(4, 2), exp: col(2, 5), chg: col(3), dis: col(1) };
  const prevBuckets = { solar: col(10), imp: col(8), exp: col(1) };
  const prevWin = p._balWindow("week", off - 1);
  p._balRange = "week";
  p._balOff = off;
  p._bal = {
    range: "week", off, win, at: Date.now(), failed: false,
    ...p._balCompute(buckets, win),
    before: p._balCompute(prevBuckets, prevWin).totals,
  };
  return p;
}

test("balance: tiles with totals, the change to the period before and the shares", () => {
  const html = loadedBalance()._renderBalance();
  assert.match(html, /<span class="eb-title">Balance<\/span>/);
  assert.match(html, /Production<\/div><div class="eb-value">30\.0<small>kWh/);
  assert.match(html, /▲ 200 % vs\. previous period/); // 30 kWh against 10
  assert.match(html, /Grid import<\/div><div class="eb-value">6\.0<small>kWh/);
  assert.match(html, /▼ 25 % vs\. previous period/); // 6 against 8
  assert.match(html, /Feed-in<\/div><div class="eb-value">7\.0<small>kWh/);
  assert.match(html, /To storage<\/div><div class="eb-value">3\.0/);
  assert.match(html, /From storage<\/div><div class="eb-value">1\.0/);
  assert.match(html, /Consumption<\/div><div class="eb-value">/);
  assert.match(html, /Self-sufficiency<\/div><div class="eb-value">\d+<small>%/);
  assert.match(html, /Self-consumption<\/div><div class="eb-value">77<small>%/); // (30 - 7) / 30
  assert.doesNotMatch(html, /Grid cost/); // without Tariffy no money
});

test("balance: with Tariffy the grid cost, the feed-in revenue and the balance are shown", () => {
  const p = loadedBalance({
    "sensor.t_preis": { state: "0.30", attributes: { unit_of_measurement: "EUR/kWh", arbeitspreis_aktuell: 0.99 } },
    "sensor.t_einsp": { state: "0.08", attributes: { unit_of_measurement: "EUR/kWh" } },
  });
  p._int = { tariffy: { price: "sensor.t_preis", feed_in: "sensor.t_einsp" } };
  const html = p._renderBalance();
  assert.match(html, /Grid cost<\/div><div class="eb-value">1\.80<small>[^<]*</); // 6 kWh x 0.30 (contract price, not the live price)
  assert.match(html, /Feed-in revenue<\/div><div class="eb-value">0\.56/); // 7 x 0.08
  assert.match(html, /Balance<\/div><div class="eb-value">-1\.24/);
  assert.match(html, /Valued with the price of the Tariffy contract/);
});

test("balance: the picker marks the range, 'next' is off for the current period and the label follows", () => {
  const p = loadedBalance();
  let html = p._renderBalance();
  assert.match(html, /<button type="button" class="seg on" data-brange="week">Week<\/button>/);
  assert.match(html, /data-bnav="1"[^>]*disabled/);
  p._onClick({ target: { closest: (sel) => (sel === "[data-bnav]" ? { dataset: { bnav: "-1" } } : null) } });
  assert.equal(p._balOff, -1);
  p._onClick({ target: { closest: (sel) => (sel === "[data-bnav]" ? { dataset: { bnav: "1" } } : null) } });
  p._onClick({ target: { closest: (sel) => (sel === "[data-bnav]" ? { dataset: { bnav: "1" } } : null) } });
  assert.equal(p._balOff, 0); // never into the future
  p._onClick({ target: { closest: (sel) => (sel === "[data-brange]" ? { dataset: { brange: "year" } } : null) } });
  assert.equal(p._balRange, "year");
  assert.equal(p._balOff, 0);
  html = p._renderBalance(); // data of another range: loading until the new data is there
  assert.match(html, /Loading/);
  assert.match(p._balLabel(p._balWindow("year", 0)), /^\d{4}$/);
});

test("balance: the bar chart has a bar per bucket and series, a title tooltip and the table with the sum", () => {
  const html = loadedBalance()._renderBalance();
  assert.match(html, /<span class="eb-title">Energy per period<\/span>/);
  assert.equal((html.match(/<rect x="[^"]*" y="[^"]*" width="[^"]*" height="[^"]*" fill="var\(--ea-prod\)"/g) || []).length, 2); // two days with production
  assert.match(html, /<title>[^<]*Production: 10[.,]00 kWh&#10;/);
  assert.match(html, /<summary>Show as table<\/summary>/);
  assert.match(html, /<th>Sum<\/th><td>30[.,]00<\/td>/);
  assert.equal((html.match(/<tr><th>/g) || []).length, 1 + 7 + 1); // the header, seven days and the sum row
});

test("balance: a period without any energy says so, the table state is kept", () => {
  const p = loadedBalance();
  const win = p._bal.win;
  p._bal = { ...p._bal, ...p._balCompute({ solar: Array(7).fill(0), imp: Array(7).fill(0) }, win) };
  assert.match(p._renderBalance(), /No data for this period/);
  const q = loadedBalance();
  q._balTableOpen = true;
  assert.match(q._renderBalance(), /<details class="tableview" open>/);
});

test("balance: the tab exists only with energy counters and comes right after Power", () => {
  const none = panel({ house_power: "h" }, { h: st(1) });
  assert.equal(none._balEnabled(), false);
  assert.deepEqual(none._tabs(), ["house"]);
  const p = balPanel({ energy_solar: ["sensor.pv_e"] });
  p._int = { tariffy: { price: "x" } };
  assert.deepEqual(p._tabs(), ["house", "balance", "costs"]);
  p._hass.language = "de";
  assert.equal(p._tabLabel("balance"), "Bilanz");
  p._tab = "balance";
  p._bal = null;
  assert.match(p._renderPage(), /Lädt …/);
});

// --- the energy counters in the settings and the offer of the Energy dashboard -------------------
test("energy settings: the counters are part of the form and of the draft", () => {
  const p = balPanel();
  p._draft = p._normalize({ energy_solar: ["sensor.pv_e"] });
  assert.deepEqual(p._draft.energy_solar, ["sensor.pv_e"]);
  assert.deepEqual(p._draft.energy_house, []);
  p._draftAdd("energy_solar", "sensor.balkon_e", "emulti");
  p._draftAdd("energy_solar", "sensor.balkon_e", "emulti"); // no duplicates
  assert.deepEqual(p._draft.energy_solar, ["sensor.pv_e", "sensor.balkon_e"]);
  p._hass.states["sensor.pv_e"] = { state: "1", attributes: { device_class: "energy", friendly_name: "PV gesamt" } };
  p._hass.states["sensor.watt"] = { state: "1", attributes: { device_class: "power" } };
  assert.deepEqual(p._energyCandidates().map((c) => c.id), ["sensor.pv_e"]);
  const html = p._renderSettings();
  assert.match(html, /Energy counters \(kWh\)/);
  assert.match(html, /data-add="energy_solar" data-mode="emulti" list="eb-energy"/);
  assert.match(html, /<datalist id="eb-energy"><option value="sensor\.pv_e">PV gesamt<\/option><\/datalist>/);
  assert.match(html, /utility meters/);
});

test("energy settings: the offer of the Energy dashboard can be taken over by administrators", async () => {
  const p = balPanel();
  p._draft = p._normalize({ house_power: "h" });
  p._edited = () => {};
  p._hass.user = { is_admin: true };
  p._hass.callWS = async (msg) => (msg.type === "energy_assistant/energy_suggestion" ? { targets: { energy_solar: ["sensor.pv_e"], energy_grid_import: ["sensor.imp_e"] } } : {});
  await p._loadEnergyOffer();
  let html = p._renderSettings();
  assert.match(html, /The Energy dashboard of Home Assistant has counters\. Do you want to take them over\?/);
  assert.match(html, /data-energyapply/);
  p._onClick({ target: { closest: (sel) => (sel === "[data-energyapply]" ? {} : null) } });
  assert.deepEqual(p._draft.energy_solar, ["sensor.pv_e"]);
  assert.deepEqual(p._draft.energy_grid_import, ["sensor.imp_e"]);
  html = p._renderSettings();
  assert.match(html, /counters of the Energy dashboard are in use/);
  assert.doesNotMatch(html, /data-energyapply/);
  // read-only users see the question but no button
  p._draft = p._normalize({ house_power: "h" });
  p._hass.user = { is_admin: false };
  html = p._renderSettings();
  assert.match(html, /Do you want to take them over/);
  assert.doesNotMatch(html, /data-energyapply/);
});

test("energy settings: no dashboard, no offer, and an error changes nothing", async () => {
  const p = balPanel();
  p._draft = p._normalize({});
  p._hass.callWS = async () => null;
  await p._loadEnergyOffer();
  assert.equal(p._energyOffer, null);
  assert.doesNotMatch(p._renderSettings(), /data-energyapply|Do you want to take them over/);
  p._hass.callWS = async () => { throw new Error("unknown command"); };
  await p._loadEnergyOffer();
  assert.equal(p._energyOffer, null);
});

// --- consumption tab: base load, biggest consumers today, always-on devices ----------------------------
const STEP = 5 * 60000;
function usageNow() {
  const t1 = new Date();
  t1.setHours(12, 0, 0, 0);
  return { t1: t1.getTime(), t0: t1.getTime() - 24 * 3600000 };
}
// history rows of a power sensor: [hour from t0, watts] pairs held until the next one
const hrows = (t0, pairs) => pairs.map(([h, w]) => ({ lu: (t0 + h * 3600000) / 1000, s: String(w) }));

function usagePanel(extra = {}) {
  const p = panel({ house_power: "h", device_power: ["sensor.a", "sensor.b", "sensor.c"] }, { h: st(1), ...extra });
  p._hass.language = "en";
  p._ready = true;
  p._render = () => {};
  return p;
}

test("base load: the lowest half hour of the values without a gap", () => {
  const p = new Panel();
  const v = Array(40).fill(500);
  for (let k = 10; k < 26; k++) v[k] = 80; // eighty minutes at 80 W
  assert.equal(p._baseline(v), 80);
  v[14] = null; // a gap breaks the windows that contain it, the rest of the dip still has a full half hour
  assert.equal(p._baseline(v), 80);
  const short = Array(40).fill(500);
  for (let k = 10; k < 14; k++) short[k] = 80; // only twenty minutes low: the half hour includes higher values
  assert.ok(p._baseline(short) > 80);
  assert.equal(p._baseline(Array(40).fill(null)), null); // nothing
  assert.equal(p._baseline(Array(8).fill(300)), null); // too little data
  assert.equal(p._baseline(null), null);
  const negative = Array(20).fill(-5);
  assert.equal(p._baseline(negative), 0); // negative readings count as 0
});

test("usage: the energy since midnight and the always-on power per device", () => {
  const p = usagePanel();
  const { t0, t1 } = usageNow();
  const res = {
    "sensor.a": hrows(t0, [[0, 1000]]), // 1 kW the whole time: 12 h since midnight = 12 kWh
    "sensor.b": hrows(t0, [[0, 300], [3, 5], [20, 300]]), // 5 W standby for hours
    "sensor.c": undefined, // no history: left out
  };
  const u = p._usageCompute(res, ["sensor.a", "sensor.b", "sensor.c"], t0, t1);
  assert.deepEqual(u.devices.map((d) => d.id), ["sensor.a", "sensor.b"]);
  const a = u.devices[0], b = u.devices[1];
  assert.ok(Math.abs(a.kwh - 12) < 1e-9);
  assert.equal(a.baseW, 1000);
  assert.equal(b.baseW, 5);
  // b: 300 W until 03:00 (before midnight? t0 is 12:00 yesterday, so 12 h before midnight), 5 W from 15:00 to 08:00, 300 W after
  assert.ok(b.kwh > 0 && b.kwh < 12);
});

test("usage: the consumption tab exists only with devices and comes right after Power", () => {
  const none = panel({ house_power: "h" }, { h: st(1) });
  assert.equal(none._usageEnabled(), false);
  assert.deepEqual(none._tabs(), ["house"]);
  const byPattern = panel({ house_power: "h", device_patterns: ["*_leistung"] }, { h: st(1) });
  assert.equal(byPattern._usageEnabled(), true);
  const p = usagePanel({});
  p._cfg.energy_solar = ["sensor.pv_e"];
  assert.deepEqual(p._tabs(), ["house", "usage", "balance"]);
  p._hass.language = "de";
  assert.equal(p._tabLabel("usage"), "Verbrauch");
});

test("usage: the history of the devices is asked for once and refreshed after five minutes", async () => {
  const p = usagePanel();
  const calls = [];
  p._hass.callWS = async (msg) => { calls.push(msg); return {}; };
  p._tab = "usage";
  p._maybeLoadUsage();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].type, "history/history_during_period");
  assert.deepEqual(calls[0].entity_ids, ["sensor.a", "sensor.b", "sensor.c"]);
  assert.equal(calls[0].minimal_response, true);
  p._maybeLoadUsage();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(calls.length, 1);
  p._usage.at = Date.now() - 6 * 60000;
  p._maybeLoadUsage();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(calls.length, 2);
});

test("usage: a failing request leaves an empty page that says so", async () => {
  const p = usagePanel();
  p._hass.callWS = async () => { throw new Error("no recorder"); };
  await p._loadUsage();
  assert.equal(p._usage.failed, true);
  assert.match(p._renderUsage(), /Not enough data yet/);
});

function loadedUsage(extra = {}, house = 120) {
  const p = usagePanel({
    "sensor.a": { state: "1", attributes: { friendly_name: "Kühlschrank" } },
    "sensor.b": { state: "1", attributes: { friendly_name: "Router" } },
    "sensor.c": { state: "1", attributes: { friendly_name: "Backofen" } },
    ...extra,
  });
  p._history = [];
  for (let k = 0; k < 60; k++) p._history.push({ t: k * STEP, v: k < 30 ? 600 : house });
  p._usage = {
    at: Date.now(),
    devices: [
      { id: "sensor.a", name: "Kühlschrank", kwh: 1.5, baseW: 40 },
      { id: "sensor.b", name: "Router", kwh: 0.3, baseW: 12 },
      { id: "sensor.c", name: "Backofen", kwh: 2.5, baseW: 0 },
    ],
  };
  return p;
}

test("usage: base load with its cost per year, the share of the always-on devices and the consumers of today", () => {
  const p = loadedUsage({
    "sensor.t_preis": { state: "0.30", attributes: { unit_of_measurement: "EUR/kWh" } },
  });
  p._int = { tariffy: { price: "sensor.t_preis" } };
  const html = p._renderUsage();
  assert.match(html, /<span class="eb-title">Base load<\/span>/);
  assert.match(html, /Base load<\/div><div class="eb-value">120<small>W/);
  assert.match(html, /Per year<\/div><div class="eb-value">1[.,]?051<small>kWh/); // 120 W x 8760 h
  assert.match(html, /Cost per year<\/div><div class="eb-value">315<small>[^<]*</); // 1051 kWh x 0.30
  assert.match(html, /Always-on devices<\/div><div class="eb-value">52<small>W[\s\S]*43 % of the base load/); // 40 + 12 of 120
  // the biggest consumers: strongest first, with share and cost
  assert.ok(html.indexOf("Backofen") < html.indexOf("Kühlschrank"));
  assert.match(html, /Backofen<\/span> <small class="cnt">0[.,]75 [^<]*<\/small>[\s\S]*2[.,]50<small>kWh<\/small><small class="pct">58 %/); // 2.5 of 4.3 kWh
  // always on: from 2 W, strongest first, with the cost per year
  assert.match(html, /Always on \(standby\)/);
  assert.ok(html.indexOf("40<small>W") < html.indexOf("12<small>W"));
  assert.match(html, /350 kWh · [^<]*105[^<]* per year/); // 40 W x 8760 h = 350 kWh, 105 EUR
  assert.doesNotMatch(html, /Backofen<\/span> <small class="cnt">[^<]*per year/); // 0 W standby: not listed
});

test("usage: defined standby devices replace the automatic detection", () => {
  const p = loadedUsage();
  p._cfg.device_standby = ["sensor.c", "sensor.b"];
  const html = p._renderUsage();
  assert.match(html, /The standby devices you defined/);
  const card = html.slice(html.indexOf("Always on (standby)"));
  assert.match(card, /Router/);
  assert.match(card, /Backofen/); // a defined device is listed even at 0 W
  assert.doesNotMatch(card, /Kühlschrank/); // detected automatically before, now not defined
  assert.match(html, /Always-on devices<\/div><div class="eb-value">12<small>W/); // only the router counts
});

test("usage: defined standby devices are part of the device list", () => {
  const p = loadedUsage();
  p._cfg.device_power = ["sensor.a"];
  p._cfg.device_standby = ["sensor.b"];
  assert.deepEqual(p._deviceIds(), ["sensor.a", "sensor.b"]);
  p._cfg.device_power = [];
  p._cfg.device_patterns = [];
  assert.equal(p._usageEnabled(), true);
});

test("usage: both lists show as many rows as the shorter one (at least 5), the rest unfolds per list", () => {
  const p = loadedUsage();
  const many = [];
  for (let k = 0; k < 9; k++) many.push({ id: `sensor.d${k}`, name: `Gerät${k}`, kwh: 5 - k * 0.4, baseW: k < 3 ? 30 - k : 0 });
  p._usage.devices = many;
  let html = p._renderUsage();
  const rows = (card) => (card.match(/class="dev"/g) || []).length;
  const split = (h) => [h.slice(h.indexOf("Biggest consumers"), h.indexOf("Always on (standby)")), h.slice(h.indexOf("Always on (standby)"))];
  let [top, always] = split(html);
  assert.equal(rows(top), 5); // the standby list has 3, but there are at least 5 rows
  assert.equal(rows(always), 3);
  assert.match(top, /Show all 9/);
  assert.doesNotMatch(always, /Show all/);
  assert.doesNotMatch(top, /devlist/);
  p._usTopExpanded = true;
  html = p._renderUsage();
  [top] = split(html);
  assert.equal(rows(top), 9);
  assert.match(top, /Show less/);
  assert.match(top, /devgrid devlist/);
});

test("usage: the bar of a consumer is its share of the total energy, not of the biggest one", () => {
  const p = loadedUsage();
  const html = p._renderUsage();
  const top = html.slice(html.indexOf("Biggest consumers"), html.indexOf("Always on (standby)"));
  const widths = [...top.matchAll(/class="fill" style="width:([\d.]+)%/g)].map((m) => Number(m[1]));
  assert.ok(Math.abs(widths[0] - (2.5 / 4.3) * 100) < 0.01); // Backofen: 2.5 of 4.3 kWh
  assert.ok(Math.abs(widths[1] - (1.5 / 4.3) * 100) < 0.01); // Kühlschrank
  assert.ok(widths[0] < 100);
});

test("usage: the bar of a standby device is its share of the base load", () => {
  const p = loadedUsage(); // base load 120 W, Kühlschrank 40 W, Router 12 W
  const html = p._renderUsage();
  const always = html.slice(html.indexOf("Always on (standby)"));
  const widths = [...always.matchAll(/class="fill" style="width:([\d.]+)%/g)].map((m) => Number(m[1]));
  assert.ok(Math.abs(widths[0] - (40 / 120) * 100) < 0.01);
  assert.ok(Math.abs(widths[1] - (12 / 120) * 100) < 0.01);
});

function labelEnergyPanel(range = "day", off = 0) {
  const p = loadedUsage({
    "sensor.l1_day": { state: "1.25", attributes: {} },
    "sensor.l2_day": { state: "4.5", attributes: {} },
    "sensor.l2_week": { state: "20.1", attributes: {} },
    "sensor.l3_day": { state: "unavailable", attributes: {} },
  });
  p._cfg.label_ids = ["klima", "licht", "kaputt"];
  p._labelData = { labels: [{ label_id: "klima", name: "Klima" }, { label_id: "licht", name: "Licht" }, { label_id: "kaputt", name: "Kaputt" }], entities: {} };
  p._labelEnergy = { klima: { day: "sensor.l1_day" }, licht: { day: "sensor.l2_day", week: "sensor.l2_week" }, kaputt: { day: "sensor.l3_day" } };
  p._usRange = range;
  p._usOff = off;
  p._usageView = { range, off, devices: p._usage.devices, houseBase: 150 }; // the data of another period
  return p;
}

test("usage: the labels card shows the kWh of every selected label for the shown period, biggest first", () => {
  const html = labelEnergyPanel()._renderUsage();
  const card = html.slice(html.indexOf('<span class="eb-title">Labels</span>'));
  assert.ok(card.indexOf("Licht") < card.indexOf("Klima"));
  assert.match(card, /Licht[\s\S]*4[.,]50<small>kWh/);
  assert.match(card, /Klima[\s\S]*1[.,]25<small>kWh/);
  assert.doesNotMatch(card, /Kaputt/); // an unavailable sensor is left out
  assert.match(card, /width:100%/); // the biggest label fills the bar
  assert.match(card, /creates the sensors/);
  assert.doesNotMatch(card, /€/); // no cost sensor, so no cost (never today's price times the energy)
});

test("usage: the labels card shows kWh only, the cost belongs to the Costs tab", () => {
  const p = labelEnergyPanel();
  p._hass.states["sensor.c_licht_day"] = { state: "1.37", attributes: { unit_of_measurement: "EUR" } };
  p._labelEnergy.licht.cost_day = "sensor.c_licht_day";
  const html = p._renderUsage();
  assert.doesNotMatch(html.slice(html.indexOf('<span class="eb-title">Labels</span>')), /€/);
});

function labelCostPanel() {
  const p = labelEnergyPanel();
  const eur = (v) => ({ state: v, attributes: { unit_of_measurement: "EUR" } });
  Object.assign(p._hass.states, {
    "sensor.c1_day": eur("0.40"), "sensor.c1_week": eur("2.10"), "sensor.c1_month": eur("8.00"), "sensor.c1_year": eur("95.5"),
    "sensor.c2_day": eur("1.37"),
  });
  p._labelEnergy.klima.cost_day = "sensor.c1_day";
  p._labelEnergy.klima.cost_week = "sensor.c1_week";
  p._labelEnergy.klima.cost_month = "sensor.c1_month";
  p._labelEnergy.klima.cost_year = "sensor.c1_year";
  p._labelEnergy.licht.cost_day = "sensor.c2_day";
  return p;
}

test("costs: every selected label with its cost sensors shows today, week, month and year", () => {
  const html = labelCostPanel()._renderLabelCosts();
  assert.match(html, /Cost per label/);
  assert.match(html, /Day<\/span><span class="n">Week<\/span><span class="n">Month<\/span><span class="n">Year/);
  assert.match(html, /Klima[\s\S]*0[.,]40[^<]*€[\s\S]*2[.,]10[^<]*€[\s\S]*8[.,]00[^<]*€[\s\S]*95[.,]50[^<]*€/);
  assert.match(html, /Licht[\s\S]*1[.,]37[^<]*€[\s\S]*–/); // the other periods of Licht have no sensor
  assert.doesNotMatch(html, /Kaputt/); // no cost sensor at all
});

test("costs: no card without cost sensors", () => {
  const p = labelCostPanel();
  assert.match(p._renderLabelCosts(), /Cost per label/);
  p._labelEnergy = {};
  assert.equal(p._renderLabelCosts(), "");
});

test("usage: the labels card follows the period picker and says when only the running period exists", () => {
  const week = labelEnergyPanel("week", 0)._renderUsage();
  assert.match(week, /Licht[\s\S]*20[.,]10<small>kWh/);
  assert.doesNotMatch(week.slice(week.indexOf('<span class="eb-title">Labels</span>')), /Klima/); // no weekly sensor for it
  const past = labelEnergyPanel("day", -1)._renderUsage();
  assert.match(past, /only count the running period/);
  assert.doesNotMatch(past, /4[.,]50<small>kWh/);
});

test("usage: without selected labels there is no labels card", () => {
  const p = labelEnergyPanel();
  p._cfg.label_ids = [];
  assert.doesNotMatch(p._renderUsage(), /<span class="eb-title">Labels<\/span>/);
});

test("usage: without Tariffy only the energy per year, without a house history no base load tile", () => {
  const p = loadedUsage();
  const html = p._renderUsage();
  assert.doesNotMatch(html, /Cost per year/);
  assert.match(html, /350 kWh per year/);
  p._history = null;
  const without = p._renderUsage();
  assert.doesNotMatch(without, /Base load<\/div>/);
  assert.match(without, /Always-on devices/);
});

test("usage: loading and an empty list say so", () => {
  const p = usagePanel();
  assert.match(p._renderUsage(), /Loading/);
  p._usage = { devices: [], at: Date.now() };
  p._history = null;
  const html = p._renderUsage();
  assert.equal((html.match(/Not enough data yet/g) || []).length, 3);
});

test("usage: the virtual wallbox row of EV Assistant is not asked for in the history", async () => {
  const p = usagePanel({ "sensor.ev_home": { state: "1", attributes: { evcc_live: { charge_power: 7.4 } } } });
  p._int = { ev_assistant: { vehicles: [{ name: "ID.3", live: "sensor.ev_home" }] } };
  const calls = [];
  p._hass.callWS = async (msg) => { calls.push(msg); return {}; };
  await p._loadUsage();
  assert.deepEqual(calls[0].entity_ids, ["sensor.a", "sensor.b", "sensor.c"]); // no id of the wallbox row
});

// --- the storage card ---------------------------------------------------------------------------
function storagePanel({ soc = "60", cfg = {}, cur = {}, lang = "en" } = {}) {
  const p = panel({ house_power: "h", battery_soc: ["sensor.soc"], battery_capacity: 10, battery_min_soc: 10, ...cfg }, { h: st(1), "sensor.soc": { state: soc, attributes: { unit_of_measurement: "%" } } });
  p._hass.language = lang;
  p._cur = { discharge: 0, charge: 0, ...cur };
  return p;
}

test("storage: stored and usable energy from the level, capacity and minimum", () => {
  const p = storagePanel();
  const st = p._storage(p._cur);
  assert.equal(st.soc, 60);
  assert.equal(st.stored, 6); // 10 kWh x 60 %
  assert.equal(st.usable, 5); // 10 kWh x (60 - 10) %
  assert.equal(st.mode, "idle");
  assert.equal(st.hours, null);
});

test("storage: discharging says when it is empty, charging when it is full", () => {
  const out = storagePanel({ cur: { discharge: 1000 } });
  const a = out._storage(out._cur);
  assert.equal(a.mode, "discharging");
  assert.equal(a.hours, 5); // 5 kWh usable at 1 kW
  const into = storagePanel({ cur: { charge: 2000 } });
  const b = into._storage(into._cur);
  assert.equal(b.mode, "charging");
  assert.equal(b.hours, 2); // 4 kWh missing at 2 kW
  const slow = storagePanel({ cur: { discharge: 10, charge: 10 } }); // below the limit: idle
  assert.equal(slow._storage(slow._cur).mode, "idle");
});

test("storage: without a charge level there is no card, without a capacity only the level", () => {
  const none = panel({ house_power: "h" }, { h: st(1) });
  assert.equal(none._storage({}), null);
  assert.equal(none._renderStorage({}), "");
  const unknown = storagePanel({ soc: "unavailable" });
  assert.equal(unknown._storage(unknown._cur), null);
  const noCap = storagePanel({ cfg: { battery_capacity: null }, cur: { discharge: 1000 } });
  const level = noCap._storage(noCap._cur);
  assert.equal(level.stored, null);
  assert.equal(level.hours, null);
  const html = noCap._renderStorage(noCap._cur);
  assert.match(html, /Charge level<\/div><div class="eb-value">60<small>%/);
  assert.doesNotMatch(html, /Stored|Empty at/);
  const clamped = storagePanel({ soc: "140" });
  assert.equal(clamped._storage(clamped._cur).soc, 100);
});

test("storage: the card shows the status, the bar with the minimum and the tiles", () => {
  const p = storagePanel({ cur: { discharge: 1000 } });
  const html = p._renderStorage(p._cur);
  assert.match(html, /<span class="eb-title">Storage<\/span><span class="eb-chip">Discharging<\/span>/);
  assert.match(html, /class="socbar discharging"[^>]*><i style="width:60%"><\/i><b style="left:10%"><\/b>/);
  assert.match(html, /Stored<\/div><div class="eb-value">6\.0<small>kWh/);
  assert.match(html, /Usable<\/div><div class="eb-value">5\.0<small>kWh/);
  assert.match(html, /Power<\/div><div class="eb-value">1[.,]?000<small>W/);
  assert.match(html, /Empty at<\/div>[\s\S]*in 5 h 0 min/);
  const idle = storagePanel();
  assert.match(idle._renderStorage(idle._cur), /Idle/);
  assert.doesNotMatch(idle._renderStorage(idle._cur), /Power<\/div>|Empty at|Full at/);
  const charging = storagePanel({ cur: { charge: 2000 }, cfg: { battery_min_soc: null } });
  const c = charging._renderStorage(charging._cur);
  assert.match(c, /Full at<\/div>[\s\S]*in 2 h 0 min/);
  assert.doesNotMatch(c, /Usable/); // without a minimum usable equals stored
  assert.doesNotMatch(c, /<b style/); // and no marker
  const de = storagePanel({ cur: { charge: 2000 }, lang: "de" });
  assert.match(de._renderStorage(de._cur), /Lädt[\s\S]*Voll um/);
});

test("storage: the durations read in hours and minutes", () => {
  const p = new Panel();
  p._hass = { language: "en" };
  assert.equal(p._duration(5), "5 h 0 min");
  assert.equal(p._duration(1.25), "1 h 15 min");
  assert.equal(p._duration(0.5), "30 min");
  assert.equal(p._duration(-1), "0 min");
});

test("storage: the card is part of the Power tab (the settings need a charge level sensor)", () => {
  const p = storagePanel({ cur: { discharge: 500 } });
  p._ready = true;
  p._cfg.battery_discharge = ["d"];
  p._hass.states.d = st(500);
  assert.match(p._renderHouse(), /<span class="eb-title">Storage<\/span>/);
  const none = panel({ house_power: "h" }, { h: st(1) });
  none._ready = true;
  assert.doesNotMatch(none._renderHouse(), /socbar/);
});

test("storage settings: sensor, capacity and minimum are part of the form and the draft", () => {
  const p = storagePanel();
  p._ready = true;
  p._draft = p._normalize({ battery_soc: "sensor.soc", battery_capacity: 10, battery_min_soc: 5 });
  assert.deepEqual(p._draft.battery_soc, ["sensor.soc"]);
  assert.equal(p._draft.battery_capacity, 10);
  assert.equal(p._normalize({ battery_capacity: "abc" }).battery_capacity, null);
  p._draftAdd("battery_soc", "sensor.soc2", "soc");
  assert.deepEqual(p._draft.battery_soc, ["sensor.soc2"]); // one sensor only
  p._edited = () => {};
  p._hass.user = { is_admin: true };
  const input = (value) => ({ target: { dataset: { num: "battery_capacity" }, value } });
  p._onChange(input("12,5"));
  assert.equal(p._draft.battery_capacity, 12.5);
  p._onChange(input(""));
  assert.equal(p._draft.battery_capacity, null);
  p._onChange(input("-3"));
  assert.equal(p._draft.battery_capacity, null);
  p._onChange(input("abc"));
  assert.equal(p._draft.battery_capacity, null);
  p._hass.states["sensor.bat"] = { state: "1", attributes: { device_class: "battery", friendly_name: "Akku" } };
  p._hass.states["sensor.pct"] = { state: "1", attributes: { unit_of_measurement: "%" } };
  p._hass.states["sensor.x"] = { state: "1", attributes: { unit_of_measurement: "W" } };
  assert.deepEqual(p._socCandidates().map((c) => c.id).sort(), ["sensor.bat", "sensor.pct", "sensor.soc"]);
  p._draft.battery_capacity = 12.5;
  const html = p._renderSettings();
  assert.match(html, /Storage capacity \(kWh\)/);
  assert.match(html, /data-num="battery_capacity" value="12\.5"/);
  assert.match(html, /data-add="battery_soc" data-mode="soc" list="eb-soc"/);
  assert.match(html, /<datalist id="eb-soc">/);
});

test("storage settings: PV Assistant offers the sensor, the capacity and the minimum level", async () => {
  const p = pvPanel({
    reply: {
      targets: { solar_power: ["sensor.wr1_pv1"], battery_soc: ["sensor.soc"], battery_capacity: 9.5, battery_min_soc: 10 },
      notes: {},
      plants: [],
    },
  });
  await p._loadPv();
  assert.match(p._renderSettings(), /Storage: charge level sensor, 9\.5 kWh/);
  p._edited = () => {};
  p._onClick({ target: { closest: (sel) => (sel === "[data-pvapply]" ? {} : null) } });
  assert.deepEqual(p._draft.battery_soc, ["sensor.soc"]);
  assert.equal(p._draft.battery_capacity, 9.5);
  assert.equal(p._draft.battery_min_soc, 10);
  assert.match(p._renderSettings(), /sensors of PV Assistant are in use/); // numbers count as taken over too
  p._draft.battery_capacity = 5;
  assert.doesNotMatch(p._renderSettings(), /sensors of PV Assistant are in use/);
});

// --- the notices ---------------------------------------------------------------------------------
function alertPanel(extra = {}) {
  const p = panel({ house_power: "h", device_power: ["sensor.a", "sensor.b"] }, { h: st(1), ...extra });
  p._hass.language = "en";
  p._ready = true;
  p._render = () => {};
  return p;
}
const H = 3600000;

test("notices: nothing to say shows no card", () => {
  const p = alertPanel();
  assert.deepEqual(p._alerts(), []);
  assert.equal(p._renderAlerts(), "");
  assert.doesNotMatch(p._renderHouse(), /class="alert/);
});

test("notices: a plant fault of PV Assistant, with the plants", () => {
  const p = alertPanel({ "binary_sensor.pv_fault": { state: "on", attributes: { plants: ["Garage", "Carport"] } } });
  p._int = { pv_assistant: { entities: { string_fault: "binary_sensor.pv_fault" } } };
  assert.deepEqual(p._alerts(), [{ level: "warn", text: "Plant fault: Garage, Carport" }]);
  p._hass.states["binary_sensor.pv_fault"].attributes = {};
  assert.equal(p._alerts()[0].text, "Plant fault");
  p._hass.states["binary_sensor.pv_fault"].state = "off";
  assert.deepEqual(p._alerts(), []);
});

test("notices: a negative live price of a dynamic tariff", () => {
  const p = alertPanel({ "sensor.t_preis": { state: "0.28", attributes: { unit_of_measurement: "EUR/kWh", arbeitspreis_aktuell: -0.034 } } });
  p._int = { tariffy: { price: "sensor.t_preis" } };
  assert.deepEqual(p._alerts(), [{ level: "info", text: "The electricity price is negative (-3.4 ct/kWh): using power now pays" }]);
  p._hass.states["sensor.t_preis"].attributes.arbeitspreis_aktuell = 0.12;
  assert.deepEqual(p._alerts(), []);
});

test("notices: a device that has been running for hours, but not one that never stops", () => {
  const p = alertPanel();
  p._usage = {
    at: Date.now(),
    devices: [
      { id: "sensor.a", name: "Backofen", run: 5.25 * H, nowW: 1800 },
      { id: "sensor.b", name: "Wärmepumpe", run: 23 * H, nowW: 900 }, // always on
      { id: "sensor.c", name: "Kaffeemaschine", run: 0.5 * H, nowW: 1200 }, // too short
      { id: "sensor.d", name: "Heizlüfter", run: 7 * H, nowW: 1500 },
    ],
  };
  const texts = p._alerts().map((a) => a.text);
  assert.equal(texts.length, 2);
  assert.match(texts[0], /^Heizlüfter has been running for 7 h 0 min \(1[.,]?500 W\)$/); // the longest first
  assert.match(texts[1], /^Backofen has been running for 5 h 15 min \(1[.,]?800 W\)$/);
  p._usage.devices = Array.from({ length: 6 }, (_, i) => ({ id: `s${i}`, name: `D${i}`, run: (5 + i) * H, nowW: 300 }));
  assert.equal(p._alerts().length, 3); // at most three
});

test("notices: the running time of a device is measured with the history", () => {
  const p = alertPanel();
  const t1 = Date.now(), t0 = t1 - 24 * H;
  const hrows = (pairs) => pairs.map(([h, w]) => ({ lu: (t0 + h * H) / 1000, s: String(w) }));
  const res = {
    "sensor.a": hrows([[0, 0], [17, 1800]]), // on for the last 7 hours
    "sensor.b": hrows([[0, 0], [17, 1800], [23.8, 0]]), // switched off 12 minutes ago: still counts as running
    "sensor.c": hrows([[0, 0], [17, 1800], [23.0, 0]]), // off for an hour: not running
    "sensor.d": hrows([[0, 1800], [12, 0], [12.5, 1800], [13, 0], [16, 1800]]), // short breaks of the cycle count
  };
  const u = p._usageCompute(res, ["sensor.a", "sensor.b", "sensor.c", "sensor.d"], t0, t1);
  const by = Object.fromEntries(u.devices.map((d) => [d.id, d]));
  assert.ok(Math.abs(by["sensor.a"].run / H - 7) < 0.1);
  assert.ok(by["sensor.b"].run / H > 6.5);
  assert.equal(by["sensor.c"].run, 0);
  assert.equal(by["sensor.a"].nowW, 1800);
  assert.ok(by["sensor.d"].run / H < 9); // the long break at 13-16 h ends the run of the last cycle
});

test("notices: the base load against the usual one from the statistics", () => {
  const p = alertPanel();
  const now = new Date();
  const rowsFor = (daysAgo, low) => Array.from({ length: 24 }, (_, h) => ({ start: new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, h).getTime(), mean: h === 3 ? low : 400 }));
  const rows = [1, 2, 3, 4, 5].flatMap((d, i) => rowsFor(d, [150, 180, 170, 160, 190][i]));
  assert.equal(p._baseRefFrom(rows, now), 170); // the median of the lowest hours
  assert.equal(p._baseRefFrom(rows.slice(0, 24 * 2), now), null); // less than three full days
  assert.equal(p._baseRefFrom([...rows, ...rowsFor(0, 20)], now), 170); // today does not count
  assert.equal(p._baseRefFrom([], now), null);
  const partial = rows.map((r, i) => (i % 24 > 10 ? { ...r, mean: null } : r)); // too few hours with data
  assert.equal(p._baseRefFrom(partial, now), null);
  // the notice: well above the usual (and by at least 50 W)
  p._baseRef = { w: 170, at: Date.now() };
  p._history = Array.from({ length: 60 }, (_, k) => ({ t: k * 300000, v: 320 }));
  assert.match(p._alerts()[0].text, /The base load is high: 320 W, usually about 170 W/);
  p._history = Array.from({ length: 60 }, (_, k) => ({ t: k * 300000, v: 220 })); // 1.3 times: normal
  assert.deepEqual(p._alerts(), []);
  p._baseRef = { w: 30, at: Date.now() };
  p._history = Array.from({ length: 60 }, (_, k) => ({ t: k * 300000, v: 70 })); // 2.3 times but only 40 W more
  assert.deepEqual(p._alerts(), []);
  p._baseRef = { w: null, at: Date.now() };
  assert.deepEqual(p._alerts(), []);
});

test("notices: the statistics of the house power are asked for once an hour, only with a house sensor", async () => {
  const p = alertPanel();
  const calls = [];
  p._hass.callWS = async (msg) => { calls.push(msg); return { h: [] }; };
  p._tab = "house";
  p._maybeLoadBaseRef();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].type, "recorder/statistics_during_period");
  assert.deepEqual(calls[0].statistic_ids, ["h"]);
  assert.equal(calls[0].period, "hour");
  assert.deepEqual(calls[0].types, ["mean"]);
  p._maybeLoadBaseRef();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(calls.length, 1);
  p._baseRef.at = Date.now() - 61 * 60000;
  p._maybeLoadBaseRef();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(calls.length, 2);
  const none = panel({ grid_import: ["gi"] }, { gi: st(1) });
  none._ready = true;
  none._hass.callWS = async (msg) => { calls.push(msg); return {}; };
  none._maybeLoadBaseRef();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(calls.length, 2); // no house sensor: nothing to compare
  const failing = alertPanel();
  failing._hass.callWS = async () => { throw new Error("no recorder"); };
  await failing._loadBaseRef();
  assert.equal(failing._baseRef.w, null);
});

test("notices: the card on the Power tab shows warnings and information, escaped", () => {
  const p = alertPanel({ "binary_sensor.pv_fault": { state: "on", attributes: { plants: ["<b>x</b>"] } }, "sensor.t_preis": { state: "0.28", attributes: { unit_of_measurement: "EUR/kWh", arbeitspreis_aktuell: -0.01 } } });
  p._int = { pv_assistant: { entities: { string_fault: "binary_sensor.pv_fault" } }, tariffy: { price: "sensor.t_preis" } };
  const html = p._renderHouse();
  assert.match(html, /<span class="eb-title">Notices<\/span>/);
  assert.match(html, /<div class="alert">⚠ Plant fault: &lt;b&gt;x&lt;\/b&gt;<\/div>/);
  assert.match(html, /<div class="alert info">ℹ The electricity price is negative/);
  assert.ok(html.indexOf("Notices") < html.indexOf("eb-card--glow")); // above the house card
  p._hass.language = "de";
  assert.match(p._renderHouse(), /Anlagenstörung/);
});

// --- the period picker of the consumption tab -----------------------------------------------------
const hourRows = (start, means) => means.map((m, i) => ({ start: start + i * 3600000, end: start + (i + 1) * 3600000, mean: m }));

test("usage picker: the same picker as in the balance, with its own data attributes", () => {
  const p = usagePanel();
  const html = p._renderUsage();
  assert.match(html, /<button type="button" class="seg on" data-urange="day">Day<\/button>/);
  for (const r of ["week", "month", "year"]) assert.match(html, new RegExp(`data-urange="${r}"`));
  assert.match(html, /data-unav="-1"/);
  assert.match(html, /data-unav="1"[^>]*disabled/);
  assert.doesNotMatch(html, /data-brange|data-bnav/);
  const bal = balPanel();
  bal._bal = null;
  assert.match(bal._renderBalance(), /data-brange="day"/); // the balance keeps its attributes
});

test("usage picker: clicks change the period, 'next' never goes into the future", () => {
  const p = usagePanel();
  const click = (attr, key, value) => p._onClick({ target: { closest: (sel) => (sel === `[${attr}]` ? { dataset: { [key]: value } } : null) } });
  click("data-urange", "urange", "week");
  assert.equal(p._usRange, "week");
  assert.equal(p._usOff, 0);
  click("data-unav", "unav", "-1");
  click("data-unav", "unav", "-1");
  assert.equal(p._usOff, -2);
  click("data-unav", "unav", "1");
  click("data-unav", "unav", "1");
  click("data-unav", "unav", "1");
  assert.equal(p._usOff, 0);
  click("data-urange", "urange", "month");
  assert.equal(p._usOff, 0);
  assert.match(p._renderUsage(), /Loading/); // another period: loading until its data is there
});

test("usage statistics: the energy of a device is its hourly means times their duration", () => {
  const p = usagePanel();
  const t = new Date(2026, 10, 9).getTime();
  const energy = { "sensor.a": hourRows(t, [1000, 1000, 500, null, -20]), __period: "hour" }; // 2.5 kWh, a gap and a negative reading do not count
  const base = { "sensor.a": hourRows(t, Array(12).fill(40)), h: hourRows(t, Array(12).fill(150)) };
  const r = p._usageFromStats(energy, base, ["sensor.a", "sensor.b"]);
  assert.deepEqual(r.devices.map((d) => d.id), ["sensor.a"]); // b has no statistics
  assert.ok(Math.abs(r.devices[0].kwh - 2.5) < 1e-9);
  assert.equal(r.devices[0].baseW, 40);
  assert.equal(r.houseBase, 150); // the house power sensor
  // daily means count 24 hours each
  const daily = { "sensor.a": [{ start: t, end: t + 86400000, mean: 100 }, { start: t + 86400000, mean: 50 }], __period: "day" };
  assert.ok(Math.abs(p._usageFromStats(daily, {}, ["sensor.a"]).devices[0].kwh - 3.6) < 1e-9); // 2.4 + 1.2
  // less than twelve hours: no base load
  assert.equal(p._usageFromStats(energy, { "sensor.a": hourRows(t, [40, 40, 40]) }, ["sensor.a"]).devices[0].baseW, null);
});

test("usage statistics: without a house sensor the house power is the balance of the other sensors per hour", () => {
  const p = panel({ solar_power: ["pv"], grid_import: ["gi"], grid_export: ["ge"], battery_discharge: ["bd"], battery_charge: ["bc"], device_power: ["sensor.a"] }, {});
  const t = new Date(2026, 10, 9).getTime();
  const n = 12;
  const res = {
    pv: hourRows(t, Array(n).fill(1000)),
    gi: hourRows(t, Array(n).fill(200)),
    ge: hourRows(t, Array(n).fill(300)),
    bd: hourRows(t, Array(n).fill(100)),
    bc: hourRows(t, Array(n).fill(-500)), // the magnitude counts
  };
  assert.deepEqual(p._houseStatIds().sort(), ["bc", "bd", "ge", "gi", "pv"]);
  const house = p._houseHourly(res);
  assert.equal(house.length, n);
  assert.equal(house[0], 1000 + 200 + 100 - 300 - 500); // 500 W
  assert.equal(p._usageFromStats({ __period: "hour" }, res, []).houseBase, 500);
  // a combined meter with a sign (inverted) works too
  const combined = panel({ grid_power: ["g"], invert_grid: true, solar_power: ["pv"] }, {});
  const hh = combined._houseHourly({ pv: hourRows(t, Array(n).fill(1000)), g: hourRows(t, Array(n).fill(-400)) });
  assert.equal(hh[0], 1000 + 400); // inverted: -400 is import
  const sensor = panel({ house_power: "h" }, {});
  assert.deepEqual(sensor._houseStatIds(), ["h"]);
  assert.deepEqual(sensor._houseHourly({ h: hourRows(t, [100, null, -5]) }), [100, 0]);
});

test("usage statistics: a week is one hourly request, a month a daily and an hourly one, today comes from the history", async () => {
  const p = usagePanel();
  const calls = [];
  p._hass.callWS = async (msg) => { calls.push(msg); return {}; };
  p._tab = "usage";
  p._maybeLoadUsageView(); // today: nothing
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(calls.length, 0);
  p._usRange = "week";
  p._usOff = -1;
  p._maybeLoadUsageView();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].type, "recorder/statistics_during_period");
  assert.equal(calls[0].period, "hour");
  assert.deepEqual(calls[0].types, ["mean"]);
  assert.deepEqual(calls[0].units, { power: "W" });
  assert.deepEqual([...calls[0].statistic_ids].sort(), ["h", "sensor.a", "sensor.b", "sensor.c"]); // devices and the house sensor
  assert.equal(p._usageView.range, "week");
  assert.equal(p._usageView.off, -1);
  p._maybeLoadUsageView(); // fresh: no new request
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(calls.length, 1);
  p._usRange = "month";
  p._usOff = 0;
  p._maybeLoadUsageView();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(calls.length, 3);
  assert.deepEqual(calls.slice(1).map((c) => c.period).sort(), ["day", "hour"]);
  const hourlyCall = calls.slice(1).find((c) => c.period === "hour");
  assert.ok(new Date(hourlyCall.end_time) - new Date(hourlyCall.start_time) <= 31 * 86400000 + 1000); // the base load: at most 31 days
});

test("usage statistics: a failing request says so and a period shows its devices and the matching hint", async () => {
  const p = usagePanel();
  p._hass.callWS = async () => { throw new Error("no recorder"); };
  p._usRange = "week";
  await p._loadUsageView();
  assert.equal(p._usageView.failed, true);
  const html = p._renderUsage();
  assert.match(html, /Not enough data yet/);
  assert.match(html, /need the state class measurement/);
  const t = new Date(2026, 10, 9).getTime();
  const q = usagePanel({ "sensor.a": { state: "1", attributes: { friendly_name: "Kühlschrank" } } });
  q._usRange = "week";
  q._usageView = {
    range: "week", off: 0, at: Date.now(), houseBase: 130,
    devices: [{ id: "sensor.a", name: "Kühlschrank", kwh: 6.5, baseW: 40 }],
  };
  const view = q._renderUsage();
  assert.match(view, /data-urange="week"/);
  assert.match(view, /Lowest hourly mean of the house power in the period/);
  assert.match(view, /Lowest hourly mean of each device in the period/);
  assert.match(view, /Base load<\/div><div class="eb-value">130<small>W/);
  assert.match(view, /6[.,]50<small>kWh/);
  assert.doesNotMatch(view, /need the state class/);
  assert.match(view, /<span class="eb-title">Biggest consumers<\/span>/);
  // today still has its own data: the selection of another period does not replace it
  q._usRange = "day";
  q._usage = { at: Date.now(), devices: [{ id: "sensor.a", name: "Kühlschrank", kwh: 1.5, baseW: 40, run: 0 }] };
  assert.match(q._renderUsage(), /1[.,]50<small>kWh/);
  assert.equal(t > 0, true);
});

// --- the time zone of the Home Assistant instance ---------------------------------------------------
function zonePanel(tz, extra = {}) {
  const p = panel({ house_power: "h", device_power: ["sensor.a"], ...extra }, { h: st(1) });
  p._hass.language = "en";
  p._hass.config = tz === undefined ? {} : { time_zone: tz };
  p._ready = true;
  return p;
}
function atTime(iso, fn) {
  const real = Date.now;
  Date.now = () => Date.parse(iso);
  try { return fn(); } finally { Date.now = real; }
}
const iso = (ms) => new Date(ms).toISOString();

test("time zone: the wall clock of an instant and the instant of a wall clock", () => {
  const { tzParts, zonedTime } = Panel;
  const t = Date.parse("2026-11-13T23:30:00Z");
  assert.deepEqual(tzParts(t, "Pacific/Auckland"), { y: 2026, m: 11, d: 14, h: 12, mi: 30, s: 0 }); // UTC+13
  assert.deepEqual(tzParts(t, "America/Los_Angeles"), { y: 2026, m: 11, d: 13, h: 15, mi: 30, s: 0 }); // UTC-8
  assert.deepEqual(tzParts(t, "Asia/Kolkata"), { y: 2026, m: 11, d: 14, h: 5, mi: 0, s: 0 }); // UTC+5:30
  assert.equal(tzParts(Date.parse("2026-11-13T00:00:00Z"), "UTC").h, 0); // 0, never 24
  assert.equal(iso(zonedTime(2026, 10, 13, 0, "Europe/Berlin")), "2026-11-12T23:00:00.000Z");
  assert.equal(iso(zonedTime(2026, 6, 13, 0, "Europe/Berlin")), "2026-07-12T22:00:00.000Z"); // summer time
  assert.equal(iso(zonedTime(2026, 10, 32, 0, "UTC")), "2026-12-02T00:00:00.000Z"); // days overflow into the next month
  assert.equal(iso(zonedTime(2026, 12, 1, 0, "UTC")), "2027-01-01T00:00:00.000Z"); // and months into the next year
});

test("time zone: the periods start at midnight of the instance, whatever the browser says", () => {
  const now = "2026-11-13T23:30:00Z"; // Friday in Los Angeles, already Saturday in Auckland
  atTime(now, () => {
    const la = zonePanel("America/Los_Angeles");
    assert.equal(iso(la._balWindow("day", 0).start), "2026-11-13T08:00:00.000Z");
    assert.equal(la._balWindow("day", 0).edges.length - 1, 24);
    assert.equal(iso(la._balWindow("week", 0).start), "2026-11-09T08:00:00.000Z"); // Monday 9th
    assert.equal(iso(la._balWindow("month", 0).start), "2026-11-01T07:00:00.000Z"); // still summer time on the 1st
    assert.equal(iso(la._balWindow("year", 0).start), "2026-01-01T08:00:00.000Z");
    const nz = zonePanel("Pacific/Auckland");
    assert.equal(iso(nz._balWindow("day", 0).start), "2026-11-13T11:00:00.000Z"); // the 14th starts at 11:00 UTC
    assert.equal(iso(nz._balWindow("week", 0).start), "2026-11-08T11:00:00.000Z"); // Monday 9th, 00:00 NZDT
    assert.equal(iso(nz._balWindow("day", -1).start), "2026-11-12T11:00:00.000Z");
  });
});

test("time zone: days with a clock change have 23 or 25 hours, a month its real days", () => {
  atTime("2026-10-25T12:00:00Z", () => {
    const berlin = zonePanel("Europe/Berlin");
    assert.equal(berlin._balWindow("day", 0).edges.length - 1, 25); // the end of summer time
    assert.equal(berlin._balWindow("month", 0).edges.length - 1, 31);
    assert.equal(iso(berlin._balWindow("month", 0).start), "2026-09-30T22:00:00.000Z");
  });
  atTime("2026-03-29T12:00:00Z", () => {
    assert.equal(zonePanel("Europe/Berlin")._balWindow("day", 0).edges.length - 1, 23); // the start of summer time
    assert.equal(zonePanel("America/Los_Angeles")._balWindow("day", 0).edges.length - 1, 24); // not there
  });
  atTime("2026-11-13T12:00:00Z", () => {
    const edges = zonePanel("Asia/Kolkata")._balWindow("day", 0).edges;
    assert.equal(iso(edges[0]), "2026-11-12T18:30:00.000Z"); // half-hour zones too
    assert.equal(edges.length - 1, 24);
  });
});

test("time zone: the labels of the balance follow the zone", () => {
  atTime("2026-11-13T23:30:00Z", () => {
    const nz = zonePanel("Pacific/Auckland");
    const day = nz._balWindow("day", 0);
    const dayLabel = nz._balLabel(day);
    for (const part of [/Sat/, /14/, /November/, /2026/]) assert.match(dayLabel, part);
    assert.match(nz._balTick(day, 0), /^(00:00|12:00 AM)$/); // midnight of the instance
    assert.equal(nz._balTick(day, 1), "");
    assert.match(nz._balTick(day, 3), /^(03:00|03:00 AM)$/);
    assert.match(nz._balRowLabel(day, 5), /14\/11?|11\/14/); // 14 November
    const week = nz._balWindow("week", 0);
    assert.match(nz._balLabel(week), /Nov 9 – Nov 15, 2026|9 Nov – 15 Nov 2026/);
    for (const part of [/Mon/, /9/]) assert.match(nz._balTick(week, 0), part);
    const year = nz._balWindow("year", 0);
    assert.equal(nz._balLabel(year), "2026");
    assert.match(nz._balTick(nz._balWindow("month", 0), 13), /^14$/); // the day of the month in the zone
    const la = zonePanel("America/Los_Angeles");
    const laLabel = la._balLabel(la._balWindow("day", 0));
    for (const part of [/Fri/, /13/, /November/]) assert.match(laLabel, part);
  });
});

test("time zone: a zone the browser does not know falls back to the browser's, no zone too", () => {
  assert.equal(zonePanel("Mars/Olympus")._tz(), undefined);
  assert.equal(zonePanel(undefined)._tz(), undefined);
  assert.equal(zonePanel("Europe/Berlin")._tz(), "Europe/Berlin");
  const odd = zonePanel("Mars/Olympus");
  assert.equal(odd._balWindow("day", 0).edges.length - 1 >= 23, true); // still a usable window
  const none = new Panel();
  assert.equal(none._tz(), undefined);
});

test("time zone: the consumption of today counts from midnight of the instance", () => {
  const t1 = Date.parse("2026-11-13T12:00:00Z"); // 13:00 in Berlin: 13 hours since midnight there, 12 in UTC
  const t0 = t1 - 24 * 3600000;
  const rows = (w) => [{ lu: t0 / 1000, s: String(w) }];
  const berlin = zonePanel("Europe/Berlin");
  const utc = zonePanel("UTC");
  const inBerlin = berlin._usageCompute({ "sensor.a": rows(1000) }, ["sensor.a"], t0, t1).devices[0].kwh;
  const inUtc = utc._usageCompute({ "sensor.a": rows(1000) }, ["sensor.a"], t0, t1).devices[0].kwh;
  assert.ok(Math.abs(inBerlin - 13) < 1e-9);
  assert.ok(Math.abs(inUtc - 12) < 1e-9);
});

test("time zone: the days of the usual base load are the days of the instance", () => {
  const p = zonePanel("Pacific/Auckland");
  // 24 hourly means that belong to one Auckland day, but to two UTC days
  const start = Date.parse("2026-11-09T11:00:00Z"); // 10 Nov 00:00 NZDT
  const day = (offset, low) => Array.from({ length: 24 }, (_, h) => ({ start: start + (offset * 24 + h) * 3600000, mean: h === 2 ? low : 400 }));
  const rows = [0, 1, 2].flatMap((o, i) => day(o, [100, 120, 140][i]));
  assert.equal(p._baseRefFrom(rows, new Date("2026-11-20T12:00:00Z")), 120); // three full days
  const utc = zonePanel("UTC");
  assert.equal(utc._baseRefFrom(rows, new Date("2026-11-20T12:00:00Z")), null); // in UTC they are split into days of less than 18 hours
});

test("time zone: the history chart has its ticks and its table at the local hours", () => {
  const pts = [];
  const t0 = Date.parse("2026-11-12T20:10:00Z");
  for (let k = 0; k <= 288; k++) pts.push({ t: t0 + k * 300000, v: 100 + (k % 7), solar: 0, d: 0, gridIn: 0 });
  const kolkata = zonePanel("Asia/Kolkata");
  kolkata._hass.language = "de"; // 24-hour clock
  const html = kolkata._historyChart(pts);
  const ticks = [...html.matchAll(/class="htick" x="[^"]*" y="[^"]*" text-anchor="middle">(\d\d:\d\d)</g)].map((m) => m[1]);
  assert.ok(ticks.length >= 7);
  for (const t of ticks) assert.match(t, /^(00|03|06|09|12|15|18|21):00$/); // full local hours, also in a half-hour zone
  assert.match(html, /<tr><th>13\.11\., 02:00<\/th>/); // the first row is the local hour 02:00 (20:30 UTC), not a UTC hour
  assert.doesNotMatch(html, /<tr><th>[^<]*:30<\/th>/); // no row at half past
  const tip = kolkata._tipAt(t0 + 3600000);
  assert.match(tip.title, /\d{1,2}[/.]\d{1,2}.*\d\d:\d\d/);
});

// --- the device evaluation: small lines and the details of a device -----------------------------------
test("sparkline: a small line of the values, nothing without a visible curve", () => {
  const p = new Panel();
  const line = p._sparkline([0, 10, 40, 20, 80, 30]);
  assert.match(line, /^<svg class="spk" viewBox="0 0 96 22" width="96" height="22"/);
  assert.match(line, /<path class="spkarea" d="M0\.0,[\d.]+L[^"]*Z"\/>/);
  assert.match(line, /<path class="spkline" d="M0\.0,[\d.]+L/);
  const y = [...line.matchAll(/L?([\d.]+),([\d.]+)/g)];
  assert.ok(y.length > 6);
  assert.equal(p._sparkline([0, 0, 0, 0, 0]), ""); // flat zero
  assert.equal(p._sparkline([1, 2, 3]), ""); // too few values
  assert.equal(p._sparkline(null), "");
  assert.equal(p._sparkline([null, null, null, null, null]), "");
  // gaps break the line, negative values count as 0
  const gap = p._sparkline([10, 20, null, 30, 40, 50, -5]);
  assert.equal((gap.match(/M[\d.]+,/g) || []).length >= 2, true);
  assert.match(p._sparkline([1, 5, 9, 4], { w: 320, h: 56, big: true }), /class="spk big" viewBox="0 0 320 56" preserveAspectRatio="none"/);
});

test("sparkline: long series are averaged to fit, gaps stay empty", () => {
  const p = new Panel();
  const values = Array.from({ length: 289 }, (_, i) => (i < 7 ? null : 100)); // 289 values in buckets of 7
  const small = p._downsample(values, 48);
  assert.ok(small.length <= 48);
  assert.equal(small[0], null); // a bucket of gaps only stays empty
  assert.equal(small[small.length - 1], 100);
  assert.deepEqual(p._downsample([1, 2, 3], 48), [1, 2, 3]);
  assert.deepEqual(p._downsample([], 48), []);
  assert.deepEqual(p._downsample([10, 30, -20, 0], 2), [20, 0]); // negative readings count as 0
});

test("device evaluation: the history gives every device a line, the peak and the average power", () => {
  const p = usagePanel();
  const { t0, t1 } = usageNow();
  const res = {
    "sensor.a": hrows(t0, [[0, 100], [18, 2000], [19, 100]]),
    "sensor.b": hrows(t0, [[0, 5]]),
  };
  const u = p._usageCompute(res, ["sensor.a", "sensor.b"], t0, t1);
  const a = u.devices[0];
  assert.ok(a.spark.length <= 48 && a.spark.length > 10);
  assert.equal(a.peak, 2000);
  assert.ok(a.avgW > 100 && a.avgW < 2000);
  assert.equal(u.devices[1].peak, 5);
  assert.ok(Math.abs(u.devices[1].avgW - 5) < 0.01);
});

test("device evaluation: the statistics give lines, the peak and the average power of the period", () => {
  const p = usagePanel();
  const t = new Date(2026, 10, 9).getTime();
  const energy = { "sensor.a": hourRows(t, [100, 100, 900, 100]), __period: "hour" };
  const base = { "sensor.a": hourRows(t, Array.from({ length: 24 }, (_, i) => (i === 5 ? 900 : 100))) };
  const r = p._usageFromStats(energy, base, ["sensor.a"], 4);
  const a = r.devices[0];
  assert.equal(a.peak, 900);
  assert.ok(Math.abs(a.avgW - 300) < 1e-9); // 1.2 kWh in 4 hours
  assert.equal(a.spark.length, 24); // from the hourly means
  assert.equal(p._usageFromStats(energy, base, ["sensor.a"]).devices[0].avgW, null); // unknown duration
  const noHourly = p._usageFromStats(energy, {}, ["sensor.a"], 4).devices[0];
  assert.equal(noHourly.spark.length, 4); // from the energy rows if there are no hourly ones
});

function usageWithLines(extra = {}) {
  const p = loadedUsage(extra);
  const spark = Array.from({ length: 48 }, (_, i) => (i % 8 < 4 ? 120 : 20));
  p._usage.devices = [
    { id: "sensor.a", name: "Kühlschrank", kwh: 1.5, baseW: 40, spark, peak: 150, avgW: 62, run: 0 },
    { id: "sensor.b", name: "Router", kwh: 0.3, baseW: 12, spark, peak: 14, avgW: 12.5, run: 0 },
    { id: "sensor.c", name: "Backofen", kwh: 2.5, baseW: 0, spark, peak: 2100, avgW: 400, run: 2 * 3600000 },
  ];
  return p;
}

test("device evaluation: the rows of the consumption tab have a small line and open to the details", () => {
  const p = usageWithLines({ "sensor.t_preis": { state: "0.30", attributes: { unit_of_measurement: "EUR/kWh" } } });
  p._int = { tariffy: { price: "sensor.t_preis" } };
  let html = p._renderUsage();
  assert.ok((html.match(/<svg class="spk"/g) || []).length >= 5); // consumers (3) and always on (2)
  assert.match(html, /data-open="usage:top:sensor\.c"[^>]*aria-expanded="false"/);
  assert.doesNotMatch(html, /class="subs"/);
  p._render = () => {};
  p._onClick({ target: { closest: (sel) => (sel === "[data-open]" ? { dataset: { open: "usage:top:sensor.c" } } : null) } });
  html = p._renderUsage();
  assert.match(html, /data-open="usage:top:sensor\.c"[^>]*aria-expanded="true"/);
  const detail = html.slice(html.indexOf('class="subs"'));
  assert.match(detail, /<svg class="spk big"/);
  assert.match(detail, /Energy<\/span><b>2[.,]50 kWh<\/b>/);
  assert.match(detail, /Cost<\/span><b>[^<]*0[.,]75[^<]*<\/b>/); // 2.5 kWh x 0.30
  assert.match(detail, /Average power<\/span><b>400 W<\/b>/);
  assert.match(detail, /Peak<\/span><b>2[.,]?100 W<\/b>/);
  assert.match(detail, /Running now for<\/span><b>2 h 0 min<\/b>/);
  assert.doesNotMatch(detail, /Always on<\/span>/); // a standby of 0 W is not a fact
  // another device and the same device in the other list stay closed
  assert.equal((html.match(/class="subs"/g) || []).length, 1);
});

test("device evaluation: the details of a past period have no running time, devices without a line show none", () => {
  const p = usageWithLines();
  p._usRange = "week";
  p._usageView = { range: "week", off: 0, at: Date.now(), houseBase: 100, devices: p._usage.devices };
  p._open = new Set(["usage:top:sensor.c"]);
  assert.doesNotMatch(p._renderUsage(), /Running now for/);
  const bare = usageWithLines();
  bare._usage.devices[0].spark = [];
  const html = bare._renderUsage();
  assert.match(html, /Kühlschrank/);
  assert.ok((html.match(/<svg class="spk"/g) || []).length < 5);
});

test("device evaluation: the device list of the Power tab has the lines and the energy of today in the tooltip", () => {
  const p = evDevicePanel();
  p._usage = {
    at: Date.now(),
    devices: [{ id: "sensor.herd_leistung", name: "Herd", kwh: 1.2, baseW: 0, spark: [0, 800, 900, 700, 0, 600, 900, 100], peak: 900, avgW: 50, run: 0 }],
  };
  const html = p._renderDevices(10000);
  assert.match(html, /Herd<\/span>[\s\S]*<span class="val"><svg class="spk"[\s\S]*900<small>W/); // the line before the value
  assert.match(html, /title="[^"]*1[.,]20 kWh today"/);
  assert.match(html, /Solar share 72 %/); // the tooltip of the wallbox row is kept
  assert.doesNotMatch(html.slice(html.indexOf("Wallbox"), html.indexOf("Herd")), /<svg class="spk"/); // no history for the wallbox row
});

function tariffPanel(extra = {}) {
  const p = panel({ house_power: "h" }, { h: st(1) });
  p._hass.language = "en";
  p._ready = true;
  p._render = () => {};
  p._labelData = { labels: [{ label_id: "wp", name: "Wärmepumpe" }, { label_id: "licht", name: "Licht" }], entities: {} };
  p._int = { tariffy: { prices: [{ entity: "sensor.haus", name: "Haushalt" }, { entity: "sensor.wp", name: "Wärmepumpentarif" }] } };
  p._draft = p._normalize({ house_power: "h", label_ids: ["wp", "licht"], ...extra });
  return p;
}

test("settings: a tariff can be chosen per selected label when Tariffy has several contracts", () => {
  const p = tariffPanel({ label_tariffs: { wp: "sensor.wp" } });
  const html = p._renderLabelTariffs(false);
  assert.match(html, /Tariff per label/);
  assert.match(html, /Wärmepumpe[\s\S]*<option value="sensor\.wp" selected>/);
  assert.match(html, /Default \(Haushalt\)/);
  assert.equal((html.match(/data-labeltariff=/g) || []).length, 2); // one per selected label
});

test("settings: no tariff choice with a single contract or without selected labels", () => {
  const p = tariffPanel();
  p._int.tariffy.prices = [{ entity: "sensor.haus", name: "Haushalt" }];
  assert.equal(p._renderLabelTariffs(false), "");
  const q = tariffPanel();
  q._draft.label_ids = [];
  assert.equal(q._renderLabelTariffs(false), "");
});

test("settings: choosing a tariff changes the draft and the default removes it again", () => {
  const p = tariffPanel();
  p._hass.user = { is_admin: true };
  p._edited = () => {};
  const change = (value) => p._onChange({ target: { dataset: { labeltariff: "wp" }, value } });
  change("sensor.wp");
  assert.deepEqual(p._draft.label_tariffs, { wp: "sensor.wp" });
  assert.equal(p._isDirty(), true);
  change("");
  assert.deepEqual(p._draft.label_tariffs, {});
});
