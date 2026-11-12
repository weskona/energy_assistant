/* Energy Assistant sidebar panel. Tab 1: household power. */
const BASE = new URL(import.meta.url).pathname.replace(/\/[^/]*$/, "");

// @font-face must live in the document, not in the shadow DOM.
if (!document.getElementById("energy-assistant-fonts")) {
  const l = document.createElement("link");
  l.id = "energy-assistant-fonts";
  l.rel = "stylesheet";
  l.href = `${BASE}/energy-assistant-tokens.css`;
  document.head.appendChild(l);
}

const HISTORY_HOURS = 24;
const BUCKET_MIN = 5;

const STYLE = `
:host{display:block;min-height:100%;background:var(--eb-bg);color:var(--eb-text);font-family:var(--eb-font)}
*{box-sizing:border-box}
.wrap{padding:16px 24px}
.top{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;margin-bottom:16px}
.top .right{justify-self:end}
.menu{background:none;border:0;color:var(--eb-muted);cursor:pointer;padding:6px}
.tabs{display:flex;gap:4px;padding:4px;background:var(--eb-panel);border:1px solid var(--eb-line);border-radius:14px}
.gear{display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:12px;border:1px solid var(--eb-line);background:var(--eb-panel);color:var(--eb-muted);cursor:pointer;padding:0}
.gear:hover{color:var(--eb-text)}
.gear.active{background:rgba(255,255,255,.08);color:var(--eb-text);border-color:var(--eb-green)}
.gear svg{width:20px;height:20px}
.tab{border:0;background:none;color:var(--eb-muted);font:600 14px var(--eb-font);padding:8px 16px;border-radius:10px;cursor:pointer}
.tab.active{background:rgba(255,255,255,.08);color:var(--eb-text)}
.grid{display:grid;gap:var(--eb-gap);grid-template-columns:minmax(0,1fr) minmax(0,2fr)}
.set .grid{grid-template-columns:repeat(2,minmax(0,1fr))}
.wide{grid-column:1/-1}
.trio{grid-column:1/-1;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr));gap:var(--eb-gap);align-items:stretch}
.sec .fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));column-gap:28px;align-items:start}
.fld.span{grid-column:1/-1}
@media (max-width:800px){.grid,.set .grid{grid-template-columns:minmax(0,1fr)}.wrap{padding:12px}}
.row{display:flex;justify-content:space-between;align-items:center;gap:8px}
.big{display:flex;align-items:baseline;gap:8px;margin:14px 0 6px}
.big b{font-size:64px;font-weight:800;line-height:1}
.big span{font-size:22px;color:var(--eb-muted);font-weight:500}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-top:16px}
.legend{display:flex;gap:14px;flex-wrap:wrap;margin-top:10px;font-size:12.5px;color:var(--eb-muted)}
.legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px}
.bar{margin-top:16px}
.bar>div{transition:width .6s}
svg.chart{width:100%;height:auto;display:block;margin-top:12px}
.axis{fill:var(--eb-dim);font-size:11px}
.empty{padding:40px 0;text-align:center;color:var(--eb-muted)}
.state{color:var(--eb-green)}
.dev{margin-top:14px}
.dev .line{display:flex;justify-content:space-between;gap:12px;font-size:14px}
.dev .name{display:flex;align-items:center;min-width:0}
.nt{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.dev .ico,.mn .ico{--mdc-icon-size:18px;flex:none;margin-right:8px;color:var(--eb-muted)}
.dev .dot,.mn .dot{display:inline-block;flex:none;width:9px;height:9px;border-radius:50%;margin-right:8px}
.dev .edit{border:0;background:none;color:var(--eb-dim);cursor:pointer;padding:2px 6px;margin-left:4px;opacity:.55;flex:none;font-size:14px;line-height:1;--mdc-icon-size:16px}
.dev:hover .edit,.dev .edit:focus-visible{opacity:1;color:var(--eb-text)}
.dev .rename{flex:1 1 auto;min-width:0;max-width:420px;font:inherit;background:var(--eb-tile);color:var(--eb-text);border:1px solid var(--eb-green);border-radius:8px;padding:3px 8px}
.dev .rename:focus{outline:none}
.dev .cnt{color:var(--eb-dim);font-size:12px;margin-left:6px;flex:none;white-space:nowrap}
.dev .val{font-weight:700;white-space:nowrap}
.dev .val small{font-weight:500;color:var(--eb-muted);margin-left:3px}
.dev .val small.pct{margin-left:10px;color:var(--eb-muted);display:inline-block;min-width:36px;text-align:right}
.dev .track{height:6px;border-radius:3px;background:var(--eb-line);margin:6px 0 12px;overflow:hidden}
.dev .fill{height:100%;border-radius:3px;background:var(--eb-green);transition:width .6s}
.dev .fill.other{background:var(--eb-dim)}
.dev .line.open{cursor:pointer}
.dev .line.open:hover .nt{color:var(--eb-green)}
.dev .chev{--mdc-icon-size:18px;flex:none;margin-right:4px;margin-left:-4px;color:var(--eb-dim);font-size:11px;transition:transform .2s;display:inline-block}
.dev .chev.on{transform:rotate(90deg)}
.dev .subs{margin:0 0 12px 26px;border-left:2px solid var(--eb-line);padding-left:12px}
.dev .subs .s{display:flex;justify-content:space-between;gap:12px;font-size:13px;padding:3px 0;color:var(--eb-muted)}
.dev .subs .s.idle{color:var(--eb-dim)}
.dev .subs .s .sn{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dev .subs .s b{font-weight:600;color:var(--eb-text);white-space:nowrap}
.dev .subs .s.idle b{color:var(--eb-dim)}
.tab{white-space:nowrap}
.set .sec{margin-bottom:var(--eb-gap)}
.eb-card.pvnote{border-color:var(--eb-green);background:radial-gradient(120% 90% at 0% 0%,rgba(52,211,153,.14),transparent 60%),var(--eb-panel);margin-bottom:var(--eb-gap)}
.pvnote .pvq{font-size:16px;font-weight:600;margin:10px 0 6px}
.pvnote ul{margin:0 0 4px;padding-left:20px;color:var(--eb-muted);font-size:14px}
.pvnote .bar2{margin-top:12px}
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
.mlist{max-height:340px;overflow:auto;border:1px solid var(--eb-tile-border);border-radius:10px;margin-top:8px;display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr))}
.mrow{display:flex;align-items:center;gap:10px;padding:8px 12px;font-size:13px;cursor:pointer;border-bottom:1px solid var(--eb-line);min-width:0}
.mrow input{accent-color:var(--eb-green);flex:none}
.mt{display:flex;flex-direction:column;min-width:0}
.mn{display:flex;align-items:center;min-width:0}
.mi{color:var(--eb-dim);font-size:11.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mrow.ex .mn{color:var(--eb-dim);text-decoration:line-through}
.segs{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:8px}
.segs .seglab{font-size:12px;color:var(--eb-dim);margin-right:2px}
.segs .sep{width:1px;height:20px;background:var(--eb-line);margin:0 6px}
.seg{border:1px solid var(--eb-tile-border);background:var(--eb-tile);color:var(--eb-muted);border-radius:999px;padding:5px 12px;font:600 12.5px var(--eb-font);cursor:pointer}
.seg small{font-weight:500;margin-left:3px;color:var(--eb-dim)}
.seg.on{color:var(--eb-text);border-color:var(--eb-green);background:rgba(52,211,153,.12)}
.seg.on small{color:var(--eb-muted)}
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
    tabPower: "Power",
    rename: "Rename",
    originalName: "Original: {name}",
    live: "Live consumption",
    noData: "No data",
    history: "History",
    historyLoading: "Loading history …",
    noHistory: "No history available yet",
    chartLabel: "House power over the last 24 hours",
    notConfigured:
      "No sensors configured. Open Settings → Devices & services → Energy Assistant.",
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
    filterAll: "All",
    filterGroupState: "Activity",
    filterGroupSel: "Selection",
    filterSelected: "Selected",
    filterUnselected: "Not selected",
    filterLabels: "Filter labels …",
    noLabelMatches: "No label matches the filters",
    sectionAreas: "Areas",
    f_area_ids: "Areas (their power sensors are summed up per area)",
    filterAreas: "Filter areas …",
    noAreaMatches: "No area matches the filters",
    noPowerAreas: "No area has power sensors yet. Assign your power sensors or their devices to an area.",
    noAreasDefined: "No areas exist in Home Assistant yet. Create them under Settings → Areas, labels & zones.",
    pvPlants: "PV by plant",
    pvTitle: "PV Assistant detected",
    pvAsk: "PV Assistant is installed. Do you want to take over its sensors?",
    pvSolar: "Solar production: {n} sensors",
    pvStorage: "Storage: {parts}",
    pvCombined: "combined {n}",
    pvCharge: "charging {n}",
    pvDischarge: "discharging {n}",
    pvGrid: "Grid: {parts}",
    pvImport: "import {n}",
    pvExport: "feed-in {n}",
    pvFeedInfo: "The feed-in sensor of PV Assistant reports feed-in as negative values. It is used as the combined grid sensor (import +, feed-in −).",
    pvAbsInfo: "Charging and discharging sensors that report negative values count with their magnitude.",
    pvApply: "Take over sensors",
    pvOverwrite: "This replaces the sensors in these fields. Save afterwards to keep them.",
    pvDone: "The sensors of PV Assistant are in use.",
    areaAutoHint: "Nothing selected: all areas with power sensors are shown. Select areas to show only these.",
    noPowerLabels: "No label has power sensors yet. Add a label to your power sensors under Settings → Areas, labels & zones.",
    filterActive: "Active",
    filterIdle: "Inactive",
    filterIncluded: "Included",
    filterExcluded: "Excluded",
    filterActiveTip: "At least 5 W right now",
    filterIdleTip: "Below 5 W or no value",
    excludeShown: "Exclude shown",
    includeShown: "Include shown",
    showAll: "Show all {n}",
    showLess: "Show less",
    areas: "Areas",
    noArea: "No area",
    labels: "Labels",
    sectionLabels: "Labels",
    f_label_ids: "Labels (their power sensors are summed up per label)",
    noLabelsDefined: "No labels exist in Home Assistant yet. Create them under Settings → Areas, labels & zones.",
    labelSensors1: "1 power sensor",
    labelSensorsN: "{n} power sensors",
    deviceCount1: "1 device",
    deviceCountN: "{n} devices",
    f_device_exclude: "Excluded sensors (never added by a pattern)",
    f_device_exclude_patterns: "Exclude patterns (e.g. alpha_ess_*)",
    addExcludePattern: "e.g. alpha_ess_*",
    excludedByPattern: "Excluded by an exclude pattern",
    noMatches: "No power sensor matches yet",
  },
  de: {
    house: "Haus",
    tabPower: "Leistung",
    rename: "Umbenennen",
    originalName: "Original: {name}",
    live: "Verbrauch live",
    noData: "Keine Daten",
    history: "Verlauf",
    historyLoading: "Verlauf wird geladen …",
    noHistory: "Noch kein Verlauf verfügbar",
    chartLabel: "Hausleistung der letzten 24 Stunden",
    notConfigured:
      "Keine Sensoren konfiguriert. Unter Einstellungen → Geräte & Dienste → Energy Assistant auswählen.",
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
    filterAll: "Alle",
    filterGroupState: "Aktivität",
    filterGroupSel: "Auswahl",
    filterSelected: "Ausgewählt",
    filterUnselected: "Nicht ausgewählt",
    filterLabels: "Labels filtern …",
    noLabelMatches: "Kein Label passt zu den Filtern",
    sectionAreas: "Bereiche",
    f_area_ids: "Bereiche (ihre Leistungssensoren werden je Bereich zusammengefasst)",
    filterAreas: "Bereiche filtern …",
    noAreaMatches: "Kein Bereich passt zu den Filtern",
    noPowerAreas: "Noch kein Bereich hat Leistungssensoren. Ordne deine Leistungssensoren oder ihre Geräte einem Bereich zu.",
    noAreasDefined: "In Home Assistant gibt es noch keine Bereiche. Anlegen unter Einstellungen → Bereiche, Labels & Zonen.",
    pvPlants: "PV je Anlage",
    pvTitle: "PV Assistant erkannt",
    pvAsk: "PV Assistant ist installiert. Sollen die Sensoren übernommen werden?",
    pvSolar: "PV-Erzeugung: {n} Sensoren",
    pvStorage: "Speicher: {parts}",
    pvCombined: "kombiniert {n}",
    pvCharge: "Laden {n}",
    pvDischarge: "Entladen {n}",
    pvGrid: "Netz: {parts}",
    pvImport: "Bezug {n}",
    pvExport: "Einspeisung {n}",
    pvFeedInfo: "Der Einspeise-Sensor von PV Assistant meldet die Einspeisung als negative Werte. Er wird als kombinierter Netzsensor genutzt (Bezug +, Einspeisung −).",
    pvAbsInfo: "Lade- und Entlade-Sensoren mit negativen Werten zählen mit ihrem Betrag.",
    pvApply: "Sensoren übernehmen",
    pvOverwrite: "Dadurch werden die Sensoren in diesen Feldern ersetzt. Danach speichern, damit sie bleiben.",
    pvDone: "Die Sensoren von PV Assistant sind übernommen.",
    areaAutoHint: "Nichts ausgewählt: Es werden alle Bereiche mit Leistungssensoren gezeigt. Wähle Bereiche, um nur diese zu zeigen.",
    noPowerLabels: "Noch kein Label hat Leistungssensoren. Versieh deine Leistungssensoren unter Einstellungen → Bereiche, Labels & Zonen mit einem Label.",
    filterActive: "Aktiv",
    filterIdle: "Inaktiv",
    filterIncluded: "Enthalten",
    filterExcluded: "Ausgeschlossen",
    filterActiveTip: "Aktuell mindestens 5 W",
    filterIdleTip: "Unter 5 W oder kein Wert",
    excludeShown: "Gezeigte ausschließen",
    includeShown: "Gezeigte zulassen",
    showAll: "Alle {n} zeigen",
    showLess: "Weniger zeigen",
    areas: "Bereiche",
    noArea: "Ohne Bereich",
    labels: "Labels",
    sectionLabels: "Labels",
    f_label_ids: "Labels (ihre Leistungssensoren werden je Label zusammengefasst)",
    noLabelsDefined: "In Home Assistant gibt es noch keine Labels. Anlegen unter Einstellungen → Bereiche, Labels & Zonen.",
    labelSensors1: "1 Leistungssensor",
    labelSensorsN: "{n} Leistungssensoren",
    deviceCount1: "1 Gerät",
    deviceCountN: "{n} Geräte",
    f_device_exclude: "Ausgeschlossene Sensoren (nie durch ein Muster)",
    f_device_exclude_patterns: "Ausschluss-Muster (z. B. alpha_ess_*)",
    addExcludePattern: "z. B. alpha_ess_*",
    excludedByPattern: "Durch ein Ausschluss-Muster ausgeschlossen",
    noMatches: "Noch kein Leistungssensor passt",
  },
};

const esc = (t) =>
  String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// Settings form: [key, kind]. "multi" = several sensors, "single" = one sensor.
const SETTINGS_SECTIONS = [
  { title: "sectionGrid", fields: [["grid_power", "multi"], ["invert_grid", "bool"], ["grid_import", "single"], ["grid_export", "single"], ["house_power", "single"]] },
  { title: "sectionSolar", fields: [["solar_power", "multi"], ["battery_power", "multi"], ["invert_battery", "bool"], ["battery_discharge", "multi"], ["battery_charge", "multi"], ["battery_grid_charge", "single"]] },
  { title: "sectionDevices", fields: [["device_patterns", "text"], ["device_exclude_patterns", "text"], ["device_matches", "matches"], ["device_exclude", "multi"], ["device_power", "multi"]] },
  { title: "sectionAreas", fields: [["area_ids", "areas"]] },
  { title: "sectionLabels", fields: [["label_ids", "labels"]] },
];
const LIST_KEYS = ["grid_power", "grid_import", "grid_export", "solar_power", "battery_power", "battery_discharge", "battery_charge", "battery_grid_charge", "device_power", "device_patterns", "device_exclude", "device_exclude_patterns", "label_ids", "area_ids"];
// Sensors that are part of the energy balance and therefore never listed as devices.
// The two pick lists of the settings (labels and areas) share their code. Each has its own
// attribute names, element id and filter state.
const PICKERS = {
  label: { attr: "label", filter: "lfilter", seg: "lseg", list: "llist", state: ["_lFilter", "_lState", "_lSel"], key: "label_ids", icon: "mdi:label", noMatches: "noLabelMatches", nonePower: "noPowerLabels", empty: "noLabelsDefined", placeholder: "filterLabels" },
  area: { attr: "area", filter: "afilter", seg: "aseg", list: "alist", state: ["_aFilter", "_aState", "_aSel"], key: "area_ids", icon: "mdi:texture-box", noMatches: "noAreaMatches", nonePower: "noPowerAreas", empty: "noAreasDefined", placeholder: "filterAreas" },
};

// Power below this counts as idle and is only counted, not listed.
const IDLE_W = 5;
// Rows the lists show before they fold. They follow the shortest list, but within these bounds.
const MAX_ROWS = 8;
const MIN_ROWS = 5;
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

// Power is always shown in watts (also above 1000 W), whatever unit the sensors report.
const fmtPower = (w) => {
  if (w == null || Number.isNaN(w)) return ["–", ""];
  return [Math.round(w).toLocaleString(), "W"];
};

class EnergyAssistantPanel extends HTMLElement {
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
      this._config = await this._hass.callWS({ type: "energy_assistant/get_config" });
    } catch (e) {
      console.warn("Energy Assistant: could not load settings, using the registration copy", e);
      this._config = this._fallback || {};
    } finally {
      this._draft = this._normalize(this._config);
      this._ready = true;
      this._loadingCfg = false;
      this._settingsDirty = true;
      this._render();
      this._maybeLoadHistory();
      this._loadLabels();
      this._loadPv();
    }
  }

  /**
   * Optional link to the PV Assistant integration (weskona/pv-assistant): when it is installed, its
   * configuration tells which sensors measure the PV production and how they group into plants.
   * Without it, or when anything fails, nothing changes.
   */
  async _loadPv() {
    const present = Object.values(this._hass?.entities || {}).some((e) => e?.platform === "pv_assistant");
    if (!present || this._pvLoading) return;
    this._pvLoading = true;
    try {
      const res = await this._hass.callWS({ type: "pv_assistant/config" });
      this._pv = this._normalizePv(res);
    } catch (e) {
      console.info("Energy Assistant: PV Assistant is installed but its configuration is not available", e);
      this._pv = null;
    } finally {
      this._pvLoading = false;
      this._settingsDirty = true;
      this._render();
    }
  }

  /** Production sensors and plants of PV Assistant, in a small fixed shape (null if nothing usable). */
  _normalizePv(res) {
    const list = (v) => (typeof v === "string" ? [v] : Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);
    const sensors = list(res?.production_power_sensors);
    if (!sensors.length) return null;
    const cfg = res?.settings || {};
    const named = (id) => cfg.strings?.[id]?.name || this._hass?.states?.[id]?.attributes?.friendly_name || id;
    const plants = [];
    const taken = new Set();
    for (const inv of Array.isArray(cfg.inverters) ? cfg.inverters : []) {
      const ids = list(inv?.sensors).filter((id) => sensors.includes(id) && !taken.has(id));
      if (!ids.length) continue;
      ids.forEach((id) => taken.add(id));
      plants.push({ name: inv.name || named(ids[0]), sensors: ids });
    }
    for (const id of sensors) if (!taken.has(id)) plants.push({ name: named(id), sensors: [id] });
    // Storage like PV Assistant counts it: combined sensors are "+ = from the storage" (like here), inverted on
    // request. Separate in/out sensors may report negative values (abs_storage_power); Energy Assistant counts
    // the magnitude of those sensors anyway.
    const battery = {
      combined: list(res?.storage_combined_power_sensors),
      invert: !!res?.invert_storage_combined_power,
      charge: list(res?.storage_in_power_sensors),
      discharge: list(res?.storage_out_power_sensors),
      absolute: !!res?.abs_storage_power,
    };
    // Grid: the import sensors fit as they are. A feed-in sensor that reports feed-in as negative values is
    // a combined meter (import +, feed-in −): it goes into the combined grid field, and is not counted twice
    // when it is also one of the import sensors.
    const feedIn = list(res?.feed_in_power_sensor);
    const negative = !!res?.invert_feed_in_power && feedIn.length > 0;
    const grid = {
      import: list(res?.grid_import_power_sensors).filter((id) => !(negative && feedIn.includes(id))),
      export: negative ? [] : feedIn,
      combined: negative ? feedIn : [],
    };
    return { sensors, plants, battery, grid };
  }

  /** What "take over" puts into the settings form (only fields PV Assistant has an answer for). */
  _pvTargets() {
    const b = this._pv.battery;
    const t = { solar_power: [...this._pv.sensors] };
    if (b.combined.length) {
      t.battery_power = [...b.combined];
      t.invert_battery = b.invert;
    }
    const g = this._pv.grid;
    if (g.import.length) t.grid_import = [...g.import];
    if (g.export.length) t.grid_export = [...g.export];
    if (g.combined.length) {
      t.grid_power = [...g.combined];
      t.invert_grid = false;
    }
    if (b.charge.length) t.battery_charge = [...b.charge];
    if (b.discharge.length) t.battery_discharge = [...b.discharge];
    return t;
  }

  _pvApplied() {
    const same = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
    return Object.entries(this._pvTargets()).every(([k, v]) => (typeof v === "boolean" ? !!this._draft[k] === v : same(v, this._draftList(k))));
  }

  /** Labels of Home Assistant and the sensors that carry them (also refreshed on tab change). */
  async _loadLabels() {
    if (this._labelsLoading || !this._hass) return;
    this._labelsLoading = true;
    try {
      const res = await this._hass.callWS({ type: "energy_assistant/labels" });
      // Never let an incomplete answer break the settings form.
      this._labelData = { labels: Array.isArray(res?.labels) ? res.labels : [], entities: res?.entities || {} };
    } catch (e) {
      console.warn("Energy Assistant: could not load labels", e);
      this._labelData = this._labelData || { labels: [], entities: {} };
    } finally {
      this._labelsLoading = false;
      this._settingsDirty = true;
      this._render();
    }
  }

  /** Settings in the shape of the settings form: lists, booleans, house_power as string or null. */
  _normalize(cfg = {}) {
    const out = { house_power: cfg.house_power || null };
    for (const k of LIST_KEYS) out[k] = Array.isArray(cfg[k]) ? [...cfg[k]] : cfg[k] ? [cfg[k]] : [];
    for (const k of BOOL_KEYS) out[k] = !!cfg[k];
    out.device_names = { ...(cfg.device_names || {}) };
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
      this._config = await this._hass.callWS({ type: "energy_assistant/update_config", config: this._draft });
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

  /** Start renaming a sensor in the device list. The row turns into a text field. */
  _startRename(id) {
    if (!this._isAdmin) return;
    this._editName = id;
    const content = this.shadowRoot.getElementById("content");
    this._html = this._renderHouse();
    this._swapMarkup(content, this._html);
    const input = content.querySelector("input[data-rename-input]");
    input?.focus();
    input?.select();
  }

  _endRename() {
    this._editName = null;
    this._html = null;
    this._render();
  }

  /** Save the new name. An empty name or the original name resets it. Admins only. */
  async _commitRename(id, value) {
    if (this._editName !== id) return; // already saved or cancelled (blur after Enter or Escape)
    const before = { ...(this._cfg.device_names || {}) };
    const names = { ...before };
    const original = this._hass?.states?.[id]?.attributes?.friendly_name || id;
    const name = String(value).trim().slice(0, 80);
    if (!name || name === original) delete names[id];
    else names[id] = name;
    if (JSON.stringify(names) === JSON.stringify(before) || !this._isAdmin) {
      this._endRename();
      return;
    }
    // Show the new name at once, take it back if saving fails.
    this._config = { ...this._cfg, device_names: names };
    if (this._draft) this._draft.device_names = { ...names };
    this._endRename();
    try {
      const res = await this._hass.callWS({ type: "energy_assistant/update_config", config: { device_names: names } });
      this._config = res;
      if (this._draft) this._draft.device_names = { ...(res.device_names || {}) };
    } catch (e) {
      console.warn("Energy Assistant: could not save the name", e);
      this._config = { ...this._cfg, device_names: before };
      if (this._draft) this._draft.device_names = { ...before };
    }
    this._html = null;
    this._render();
  }

  _onClick(e) {
    const ren = e.target.closest("[data-rename]");
    if (ren) {
      this._startRename(ren.dataset.rename);
      return;
    }
    this._fieldError = {};
    const rm = e.target.closest("[data-remove]");
    const bulk = e.target.closest("[data-bulk]");
    const seg = e.target.closest("[data-seg]");
    const lseg = e.target.closest("[data-lseg]");
    const aseg = e.target.closest("[data-aseg]");
    if (lseg || aseg) {
      const kind = lseg ? "label" : "area";
      const P = PICKERS[kind];
      const [group, value] = (lseg || aseg).dataset[P.seg].split(":");
      this[P.state[group === "state" ? 1 : 2]] = value;
      this._edited();
    } else if (seg) {
      // View filters of the match list. They also decide what the bulk buttons act on.
      const [group, value] = seg.dataset.seg.split(":");
      if (group === "state") this._fState = value;
      else this._fSel = value;
      this._edited();
    } else if (e.target.closest("[data-pvapply]") && this._isAdmin && this._pv) {
      Object.assign(this._draft, this._pvTargets());
      this._edited();
    } else if (e.target.closest("[data-open]")) {
      // Click on an area or label row: show or hide the sensors it sums up.
      const key = e.target.closest("[data-open]").dataset.open;
      this._open = this._open || new Set();
      if (!this._open.delete(key)) this._open.add(key);
      this._render();
    } else if (e.target.closest("[data-devtoggle]")) {
      this._devExpanded = !this._devExpanded;
      this._render();
    } else if (e.target.closest("[data-areatoggle]")) {
      this._areaExpanded = !this._areaExpanded;
      this._render();
    } else if (e.target.closest("[data-labeltoggle]")) {
      this._labelExpanded = !this._labelExpanded;
      this._render();
    } else if (rm && this._isAdmin) {
      this._draftRemove(rm.dataset.remove, rm.dataset.id);
      this._edited();
    } else if (bulk && this._isAdmin) {
      // Applies to the sensors currently shown (respects the filter).
      const byPattern = compilePatterns(this._draft.device_exclude_patterns || []);
      const ids = this._matchList().shown.filter((id) => !byPattern(id));
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
    this._fieldError = {};
    if (t.dataset?.area) {
      const id = t.dataset.area;
      const rest = this._draft.area_ids.filter((x) => x !== id);
      this._draft.area_ids = t.checked ? [...rest, id] : rest;
      this._edited();
    } else if (t.dataset?.label) {
      const id = t.dataset.label;
      const rest = this._draft.label_ids.filter((x) => x !== id);
      this._draft.label_ids = t.checked ? [...rest, id] : rest;
      this._edited();
    } else if (t.dataset?.device) {
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
    for (const kind of ["label", "area"]) {
      const P = PICKERS[kind];
      if (e.target.dataset?.[P.filter] === undefined) continue;
      this[P.state[0]] = e.target.value.toLowerCase();
      const list = this.shadowRoot.getElementById(P.list);
      if (list) list.innerHTML = this._renderPickerRows(kind, !this._isAdmin);
      return;
    }
    if (e.target.dataset?.filter === undefined) return;
    this._filter = e.target.value.toLowerCase();
    const list = this.shadowRoot.getElementById("mlist");
    if (list) list.innerHTML = this._renderMatchRows(!this._isAdmin);
  }

  _edited(focusKey) {
    this._status = "";
    this._settingsDirty = true;
    // The form is redrawn as a whole. Keep the scroll position of the long lists so ticking a
    // checkbox does not throw the list back to its start.
    const scrolls = ["mlist", "llist", "alist"].map((id) => [id, this.shadowRoot.getElementById(id)?.scrollTop]);
    this._render();
    for (const [id, top] of scrolls) {
      const list = this.shadowRoot.getElementById(id);
      if (top && list) list.scrollTop = top;
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
    const excluded = new Set(this._draft.device_exclude);
    const byPattern = compilePatterns(this._draft.device_exclude_patterns || []);
    // Active = at least IDLE_W right now. Inactive also covers sensors without a value.
    const info = new Map(
      found.map((id) => {
        const w = this._watts(id);
        return [id, { active: w != null && w >= IDLE_W, excluded: excluded.has(id) || byPattern(id) }];
      }),
    );
    const count = (fn) => found.filter((id) => fn(info.get(id))).length;
    const counts = {
      all: found.length,
      active: count((i) => i.active),
      idle: count((i) => !i.active),
      included: count((i) => !i.excluded),
      excluded: count((i) => i.excluded),
    };
    const fState = this._fState || "all";
    const fSel = this._fSel || "all";
    const shown = found.filter((id) => {
      const i = info.get(id);
      if (fState === "active" && !i.active) return false;
      if (fState === "idle" && i.active) return false;
      if (fSel === "included" && i.excluded) return false;
      if (fSel === "excluded" && !i.excluded) return false;
      return !q || `${states[id]?.attributes?.friendly_name || ""} ${id}`.toLowerCase().includes(q);
    });
    return { found, shown, counts };
  }

  _renderMatchRows(ro) {
    const { shown } = this._matchList();
    const states = this._hass?.states || {};
    const excluded = new Set(this._draft.device_exclude);
    const byPattern = compilePatterns(this._draft.device_exclude_patterns || []);
    if (!shown.length) return `<div class="hint" style="padding:10px">${esc(this._t("noMatches"))}</div>`;
    return shown
      .map((id) => {
        const viaPattern = byPattern(id);
        const off = excluded.has(id) || viaPattern;
        const name = states[id]?.attributes?.friendly_name || id;
        const title = viaPattern ? `${id} – ${this._t("excludedByPattern")}` : id;
        return `<label class="mrow${off ? " ex" : ""}" title="${esc(title)}"><input type="checkbox" data-device="${esc(id)}" ${off ? "" : "checked"} ${ro || viaPattern ? "disabled" : ""}><span class="mt"><span class="mn">${esc(name)}</span><span class="mi">${esc(id)}</span></span></label>`;
      })
      .join("");
  }

  /** Items of a pick list: labels from the label list, areas from the areas of Home Assistant. */
  _pickerItems(kind) {
    if (kind === "label") {
      return this._labelData ? this._labelData.labels.map((l) => ({ id: l.label_id, name: l.name, icon: l.icon, color: l.color })) : null;
    }
    return Object.entries(this._hass?.areas || {})
      .map(([id, a]) => ({ id, name: a.name || id, icon: a.icon || null, color: null }))
      .sort((x, y) => x.name.localeCompare(y.name));
  }

  _pickerMembers(kind, id, cfg) {
    return kind === "label" ? this._labelMembers(id, cfg) : this._areaMembers(id, cfg);
  }

  /**
   * Entries of a pick list: only items that have power sensors (plus already selected ones, so they
   * can be unselected again), with the summed power of their sensors and the filters applied.
   */
  _picker(kind) {
    const P = PICKERS[kind];
    const [fFilter, fState, fSel] = P.state;
    const selected = new Set(this._draft[P.key]);
    const all = (this._pickerItems(kind) || [])
      .map((item) => {
        // Same count as the card: sensors of the energy balance and excluded sensors do not count.
        const members = this._pickerMembers(kind, item.id, this._draft);
        const w = members.reduce((a, id) => a + (this._watts(id) || 0), 0);
        return { item, n: members.length, w, selected: selected.has(item.id) };
      })
      .filter((x) => x.n > 0 || x.selected);
    const count = (fn) => all.filter(fn).length;
    const counts = {
      all: all.length,
      active: count((x) => x.w >= IDLE_W),
      idle: count((x) => x.w < IDLE_W),
      selected: count((x) => x.selected),
      unselected: count((x) => !x.selected),
    };
    const q = (this[fFilter] || "").trim();
    const stateFilter = this[fState] || "all";
    const selFilter = this[fSel] || "all";
    const shown = all.filter((x) => {
      if (stateFilter === "active" && x.w < IDLE_W) return false;
      if (stateFilter === "idle" && x.w >= IDLE_W) return false;
      if (selFilter === "selected" && !x.selected) return false;
      if (selFilter === "unselected" && x.selected) return false;
      return !q || `${x.item.name} ${x.item.id}`.toLowerCase().includes(q);
    });
    return { all, shown, counts };
  }

  _renderPickerRows(kind, ro) {
    const P = PICKERS[kind];
    const { shown } = this._picker(kind);
    if (!shown.length) return `<div class="hint" style="padding:10px">${esc(this._t(P.noMatches))}</div>`;
    return shown
      .map(({ item: l, n, w, selected }) => {
        const icon = this._iconHtml(l.icon || P.icon, l.color);
        const sub = this._t(n === 1 ? "labelSensors1" : "labelSensorsN", { n }) + (w >= IDLE_W ? ` · ${fmtPower(w).join(" ")}` : "");
        return `<label class="mrow"><input type="checkbox" data-${P.attr}="${esc(l.id)}" ${selected ? "checked" : ""} ${ro ? "disabled" : ""}><span class="mt"><span class="mn">${icon}<span class="nt">${esc(l.name)}</span></span><span class="mi">${esc(sub)}</span></span></label>`;
      })
      .join("");
  }

  /** Checkbox list with filters of the labels or areas that exist in Home Assistant. */
  _renderPicker(kind, ro) {
    const P = PICKERS[kind];
    const [fFilter, fState, fSel] = P.state;
    if (kind === "label" && !this._labelData) return `<div class="hint">${esc(this._t("loading"))}</div>`;
    if (!(this._pickerItems(kind) || []).length) return `<div class="hint">${esc(this._t(P.empty))}</div>`;
    const { all, counts } = this._picker(kind);
    if (!all.length) return `<div class="hint">${esc(this._t(P.nonePower))}</div>`;
    const seg = (group, value, key, tipKey) => {
      const on = (group === "state" ? this[fState] || "all" : this[fSel] || "all") === value;
      return `<button type="button" class="seg${on ? " on" : ""}" data-${P.seg}="${group}:${value}"${tipKey ? ` title="${esc(this._t(tipKey))}"` : ""}>${esc(this._t(key))} <small>${counts[value]}</small></button>`;
    };
    return `<div class="mbar"><input type="text" data-${P.filter} value="${esc(this[fFilter] || "")}" placeholder="${esc(this._t(P.placeholder))}" autocomplete="off" style="flex:1 1 160px;width:auto"></div>
      <div class="segs"><span class="seglab">${esc(this._t("filterGroupState"))}</span>${seg("state", "all", "filterAll")}${seg("state", "active", "filterActive", "filterActiveTip")}${seg("state", "idle", "filterIdle", "filterIdleTip")}<span class="sep"></span><span class="seglab">${esc(this._t("filterGroupSel"))}</span>${seg("sel", "all", "filterAll")}${seg("sel", "selected", "filterSelected")}${seg("sel", "unselected", "filterUnselected")}</div>
      <div class="mlist" id="${P.list}">${this._renderPickerRows(kind, ro)}</div>`;
  }

  _labelPicker() { return this._picker("label"); }
  _renderLabelRows(ro) { return this._renderPickerRows("label", ro); }
  _renderLabelPicker(ro) { return this._renderPicker("label", ro); }

  _renderMatches(ro) {
    const { found, counts } = this._matchList();
    if (!found.length) return `<div class="hint">${esc(this._t("noMatches"))}</div>`;
    const seg = (group, value, key, tipKey) => {
      const on = (group === "state" ? this._fState || "all" : this._fSel || "all") === value;
      return `<button type="button" class="seg${on ? " on" : ""}" data-seg="${group}:${value}"${tipKey ? ` title="${esc(this._t(tipKey))}"` : ""}>${esc(this._t(key))} <small>${counts[value]}</small></button>`;
    };
    const excluded = new Set(this._draft.device_exclude);
    const byPattern = compilePatterns(this._draft.device_exclude_patterns || []);
    const x = found.filter((id) => excluded.has(id) || byPattern(id)).length;
    return `<div class="hint" id="mcount">${esc(this._t("matchesCount", { n: found.length, x }))}</div>
      <div class="mbar"><input type="text" data-filter value="${esc(this._filter || "")}" placeholder="${esc(this._t("filterMatches"))}" autocomplete="off" style="flex:1 1 160px;width:auto">
      ${ro ? "" : `<button class="btn ghost" data-bulk="exclude">${esc(this._t("excludeShown"))}</button><button class="btn ghost" data-bulk="include">${esc(this._t("includeShown"))}</button>`}</div>
      <div class="segs"><span class="seglab">${esc(this._t("filterGroupState"))}</span>${seg("state", "all", "filterAll")}${seg("state", "active", "filterActive", "filterActiveTip")}${seg("state", "idle", "filterIdle", "filterIdleTip")}<span class="sep"></span><span class="seglab">${esc(this._t("filterGroupSel"))}</span>${seg("sel", "all", "filterAll")}${seg("sel", "included", "filterIncluded")}${seg("sel", "excluded", "filterExcluded")}</div>
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
      if (kind === "areas") return `<div class="fld span"><label>${esc(label)}</label>${this._renderPicker("area", ro)}${this._draft.area_ids.length ? "" : `<div class="hint">${esc(this._t("areaAutoHint"))}</div>`}</div>`;
      if (kind === "labels") return `<div class="fld span"><label>${esc(label)}</label>${this._renderLabelPicker(ro)}</div>`;
      if (kind === "matches") return this._draft.device_patterns.length ? `<div class="fld span">${this._renderMatches(ro)}</div>` : "";
      const err = this._fieldError?.[key] ? `<div class="ferr">${esc(this._fieldError[key])}</div>` : "";
      return `<div class="fld"><label>${esc(label)}</label>
        ${chips ? `<div class="chips">${chips}</div>` : ""}
        ${ro ? "" : `<input type="text" data-add="${key}" data-mode="${kind}" ${kind === "text" ? "" : 'list="eb-sensors"'} placeholder="${esc(this._t(kind === "text" ? (key === "device_exclude_patterns" ? "addExcludePattern" : "addPattern") : "addSensor"))}" autocomplete="off">`}${err}</div>`;
    };
    const sections = SETTINGS_SECTIONS.map(
      (sec) => `<div class="eb-card sec${["sectionDevices", "sectionAreas", "sectionLabels"].includes(sec.title) ? " wide" : ""}"><div class="eb-title">${this._t(sec.title)}</div><div class="fields">${sec.fields.map(field).join("")}</div></div>`,
    ).join("");
    const dirty = this._isDirty();
    let msg = "";
    if (ro) msg = `<span class="msg err">${this._t("adminOnly")}</span>`;
    else if (!this._hasSource()) msg = `<span class="msg err">${this._t("noSource")}</span>`;
    else if (this._status === "saving") msg = `<span class="msg">${this._t("saving")}</span>`;
    else if (this._status === "saved") msg = `<span class="msg">${this._t("saved")}</span>`;
    else if (this._status === "error") msg = `<span class="msg err">${esc(this._t("saveFailed", { error: this._error }))}</span>`;
    return `<datalist id="eb-sensors">${options}</datalist>
      <div class="set">${this._renderPvNotice(ro)}<div class="grid">${sections}</div>
      ${ro ? `<div class="bar2">${msg}</div>` : `<div class="bar2">
        <button class="btn" data-save ${this._saveDisabled() ? "disabled" : ""}>${this._t("save")}</button>
        <button class="btn ghost" data-discard ${dirty ? "" : "disabled"}>${this._t("discard")}</button>${msg}</div>`}</div>`;
  }

  /** Notice at the top of the settings: PV Assistant is installed, take over its sensors? */
  _renderPvNotice(ro) {
    if (!this._pv) return "";
    const b = this._pv.battery;
    const parts = [];
    if (b.combined.length) parts.push(this._t("pvCombined", { n: b.combined.length }));
    if (b.charge.length) parts.push(this._t("pvCharge", { n: b.charge.length }));
    if (b.discharge.length) parts.push(this._t("pvDischarge", { n: b.discharge.length }));
    const g = this._pv.grid;
    const gridParts = [];
    if (g.import.length) gridParts.push(this._t("pvImport", { n: g.import.length }));
    if (g.export.length) gridParts.push(this._t("pvExport", { n: g.export.length }));
    if (g.combined.length) gridParts.push(this._t("pvCombined", { n: g.combined.length }));
    const lines = [
      this._t("pvSolar", { n: this._pv.sensors.length }),
      parts.length ? this._t("pvStorage", { parts: parts.join(", ") }) : "",
      gridParts.length ? this._t("pvGrid", { parts: gridParts.join(", ") }) : "",
    ].filter(Boolean);
    const done = this._pvApplied();
    return `<div class="eb-card pvnote"><div class="eb-title">${esc(this._t("pvTitle"))}</div>
      <p class="pvq">${esc(done ? this._t("pvDone") : this._t("pvAsk"))}</p>
      <ul>${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
      ${g.combined.length ? `<div class="hint">${esc(this._t("pvFeedInfo"))}</div>` : ""}
      ${b.absolute && (b.charge.length || b.discharge.length) ? `<div class="hint">${esc(this._t("pvAbsInfo"))}</div>` : ""}
      ${done || ro ? "" : `<div class="bar2"><button type="button" class="btn" data-pvapply>${esc(this._t("pvApply"))}</button><span class="hint">${esc(this._t("pvOverwrite"))}</span></div>`}
    </div>`;
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

  /** Sum of the magnitudes: separate charging/discharging sensors may report their direction as negative values. */
  _sumAbs(ids) {
    const vals = (ids || []).map((id) => this._watts(id)).filter((v) => v != null);
    return vals.length ? vals.reduce((a, b) => a + Math.abs(b), 0) : null;
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
      discharge: this._sumAbs(c.battery_discharge),
      charge: this._sumAbs(c.battery_charge),
      gridCharge: this._sum(c.battery_grid_charge),
      grid: this._signed(c.grid_power, c.invert_grid),
      battery: this._signed(c.battery_power, c.invert_battery),
    });
    const house = c.house_power ? this._watts(c.house_power) : this._calcHouse(parts);
    return { house, direct: this._calcDirect(parts, house), ...parts };
  }
  /** Individual devices with their current power in W, highest first. */
  /** Display name of a sensor in the lists: the own name if one is set, else the friendly name. */
  _deviceName(id) {
    return this._cfg.device_names?.[id] || this._hass?.states?.[id]?.attributes?.friendly_name || id;
  }

  _devices() {
    const explicit = this._cfg.device_power || [];
    const ids = [...new Set([...explicit, ...this._discoverDevices(this._cfg.device_patterns, this._cfg)])];
    return ids
      .map((id) => ({
        id,
        name: this._deviceName(id),
        original: this._hass?.states?.[id]?.attributes?.friendly_name || id,
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
    const excluded = this._excluder(cfg, ignoreExclude);
    const matches = compilePatterns(patterns);
    return this._powerSensors()
      .filter((id) => !excluded(id) && matches(id))
      .sort();
  }

  /** All `sensor` entities with device_class power. */
  _powerSensors() {
    return Object.entries(this._hass?.states || {})
      .filter(([id, st]) => id.startsWith("sensor.") && st.attributes?.device_class === "power")
      .map(([id]) => id);
  }

  /**
   * Predicate for sensors that never count as device, area or label member: the sensors of the
   * energy balance (grid, solar, storage, house) and, unless ignored, the exclude list and patterns.
   */
  _excluder(cfg, ignoreExclude = false) {
    const skip = new Set([
      ...SYSTEM_KEYS.flatMap((k) => (Array.isArray(cfg[k]) ? cfg[k] : cfg[k] ? [cfg[k]] : [])),
      ...(ignoreExclude ? [] : cfg.device_exclude || []),
    ]);
    const byPattern = ignoreExclude ? () => false : compilePatterns(cfg.device_exclude_patterns || []);
    return (id) => skip.has(id) || byPattern(id);
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
      console.warn("Energy Assistant: could not load history", e);
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
    const group = (ids, invert = false, magnitude = false) => {
      const list = (ids || []).map(sample).filter(Boolean);
      if (!list.length) return null;
      return Array.from({ length: n + 1 }, (_, k) => {
        const v = list.map((l) => l[k]).filter((x) => x != null).map((x) => (magnitude ? Math.abs(x) : x));
        return v.length ? (invert ? -1 : 1) * v.reduce((a, b) => a + b, 0) : null;
      });
    };
    const house = c.house_power ? sample(c.house_power) : null;
    const g = {
      solar: group(c.solar_power), gridIn: group(c.grid_import), gridOut: group(c.grid_export),
      discharge: group(c.battery_discharge, false, true), charge: group(c.battery_charge, false, true),
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
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${this._t("chartLabel")}">
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
    const limit = this._collapsedLimit();
    const areas = this._renderAreas(cur.house, limit);
    const labels = this._renderLabels(cur.house, limit);
    const devices = this._renderDevices(cur.house, limit);
    // Devices, areas and labels share one row, in this order. Missing cards leave more room for the others.
    const lists = `${devices}${areas}${labels}`;
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
        ${this._renderPvPlants(cur.house)}
      </div>
      <div class="eb-card">
        <div class="row"><span class="eb-title">${this._t("history")}</span><span class="eb-label">24 h</span></div>
        ${hist}
      </div>
      ${lists ? `<div class="trio">${lists}</div>` : ""}</div>`;
  }

  /**
   * PV by plant (from PV Assistant): one row that opens to the plants with their power. Only shown
   * when there are at least two plants; otherwise the solar tile already says everything.
   */
  _renderPvPlants(house) {
    const plants = (this._pv?.plants || [])
      .map((p) => ({ name: p.name, w: this._sum(p.sensors) }))
      .filter((p) => p.w != null);
    if (plants.length < 2) return "";
    const total = plants.reduce((a, p) => a + Math.max(0, p.w), 0);
    const isOpen = this._open?.has("pv:plants");
    const [tv, tu] = fmtPower(total);
    const subs = isOpen
      ? `<div class="subs">${[...plants].sort((a, b) => b.w - a.w).map((p) => {
        const [v, u] = fmtPower(p.w);
        return `<div class="s${p.w < IDLE_W ? " idle" : ""}"><span class="sn" title="${esc(p.name)}">${esc(p.name)}</span><b>${v} ${u}</b></div>`;
      }).join("")}</div>`
      : "";
    return `<div class="dev pvdev"><div class="line open" data-open="pv:plants" role="button" tabindex="0" aria-expanded="${isOpen ? "true" : "false"}">
      <span class="name"><span class="chev${isOpen ? " on" : ""}" aria-hidden="true">▶</span><span class="nt">${esc(this._t("pvPlants"))}</span> <small class="cnt">${plants.length}</small></span>
      <span class="val">${tv}<small>${tu}</small></span></div>${subs}</div>`;
  }

  /** Card with the power of individual devices. Empty string if none are configured. */
  /**
   * Rows the lists show before they fold: as many as the shortest list has, so devices, areas and
   * labels end at about the same height. At least MIN_ROWS and at most MAX_ROWS. The rest can be
   * unfolded per list.
   */
  _collapsedLimit() {
    const counts = [];
    if ((this._cfg.device_power || []).length || (this._cfg.device_patterns || []).length) {
      counts.push(this._devices().filter((d) => d.w >= IDLE_W).length);
    }
    const areas = this._areas();
    if (areas.length) counts.push(areas.filter((g) => g.w >= IDLE_W).length);
    const labels = this._labelGroups();
    if (labels.length) counts.push(labels.filter((g) => g.w >= IDLE_W).length);
    const smallest = counts.length ? Math.min(...counts) : MAX_ROWS;
    return Math.max(MIN_ROWS, Math.min(MAX_ROWS, smallest));
  }

  _renderDevices(house, limit = MAX_ROWS) {
    if (!(this._cfg.device_power || []).length && !(this._cfg.device_patterns || []).length) return "";
    const all = this._devices();
    // Admins can rename the sensors right in the list (pencil next to the name).
    const active = all.filter((d) => d.w >= IDLE_W).map((d) => ({ ...d, editable: this._isAdmin }));
    const sum = all.reduce((a, d) => a + d.w, 0);
    const other = house != null && house - sum >= IDLE_W ? { name: this._t("otherDevices"), w: house - sum, other: true } : null;
    // The total in the header includes the unmeasured rest, so it equals the house power.
    return this._listCard({
      title: this._t("devices"), rows: active, idle: all.length - active.length, sum: sum + (other ? other.w : 0), other, house,
      expanded: this._devExpanded, toggle: "data-devtoggle", limit,
    });
  }

  /**
   * Home Assistant icon (mdi:...) in front of a name, tinted with the label color if there is one.
   * Without the <ha-icon> element (or a valid icon) the colored dot is used, else nothing.
   */
  _iconHtml(icon, color) {
    const safeColor = color && /^[a-z-]+$/.test(color) ? color : "";
    if (icon && /^[a-z0-9-]+:[a-z0-9-]+$/i.test(icon) && globalThis.customElements?.get?.("ha-icon")) {
      const tint = safeColor ? ` style="color:var(--${safeColor}-color, var(--eb-muted))"` : "";
      return `<ha-icon class="ico" icon="${esc(icon)}"${tint}></ha-icon>`;
    }
    return safeColor ? `<i class="dot" style="background:var(--${safeColor}-color, var(--eb-green))"></i>` : "";
  }

  /** Area of an entity: its own area, otherwise the area of its device. null if none. */
  _areaOf(entityId) {
    const ent = this._hass?.entities?.[entityId];
    const areaId = ent?.area_id || (ent?.device_id && this._hass?.devices?.[ent.device_id]?.area_id);
    const area = areaId && this._hass?.areas?.[areaId];
    return areaId ? { id: areaId, name: area?.name || areaId, icon: area?.icon || null } : null;
  }

  /**
   * Power sensors in an area (own area or the area of the device). Like for the labels no name
   * pattern is needed. The sensors of the energy balance and excluded sensors do not count.
   */
  _areaMembers(areaId, cfg = this._cfg) {
    const excluded = this._excluder(cfg);
    return this._powerSensors()
      .filter((id) => !excluded(id) && this._areaOf(id)?.id === areaId)
      .sort();
  }

  /** Power sensors without any area, for the "No area" row of the automatic view. */
  _noAreaMembers(cfg = this._cfg) {
    const excluded = this._excluder(cfg);
    return this._powerSensors().filter((id) => !excluded(id) && !this._areaOf(id)).sort();
  }

  /**
   * Rows of the Areas card. With areas selected only those are shown (even without sensors, they
   * count as idle). Without a selection all areas that have power sensors are shown, plus "No area".
   * Empty if there is nothing to group (e.g. no sensor belongs to an area).
   */
  _areas() {
    const selected = this._cfg.area_ids || [];
    const known = this._hass?.areas || {};
    const group = (key, name, icon, ids, none = false) => {
      const members = ids.map((id) => ({ name: this._deviceName(id), w: this._watts(id) })).filter((m) => m.w != null);
      const n = members.length;
      return {
        name, icon, none, n, key: `area:${key}`, members,
        w: members.reduce((a, m) => a + m.w, 0),
        sub: this._t(n === 1 ? "labelSensors1" : "labelSensorsN", { n }),
        tip: members.slice(0, 12).map((m) => `${m.name} ${fmtPower(m.w).join(" ")}`).join(", ") + (n > 12 ? " …" : ""),
      };
    };
    const areaGroup = (id) => group(id, known[id].name || id, known[id].icon || "mdi:texture-box", this._areaMembers(id));
    if (selected.length) return selected.filter((id) => known[id]).map(areaGroup);
    const groups = Object.keys(known).map(areaGroup).filter((g) => g.n > 0);
    // Without any area assigned the list would only repeat the device list.
    if (!groups.length) return [];
    const none = this._noAreaMembers();
    return none.length ? [...groups, group("none", this._t("noArea"), "mdi:help-circle-outline", none, true)] : groups;
  }

  _renderAreas(house, limit = MAX_ROWS) {
    const all = this._areas();
    if (!all.length) return "";
    const active = all.filter((g) => g.w >= IDLE_W);
    const sum = all.reduce((a, g) => a + g.w, 0);
    // Without a selection the card covers the whole house, so the rest is shown as well and the total
    // equals the house power. With a selection it is only a part of the house: no rest row.
    const everything = !(this._cfg.area_ids || []).length;
    const other = everything && house != null && house - sum >= IDLE_W ? { name: this._t("otherDevices"), w: house - sum, other: true } : null;
    return this._listCard({
      title: this._t("areas"), rows: active, idle: all.length - active.length, sum: sum + (other ? other.w : 0), other, house,
      expanded: this._areaExpanded, toggle: "data-areatoggle", limit,
    });
  }

  /**
   * Power sensors that carry a label. Like for the devices, the sensors of the energy balance and
   * excluded sensors do not count. Unlike the devices no name pattern is needed: the label decides.
   */
  _labelMembers(labelId, cfg = this._cfg) {
    const excluded = this._excluder(cfg);
    const power = new Set(this._powerSensors());
    return Object.entries(this._labelData?.entities || {})
      .filter(([id, labels]) => labels.includes(labelId) && power.has(id) && !excluded(id))
      .map(([id]) => id)
      .sort();
  }

  /** The selected labels, each with the summed power of its sensors. */
  _labelGroups() {
    const byId = Object.fromEntries((this._labelData?.labels || []).map((l) => [l.label_id, l]));
    return (this._cfg.label_ids || [])
      .filter((id) => byId[id])
      .map((id) => {
        const members = this._labelMembers(id).map((sid) => ({
          name: this._deviceName(sid),
          w: this._watts(sid),
        })).filter((m) => m.w != null);
        const n = members.length;
        return {
          name: byId[id].name,
          color: byId[id].color,
          icon: byId[id].icon || "mdi:label",
          w: members.reduce((a, m) => a + m.w, 0),
          n,
          key: `label:${id}`,
          members,
          sub: this._t(n === 1 ? "labelSensors1" : "labelSensorsN", { n }),
          tip: members.slice(0, 12).map((m) => `${m.name} ${fmtPower(m.w).join(" ")}`).join(", ") + (n > 12 ? " …" : ""),
        };
      });
  }

  _renderLabels(house, limit = MAX_ROWS) {
    const all = this._labelGroups();
    if (!all.length) return "";
    const active = all.filter((g) => g.w >= IDLE_W);
    const sum = all.reduce((a, g) => a + g.w, 0);
    return this._listCard({
      title: this._t("labels"), rows: active, idle: all.length - active.length, sum, other: null, house,
      expanded: this._labelExpanded, toggle: "data-labeltoggle", limit,
    });
  }

  /** Card with a ranked list of rows with value, share of the house power and a bar. */
  _listCard({ title, rows, idle, sum, other, house, expanded, toggle, limit = MAX_ROWS }) {
    // Strongest first (rows without a group such as "No area" go last). Only the top ones show by default.
    const active = [...rows].sort((a, b) => (a.none ? 1 : b.none ? -1 : b.w - a.w));
    const folded = active.length > limit;
    const shown = folded && !expanded ? active.slice(0, limit) : active;
    const list = other ? [...shown, other] : shown;
    const scale = Math.max(1, house ?? 0, ...list.map((d) => d.w));
    const [tv, tu] = fmtPower(sum);
    const html = list
      .map((d) => {
        const [v, u] = fmtPower(d.w);
        // Share of the house power, only known when the house power is known.
        const share = house > 0 ? Math.round((d.w / house) * 100) : null;
        const renamed = d.original && d.original !== d.name;
        const tip = [share != null ? this._t("share", { pct: share }) : "", d.tip || "", renamed ? this._t("originalName", { name: d.original }) : ""].filter(Boolean).join(" · ");
        const editing = d.id && d.editable && this._editName === d.id;
        const pencil = globalThis.customElements?.get?.("ha-icon") ? `<ha-icon icon="mdi:pencil"></ha-icon>` : "✎";
        const nameHtml = editing
          ? `<input class="rename" type="text" data-rename-input="${esc(d.id)}" value="${esc(renamed ? d.name : "")}" placeholder="${esc(d.original)}" maxlength="80" aria-label="${esc(this._t("rename"))}">`
          : `<span class="nt">${esc(d.name)}</span>${d.sub ? ` <small class="cnt">${esc(d.sub)}</small>` : ""}${d.id && d.editable ? `<button type="button" class="edit" data-rename="${esc(d.id)}" title="${esc(this._t("rename"))}" aria-label="${esc(this._t("rename"))}">${pencil}</button>` : ""}`;
        const expandable = d.key && d.members?.length;
        const isOpen = expandable && this._open?.has(d.key);
        const chev = expandable ? `<span class="chev${isOpen ? " on" : ""}" aria-hidden="true">▶</span>` : "";
        const openAttr = expandable ? ` data-open="${esc(d.key)}" role="button" tabindex="0" aria-expanded="${isOpen ? "true" : "false"}"` : "";
        const subs = isOpen
          ? `<div class="subs">${[...d.members].sort((a, b) => b.w - a.w).map((m) => {
            const [mv, mu] = fmtPower(m.w);
            return `<div class="s${m.w < IDLE_W ? " idle" : ""}"><span class="sn" title="${esc(m.name)}">${esc(m.name)}</span><b>${mv} ${mu}</b></div>`;
          }).join("")}</div>`
          : "";
        return `<div class="dev"><div class="line${expandable ? " open" : ""}"${openAttr}><span class="name" title="${esc(tip)}">${chev}${this._iconHtml(d.icon, d.color)}${nameHtml}</span>
          <span class="val">${v}<small>${u}</small>${share != null ? `<small class="pct">${share} %</small>` : ""}</span></div>
          <div class="track"><div class="fill${d.other ? " other" : ""}" style="width:${Math.min(100, (d.w / scale) * 100)}%"></div></div>${subs}</div>`;
      })
      .join("");
    return `<div class="eb-card">
      <div class="row"><span class="eb-title">${title}</span><span class="eb-label">${tv} ${tu}</span></div>
      <div class="devgrid${expanded ? " devlist" : ""}">${html || `<div class="empty">–</div>`}</div>
      ${folded ? `<button class="linkbtn" ${toggle}>${expanded ? this._t("showLess") : this._t("showAll", { n: active.length })}</button>` : ""}
      ${idle > 0 ? `<div class="note">${this._t("idleDevices", { n: idle })}</div>` : ""}
    </div>`;
  }

  _render() {
    if (!this.shadowRoot) return;
    if (!this._built) {
      this.shadowRoot.innerHTML = `<style>${STYLE}</style>
        <link rel="stylesheet" href="${BASE}/energy-assistant-tokens.css">
        <div class="wrap">
          <div class="top">
            <div class="left"><button class="menu" aria-label="Menu" hidden>☰</button></div>
            <div class="tabs"><button class="tab active" data-tab="house">Power</button></div>
            <div class="right"><button class="gear" data-tab="settings" aria-label="Settings" title="Settings"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button></div>
          </div>
          <div id="content"></div></div>`;
      this.shadowRoot.querySelector(".menu").addEventListener("click", () =>
        this.dispatchEvent(new CustomEvent("hass-toggle-menu", { bubbles: true, composed: true })));
      const content = this.shadowRoot.getElementById("content");
      content.addEventListener("click", (e) => this._onClick(e));
      content.addEventListener("change", (e) => this._onChange(e));
      content.addEventListener("input", (e) => this._onInput(e));
      content.addEventListener("keydown", (e) => {
        const row = e.target.closest?.("[data-open]");
        if (row && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          row.click();
          return;
        }
        const input = e.target.closest?.("[data-rename-input]");
        if (!input) return;
        if (e.key === "Enter") {
          e.preventDefault();
          this._commitRename(input.dataset.renameInput, input.value);
        } else if (e.key === "Escape") {
          e.preventDefault();
          this._endRename();
        }
      });
      content.addEventListener("focusout", (e) => {
        const input = e.target.closest?.("[data-rename-input]");
        if (input) this._commitRename(input.dataset.renameInput, input.value);
      });
      this.shadowRoot.querySelector(".top").addEventListener("click", (e) => {
        let tab = e.target.closest("[data-tab]")?.dataset.tab;
        // The gear toggles: a second click on it leads back to the house tab.
        if (tab === "settings" && this._tab === "settings") tab = "house";
        if (tab && tab !== this._tab) {
          this._tab = tab;
          this._editName = null;
          this._html = null;
          this._settingsDirty = true;
          this._render();
          this._loadLabels();
        }
      });
      this._built = true;
    }
    this.shadowRoot.querySelector(".menu").hidden = !this._narrow;
    this.shadowRoot.querySelector(".menu").setAttribute("aria-label", this._t("menu"));
    for (const tab of this.shadowRoot.querySelectorAll(".tab")) {
      // The first tab shows the power overview. Its card inside is still titled "House".
      tab.textContent = this._t(tab.dataset.tab === "house" ? "tabPower" : tab.dataset.tab);
      tab.classList.toggle("active", tab.dataset.tab === this._tab);
    }
    const gear = this.shadowRoot.querySelector(".gear");
    gear.setAttribute("aria-label", this._t("settings"));
    gear.setAttribute("title", this._t("settings"));
    gear.classList.toggle("active", this._tab === "settings");
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
    // While a name is being typed the page is not redrawn, live updates would wipe the text field.
    if (this._editName) return;
    // Only redraw when the content changes (avoids flicker).
    const html = this._renderHouse();
    if (html !== this._html) {
      this._html = html;
      this._swapMarkup(content, html);
    }
  }

  /**
   * Replace the markup of the page. Home Assistant sends new values all the time, so this happens
   * often. The scroll position of the expanded lists is kept, otherwise they jump back to the top.
   */
  _swapMarkup(content, html) {
    // Keyed by the title of the card, so the positions stay with their list when lists come and go.
    const key = (el) => el.closest(".eb-card")?.querySelector(".eb-title")?.textContent;
    const tops = new Map([...content.querySelectorAll(".devlist")].map((el) => [key(el), el.scrollTop]));
    content.innerHTML = html;
    for (const el of content.querySelectorAll(".devlist")) {
      const top = tops.get(key(el));
      if (top) el.scrollTop = top;
    }
  }
}

customElements.define("energy-assistant-panel", EnergyAssistantPanel);
