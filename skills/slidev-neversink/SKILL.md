---
name: slidev-neversink
description: "Create, edit, restyle, and troubleshoot Slidev presentations that use the Neversink theme. Use when working on Slidev decks with `theme: neversink`, theme-specific layouts, color schemes, components, dark-mode behavior, slot-based slide composition, or Neversink customization in Markdown, Vue, and CSS."
---

# Slidev Neversink

Treat Neversink as a presentation system, not just a color skin. It is best for academic or teaching decks where the slides should look structured, slightly playful, and quicker to compose through prebuilt layouts and components.

Primary sources:

- https://github.com/gureckis/slidev-theme-neversink
- https://gureckis.github.io/slidev-theme-neversink/

## Quick Start

For a new deck:

```bash
npm init slidev@latest
# Select 'neversink' when prompted
```

For an existing deck, set the headmatter:

```yaml
---
theme: neversink
title: Research Update
colorSchema: auto
neversink_slug: Spring 2026 Seminar
---
```

Use `colorSchema: auto` by default so the deck supports both light and dark modes unless the user clearly wants a fixed mode.

## Decision Flow

When asked to create or edit a Neversink deck, work in this order:

1. Establish the deck-level theme configuration.
2. Pick slide layouts before writing detailed markup.
3. Use theme components for callouts, notes, and visual annotations.
4. Apply theme classes or theme variables before adding broad custom CSS.
5. Check dark-mode behavior and slide-number branding near the end.

## Deck-Level Configuration

Common headmatter keys:

- `theme: neversink` enables the theme.
- `colorSchema: auto|light|dark` controls color-mode behavior.
- `neversink_slug` sets the lower-right slide counter label.
- `slide_info: false` hides slide counter information on a slide.

Use deck-wide headmatter for values that should stay consistent across the whole talk. Override per slide only when the design intent genuinely changes.

## Layouts

Choose the layout by rhetorical purpose, not by visual novelty.

| Layout | Purpose | When to use |
|--------|---------|-------------|
| `cover` | Opening slide | Title and presenter information |
| `intro` | Framing slide | Agenda, setup, or context near the start |
| `section` | Transition | Major topic change |
| `default` | General content | Standard content slide |
| `top-title` | Titled content | Content with stronger title treatment |
| `side-title` | Side-titled content | Title separated from heavier content |
| `two-cols-title` | Comparison | Tradeoffs, method/result, text + figure |
| `top-title-two-cols` | Sectioned comparison | Comparison with stronger sectioning |
| `quote` | Statement | Single quotation or thesis statement |
| `full` | Visual-first | Full-screen content or image |
| `credits` | Closing | Acknowledgments or references roll |

If the user asks for default Slidev layouts like `image-left` or `iframe-right`, those still work but are less theme-native and do not benefit from Neversink color behavior.

### Layout Frontmatter Controls

Reach for these before custom CSS:

- `color` — slide palette or scheme variant
- `align` — alignment behavior (`l`, `c`, `r`, or compound like `c-lt-lt`)
- `columns` — column width ratio (`is-1` to `is-11`, e.g., `is-4` = left 4/12, right 8/12)
- `titlepos` — title placement (`t`=top, `b`=bottom, `n`=none)
- `margin` — content density (`normal`, `tight`, `tighter`, `none`)
- `quotesize`, `authorsize`, `author` — for quote slides

Keep palette changes deliberate. Prefer one primary accent and a small number of supporting colors across a deck.

## Authoring Patterns

### Two-column slides

Use slots correctly. Leave blank lines around slot markers:

```md
---
layout: two-cols-title
columns: is-5
titlepos: t
---

# Experiment Design

:: left ::

- Hypothesis
- Dataset
- Method

:: right ::

![figure](./figure.png)
```

If a layout renders incorrectly, suspect slot structure before rewriting the slide.

### Top-title slide

```yaml
---
layout: top-title
color: amber
align: l
margin: tight
---
```

## Color Schemes

Available colors: black, white, dark, light, slate, gray, zinc, neutral, stone, red, orange, amber, yellow, lime, green, emerald, teal, cyan, sky, blue, indigo, violet, purple, fuchsia, pink, rose, navy

Use in slide frontmatter:

```yaml
---
color: teal
---
```

## Components

Prefer built-in components when they match the communication task.

### Admonition

Custom note boxes with title, icon, width, and color control:

```vue
<Admonition title="Note" color="teal-light" width="300px">
  Important information here.
</Admonition>
```

Pre-styled types:

