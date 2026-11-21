import {
  REEL_DIMENSIONS,
  SARB_COLORS,
  type BlueprintItem,
  type SceneVisualBlueprint,
  type ScheduledScene,
} from '../data/lessonStoryboard';
import {
  drawMascotMedallion,
  drawParticleBurst,
  drawRoundedRect,
  drawShockwave,
  drawSoftGlow,
  drawStatusIcon,
  easeInOutCubic,
  easeOutBack,
  easeOutCubic,
  segmentProgress,
  type LoadedBrandImages,
} from './canvasPrimitives';

function resolveToneColor(tone?: BlueprintItem['tone'], fallbackIndex = 0): string {
  if (tone === 'purple') return SARB_COLORS.stackPurple;
  if (tone === 'volt') return SARB_COLORS.volt;
  if (tone === 'success') return SARB_COLORS.success;
  if (tone === 'error') return SARB_COLORS.error;
  return fallbackIndex % 2 === 0 ? SARB_COLORS.volt : SARB_COLORS.stackPurple;
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 3
): string[] {
  const clean = text.trim();
  if (!clean) return [];
  const words = clean.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines - 1) {
        break;
      }
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines.slice(0, maxLines);
}

function drawWrappedCenteredText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
  font: string,
  color: string,
  maxLines = 2,
  dir: 'rtl' | 'ltr' = 'rtl'
): void {
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.direction = dir;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = wrapLines(ctx, text, maxWidth, maxLines);
  const offset = ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, cx, startY - offset + i * lineHeight);
  });
  ctx.restore();
}

function drawWrappedRightText(
  ctx: CanvasRenderingContext2D,
  text: string,
  rightX: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
  font: string,
  color: string,
  maxLines = 2
): void {
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const lines = wrapLines(ctx, text, maxWidth, maxLines);
  lines.forEach((line, i) => {
    ctx.fillText(line, rightX, startY + i * lineHeight);
  });
  ctx.restore();
}

function drawDynamicSectionHeader(
  ctx: CanvasRenderingContext2D,
  bp: SceneVisualBlueprint,
  enterProgress: number
): void {
  const cx = REEL_DIMENSIONS.width / 2;
  const accent = bp.accentColor === 'purple' ? SARB_COLORS.stackPurple : SARB_COLORS.volt;
  const p = easeOutCubic(enterProgress);
  if (p <= 0.01) return;

  ctx.save();
  ctx.globalAlpha = p;
  ctx.translate(0, (1 - p) * 20);

  ctx.font = '700 22px "IBM Plex Sans Arabic", sans-serif';
  const pillW = Math.min(440, Math.max(220, ctx.measureText(bp.sectionKicker).width + 64));
  const pillH = 42;
  ctx.fillStyle = accent;
  drawRoundedRect(ctx, cx - pillW / 2, 362, pillW, pillH, 21);
  ctx.fill();

  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = SARB_COLORS.extremeBlack;
  ctx.font = '700 22px "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText(bp.sectionKicker, cx, 383);

  drawWrappedCenteredText(
    ctx,
    bp.headline,
    cx,
    444,
    880,
    46,
    '700 40px "IBM Plex Sans Arabic", sans-serif',
    SARB_COLORS.white,
    2,
    'rtl'
  );

  ctx.direction = 'ltr';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = accent;
  ctx.font = '600 22px "JetBrains Mono", monospace';
  ctx.fillText(bp.subheadline, cx, 502);

  ctx.restore();
}

