import { FONT_MONO, POST_COLORS, drawCategoryBadge, drawMono, drawRichText, drawSyntaxCodeLine, fontSpec, rrect, type Box, type Ctx, type PostBrandOptions, type PostFields, type PostSize, type PostTemplate } from './postEngine';

export interface CarouselSlide {
  id: string;
  tplId: string;
  data: Record<string, string>;
}

function drawLayer(ctx: Ctx, content: (c: Ctx) => number, paintUnder: (h: number) => void) {
  const cv = document.createElement('canvas');
  cv.width = ctx.canvas.width;
  cv.height = ctx.canvas.height;
  const c = cv.getContext('2d')!;
  const h = content(c);
  paintUnder(h);
  ctx.drawImage(cv, 0, 0);
  return h;
}

const splitLines = (s: string) =>
  s
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

const splitPair = (l: string) => {
  const [a = '', ...b] = l.split('|');
  return [a.trim(), b.join('|').trim()] as const;
};

function resolveCodeScale(scale: PostBrandOptions['codeFontScale']): number {
  if (scale === 'sm') return 0.86;
  if (scale === 'lg') return 1.16;
  return 1;
}

function drawSectionHeader(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  label: string,
  title: string,
  u: number,
  body?: string,
  accent: 'volt' | 'purple' = 'volt',
  align: 'right' | 'center' = 'right'
) {
  let cy = y;
  const badgeAnchor = align === 'center' ? x + w / 2 + 80 * u : x + w;
  if (align === 'center') {
    ctx.font = fontSpec(600, 22 * u);
    const bw = ctx.measureText(label).width + 48 * u;
    cy += drawCategoryBadge(ctx, label, x + (w + bw) / 2, cy, u, accent) + 26 * u;
  } else {
    void badgeAnchor;
    cy += drawCategoryBadge(ctx, label, x + w, cy, u, accent) + 26 * u;
  }

  cy += drawRichText(ctx, title, x, cy, w, {
    size: 62 * u,
    weight: 700,
    lh: 1.35,
    maxLines: 3,
    align,
  });

  if (body?.trim()) {
    cy += 16 * u;
    cy += drawRichText(ctx, body, x, cy, w, {
      size: 29 * u,
      color: POST_COLORS.dim,
      lh: 1.62,
      maxLines: 4,
      align,
    });
  }
  return cy;
}

function drawCodeWindow(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  code: string,
  lang: string,
  u: number,
  opts: PostBrandOptions
): number {
  const codeLines = code.split('\n').slice(0, 7);
  const scale = resolveCodeScale(opts.codeFontScale);
  const size = 24 * scale * u;
  const lh = size * 1.72;
  const topBarH = 58 * u;
  const h = topBarH + codeLines.length * lh + 30 * u;

  rrect(ctx, x, y, w, h, 22 * u, POST_COLORS.surfaceCode, POST_COLORS.faintStrong, 1.5 * u);

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, topBarH, [22 * u, 22 * u, 0, 0]);
  ctx.fillStyle = POST_COLORS.surface;
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = POST_COLORS.faint;
  ctx.fillRect(x, y + topBarH, w, 1.5 * u);

  const dotR = 5.5 * u;
  const dotY = y + topBarH / 2;
  [0, 1, 2].forEach((idx) => {
    ctx.beginPath();
    ctx.arc(x + w - 30 * u - idx * 20 * u, dotY, dotR, 0, Math.PI * 2);
    ctx.fillStyle = idx === 0 ? 'rgba(212, 255, 0, 0.45)' : 'rgba(255, 255, 255, 0.14)';
    ctx.fill();
  });

  drawMono(ctx, lang.trim() || 'code', x + 28 * u, dotY, 19 * u, POST_COLORS.volt, w * 0.45, 600);

  const codeStartX = opts.showLineNumbers ? x + 68 * u : x + 28 * u;
  const codeMaxW = opts.showLineNumbers ? w - 96 * u : w - 56 * u;

  codeLines.forEach((line, i) => {
    const lineY = y + topBarH + 15 * u + lh * i + lh / 2;
    if (opts.showLineNumbers) {
      const lnLabel = String(i + 1).padStart(2, '0');
      drawMono(ctx, lnLabel, x + 26 * u, lineY, 18 * u, 'rgba(255, 255, 255, 0.24)', undefined, 500);
    }
    drawSyntaxCodeLine(ctx, line, codeStartX, lineY, size, codeMaxW);
  });

  return h;
}

