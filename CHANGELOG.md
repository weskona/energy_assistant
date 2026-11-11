# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/weskona/ha-energyboard/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/weskona/ha-energyboard/releases/tag/v0.1.0