// ============================================================================
// 1. HOOK CARDS (Opening scene with Sarb Mascot + Kinetic Headline + 2-4 Cards)
// ============================================================================
function renderHookCards(
  ctx: CanvasRenderingContext2D,
  bp: SceneVisualBlueprint,
  progress: number,
  totalTimeMs: number,
  images: LoadedBrandImages
): void {
  const cx = REEL_DIMENSIONS.width / 2;
  const accent = bp.accentColor === 'purple' ? SARB_COLORS.stackPurple : SARB_COLORS.volt;

  const mascotP = easeOutBack(segmentProgress(progress, 0.0, 0.28));
  const burstP = segmentProgress(progress, 0.05, 0.45);
  const floatY = Math.sin(totalTimeMs / 460) * 6;

  drawSoftGlow(ctx, cx, 495 + floatY, 270, 'rgba(212, 255, 0, 0.16)');
  drawShockwave(ctx, cx, 495 + floatY, burstP, 260, accent);
  drawParticleBurst(ctx, cx, 495 + floatY, burstP, 16, 200, accent, 14);
  drawMascotMedallion(
    ctx,
    images.mascot,
    cx,
    495 + floatY,
    92,
    clampAlpha(mascotP),
    0.85 + 0.15 * mascotP,
    Math.sin(totalTimeMs / 750) * 0.04,
    '!'
  );

  const headA = easeOutCubic(segmentProgress(progress, 0.12, 0.34));
  if (headA > 0.01) {
    ctx.save();
    ctx.globalAlpha = headA;
    ctx.translate(0, (1 - headA) * 18);

    ctx.font = '700 22px "IBM Plex Sans Arabic", sans-serif';
    const kW = Math.min(440, Math.max(210, ctx.measureText(bp.sectionKicker).width + 58));
    ctx.fillStyle = accent;
    drawRoundedRect(ctx, cx - kW / 2, 628, kW, 42, 21);
    ctx.fill();

    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = SARB_COLORS.extremeBlack;
    ctx.font = '700 22px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(bp.sectionKicker, cx, 649);

    drawWrappedCenteredText(
      ctx,
      bp.headline,
      cx,
      746,
      880,
      58,
      '700 46px "IBM Plex Sans Arabic", sans-serif',
      SARB_COLORS.white,
      2,
      'rtl'
    );

    ctx.direction = 'ltr';
    ctx.fillStyle = accent;
    ctx.font = '600 22px "JetBrains Mono", monospace';
    ctx.fillText(bp.subheadline, cx, 830);
    ctx.restore();
  }

  const items = (bp.items ?? []).slice(0, 4);
  const cols = items.length <= 2 ? 1 : 2;
  items.forEach((item, idx) => {
    const start = 0.3 + idx * 0.12;
    const p = easeOutBack(segmentProgress(progress, start, start + 0.18));
    if (p <= 0.01) return;

    const color = resolveToneColor(item.tone, idx);
    const cardW = cols === 1 ? 820 : 400;
    const cardH = cols === 1 ? 128 : 154;
    const col = cols === 1 ? 0 : idx % 2;
    const row = cols === 1 ? idx : Math.floor(idx / 2);
    const x = cols === 1 ? cx - cardW / 2 : col === 0 ? cx + 16 : cx - 16 - cardW;
    const y = 900 + row * (cardH + 22);

    ctx.save();
    ctx.globalAlpha = clampAlpha(p);
    ctx.translate(x + cardW / 2, y + cardH / 2);
    ctx.scale(0.92 + 0.08 * p, 0.92 + 0.08 * p);
    ctx.translate(-(x + cardW / 2), -(y + cardH / 2));

    ctx.fillStyle = SARB_COLORS.darkSurface;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.6;
    drawRoundedRect(ctx, x, y, cardW, cardH, 22);
    ctx.fill();
    ctx.stroke();

    // Accent strip
    ctx.fillStyle = color;
    drawRoundedRect(ctx, x + cardW - 14, y + 24, 6, cardH - 48, 3);
    ctx.fill();

    drawWrappedCenteredText(
      ctx,
      item.label,
      x + cardW / 2,
      y + (item.tag ? cardH * 0.38 : cardH * 0.5),
      cardW - 56,
      36,
      '700 28px "IBM Plex Sans Arabic", sans-serif',
      SARB_COLORS.white,
      2,
      'rtl'
    );

    if (item.tag) {
      ctx.direction = 'ltr';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.font = '600 20px "JetBrains Mono", monospace';
      ctx.fillText(item.tag, x + cardW / 2, y + cardH * 0.74);
    }

    ctx.restore();
  });

  if (bp.takeaway) {
    const footA = easeOutCubic(segmentProgress(progress, 0.75, 0.94));
    if (footA > 0.01) {
      ctx.save();
      ctx.globalAlpha = footA;
      drawWrappedCenteredText(
        ctx,
        bp.takeaway,
        cx,
        1360,
        860,
        42,
        '700 32px "IBM Plex Sans Arabic", sans-serif',
        SARB_COLORS.volt,
        2,
        'rtl'
      );
      ctx.restore();
    }
  }
}

