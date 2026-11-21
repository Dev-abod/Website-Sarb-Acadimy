import { REEL_DIMENSIONS, SARB_COLORS } from '../data/lessonStoryboard';
import {
  clamp01,
  drawMascotMedallion,
  drawMixedRtlParagraph,
  drawParticleBurst,
  drawRoundedRect,
  drawShockwave,
  drawSoftGlow,
  drawStatusIcon,
  drawVectorCar,
  easeInOutCubic,
  easeOutBack,
  easeOutCubic,
  segmentProgress,
  type LoadedBrandImages,
} from './canvasPrimitives';

export function renderStackHeapScene(
  ctx: CanvasRenderingContext2D,
  sceneIndex: number,
  progress: number,
  totalTimeMs: number,
  images: LoadedBrandImages
): void {
  switch (sceneIndex) {
    case 1:
      renderScene1Hook(ctx, progress, totalTimeMs, images);
      break;
    case 2:
      renderScene2CarCode(ctx, progress);
      break;
    case 3:
      renderScene3MemorySplit(ctx, progress);
      break;
    case 4:
      renderScene4StackLifo(ctx, progress);
      break;
    case 5:
      renderScene5CarNoFit(ctx, progress, images);
      break;
    case 6:
      renderScene6HeapNew(ctx, progress);
      break;
    case 7:
      renderScene7ReferenceLink(ctx, progress, images);
      break;
    case 8:
      renderScene8TakeawayPhase(ctx, progress);
      break;
  }
}

function renderScene1Hook(
  ctx: CanvasRenderingContext2D,
  progress: number,
  totalTimeMs: number,
  images: LoadedBrandImages
): void {
  const cx = REEL_DIMENSIONS.width / 2;

  const hookFlash = progress < 0.16 ? Math.sin((progress / 0.16) * Math.PI) : 0;
  if (hookFlash > 0.01) {
    drawSoftGlow(ctx, cx, 980, 480, `rgba(255, 92, 92, ${0.18 * hookFlash})`);
  }

  const mascotAlpha = easeOutCubic(segmentProgress(progress, 0.0, 0.14));
  const mascotP = easeOutBack(segmentProgress(progress, 0.0, 0.2));
  const bob = Math.sin(totalTimeMs / 350) * 6;
  drawSoftGlow(ctx, cx, 490 + bob, 195 * mascotAlpha, 'rgba(212, 255, 0, 0.12)');
  drawMascotMedallion(
    ctx,
    images.mascot,
    cx,
    490 + bob,
    108,
    mascotAlpha,
    0.78 + 0.22 * mascotP,
    -0.04 * Math.sin(totalTimeMs / 600),
    '?'
  );

  const textP = easeOutCubic(segmentProgress(progress, 0.04, 0.24));
  drawMixedRtlParagraph(
    ctx,
    [
      [{ text: 'لماذا ينهار برنامجك فجأة', color: SARB_COLORS.white, bold: true }],
      [{ text: 'بهذه الرسائل المزعجة؟', color: SARB_COLORS.volt, bold: true }],
    ],
    cx,
    700 + (1 - textP) * 26,
    82,
    58,
    textP
  );

  const card1P = easeOutBack(segmentProgress(progress, 0.08, 0.24));
  const card2P = easeOutBack(segmentProgress(progress, 0.22, 0.4));
  const impactShake1 =
    progress > 0.16 && progress < 0.3 ? Math.sin(totalTimeMs / 24) * 6 : 0;
  const impactShake2 =
    progress > 0.32 && progress < 0.5 ? Math.sin(totalTimeMs / 24) * 5 : 0;

  const cards = [
    {
      p: card1P,
      y: 910,
      title: 'Stack Overflow',
      sub: 'امتلاء ذاكرة الاستدعاء السريعة',
      shake: impactShake1,
      waveStart: 0.14,
      seed: 101,
    },
    {
      p: card2P,
      y: 1120,
      title: 'Out of Memory',
      sub: 'نفاد مساحة تخزين الكائنات',
      shake: impactShake2,
      waveStart: 0.3,
      seed: 102,
    },
  ];

  cards.forEach((c) => {
    if (c.p <= 0.01) return;
    const cardW = 860;
    const cardH = 165;
    const cardX = cx - cardW / 2 + c.shake + (1 - c.p) * 36;
    const cardY = c.y;

    drawSoftGlow(ctx, cardX + 74, cardY + cardH / 2, 130 * clamp01(c.p), 'rgba(255, 92, 92, 0.12)');

    ctx.save();
    ctx.globalAlpha = clamp01(c.p);
    ctx.fillStyle = SARB_COLORS.darkSurface;
    ctx.strokeStyle = 'rgba(255, 92, 92, 0.72)';
    ctx.lineWidth = 2.5;
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 20);
    ctx.fill();
    ctx.stroke();

    drawStatusIcon(ctx, 'error', cardX + 74, cardY + cardH / 2, 28, SARB_COLORS.error);

    ctx.direction = 'ltr';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = SARB_COLORS.white;
    ctx.font = '600 38px "JetBrains Mono", monospace';
    ctx.fillText(c.title, cardX + 132, cardY + 62);

    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.fillStyle = SARB_COLORS.grayHint;
    ctx.font = '400 28px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(c.sub, cardX + cardW - 44, cardY + 114);

    ctx.restore();

    const waveT = segmentProgress(progress, c.waveStart, c.waveStart + 0.24);
    drawShockwave(ctx, cardX + 74, cardY + cardH / 2, waveT, 135, SARB_COLORS.error);
    drawParticleBurst(ctx, cardX + 74, cardY + cardH / 2, waveT, 8, 85, SARB_COLORS.error, c.seed);
  });

  const subP = easeOutCubic(segmentProgress(progress, 0.52, 0.78));
  drawMixedRtlParagraph(
    ctx,
    [[{ text: 'السر كلّه في مكان حفظ البيانات داخل الذاكرة', color: SARB_COLORS.grayHint }]],
    cx,
    1410 + (1 - subP) * 20,
    46,
    32,
    subP
  );
}

