# Technical Specification: crboard Flowchart & Vector Enhancements

**Document ID**: SPEC-2026-001  
**Status**: Approved  
**Target Version**: crboard v0.2.0  
**Authors**: Antigravity & Architecture Team  

---

## 1. Executive Summary & Goals

This specification defines four key feature additions and enhancements to `crboard` to transform it from a generic whiteboard into a top-tier flowchart and workflow authoring tool while preserving its minimalist design, zero-backend architecture, and snappy performance:

1. **Connector Labels**: Text badges attached directly to connector arrows ("yes", "no", condition strings) that automatically calculate position along straight, elbow, and curved routes and move dynamically with connected nodes.
2. **Decision Diamonds**: A dedicated diamond shape item with centered editable text and smart angled edge connector clipping.
3. **Alignment & Spacing Discoverability**: Surfacing the existing alignment and distribution engine in the right-click context menu, assigning keyboard shortcuts, updating the shortcut cheat-sheet, and enhancing spacing distribution.
4. **Vector SVG & PDF Export**: Clean vector SVG serialization and high-fidelity PDF output suitable for slides, documents, and publication.

---

## 2. Feature 1: Connector Labels

### 2.1 Data Model
In `src/types.ts`:
```ts
export type ConnectorItem = Base & {
  type: "connector";
  from: string; // item id
  to: string;   // item id
  color?: string;
  strokeWidth?: number;
  shape?: "straight" | "curved" | "elbow";
  ends?: "one" | "both" | "none";
  label?: string;       // Text content of the label
  labelBg?: string;     // Optional background fill; defaults to var(--surface)
  labelColor?: string;  // Optional text color; defaults to var(--text)
};
```

### 2.2 Routing & Parametric Midpoint Calculation
Midpoint $(x_m, y_m)$ in screen/world space where the label badge is anchored:
- **Straight**:
  $$x_m = \frac{x_1 + x_2}{2}, \quad y_m = \frac{y_1 + y_2}{2}$$
- **Elbow**:
  - Horizontal dominant ($|x_2 - x_1| \ge |y_2 - y_1|$):
    Path is $(x_1, y_1) \to (m_x, y_1) \to (m_x, y_2) \to (x_2, y_2)$ where $m_x = \frac{x_1 + x_2}{2}$.
    Midpoint is on the vertical segment:
    $$x_m = m_x, \quad y_m = \frac{y_1 + y_2}{2}$$
  - Vertical dominant ($|y_2 - y_1| > |x_2 - x_1|$):
    Path is $(x_1, y_1) \to (x_1, m_y) \to (x_2, m_y) \to (x_2, y_2)$ where $m_y = \frac{y_1 + y_2}{2}$.
    Midpoint is on the horizontal segment:
    $$x_m = \frac{x_1 + x_2}{2}, \quad y_m = m_y$$
- **Curved (Cubic Bézier)**:
  Control points for $P_0(x_1, y_1)$ and $P_3(x_2, y_2)$ evaluated at parameter $t = 0.5$:
  - Horizontal dominant: $P_1 = (x_1 + dx \cdot 0.5, y_1)$, $P_2 = (x_2 - dx \cdot 0.5, y_2)$.
  - Vertical dominant: $P_1 = (x_1, y_1 + dy \cdot 0.5)$, $P_2 = (x_2, y_2 - dy \cdot 0.5)$.
  - Point at $t = 0.5$:
    $$B(0.5) = 0.125 P_0 + 0.375 P_1 + 0.375 P_2 + 0.125 P_3$$

### 2.3 Interactive UX & Editing
- In `src/Canvas.tsx`:
  - When `c.label` is present or connector is being edited, render an SVG `<foreignObject>` or HTML overlay badge centered at $(x_m, y_m)$.
  - The badge has an opaque background (e.g. `var(--surface)` or `var(--bg)`), 1px border (`var(--border)`), subtle shadow, and padding (`2px 8px`), masking the stroke behind the text.
  - **Double-click** on a connector or its label enters label edit mode (an inline input/textarea centered over the badge).
  - Pressing `Enter` or clicking outside commits the edit via `dispatch({ type: "updateItem", id: c.id, patch: { label: text } })`. Pressing `Escape` cancels.
  - If a connector is selected, a button or input in `SelectedConnectorOptions` (`src/Toolbar.tsx`) also allows editing or clearing the label.

### 2.4 Export Synchronization
- `src/exportImage.ts`: Draw the rounded rect background badge and centered text at $(x_m, y_m)$ scaled by canvas ratio.
- `src/export.ts`: Add badge rendering to the exported standalone viewer.

---

## 3. Feature 2: Decision Shapes (Diamonds)

### 3.1 Data Model
In `src/types.ts`:
```ts
export type ShapeItem = Base & {
  type: "shape";
  shape: "rect" | "ellipse" | "note" | "diamond";
  fill: string;
  stroke: string;
  strokeWidth: number;
  text?: string;
  textColor?: string;
  fontSize?: number;
};
```
In `src/store.ts`:
```ts
export type ShapeStyle = {
  kind: "rect" | "ellipse" | "note" | "diamond";
  fill: string;
  stroke: string;
  strokeWidth: number;
};
```

