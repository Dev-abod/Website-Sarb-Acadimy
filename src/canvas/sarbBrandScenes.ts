import { REEL_DIMENSIONS, SARB_COLORS } from '../data/lessonStoryboard';
import {
  clamp01,
  drawMascotMedallion,
  drawMixedRtlParagraph,
  drawParticleBurst,
  drawRoundedRect,
  drawSarbFlock,
  drawShockwave,
  drawSoftGlow,
  drawStatusIcon,
  easeInOutCubic,
  easeOutBack,
  easeOutCubic,
  segmentProgress,
  type LoadedBrandImages,
} from './canvasPrimitives';

export function renderSarbBrandScene(
  ctx: CanvasRenderingContext2D,
  sceneIndex: number,
  progress: number,
  totalTimeMs: number,
  images: LoadedBrandImages
): void {
  switch (sceneIndex) {
    case 1:
      renderScene1CourseTrapHook(ctx, progress, totalTimeMs, images);
      break;
    case 2:
      renderScene2TraditionalProblem(ctx, progress, totalTimeMs);
      break;
    case 3:
      renderScene3SarbShortcut(ctx, progress, totalTimeMs, images);
      break;
    case 4:
      renderScene4ThreePillars(ctx, progress, totalTimeMs);
      break;
    case 5:
      renderScene5BrandOutroPhaseA(ctx, progress);
      break;
  }
}

