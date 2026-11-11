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
CONF_DEVICE_POWER = "device_power"  # individual devices, one or more sensors

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
)
BOOL_KEYS = (CONF_INVERT_GRID, CONF_INVERT_BATTERY)
CONFIG_KEYS = (CONF_HOUSE_POWER, *LIST_KEYS, *BOOL_KEYS)
