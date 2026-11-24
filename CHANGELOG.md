# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Devices tab sorted by size:** the ring, the bar and the legend of the categories run from the smallest to the biggest, the stacked bars have the smallest category at the bottom, and the tooltip of a bar lists the biggest category first and the smallest last. *Not assigned* is always the last one, in the legend and in the tooltip. The ring of every category card also runs clockwise from the smallest to the biggest device (the list next to it keeps the biggest first).

## [0.36.0] - 2026-11-23

### Changed

- **Panel file is fetched again after every change:** the address of the panel file now carries a short hash of its content next to the version (`?v=0.35.0-1a2b3c4d`), so the browser no longer keeps an old copy when the panel changed without a new version.

### Added

- **List of sources:** the Settings tab has a new card *Sources from other integrations*. It lists every sensor that Energy Assistant takes from Tariffy, EV Assistant, PV Assistant and Amortix, grouped by integration (and contract, vehicle or entry), with the current value and what it is used for. A sensor you untick (and save) is no longer used; it stays in the list so you can tick it again. This is the way to get rid of the *Wallbox* row that EV Assistant adds to the device list when the same wallbox is already one of your device sensors under another sensor. The choice is stored in the new setting `source_exclude`; everything is used by default. The `energy_assistant/integrations` command now also answers with `sources` (the full list, also the deselected ones) and leaves the deselected sensors out of the rest of its answer.

## [0.35.0] - 2026-11-20

### Added

- **The picture in the Power tab:** the Power tab starts with the same house as the results card of the Consumption tab, but with the power of now: the consumption in watts, where it comes from (sun, grid, storage, feed-in) as four bars, a ring with the self-sufficiency, what the sun saves per hour (with Tariffy) and the electric car with its charging power (EV Assistant, read only). The picture shows the flows of now in whole watts from 20 W on (sun, grid import and feed-in on two wires, charging and discharging of the storages, the car) and the live charge level of every storage. The notices stay on top, the existing cards follow below unchanged.

## [0.34.0] - 2026-11-20

### Added

- **Energy flow to the electric car:** the picture of the results card now shows what the wallbox of EV Assistant charged in the shown period (the same kWh as in the sentence below) as a green dashed line with an arrow from the house to the car in the garage. It needs EV Assistant and the statistics of the power sensor of its wallbox.

### Changed

- **Better car in the picture:** the electric car in the garage keeps its rear view, but the wheels are no longer flat dark ovals: tall tires with a tread stand on the floor below the body, and the roof, rear window and body are a little rounder with a soft sheen.

### Fixed

- **Grass in the picture:** the green ground was wider than the drawing, so its rounded ends were cut off on the left and on the right. It now fits and ends round.

## [0.33.2] - 2026-11-20

### Changed

- **Slim period bar:** the card with the period picker (*Day / Week / Month / Year* and the arrows) in the Consumption and Devices tabs is much lower: little padding, smaller buttons, one slim row.

### Fixed

- **Charge level of the storage in the picture:** the percentage under a storage was always the level of now, also when you paged to another day, week, month or year. A past period now shows the charge level at its end (long-term statistics of the charge level sensor; a dash if there are none), the running period still the live level.

## [0.33.1] - 2026-11-20

### Changed

- **Energy flow without motion:** the lines of the energy flow in the picture of the results card no longer move. They are thin dashed lines that stand still, with a small arrow head for the direction, and the line width follows the share of the flow a little (the biggest flow in the picture is the thickest). Grid import and feed-in run on two separate parallel wires between the pole and the house.

### Fixed

- **Results card always there:** the results card was only shown when the period had production, so it disappeared at night and on days without sun. It is now always on top of the Consumption tab once the balance is loaded, with 0 kWh when nothing was produced (also without a production counter).

## [0.33.0] - 2026-11-20

### Added

- **Energy flow and power pole in the picture:** a power pole stands left of the house, it is the grid. Moving dashes show the energy flow of the shown period in kWh in the picture of the results card: the sun into the house (production), two separate wires between the pole and the house, import from the upper and feed-in to the lower cross arm (grid import in blue towards the house, feed-in in purple towards the pole) and the lines to the storages (charging in pink, discharging in teal), each with its kWh. A flow without energy is left out, the storage lines need a storage. It works in every period (day to year), not only now. With reduced motion set in the system the dashes stand still.

