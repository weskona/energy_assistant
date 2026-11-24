"""Constants for Energy Assistant."""

DOMAIN = "energy_assistant"
PANEL_URL_PATH = "energy-assistant"
STATIC_URL = "/energy_assistant_static"

# Separate sensors report positive values (W or kW).
CONF_HOUSE_POWER = "house_power"  # optional, one sensor
CONF_GRID_IMPORT = "grid_import"  # grid import, one sensor
CONF_GRID_EXPORT = "grid_export"  # grid export, one sensor
CONF_SOLAR_POWER = "solar_power"  # solar production, one or more sensors
CONF_BATTERY_DISCHARGE = "battery_discharge"  # from storage, one or more
CONF_BATTERY_CHARGE = "battery_charge"  # to storage, one or more
CONF_BATTERY_GRID_CHARGE = "battery_grid_charge"  # part of the above from grid
CONF_DEVICE_POWER = "device_power"  # additional device sensors, one or more
# Devices that count as standby (always on). When set, the Consumption tab lists exactly these.
CONF_DEVICE_STANDBY = "device_standby"
# Standby loads that are meant to run all the time (server, fridge): they are not counted as avoidable.
CONF_STANDBY_NORMAL = "standby_normal"
# Devices (power sensors) that never trigger a notice about long running or unusual consumption (wallbox, ...).
CONF_ALERT_EXCLUDE = "alert_exclude"
# Devices (power sensors) that get their own energy and cost sensors. Nothing is selected at first.
CONF_DEVICE_IDS = "device_ids"
# Tariffy price sensor per such device ({entity_id: entity_id}).
CONF_DEVICE_TARIFFS = "device_tariffs"
# Energy of past years entered by hand: {"2022": {"house": {"kwh": 3400.0, "cost": 950.0}, "solar": {"kwh": 5000.0}}}
# (cost optional). A kind is only shown when Home Assistant has no statistics for that year.
CONF_HISTORY_YEARS = "history_years"
# Plausible years and the largest yearly value accepted for a manual entry.
HISTORY_MIN_YEAR = 1990
# What can be entered per year: house consumption, production, grid import and feed-in.
HISTORY_KINDS = ("house", "solar", "import", "export")
HISTORY_MAX_KWH = 10_000_000.0
HISTORY_MAX_COST = 100_000_000.0
# Name patterns like "*_leistung": every power sensor that matches is listed as a device.
CONF_DEVICE_PATTERNS = "device_patterns"
# Sensors that a pattern must not add to the device list.
CONF_DEVICE_EXCLUDE = "device_exclude"
# Patterns for sensors that must not be listed as devices (e.g. "alpha_ess_*").
CONF_DEVICE_EXCLUDE_PATTERNS = "device_exclude_patterns"

# Combined signed sensors (one or more each, summed)
CONF_GRID_POWER = "grid_power"  # grid: import positive, export negative
CONF_BATTERY_POWER = "battery_power"  # storage: discharge positive, charge negative
CONF_INVERT_GRID = "invert_grid"
CONF_INVERT_BATTERY = "invert_battery"

# Storage: charge level sensor (%), capacity (kWh) and minimum charge level (%) for the storage card.
CONF_BATTERY_SOC = "battery_soc"  # one sensor
# Charge level sensors of further storages (the first one is CONF_BATTERY_SOC); the results card shows one
# battery for each.
CONF_BATTERY_SOC_MORE = "battery_soc_more"
CONF_BATTERY_CAPACITY = "battery_capacity"  # kWh
CONF_BATTERY_MIN_SOC = "battery_min_soc"  # %
# Consumption of the electric car in kWh per 100 km (for the kilometres of the results card).
CONF_EV_CONSUMPTION = "ev_consumption"
# Numbers (kWh, %): empty means not set. Upper limits for the settings API.
NUMBER_KEYS = (CONF_BATTERY_CAPACITY, CONF_BATTERY_MIN_SOC, CONF_EV_CONSUMPTION)
NUMBER_MAX = {
    CONF_BATTERY_CAPACITY: 100000.0,
    CONF_BATTERY_MIN_SOC: 100.0,
    CONF_EV_CONSUMPTION: 200.0,
}

