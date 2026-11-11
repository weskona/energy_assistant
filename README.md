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

Alle Sensoren sind Leistungssensoren (`device_class: power`, W oder kW) und liefern **positive Werte**.
Je Kategorie können ein oder mehrere Sensoren gewählt werden, sie werden addiert.

| Kategorie | Pflicht | Mehrere | Bedeutung |
|-----------|---------|---------|-----------|
| Netzbezug | ja, falls kein Hausverbrauch | ja | Leistung aus dem Netz |
| Einspeisung | nein | ja | Leistung ins Netz |
| PV-Erzeugung | nein | ja | z. B. ein Sensor je Wechselrichter oder Dachfläche |
| Vom Speicher | nein | ja | Entladeleistung der Batterien |
| Zum Speicher | nein | ja | Ladeleistung der Batterien |
| Hausverbrauch | nein | nein | Wenn vorhanden, wird er direkt angezeigt statt berechnet |

Ohne Hausverbrauchssensor berechnet Energyboard:

**Haus = PV + Netzbezug + vom Speicher − Einspeisung − zum Speicher**

Liefert dein Zähler nur einen Wert mit Vorzeichen, lege dafür in Home Assistant einen
Template-Sensor je Richtung an (z. B. `max(0, wert)` für Bezug, `max(0, -wert)` für Einspeisung).
Die Sensoren lassen sich später über *Konfigurieren* ändern.

## Entwicklung

Das Panel ist eine einzelne Web-Component ohne Build-Schritt: `custom_components/energyboard/frontend/energyboard-panel.js`.
