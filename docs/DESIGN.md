# Design

The design of energy_assistant follows the style of
[glow-dashboard](https://github.com/deepblue120/glow-dashboard): dark, modern, card-based.
Own values and code, no source taken from it.

![Preview](design-preview.png)

Tokens: [`energy-assistant-tokens.css`](../custom_components/energy_assistant/frontend/energy-assistant-tokens.css) · Live preview: [`design-preview.html`](design-preview.html)

## Principles

- **Dark surfaces, one accent per statement.** Background `#0b0d12`, cards `#14171e`, tiles with 3 % white.
- **Colors carry meaning:** green = active/OK, orange (Home Assistant solar color) = solar,
  blue (Home Assistant grid color) = grid, gold = action/plan, orange-red = warning, red = limit/error.
- **Big number, small unit.** Values in weight 700–800, unit small and muted.
- **Uppercase titles** with wide letter spacing, labels uppercase with 0.06 em.
- **Soft shapes:** cards 22 px, tiles 14 px, fully rounded chips.
- **Glow only for the active main state** (`eb-card--glow`), e.g. a running charge.
- **Mobile (≤ 600 px):** more compact cards.

## Typography

[Outfit](https://fonts.google.com/specimen/Outfit) (OFL), weights 500/600/700/800.
The font is bundled locally (`custom_components/energy_assistant/frontend/fonts/`, variable font as WOFF2 for Latin and Latin Extended, license in `OFL-Outfit.txt`) and included via `@font-face` in the tokens. No CDN, no connection to Google.

## Components

`eb-card`, `eb-card--glow`, `eb-title`, `eb-tile`, `eb-label`, `eb-value`, `eb-chip`, `eb-bar`, `eb-action`.