- **Storages in the picture:** in the picture of the results card (where the door was) a home storage unit for every storage stands (housing on two feet with a bolt, a display slot with six LED segments filled up to its charge level, a status light and the percentage below it; green from 60 %, amber from 25 %, red below). The first storage is the charge level sensor as before, the new setting *Further storages: charge level sensors* (*Solar and storage*) adds more; they stand apart in front of the house, and with several storages the picture grows so the card moves to the right; up to four batteries are drawn, without a storage the door stays. With several storages the Storage card of the Power tab shows the mean charge level.

- **Results card:** the first card of the Consumption tab (below the period picker) sums up the shown period like the result page of a PV calculator, in the glow design of the panel (glowing green card edge, small uppercase titles and labels, the panel colors, a sun with rays that hit the solar modules, glowing windows, an electric car seen from behind in the garage): *Your results* with the kilometres driven electrically in a frame at the top right, *Annual yield* (daily, weekly or monthly yield for the other periods) as a big figure with four wide bars (quarters of the year, weeks of the month, parts of the day, the seven days of a week), a ring with the self-consumption and a house in the middle, *Electricity cost / Savings* with a piggy bank (self-used solar energy at the price of your Tariffy contract plus the feed-in revenue, whole euros; only with Tariffy) and a sentence in a band at the bottom. On wide screens the card spans the full width (like the other cards) and the layers are like the picture: a faded card behind, an evening house with lit windows in front overlapping the card. The kilometres come from what the wallbox of EV Assistant charged (statistics of its power sensor, read only) and the new setting *Electric car: consumption* (kWh per 100 km, *Energy counters*); without it the sentence names the kWh, without a car the sentence is about the self-sufficiency. The card only appears with production.

### Changed

- **Own values for every storage:** with several storages each one shows its own charging and discharging in the picture (pink and teal lines with their kWh above it). The energy counters *Storage charge* and *Storage discharge* are matched to the storages in the order of the settings (first counter = first storage, the first storage is the charge level sensor, then the further ones); this needs as many counters as storages. Otherwise the totals of all storages are shown above the group, as before.

- **Smaller House card:** the tiles under the live power are smaller and denser (two rows instead of three on a normal card). They always show the same set, which depends only on the configured sensors and never on the current values, so the card keeps its size and nothing flickers in or out during the day. The tile *PV direkt verbraucht* is called *PV direkt* (*Solar direct*) so it fits on one line.

- **Past years save at once:** the *Add* / *Apply* button of the past years saves the settings right away, so you no longer have to scroll down to the Save button. (It saves the whole form, like the Save button.)

### Fixed

- **Colors of the entered years:** the bars of *Energy per year* use the colors of the balance chart (consumption, production, grid import, feed-in) instead of one grey for all, and the kind has a colored dot.

## [0.32.0] - 2026-11-20

### Added

- **Unusual consumption notice:** a device is compared with its own pattern, without any setup. When each of its last three full hours was clearly above the highest hourly mean it reached on the days before (at least 30 % and 20 W more; long-term statistics of the last 8 days), the Notices card says so with the average and the usual maximum, for example a fridge or freezer that suddenly runs far longer than usual. A wallbox that regularly charges for hours is not reported, because that is its pattern. The plain notice about running for hours now only applies to devices without a pattern yet.
- **No notices for these devices:** a list in the settings (*Devices*) for devices that never trigger a notice about running for hours or unusual consumption.

## [0.31.1] - 2026-11-19

### Fixed

- **Colors of the change to the period before:** green and red now follow what is good for each value. More consumption, grid import or cost is red and less is green; more production, feed-in, revenue, storage in and out, self-sufficiency and self-consumption is green and less is red. An unchanged value stays plain.

## [0.31.0] - 2026-11-19

### Changed

- **Past years by hand, with a kind:** besides the house consumption you can now enter the production, the grid import and the feed-in of a past year (what you enter is chosen in the form), every row has a pencil to edit it (also its year and kind) and a bin to delete it. In the year view each entered kind fills in only where Home Assistant has no statistics for it, self-sufficiency and self-consumption are derived when the data allows it, and the chart compares the entered years per kind. Values entered with 0.30.0 (house only) are kept as consumption.

- **Colored changes:** the arrow and the text of the change to the period before (*▲ 8 % vs. last month*) are red when the value went up and green when it went down; an unchanged value stays as it was. This applies to the balance tiles and the costs of the period.

## [0.30.1] - 2026-11-15

