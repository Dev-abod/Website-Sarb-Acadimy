import {
  REEL_DIMENSIONS,
  SARB_ASSETS,
  SARB_COLORS,
} from '../data/lessonStoryboard';

export interface LoadedBrandImages {
  logoOnDark: HTMLImageElement | null;
  appIcon: HTMLImageElement | null;
  mascot: HTMLImageElement | null;
}

export interface TextSegment {
  text: string;
  color: string;
  latin?: boolean;
  bold?: boolean;
}

export function loadBrandImages(): Promise<LoadedBrandImages> {
  const loadOne = (src: string): Promise<HTMLImageElement | null> =>
    new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });

  return Promise.all([
    loadOne(SARB_ASSETS.logoOnDark),
    loadOne(SARB_ASSETS.icon),
    loadOne(SARB_ASSETS.mascot),
  ]).then(([logoOnDark, appIcon, mascot]) => ({
    logoOnDark,
    appIcon,
    mascot,
  }));
}

export function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t));
}

export function easeOutCubic(t: number): number {
  const x = clamp01(t);
  return 1 - Math.pow(1 - x, 3);
}

export function easeInOutCubic(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function easeOutBack(t: number): number {
  const x = clamp01(t);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

export function segmentProgress(progress: number, start: number, end: number): number {
  return clamp01((progress - start) / Math.max(0.001, end - start));
}

function pseudoRand(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function drawSoftGlow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  rgbaInner: string
): void {
  ctx.save();
  const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, radius);
  grad.addColorStop(0, rgbaInner);
  grad.addColorStop(1, 'rgba(16, 16, 16, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawShockwave(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  t: number,
  maxRadius: number,
  color: string
): void {
  if (t <= 0.001 || t >= 0.999) return;
  const p = easeOutCubic(t);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = (1 - p) * 0.65;
  ctx.lineWidth = Math.max(1, 4.5 * (1 - p));
  ctx.beginPath();
  ctx.arc(cx, cy, 18 + p * maxRadius, 0, Math.PI * 2);
  ctx.stroke();

  if (t > 0.14) {
    const p2 = easeOutCubic((t - 0.14) / 0.86);
    ctx.globalAlpha = (1 - p2) * 0.35;
    ctx.lineWidth = Math.max(0.8, 2.5 * (1 - p2));
    ctx.beginPath();
    ctx.arc(cx, cy, 12 + p2 * (maxRadius * 0.72), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawParticleBurst(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  t: number,
  count: number,
  maxDist: number,
  color: string,
  seed: number
): void {
  if (t <= 0.001 || t >= 0.999) return;
  const p = easeOutCubic(t);
  const fade = t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8;

  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (pseudoRand(seed + i * 3) - 0.5) * 0.45;
    const distScale = 0.55 + pseudoRand(seed + i * 7) * 0.55;
    const dist = (14 + p * maxDist) * distScale;
    const px = cx + Math.cos(angle) * dist;
    const py = cy + Math.sin(angle) * dist;
    const size = (2.4 + pseudoRand(seed + i * 11) * 2.8) * (1 - p * 0.55);

    ctx.globalAlpha = clamp01(fade * 0.85);
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export function drawMascotMedallion(
  ctx: CanvasRenderingContext2D,
  mascot: HTMLImageElement | null,
  cx: number,
  cy: number,
  radius: number,
  alpha: number,
  scale = 1,
  tiltRad = 0,
  badgeText?: string
): void {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.rotate(tiltRad);
  ctx.scale(scale, scale);

  ctx.fillStyle = SARB_COLORS.darkSurface;
  ctx.beginPath();
  ctx.arc(0, 0, radius + 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = SARB_COLORS.white;
  ctx.fill();
  ctx.clip();

  if (mascot) {
    const size = radius * 2.02;
    ctx.drawImage(mascot, -size / 2, -size / 2 + 4, size, size);
  }
  ctx.restore();

  ctx.strokeStyle = SARB_COLORS.volt;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();

  if (badgeText) {
    ctx.save();
    ctx.translate(radius * 0.78, -radius * 0.72);
    ctx.fillStyle = SARB_COLORS.volt;
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = SARB_COLORS.extremeBlack;
    ctx.font = '700 28px "IBM Plex Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, 0, 1);
    ctx.restore();
  }

  ctx.restore();
}

export function drawSarbFlock(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  alpha: number,
  flapPhase = 0
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.strokeStyle = SARB_COLORS.volt;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const birds = [
    { x: -34, y: -12, s: 1, phase: 0 },
    { x: 24, y: -22, s: 0.9, phase: 1.1 },
    { x: 0, y: 18, s: 1.05, phase: 2.2 },
  ];

  for (const b of birds) {
    const wingLift = Math.sin(flapPhase + b.phase) * 4.5 * b.s;
    ctx.beginPath();
    ctx.moveTo(b.x - 16 * b.s, b.y - 8 * b.s + wingLift);
    ctx.lineTo(b.x, b.y + 8 * b.s - wingLift * 0.35);
    ctx.lineTo(b.x + 16 * b.s, b.y - 8 * b.s + wingLift);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawVectorCar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  strokeColor: string,
  accentColor: string,
  alpha = 1,
  wheelSpinRad = 0,
  tiltRad = 0,
  headlightGlow = 0
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 44, 138, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  if (headlightGlow > 0.01) {
    ctx.save();
    ctx.rotate(tiltRad);
    const beamGrad = ctx.createLinearGradient(126, -2, 238, 14);
    beamGrad.addColorStop(0, `rgba(212, 255, 0, ${0.24 * headlightGlow})`);
    beamGrad.addColorStop(1, 'rgba(212, 255, 0, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(126, -5);
    ctx.lineTo(240, -24);
    ctx.lineTo(240, 26);
    ctx.lineTo(126, 3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.rotate(tiltRad);

  ctx.fillStyle = '#181818';
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-132, 20);
  ctx.bezierCurveTo(-134, -2, -124, -14, -96, -18);
  ctx.bezierCurveTo(-68, -46, -42, -56, -4, -56);
  ctx.bezierCurveTo(42, -56, 72, -40, 94, -16);
  ctx.bezierCurveTo(124, -12, 136, -2, 134, 16);
  ctx.quadraticCurveTo(132, 24, 120, 24);
  ctx.lineTo(-120, 24);
  ctx.quadraticCurveTo(-132, 24, -132, 20);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#101010';
  ctx.strokeStyle = 'rgba(230, 230, 230, 0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-76, -18);
  ctx.bezierCurveTo(-54, -40, -32, -46, -2, -46);
  ctx.bezierCurveTo(34, -46, 56, -34, 74, -18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-98, -8);
  ctx.lineTo(86, -8);
  ctx.stroke();

  ctx.fillStyle = accentColor;
  drawRoundedRect(ctx, 114, -4, 14, 5, 2.5);
  ctx.fill();
  ctx.restore();

  for (const wx of [-78, 80]) {
    ctx.save();
    ctx.translate(wx, 24);

    ctx.fillStyle = SARB_COLORS.extremeBlack;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.rotate(wheelSpinRad);
    ctx.strokeStyle = 'rgba(230, 230, 230, 0.38)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.stroke();

    for (let s = 0; s < 4; s++) {
      const a = (s * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 4.5, Math.sin(a) * 4.5);
      ctx.lineTo(Math.cos(a) * 11, Math.sin(a) * 11);
      ctx.stroke();
    }
    ctx.restore();

    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  ctx.restore();
}

export function drawStatusIcon(
  ctx: CanvasRenderingContext2D,
  type: 'error' | 'warning' | 'success' | 'question',
  cx: number,
  cy: number,
  r: number,
  color: string,
  alpha = 1
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (type === 'error') {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    const d = r * 0.42;
    ctx.beginPath();
    ctx.moveTo(cx - d, cy - d);
    ctx.lineTo(cx + d, cy + d);
    ctx.moveTo(cx + d, cy - d);
    ctx.lineTo(cx - d, cy + d);
    ctx.stroke();
  } else if (type === 'success') {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.42, cy + 2);
    ctx.lineTo(cx - r * 0.1, cy + r * 0.34);
    ctx.lineTo(cx + r * 0.46, cy - r * 0.32);
    ctx.stroke();
  } else if (type === 'warning') {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r * 0.95, cy + r * 0.78);
    ctx.lineTo(cx - r * 0.95, cy + r * 0.78);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.35);
    ctx.lineTo(cx, cy + r * 0.22);
    ctx.moveTo(cx, cy + r * 0.48);
    ctx.lineTo(cx, cy + r * 0.5);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = `700 ${Math.round(r * 1.25)}px "IBM Plex Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', cx, cy + 2);
  }
  ctx.restore();
}

export function drawMixedRtlParagraph(
  ctx: CanvasRenderingContext2D,
  lines: TextSegment[][],
  centerX: number,
  startY: number,
  lineHeight: number,
  fontSize: number,
  alpha = 1
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textBaseline = 'middle';

  lines.forEach((segments, lineIdx) => {
    const y = startY + lineIdx * lineHeight;
    const widths = segments.map((seg) => {
      const weight = seg.bold ? 700 : 600;
      const family = seg.latin
        ? '"IBM Plex Sans", sans-serif'
        : '"IBM Plex Sans Arabic", sans-serif';
      ctx.font = `${weight} ${fontSize}px ${family}`;
      return ctx.measureText(seg.text).width;
    });
    const totalWidth = widths.reduce((sum, w) => sum + w, 0);
    let cursorX = centerX + totalWidth / 2;

    segments.forEach((seg, idx) => {
      const w = widths[idx];
      const weight = seg.bold ? 700 : 600;
      const family = seg.latin
        ? '"IBM Plex Sans", sans-serif'
        : '"IBM Plex Sans Arabic", sans-serif';
      ctx.font = `${weight} ${fontSize}px ${family}`;
      ctx.fillStyle = seg.color;
      if (seg.latin) {
        ctx.direction = 'ltr';
        ctx.textAlign = 'left';
        ctx.fillText(seg.text, cursorX - w, y);
      } else {
        ctx.direction = 'rtl';
        ctx.textAlign = 'right';
        ctx.fillText(seg.text, cursorX, y);
      }
      cursorX -= w;
    });
  });

  ctx.restore();
}

export function getReelCenterX(): number {
  return REEL_DIMENSIONS.width / 2;
}