function renderScene2CarCode(ctx: CanvasRenderingContext2D, progress: number): void {
  const cx = REEL_DIMENSIONS.width / 2;

  const titleP = easeOutCubic(segmentProgress(progress, 0.0, 0.25));
  drawMixedRtlParagraph(
    ctx,
    [
      [{ text: 'عندما تنشئ كائناً لسيارة في كودك...', color: SARB_COLORS.white, bold: true }],
      [{ text: 'أين يُحفظ بالضبط داخل الذاكرة؟', color: SARB_COLORS.volt, bold: true }],
    ],
    cx,
    430 + (1 - titleP) * 28,
    78,
    50,
    titleP
  );

  const codeCardP = easeOutCubic(segmentProgress(progress, 0.18, 0.42));
  if (codeCardP > 0.01) {
    ctx.save();
    ctx.globalAlpha = codeCardP;
    const cardW = 880;
    const cardH = 190;
    const cardX = cx - cardW / 2;
    const cardY = 600 + (1 - codeCardP) * 24;

    ctx.fillStyle = SARB_COLORS.darkSurface;
    ctx.strokeStyle = SARB_COLORS.borderStrong;
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 20);
    ctx.fill();
    ctx.stroke();

    ctx.direction = 'ltr';
    ctx.textAlign = 'left';
    ctx.font = '600 20px "JetBrains Mono", monospace';
    ctx.fillStyle = SARB_COLORS.grayMuted;
    ctx.fillText('main.ts', cardX + 36, cardY + 42);

    const fullCode = 'const myCar = new Car("Sedan", 2026);';
    const typeP = segmentProgress(progress, 0.25, 0.6);
    const charCount = Math.floor(fullCode.length * typeP);
    const visibleCode = fullCode.slice(0, charCount);

    ctx.font = '600 32px "JetBrains Mono", monospace';
    ctx.textBaseline = 'middle';
    let tx = cardX + 36;
    const ty = cardY + 118;

    const tokens = [
      { text: 'const ', color: SARB_COLORS.grayMuted },
      { text: 'myCar', color: SARB_COLORS.white },
      { text: ' = ', color: SARB_COLORS.grayHint },
      { text: 'new ', color: SARB_COLORS.volt },
      { text: 'Car', color: SARB_COLORS.white },
      { text: '("Sedan", 2026);', color: SARB_COLORS.voltSoft },
    ];

    let consumed = 0;
    for (const tk of tokens) {
      if (consumed >= visibleCode.length) break;
      const slice = tk.text.slice(0, Math.max(0, visibleCode.length - consumed));
      ctx.fillStyle = tk.color;
      ctx.fillText(slice, tx, ty);
      tx += ctx.measureText(slice).width;
      consumed += tk.text.length;
    }

    if (progress < 0.78) {
      ctx.fillStyle = SARB_COLORS.volt;
      ctx.fillRect(tx + 4, ty - 18, 4, 36);
    }
    ctx.restore();
  }

  const carDriveP = easeOutCubic(segmentProgress(progress, 0.36, 0.68));
  if (carDriveP > 0.01) {
    const carX = cx - (1 - carDriveP) * 260;
    const wheelSpin = carDriveP * Math.PI * 3.2;
    const brakeTilt = (1 - carDriveP) * -0.028;
    const glow = clamp01(carDriveP * 1.1);
    drawVectorCar(
      ctx,
      carX,
      960,
      1.35 * (0.9 + 0.1 * carDriveP),
      SARB_COLORS.white,
      SARB_COLORS.volt,
      clamp01(carDriveP * 1.25),
      wheelSpin,
      brakeTilt,
      glow
    );
  }

  const pathP = easeInOutCubic(segmentProgress(progress, 0.58, 0.88));
  if (pathP > 0.01) {
    ctx.save();
    ctx.strokeStyle = SARB_COLORS.volt;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    const startY = 1055;
    const endY = 1280;
    const curY = startY + (endY - startY) * pathP;
    ctx.beginPath();
    ctx.moveTo(cx, startY);
    ctx.lineTo(cx, curY);
    ctx.stroke();

    ctx.fillStyle = SARB_COLORS.volt;
    ctx.beginPath();
    ctx.arc(cx, startY, 7, 0, Math.PI * 2);
    ctx.fill();

    if (pathP > 0.85) {
      const qP = easeOutBack((pathP - 0.85) / 0.15);
      ctx.fillStyle = SARB_COLORS.darkSurface;
      ctx.strokeStyle = SARB_COLORS.volt;
      ctx.lineWidth = 3;
      drawRoundedRect(ctx, cx - 220, 1290, 440, 120, 20);
      ctx.fill();
      ctx.stroke();

      drawStatusIcon(ctx, 'question', cx - 150, 1350, 24, SARB_COLORS.volt, qP);
      ctx.direction = 'rtl';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = SARB_COLORS.white;
      ctx.font = '700 34px "IBM Plex Sans Arabic", sans-serif';
      ctx.fillText('أين موقعها في RAM؟', cx + 170, 1350);
    }
    ctx.restore();
  }
}

