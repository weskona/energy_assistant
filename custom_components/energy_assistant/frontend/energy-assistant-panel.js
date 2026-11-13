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
.eb-label.costs{margin-top:18px}
.fullrow{grid-column:1/-1}
.socbar{position:relative;height:12px;border-radius:6px;background:var(--eb-line);margin:14px 0 4px;overflow:visible}
.socbar i{display:block;height:100%;border-radius:6px;background:var(--eb-dim);transition:width .6s}
.socbar.charging i{background:var(--ea-bin)}
.socbar.discharging i{background:var(--ea-bout)}
.socbar b{position:absolute;top:-3px;width:2px;height:18px;background:var(--eb-text);opacity:.6;border-radius:1px}
.spk{display:inline-block;vertical-align:middle;margin-right:10px;overflow:visible}
.spk .spkline{fill:none;stroke:var(--eb-green);stroke-width:1.5;stroke-linejoin:round;vector-effect:non-scaling-stroke}
.spk .spkarea{fill:var(--eb-green);opacity:.15}
.spk.big{display:block;margin:6px 0 4px;width:100%;height:56px}
.dev .line.open .nt{border-bottom:1px dotted var(--eb-dim)}
.bpick{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px}
.bpick .segs{margin-top:0}
.bpick .nav{display:flex;align-items:center;gap:8px;margin-left:auto}
.bpick .lab{min-width:11em;text-align:center;font-weight:600;font-size:14px}
.seg[disabled]{opacity:.4;cursor:default}
.row[data-collapse-toggle]{cursor:pointer;user-select:none}
.row[data-collapse-toggle] .eb-title::before{content:"▾";display:inline-block;margin-right:8px;color:var(--eb-dim);font-size:11px;transition:transform .2s}
.eb-card.collapsed .row[data-collapse-toggle] .eb-title::before{transform:rotate(-90deg)}
.eb-card.collapsed > *:not(.row){display:none}
.stack{display:grid;gap:var(--eb-gap)}
.pair{display:grid;gap:var(--eb-gap);grid-template-columns:repeat(2,minmax(0,1fr))}
@media (max-width:800px){.pair{grid-template-columns:minmax(0,1fr)}}
.amo-bar{height:6px;border-radius:3px;background:var(--eb-line);margin-top:8px;overflow:hidden}
.amo-bar>div{height:100%;border-radius:3px;background:var(--eb-green)}
.alert.info{border-color:var(--eb-green);background:rgba(52,211,153,.12)}
.alert{margin-top:12px;padding:10px 14px;border-radius:12px;border:1px solid #f59e0b;background:rgba(245,158,11,.12);color:var(--eb-text);font-size:14px}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-top:16px}
.legend{display:flex;gap:14px;flex-wrap:wrap;margin-top:10px;font-size:12.5px;color:var(--eb-muted)}
.legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px}
.bar{margin-top:16px}
.bar>div{transition:width .6s}
svg.hsvg{display:block;max-width:100%;touch-action:pan-y}
.hchart{margin-top:12px}
.hchart .legend{margin:0 0 8px}
.hchart .legend i{border-radius:50%;width:9px;height:9px}
.chartwrap{position:relative}
svg .hgrid{stroke:var(--eb-line);stroke-width:1}
svg .haxis{stroke:var(--eb-dim);stroke-width:1;opacity:.7}
svg .htick,svg .hend{fill:var(--eb-muted);font-size:11px}
svg .hair{stroke:var(--eb-muted);stroke-width:1;stroke-dasharray:3 3}
svg .hdot{stroke:var(--eb-panel);stroke-width:2}
.tip{position:absolute;pointer-events:none;z-index:2;background:var(--eb-panel);border:1px solid var(--eb-tile-border);border-radius:10px;padding:8px 10px;font-size:12.5px;box-shadow:0 6px 18px rgba(0,0,0,.4);white-space:nowrap}
.tip[hidden]{display:none}
.tip .tt{color:var(--eb-muted);margin-bottom:4px}
.tip .tr{display:flex;align-items:center;gap:8px}
.tip .tr b{font-weight:600;color:var(--eb-text)}
.tip .tr span{color:var(--eb-muted)}
.tip .tr i{width:9px;height:9px;border-radius:50%;display:inline-block}
.tip .ts{display:flex;gap:8px;padding-left:19px;font-size:11.5px;color:var(--eb-muted)}
.tip .ts span:first-child{min-width:4.5em;text-align:right}
.tip .ts b{margin-left:4px;color:var(--eb-text);font-weight:600}
details.tableview{margin-top:8px;font-size:12.5px;color:var(--eb-muted)}
details.tableview summary{cursor:pointer}
details.tableview table{border-collapse:collapse;margin-top:6px;width:100%}
details.tableview th,details.tableview td{text-align:right;padding:3px 8px;border-top:1px solid var(--eb-line)}
details.tableview th:first-child{text-align:left;font-weight:400}
:host{--ea-prod:#ff9800;--ea-feed:#8353d1;--ea-bout:#4db6ac;--ea-bin:#f06292;--ea-direct:#ffd700;--ea-grid:#488fc2;--ea-house:#cfd8dc}
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
.pvnote ul.ints{margin:10px 0 0;padding-left:20px;color:var(--eb-muted);font-size:14px}
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
    uTodayKwh: "{kwh} kWh today",
    uFactEnergy: "Energy",
    uFactCost: "Cost",
    uFactAvg: "Average power",
    uFactPeak: "Peak",
    uFactBase: "Always on",
    uFactRun: "Running now for",
    alTitle: "Notices",
    alFault: "Plant fault{plants}",
    alNegPrice: "The electricity price is negative ({price} ct/kWh): using power now pays",
    alLongRun: "{name} has been running for {dur} ({power})",
    alBase: "The base load is high: {now} W, usually about {ref} W",
    f_battery_soc: "Storage charge level sensor (%)",
    f_battery_capacity: "Storage capacity (kWh)",
    f_battery_min_soc: "Minimum charge level (%)",
    pvSoc: "Storage: charge level sensor{cap}",
    stTitle: "Storage",
    stCharging: "Charging",
    stDischarging: "Discharging",
    stIdle: "Idle",
    stSoc: "Charge level",
    stStored: "Stored",
    stUsable: "Usable",
    stPower: "Power",
    stEmptyAt: "Empty at",
    stFullAt: "Full at",
    stIn: "in {dur}",
    stDur: "{h} h {m} min",
    stDurMin: "{m} min",
    tabUsage: "Consumption",
    uBaseTitle: "Base load",
    uBase: "Base load",
    uBaseHint: "Lowest 30-minute average of the house power in the last 24 hours.",
    uPerYear: "Per year",
    uCostYear: "Cost per year",
    uExplained: "Always-on devices",
    uOfBase: "{pct} % of the base load",
    uTopTitle: "Biggest consumers",
    uBaseHintStat: "Lowest hourly mean of the house power in the period (at most the last 31 days).",
    uAlwaysHintStat: "Lowest hourly mean of each device in the period (at most the last 31 days), from 2 W on.",
    uNeedStats: "Past periods come from the long-term statistics: the power sensors need the state class measurement.",
    uAlwaysTitle: "Always on (standby)",
    uAlwaysDefined: "The standby devices you defined in the settings, with their lowest power in the period.",
    uAlwaysHint: "Lowest 30-minute average of each device in the last 24 hours, from 2 W on.",
    uYear: "{kwh} kWh · {cost} per year",
    uYearKwh: "{kwh} kWh per year",
    uNone: "Not enough data yet",
    tabBalance: "Balance",
    sectionEnergy: "Energy counters (kWh)",
    f_energy_solar: "PV production",
    f_energy_grid_import: "Grid import",
    f_energy_grid_export: "Grid export",
    f_energy_battery_charge: "To storage (charging)",
    f_energy_battery_discharge: "From storage (discharging)",
    f_energy_house: "House consumption (optional, otherwise calculated)",
    energyHint: "Cumulative kWh counters or utility meters. The Balance tab reads their long-term statistics, so the history that already exists is used.",
    energyAsk: "The Energy dashboard of Home Assistant has counters. Do you want to take them over?",
    energyApply: "Take over counters",
    energyDone: "The counters of the Energy dashboard are in use.",
    energyOverwrite: "This replaces the counters in these fields. Save afterwards to keep them.",
    balTitle: "Balance",
    balChart: "Energy per period",
    bDay: "Day",
    bWeek: "Week",
    bMonth: "Month",
    bYear: "Year",
    bPrev: "Previous period",
    bNext: "Next period",
    bSolar: "Production",
    bImport: "Grid import",
    bExport: "Feed-in",
    bCharge: "To storage",
    bDischarge: "From storage",
    bHouse: "Consumption",
    bAutarky: "Self-sufficiency",
    bSelf: "Self-consumption",
    bCost: "Grid cost",
    bRevenue: "Feed-in revenue",
    bSaldo: "Balance",
    bVsPrev: "{arrow} {pct} % vs. previous period",
    bNoData: "No data for this period",
    bPriceNote: "Valued with the price of the Tariffy contract.",
    bTime: "Period",
    bSum: "Sum",
    autarky: "Self-sufficiency",
    tabPv: "PV",
    tabEv: "EV",
    tabCosts: "Costs",
    tabAmortix: "Payback",
    tContract: "Contract",
    tCostSoFar: "Cost so far",
    tBalance: "Balance so far",
    tForecast: "Balance at contract end",
    rename: "Rename",
    originalName: "Original: {name}",
    live: "Live consumption",
    noData: "No data",
    history: "History",
    historyLoading: "Loading history …",
    noHistory: "No history available yet",
    chartLabel: "Power over the last 24 hours (W)",
    hProd: "Production",
    hFeed: "Feed-in",
    hFromStorage: "From storage (+)",
    hToStorage: "To storage (−)",
    hStorage: "Storage",
    hStorageNet: "Storage (+ discharge / − charge)",
    hDischarge: "From storage",
    hCharge: "To storage",
    hDirect: "Used directly",
    hDirectShort: "Direct",
    hGrid: "Grid import",
    hGridShort: "Grid",
    hHouse: "House consumption",
    hHouseShort: "House",
    hTable: "Show as table",
    hTime: "Time",
    notConfigured:
      "No sensors configured. Open Settings → Devices & services → Energy Assistant.",
    menu: "Menu",
    solar: "Solar",
    solarDirect: "Solar used directly",
    gridImport: "Grid import",
    gridExport: "Grid export",
    fromStorage: "From storage",
    toStorage: "To storage",
    storageFromGrid: "Storage from grid",
    storage: "Storage",
    grid: "Grid",
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
    f_device_standby: "Standby devices (shown as always on; none = detected automatically)",
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
    amTitle: "Payback",
    aSavings: "Savings total",
    aInvest: "Investment",
    aProgress: "Progress",
    aRemaining: "Remaining",
    aPerDay: "Savings per day",
    aDays: "Time left",
    aDaysUnit: "days",
    aDate: "Payback date",
    pvDayTitle: "PV today and tomorrow",
    pvToday: "Today",
    pvTomorrow: "Tomorrow",
    dProduction: "Production",
    dFeedIn: "Feed-in",
    dSelf: "Self-consumption",
    dAutarky: "Self-sufficiency",
    dForecast: "Forecast reached",
    dBenefit: "Benefit",
    dExpected: "Expected feed-in",
    dWindow: "Best window",
    dStorageTitle: "Storage",
    dStorage: "Storage usable",
    dEmptyAt: "Storage empty at",
    dFault: "Plant fault",
    evWallbox: "Wallbox",
    evCharging: "Charging",
    evConnected: "Connected",
    evIdle: "Not connected",
    evSoc: "Charge level",
    evSolar: "Solar share",
    evToday: "Charged today",
    evCostToday: "Charging cost today",
    evAdvice: "Charge before PV is recommended",
    costsNow: "Costs right now",
    tPrice: "Electricity price",
    tGridCost: "Grid import costs",
    tFeedIn: "Feed-in earns",
    tPvSaves: "Solar saves",
    pvPlants: "PV by plant",
    intTitle: "Detected integrations",
    intPv: "PV Assistant",
    intPvData: "PV Assistant: day figures, forecast and plant fault in the PV tab",
    intTariffy: "Tariffy: electricity price, costs and contract in the Costs tab",
    intEv: "EV Assistant: wallbox and today's charging in the EV tab ({n})",
    intAmortix: "Amortix: savings and payback in the Payback tab",
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
    uTodayKwh: "{kwh} kWh heute",
    uFactEnergy: "Energie",
    uFactCost: "Kosten",
    uFactAvg: "Durchschnittsleistung",
    uFactPeak: "Spitze",
    uFactBase: "Dauerlast",
    uFactRun: "Läuft seit",
    alTitle: "Hinweise",
    alFault: "Anlagenstörung{plants}",
    alNegPrice: "Der Strompreis ist negativ ({price} ct/kWh): Verbrauchen lohnt sich jetzt",
    alLongRun: "{name} läuft seit {dur} ({power})",
    alBase: "Die Grundlast ist hoch: {now} W, sonst etwa {ref} W",
    f_battery_soc: "Ladestand-Sensor des Speichers (%)",
    f_battery_capacity: "Speicherkapazität (kWh)",
    f_battery_min_soc: "Mindest-Ladestand (%)",
    pvSoc: "Speicher: Ladestand-Sensor{cap}",
    stTitle: "Speicher",
    stCharging: "Lädt",
    stDischarging: "Entlädt",
    stIdle: "Ruhe",
    stSoc: "Ladestand",
    stStored: "Gespeichert",
    stUsable: "Nutzbar",
    stPower: "Leistung",
    stEmptyAt: "Leer um",
    stFullAt: "Voll um",
    stIn: "in {dur}",
    stDur: "{h} h {m} min",
    stDurMin: "{m} min",
    tabUsage: "Verbrauch",
    uBaseTitle: "Grundlast",
    uBase: "Grundlast",
    uBaseHint: "Niedrigster 30-Minuten-Durchschnitt der Hausleistung der letzten 24 Stunden.",
    uPerYear: "Pro Jahr",
    uCostYear: "Kosten pro Jahr",
    uExplained: "Dauerläufer unter den Geräten",
    uOfBase: "{pct} % der Grundlast",
    uTopTitle: "Größte Verbraucher",
    uBaseHintStat: "Niedrigster Stundenmittelwert der Hausleistung im Zeitraum (höchstens die letzten 31 Tage).",
    uAlwaysHintStat: "Niedrigster Stundenmittelwert jedes Geräts im Zeitraum (höchstens die letzten 31 Tage), ab 2 W.",
    uNeedStats: "Vergangene Zeiträume kommen aus der Langzeitstatistik: die Leistungssensoren brauchen die State Class measurement.",
    uAlwaysTitle: "Dauerlast (Standby)",
    uAlwaysDefined: "Die Standby-Geräte, die du in den Einstellungen festgelegt hast, mit ihrer niedrigsten Leistung im Zeitraum.",
    uAlwaysHint: "Niedrigster 30-Minuten-Durchschnitt jedes Geräts in den letzten 24 Stunden, ab 2 W.",
    uYear: "{kwh} kWh · {cost} pro Jahr",
    uYearKwh: "{kwh} kWh pro Jahr",
    uNone: "Noch zu wenig Daten",
    tabBalance: "Bilanz",
    sectionEnergy: "Energiezähler (kWh)",
    f_energy_solar: "PV-Erzeugung",
    f_energy_grid_import: "Netzbezug",
    f_energy_grid_export: "Einspeisung",
    f_energy_battery_charge: "In Speicher (Laden)",
    f_energy_battery_discharge: "Aus Speicher (Entladen)",
    f_energy_house: "Hausverbrauch (optional, sonst berechnet)",
    energyHint: "Fortlaufende kWh-Zähler oder Utility Meter. Der Tab Bilanz liest deren Langzeitstatistik, der vorhandene Verlauf wird also genutzt.",
    energyAsk: "Das Energie-Dashboard von Home Assistant hat Zähler. Sollen sie übernommen werden?",
    energyApply: "Zähler übernehmen",
    energyDone: "Die Zähler des Energie-Dashboards sind übernommen.",
    energyOverwrite: "Dadurch werden die Zähler in diesen Feldern ersetzt. Danach speichern, damit sie bleiben.",
    balTitle: "Bilanz",
    balChart: "Energie je Zeitraum",
    bDay: "Tag",
    bWeek: "Woche",
    bMonth: "Monat",
    bYear: "Jahr",
    bPrev: "Voriger Zeitraum",
    bNext: "Nächster Zeitraum",
    bSolar: "Erzeugung",
    bImport: "Netzbezug",
    bExport: "Einspeisung",
    bCharge: "In Speicher",
    bDischarge: "Aus Speicher",
    bHouse: "Verbrauch",
    bAutarky: "Autarkie",
    bSelf: "Eigenverbrauch",
    bCost: "Netzkosten",
    bRevenue: "Einspeiseerlös",
    bSaldo: "Saldo",
    bVsPrev: "{arrow} {pct} % ggü. Vorperiode",
    bNoData: "Keine Daten für diesen Zeitraum",
    bPriceNote: "Bewertet mit dem Preis des Tariffy-Vertrags.",
    bTime: "Zeitraum",
    bSum: "Summe",
    autarky: "Autarkie",
    tabPv: "PV",
    tabEv: "EV",
    tabCosts: "Kosten",
    tabAmortix: "Amortisation",
    tContract: "Vertrag",
    tCostSoFar: "Kosten bisher",
    tBalance: "Guthaben bisher",
    tForecast: "Prognose Vertragsende",
    rename: "Umbenennen",
    originalName: "Original: {name}",
    live: "Verbrauch live",
    noData: "Keine Daten",
    history: "Verlauf",
    historyLoading: "Verlauf wird geladen …",
    noHistory: "Noch kein Verlauf verfügbar",
    chartLabel: "Leistung der letzten 24 Stunden (W)",
    hProd: "Erzeugung",
    hFeed: "Einspeisung",
    hFromStorage: "Aus Speicher (+)",
    hToStorage: "In Speicher (−)",
    hStorage: "Speicher",
    hStorageNet: "Speicher (+ Entladen / − Laden)",
    hDischarge: "Aus Speicher",
    hCharge: "In Speicher",
    hDirect: "Direkt verbraucht",
    hDirectShort: "Direkt",
    hGrid: "Netzbezug",
    hGridShort: "Netz",
    hHouse: "Hausverbrauch",
    hHouseShort: "Haus",
    hTable: "Als Tabelle anzeigen",
    hTime: "Zeit",
    notConfigured:
      "Keine Sensoren konfiguriert. Unter Einstellungen → Geräte & Dienste → Energy Assistant auswählen.",
    menu: "Menü",
    solar: "PV",
    solarDirect: "PV direkt verbraucht",
    gridImport: "Netzbezug",
    gridExport: "Einspeisung",
    fromStorage: "Vom Speicher",
    toStorage: "Zum Speicher",
    storageFromGrid: "Speicher aus Netz",
    storage: "Speicher",
    grid: "Netz",
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
    f_device_standby: "Standby-Geräte (werden als Dauerlast gezeigt; leer = automatisch erkannt)",
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
    amTitle: "Amortisation",
    aSavings: "Einsparung gesamt",
    aInvest: "Investition",
    aProgress: "Fortschritt",
    aRemaining: "Verbleibend",
    aPerDay: "Ersparnis pro Tag",
    aDays: "Restzeit",
    aDaysUnit: "Tage",
    aDate: "Amortisation am",
    pvDayTitle: "PV heute und morgen",
    pvToday: "Heute",
    pvTomorrow: "Morgen",
    dProduction: "Erzeugung",
    dFeedIn: "Einspeisung",
    dSelf: "Eigenverbrauch",
    dAutarky: "Autarkie",
    dForecast: "Prognose erreicht",
    dBenefit: "Nutzen",
    dExpected: "Erwartete Einspeisung",
    dWindow: "Bestes Fenster",
    dStorageTitle: "Speicher",
    dStorage: "Speicher nutzbar",
    dEmptyAt: "Speicher leer um",
    dFault: "Anlagenstörung",
    evWallbox: "Wallbox",
    evCharging: "Lädt",
    evConnected: "Verbunden",
    evIdle: "Nicht verbunden",
    evSoc: "Ladestand",
    evSolar: "Solaranteil",
    evToday: "Heute geladen",
    evCostToday: "Ladekosten heute",
    evAdvice: "Laden vor PV empfehlenswert",
    costsNow: "Kosten jetzt",
    tPrice: "Strompreis",
    tGridCost: "Netzbezug kostet",
    tFeedIn: "Einspeisung bringt",
    tPvSaves: "PV spart",
    pvPlants: "PV je Anlage",
    intTitle: "Erkannte Integrationen",
    intPv: "PV Assistant",
    intPvData: "PV Assistant: Tagesbilanz, Prognose und Anlagenstörung im Tab PV",
    intTariffy: "Tariffy: Strompreis, Kosten und Vertrag im Tab Kosten",
    intEv: "EV Assistant: Wallbox und heutiges Laden im Tab EV ({n})",
    intAmortix: "Amortix: Einsparung und Amortisation im Tab Amortisation",
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
// --- time zone of the Home Assistant instance (hass.config.time_zone), not the one of the browser -------------
const _tzFormats = new Map();
function _tzFormat(tz) {
  let f = _tzFormats.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
    _tzFormats.set(tz, f);
  }
  return f;
}
/** The wall clock of an instant in a time zone: year, month (1-12), day, hour, minute, second. */
function tzParts(ms, tz) {
  const out = {};
  for (const part of _tzFormat(tz).formatToParts(ms)) if (part.type !== "literal") out[part.type] = Number(part.value);
  return { y: out.year, m: out.month, d: out.day, h: out.hour % 24, mi: out.minute, s: out.second };
}
function tzOffset(ms, tz) {
  const p = tzParts(ms, tz);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(ms / 1000) * 1000;
}
/** The instant of a wall clock time (month 0-11, days and months may overflow) in a time zone. */
function zonedTime(y, m, d, h, tz) {
  const guess = Date.UTC(y, m, d, h);
  const first = guess - tzOffset(guess, tz);
  return guess - tzOffset(first, tz);
}
const BAL_CATS = [["solar", "energy_solar"], ["imp", "energy_grid_import"], ["exp", "energy_grid_export"], ["chg", "energy_battery_charge"], ["dis", "energy_battery_discharge"], ["house", "energy_house"]];
const NUMBER_KEYS = ["battery_capacity", "battery_min_soc"];
const ENERGY_KEYS = ["energy_solar", "energy_grid_import", "energy_grid_export", "energy_battery_charge", "energy_battery_discharge", "energy_house"];
const SETTINGS_SECTIONS = [
  { title: "sectionGrid", fields: [["grid_power", "multi"], ["invert_grid", "bool"], ["grid_import", "single"], ["grid_export", "single"], ["house_power", "single"]] },
  { title: "sectionSolar", fields: [["solar_power", "multi"], ["battery_power", "multi"], ["invert_battery", "bool"], ["battery_discharge", "multi"], ["battery_charge", "multi"], ["battery_grid_charge", "single"], ["battery_soc", "soc"], ["battery_capacity", "number"], ["battery_min_soc", "number"]] },
  { title: "sectionEnergy", fields: [["energy_offer", "energyoffer"], ["energy_solar", "emulti"], ["energy_grid_import", "emulti"], ["energy_grid_export", "emulti"], ["energy_battery_charge", "emulti"], ["energy_battery_discharge", "emulti"], ["energy_house", "emulti"]] },
  { title: "sectionDevices", fields: [["device_patterns", "text"], ["device_exclude_patterns", "text"], ["device_matches", "matches"], ["device_exclude", "multi"], ["device_power", "multi"], ["device_standby", "multi"]] },
  { title: "sectionAreas", fields: [["area_ids", "areas"]] },
  { title: "sectionLabels", fields: [["label_ids", "labels"]] },
];
const LIST_KEYS = ["grid_power", "grid_import", "grid_export", "solar_power", "battery_power", "battery_discharge", "battery_charge", "battery_grid_charge", "battery_soc", "device_power", "device_standby", "device_patterns", "device_exclude", "device_exclude_patterns", "label_ids", "area_ids", ...ENERGY_KEYS];
// Sensors that are part of the energy balance and therefore never listed as devices.
// The two pick lists of the settings (labels and areas) share their code. Each has its own
// attribute names, element id and filter state.
const PICKERS = {
  label: { attr: "label", filter: "lfilter", seg: "lseg", list: "llist", state: ["_lFilter", "_lState", "_lSel"], key: "label_ids", icon: "mdi:label", noMatches: "noLabelMatches", nonePower: "noPowerLabels", empty: "noLabelsDefined", placeholder: "filterLabels" },
  area: { attr: "area", filter: "afilter", seg: "aseg", list: "alist", state: ["_aFilter", "_aState", "_aSel"], key: "area_ids", icon: "mdi:texture-box", noMatches: "noAreaMatches", nonePower: "noPowerAreas", empty: "noAreasDefined", placeholder: "filterAreas" },
};

