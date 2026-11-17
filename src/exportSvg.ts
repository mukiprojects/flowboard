// Export the board as a self-contained vector SVG (also the source for PDF).
// Shapes, connectors and drawings are native vector elements; text and note
// text use <foreignObject> (browsers/PDF render it, Figma ignores it);
// images are embedded as data URLs. Fonts are inlined as base64 @font-face.

import type { Board, Item, Theme } from "./types";
import { fontFaceCss } from "./export";
import { connectorPathD, getBounds, rayBoxExit, themeColors } from "./exportImage";
import { sanitizeName } from "./io";
import { renderMarkdown } from "./markdown";

const PAD = 60;
const FONT = "'Geist', ui-sans-serif, system-ui, sans-serif";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Inline remote images so the file stays self-contained; keep the URL if CORS blocks it.
async function toDataUrl(src: string): Promise<string> {
  if (src.startsWith("data:")) return src;
  try {
    const blob = await (await fetch(src)).blob();
    return await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  } catch {
    return src;
  }
}

const html = (it: Item, css: string, inner: string) =>
  `<foreignObject x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}"><div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;overflow:hidden;box-sizing:border-box;font-family:${FONT};${css}">${inner}</div></foreignObject>`;

// renderMarkdown emits HTML; &nbsp; is not valid XML.
const md = (t: string) => renderMarkdown(t).replace(/&nbsp;/g, "&#160;");