function renderScene3MemorySplit(ctx: CanvasRenderingContext2D, progress: number): void {
  const cx = REEL_DIMENSIONS.width / 2;
  const stackColor = SARB_COLORS.stackPurple;

  const titleP = easeOutCubic(segmentProgress(progress, 0.0, 0.22));
  drawMixedRtlParagraph(
    ctx,
    [
      [{ text: 'الذاكرة ليست مساحة واحدة عشوائية', color: SARB_COLORS.white, bold: true }],
      [{ text: 'بل تنقسم إلى قسمين رئيسيين:', color: SARB_COLORS.grayHint }],
    ],
    cx,
    430 + (1 - titleP) * 24,
    72,
    46,
    titleP
  );

  const splitP = easeInOutCubic(segmentProgress(progress, 0.24, 0.6));
  const stackFocusP = easeOutCubic(segmentProgress(progress, 0.56, 0.78));
  const heapFocusP = easeOutCubic(segmentProgress(progress, 0.72, 0.94));

  const topY = 640;
  const boxH = 740;
  const unifiedAlpha = 1 - easeOutCubic(segmentProgress(progress, 0.24, 0.4));

  if (unifiedAlpha > 0.01) {
    ctx.save();
    ctx.globalAlpha = unifiedAlpha;
    ctx.fillStyle = SARB_COLORS.darkSurface;
    ctx.strokeStyle = SARB_COLORS.borderStrong;
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, 100, topY, 880, boxH, 24);
    ctx.fill();
    ctx.stroke();

    ctx.direction = 'ltr';
    ctx.textAlign = 'center';
    ctx.fillStyle = SARB_COLORS.white;
    ctx.font = '700 46px "IBM Plex Sans", sans-serif';
    ctx.fillText('RAM MEMORY', cx, topY + boxH / 2 - 22);

    ctx.direction = 'rtl';
    ctx.fillStyle = SARB_COLORS.grayHint;
    ctx.font = '400 30px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('الذاكرة العشوائية', cx, topY + boxH / 2 + 34);
    ctx.restore();
  }

  const stackW = 355;
  const heapW = 485;
  const stackX = 100 + (1 - splitP) * 18 - splitP * 6;
  const heapX = 455 + splitP * 40;

  if (splitP > 0.01) {
    ctx.save();
    ctx.globalAlpha = clamp01(splitP * 1.4);
    if (stackFocusP > 0.2) {
      drawSoftGlow(ctx, stackX + stackW / 2, topY + 120, 175 * stackFocusP, 'rgba(167, 139, 250, 0.14)');
    }
    ctx.fillStyle = SARB_COLORS.darkSurface;
    ctx.strokeStyle = stackFocusP > 0.15 ? stackColor : SARB_COLORS.borderStrong;
    ctx.lineWidth = stackFocusP > 0.15 ? 3.5 : 2.5;
    drawRoundedRect(ctx, stackX, topY, stackW, boxH, 24);
    ctx.fill();
    ctx.stroke();

    for (let i = 0; i < 6; i++) {
      const sy = topY + 180 + i * 86;
      ctx.strokeStyle = stackFocusP > 0.25 ? 'rgba(167, 139, 250, 0.38)' : SARB_COLORS.borderSubtle;
      ctx.lineWidth = 2;
      drawRoundedRect(ctx, stackX + 26, sy, stackW - 52, 66, 12);
      ctx.stroke();
    }

    ctx.direction = 'ltr';
    ctx.textAlign = 'center';
    ctx.fillStyle = stackColor;
    ctx.font = '700 44px "IBM Plex Sans", sans-serif';
    ctx.fillText('Stack', stackX + stackW / 2, topY + 72);

    ctx.direction = 'rtl';
    ctx.fillStyle = SARB_COLORS.grayHint;
    ctx.font = '400 28px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('سريع ومنظم', stackX + stackW / 2, topY + 126);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = clamp01(splitP * 1.4);
    if (heapFocusP > 0.2) {
      drawSoftGlow(ctx, heapX + heapW / 2, topY + 120, 210 * heapFocusP, 'rgba(212, 255, 0, 0.12)');
    }
    ctx.fillStyle = SARB_COLORS.darkSurface;
    ctx.strokeStyle = heapFocusP > 0.15 ? SARB_COLORS.volt : SARB_COLORS.borderStrong;
    ctx.lineWidth = heapFocusP > 0.15 ? 3.5 : 2.5;
    drawRoundedRect(ctx, heapX, topY, heapW, boxH, 24);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(230, 230, 230, 0.14)';
    for (let gx = heapX + 44; gx < heapX + heapW - 30; gx += 44) {
      for (let gy = topY + 180; gy < topY + boxH - 36; gy += 44) {
        ctx.beginPath();
        ctx.arc(gx, gy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.direction = 'ltr';
    ctx.textAlign = 'center';
    ctx.fillStyle = SARB_COLORS.volt;
    ctx.font = '700 44px "IBM Plex Sans", sans-serif';
    ctx.fillText('Heap', heapX + heapW / 2, topY + 72);

    ctx.direction = 'rtl';
    ctx.fillStyle = SARB_COLORS.grayHint;
    ctx.font = '400 28px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('مستودع واسع ومفتوح', heapX + heapW / 2, topY + 126);
    ctx.restore();
  }

  const seamT = segmentProgress(progress, 0.25, 0.56);
  if (seamT > 0.01 && seamT < 0.99) {
    const seamAlpha = seamT < 0.25 ? seamT / 0.25 : 1 - (seamT - 0.25) / 0.75;
    const seamX = 468;
    ctx.save();
    ctx.globalAlpha = clamp01(seamAlpha * 0.8);
    ctx.strokeStyle = SARB_COLORS.volt;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(seamX, topY + 40);
    ctx.lineTo(seamX, topY + boxH - 40);
    ctx.stroke();
    ctx.restore();

    drawShockwave(ctx, seamX, topY + boxH / 2, seamT, 160, stackColor);
    drawParticleBurst(ctx, seamX, topY + boxH / 2, seamT, 10, 120, SARB_COLORS.volt, 301);
  }

  const sumP = easeOutCubic(segmentProgress(progress, 0.72, 0.95));
  drawMixedRtlParagraph(
    ctx,
    [
      [
        { text: 'الـ ', color: SARB_COLORS.grayHint },
        { text: 'Stack', color: stackColor, latin: true, bold: true },
        { text: ' للسرعة  ·  والـ ', color: SARB_COLORS.grayHint },
        { text: 'Heap', color: SARB_COLORS.volt, latin: true, bold: true },
        { text: ' للكائنات الكبيرة', color: SARB_COLORS.grayHint },
      ],
    ],
    cx,
    1465,
    46,
    32,
    sumP
  );
}

function renderScene4StackLifo(ctx: CanvasRenderingContext2D, progress: number): void {
  const cx = REEL_DIMENSIONS.width / 2;
  const stackColor = SARB_COLORS.stackPurple;

  const titleP = easeOutCubic(segmentProgress(progress, 0.0, 0.22));
  drawMixedRtlParagraph(
    ctx,
    [
      [
        { text: 'الـ ', color: SARB_COLORS.white, bold: true },
        { text: 'Stack', color: stackColor, latin: true, bold: true },
        { text: ' هو درج مكتبك السريع', color: SARB_COLORS.white, bold: true },
      ],
    ],
    cx,
    410 + (1 - titleP) * 20,
    68,
    54,
    titleP
  );

  const lifoP = easeOutCubic(segmentProgress(progress, 0.14, 0.35));
  drawMixedRtlParagraph(
    ctx,
    [
      [
        { text: 'منظم وصارم بنظام ', color: SARB_COLORS.grayHint },
        { text: 'LIFO', color: stackColor, latin: true, bold: true },
        { text: ' — الداخل أخيراً يخرج أولاً', color: SARB_COLORS.grayHint },
      ],
    ],
    cx,
    498,
    46,
    32,
    lifoP
  );

  const drawerW = 680;
  const drawerH = 740;
  const drawerX = cx - drawerW / 2;
  const drawerY = 600;

  ctx.save();
  ctx.fillStyle = SARB_COLORS.darkSurface;
  ctx.strokeStyle = 'rgba(167, 139, 250, 0.55)';
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, drawerX, drawerY, drawerW, drawerH, 24);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = SARB_COLORS.extremeBlack;
  ctx.fillRect(drawerX + 120, drawerY - 6, drawerW - 240, 12);

  const items = [
    {
      label: 'int speed = 120;',
      enterStart: 0.18,
      enterEnd: 0.36,
      exitStart: 2.0,
      exitEnd: 2.0,
      slotIdx: 0,
      highlight: false,
    },
    {
      label: 'bool active = true;',
      enterStart: 0.34,
      enterEnd: 0.52,
      exitStart: 2.0,
      exitEnd: 2.0,
      slotIdx: 1,
      highlight: false,
    },
    {
      label: 'int year = 2026;',
      enterStart: 0.5,
      enterEnd: 0.68,
      exitStart: 0.78,
      exitEnd: 0.94,
      slotIdx: 2,
      highlight: true,
    },
  ];

  const slotW = drawerW - 80;
  const slotH = 128;
  const baseBottomY = drawerY + drawerH - 48;

  let activeTopY = baseBottomY - slotH / 2;

  items.forEach((item) => {
    const inP = easeOutBack(segmentProgress(progress, item.enterStart, item.enterEnd));
    const outP = easeInOutCubic(segmentProgress(progress, item.exitStart, item.exitEnd));
    if (inP <= 0.01 || outP >= 0.99) return;

    const targetY = baseBottomY - (item.slotIdx + 1) * slotH - item.slotIdx * 24;
    const y = targetY - (1 - inP) * 180 - outP * 240;
    const alpha = clamp01(inP) * (1 - outP);
    activeTopY = y + slotH / 2;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = item.highlight ? stackColor : SARB_COLORS.elevatedSurface;
    ctx.strokeStyle = item.highlight ? stackColor : 'rgba(167, 139, 250, 0.35)';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, drawerX + 40, y, slotW, slotH, 16);
    ctx.fill();
    if (!item.highlight) ctx.stroke();

    ctx.direction = 'ltr';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = item.highlight ? SARB_COLORS.extremeBlack : SARB_COLORS.white;
    ctx.font = '600 34px "JetBrains Mono", monospace';
    ctx.fillText(item.label, cx, y + slotH / 2);

    if (item.highlight) {
      ctx.font = '700 20px "IBM Plex Sans", sans-serif';
      ctx.fillStyle = SARB_COLORS.extremeBlack;
      ctx.fillText(outP > 0.1 ? 'POP ▲ OUT' : 'PUSH ▼ IN', cx, y + 26);
    }
    ctx.restore();

    const landT = segmentProgress(progress, item.enterEnd - 0.04, item.enterEnd + 0.16);
    drawShockwave(ctx, cx, targetY + slotH / 2, landT, 120, stackColor);
  });

  if (progress > 0.18) {
    const spAlpha = easeOutCubic(segmentProgress(progress, 0.18, 0.3));
    const spX = drawerX + drawerW + 18;
    ctx.save();
    ctx.globalAlpha = spAlpha;
    ctx.fillStyle = stackColor;
    ctx.font = '700 24px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('◀ SP', spX, activeTopY);
    ctx.restore();
  }

  ctx.restore();

  drawMixedRtlParagraph(
    ctx,
    [[{ text: 'يحفظ المتغيرات البسيطة وسريعة الاستدعاء', color: SARB_COLORS.grayHint }]],
    cx,
    1440,
    46,
    34,
    easeOutCubic(segmentProgress(progress, 0.35, 0.6))
  );
}