// ============================================================================
// 2. CODE CONCEPT (Terminal Card + Highlighted Key Points)
// ============================================================================
function renderCodeConcept(
  ctx: CanvasRenderingContext2D,
  bp: SceneVisualBlueprint,
  progress: number,
  totalTimeMs: number
): void {
  const cx = REEL_DIMENSIONS.width / 2;
  drawDynamicSectionHeader(ctx, bp, segmentProgress(progress, 0.0, 0.16));

  const termP = easeOutCubic(segmentProgress(progress, 0.12, 0.34));
  if (termP > 0.01) {
    const boxX = 110;
    const boxY = 580 + (1 - termP) * 26;
    const boxW = 860;
    const lines = (bp.codeLines && bp.codeLines.length > 0
      ? bp.codeLines
      : ['// sarb-academy.ts', 'const cleanSystem = buildModular();']
    ).slice(0, 4);
    const boxH = 120 + lines.length * 56;

    drawSoftGlow(ctx, cx, boxY + boxH / 2, 300, 'rgba(212, 255, 0, 0.1)');

    ctx.save();
    ctx.globalAlpha = termP;
    ctx.fillStyle = '#151515';
    ctx.strokeStyle = SARB_COLORS.volt;
    ctx.lineWidth = 2.6;
    drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 24);
    ctx.fill();
    ctx.stroke();

    // Header strip
    ctx.fillStyle = SARB_COLORS.darkSurface;
    drawRoundedRect(ctx, boxX + 2, boxY + 2, boxW - 4, 54, 22);
    ctx.fill();

    // Window dots
    const dotColors = [SARB_COLORS.error, SARB_COLORS.warning, SARB_COLORS.success];
    dotColors.forEach((dc, idx) => {
      ctx.fillStyle = dc;
      ctx.beginPath();
      ctx.arc(boxX + 36 + idx * 24, boxY + 29, 7, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.direction = 'ltr';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = SARB_COLORS.grayMuted;
    ctx.font = '600 20px "JetBrains Mono", monospace';
    ctx.fillText(bp.codeTitle || 'lesson.ts', boxX + boxW - 28, boxY + 29);

    lines.forEach((line, idx) => {
      const lP = easeOutCubic(segmentProgress(progress, 0.24 + idx * 0.11, 0.42 + idx * 0.11));
      if (lP <= 0.01) return;
      ctx.save();
      ctx.globalAlpha = termP * lP;
      ctx.direction = 'ltr';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = idx === lines.length - 1 ? SARB_COLORS.volt : SARB_COLORS.white;
      ctx.font = '600 25px "JetBrains Mono", monospace';
      ctx.fillText(line, boxX + 34, boxY + 98 + idx * 54);
      ctx.restore();
    });

    // Animated cursor pulse
    if (Math.sin(totalTimeMs / 240) > 0) {
      ctx.fillStyle = SARB_COLORS.volt;
      ctx.fillRect(boxX + 34, boxY + 98 + lines.length * 54 - 16, 12, 24);
    }

    ctx.restore();
  }

  const items = (bp.items ?? []).slice(0, 3);
  items.forEach((item, idx) => {
    const start = 0.45 + idx * 0.13;
    const p = easeOutCubic(segmentProgress(progress, start, start + 0.18));
    if (p <= 0.01) return;
    const color = resolveToneColor(item.tone, idx);
    const y = 985 + idx * 116;

    ctx.save();
    ctx.globalAlpha = p;
    ctx.translate((1 - p) * 24, 0);
    ctx.fillStyle = SARB_COLORS.darkSurface;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.2;
    drawRoundedRect(ctx, 110, y, 860, 96, 20);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(926, y + 48, 12, 0, Math.PI * 2);
    ctx.fill();

    drawWrappedRightText(
      ctx,
      item.label,
      892,
      item.tag ? y + 34 : y + 48,
      740,
      32,
      '700 26px "IBM Plex Sans Arabic", sans-serif',
      SARB_COLORS.white,
      1
    );

    if (item.tag) {
      ctx.direction = 'ltr';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.font = '600 19px "JetBrains Mono", monospace';
      ctx.fillText(item.tag, 892, y + 70);
    }
    ctx.restore();
  });

  if (bp.takeaway) {
    const tA = easeOutCubic(segmentProgress(progress, 0.78, 0.94));
    if (tA > 0.01) {
      ctx.save();
      ctx.globalAlpha = tA;
      drawWrappedCenteredText(
        ctx,
        bp.takeaway,
        cx,
        1420,
        860,
        42,
        '700 32px "IBM Plex Sans Arabic", sans-serif',
        SARB_COLORS.volt,
        2,
        'rtl'
      );
      ctx.restore();
    }
  }
}

// ============================================================================
// 3. SPLIT COMPARISON (Purple vs Volt Cards)
// ============================================================================
function renderSplitComparison(
  ctx: CanvasRenderingContext2D,
  bp: SceneVisualBlueprint,
  progress: number
): void {
  const cx = REEL_DIMENSIONS.width / 2;
  drawDynamicSectionHeader(ctx, bp, segmentProgress(progress, 0.0, 0.16));

  const leftP = easeOutCubic(segmentProgress(progress, 0.14, 0.36));
  const rightP = easeOutCubic(segmentProgress(progress, 0.36, 0.58));

  const topTitle = bp.leftTitle || 'الطريقة التقليدية / المحدودة';
  const topItems = (bp.leftItems && bp.leftItems.length > 0 ? bp.leftItems : ['تعقيد أعلى', 'صعوبة الصيانة']).slice(0, 3);
  const botTitle = bp.rightTitle || 'الحل المنظّم / الأفضل';
  const botItems = (bp.rightItems && bp.rightItems.length > 0 ? bp.rightItems : ['أداء أسرع', 'وضوح وتوسّع']).slice(0, 3);

  // Top Card (Purple)
  if (leftP > 0.01) {
    const cardY = 580 + (1 - leftP) * 20;
    ctx.save();
    ctx.globalAlpha = leftP;
    ctx.fillStyle = '#16141F';
    ctx.strokeStyle = SARB_COLORS.stackPurple;
    ctx.lineWidth = 2.8;
    drawRoundedRect(ctx, 110, cardY, 860, 345, 26);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = SARB_COLORS.stackPurple;
    drawRoundedRect(ctx, 145, cardY + 26, 790, 52, 16);
    ctx.fill();

    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = SARB_COLORS.extremeBlack;
    ctx.font = '700 26px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(topTitle, cx, cardY + 52);

    topItems.forEach((line, idx) => {
      const rowY = cardY + 128 + idx * 72;
      ctx.fillStyle = SARB_COLORS.darkSurface;
      drawRoundedRect(ctx, 155, rowY - 26, 770, 54, 14);
      ctx.fill();

      ctx.fillStyle = SARB_COLORS.stackPurple;
      ctx.beginPath();
      ctx.arc(892, rowY, 8, 0, Math.PI * 2);
      ctx.fill();

      drawWrappedRightText(
        ctx,
        line,
        866,
        rowY,
        690,
        30,
        '600 25px "IBM Plex Sans Arabic", sans-serif',
        SARB_COLORS.white,
        1
      );
    });
    ctx.restore();
  }

  // VS divider badge
  const vsP = easeOutBack(segmentProgress(progress, 0.3, 0.48));
  if (vsP > 0.01) {
    ctx.save();
    ctx.globalAlpha = clampAlpha(vsP);
    ctx.translate(cx, 960);
    ctx.scale(vsP, vsP);
    ctx.fillStyle = SARB_COLORS.extremeBlack;
    ctx.strokeStyle = SARB_COLORS.borderStrong;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.direction = 'ltr';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = SARB_COLORS.volt;
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.fillText('VS', 0, 1);
    ctx.restore();
  }

  // Bottom Card (Volt)
  if (rightP > 0.01) {
    const cardY = 1005 + (1 - rightP) * 20;
    drawSoftGlow(ctx, cx, cardY + 170, 260, 'rgba(212, 255, 0, 0.1)');

    ctx.save();
    ctx.globalAlpha = rightP;
    ctx.fillStyle = SARB_COLORS.darkSurface;
    ctx.strokeStyle = SARB_COLORS.volt;
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, 110, cardY, 860, 345, 26);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = SARB_COLORS.volt;
    drawRoundedRect(ctx, 145, cardY + 26, 790, 52, 16);
    ctx.fill();

    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = SARB_COLORS.extremeBlack;
    ctx.font = '700 26px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(botTitle, cx, cardY + 52);

    botItems.forEach((line, idx) => {
      const rowY = cardY + 128 + idx * 72;
      ctx.fillStyle = '#141414';
      drawRoundedRect(ctx, 155, rowY - 26, 770, 54, 14);
      ctx.fill();

      ctx.fillStyle = SARB_COLORS.volt;
      ctx.beginPath();
      ctx.arc(892, rowY, 8, 0, Math.PI * 2);
      ctx.fill();

      drawWrappedRightText(
        ctx,
        line,
        866,
        rowY,
        690,
        30,
        '600 25px "IBM Plex Sans Arabic", sans-serif',
        SARB_COLORS.white,
        1
      );
    });
    ctx.restore();
  }

  if (bp.takeaway) {
    const tA = easeOutCubic(segmentProgress(progress, 0.76, 0.94));
    if (tA > 0.01) {
      ctx.save();
      ctx.globalAlpha = tA;
      drawWrappedCenteredText(
        ctx,
        bp.takeaway,
        cx,
        1425,
        860,
        42,
        '700 32px "IBM Plex Sans Arabic", sans-serif',
        SARB_COLORS.volt,
        2,
        'rtl'
      );
      ctx.restore();
    }
  }
}

// ============================================================================
// 4. FLOW PIPELINE (Animated Vertical Connected Stages)
// ============================================================================
function renderFlowPipeline(
  ctx: CanvasRenderingContext2D,
  bp: SceneVisualBlueprint,
  progress: number,
  totalTimeMs: number
): void {
  const cx = REEL_DIMENSIONS.width / 2;
  drawDynamicSectionHeader(ctx, bp, segmentProgress(progress, 0.0, 0.16));

  const steps = (bp.items && bp.items.length > 0
    ? bp.items
    : [
        { label: 'استقبال المدخلات', tag: '01 · INPUT', tone: 'purple' as const },
        { label: 'المعالجة والتنفيذ', tag: '02 · PROCESS', tone: 'volt' as const },
        { label: 'إرجاع النتيجة النهائية', tag: '03 · OUTPUT', tone: 'success' as const },
      ]
  ).slice(0, 4);

  const count = steps.length;
  const startY = 585;
  const cardH = count <= 3 ? 180 : 148;
  const gap = count <= 3 ? 72 : 44;

  // Draw animated connecting pipeline line behind cards
  const lineEndY = startY + (count - 1) * (cardH + gap) + cardH / 2;
  const lineProgress = easeInOutCubic(segmentProgress(progress, 0.18, 0.72));
  const currentEndY = startY + cardH / 2 + (lineEndY - (startY + cardH / 2)) * lineProgress;

  ctx.save();
  ctx.strokeStyle = SARB_COLORS.volt;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx, startY + cardH / 2);
  ctx.lineTo(cx, currentEndY);
  ctx.stroke();

  // Animated traveling pulse dot along pipeline
  if (lineProgress > 0.2) {
    const pulseT = (totalTimeMs % 1500) / 1500;
    const pulseY = startY + cardH / 2 + (currentEndY - (startY + cardH / 2)) * pulseT;
    drawSoftGlow(ctx, cx, pulseY, 34, 'rgba(212, 255, 0, 0.45)');
    ctx.fillStyle = SARB_COLORS.volt;
    ctx.beginPath();
    ctx.arc(cx, pulseY, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  steps.forEach((step, idx) => {
    const sStart = 0.14 + idx * 0.16;
    const p = easeOutBack(segmentProgress(progress, sStart, sStart + 0.2));
    if (p <= 0.01) return;

    const color = resolveToneColor(step.tone, idx);
    const y = startY + idx * (cardH + gap);

    ctx.save();
    ctx.globalAlpha = clampAlpha(p);
    ctx.translate(cx, y + cardH / 2);
    ctx.scale(0.94 + 0.06 * p, 0.94 + 0.06 * p);
    ctx.translate(-cx, -(y + cardH / 2));

    ctx.fillStyle = SARB_COLORS.darkSurface;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.8;
    drawRoundedRect(ctx, 130, y, 820, cardH, 24);
    ctx.fill();
    ctx.stroke();

    // Step circle badge
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(888, y + cardH / 2, 28, 0, Math.PI * 2);
    ctx.fill();

    ctx.direction = 'ltr';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = SARB_COLORS.extremeBlack;
    ctx.font = '700 24px "JetBrains Mono", monospace';
    ctx.fillText(`0${idx + 1}`, 888, y + cardH / 2 + 1);

    drawWrappedRightText(
      ctx,
      step.label,
      836,
      step.tag ? y + cardH * 0.38 : y + cardH * 0.5,
      640,
      36,
      '700 30px "IBM Plex Sans Arabic", sans-serif',
      SARB_COLORS.white,
      2
    );

    if (step.tag) {
      ctx.direction = 'ltr';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.font = '600 20px "JetBrains Mono", monospace';
      ctx.fillText(step.tag, 836, y + cardH * 0.74);
    }

    ctx.restore();
  });

  if (bp.takeaway) {
    const tA = easeOutCubic(segmentProgress(progress, 0.78, 0.94));
    if (tA > 0.01) {
      ctx.save();
      ctx.globalAlpha = tA;
      drawWrappedCenteredText(
        ctx,
        bp.takeaway,
        cx,
        1425,
        860,
        42,
        '700 32px "IBM Plex Sans Arabic", sans-serif',
        SARB_COLORS.volt,
        2,
        'rtl'
      );
      ctx.restore();
    }
  }
}

// ============================================================================
// 5. LAYERED CAPSULE (Protected Purple Core + Volt Public Controls)
// ============================================================================
function renderLayeredCapsule(
  ctx: CanvasRenderingContext2D,
  bp: SceneVisualBlueprint,
  progress: number
): void {
  const cx = REEL_DIMENSIONS.width / 2;
  drawDynamicSectionHeader(ctx, bp, segmentProgress(progress, 0.0, 0.16));

  const coreTitle = bp.leftTitle || 'النواة الداخلية المحمية (Private)';
  const coreItems = (bp.leftItems && bp.leftItems.length > 0 ? bp.leftItems : ['البيانات الحساسة', 'التفاصيل الداخلية']).slice(0, 3);
  const pubTitle = bp.rightTitle || 'الواجهة العامة الآمنة (Public)';
  const pubItems = (bp.rightItems && bp.rightItems.length > 0 ? bp.rightItems : ['نقطة تفاعل بسيطة', 'تنفيذ آمن ومباشر']).slice(0, 2);

  const coreP = easeOutCubic(segmentProgress(progress, 0.14, 0.42));
  if (coreP > 0.01) {
    drawSoftGlow(ctx, cx, 775, 290, 'rgba(167, 139, 250, 0.14)');
    ctx.save();
    ctx.globalAlpha = coreP;

    // Outer dashed boundary shield
    ctx.fillStyle = '#151220';
    ctx.strokeStyle = SARB_COLORS.stackPurple;
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 8]);
    drawRoundedRect(ctx, 120, 575, 840, 385, 32);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = SARB_COLORS.stackPurple;
    drawRoundedRect(ctx, cx - 230, 550, 460, 48, 24);
    ctx.fill();

    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = SARB_COLORS.extremeBlack;
    ctx.font = '700 23px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(coreTitle, cx, 574);

    coreItems.forEach((item, idx) => {
      const itemP = easeOutCubic(segmentProgress(progress, 0.26 + idx * 0.1, 0.46 + idx * 0.1));
      if (itemP <= 0.01) return;
      const ry = 655 + idx * 96;
      ctx.save();
      ctx.globalAlpha = coreP * itemP;
      ctx.fillStyle = SARB_COLORS.darkSurface;
      ctx.strokeStyle = 'rgba(167, 139, 250, 0.45)';
      ctx.lineWidth = 2;
      drawRoundedRect(ctx, 170, ry, 740, 74, 18);
      ctx.fill();
      ctx.stroke();

      drawWrappedCenteredText(
        ctx,
        item,
        cx,
        ry + 37,
        660,
        30,
        '600 26px "IBM Plex Sans Arabic", sans-serif',
        SARB_COLORS.white,
        1,
        'rtl'
      );
      ctx.restore();
    });

    ctx.restore();
  }

  const pubP = easeOutBack(segmentProgress(progress, 0.48, 0.72));
  if (pubP > 0.01) {
    ctx.save();
    ctx.globalAlpha = clampAlpha(pubP);

    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = SARB_COLORS.volt;
    ctx.font = '700 26px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(pubTitle, cx, 1020);

    const cardCount = pubItems.length;
    const cardW = cardCount === 1 ? 760 : 385;
    pubItems.forEach((pItem, idx) => {
      const px = cardCount === 1 ? cx - cardW / 2 : idx === 0 ? cx + 16 : cx - 16 - cardW;
      const py = 1070;

      ctx.fillStyle = SARB_COLORS.darkSurface;
      ctx.strokeStyle = SARB_COLORS.volt;
      ctx.lineWidth = 3;
      drawRoundedRect(ctx, px, py, cardW, 210, 24);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = SARB_COLORS.volt;
      drawRoundedRect(ctx, px + 40, py + 32, cardW - 80, 12, 6);
      ctx.fill();

      drawWrappedCenteredText(
        ctx,
        pItem,
        px + cardW / 2,
        py + 126,
        cardW - 48,
        36,
        '700 28px "IBM Plex Sans Arabic", sans-serif',
        SARB_COLORS.white,
        2,
        'rtl'
      );
    });

    ctx.restore();
  }

  if (bp.takeaway) {
    const tA = easeOutCubic(segmentProgress(progress, 0.78, 0.94));
    if (tA > 0.01) {
      ctx.save();
      ctx.globalAlpha = tA;
      drawWrappedCenteredText(
        ctx,
        bp.takeaway,
        cx,
        1390,
        860,
        42,
        '700 32px "IBM Plex Sans Arabic", sans-serif',
        SARB_COLORS.volt,
        2,
        'rtl'
      );
      ctx.restore();
    }
  }
}

