"""Konstanten für Energyboard."""

DOMAIN = "energyboard"
PANEL_URL_PATH = "energyboard"
STATIC_URL = "/energyboard_static"

# Alle Leistungssensoren liefern positive Werte (W oder kW).
CONF_HOUSE_POWER = "house_power"  # optional, ein Sensor
CONF_GRID_IMPORT = "grid_import"  # Netzbezug, ein oder mehrere Sensoren
CONF_GRID_EXPORT = "grid_export"  # Einspeisung, ein oder mehrere Sensoren
CONF_SOLAR_POWER = "solar_power"  # PV-Erzeugung, ein oder mehrere Sensoren
CONF_BATTERY_DISCHARGE = "battery_discharge"  # vom Speicher, ein oder mehrere
CONF_BATTERY_CHARGE = "battery_charge"  # zum Speicher, ein oder mehrere

# Kombisensoren mit Vorzeichen (je ein oder mehrere Sensoren, werden addiert)
CONF_GRID_POWER = "grid_power"  # Netz: Bezug positiv, Einspeisung negativ
CONF_BATTERY_POWER = "battery_power"  # Speicher: Entladen positiv, Laden negativ
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
)
BOOL_KEYS = (CONF_INVERT_GRID, CONF_INVERT_BATTERY)
CONFIG_KEYS = (CONF_HOUSE_POWER, *LIST_KEYS, *BOOL_KEYS)