const quick: PostTemplate = {
  id: 'quick',
  label: 'معلومة سريعة',
  subtitle: 'عنوان قوي وشرح مركز مع مثال كود اختياري',
  fields: [
    { key: 'title', label: 'العنوان', kind: 'area', hint: 'ضع الكلمة المميزة بين *نجمتين*' },
    { key: 'body', label: 'الشرح', kind: 'area' },
    { key: 'lang', label: 'لغة الكود', kind: 'text' },
    { key: 'code', label: 'الكود (اختياري)', kind: 'code' },
  ],
  defaults: {
    title: '*Promise.allSettled* في Node.js',
    body: 'ينتظر عدة عمليات معًا، ولا يوقف الباقي إذا فشلت واحدة منها.',
    lang: 'JavaScript',
    code: 'const results = await Promise.allSettled([\n  fetchUser(), fetchPosts()\n]);\n// each result: fulfilled or rejected',
  },
  draw(ctx, b, d, u, W, H, opts) {
    const isLandscape = W > H * 1.35 && Boolean(d.code?.trim());
    if (isLandscape) {
      const gap = 46 * u;
      const codeW = b.w * 0.5;
      const textW = b.w - codeW - gap;
      const textX = b.x + codeW + gap;
      const endTextY = drawSectionHeader(ctx, textX, b.y, textW, 'معلومة سريعة', d.title, u, d.body, 'volt', 'right');
      const codeH = drawCodeWindow(ctx, b.x, b.y + 8 * u, codeW, d.code, d.lang, u, opts);
      return Math.max(endTextY - b.y, codeH + 8 * u);
    }

    const align = d.code?.trim() ? 'right' : opts.textAlign;
    let y = drawSectionHeader(ctx, b.x, b.y, b.w, 'معلومة سريعة', d.title, u, d.body, 'volt', align);
    if (d.code?.trim()) {
      y += 38 * u;
      y += drawCodeWindow(ctx, b.x, y, b.w, d.code, d.lang, u, opts);
    }
    return y - b.y;
  },
};

const commands: PostTemplate = {
  id: 'commands',
  label: 'اختصارات وأوامر',
  subtitle: 'قائمة أوامر تقنية منظمة مع شرح لكل أمر',
  fields: [
    { key: 'title', label: 'العنوان', kind: 'area' },
    { key: 'items', label: 'الأوامر (أمر | وظيفته) سطر لكل أمر', kind: 'code' },
  ],
  defaults: {
    title: 'أوامر *Git* تحتاجها يوميًا',
    items:
      'git stash | يحفظ تعديلاتك مؤقتًا\ngit log --oneline | يعرض السجل باختصار\ngit rebase | يرتّب التعديلات فوق الفرع',
  },
  draw(ctx, b, d, u, W, H) {
    const items = splitLines(d.items).slice(0, 5);
    const isLandscape = W > H * 1.35;

    const drawCommandList = (lx: number, ly: number, lw: number) => {
      let cy = ly;
      for (const it of items) {
        const [cmd, desc] = splitPair(it);
        const top = cy;
        const pad = 22 * u;
        const cardH = drawLayer(
          ctx,
          (c) => {
            const cmdBlockW = Math.min(lw * 0.48, 390 * u);
            const rowY = top + pad;

            c.font = fontSpec(600, 22 * u, FONT_MONO);
            const cmdMeasured = Math.min(c.measureText(cmd).width + 54 * u, cmdBlockW);
            const chipH = 50 * u;
            rrect(
              c,
              lx + pad,
              rowY,
              cmdMeasured,
              chipH,
              14 * u,
              POST_COLORS.surfaceCode,
              POST_COLORS.voltBorder,
              1.3 * u
            );
            drawMono(c, '$', lx + pad + 16 * u, rowY + chipH / 2, 20 * u, POST_COLORS.volt, undefined, 700);
            drawMono(
              c,
              cmd,
              lx + pad + 38 * u,
              rowY + chipH / 2,
              21 * u,
              POST_COLORS.white,
              cmdMeasured - 52 * u,
              600
            );

            const descX = lx + pad + cmdMeasured + 20 * u;
            const descW = lx + lw - pad - 14 * u - descX;
            const dh = drawRichText(c, desc, descX, rowY + 6 * u, descW, {
              size: 24 * u,
              color: POST_COLORS.gray,
              lh: 1.44,
              maxLines: 2,
              minSize: 18 * u,
            });

            return Math.max(chipH, dh + 10 * u) + pad * 2;
          },
          (hh) => {
            rrect(ctx, lx, top, lw, hh, 18 * u, POST_COLORS.surface, POST_COLORS.faint, 1.4 * u);
            ctx.beginPath();
            ctx.arc(lx + lw - 16 * u, top + hh / 2, 4 * u, 0, Math.PI * 2);
            ctx.fillStyle = POST_COLORS.volt;
            ctx.fill();
          }
        );

        cy += cardH + 14 * u;
      }
      return items.length > 0 ? cy - 14 * u - ly : 0;
    };

    if (isLandscape) {
      const gap = 46 * u;
      const listW = b.w * 0.6;
      const headW = b.w - listW - gap;
      const headX = b.x + listW + gap;
      const endHeadY = drawSectionHeader(
        ctx,
        headX,
        b.y,
        headW,
        'اختصارات وأوامر',
        d.title,
        u,
        `${items.length} أوامر عملية تختصر وقتك في سطر الأوامر.`
      );
      const listH = drawCommandList(b.x, b.y, listW);
      return Math.max(endHeadY - b.y, listH);
    }

    const startListY = drawSectionHeader(ctx, b.x, b.y, b.w, 'اختصارات وأوامر', d.title, u) + 34 * u;
    const listH = drawCommandList(b.x, startListY, b.w);
    return startListY + listH - b.y;
  },
};

