# Energyboard

Home-Assistant-Integration (HACS) mit eigenem Panel in der Seitenleiste. Dunkles, kartenbasiertes Design, siehe [docs/DESIGN.md](docs/DESIGN.md).

## Tabs

| Tab | Inhalt |
|-----|--------|
| **Haus** | Aktuelle Leistung des Hauses, Herkunft (PV, Batterie, Netz), PV/Netz/Batterie als Kacheln, Verlauf der letzten 24 Stunden |

## Installation

1. Dieses Repository in HACS als benutzerdefiniertes Repository (Kategorie *Integration*) hinzufügen und installieren.
2. Home Assistant neu starten.
3. Unter *Einstellungen → Geräte & Dienste* **Energyboard** hinzufügen.

## Konfiguration

Alle Sensoren sind Leistungssensoren (`device_class: power`, W oder kW).

| Feld | Pflicht | Bedeutung |
|------|---------|-----------|
| Hausverbrauch | nein | Wenn vorhanden, wird er direkt angezeigt |
| Netzleistung | ja, falls kein Hausverbrauch | Bezug positiv, Einspeisung negativ |
| PV-Leistung | nein | Erzeugung |
| Batterieleistung | nein | Entladen positiv, Laden negativ |
| Vorzeichen umkehren | nein | Für Netz und Batterie, falls dein Sensor andersherum zählt |

Ohne Hausverbrauchssensor berechnet Energyboard: **Haus = PV + Netz + Batterie**.
Die Sensoren lassen sich später über *Konfigurieren* ändern.

## Entwicklung

Das Panel ist eine einzelne Web-Component ohne Build-Schritt: `custom_components/energyboard/frontend/energyboard-panel.js`.
