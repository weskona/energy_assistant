# Energy Assistant

Home Assistant integration (HACS) with its own sidebar panel. Dark, card-based design, see [docs/DESIGN.md](docs/DESIGN.md).
The UI is English with a German translation (follows your Home Assistant language).

## Tabs

| Tab | Content |
|-----|---------|
| **Power** (German: Leistung) | Current house power, solar power used directly, source of consumption (solar, storage, grid), tiles, history chart of the last 24 hours, power of individual devices |
| **Consumption** (German: Verbrauch) | Only with devices set up: the base load of the house with its cost per year, the biggest consumers of today in kWh and euro, and the devices that are always on (standby) |
| **Balance** (German: Bilanz) | Only with energy counters (see below): the energy of a day, week, month or year in kWh with the change to the period before, self-consumption, self-sufficiency, grid cost and feed-in revenue (with Tariffy) and bars per hour, day or month |
| **PV** | Only with PV Assistant: production, feed-in, self-consumption, self-sufficiency, forecast, storage, plant fault and the PV power by plant |
| **EV** | Only with EV Assistant: wallbox status and power, charge level, solar share, today's charging and the advice to charge before PV |
| **Costs** (German: Kosten) | Only with Tariffy: electricity price, what the grid import costs, what the feed-in earns and what the solar power saves per hour, and the contract figures |
| **Payback** (German: Amortisation) | Only with Amortix: savings, investment, progress, remaining amount, savings per day, time left and payback date |
| **Settings** (gear icon, top right) | Change all sensors directly in the panel (see below). A second click on the gear leads back to the Power tab. |

**Folding:** every card except the house card folds with a click on its title (arrow in front of it). The choice is remembered in the browser.

**History chart:** the card next to the house shows the power of the last 24 hours in watts, in the style of the power chart of PV Assistant but computed from your own sensors (PV Assistant is not needed): production (with a light area), feed-in, storage (turquoise from the storage, pink into the storage), solar used directly, grid import and house consumption. Series without data are left out. The names stand at the line ends on wide screens; a tooltip with all values follows the pointer (the crosshair stays while the values update), and **Show as table** lists the hourly means.

**Layout:** the first row shows the house card and the history. Below it **Devices**, **Areas** and **Labels** sit side by
side in one row, in this order and with the same height (missing cards leave more room to the others). On narrow screens
they stack. Areas and labels show their Home Assistant icon in front of the name (labels tinted with their color).

## Installation

1. Add this repository to HACS as a custom repository (category *Integration*) and install it.
2. Restart Home Assistant.
3. Add **Energy Assistant** under *Settings → Devices & services*.

## Configuration

Setup runs in three steps: **1. Grid and house**, **2. Solar and storage** (optional), **3. Devices** (optional).

All sensors are power sensors (`device_class: power`, W, kW or MW). Power is always displayed in whole watts.
Several sensors can be selected per category where noted, they are added up.
Separate and combined sensors can be mixed.

**Separate sensors** report positive values:

| Category | Multiple | Meaning |
|----------|----------|---------|
| Grid import | no | Power drawn from the grid |
| Grid export | no | Power fed into the grid |
| Solar production | yes | e.g. one sensor per inverter or roof area |
| From storage | yes | Discharge power of the batteries |
| To storage | yes | Charge power of the batteries |
| Storage charged from grid | no | Part of "To storage" that comes from the grid |

**Combined sensors** are signed and are split internally into the separate quantities:

| Category | Positive | Negative | Invert switch |
|----------|----------|----------|---------------|
| Grid combined | Import | Export | yes |
| Storage combined | Discharge | Charge | yes |

**Devices** (step 3): the Power tab lists the power of individual devices with a bar, highest first.
With EV Assistant the wallbox is a row of this list as well (**Wallbox · vehicle**, with the solar share of the session as tooltip). It is left out when the wallbox sensor is already one of the devices or was excluded.

- **Name patterns:** enter patterns with `*` as wildcard, e.g. `*_power` (or `*_leistung` for German entity names).
  Every power sensor whose name matches is listed, so new devices appear automatically.
  `?` matches one character. A pattern without a dot is compared with the part after `sensor.`,
  a pattern with a dot (`sensor.kitchen_*`) with the full entity id. Upper and lower case do not matter.