function renderScene5CarNoFit(
  ctx: CanvasRenderingContext2D,
  progress: number,
  images: LoadedBrandImages
): void {
  const cx = REEL_DIMENSIONS.width / 2;
  const stackColor = SARB_COLORS.stackPurple;

  const titleP = easeOutCubic(segmentProgress(progress, 0.0, 0.24));
  drawMixedRtlParagraph(
    ctx,
    [
      [{ text: 'لكن كائن السيارة المعقد', color: SARB_COLORS.white, bold: true }],
      [{ text: 'لا يتسع له درج المكتب!', color: SARB_COLORS.warning, bold: true }],
    ],
    cx,
    420 + (1 - titleP) * 24,
    74,
    52,
    titleP
  );

  const stackX = 640;
  const stackY = 660;
  const stackW = 300;
  const stackH = 660;

  const approachP = easeOutCubic(segmentProgress(progress, 0.16, 0.5));
  const bounceBackP = easeOutBack(segmentProgress(progress, 0.53, 0.8));
  const carCenterX = 285 + approachP * 245 - bounceBackP * 215;
  const hitMoment = progress > 0.48 && progress < 0.72;
  const shakeY = hitMoment ? Math.sin(progress * 95) * 8 : 0;

  const carWheelSpin = (approachP * 3.0 - bounceBackP * 2.4) * Math.PI;
  const carTilt = hitMoment ? -0.055 : approachP < 0.99 ? 0.025 : -0.02 * (1 - bounceBackP);

  ctx.save();
  ctx.fillStyle = SARB_COLORS.darkSurface;
  ctx.strokeStyle = hitMoment ? SARB_COLORS.warning : stackColor;
  ctx.lineWidth = hitMoment ? 4 : 2.5;
  drawRoundedRect(ctx, stackX, stackY, stackW, stackH, 20);
  ctx.fill();
  ctx.stroke();

  ctx.direction = 'ltr';
  ctx.textAlign = 'center';
  ctx.fillStyle = hitMoment ? SARB_COLORS.warning : stackColor;
  ctx.font = '700 34px "IBM Plex Sans", sans-serif';
  ctx.fillText('Stack', stackX + stackW / 2, stackY + 56);

  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = hitMoment ? 'rgba(255, 176, 32, 0.3)' : 'rgba(167, 139, 250, 0.28)';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, stackX + 24, stackY + 120 + i * 124, stackW - 48, 96, 12);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  const objW = 450;
  const objH = 340;
  const objX = carCenterX - objW / 2;
  const objY = 810 + shakeY;

  ctx.fillStyle = SARB_COLORS.darkSurface;
  ctx.strokeStyle = hitMoment ? SARB_COLORS.warning : SARB_COLORS.borderStrong;
  ctx.lineWidth = 2.5;
  drawRoundedRect(ctx, objX, objY, objW, objH, 24);
  ctx.fill();
  ctx.stroke();

  drawVectorCar(
    ctx,
    carCenterX,
    objY + 128,
    0.92,
    SARB_COLORS.white,
    SARB_COLORS.volt,
    1,
    carWheelSpin,
    carTilt,
    hitMoment ? 0.45 : 0.85
  );

  ctx.direction = 'ltr';
  ctx.textAlign = 'center';
  ctx.fillStyle = SARB_COLORS.grayHint;
  ctx.font = '600 24px "IBM Plex Sans", sans-serif';
  ctx.fillText('Car Object', carCenterX, objY + 232);

  if (hitMoment || progress >= 0.72) {
    drawStatusIcon(ctx, 'warning', carCenterX, objY + 290, 20, SARB_COLORS.warning, 1);
  }
  ctx.restore();

  const impactT = segmentProgress(progress, 0.49, 0.74);
  drawShockwave(ctx, stackX, 980, impactT, 150, SARB_COLORS.warning);
  drawParticleBurst(ctx, stackX, 980, impactT, 10, 95, SARB_COLORS.warning, 501);

  if (progress > 0.5) {
    const reactP = easeOutBack(segmentProgress(progress, 0.5, 0.7));
    drawMascotMedallion(ctx, images.mascot, 175, 620, 62, reactP, 0.8 + 0.2 * reactP, 0.08, '!');
  }

  drawMixedRtlParagraph(
    ctx,
    [[{ text: 'الحجم والبيانات أكبر من سعة الدرج السريع', color: SARB_COLORS.grayHint }]],
    cx,
    1445,
    46,
    32,
    easeOutCubic(segmentProgress(progress, 0.55, 0.85))
  );
}

