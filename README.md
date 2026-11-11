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
Je Kategorie können ein oder mehrere Sensoren gewählt werden, sie werden addiert.
Getrennte und kombinierte Sensoren lassen sich mischen.

**Getrennte Sensoren** liefern positive Werte:

| Kategorie | Mehrere | Bedeutung |
|-----------|---------|-----------|
| Netzbezug | ja | Leistung aus dem Netz |
| Einspeisung | ja | Leistung ins Netz |
| PV-Erzeugung | ja | z. B. ein Sensor je Wechselrichter oder Dachfläche |
| Vom Speicher | ja | Entladeleistung der Batterien |
| Zum Speicher | ja | Ladeleistung der Batterien |

**Kombisensoren** haben ein Vorzeichen und werden intern in die getrennten Größen zerlegt:

| Kategorie | Positiv | Negativ | Umkehr-Schalter |
|-----------|---------|---------|-----------------|
| Netz kombiniert | Bezug | Einspeisung | ja |
| Speicher kombiniert | Entladen | Laden | ja |

Zählt dein Sensor andersherum (z. B. Laden positiv), schalte „Vorzeichen umkehren“ ein.
Hausverbrauch direkt (ein Sensor) ist optional. Ist er gesetzt, wird er angezeigt statt berechnet.
Pflicht ist Netzbezug, Netz kombiniert oder Hausverbrauch.

Ohne Hausverbrauchssensor berechnet Energyboard:

**Haus = PV + Netzbezug + vom Speicher − Einspeisung − zum Speicher**

Die Sensoren lassen sich später über *Konfigurieren* ändern.

## Entwicklung

Das Panel ist eine einzelne Web-Component ohne Build-Schritt: `custom_components/energyboard/frontend/energyboard-panel.js`.