- **Only power entities:** only `sensor` entities with `device_class: power` are considered.
  Sensors that are part of the energy balance (grid, solar, storage, house) are never listed as devices.
- **Exclude patterns:** patterns like `alpha_ess_*` or `*_string_*` keep every matching sensor out of the list at once.
  In the Settings tab such sensors stay visible in the match list, struck through and locked, so you can see what the
  pattern removes. They do not end up in the exclude list below.
- **Exclude list:** not every sensor that matches a pattern is wanted. In the Settings tab all matches are listed
  with a checkbox each. Untick a sensor to exclude it, tick it again to bring it back. Excluded sensors stay in the
  list (struck through) and are collected in the **excluded sensors** field. With many matches use the filter box
  (searches names and entity ids) and **Exclude shown** / **Include shown**, which only act on the shown sensors.
- **Additional device sensors:** you can also pick single sensors, e.g. one without a matching name.
  Sensors picked here always stay in the list, even if they are on the exclude list or match an exclude pattern.
- The Power tab lists the devices one below the other in their own full-width row, strongest first. Next to each value
  the share of the house power is shown, and the bar has the same length (without a known house power the strongest
  device fills the bar). The three lists show the same number of rows before they fold: as many as the shortest list has, at least 5 and at most
  8. **Show all** unfolds the rest of a list. Devices below 5 W count as
  idle and are only counted. If a house power is known, the remainder is shown as "Other (not measured)".

In the panel's **Settings** tab the field shows live which sensors a pattern matches. Long match lists can be
narrowed with filter buttons: **Activity** (all / active, at least 5 W right now / inactive, below 5 W or no value) and
**Selection** (all / included / excluded), combinable with the text filter. **Exclude shown** and **Include shown** act on
what the filters show, e.g. one click excludes all inactive sensors.

**Renaming:** administrators see a pencil next to the name of every device in the list. Click it, type a new name and
press **Enter** (or leave the field) to save, **Esc** cancels, an empty name restores the original. The tooltip of a
renamed device shows the original name. The names are stored in the settings (`device_names`) and also used in the
tooltips of the Areas and Labels cards. Devices below 5 W are not listed and can be renamed once they are active.

**Labels:** in the Settings tab you pick labels from the list of labels that exist in Home Assistant. Only labels that
have power sensors are offered (plus labels you already selected, so you can unselect them). Each label shows how many
power sensors it has and their current power. Filters (activity: all / active / inactive, selection: all / selected /
not selected, plus a text filter) keep long lists manageable. The **Labels** card on the Power tab then shows one row per selected label
with the summed power of all its power sensors, plus share of the house power, bar, folding and idle count. A sensor
carries the labels of its entity and of its device. Unlike the devices **no name pattern is needed**, the label decides.
The exclusions still apply: sensors of the energy balance (grid, solar, storage, house), the exclude list and the exclude
patterns. A sensor with several selected labels counts in each of them. The labels are read over the `energy_assistant/labels`
WebSocket command, available to every user.

**Areas:** the **Areas** card sums up the power of the power sensors per Home Assistant area. The area is taken from the
entity, or from its device if the entity has none. Like for the labels **no name pattern is needed**, every power sensor
in the area counts. The sensors of the energy balance (grid, solar, storage, house), the exclude list and the exclude
patterns still apply. Areas show the value, the share of the house power and a bar, fold like the other lists and count
idle areas (< 5 W).

In the Settings tab you choose the areas the same way as the labels: a checkbox list of the areas of Home Assistant that
have power sensors (plus areas you already selected), with the number of sensors and their power, and the same filters
(activity, selection, text). **Nothing selected** shows all areas that have power sensors, plus a row **No area** for
sensors without an area (shown last). **With a selection** only the selected areas are shown, in the order of the list,
without the **No area** row. The card is hidden while no sensor belongs to an area.

If your sensor counts the other way round (e.g. charging positive), enable "Invert sign".
Direct house consumption (one sensor) is optional. If set, it is shown instead of being calculated.
Required: grid import, grid combined or house consumption.