### 3.2 Visual Rendering & Text Editing
In `src/Item.tsx`:
- Render `<polygon>` inside SVG with points:
  $$P_{top} = (w/2, sw/2), \quad P_{right} = (w - sw/2, h/2), \quad P_{bottom} = (w/2, h - sw/2), \quad P_{left} = (sw/2, h/2)$$
- Diamond text editing:
  - When double-clicked, enter edit mode (identical to `note`).
  - Text is centered horizontally and vertically.
  - Safe inset margin: pad text container by $20\%$ horizontally and $15\%$ vertically to guarantee text stays within the rhombus boundary.

### 3.3 Smart Angled Ray-Clipping for Connectors
- Current `rayBoxExit` in `src/Canvas.tsx`, `src/exportImage.ts`, and `src/export.ts` tests bounding boxes.
- For diamond shapes, compute ray intersection with the 4 line segments of the diamond rhombus:
  1. Top-Left: $(0, h/2) \to (w/2, 0)$
  2. Top-Right: $(w/2, 0) \to (w, h/2)$
  3. Bottom-Right: $(w, h/2) \to (w/2, h)$
  4. Bottom-Left: $(w/2, h) \to (0, h/2)$
- This guarantees arrow tips exit and enter directly on the diamond's angled perimeter.

### 3.4 Toolbar & Controls
In `src/Toolbar.tsx`:
- Add `"diamond"` to `SHAPE_KINDS`.
- Add diamond SVG icon to shape selector toolbar.
- Allow converting between rect, ellipse, note, and diamond in `SelectedShapeOptions`.

---

## 4. Feature 3: Alignment, Spacing & Snap Guides Discoverability

### 4.1 Surfacing in Context Menu
In `src/Canvas.tsx`:
- When right-clicking with 2+ items selected:
  - Show an **Align** section in `ContextMenu`:
    - Align Left, Align Center, Align Right
    - Align Top, Align Middle, Align Bottom
  - If 3+ items are selected:
    - Distribute Horizontally, Distribute Vertically
    - Equal Gap Spacing (Tidy Up)

### 4.2 Keyboard Shortcuts
In `src/Canvas.tsx` / `src/shortcuts.ts`:
- `Alt+H`: Align Horizontal Centers
- `Alt+V`: Align Vertical Centers
- Update `HelpOverlay` (`?`) table to display alignment and distribution shortcuts.

### 4.3 Equal Gap Spacing Math
- Current `distribute` spaces item centers evenly.
- Add equal gap mode:
  $$\text{Total Width} = \sum w_i, \quad \text{Available Gap} = (\max X_{right} - \min X_{left}) - \text{Total Width}$$
  $$\text{Gap per Item} = \frac{\text{Available Gap}}{N - 1}$$
- Positions items with uniform spacing between edges, preventing overlaps when shapes vary in size.

---

## 5. Feature 4: Vector SVG and PDF Export

### 5.1 SVG Export (`src/exportSvg.ts`)
- Calculate total bounding box of all items plus 60px padding.
- Generate valid, self-contained SVG XML:
  - `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${width} ${height}">`
  - Inline stylesheet for Geist / system fonts and color variables (`--bg`, `--surface`, `--text`, etc.).
  - Replicate all items in z-order:
    - Rectangles, Ellipses, Diamonds as native SVG elements (`<rect>`, `<ellipse>`, `<polygon>`).
    - Connectors as `<path>` with `<marker id="...">` arrowheads.
    - Connector labels as `<rect>` badges + `<text>` tags.
    - Drawings as `<path d="...">`.
    - Text items as `<foreignObject>` or `<text>` nodes.
    - Images as `<image href="data:...">`.
- Trigger direct browser file download: `${boardName}.svg`.

### 5.2 PDF Export (`src/exportPdf.ts`)
- Render vector SVG within an offscreen or dedicated print popup window.
- Apply `@media print` styling:
  ```css
  @page { size: auto; margin: 0; }
  body { margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; }
  svg { max-width: 100vw; max-height: 100vh; }
  ```
- Trigger print dialog `printWindow.print()` which natively outputs vector-sharp PDF, or generate via client-side PDF vector wrapper.

### 5.3 Toolbar Integration
In `src/Toolbar.tsx`:
- Under File menu:
  - "Export as SVG…" (Sharp vector graphic for slides and illustrations)
  - "Export as PDF…" (Ready-to-print vector document)

---

## 6. Compatibility & Quality Standards
1. **Zero Breaking Changes**: Old boards loaded from localStorage or `.crboard` JSON continue to render identically. Missing fields (`label`, `shape === "diamond"`) fall back gracefully.
2. **Type Safety**: Full TypeScript compilation (`npm run typecheck`) with no `any` leaks.
3. **Build Integrity**: Production build (`npm run build`) runs cleanly without errors.