export async function buildSvg(board: Board, theme: Theme): Promise<string> {
  const c = themeColors(theme);
  const b = getBounds(board.items) ?? { x: 0, y: 0, w: 200, h: 100 };
  const vx = b.x - PAD, vy = b.y - PAD, vw = b.w + PAD * 2, vh = b.h + PAD * 2;
  const items = [...board.items].sort((a, z) => a.z - z.z);
  const byId = new Map(items.map((i) => [i.id, i]));

  const card = (it: Item, title: string, sub: string) =>
    `<rect x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}" fill="${c.surface}" stroke="${c.border}"/>` +
    html(it, `padding:12px;color:${c.text};display:flex;flex-direction:column;justify-content:center;font-size:14px;font-weight:600`,
      `<div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(title)}</div><div style="font-size:12px;font-weight:400;color:${c.text3};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(sub)}</div>`);

  const body: string[] = [];
  const markers = new Map<string, string>(); // color → marker id
  const marker = (color: string) => {
    if (!markers.has(color)) markers.set(color, `a${markers.size}`);
    return markers.get(color)!;
  };

  for (const it of items) {
    switch (it.type) {
      case "text":
        if (it.bg !== "transparent")
          body.push(`<rect x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}" fill="${esc(it.bg || c.surface)}" stroke="${c.border}"/>`);
        body.push(html(it, `padding:12px;font-size:${it.fontSize || 16}px;font-weight:${it.fontWeight || 400};line-height:1.35;text-align:${it.align || "left"};color:${esc(it.color || c.text)};overflow-wrap:break-word`, md(it.text)));
        break;
      case "shape": {
        const sw = it.stroke === "transparent" ? 0 : it.strokeWidth || 0;
        const paint = `fill="${esc(it.fill)}" stroke="${esc(it.stroke)}" stroke-width="${sw}"`;
        if (it.shape === "ellipse") {
          body.push(`<ellipse cx="${it.x + it.w / 2}" cy="${it.y + it.h / 2}" rx="${Math.max(0, it.w / 2 - sw / 2)}" ry="${Math.max(0, it.h / 2 - sw / 2)}" ${paint}/>`);
        } else if (it.shape === "diamond") {
          const pts = `${it.x + it.w / 2},${it.y + sw / 2} ${it.x + it.w - sw / 2},${it.y + it.h / 2} ${it.x + it.w / 2},${it.y + it.h - sw / 2} ${it.x + sw / 2},${it.y + it.h / 2}`;
          body.push(`<polygon points="${pts}" ${paint}/>`);
          if (it.text) {
            const padX = Math.max(8, Math.round(it.w * 0.2));
            const padY = Math.max(6, Math.round(it.h * 0.15));
            const textColor = it.textColor ?? (it.fill === "transparent" ? c.text : "#0a0a0a");
            body.push(html(it, `padding:${padY}px ${padX}px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:${it.fontSize || 16}px;line-height:1.3;color:${esc(textColor)};white-space:pre-wrap;overflow-wrap:break-word`, esc(it.text)));
          }
        } else {
          body.push(`<rect x="${it.x + sw / 2}" y="${it.y + sw / 2}" width="${Math.max(0, it.w - sw)}" height="${Math.max(0, it.h - sw)}" rx="${it.shape === "note" ? 6 : 0}" ${paint}/>`);
          if (it.shape === "note" && it.text) {
            body.push(html(it, `padding:12px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:${it.fontSize || 16}px;line-height:1.3;color:${esc(it.textColor || "#0a0a0a")};white-space:pre-wrap;overflow-wrap:break-word`, esc(it.text)));
          }
        }
        break;
      }
      case "drawing":
        body.push(`<svg x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}" viewBox="0 0 ${it.vw ?? it.w} ${it.vh ?? it.h}" preserveAspectRatio="none" overflow="visible">${
          (it.strokes || []).map((s) => `<path d="${esc(s.d)}" fill="none" stroke="${esc(s.color || "#0a0a0a")}" stroke-width="${s.strokeWidth || 2}" stroke-linecap="round" stroke-linejoin="round"/>`).join("")}</svg>`);
        break;
      case "image":
        body.push(`<image x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}" preserveAspectRatio="none" href="${esc(await toDataUrl(it.src))}"/>`);
        break;
      case "link": body.push(card(it, it.title || it.url, it.url)); break;
      case "embed": body.push(card(it, it.provider, it.url)); break;
      case "video": body.push(card(it, it.fileName || "Video", it.src.startsWith("data:") ? "" : it.src)); break;
      case "audio": body.push(card(it, it.fileName || "Audio", "")); break;
    }
  }

  // Connectors on top, like the canvas.
  for (const it of items) {
    if (it.type !== "connector") continue;
    const a = it.from ? byId.get(it.from) : undefined;
    const t = it.to ? byId.get(it.to) : undefined;
    if (!a && !it.startPoint) continue;
    if (!t && !it.endPoint) continue;

    let e1: { x: number; y: number };
    let e2: { x: number; y: number };

    if (a && t) {
      const fc = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
      const tc = { x: t.x + t.w / 2, y: t.y + t.h / 2 };
      e1 = rayBoxExit(fc, { x: tc.x - fc.x, y: tc.y - fc.y }, a);
      e2 = rayBoxExit(tc, { x: fc.x - tc.x, y: fc.y - tc.y }, t);
    } else if (a && (t || it.endPoint)) {
      const tc = t ? { x: t.x + t.w / 2, y: t.y + t.h / 2 } : it.endPoint!;
      const fc = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
      e1 = rayBoxExit(fc, { x: tc.x - fc.x, y: tc.y - fc.y }, a);
      e2 = tc;
    } else if ((a || it.startPoint) && t) {
      const fc = a ? { x: a.x + a.w / 2, y: a.y + a.h / 2 } : it.startPoint!;
      const tc = { x: t.x + t.w / 2, y: t.y + t.h / 2 };
      e1 = fc;
      e2 = rayBoxExit(tc, { x: fc.x - tc.x, y: fc.y - tc.y }, t);
    } else {
      e1 = it.startPoint ?? { x: it.x, y: it.y };
      e2 = it.endPoint ?? { x: it.x + it.w, y: it.y + it.h };
    }
    const col = it.color ?? c.text2, ends = it.ends ?? "one";
    const m = marker(col);
    body.push(`<path d="${connectorPathD(it.shape ?? "straight", e1.x, e1.y, e2.x, e2.y)}" fill="none" stroke="${esc(col)}" stroke-width="${it.strokeWidth ?? 1.75}" stroke-linecap="round" stroke-linejoin="round"${ends !== "none" ? ` marker-end="url(#${m})"` : ""}${ends === "both" ? ` marker-start="url(#${m})"` : ""}/>`);
    if (it.label) {
      const mx = (e1.x + e2.x) / 2;
      const my = (e1.y + e2.y) / 2;
      const lbg = esc(it.labelBg || c.surface);
      const lcol = esc(it.labelColor || c.text);
      const approxW = Math.max(30, it.label.length * 7.5 + 18);
      body.push(
        `<g transform="translate(${mx}, ${my})">` +
        `<rect x="${-approxW / 2}" y="-10" width="${approxW}" height="20" rx="10" fill="${lbg}" stroke="${c.border}" stroke-width="1"/>` +
        `<text x="0" y="4" fill="${lcol}" font-family="${FONT}" font-size="12" text-anchor="middle">${esc(it.label)}</text>` +
        `</g>`
      );
    }
  }

  const defs = [...markers].map(([col, id]) =>
    `<marker id="${id}" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="14" refX="12" refY="7" orient="auto-start-reverse"><path d="M 0 1 L 12 7 L 0 13 Z" fill="${esc(col)}"/></marker>`).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${vw}" height="${vh}" viewBox="${vx} ${vy} ${vw} ${vh}">
<defs><style>${await fontFaceCss()}
:root{--bg:${c.bg};--surface:${c.surface};--border:${c.border};--text:${c.text};--text-2:${c.text2};--text-3:${c.text3}}
h1,h2,h3,h4,h5,h6{margin:0;font-weight:700}h1{font-size:1.6em}h2{font-size:1.35em}h3{font-size:1.15em}h4,h5,h6{font-size:1em}
ul,ol{margin:0;padding-left:18px}code{font-family:'Geist Mono',ui-monospace,monospace}a{color:inherit}</style>${defs}</defs>
<rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="${c.bg}"/>
${body.join("\n")}
</svg>`;
}

export async function downloadSvg(board: Board, theme: Theme = "light") {
  if (board.items.length === 0) return;
  const url = URL.createObjectURL(new Blob([await buildSvg(board, theme)], { type: "image/svg+xml" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizeName(board.name)}.svg`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
