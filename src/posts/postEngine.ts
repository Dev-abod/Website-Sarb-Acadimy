import { drawSocialIconOnCanvas, type IconEffect, type SocialPlatform } from './postIcons';

export const POST_COLORS = {
  bg: '#101010',
  surface: '#1C1C1C',
  surfaceElevated: '#232323',
  surfaceCode: '#141414',
  volt: '#D4FF00',
  voltSoft: 'rgba(212, 255, 0, 0.12)',
  voltBorder: 'rgba(212, 255, 0, 0.36)',
  purple: '#A78BFA',
  purpleSoft: 'rgba(167, 139, 250, 0.12)',
  purpleBorder: 'rgba(167, 139, 250, 0.38)',
  white: '#FFFFFF',
  gray: '#E6E6E6',
  dim: 'rgba(230, 230, 230, 0.68)',
  muted: '#8A8A8A',
  faint: 'rgba(255, 255, 255, 0.08)',
  faintStrong: 'rgba(255, 255, 255, 0.14)',
} as const;

export const FONT_AR = `"IBM Plex Sans Arabic", "IBM Plex Sans", sans-serif`;
export const FONT_MONO = `"JetBrains Mono", monospace`;

export type Ctx = CanvasRenderingContext2D;
export type Box = { x: number; y: number; w: number; h: number };

export type IconTone = 'gray' | 'volt' | 'white';
export type BackgroundStyle = 'clean' | 'grid' | 'spotlight';
export type CodeFontScale = 'sm' | 'md' | 'lg';
export type PostTextAlign = 'right' | 'center';

export interface CarouselMeta {
  index: number; // 0-based
  total: number;
}

export interface PostBrandOptions {
  brandTitle: string;
  seriesTag: string;
  handleText: string;
  footerCta: string;
  showHeader: boolean;
  showFooter: boolean;
  showSocialIcons: boolean;
  showWingPattern: boolean;
  iconTone: IconTone;
  iconEffect: IconEffect;
  enabledPlatforms: SocialPlatform[];
  backgroundStyle: BackgroundStyle;
  showLineNumbers: boolean;
  codeFontScale: CodeFontScale;
  textAlign: PostTextAlign;
}

export const DEFAULT_POST_BRAND_OPTIONS: PostBrandOptions = {
  brandTitle: 'أكاديمية سَرب للبرمجة',
  seriesTag: '',
  handleText: '@SarbAcademy',
  footerCta: 'تابعنا وكن جزء من *السَّرب*',
  showHeader: true,
  showFooter: true,
  showSocialIcons: true,
  showWingPattern: true,
  iconTone: 'gray',
  iconEffect: 'none',
  enabledPlatforms: ['facebook', 'instagram', 'x', 'linkedin', 'telegram'],
  backgroundStyle: 'clean',
  showLineNumbers: true,
  codeFontScale: 'md',
  textAlign: 'right',
};

export interface PostAssets {
  logo: HTMLImageElement | null;
}

export type PostFieldKey =
  | 'title'
  | 'body'
  | 'lang'
  | 'code'
  | 'items'
  | 'aName'
  | 'aQ'
  | 'aDesc'
  | 'bName'
  | 'bQ'
  | 'bDesc'
  | 'quote'
  | 'statA'
  | 'labelA'
  | 'statB'
  | 'labelB'
  | 'url'
  | 'name'
  | 'desc'
  | 'features'
  | 'tagline'
  | 'audience'
  | 'steps';

export type PostFields = Record<PostFieldKey, string>;

export interface PostTemplateField {
  key: PostFieldKey;
  label: string;
  kind: 'text' | 'area' | 'code';
  hint?: string;
}

export interface PostTemplate {
  id: string;
  label: string;
  subtitle: string;
  fields: PostTemplateField[];
  defaults: Record<string, string>;
  draw: (
    ctx: Ctx,
    b: Box,
    d: PostFields,
    u: number,
    W: number,
    H: number,
    opts: PostBrandOptions
  ) => number;
}

export interface PostSize {
  id: 'sq' | 'pt' | 'ls' | 'st';
  label: string;
  sub: string;
  w: number;
  h: number;
}

export function fontSpec(weight: number, size: number, fam = FONT_AR) {
  return `${weight} ${Math.round(size)}px ${fam}`;
}

export function unitScale(W: number, H: number) {
  return Math.min(W, H * 1.12) / 1080;
}

