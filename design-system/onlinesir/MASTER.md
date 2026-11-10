# OnlineSir design system

Status: implementation specification, 10 November 2026.

Source: supplied Online Sir logo; UI/UX Pro Max minimal reference-library direction. Logo colours take precedence over generic recommendations.

## Tokens

```css
:root {
  --color-primary: #002860;
  --color-brand-green: #008858;
  --color-action-green: #007a50;
  --color-on-primary: #ffffff;
  --color-background: #f5f8fc;
  --color-surface: #ffffff;
  --color-text: #16263d;
  --color-muted: #526175;
  --color-border: #dce5ef;
  --color-soft-green: #e8f5ef;
  --radius-card: 12px;
  --radius-control: 8px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --content-max: 1200px;
  --reading-max: 760px;
}
```

## Typography and language

- Assamese first; HTML language `as`. Label English passages appropriately.
- Candidate font: Noto Sans Bengali, verified with Assamese ৰ/ৱ/conjunct samples before adoption. Use licensed self-hosted WOFF2 and system fallbacks.
- Reading body: 18px, line-height 1.8; general UI 16px; secondary metadata 14px minimum.
- Desktop reading title about 36px, mobile 28px; long Assamese headings wrap naturally.
- Never simulate letter spacing for Assamese text; avoid clipping combining marks.

## Components and layout

- Compact header with original logo, class navigation and search. White surfaces with navy text and restrained green accents.
- Six class cards: 2 columns on mobile, 3 on tablet, up to 6 when space permits. Full class labels, visible focus, comfortable hit area.
- Reading page: breadcrumb, edition label, title, reviewed date, content, next/previous links. Contents sidebar on desktop, collapsible on mobile.
- Admin uses the same palette, with denser forms/tables and explicit draft/review/live status labels.
- Loading, empty, success, error and offline/failure feedback must be designed for every interactive flow.
- Visible save state and explicit publish action. Autosave and publication are separate operations.
- SVG interface icons; no emoji navigation. Use text plus icon for key controls.

## Accessibility and performance gates

- Text contrast at least 4.5:1 for normal text; visible non-colour status indicators.
- Minimum 44px touch controls; keyboard operation and visible focus; labelled forms and associated inline errors.
- Reduced-motion support; restrained 150–200ms transitions; no heavy animation library for basic effects.
- Test 360, 390, 768, 1024 and 1440px; no horizontal page overflow.
- Reserve image space; optimize delivery copies while preserving original brand files.
- Full HTML reading works without client JavaScript. Search/admin are enhanced interactive features.

## Brand assets

- `assets/brand/onlinesir-logo-original.png`
- `assets/brand/onlinesir-favicon-original.png`

Preserve originals. During implementation, create appropriately sized delivery assets and test favicon readability at 16/32/48px; the supplied detailed illustration may need a separately approved simplified small-size mark.
