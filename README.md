# Energy Assistant

Home Assistant integration (HACS) with its own sidebar panel. Dark, card-based design, see [docs/DESIGN.md](docs/DESIGN.md).
The UI is English with a German translation (follows your Home Assistant language).

## Tabs

| Tab | Content |
|-----|---------|
| **Power** (German: Leistung) | Current house power, solar power used directly, source of consumption (solar, storage, grid), tiles, history of the last 24 hours, power of individual devices |
| **Settings** (gear icon, top right) | Change all sensors directly in the panel (see below). A second click on the gear leads back to the Power tab. |

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

Without a house consumption sensor Energy Assistant calculates:

**House = solar + grid import + from storage − grid export − to storage**

**Directly used solar power** is:

**Solar direct = solar − export − (to storage − storage charged from grid)** (at least 0, at most solar and house power)

Without the optional "storage charged from grid" sensor the storage is assumed to be charged entirely from solar.
If it actually charges from the grid, the value is too low then.
The panel shows it as a tile with its share of production, in the source bar and as a second line in the history.

### PV Assistant (optional)

If the [PV Assistant](https://github.com/weskona/pv-assistant) integration is installed as well, Energy Assistant reads its configuration (read-only, nothing is stored or changed there). One rule decides which sensor goes where, for the config flow and the panel:

- **Config flow / options flow:** a first question asks whether to take over the sensors of PV Assistant. With "yes" the fields of the following steps are pre-filled and can still be changed.
- **Settings tab:** a notice at the top asks the same. The button (administrators) fills the fields: production power sensors (**Solar production**), storage sensors (combined with its sign, charging, discharging) and grid sensors (import, feed-in). Save as usual. Nothing is left out: a feed-in sensor that PV Assistant reports as negative values becomes the combined grid sensor, and separate charging and discharging sensors that report negative values count with their magnitude.
- **Power tab:** a row **PV by plant** opens to the plants (inverters with their strings, as set up in PV Assistant) and their current power. It appears when there are at least two plants.

Without PV Assistant nothing changes.

### Tariffy (optional)

If [Tariffy](https://github.com/weskona/tariffy) is installed, the Power tab shows **Costs right now** below the tiles: the electricity price (live for a dynamic tariff), the cost of the grid import, the earnings of the feed-in and the savings of the directly used solar power, each per hour. The price comes from the first electricity contract, the feed-in tariff from any Tariffy contract that has one. Energy Assistant only reads Tariffy; without it nothing is shown and both run on their own.

### EV Assistant (optional)

If [EV Assistant](https://github.com/weskona/ev_assistant) is installed, the Power tab shows a **Wallbox** block for every vehicle: live status and charging power, charge level, solar share of the session, energy and cost of today, and the advice to charge before the PV production starts. Energy Assistant only reads EV Assistant (the sensors are found over the entity registry); without it nothing is shown and both run on their own.

### Changing the settings

After the first setup in the config flow you can change everything in the panel itself:
open the **Settings** tab, add sensors by typing or picking from the list of power sensors, remove them with the ×
and press **Save**. The changes apply immediately, no restart or reload is needed.

- Only administrators can save. Other users see the settings read-only.
- Saving is blocked while neither grid import, grid combined nor house consumption is set.
- The same settings are still available via *Configure* on the integration.

The panel talks to the integration over two WebSocket commands, `energy_assistant/get_config` and
`energy_assistant/update_config` (admin only), and stores the result in the options of the config entry.

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
