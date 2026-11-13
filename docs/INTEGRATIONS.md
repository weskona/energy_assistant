# Working together with other integrations

Energy Assistant is one of a few Home Assistant integrations that are meant to work as a team, and every one of
them runs on its own:

| Integration | What Energy Assistant takes from it | Where it shows |
|-------------|--------------------------------------|----------------|
| [PV Assistant](https://github.com/weskona/pv-assistant) | the configured PV, storage and grid sensors (as an offer in the config flow and the settings), the plants, day figures, forecast, plant fault | Settings, config flow, **PV** tab |
| [Tariffy](https://github.com/weskona/tariffy) | electricity price (live for a dynamic tariff), feed-in tariff, contract cost, balance and forecast | **Costs** tab |
| [EV Assistant](https://github.com/weskona/ev_assistant) | wallbox status and power, charge level, solar share, charging of today, charging advice | **EV** tab, a row in the device list |
| [Amortix](https://github.com/weskona/amortix) | savings, investment, progress, remaining amount, savings per day, time left, payback date | **Payback** tab |

Besides the sibling integrations Energy Assistant reads the **Energy dashboard of Home Assistant** (its preferences, read
only) to offer its energy counters for the Balance tab, and the long-term statistics (recorder) for the Balance tab.

## The rules

- **Read only.** Energy Assistant never changes anything in the other integrations.
- **Everything is optional.** Without a sibling nothing is shown for it and nothing breaks. A sibling does not need
  Energy Assistant either.
- **Nothing is configured twice.** The sensors are found automatically; PV Assistant additionally offers its sensors
  once, with a button (settings) or a question (config flow). A tab only exists when its integration was found.
- **No fixed entity ids.** The sensors are found in the entity registry, so renaming an entity does not matter.

## What is read exactly

This is the contract. If a sibling changes one of these names, `custom_components/energy_assistant/providers.py`
and `pv_assistant.py` have to follow.

**PV Assistant** (`pv_assistant`)
- Config entry (data and options): `production_power_sensors`, `storage_combined_power_sensors`,
  `invert_storage_combined_power`, `storage_in_power_sensors`, `storage_out_power_sensors`, `abs_storage_power`,
  `grid_import_power_sensors`, `feed_in_power_sensor`, `invert_feed_in_power`.
- Plants: `hass.data["pv_assistant"]["settings"]` (`inverters`, `strings`).
- Sensors by translation key: `production_today`, `feed_in_today`, `self_consumption_rate_today`, `autarky_today`,
  `benefit_today`, `forecast_reached_today`, `expected_feed_in_tomorrow`, `best_window_tomorrow` (attribute `end`),
  `storage_usable`, `storage_empty_at`, binary sensor `string_fault` (attribute `plants`).

**Tariffy** (`tariffy`), sensors by translation key
- `arbeitspreis` (attributes `sparte`, `arbeitspreis_aktuell`; only electricity contracts), `einspeiseverguetung`,
  `kosten_bisher`, `guthaben_bisher`, `prognose_real`.

**EV Assistant** (`ev_assistant`)
- Sensors by translation key: `home_kwh` (attributes `evcc_live` or `home_generic_live` with `charge_power` in kW,
  `charging`, `connected`, `vehicle_soc`, `session_solar_pct`, and `solaranteil_pct`), `kwh_day`, `cost_day`,
  binary sensor `charge_before_pv_recommended`.
- Config entry: `home_entity` (the power sensor of the wallbox, so it is not listed twice).

**Amortix** (`amortix`)
- No translation keys: sensors by unique id `<config entry id>_<key>` with the keys `einsparung`, `investition`,
  `fortschritt`, `verbleibend`, `tagesschnitt`, `resttage`, `datum`. Sensors of single devices (with a suffix) are
  not used. The entry of the mode `overview` replaces the others.

## Text for the READMEs of the other integrations

English:

> **Works with Energy Assistant (optional).** If [Energy Assistant](https://github.com/weskona/energy_assistant) is
> installed as well, it reads this integration (read only) and shows its data in its own panel. This integration
> runs on its own and does not need Energy Assistant.

Deutsch:

> **Arbeitet mit Energy Assistant zusammen (optional).** Ist [Energy Assistant](https://github.com/weskona/energy_assistant)
> ebenfalls installiert, liest es diese Integration (nur lesend) und zeigt ihre Daten in seinem eigenen Panel. Diese
> Integration läuft auch allein und braucht Energy Assistant nicht.