const compare: PostTemplate = {
  id: 'compare',
  label: 'فرق بين مفهومين',
  subtitle: 'مقارنة ثنائية واضحة بين مفهومين برمجيين',
  fields: [
    { key: 'title', label: 'العنوان', kind: 'area' },
    { key: 'aName', label: 'المفهوم الأول', kind: 'text' },
    { key: 'aQ', label: 'سؤاله', kind: 'text' },
    { key: 'aDesc', label: 'شرحه', kind: 'area' },
    { key: 'bName', label: 'المفهوم الثاني', kind: 'text' },
    { key: 'bQ', label: 'سؤاله', kind: 'text' },
    { key: 'bDesc', label: 'شرحه', kind: 'area' },
  ],
  defaults: {
    title: 'ما *الفرق* بينهما؟',
    aName: 'Authentication',
    aQ: 'من أنت؟',
    aDesc: 'يتحقق من هويتك عند تسجيل الدخول.',
    bName: 'Authorization',
    bQ: 'ماذا يحق لك؟',
    bDesc: 'يحدد صلاحياتك بعد معرفة هويتك.',
  },
  draw(ctx, b, d, u, _W, _H, opts) {
    const y = drawSectionHeader(ctx, b.x, b.y, b.w, 'فرق بين مفهومين', d.title, u, undefined, 'volt', opts.textAlign) + 36 * u;
    const gap = 52 * u;
    const cw = (b.w - gap) / 2;
    const inner = cw - 64 * u;

    const drawColumn = (
      c: Ctx,
      x: number,
      name: string,
      q: string,
      desc: string,
      tone: 'volt' | 'purple'
    ) => {
      let cy = y + 38 * u;
      let size = 38 * u;
      c.font = fontSpec(700, size, FONT_MONO);
      while (c.measureText(name).width > inner && size > 20 * u) {
        size *= 0.94;
        c.font = fontSpec(700, size, FONT_MONO);
      }
      const nw = c.measureText(name).width;
      const accentColor = tone === 'volt' ? POST_COLORS.volt : POST_COLORS.purple;

      drawMono(c, name, x + cw - 32 * u - nw, cy + size / 2, size, accentColor, inner, 700);
      cy += size + 16 * u;

      c.fillStyle = tone === 'volt' ? 'rgba(212,255,0,0.45)' : 'rgba(167,139,250,0.45)';
      c.fillRect(x + cw - 32 * u - 54 * u, cy, 54 * u, 3 * u);
      cy += 22 * u;

      cy +=
        drawRichText(c, q, x + 32 * u, cy, inner, {
          size: 34 * u,
          weight: 700,
          lh: 1.38,
          maxLines: 2,
          voltColor: accentColor,
        }) + 14 * u;

      cy += drawRichText(c, desc, x + 32 * u, cy, inner, {
        size: 27 * u,
        color: POST_COLORS.dim,
        lh: 1.62,
        maxLines: 4,
      });

      return cy + 38 * u - y;
    };

    const ax = b.x + cw + gap;
    let h = 0;

    drawLayer(
      ctx,
      (c) => {
        h = Math.max(
          drawColumn(c, ax, d.aName, d.aQ, d.aDesc, 'volt'),
          drawColumn(c, b.x, d.bName, d.bQ, d.bDesc, 'purple')
        );
        return h;
      },
      (hh) => {
        rrect(ctx, ax, y, cw, hh, 24 * u, POST_COLORS.surface, POST_COLORS.voltBorder, 1.5 * u);
        rrect(ctx, b.x, y, cw, hh, 24 * u, POST_COLORS.surface, POST_COLORS.purpleBorder, 1.5 * u);
      }
    );

    const cx = b.x + cw + gap / 2;
    const divGrad = ctx.createLinearGradient(cx, y + 20 * u, cx, y + h - 20 * u);
    divGrad.addColorStop(0, 'rgba(212, 255, 0, 0.2)');
    divGrad.addColorStop(0.5, POST_COLORS.volt);
    divGrad.addColorStop(1, 'rgba(167, 139, 250, 0.25)');
    ctx.fillStyle = divGrad;
    ctx.fillRect(cx - 1 * u, y + 20 * u, 2 * u, h - 40 * u);

    rrect(ctx, cx - 28 * u, y + h / 2 - 28 * u, 56 * u, 56 * u, 28 * u, POST_COLORS.bg, POST_COLORS.volt, 2 * u);
    drawMono(ctx, 'VS', cx - 15 * u, y + h / 2 + 1 * u, 21 * u, POST_COLORS.volt, undefined, 700);

    return y + h - b.y;
  },
};