// ============================================================================
// SCENE 1: HOOK — Unfinished Courses & Distraction Trap
// "كم دورة برمجية بدأتها، وتوقفت في منتصف الطريق بسبب الحشو والتشتت؟"
// ============================================================================
function renderScene1CourseTrapHook(
  ctx: CanvasRenderingContext2D,
  progress: number,
  totalTimeMs: number,
  images: LoadedBrandImages
): void {
  const cx = REEL_DIMENSIONS.width / 2;

  const hookFlash = progress < 0.18 ? Math.sin((progress / 0.18) * Math.PI) : 0;
  if (hookFlash > 0.01) {
    drawSoftGlow(ctx, cx, 940, 440, `rgba(255, 92, 92, ${0.16 * hookFlash})`);
  }

  // Hero Mascot with '?' badge
  const mascotAlpha = easeOutCubic(segmentProgress(progress, 0.0, 0.15));
  const mascotScale = 0.8 + 0.2 * easeOutBack(segmentProgress(progress, 0.0, 0.22));
  const floatY = Math.sin(totalTimeMs / 440) * 5;
  drawSoftGlow(ctx, cx, 435 + floatY, 190 * mascotAlpha, 'rgba(212, 255, 0, 0.12)');
  drawMascotMedallion(
    ctx,
    images.mascot,
    cx,
    435 + floatY,
    76,
    mascotAlpha,
    mascotScale,
    Math.sin(totalTimeMs / 700) * 0.03,
    '؟'
  );

  // Headline
  const textEnter = easeOutCubic(segmentProgress(progress, 0.05, 0.26));
  if (textEnter > 0.01) {
    drawMixedRtlParagraph(
      ctx,
      [
        [{ text: 'كم دورة برمجية بدأتها...', color: SARB_COLORS.white, bold: true }],
        [
          { text: 'وتوقفت في ', color: SARB_COLORS.white, bold: true },
          { text: 'منتصف الطريق؟', color: SARB_COLORS.volt, bold: true },
        ],
      ],
      cx,
      605 + (1 - textEnter) * 20,
      72,
      46,
      textEnter
    );
  }

  // Three stalled course cards with live progress bars freezing midway
  const courses = [
    {
      title: 'دورة أساسيات البرمجة — 42 ساعة',
      reason: 'حشو نظري طويل',
      targetPct: 0.38,
      enterStart: 0.18,
      y: 790,
      seed: 201,
    },
    {
      title: 'مسار تطوير الويب الشامل',
      reason: 'تشتت بين المصادر',
      targetPct: 0.26,
      enterStart: 0.34,
      y: 980,
      seed: 202,
    },
    {
      title: 'كورس مشاريع متقدمة',
      reason: 'توقف قبل التطبيق',
      targetPct: 0.14,
      enterStart: 0.5,
      y: 1170,
      seed: 203,
    },
  ];

  courses.forEach((course, idx) => {
    const enter = easeOutBack(segmentProgress(progress, course.enterStart, course.enterStart + 0.18));
    if (enter <= 0.01) return;

    const fillT = easeOutCubic(
      segmentProgress(progress, course.enterStart + 0.06, course.enterStart + 0.28)
    );
    const stalled = progress >= course.enterStart + 0.24;
    const stallPulse = stalled ? 0.65 + 0.35 * Math.sin(totalTimeMs / 170 + idx) : 0;

    const cardW = 840;
    const cardH = 152;
    const cardX = cx - cardW / 2 + (1 - enter) * 32;
    const cardY = course.y;

    ctx.save();
    ctx.globalAlpha = clamp01(enter);

    ctx.fillStyle = SARB_COLORS.darkSurface;
    ctx.strokeStyle = stalled
      ? `rgba(255, 92, 92, ${0.45 + 0.35 * stallPulse})`
      : SARB_COLORS.borderStrong;
    ctx.lineWidth = 2.5;
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 22);
    ctx.fill();
    ctx.stroke();

    // Left pause / warning badge
    const badgeX = cardX + 64;
    const badgeY = cardY + cardH / 2;
    drawStatusIcon(
      ctx,
      'warning',
      badgeX,
      badgeY - 8,
      24,
      stalled ? SARB_COLORS.error : SARB_COLORS.warning,
      1
    );

    const shownPct = Math.round(course.targetPct * 100 * fillT);
    ctx.direction = 'ltr';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = stalled ? SARB_COLORS.error : SARB_COLORS.warning;
    ctx.font = '700 20px "JetBrains Mono", monospace';
    ctx.fillText(`${shownPct}%`, badgeX, badgeY + 32);

    // Course title (RTL)
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.fillStyle = SARB_COLORS.white;
    ctx.font = '700 31px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(course.title, cardX + cardW - 36, cardY + 46);

    // Reason pill on right
    ctx.fillStyle = 'rgba(255, 92, 92, 0.14)';
    drawRoundedRect(ctx, cardX + cardW - 246, cardY + 76, 210, 34, 17);
    ctx.fill();
    ctx.fillStyle = SARB_COLORS.error;
    ctx.font = '700 20px "IBM Plex Sans Arabic", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(course.reason, cardX + cardW - 141, cardY + 93);

    // Progress track stalling mid-way
    const barX = cardX + 126;
    const barY = cardY + 86;
    const barW = 440;
    const barH = 14;
    ctx.fillStyle = SARB_COLORS.extremeBlack;
    drawRoundedRect(ctx, barX, barY, barW, barH, 7);
    ctx.fill();

    const fillW = Math.max(12, barW * course.targetPct * fillT);
    ctx.fillStyle = stalled ? SARB_COLORS.error : SARB_COLORS.volt;
    drawRoundedRect(ctx, barX, barY, fillW, barH, 7);
    ctx.fill();

    // Stop marker line at stall point
    if (stalled) {
      ctx.strokeStyle = SARB_COLORS.white;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(barX + fillW, barY - 6);
      ctx.lineTo(barX + fillW, barY + barH + 6);
      ctx.stroke();
    }

    ctx.restore();

    if (stalled) {
      const waveT = segmentProgress(
        progress,
        course.enterStart + 0.24,
        course.enterStart + 0.44
      );
      drawParticleBurst(ctx, badgeX, badgeY, waveT, 6, 55, SARB_COLORS.error, course.seed);
    }
  });

  // Bottom Hook Punchline
  const botA = easeOutCubic(segmentProgress(progress, 0.72, 0.92));
  if (botA > 0.01) {
    drawMixedRtlParagraph(
      ctx,
      [
        [
          { text: 'بسبب ', color: SARB_COLORS.grayHint },
          { text: 'الحشو والتشتت', color: SARB_COLORS.error, bold: true },
          { text: ' بلا مسار واضح', color: SARB_COLORS.grayHint },
        ],
      ],
      cx,
      1415 + (1 - botA) * 16,
      44,
      32,
      botA
    );
  }
}