# Energy counters (kWh, cumulative or utility meters) for the balance tab; one or more each, summed.
CONF_ENERGY_SOLAR = "energy_solar"
CONF_ENERGY_GRID_IMPORT = "energy_grid_import"
CONF_ENERGY_GRID_EXPORT = "energy_grid_export"
CONF_ENERGY_CHARGE = "energy_battery_charge"
CONF_ENERGY_DISCHARGE = "energy_battery_discharge"
CONF_ENERGY_HOUSE = "energy_house"  # optional, otherwise calculated from the others
ENERGY_KEYS = (
    CONF_ENERGY_SOLAR,
    CONF_ENERGY_GRID_IMPORT,
    CONF_ENERGY_GRID_EXPORT,
    CONF_ENERGY_CHARGE,
    CONF_ENERGY_DISCHARGE,
    CONF_ENERGY_HOUSE,
)

# Sensors of the sibling integrations (Tariffy, EV Assistant, PV Assistant, Amortix) that Energy Assistant
# does not take over (deselected in the list of sources). Everything is used by default.
CONF_SOURCE_EXCLUDE = "source_exclude"

LIST_KEYS = (
    CONF_GRID_POWER,
    CONF_BATTERY_POWER,
    CONF_GRID_IMPORT,
    CONF_GRID_EXPORT,
    CONF_SOLAR_POWER,
    CONF_BATTERY_DISCHARGE,
    CONF_BATTERY_CHARGE,
    CONF_BATTERY_GRID_CHARGE,
    CONF_BATTERY_SOC,
    CONF_DEVICE_POWER,
    CONF_DEVICE_STANDBY,
    CONF_STANDBY_NORMAL,
    CONF_ALERT_EXCLUDE,
    CONF_BATTERY_SOC_MORE,
    CONF_DEVICE_IDS,
    CONF_DEVICE_PATTERNS,
    CONF_DEVICE_EXCLUDE,
    CONF_DEVICE_EXCLUDE_PATTERNS,
    CONF_SOURCE_EXCLUDE,
    *ENERGY_KEYS,
)
# List keys that hold text patterns instead of entity ids.
TEXT_KEYS = (CONF_DEVICE_PATTERNS, CONF_DEVICE_EXCLUDE_PATTERNS)
# Labels (ids from the Home Assistant label registry) whose power sensors are summed up.
CONF_LABEL_IDS = "label_ids"
# Areas (ids from the Home Assistant area registry) shown on the Areas card. Empty = all areas.
CONF_AREA_IDS = "area_ids"
# Keys that hold ids of Home Assistant objects (labels, areas).
ID_KEYS = (CONF_AREA_IDS, CONF_LABEL_IDS)
# Own display names for sensors in the lists: {entity_id: name}.
CONF_DEVICE_NAMES = "device_names"
DICT_KEYS = (CONF_DEVICE_NAMES,)
# Tariffy price sensor per label ({label_id: entity_id}); a label without one uses the first electricity contract.
CONF_LABEL_TARIFFS = "label_tariffs"
# The same per area ({area_id: entity_id}).
CONF_AREA_TARIFFS = "area_tariffs"
# Longest allowed display name.
NAME_MAX_LEN = 80
# Keys that hold exactly one entity in storage (the panel always sees lists).
SINGLE_KEYS = (
    CONF_GRID_IMPORT,
    CONF_GRID_EXPORT,
    CONF_BATTERY_GRID_CHARGE,
    CONF_BATTERY_SOC,
)
# Price every kWh of a device, label or area at the grid price, also when it came from the own solar plant (the cost
# sensors otherwise price solar power with the feed-in tariff that is lost by using it).
CONF_COST_GRID_ONLY = "cost_grid_only"
BOOL_KEYS = (CONF_INVERT_GRID, CONF_INVERT_BATTERY, CONF_COST_GRID_ONLY)
# Sensors of the energy balance: they never count as device, area or label member.
SYSTEM_KEYS = (
    CONF_HOUSE_POWER,
    CONF_GRID_POWER,
    CONF_GRID_IMPORT,
    CONF_GRID_EXPORT,
    CONF_SOLAR_POWER,
    CONF_BATTERY_POWER,
    CONF_BATTERY_DISCHARGE,
    CONF_BATTERY_CHARGE,
    CONF_BATTERY_GRID_CHARGE,
)
CONFIG_KEYS = (
    CONF_HOUSE_POWER,
    *LIST_KEYS,
    *ID_KEYS,
    *DICT_KEYS,
    CONF_LABEL_TARIFFS,
    CONF_AREA_TARIFFS,
    CONF_DEVICE_TARIFFS,
    CONF_HISTORY_YEARS,
    *BOOL_KEYS,
    *NUMBER_KEYS,
)

# Allowed characters in a label or area id (a slug).
ID_REGEX = r"^[a-z0-9_]+$"

# Allowed characters in a device pattern: entity id characters plus * and ?.
PATTERN_REGEX = r"^[a-z0-9_.*?]+$"
