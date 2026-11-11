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
