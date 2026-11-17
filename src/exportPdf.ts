// Vector PDF via the browser's print dialog ("Save as PDF"): the full vector
// SVG is inlined in a print window sized to the board, so nothing is rasterised.

import type { Board, Theme } from "./types";
import { buildSvg } from "./exportSvg";

export async function downloadPdf(board: Board, theme: Theme = "light") {
  if (board.items.length === 0) return;
  // Open before the await so the popup isn't blocked.
  const win = window.open("", "_blank");
  if (!win) return;
  const svg = (await buildSvg(board, theme)).replace(/^<\?xml[^>]*\?>\s*/, "");
  const [, w, h] = /width="([\d.]+)" height="([\d.]+)"/.exec(svg) ?? [];
  const title = (board.name || "board").replace(/[<&]/g, "");
  // CSS px → page size; one page exactly the size of the board.
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>@page{size:${w}px ${h}px;margin:0}html,body{margin:0}svg{display:block;width:${w}px;height:${h}px}</style></head><body>${svg}</body></html>`);
  win.document.close();
  // ponytail: fixed delay for the SVG's inline fonts to decode before printing.
  setTimeout(() => win.print(), 500);
}
