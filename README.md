# Energyboard

Home Assistant integration (HACS) with its own sidebar panel. Dark, card-based design, see [docs/DESIGN.md](docs/DESIGN.md).
The UI is English with a German translation (follows your Home Assistant language).

## Tabs

| Tab | Content |
|-----|---------|
| **House** | Current house power, solar power used directly, source of consumption (solar, storage, grid), tiles, history of the last 24 hours, power of individual devices |
| **Settings** | Change all sensors directly in the panel (see below) |

## Installation

1. Add this repository to HACS as a custom repository (category *Integration*) and install it.
2. Restart Home Assistant.
3. Add **Energyboard** under *Settings → Devices & services*.

## Configuration

Setup runs in three steps: **1. Grid and house**, **2. Solar and storage** (optional), **3. Devices** (optional).

All sensors are power sensors (`device_class: power`, W or kW).
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

**Devices** (step 3): any number of power sensors of individual devices (heat pump, wallbox, dishwasher, …).
The House tab lists them by current power with a bar. Devices below 5 W count as idle and are only counted.
If a house power is known, the remainder is shown as "Other (not measured)".

If your sensor counts the other way round (e.g. charging positive), enable "Invert sign".
Direct house consumption (one sensor) is optional. If set, it is shown instead of being calculated.
Required: grid import, grid combined or house consumption.

Without a house consumption sensor Energyboard calculates:

**House = solar + grid import + from storage − grid export − to storage**

**Directly used solar power** is:

**Solar direct = solar − export − (to storage − storage charged from grid)** (at least 0, at most solar and house power)

Without the optional "storage charged from grid" sensor the storage is assumed to be charged entirely from solar.
If it actually charges from the grid, the value is too low then.
The panel shows it as a tile with its share of production, in the source bar and as a second line in the history.

### Changing the settings

After the first setup in the config flow you can change everything in the panel itself:
open the **Settings** tab, add sensors by typing or picking from the list of power sensors, remove them with the ×
and press **Save**. The changes apply immediately, no restart or reload is needed.

- Only administrators can save. Other users see the settings read-only.
- Saving is blocked while neither grid import, grid combined nor house consumption is set.
- The same settings are still available via *Configure* on the integration.

The panel talks to the integration over two WebSocket commands, `energyboard/get_config` and
`energyboard/update_config` (admin only), and stores the result in the options of the config entry.

## Development

The panel is a single web component without a build step: `custom_components/energyboard/frontend/energyboard-panel.js`.

```bash
pip install -r requirements_test.txt && pytest
npm test
```

## Releases

Every merge to `main` that contains a new `version` in `custom_components/energyboard/manifest.json`
creates the tag `v<version>` and a GitHub release. The release notes come from the matching
`## [<version>]` section of `CHANGELOG.md`, which therefore must exist before merging.