const tip: PostTemplate = {
  id: 'tip',
  label: 'نصيحة مهنية',
  subtitle: 'حكمة هندسية مقتبسة مع مقارنة رقمية ملفتة',
  fields: [
    { key: 'quote', label: 'النصيحة', kind: 'area' },
    { key: 'body', label: 'توضيح', kind: 'area' },
    { key: 'statA', label: 'الرقم المميز', kind: 'text' },
    { key: 'labelA', label: 'وصفه', kind: 'text' },
    { key: 'statB', label: 'الرقم المقابل', kind: 'text' },
    { key: 'labelB', label: 'وصفه', kind: 'text' },
  ],
  defaults: {
    quote: '3 مشاريع حقيقية أقوى من 20 مشروعًا تعليميًا في *Portfolio* الخاص بك',
    body: 'اختر مشاريع تحل مشكلة فعلية، واشرح قراراتك فيها.',
    statA: '3',
    labelA: 'مشاريع حقيقية',
    statB: '20',
    labelB: 'مشروع تعليمي',
  },
  draw(ctx, b, d, u, _W, _H, opts) {
    let y = b.y;
    const isCenter = opts.textAlign === 'center';

    if (isCenter) {
      ctx.font = fontSpec(600, 22 * u);
      const bw = ctx.measureText('نصيحة مهنية').width + 48 * u;
      y += drawCategoryBadge(ctx, 'نصيحة مهنية', b.x + (b.w + bw) / 2, y, u) + 18 * u;
    } else {
      y += drawCategoryBadge(ctx, 'نصيحة مهنية', b.x + b.w, y, u) + 18 * u;
    }

    ctx.font = `700 ${130 * u}px Georgia, serif`;
    ctx.fillStyle = POST_COLORS.volt;
    ctx.textBaseline = 'top';
    ctx.textAlign = isCenter ? 'center' : 'right';
    ctx.fillText('”', isCenter ? b.x + b.w / 2 : b.x + b.w, y - 10 * u);
    ctx.textAlign = 'left';
    y += 84 * u;

    const hasStats = Boolean(d.statA?.trim() || d.statB?.trim());

    y += drawRichText(ctx, d.quote, b.x, y, b.w, {
      size: (hasStats ? 56 : 64) * u,
      weight: 700,
      lh: 1.42,
      maxLines: 4,
      align: opts.textAlign,
    });

    if (d.body?.trim()) {
      y += (hasStats ? 18 : 24) * u;
      y += drawRichText(ctx, d.body, b.x, y, b.w, {
        size: (hasStats ? 29 : 32) * u,
        color: POST_COLORS.dim,
        lh: 1.62,
        maxLines: 4,
        align: opts.textAlign,
      });
    }

    if (hasStats) {
      y += 38 * u;
      const h = 152 * u;
      const cw = (b.w - 24 * u) / 2;

      const drawStatCard = (x: number, num: string, lbl: string, hi: boolean) => {
        rrect(
          ctx,
          x,
          y,
          cw,
          h,
          22 * u,
          hi ? 'rgba(212, 255, 0, 0.08)' : POST_COLORS.surface,
          hi ? 'rgba(212, 255, 0, 0.45)' : POST_COLORS.faint,
          1.5 * u
        );

        let nSize = 70 * u;
        ctx.font = fontSpec(700, nSize, FONT_MONO);
        while (ctx.measureText(num).width > cw * 0.4 && nSize > 34 * u) {
          nSize *= 0.9;
          ctx.font = fontSpec(700, nSize, FONT_MONO);
        }

        ctx.fillStyle = hi ? POST_COLORS.volt : 'rgba(230, 230, 230, 0.36)';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'right';
        ctx.fillText(num, x + cw - 30 * u, y + h / 2 + 2 * u);
        const nw = ctx.measureText(num).width;
        ctx.textAlign = 'left';

        const labelMaxW = Math.max(80 * u, cw - 78 * u - nw);
        drawRichText(ctx, lbl, x + 26 * u, y + h / 2 - 22 * u, labelMaxW, {
          size: 26 * u,
          weight: 600,
          color: hi ? POST_COLORS.white : POST_COLORS.dim,
          lh: 1.38,
          maxLines: 2,
          minSize: 18 * u,
        });
      };

      drawStatCard(b.x + cw + 24 * u, d.statA, d.labelA, true);
      drawStatCard(b.x, d.statB, d.labelB, false);
      y += h;
    }

    return y - b.y;
  },
};

