# Energyboard

Home-Assistant-Integration (HACS) mit eigenem Panel in der Seitenleiste. Dunkles, kartenbasiertes Design, siehe [docs/DESIGN.md](docs/DESIGN.md).

## Tabs

| Tab | Inhalt |
|-----|--------|
| **Haus** | Aktuelle Leistung des Hauses, direkt verbrauchte PV-Leistung, Herkunft (PV, Speicher, Netz), Kacheln, Verlauf der letzten 24 Stunden |

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
| Netzbezug | nein | Leistung aus dem Netz |
| Einspeisung | nein | Leistung ins Netz |
| PV-Erzeugung | ja | z. B. ein Sensor je Wechselrichter oder Dachfläche |
| Vom Speicher | ja | Entladeleistung der Batterien |
| Zum Speicher | ja | Ladeleistung der Batterien |
| Speicher aus Netz geladen | nein | Teil von „Zum Speicher“, der aus dem Netz stammt |

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

Die **direkt verbrauchte PV-Leistung** ergibt sich aus:

**PV direkt = PV − Einspeisung − (zum Speicher − Speicher aus Netz geladen)** (mindestens 0, höchstens PV und Hausleistung)

Ohne den optionalen Sensor „Speicher aus Netz geladen“ wird angenommen, dass der Speicher komplett aus PV geladen wird. Lädt er aus dem Netz, ist der Wert dann zu niedrig.
Im Panel erscheint der Wert als Kachel mit Anteil an der Erzeugung, im Herkunftsbalken und als zweite Linie im Verlauf.

Die Sensoren lassen sich später über *Konfigurieren* ändern.

## Entwicklung

Das Panel ist eine einzelne Web-Component ohne Build-Schritt: `custom_components/energyboard/frontend/energyboard-panel.js`.