// ============================================================================
// 6. TREE HIERARCHY (Parent Node Branching to Children)
// ============================================================================
function renderTreeHierarchy(
  ctx: CanvasRenderingContext2D,
  bp: SceneVisualBlueprint,
  progress: number
): void {
  const cx = REEL_DIMENSIONS.width / 2;
  drawDynamicSectionHeader(ctx, bp, segmentProgress(progress, 0.0, 0.16));

  const parentTitle = bp.leftTitle || 'الأساس المشترك';
  const parentSub = bp.leftItems?.[0] || 'خصائص وسلوك أساسي';
  const children = (bp.items && bp.items.length > 0
    ? bp.items
    : [
        { label: 'التنفيذ الأول', tag: 'Type A', tone: 'volt' as const },
        { label: 'التنفيذ الثاني', tag: 'Type B', tone: 'purple' as const },
      ]
  ).slice(0, 3);

  const parentP = easeOutCubic(segmentProgress(progress, 0.14, 0.36));
  if (parentP > 0.01) {
    ctx.save();
    ctx.globalAlpha = parentP;
    ctx.fillStyle = '#16141F';
    ctx.strokeStyle = SARB_COLORS.stackPurple;
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, 180, 575, 720, 175, 24);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = SARB_COLORS.stackPurple;
    drawRoundedRect(ctx, cx - 180, 554, 360, 42, 21);
    ctx.fill();

    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = SARB_COLORS.extremeBlack;
    ctx.font = '700 22px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(parentTitle, cx, 575);

    drawWrappedCenteredText(
      ctx,
      parentSub,
      cx,
      670,
      640,
      38,
      '700 30px "IBM Plex Sans Arabic", sans-serif',
      SARB_COLORS.white,
      2,
      'rtl'
    );
    ctx.restore();
  }

  // Animated tree branches
  const branchP = easeInOutCubic(segmentProgress(progress, 0.34, 0.56));
  const count = children.length;
  const colW = count === 1 ? 660 : count === 2 ? 405 : 268;
  const gap = count === 3 ? 22 : 30;
  const totalW = count * colW + (count - 1) * gap;
  const startX = cx - totalW / 2;

  if (branchP > 0.01) {
    ctx.save();
    ctx.strokeStyle = SARB_COLORS.volt;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(cx, 750);
    ctx.lineTo(cx, 750 + 90 * branchP);
    ctx.stroke();

    if (branchP > 0.45) {
      const hT = (branchP - 0.45) / 0.55;
      const firstCx = startX + colW / 2;
      const lastCx = startX + (count - 1) * (colW + gap) + colW / 2;
      ctx.beginPath();
      ctx.moveTo(cx + (firstCx - cx) * hT, 840);
      ctx.lineTo(cx + (lastCx - cx) * hT, 840);
      ctx.stroke();

      children.forEach((_, idx) => {
        const nodeCx = startX + idx * (colW + gap) + colW / 2;
        ctx.beginPath();
        ctx.moveTo(nodeCx, 840);
        ctx.lineTo(nodeCx, 840 + 60 * hT);
        ctx.stroke();
      });
    }
    ctx.restore();
  }

  children.forEach((child, idx) => {
    const cStart = 0.46 + idx * 0.12;
    const p = easeOutBack(segmentProgress(progress, cStart, cStart + 0.18));
    if (p <= 0.01) return;

    const color = resolveToneColor(child.tone, idx);
    const nx = startX + idx * (colW + gap);
    const ny = 900;

    ctx.save();
    ctx.globalAlpha = clampAlpha(p);
    ctx.translate(nx + colW / 2, ny + 180);
    ctx.scale(0.9 + 0.1 * p, 0.9 + 0.1 * p);
    ctx.translate(-(nx + colW / 2), -(ny + 180));

    ctx.fillStyle = SARB_COLORS.darkSurface;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.8;
    drawRoundedRect(ctx, nx, ny, colW, 330, 22);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color;
    drawRoundedRect(ctx, nx + 24, ny + 26, colW - 48, 8, 4);
    ctx.fill();

    drawWrappedCenteredText(
      ctx,
      child.label,
      nx + colW / 2,
      ny + 150,
      colW - 36,
      38,
      `700 ${count === 3 ? 25 : 29}px "IBM Plex Sans Arabic", sans-serif`,
      SARB_COLORS.white,
      3,
      'rtl'
    );

    if (child.tag) {
      ctx.direction = 'ltr';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.font = `600 ${count === 3 ? 17 : 20}px "JetBrains Mono", monospace`;
      ctx.fillText(child.tag, nx + colW / 2, ny + 275);
    }

    ctx.restore();
  });

  if (bp.takeaway) {
    const tA = easeOutCubic(segmentProgress(progress, 0.78, 0.94));
    if (tA > 0.01) {
      ctx.save();
      ctx.globalAlpha = tA;
      drawWrappedCenteredText(
        ctx,
        bp.takeaway,
        cx,
        1355,
        860,
        42,
        '700 32px "IBM Plex Sans Arabic", sans-serif',
        SARB_COLORS.volt,
        2,
        'rtl'
      );
      ctx.restore();
    }
  }
}