// ============================================================================
// SCENE 2: DIAGNOSIS — Not Your Ability, It's The Traditional Method
// "المشكلة ليست في قدرتك على التعلم، المشكلة في الطريقة التقليدية التي تستهلك وقتك دون نتيجة عملية."
// ============================================================================
function renderScene2TraditionalProblem(
  ctx: CanvasRenderingContext2D,
  progress: number,
  totalTimeMs: number
): void {
  const cx = REEL_DIMENSIONS.width / 2;

  // Section header
  const headA = easeOutCubic(segmentProgress(progress, 0.0, 0.18));
  if (headA > 0.01) {
    ctx.save();
    ctx.globalAlpha = headA;
    ctx.translate(0, (1 - headA) * 18);

    ctx.fillStyle = SARB_COLORS.stackPurple;
    drawRoundedRect(ctx, cx - 150, 355, 300, 42, 21);
    ctx.fill();

    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = SARB_COLORS.extremeBlack;
    ctx.font = '700 22px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('حقيقة مهمّة', cx, 376);

    ctx.fillStyle = SARB_COLORS.white;
    ctx.font = '700 44px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('أين تكمن المشكلة الحقيقية؟', cx, 438);
    ctx.restore();
  }

  // Card 1: Your learning capability is NOT the issue (Green check)
  const capA = easeOutBack(segmentProgress(progress, 0.08, 0.3));
  if (capA > 0.01) {
    const cardW = 840;
    const cardH = 195;
    const cardX = cx - cardW / 2;
    const cardY = 520 + (1 - capA) * 20;

    drawSoftGlow(ctx, cx, cardY + cardH / 2, 240 * capA, 'rgba(61, 220, 132, 0.12)');
    ctx.save();
    ctx.globalAlpha = clamp01(capA);
    ctx.fillStyle = SARB_COLORS.darkSurface;
    ctx.strokeStyle = SARB_COLORS.success;
    ctx.lineWidth = 2.8;
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 24);
    ctx.fill();
    ctx.stroke();

    drawStatusIcon(ctx, 'success', cardX + 82, cardY + cardH / 2, 34, SARB_COLORS.success, 1);

    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = SARB_COLORS.success;
    ctx.font = '700 24px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('قدرتك على التعلّم سليمة 100%', cardX + cardW - 40, cardY + 56);

    ctx.fillStyle = SARB_COLORS.white;
    ctx.font = '700 36px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('المشكلة ليست في ذكائك أو قدرتك', cardX + cardW - 40, cardY + 122);
    ctx.restore();
  }

  // Card 2: The Traditional Method draining time with zero practical output
  const trapA = easeOutCubic(segmentProgress(progress, 0.32, 0.56));
  const drainT = easeInOutCubic(segmentProgress(progress, 0.42, 0.94));
  if (trapA > 0.01) {
    const cardW = 840;
    const cardH = 540;
    const cardX = cx - cardW / 2;
    const cardY = 765 + (1 - trapA) * 24;

    drawSoftGlow(ctx, cx, cardY + cardH / 2, 290 * trapA, 'rgba(255, 92, 92, 0.13)');

    ctx.save();
    ctx.globalAlpha = trapA;
    ctx.fillStyle = SARB_COLORS.darkSurface;
    ctx.strokeStyle = SARB_COLORS.error;
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 28);
    ctx.fill();
    ctx.stroke();

    // Card header badge
    ctx.fillStyle = 'rgba(255, 92, 92, 0.16)';
    drawRoundedRect(ctx, cx - 190, cardY + 28, 380, 44, 22);
    ctx.fill();
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = SARB_COLORS.error;
    ctx.font = '700 24px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('الطريقة التقليدية', cx, cardY + 50);

    // Tangled loop diagram representing endless wasted theory
    const loopCy = cardY + 215;
    ctx.save();
    ctx.translate(cx, loopCy);
    const orbitRot = (totalTimeMs / 900) % (Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 92, 92, 0.45)';
    ctx.lineWidth = 4;
    ctx.setLineDash([14, 12]);
    ctx.beginPath();
    ctx.ellipse(0, 0, 235, 86, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3 orbiting clutter nodes
    const nodes = [
      { label: 'حشو نظري', offset: 0 },
      { label: 'ساعات ضائعة', offset: (Math.PI * 2) / 3 },
      { label: 'تشتت مستمر', offset: (Math.PI * 4) / 3 },
    ];
    nodes.forEach((n) => {
      const ang = orbitRot + n.offset;
      const nx = Math.cos(ang) * 235;
      const ny = Math.sin(ang) * 86;
      ctx.fillStyle = SARB_COLORS.elevatedSurface;
      ctx.strokeStyle = SARB_COLORS.error;
      ctx.lineWidth = 2;
      drawRoundedRect(ctx, nx - 82, ny - 24, 164, 48, 24);
      ctx.fill();
      ctx.stroke();

      ctx.direction = 'rtl';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = SARB_COLORS.white;
      ctx.font = '600 20px "IBM Plex Sans Arabic", sans-serif';
      ctx.fillText(n.label, nx, ny + 1);
    });

    // Center time drain counter
    const hoursLost = Math.round(drainT * 120);
    ctx.direction = 'ltr';
    ctx.fillStyle = SARB_COLORS.error;
    ctx.font = '700 44px "JetBrains Mono", monospace';
    ctx.fillText(`${hoursLost}h`, 0, -10);
    ctx.direction = 'rtl';
    ctx.fillStyle = SARB_COLORS.grayHint;
    ctx.font = '600 20px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('وقت مستهلك', 0, 28);
    ctx.restore();

    // Two gauges at bottom of card: Time Consumed (100%) vs Practical Result (0%)
    const barW = 700;
    const barX = cx - barW / 2;

    // Gauge 1: Time drained
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.fillStyle = SARB_COLORS.white;
    ctx.font = '700 24px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('استهلاك الوقت والجهد', barX + barW, cardY + 356);

    ctx.fillStyle = SARB_COLORS.extremeBlack;
    drawRoundedRect(ctx, barX, cardY + 378, barW, 18, 9);
    ctx.fill();
    ctx.fillStyle = SARB_COLORS.error;
    drawRoundedRect(ctx, barX, cardY + 378, Math.max(18, barW * drainT), 18, 9);
    ctx.fill();

    // Gauge 2: Practical result
    ctx.fillStyle = SARB_COLORS.white;
    ctx.fillText('النتيجة العملية وبناء المشاريع', barX + barW, cardY + 438);
    ctx.direction = 'ltr';
    ctx.textAlign = 'left';
    ctx.fillStyle = SARB_COLORS.error;
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.fillText('0% RESULT', barX, cardY + 438);

    ctx.fillStyle = SARB_COLORS.extremeBlack;
    drawRoundedRect(ctx, barX, cardY + 462, barW, 18, 9);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 92, 92, 0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }
}

