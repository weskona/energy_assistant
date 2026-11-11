"""Constants for Energyboard."""

DOMAIN = "energyboard"
PANEL_URL_PATH = "energyboard"
STATIC_URL = "/energyboard_static"

# Separate sensors report positive values (W or kW).
CONF_HOUSE_POWER = "house_power"  # optional, one sensor
CONF_GRID_IMPORT = "grid_import"  # grid import, one sensor
CONF_GRID_EXPORT = "grid_export"  # grid export, one sensor
CONF_SOLAR_POWER = "solar_power"  # solar production, one or more sensors
CONF_BATTERY_DISCHARGE = "battery_discharge"  # from storage, one or more
CONF_BATTERY_CHARGE = "battery_charge"  # to storage, one or more
CONF_BATTERY_GRID_CHARGE = "battery_grid_charge"  # part of the above from grid
CONF_DEVICE_POWER = "device_power"  # additional device sensors, one or more
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

LIST_KEYS = (
    CONF_GRID_POWER,
    CONF_BATTERY_POWER,
    CONF_GRID_IMPORT,
    CONF_GRID_EXPORT,
    CONF_SOLAR_POWER,
    CONF_BATTERY_DISCHARGE,
    CONF_BATTERY_CHARGE,
    CONF_BATTERY_GRID_CHARGE,
    CONF_DEVICE_POWER,
    CONF_DEVICE_PATTERNS,
    CONF_DEVICE_EXCLUDE,
    CONF_DEVICE_EXCLUDE_PATTERNS,
)
# List keys that hold text patterns instead of entity ids.
TEXT_KEYS = (CONF_DEVICE_PATTERNS, CONF_DEVICE_EXCLUDE_PATTERNS)
# Labels (ids from the Home Assistant label registry) whose power sensors are summed up.
CONF_LABEL_IDS = "label_ids"
LABEL_KEYS = (CONF_LABEL_IDS,)
# Own display names for sensors in the lists: {entity_id: name}.
CONF_DEVICE_NAMES = "device_names"
DICT_KEYS = (CONF_DEVICE_NAMES,)
# Longest allowed display name.
NAME_MAX_LEN = 80
# Keys that hold exactly one entity in storage (the panel always sees lists).
SINGLE_KEYS = (CONF_GRID_IMPORT, CONF_GRID_EXPORT, CONF_BATTERY_GRID_CHARGE)
BOOL_KEYS = (CONF_INVERT_GRID, CONF_INVERT_BATTERY)
CONFIG_KEYS = (CONF_HOUSE_POWER, *LIST_KEYS, *LABEL_KEYS, *DICT_KEYS, *BOOL_KEYS)

# Allowed characters in a label id (a slug).
LABEL_ID_REGEX = r"^[a-z0-9_]+$"

# Allowed characters in a device pattern: entity id characters plus * and ?.
PATTERN_REGEX = r"^[a-z0-9_.*?]+$"