Separate sensors win over combined ones: a combined sensor only fills in what no separate sensor covers, so the same flow is never counted twice. Separate production, import and export sensors ignore negative readings. **Self-sufficiency** is the share of the consumption that does not come from the grid, `(house − grid import) ÷ house`.

Without a house consumption sensor Energy Assistant calculates:

**House = solar + grid import + from storage − grid export − to storage**

**Directly used solar power** is:

**Solar direct = solar − export − (to storage − storage charged from grid)** (at least 0, at most solar and house power)

Without the optional "storage charged from grid" sensor the storage is assumed to be charged entirely from solar.
If it actually charges from the grid, the value is too low then.
The panel shows it as a tile, in the source bar and as a second line in the history. Under the tile the production is split up: how many percent go straight to the house, into the storage (the solar share of the charging) and into the grid, for example `40 % House · 60 % Storage`. The whole percentages add up to 100; parts that round to 0 % are left out.

### Config flow and options

The config flow (and the options, which can be changed later with *Configure*) has four steps: grid and house, solar and storage, **energy counters** and devices. The storage step now also asks for the charge level sensor, the capacity (kWh) and the minimum charge level (%). The energy step asks for the counters of the Balance tab; if the Energy dashboard of Home Assistant is set up, its counters are suggested the first time and can be changed or removed. In the options, a field that you empty is cleared (before, the old value came back).

### Storage card

With a **charge level sensor** (percent) in the settings (section *Solar and storage*) the Power tab shows a **Storage** card: the charge level as a bar with the minimum level marked, the status (charging, discharging, idle) and, with the **capacity** (kWh) and the **minimum charge level** (%), what is stored and what is usable. While the storage discharges it says when it is empty, while it charges when it is full, from the current power (from 20 W on). PV Assistant offers its charge level sensor, capacity and minimum level with the button of the notice.

### Notices

A card **Notices** at the top of the Power tab appears when something needs attention, otherwise it is not there:

- a **plant fault** reported by PV Assistant (with the plants),
- a **negative electricity price** of a dynamic tariff in Tariffy (information: using power now pays),
- a **device that has been running for hours** (at least 200 W for 4 hours, breaks up to 15 minutes do not count; devices that never stopped in the last 24 hours, such as a heat pump, are not reported),
- a **high base load**: the base load of the last 24 hours is at least 1.5 times and 50 W above the usual one (the median over the days before, from the long-term statistics of the house power sensor; it needs a house power sensor and three full days).

### Time zone

All periods and times (the day limits of the Balance and Consumption tabs, the clock times in the history chart and its table, "empty at") use the **time zone of your Home Assistant instance** (*Settings → System → General*), not the one of the browser. Days with a clock change have 23 or 25 hours, zones with a half-hour offset work too. If the time zone is not known, the browser's is used.

### Consumption tab: base load and devices

The **Consumption** tab appears as soon as devices are set up (single sensors or name patterns) and needs no further setting. It reads the history of the last 24 hours (5-minute steps) of the device power sensors and the house power:

- **Base load:** the lowest 30-minute average of the house power, what never goes away, extrapolated to kWh per year and, with Tariffy, to the cost per year (price of the contract). It also says how much of it the always-on devices explain.
- **Biggest consumers today:** the power of the devices summed up since midnight in kWh, with the share and, with Tariffy, the cost of today.
- **Always on (standby):** the devices whose lowest 30-minute average of the last 24 hours is at least 2 W, with kWh and cost per year.

**Define standby devices:** in the settings (Devices section, also in the options of the integration) the field *Standby devices* takes the sensors that count as standby, e.g. router, NAS or fridge. As soon as it is filled, the *Always on* card lists exactly these devices (also below 2 W), with their lowest power in the period, and the *Always-on devices* tile sums them up. Left empty, the devices are detected automatically as before. A standby device is added to the device list even if no pattern finds it.

