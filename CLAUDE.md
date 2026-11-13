# Energy Assistant: notes for Claude Code

## Project rules

- Code, comments, docs and the changelog are in English. German is only a translation (`STRINGS` en/de in the panel, `translations/en.json` and `de.json`).
- PV Assistant, EV Assistant, Tariffy and Amortix are sibling integrations of the same owner. Energy Assistant only reads them (never changes them) and must run without any of them.
- Releases come from `.github/workflows/release.yml` after a merge: bump `manifest.json` and turn `[Unreleased]` of `CHANGELOG.md` into the new version. Create a pull request only when asked.

## Rules for sensors that accumulate (counters, energy, cost)

These apply to every sensor that adds values up over time, such as the label energy and cost sensors in `sensor.py`. A counter only grows within its period, so one wrong value stays until the period ends. Bad input must never reach it.

1. **Check every reading.** Text, NaN, infinity, negative values and values above a plausible limit (`MAX_SENSOR_KW`) are not taken over; the last good value stays. Use `isfinite`, not only `isnan`. Unavailable, unknown or a missing source counts as 0 (the device is off or offline). Unknown units are ignored, never guessed.
2. **Do not integrate pauses.** A gap longer than `MAX_GAP` (restart, blocked loop, clock jump) adds nothing, because the power during it is unknown. Time that stands still or goes backwards adds nothing either.
3. **Price step by step.** Cost is added per step with the unit price valid at that moment, never recalculated from today's price. Close the running interval with the old price first (integrate, then take the new price). Ignore prices that are not finite, negative or above `MAX_PRICE`; keep the last good price. Without any price there is no cost sensor.
4. **Restore carefully.** A stored value is only taken over when it belongs to the running period (compare `period_start`) and is finite, not negative and below `MAX_RESTORED`.
5. **Periods follow the time zone of Home Assistant** (week from Monday). Reset each counter at its own boundary and add only the part of an interval that lies inside the new period.
6. **Create and remove with the selection** (no reload), derive unique ids from entry id, label and period, and keep an entity registry cleanup when something is deselected.
7. **Test every rule** in `tests/test_sensor.py` (bad readings, pause, backwards time, price change, bad restore, bad price) and document the protection in the README.

8. **Names follow renames, ids do not.** Home Assistant caches an entity's name; to rename a running sensor set the new `_attr_translation_placeholders`, drop the cached name (`self.__dict__.pop("name", None)`, like HA's own `_attr_` setters) and reset `_cached_friendly_name`, then write the state.
9. **Unload callbacks return nothing.** Anything passed to `entry.async_on_unload` must return `None` (a lambda that returns a list makes the unload fail).
10. **Selections are opt-in and capped.** Nothing is preselected so a new installation creates no sensors; a selection that creates sensors per item has a hard limit (`MAX_DEVICE_IDS`) in the backend and a hint in the settings. A source that disappears never deletes sensors on its own; only deselecting does.

Limits live as constants at the top of `sensor.py`; reuse them or add new ones there.
