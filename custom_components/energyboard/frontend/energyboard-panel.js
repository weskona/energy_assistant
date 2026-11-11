/* Energyboard – Seitenleisten-Panel. Tab 1: Leistung des Hauses. */
const BASE = new URL(import.meta.url).pathname.replace(/\/[^/]*$/, "");

// @font-face muss im Dokument (nicht im Shadow DOM) stehen.
if (!document.getElementById("energyboard-fonts")) {
  const l = document.createElement("link");
  l.id = "energyboard-fonts";
  l.rel = "stylesheet";
  l.href = `${BASE}/energyboard-tokens.css`;
  document.head.appendChild(l);
}

const HISTORY_HOURS = 24;
const BUCKET_MIN = 5;

const STYLE = `
:host{display:block;min-height:100%;background:var(--eb-bg);color:var(--eb-text);font-family:var(--eb-font)}
*{box-sizing:border-box}
.wrap{max-width:1100px;margin:0 auto;padding:16px}
.top{display:flex;align-items:center;gap:12px;margin-bottom:16px}
.menu{background:none;border:0;color:var(--eb-muted);cursor:pointer;padding:6px}
.tabs{display:flex;gap:4px;padding:4px;background:var(--eb-panel);border:1px solid var(--eb-line);border-radius:14px;margin:0 auto}
.tab{border:0;background:none;color:var(--eb-muted);font:600 14px var(--eb-font);padding:8px 16px;border-radius:10px;cursor:pointer}
.tab.active{background:rgba(255,255,255,.08);color:var(--eb-text)}
.grid{display:grid;gap:var(--eb-gap);grid-template-columns:repeat(auto-fit,minmax(320px,1fr))}
.row{display:flex;justify-content:space-between;align-items:center;gap:8px}
.big{display:flex;align-items:baseline;gap:8px;margin:14px 0 6px}
.big b{font-size:64px;font-weight:800;line-height:1}
.big span{font-size:22px;color:var(--eb-muted);font-weight:500}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-top:16px}
.legend{display:flex;gap:14px;flex-wrap:wrap;margin-top:10px;font-size:12.5px;color:var(--eb-muted)}
.legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px}
.bar{margin-top:16px}
.bar>div{transition:width .6s}
svg{width:100%;height:auto;display:block;margin-top:12px}
.axis{fill:var(--eb-dim);font-size:11px}
.empty{padding:40px 0;text-align:center;color:var(--eb-muted)}
.state{color:var(--eb-green)}
.warn{color:var(--eb-orange)}
`;

const fmtPower = (w) => {
  if (w == null || Number.isNaN(w)) return ["–", ""];
  const a = Math.abs(w);
  return a >= 1000
    ? [(w / 1000).toLocaleString(undefined, { maximumFractionDigits: 1, minimumFractionDigits: 1 }), "kW"]
    : [Math.round(w).toLocaleString(), "W"];
};

class EnergyboardPanel extends HTMLElement {
  constructor() {
    super();
    this._tab = "house";
    this._history = null;
    this._lastHistory = 0;
    this.attachShadow({ mode: "open" });
  }

  set panel(p) {
    this._config = (p && p.config) || {};
    this._history = null;
    this._lastHistory = 0;
  }
  set narrow(n) { this._narrow = n; this._render(); }
  set hass(h) {
    this._hass = h;
    this._render();
    this._maybeLoadHistory();
  }

  get _cfg() { return this._config || {}; }