### Fixed

- **Devices tab on a phone:** with long device names a category card was wider than the screen and pushed the whole page sideways (cards and tab bar were cut off). The cards of the Consumption and Devices tabs now always stay within the screen width; long names are shortened with an ellipsis.

### Changed

- **Icons in the Consumption tab:** the *Areas* and *Labels* cards show the icon of every area and label (and the color of a label), like the Power tab. An area or label without an icon gets the default one; devices have no icon on either tab.

## [0.30.0] - 2026-11-15

### Added

- **Past years by hand:** in the settings (*Energy counters*, *Past years (entered by hand)*) you can enter the total consumption of the house for a past year (kWh, optionally the cost). In the year view of the Consumption tab, a year for which Home Assistant has no statistics shows that value (and the change to the year before, which can be entered by hand as well) together with a bar per entered year. Statistics always win: a year that has statistics never uses the entered value. Entries are checked (year from 1990 and not in the future, finite and positive numbers, upper limits) in the panel and again in the backend.

### Fixed

- **Group cards line up:** when one of the cards *Areas*, *Labels* and *Devices with sensors* has no *Show all* button (its list is exactly as long as the rows shown), it keeps the place of the button, so the hints of the three cards start at the same height.
- **Cost tables sorted by cost:** the tables *Cost per label*, *Cost per area* and *Cost per device* in the Costs tab list the biggest cost first (by the year, then the month, the week and the day; equal costs by name) instead of the order of the selection.

## [0.29.2] - 2026-11-14

### Fixed

- **Tab bar on a phone:** with many tabs the bar was wider than the screen and pushed the whole page sideways. On screens up to 900 px it now stays within the screen, is a little more compact and scrolls sideways; the active tab is brought to the middle when you change the tab.

## [0.29.1] - 2026-11-14

### Fixed

- **Phone layout:** on narrow screens (up to 640 px) the rows of the lists show the complete device name (it wraps instead of being cut off), with the cost or year figure below it and a small line, value and share on the right; the *Normal* button of the standby card no longer covers the name; headers of cards wrap instead of squeezing; the table of costs per label fits; and the chart of the Devices tab is drawn at the real width of its box, so its labels stay readable.

### Changed

- **Same height and rows for the group cards:** *Areas*, *Labels* and *Devices with sensors* in the Consumption tab now show as many rows as the shortest of them has (at least 5, at most 8), like *Biggest consumers* and *Always on*; *Show all* unfolds the rest of a card, which then scrolls inside it, and the cards of a row keep the same height.

## [0.29.0] - 2026-11-14

### Added

- **Devices tab:** a new tab *Devices* shows the energy of the devices grouped by the selected labels for the chosen day, week, month or year (same period picker as the Consumption tab): a ring and a bar of the categories with kWh and share, the energy per hour, day or month as stacked bars with a tooltip and, with energy counters, the part of the house that no category explains (*not assigned*), then one card per label with a ring and its devices (five at first, *Show all* for the rest) and its share of the house. It uses the long-term statistics and creates no sensors.

## [0.28.1] - 2026-11-14

### Changed

- **One name for every device, everywhere:** a device is called the same in the device list, the consumers and standby lists, the area and label tooltips, the settings (list, chips, name field) and the names of its sensors: the display name if you gave one (pencil), else the name of its sensor without the word *Leistung* or *Power* (*Staubsauger* instead of *Staubsauger Leistung*). The name field of a device with its own sensors shows that name as real text, edits are stored as the display name, and the column of the field is wider; only a name that differs from the automatic one is stored, so an untouched name keeps following the sensor.

## [0.28.0] - 2026-11-14

### Added

- **Devices card in the Consumption tab:** the devices that have their own sensors get a card *Devices with sensors* (energy per device for the shown period, from the long-term statistics) next to the *Areas* and *Labels* cards. The three cards share a grid of up to three columns.

## [0.27.1] - 2026-11-14

### Changed

- **No limit for devices with their own sensors:** the limit of 20 is gone, you can switch on as many devices as you like. The counter in the settings still says how many sensors the selection creates.

## [0.27.0] - 2026-11-14

### Fixed

- An error in the log when the integration was unloaded or reloaded (the stop of the sensors per label and area returned a list instead of nothing).
- The list of matching sensors in the device settings now opens and closes with a click on its header (the page was not redrawn after the click).

### Removed