function renderScene6HeapNew(ctx: CanvasRenderingContext2D, progress: number): void {
  const cx = REEL_DIMENSIONS.width / 2;

  const titleP = easeOutCubic(segmentProgress(progress, 0.0, 0.22));
  drawMixedRtlParagraph(
    ctx,
    [
      [
        { text: 'هنا يأتي دور الـ ', color: SARB_COLORS.white, bold: true },
        { text: 'Heap', color: SARB_COLORS.volt, latin: true, bold: true },
        { text: ': المستودع المفتوح', color: SARB_COLORS.white, bold: true },
      ],
    ],
    cx,
    410 + (1 - titleP) * 20,
    68,
    52,
    titleP
  );

  const newP = easeOutBack(segmentProgress(progress, 0.16, 0.36));
  if (newP > 0.01) {
    ctx.save();
    ctx.globalAlpha = clamp01(newP);
    ctx.fillStyle = SARB_COLORS.volt;
    drawRoundedRect(ctx, cx - 220, 495, 440, 76, 16);
    ctx.fill();

    ctx.direction = 'ltr';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = SARB_COLORS.extremeBlack;
    ctx.font = '700 34px "JetBrains Mono", monospace';
    ctx.fillText('new Car("Sedan")', cx, 533);
    ctx.restore();
  }

  const heapX = 100;
  const heapY = 630;
  const heapW = 880;
  const heapH = 660;

  ctx.save();
  ctx.fillStyle = SARB_COLORS.darkSurface;
  ctx.strokeStyle = SARB_COLORS.borderStrong;
  ctx.lineWidth = 2.5;
  drawRoundedRect(ctx, heapX, heapY, heapW, heapH, 24);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = 'rgba(230, 230, 230, 0.14)';
  for (let gx = heapX + 48; gx < heapX + heapW - 32; gx += 48) {
    for (let gy = heapY + 90; gy < heapY + heapH - 32; gy += 48) {
      ctx.beginPath();
      ctx.arc(gx, gy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  ctx.fillStyle = SARB_COLORS.grayMuted;
  ctx.font = '600 24px "IBM Plex Sans", sans-serif';
  ctx.fillText('HEAP WAREHOUSE · DYNAMIC MEMORY', heapX + 36, heapY + 46);

  const allocP = easeOutBack(segmentProgress(progress, 0.34, 0.62));
  if (allocP > 0.01) {
    const bw = 560 * (0.75 + 0.25 * clamp01(allocP));
    const bh = 360 * (0.75 + 0.25 * clamp01(allocP));
    const bx = cx - bw / 2;
    const by = heapY + 120 + (360 - bh) / 2;

    drawSoftGlow(ctx, cx, by + bh / 2, 260 * clamp01(allocP), 'rgba(212, 255, 0, 0.14)');

    ctx.fillStyle = SARB_COLORS.extremeBlack;
    ctx.strokeStyle = SARB_COLORS.volt;
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, bx, by, bw, bh, 20);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = SARB_COLORS.volt;
    ctx.font = '700 26px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('ADDR: 0x7FA3', bx + 28, by + 46);

    drawVectorCar(ctx, cx, by + 195, 1.15 * clamp01(allocP), SARB_COLORS.white, SARB_COLORS.volt, clamp01(allocP));

    const burstT = segmentProgress(progress, 0.36, 0.68);
    drawShockwave(ctx, cx, by + bh / 2, burstT, 220, SARB_COLORS.volt);
    drawParticleBurst(ctx, cx, by + bh / 2, burstT, 16, 190, SARB_COLORS.volt, 601);
  }

  const refP = easeOutBack(segmentProgress(progress, 0.64, 0.88));
  if (refP > 0.01) {
    ctx.globalAlpha = clamp01(refP);
    ctx.fillStyle = SARB_COLORS.volt;
    drawRoundedRect(ctx, cx - 230, heapY + 530 + (1 - refP) * 20, 460, 84, 16);
    ctx.fill();

    ctx.direction = 'ltr';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = SARB_COLORS.extremeBlack;
    ctx.font = '700 32px "JetBrains Mono", monospace';
    ctx.fillText('Reference: 0x7FA3', cx, heapY + 572 + (1 - refP) * 20);

    const refBurstT = segmentProgress(progress, 0.66, 0.92);
    drawParticleBurst(ctx, cx, heapY + 572, refBurstT, 10, 120, SARB_COLORS.voltSoft, 602);
  }

  ctx.restore();

  drawMixedRtlParagraph(
    ctx,
    [
      [
        { text: 'تبني السيارة هنا... وتمنحك عنوان ', color: SARB_COLORS.grayHint },
        { text: 'Reference', color: SARB_COLORS.volt, latin: true, bold: true },
      ],
    ],
    cx,
    1405,
    46,
    34,
    easeOutCubic(segmentProgress(progress, 0.62, 0.9))
  );
}

function evalCubicBezier(
  t: number,
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number }
): { x: number; y: number } {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;
  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
  };
}

