# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/weskona/ha-energyboard/compare/v0.2.2...HEAD
[0.2.2]: https://github.com/weskona/ha-energyboard/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/weskona/ha-energyboard/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/weskona/ha-energyboard/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/weskona/ha-energyboard/releases/tag/v0.1.0