- **Folding of cards:** the cards can no longer be folded with a click on their title (arrow in front of the title); the cards are always open. The lists still unfold with *Show all*.

### Changed

- **One tooltip style everywhere:** the bars of the energy chart (balance) and every other element with a hint (device, area and label rows, filter buttons, chips, names) now show the tooltip of the history chart instead of the plain browser tooltip: a title, rows with a colored dot, the value in bold and the name. The bar under the pointer is highlighted.

### Added

- **Consumption and cost sensors per area:** every selected area gets four energy sensors (day, week, month, year) and, with a Tariffy price, four cost sensors, built like the ones of the labels (same protection against bad values, priced step by step, created and removed with the selection, German names *Verbrauch / Kosten täglich, wöchentlich, monatlich, jährlich*). The sensors of an area are the power sensors in the area (the entity's own area, else its device's). The Consumption tab has an *Areas* card (from the statistics, every period) next to the *Labels* card, the Costs tab a *Cost per area* table, and a tariff can be chosen per area.
- **Consumption and cost sensors per device:** a *Sensors* button in the device list of the settings gives a device four energy sensors and, with a Tariffy price, four cost sensors, like labels and areas. Nothing is selected at first, at most 20 devices (a counter shows what a selection creates), and switching a device off deletes its sensors when saving. The name is prefilled (display name, else the sensor name without *Leistung*) and can be changed before the sensors exist; a name changed later renames the sensors (not their entity id). A device whose source is gone or excluded keeps its sensors until it is switched off. A tariff can be chosen per device; the Costs tab has a *Cost per device* table.
- **Nothing is selected at first:** a new installation creates no label, area or device sensors; the settings say what a selection creates. An empty area selection (all areas on the Areas card of the Power tab) creates no sensors either.
- **Normal and avoidable standby:** a *Normal* button per row of the standby card marks a load that is meant to run all the time (server, fridge); it gets a grey bar and no longer counts as avoidable. The card title and a new tile *Avoidable standby* show the rest in W, kWh per year and, with Tariffy, cost per year. The marking is saved at once (administrators), nothing is marked at first.
- **Period picker in the Costs tab:** a new card *Costs in the period* shows the grid cost, the feed-in revenue and the balance of the chosen day, week, month or year with the change to the period before. It uses the same period as the Consumption tab. The three money tiles moved there from the balance of the Consumption tab. The *Cost per label* table keeps showing the running day, week, month and year.
- **The comparison names the period:** instead of *vs. previous period* the tiles say *vs. yesterday*, *vs. last week*, *vs. last month* or *vs. last year* (German: *ggü. gestern*, *letzter Woche*, *letztem Monat*, *letztem Jahr*); when you look back they say *the day before*, *the week before* and so on (*Vortag*, *Vorwoche*, *Vormonat*, *Vorjahr*). It applies to the balance and to the period costs.

## [0.26.0] - 2026-11-13

### Changed

- **Balance and consumption in one tab:** the Balance tab is gone; its figures (energy of the period from your energy counters, change to the period before, self-consumption, self-sufficiency, costs and the bars) now sit at the top of the Consumption tab, followed by the devices. One period picker (day, week, month, year, with arrows) on top acts on everything below it. The tab exists with energy counters, with devices, or both. An old stored selection of the Balance tab leads to the Consumption tab.

- **Labels card with history:** the *Labels* card of the Consumption tab now takes the energy per label from the long-term statistics of the power sensors that carry it, for every period (day, week, month, year and the earlier ones), complete up to the running hour. A label whose sensors only partly have statistics says *n of m sensors*. The energy sensors per label stay for dashboards and automations; they count from the moment they were created.

- **Device settings, more compact:** every sensor list keeps its chips and its input in one box (click the box to type), on wide screens the four inputs share a fixed four-column row of equally high boxes (two columns on medium, one on narrow screens), the standby explanation is a note below them; the labels are shorter (the examples are in the placeholders). The list of matching sensors is folded behind a header with the counts (*23 matching sensors, 14 excluded*) and opens with one click.

## [0.25.0] - 2026-11-13

### Added

- **Tariff per label:** with several Tariffy electricity contracts, a contract can be chosen per selected label (settings, Labels section), e.g. the heat pump tariff for the heat pump label. Without a choice the first electricity contract is used as before. A chosen contract is never replaced by another one; switching closes the running step with the old price.

### Changed