// ============================================================================
// SCENE 3: SARB ARRIVAL — Your Shortcut to True Programming Mastery
// "هنا تأتي سَرب. لسنا مجرد منصة أخرى، نحن مسارك المختصر لإتقان البرمجة الحقيقية."
// ============================================================================
function renderScene3SarbShortcut(
  ctx: CanvasRenderingContext2D,
  progress: number,
  totalTimeMs: number,
  images: LoadedBrandImages
): void {
  const cx = REEL_DIMENSIONS.width / 2;

  const arrivalT = easeOutBack(segmentProgress(progress, 0.0, 0.25));
  const waveT = segmentProgress(progress, 0.08, 0.38);

  // Hero Volt Glow + Shockwave + Sarb Flock
  drawSoftGlow(ctx, cx, 470, 320 * clamp01(arrivalT), 'rgba(212, 255, 0, 0.16)');
  drawShockwave(ctx, cx, 470, waveT, 240, SARB_COLORS.volt);
  drawParticleBurst(ctx, cx, 470, waveT, 12, 160, SARB_COLORS.volt, 303);

  const flockA = easeOutCubic(segmentProgress(progress, 0.02, 0.2));
  drawSarbFlock(ctx, cx, 368, 0.95, flockA, totalTimeMs / 240);

  if (arrivalT > 0.01) {
    ctx.save();
    ctx.globalAlpha = clamp01(arrivalT);
    ctx.translate(cx, 485);
    ctx.scale(0.86 + 0.14 * arrivalT, 0.86 + 0.14 * arrivalT);

    if (images.logoOnDark && images.logoOnDark.naturalWidth > 0) {
      const aspect = images.logoOnDark.naturalHeight / images.logoOnDark.naturalWidth;
      const targetW = 360;
      const targetH = targetW * aspect;
      ctx.drawImage(images.logoOnDark, -targetW / 2, -targetH / 2, targetW, targetH);
    } else {
      ctx.direction = 'rtl';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = SARB_COLORS.volt;
      ctx.font = '700 64px "IBM Plex Sans Arabic", sans-serif';
      ctx.fillText('سَرب', 0, 0);
    }
    ctx.restore();
  }

  // Manifesto headline
  const titleA = easeOutCubic(segmentProgress(progress, 0.14, 0.34));
  if (titleA > 0.01) {
    drawMixedRtlParagraph(
      ctx,
      [
        [{ text: 'لسنا مجرد منصة أخرى...', color: SARB_COLORS.grayHint }],
        [
          { text: 'نحن ', color: SARB_COLORS.white, bold: true },
          { text: 'مسارك المختصر', color: SARB_COLORS.volt, bold: true },
          { text: ' لإتقان البرمجة', color: SARB_COLORS.white, bold: true },
        ],
      ],
      cx,
      625 + (1 - titleA) * 18,
      68,
      42,
      titleA
    );
  }

  // Visual Shortcut Diagram Card (y: 760 -> 1360)
  const mapA = easeOutCubic(segmentProgress(progress, 0.28, 0.5));
  const raceT = easeInOutCubic(segmentProgress(progress, 0.44, 0.9));

  if (mapA > 0.01) {
    const cardW = 860;
    const cardH = 590;
    const cardX = cx - cardW / 2;
    const cardY = 765 + (1 - mapA) * 24;

    ctx.save();
    ctx.globalAlpha = mapA;
    ctx.fillStyle = SARB_COLORS.darkSurface;
    ctx.strokeStyle = SARB_COLORS.borderStrong;
    ctx.lineWidth = 2.5;
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 28);
    ctx.fill();
    ctx.stroke();

    // Top row: Long winding wasted path
    const startX = cardX + cardW - 115; // RTL start (right)
    const endX = cardX + 115; // target (left)
    const messyY = cardY + 150;

    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = SARB_COLORS.error;
    ctx.font = '700 24px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('الطريق التقليدي: دورات متفرقة وتشتت', cardX + cardW - 44, cardY + 58);

    ctx.strokeStyle = 'rgba(255, 92, 92, 0.5)';
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 10]);
    ctx.beginPath();
    ctx.moveTo(startX, messyY);
    ctx.bezierCurveTo(
      startX - 130,
      messyY - 95,
      startX - 240,
      messyY + 110,
      cx,
      messyY - 60
    );
    ctx.bezierCurveTo(
      cx - 140,
      messyY - 110,
      endX + 120,
      messyY + 100,
      endX + 40,
      messyY + 18
    );
    ctx.stroke();
    ctx.setLineDash([]);

    // Stalled dot along traditional path
    ctx.fillStyle = SARB_COLORS.error;
    ctx.beginPath();
    ctx.arc(cx - 35, messyY - 58, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = SARB_COLORS.grayMuted;
    ctx.font = '600 20px "IBM Plex Sans Arabic", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('توقف وتشتت', cx - 35, messyY - 22);

    // Divider line
    ctx.strokeStyle = SARB_COLORS.borderSubtle;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cardX + 44, cardY + 295);
    ctx.lineTo(cardX + cardW - 44, cardY + 295);
    ctx.stroke();

    // Bottom row: Sarb Direct Express Route (RTL right -> left)
    const directY = cardY + 455;
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.fillStyle = SARB_COLORS.volt;
    ctx.font = '700 26px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('مسار سَرب المختصر: خطوة واضحة للنتيجة', cardX + cardW - 44, cardY + 350);

    // Base track
    ctx.strokeStyle = SARB_COLORS.elevatedSurface;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(startX, directY);
    ctx.lineTo(endX, directY);
    ctx.stroke();

    // Animated Volt express beam
    const currentX = startX - (startX - endX) * raceT;
    ctx.strokeStyle = SARB_COLORS.volt;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(startX, directY);
    ctx.lineTo(currentX, directY);
    ctx.stroke();

    // Start node
    ctx.fillStyle = SARB_COLORS.stackPurple;
    ctx.beginPath();
    ctx.arc(startX, directY, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = SARB_COLORS.white;
    ctx.textAlign = 'center';
    ctx.font = '700 20px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('البداية', startX, directY + 44);

    // Moving racer spark
    drawSoftGlow(ctx, currentX, directY, 55, 'rgba(212, 255, 0, 0.35)');
    ctx.fillStyle = SARB_COLORS.volt;
    ctx.beginPath();
    ctx.arc(currentX, directY, 16, 0, Math.PI * 2);
    ctx.fill();

    // Destination node (Mastery)
    const arrived = raceT >= 0.94;
    ctx.fillStyle = arrived ? SARB_COLORS.volt : SARB_COLORS.darkSurface;
    ctx.strokeStyle = SARB_COLORS.volt;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(endX, directY, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = arrived ? SARB_COLORS.extremeBlack : SARB_COLORS.volt;
    ctx.font = '700 22px "IBM Plex Sans", sans-serif';
    ctx.fillText('PRO', endX, directY + 1);

    ctx.fillStyle = SARB_COLORS.volt;
    ctx.font = '700 22px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('إتقان حقيقي', endX, directY + 52);

    ctx.restore();

    if (arrived) {
      const hitT = segmentProgress(progress, 0.86, 1.0);
      drawShockwave(ctx, endX, directY, hitT, 120, SARB_COLORS.volt);
    }
  }
}