**Energy per label:** for every label that is selected in the settings (*Labels*), Energy Assistant creates four energy sensors in kWh: today, this week, this month and this year (e.g. `sensor.energy_assistant_klima_energy_today`; with Home Assistant set to German `sensor.energy_assistant_klima_verbrauch_taglich`, named like the English one otherwise; the language at the time the sensor is created decides, an existing sensor is not renamed when the language changes later). They sum up the power of the sensors that carry the label (the same sensors as on the Labels card of the Power tab; balance sensors and excluded sensors do not count) over time. The periods follow the time zone of Home Assistant (week from Monday), the values survive a restart. The sensors are created as soon as you select a label and removed when you deselect it, no reload needed; they count from the moment they exist and have no history before. The sensors can be used elsewhere in Home Assistant (dashboards, automations).

The **Labels card of the Consumption tab** does not use these sensors but the long-term statistics, so it shows every period with history (day, week, month, year, also earlier ones with the arrows): the statistics of the power sensors that carry the label are summed up (hourly means times their duration, daily means for month and year). The running day comes from the hourly and the running hour from the 5-minute statistics, so the card is complete up to now. The power sensors need the state class `measurement`; a label whose sensors only partly have statistics shows *n of m sensors*, and the missing ones are not counted. The cost of a label is only counted from the moment its cost sensors exist (the price of the past is not known).

**Cost per label:** when Tariffy provides an electricity price, four cost sensors per label are created as well (today, this week, this month, this year; unit and currency from the price). The cost is added up step by step: every minute and whenever a sensor or the price changes, the energy of that moment is multiplied by the unit price valid at that moment (the live price of a dynamic tariff if Tariffy has one). A change of the unit price therefore never changes what was already counted. The **Costs tab** shows them in the *Cost per label* card (today, week, month and year per label), never today's price times the energy; the Consumption tab shows the kWh only. Without Tariffy (or while it has no usable price) there are no cost sensors; if the price disappears for a while the last known price is used.

**Tariff per label:** with more than one Tariffy electricity contract (e.g. household and heat pump) the settings (Labels section) offer a choice per selected label: *Default* is the first electricity contract, or pick the contract whose price should count, e.g. the heat pump tariff for the heat pump label. A chosen contract is never replaced by another one: if its price is briefly unavailable the last good price of that contract stays, if the contract is gone the label gets no cost until you choose again. Switching the tariff closes the running step with the old price first, so what was counted before stays.

**Protection against bad values:** the counters only grow within a period, so one wrong value would stay until the period ends. Therefore: a power sensor that reports text, NaN, infinity, a negative value or more than 100 kW keeps its last good value; unavailable, unknown or a missing sensor counts as 0 W; units other than W and kW are ignored. A pause of more than 5 minutes (restart, blocked system, clock jump) is not integrated, and time going backwards adds nothing. A price below 0 or above 10 per kWh is ignored (the last good price stays). A stored value that is not a sane number is not restored.

**Device evaluation:** every row has a small line of the device (24 hours, or the period) in front of its value, also in the Devices card of the Power tab, where the tooltip adds the energy of today. A row of the Consumption tab opens to a larger line and the figures of the device: energy and cost, average power, peak, always-on power and how long it has been running.

Devices that are unavailable now still count with their history; the wallbox row of EV Assistant has no history of its own and is not part of it.

**Period picker:** like in the Balance tab, **Day, Week, Month and Year** with arrows. *Day / today* is read from the history in 5-minute steps (as described above). Every other period comes from the long-term statistics of Home Assistant (the power sensors need the state class `measurement`): the energy of a device is its hourly means (daily means for a month or a year) times their duration, and the base load is the lowest hourly mean of the house and of every device in the period (at most the last 31 days of it). Without a house power sensor the house power is the balance of the separate sensors per hour, like the live value.

### Energy counters and the Balance tab

For the **Balance** tab enter your energy counters in the Settings tab (section *Energy counters (kWh)*): PV production, grid import, grid export, to storage, from storage and, if you have one, the house consumption. These are cumulative kWh counters or utility meters; several counters per field are summed. If the **Energy dashboard** of Home Assistant is set up, a notice offers its counters with one button (read only, nothing is changed in the dashboard); save as usual.

The tab reads the long-term statistics of Home Assistant, so the history that already exists is used from the first day. Day (per hour), week from Monday and month (per day) and year (per month) can be paged through with the arrows. Consumption is the measured house counter, otherwise production + import + discharge − export − charge. Self-consumption is the share of the production that was not exported, self-sufficiency the share of the consumption that did not come from the grid. With Tariffy the grid cost and the feed-in revenue are valued with the price of the contract.