- **German names of the label sensors:** *Verbrauch täglich / wöchentlich / monatlich / jährlich* and *Kosten täglich / wöchentlich / monatlich / jährlich* instead of today, this week and so on.
- **Tidier device settings:** the input of every sensor list sits directly under its label, the chips below it, so the inputs of one row line up. The four inputs (name patterns, exclude patterns, additional sensors, standby devices) share one row on wide screens, the long list of excluded sensors takes the full width and scrolls when it is very long. The explanation of the standby field moved from its label into a hint.

## [0.24.0] - 2026-11-13

### Added

- **Energy per label:** for every selected label four energy sensors (kWh) are created: today, this week, this month, this year. They integrate the power of the label's sensors, follow the time zone of Home Assistant, survive a restart and are created and removed with the label selection, without a reload. The Consumption tab has a new *Labels* card with the kWh of each label for the selected period (the running period only, the sensors have no history).
- **Cost per label:** with a Tariffy price, four cost sensors per label (today, week, month, year). The cost is priced step by step with the unit price valid at each moment, so a tariff change never recalculates what was already counted. The Costs tab has a *Cost per label* card with today, week, month and year per label.
- **Protected counters:** implausible readings (text, NaN, infinity, negative, above 100 kW), pauses longer than 5 minutes, bad prices and bad stored values never reach the label sensors.

### Fixed

- In the Consumption tab the rows of *Biggest consumers* and *Always on (standby)* line up: the hint of the standby card moved below its list, so both lists start at the same height.

## [0.23.0] - 2026-11-13

### Fixed

- The bar of a device in *Biggest consumers* shows its share of the total energy of the selected period (day, week, month, year), no longer its share of the biggest device.
- The bar of a device in *Always on (standby)* shows its share of the base load, no longer its share of the biggest standby device.

### Changed

- **Consumption tab in two columns:** the cards *Biggest consumers today* and *Always on (standby)* stand side by side in one row, one below the other on narrow screens. Both cards have the same height and show as many rows as the shorter list has (at least 5, at most 8); the rest unfolds with *Show all* per list, and an unfolded long list scrolls inside its card, like in the Power tab. The *Biggest consumers* list is no longer cut at 10 devices.

### Added

- **Standby devices can be defined:** a new field *Standby devices* in the settings, the config flow and the options. When set, the *Always on (standby)* card of the Consumption tab lists exactly these devices (also below 2 W) and the *Always-on devices* tile sums them up; empty keeps the automatic detection.

## [0.22.0] - 2026-11-13

### Changed

- **Time zone of the Home Assistant instance:** periods and times no longer follow the browser but `hass.config.time_zone`: the limits of the day, week, month and year in the Balance and Consumption tabs (days with a clock change have 23 or 25 hours, also zones with a half-hour offset), the labels, the time axis, the table and the tooltip of the history chart, the "empty at" time of the storage, the day of the usual base load and the energy of a device since midnight. An unknown time zone falls back to the browser's.

### Added

- **Device evaluation, completed:** every device row has a small line of its power (24 hours, or the selected period) in front of the value, in the Consumption tab and in the Devices card of the Power tab (whose tooltip adds the energy of today). A row of the Consumption tab opens to a larger line and the figures of the device: energy, cost (with Tariffy), average power, peak, always-on power and the running time.
- **Config flow and options:** the storage step asks for the charge level sensor, the capacity and the minimum level; a new step **Energy counters** asks for the counters of the Balance tab and suggests those of the Energy dashboard of Home Assistant the first time. Config and options flow now have four steps.

### Fixed

- In the options flow a field that was emptied is cleared; before, the stored value came back when the options were merged.

## [0.21.0] - 2026-11-13

### Added

- The Consumption tab has the **period picker** of the Balance tab (day, week, month, year, arrows, label). Today still comes from the history; every other period comes from the long-term statistics: the energy of the devices from their hourly means (daily means for a month and a year), the base load as the lowest hourly mean of the house and of every device in the period (at most its last 31 days). Without a house power sensor the house power is the balance of the separate sensors per hour. The picker is a shared component of both tabs.

### Changed

- The card of the biggest consumers is titled **Biggest consumers** (no longer *today*), the period is in the picker.

## [0.20.0] - 2026-11-13

### Added