// ============================================================================
// SCENE 4: THE 3 CORE PILLARS — Visual Clarity, Real Projects, Zero Fluff
// "نقدّم لك مفاهيم معقدة بتبسيط بصري يرسخ في ذهنك فوراً، ومشاريع من واقع العمل لتفكر كمهندس برمجيات، ومساراً تعليمياً مباشراً يحترم وقتك بلا حشو."
// ============================================================================
function renderScene4ThreePillars(
  ctx: CanvasRenderingContext2D,
  progress: number,
  totalTimeMs: number
): void {
  const cx = REEL_DIMENSIONS.width / 2;

  // Section header
  const headA = easeOutCubic(segmentProgress(progress, 0.0, 0.14));
  if (headA > 0.01) {
    ctx.save();
    ctx.globalAlpha = headA;
    ctx.fillStyle = SARB_COLORS.volt;
    drawRoundedRect(ctx, cx - 155, 345, 310, 42, 21);
    ctx.fill();

    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = SARB_COLORS.extremeBlack;
    ctx.font = '700 22px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('منهجية سَرب', cx, 366);

    ctx.fillStyle = SARB_COLORS.white;
    ctx.font = '700 42px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('كيف نُعلّمك في سَرب؟', cx, 428);
    ctx.restore();
  }

  const pillars = [
    {
      num: '01',
      title: 'تبسيط بصري لمفاهيم معقدة',
      subtitle: 'موشن جرافيك واضح يرسخ في ذهنك فوراً',
      tag: 'VISUAL CLARITY',
      accent: SARB_COLORS.volt,
      start: 0.04,
      end: 0.36,
      y: 500,
    },
    {
      num: '02',
      title: 'مشاريع من واقع العمل',
      subtitle: 'تبني أنظمة حقيقية لتفكّر كمهندس برمجيات',
      tag: 'REAL ENGINEERING',
      accent: SARB_COLORS.stackPurple,
      start: 0.34,
      end: 0.68,
      y: 805,
    },
    {
      num: '03',
      title: 'مسار مباشر يحترم وقتك',
      subtitle: 'كل دقيقة مركّزة على المهارة — بلا حشو',
      tag: 'ZERO FLUFF',
      accent: SARB_COLORS.volt,
      start: 0.66,
      end: 1.0,
      y: 1110,
    },
  ];

  pillars.forEach((p, idx) => {
    const enter = easeOutBack(segmentProgress(progress, p.start, p.start + 0.14));
    if (enter <= 0.01) return;

    const isFocused = progress >= p.start && (progress < p.end || idx === pillars.length - 1);
    const focusBoost = isFocused ? 1 : 0.72;

    const cardW = 860;
    const cardH = 265;
    const cardX = cx - cardW / 2;
    const cardY = p.y + (1 - enter) * 26;

    if (isFocused) {
      drawSoftGlow(
        ctx,
        cx,
        cardY + cardH / 2,
        250,
        p.accent === SARB_COLORS.volt
          ? 'rgba(212, 255, 0, 0.12)'
          : 'rgba(167, 139, 250, 0.14)'
      );
    }

    ctx.save();
    ctx.globalAlpha = clamp01(enter * focusBoost);

    ctx.fillStyle = SARB_COLORS.darkSurface;
    ctx.strokeStyle = isFocused ? p.accent : SARB_COLORS.borderStrong;
    ctx.lineWidth = isFocused ? 3.2 : 2;
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 26);
    ctx.fill();
    ctx.stroke();

    // Right Number Pill
    ctx.fillStyle = p.accent;
    drawRoundedRect(ctx, cardX + cardW - 110, cardY + 34, 74, 46, 14);
    ctx.fill();

    ctx.direction = 'ltr';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = SARB_COLORS.extremeBlack;
    ctx.font = '700 24px "JetBrains Mono", monospace';
    ctx.fillText(p.num, cardX + cardW - 73, cardY + 58);

    // English Tag
    ctx.textAlign = 'right';
    ctx.fillStyle = p.accent;
    ctx.font = '600 20px "JetBrains Mono", monospace';
    ctx.fillText(p.tag, cardX + cardW - 130, cardY + 58);

    // Arabic Title & Subtitle (Right-aligned)
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.fillStyle = SARB_COLORS.white;
    ctx.font = '700 36px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(p.title, cardX + cardW - 36, cardY + 132);

    ctx.fillStyle = SARB_COLORS.grayHint;
    ctx.font = '600 25px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(p.subtitle, cardX + cardW - 36, cardY + 194);

    // Left compact visual icon box (x: cardX+26 .. cardX+226)
    const boxX = cardX + 26;
    const boxY = cardY + 26;
    const boxW = 200;
    const boxH = cardH - 52;
    ctx.fillStyle = SARB_COLORS.extremeBlack;
    ctx.strokeStyle = SARB_COLORS.borderSubtle;
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 18);
    ctx.fill();
    ctx.stroke();

    const iconCx = boxX + boxW / 2;
    const iconCy = boxY + boxH / 2;

    if (idx === 0) {
      // Visual clarity nodes turning clean
      const pulse = 0.75 + 0.25 * Math.sin(totalTimeMs / 240);
      ctx.strokeStyle = p.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(iconCx - 42, iconCy - 28);
      ctx.lineTo(iconCx, iconCy + 28);
      ctx.lineTo(iconCx + 42, iconCy - 28);
      ctx.closePath();
      ctx.stroke();

      [
        { x: iconCx - 42, y: iconCy - 28 },
        { x: iconCx + 42, y: iconCy - 28 },
        { x: iconCx, y: iconCy + 28 },
      ].forEach((pt, nIdx) => {
        ctx.fillStyle = nIdx === 2 ? SARB_COLORS.volt : SARB_COLORS.white;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 11 * (nIdx === 2 ? pulse : 1), 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (idx === 1) {
      // Real Engineering Terminal / Architecture Card
      ctx.fillStyle = SARB_COLORS.darkSurface;
      ctx.strokeStyle = p.accent;
      ctx.lineWidth = 2.5;
      drawRoundedRect(ctx, iconCx - 58, iconCy - 44, 116, 88, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = p.accent;
      ctx.font = '700 22px "JetBrains Mono", monospace';
      ctx.direction = 'ltr';
      ctx.textAlign = 'center';
      ctx.fillText('</>', iconCx, iconCy - 10);

      const barPulse = 0.55 + 0.45 * Math.sin(totalTimeMs / 220);
      ctx.fillStyle = SARB_COLORS.success;
      drawRoundedRect(ctx, iconCx - 38, iconCy + 16, 76 * barPulse, 8, 4);
      ctx.fill();
    } else {
      // Zero fluff direct arrow + checkmark
      ctx.strokeStyle = p.accent;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(iconCx + 46, iconCy);
      ctx.lineTo(iconCx - 36, iconCy);
      ctx.moveTo(iconCx - 16, iconCy - 22);
      ctx.lineTo(iconCx - 38, iconCy);
      ctx.lineTo(iconCx - 16, iconCy + 22);
      ctx.stroke();

      ctx.fillStyle = SARB_COLORS.success;
      ctx.beginPath();
      ctx.arc(iconCx + 46, iconCy, 9, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  });
}

// ============================================================================
// SCENE 5: OUTRO PHASE A — Build Your Tech Future Smartly
// "سَرب صُنعت لتبني مستقبلك البرمجي بذكاء. تابع سَرب... ونراك في الدرس القادم."
// ============================================================================
function renderScene5BrandOutroPhaseA(
  ctx: CanvasRenderingContext2D,
  progress: number
): void {
  const cx = REEL_DIMENSIONS.width / 2;

  const part1Fade = 1 - easeInOutCubic(segmentProgress(progress, 0.28, 0.38));
  if (part1Fade <= 0.01) return;

  ctx.save();
  ctx.globalAlpha = part1Fade;

  const chips = [
    { label: 'تبسيط بصري', color: SARB_COLORS.volt },
    { label: 'مشاريع حقيقية', color: SARB_COLORS.stackPurple },
    { label: 'بلا حشو', color: SARB_COLORS.volt },
  ];

  const chipW = 220;
  const gap = 24;
  const totalW = chips.length * chipW + (chips.length - 1) * gap;
  const startX = cx - totalW / 2;

  chips.forEach((chip, idx) => {
    const px = startX + idx * (chipW + gap);
    const py = 570;
    ctx.fillStyle = SARB_COLORS.darkSurface;
    ctx.strokeStyle = chip.color;
    ctx.lineWidth = 2.4;
    drawRoundedRect(ctx, px, py, chipW, 52, 26);
    ctx.fill();
    ctx.stroke();

    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = chip.color;
    ctx.font = '700 22px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(chip.label, px + chipW / 2, py + 26);
  });

  drawStatusIcon(ctx, 'success', cx, 730, 48, SARB_COLORS.success, 1);

  drawMixedRtlParagraph(
    ctx,
    [
      [{ text: 'سَرب صُنعت لتبني', color: SARB_COLORS.white, bold: true }],
      [{ text: 'مستقبلك البرمجي بذكاء.', color: SARB_COLORS.volt, bold: true }],
    ],
    cx,
    870,
    80,
    50,
    1
  );

  ctx.restore();
}