// Power below this counts as idle and is only counted, not listed.
const IDLE_W = 5;
const LONG_RUN_W = 200; // a device that draws this much counts as running
const LONG_RUN_MS = 4 * 3600 * 1000; // running this long is worth a notice
const ALWAYS_RUN_MS = 20 * 3600 * 1000; // but not a device that never stopped (heat pump, pool pump)
const FLOW_W = 20; // charging or discharging from this power on
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
      this._loadIntegrations();
      this._loadEnergyOffer();
    }
  }

  /** The counters of the Energy dashboard as an offer for the energy counters (the backend only reads them). */
  async _loadEnergyOffer() {
    if (this._energyLoading || !this._hass) return;
    this._energyLoading = true;
    try {
      const res = await this._hass.callWS({ type: "energy_assistant/energy_suggestion" });
      this._energyOffer = res?.targets && Object.keys(res.targets).length ? { targets: res.targets } : null;
    } catch (e) {
      console.info("Energy Assistant: could not ask for the Energy dashboard", e);
      this._energyOffer = null;
    } finally {
      this._energyLoading = false;
      this._settingsDirty = true;
      this._render();
    }
  }

  /**
   * Entities of installed sibling integrations (Tariffy, ...). The backend only reads them; the values
   * come live from the states. Without any of them the answer is empty and nothing is shown.
   */
  async _loadIntegrations() {
    if (this._intLoading || !this._hass) return;
    this._intLoading = true;
    try {
      const res = await this._hass.callWS({ type: "energy_assistant/integrations" });
      this._int = res && typeof res === "object" ? res : {};
    } catch (e) {
      console.info("Energy Assistant: could not ask for sibling integrations", e);
      this._int = {};
    } finally {
      this._intLoading = false;
      this._settingsDirty = true;
      this._render();
    }
  }

  /** Electricity price in currency/kWh (the live price of a dynamic tariff if Tariffy has one). */
  _price() {
    const t = this._int?.tariffy;
    const state = t?.price && this._hass?.states?.[t.price];
    if (!state) return null;
    const live = parseFloat(state.attributes?.arbeitspreis_aktuell);
    const value = Number.isNaN(live) ? parseFloat(state.state) : live;
    if (Number.isNaN(value)) return null;
    const unit = String(state.attributes?.unit_of_measurement || "EUR/kWh");
    return { value, currency: unit.split("/")[0] || "EUR" };
  }

  _feedInTariff() {
    const id = this._int?.tariffy?.feed_in;
    const v = id && this._hass?.states?.[id] ? parseFloat(this._hass.states[id].state) : NaN;
    return Number.isNaN(v) ? null : v;
  }

  /**
   * Savings and payback of Amortix (read only): total savings, investment, progress, what remains, the
   * daily savings and the expected payback date, per entry (the overview entry replaces the others).
   * Tiles without a value are left out; empty without Amortix.
   */
  _renderAmortix() {
    const entries = this._int?.amortix?.entries;
    if (!Array.isArray(entries) || !entries.length) return "";
    const lang = this._hass?.language || "en";
    const tile = (label, value, unit = "", extra = "") => `<div class="eb-tile"><div class="eb-label">${esc(label)}</div><div class="eb-value">${value}${unit ? `<small>${esc(unit)}</small>` : ""}</div>${extra}</div>`;
    const blocks = entries.map((entry) => {
      const ids = entry.entities || {};
      const tiles = [];
      const money = (label, key) => {
        const v = this._num(ids[key]);
        if (v == null) return;
        const [n, sym] = this._money(v, this._hass?.states?.[ids[key]]?.attributes?.unit_of_measurement || "EUR");
        tiles.push(tile(label, n, sym));
      };
      money(this._t("aSavings"), "einsparung");
      money(this._t("aInvest"), "investition");
      const progress = this._num(ids.fortschritt);
      if (progress != null) {
        const pct = Math.max(0, Math.min(100, progress));
        tiles.push(tile(this._t("aProgress"), pct.toLocaleString(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 }), "%", `<div class="amo-bar"><div style="width:${pct}%"></div></div>`));
      }
      money(this._t("aRemaining"), "verbleibend");
      money(this._t("aPerDay"), "tagesschnitt");
      const days = this._num(ids.resttage);
      if (days != null) tiles.push(tile(this._t("aDays"), Math.round(days).toLocaleString(lang), this._t("aDaysUnit")));
      const dateState = ids.datum && this._hass?.states?.[ids.datum]?.state;
      const date = dateState && !["unknown", "unavailable"].includes(dateState) ? new Date(dateState) : null;
      if (date && !Number.isNaN(date.getTime())) tiles.push(tile(this._t("aDate"), esc(date.toLocaleDateString(lang, { year: "numeric", month: "short", day: "numeric", timeZone: this._tz() }))));
      if (!tiles.length) return "";
      return `<div class="eb-label costs">${esc(entry.title || "Amortix")}</div><div class="tiles">${tiles.join("")}</div>`;
    }).join("");
    return blocks ? `<div class="eb-card fullrow"><div class="row"><span class="eb-title">${esc(this._t("amTitle"))}</span></div>${blocks}</div>` : "";
  }

  /**
   * The tabs that exist: Power always, the others only when the matching integration was found
   * (PV Assistant, EV Assistant, Tariffy, Amortix).
   */
  _tabs() {
    const found = this._int || {};
    const tabs = ["house"];
    if (this._usageEnabled()) tabs.push("usage");
    if (this._balEnabled()) tabs.push("balance");
    if (found.pv_assistant || (this._pv?.plants || []).length >= 2) tabs.push("pv");
    if (found.ev_assistant?.vehicles?.length) tabs.push("ev");
    if (found.tariffy) tabs.push("costs");
    if (found.amortix?.entries?.length) tabs.push("amortix");
    return tabs;
  }

  _tabLabel(tab) {
    return this._t({ house: "tabPower", usage: "tabUsage", balance: "tabBalance", pv: "tabPv", ev: "tabEv", costs: "tabCosts", amortix: "tabAmortix" }[tab] || tab);
  }

  /** Markup of the page of the current tab (not the settings). */
  _renderPage() {
    if (!this._ready) return `<div class="eb-card"><div class="empty">${this._t("loading")}</div></div>`;
    const stack = (...cards) => `<div class="stack">${cards.filter(Boolean).join("") || `<div class="eb-card"><div class="empty">–</div></div>`}</div>`;
    switch (this._tab) {
      case "usage": return this._renderUsage();
      case "balance": return this._renderBalance();
      case "pv": return stack(this._renderPvDay(), this._renderPvPlants());
      case "ev": return stack(this._renderEv());
      case "costs": return stack(this._renderCosts(this._current()), this._renderContract());
      case "amortix": return stack(this._renderAmortix());
      default: return this._renderHouse();
    }
  }

  /** The mean of the values per bucket, so that a long series fits a small line (gaps stay empty). */
  _downsample(values, n = 48) {
    if (!values || !values.length) return [];
    const size = Math.max(1, Math.ceil(values.length / n));
    const out = [];
    for (let i = 0; i < values.length; i += size) {
      const part = values.slice(i, i + size).filter((v) => v != null && !Number.isNaN(v));
      out.push(part.length ? part.reduce((a, v) => a + Math.max(0, v), 0) / part.length : null);
    }
    return out;
  }

  /** A small line of a power series (zero at the bottom) as inline SVG; nothing without a visible curve. */
  _sparkline(values, { w = 96, h = 22, big = false } = {}) {
    const v = (values || []).map((x) => (x == null || Number.isNaN(x) ? null : Math.max(0, x)));
    const known = v.filter((x) => x != null);
    const max = Math.max(0, ...known);
    if (known.length < 4 || !(max > 0)) return "";
    const n = v.length;
    const x = (i) => (n === 1 ? 0 : (i / (n - 1)) * w).toFixed(1);
    const y = (val) => (h - 1 - (val / max) * (h - 3)).toFixed(1);
    let line = "", area = "", seg = [];
    const flush = () => {
      if (seg.length > 1) {
        line += seg.map(([i, val], k) => `${k ? "L" : "M"}${x(i)},${y(val)}`).join("");
        area += `${seg.map(([i, val], k) => `${k ? "L" : "M"}${x(i)},${y(val)}`).join("")}L${x(seg[seg.length - 1][0])},${h}L${x(seg[0][0])},${h}Z`;
      }
      seg = [];
    };
    v.forEach((val, i) => { if (val == null) flush(); else seg.push([i, val]); });
    flush();
    if (!line) return "";
    return `<svg class="spk${big ? " big" : ""}" viewBox="0 0 ${w} ${h}" ${big ? 'preserveAspectRatio="none"' : `width="${w}" height="${h}"`} aria-hidden="true"><path class="spkarea" d="${area}"/><path class="spkline" d="${line}"/></svg>`;
  }

  /** The consumption tab exists when devices are set up (single sensors or name patterns). */
  _usageEnabled() {
    return (this._cfg.device_power || []).length > 0 || (this._cfg.device_standby || []).length > 0 || (this._cfg.device_patterns || []).length > 0;
  }

  /** Watts per bucket of a history answer (null before the first value), in the unit of the sensor. */
  _sampleW(rows, id, t0, n, step) {
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
  }

  /**
   * The lowest average over half an hour (6 buckets without a gap): the power that never goes away. Null when
   * there are less than 12 values or no complete half hour.
   */
  _baseline(values) {
    const win = 6;
    if (!values || values.filter((v) => v != null).length < win * 2) return null;
    let best = null;
    for (let k = 0; k + win <= values.length; k++) {
      const part = values.slice(k, k + win);
      if (part.some((v) => v == null)) continue;
      const mean = part.reduce((a, v) => a + Math.max(0, v), 0) / win;
      if (best == null || mean < best) best = mean;
    }
    return best;
  }

  /**
   * Per device: the energy since midnight in kWh (the power of the 5-minute buckets summed up) and the base
   * load of the last 24 hours. The devices that have no history are left out.
   */
  _usageCompute(res, ids, t0, t1) {
    const step = BUCKET_MIN * 60 * 1000;
    const n = Math.floor((t1 - t0) / step);
    const tz = this._tz();
    const day = tzParts(t1, tz);
    const midnight = zonedTime(day.y, day.m - 1, day.d, 0, tz);
    const from = Math.max(0, Math.ceil((midnight - t0) / step));
    const devices = [];
    for (const id of ids) {
      const arr = this._sampleW(res?.[id], id, t0, n, step);
      if (!arr) continue;
      let kwh = 0;
      for (let k = from; k < n; k++) kwh += (Math.max(0, arr[k] ?? 0) * step) / 3600000 / 1000;
      // How long the device has been running without a longer break (up to 15 minutes below the limit count as running).
      let end = -1, run = 0;
      for (let k = n; k >= Math.max(0, n - 3); k--) if (arr[k] != null && arr[k] >= LONG_RUN_W) { end = k; break; }
      if (end >= 0) {
        let startK = end, low = 0;
        for (let k = end - 1; k >= 0; k--) {
          if (arr[k] != null && arr[k] >= LONG_RUN_W) { startK = k; low = 0; } else if (++low > 3) break;
        }
        run = (end - startK + 1) * step;
      }
      const known = arr.filter((v) => v != null && !Number.isNaN(v));
      const hoursToday = Math.max(0.0001, (t1 - midnight) / 3600000);
      devices.push({
        id, name: this._deviceName(id), kwh, baseW: this._baseline(arr), run, nowW: arr[n],
        spark: this._downsample(arr, 48), peak: known.length ? Math.max(0, ...known) : null, avgW: (kwh / hoursToday) * 1000,
      });
    }
    return { devices, at: Date.now() };
  }

  _maybeLoadUsage() {
    if (!this._ready || this._usageLoading) return;
    if (!this._usage || Date.now() - this._usage.at > 5 * 60 * 1000) this._loadUsage();
  }

  async _loadUsage() {
    if (!this._hass || this._usageLoading) return;
    this._usageLoading = true;
    try {
      const ids = this._deviceIds();
      const end = Date.now(), start = end - HISTORY_HOURS * 3600 * 1000;
      const res = ids.length
        ? await this._hass.callWS({
          type: "history/history_during_period",
          start_time: new Date(start).toISOString(),
          end_time: new Date(end).toISOString(),
          entity_ids: ids,
          include_start_time_state: true,
          significant_changes_only: false,
          minimal_response: true,
          no_attributes: true,
        })
        : {};
      this._usage = this._usageCompute(res, ids, start, end);
    } catch (e) {
      console.info("Energy Assistant: could not load the history of the devices", e);
      this._usage = { devices: [], failed: true, at: Date.now() };
    } finally {
      this._usageLoading = false;
      this._render();
    }
  }

  /** The statistics (hourly or daily means of the power) of some sensors in a period; null when the request fails. */
  async _usStats(ids, from, to, period) {
    ids = [...new Set(ids)];
    if (!ids.length || !(to > from)) return {};
    try {
      return await this._hass.callWS({
        type: "recorder/statistics_during_period",
        start_time: new Date(from).toISOString(),
        end_time: new Date(to).toISOString(),
        statistic_ids: ids,
        period,
        types: ["mean"],
        units: { power: "W" },
      });
    } catch (e) {
      console.info("Energy Assistant: could not load the statistics of the devices", e);
      return null;
    }
  }

  /** Sensors for the house power in the statistics: the house sensor, otherwise the ones its balance is made of. */
  _houseStatIds() {
    const c = this._cfg;
    if (c.house_power) return [c.house_power];
    return [...(c.solar_power || []), ...(c.grid_import || []), ...(c.grid_export || []), ...(c.battery_discharge || []),
      ...(c.battery_charge || []), ...(c.battery_grid_charge || []), ...(c.grid_power || []), ...(c.battery_power || [])];
  }

  /** The house power per hour from statistics: the house sensor or the balance of the others (like the live value). */
  _houseHourly(res) {
    const c = this._cfg;
    const mean = (row) => (row.mean == null || Number.isNaN(row.mean) ? null : row.mean);
    const startOf = (row) => (typeof row.start === "number" ? row.start : Date.parse(row.start));
    if (c.house_power) return (res?.[c.house_power] || []).map(mean).filter((v) => v != null).map((v) => Math.max(0, v));
    const cats = [["solar", c.solar_power, "pos"], ["gridIn", c.grid_import, "pos"], ["gridOut", c.grid_export, "pos"], ["discharge", c.battery_discharge, "abs"],
      ["charge", c.battery_charge, "abs"], ["gridCharge", c.battery_grid_charge, ""], ["grid", c.grid_power, ""], ["battery", c.battery_power, ""]];
    const byStart = new Map();
    for (const [cat, ids, mode] of cats) {
      for (const id of ids || []) {
        for (const row of res?.[id] || []) {
          const v = mean(row);
          if (v == null) continue;
          const t = startOf(row);
          const e = byStart.get(t) || {};
          e[cat] = (e[cat] ?? 0) + (mode === "abs" ? Math.abs(v) : mode === "pos" ? Math.max(0, v) : v);
          byStart.set(t, e);
        }
      }
    }
    const out = [];
    for (const e of byStart.values()) {
      const parts = this._split({ ...e, grid: e.grid == null ? null : c.invert_grid ? -e.grid : e.grid, battery: e.battery == null ? null : c.invert_battery ? -e.battery : e.battery });
      const house = this._calcHouse(parts);
      if (house != null) out.push(house);
    }
    return out;
  }

  /** The lowest of the means, with at least 12 values (null otherwise). */
  _lowestMean(values) {
    const v = values.filter((x) => x != null && !Number.isNaN(x)).map((x) => Math.max(0, x));
    return v.length >= 12 ? Math.min(...v) : null;
  }

  /**
   * Consumption of a period from the long-term statistics: the energy of every device (hourly or daily means
   * times their duration) and the base load as the lowest hourly mean, of the house and of every device.
   */
  _usageFromStats(energyRes, baseRes, ids, hours = null) {
    const hoursOf = (row, period) => (row.end != null && row.start != null ? (Number(row.end) - Number(row.start)) / 3600000 : period === "day" ? 24 : 1);
    const devices = [];
    for (const id of ids) {
      const rows = energyRes?.[id];
      if (!rows || !rows.length) continue;
      let kwh = 0;
      for (const row of rows) {
        if (row.mean == null || Number.isNaN(row.mean)) continue;
        kwh += (Math.max(0, row.mean) * hoursOf(row, energyRes.__period)) / 1000;
      }
      const hourly = (baseRes?.[id] || []).map((r) => r.mean);
      const means = (hourly.length ? hourly : rows.map((r) => r.mean)).map((v) => (v == null || Number.isNaN(v) ? null : v));
      const known = means.filter((v) => v != null);
      devices.push({
        id, name: this._deviceName(id), kwh, baseW: this._lowestMean(hourly),
        spark: this._downsample(means, 60), peak: known.length ? Math.max(0, ...known) : null, avgW: hours > 0 ? (kwh / hours) * 1000 : null,
      });
    }
    return { devices, houseBase: this._lowestMean(this._houseHourly(baseRes)) };
  }

  _maybeLoadUsageView() {
    if (!this._ready || this._usageViewLoading) return;
    const range = this._usRange ?? "day", off = this._usOff ?? 0;
    if (range === "day" && off === 0) return; // today comes from the history
    const v = this._usageView;
    if (!v || v.range !== range || v.off !== off || Date.now() - v.at > 5 * 60 * 1000) this._loadUsageView();
  }

  async _loadUsageView() {
    if (!this._hass || this._usageViewLoading) return;
    this._usageViewLoading = true;
    const range = this._usRange ?? "day", off = this._usOff ?? 0;
    try {
      const win = this._balWindow(range, off);
      const to = Math.min(win.end, Date.now());
      const ids = this._deviceIds();
      const houseIds = this._houseStatIds();
      const hourly = range === "day" || range === "week";
      let energy, base;
      if (hourly) {
        base = await this._usStats([...ids, ...houseIds], win.start, to, "hour");
        energy = base;
      } else {
        const from = Math.max(win.start, to - 31 * 24 * 3600 * 1000);
        [energy, base] = await Promise.all([this._usStats(ids, win.start, to, "day"), this._usStats([...ids, ...houseIds], from, to, "hour")]);
      }
      if (energy == null || base == null) {
        this._usageView = { range, off, devices: [], houseBase: null, failed: true, at: Date.now() };
      } else {
        const calc = this._usageFromStats({ ...energy, __period: hourly ? "hour" : "day" }, base, ids, (to - win.start) / 3600000);
        this._usageView = { range, off, ...calc, at: Date.now() };
      }
    } finally {
      this._usageViewLoading = false;
      this._render();
    }
  }

  /**
   * The consumption tab: the base load of the house (what never goes away) with its yearly cost, the
   * biggest consumers of today in kWh and euro, and the devices that are always on (standby).
   */
  _renderUsage() {
    if (!this._ready) return `<div class="eb-card"><div class="empty">${this._t("loading")}</div></div>`;
    const lang = this._hass?.language || "en";
    const range = this._usRange ?? "day", off = this._usOff ?? 0;
    const today = range === "day" && off === 0;
    const win = this._balWindow(range, off);
    const picker = this._rangePicker("u", range, off, win);
    const v = this._usageView;
    const u = today ? this._usage : v && v.range === range && v.off === off ? v : null;
    const head = `<div class="row"><span class="eb-title">${esc(this._t("uBaseTitle"))}</span>${!today && this._usageViewLoading ? `<span class="eb-label">…</span>` : ""}</div>${picker}`;
    if (!u) return `<div class="stack"><div class="eb-card">${head}<div class="empty">${this._t("loading")}</div></div></div>`;
    const priceState = this._int?.tariffy?.price && this._hass?.states?.[this._int.tariffy.price];
    const price = priceState ? parseFloat(priceState.state) : NaN;
    const currency = String(priceState?.attributes?.unit_of_measurement || "EUR/kWh").split("/")[0] || "EUR";
    const money = (v) => this._money(v, currency).join(" ");
    const num = (v, d) => v.toLocaleString(lang, { minimumFractionDigits: d, maximumFractionDigits: d });
    const tile = (label, value, unit, extra = "") => `<div class="eb-tile"><div class="eb-label">${esc(label)}</div><div class="eb-value">${value}<small>${esc(unit)}</small></div>${extra}</div>`;
    const sub = (text) => `<div class="eb-label" style="margin-top:2px;text-transform:none;letter-spacing:0">${esc(text)}</div>`;
    // 1) base load of the house
    const houseBase = u.houseBase !== undefined ? u.houseBase : this._baseline((this._history || []).map((p) => p.v));
    // Defined standby devices replace the automatic detection (a defined device is listed from 0 W).
    const defined = new Set(this._cfg.device_standby || []);
    const always = defined.size
      ? u.devices.filter((d) => defined.has(d.id) && d.baseW != null).sort((a, b) => b.baseW - a.baseW)
      : u.devices.filter((d) => d.baseW != null && d.baseW >= 2).sort((a, b) => b.baseW - a.baseW);
    const baseTiles = [];
    if (houseBase != null) {
      const perYear = (houseBase / 1000) * 8760;
      const [bv, bu] = fmtPower(houseBase);
      baseTiles.push(tile(this._t("uBase"), bv, bu, sub(this._t(today ? "uBaseHint" : "uBaseHintStat"))));
      baseTiles.push(tile(this._t("uPerYear"), num(perYear, 0), "kWh"));
      if (!Number.isNaN(price)) {
        const [cn, cs] = this._money(perYear * price, currency, 0);
        baseTiles.push(tile(this._t("uCostYear"), cn, cs));
      }
    }
    if (always.length) {
      const sum = always.reduce((a, d) => a + d.baseW, 0);
      const [sv, su] = fmtPower(sum);
      baseTiles.push(tile(this._t("uExplained"), sv, su, houseBase > 0 ? sub(this._t("uOfBase", { pct: Math.round((sum / houseBase) * 100) })) : ""));
    }
    const baseCard = `<div class="eb-card">${head}${baseTiles.length ? `<div class="tiles">${baseTiles.join("")}</div>` : `<div class="empty">${this._t("uNone")}</div>`}</div>`;
    // 2) biggest consumers today
    const top = u.devices.filter((d) => d.kwh >= 0.005).sort((a, b) => b.kwh - a.kwh);
    const total = u.devices.reduce((a, d) => a + d.kwh, 0);
    const facts = (d) => {
      const f = [[this._t("uFactEnergy"), `${num(d.kwh, 2)} kWh`]];
      if (!Number.isNaN(price)) f.push([this._t("uFactCost"), money(d.kwh * price)]);
      if (d.avgW != null) f.push([this._t("uFactAvg"), fmtPower(d.avgW).join(" ")]);
      if (d.peak != null) f.push([this._t("uFactPeak"), fmtPower(d.peak).join(" ")]);
      if (d.baseW != null && d.baseW >= 2) f.push([this._t("uFactBase"), fmtPower(d.baseW).join(" ")]);
      if (d.run >= 3600000 && today) f.push([this._t("uFactRun"), this._duration(d.run / 3600000)]);
      return f;
    };
    // A row opens to the line of the device and its figures (the line also sits in the row, small).
    const row = (scope, d, name, value, unit, share, width, subtitle = "") => {
      const key = `usage:${scope}:${d.id}`; // each list opens its rows on its own
      const isOpen = this._open?.has(key);
      const detail = isOpen
        ? `<div class="subs">${this._sparkline(d.spark, { w: 320, h: 56, big: true })}${facts(d).map(([k, val]) => `<div class="s"><span class="sn">${esc(k)}</span><b>${esc(val)}</b></div>`).join("")}</div>`
        : "";
      return `<div class="dev"><div class="line open" data-open="${esc(key)}" role="button" tabindex="0" aria-expanded="${isOpen ? "true" : "false"}"><span class="name"><span class="nt" title="${esc(name)}">${esc(name)}</span>${subtitle ? ` <small class="cnt">${esc(subtitle)}</small>` : ""}</span>
      <span class="val">${this._sparkline(d.spark)}${value}<small>${esc(unit)}</small>${share != null ? `<small class="pct">${share} %</small>` : ""}</span></div>
      <div class="track"><div class="fill" style="width:${Math.min(100, width)}%"></div></div>${detail}</div>`;
    };
    // Both lists show as many rows as the shorter one has (within MIN_ROWS and MAX_ROWS); the rest unfolds per list.
    const lens = [top.length, ...(always.length ? [always.length] : [])];
    const limit = Math.max(MIN_ROWS, Math.min(MAX_ROWS, Math.min(...lens)));
    const fold = (list, expanded, toggle) => ({
      shown: list.length > limit && !expanded ? list.slice(0, limit) : list,
      cls: expanded && list.length > limit ? " devlist" : "",
      button: list.length > limit ? `<button class="linkbtn" ${toggle}>${expanded ? this._t("showLess") : this._t("showAll", { n: list.length })}</button>` : "",
    });
    const topFold = fold(top, this._usTopExpanded, "data-ustoptoggle");
    const alwaysFold = fold(always, this._usAlwaysExpanded, "data-usalwaystoggle");
    const topRows = topFold.shown.map((d) => {
      const cost = !Number.isNaN(price) ? money(d.kwh * price) : "";
      return row("top", d, d.name, num(d.kwh, 2), "kWh", total > 0 ? Math.round((d.kwh / total) * 100) : null, (d.kwh / top[0].kwh) * 100, cost);
    }).join("");
    const topCard = `<div class="eb-card"><div class="row"><span class="eb-title">${esc(this._t("uTopTitle"))}</span><span class="eb-label">${num(total, 2)} kWh</span></div>
      <div class="devgrid${topFold.cls}">${topRows || `<div class="empty">${this._t("uNone")}</div>`}</div>${topFold.button}</div>`;
    // 3) always on
    const alwaysRows = alwaysFold.shown.map((d) => {
      const year = (d.baseW / 1000) * 8760;
      const text = !Number.isNaN(price) ? this._t("uYear", { kwh: num(year, 0), cost: money(year * price) }) : this._t("uYearKwh", { kwh: num(year, 0) });
      const [v, unit] = fmtPower(d.baseW);
      return row("always", d, d.name, v, unit, null, always[0].baseW > 0 ? (d.baseW / always[0].baseW) * 100 : 0, text);
    }).join("");
    const alwaysCard = `<div class="eb-card"><div class="row"><span class="eb-title">${esc(this._t("uAlwaysTitle"))}</span></div>
      <div class="hint">${esc(this._t(defined.size ? "uAlwaysDefined" : today ? "uAlwaysHint" : "uAlwaysHintStat"))}</div>
      <div class="devgrid${alwaysFold.cls}">${alwaysRows || `<div class="empty">${this._t("uNone")}</div>`}</div>${alwaysFold.button}</div>`;
    const note = !today && !u.devices.length ? `<div class="hint">${esc(this._t("uNeedStats"))}</div>` : "";
    return `<div class="stack">${baseCard}<div class="pair">${topCard}${alwaysCard}</div>${note}</div>`;
  }

  /**
   * The state of the storage from the charge level sensor, the capacity and the minimum level of the settings
   * and the current charging or discharging power: what is stored and usable, the mode and when it is empty
   * (discharging) or full (charging). Null without a charge level.
   */
  _storage(cur) {
    const soc = this._num(this._cfg.battery_soc?.[0]);
    if (soc == null) return null;
    const level = Math.max(0, Math.min(100, soc));
    const cap = this._cfg.battery_capacity > 0 ? this._cfg.battery_capacity : null;
    const min = Math.max(0, Math.min(100, this._cfg.battery_min_soc ?? 0));
    const out = cur?.discharge ?? 0, into = cur?.charge ?? 0;
    const mode = out >= FLOW_W ? "discharging" : into >= FLOW_W ? "charging" : "idle";
    const stored = cap != null ? (cap * level) / 100 : null;
    const usable = cap != null ? (cap * Math.max(0, level - min)) / 100 : null;
    let hours = null;
    if (mode === "discharging" && usable != null) hours = usable / (out / 1000);
    if (mode === "charging" && cap != null) hours = (cap * Math.max(0, 100 - level)) / 100 / (into / 1000);
    return { soc: level, min, cap, mode, stored, usable, power: mode === "discharging" ? out : mode === "charging" ? into : 0, hours };
  }

  /** "4 h 20 min" or "35 min". */
  _duration(hours) {
    const total = Math.max(0, Math.round(hours * 60));
    return total >= 60 ? this._t("stDur", { h: Math.floor(total / 60), m: total % 60 }) : this._t("stDurMin", { m: total });
  }

  /** The storage card: charge level as a bar with the minimum marked, what is stored and usable, power and the time. */
  _renderStorage(cur) {
    const st = this._storage(cur);
    if (!st) return "";
    const lang = this._hass?.language || "en";
    const tile = (label, value, unit = "", extra = "") => `<div class="eb-tile"><div class="eb-label">${esc(label)}</div><div class="eb-value">${value}${unit ? `<small>${esc(unit)}</small>` : ""}</div>${extra}</div>`;
    const kwh = (v) => v.toLocaleString(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const tiles = [tile(this._t("stSoc"), Math.round(st.soc), "%")];
    if (st.stored != null) tiles.push(tile(this._t("stStored"), kwh(st.stored), "kWh"));
    if (st.usable != null && st.min > 0) tiles.push(tile(this._t("stUsable"), kwh(st.usable), "kWh"));
    if (st.mode !== "idle") {
      const [v, u] = fmtPower(st.power);
      tiles.push(tile(this._t("stPower"), v, u));
    }
    if (st.hours != null && Number.isFinite(st.hours)) {
      const at = new Date(Date.now() + st.hours * 3600000).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit", timeZone: this._tz() });
      tiles.push(tile(this._t(st.mode === "discharging" ? "stEmptyAt" : "stFullAt"), esc(at), "", `<div class="eb-label" style="margin-top:2px;text-transform:none;letter-spacing:0">${esc(this._t("stIn", { dur: this._duration(st.hours) }))}</div>`));
    }
    const status = this._t({ charging: "stCharging", discharging: "stDischarging", idle: "stIdle" }[st.mode]);
    return `<div class="eb-card fullrow"><div class="row"><span class="eb-title">${esc(this._t("stTitle"))}</span><span class="eb-chip">${esc(status)}</span></div>
      <div class="socbar ${st.mode}" role="img" aria-label="${esc(this._t("stSoc"))} ${Math.round(st.soc)} %"><i style="width:${st.soc}%"></i>${st.min > 0 ? `<b style="left:${st.min}%"></b>` : ""}</div>
      <div class="tiles">${tiles.join("")}</div></div>`;
  }

  /**
   * The usual base load: the median of the lowest hourly mean of each of the days before (from the long-term
   * statistics of the house power sensor). Null without such a sensor or with less than three full days.
   */
  async _loadBaseRef() {
    const house = this._cfg.house_power;
    if (!house || this._baseRefLoading || !this._hass) return;
    this._baseRefLoading = true;
    try {
      const end = new Date(), start = new Date(end.getTime() - 8 * 24 * 3600 * 1000);
      const res = await this._hass.callWS({
        type: "recorder/statistics_during_period",
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        statistic_ids: [house],
        period: "hour",
        types: ["mean"],
        units: { power: "W" },
      });
      this._baseRef = { w: this._baseRefFrom(res?.[house] || [], end), at: Date.now() };
    } catch (e) {
      console.info("Energy Assistant: could not load the statistics of the house power", e);
      this._baseRef = { w: null, at: Date.now() };
    } finally {
      this._baseRefLoading = false;
      this._render();
    }
  }

  _baseRefFrom(rows, now = new Date()) {
    const tz = this._tz();
    const key = (t) => { const p = tzParts(t, tz); return `${p.y}-${p.m}-${p.d}`; };
    const today = key(now instanceof Date ? now.getTime() : now);
    const days = new Map();
    for (const row of rows) {
      if (row.mean == null || Number.isNaN(row.mean)) continue;
      const t = typeof row.start === "number" ? row.start : Date.parse(row.start);
      const k = key(t);
      if (k === today) continue;
      const day = days.get(k) || { min: Infinity, n: 0 };
      day.min = Math.min(day.min, Math.max(0, row.mean));
      day.n += 1;
      days.set(k, day);
    }
    const mins = [...days.values()].filter((d) => d.n >= 18).map((d) => d.min).sort((a, b) => a - b);
    if (mins.length < 3) return null;
    const mid = mins.length >> 1;
    return mins.length % 2 ? mins[mid] : (mins[mid - 1] + mins[mid]) / 2;
  }

  _maybeLoadBaseRef() {
    if (!this._ready || this._baseRefLoading || !this._cfg.house_power) return;
    if (!this._baseRef || Date.now() - this._baseRef.at > 60 * 60 * 1000) this._loadBaseRef();
  }

  /**
   * The notices that apply now: a plant fault of PV Assistant, a negative electricity price (dynamic tariff of
   * Tariffy), devices that have been running for hours and a base load well above the usual.
   */
  _alerts() {
    const out = [];
    const lang = this._hass?.language || "en";
    const ids = this._int?.pv_assistant?.entities;
    const fault = ids?.string_fault && this._hass?.states?.[ids.string_fault];
    if (fault?.state === "on") {
      const plants = Array.isArray(fault.attributes?.plants) && fault.attributes.plants.length ? `: ${fault.attributes.plants.join(", ")}` : "";
      out.push({ level: "warn", text: this._t("alFault", { plants }) });
    }
    const price = this._price();
    if (price && price.currency && price.value < 0) {
      const ct = (price.value * 100).toLocaleString(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      out.push({ level: "info", text: this._t("alNegPrice", { price: ct }) });
    }
    const running = (this._usage?.devices || [])
      .filter((d) => d.run >= LONG_RUN_MS && d.run < ALWAYS_RUN_MS)
      .sort((a, b) => b.run - a.run)
      .slice(0, 3);
    for (const d of running) {
      const [v, u] = fmtPower(d.nowW ?? 0);
      out.push({ level: "warn", text: this._t("alLongRun", { name: d.name, dur: this._duration(d.run / 3600000), power: `${v} ${u}` }) });
    }
    const now = this._baseline((this._history || []).map((p) => p.v));
    const ref = this._baseRef?.w;
    if (now != null && ref != null && now >= ref * 1.5 && now - ref >= 50) {
      out.push({ level: "warn", text: this._t("alBase", { now: Math.round(now).toLocaleString(lang), ref: Math.round(ref).toLocaleString(lang) }) });
    }
    return out;
  }

  _renderAlerts() {
    const list = this._alerts();
    if (!list.length) return "";
    return `<div class="eb-card fullrow"><div class="row"><span class="eb-title">${esc(this._t("alTitle"))}</span></div>
      ${list.map((a) => `<div class="alert${a.level === "info" ? " info" : ""}">${a.level === "info" ? "ℹ" : "⚠"} ${esc(a.text)}</div>`).join("")}</div>`;
  }

  /** The time zone of the Home Assistant instance; the browser's if it is unknown or not usable. */
  _tz() {
    const tz = this._hass?.config?.time_zone;
    if (!tz) return undefined;
    try {
      new Intl.DateTimeFormat("en", { timeZone: tz });
      return tz;
    } catch (e) {
      return undefined;
    }
  }

  /** The balance tab exists when at least one energy counter is configured. */
  _balEnabled() {
    return ENERGY_KEYS.some((k) => (this._cfg[k] || []).length > 0);
  }

  /**
   * The period of the balance in local time: a day (per hour), a week from Monday, a month (both per day)
   * or a calendar year (per month); `off` counts the periods back from now (0 = the current one).
   * `edges` are the starts of the buckets plus the end of the period.
   */
  _balWindow(range = this._balRange ?? "day", off = this._balOff ?? 0) {
    const tz = this._tz();
    const now = tzParts(Date.now(), tz);
    const y = now.y, m = now.m - 1, d = now.d;
    const weekday = new Date(Date.UTC(y, m, d)).getUTCDay();
    let start, end, bucket;
    if (range === "week") {
      const monday = d - ((weekday + 6) % 7) + off * 7;
      start = zonedTime(y, m, monday, 0, tz);
      end = zonedTime(y, m, monday + 7, 0, tz);
      bucket = "day";
    } else if (range === "month") {
      start = zonedTime(y, m + off, 1, 0, tz);
      end = zonedTime(y, m + off + 1, 1, 0, tz);
      bucket = "day";
    } else if (range === "year") {
      start = zonedTime(y + off, 0, 1, 0, tz);
      end = zonedTime(y + off + 1, 0, 1, 0, tz);
      bucket = "month";
    } else {
      start = zonedTime(y, m, d + off, 0, tz);
      end = zonedTime(y, m, d + off + 1, 0, tz);
      bucket = "hour";
    }
    const edges = [start];
    while (edges[edges.length - 1] < end) {
      const last = edges[edges.length - 1];
      const t = tzParts(last, tz);
      edges.push(bucket === "hour" ? last + 3600000
        : bucket === "day" ? zonedTime(t.y, t.m - 1, t.d + 1, 0, tz)
          : zonedTime(t.y, t.m, 1, 0, tz));
    }
    edges[edges.length - 1] = end;
    return { range, off, start, end, bucket, period: bucket, edges };
  }

  /** The changes of the counters per bucket and category (null where a category has no counter). */
  _balBuckets(win, res) {
    const n = win.edges.length - 1;
    const out = {};
    for (const [cat, key] of BAL_CATS) {
      const ids = this._cfg[key] || [];
      if (!ids.length) continue;
      const arr = Array(n).fill(null);
      for (const id of ids) {
        for (const row of res?.[id] || []) {
          const v = row.change;
          if (v == null || Number.isNaN(v)) continue;
          const t = typeof row.start === "number" ? row.start : Date.parse(row.start);
          let lo = 0, hi = n - 1, hit = -1;
          while (lo <= hi) { // the bucket with edges[i] <= t < edges[i + 1]
            const mid = (lo + hi) >> 1;
            if (t < win.edges[mid]) hi = mid - 1;
            else if (t >= win.edges[mid + 1]) lo = mid + 1;
            else { hit = mid; break; }
          }
          if (hit >= 0) arr[hit] = (arr[hit] ?? 0) + v;
        }
      }
      out[cat] = arr;
    }
    return out;
  }

  /**
   * Rows per bucket and the totals. The consumption is the measured house counter, otherwise
   * production + import + discharge − export − charge (it needs the import counter, like the live value).
   * Self-consumption is the part of the production that was not exported, self-sufficiency the part of the
   * consumption that did not come from the grid.
   */
  _balCompute(buckets, win) {
    const n = win.edges.length - 1;
    const rows = [];
    for (let i = 0; i < n; i++) {
      const g = (c) => (buckets[c] ? buckets[c][i] : null);
      const solar = g("solar"), imp = g("imp"), exp = g("exp"), chg = g("chg"), dis = g("dis");
      let cons = g("house");
      if (cons == null && buckets.imp && imp != null) cons = Math.max(0, (solar ?? 0) + imp + (dis ?? 0) - (exp ?? 0) - (chg ?? 0));
      rows.push({ t: win.edges[i], solar, imp, exp, chg, dis, cons });
    }
    const sum = (key) => (rows.some((r) => r[key] != null) ? rows.reduce((a, r) => a + (r[key] ?? 0), 0) : null);
    const totals = { solar: sum("solar"), imp: sum("imp"), exp: sum("exp"), chg: sum("chg"), dis: sum("dis"), cons: sum("cons") };
    const share = (v) => Math.max(0, Math.min(100, v));
    totals.self = totals.solar > 0 ? share(((totals.solar - (totals.exp ?? 0)) / totals.solar) * 100) : null;
    totals.autarky = totals.cons > 0 && totals.imp != null ? share(((totals.cons - totals.imp) / totals.cons) * 100) : null;
    return { rows, totals };
  }

  async _balFetch(win) {
    const ids = [...new Set(BAL_CATS.flatMap(([, key]) => this._cfg[key] || []))];
    if (!ids.length) return {};
    try {
      return await this._hass.callWS({
        type: "recorder/statistics_during_period",
        start_time: new Date(win.start).toISOString(),
        end_time: new Date(win.end).toISOString(),
        statistic_ids: ids,
        period: win.period,
        types: ["change"],
        units: { energy: "kWh" },
      });
    } catch (e) {
      console.info("Energy Assistant: could not load the statistics", e);
      return null;
    }
  }

  /** (Re)load the balance when the period changed or the data is older than five minutes. */
  _maybeLoadBalance() {
    if (!this._ready || this._balLoading) return;
    const b = this._bal;
    if (!b || b.range !== (this._balRange ?? "day") || b.off !== (this._balOff ?? 0) || Date.now() - b.at > 5 * 60 * 1000) this._loadBalance();
  }

  async _loadBalance() {
    if (!this._hass || this._balLoading) return;
    this._balLoading = true;
    const range = this._balRange ?? "day", off = this._balOff ?? 0;
    try {
      const win = this._balWindow(range, off), prev = this._balWindow(range, off - 1);
      const [cur, old] = await Promise.all([this._balFetch(win), this._balFetch(prev)]);
      const data = this._balCompute(this._balBuckets(win, cur || {}), win);
      const before = old ? this._balCompute(this._balBuckets(prev, old), prev).totals : null;
      this._bal = { range, off, win, ...data, before, failed: cur == null, at: Date.now() };
    } finally {
      this._balLoading = false;
      this._render();
    }
  }

  /** Label of the period: the date, the week, the month or the year. */
  _balLabel(win) {
    const lang = this._hass?.language || "en";
    const tz = this._tz();
    const fmt = (t, o) => new Date(t).toLocaleDateString(lang, { ...o, timeZone: tz });
    if (win.range === "week") return `${fmt(win.start, { day: "numeric", month: "short" })} – ${fmt(win.end - 1, { day: "numeric", month: "short", year: "numeric" })}`;
    if (win.range === "month") return fmt(win.start, { month: "long", year: "numeric" });
    if (win.range === "year") return String(tzParts(win.start, tz).y);
    return fmt(win.start, { weekday: "short", day: "numeric", month: "long", year: "numeric" });
  }

  /** Short label of a bucket on the axis ("" where the label is left out) and the full one for the table. */
  _balTick(win, i) {
    const lang = this._hass?.language || "en";
    const tz = this._tz();
    const d = new Date(win.edges[i]);
    if (win.bucket === "hour") return tzParts(win.edges[i], tz).h % 3 === 0 ? d.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit", timeZone: tz }) : "";
    if (win.bucket === "month") return d.toLocaleDateString(lang, { month: "short", timeZone: tz });
    return win.range === "week" ? d.toLocaleDateString(lang, { weekday: "short", day: "numeric", timeZone: tz }) : String(tzParts(win.edges[i], tz).d);
  }

  _balRowLabel(win, i) {
    const lang = this._hass?.language || "en";
    const tz = this._tz();
    const d = new Date(win.edges[i]);
    if (win.bucket === "hour") return d.toLocaleString(lang, { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit", timeZone: tz });
    if (win.bucket === "month") return d.toLocaleDateString(lang, { month: "long", year: "numeric", timeZone: tz });
    return d.toLocaleDateString(lang, { weekday: "short", day: "numeric", month: "numeric", timeZone: tz });
  }

  /**
   * The period picker of a tab: day, week, month or year and arrows with the label of the period (the next
   * period is off for the current one). `kind` is the prefix of the data attributes ("b" balance, "u"
   * consumption).
   */
  _rangePicker(kind, range, off, win) {
    return `<div class="bpick"><div class="segs">${["day", "week", "month", "year"]
      .map((r) => `<button type="button" class="seg${r === range ? " on" : ""}" data-${kind}range="${r}">${esc(this._t({ day: "bDay", week: "bWeek", month: "bMonth", year: "bYear" }[r]))}</button>`).join("")}</div>
      <div class="nav"><button type="button" class="seg" data-${kind}nav="-1" aria-label="${esc(this._t("bPrev"))}">‹</button>
        <span class="lab">${esc(this._balLabel(win))}</span>
        <button type="button" class="seg" data-${kind}nav="1" aria-label="${esc(this._t("bNext"))}" ${off >= 0 ? "disabled" : ""}>›</button></div></div>`;
  }

  /** The balance tab: range picker, totals with the change to the period before, costs and the bar chart. */
  _renderBalance() {
    if (!this._ready) return `<div class="eb-card"><div class="empty">${this._t("loading")}</div></div>`;
    const lang = this._hass?.language || "en";
    const range = this._balRange ?? "day", off = this._balOff ?? 0;
    const b = this._bal;
    const win = b?.win && b.range === range && b.off === off ? b.win : this._balWindow(range, off);
    const picker = this._rangePicker("b", range, off, win);
    const head = `<div class="row"><span class="eb-title">${esc(this._t("balTitle"))}</span>${this._balLoading ? `<span class="eb-label">…</span>` : ""}</div>${picker}`;
    if (!b || b.range !== range || b.off !== off) return `<div class="stack"><div class="eb-card">${head}<div class="empty">${this._t("loading")}</div></div></div>`;
    if (b.failed) return `<div class="stack"><div class="eb-card">${head}<div class="empty">${this._t("bNoData")}</div></div></div>`;
    const t = b.totals, prev = b.before;
    const kwh = (v) => v.toLocaleString(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const tile = (label, value, unit, extra = "") => `<div class="eb-tile"><div class="eb-label">${esc(label)}</div><div class="eb-value">${value}<small>${esc(unit)}</small></div>${extra}</div>`;
    const delta = (cur, before) => {
      if (before == null || !(before > 0) || cur == null) return "";
      const pct = Math.round(((cur - before) / before) * 100);
      const arrow = pct > 0 ? "▲" : pct < 0 ? "▼" : "•";
      return `<div class="eb-label" style="margin-top:2px;text-transform:none;letter-spacing:0">${esc(this._t("bVsPrev", { arrow, pct: Math.abs(pct) }))}</div>`;
    };
    const tiles = [];
    for (const [key, label] of [["solar", "bSolar"], ["cons", "bHouse"], ["imp", "bImport"], ["exp", "bExport"], ["chg", "bCharge"], ["dis", "bDischarge"]]) {
      if (t[key] != null) tiles.push(tile(this._t(label), kwh(t[key]), "kWh", delta(t[key], prev?.[key])));
    }
    if (t.autarky != null) tiles.push(tile(this._t("bAutarky"), Math.round(t.autarky), "%", delta(t.autarky, prev?.autarky)));
    if (t.self != null) tiles.push(tile(this._t("bSelf"), Math.round(t.self), "%", delta(t.self, prev?.self)));
    // Money: valued with the price of the Tariffy contract (the average of a dynamic tariff, not the live price).
    const tariffy = this._int?.tariffy;
    const priceState = tariffy?.price && this._hass?.states?.[tariffy.price];
    const price = priceState ? parseFloat(priceState.state) : NaN;
    const feed = this._feedInTariff();
    let money = "";
    if (!Number.isNaN(price) && t.imp != null) {
      const currency = String(priceState.attributes?.unit_of_measurement || "EUR/kWh").split("/")[0] || "EUR";
      const m = (label, amount) => {
        const [n, sym] = this._money(amount, currency);
        return tile(this._t(label), n, sym);
      };
      const cost = t.imp * price, revenue = t.exp != null && feed != null ? t.exp * feed : null;
      tiles.push(m("bCost", cost));
      if (revenue != null) {
        tiles.push(m("bRevenue", revenue));
        tiles.push(m("bSaldo", revenue - cost));
      }
      money = `<div class="hint">${esc(this._t("bPriceNote"))}</div>`;
    }
    const first = `<div class="eb-card">${head}${tiles.length ? `<div class="tiles">${tiles.join("")}</div>${money}` : `<div class="empty">${this._t("bNoData")}</div>`}</div>`;
    return `<div class="stack">${first}${this._balanceChart(b)}</div>`;
  }

  /** Grouped bars per bucket (production, consumption, import, export) with a title tooltip and the table. */
  _balanceChart(b) {
    const lang = this._hass?.language || "en";
    const rows = b.rows, win = b.win;
    const defs = [
      { key: "solar", name: this._t("bSolar"), color: "--ea-prod" },
      { key: "cons", name: this._t("bHouse"), color: "--ea-house" },
      { key: "imp", name: this._t("bImport"), color: "--ea-grid" },
      { key: "exp", name: this._t("bExport"), color: "--ea-feed" },
    ].filter((d) => rows.some((r) => r[d.key] != null));
    const values = rows.flatMap((r) => defs.map((d) => r[d.key] ?? 0));
    const title = `<div class="row"><span class="eb-title">${esc(this._t("balChart"))}</span><span class="eb-label">kWh</span></div>`;
    if (!defs.length || !values.some((v) => v > 0)) return `<div class="eb-card">${title}<div class="empty">${this._t("bNoData")}</div></div>`;
    this._balW = this._balW || 900;
    const W = Math.max(280, Math.round(this._balW)), H = 260;
    const M = { l: 52, r: 8, t: 10, b: 24 };
    const pw = W - M.l - M.r, ph = H - M.t - M.b;
    const ticks = this._niceTicks(0, Math.max(...values, 0.1));
    const hi = ticks[ticks.length - 1];
    const n = rows.length;
    const slot = pw / n, gap = 1.5;
    const barW = Math.max(1.5, (slot - 4 - gap * (defs.length - 1)) / defs.length);
    const y = (v) => M.t + (1 - v / hi) * ph;
    const f1 = (v) => v.toFixed(1);
    const num = (v, d = 2) => v.toLocaleString(lang, { minimumFractionDigits: d, maximumFractionDigits: d });
    let svg = "";
    for (const v of ticks) {
      svg += `<line x1="${M.l}" x2="${M.l + pw}" y1="${f1(y(v))}" y2="${f1(y(v))}" class="${v === 0 ? "haxis" : "hgrid"}"/>`;
      svg += `<text class="htick" x="${M.l - 6}" y="${f1(y(v) + 4)}" text-anchor="end">${v.toLocaleString(lang, { maximumFractionDigits: 2 })}</text>`;
    }
    const every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(pw / 46))));
    rows.forEach((r, i) => {
      const x0 = M.l + i * slot;
      defs.forEach((d, j) => {
        const v = r[d.key];
        if (v != null && v > 0) svg += `<rect x="${f1(x0 + 2 + j * (barW + gap))}" y="${f1(y(v))}" width="${f1(barW)}" height="${f1(y(0) - y(v))}" fill="var(${d.color})" rx="1"/>`;
      });
      const label = this._balTick(win, i);
      if (label && i % every === 0) svg += `<text class="htick" x="${f1(x0 + slot / 2)}" y="${H - 6}" text-anchor="middle">${esc(label)}</text>`;
      const tip = [this._balRowLabel(win, i), ...defs.map((d) => `${d.name}: ${r[d.key] == null ? "–" : `${num(r[d.key])} kWh`}`)].map(esc).join("&#10;");
      svg += `<rect x="${f1(x0)}" y="${M.t}" width="${f1(slot)}" height="${ph}" fill="transparent"><title>${tip}</title></rect>`;
    });
    const legend = defs.map((d) => `<span><i style="background:var(${d.color})"></i>${esc(d.name)}</span>`).join("");
    const sumRow = `<tr><th>${esc(this._t("bSum"))}</th>${defs.map((d) => `<td>${num(rows.reduce((a, r) => a + (r[d.key] ?? 0), 0))}</td>`).join("")}</tr>`;
    const table = rows.map((r, i) => `<tr><th>${esc(this._balRowLabel(win, i))}</th>${defs.map((d) => `<td>${r[d.key] == null ? "–" : num(r[d.key])}</td>`).join("")}</tr>`).join("");
    return `<div class="eb-card">${title}<div class="hchart"><div class="legend">${legend}</div>
      <div class="chartwrap bwrap"><svg class="hsvg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(this._t("balChart"))}">${svg}</svg></div>
      <details class="tableview"${this._balTableOpen ? " open" : ""}><summary>${esc(this._t("hTable"))}</summary>
        <table><tr><th>${esc(this._t("bTime"))}</th>${defs.map((d) => `<th>${esc(d.name)} (kWh)</th>`).join("")}</tr>${table}${sumRow}</table></details></div></div>`;
  }

  /** After a redraw of the balance: one redraw at the real width of the chart, and the state of the table. */
  _wireBalance(content) {
    const wrap = content.querySelector?.(".bwrap");
    if (!wrap) return;
    const box = Math.max(280, Math.round(wrap.clientWidth || 0));
    if (wrap.clientWidth && Math.abs(box - (this._balW || 900)) > 24) {
      this._balW = box;
      this._html = null;
      this._render();
      return;
    }
    const details = content.querySelector("details.tableview");
    if (details) details.addEventListener("toggle", () => { this._balTableOpen = details.open; });
  }

  /** Time of an ISO timestamp state as hh:mm in the local format (null if it is not a time). */
  _time(value) {
    const d = value && !["unknown", "unavailable"].includes(value) ? new Date(value) : null;
    return d && !Number.isNaN(d.getTime()) ? d.toLocaleTimeString(this._hass?.language || "en", { hour: "2-digit", minute: "2-digit", timeZone: this._tz() }) : null;
  }

  /**
   * PV day figures and forecast of PV Assistant (read only): production, feed-in, self-consumption,
   * self-sufficiency, forecast reached and benefit of today; expected feed-in and best window of tomorrow;
   * usable storage energy and when it is empty; a warning for a plant fault. Empty without PV Assistant
   * or without any value.
   */
  _renderPvDay() {
    const ids = this._int?.pv_assistant?.entities;
    if (!ids) return "";
    const lang = this._hass?.language || "en";
    const state = (key) => (ids[key] ? this._hass?.states?.[ids[key]] : null);
    const num = (key) => this._num(ids[key]);
    const tile = (label, value, unit = "") => `<div class="eb-tile"><div class="eb-label">${esc(label)}</div><div class="eb-value">${value}${unit ? `<small>${esc(unit)}</small>` : ""}</div></div>`;
    const fixed = (v, d) => v.toLocaleString(lang, { minimumFractionDigits: d, maximumFractionDigits: d });
    const today = [];
    const add = (list, label, key, unit, digits) => {
      const v = num(key);
      if (v != null) list.push(tile(label, fixed(v, digits), unit));
    };
    add(today, this._t("dProduction"), "production_today", "kWh", 1);
    add(today, this._t("dFeedIn"), "feed_in_today", "kWh", 1);
    add(today, this._t("dSelf"), "self_consumption_rate_today", "%", 0);
    add(today, this._t("dAutarky"), "autarky_today", "%", 0);
    add(today, this._t("dForecast"), "forecast_reached_today", "%", 0);
    const benefit = num("benefit_today");
    if (benefit != null) {
      const [n, sym] = this._money(benefit, state("benefit_today")?.attributes?.unit_of_measurement || "EUR");
      today.push(tile(this._t("dBenefit"), n, sym));
    }
    const tomorrow = [];
    add(tomorrow, this._t("dExpected"), "expected_feed_in_tomorrow", "kWh", 1);
    const start = this._time(state("best_window_tomorrow")?.state);
    if (start) {
      const end = this._time(state("best_window_tomorrow")?.attributes?.end);
      tomorrow.push(tile(this._t("dWindow"), esc(end ? `${start}–${end}` : start)));
    }
    const storage = [];
    add(storage, this._t("dStorage"), "storage_usable", "kWh", 1);
    const empty = this._time(state("storage_empty_at")?.state);
    if (empty) storage.push(tile(this._t("dEmptyAt"), esc(empty)));
    const fault = state("string_fault");
    const plants = Array.isArray(fault?.attributes?.plants) ? fault.attributes.plants.join(", ") : "";
    const alert = fault?.state === "on" ? `<div class="alert">⚠ ${esc(this._t("dFault"))}${plants ? `: ${esc(plants)}` : ""}</div>` : "";
    if (!today.length && !tomorrow.length && !storage.length && !alert) return "";
    const block = (title, tiles) => (tiles.length ? `<div class="eb-label costs">${esc(title)}</div><div class="tiles">${tiles.join("")}</div>` : "");
    return `<div class="eb-card fullrow"><div class="row"><span class="eb-title">${esc(this._t("pvDayTitle"))}</span></div>
      ${alert}${block(this._t("pvToday"), today)}${block(this._t("dStorageTitle"), storage)}${block(this._t("pvTomorrow"), tomorrow)}</div>`;
  }

  /** Value of a state as number (null if missing, unknown or not a number). */
  _num(entityId) {
    const s = entityId && this._hass?.states?.[entityId];
    const v = s ? parseFloat(s.state) : NaN;
    return Number.isNaN(v) ? null : v;
  }

  /**
   * Wallbox and vehicle of EV Assistant (read only): live status and power, charge level, solar share,
   * what was charged today and the advice to charge before the PV production starts. One row of tiles
   * per vehicle; empty without EV Assistant or without any value.
   */
  _renderEv() {
    const vehicles = this._int?.ev_assistant?.vehicles;
    if (!Array.isArray(vehicles) || !vehicles.length) return "";
    const lang = this._hass?.language || "en";
    const tile = (label, value, unit = "") => `<div class="eb-tile"><div class="eb-label">${esc(label)}</div><div class="eb-value">${value}${unit ? `<small>${esc(unit)}</small>` : ""}</div></div>`;
    const blocks = vehicles.map((v) => {
      const attrs = this._hass?.states?.[v.live]?.attributes || {};
      // Live data: with evcc "evcc_live", otherwise "home_generic_live". charge_power is in kW.
      const live = attrs.evcc_live || attrs.home_generic_live || null;
      const tiles = [];
      if (live) {
        const kw = Number(live.charge_power);
        const charging = live.charging === true || (Number.isFinite(kw) && kw > 0.05);
        if (charging && Number.isFinite(kw)) {
          const [val, unit] = fmtPower(kw * 1000);
          tiles.push(tile(v.name, val, unit));
        } else {
          tiles.push(tile(v.name, esc(this._t(live.connected ? "evConnected" : "evIdle"))));
        }
        const soc = Number(live.vehicle_soc);
        if (live.vehicle_soc != null && Number.isFinite(soc)) tiles.push(tile(this._t("evSoc"), Math.round(soc), "%"));
        const solar = Number(live.session_solar_pct ?? attrs.solaranteil_pct);
        if (charging && (live.session_solar_pct != null || attrs.solaranteil_pct != null) && Number.isFinite(solar)) tiles.push(tile(this._t("evSolar"), Math.round(solar), "%"));
      }
      const kwh = this._num(v.kwh_today);
      if (kwh != null) tiles.push(tile(this._t("evToday"), kwh.toLocaleString(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 }), "kWh"));
      const cost = this._num(v.cost_today);
      if (cost != null) {
        const unit = this._hass?.states?.[v.cost_today]?.attributes?.unit_of_measurement || "EUR";
        const [n, sym] = this._money(cost, unit);
        tiles.push(tile(this._t("evCostToday"), n, sym));
      }
      if (!tiles.length) return "";
      const advice = v.recommend && this._hass?.states?.[v.recommend]?.state === "on" ? `<div class="hint">☀ ${esc(this._t("evAdvice"))}</div>` : "";
      return `<div class="tiles">${tiles.join("")}</div>${advice}`;
    }).join("");
    return blocks ? `<div class="eb-card"><div class="row"><span class="eb-title">${esc(this._t("evWallbox"))}</span></div>${blocks}</div>` : "";
  }

  /** [number, symbol] of an amount, with the currency symbol of the locale where known. */
  _money(v, currency, digits = 2) {
    const lang = this._hass?.language || "en";
    let symbol = currency;
    try {
      symbol = new Intl.NumberFormat(lang, { style: "currency", currency }).formatToParts(0).find((p) => p.type === "currency")?.value || currency;
    } catch (e) { /* unknown currency code: keep the code */ }
    return [v.toLocaleString(lang, { minimumFractionDigits: digits, maximumFractionDigits: digits }), symbol];
  }

  /**
   * Money flows right now (needs Tariffy): what the grid import costs, what the feed-in earns and what
   * the directly used solar power saves, each per hour. Empty without Tariffy or without a price.
   */
  _renderCosts(cur) {
    const price = this._price();
    if (!price) return "";
    const feedIn = this._feedInTariff();
    const kw = (w) => (w == null ? null : w / 1000);
    const perHour = (w, rate) => (w == null || rate == null ? null : kw(w) * rate);
    const tiles = [];
    const tile = (label, value, unit) => `<div class="eb-tile"><div class="eb-label">${esc(label)}</div><div class="eb-value">${value}<small>${esc(unit)}</small></div></div>`;
    const priceDisplay = price.currency === "EUR"
      ? [(price.value * 100).toLocaleString(this._hass?.language || "en", { minimumFractionDigits: 1, maximumFractionDigits: 1 }), "ct/kWh"]
      : [price.value.toLocaleString(this._hass?.language || "en", { maximumFractionDigits: 4 }), `${price.currency}/kWh`];
    tiles.push(tile(this._t("tPrice"), priceDisplay[0], priceDisplay[1]));
    const money = (label, amount) => {
      if (amount == null) return;
      const [n, sym] = this._money(amount, price.currency);
      tiles.push(tile(label, n, `${sym}/h`));
    };
    money(this._t("tGridCost"), perHour(cur.gridIn, price.value));
    money(this._t("tFeedIn"), perHour(cur.gridOut, feedIn));
    money(this._t("tPvSaves"), perHour(cur.direct, price.value));
    return `<div class="eb-card"><div class="row"><span class="eb-title">${esc(this._t("costsNow"))}</span></div><div class="tiles">${tiles.join("")}</div></div>`;
  }

  /** Contract figures of Tariffy: cost so far, balance so far and the forecast for the contract end. */
  _renderContract() {
    const t = this._int?.tariffy;
    if (!t) return "";
    const tiles = [];
    for (const [label, key] of [["tCostSoFar", "cost_so_far"], ["tBalance", "balance"], ["tForecast", "forecast"]]) {
      const v = this._num(t[key]);
      if (v == null) continue;
      const [n, sym] = this._money(v, this._hass?.states?.[t[key]]?.attributes?.unit_of_measurement || "EUR");
      tiles.push(`<div class="eb-tile"><div class="eb-label">${esc(this._t(label))}</div><div class="eb-value">${n}<small>${esc(sym)}</small></div></div>`);
    }
    return tiles.length ? `<div class="eb-card"><div class="row"><span class="eb-title">${esc(this._t("tContract"))}</span></div><div class="tiles">${tiles.join("")}</div></div>` : "";
  }

  /**
   * Optional link to the PV Assistant integration (weskona/pv-assistant). The backend reads its
   * configuration (never changes it) and says which sensors fit which settings, and how the PV sensors
   * group into plants. Without PV Assistant the answer is null and nothing changes.
   */
  async _loadPv() {
    if (this._pvLoading || !this._hass) return;
    this._pvLoading = true;
    try {
      const res = await this._hass.callWS({ type: "energy_assistant/pv_suggestion" });
      const targets = res?.targets && typeof res.targets === "object" ? res.targets : {};
      this._pv = Object.keys(targets).length
        ? { targets, notes: res.notes || {}, plants: Array.isArray(res.plants) ? res.plants : [] }
        : null;
    } catch (e) {
      console.info("Energy Assistant: could not ask for PV Assistant", e);
      this._pv = null;
    } finally {
      this._pvLoading = false;
      this._settingsDirty = true;
      this._render();
    }
  }

  /** What "take over" puts into the settings form (only fields PV Assistant has an answer for). */
  _pvTargets() {
    return this._pv.targets;
  }

  _pvApplied() {
    const same = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
    return Object.entries(this._pvTargets()).every(([k, v]) => (typeof v === "boolean" ? !!this._draft[k] === v : typeof v === "number" ? this._draft[k] === v : same(v, this._draftList(k))));
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
    for (const k of NUMBER_KEYS) out[k] = typeof cfg[k] === "number" && Number.isFinite(cfg[k]) ? cfg[k] : null;
    out.device_names = { ...(cfg.device_names || {}) };
    return out;
  }

  _draftList(key) {
    const v = this._draft?.[key];
    return key === "house_power" ? (v ? [v] : []) : v || [];
  }

  _draftAdd(key, id, mode) {
    if (key === "house_power") this._draft.house_power = id;
    else if (mode === "single" || mode === "soc") this._draft[key] = [id];
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
  /** Charge level sensors for the datalist: battery sensors and sensors in percent. */
  _socCandidates() {
    const states = this._hass?.states || {};
    return Object.entries(states)
      .filter(([id, st]) => id.startsWith("sensor.") && (st.attributes?.device_class === "battery" || st.attributes?.unit_of_measurement === "%"))
      .map(([id, st]) => ({ id, name: st.attributes.friendly_name || id }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Energy counters for the datalist: sensors with the device class energy. */
  _energyCandidates() {
    const states = this._hass?.states || {};
    return Object.entries(states)
      .filter(([id, st]) => id.startsWith("sensor.") && st.attributes?.device_class === "energy")
      .map(([id, st]) => ({ id, name: st.attributes.friendly_name || id }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

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
    } else if (e.target.closest("[data-brange]")) {
      this._balRange = e.target.closest("[data-brange]").dataset.brange;
      this._balOff = 0;
      this._render();
    } else if (e.target.closest("[data-urange]")) {
      this._usRange = e.target.closest("[data-urange]").dataset.urange;
      this._usOff = 0;
      this._render();
    } else if (e.target.closest("[data-unav]")) {
      const next = (this._usOff ?? 0) + Number(e.target.closest("[data-unav]").dataset.unav);
      if (next <= 0) {
        this._usOff = next;
        this._render();
      }
    } else if (e.target.closest("[data-bnav]")) {
      const next = (this._balOff ?? 0) + Number(e.target.closest("[data-bnav]").dataset.bnav);
      if (next <= 0) {
        this._balOff = next;
        this._render();
      }
    } else if (e.target.closest("[data-energyapply]") && this._isAdmin && this._energyOffer) {
      Object.assign(this._draft, Object.fromEntries(Object.entries(this._energyOffer.targets).map(([k, v]) => [k, [...v]])));
      this._edited();
    } else if (e.target.closest("[data-pvapply]") && this._isAdmin && this._pv) {
      Object.assign(this._draft, this._pvTargets());
      this._edited();
    } else if (e.target.closest("[data-collapse-toggle]")) {
      this._toggleCollapse(e.target.closest("[data-collapse-toggle]"));
    } else if (e.target.closest("[data-open]")) {
      // Click on an area or label row: show or hide the sensors it sums up.
      const key = e.target.closest("[data-open]").dataset.open;
      this._open = this._open || new Set();
      if (!this._open.delete(key)) this._open.add(key);
      this._render();
    } else if (e.target.closest("[data-ustoptoggle]")) {
      this._usTopExpanded = !this._usTopExpanded;
      this._render();
    } else if (e.target.closest("[data-usalwaystoggle]")) {
      this._usAlwaysExpanded = !this._usAlwaysExpanded;
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
    } else if (t.dataset?.num) {
      // A number (kWh, %): empty or unusable means not set.
      const raw = t.value.trim().replace(",", ".");
      const n = raw === "" ? NaN : Number(raw);
      this._draft[t.dataset.num] = Number.isFinite(n) && n >= 0 ? n : null;
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
    const energyOptions = this._energyCandidates().map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
    const socOptions = this._socCandidates().map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
    const field = ([key, kind]) => {
      if (kind === "energyoffer") return this._renderEnergyOffer(ro);
      const label = this._t(`f_${key}`);
      if (kind === "number") {
        const v = this._draft[key];
        return `<div class="fld"><label>${esc(label)}</label><input type="number" min="0" step="any" inputmode="decimal" data-num="${key}" value="${v == null ? "" : esc(String(v))}" ${ro ? "disabled" : ""}></div>`;
      }
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
        ${ro ? "" : `<input type="text" data-add="${key}" data-mode="${kind}" ${kind === "text" ? "" : kind === "emulti" ? 'list="eb-energy"' : kind === "soc" ? 'list="eb-soc"' : 'list="eb-sensors"'} placeholder="${esc(this._t(kind === "text" ? (key === "device_exclude_patterns" ? "addExcludePattern" : "addPattern") : "addSensor"))}" autocomplete="off">`}${err}</div>`;
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
    return `<datalist id="eb-sensors">${options}</datalist><datalist id="eb-energy">${energyOptions}</datalist><datalist id="eb-soc">${socOptions}</datalist>
      <div class="set">${this._renderIntegrations(ro)}<div class="grid">${sections}</div>
      ${ro ? `<div class="bar2">${msg}</div>` : `<div class="bar2">
        <button class="btn" data-save ${this._saveDisabled() ? "disabled" : ""}>${this._t("save")}</button>
        <button class="btn ghost" data-discard ${dirty ? "" : "disabled"}>${this._t("discard")}</button>${msg}</div>`}</div>`;
  }

  /** The offer of the Energy dashboard in the energy section: hint, question and the button (admins only). */
  _renderEnergyOffer(ro) {
    const offer = this._energyOffer?.targets;
    const hint = `<div class="hint">${esc(this._t("energyHint"))}</div>`;
    if (!offer || !Object.keys(offer).length) return `<div class="fld span">${hint}</div>`;
    const same = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
    const done = Object.entries(offer).every(([k, v]) => same(v, this._draftList(k)));
    return `<div class="fld span">${hint}<p class="pvq">${esc(done ? this._t("energyDone") : this._t("energyAsk"))}</p>
      ${done || ro ? "" : `<div class="bar2"><button type="button" class="btn" data-energyapply>${esc(this._t("energyApply"))}</button><span class="hint">${esc(this._t("energyOverwrite"))}</span></div>`}</div>`;
  }

  /**
   * Notice at the top of the settings: which sibling integrations were found (PV Assistant, Tariffy,
   * EV Assistant, Amortix) and what Energy Assistant uses from them. For PV Assistant it also asks
   * whether to take over its sensors. Empty if none was found.
   */
  _renderIntegrations(ro) {
    const found = this._int || {};
    const others = [];
    if (found.pv_assistant) others.push(this._t("intPvData"));
    if (found.tariffy) others.push(this._t("intTariffy"));
    const vehicles = found.ev_assistant?.vehicles;
    if (Array.isArray(vehicles) && vehicles.length) others.push(this._t("intEv", { n: vehicles.map((v) => v.name).join(", ") }));
    if (Array.isArray(found.amortix?.entries) && found.amortix.entries.length) others.push(this._t("intAmortix"));
    const pvPart = this._pv ? this._renderPvOffer(ro) : "";
    if (!pvPart && !others.length) return "";
    return `<div class="eb-card pvnote"><div class="eb-title">${esc(this._t("intTitle"))}</div>${pvPart}
      ${others.length ? `<ul class="ints">${others.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>` : ""}</div>`;
  }

  /** The PV Assistant part of the notice: the question, what would be taken over and the button. */
  _renderPvOffer(ro) {
    const t = this._pv.targets;
    const n = (key) => (t[key] || []).length;
    const parts = [];
    if (n("battery_power")) parts.push(this._t("pvCombined", { n: n("battery_power") }));
    if (n("battery_charge")) parts.push(this._t("pvCharge", { n: n("battery_charge") }));
    if (n("battery_discharge")) parts.push(this._t("pvDischarge", { n: n("battery_discharge") }));
    const gridParts = [];
    if (n("grid_import")) gridParts.push(this._t("pvImport", { n: n("grid_import") }));
    if (n("grid_export")) gridParts.push(this._t("pvExport", { n: n("grid_export") }));
    if (n("grid_power")) gridParts.push(this._t("pvCombined", { n: n("grid_power") }));
    const lines = [
      n("solar_power") ? this._t("pvSolar", { n: n("solar_power") }) : "",
      parts.length ? this._t("pvStorage", { parts: parts.join(", ") }) : "",
      gridParts.length ? this._t("pvGrid", { parts: gridParts.join(", ") }) : "",
      n("battery_soc") ? this._t("pvSoc", { cap: typeof t.battery_capacity === "number" ? `, ${t.battery_capacity.toLocaleString(this._hass?.language || "en")} kWh` : "" }) : "",
    ].filter(Boolean);
    const done = this._pvApplied();
    return `<p class="pvq">${esc(done ? this._t("pvDone") : this._t("pvAsk"))}</p>
      <ul>${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
      ${this._pv.notes.feed_in_negative ? `<div class="hint">${esc(this._t("pvFeedInfo"))}</div>` : ""}
      ${this._pv.notes.storage_absolute ? `<div class="hint">${esc(this._t("pvAbsInfo"))}</div>` : ""}
      ${done || ro ? "" : `<div class="bar2"><button type="button" class="btn" data-pvapply>${esc(this._t("pvApply"))}</button><span class="hint">${esc(this._t("pvOverwrite"))}</span></div>`}`;
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

  /** Sum that ignores negative readings of single sensors (production, import and export cannot be negative). */
  _sumPos(ids) {
    const vals = (ids || []).map((id) => this._watts(id)).filter((v) => v != null);
    return vals.length ? vals.reduce((a, b) => a + Math.max(0, b), 0) : null;
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
    // Separate sensors win over the combined one: a combined meter often shows the same flow again, adding
    // both would count it twice. The combined sensor only fills in what no separate sensor covers.
    const pick = (separate, combined) => (separate != null ? separate : combined);
    const pos = (v) => (v == null ? null : Math.max(0, v));
    const neg = (v) => (v == null ? null : Math.max(0, -v));
    return {
      solar,
      gridIn: pick(gridIn, pos(grid)),
      gridOut: pick(gridOut, neg(grid)),
      discharge: pick(discharge, pos(battery)),
      charge: pick(charge, neg(battery)),
      gridCharge,
    };
  }

  /** Aktuelle Werte in W: house, solar, gridIn, gridOut, discharge, charge. */
  _current() {
    const c = this._cfg;
    const parts = this._split({
      solar: this._sumPos(c.solar_power),
      gridIn: this._sumPos(c.grid_import),
      gridOut: this._sumPos(c.grid_export),
      discharge: this._sumAbs(c.battery_discharge),
      charge: this._sumAbs(c.battery_charge),
      gridCharge: this._sum(c.battery_grid_charge),
      grid: this._signed(c.grid_power, c.invert_grid),
      battery: this._signed(c.battery_power, c.invert_battery),
    });
    const house = c.house_power ? this._watts(c.house_power) : this._calcHouse(parts);
    // Self-sufficiency right now: the share of the consumption that does not come from the grid.
    const autarky = house != null && house > 0 && parts.gridIn != null ? Math.max(0, Math.min(100, ((house - parts.gridIn) / house) * 100)) : null;
    return { house, direct: this._calcDirect(parts, house), autarky, ...parts };
  }
  /** Individual devices with their current power in W, highest first. */
  /** Display name of a sensor in the lists: the own name if one is set, else the friendly name. */
  _deviceName(id) {
    return this._cfg.device_names?.[id] || this._hass?.states?.[id]?.attributes?.friendly_name || id;
  }

  /** The sensors of the device list: the single ones plus the ones the name patterns find. */
  _deviceIds() {
    const explicit = [...(this._cfg.device_power || []), ...(this._cfg.device_standby || [])];
    return [...new Set([...explicit, ...this._discoverDevices(this._cfg.device_patterns, this._cfg)])];
  }

  _devices() {
    const ids = this._deviceIds();
    const sensors = ids
      .map((id) => ({
        id,
        name: this._deviceName(id),
        original: this._hass?.states?.[id]?.attributes?.friendly_name || id,
        w: this._watts(id),
      }))
      .filter((d) => d.w != null);
    return [...sensors, ...this._evRows(ids)].sort((a, b) => b.w - a.w);
  }

  /**
   * The wallbox of EV Assistant as a row of the device list (read only): its charging power is usually the
   * biggest single consumer and is not a sensor of the list. Left out when the wallbox sensor is already a
   * device or was excluded on purpose, so nothing is counted twice or against the wish of the user.
   */
  _evRows(deviceIds = []) {
    const vehicles = this._int?.ev_assistant?.vehicles;
    if (!Array.isArray(vehicles)) return [];
    const excluded = this._excluder(this._cfg);
    const rows = [];
    for (const v of vehicles) {
      if (v.wallbox_power && (deviceIds.includes(v.wallbox_power) || excluded(v.wallbox_power))) continue;
      const attrs = this._hass?.states?.[v.live]?.attributes || {};
      const live = attrs.evcc_live || attrs.home_generic_live;
      const kw = Number(live?.charge_power);
      if (!live || live.charge_power == null || !Number.isFinite(kw)) continue;
      const solar = Number(live.session_solar_pct ?? attrs.solaranteil_pct);
      const charging = kw * 1000 >= IDLE_W;
      rows.push({
        name: `${this._t("evWallbox")} · ${v.name}`,
        icon: "mdi:ev-station",
        w: Math.max(0, kw * 1000),
        tip: charging && (live.session_solar_pct != null || attrs.solaranteil_pct != null) && Number.isFinite(solar) ? `${this._t("evSolar")} ${Math.round(solar)} %` : "",
      });
    }
    return rows;
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

  /**
   * Where the solar production goes, in whole percent that add up to 100: straight to the house, into the
   * storage (solar share of the charging) and into the grid. Parts that round to 0 % are left out, the house
   * part always stays. Null without production.
   */
  _pvSplit({ solar, gridOut, charge, gridCharge }, direct) {
    if (solar == null || !(solar > 0) || direct == null) return null;
    const parts = [
      { key: "house", w: Math.max(0, direct) },
      { key: "storage", w: Math.max(0, (charge ?? 0) - (gridCharge ?? 0)) },
      { key: "grid", w: Math.max(0, gridOut ?? 0) },
    ];
    const total = parts.reduce((a, p) => a + p.w, 0);
    if (!(total > 0)) return null;
    // Largest remainder: whole percentages that add up to exactly 100.
    for (const p of parts) {
      p.exact = (p.w / total) * 100;
      p.pct = Math.floor(p.exact);
    }
    let missing = 100 - parts.reduce((a, p) => a + p.pct, 0);
    for (const p of [...parts].sort((a, b) => b.exact - b.pct - (a.exact - a.pct))) {
      if (missing <= 0) break;
      p.pct += 1;
      missing -= 1;
    }
    return parts.filter((p) => p.key === "house" || p.pct > 0).map((p) => ({ key: p.key, pct: p.pct }));
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
    // mode: "abs" counts the magnitude of every sensor, "pos" ignores negative readings.
    const group = (ids, invert = false, mode = "") => {
      const list = (ids || []).map(sample).filter(Boolean);
      if (!list.length) return null;
      return Array.from({ length: n + 1 }, (_, k) => {
        const v = list.map((l) => l[k]).filter((x) => x != null).map((x) => (mode === "abs" ? Math.abs(x) : mode === "pos" ? Math.max(0, x) : x));
        return v.length ? (invert ? -1 : 1) * v.reduce((a, b) => a + b, 0) : null;
      });
    };
    const house = c.house_power ? sample(c.house_power) : null;
    const g = {
      solar: group(c.solar_power, false, "pos"), gridIn: group(c.grid_import, false, "pos"), gridOut: group(c.grid_export, false, "pos"),
      discharge: group(c.battery_discharge, false, "abs"), charge: group(c.battery_charge, false, "abs"),
      gridCharge: group(c.battery_grid_charge),
      grid: group(c.grid_power, c.invert_grid), battery: group(c.battery_power, c.invert_battery),
    };
    // The single production sensors, for the split in the tooltip.
    const solarIds = c.solar_power || [];
    const solarSamples = solarIds.map((id) => sample(id));
    const pts = [];
    for (let k = 0; k <= n; k++) {
      const parts = this._split(Object.fromEntries(Object.entries(g).map(([key, arr]) => [key, arr ? arr[k] : null])));
      const v = house ? house[k] : this._calcHouse(parts);
      const net = parts.discharge == null && parts.charge == null ? null : (parts.discharge ?? 0) - (parts.charge ?? 0);
      pts.push({
        t: t0 + k * step, v, d: v == null ? null : this._calcDirect(parts, v),
        solar: parts.solar, gridOut: parts.gridOut, gridIn: parts.gridIn, net,
        discharge: parts.discharge, charge: parts.charge, gridCharge: parts.gridCharge, measured: !!house,
        sp: solarSamples.map((arr) => (arr ? Math.max(0, arr[k] ?? 0) : null)),
      });
    }
    pts.meta = { solarNames: solarIds.map((id) => this._deviceName(id)) };
    return pts;
  }

  /**
   * The series of the history chart, in the order and with the colors of the power chart of PV Assistant
   * (but computed from our own sensors, PV Assistant is not needed): production, feed-in, storage (from +,
   * to −), solar used directly, grid import and the house consumption. A series without any value is left out.
   */
  _historySeries(points) {
    const has = (key) => points.some((p) => p[key] != null);
    const pts = (key) => points.filter((p) => p[key] != null).map((p) => [p.t, p[key]]);
    const list = [];
    if (has("solar")) list.push({ key: "prod", name: this._t("hProd"), short: this._t("hProd"), color: "--ea-prod", points: pts("solar") });
    if (has("gridOut")) list.push({ key: "feed", name: this._t("hFeed"), short: this._t("hFeed"), color: "--ea-feed", points: pts("gridOut") });
    if (has("net")) {
      list.push({
        key: "net", name: this._t("hStorage"), short: this._t("hStorage"), tipName: this._t("hStorageNet"), color: "--ea-bout", colorNeg: "--ea-bin",
        legendItems: [{ name: this._t("hFromStorage"), color: "--ea-bout" }, { name: this._t("hToStorage"), color: "--ea-bin" }],
        points: pts("net"),
      });
    }
    if (has("d")) list.push({ key: "direct", name: this._t("hDirect"), short: this._t("hDirectShort"), color: "--ea-direct", points: pts("d") });
    if (has("gridIn")) list.push({ key: "grid", name: this._t("hGrid"), short: this._t("hGridShort"), color: "--ea-grid", points: pts("gridIn") });
    if (has("v")) list.push({ key: "house", name: this._t("hHouse"), short: this._t("hHouseShort"), color: "--ea-house", points: pts("v") });
    return list;
  }

  /** Round axis values: 0, 5,000, 10,000 ... (also with negative values for the storage charging). */
  _niceTicks(min, max, count = 4) {
    if (!(max > min)) max = min + 1;
    const raw = (max - min) / count;
    const pow = 10 ** Math.floor(Math.log10(raw));
    const f = raw / pow;
    const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * pow;
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    const ticks = [];
    for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(10));
    return ticks;
  }

  /**
   * The history chart of the last 24 hours: lines per series, the production as a light area, a legend,
   * direct labels at the line ends (on wide charts), a tooltip with all values (wired after the redraw, see
   * _wireChart) and the same data as an hourly table. The model of the drawing is kept in this._hv.
   */
  _historyChart(points) {
    const series = this._historySeries(points);
    const withData = points.filter((p) => p.v != null || p.solar != null);
    if (series.length === 0 || withData.length < 2) {
      this._hv = null;
      return `<div class="empty">${this._t("noHistory")}</div>`;
    }
    const lang = this._hass?.language || "en";
    const W = Math.max(280, Math.round(this._chartW || 900)), H = 280;
    const M = { l: 52, r: 8, t: 10, b: 24 };
    const labelW = W > 520 ? 84 : 0;
    const pw = W - M.l - M.r - labelW, ph = H - M.t - M.b;
    const t0 = points[0].t, t1 = points[points.length - 1].t;
    const step = Math.max(1, points[1].t - points[0].t);
    const values = series.flatMap((s) => s.points.map((p) => p[1]));
    const ticks = this._niceTicks(Math.min(0, ...values), Math.max(0, ...values));
    const lo = ticks[0], hi = ticks[ticks.length - 1];
    const x = (t) => M.l + ((t - t0) / (t1 - t0)) * pw;
    const y = (v) => M.t + (1 - (v - lo) / (hi - lo)) * ph;
    const f1 = (n) => n.toFixed(1);
    let svg = "";
    for (const v of ticks) {
      svg += `<line x1="${M.l}" x2="${M.l + pw}" y1="${f1(y(v))}" y2="${f1(y(v))}" class="${v === 0 ? "haxis" : "hgrid"}"/>`;
      svg += `<text class="htick" x="${M.l - 6}" y="${f1(y(v) + 4)}" text-anchor="end">${Math.round(v).toLocaleString(lang)}</text>`;
    }
    // time axis: full hours, every 3 hours (every 6 on a narrow chart)
    const hours = pw < 420 ? 6 : 3;
    const tz = this._tz();
    const first = tzParts(t0, tz);
    let tick = zonedTime(first.y, first.m - 1, first.d, first.h, tz); // the start of the local hour
    while (tick < t0 || tzParts(tick, tz).h % hours !== 0) tick += 3600000;
    for (; tick <= t1; tick += hours * 3600000) {
      svg += `<text class="htick" x="${f1(x(tick))}" y="${H - 6}" text-anchor="middle">${new Date(tick).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit", timeZone: tz })}</text>`;
    }
    let clip = "";
    series.forEach((s, i) => {
      // the line breaks where data is missing for more than 1.5 buckets
      const segs = [];
      let cur = [];
      s.points.forEach((p, k) => {
        if (k && p[0] - s.points[k - 1][0] > step * 1.5) { segs.push(cur); cur = []; }
        cur.push(p);
      });
      segs.push(cur);
      for (const seg of segs) {
        const path = seg.map((p, k) => `${k ? "L" : "M"}${f1(x(p[0]))},${f1(y(p[1]))}`).join("");
        if (i === 0 && seg.length > 1) {
          svg += `<path d="${path}L${f1(x(seg[seg.length - 1][0]))},${f1(y(0))}L${f1(x(seg[0][0]))},${f1(y(0))}Z" fill="var(${s.color})" opacity=".12"/>`;
        }
        if (s.colorNeg) {
          // the same line twice, clipped above and below the zero line (from storage / to storage)
          clip = `<defs><clipPath id="ea-clip-p"><rect x="0" y="0" width="${W}" height="${f1(y(0))}"/></clipPath><clipPath id="ea-clip-n"><rect x="0" y="${f1(y(0))}" width="${W}" height="${f1(H - y(0))}"/></clipPath></defs>`;
          svg += `<path d="${path}" fill="none" stroke="var(${s.color})" stroke-width="2" stroke-linejoin="round" clip-path="url(#ea-clip-p)"/>`;
          svg += `<path d="${path}" fill="none" stroke="var(${s.colorNeg})" stroke-width="2" stroke-linejoin="round" clip-path="url(#ea-clip-n)"/>`;
        } else {
          svg += `<path d="${path}" fill="none" stroke="var(${s.color})" stroke-width="2" stroke-linejoin="round"/>`;
        }
      }
    });
    if (labelW) {
      const ends = series.map((s) => ({ s, y: y(s.points[s.points.length - 1][1]) })).sort((a, b) => a.y - b.y);
      for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 13) ends[i].y = ends[i - 1].y + 13;
      const over = ends[ends.length - 1].y - (M.t + ph + 8); // keep the labels inside the chart
      if (over > 0) ends.forEach((e) => { e.y -= over; });
      for (const e of ends) svg += `<text class="hend" x="${f1(M.l + pw + 6)}" y="${f1(e.y + 4)}">${esc(e.s.short)}</text>`;
    }
    svg += `<line class="hair" y1="${M.t}" y2="${M.t + ph}" visibility="hidden"/>`;
    svg += series.map((s) => `<circle class="hdot" r="4" fill="var(${s.color})" visibility="hidden"/>`).join("");
    svg += `<rect class="hit" x="${M.l}" y="${M.t}" width="${pw}" height="${ph}" fill="transparent"/>`;
    const legend = series.flatMap((s) => s.legendItems || [s])
      .map((s) => `<span><i style="background:var(${s.color})"></i>${esc(s.name)}</span>`).join("");
    // table: hourly means
    const byHour = new Map();
    series.forEach((s, i) => s.points.forEach(([ts, v]) => {
      const hp = tzParts(ts, tz);
      const h = zonedTime(hp.y, hp.m - 1, hp.d, hp.h, tz); // the start of the local hour
      const e = byHour.get(h) || series.map(() => [0, 0]);
      e[i][0] += v;
      e[i][1] += 1;
      byHour.set(h, e);
    }));
    const fmtTime = (ts) => new Date(ts).toLocaleString(lang, { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit", timeZone: tz });
    const rows = [...byHour.entries()].sort((a, b) => a[0] - b[0]).map(([h, e]) =>
      `<tr><th>${esc(fmtTime(h))}</th>${e.map(([sum, n]) => `<td>${n ? Math.round(sum / n).toLocaleString(lang) : "–"}</td>`).join("")}</tr>`).join("");
    const times = [...new Set(series.flatMap((s) => s.points.map((p) => p[0])))].sort((a, b) => a - b);
    this._hv = { W, H, M, pw, ph, t0, t1, lo, hi, series, lang, fmtTime, labelW, times, maps: series.map((s) => new Map(s.points)), byTs: new Map(points.map((p) => [p.t, p])), solarNames: points.meta?.solarNames || [], x, y };
    return `<div class="hchart"><div class="legend">${legend}</div>
      <div class="chartwrap" data-line><svg class="hsvg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(this._t("chartLabel"))}">${clip}${svg}</svg><div class="tip" hidden></div></div>
      <details class="tableview"${this._tableOpen ? " open" : ""}><summary>${esc(this._t("hTable"))}</summary>
        <table><tr><th>${esc(this._t("hTime"))}</th>${series.map((s) => `<th>${esc(s.name)}</th>`).join("")}</tr>${rows}</table></details></div>`;
  }

  _renderHouse() {
    if (!this._ready) return `<div class="eb-card"><div class="empty">${this._t("loading")}</div></div>`;
    const cur = this._current();
    if (!this._cfg.house_power && !(this._cfg.grid_import || []).length && !(this._cfg.grid_power || []).length) {
      return `<div class="eb-card"><div class="empty">${this._t("notConfigured")}</div></div>`;
    }
    const [val, unit] = fmtPower(cur.house);
    const mix = this._mix(cur);
    const split = this._pvSplit(cur, cur.direct);
    const sharePv = split ? ` <div class="eb-label" style="margin-top:2px;text-transform:none;letter-spacing:0">${esc(split.map((p) => `${p.pct} % ${this._t(p.key)}`).join(" · "))}</div>` : "";
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
    const hist = this._history ? this._historyChart(this._history) : `<div class="empty">${this._t("historyLoading")}</div>`;
    return `<div class="grid">
      ${this._renderAlerts()}
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
          ${cur.autarky == null ? "" : `<div class="eb-tile"><div class="eb-label">${this._t("autarky")}</div><div class="eb-value">${Math.round(cur.autarky)}<small>%</small></div></div>`}
          ${tile(this._t("solar"), cur.solar)}${tile(this._t("solarDirect"), cur.direct, sharePv)}${tile(this._t("gridImport"), cur.gridIn)}${tile(this._t("gridExport"), cur.gridOut)}
          ${tile(this._t("fromStorage"), cur.discharge)}${tile(this._t("toStorage"), cur.charge)}${tile(this._t("storageFromGrid"), cur.gridCharge)}
        </div>
      </div>
      <div class="eb-card">
        <div class="row"><span class="eb-title">${this._t("history")}</span><span class="eb-label">24 h</span></div>
        ${hist}
      </div>
      ${this._renderStorage(cur)}
      ${lists ? `<div class="trio">${lists}</div>` : ""}</div>`;
  }

  /**
   * PV by plant (from PV Assistant): the plants (inverters with their strings) with their power, strongest
   * first, with their share of the PV power. Only shown when there are at least two plants.
   */
  _renderPvPlants() {
    const plants = (this._pv?.plants || [])
      .map((p) => ({ name: p.name, w: this._sum(p.sensors) }))
      .filter((p) => p.w != null)
      .sort((a, b) => b.w - a.w);
    if (plants.length < 2) return "";
    const total = plants.reduce((a, p) => a + Math.max(0, p.w), 0);
    const scale = Math.max(1, ...plants.map((p) => p.w));
    const [tv, tu] = fmtPower(total);
    const rows = plants.map((p) => {
      const [v, u] = fmtPower(p.w);
      const share = total > 0 ? `<small class="pct">${Math.round((Math.max(0, p.w) / total) * 100)} %</small>` : "";
      return `<div class="dev"><div class="line"><span class="name"><span class="nt" title="${esc(p.name)}">${esc(p.name)}</span></span><span class="val">${v}<small>${u}</small>${share}</span></div>
        <div class="track"><div class="fill" style="width:${Math.min(100, (Math.max(0, p.w) / scale) * 100)}%"></div></div></div>`;
    }).join("");
    return `<div class="eb-card"><div class="row"><span class="eb-title">${esc(this._t("pvPlants"))}</span><span class="eb-label">${tv} ${tu}</span></div>
      <div class="devgrid">${rows}</div></div>`;
  }

  /** Card with the power of individual devices. Empty string if none are configured. */
  /**
   * Rows the lists show before they fold: as many as the shortest list has, so devices, areas and
   * labels end at about the same height. At least MIN_ROWS and at most MAX_ROWS. The rest can be
   * unfolded per list.
   */
  _collapsedLimit() {
    const counts = [];
    if ((this._cfg.device_power || []).length || (this._cfg.device_patterns || []).length || this._evRows().length) {
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
    const configured = (this._cfg.device_power || []).length || (this._cfg.device_patterns || []).length;
    if (!configured && !this._evRows().length) return "";
    const all = this._devices();
    // Admins can rename the sensors right in the list (pencil next to the name).
    const byId = new Map((this._usage?.devices || []).map((u) => [u.id, u]));
    const active = all.filter((d) => d.w >= IDLE_W).map((d) => {
      const u = d.id ? byId.get(d.id) : null;
      const kwh = u?.kwh >= 0.005 ? u.kwh.toLocaleString(this._hass?.language || "en", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
      return { ...d, editable: this._isAdmin, spark: u?.spark, tip: [d.tip, kwh ? this._t("uTodayKwh", { kwh }) : ""].filter(Boolean).join(" · ") || undefined };
    });
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
          <span class="val">${d.spark ? this._sparkline(d.spark) : ""}${v}<small>${u}</small>${share != null ? `<small class="pct">${share} %</small>` : ""}</span></div>
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
        const row = e.target.closest?.("[data-open], [data-collapse-toggle]");
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
    // Tabs come and go with the integrations that were found; a tab that vanished leads back to Power.
    const tabs = this._tabs();
    if (this._tab !== "settings" && !tabs.includes(this._tab)) {
      this._tab = "house";
      this._html = null;
    }
    const bar = this.shadowRoot.querySelector(".tabs");
    const signature = `${this._hass?.language}|${tabs.join(",")}`;
    if (bar.dataset.sig !== signature) {
      bar.dataset.sig = signature;
      bar.innerHTML = tabs.map((tab) => `<button class="tab" data-tab="${tab}">${esc(this._tabLabel(tab))}</button>`).join("");
    }
    for (const tab of bar.querySelectorAll(".tab")) {
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
    if (this._tab === "balance") this._maybeLoadBalance();
    if (this._tab === "usage" || (this._tab === "house" && this._usageEnabled())) this._maybeLoadUsage();
    if (this._tab === "usage") this._maybeLoadUsageView();
    if (this._tab === "house") this._maybeLoadBaseRef();
    const html = this._renderPage();
    if (html !== this._html) {
      this._html = html;
      this._swapMarkup(content, html);
      this._applyCollapse(content);
      this._wireChart(content);
      this._wireBalance(content);
    }
  }

  /**
   * What the tooltip shows at a time: the bucket nearest to `t` with the value of every series (the storage
   * says "from" or "to" depending on its sign). Null without a chart.
   */
  _tipAt(t) {
    const hv = this._hv;
    if (!hv || !hv.times.length) return null;
    let lo = 0, hi = hv.times.length - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (hv.times[m] < t) lo = m;
      else hi = m;
    }
    const ts = Math.abs(hv.times[lo] - t) <= Math.abs(hv.times[hi] - t) ? hv.times[lo] : hv.times[hi];
    const point = hv.byTs.get(ts) || {};
    const rows = hv.series.map((s, i) => {
      const v = hv.maps[i].get(ts);
      const color = s.colorNeg && v != null && v < 0 ? s.colorNeg : s.color;
      return { name: s.tipName || s.name, color, value: v ?? null, parts: v == null ? [] : this._tipParts(s.key, v, point, hv) };
    });
    return { ts, title: hv.fmtTime(ts), rows };
  }

  /**
   * The sources behind a value in the tooltip (only where there are at least two non-zero ones): the plants
   * of the production with their share, and what the directly used solar power is made of: the house
   * consumption minus grid import and storage if the house is measured, otherwise production minus feed-in
   * and charging.
   */
  _tipParts(key, value, p, hv) {
    let parts = [];
    if (key === "prod") {
      const sp = p.sp || [];
      parts = sp.map((w, i) => ({ name: hv.solarNames[i] ?? `#${i + 1}`, value: w, note: value > 0 && w != null ? `${Math.round((w / value) * 100)} %` : undefined }));
    } else if (key === "direct") {
      parts = p.measured
        ? [{ name: this._t("hHouse"), value: p.v }, { name: `− ${this._t("hGrid")}`, value: -(p.gridIn ?? 0) }, { name: `− ${this._t("hDischarge")}`, value: -(p.discharge ?? 0) }]
        : [{ name: this._t("hProd"), value: p.solar }, { name: `− ${this._t("hFeed")}`, value: -(p.gridOut ?? 0) }, { name: `− ${this._t("hCharge")}`, value: -Math.max(0, (p.charge ?? 0) - (p.gridCharge ?? 0)) }];
    }
    parts = parts.filter((x) => x.value != null && x.value !== 0 && !Number.isNaN(x.value));
    return parts.length >= 2 || (key === "direct" && parts.length >= 1) ? parts : [];
  }

  /**
   * After every redraw of the page: tooltip and crosshair of the history chart, the open/closed state of the
   * table, and one redraw when the chart box has another width than the drawing (a viewBox in real pixels
   * keeps the text readable on a phone).
   */
  _wireChart(content) {
    const wrap = content.querySelector?.(".chartwrap[data-line]");
    const hv = this._hv;
    if (!wrap || !hv) return;
    const box = Math.max(280, Math.round(wrap.clientWidth || 0));
    if (wrap.clientWidth && Math.abs(box - hv.W) > 24) {
      this._chartW = box;
      this._html = null;
      this._render();
      return;
    }
    const svg = wrap.querySelector("svg"), tip = wrap.querySelector(".tip"), hit = svg.querySelector(".hit");
    const hair = svg.querySelector(".hair"), dots = [...svg.querySelectorAll(".hdot")];
    const hide = () => {
      this._hover = null;
      tip.hidden = true;
      hair.setAttribute("visibility", "hidden");
      dots.forEach((d) => d.setAttribute("visibility", "hidden"));
    };
    const show = (clientX, clientY) => {
      const r = svg.getBoundingClientRect();
      const px = ((clientX - r.left) / r.width) * hv.W;
      const info = this._tipAt(hv.t0 + ((px - hv.M.l) / hv.pw) * (hv.t1 - hv.t0));
      if (!info) return;
      this._hover = { x: clientX, y: clientY };
      const cx = hv.x(info.ts);
      hair.setAttribute("x1", cx);
      hair.setAttribute("x2", cx);
      hair.setAttribute("visibility", "visible");
      info.rows.forEach((row, i) => {
        dots[i].setAttribute("visibility", row.value == null ? "hidden" : "visible");
        if (row.value != null) {
          dots[i].setAttribute("cx", cx);
          dots[i].setAttribute("cy", hv.y(row.value));
          dots[i].setAttribute("fill", `var(${row.color})`);
        }
      });
      tip.replaceChildren();
      const title = document.createElement("div");
      title.className = "tt";
      title.textContent = info.title;
      tip.append(title);
      for (const row of info.rows) {
        const line = document.createElement("div");
        line.className = "tr";
        const key = document.createElement("i");
        key.style.background = `var(${row.color})`;
        const val = document.createElement("b");
        val.textContent = row.value == null ? "–" : `${Math.round(row.value).toLocaleString(hv.lang)} W`;
        const name = document.createElement("span");
        name.textContent = row.name;
        line.append(key, val, name);
        tip.append(line);
        for (const part of row.parts || []) {
          const sub = document.createElement("div");
          sub.className = "ts";
          const pv = document.createElement("span");
          pv.textContent = `${Math.round(part.value).toLocaleString(hv.lang)} W`;
          const pn = document.createElement("span");
          pn.textContent = part.name;
          sub.append(pv, pn);
          if (part.note) {
            const note = document.createElement("b");
            note.textContent = part.note;
            sub.append(note);
          }
          tip.append(sub);
        }
      }
      tip.hidden = false;
      const left = (cx / hv.W) * r.width + 14;
      tip.style.left = `${Math.max(0, left + tip.offsetWidth > wrap.clientWidth ? left - tip.offsetWidth - 28 : left)}px`;
      tip.style.top = `${Math.max(0, Math.min(clientY - r.top - tip.offsetHeight / 2, wrap.clientHeight - tip.offsetHeight))}px`;
    };
    hit.addEventListener("pointermove", (e) => show(e.clientX, e.clientY));
    hit.addEventListener("pointerleave", hide);
    // The page is redrawn with every new value; a pointer that rests on the chart keeps its tooltip.
    if (this._hover) {
      const { x, y } = this._hover;
      requestAnimationFrame(() => { if (hit.matches(":hover")) show(x, y); else this._hover = null; });
    }
    const details = content.querySelector("details.tableview");
    if (details) details.addEventListener("toggle", () => { this._tableOpen = details.open; });
  }

  /** Titles of the cards the user folded, remembered in the browser (only a convenience, it may be unavailable). */
  _collapsedSet() {
    if (!this._collapsed) {
      try {
        const saved = JSON.parse(globalThis.localStorage?.getItem("energy_assistant.collapsed") || "[]");
        this._collapsed = new Set(Array.isArray(saved) ? saved.filter((x) => typeof x === "string") : []);
      } catch (e) {
        this._collapsed = new Set();
      }
    }
    return this._collapsed;
  }

  /**
   * Every card with a title row can be folded with a click on the title (the house card stays open). The
   * state is applied after each redraw, because a new markup starts unfolded.
   */
  _applyCollapse(content) {
    const folded = this._collapsedSet();
    for (const card of content.querySelectorAll(".eb-card")) {
      if (card.classList.contains("eb-card--glow")) continue;
      const row = card.querySelector(":scope > .row");
      const title = row?.querySelector(".eb-title")?.textContent?.trim();
      if (!title) continue;
      row.setAttribute("data-collapse-toggle", "");
      row.setAttribute("role", "button");
      row.setAttribute("tabindex", "0");
      const isFolded = folded.has(title);
      card.classList.toggle("collapsed", isFolded);
      row.setAttribute("aria-expanded", isFolded ? "false" : "true");
    }
  }

  /** Fold or unfold the card of a clicked title row and remember the choice. */
  _toggleCollapse(row) {
    const card = row.closest(".eb-card");
    const title = row.querySelector(".eb-title")?.textContent?.trim();
    if (!card || !title) return;
    const folded = this._collapsedSet();
    if (!folded.delete(title)) folded.add(title);
    card.classList.toggle("collapsed", folded.has(title));
    row.setAttribute("aria-expanded", folded.has(title) ? "false" : "true");
    try {
      globalThis.localStorage?.setItem("energy_assistant.collapsed", JSON.stringify([...folded]));
    } catch (e) { /* private window or blocked storage: the choice only lasts until the next reload */ }
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

// The time helpers are reachable for the tests.
EnergyAssistantPanel.tzParts = tzParts;
EnergyAssistantPanel.zonedTime = zonedTime;

customElements.define("energy-assistant-panel", EnergyAssistantPanel);