// ============================================================================
// 7. CHECKLIST PILLARS (Sequential Concept Cards)
// ============================================================================
function renderChecklistPillars(
  ctx: CanvasRenderingContext2D,
  bp: SceneVisualBlueprint,
  progress: number
): void {
  const cx = REEL_DIMENSIONS.width / 2;
  drawDynamicSectionHeader(ctx, bp, segmentProgress(progress, 0.0, 0.16));

  const items = (bp.items && bp.items.length > 0
    ? bp.items
    : [
        { label: bp.headline, tag: bp.subheadline, tone: 'volt' as const },
      ]
  ).slice(0, 4);

  const count = items.length;
  const cardH = count <= 2 ? 210 : count === 3 ? 185 : 155;
  const gap = count <= 2 ? 32 : 24;
  const startY = 585;

  items.forEach((item, idx) => {
    const start = 0.14 + idx * 0.14;
    const p = easeOutCubic(segmentProgress(progress, start, start + 0.2));
    if (p <= 0.01) return;

    const color = resolveToneColor(item.tone, idx);
    const y = startY + idx * (cardH + gap);

    ctx.save();
    ctx.globalAlpha = p;
    ctx.translate((1 - p) * 28, 0);

    ctx.fillStyle = SARB_COLORS.darkSurface;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.6;
    drawRoundedRect(ctx, 110, y, 860, cardH, 24);
    ctx.fill();
    ctx.stroke();

    drawStatusIcon(
      ctx,
      item.tone === 'error' ? 'error' : 'success',
      892,
      y + cardH / 2,
      24,
      color,
      p
    );

    drawWrappedRightText(
      ctx,
      item.label,
      834,
      item.tag ? y + cardH * 0.37 : y + cardH * 0.5,
      660,
      38,
      `700 ${count >= 4 ? 27 : 31}px "IBM Plex Sans Arabic", sans-serif`,
      SARB_COLORS.white,
      2
    );

    if (item.tag) {
      ctx.direction = 'ltr';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.font = '600 20px "JetBrains Mono", monospace';
      ctx.fillText(item.tag, 834, y + cardH * 0.75);
    }

    ctx.restore();
  });

  if (bp.takeaway) {
    const tA = easeOutCubic(segmentProgress(progress, 0.76, 0.94));
    if (tA > 0.01) {
      ctx.save();
      ctx.globalAlpha = tA;
      drawWrappedCenteredText(
        ctx,
        bp.takeaway,
        cx,
        1420,
        860,
        42,
        '700 32px "IBM Plex Sans Arabic", sans-serif',
        SARB_COLORS.volt,
        2,
        'rtl'
      );
      ctx.restore();
    }
  }
}

