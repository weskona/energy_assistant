/* Energyboard sidebar panel. Tab 1: household power. */
const BASE = new URL(import.meta.url).pathname.replace(/\/[^/]*$/, "");

// @font-face must live in the document, not in the shadow DOM.
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
.dev{margin-top:14px}
.dev .line{display:flex;justify-content:space-between;gap:12px;font-size:14px}
.dev .name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dev .val{font-weight:700;white-space:nowrap}
.dev .val small{font-weight:500;color:var(--eb-muted);margin-left:3px}
.dev .track{height:6px;border-radius:3px;background:var(--eb-line);margin:6px 0 12px;overflow:hidden}
.dev .fill{height:100%;border-radius:3px;background:var(--eb-green);transition:width .6s}
.dev .fill.other{background:var(--eb-dim)}
.tab{white-space:nowrap}
.set .sec{margin-bottom:var(--eb-gap)}
.fld{margin-top:16px}
.fld>label,.sw{display:block;font-size:12.5px;color:var(--eb-muted);margin-bottom:6px}
.sw{display:flex;align-items:center;gap:10px;margin:16px 0 0;color:var(--eb-text);font-size:14px;cursor:pointer}
.sw input{accent-color:var(--eb-green);width:18px;height:18px}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px}
.chip{display:inline-flex;align-items:center;gap:6px;background:var(--eb-tile);border:1px solid var(--eb-tile-border);border-radius:999px;padding:4px 6px 4px 12px;font-size:13px;max-width:100%}
.chip button{border:0;background:none;color:var(--eb-muted);cursor:pointer;font-size:16px;line-height:1;padding:0 4px}
.chip button:hover{color:var(--eb-red)}
.set input[type=text]{width:100%;background:var(--eb-tile);border:1px solid var(--eb-tile-border);border-radius:10px;padding:9px 12px;color:var(--eb-text);font:14px var(--eb-font)}
.set input[type=text]:focus{outline:none;border-color:var(--eb-green)}
.mlist{max-height:260px;overflow:auto;border:1px solid var(--eb-tile-border);border-radius:10px;margin-top:8px}
.mrow{display:flex;align-items:center;gap:10px;padding:7px 10px;font-size:13px;cursor:pointer;border-bottom:1px solid var(--eb-line)}
.mrow:last-child{border-bottom:0}
.mrow input{accent-color:var(--eb-green);flex:none}
.mn{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mi{color:var(--eb-dim);font-size:11.5px;max-width:45%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mrow.ex .mn{color:var(--eb-dim);text-decoration:line-through}
.mbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px}
.mbar .btn{padding:7px 12px;font-size:12.5px}
.devlist{max-height:480px;overflow:auto}
.linkbtn{border:0;background:none;color:var(--eb-green);font:600 13px var(--eb-font);cursor:pointer;padding:6px 0}
.hint{color:var(--eb-muted);font-size:12.5px;margin-top:6px}
.ferr{color:var(--eb-orange);font-size:12.5px;margin-top:4px}
.bar2{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:var(--eb-gap)}
.btn{border:0;border-radius:12px;padding:10px 18px;font:600 14px var(--eb-font);cursor:pointer;background:var(--eb-green);color:#06281d}
.btn.ghost{background:var(--eb-tile);color:var(--eb-text);border:1px solid var(--eb-tile-border)}
.btn[disabled]{opacity:.4;cursor:default}
.msg{font-size:13px;color:var(--eb-green)}
.msg.err{color:var(--eb-red)}
.note{font-size:12.5px;color:var(--eb-muted)}
.warn{color:var(--eb-orange)}
`;

// English is the base language, German is the only translation.
const STRINGS = {
  en: {
    house: "House",
    live: "Live consumption",
    noData: "No data",
    history: "History",
    historyLoading: "Loading history …",
    noHistory: "No history available yet",
    chartLabel: "House power over the last 24 hours",
    notConfigured:
      "No sensors configured. Open Settings → Devices & services → Energyboard.",
    menu: "Menu",
    solar: "Solar",
    solarDirect: "Solar used directly",
    ofProduction: "{pct} % of production",
    gridImport: "Grid import",
    gridExport: "Grid export",
    fromStorage: "From storage",
    toStorage: "To storage",
    storageFromGrid: "Storage from grid",
    storage: "Storage",
    grid: "Grid",
    legendSolarDirect: "Solar used directly",
    devices: "Devices",
    otherDevices: "Other (not measured)",
    idleDevices: "{n} idle",
    share: "{pct} % of house",
    settings: "Settings",
    save: "Save",
    discard: "Discard",
    saved: "Saved",
    saving: "Saving …",
    saveFailed: "Could not save: {error}",
    adminOnly: "Only administrators can change the settings.",
    noSource: "Grid import, grid combined or house consumption is required.",
    addSensor: "Add sensor …",
    unknownSensor: "Unknown sensor: {id}",
    remove: "Remove",
    loading: "Loading …",
    sectionGrid: "Grid and house",
    sectionSolar: "Solar and storage",
    sectionDevices: "Devices",
    f_grid_power: "Grid combined (import +, export −)",
    f_invert_grid: "Invert grid sign",
    f_grid_import: "Grid import separate",
    f_grid_export: "Grid export separate",
    f_house_power: "House consumption directly (optional)",
    f_solar_power: "Solar production",
    f_battery_power: "Storage combined (discharge +, charge −)",
    f_invert_battery: "Invert storage sign",
    f_battery_discharge: "From storage (discharging)",
    f_battery_charge: "To storage (charging)",
    f_battery_grid_charge: "Storage charged from grid",
    f_device_power: "Additional device sensors (optional)",
    f_device_patterns: "Name patterns for device sensors (e.g. *_power)",
    addPattern: "e.g. *_power",
    invalidPattern: "Only letters, digits, _ . * and ? are allowed.",
    matchesCount: "{n} matching, {x} excluded. Untick a sensor to exclude it.",
    filterMatches: "Filter matches …",
    excludeShown: "Exclude shown",
    includeShown: "Include shown",
    showAll: "Show all {n}",
    showLess: "Show less",
    f_device_exclude: "Excluded sensors (never added by a pattern)",
    noMatches: "No power sensor matches yet",
  },
  de: {
    house: "Haus",
    live: "Verbrauch live",
    noData: "Keine Daten",
    history: "Verlauf",
    historyLoading: "Verlauf wird geladen …",
    noHistory: "Noch kein Verlauf verfügbar",
    chartLabel: "Hausleistung der letzten 24 Stunden",
    notConfigured:
      "Keine Sensoren konfiguriert. Unter Einstellungen → Geräte & Dienste → Energyboard auswählen.",
    menu: "Menü",
    solar: "PV",
    solarDirect: "PV direkt verbraucht",
    ofProduction: "{pct} % der Erzeugung",
    gridImport: "Netzbezug",
    gridExport: "Einspeisung",
    fromStorage: "Vom Speicher",
    toStorage: "Zum Speicher",
    storageFromGrid: "Speicher aus Netz",
    storage: "Speicher",
    grid: "Netz",
    legendSolarDirect: "PV direkt verbraucht",
    devices: "Geräte",
    otherDevices: "Sonstiges (nicht gemessen)",
    idleDevices: "{n} inaktiv",
    share: "{pct} % vom Haus",
    settings: "Einstellungen",
    save: "Speichern",
    discard: "Verwerfen",
    saved: "Gespeichert",
    saving: "Speichert …",
    saveFailed: "Speichern fehlgeschlagen: {error}",
    adminOnly: "Nur Administratoren können die Einstellungen ändern.",
    noSource: "Netzbezug, Netz kombiniert oder Hausverbrauch ist nötig.",
    addSensor: "Sensor hinzufügen …",
    unknownSensor: "Unbekannter Sensor: {id}",
    remove: "Entfernen",
    loading: "Lädt …",
    sectionGrid: "Netz und Haus",
    sectionSolar: "PV und Speicher",
    sectionDevices: "Geräte",
    f_grid_power: "Netz kombiniert (Bezug +, Einspeisung −)",
    f_invert_grid: "Vorzeichen Netz umkehren",
    f_grid_import: "Netzbezug einzeln",
    f_grid_export: "Einspeisung einzeln",
    f_house_power: "Hausverbrauch direkt (optional)",
    f_solar_power: "PV-Erzeugung",
    f_battery_power: "Speicher kombiniert (Entladen +, Laden −)",
    f_invert_battery: "Vorzeichen Speicher umkehren",
    f_battery_discharge: "Vom Speicher (Entladen)",
    f_battery_charge: "Zum Speicher (Laden)",
    f_battery_grid_charge: "Speicher aus dem Netz geladen",
    f_device_power: "Zusätzliche Geräte-Sensoren (optional)",
    f_device_patterns: "Namensmuster für Geräte-Sensoren (z. B. *_leistung)",
    addPattern: "z. B. *_leistung",
    invalidPattern: "Erlaubt sind nur Buchstaben, Ziffern, _ . * und ?.",
    matchesCount: "{n} passend, {x} ausgeschlossen. Häkchen entfernen schließt einen Sensor aus.",
    filterMatches: "Treffer filtern …",
    excludeShown: "Gezeigte ausschließen",
    includeShown: "Gezeigte zulassen",
    showAll: "Alle {n} zeigen",
    showLess: "Weniger zeigen",
    f_device_exclude: "Ausgeschlossene Sensoren (nie durch ein Muster)",
    noMatches: "Noch kein Leistungssensor passt",
  },
};

const esc = (t) =>
  String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// Settings form: [key, kind]. "multi" = several sensors, "single" = one sensor.
const SETTINGS_SECTIONS = [
  { title: "sectionGrid", fields: [["grid_power", "multi"], ["invert_grid", "bool"], ["grid_import", "single"], ["grid_export", "single"], ["house_power", "single"]] },
  { title: "sectionSolar", fields: [["solar_power", "multi"], ["battery_power", "multi"], ["invert_battery", "bool"], ["battery_discharge", "multi"], ["battery_charge", "multi"], ["battery_grid_charge", "single"]] },
  { title: "sectionDevices", fields: [["device_patterns", "text"], ["device_exclude", "multi"], ["device_power", "multi"]] },
];
const LIST_KEYS = ["grid_power", "grid_import", "grid_export", "solar_power", "battery_power", "battery_discharge", "battery_charge", "battery_grid_charge", "device_power", "device_patterns", "device_exclude"];
// Sensors that are part of the energy balance and therefore never listed as devices.
const SYSTEM_KEYS = ["house_power", "grid_power", "grid_import", "grid_export", "solar_power", "battery_power", "battery_discharge", "battery_charge", "battery_grid_charge"];
const PATTERN_RE = /^[a-z0-9_.*?]+$/;

/**
 * Name patterns: "*" matches any text, "?" one character.
 * Without a dot the pattern is compared with the part after "sensor.", e.g. "*_power".
 */
const patternRegExp = (pattern) => {
  const re = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
  return { full: pattern.includes("."), re: new RegExp(`^${re}$`, "i") };
};

/** Compile patterns once and return a function that tests entity ids. */
const compilePatterns = (patterns) => {
  const list = patterns.map(patternRegExp);
  return (entityId) => {
    const short = entityId.slice(entityId.indexOf(".") + 1);
    return list.some((p) => p.re.test(p.full ? entityId : short));
  };
};
const BOOL_KEYS = ["invert_grid", "invert_battery"];

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
    // Initial copy from the panel registration, only a fallback until the live settings arrive.
    this._fallback = (p && p.config) || {};
  }
  set narrow(n) { this._narrow = n; this._render(); }
  set hass(h) {
    this._hass = h;
    this._loadConfig();
    this._render();
    this._maybeLoadHistory();
  }

  get _cfg() { return this._config || this._fallback || {}; }

  get _isAdmin() { return this._hass?.user?.is_admin !== false; }

  /** Load the live settings over the WebSocket API (once). */
  async _loadConfig() {
    if (this._ready || this._loadingCfg || !this._hass) return;
    this._loadingCfg = true;
    try {
      this._config = await this._hass.callWS({ type: "energyboard/get_config" });
    } catch (e) {
      console.warn("Energyboard: could not load settings, using the registration copy", e);
      this._config = this._fallback || {};
    } finally {
      this._draft = this._normalize(this._config);
      this._ready = true;
      this._loadingCfg = false;
      this._settingsDirty = true;
      this._render();
      this._maybeLoadHistory();
    }
  }

  /** Settings in the shape of the settings form: lists, booleans, house_power as string or null. */
  _normalize(cfg = {}) {
    const out = { house_power: cfg.house_power || null };
    for (const k of LIST_KEYS) out[k] = Array.isArray(cfg[k]) ? [...cfg[k]] : cfg[k] ? [cfg[k]] : [];
    for (const k of BOOL_KEYS) out[k] = !!cfg[k];
    return out;
  }

  _draftList(key) {
    const v = this._draft?.[key];
    return key === "house_power" ? (v ? [v] : []) : v || [];
  }

  _draftAdd(key, id, mode) {
    if (key === "house_power") this._draft.house_power = id;
    else if (mode === "single") this._draft[key] = [id];
    else if (!this._draft[key].includes(id)) this._draft[key] = [...this._draft[key], id];
  }

  _draftRemove(key, id) {
    if (key === "house_power") this._draft.house_power = null;
    else this._draft[key] = this._draft[key].filter((x) => x !== id);
  }

  _hasSource(d = this._draft) {
    return !!(d?.house_power || d?.grid_import?.length || d?.grid_power?.length);
  }

  _isDirty() {
    return JSON.stringify(this._draft) !== JSON.stringify(this._normalize(this._config));
  }

  /** Power sensors offered in the picker. */
  _candidates() {
    const states = this._hass?.states || {};
    return Object.entries(states)
      .filter(([id, st]) => id.startsWith("sensor.") && st.attributes?.device_class === "power")
      .map(([id, st]) => ({ id, name: st.attributes.friendly_name || id }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async _save() {
    this._status = "saving";
    this._settingsDirty = true;
    this._render();
    try {
      this._config = await this._hass.callWS({ type: "energyboard/update_config", config: this._draft });
      this._draft = this._normalize(this._config);
      this._history = null;
      this._lastHistory = 0;
      this._status = "saved";
      this._error = "";
      this._maybeLoadHistory();
    } catch (e) {
      this._status = "error";
      this._error = e?.code === "no_source" ? this._t("noSource") : e?.message || String(e);
    }
    this._settingsDirty = true;
    this._render();
  }

  _onClick(e) {
    const rm = e.target.closest("[data-remove]");
    const bulk = e.target.closest("[data-bulk]");
    if (e.target.closest("[data-devtoggle]")) {
      this._devExpanded = !this._devExpanded;
      this._render();
    } else if (rm && this._isAdmin) {
      this._draftRemove(rm.dataset.remove, rm.dataset.id);
      this._edited();
    } else if (bulk && this._isAdmin) {
      // Applies to the sensors currently shown (respects the filter).
      const ids = this._matchList().shown;
      const rest = this._draft.device_exclude.filter((id) => !ids.includes(id));
      this._draft.device_exclude = bulk.dataset.bulk === "exclude" ? [...rest, ...ids] : rest;
      this._edited();
    } else if (e.target.closest("[data-save]") && this._isAdmin && !this._saveDisabled()) {
      this._save();
    } else if (e.target.closest("[data-discard]")) {
      this._draft = this._normalize(this._config);
      this._edited();
    }
  }

  _onChange(e) {
    const t = e.target;
    if (!this._isAdmin) return;
    if (t.dataset?.device) {
      const id = t.dataset.device;
      const rest = this._draft.device_exclude.filter((x) => x !== id);
      this._draft.device_exclude = t.checked ? rest : [...rest, id];
      this._edited();
    } else if (t.dataset?.bool) {
      this._draft[t.dataset.bool] = t.checked;
      this._edited();
    } else if (t.dataset?.add) {
      const id = t.value.trim();
      if (!id) return;
      if (t.dataset.mode === "text") {
        const pattern = id.toLowerCase();
        if (PATTERN_RE.test(pattern)) {
          this._draftAdd(t.dataset.add, pattern, "text");
          this._fieldError = {};
        } else {
          this._fieldError = { [t.dataset.add]: this._t("invalidPattern") };
        }
      } else if (this._hass?.states?.[id]) {
        this._draftAdd(t.dataset.add, id, t.dataset.mode);
        this._fieldError = {};
      } else {
        this._fieldError = { [t.dataset.add]: this._t("unknownSensor", { id }) };
      }
      this._edited(t.dataset.add);
    }
  }

  /** Typing in the filter box only redraws the match list, so the box keeps its focus. */
  _onInput(e) {
    if (e.target.dataset?.filter === undefined) return;
    this._filter = e.target.value.toLowerCase();
    const list = this.shadowRoot.getElementById("mlist");
    if (list) list.innerHTML = this._renderMatchRows(!this._isAdmin);
  }

  _edited(focusKey) {
    this._status = "";
    this._settingsDirty = true;
    const scroll = this.shadowRoot.getElementById("mlist")?.scrollTop;
    this._render();
    if (scroll) {
      const list = this.shadowRoot.getElementById("mlist");
      if (list) list.scrollTop = scroll;
    }
    if (focusKey) this.shadowRoot.querySelector(`input[data-add="${focusKey}"]`)?.focus();
  }

  _saveDisabled() {
    return !this._isAdmin || this._status === "saving" || !this._isDirty() || !this._hasSource();
  }

  /** Sensors that match the patterns (also the excluded ones), filtered by the filter box. */
  _matchList() {
    const found = this._discoverDevices(this._draft.device_patterns, this._draft, { ignoreExclude: true });
    const states = this._hass?.states || {};
    const q = (this._filter || "").trim();
    return {
      found,
      shown: q
        ? found.filter((id) => `${states[id]?.attributes?.friendly_name || ""} ${id}`.toLowerCase().includes(q))
        : found,
    };
  }

  _renderMatchRows(ro) {
    const { shown } = this._matchList();
    const states = this._hass?.states || {};
    const excluded = new Set(this._draft.device_exclude);
    if (!shown.length) return `<div class="hint" style="padding:10px">${esc(this._t("noMatches"))}</div>`;
    return shown
      .map((id) => {
        const off = excluded.has(id);
        const name = states[id]?.attributes?.friendly_name || id;
        return `<label class="mrow${off ? " ex" : ""}" title="${esc(id)}"><input type="checkbox" data-device="${esc(id)}" ${off ? "" : "checked"} ${ro ? "disabled" : ""}><span class="mn">${esc(name)}</span><span class="mi">${esc(id)}</span></label>`;
      })
      .join("");
  }

  _renderMatches(ro) {
    const { found } = this._matchList();
    if (!found.length) return `<div class="hint">${esc(this._t("noMatches"))}</div>`;
    const excluded = new Set(this._draft.device_exclude);
    const x = found.filter((id) => excluded.has(id)).length;
    return `<div class="hint" id="mcount">${esc(this._t("matchesCount", { n: found.length, x }))}</div>
      <div class="mbar"><input type="text" data-filter value="${esc(this._filter || "")}" placeholder="${esc(this._t("filterMatches"))}" autocomplete="off" style="flex:1 1 160px;width:auto">
      ${ro ? "" : `<button class="btn ghost" data-bulk="exclude">${esc(this._t("excludeShown"))}</button><button class="btn ghost" data-bulk="include">${esc(this._t("includeShown"))}</button>`}</div>
      <div class="mlist" id="mlist">${this._renderMatchRows(ro)}</div>`;
  }

  _renderSettings() {
    if (!this._ready) return `<div class="eb-card"><div class="empty">${this._t("loading")}</div></div>`;
    const ro = !this._isAdmin;
    const states = this._hass?.states || {};
    const nameOf = (id) => states[id]?.attributes?.friendly_name || id;
    const options = this._candidates().map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
    const field = ([key, kind]) => {
      const label = this._t(`f_${key}`);
      if (kind === "bool") {
        return `<label class="sw"><input type="checkbox" data-bool="${key}" ${this._draft[key] ? "checked" : ""} ${ro ? "disabled" : ""}>${esc(label)}</label>`;
      }
      const chips = this._draftList(key)
        .map((id) => `<span class="chip" title="${esc(id)}">${esc(nameOf(id))}${ro ? "" : `<button data-remove="${key}" data-id="${esc(id)}" aria-label="${esc(this._t("remove"))}">×</button>`}</span>`)
        .join("");
      let hint = "";
      if (kind === "text" && this._draft.device_patterns.length) hint = this._renderMatches(ro);
      const err = this._fieldError?.[key] ? `<div class="ferr">${esc(this._fieldError[key])}</div>` : "";
      return `<div class="fld"><label>${esc(label)}</label>
        ${chips ? `<div class="chips">${chips}</div>` : ""}
        ${ro ? "" : `<input type="text" data-add="${key}" data-mode="${kind}" ${kind === "text" ? "" : 'list="eb-sensors"'} placeholder="${esc(this._t(kind === "text" ? "addPattern" : "addSensor"))}" autocomplete="off">`}${hint}${err}</div>`;
    };
    const sections = SETTINGS_SECTIONS.map(
      (sec) => `<div class="eb-card sec"><div class="eb-title">${this._t(sec.title)}</div>${sec.fields.map(field).join("")}</div>`,
    ).join("");
    const dirty = this._isDirty();
    let msg = "";
    if (ro) msg = `<span class="msg err">${this._t("adminOnly")}</span>`;
    else if (!this._hasSource()) msg = `<span class="msg err">${this._t("noSource")}</span>`;
    else if (this._status === "saving") msg = `<span class="msg">${this._t("saving")}</span>`;
    else if (this._status === "saved") msg = `<span class="msg">${this._t("saved")}</span>`;
    else if (this._status === "error") msg = `<span class="msg err">${esc(this._t("saveFailed", { error: this._error }))}</span>`;
    return `<datalist id="eb-sensors">${options}</datalist>
      <div class="set"><div class="grid">${sections}</div>
      ${ro ? `<div class="bar2">${msg}</div>` : `<div class="bar2">
        <button class="btn" data-save ${this._saveDisabled() ? "disabled" : ""}>${this._t("save")}</button>
        <button class="btn ghost" data-discard ${dirty ? "" : "disabled"}>${this._t("discard")}</button>${msg}</div>`}</div>`;
  }

  /** Translate a key using the Home Assistant UI language (de, otherwise en). */
  _t(key, vars = {}) {
    const lang = (this._hass?.language || "en").toLowerCase().startsWith("de") ? "de" : "en";
    const text = STRINGS[lang][key] ?? STRINGS.en[key] ?? key;
    return text.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
  }

  /** Power of an entity in W (positive values expected). */
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
  /** Sum of several sensors; null if none is configured or available. */
  _sum(ids) {
    const vals = (ids || []).map((id) => this._watts(id)).filter((v) => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
  }

  /** Sum with optional sign inversion (for combined sensors). */
  _signed(ids, invert) {
    const v = this._sum(ids);
    return v == null ? null : invert ? -v : v;
  }

  /** Merge separate and combined sensors into positive quantities. */
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
  /** Individual devices with their current power in W, highest first. */
  _devices() {
    const explicit = this._cfg.device_power || [];
    const ids = [...new Set([...explicit, ...this._discoverDevices(this._cfg.device_patterns, this._cfg)])];
    return ids
      .map((id) => ({
        id,
        name: this._hass?.states?.[id]?.attributes?.friendly_name || id,
        w: this._watts(id),
      }))
      .filter((d) => d.w != null)
      .sort((a, b) => b.w - a.w);
  }

  /**
   * Power sensors whose name matches one of the patterns. Only "sensor." entities with
   * device_class power count. Sensors of the energy balance and excluded sensors are left out.
   */
  _discoverDevices(patterns = [], cfg = this._cfg, { ignoreExclude = false } = {}) {
    if (!patterns?.length) return [];
    const skip = new Set([
      ...SYSTEM_KEYS.flatMap((k) => (Array.isArray(cfg[k]) ? cfg[k] : cfg[k] ? [cfg[k]] : [])),
      ...(ignoreExclude ? [] : cfg.device_exclude || []),
    ]);
    const matches = compilePatterns(patterns);
    return Object.entries(this._hass?.states || {})
      .filter(([id, st]) => id.startsWith("sensor.") && st.attributes?.device_class === "power")
      .map(([id]) => id)
      .filter((id) => !skip.has(id) && matches(id))
      .sort();
  }

  _calcHouse({ solar, gridIn, gridOut, discharge, charge }) {
    if (gridIn == null) return null;
    return Math.max(0, (solar ?? 0) + gridIn + (discharge ?? 0) - (gridOut ?? 0) - (charge ?? 0));
  }

  /**
   * Solar power used directly: production minus export minus the solar share of storage charging,
   * limited to [0, min(production, house power)]. Without a grid-charge sensor the storage
   * is assumed to be charged entirely from solar.
   */
  _calcDirect({ solar, gridOut, charge, gridCharge }, house) {
    if (solar == null) return null;
    // Only the solar share of the charging counts; grid charging is subtracted.
    const pvCharge = Math.max(0, (charge ?? 0) - (gridCharge ?? 0));
    const d = solar - (gridOut ?? 0) - pvCharge;
    return Math.max(0, Math.min(d, solar, house ?? solar));
  }

  /** Source of consumption as shares (solar, storage, grid). */
  _mix({ house, gridIn, discharge, direct }) {
    if (!house || house <= 0) return null;
    const g = Math.max(0, gridIn ?? 0);
    const b = Math.max(0, discharge ?? 0);
    // Solar share = directly used solar, else what remains after grid import and storage.
    const s = direct != null ? direct : Math.max(0, house - g - b);
    const sum = g + b + s || 1;
    return { solar: s / sum, battery: b / sum, grid: g / sum };
  }

  async _maybeLoadHistory() {
    const now = Date.now();
    if (!this._hass || !this._ready || this._loading || now - this._lastHistory < 5 * 60 * 1000) return;
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
      console.warn("Energyboard: could not load history", e);
      this._history = [];
      this._lastHistory = now - 4 * 60 * 1000; // retry after one minute
    } finally {
      this._loading = false;
      this._render();
    }
  }

  /** Map time series onto fixed time buckets and calculate house power. */
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
    // Add up several sensors per category (null if there is no value at that time).
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
    if (valid.length < 2) return `<div class="empty">${this._t("noHistory")}</div>`;
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
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${this._t("chartLabel")}">
      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#34d399" stop-opacity=".35"/><stop offset="1" stop-color="#34d399" stop-opacity="0"/>
      </linearGradient></defs>
      ${grid}<path d="${area}" fill="url(#g)"/>
      <path d="${d}" fill="none" stroke="#34d399" stroke-width="2" stroke-linejoin="round"/>
      ${hasDirect ? `<path d="${dline("d")}" fill="none" stroke="#ff9800" stroke-width="2" stroke-linejoin="round"/>` : ""}
      ${ticks}</svg>
      <div class="legend"><span><i style="background:var(--eb-green)"></i>${this._t("house")}</span>${hasDirect ? `<span><i style="background:var(--eb-solar)"></i>${this._t("legendSolarDirect")}</span>` : ""}</div>`;
  }

  _renderHouse() {
    if (!this._ready) return `<div class="eb-card"><div class="empty">${this._t("loading")}</div></div>`;
    const cur = this._current();
    if (!this._cfg.house_power && !(this._cfg.grid_import || []).length && !(this._cfg.grid_power || []).length) {
      return `<div class="eb-card"><div class="empty">${this._t("notConfigured")}</div></div>`;
    }
    const [val, unit] = fmtPower(cur.house);
    const mix = this._mix(cur);
    const sharePv = cur.direct != null && cur.solar > 0 ? ` <div class="eb-label" style="margin-top:2px;text-transform:none;letter-spacing:0">${this._t("ofProduction", { pct: Math.round((cur.direct / cur.solar) * 100) })}</div>` : "";
    const tile = (label, w, extra = "") => {
      if (w == null) return "";
      const [v, u] = fmtPower(Math.abs(w));
      return `<div class="eb-tile"><div class="eb-label">${label}</div><div class="eb-value">${v}<small>${u}</small></div>${extra}</div>`;
    };
    const devices = this._renderDevices(cur.house);
    const hist = this._history ? this._chart(this._history) : `<div class="empty">${this._t("historyLoading")}</div>`;
    return `<div class="grid">
      <div class="eb-card eb-card--glow">
        <div class="row"><span class="eb-title">${this._t("house")}</span>
          <span class="eb-chip">${cur.house == null ? this._t("noData") : this._t("live")}</span></div>
        <div class="big"><b>${val}</b><span>${unit}</span></div>
        ${mix ? `<div class="eb-bar bar">
            <div class="eb-solar" style="width:${mix.solar * 100}%"></div>
            <div style="width:${mix.battery * 100}%;background:var(--eb-violet)"></div>
            <div class="eb-grid" style="width:${mix.grid * 100}%"></div></div>
          <div class="legend">
            <span><i style="background:var(--eb-solar)"></i>PV ${Math.round(mix.solar * 100)} %</span>
            ${cur.discharge != null ? `<span><i style="background:var(--eb-violet)"></i>${this._t("storage")} ${Math.round(mix.battery * 100)} %</span>` : ""}
            <span><i style="background:var(--eb-grid)"></i>${this._t("grid")} ${Math.round(mix.grid * 100)} %</span></div>` : ""}
        <div class="tiles">
          ${tile(this._t("solar"), cur.solar)}${tile(this._t("solarDirect"), cur.direct, sharePv)}${tile(this._t("gridImport"), cur.gridIn)}${tile(this._t("gridExport"), cur.gridOut)}
          ${tile(this._t("fromStorage"), cur.discharge)}${tile(this._t("toStorage"), cur.charge)}${tile(this._t("storageFromGrid"), cur.gridCharge)}
        </div>
      </div>
      <div class="eb-card">
        <div class="row"><span class="eb-title">${this._t("history")}</span><span class="eb-label">24 h</span></div>
        ${hist}
      </div>
      ${devices}</div>`;
  }

  /** Card with the power of individual devices. Empty string if none are configured. */
  _renderDevices(house) {
    if (!(this._cfg.device_power || []).length && !(this._cfg.device_patterns || []).length) return "";
    const IDLE_W = 5;
    const all = this._devices();
    const active = all.filter((d) => d.w >= IDLE_W);
    const idle = all.length - active.length;
    const sum = all.reduce((a, d) => a + d.w, 0);
    const other = house != null && house - sum >= IDLE_W ? house - sum : null;
    // Strongest devices first. By default only the top ones are shown, the rest folds away.
    const LIMIT = 8;
    active.sort((a, b) => b.w - a.w);
    const folded = active.length > LIMIT;
    const shown = folded && !this._devExpanded ? active.slice(0, LIMIT) : active;
    const rows = other != null ? [...shown, { name: this._t("otherDevices"), w: other, other: true }] : shown;
    const scale = Math.max(1, house ?? 0, ...rows.map((d) => d.w));
    const [tv, tu] = fmtPower(sum);
    const list = rows
      .map((d) => {
        const [v, u] = fmtPower(d.w);
        const pct = house > 0 ? this._t("share", { pct: Math.round((d.w / house) * 100) }) : "";
        return `<div class="dev"><div class="line"><span class="name" title="${esc(pct)}">${esc(d.name)}</span>
          <span class="val">${v}<small>${u}</small></span></div>
          <div class="track"><div class="fill${d.other ? " other" : ""}" style="width:${Math.min(100, (d.w / scale) * 100)}%"></div></div></div>`;
      })
      .join("");
    return `<div class="eb-card">
      <div class="row"><span class="eb-title">${this._t("devices")}</span><span class="eb-label">${tv} ${tu}</span></div>
      <div class="${this._devExpanded ? "devlist" : ""}">${list || `<div class="empty">–</div>`}</div>
      ${folded ? `<button class="linkbtn" data-devtoggle>${this._devExpanded ? this._t("showLess") : this._t("showAll", { n: active.length })}</button>` : ""}
      ${idle > 0 ? `<div class="note">${this._t("idleDevices", { n: idle })}</div>` : ""}
    </div>`;
  }

  _render() {
    if (!this.shadowRoot) return;
    if (!this._built) {
      this.shadowRoot.innerHTML = `<style>${STYLE}</style>
        <link rel="stylesheet" href="${BASE}/energyboard-tokens.css">
        <div class="wrap">
          <div class="top">
            <button class="menu" aria-label="Menu" hidden>☰</button>
            <div class="tabs"><button class="tab active" data-tab="house">House</button><button class="tab" data-tab="settings">Settings</button></div>
          </div>
          <div id="content"></div></div>`;
      this.shadowRoot.querySelector(".menu").addEventListener("click", () =>
        this.dispatchEvent(new CustomEvent("hass-toggle-menu", { bubbles: true, composed: true })));
      const content = this.shadowRoot.getElementById("content");
      content.addEventListener("click", (e) => this._onClick(e));
      content.addEventListener("change", (e) => this._onChange(e));
      content.addEventListener("input", (e) => this._onInput(e));
      this.shadowRoot.querySelector(".tabs").addEventListener("click", (e) => {
        const tab = e.target.closest("[data-tab]")?.dataset.tab;
        if (tab && tab !== this._tab) {
          this._tab = tab;
          this._html = null;
          this._settingsDirty = true;
          this._render();
        }
      });
      this._built = true;
    }
    this.shadowRoot.querySelector(".menu").hidden = !this._narrow;
    this.shadowRoot.querySelector(".menu").setAttribute("aria-label", this._t("menu"));
    for (const tab of this.shadowRoot.querySelectorAll(".tab")) {
      tab.textContent = this._t(tab.dataset.tab);
      tab.classList.toggle("active", tab.dataset.tab === this._tab);
    }
    const content = this.shadowRoot.getElementById("content");
    if (this._tab === "settings") {
      // The settings form only redraws on its own edits, so typing is not interrupted
      // by live state updates from Home Assistant.
      if (this._settingsDirty) {
        this._settingsDirty = false;
        this._html = null;
        content.innerHTML = this._renderSettings();
      }
      return;
    }
    // Only redraw when the content changes (avoids flicker).
    const html = this._renderHouse();
    if (html !== this._html) {
      this._html = html;
      content.innerHTML = html;
    }
  }
}

customElements.define("energyboard-panel", EnergyboardPanel);