const site: PostTemplate = {
  id: 'site',
  label: 'موقع مفيد',
  subtitle: 'بطاقة متصفح تبرز اسم الموقع وروابطه وأبرز مزاياه',
  fields: [
    { key: 'url', label: 'الرابط', kind: 'text' },
    { key: 'name', label: 'اسم الموقع', kind: 'text' },
    { key: 'desc', label: 'الوصف', kind: 'area' },
    { key: 'features', label: 'المزايا (سطر لكل ميزة)', kind: 'area' },
  ],
  defaults: {
    url: 'devdocs.io',
    name: 'DevDocs',
    desc: 'مرجع موحّد لجميع التوثيقات البرمجية في *مكان واحد*',
    features:
      'يعمل بدون إنترنت بعد التحميل\nبحث سريع في مئات اللغات والمكتبات\nمجاني ومفتوح المصدر',
  },
  draw(ctx, b, d, u, W, H) {
    let y = b.y;
    y += drawCategoryBadge(ctx, 'موقع مفيد', b.x + b.w, y, u) + 28 * u;

    const top = y;
    const barH = 66 * u;
    const pad = 38 * u;
    const isLandscape = W > H * 1.35;

    const h = drawLayer(
      ctx,
      (c) => {
        if (isLandscape) {
          const innerW = b.w - 2 * pad;
          const gap = 42 * u;
          const colW = (innerW - gap) / 2;
          const rightX = b.x + pad + colW + gap;
          const leftX = b.x + pad;

          let ry = top + barH + pad;
          let nameSize = 60 * u;
          c.font = fontSpec(700, nameSize, FONT_MONO);
          while (c.measureText(d.name).width > colW && nameSize > 30 * u) {
            nameSize *= 0.94;
            c.font = fontSpec(700, nameSize, FONT_MONO);
          }
          const nw = Math.min(c.measureText(d.name).width, colW);
          drawMono(c, d.name, rightX + colW - nw, ry + nameSize / 2, nameSize, POST_COLORS.white, colW, 700);
          ry += nameSize + 18 * u;
          ry += drawRichText(c, d.desc, rightX, ry, colW, {
            size: 30 * u,
            color: POST_COLORS.gray,
            lh: 1.55,
            maxLines: 3,
          });

          let ly = top + barH + pad;
          for (const feat of splitLines(d.features).slice(0, 4)) {
            const r = 14 * u;
            const ccx = leftX + colW - r;
            const ccy = ly + 22 * u * 0.78;
            c.beginPath();
            c.arc(ccx, ccy, r, 0, Math.PI * 2);
            c.fillStyle = POST_COLORS.voltSoft;
            c.fill();
            c.strokeStyle = POST_COLORS.volt;
            c.lineWidth = 2.6 * u;
            c.lineCap = 'round';
            c.lineJoin = 'round';
            c.beginPath();
            c.moveTo(ccx - 5 * u, ccy);
            c.lineTo(ccx - 1.2 * u, ccy + 4.2 * u);
            c.lineTo(ccx + 6 * u, ccy - 4.2 * u);
            c.stroke();

            ly +=
              drawRichText(c, feat, leftX, ly, colW - 2 * r - 18 * u, {
                size: 26 * u,
                color: POST_COLORS.dim,
                lh: 1.48,
                maxLines: 2,
              }) + 14 * u;
          }
          return Math.max(ry, ly - 14 * u) - top + pad;
        }

        const inner = b.w - 2 * pad;
        let cy = top + barH + pad;
        let nameSize = 62 * u;
        c.font = fontSpec(700, nameSize, FONT_MONO);
        while (c.measureText(d.name).width > inner && nameSize > 32 * u) {
          nameSize *= 0.94;
          c.font = fontSpec(700, nameSize, FONT_MONO);
        }
        const nw = Math.min(c.measureText(d.name).width, inner);
        drawMono(c, d.name, b.x + b.w - pad - nw, cy + nameSize / 2, nameSize, POST_COLORS.white, inner, 700);
        cy += nameSize + 18 * u;

        cy +=
          drawRichText(c, d.desc, b.x + pad, cy, inner, {
            size: 31 * u,
            color: POST_COLORS.gray,
            lh: 1.55,
            maxLines: 3,
          }) + 26 * u;

        for (const feat of splitLines(d.features).slice(0, 4)) {
          const r = 15 * u;
          const ccx = b.x + b.w - pad - r;
          const ccy = cy + 24 * u * 0.78;
          c.beginPath();
          c.arc(ccx, ccy, r, 0, Math.PI * 2);
          c.fillStyle = POST_COLORS.voltSoft;
          c.fill();
          c.strokeStyle = POST_COLORS.volt;
          c.lineWidth = 2.8 * u;
          c.lineCap = 'round';
          c.lineJoin = 'round';
          c.beginPath();
          c.moveTo(ccx - 5.5 * u, ccy);
          c.lineTo(ccx - 1.5 * u, ccy + 4.5 * u);
          c.lineTo(ccx + 6.5 * u, ccy - 4.5 * u);
          c.stroke();

          cy +=
            drawRichText(c, feat, b.x + pad, cy, inner - 2 * r - 18 * u, {
              size: 27 * u,
              color: POST_COLORS.dim,
              lh: 1.5,
              maxLines: 2,
            }) + 12 * u;
        }
        return cy - top + pad - 12 * u;
      },
      (hh) => rrect(ctx, b.x, top, b.w, hh, 26 * u, POST_COLORS.surface, POST_COLORS.faintStrong, 1.5 * u)
    );

    ctx.fillStyle = POST_COLORS.faint;
    ctx.fillRect(b.x, top + barH, b.w, 1.5 * u);

    [0, 1, 2].forEach((idx) => {
      ctx.beginPath();
      ctx.arc(b.x + 30 * u + idx * 20 * u, top + barH / 2, 5.5 * u, 0, Math.PI * 2);
      ctx.fillStyle = idx === 0 ? 'rgba(212,255,0,0.45)' : 'rgba(255,255,255,0.14)';
      ctx.fill();
    });

    const pillW = Math.min(b.w * 0.56, 460 * u);
    const pillH = barH - 26 * u;
    rrect(
      ctx,
      b.x + (b.w - pillW) / 2,
      top + 13 * u,
      pillW,
      pillH,
      pillH / 2,
      POST_COLORS.bg,
      POST_COLORS.faint,
      1 * u
    );
    ctx.font = fontSpec(500, 19 * u, FONT_MONO);
    const uw = ctx.measureText(d.url).width;
    drawMono(
      ctx,
      d.url,
      b.x + (b.w - Math.min(uw, pillW - 40 * u)) / 2,
      top + barH / 2 + 1 * u,
      19 * u,
      POST_COLORS.volt,
      pillW - 40 * u
    );

    return top + h - b.y;
  },
};

