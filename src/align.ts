// Pure align / distribute math shared by the floating bar, the context menu
// and the Alt+H / Alt+V shortcuts. Returns new positions; callers dispatch.

type Box = { id: string; x: number; y: number; w: number; h: number };
export type Pos = { id: string; x: number; y: number };

export type AlignMode = "left" | "cx" | "right" | "top" | "cy" | "bottom";
// "centers" spaces by center point; "gaps" spaces by the empty space between
// item edges, so differently sized items never overlap.
export type DistributeMode = "centers" | "gaps";

export const align = (items: Box[], mode: AlignMode): Pos[] => {
  const minX = Math.min(...items.map((i) => i.x));
  const maxR = Math.max(...items.map((i) => i.x + i.w));
  const minY = Math.min(...items.map((i) => i.y));
  const maxB = Math.max(...items.map((i) => i.y + i.h));
  return items.map((i) => {
    switch (mode) {
      case "left": return { id: i.id, x: minX, y: i.y };
      case "right": return { id: i.id, x: maxR - i.w, y: i.y };
      case "cx": return { id: i.id, x: (minX + maxR) / 2 - i.w / 2, y: i.y };
      case "top": return { id: i.id, x: i.x, y: minY };
      case "bottom": return { id: i.id, x: i.x, y: maxB - i.h };
      case "cy": return { id: i.id, x: i.x, y: (minY + maxB) / 2 - i.h / 2 };
    }
  });
};

// Needs 3+ items; the two extremes stay put and the middle ones move.
export const distribute = (
  items: Box[],
  axis: "x" | "y",
  mode: DistributeMode,
): Pos[] => {
  if (items.length < 3) return [];
  const pos = (i: Box) => (axis === "x" ? i.x : i.y);
  const size = (i: Box) => (axis === "x" ? i.w : i.h);
  const n = items.length;
  const out = (i: Box, p: number): Pos =>
    axis === "x" ? { id: i.id, x: p, y: i.y } : { id: i.id, x: i.x, y: p };

  if (mode === "centers") {
    const sorted = [...items].sort((a, b) => pos(a) + size(a) / 2 - (pos(b) + size(b) / 2));
    const first = pos(sorted[0]) + size(sorted[0]) / 2;
    const last = pos(sorted[n - 1]) + size(sorted[n - 1]) / 2;
    return sorted.map((i, k) => out(i, first + ((last - first) * k) / (n - 1) - size(i) / 2));
  }

  const sorted = [...items].sort((a, b) => pos(a) - pos(b));
  const start = pos(sorted[0]);
  const end = Math.max(...sorted.map((i) => pos(i) + size(i)));
  const total = sorted.reduce((s, i) => s + size(i), 0);
  // ponytail: gap clamped at 0 so a cramped selection abuts instead of overlapping;
  // the bounding box grows past `end` in that case.
  const gap = Math.max(0, (end - start - total) / (n - 1));
  let cursor = start;
  return sorted.map((i) => {
    const p = cursor;
    cursor += size(i) + gap;
    return out(i, p);
  });
};
