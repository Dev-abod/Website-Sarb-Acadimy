// Canvas engine for Sarb post templates: shared frame, rich Arabic text, auto-fit.
export const C = {
  bg: "#101010",
  surface: "#1C1C1C",
  surface2: "#232323",
  volt: "#D4FF00",
  white: "#FFFFFF",
  gray: "#E6E6E6",
  dim: "rgba(230,230,230,0.62)",
  faint: "rgba(255,255,255,0.08)",
};
export const AR = `"IBM Plex Sans Arabic", "IBM Plex Sans", sans-serif`;
export const MONO = `"JetBrains Mono", monospace`;

export type Assets = { logo: HTMLImageElement | null; icons: HTMLImageElement[] };
export type Box = { x: number; y: number; w: number; h: number };
export type Ctx = CanvasRenderingContext2D;

type Tok = { t: string; volt: boolean };

function tokens(text: string): Tok[] {
  const out: Tok[] = [];
  let volt = false;
  for (const part of text.split(/(\*)/)) {
    if (part === "*") { volt = !volt; continue; }
    for (const w of part.split(/\s+/)) if (w) out.push({ t: w, volt });
  }
  return out;
}

export function font(weight: number, size: number, fam = AR) {
  return `${weight} ${Math.round(size)}px ${fam}`;
}

/** Wrap rich text (*volt* markup) into lines of tokens. */
export function wrap(ctx: Ctx, text: string, f: string, maxW: number): Tok[][] {
  ctx.font = f;
  const space = ctx.measureText(" ").width;
  const lines: Tok[][] = [];
  for (const para of text.split("\n")) {
    let line: Tok[] = [];
    let w = 0;
    for (const tk of tokens(para)) {
      const tw = ctx.measureText(tk.t).width;
      if (line.length && w + space + tw > maxW) { lines.push(line); line = []; w = 0; }
      w += (line.length ? space : 0) + tw;
      line.push(tk);
    }
    if (line.length) lines.push(line);
  }
  return lines;
}

function lineWidth(ctx: Ctx, line: Tok[]) {
  const space = ctx.measureText(" ").width;
  return line.reduce((a, t, i) => a + ctx.measureText(t.t).width + (i ? space : 0), 0);
}

export type TextOpts = {
  size: number; weight?: number; color?: string; lh?: number;
  align?: "right" | "center" | "left"; maxLines?: number; minSize?: number; fam?: string;
};

/** Draw RTL rich text; shrinks to fit maxLines. Returns height used. */
export function text(ctx: Ctx, str: string, x: number, y: number, maxW: number, o: TextOpts): number {
  if (!str.trim()) return 0;
  let size = o.size;
  const min = o.minSize ?? o.size * 0.6;
  let lines: Tok[][];
  for (;;) {
    lines = wrap(ctx, str, font(o.weight ?? 400, size, o.fam), maxW);
    if (!o.maxLines || lines.length <= o.maxLines || size <= min) break;
    size *= 0.92;
  }
  if (o.maxLines && lines.length > o.maxLines) lines = lines.slice(0, o.maxLines);
  const lh = size * (o.lh ?? 1.5);
  ctx.font = font(o.weight ?? 400, size, o.fam);
  ctx.textBaseline = "middle";
  ctx.direction = "ltr";
  ctx.textAlign = "left";
  const space = ctx.measureText(" ").width;
  lines.forEach((line, i) => {
    const lw = lineWidth(ctx, line);
    const right = o.align === "center" ? x + (maxW + lw) / 2 : o.align === "left" ? x + lw : x + maxW;
    let cx = right;
    const cy = y + lh * i + lh / 2;
    for (const tk of line) {
      const tw = ctx.measureText(tk.t).width;
      ctx.fillStyle = tk.volt ? C.volt : o.color ?? C.white;
      if (/[\u0600-\u06FF]/.test(tk.t)) {
        ctx.direction = "rtl";
        ctx.textAlign = "right";
        ctx.fillText(tk.t, cx, cy);
        ctx.direction = "ltr";
        ctx.textAlign = "left";
        cx -= tw;
      } else {
        cx -= tw;
        ctx.fillText(tk.t, cx, cy);
      }
      cx -= space;
    }
  });
  return lh * lines.length;
}

export function rrect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill?: string, stroke?: string, lw = 2) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

/** Small pill badge anchored at the right edge. Returns height. */
export function badge(ctx: Ctx, label: string, right: number, y: number, u: number): number {
  ctx.font = font(600, 24 * u);
  const w = ctx.measureText(label).width + 44 * u;
  const h = 50 * u;
  rrect(ctx, right - w, y, w, h, h / 2, "rgba(212,255,0,0.08)", "rgba(212,255,0,0.55)", 1.5 * u);
  ctx.fillStyle = C.volt;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.direction = "rtl";
  ctx.fillText(label, right - w / 2, y + h / 2 + 1 * u);
  ctx.textAlign = "left";
  ctx.direction = "ltr";
  return h;
}

