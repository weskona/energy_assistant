# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
und dieses Projekt hält sich an [Semantic Versioning](https://semver.org/lang/de/).

## [Unreleased]

### Added

- Initiales Projekt-Repository für ha-energyboard.
- GitHub-Workflows für CI (Hassfest, HACS, Ruff, Pytest), Changelog-Check und Release sowie Dependabot-Konfiguration.
- Design-Grundlage im dunklen Kartenstil: CSS-Tokens (`custom_components/energyboard/frontend/energyboard-tokens.css`), Doku (`docs/DESIGN.md`) und Vorschau (`docs/design-preview.html`).
- Schrift Outfit (SIL OFL 1.1) lokal mitgeliefert unter `custom_components/energyboard/frontend/fonts/`.
- Integration `energyboard` mit Konfigurationsdialog (getrennte Sensoren für Netzbezug und Einspeisung (je einer) sowie PV und vom/zum Speicher (jeweils mehrere möglich)) sowie Kombisensoren mit Vorzeichen für Netz und Speicher (mit Umkehr-Schalter) und Seitenleisten-Panel.
- Tab „Haus“: aktuelle Hausleistung, Herkunft (PV/Batterie/Netz), Kacheln und 24-Stunden-Verlauf.
- Tests: pytest für Config-Flow, Options-Flow, Einrichtung und Übersetzungen, Node-Tests für die Rechenlogik des Panels; beide laufen in der CI.
- Einrichtung und Optionen in zwei Schritten (Netz/Haus, PV/Speicher) mit kürzeren Beschreibungen.
- Optionaler Sensor „Speicher aus Netz geladen“, der bei der Berechnung der direkt verbrauchten PV-Leistung berücksichtigt wird.
- Berechnung der direkt verbrauchten PV-Leistung (PV − Einspeisung − PV-Anteil der Speicherladung) als Kachel, im Herkunftsbalken und im Verlauf.
- `README.md` mit Installation und Konfiguration, `hacs.json`.

[Unreleased]: https://github.com/weskona/ha-energyboard/commits/main
