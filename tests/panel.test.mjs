// Tests for the panel calculation logic (node --test), no browser needed.
import { test } from "node:test";
import assert from "node:assert/strict";

let Panel;
globalThis.HTMLElement = class {
  attachShadow() { return {}; }
};
globalThis.document = { getElementById: () => ({}), createElement: () => ({}), head: { appendChild() {} } };
globalThis.customElements = { define: (_n, cls) => { Panel = cls; } };

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