/** Left-to-right monospace line, optionally truncated with ellipsis. */
export function mono(ctx: Ctx, s: string, x: number, y: number, size: number, color: string, maxW?: number, weight = 500) {
  ctx.font = font(weight, size, MONO);
  ctx.direction = "ltr";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  let t = s;
  if (maxW) while (t.length > 1 && ctx.measureText(t).width > maxW) t = t.slice(0, -2) + "…";
  ctx.fillStyle = color;
  ctx.fillText(t, x, y);
  return ctx.measureText(t).width;
}

export function unit(W: number, H: number) {
  return Math.min(W, H * 1.15) / 1080;
}

/** Draws the approved Sarb frame and returns the content box. */
export function frame(ctx: Ctx, W: number, H: number, a: Assets): Box {
  const u = unit(W, H);
  const M = 72 * u;
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  // calm volt glow
  const g = ctx.createRadialGradient(W * 0.08, H * 0.92, 0, W * 0.08, H * 0.92, Math.max(W, H) * 0.6);
  g.addColorStop(0, "rgba(212,255,0,0.07)");
  g.addColorStop(1, "rgba(212,255,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // diagonal wing lines (from the logo), very faint, top-left
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.035)";
  ctx.lineWidth = 2 * u;
  for (let i = 0; i < 9; i++) {
    const o = i * 34 * u;
    ctx.beginPath();
    ctx.moveTo(W - 340 * u + o, H);
    ctx.lineTo(W + o, H - 340 * u);
    ctx.stroke();
  }
  ctx.restore();

  // header
  const headH = 56 * u;
  if (a.logo) {
    const lh = headH;
    const lw = (a.logo.width / a.logo.height) * lh;
    ctx.drawImage(a.logo, M, M, lw, lh);
  }
  ctx.font = font(600, 26 * u);
  ctx.fillStyle = C.gray;
  ctx.textBaseline = "middle";
  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.fillText("أكاديمية سَرب للبرمجة", W - M, M + headH / 2);
  ctx.direction = "ltr";
  ctx.textAlign = "left";
  const topLine = M + headH + 28 * u;
  ctx.fillStyle = C.volt;
  ctx.fillRect(M, topLine, W - 2 * M, 2 * u);

  // footer
  const footH = 44 * u;
  const footY = H - M - footH;
  const botLine = footY - 28 * u;
  ctx.fillRect(M, botLine, W - 2 * M, 2 * u);
  text(ctx, "تابعنا وكن جزء من *السَّرب*", M, footY - 4 * u, W - 2 * M, { size: 26 * u, weight: 600, color: C.gray, lh: 1.4 });
  const is = 30 * u;
  let ix = M;
  ctx.globalAlpha = 0.75;
  for (const ic of a.icons) {
    ctx.drawImage(ic, ix, footY + (footH - is) / 2, is, is);
    ix += is + 16 * u;
  }
  ctx.globalAlpha = 1;
  mono(ctx, "@SarbAcademy", ix + 6 * u, footY + footH / 2, 24 * u, C.dim);

  const pad = 52 * u;
  return { x: M, y: topLine + pad, w: W - 2 * M, h: botLine - pad - (topLine + pad) };
}

type FieldKey = "title" | "body" | "lang" | "code" | "items" | "aName" | "aQ" | "aDesc" | "bName" | "bQ" | "bDesc" | "quote" | "statA" | "labelA" | "statB" | "labelB" | "url" | "name" | "desc" | "features" | "tagline" | "audience" | "steps";
export type Fields = { [K in FieldKey]: string };

export type Template = {
  id: string;
  label: string;
  icon: string;
  fields: { key: string; label: string; kind: "text" | "area" | "code"; hint?: string }[];
  defaults: Record<string, string>;
  /** Draw into box with unit u; return bottom y. */
  draw: (ctx: Ctx, b: Box, d: Fields, u: number) => number;
};

export function render(canvas: HTMLCanvasElement, W: number, H: number, tpl: Template, data: Record<string, string>, a: Assets) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const box = frame(ctx, W, H, a);
  const f = new Proxy(data, { get: (t, k: string) => t[k] ?? "" }) as unknown as Fields;
  const base = unit(W, H);
  // measure pass on an offscreen canvas, shrink until it fits
  const off = document.createElement("canvas");
  off.width = W; off.height = H;
  const octx = off.getContext("2d")!;
  let k = 1;
  let used = 0;
  for (let i = 0; i < 8; i++) {
    used = tpl.draw(octx, { ...box, y: 0 }, f, base * k);
    if (used <= box.h) break;
    k *= 0.93;
  }
  const offset = Math.max(0, (box.h - used) / 2);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, box.y - 20 * base, W, box.h + 40 * base);
  ctx.clip();
  tpl.draw(ctx, { ...box, y: box.y + offset }, f, base * k);
  ctx.restore();
}