const trend: PostTemplate = {
  id: 'trend',
  label: 'مشروع ترند',
  subtitle: 'تسليط الضوء على أداة صاعدة ولمن تفيد',
  fields: [
    { key: 'name', label: 'اسم الأداة', kind: 'text' },
    { key: 'tagline', label: 'وصف في سطر', kind: 'area' },
    { key: 'desc', label: 'تفاصيل', kind: 'area' },
    { key: 'audience', label: 'لمن يفيد؟', kind: 'area' },
  ],
  defaults: {
    name: 'Cursor AI',
    tagline: 'محرر كود *ذكي* يكتب معك بالذكاء الاصطناعي',
    desc: 'يفهم مشروعك كاملًا، ويقترح التعديلات ويشرح الكود.',
    audience: 'المطوّرون الذين يريدون إنجازًا أسرع ومراجعة أذكى للكود',
  },
  draw(ctx, b, d, u, W, H) {
    const isLandscape = W > H * 1.35 && Boolean(d.audience?.trim());

    if (isLandscape) {
      const gap = 46 * u;
      const audW = b.w * 0.4;
      const mainW = b.w - audW - gap;
      const mainX = b.x + audW + gap;

      let y = b.y;
      y += drawCategoryBadge(ctx, 'مشروع ترند', mainX + mainW, y, u) + 30 * u;

      let size = 90 * u;
      ctx.font = fontSpec(700, size, FONT_MONO);
      while (ctx.measureText(d.name).width > mainW && size > 36 * u) {
        size *= 0.94;
        ctx.font = fontSpec(700, size, FONT_MONO);
      }
      const nw = ctx.measureText(d.name).width;
      drawMono(ctx, d.name, mainX + mainW - nw, y + size / 2, size, POST_COLORS.white, mainW, 700);
      y += size + 12 * u;

      ctx.fillStyle = POST_COLORS.volt;
      ctx.fillRect(mainX + mainW - 124 * u, y, 124 * u, 6 * u);
      y += 30 * u;

      y += drawRichText(ctx, d.tagline, mainX, y, mainW, {
        size: 40 * u,
        weight: 700,
        lh: 1.4,
        maxLines: 3,
      });

      if (d.desc?.trim()) {
        y += 14 * u;
        y += drawRichText(ctx, d.desc, mainX, y, mainW, {
          size: 27 * u,
          color: POST_COLORS.dim,
          lh: 1.58,
          maxLines: 3,
        });
      }

      const pad = 34 * u;
      const inner = audW - 2 * pad;
      const cardTop = b.y + 18 * u;
      const cardH = drawLayer(
        ctx,
        (c) => {
          let cy = cardTop + pad;
          cy +=
            drawRichText(c, 'لمن يفيد؟', b.x + pad, cy, inner, {
              size: 24 * u,
              weight: 700,
              color: POST_COLORS.volt,
              lh: 1.4,
            }) + 12 * u;
          cy += drawRichText(c, d.audience, b.x + pad, cy, inner, {
            size: 29 * u,
            color: POST_COLORS.gray,
            lh: 1.6,
            maxLines: 5,
          });
          return cy - cardTop + pad;
        },
        (hh) => rrect(ctx, b.x, cardTop, audW, hh, 22 * u, POST_COLORS.surface, POST_COLORS.voltBorder, 1.5 * u)
      );

      return Math.max(y - b.y, cardTop + cardH - b.y);
    }

    let y = b.y;
    y += drawCategoryBadge(ctx, 'مشروع ترند', b.x + b.w, y, u) + 34 * u;

    let size = 98 * u;
    ctx.font = fontSpec(700, size, FONT_MONO);
    while (ctx.measureText(d.name).width > b.w && size > 38 * u) {
      size *= 0.94;
      ctx.font = fontSpec(700, size, FONT_MONO);
    }
    const nw = ctx.measureText(d.name).width;
    drawMono(ctx, d.name, b.x + b.w - nw, y + size / 2, size, POST_COLORS.white, b.w, 700);
    y += size + 12 * u;

    ctx.fillStyle = POST_COLORS.volt;
    ctx.fillRect(b.x + b.w - 124 * u, y, 124 * u, 6 * u);
    y += 34 * u;

    y += drawRichText(ctx, d.tagline, b.x, y, b.w, {
      size: 44 * u,
      weight: 700,
      lh: 1.4,
      maxLines: 3,
    });

    if (d.desc?.trim()) {
      y += 14 * u;
      y += drawRichText(ctx, d.desc, b.x, y, b.w, {
        size: 29 * u,
        color: POST_COLORS.dim,
        lh: 1.6,
        maxLines: 3,
      });
    }

    if (d.audience?.trim()) {
      y += 38 * u;
      const pad = 32 * u;
      const inner = b.w - 2 * pad;
      const top = y;

      const h = drawLayer(
        ctx,
        (c) => {
          let cy = top + pad;
          cy +=
            drawRichText(c, 'لمن يفيد؟', b.x + pad, cy, inner, {
              size: 23 * u,
              weight: 600,
              color: POST_COLORS.volt,
              lh: 1.4,
            }) + 6 * u;
          cy += drawRichText(c, d.audience, b.x + pad, cy, inner, {
            size: 29 * u,
            color: POST_COLORS.gray,
            lh: 1.55,
            maxLines: 3,
          });
          return cy - top + pad;
        },
        (hh) => rrect(ctx, b.x, top, b.w, hh, 22 * u, POST_COLORS.surface, POST_COLORS.voltBorder, 1.5 * u)
      );
      y += h;
    }

    return y - b.y;
  },
};

