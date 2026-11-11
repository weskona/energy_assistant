# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] - 2026-11-11

### Added

- Editable display names: administrators can rename the devices right in the list (pencil next to the name, Enter or leaving the field saves, Esc cancels, an empty name restores the original). The names are stored as `device_names`, accepted by `energyboard/update_config`, kept by the options flow and also used in the tooltips of the Areas and Labels cards. The tooltip of a renamed device shows the original name.
- The Areas and Labels cards show the Home Assistant icon in front of the name (area or label icon, with defaults `mdi:texture-box`, `mdi:label` and `mdi:help-circle-outline` for "No area"; labels are tinted with their color). Without the `ha-icon` element the colored dot is used.
- Filters for the label list in the Settings tab: activity (all / active / inactive), selection (all / selected / not selected) and a text filter, with counts.
- Each label in the picker shows its number of power sensors and their current power.

### Changed

- The first tab is now called **Power** (German: **Leistung**) instead of House. The card inside is still titled House.
- Devices, areas and labels are shown side by side in one row, in this order and with the same height. They stack on narrow screens.
- The label picker only offers labels that have power sensors. Labels you already selected stay visible so you can unselect them.

### Fixed

- Ticking a label in a long list no longer throws the list back to its start.
- The icons in front of the names are no longer cut off (name and icon share a flex row).
- The style rule for the history chart only applies to the chart and no longer shifts other icons.

## [0.3.0] - 2026-11-11

### Added

- **Areas** card on the House tab: the sensors of the device list (same filters: patterns, exclude patterns, exclude list, additional sensors) are summed up per Home Assistant area. The area comes from the entity or from its device, sensors without an area are collected in "No area". Value, share of the house power, bar, folding and idle count work like in the device list. Nothing extra to configure, the card is hidden while no sensor belongs to an area.
- **Labels** card on the House tab: pick labels from the list of labels in Home Assistant (Settings tab, also in the config flow and options flow) and the power sensors that carry a label are summed up per label. A sensor carries the labels of its entity and of its device. No name pattern is needed, the exclusions (energy balance sensors, exclude list, exclude patterns) still apply. Value, share of the house power, bar, folding and idle count work like in the other lists.
- WebSocket command `energyboard/labels` (available to every user) with the labels and the sensors that carry them.
- Filters for the match list in the Settings tab: activity (all / active / inactive) and selection (all / included / excluded), with counts, combinable with the text filter. "Exclude shown" / "Include shown" act on what the filters show.
- The device card shows the share of the house power next to each value (also for the unmeasured rest), as long as the house power is known. The bar has the same length.

### Changed

- The Settings tab is opened with a gear icon in the top right corner instead of a tab button. The icon is highlighted while the settings are open, a second click leads back to the House tab. The House tab stays centered.
- The devices on the House tab are listed one below the other again (single column) instead of in several columns. They keep their own full-width row.

## [0.2.2] - 2026-11-11

### Added

- Exclude patterns for devices (e.g. `alpha_ess_*`): every sensor that matches is left out of the device list. In the Settings tab such sensors stay visible in the match list, struck through and locked. Available in the Settings tab, the config flow and the options flow, validated and stored in lowercase.

### Changed

- The panel uses the full screen width.
- The devices card has its own full-width row on the House tab and lists the devices in several columns.
- In the Settings tab the devices section has its own full-width row. The match list shows the name in the first line and the entity id below it, in several columns, so names are no longer cut off. The fields of all sections are arranged in columns.
- Error messages in the settings form disappear with the next action.

## [0.2.1] - 2026-11-11

### Fixed

- The panel did not show up: setting up the config entry failed with `async_register_panel() got an unexpected keyword argument 'update'`. The unsupported argument is removed.

### Added

- Tests that set the integration up with the real frontend, http and panel_custom components (panel registration, served files, reload, unload, settings over the WebSocket API). The mocks of the panel registration now check the real signature.

## [0.2.0] - 2026-11-11

### Added

- **Settings** tab in the panel: change all sensors after the first setup directly in the panel (add/remove sensors, invert switches, devices). Changes apply immediately without a reload. Only administrators can save, other users see the settings read-only.
- WebSocket commands `energyboard/get_config` and `energyboard/update_config` (admin only) used by the panel.
- Devices card on the **House** tab: power of individual devices, sorted by current power, with the unmeasured remainder of the house and a count of idle devices.
- Optional third setup step "Devices" (config flow and options flow) to select the device power sensors, with German translation.
- Device name patterns with wildcards (e.g. `*_power`): every `sensor` entity with `device_class: power` whose name matches is listed on the House tab. Sensors of the energy balance are excluded. The Settings tab previews the matches. Patterns are validated and stored in lowercase.
- Exclude list for devices: sensors that match a pattern but are not wanted can be excluded in the Settings tab (also available as an entity picker in the config and options flow). The matches are listed with a checkbox each, a filter box and "Exclude shown" / "Include shown" for many matches. Sensors picked explicitly always stay listed.
- The device card on the House tab shows the 8 strongest devices and folds the rest away ("Show all").
- Brand icon (`custom_components/energyboard/brand/icon.png` and `icon@2x.png`) as required by the HACS validation.
- MIT license.

### Changed

- Changing the settings no longer reloads the config entry. The panel loads the live settings over the WebSocket API on open, so changes made via *Configure* show up after the panel is reopened.

## [0.1.0] - 2026-11-11

### Added

- Home Assistant integration `energyboard` with a sidebar panel, installable via HACS.
- **House** tab: current house power, solar power used directly, source of consumption
  (solar, storage, grid), tiles for every flow and a 24-hour history.
- Two-step config flow and options flow (1. grid and house, 2. solar and storage).
- Power sensor inputs: grid import and grid export (one each), solar production,
  from storage and to storage (one or more each), combined signed sensors for grid and
  storage with an invert switch, optional "storage charged from grid" and optional
  direct house consumption sensor.
- Calculation of house power (solar + grid import + from storage − grid export − to storage)
  and of directly used solar power (solar − export − solar share of storage charging).
- Dark card-based design tokens, design documentation and preview
  (`custom_components/energyboard/frontend/energyboard-tokens.css`, `docs/`).
- Outfit font (SIL OFL 1.1) bundled locally.
- English UI with a German translation (config flow and panel).
- Tests: pytest for config flow, options flow, setup and translations; Node tests for the
  panel calculation logic.
- GitHub workflows: CI (Hassfest, HACS validation, Ruff, pytest, Node tests), changelog check,
  automatic tag and release on merge when the version in `manifest.json` is new, Dependabot.

[Unreleased]: https://github.com/weskona/ha-energyboard/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/weskona/ha-energyboard/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/weskona/ha-energyboard/compare/v0.2.2...v0.3.0
[0.2.2]: https://github.com/weskona/ha-energyboard/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/weskona/ha-energyboard/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/weskona/ha-energyboard/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/weskona/ha-energyboard/releases/tag/v0.1.0
