# Engineering Tickets: crboard Flowchart & Vector Enhancements

This document defines the implementation tickets derived from [SPEC-2026-001](SPEC.md).

---

## Ticket Overview

| Ticket ID | Title | Priority | Complexity | Target Files |
|---|---|---|---|---|
| [TICKET-001](#ticket-001-connector-arrow-labels) | Connector Arrow Labels & Inline Editing | P0 | Medium | `src/types.ts`, `src/Canvas.tsx`, `src/Toolbar.tsx`, `src/exportImage.ts`, `src/export.ts` |
| [TICKET-002](#ticket-002-decision-shapes---diamonds) | Decision Shapes (Diamonds) & Smart Ray Clipping | P0 | Medium | `src/types.ts`, `src/store.ts`, `src/Item.tsx`, `src/Canvas.tsx`, `src/Toolbar.tsx`, `src/exportImage.ts`, `src/export.ts` |
| [TICKET-003](#ticket-003-alignment--spacing-discoverability) | Alignment & Spacing Discoverability & Shortcuts | P1 | Low-Medium | `src/Canvas.tsx`, `src/Toolbar.tsx`, `src/shortcuts.ts` |
| [TICKET-004](#ticket-004-vector-svg-and-pdf-export) | Vector SVG and PDF Export | P1 | Medium | `src/exportSvg.ts`, `src/exportPdf.ts`, `src/Toolbar.tsx` |

---

## Detailed Tickets

### TICKET-001: Connector Arrow Labels

**Description**:
Add support for text labels attached to connector arrows. Labels must dynamically follow the connector path at its midpoint (across straight, elbow, and curved routes), mask the stroke behind them with a neat pill background, and be editable via double-click or the connector options toolbar.

**Tasks**:
1. Update `ConnectorItem` in `src/types.ts` to include `label?: string`, `labelBg?: string`, and `labelColor?: string`.
2. Implement parametric midpoint calculation in `src/Canvas.tsx`:
   - Straight lines: $(x_1 + x_2)/2, (y_1 + y_2)/2$
   - Elbow lines: center of horizontal or vertical connecting segment
   - Curved lines: cubic Bézier evaluated at $t = 0.5$
3. Render a styled label pill badge in `src/Canvas.tsx` at the computed midpoint.
4. Support double-clicking a connector or label to edit text inline (input/textarea) and commit on Enter or blur.
5. Add label edit input or action in `SelectedConnectorOptions` in `src/Toolbar.tsx`.
6. Update Canvas 2D rasterization in `src/exportImage.ts` to draw label badges on PNG export.
7. Update standalone HTML generator in `src/export.ts` to include connector labels.

**Acceptance Criteria**:
- Adding a label to an arrow renders cleanly at the midpoint.
- Moving either connected box causes the label to smoothly track the arrow.
- Double-clicking opens the label editor; Enter saves and Escape cancels.
- Connectors without labels render exactly as before.
- Exported PNG and HTML files show the arrow labels.
- `npm run typecheck` and `npm run build` pass.

---

### TICKET-002: Decision Shapes - Diamonds

**Description**:
Add a "diamond" shape option to the shape tool and item system. Diamonds must support fill/stroke customization, centered editable text (like sticky notes), and smart perimeter clipping so connector arrows attach flush to angled edges rather than square bounding boxes.

**Tasks**:
1. Update `ShapeItem.shape` in `src/types.ts` and `ShapeStyle.kind` in `src/store.ts` to include `"diamond"`.
2. Add `<polygon>` rendering for diamond in `ShapeBody` (`src/Item.tsx`).
3. Add double-click text editing to diamond shapes (centered horizontally and vertically with safe inset padding).
4. Implement angled ray-rhombus intersection in `Canvas.tsx` (and `exportImage.ts`, `export.ts`) for connector clipping when connecting to diamond items.
5. Add diamond icon to `SHAPE_KINDS` and shape tool dropdown in `src/Toolbar.tsx`.
6. Support switching existing shapes to diamond in `SelectedShapeOptions`.
7. Update `exportImage.ts` and `export.ts` to properly render diamonds and their text.

**Acceptance Criteria**:
- The shape tool offers Rectangle, Ellipse, Sticky Note, and Diamond.
- Users can draw diamonds and type text inside them by double-clicking.
- Connectors to diamonds connect cleanly to the diamond perimeter without awkward gaps.
- Diamonds persist correctly in localStorage and `.crboard` files.
- Exported PNG and HTML render diamonds and text faithfully.
- `npm run typecheck` and `npm run build` pass.

---

### TICKET-003: Alignment & Spacing Discoverability

**Description**:
Expose the existing alignment and distribution capabilities in the right-click context menu, add keyboard shortcuts, document them in the Help modal, and provide equal-gap distribution.

**Tasks**:
1. Update `ContextMenu` in `src/Canvas.tsx` to include an "Align" and "Distribute" section when 2+ items are selected (Align Left, Center H, Right, Top, Center V, Bottom, Distribute H, Distribute V).
2. Implement equal-gap spacing distribution in addition to center-to-center distribution in `AlignOptions` (`src/Toolbar.tsx`).
3. Add keyboard shortcuts in `src/Canvas.tsx` / `src/shortcuts.ts` for quick alignment (e.g. `Alt+H` for center horizontal, `Alt+V` for center vertical).
4. Update `HelpOverlay` in `src/Toolbar.tsx` to list alignment and distribution shortcuts.

**Acceptance Criteria**:
- Right-clicking multiple selected items shows Align and Distribute options in the context menu.
- Keyboard shortcuts trigger alignment without needing toolbar clicks.
- Help modal (`?`) clearly lists alignment controls.
- `npm run typecheck` and `npm run build` pass.

---

### TICKET-004: Vector SVG and PDF Export

**Description**:
Add sharp, vector-quality SVG and PDF export capabilities to the File menu so users can export diagrams directly into slides, vector editors, and documents.

**Tasks**:
1. Create `src/exportSvg.ts` to serialize board items into a clean standalone `.svg` vector file:
   - Calculate content bounding box with padding.
   - Embed font definitions and styling tokens.
   - Render shapes (rect, ellipse, diamond, note), connectors with markers and labels, drawings, text, and images.
   - Trigger `.svg` download.
2. Create `src/exportPdf.ts` to produce a vector-quality PDF export (via dedicated print layout and `window.print()` / vector stream).
3. Add "Export as SVG…" and "Export as PDF…" entries to the File menu in `src/Toolbar.tsx`.

**Acceptance Criteria**:
- File menu contains "Export as SVG…" and "Export as PDF…".
- Exported SVG opens in vector tools (Illustrator, Figma, Inkscape, browser) with infinite sharpness.
- Connectors, labels, diamonds, and text are preserved in the SVG output.
- Exported PDF provides sharp vector pages ready for presentation or printing.
- `npm run typecheck` and `npm run build` pass.