export function rrect(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill?: string,
  stroke?: string,
  lw = 2
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

interface RichToken {
  text: string;
  volt: boolean;
  isRtl: boolean;
}

const HAS_ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const HAS_LATIN_OR_DIGIT_RE = /[A-Za-z0-9_]/;

function tokenizeRichText(str: string): RichToken[] {
  const rawWords: { w: string; volt: boolean }[] = [];
  let volt = false;
  for (const seg of str.split(/(\*)/)) {
    if (seg === '*') {
      volt = !volt;
      continue;
    }
    for (const w of seg.split(/\s+/)) {
      if (w) rawWords.push({ w, volt });
    }
  }

  const out: RichToken[] = [];
  for (const item of rawWords) {
    const isArabic = HAS_ARABIC_RE.test(item.w);
    const isLtrWord = !isArabic && HAS_LATIN_OR_DIGIT_RE.test(item.w);
    const prev = out[out.length - 1];

    if (
      isLtrWord &&
      prev &&
      !prev.isRtl &&
      prev.volt === item.volt &&
      prev.text.length + item.w.length < 28
    ) {
      prev.text = `${prev.text} ${item.w}`;
    } else {
      out.push({
        text: item.w,
        volt: item.volt,
        isRtl: isArabic || !isLtrWord,
      });
    }
  }
  return out;
}

export function wrapRichText(ctx: Ctx, str: string, f: string, maxW: number): RichToken[][] {
  ctx.font = f;
  const space = ctx.measureText(' ').width;
  const lines: RichToken[][] = [];

  for (const para of str.split('\n')) {
    let line: RichToken[] = [];
    let w = 0;

    for (const tk of tokenizeRichText(para)) {
      const tw = ctx.measureText(tk.text).width;
      if (line.length > 0 && w + space + tw > maxW) {
        lines.push(line);
        line = [];
        w = 0;
      }
      w += (line.length > 0 ? space : 0) + tw;
      line.push(tk);
    }
    if (line.length > 0) lines.push(line);
  }
  return lines;
}

function measureRichLineWidth(ctx: Ctx, line: RichToken[]) {
  const space = ctx.measureText(' ').width;
  return line.reduce((acc, tk, idx) => acc + ctx.measureText(tk.text).width + (idx > 0 ? space : 0), 0);
}

export interface TextOpts {
  size: number;
  weight?: number;
  color?: string;
  voltColor?: string;
  lh?: number;
  align?: 'right' | 'center' | 'left';
  maxLines?: number;
  minSize?: number;
  fam?: string;
}

export function drawRichText(
  ctx: Ctx,
  str: string,
  x: number,
  y: number,
  maxW: number,
  opts: TextOpts
): number {
  if (!str.trim() || maxW <= 20) return 0;

  let size = opts.size;
  const minSize = opts.minSize ?? opts.size * 0.58;
  let lines: RichToken[][] = [];

  for (;;) {
    lines = wrapRichText(ctx, str, fontSpec(opts.weight ?? 400, size, opts.fam), maxW);
    if (!opts.maxLines || lines.length <= opts.maxLines || size <= minSize) break;
    size *= 0.92;
  }

  if (opts.maxLines && lines.length > opts.maxLines) {
    lines = lines.slice(0, opts.maxLines);
  }

  const lh = size * (opts.lh ?? 1.5);
  ctx.font = fontSpec(opts.weight ?? 400, size, opts.fam);
  ctx.textBaseline = 'middle';
  const space = ctx.measureText(' ').width;

  lines.forEach((line, i) => {
    const lw = measureRichLineWidth(ctx, line);
    const startRight =
      opts.align === 'center'
        ? x + (maxW + lw) / 2
        : opts.align === 'left'
          ? x + lw
          : x + maxW;

    let cx = startRight;
    const cy = y + lh * i + lh / 2;

    for (const tk of line) {
      const tw = ctx.measureText(tk.text).width;
      ctx.fillStyle = tk.volt ? (opts.voltColor ?? POST_COLORS.volt) : (opts.color ?? POST_COLORS.white);

      if (HAS_ARABIC_RE.test(tk.text)) {
        ctx.direction = 'rtl';
        ctx.textAlign = 'right';
        ctx.fillText(tk.text, cx, cy);
        cx -= tw;
      } else {
        ctx.direction = 'ltr';
        ctx.textAlign = 'left';
        cx -= tw;
        ctx.fillText(tk.text, cx, cy);
      }
      cx -= space;
    }
  });

  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  return lh * lines.length;
}

export function drawCategoryBadge(
  ctx: Ctx,
  label: string,
  rightX: number,
  y: number,
  u: number,
  accent: 'volt' | 'purple' = 'volt'
): number {
  ctx.font = fontSpec(600, 22 * u);
  const tw = ctx.measureText(label).width;
  const padX = 24 * u;
  const w = tw + padX * 2;
  const h = 44 * u;

  const fill = accent === 'purple' ? POST_COLORS.purpleSoft : 'rgba(212, 255, 0, 0.08)';
  const stroke = accent === 'purple' ? POST_COLORS.purpleBorder : 'rgba(212, 255, 0, 0.45)';
  const fg = accent === 'purple' ? POST_COLORS.purple : POST_COLORS.volt;

  rrect(ctx, rightX - w, y, w, h, h / 2, fill, stroke, 1.5 * u);

  ctx.fillStyle = fg;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.fillText(label, rightX - w / 2, y + h / 2 + 1 * u);
  ctx.textAlign = 'left';
  ctx.direction = 'ltr';

  return h;
}

export function drawMono(
  ctx: Ctx,
  s: string,
  x: number,
  y: number,
  size: number,
  color: string,
  maxW?: number,
  weight = 500
): number {
  ctx.font = fontSpec(weight, size, FONT_MONO);
  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  let txt = s;
  if (maxW && maxW > 10) {
    while (txt.length > 1 && ctx.measureText(txt).width > maxW) {
      txt = `${txt.slice(0, -2)}…`;
    }
  }
  ctx.fillStyle = color;
  ctx.fillText(txt, x, y);
  return ctx.measureText(txt).width;
}

const JS_KEYWORDS = new Set([
  'const',
  'let',
  'var',
  'await',
  'async',
  'function',
  'return',
  'import',
  'from',
  'export',
  'default',
  'class',
  'interface',
  'type',
  'extends',
  'implements',
  'new',
  'if',
  'else',
  'for',
  'while',
  'try',
  'catch',
  'throw',
  'def',
  'True',
  'False',
  'None',
  'true',
  'false',
  'null',
]);

export function drawSyntaxCodeLine(
  ctx: Ctx,
  line: string,
  x: number,
  y: number,
  size: number,
  maxW: number
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y - size, maxW, size * 2);
  ctx.clip();

  ctx.font = fontSpec(500, size, FONT_MONO);
  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const trimmed = line.trim();
  if (/^(\/\/|#|--)/.test(trimmed)) {
    ctx.fillStyle = 'rgba(230, 230, 230, 0.42)';
    ctx.fillText(line, x, y);
    ctx.restore();
    return;
  }

  const tokens =
    line.match(
      /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\s+|[A-Za-z_][A-Za-z0-9_]*|[0-9]+(?:\.[0-9]+)?|.)/g
    ) ?? [line];
  let cx = x;

  for (const tk of tokens) {
    let color: string = POST_COLORS.gray;
    if (/^["'`]/.test(tk)) {
      color = POST_COLORS.volt;
    } else if (JS_KEYWORDS.has(tk)) {
      color = POST_COLORS.purple;
    } else if (/^[0-9]+/.test(tk)) {
      color = '#FDBA74';
    } else if (/^[()[\]{}.,:;=>+-/*]+$/.test(tk)) {
      color = 'rgba(230, 230, 230, 0.55)';
    }
    ctx.fillStyle = color;
    ctx.fillText(tk, cx, y);
    cx += ctx.measureText(tk).width;
  }

  ctx.restore();
}

function drawAccentDivider(ctx: Ctx, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = POST_COLORS.volt;
  ctx.fillRect(x, y, w, h);
}

export function drawSarbFrame(
  ctx: Ctx,
  W: number,
  H: number,
  assets: PostAssets,
  brand: PostBrandOptions,
  carouselMeta?: CarouselMeta
): Box {
  const u = unitScale(W, H);
  const isStory = H > W * 1.5;
  const mx = 74 * u;
  const topSafe = isStory ? 132 * u : 68 * u;
  const botSafe = isStory ? 148 * u : 68 * u;

  // 1. Base extreme black canvas
  ctx.fillStyle = POST_COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  // 2. Background Texture Mode
  if (brand.backgroundStyle === 'grid') {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.028)';
    ctx.lineWidth = 1 * u;
    const step = 54 * u;
    for (let gx = 0; gx < W; gx += step) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, H);
      ctx.stroke();
    }
    for (let gy = 0; gy < H; gy += step) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(W, gy);
      ctx.stroke();
    }
    ctx.restore();
  }

  const voltGlowIntensity = brand.backgroundStyle === 'spotlight' ? 0.12 : 0.075;
  const gVolt = ctx.createRadialGradient(
    brand.backgroundStyle === 'spotlight' ? W * 0.5 : W * 0.08,
    brand.backgroundStyle === 'spotlight' ? H * 0.45 : H * 0.92,
    0,
    brand.backgroundStyle === 'spotlight' ? W * 0.5 : W * 0.08,
    brand.backgroundStyle === 'spotlight' ? H * 0.45 : H * 0.92,
    Math.max(W, H) * (brand.backgroundStyle === 'spotlight' ? 0.55 : 0.58)
  );
  gVolt.addColorStop(0, `rgba(212, 255, 0, ${voltGlowIntensity})`);
  gVolt.addColorStop(1, 'rgba(212, 255, 0, 0)');
  ctx.fillStyle = gVolt;
  ctx.fillRect(0, 0, W, H);

  const gPurple = ctx.createRadialGradient(
    W * 0.92,
    H * 0.08,
    0,
    W * 0.92,
    H * 0.08,
    Math.max(W, H) * 0.48
  );
  gPurple.addColorStop(0, 'rgba(167, 139, 250, 0.06)');
  gPurple.addColorStop(1, 'rgba(167, 139, 250, 0)');
  ctx.fillStyle = gPurple;
  ctx.fillRect(0, 0, W, H);

  if (brand.showWingPattern) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.032)';
    ctx.lineWidth = 2 * u;
    for (let i = 0; i < 8; i++) {
      const o = i * 36 * u;
      ctx.beginPath();
      ctx.moveTo(W - 360 * u + o, H);
      ctx.lineTo(W + o, H - 360 * u);
      ctx.stroke();
    }
    ctx.restore();
  }

  let contentTop = topSafe;

  // 3. Header
  if (brand.showHeader) {
    const headH = 54 * u;
    let logoRightX = mx;
    if (assets.logo) {
      const lh = headH;
      const lw = (assets.logo.width / assets.logo.height) * lh;
      ctx.drawImage(assets.logo, mx, topSafe, lw, lh);
      logoRightX = mx + lw + 20 * u;
    }

    // Optional Carousel Slide Pill (next to logo)
    if (carouselMeta && carouselMeta.total > 1) {
      const slideStr = `${String(carouselMeta.index + 1).padStart(2, '0')} / ${String(carouselMeta.total).padStart(2, '0')}`;
      ctx.font = fontSpec(700, 18 * u, FONT_MONO);
      const pw = ctx.measureText(slideStr).width + 26 * u;
      const ph = 34 * u;
      rrect(
        ctx,
        logoRightX,
        topSafe + (headH - ph) / 2,
        pw,
        ph,
        ph / 2,
        POST_COLORS.voltSoft,
        POST_COLORS.voltBorder,
        1.2 * u
      );
      drawMono(ctx, slideStr, logoRightX + 13 * u, topSafe + headH / 2 + 1 * u, 18 * u, POST_COLORS.volt, undefined, 700);
    }

    ctx.textBaseline = 'middle';
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';

    if (brand.seriesTag.trim()) {
      ctx.font = fontSpec(600, 23 * u);
      ctx.fillStyle = POST_COLORS.white;
      ctx.fillText(brand.brandTitle || 'أكاديمية سَرب للبرمجة', W - mx, topSafe + headH * 0.34);

      ctx.font = fontSpec(500, 18 * u);
      ctx.fillStyle = POST_COLORS.purple;
      ctx.fillText(brand.seriesTag.trim(), W - mx, topSafe + headH * 0.78);
    } else {
      ctx.font = fontSpec(600, 24 * u);
      ctx.fillStyle = POST_COLORS.gray;
      ctx.fillText(brand.brandTitle || 'أكاديمية سَرب للبرمجة', W - mx, topSafe + headH / 2);
    }

    ctx.direction = 'ltr';
    ctx.textAlign = 'left';

    const topLineY = topSafe + headH + 26 * u;
    drawAccentDivider(ctx, mx, topLineY, W - 2 * mx, 2 * u);
    contentTop = topLineY + 42 * u;
  }

  let contentBot = H - botSafe;

  // 4. Footer with collision guard
  if (brand.showFooter) {
    const footH = 44 * u;
    const footY = H - botSafe - footH;
    const botLineY = footY - 26 * u;
    drawAccentDivider(ctx, mx, botLineY, W - 2 * mx, 2 * u);

    let ix = mx;
    const iconColor =
      brand.iconTone === 'volt'
        ? POST_COLORS.volt
        : brand.iconTone === 'white'
          ? POST_COLORS.white
          : POST_COLORS.gray;
    const iconAlpha = brand.iconTone === 'volt' ? 0.95 : brand.iconTone === 'white' ? 0.95 : 0.88;
    const badgeFill =
      brand.iconTone === 'volt'
        ? 'rgba(212, 255, 0, 0.12)'
        : brand.iconTone === 'white'
          ? '#242424'
          : '#1C1C1C';
    const badgeStroke =
      brand.iconTone === 'volt'
        ? 'rgba(212, 255, 0, 0.44)'
        : brand.iconTone === 'white'
          ? 'rgba(255, 255, 255, 0.28)'
          : 'rgba(230, 230, 230, 0.2)';

    if (brand.showSocialIcons && brand.enabledPlatforms.length > 0) {
      const iconSize = 36 * u;
      const iconGap = 11 * u;
      for (const platform of brand.enabledPlatforms) {
        drawSocialIconOnCanvas(
          ctx,
          platform,
          ix,
          footY + (footH - iconSize) / 2,
          iconSize,
          iconColor,
          iconAlpha,
          badgeFill,
          badgeStroke,
          brand.iconEffect
        );
        ix += iconSize + iconGap;
      }
      ix += 7 * u;
    }

    let handleW = 0;
    const handleStr = brand.handleText.trim();
    if (handleStr) {
      handleW = drawMono(
        ctx,
        handleStr,
        ix,
        footY + footH / 2,
        21 * u,
        brand.iconTone === 'volt' ? 'rgba(212,255,0,0.82)' : POST_COLORS.dim,
        Math.max(120 * u, W * 0.32),
        500
      );
    }

    const leftOccupiedEnd = ix + handleW + 24 * u;
    const rightEnd = W - mx;
    const ctaAvailW = Math.max(140 * u, rightEnd - leftOccupiedEnd);

    const footerCtaStr = brand.footerCta || 'تابعنا وكن جزء من *السَّرب*';

    drawRichText(ctx, footerCtaStr, leftOccupiedEnd, footY - 2 * u, ctaAvailW, {
      size: 23 * u,
      weight: 600,
      color: POST_COLORS.gray,
      lh: 1.4,
      maxLines: 1,
      minSize: 15 * u,
    });

    contentBot = botLineY - 42 * u;
  }

  return {
    x: mx,
    y: contentTop,
    w: W - 2 * mx,
    h: Math.max(200 * u, contentBot - contentTop),
  };
}

export function renderSarbPost(
  canvas: HTMLCanvasElement,
  W: number,
  H: number,
  tpl: PostTemplate,
  data: Record<string, string>,
  assets: PostAssets,
  brand: PostBrandOptions,
  carouselMeta?: CarouselMeta
) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const box = drawSarbFrame(ctx, W, H, assets, brand, carouselMeta);
  const fieldsProxy = new Proxy(data, {
    get: (target, key: string) => target[key] ?? '',
  }) as unknown as PostFields;

  const base = unitScale(W, H);

  const off = document.createElement('canvas');
  off.width = W;
  off.height = H;
  const octx = off.getContext('2d')!;

  let k = 1;
  let used = 0;
  for (let i = 0; i < 10; i++) {
    used = tpl.draw(octx, { ...box, y: 0 }, fieldsProxy, base * k, W, H, brand);
    if (used <= box.h) break;
    k *= 0.92;
  }

  const verticalOffset = Math.max(0, (box.h - used) / 2);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, box.y - 24 * base, W, box.h + 48 * base);
  ctx.clip();
  tpl.draw(ctx, { ...box, y: box.y + verticalOffset }, fieldsProxy, base * k, W, H, brand);
  ctx.restore();
}