const steps: PostTemplate = {
  id: 'steps',
  label: 'شرح فكرة',
  subtitle: 'تسلسل خطوات متصل بمسار مرقّم',
  fields: [
    { key: 'title', label: 'العنوان', kind: 'area' },
    { key: 'steps', label: 'الخطوات (عنوان | شرح) سطر لكل خطوة', kind: 'area' },
  ],
  defaults: {
    title: 'كيف يعمل *JWT* في تسجيل الدخول؟',
    steps:
      'تسجيل الدخول | ترسل اسم المستخدم وكلمة المرور\nإنشاء التوكن | الخادم يوقّع توكنًا ويعيده لك\nحفظ التوكن | يُرسل مع كل طلب في الترويسة\nالتحقق | الخادم يتأكد من التوقيع ثم يسمح',
  },
  draw(ctx, b, d, u, W, H) {
    const items = splitLines(d.steps).slice(0, 5);
    const isLandscape = W > H * 1.35;

    const drawTimeline = (tx: number, ty: number, tw: number) => {
      let cy = ty;
      const nodeR = 19 * u;
      const nodeCx = tx + tw - nodeR - 2 * u;
      const cardW = tw - nodeR * 2 - 24 * u;
      const centers: number[] = [];

      items.forEach((it, i) => {
        const [stepTitle, stepDesc] = splitPair(it);
        const cardTop = cy;
        const pad = 20 * u;
        const innerW = cardW - pad * 2;

        const cardH = drawLayer(
          ctx,
          (c) => {
            let innerY = cardTop + pad;
            innerY += drawRichText(c, stepTitle, tx + pad, innerY, innerW, {
              size: 29 * u,
              weight: 700,
              lh: 1.32,
              maxLines: 1,
              minSize: 21 * u,
            });
            if (stepDesc) {
              innerY += 6 * u;
              innerY += drawRichText(c, stepDesc, tx + pad, innerY, innerW, {
                size: 24 * u,
                color: POST_COLORS.dim,
                lh: 1.46,
                maxLines: 2,
              });
            }
            return innerY + pad - cardTop;
          },
          (hh) => {
            const isLast = i === items.length - 1;
            rrect(
              ctx,
              tx,
              cardTop,
              cardW,
              hh,
              18 * u,
              POST_COLORS.surface,
              isLast ? POST_COLORS.voltBorder : POST_COLORS.faint,
              1.4 * u
            );
          }
        );

        centers.push(cardTop + cardH / 2);
        cy += cardH + (i < items.length - 1 ? 14 * u : 0);
      });

      if (centers.length > 1) {
        const grad = ctx.createLinearGradient(nodeCx, centers[0], nodeCx, centers[centers.length - 1]);
        grad.addColorStop(0, 'rgba(167, 139, 250, 0.45)');
        grad.addColorStop(1, POST_COLORS.volt);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2.5 * u;
        ctx.beginPath();
        ctx.moveTo(nodeCx, centers[0]);
        ctx.lineTo(nodeCx, centers[centers.length - 1]);
        ctx.stroke();
      }

      centers.forEach((centerY, i) => {
        const isLast = i === centers.length - 1;
        ctx.beginPath();
        ctx.arc(nodeCx, centerY, nodeR, 0, Math.PI * 2);
        ctx.fillStyle = isLast ? POST_COLORS.volt : POST_COLORS.bg;
        ctx.fill();
        ctx.strokeStyle = isLast ? POST_COLORS.volt : POST_COLORS.purple;
        ctx.lineWidth = 2.5 * u;
        ctx.stroke();

        ctx.font = fontSpec(700, 16 * u, FONT_MONO);
        ctx.fillStyle = isLast ? POST_COLORS.bg : POST_COLORS.white;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(i + 1).padStart(2, '0'), nodeCx, centerY + 1 * u);
      });
      ctx.textAlign = 'left';

      return cy - ty;
    };

    if (isLandscape) {
      const gap = 46 * u;
      const listW = b.w * 0.6;
      const headW = b.w - listW - gap;
      const headX = b.x + listW + gap;
      const headBottom = drawSectionHeader(
        ctx,
        headX,
        b.y,
        headW,
        'شرح فكرة',
        d.title,
        u,
        `${items.length} خطوات متسلسلة لفهم الآلية من البداية للنهاية.`
      );
      const listH = drawTimeline(b.x, b.y, listW);
      return Math.max(headBottom - b.y, listH);
    }

    const startY = drawSectionHeader(ctx, b.x, b.y, b.w, 'شرح فكرة', d.title, u) + 34 * u;
    const listH = drawTimeline(b.x, startY, b.w);
    return startY + listH - b.y;
  },
};