- **Storage card** on the Power tab: the charge level as a bar with the minimum level marked, the status (charging, discharging, idle), what is stored and usable (with the capacity) and, from the current power, when the storage is empty or full. New settings in the section *Solar and storage*: charge level sensor, storage capacity (kWh) and minimum charge level (%). PV Assistant offers its charge level sensor, capacity and minimum level with the button of the notice (also in the config flow).
- **Notices** card at the top of the Power tab, only when something applies: a plant fault of PV Assistant, a negative electricity price of a dynamic tariff in Tariffy, devices that have been running for hours (not those that never stopped) and a base load well above the usual one (needs a house power sensor with three full days of statistics). The device history is now also loaded on the Power tab for this.
- The settings accept numbers (`battery_capacity`, `battery_min_soc`); empty means not set.

## [0.19.0] - 2026-11-13

### Added

- **Consumption tab** (appears as soon as devices are set up, no extra setting): the **base load** of the house (the lowest 30-minute average of the last 24 hours) extrapolated to kWh per year and, with Tariffy, to the cost per year, with the share the always-on devices explain; the **biggest consumers of today** in kWh with their share and, with Tariffy, the cost; the **always-on devices** (standby, lowest 30-minute average of the last 24 hours from 2 W on) with kWh and cost per year. The energy of a device is its power of the 5-minute steps since midnight, read from the history of Home Assistant.

## [0.18.0] - 2026-11-13

### Added

- **Balance tab** (appears as soon as an energy counter is configured): the energy of a day (per hour), a week from Monday (per day), a month (per day) or a year (per month) in kWh, with arrows to page through the periods. Tiles for production, consumption, grid import, feed-in, to and from storage, self-sufficiency and self-consumption, each with the change to the period before; with Tariffy also the grid cost, the feed-in revenue and their balance, valued with the price of the contract. Grouped bars per period with a tooltip and **Show as table**.
- Settings: section **Energy counters (kWh)** for PV production, grid import and export, to and from storage and the house consumption (cumulative counters or utility meters, several per field are summed). The Balance tab reads their long-term statistics, so the existing history is used from the first day.
- If the Energy dashboard of Home Assistant is set up, a notice offers its counters with one button. It is only read (`energy_assistant/energy_suggestion`), nothing is changed in the dashboard.
- The manifest lists `energy` and `recorder` as `after_dependencies`.

## [0.17.0] - 2026-11-13

### Changed

- The history card shows the power chart in the style of PV Assistant, computed from our own sensors (PV Assistant is not needed): lines for production (with a light area), feed-in, storage (turquoise from the storage, pink into the storage, drawn through the zero line), solar used directly, grid import and house consumption, an axis with round values in watts (also below zero for the charging), time ticks every 3 hours, the names at the line ends, a legend, a tooltip with all values at the pointer and **Show as table** with the hourly means. Series without data are left out. The chart is drawn at the real width, so the text stays readable on a phone (no end labels on a narrow chart). Before there were only the house power and the direct solar use.
- The tooltip stays at the pointer while new values arrive; the table stays open.
- The tooltip names the sources behind a value like PV Assistant: the production per plant (sensor) with its share, and what the directly used solar power is made of (the house consumption minus grid import and storage with a measured house, otherwise production minus feed-in and charging), without the parts that are 0. The storage row reads *Storage (+ discharge / − charge)* and takes the color of its direction; the time shows day, month and time.

## [0.16.0] - 2026-11-13

### Added

- With EV Assistant the wallbox is a row of the device list (**Wallbox · vehicle**): its charging power counts in the total, in the share of the house and takes away from "Other (not measured)"; the tooltip shows the solar share of the session. The row is left out when the wallbox sensor is already a device or was excluded (also by pattern), so nothing is counted twice.
- Every card except the house card can be folded with a click (or Enter / Space) on its title. The choice is remembered in the browser.
- `docs/INTEGRATIONS.md` and a section **Working together** in the README: which data is read from PV Assistant, Tariffy, EV Assistant and Amortix, the rules (read only, everything optional, found over the entity registry) and a text for the READMEs of the other integrations.

## [0.15.0] - 2026-11-13

### Changed

- The line under the tile **Solar used directly** now shows where the solar production goes instead of the share of the direct use alone: for example `40 % House · 60 % Storage` (parts: house, storage, grid). The percentages add up to 100, parts that round to 0 % are left out. The storage part is the solar share of the charging, so charging from the grid does not count as solar.

## [0.14.1] - 2026-11-12

### Fixed