  /** Leistung einer Entität in W (nur positive Werte erwartet). */
  _watts(entityId) {
    const s = entityId && this._hass?.states?.[entityId];
    if (!s || ["unavailable", "unknown"].includes(s.state)) return null;
    const v = parseFloat(s.state);
    return Number.isNaN(v) ? null : v * this._unitFactor(entityId);
  }
  _unitFactor(entityId) {
    const u = this._hass?.states?.[entityId]?.attributes?.unit_of_measurement;
    return u === "kW" ? 1000 : u === "MW" ? 1e6 : 1;
  }
  /** Summe mehrerer Sensoren; null, wenn keiner konfiguriert oder verfügbar ist. */
  _sum(ids) {
    const vals = (ids || []).map((id) => this._watts(id)).filter((v) => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
  }

  /** Summe mit Vorzeichen-Umkehr (für Kombisensoren). */
  _signed(ids, invert) {
    const v = this._sum(ids);
    return v == null ? null : invert ? -v : v;
  }

  /** Getrennte und kombinierte Sensoren zu sechs positiven Größen zusammenführen. */
  _split({ solar, gridIn, gridOut, discharge, charge, gridCharge, grid, battery }) {
    const add = (a, b) => (a == null && b == null ? null : (a ?? 0) + (b ?? 0));
    const pos = (v) => (v == null ? null : Math.max(0, v));
    const neg = (v) => (v == null ? null : Math.max(0, -v));
    return {
      solar,
      gridIn: add(gridIn, pos(grid)),
      gridOut: add(gridOut, neg(grid)),
      discharge: add(discharge, pos(battery)),
      charge: add(charge, neg(battery)),
      gridCharge,
    };
  }

  /** Aktuelle Werte in W: house, solar, gridIn, gridOut, discharge, charge. */
  _current() {
    const c = this._cfg;
    const parts = this._split({
      solar: this._sum(c.solar_power),
      gridIn: this._sum(c.grid_import),
      gridOut: this._sum(c.grid_export),
      discharge: this._sum(c.battery_discharge),
      charge: this._sum(c.battery_charge),
      gridCharge: this._sum(c.battery_grid_charge),
      grid: this._signed(c.grid_power, c.invert_grid),
      battery: this._signed(c.battery_power, c.invert_battery),
    });
    const house = c.house_power ? this._watts(c.house_power) : this._calcHouse(parts);
    return { house, direct: this._calcDirect(parts, house), ...parts };
  }
  _calcHouse({ solar, gridIn, gridOut, discharge, charge }) {
    if (gridIn == null) return null;
    return Math.max(0, (solar ?? 0) + gridIn + (discharge ?? 0) - (gridOut ?? 0) - (charge ?? 0));
  }

  /**
   * Direkt verbrauchte PV-Leistung: Erzeugung minus Einspeisung minus PV-Anteil der Speicherladung,
   * begrenzt auf [0, min(Erzeugung, Hausleistung)]. Ohne Netzladungs-Sensor wird angenommen,
   * dass der Speicher komplett aus PV geladen wird.
   */
  _calcDirect({ solar, gridOut, charge, gridCharge }, house) {
    if (solar == null) return null;
    // Nur der PV-Teil der Speicherladung zählt; Netzladung wird abgezogen.
    const pvCharge = Math.max(0, (charge ?? 0) - (gridCharge ?? 0));
    const d = solar - (gridOut ?? 0) - pvCharge;
    return Math.max(0, Math.min(d, solar, house ?? solar));
  }

  /** Herkunft des Verbrauchs in Anteilen (PV, Batterie, Netz). */
  _mix({ house, gridIn, discharge, direct }) {
    if (!house || house <= 0) return null;
    const g = Math.max(0, gridIn ?? 0);
    const b = Math.max(0, discharge ?? 0);
    // PV-Anteil = direkt verbrauchte PV, sonst was nach Netzbezug und Speicher übrig bleibt.
    const s = direct != null ? direct : Math.max(0, house - g - b);
    const sum = g + b + s || 1;
    return { solar: s / sum, battery: b / sum, grid: g / sum };
  }

  async _maybeLoadHistory() {
    const now = Date.now();
    if (!this._hass || this._loading || now - this._lastHistory < 5 * 60 * 1000) return;
    const c = this._cfg;
    const ids = [c.house_power, ...(c.solar_power || []), ...(c.grid_import || []), ...(c.grid_export || []),
      ...(c.battery_discharge || []), ...(c.battery_charge || []),
      ...(c.battery_grid_charge || []), ...(c.grid_power || []), ...(c.battery_power || [])].filter(Boolean);
    if (!ids.length) return;
    this._loading = true;
    try {
      const end = new Date();
      const start = new Date(end.getTime() - HISTORY_HOURS * 3600 * 1000);
      const res = await this._hass.callWS({
        type: "history/history_during_period",
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        entity_ids: ids,
        include_start_time_state: true,
        significant_changes_only: false,
        minimal_response: true,
        no_attributes: true,
      });
      this._history = this._buildSeries(res, start.getTime(), end.getTime());
      this._lastHistory = now;
    } catch (e) {
      console.warn("Energyboard: Verlauf nicht ladbar", e);
      this._history = [];
      this._lastHistory = now - 4 * 60 * 1000; // nach 1 Minute erneut versuchen
    } finally {
      this._loading = false;
      this._render();
    }
  }

  /** Zeitreihen auf feste Zeitfenster abbilden und Hausleistung berechnen. */
  _buildSeries(res, t0, t1) {
    const step = BUCKET_MIN * 60 * 1000;
    const n = Math.floor((t1 - t0) / step);
    const c = this._cfg;
    const sample = (id) => {
      const rows = res?.[id];
      if (!rows) return null;
      const f = this._unitFactor(id);
      const pts = rows
        .map((r) => ({ t: (r.lu ?? r.lc ?? 0) * 1000, v: parseFloat(r.s) }))
        .filter((p) => !Number.isNaN(p.v));
      let i = 0, last = null;
      const out = [];
      for (let k = 0; k <= n; k++) {
        const t = t0 + k * step;
        while (i < pts.length && pts[i].t <= t) last = pts[i++].v;
        out.push(last == null ? null : last * f);
      }
      return out;
    };
    // Mehrere Sensoren je Kategorie addieren (null, wenn zu dem Zeitpunkt kein Wert vorliegt).
    const group = (ids, invert = false) => {
      const list = (ids || []).map(sample).filter(Boolean);
      if (!list.length) return null;
      return Array.from({ length: n + 1 }, (_, k) => {
        const v = list.map((l) => l[k]).filter((x) => x != null);
        return v.length ? (invert ? -1 : 1) * v.reduce((a, b) => a + b, 0) : null;
      });
    };
    const house = c.house_power ? sample(c.house_power) : null;
    const g = {
      solar: group(c.solar_power), gridIn: group(c.grid_import), gridOut: group(c.grid_export),
      discharge: group(c.battery_discharge), charge: group(c.battery_charge),
      gridCharge: group(c.battery_grid_charge),
      grid: group(c.grid_power, c.invert_grid), battery: group(c.battery_power, c.invert_battery),
    };
    const pts = [];
    for (let k = 0; k <= n; k++) {
      const parts = this._split(Object.fromEntries(Object.entries(g).map(([key, arr]) => [key, arr ? arr[k] : null])));
      const v = house ? house[k] : this._calcHouse(parts);
      pts.push({ t: t0 + k * step, v, d: v == null ? null : this._calcDirect(parts, v) });
    }
    return pts;
  }

  _chart(points) {
    const valid = points.filter((p) => p.v != null);
    if (valid.length < 2) return `<div class="empty">Noch kein Verlauf verfügbar</div>`;
    const W = 640, H = 220, L = 8, R = 8, T = 10, B = 24;
    const max = Math.max(500, ...valid.map((p) => p.v)) * 1.1;
    const t0 = points[0].t, t1 = points[points.length - 1].t;
    const x = (t) => L + ((t - t0) / (t1 - t0)) * (W - L - R);
    const y = (v) => T + (1 - v / max) * (H - T - B);
    let d = "", pen = false;
    for (const p of points) {
      if (p.v == null) { pen = false; continue; }
      d += `${pen ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`;
      pen = true;
    }
    const dline = (key) => {
      let out = "", on = false;
      for (const p of points) {
        if (p[key] == null) { on = false; continue; }
        out += `${on ? "L" : "M"}${x(p.t).toFixed(1)},${y(p[key]).toFixed(1)}`;
        on = true;
      }
      return out;
    };
    const hasDirect = points.some((p) => p.d != null);
    const lastX = x(valid[valid.length - 1].t), firstX = x(valid[0].t);
    const area = `${d}L${lastX.toFixed(1)},${y(0)}L${firstX.toFixed(1)},${y(0)}Z`;
    const grid = [0.5, 1].map((f) => {
      const yy = y(max * f / 1.1);
      return `<line x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}" stroke="var(--eb-line)"/>
        <text class="axis" x="${W - R}" y="${yy - 4}" text-anchor="end">${fmtPower(max * f / 1.1).join(" ")}</text>`;
    }).join("");
    const ticks = [0, 6, 12, 18, 24].map((h) => {
      const t = t0 + (h / HISTORY_HOURS) * (t1 - t0);
      const label = new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return `<text class="axis" x="${x(t)}" y="${H - 6}" text-anchor="${h === 0 ? "start" : h === 24 ? "end" : "middle"}">${label}</text>`;
    }).join("");
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Hausleistung der letzten 24 Stunden">
      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#34d399" stop-opacity=".35"/><stop offset="1" stop-color="#34d399" stop-opacity="0"/>
      </linearGradient></defs>
      ${grid}<path d="${area}" fill="url(#g)"/>
      <path d="${d}" fill="none" stroke="#34d399" stroke-width="2" stroke-linejoin="round"/>
      ${hasDirect ? `<path d="${dline("d")}" fill="none" stroke="#ff9800" stroke-width="2" stroke-linejoin="round"/>` : ""}
      ${ticks}</svg>
      <div class="legend"><span><i style="background:var(--eb-green)"></i>Haus</span>${hasDirect ? `<span><i style="background:var(--eb-solar)"></i>PV direkt verbraucht</span>` : ""}</div>`;
  }

  _renderHouse() {
    const cur = this._current();
    if (!this._cfg.house_power && !(this._cfg.grid_import || []).length && !(this._cfg.grid_power || []).length) {
      return `<div class="eb-card"><div class="empty">Keine Sensoren konfiguriert. Unter Einstellungen → Geräte & Dienste → Energyboard auswählen.</div></div>`;
    }
    const [val, unit] = fmtPower(cur.house);
    const mix = this._mix(cur);
    const sharePv = cur.direct != null && cur.solar > 0 ? ` <div class="eb-label" style="margin-top:2px;text-transform:none;letter-spacing:0">${Math.round((cur.direct / cur.solar) * 100)} % der Erzeugung</div>` : "";
    const tile = (label, w, extra = "") => {
      if (w == null) return "";
      const [v, u] = fmtPower(Math.abs(w));
      return `<div class="eb-tile"><div class="eb-label">${label}</div><div class="eb-value">${v}<small>${u}</small></div>${extra}</div>`;
    };
    const hist = this._history ? this._chart(this._history) : `<div class="empty">Verlauf wird geladen …</div>`;
    return `<div class="grid">
      <div class="eb-card eb-card--glow">
        <div class="row"><span class="eb-title">Haus</span>
          <span class="eb-chip">${cur.house == null ? "Keine Daten" : "Verbrauch live"}</span></div>
        <div class="big"><b>${val}</b><span>${unit}</span></div>
        ${mix ? `<div class="eb-bar bar">
            <div class="eb-solar" style="width:${mix.solar * 100}%"></div>
            <div style="width:${mix.battery * 100}%;background:var(--eb-violet)"></div>
            <div class="eb-grid" style="width:${mix.grid * 100}%"></div></div>
          <div class="legend">
            <span><i style="background:var(--eb-solar)"></i>PV ${Math.round(mix.solar * 100)} %</span>
            ${cur.discharge != null ? `<span><i style="background:var(--eb-violet)"></i>Speicher ${Math.round(mix.battery * 100)} %</span>` : ""}
            <span><i style="background:var(--eb-grid)"></i>Netz ${Math.round(mix.grid * 100)} %</span></div>` : ""}
        <div class="tiles">
          ${tile("PV", cur.solar)}${tile("PV direkt verbraucht", cur.direct, sharePv)}${tile("Netzbezug", cur.gridIn)}${tile("Einspeisung", cur.gridOut)}
          ${tile("Vom Speicher", cur.discharge)}${tile("Zum Speicher", cur.charge)}${tile("Speicher aus Netz", cur.gridCharge)}
        </div>
      </div>
      <div class="eb-card">
        <div class="row"><span class="eb-title">Verlauf</span><span class="eb-label">24 h</span></div>
        ${hist}
      </div></div>`;
  }

  _render() {
    if (!this.shadowRoot) return;
    if (!this._built) {
      this.shadowRoot.innerHTML = `<style>${STYLE}</style>
        <link rel="stylesheet" href="${BASE}/energyboard-tokens.css">
        <div class="wrap">
          <div class="top">
            <button class="menu" aria-label="Menü" hidden>☰</button>
            <div class="tabs"><button class="tab active" data-tab="house">Haus</button></div>
          </div>
          <div id="content"></div></div>`;
      this.shadowRoot.querySelector(".menu").addEventListener("click", () =>
        this.dispatchEvent(new CustomEvent("hass-toggle-menu", { bubbles: true, composed: true })));
      this._built = true;
    }
    this.shadowRoot.querySelector(".menu").hidden = !this._narrow;
    // Nur neu zeichnen, wenn sich der Inhalt ändert (verhindert Flackern).
    const html = this._tab === "house" ? this._renderHouse() : "";
    if (html !== this._html) {
      this._html = html;
      this.shadowRoot.getElementById("content").innerHTML = html;
    }
  }
}

customElements.define("energyboard-panel", EnergyboardPanel);