// ============================================================================
// 8. OUTRO TAKEAWAY PHASE A (0.0 -> 0.36; Phase B handled by shared Sarb Outro)
// ============================================================================
function renderOutroTakeawayPhaseA(
  ctx: CanvasRenderingContext2D,
  bp: SceneVisualBlueprint,
  progress: number
): void {
  const cx = REEL_DIMENSIONS.width / 2;
  const part1Fade = 1 - easeInOutCubic(segmentProgress(progress, 0.28, 0.38));
  if (part1Fade <= 0.01) return;

  ctx.save();
  ctx.globalAlpha = part1Fade;

  const pills = (bp.items ?? []).slice(0, 4);
  if (pills.length > 0) {
    pills.forEach((p, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const pillW = pills.length === 1 ? 360 : 250;
      const px = pills.length === 1 ? cx - pillW / 2 : cx - 260 + col * 270;
      const py = 540 + row * 68;
      const color = resolveToneColor(p.tone, idx);

      ctx.fillStyle = SARB_COLORS.darkSurface;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.4;
      drawRoundedRect(ctx, px, py, pillW, 50, 25);
      ctx.fill();
      ctx.stroke();

      drawWrappedCenteredText(
        ctx,
        p.label,
        px + pillW / 2,
        py + 25,
        pillW - 28,
        24,
        '700 20px "IBM Plex Sans Arabic", sans-serif',
        color,
        1,
        'rtl'
      );
    });
  }

  drawStatusIcon(ctx, 'success', cx, 755, 48, SARB_COLORS.success, 1);

  drawWrappedCenteredText(
    ctx,
    bp.headline,
    cx,
    870,
    860,
    60,
    '700 44px "IBM Plex Sans Arabic", sans-serif',
    SARB_COLORS.white,
    2,
    'rtl'
  );

  if (bp.takeaway) {
    drawWrappedCenteredText(
      ctx,
      bp.takeaway,
      cx,
      975,
      860,
      48,
      '700 34px "IBM Plex Sans Arabic", sans-serif',
      SARB_COLORS.volt,
      2,
      'rtl'
    );
  }

  ctx.restore();
}

function clampAlpha(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function renderDynamicSarbScene(
  ctx: CanvasRenderingContext2D,
  scene: ScheduledScene,
  progress: number,
  totalTimeMs: number,
  images: LoadedBrandImages
): void {
  const bp = scene.visualBlueprint;
  if (!bp) return;

  switch (bp.layoutType) {
    case 'hook_cards':
      renderHookCards(ctx, bp, progress, totalTimeMs, images);
      break;
    case 'code_concept':
      renderCodeConcept(ctx, bp, progress, totalTimeMs);
      break;
    case 'split_comparison':
      renderSplitComparison(ctx, bp, progress);
      break;
    case 'flow_pipeline':
      renderFlowPipeline(ctx, bp, progress, totalTimeMs);
      break;
    case 'layered_capsule':
      renderLayeredCapsule(ctx, bp, progress);
      break;
    case 'tree_hierarchy':
      renderTreeHierarchy(ctx, bp, progress);
      break;
    case 'outro_takeaway':
      renderOutroTakeawayPhaseA(ctx, bp, progress);
      break;
    case 'checklist_pillars':
    default:
      renderChecklistPillars(ctx, bp, progress);
      break;
  }
}