- Wrong house power when a signed meter was also used as an import sensor (for example after taking over the sensors of PV Assistant): import and feed-in showed at the same time and the house power came out too low. Separate production, import and export sensors now ignore negative readings (like PV Assistant does), and **separate sensors win over the combined sensor**: the combined sensor only fills in what no separate sensor covers (its negative part is the export, its positive part the import). Before, both were added, which counted the same flow twice. This applies to grid and storage, also in the history chart.

### Added

- **Self-sufficiency** tile on the Power tab: the share of the current consumption that does not come from the grid. It needs an import value and a house power above zero.

## [0.14.0] - 2026-11-12

### Changed

- The data of the sibling integrations moved from the Power tab to their own tabs, which only exist when the integration was found: **PV** (PV Assistant: day figures, forecast, storage, plant fault and the new card **PV by plant**), **EV** (EV Assistant: wallbox), **Costs** (Tariffy) and **Payback** (Amortix). The Power tab shows the house, the history and the lists of devices, areas and labels again. A tab that vanishes (integration removed) leads back to Power.
- **PV by plant** is a card with the plants, their power, share and a bar instead of a row that had to be opened.

### Added

- The Costs tab also shows the contract figures of Tariffy: cost so far, balance so far and the forecast for the contract end.

## [0.13.1] - 2026-11-12

### Changed

- The notice at the top of the Settings tab now lists every sibling integration that was found (PV Assistant, Tariffy, EV Assistant, Amortix) and what Energy Assistant shows from each on the Power tab, not only PV Assistant. The question to take over the sensors of PV Assistant stays in it. The notice also appears when only Tariffy, EV Assistant or Amortix is installed.

## [0.13.0] - 2026-11-12

### Added

