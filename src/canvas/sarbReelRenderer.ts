import {
  REEL_DIMENSIONS,
  SARB_ASSETS,
  SARB_COLORS,
  type LessonId,
  type ScheduledScene,
} from '../data/lessonStoryboard';
import { renderStackHeapScene } from './stackHeapScenes';
import { renderSarbBrandScene } from './sarbBrandScenes';
import { renderDynamicSarbScene } from './dynamicSceneRenderer';

export interface LoadedBrandImages {
  logoOnDark: HTMLImageElement | null;
  appIcon: HTMLImageElement | null;
  mascot: HTMLImageElement | null;
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

// Easing helpers
function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t));
}

function easeOutCubic(t: number): number {
  const x = clamp01(t);
  return 1 - Math.pow(1 - x, 3);
}

function easeInOutCubic(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function easeOutBack(t: number): number {
  const x = clamp01(t);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

function segmentProgress(progress: number, start: number, end: number): number {
  return clamp01((progress - start) / Math.max(0.001, end - start));
}

function pseudoRand(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function drawSoftGlow(
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

function drawShockwave(
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

function drawParticleBurst(
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

interface TextSegment {
  text: string;
  color: string;
  latin?: boolean;
  bold?: boolean;
}

function drawRoundedRect(
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


function drawMascotMedallion(
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

  // Subtle dark-surface outer halo
  ctx.fillStyle = SARB_COLORS.darkSurface;
  ctx.beginPath();
  ctx.arc(0, 0, radius + 10, 0, Math.PI * 2);
  ctx.fill();

  // Crisp white circular interior so black line-art mascot is crystal clear
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

  // Volt accent ring
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

function drawSarbFlock(
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

function drawVectorCar(
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

  // Calm grounded shadow beneath tires (stays level with ground)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 44, 138, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Optional soft headlight beam
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

  // Smooth aerodynamic sedan body
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

  // Calm minimalist cabin glass
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

  // Subtle calm body beltline highlight
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-98, -8);
  ctx.lineTo(86, -8);
  ctx.stroke();

  // Minimalist front headlight accent
  ctx.fillStyle = accentColor;
  drawRoundedRect(ctx, 114, -4, 14, 5, 2.5);
  ctx.fill();
  ctx.restore();

  // Clean minimalist spinning wheels
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

    // Inner rotating rim spokes
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

function drawStatusIcon(
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

// Draws centered multi-line Arabic + English mixed lines accurately RTL
function drawMixedRtlParagraph(
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

function drawSafeZonesGuide(ctx: CanvasRenderingContext2D): void {
  const { width, height, safeMarginX, safeMarginTop, safeMarginBottom } = REEL_DIMENSIONS;
  ctx.save();

  // Dim unsafe zones slightly
  ctx.fillStyle = 'rgba(167, 139, 250, 0.06)';
  ctx.fillRect(0, 0, width, safeMarginTop);
  ctx.fillRect(0, height - safeMarginBottom, width, safeMarginBottom);
  ctx.fillRect(0, safeMarginTop, safeMarginX, height - safeMarginTop - safeMarginBottom);
  ctx.fillRect(
    width - safeMarginX,
    safeMarginTop,
    safeMarginX,
    height - safeMarginTop - safeMarginBottom
  );

  // Dashed safe border
  ctx.strokeStyle = 'rgba(212, 255, 0, 0.55)';
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 10]);
  ctx.strokeRect(
    safeMarginX,
    safeMarginTop,
    width - safeMarginX * 2,
    height - safeMarginTop - safeMarginBottom
  );

  ctx.setLineDash([]);
  ctx.fillStyle = SARB_COLORS.volt;
  ctx.font = '600 20px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.direction = 'ltr';
  ctx.fillText('SAFE REEL ZONE (920 x 1420) · 250px TOP/BOTTOM CLEAR', width / 2, safeMarginTop - 22);

  ctx.restore();
}

function drawPersistentChrome(
  ctx: CanvasRenderingContext2D,
  scene: ScheduledScene,
  allScenes: ScheduledScene[],
  images: LoadedBrandImages
): void {
  const { width, safeMarginX, safeMarginTop, height, safeMarginBottom } = REEL_DIMENSIONS;

  // Top floating kicker & scene counter (no lines or segmented bars)
  const topY = safeMarginTop + 26;
  ctx.save();
  ctx.direction = 'ltr';
  ctx.font = '600 21px "IBM Plex Sans", sans-serif';
  ctx.fillStyle = SARB_COLORS.volt;
  ctx.textAlign = 'left';
  ctx.fillText(scene.labelEn, safeMarginX, topY);

  ctx.font = '400 21px "JetBrains Mono", monospace';
  ctx.fillStyle = SARB_COLORS.grayMuted;
  ctx.textAlign = 'right';
  ctx.fillText(`0${scene.index} / 0${allScenes.length}`, width - safeMarginX, topY);
  ctx.restore();

  // Persistent bottom identity: Mascot + "نتعلّم معًا، ونبني أثرًا معًا." (no line, no logo, no @handle)
  const footerCenterY = height - safeMarginBottom - 38;
  const mascotCenterX = width - safeMarginX - 34;

  drawMascotMedallion(
    ctx,
    images.mascot,
    mascotCenterX,
    footerCenterY,
    30,
    1,
    1,
    0
  );

  ctx.save();
  ctx.textBaseline = 'middle';
  const phraseSegments: TextSegment[] = [
    { text: 'نتعلّم معًا، ونبني ', color: SARB_COLORS.white, bold: true },
    { text: 'أثرًا', color: SARB_COLORS.volt, bold: true },
    { text: ' معًا.', color: SARB_COLORS.white, bold: true },
  ];

  let cursorX = mascotCenterX - 52;
  ctx.font = '700 28px "IBM Plex Sans Arabic", sans-serif';
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  for (const seg of phraseSegments) {
    ctx.fillStyle = seg.color;
    ctx.fillText(seg.text, cursorX, footerCenterY);
    cursorX -= ctx.measureText(seg.text).width;
  }
  ctx.restore();
}

let transitionCanvasA: HTMLCanvasElement | null = null;
let transitionCanvasB: HTMLCanvasElement | null = null;

function getTransitionBuffers(): {
  bufA: HTMLCanvasElement;
  ctxA: CanvasRenderingContext2D;
  bufB: HTMLCanvasElement;
  ctxB: CanvasRenderingContext2D;
} | null {
  if (typeof document === 'undefined') return null;
  if (!transitionCanvasA) {
    transitionCanvasA = document.createElement('canvas');
    transitionCanvasA.width = REEL_DIMENSIONS.width;
    transitionCanvasA.height = REEL_DIMENSIONS.height;
  }
  if (!transitionCanvasB) {
    transitionCanvasB = document.createElement('canvas');
    transitionCanvasB.width = REEL_DIMENSIONS.width;
    transitionCanvasB.height = REEL_DIMENSIONS.height;
  }
  const ctxA = transitionCanvasA.getContext('2d');
  const ctxB = transitionCanvasB.getContext('2d');
  if (!ctxA || !ctxB) return null;
  return { bufA: transitionCanvasA, ctxA, bufB: transitionCanvasB, ctxB };
}

function drawSceneContent(
  ctx: CanvasRenderingContext2D,
  scene: ScheduledScene,
  progress: number,
  totalTimeMs: number,
  images: LoadedBrandImages,
  lessonId: LessonId = 'oop-principles'
): void {
  if (scene.visualBlueprint) {
    renderDynamicSarbScene(ctx, scene, progress, totalTimeMs, images);
    if (scene.visualBlueprint.layoutType === 'outro_takeaway') {
      renderSharedOutroPhaseB(ctx, progress, images);
    }
    return;
  }

  if (lessonId === 'sarb-brand-intro') {
    renderSarbBrandScene(ctx, scene.index, progress, totalTimeMs, images);
    if (scene.index === 5) {
      renderSharedOutroPhaseB(ctx, progress, images);
    }
    return;
  }

  if (lessonId === 'stack-vs-heap') {
    renderStackHeapScene(ctx, scene.index, progress, totalTimeMs, images);
    if (scene.index === 8) {
      renderSharedOutroPhaseB(ctx, progress, images);
    }
    return;
  }

  switch (scene.index) {
    case 1:
      renderScene1OopHook(ctx, progress, totalTimeMs, images);
      break;
    case 2:
      renderScene2Encapsulation(ctx, progress, totalTimeMs);
      break;
    case 3:
      renderScene3Abstraction(ctx, progress, totalTimeMs);
      break;
    case 4:
      renderScene4Inheritance(ctx, progress, totalTimeMs);
      break;
    case 5:
      renderScene5Polymorphism(ctx, progress, totalTimeMs);
      break;
    case 6:
      renderScene6OopOutro(ctx, progress, images);
      break;
  }
}

export function renderReelFrame(
  ctx: CanvasRenderingContext2D,
  scene: ScheduledScene,
  allScenes: ScheduledScene[],
  progress: number,
  totalTimeMs: number,
  images: LoadedBrandImages,
  showSafeZones: boolean,
  lessonId: LessonId = 'oop-principles'
): void {
  const { width, height } = REEL_DIMENSIONS;

  // 1. Full-bleed solid Extreme Black background across the entire video
  ctx.fillStyle = SARB_COLORS.extremeBlack;
  ctx.fillRect(0, 0, width, height);

  // 2. Contextual Scene Transition (first 380ms of scenes 2..N)
  const localMs = Math.max(0, totalTimeMs - scene.startMs);
  const transitionMs = 380;
  const prevScene = scene.index > 1 ? allScenes[scene.index - 2] : null;
  const buffers = prevScene && localMs < transitionMs ? getTransitionBuffers() : null;

  if (prevScene && buffers && localMs < transitionMs) {
    const t = easeOutCubic(localMs / transitionMs);

    // Outgoing previous scene
    buffers.ctxA.clearRect(0, 0, width, height);
    drawSceneContent(buffers.ctxA, prevScene, 1, scene.startMs, images, lessonId);

    // Incoming active scene
    buffers.ctxB.clearRect(0, 0, width, height);
    drawSceneContent(buffers.ctxB, scene, progress, totalTimeMs, images, lessonId);

    const drawTransformed = (
      source: HTMLCanvasElement,
      alpha: number,
      dx: number,
      dy: number,
      scale: number
    ) => {
      ctx.save();
      ctx.globalAlpha = clamp01(alpha);
      ctx.translate(width / 2 + dx, height / 2 + dy);
      ctx.scale(scale, scale);
      ctx.drawImage(source, -width / 2, -height / 2);
      ctx.restore();
    };

    const isOutro = scene.index === allScenes.length;
    if (isOutro) {
      drawTransformed(buffers.bufA, 1 - t, 0, -8 * t, 1);
      drawTransformed(buffers.bufB, t, 0, 8 * (1 - t), 1);
    } else {
      switch (scene.index) {
        case 2:
          drawTransformed(buffers.bufA, 1 - t, 0, 0, 1 + 0.03 * t);
          drawTransformed(buffers.bufB, t, 0, 0, 0.96 + 0.04 * t);
          break;
        case 3:
          drawTransformed(buffers.bufA, 1 - t, 34 * t, 0, 1);
          drawTransformed(buffers.bufB, t, -34 * (1 - t), 0, 1);
          break;
        case 4:
          drawTransformed(buffers.bufA, 1 - t, 0, -14 * t, 1 - 0.02 * t);
          drawTransformed(buffers.bufB, t, 0, 0, 0.95 + 0.05 * t);
          break;
        case 5:
          drawTransformed(buffers.bufA, 1 - t, 0, -24 * t, 1);
          drawTransformed(buffers.bufB, t, 0, 24 * (1 - t), 0.98 + 0.02 * t);
          break;
        default:
          drawTransformed(buffers.bufA, 1 - t, 0, -20 * t, 1);
          drawTransformed(buffers.bufB, t, 0, 20 * (1 - t), 1);
          break;
      }
    }
  } else {
    drawSceneContent(ctx, scene, progress, totalTimeMs, images, lessonId);
  }

  // 3. Persistent Mascot + Identity Phrase (fades smoothly before centered Outro)
  const lastSceneIndex = allScenes.length;
  if (scene.index !== lastSceneIndex || progress < 0.36) {
    const chromeFade =
      scene.index === lastSceneIndex
        ? 1 - easeInOutCubic(segmentProgress(progress, 0.26, 0.36))
        : 1;
    ctx.save();
    ctx.globalAlpha = chromeFade;
    drawPersistentChrome(ctx, scene, allScenes, images);
    ctx.restore();
  }

  if (showSafeZones) {
    drawSafeZonesGuide(ctx);
  }
}

// ============================================================================
// OOP VECTOR HELPERS
// ============================================================================
function drawSceneSectionHeader(
  ctx: CanvasRenderingContext2D,
  badgeAr: string,
  titleAr: string,
  titleEn: string,
  accentColor: string,
  enterProgress: number
): void {
  const cx = REEL_DIMENSIONS.width / 2;
  const p = easeOutCubic(enterProgress);
  if (p <= 0.01) return;

  ctx.save();
  ctx.globalAlpha = p;
  ctx.translate(0, (1 - p) * 20);

  const pillW = 240;
  const pillH = 42;
  ctx.fillStyle = accentColor;
  drawRoundedRect(ctx, cx - pillW / 2, 362, pillW, pillH, 21);
  ctx.fill();

  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = SARB_COLORS.extremeBlack;
  ctx.font = '700 22px "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText(badgeAr, cx, 383);

  ctx.fillStyle = SARB_COLORS.white;
  ctx.font = '700 44px "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText(titleAr, cx, 444);

  ctx.direction = 'ltr';
  ctx.fillStyle = accentColor;
  ctx.font = '600 24px "JetBrains Mono", monospace';
  ctx.fillText(titleEn, cx, 492);

  ctx.restore();
}

function drawVectorPadlock(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  accentColor: string,
  openAmount: number,
  alpha = 1
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  ctx.save();
  const shackleLift = openAmount * 22;
  ctx.translate(0, -shackleLift);
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, -24, 24, Math.PI, 0, false);
  ctx.moveTo(-24, -24);
  ctx.lineTo(-24, 2);
  if (openAmount < 0.15) {
    ctx.moveTo(24, -24);
    ctx.lineTo(24, 2);
  } else {
    ctx.moveTo(24, -24);
    ctx.lineTo(24, -10);
  }
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = SARB_COLORS.darkSurface;
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 4;
  drawRoundedRect(ctx, -38, -4, 76, 60, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.arc(0, 20, 8, 0, Math.PI * 2);
  ctx.fill();
  drawRoundedRect(ctx, -4, 22, 8, 16, 4);
  ctx.fill();

  ctx.restore();
}

function drawVectorGear(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerR: number,
  teeth: number,
  rotRad: number,
  strokeColor: string,
  fillColor: string,
  alpha = 1
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.rotate(rotRad);

  const innerR = outerR * 0.74;
  const toothDepth = outerR * 0.24;
  ctx.beginPath();
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2;
    const step = (Math.PI * 2) / teeth;
    const a1 = a0 + step * 0.18;
    const a2 = a0 + step * 0.45;
    const a3 = a0 + step * 0.63;
    const rOuter = innerR + toothDepth;
    if (i === 0) {
      ctx.moveTo(Math.cos(a0) * innerR, Math.sin(a0) * innerR);
    } else {
      ctx.lineTo(Math.cos(a0) * innerR, Math.sin(a0) * innerR);
    }
    ctx.lineTo(Math.cos(a1) * rOuter, Math.sin(a1) * rOuter);
    ctx.lineTo(Math.cos(a2) * rOuter, Math.sin(a2) * rOuter);
    ctx.lineTo(Math.cos(a3) * innerR, Math.sin(a3) * innerR);
  }
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2.8;
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = SARB_COLORS.extremeBlack;
  ctx.beginPath();
  ctx.arc(0, 0, innerR * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function drawVectorPlane(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  strokeColor: string,
  accentColor: string,
  tiltRad = 0,
  alpha = 1
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.rotate(tiltRad);
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.fillStyle = '#181818';
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-78, -6);
  ctx.lineTo(-104, -40);
  ctx.lineTo(-80, -40);
  ctx.lineTo(-48, -6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-92, 6);
  ctx.quadraticCurveTo(-96, -12, -62, -14);
  ctx.lineTo(54, -14);
  ctx.bezierCurveTo(88, -14, 108, -2, 110, 6);
  ctx.bezierCurveTo(106, 16, 82, 18, 52, 18);
  ctx.lineTo(-68, 18);
  ctx.quadraticCurveTo(-90, 18, -92, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = SARB_COLORS.darkSurface;
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(-10, 4);
  ctx.lineTo(-42, 42);
  ctx.lineTo(-18, 42);
  ctx.lineTo(26, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = accentColor;
  drawRoundedRect(ctx, 56, -8, 28, 8, 4);
  ctx.fill();

  ctx.restore();
}

function drawVectorSubmarine(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  strokeColor: string,
  accentColor: string,
  propPhase = 0,
  alpha = 1
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(-4, -36);
  ctx.lineTo(-4, -52);
  ctx.lineTo(12, -52);
  ctx.stroke();

  ctx.fillStyle = '#181818';
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, -26, -38, 46, 20, 8);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(0, 2, 92, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const bladeH = 12 + Math.abs(Math.sin(propPhase)) * 10;
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-98, -bladeH);
  ctx.lineTo(-98, bladeH);
  ctx.stroke();

  for (const px of [-36, 0, 36]) {
    ctx.fillStyle = SARB_COLORS.extremeBlack;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(px, 2, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

// ============================================================================
// SCENE 1: HOOK — Clean, Uncrowded Sequential 1-by-1 Reveal of the 4 OOP Principles
// ============================================================================
function renderScene1OopHook(
  ctx: CanvasRenderingContext2D,
  progress: number,
  totalTimeMs: number,
  images: LoadedBrandImages
): void {
  const cx = REEL_DIMENSIONS.width / 2;

  // 1. Clean Hero Mascot (generous breathing space, zero extra decorative clutter)
  const glowA = easeOutCubic(segmentProgress(progress, 0.0, 0.25));
  drawSoftGlow(ctx, cx, 448, 230, `rgba(212, 255, 0, ${0.12 * glowA})`);

  const mascotScale = easeOutBack(segmentProgress(progress, 0.0, 0.22));
  const mascotAlpha = easeOutCubic(segmentProgress(progress, 0.0, 0.14));
  const floatY = Math.sin(totalTimeMs / 480) * 5;

  drawMascotMedallion(
    ctx,
    images.mascot,
    cx,
    448 + floatY,
    74,
    mascotAlpha,
    mascotScale,
    Math.sin(totalTimeMs / 760) * 0.03,
    '4'
  );

  // 2. Crisp 2-line Headline + Compact Kicker Pill
  const textEnter = easeOutCubic(segmentProgress(progress, 0.08, 0.28));
  if (textEnter > 0.01) {
    drawMixedRtlParagraph(
      ctx,
      [
        [{ text: 'أربع كلمات تحوّل كتابة الكود', color: SARB_COLORS.white, bold: true }],
        [
          { text: 'إلى ', color: SARB_COLORS.white, bold: true },
          { text: 'هندسة أنظمة حقيقية', color: SARB_COLORS.volt, bold: true },
        ],
      ],
      cx,
      610 + (1 - textEnter) * 18,
      68,
      44,
      textEnter
    );
  }

  const kickerT = easeOutCubic(segmentProgress(progress, 0.22, 0.36));
  if (kickerT > 0.01) {
    ctx.save();
    ctx.globalAlpha = kickerT;
    ctx.fillStyle = SARB_COLORS.volt;
    drawRoundedRect(ctx, cx - 180, 742, 360, 50, 25);
    ctx.fill();

    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = SARB_COLORS.extremeBlack;
    ctx.font = '700 26px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('مبادئ الـ OOP الأربعة', cx, 767);
    ctx.restore();
  }

  // 3. One-by-One Sequential Spotlight Reveal (01 -> 02 -> 03 -> 04)
  const principles = [
    {
      num: '01',
      en: 'Encapsulation',
      ar: 'التغليف',
      hint: 'حماية البيانات الحساسة بواجهات آمنة',
      accent: SARB_COLORS.stackPurple,
    },
    {
      num: '02',
      en: 'Abstraction',
      ar: 'التجريد',
      hint: 'بساطة الاستخدام وإخفاء التعقيد',
      accent: SARB_COLORS.volt,
    },
    {
      num: '03',
      en: 'Inheritance',
      ar: 'الوراثة',
      hint: 'إعادة بناء الخصائص بدون تكرار',
      accent: SARB_COLORS.stackPurple,
    },
    {
      num: '04',
      en: 'Polymorphism',
      ar: 'تعدد الأشكال',
      hint: 'أمر واحد بتنفيذ مخصص لكل كائن',
      accent: SARB_COLORS.volt,
    },
  ];

  const seqStart = 0.34;
  const seqSpan = 1.0 - seqStart;
  const slotSpan = seqSpan / principles.length;

  let activeIdx = -1;
  if (progress >= seqStart) {
    activeIdx = Math.min(
      principles.length - 1,
      Math.floor((progress - seqStart) / slotSpan)
    );
  }

  if (activeIdx >= 0) {
    const slotStart = seqStart + activeIdx * slotSpan;
    const slotT = clamp01((progress - slotStart) / slotSpan);
    const isLast = activeIdx === principles.length - 1;

    const enterT = easeOutCubic(segmentProgress(slotT, 0.0, 0.28));
    const exitT = isLast ? 0 : easeInOutCubic(segmentProgress(slotT, 0.78, 1.0));
    const alpha = clamp01(enterT * (1 - exitT));
    const slideY = (1 - enterT) * 28 - exitT * 22;
    const cardScale = 0.94 + 0.06 * enterT - 0.03 * exitT;

    const p = principles[activeIdx];
    const cardW = 780;
    const cardH = 310;
    const cardY = 1020 + slideY;

    if (alpha > 0.01) {
      drawSoftGlow(
        ctx,
        cx,
        cardY,
        240,
        p.accent === SARB_COLORS.volt
          ? `rgba(212, 255, 0, ${0.12 * alpha})`
          : `rgba(167, 139, 250, ${0.14 * alpha})`
      );

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(cx, cardY);
      ctx.scale(cardScale, cardScale);

      ctx.fillStyle = SARB_COLORS.darkSurface;
      ctx.strokeStyle = p.accent;
      ctx.lineWidth = 3;
      drawRoundedRect(ctx, -cardW / 2, -cardH / 2, cardW, cardH, 30);
      ctx.fill();
      ctx.stroke();

      // Number Badge (Top Center)
      ctx.fillStyle = p.accent;
      drawRoundedRect(ctx, -56, -cardH / 2 - 22, 112, 44, 22);
      ctx.fill();

      ctx.direction = 'ltr';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = SARB_COLORS.extremeBlack;
      ctx.font = '700 24px "JetBrains Mono", monospace';
      ctx.fillText(p.num, 0, -cardH / 2 + 1);

      // Arabic Principle Name
      ctx.direction = 'rtl';
      ctx.fillStyle = SARB_COLORS.white;
      ctx.font = '700 58px "IBM Plex Sans Arabic", sans-serif';
      ctx.fillText(p.ar, 0, -34);

      // English Term
      ctx.direction = 'ltr';
      ctx.fillStyle = p.accent;
      ctx.font = '700 30px "JetBrains Mono", monospace';
      ctx.fillText(p.en, 0, 32);

      // Concise Role Hint
      ctx.direction = 'rtl';
      ctx.fillStyle = SARB_COLORS.grayHint;
      ctx.font = '600 25px "IBM Plex Sans Arabic", sans-serif';
      ctx.fillText(p.hint, 0, 92);

      ctx.restore();
    }

    // Minimalist Step Indicator Dots Below Card (01 · 02 · 03 · 04)
    const dotStep = 66;
    const dotStartX = cx - ((principles.length - 1) * dotStep) / 2;
    const dotsY = 1265;
    principles.forEach((item, idx) => {
      const isCurrent = idx === activeIdx;
      const isDone = idx < activeIdx;
      const dx = dotStartX + idx * dotStep;

      ctx.save();
      ctx.fillStyle = isCurrent
        ? item.accent
        : isDone
          ? SARB_COLORS.grayHint
          : SARB_COLORS.darkSurface;
      ctx.strokeStyle = isCurrent || isDone ? item.accent : SARB_COLORS.borderStrong;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(dx, dotsY, isCurrent ? 18 : 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.direction = 'ltr';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isCurrent || isDone ? SARB_COLORS.extremeBlack : SARB_COLORS.grayMuted;
      ctx.font = `700 ${isCurrent ? 16 : 13}px "JetBrains Mono", monospace`;
      ctx.fillText(`${idx + 1}`, dx, dotsY + 1);
      ctx.restore();
    });
  }
}

// ============================================================================
// SCENE 2: PRINCIPLE 1 — ENCAPSULATION (Exposed Car Engine -> Private Shield + Public Pedals)
// ============================================================================
function renderScene2Encapsulation(
  ctx: CanvasRenderingContext2D,
  progress: number,
  totalTimeMs: number
): void {
  const cx = REEL_DIMENSIONS.width / 2;

  drawSceneSectionHeader(
    ctx,
    'المبدأ الأول',
    'التغليف — Encapsulation',
    'private car engine · public pedals',
    SARB_COLORS.stackPurple,
    segmentProgress(progress, 0.0, 0.16)
  );

  const shieldProgress = easeInOutCubic(segmentProgress(progress, 0.34, 0.56));
  const pressCycle = Math.max(0, Math.sin(segmentProgress(progress, 0.72, 0.98) * Math.PI * 2));

  // Glow transitions from danger red/amber to secure purple capsule
  if (shieldProgress < 0.75) {
    drawSoftGlow(ctx, cx, 770, 290, `rgba(255, 92, 92, ${0.14 * (1 - shieldProgress)})`);
  }
  if (shieldProgress > 0.1) {
    drawSoftGlow(ctx, cx, 770, 310, `rgba(167, 139, 250, ${0.18 * shieldProgress})`);
  }

  // Hero Car Card (y: 555 -> 975)
  const carEnter = easeOutCubic(segmentProgress(progress, 0.04, 0.22));
  if (carEnter > 0.01) {
    const capX = 120;
    const capY = 555 + (1 - carEnter) * 18;
    const capW = 840;
    const capH = 420;

    const dangerAlpha = 1 - easeInOutCubic(segmentProgress(progress, 0.34, 0.52));
    const jitterX = dangerAlpha > 0.05 ? Math.sin(totalTimeMs / 46) * 4 * dangerAlpha : 0;

    const burstT = segmentProgress(progress, 0.52, 0.82);
    drawShockwave(ctx, cx, capY + 185, burstT, 240, SARB_COLORS.stackPurple);
    drawParticleBurst(ctx, cx, capY + 185, burstT, 12, 170, SARB_COLORS.stackPurple, 73);

    ctx.save();
    ctx.globalAlpha = carEnter;
    ctx.translate(jitterX, 0);

    // Outer Chassis Container (transitions from Danger Red dashed to Purple Private Shield)
    ctx.fillStyle = shieldProgress > 0.45 ? SARB_COLORS.darkSurface : '#181414';
    ctx.strokeStyle = shieldProgress > 0.45 ? SARB_COLORS.stackPurple : SARB_COLORS.error;
    ctx.lineWidth = 3.5;
    if (shieldProgress < 0.5) {
      ctx.setLineDash([12, 8]);
    }
    drawRoundedRect(ctx, capX, capY, capW, capH, 28);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);

    // Top Status Bar inside Car Card
    if (shieldProgress < 0.5) {
      ctx.fillStyle = SARB_COLORS.error;
      drawRoundedRect(ctx, capX + 28, capY + 24, 290, 44, 14);
      ctx.fill();
      ctx.direction = 'rtl';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = SARB_COLORS.extremeBlack;
      ctx.font = '700 21px "IBM Plex Sans Arabic", sans-serif';
      ctx.fillText('خطر · محرك السيارة مكشوف', capX + 173, capY + 46);
    } else {
      ctx.fillStyle = SARB_COLORS.stackPurple;
      drawRoundedRect(ctx, capX + 28, capY + 24, 250, 44, 14);
      ctx.fill();
      ctx.direction = 'ltr';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = SARB_COLORS.extremeBlack;
      ctx.font = '700 21px "JetBrains Mono", monospace';
      ctx.fillText('private · محمي', capX + 153, capY + 46);

      ctx.direction = 'rtl';
      ctx.textAlign = 'right';
      ctx.fillStyle = SARB_COLORS.grayHint;
      ctx.font = '700 25px "IBM Plex Sans Arabic", sans-serif';
      ctx.fillText('محرك السيارة مقفول بالكبسولة', capX + capW - 28, capY + 46);
    }

    // Vector Car positioned in center-bottom of card (wheels spin when pedal is pressed)
    const carCenterY = capY + 225;
    const carStroke = shieldProgress > 0.45 ? SARB_COLORS.stackPurple : SARB_COLORS.error;
    const carAccent = pressCycle > 0.15 ? SARB_COLORS.volt : SARB_COLORS.white;
    drawVectorCar(
      ctx,
      cx - 30,
      carCenterY,
      1.26,
      carStroke,
      carAccent,
      carEnter,
      pressCycle * 10 + (shieldProgress > 0.5 ? totalTimeMs / 750 : 0),
      -pressCycle * 0.02,
      pressCycle
    );

    // Phase 1: Exposed sparking wires bursting right out of the car's front hood
    if (dangerAlpha > 0.02) {
      ctx.save();
      ctx.globalAlpha = carEnter * dangerAlpha;
      const hoodX = cx + 95;
      const hoodY = carCenterY - 22;
      const wireColors = [SARB_COLORS.error, SARB_COLORS.warning, SARB_COLORS.error];
      wireColors.forEach((col, i) => {
        const angle = -0.65 + i * 0.42;
        const tipX = hoodX + Math.cos(angle) * 115;
        const tipY = hoodY + Math.sin(angle) * 85 - 22;
        ctx.strokeStyle = col;
        ctx.lineWidth = 4.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(hoodX, hoodY);
        ctx.quadraticCurveTo(hoodX + 55, hoodY - 48 + i * 22, tipX, tipY);
        ctx.stroke();

        const sparkR = 6 + Math.sin(totalTimeMs / 55 + i * 2) * 3.5;
        ctx.fillStyle = SARB_COLORS.warning;
        ctx.beginPath();
        ctx.arc(tipX, tipY, Math.max(2.5, sparkR), 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.direction = 'rtl';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = SARB_COLORS.error;
      ctx.font = '700 28px "IBM Plex Sans Arabic", sans-serif';
      ctx.fillText('لو لمس أي شخص أسلاك المحرك مباشرة، تتدمّر السيارة!', cx, capY + 372);
      ctx.restore();
    }

    // Phase 2: Protective Padlock & Sealed Private Variables over the Car
    const capsuleEnter = easeOutCubic(segmentProgress(progress, 0.38, 0.58));
    if (capsuleEnter > 0.02) {
      const lockCloseT = easeOutBack(segmentProgress(progress, 0.46, 0.62));
      const shackleOpen = clamp01(1 - lockCloseT);
      drawVectorPadlock(
        ctx,
        cx + 225,
        carCenterY - 24,
        1.05,
        SARB_COLORS.stackPurple,
        shackleOpen,
        capsuleEnter
      );

      const vars = ['private engine', 'private fuel', 'private rpm'];
      vars.forEach((v, idx) => {
        const vw = 232;
        const vx = capX + 46 + idx * (vw + 26);
        const vy = capY + 322;
        ctx.save();
        ctx.globalAlpha = capsuleEnter;
        ctx.fillStyle = SARB_COLORS.extremeBlack;
        ctx.strokeStyle = 'rgba(167, 139, 250, 0.5)';
        ctx.lineWidth = 2;
        drawRoundedRect(ctx, vx, vy, vw, 56, 14);
        ctx.fill();
        ctx.stroke();

        ctx.direction = 'ltr';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = SARB_COLORS.stackPurple;
        ctx.font = '600 20px "JetBrains Mono", monospace';
        ctx.fillText(v, vx + vw / 2, vy + 28);
        ctx.restore();
      });
    }

    ctx.restore();
  }

  // Safe Public Controls Connected to the Car Below
  const pedalsEnter = easeOutBack(segmentProgress(progress, 0.58, 0.78));
  if (pedalsEnter > 0.01) {
    const pAlpha = easeOutCubic(segmentProgress(progress, 0.58, 0.72));
    ctx.save();
    ctx.globalAlpha = pAlpha;

    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = SARB_COLORS.volt;
    ctx.font = '700 28px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('أزرار آمنة للمستخدم فقط (public)', cx, 1042);

    const gasY = 1095 + pressCycle * 14;
    ctx.fillStyle = SARB_COLORS.darkSurface;
    ctx.strokeStyle = SARB_COLORS.volt;
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, 560, gasY, 370, 225, 26);
    ctx.fill();
    ctx.stroke();

    for (let r = 0; r < 3; r++) {
      ctx.fillStyle = pressCycle > 0.25 ? SARB_COLORS.volt : SARB_COLORS.borderStrong;
      drawRoundedRect(ctx, 640, gasY + 34 + r * 24, 210, 10, 5);
      ctx.fill();
    }

    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.fillStyle = SARB_COLORS.white;
    ctx.font = '700 32px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('دواسة البنزين', 745, gasY + 144);
    ctx.direction = 'ltr';
    ctx.fillStyle = SARB_COLORS.volt;
    ctx.font = '600 22px "JetBrains Mono", monospace';
    ctx.fillText('public accelerate()', 745, gasY + 186);

    const brakeY = 1095;
    ctx.fillStyle = SARB_COLORS.darkSurface;
    ctx.strokeStyle = SARB_COLORS.grayHint;
    ctx.lineWidth = 2.6;
    drawRoundedRect(ctx, 150, brakeY, 370, 225, 26);
    ctx.fill();
    ctx.stroke();

    for (let r = 0; r < 3; r++) {
      ctx.fillStyle = SARB_COLORS.borderStrong;
      drawRoundedRect(ctx, 230, brakeY + 34 + r * 24, 210, 10, 5);
      ctx.fill();
    }

    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.fillStyle = SARB_COLORS.white;
    ctx.font = '700 32px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('دواسة المكابح', 335, brakeY + 144);
    ctx.direction = 'ltr';
    ctx.fillStyle = SARB_COLORS.grayHint;
    ctx.font = '600 22px "JetBrains Mono", monospace';
    ctx.fillText('public brake()', 335, brakeY + 186);

    ctx.restore();
  }
}

// ============================================================================
// SCENE 3: PRINCIPLE 2 — ABSTRACTION (Car + Simple START Button vs Hidden Engine Complexity)
// ============================================================================
function renderScene3Abstraction(
  ctx: CanvasRenderingContext2D,
  progress: number,
  totalTimeMs: number
): void {
  const cx = REEL_DIMENSIONS.width / 2;

  drawSceneSectionHeader(
    ctx,
    'المبدأ الثاني',
    'التجريد — Abstraction',
    'car.start() · hidden complexity',
    SARB_COLORS.volt,
    segmentProgress(progress, 0.0, 0.16)
  );

  const engineOn = progress >= 0.34;
  const pressAmt =
    progress >= 0.25 && progress <= 0.39
      ? Math.sin(segmentProgress(progress, 0.25, 0.39) * Math.PI)
      : 0;
  const btnScale = 1 - pressAmt * 0.09;

  // Top Card: The Car itself + Single Simple START Button
  const uiEnter = easeOutCubic(segmentProgress(progress, 0.08, 0.28));
  if (uiEnter > 0.01) {
    const btnX = 275;
    const btnY = 720;

    drawSoftGlow(
      ctx,
      cx,
      715,
      280,
      engineOn ? 'rgba(212, 255, 0, 0.20)' : 'rgba(212, 255, 0, 0.09)'
    );

    const startWave = segmentProgress(progress, 0.34, 0.65);
    drawShockwave(ctx, btnX, btnY, startWave, 220, SARB_COLORS.volt);
    drawParticleBurst(ctx, btnX, btnY, startWave, 14, 165, SARB_COLORS.volt, 91);

    ctx.save();
    ctx.globalAlpha = uiEnter;

    ctx.fillStyle = SARB_COLORS.darkSurface;
    ctx.strokeStyle = engineOn ? SARB_COLORS.volt : SARB_COLORS.borderStrong;
    ctx.lineWidth = 2.6;
    drawRoundedRect(ctx, 130, 550, 820, 320, 28);
    ctx.fill();
    ctx.stroke();

    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = SARB_COLORS.grayHint;
    ctx.font = '600 26px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('لتشغيل السيارة، كل ما تراه وتضغطه هو:', cx, 594);

    // Vector Car on right half of the card (vibrates softly & lights headlights when started!)
    const engineHumY = engineOn ? Math.sin(totalTimeMs / 40) * 1.6 : 0;
    const wheelRoll = engineOn ? totalTimeMs / 240 : 0;
    drawVectorCar(
      ctx,
      675,
      728 + engineHumY,
      1.18,
      engineOn ? SARB_COLORS.volt : SARB_COLORS.grayHint,
      SARB_COLORS.volt,
      uiEnter,
      wheelRoll,
      0,
      engineOn ? 1 : 0
    );

    // Simple START Button on left half
    ctx.save();
    ctx.translate(btnX, btnY);
    ctx.scale(btnScale, btnScale);

    ctx.fillStyle = SARB_COLORS.extremeBlack;
    ctx.strokeStyle = SARB_COLORS.borderStrong;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, 84, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = engineOn ? SARB_COLORS.volt : SARB_COLORS.elevatedSurface;
    ctx.strokeStyle = SARB_COLORS.volt;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.direction = 'ltr';
    ctx.textAlign = 'center';
    ctx.fillStyle = engineOn ? SARB_COLORS.extremeBlack : SARB_COLORS.volt;
    ctx.font = '700 30px "JetBrains Mono", monospace';
    ctx.fillText('START', 0, -4);

    ctx.font = '600 16px "JetBrains Mono", monospace';
    ctx.fillText('car.start()', 0, 24);
    ctx.restore();

    if (engineOn) {
      const readyA = easeOutBack(segmentProgress(progress, 0.36, 0.52));
      ctx.save();
      ctx.globalAlpha = readyA;
      ctx.fillStyle = SARB_COLORS.success;
      ctx.direction = 'rtl';
      ctx.textAlign = 'center';
      ctx.font = '700 24px "IBM Plex Sans Arabic", sans-serif';
      ctx.fillText('✓ اشتغلت السيارة بنقرة واحدة!', cx, 836);
      ctx.restore();
    }

    ctx.restore();
  }

  // Abstraction Wall Divider
  const wallEnter = easeOutCubic(segmentProgress(progress, 0.42, 0.58));
  if (wallEnter > 0.01) {
    ctx.save();
    ctx.globalAlpha = wallEnter;
    ctx.fillStyle = SARB_COLORS.stackPurple;
    drawRoundedRect(ctx, cx - 250, 900, 500, 48, 24);
    ctx.fill();

    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = SARB_COLORS.extremeBlack;
    ctx.font = '700 22px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('ما تخفيه السيارة عنك في الخلفية (Abstraction)', cx, 924);
    ctx.restore();
  }

  // Hidden Under-the-Hood Complexity
  const engineEnter = easeOutCubic(segmentProgress(progress, 0.46, 0.66));
  if (engineEnter > 0.01) {
    const spinBase = engineOn ? totalTimeMs / 450 : 0.4;

    ctx.save();
    ctx.globalAlpha = engineEnter;

    ctx.fillStyle = '#141414';
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.45)';
    ctx.lineWidth = 2.6;
    ctx.setLineDash([12, 8]);
    drawRoundedRect(ctx, 130, 978, 820, 412, 28);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);

    drawVectorGear(ctx, 275, 1138, 62, 10, spinBase, SARB_COLORS.stackPurple, SARB_COLORS.darkSurface, 0.9);
    drawVectorGear(ctx, 378, 1208, 46, 8, -spinBase * 1.25 + 0.3, SARB_COLORS.volt, SARB_COLORS.darkSurface, 0.85);
    drawVectorGear(ctx, 250, 1258, 38, 8, spinBase * 1.4, SARB_COLORS.grayHint, SARB_COLORS.darkSurface, 0.75);

    const steps = [
      { ar: 'شمعات الاحتراق', en: 'igniteSparkPlugs()', delay: 0.52 },
      { ar: 'ضخ وتدفق الوقود', en: 'pumpFuelPressure()', delay: 0.62 },
      { ar: 'ضبط دورة المحرك', en: 'calibrateECU()', delay: 0.72 },
    ];

    steps.forEach((st, idx) => {
      const sEnter = easeOutCubic(segmentProgress(progress, st.delay, st.delay + 0.14));
      if (sEnter <= 0.01) return;
      const sy = 1022 + idx * 112;

      ctx.save();
      ctx.globalAlpha = engineEnter * sEnter;
      ctx.fillStyle = SARB_COLORS.darkSurface;
      ctx.strokeStyle = SARB_COLORS.borderStrong;
      ctx.lineWidth = 2;
      drawRoundedRect(ctx, 460, sy, 445, 88, 16);
      ctx.fill();
      ctx.stroke();

      ctx.direction = 'rtl';
      ctx.textAlign = 'right';
      ctx.fillStyle = SARB_COLORS.white;
      ctx.font = '700 26px "IBM Plex Sans Arabic", sans-serif';
      ctx.fillText(st.ar, 880, sy + 30);

      ctx.direction = 'ltr';
      ctx.textAlign = 'left';
      ctx.fillStyle = SARB_COLORS.stackPurple;
      ctx.font = '600 19px "JetBrains Mono", monospace';
      ctx.fillText(st.en, 484, sy + 64);
      ctx.restore();
    });

    ctx.restore();
  }

  const takeA = easeOutCubic(segmentProgress(progress, 0.78, 0.94));
  if (takeA > 0.01) {
    drawMixedRtlParagraph(
      ctx,
      [
        [
          { text: 'نتيجة بسيطة ', color: SARB_COLORS.volt, bold: true },
          { text: 'وآلاف التفاصيل المخفية', color: SARB_COLORS.grayHint, bold: true },
        ],
      ],
      cx,
      1445,
      48,
      33,
      takeA
    );
  }
}

// ============================================================================
// SCENE 4: PRINCIPLE 3 — INHERITANCE (Base Car -> extends -> ElectricCar + Battery/Charging)
// ============================================================================
function renderScene4Inheritance(
  ctx: CanvasRenderingContext2D,
  progress: number,
  totalTimeMs: number
): void {
  const cx = REEL_DIMENSIONS.width / 2;

  drawSceneSectionHeader(
    ctx,
    'المبدأ الثالث',
    'الوراثة — Inheritance',
    'class ElectricCar extends Car',
    SARB_COLORS.stackPurple,
    segmentProgress(progress, 0.0, 0.16)
  );

  const baseEnter = easeOutCubic(segmentProgress(progress, 0.08, 0.30));
  if (baseEnter > 0.01) {
    const cardY = 545 + (1 - baseEnter) * 18;
    ctx.save();
    ctx.globalAlpha = baseEnter;

    ctx.fillStyle = SARB_COLORS.darkSurface;
    ctx.strokeStyle = SARB_COLORS.stackPurple;
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, 115, cardY, 850, 270, 26);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = SARB_COLORS.stackPurple;
    drawRoundedRect(ctx, 140, cardY + 20, 220, 42, 12);
    ctx.fill();
    ctx.direction = 'ltr';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = SARB_COLORS.extremeBlack;
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.fillText('class Car', 250, cardY + 41);

    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.fillStyle = SARB_COLORS.white;
    ctx.font = '700 28px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('التصميم الأساسي للسيارة', 935, cardY + 41);

    drawVectorCar(ctx, 290, cardY + 165, 0.84, SARB_COLORS.stackPurple, SARB_COLORS.white, baseEnter, 0, 0, 0);

    const traits = ['محرك', 'عجلات', 'مقود'];
    traits.forEach((tr, idx) => {
      const tx = 770 - idx * 136;
      const ty = cardY + 145;
      ctx.fillStyle = SARB_COLORS.extremeBlack;
      ctx.strokeStyle = 'rgba(167, 139, 250, 0.55)';
      ctx.lineWidth = 2;
      drawRoundedRect(ctx, tx, ty, 120, 62, 14);
      ctx.fill();
      ctx.stroke();

      ctx.direction = 'rtl';
      ctx.textAlign = 'center';
      ctx.fillStyle = SARB_COLORS.white;
      ctx.font = '700 25px "IBM Plex Sans Arabic", sans-serif';
      ctx.fillText(tr, tx + 60, ty + 31);
    });

    ctx.restore();
  }

  const connT = easeOutCubic(segmentProgress(progress, 0.34, 0.54));
  if (connT > 0.01) {
    ctx.save();
    ctx.globalAlpha = connT;

    const topY = 824;
    const botY = 934;
    const currBotY = topY + (botY - topY) * connT;

    ctx.strokeStyle = SARB_COLORS.volt;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, topY);
    ctx.lineTo(cx, currBotY);
    ctx.stroke();

    const dotY = topY + ((totalTimeMs / 900) % 1) * (botY - topY);
    ctx.fillStyle = SARB_COLORS.volt;
    ctx.beginPath();
    ctx.arc(cx, dotY, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = SARB_COLORS.extremeBlack;
    ctx.strokeStyle = SARB_COLORS.volt;
    ctx.lineWidth = 2.4;
    drawRoundedRect(ctx, cx - 155, 855, 310, 46, 23);
    ctx.fill();
    ctx.stroke();

    ctx.direction = 'ltr';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = SARB_COLORS.volt;
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.fillText('extends Car · يرث الكل', cx, 878);

    ctx.restore();
  }

  const childEnter = easeOutBack(segmentProgress(progress, 0.46, 0.68));
  if (childEnter > 0.01) {
    const cardY = 955 + (1 - clamp01(childEnter)) * 20;
    const childA = easeOutCubic(segmentProgress(progress, 0.46, 0.62));
    drawSoftGlow(ctx, cx, cardY + 230, 320, `rgba(212, 255, 0, ${0.12 * childA})`);

    ctx.save();
    ctx.globalAlpha = childA;

    ctx.fillStyle = SARB_COLORS.darkSurface;
    ctx.strokeStyle = SARB_COLORS.volt;
    ctx.lineWidth = 3.5;
    drawRoundedRect(ctx, 115, cardY, 850, 445, 28);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = SARB_COLORS.volt;
    drawRoundedRect(ctx, 140, cardY + 22, 340, 44, 12);
    ctx.fill();
    ctx.direction = 'ltr';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = SARB_COLORS.extremeBlack;
    ctx.font = '700 21px "JetBrains Mono", monospace';
    ctx.fillText('ElectricCar extends Car', 310, cardY + 44);

    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.fillStyle = SARB_COLORS.white;
    ctx.font = '700 28px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('سيارة كهربائية (بدون البدء من الصفر)', 935, cardY + 44);

    drawVectorCar(
      ctx,
      290,
      cardY + 178,
      0.86,
      SARB_COLORS.volt,
      SARB_COLORS.volt,
      childA,
      totalTimeMs / 450,
      0,
      0.85
    );

    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.fillStyle = SARB_COLORS.stackPurple;
    ctx.font = '700 22px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('خصائص موروثة تلقائياً:', 930, cardY + 112);

    const inherited = ['✓ محرك', '✓ عجلات', '✓ مقود'];
    inherited.forEach((tr, idx) => {
      const tx = 800 - idx * 145;
      const ty = cardY + 138;
      ctx.fillStyle = SARB_COLORS.extremeBlack;
      ctx.strokeStyle = SARB_COLORS.stackPurple;
      ctx.lineWidth = 2;
      drawRoundedRect(ctx, tx, ty, 130, 56, 12);
      ctx.fill();
      ctx.stroke();

      ctx.direction = 'rtl';
      ctx.textAlign = 'center';
      ctx.fillStyle = SARB_COLORS.grayHint;
      ctx.font = '600 23px "IBM Plex Sans Arabic", sans-serif';
      ctx.fillText(tr, tx + 65, ty + 28);
    });

    const addT = segmentProgress(progress, 0.64, 0.90);
    if (addT > 0.01) {
      const addScale = easeOutBack(addT);
      drawParticleBurst(ctx, 540, cardY + 345, segmentProgress(progress, 0.66, 0.94), 14, 185, SARB_COLORS.volt, 55);

      ctx.direction = 'rtl';
      ctx.textAlign = 'center';
      ctx.fillStyle = SARB_COLORS.volt;
      ctx.font = '700 24px "IBM Plex Sans Arabic", sans-serif';
      ctx.fillText('نضيف فقط الإضافات الجديدة الخاصة بها:', cx, cardY + 280);

      const newItems = [
        { ar: '+ البطارية', en: 'BatteryPack', x: 565 },
        { ar: '+ منفذ الشحن', en: 'ChargingPort', x: 175 },
      ];
      newItems.forEach((item) => {
        ctx.save();
        ctx.translate(item.x + 165, cardY + 362);
        ctx.scale(addScale, addScale);
        ctx.fillStyle = SARB_COLORS.volt;
        drawRoundedRect(ctx, -165, -44, 330, 88, 18);
        ctx.fill();

        ctx.direction = 'rtl';
        ctx.textAlign = 'center';
        ctx.fillStyle = SARB_COLORS.extremeBlack;
        ctx.font = '700 28px "IBM Plex Sans Arabic", sans-serif';
        ctx.fillText(item.ar, 0, -10);

        ctx.direction = 'ltr';
        ctx.font = '600 19px "JetBrains Mono", monospace';
        ctx.fillText(item.en, 0, 22);
        ctx.restore();
      });
    }

    ctx.restore();
  }
}

// ============================================================================
// SCENE 5: PRINCIPLE 4 — POLYMORPHISM (One move() Command -> Car / Plane / Submarine)
// ============================================================================
function renderScene5Polymorphism(
  ctx: CanvasRenderingContext2D,
  progress: number,
  totalTimeMs: number
): void {
  const cx = REEL_DIMENSIONS.width / 2;

  drawSceneSectionHeader(
    ctx,
    'المبدأ الرابع',
    'تعدد الأشكال — Polymorphism',
    'one command · distinct behaviors',
    SARB_COLORS.volt,
    segmentProgress(progress, 0.0, 0.16)
  );

  const cmdT = segmentProgress(progress, 0.08, 0.30);
  if (cmdT > 0.01) {
    const cmdScale = easeOutBack(cmdT);
    const cmdY = 588;

    drawShockwave(ctx, cx, cmdY, segmentProgress(progress, 0.14, 0.44), 220, SARB_COLORS.volt);

    ctx.save();
    ctx.globalAlpha = easeOutCubic(cmdT);
    ctx.translate(cx, cmdY);
    ctx.scale(cmdScale, cmdScale);

    ctx.fillStyle = SARB_COLORS.volt;
    drawRoundedRect(ctx, -270, -44, 540, 88, 24);
    ctx.fill();

    ctx.direction = 'ltr';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = SARB_COLORS.extremeBlack;
    ctx.font = '700 28px "JetBrains Mono", monospace';
    ctx.fillText('vehicle.move()', -75, 2);

    ctx.direction = 'rtl';
    ctx.font = '700 32px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('أمر واحد: "تحرّك"', 135, 2);
    ctx.restore();
  }

  const rows = [
    {
      type: 'car' as const,
      title: 'السيارة',
      subtitle: 'تتحرك على أربع عجلات',
      code: 'Car.move()',
      accent: SARB_COLORS.stackPurple,
      delay: 0.24,
      y: 678,
    },
    {
      type: 'plane' as const,
      title: 'الطائرة',
      subtitle: 'تطير في الجو',
      code: 'Plane.move()',
      accent: SARB_COLORS.volt,
      delay: 0.42,
      y: 906,
    },
    {
      type: 'sub' as const,
      title: 'الغواصة',
      subtitle: 'تغوص في الأعماق',
      code: 'Submarine.move()',
      accent: SARB_COLORS.stackPurple,
      delay: 0.60,
      y: 1134,
    },
  ];

  rows.forEach((row) => {
    const enter = easeOutCubic(segmentProgress(progress, row.delay, row.delay + 0.18));
    if (enter <= 0.01) return;

    const cardX = 115;
    const cardW = 850;
    const cardH = 198;
    const motionT = segmentProgress(progress, row.delay + 0.05, 1.0);

    ctx.save();
    ctx.globalAlpha = enter;
    ctx.translate(0, (1 - enter) * 20);

    ctx.fillStyle = SARB_COLORS.darkSurface;
    ctx.strokeStyle = row.accent;
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, cardX, row.y, cardW, cardH, 24);
    ctx.fill();
    ctx.stroke();

    ctx.direction = 'ltr';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = row.accent;
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.fillText(row.code, cardX + cardW - 32, row.y + 44);

    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.fillStyle = SARB_COLORS.white;
    ctx.font = '700 34px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(row.title, cardX + cardW - 32, row.y + 98);

    ctx.fillStyle = SARB_COLORS.grayHint;
    ctx.font = '600 25px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(row.subtitle, cardX + cardW - 32, row.y + 148);

    const viewCx = 315;
    const viewCy = row.y + 102;
    ctx.save();
    ctx.beginPath();
    drawRoundedRect(ctx, cardX + 22, row.y + 20, 380, cardH - 40, 18);
    ctx.fillStyle = SARB_COLORS.extremeBlack;
    ctx.fill();
    ctx.clip();

    if (row.type === 'car') {
      const carX = viewCx - 55 + easeOutCubic(motionT) * 110;
      drawVectorCar(
        ctx,
        carX,
        viewCy + 6,
        0.74,
        row.accent,
        SARB_COLORS.volt,
        enter,
        totalTimeMs / 120,
        0,
        0.55
      );
    } else if (row.type === 'plane') {
      const fly = easeOutCubic(motionT);
      const px = viewCx - 60 + fly * 120;
      const py = viewCy + 22 - fly * 40 + Math.sin(totalTimeMs / 240) * 4;
      for (let d = 1; d <= 4; d++) {
        ctx.fillStyle = SARB_COLORS.volt;
        ctx.globalAlpha = enter * (0.6 - d * 0.12);
        ctx.beginPath();
        ctx.arc(px - 68 - d * 24, py + 8 + d * 6, 4.5 - d * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = enter;
      drawVectorPlane(ctx, px, py, 0.85, row.accent, SARB_COLORS.white, -0.18, enter);
    } else {
      const dive = easeOutCubic(motionT);
      const sx = viewCx - 50 + dive * 100;
      const sy = viewCy - 18 + dive * 34 + Math.sin(totalTimeMs / 320) * 5;
      for (let b = 0; b < 4; b++) {
        const bCycle = (totalTimeMs / 700 + b * 0.25) % 1;
        ctx.strokeStyle = SARB_COLORS.stackPurple;
        ctx.lineWidth = 2;
        ctx.globalAlpha = enter * (1 - bCycle) * 0.7;
        ctx.beginPath();
        ctx.arc(sx - 75 - b * 14, sy - bCycle * 44, 4 + (b % 2) * 2, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = enter;
      drawVectorSubmarine(ctx, sx, sy, 0.86, row.accent, SARB_COLORS.volt, totalTimeMs / 80, enter);
    }

    ctx.restore();
    ctx.restore();
  });

  const botA = easeOutCubic(segmentProgress(progress, 0.78, 0.94));
  if (botA > 0.01) {
    drawMixedRtlParagraph(
      ctx,
      [
        [
          { text: 'نفس الأمر والاستدعاء ', color: SARB_COLORS.volt, bold: true },
          { text: '← تنفيذ خاص لكل كائن', color: SARB_COLORS.white, bold: true },
        ],
      ],
      cx,
      1410,
      46,
      32,
      botA
    );
  }
}

function drawPlatformIcon(
  ctx: CanvasRenderingContext2D,
  platform: 'facebook' | 'telegram' | 'linkedin' | 'x',
  cx: number,
  cy: number,
  scale = 1
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  if (platform === 'facebook') {
    ctx.fillStyle = SARB_COLORS.white;
    ctx.font = '700 34px "IBM Plex Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('f', 0, 2);
  } else if (platform === 'telegram') {
    // Crisp paper-plane icon
    ctx.strokeStyle = SARB_COLORS.white;
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(14, -12);
    ctx.lineTo(-15, -1);
    ctx.lineTo(-4, 3);
    ctx.lineTo(14, -12);
    ctx.moveTo(-4, 3);
    ctx.lineTo(2, 13);
    ctx.lineTo(14, -12);
    ctx.moveTo(-4, 3);
    ctx.lineTo(-4, 11);
    ctx.lineTo(1, 6);
    ctx.stroke();
  } else if (platform === 'linkedin') {
    ctx.fillStyle = SARB_COLORS.white;
    ctx.font = '700 26px "IBM Plex Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('in', 0, 1);
  } else {
    // Crisp X mark
    ctx.strokeStyle = SARB_COLORS.white;
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-11, -11);
    ctx.lineTo(11, 11);
    ctx.moveTo(11, -11);
    ctx.lineTo(-11, 11);
    ctx.stroke();
  }

  ctx.restore();
}

// ============================================================================
// SCENE 6: CLEAN OUTRO — OOP TAKEAWAY -> MASCOT -> SARB LOGO -> CIRCULAR PLATFORMS
// ============================================================================
function renderScene6OopOutro(
  ctx: CanvasRenderingContext2D,
  progress: number,
  images: LoadedBrandImages
): void {
  const cx = REEL_DIMENSIONS.width / 2;

  // Phase A (0.0 -> 0.36): 4 OOP Principles takeaway (fades before centered Outro)
  const part1Fade = 1 - easeInOutCubic(segmentProgress(progress, 0.28, 0.38));
  if (part1Fade > 0.01) {
    ctx.save();
    ctx.globalAlpha = part1Fade;

    const pills = [
      { label: 'Encapsulation', color: SARB_COLORS.stackPurple },
      { label: 'Abstraction', color: SARB_COLORS.volt },
      { label: 'Inheritance', color: SARB_COLORS.stackPurple },
      { label: 'Polymorphism', color: SARB_COLORS.volt },
    ];
    pills.forEach((p, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const px = cx - 235 + col * 245;
      const py = 545 + row * 68;
      ctx.fillStyle = SARB_COLORS.darkSurface;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2.4;
      drawRoundedRect(ctx, px, py, 225, 50, 25);
      ctx.fill();
      ctx.stroke();

      ctx.direction = 'ltr';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = p.color;
      ctx.font = '600 20px "JetBrains Mono", monospace';
      ctx.fillText(p.label, px + 112.5, py + 25);
    });

    drawStatusIcon(ctx, 'success', cx, 755, 48, SARB_COLORS.success, 1);
    drawMixedRtlParagraph(
      ctx,
      [
        [{ text: 'أربعة مبادئ تحوّل الكود العشوائي', color: SARB_COLORS.white, bold: true }],
        [{ text: 'إلى نظام قوي وقابل للتوسع.', color: SARB_COLORS.volt, bold: true }],
      ],
      cx,
      890,
      78,
      48,
      1
    );
    ctx.restore();
  }

  renderSharedOutroPhaseB(ctx, progress, images);
}

function renderSharedOutroPhaseB(
  ctx: CanvasRenderingContext2D,
  progress: number,
  images: LoadedBrandImages
): void {
  const cx = REEL_DIMENSIONS.width / 2;

  // Phase B (0.36 -> 1.0): Clean balanced hierarchy (zero glow/shockwave/particles)
  // 1) Cartoon Mascot
  // 2) Sarb Logo below it
  // 3) Compact circular platforms row aligned to logo width
  const phaseAlpha = easeOutCubic(segmentProgress(progress, 0.36, 0.54));
  if (phaseAlpha <= 0.01) return;

  // 1. Cartoon Mascot
  const mascotY = 675 + (1 - phaseAlpha) * 12;
  drawMascotMedallion(ctx, images.mascot, cx, mascotY, 100, phaseAlpha, 1, 0);

  // 2. Sarb Logo underneath the mascot
  const logoAlpha = easeOutCubic(segmentProgress(progress, 0.44, 0.62));
  const logoY = 915 + (1 - logoAlpha) * 12;
  if (logoAlpha > 0.01) {
    ctx.save();
    ctx.globalAlpha = logoAlpha;
    if (images.logoOnDark && images.logoOnDark.naturalWidth > 0) {
      const aspect = images.logoOnDark.naturalHeight / images.logoOnDark.naturalWidth;
      const targetW = 400;
      const targetH = targetW * aspect;
      ctx.drawImage(images.logoOnDark, cx - targetW / 2, logoY - targetH / 2, targetW, targetH);
    } else {
      ctx.direction = 'ltr';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = SARB_COLORS.white;
      ctx.font = '700 44px "IBM Plex Sans", sans-serif';
      ctx.fillText('Sarb Academy', cx, logoY);
    }
    ctx.restore();
  }

  // 3. Our Platforms (منصاتنا: دوائر متوازنة الحجم بجانب بعض)
  const platAlpha = easeOutCubic(segmentProgress(progress, 0.54, 0.72));
  if (platAlpha > 0.01) {
    ctx.save();
    ctx.globalAlpha = platAlpha;

    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = SARB_COLORS.volt;
    ctx.font = '700 26px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('منصاتنا', cx, 1060 + (1 - platAlpha) * 10);

    const platforms: Array<{
      id: 'facebook' | 'telegram' | 'linkedin' | 'x';
      label: string;
      latin?: boolean;
    }> = [
      { id: 'facebook', label: 'فيسبوك' },
      { id: 'telegram', label: 'تليجرام' },
      { id: 'linkedin', label: 'لينكد إن' },
      { id: 'x', label: 'X', latin: true },
    ];

    const circleRadius = 36;
    const stepX = 132;
    const rowY = 1135 + (1 - platAlpha) * 10;
    const startX = cx + ((platforms.length - 1) * stepX) / 2; // RTL: right-to-left

    platforms.forEach((p, idx) => {
      const px = startX - idx * stepX;

      ctx.fillStyle = SARB_COLORS.darkSurface;
      ctx.strokeStyle = SARB_COLORS.borderStrong;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, rowY, circleRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      drawPlatformIcon(ctx, p.id, px, rowY, 0.88);

      // Platform label centered underneath circle
      ctx.fillStyle = SARB_COLORS.grayHint;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (p.latin) {
        ctx.direction = 'ltr';
        ctx.font = '600 21px "IBM Plex Sans", sans-serif';
      } else {
        ctx.direction = 'rtl';
        ctx.font = '600 20px "IBM Plex Sans Arabic", sans-serif';
      }
      ctx.fillText(p.label, px, rowY + circleRadius + 24);
    });

    ctx.restore();
  }
}