### PV Assistant (optional)

If the [PV Assistant](https://github.com/weskona/pv-assistant) integration is installed as well, Energy Assistant reads its configuration (read-only, nothing is stored or changed there). One rule decides which sensor goes where, for the config flow and the panel:

- **Config flow / options flow:** a first question asks whether to take over the sensors of PV Assistant. With "yes" the fields of the following steps are pre-filled and can still be changed.
- **Settings tab:** a notice at the top asks the same. The button (administrators) fills the fields: production power sensors (**Solar production**), storage sensors (combined with its sign, charging, discharging) and grid sensors (import, feed-in). Save as usual. Nothing is left out: a feed-in sensor that PV Assistant reports as negative values becomes the combined grid sensor, and separate charging and discharging sensors that report negative values count with their magnitude.
- **PV tab:** a card **PV today and tomorrow** (production, feed-in, self-consumption, self-sufficiency, forecast reached, benefit, storage, expected feed-in and best window of tomorrow, plant fault warning) and a card **PV by plant** with the plants (inverters with their strings, as set up in PV Assistant), their current power and share. The plant card appears when there are at least two plants.

Without PV Assistant nothing changes.

### Tariffy (optional)

If [Tariffy](https://github.com/weskona/tariffy) is installed, the **Costs** tab shows **Costs right now**: the electricity price (live for a dynamic tariff), the cost of the grid import, the earnings of the feed-in and the savings of the directly used solar power, each per hour, plus the contract figures (cost so far, balance so far, forecast for the contract end). The price comes from the first electricity contract, the feed-in tariff from any Tariffy contract that has one. Energy Assistant only reads Tariffy; without it nothing is shown and both run on their own.

### EV Assistant (optional)

If [EV Assistant](https://github.com/weskona/ev_assistant) is installed, the **EV** tab shows a **Wallbox** block for every vehicle: live status and charging power, charge level, solar share of the session, energy and cost of today, and the advice to charge before the PV production starts. Energy Assistant only reads EV Assistant (the sensors are found over the entity registry); without it nothing is shown and both run on their own.

### Amortix (optional)

If [Amortix](https://github.com/weskona/amortix) is installed, the **Payback** tab shows a card **Payback**: total savings, investment, progress, remaining amount, savings per day, time left and the expected payback date. When Amortix has an overview entry it is shown alone (it combines all other entries), otherwise every entry gets its own block. Energy Assistant only reads Amortix; without it nothing is shown and both run on their own.

### Changing the settings

After the first setup in the config flow you can change everything in the panel itself:
open the **Settings** tab, add sensors by typing or picking from the list of power sensors, remove them with the ×
and press **Save**. The changes apply immediately, no restart or reload is needed.

- Only administrators can save. Other users see the settings read-only.
- Saving is blocked while neither grid import, grid combined nor house consumption is set.
- The same settings are still available via *Configure* on the integration.

The panel talks to the integration over two WebSocket commands, `energy_assistant/get_config` and
`energy_assistant/update_config` (admin only), and stores the result in the options of the config entry.

## Working together

Energy Assistant is meant to work as a team with [PV Assistant](https://github.com/weskona/pv-assistant), [Tariffy](https://github.com/weskona/tariffy), [EV Assistant](https://github.com/weskona/ev_assistant) and [Amortix](https://github.com/weskona/amortix): it reads them when they are installed (read only) and shows their data in its own tabs, and every one of them runs on its own. Which data is read, and the rules, are in [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md).

## Development

The panel is a single web component without a build step: `custom_components/energy_assistant/frontend/energy-assistant-panel.js`.

```bash
pip install -r requirements_test.txt && pytest
npm test
```

## Releases

Every merge to `main` that contains a new `version` in `custom_components/energy_assistant/manifest.json`
creates the tag `v<version>` and a GitHub release. The release notes come from the matching
`## [<version>]` section of `CHANGELOG.md`, which therefore must exist before merging.

## License

[MIT](LICENSE). The bundled font Outfit is licensed under the SIL Open Font License 1.1, see `custom_components/energy_assistant/frontend/fonts/OFL-Outfit.txt`.