function renderScene7ReferenceLink(
  ctx: CanvasRenderingContext2D,
  progress: number,
  images: LoadedBrandImages
): void {
  const cx = REEL_DIMENSIONS.width / 2;
  const stackColor = SARB_COLORS.stackPurple;

  const ahaP = easeOutBack(segmentProgress(progress, 0.0, 0.28));
  drawSoftGlow(ctx, cx, 385, 135 * clamp01(ahaP), 'rgba(212, 255, 0, 0.12)');
  ctx.save();
  ctx.globalAlpha = clamp01(ahaP);
  ctx.fillStyle = SARB_COLORS.volt;
  ctx.font = '700 46px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.direction = 'ltr';
  ctx.fillText('{  ✦  }', cx, 385);
  ctx.restore();

  drawMixedRtlParagraph(
    ctx,
    [
      [{ text: 'هذا العنوان الصغير فقط...', color: SARB_COLORS.white, bold: true }],
      [
        { text: 'يستقر في ', color: SARB_COLORS.grayHint },
        { text: 'Stack', color: stackColor, latin: true, bold: true },
        { text: ' ليشير للسيارة في ', color: SARB_COLORS.grayHint },
        { text: 'Heap', color: SARB_COLORS.volt, latin: true, bold: true },
      ],
    ],
    cx,
    468,
    66,
    42,
    easeOutCubic(segmentProgress(progress, 0.05, 0.3))
  );

  const stackX = 110;
  const stackY = 635;
  const stackW = 860;
  const stackH = 220;

  ctx.save();
  drawSoftGlow(ctx, stackX + 180, stackY + 60, 160, 'rgba(167, 139, 250, 0.12)');
  ctx.fillStyle = SARB_COLORS.darkSurface;
  ctx.strokeStyle = stackColor;
  ctx.lineWidth = 2.5;
  drawRoundedRect(ctx, stackX, stackY, stackW, stackH, 22);
  ctx.fill();
  ctx.stroke();

  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  ctx.fillStyle = stackColor;
  ctx.font = '700 30px "IBM Plex Sans", sans-serif';
  ctx.fillText('STACK', stackX + 36, stackY + 48);

  const refDropP = easeOutBack(segmentProgress(progress, 0.16, 0.44));
  const refBoxX = stackX + 36;
  const refBoxY = stackY + 86 - (1 - refDropP) * 56;
  ctx.globalAlpha = clamp01(refDropP);
  ctx.fillStyle = SARB_COLORS.elevatedSurface;
  ctx.strokeStyle = SARB_COLORS.volt;
  ctx.lineWidth = 2.5;
  drawRoundedRect(ctx, refBoxX, refBoxY, stackW - 72, 94, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = SARB_COLORS.white;
  ctx.font = '600 32px "JetBrains Mono", monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText('myCar  ───►', cx - 24, refBoxY + 47);

  ctx.fillStyle = SARB_COLORS.volt;
  drawRoundedRect(ctx, cx + 6, refBoxY + 17, 196, 60, 12);
  ctx.fill();
  ctx.fillStyle = SARB_COLORS.extremeBlack;
  ctx.font = '700 32px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('0x7FA3', cx + 104, refBoxY + 48);
  ctx.restore();

  const heapX = 110;
  const heapY = 1070;
  const heapW = 860;
  const heapH = 330;

  ctx.save();
  drawSoftGlow(ctx, cx, heapY + 185, 220, 'rgba(212, 255, 0, 0.10)');
  ctx.fillStyle = SARB_COLORS.darkSurface;
  ctx.strokeStyle = SARB_COLORS.volt;
  ctx.lineWidth = 2.5;
  drawRoundedRect(ctx, heapX, heapY, heapW, heapH, 22);
  ctx.fill();
  ctx.stroke();

  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  ctx.fillStyle = SARB_COLORS.volt;
  ctx.font = '700 28px "IBM Plex Sans", sans-serif';
  ctx.fillText('HEAP', heapX + 36, heapY + 46);

  ctx.fillStyle = SARB_COLORS.volt;
  ctx.textAlign = 'right';
  ctx.font = '700 28px "JetBrains Mono", monospace';
  ctx.fillText('0x7FA3', heapX + heapW - 36, heapY + 46);

  drawVectorCar(ctx, cx, heapY + 195, 1.12, SARB_COLORS.white, SARB_COLORS.volt, 1, 0, 0, 0.7);
  ctx.restore();

  const arrowP = easeInOutCubic(segmentProgress(progress, 0.4, 0.76));
  const p0 = { x: cx + 104, y: stackY + 186 };
  const p1 = { x: cx + 128, y: stackY + 295 };
  const p2 = { x: cx - 40, y: heapY - 88 };
  const p3 = { x: cx, y: heapY + 8 };

  if (arrowP > 0.01) {
    ctx.save();
    ctx.strokeStyle = SARB_COLORS.volt;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const steps = 36;
    const maxStep = Math.max(1, Math.floor(steps * arrowP));
    for (let s = 0; s <= maxStep; s++) {
      const pt = evalCubicBezier((s / steps) * arrowP, p0, p1, p2, p3);
      if (s === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();

    if (arrowP > 0.85) {
      const pulseT = (progress * 2.1) % 1;
      const bead = evalCubicBezier(pulseT, p0, p1, p2, p3);
      drawSoftGlow(ctx, bead.x, bead.y, 26, 'rgba(212, 255, 0, 0.45)');
      ctx.fillStyle = SARB_COLORS.white;
      ctx.beginPath();
      ctx.arc(bead.x, bead.y, 7.5, 0, Math.PI * 2);
      ctx.fill();
    }

    if (arrowP > 0.85) {
      const prevPt = evalCubicBezier(Math.max(0, arrowP - 0.05), p0, p1, p2, p3);
      const tipPt = evalCubicBezier(arrowP, p0, p1, p2, p3);
      const angle = Math.atan2(tipPt.y - prevPt.y, tipPt.x - prevPt.x);
      ctx.save();
      ctx.translate(tipPt.x, tipPt.y);
      ctx.rotate(angle);
      ctx.fillStyle = SARB_COLORS.volt;
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-14, -12);
      ctx.lineTo(-14, 12);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    const snapT = segmentProgress(progress, 0.72, 0.96);
    drawShockwave(ctx, p3.x, p3.y, snapT, 135, SARB_COLORS.volt);
    drawParticleBurst(ctx, p3.x, p3.y, snapT, 12, 115, SARB_COLORS.volt, 701);
  }

  if (progress > 0.65) {
    const mP = easeOutBack(segmentProgress(progress, 0.65, 0.88));
    drawMascotMedallion(ctx, images.mascot, 875, 960, 56, mP, 0.85 + 0.15 * mP, -0.05, '✓');
  }
}

function renderScene8TakeawayPhase(ctx: CanvasRenderingContext2D, progress: number): void {
  const cx = REEL_DIMENSIONS.width / 2;
  const part1Fade = 1 - easeInOutCubic(segmentProgress(progress, 0.28, 0.38));
  if (part1Fade > 0.01) {
    ctx.save();
    ctx.globalAlpha = part1Fade;
    drawStatusIcon(ctx, 'success', cx, 660, 52, SARB_COLORS.success, 1);
    drawMixedRtlParagraph(
      ctx,
      [
        [{ text: 'فهمك لهذا الفرق', color: SARB_COLORS.white, bold: true }],
        [{ text: 'يحميك من استنزاف الذاكرة', color: SARB_COLORS.volt, bold: true }],
        [{ text: 'وانهيار برامجك.', color: SARB_COLORS.grayHint, bold: true }],
      ],
      cx,
      820,
      78,
      50,
      1
    );
    ctx.restore();
  }
}