- Optional link to [Amortix](https://github.com/weskona/amortix): when it is installed, the Power tab shows a card **Payback** with the total savings, the investment, the progress (with a bar), the remaining amount, the savings per day, the time left and the expected payback date. The overview entry of Amortix replaces the single entries; without an overview every entry gets its own block. Amortix has no translation keys, so its sensors are found over the unique ids of the entity registry (`<entry id>_<key>`); sensors of single devices are not taken. Tiles without a value are left out and without Amortix nothing is shown.

## [0.12.0] - 2026-11-12

### Added

- Optional link to [PV Assistant](https://github.com/weskona/pv-assistant), part 2: when it is installed, the Power tab shows a card **PV today and tomorrow**. Today: production, feed-in, self-consumption, self-sufficiency, forecast reached and benefit. Storage: usable energy and when it is empty. Tomorrow: expected feed-in and the best three-hour window. A plant fault of PV Assistant shows as a warning with the affected plants. The values come live from its sensors, found over the entity registry (`energy_assistant/integrations`); tiles without a value are left out and without PV Assistant nothing is shown.

## [0.11.0] - 2026-11-12

### Added

- Optional link to [EV Assistant](https://github.com/weskona/ev_assistant): when it is installed, the Power tab shows a **Wallbox** block per vehicle with the live status (charging with the power in W, connected, not connected), the charge level, the solar share of the session, what was charged today (kWh) and what it cost, and the note **Charge before PV is recommended** when EV Assistant advises it. The live data comes from the attributes of its `home_kwh` sensor (`evcc_live` with evcc, otherwise `home_generic_live`). Without EV Assistant nothing is shown.

## [0.10.0] - 2026-11-12

### Added

- Optional link to [Tariffy](https://github.com/weskona/tariffy): when it is installed, the Power tab shows **Costs right now**: the electricity price (the live price of a dynamic tariff, otherwise the unit price of the contract), what the grid import costs per hour, what the feed-in earns per hour (feed-in tariff of Tariffy) and what the directly used solar power saves per hour. Without Tariffy nothing is shown.
- Framework for sibling integrations: `providers.py` finds their sensors in the entity registry (platform and translation key, independent of the language) and the WebSocket command `energy_assistant/integrations` hands the entity ids to the panel, which reads the live values from the states. Everything is read only, a missing integration simply gives no answer.

## [0.9.0] - 2026-11-12

### Added

- The config flow (and the options flow) asks first whether to take over the sensors when PV Assistant is installed. With "yes" the fields of the following steps are pre-filled (solar production, storage, grid) and can still be changed. Without PV Assistant the flow starts as before.
- WebSocket command `energy_assistant/pv_suggestion`: what PV Assistant offers (settings, notes, plants), or `null`. PV Assistant is only read.

### Changed

- The mapping from PV Assistant to the settings now lives in the backend (`pv_assistant.py`), one rule for the config flow and the panel. The panel no longer asks PV Assistant directly, it asks the backend.
- The fields **Grid import separate** and **Grid export separate** of the config flow accept several sensors, like the Settings tab. Entries that stored a single sensor keep working.

## [0.8.0] - 2026-11-12

### Changed

- **Breaking:** the integration is now called **Energy Assistant** (domain `energy_assistant`, folder `custom_components/energy_assistant`, release file `energy_assistant.zip`, WebSocket commands `energy_assistant/…`, panel `energy-assistant-panel` at `/energy-assistant`). The repository is `weskona/energy_assistant`. Existing installations of the old `energyboard` domain have to be removed and set up again: delete the old integration and the folder `custom_components/energyboard`, install this version and add **Energy Assistant** in *Settings → Devices & services*.
- Removed the file `.storage/core.config_entries` that was committed to the repository by mistake.
- The PV Assistant notice now takes over **all** sensors, nothing is left out any more. A feed-in sensor that PV Assistant reports as negative values is used as the combined grid sensor (import +, feed-in −) and is not counted twice when it is also an import sensor. Separate charging and discharging sensors that report negative values are taken over too: the separate charging and discharging fields count the magnitude of their sensors (also in the history chart).

## [0.7.2] - 2026-11-12

### Added

- The PV Assistant notice also takes over the **grid** sensors: the grid import power sensors and the feed-in power sensor. A feed-in sensor that PV Assistant reports as negative values is not taken over; the notice says so.

## [0.7.1] - 2026-11-12

### Changed

- The PV Assistant hint in the Settings tab is now a prominent notice at the top that asks whether to take over the sensors and lists what would be taken over. The button now also takes over the **storage** sensors (combined with its sign, charging and discharging). Separate charging and discharging sensors that PV Assistant reports as negative values are not taken over; the notice says so.

## [0.7.0] - 2026-11-12

### Added

- Optional link to the [PV Assistant](https://github.com/weskona/pv-assistant) integration. When it is installed, the Settings tab offers its production power sensors as **Solar production** (one click, administrators) and the Power tab shows a row **PV by plant** that opens to the plants with their power. Energyboard only reads the configuration over `pv_assistant/config`; without PV Assistant, or if the call fails, nothing changes.

## [0.6.0] - 2026-11-11

### Added

- Area and label rows can be opened with a click (or Enter / Space): the sensors that were summed up are listed below the row with their power, strongest first. Each row opens and closes on its own.

## [0.5.1] - 2026-11-11

### Fixed

- The totals in the headers of the Devices card and the Areas card (automatic mode) now include the "Other (not measured)" row, so they add up to the house power instead of staying below it.

### Changed

- Power is always shown in watts without decimal places (for example `1,900 W` instead of `1.9 kW`), on the tiles, in the lists, in the chart axis and in the settings. Sensors reporting kW or MW are still converted.

## [0.5.0] - 2026-11-11

### Added

- Areas can be chosen in the Settings tab like the labels: a checkbox list of the areas of Home Assistant that have power sensors (plus already selected ones), with the number of sensors and their power, and filters for activity, selection and text. The choice is stored as `area_ids`, also available in the config flow and options flow. **Nothing selected** keeps showing all areas (plus "No area"), **with a selection** only the selected areas are shown.

### Changed

- The Areas card now sums up **all power sensors in an area** (like the labels, no name pattern needed) instead of only the sensors of the device list. The sensors of the energy balance, the exclude list and the exclude patterns still apply. The rows count "power sensors" instead of "devices".
- The devices, areas and labels lists show the same number of rows before they fold: as many as the shortest list has (at least 5, at most 8; idle rows do not count). Each list can still be unfolded on its own with "Show all".

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
- An expanded list on the Power tab (devices, areas, labels) no longer jumps back to its start while you scroll it. Every new value from Home Assistant redraws the page, the scroll position is now kept.
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

[Unreleased]: https://github.com/weskona/energy_assistant/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/weskona/energy_assistant/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/weskona/energy_assistant/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/weskona/energy_assistant/compare/v0.2.2...v0.3.0
[0.2.2]: https://github.com/weskona/energy_assistant/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/weskona/energy_assistant/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/weskona/energy_assistant/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/weskona/energy_assistant/releases/tag/v0.1.0