export const POST_TEMPLATES: PostTemplate[] = [quick, commands, compare, tip, site, trend, steps];

export const POST_SIZES: PostSize[] = [
  { id: 'sq', label: 'مربع', sub: '1080×1080 · كل المنصات', w: 1080, h: 1080 },
  { id: 'pt', label: 'عمودي', sub: '1080×1350 · إنستغرام', w: 1080, h: 1350 },
  { id: 'ls', label: 'أفقي', sub: '1600×900 · X ولينكدإن', w: 1600, h: 900 },
  { id: 'st', label: 'ستوري', sub: '1080×1920 · ريلز وستوري', w: 1080, h: 1920 },
];

export const DEFAULT_CAROUSEL_SLIDES: CarouselSlide[] = [
  {
    id: 'slide-1',
    tplId: 'tip',
    data: {
      quote: 'لماذا تفشل أغلب طلبات *API* البطيئة في المشاريع الكبيرة؟',
      body: 'اسحب الشرائح لتفهم المشكلة والحل العملي بأسلوب مهندسي البرمجيات.',
      statA: '4x',
      labelA: 'أسرع بالتنفيذ المتوازي',
      statB: '1x',
      labelB: 'تنفيذ متسلسل بطيء',
    },
  },
  {
    id: 'slide-2',
    tplId: 'compare',
    data: {
      title: 'الفرق بين *Sequential* و *Parallel*',
      aName: 'Promise.allSettled',
      aQ: 'تنفيذ متوازٍ',
      aDesc: 'يطلق كل الطلبات معًا وينتظر نتائجها بدون توقف عند أول خطأ.',
      bName: 'await ... await',
      bQ: 'تنفيذ متسلسل',
      bDesc: 'كل طلب ينتظر انتهاء الذي قبله بلا سبب فيضاعف زمن الانتظار.',
    },
  },
  {
    id: 'slide-3',
    tplId: 'quick',
    data: {
      title: 'المثال العملي بـ *Node.js*',
      body: 'اجمع العمليات المستقلة في مصفوفة واحدة بدل استدعائها واحدة تلو الأخرى.',
      lang: 'TypeScript',
      code: 'const [user, posts] = await Promise.allSettled([\n  fetchUser(id),\n  fetchUserPosts(id)\n]);',
    },
  },
  {
    id: 'slide-4',
    tplId: 'steps',
    data: {
      title: 'قاعدة *سَرب* قبل كتابة أي استدعاء',
      steps:
        'هل الطلبان مستقلان؟ | اجمعهما مباشرة في استدعاء متوازٍ\nهل فشل أحدهما مقبول؟ | استخدم allSettled بدل all\nقِس الزمن الفعلي | قارن وقت الاستجابة قبل وبعد',
    },
  },
];