```vue
<AdmonitionType type="info">Info message</AdmonitionType>
<AdmonitionType type="tip">Helpful tip</AdmonitionType>
<AdmonitionType type="warning">Warning message</AdmonitionType>
<AdmonitionType type="caution">Caution message</AdmonitionType>
<AdmonitionType type="important">Important note</AdmonitionType>
```

### StickyNote

Margin commentary, draft notes, or informal annotations:

```vue
<StickyNote color="amber-light" width="180px" title="Reminder" devOnly>
  Add more examples!
</StickyNote>
```

Use `devOnly` to show only in development mode.

### SpeechBubble

Annotated screenshots or dialogue-style explanation:

```vue
<SpeechBubble position="r" color="sky" shape="round" maxWidth="300px" v-drag>
  Hello, I'm a **speech bubble**!
</SpeechBubble>
```

Positions: `tl`, `t`, `tr`, `l`, `r`, `bl`, `b`, `br` (tail direction).
Shapes: `round`, `square`.

### QRCode

Links to papers, demos, repositories, or surveys:

```vue
<QRCode value="https://example.com" size="200" color="#000" />
```

### Drawing Components

Decorative helpers — use sparingly to support explanation, not as slide filler:

```vue
<ArrowDraw />
<ArrowHeads />
<Thumb up />
<Thumb down />
<Box />
```

All support `v-drag` for positioning.

### LightOrDark

Conditional content by color mode:

```vue
<LightOrDark>
  <template #dark>Dark mode content</template>
  <template #light>Light mode content</template>
</LightOrDark>
```

## v-drag Positioning

Most components support draggable positioning:

```vue
<StickyNote color="amber" v-drag="[100, 200]">
  Positioned at x:100, y:200
</StickyNote>
```

## Markdown Extensions

**Highlight text:**

```markdown
This is ==highlighted text==
```

**Slots (require blank lines around markers):**

```markdown
:: left ::

Content for left

:: right ::

Content for right
```

## CSS Utility Classes

Before adding custom wrappers, check whether a theme utility class is enough:

| Class | Effect |
|-------|--------|
| `ns-c-bind-scheme` | Bind element to active theme colors |
| `ns-c-*-scheme` | Apply specific color scheme (e.g., `ns-c-sk-scheme` for sky) |
| `ns-c-tight` | Tighten bullet spacing |
| `ns-c-verytight` | Very tight bullet spacing |
| `ns-c-supertight` | Super tight bullet spacing |
| `ns-c-center-item` | Center element |
| `ns-c-fader` | Fade bullets in v-clicks |
| `ns-c-cite` / `ns-c-cite-bl` | Citation styling |
| `ns-c-quote` | Quote styling |
| `ns-c-iconlink` | Remove underline from icon links |
| `ns-c-imgtile` | Image grid tiles |

Apply with `{.class}` in Markdown or directly in HTML.

Use highlight syntax `==text==` for lightweight emphasis inside Markdown.

## Dark Mode

- Toggle with `d` key during presentation
- Use `colorSchema: auto` in headmatter for dual-mode support
- Use `<LightOrDark>` component for conditional content
- Use `.invert` class for images needing inversion in dark mode

## Customization

If the user wants branding or typography changes, prefer the Slidev styles entrypoint.

Create `styles/index.ts`:

```ts
import './custom.css'
```

Create `styles/custom.css` and override theme variables first:

```css
:root {
  --neversink-title-font: 'Your Title Font', sans-serif;
  --neversink-main-font: 'Your Body Font', sans-serif;
  --neversink-mono-font: 'Your Mono Font', monospace;
  --neversink-quote-font: 'Your Quote Font', serif;
}
```

Do not scatter one-off inline styles across many slides when a variable or utility class can solve the problem once.

## Troubleshooting

When the deck is broken or visually inconsistent, check these first:

1. Confirm the package/theme is installed and `theme: neversink` is set in the first slide.
2. Confirm the layout name is valid for the theme.
3. Confirm the slide content matches the layout's expected slots.
4. Confirm frontmatter keys are spelled correctly and supported by that layout.
5. Check whether the issue appears only in dark mode.
6. Temporarily disable custom CSS to isolate theme behavior from local overrides.

## Guardrails

- Pick layouts by communication purpose, not visual novelty.
- Use theme components before reaching for custom Vue or HTML.
- Use theme utility classes and CSS variables before writing custom CSS.
- Keep color palette deliberate — one accent + few supporting colors per deck.
- Do not scatter inline styles when a variable solves it once.
- Leave blank lines around slot markers or layouts will break silently.

## Deliverables

When completing a Neversink task, leave behind:

- valid deck headmatter,
- layouts chosen for communication purpose,
- components used where they reduce custom markup,
- styling changes implemented through theme-aware classes or variables when possible,
- and any required install or theme-selection step stated explicitly.
