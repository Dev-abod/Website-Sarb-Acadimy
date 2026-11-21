import { C, MONO, badge, mono, rrect, text, type Template, type Box, type Ctx } from "./engine";

/** Draw content on a transparent layer, then paint a card of the measured height under it. */
function layer(ctx: Ctx, content: (c: Ctx) => number, card: (h: number) => void) {
  const cv = document.createElement("canvas");
  cv.width = ctx.canvas.width;
  cv.height = ctx.canvas.height;
  const c = cv.getContext("2d")!;
  const h = content(c);
  card(h);
  ctx.drawImage(cv, 0, 0);
  return h;
}

const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
const pair = (l: string) => {
  const [a = "", ...b] = l.split("|");
  return [a.trim(), b.join("|").trim()] as const;
};

function head(ctx: Ctx, b: Box, label: string, title: string, u: number, body?: string) {
  let y = b.y;
  y += badge(ctx, label, b.x + b.w, y, u) + 32 * u;
  y += text(ctx, title, b.x, y, b.w, { size: 66 * u, weight: 700, lh: 1.35, maxLines: 3 });
  if (body) {
    y += 16 * u;
    y += text(ctx, body, b.x, y, b.w, { size: 30 * u, color: C.dim, lh: 1.65, maxLines: 4 });
  }
  return y;
}

function codeCard(ctx: Ctx, x: number, y: number, w: number, code: string, lang: string, u: number) {
  const ls = code.split("\n").slice(0, 7);
  const size = 25 * u;
  const lh = size * 1.7;
  const top = 64 * u;
  const h = top + ls.length * lh + 28 * u;
  rrect(ctx, x, y, w, h, 22 * u, C.surface, C.faint, 1.5 * u);
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(x, y + top - 10 * u, w, 1.5 * u);
  mono(ctx, lang || "code", x + 28 * u, y + 28 * u, 20 * u, C.volt, undefined, 600);
  ls.forEach((l, i) => {
    const isComment = /^\s*(\/\/|#|--)/.test(l);
    mono(ctx, l, x + 28 * u, y + top + 10 * u + lh * i + lh / 2, size, isComment ? "rgba(230,230,230,0.45)" : C.gray, w - 56 * u, 400);
  });
  return h;
}

const quick: Template = {
  id: "quick", label: "معلومة سريعة", icon: "⚡",
  fields: [
    { key: "title", label: "العنوان", kind: "area", hint: "ضع الكلمة المميزة بين *نجمتين*" },
    { key: "body", label: "الشرح", kind: "area" },
    { key: "lang", label: "لغة الكود", kind: "text" },
    { key: "code", label: "الكود (اختياري)", kind: "code" },
  ],
  defaults: {
    title: "*Promise.allSettled* في Node.js",
    body: "ينتظر عدة عمليات معًا، ولا يوقف الباقي إذا فشلت واحدة منها.",
    lang: "JavaScript",
    code: "const results = await Promise.allSettled([\n  fetchUser(), fetchPosts()\n]);\n// each result: fulfilled or rejected",
  },
  draw(ctx, b, d, u) {
    let y = head(ctx, b, "معلومة سريعة", d.title, u, d.body);
    if (d.code?.trim()) { y += 40 * u; y += codeCard(ctx, b.x, y, b.w, d.code, d.lang, u); }
    return y - b.y;
  },
};

const commands: Template = {
  id: "commands", label: "اختصارات وأوامر", icon: "⌨️",
  fields: [
    { key: "title", label: "العنوان", kind: "area" },
    { key: "items", label: "الأوامر (أمر | وظيفته) سطر لكل أمر", kind: "code" },
  ],
  defaults: {
    title: "أوامر *Git* تحتاجها يوميًا",
    items: "git stash | يحفظ تعديلاتك مؤقتًا\ngit log --oneline | يعرض السجل باختصار\ngit rebase | يرتّب التعديلات فوق الفرع",
  },
  draw(ctx, b, d, u) {
    let y = head(ctx, b, "اختصارات وأوامر", d.title, u) + 44 * u;
    const items = lines(d.items).slice(0, 5);
    const h = 104 * u;
    for (const it of items) {
      const [cmd, desc] = pair(it);
      rrect(ctx, b.x, y, b.w, h, 20 * u, C.surface, C.faint, 1.5 * u);
      ctx.fillStyle = C.volt;
      ctx.fillRect(b.x + b.w - 5 * u, y + 28 * u, 5 * u, h - 56 * u);
      mono(ctx, "$", b.x + 30 * u, y + h / 2, 26 * u, C.volt, undefined, 600);
      const cw = mono(ctx, cmd, b.x + 62 * u, y + h / 2, 28 * u, C.white, b.w * 0.5, 600);
      const dx = b.x + 62 * u + cw + 30 * u;
      text(ctx, desc, dx, y + (h - 26 * u * 1.4) / 2, b.x + b.w - 36 * u - dx, { size: 26 * u, color: C.dim, lh: 1.4, maxLines: 1, minSize: 18 * u });
      y += h + 18 * u;
    }
    return y - 18 * u - b.y;
  },
};

const compare: Template = {
  id: "compare", label: "فرق بين مفهومين", icon: "⚖️",
  fields: [
    { key: "title", label: "العنوان", kind: "area" },
    { key: "aName", label: "المفهوم الأول", kind: "text" },
    { key: "aQ", label: "سؤاله", kind: "text" },
    { key: "aDesc", label: "شرحه", kind: "area" },
    { key: "bName", label: "المفهوم الثاني", kind: "text" },
    { key: "bQ", label: "سؤاله", kind: "text" },
    { key: "bDesc", label: "شرحه", kind: "area" },
  ],
  defaults: {
    title: "ما *الفرق* بينهما؟",
    aName: "Authentication", aQ: "من أنت؟", aDesc: "يتحقق من هويتك عند تسجيل الدخول.",
    bName: "Authorization", bQ: "ماذا يحق لك؟", bDesc: "يحدد صلاحياتك بعد معرفة هويتك.",
  },
  draw(ctx, b, d, u) {
    const y = head(ctx, b, "فرق بين مفهومين", d.title, u) + 44 * u;
    const gap = 56 * u;
    const cw = (b.w - gap) / 2;
    const inner = cw - 64 * u;
    const col = (c: Ctx, x: number, name: string, q: string, desc: string, accent: boolean) => {
      let cy = y + 40 * u;
      let size = 40 * u;
      c.font = `700 ${size}px ${MONO}`;
      while (c.measureText(name).width > inner && size > 20 * u) { size *= 0.94; c.font = `700 ${size}px ${MONO}`; }
      const nw = c.measureText(name).width;
      mono(c, name, x + cw - 32 * u - nw, cy + size / 2, size, accent ? C.volt : C.white, inner, 700);
      cy += size + 28 * u;
      cy += text(c, q, x + 32 * u, cy, inner, { size: 36 * u, weight: 700, lh: 1.35, maxLines: 2 }) + 14 * u;
      cy += text(c, desc, x + 32 * u, cy, inner, { size: 27 * u, color: C.dim, lh: 1.6, maxLines: 4 });
      return cy + 40 * u - y;
    };
    const ax = b.x + cw + gap;
    let h = 0;
    layer(ctx, (c) => {
      h = Math.max(col(c, ax, d.aName, d.aQ, d.aDesc, true), col(c, b.x, d.bName, d.bQ, d.bDesc, false));
      return h;
    }, (hh) => {
      rrect(ctx, ax, y, cw, hh, 24 * u, C.surface, "rgba(212,255,0,0.35)", 1.5 * u);
      rrect(ctx, b.x, y, cw, hh, 24 * u, C.surface, C.faint, 1.5 * u);
    });
    const cx = b.x + cw + gap / 2;
    ctx.fillStyle = C.volt;
    ctx.fillRect(cx - 1 * u, y + 24 * u, 2 * u, h - 48 * u);
    rrect(ctx, cx - 26 * u, y + h / 2 - 26 * u, 52 * u, 52 * u, 26 * u, C.bg, C.volt, 2 * u);
    mono(ctx, "vs", cx - 15 * u, y + h / 2, 22 * u, C.volt, undefined, 700);
    return y + h - b.y;
  },
};

const tip: Template = {
  id: "tip", label: "نصيحة مهنية", icon: "💼",
  fields: [
    { key: "quote", label: "النصيحة", kind: "area" },
    { key: "body", label: "توضيح", kind: "area" },
    { key: "statA", label: "الرقم المميز", kind: "text" },
    { key: "labelA", label: "وصفه", kind: "text" },
    { key: "statB", label: "الرقم المقابل", kind: "text" },
    { key: "labelB", label: "وصفه", kind: "text" },
  ],
  defaults: {
    quote: "3 مشاريع حقيقية أقوى من 20 مشروعًا تعليميًا في *Portfolio* الخاص بك",
    body: "اختر مشاريع تحل مشكلة فعلية، واشرح قراراتك فيها.",
    statA: "3", labelA: "مشاريع حقيقية", statB: "20", labelB: "مشروع تعليمي",
  },
  draw(ctx, b, d, u) {
    let y = b.y;
    y += badge(ctx, "نصيحة مهنية", b.x + b.w, y, u) + 24 * u;
    ctx.font = `700 ${150 * u}px Georgia, serif`;
    ctx.fillStyle = C.volt;
    ctx.textBaseline = "top";
    ctx.textAlign = "right";
    ctx.fillText("”", b.x + b.w, y - 10 * u);
    ctx.textAlign = "left";
    y += 96 * u;
    y += text(ctx, d.quote, b.x, y, b.w, { size: 58 * u, weight: 700, lh: 1.4, maxLines: 4 });
    if (d.body?.trim()) { y += 18 * u; y += text(ctx, d.body, b.x, y, b.w, { size: 29 * u, color: C.dim, lh: 1.6, maxLines: 3 }); }
    if (d.statA?.trim()) {
      y += 44 * u;
      const h = 150 * u;
      const cw = (b.w - 24 * u) / 2;
      const stat = (x: number, n: string, l: string, hi: boolean) => {
        rrect(ctx, x, y, cw, h, 22 * u, hi ? "rgba(212,255,0,0.08)" : C.surface, hi ? "rgba(212,255,0,0.45)" : C.faint, 1.5 * u);
        ctx.font = `700 ${72 * u}px ${MONO}`;
        ctx.fillStyle = hi ? C.volt : "rgba(230,230,230,0.35)";
        ctx.textBaseline = "middle";
        ctx.textAlign = "right";
        ctx.fillText(n, x + cw - 32 * u, y + h / 2);
        const nw = ctx.measureText(n).width;
        ctx.textAlign = "left";
        text(ctx, l, x + 32 * u, y + h / 2 - 19 * u, cw - 96 * u - nw, { size: 27 * u, weight: 600, color: hi ? C.white : C.dim, lh: 1.4, maxLines: 1, minSize: 18 * u });
      };
      stat(b.x + cw + 24 * u, d.statA, d.labelA, true);
      stat(b.x, d.statB, d.labelB, false);
      y += h;
    }
    return y - b.y;
  },
};

const site: Template = {
  id: "site", label: "موقع مفيد", icon: "🌐",
  fields: [
    { key: "url", label: "الرابط", kind: "text" },
    { key: "name", label: "اسم الموقع", kind: "text" },
    { key: "desc", label: "الوصف", kind: "area" },
    { key: "features", label: "المزايا (سطر لكل ميزة)", kind: "area" },
  ],
  defaults: {
    url: "devdocs.io", name: "DevDocs",
    desc: "مرجع موحّد لجميع التوثيقات البرمجية في *مكان واحد*",
    features: "يعمل بدون إنترنت بعد التحميل\nبحث سريع في مئات اللغات والمكتبات\nمجاني ومفتوح المصدر",
  },
  draw(ctx, b, d, u) {
    let y = b.y;
    y += badge(ctx, "موقع مفيد", b.x + b.w, y, u) + 32 * u;
    const top = y;
    const bar = 64 * u;
    const pad = 40 * u;
    const inner = b.w - 2 * pad;
    const h = layer(ctx, (c) => {
      let cy = top + bar + pad;
      c.font = `700 ${64 * u}px ${MONO}`;
      const nw = Math.min(c.measureText(d.name).width, inner);
      mono(c, d.name, b.x + b.w - pad - nw, cy + 34 * u, 64 * u, C.white, inner, 700);
      cy += 84 * u;
      cy += text(c, d.desc, b.x + pad, cy, inner, { size: 32 * u, color: C.gray, lh: 1.55, maxLines: 3 }) + 26 * u;
      for (const f of lines(d.features).slice(0, 4)) {
        const r = 15 * u;
        const ccx = b.x + b.w - pad - r;
        const ccy = cy + 26 * u * 0.75;
        c.beginPath(); c.arc(ccx, ccy, r, 0, Math.PI * 2); c.fillStyle = "rgba(212,255,0,0.12)"; c.fill();
        c.strokeStyle = C.volt; c.lineWidth = 3 * u; c.lineCap = "round"; c.lineJoin = "round";
        c.beginPath(); c.moveTo(ccx - 6 * u, ccy); c.lineTo(ccx - 1.5 * u, ccy + 5 * u); c.lineTo(ccx + 7 * u, ccy - 5 * u); c.stroke();
        cy += text(c, f, b.x + pad, cy, inner - 2 * r - 18 * u, { size: 27 * u, color: C.dim, lh: 1.5, maxLines: 2 }) + 12 * u;
      }
      return cy - top + pad - 12 * u;
    }, (hh) => rrect(ctx, b.x, top, b.w, hh, 26 * u, C.surface, C.faint, 1.5 * u));
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(b.x, top + bar, b.w, 1.5 * u);
    const pw = Math.min(b.w * 0.6, 480 * u);
    rrect(ctx, b.x + (b.w - pw) / 2, top + 14 * u, pw, bar - 28 * u, (bar - 28 * u) / 2, C.bg);
    ctx.font = `500 ${20 * u}px ${MONO}`;
    const uw = ctx.measureText(d.url).width;
    mono(ctx, d.url, b.x + (b.w - Math.min(uw, pw - 40 * u)) / 2, top + bar / 2, 20 * u, C.volt, pw - 40 * u);
    return top + h - b.y;
  },
};

const trend: Template = {
  id: "trend", label: "مشروع ترند", icon: "🔥",
  fields: [
    { key: "name", label: "اسم الأداة", kind: "text" },
    { key: "tagline", label: "وصف في سطر", kind: "area" },
    { key: "desc", label: "تفاصيل", kind: "area" },
    { key: "audience", label: "لمن يفيد؟", kind: "area" },
  ],
  defaults: {
    name: "Cursor AI",
    tagline: "محرر كود *ذكي* يكتب معك بالذكاء الاصطناعي",
    desc: "يفهم مشروعك كاملًا، ويقترح التعديلات ويشرح الكود.",
    audience: "المطوّرون الذين يريدون إنجازًا أسرع ومراجعة أذكى للكود",
  },
  draw(ctx, b, d, u) {
    let y = b.y;
    y += badge(ctx, "مشروع ترند", b.x + b.w, y, u) + 36 * u;
    let size = 104 * u;
    ctx.font = `700 ${size}px ${MONO}`;
    while (ctx.measureText(d.name).width > b.w && size > 40 * u) { size *= 0.94; ctx.font = `700 ${size}px ${MONO}`; }
    const nw = ctx.measureText(d.name).width;
    mono(ctx, d.name, b.x + b.w - nw, y + size / 2, size, C.white, b.w, 700);
    y += size + 12 * u;
    ctx.fillStyle = C.volt;
    ctx.fillRect(b.x + b.w - 120 * u, y, 120 * u, 6 * u);
    y += 36 * u;
    y += text(ctx, d.tagline, b.x, y, b.w, { size: 44 * u, weight: 700, lh: 1.4, maxLines: 3 });
    if (d.desc?.trim()) { y += 14 * u; y += text(ctx, d.desc, b.x, y, b.w, { size: 29 * u, color: C.dim, lh: 1.6, maxLines: 3 }); }
    if (d.audience?.trim()) {
      y += 40 * u;
      const pad = 32 * u;
      const inner = b.w - 2 * pad;
      const top = y;
      const h = layer(ctx, (c) => {
        let cy = top + pad;
        cy += text(c, "لمن يفيد؟", b.x + pad, cy, inner, { size: 24 * u, weight: 600, color: C.volt, lh: 1.4 }) + 6 * u;
        cy += text(c, d.audience, b.x + pad, cy, inner, { size: 29 * u, color: C.gray, lh: 1.55, maxLines: 3 });
        return cy - top + pad;
      }, (hh) => rrect(ctx, b.x, top, b.w, hh, 22 * u, C.surface, C.faint, 1.5 * u));
      y += h;
    }
    return y - b.y;
  },
};

const steps: Template = {
  id: "steps", label: "شرح فكرة", icon: "💡",
  fields: [
    { key: "title", label: "العنوان", kind: "area" },
    { key: "steps", label: "الخطوات (عنوان | شرح) سطر لكل خطوة", kind: "area" },
  ],
  defaults: {
    title: "كيف يعمل *JWT* في تسجيل الدخول؟",
    steps: "تسجيل الدخول | ترسل اسم المستخدم وكلمة المرور\nإنشاء التوكن | الخادم يوقّع توكنًا ويعيده لك\nحفظ التوكن | يُرسل مع كل طلب في الترويسة\nالتحقق | الخادم يتأكد من التوقيع ثم يسمح",
  },
  draw(ctx, b, d, u) {
    let y = head(ctx, b, "شرح فكرة", d.title, u) + 48 * u;
    const items = lines(d.steps).slice(0, 5);
    const r = 13 * u;
    const nx = b.x + b.w - r - 4 * u;
    const inner = b.w - 2 * r - 44 * u;
    const centers: number[] = [];
    items.forEach((it, i) => {
      const [t, desc] = pair(it);
      centers.push(y + 22 * u);
      let h = text(ctx, t, b.x, y, inner, { size: 34 * u, weight: 700, lh: 1.3, maxLines: 1, minSize: 24 * u });
      if (desc) h += 4 * u + text(ctx, desc, b.x, y + h + 4 * u, inner, { size: 26 * u, color: C.dim, lh: 1.5, maxLines: 2 });
      y += h + (i < items.length - 1 ? 34 * u : 0);
    });
    if (centers.length > 1) {
      ctx.strokeStyle = "rgba(212,255,0,0.4)";
      ctx.lineWidth = 2.5 * u;
      ctx.beginPath(); ctx.moveTo(nx, centers[0] ?? 0); ctx.lineTo(nx, centers[centers.length - 1] ?? 0); ctx.stroke();
    }
    centers.forEach((cy, i) => {
      const last = i === centers.length - 1;
      ctx.beginPath(); ctx.arc(nx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = last ? C.volt : C.bg; ctx.fill();
      ctx.strokeStyle = C.volt; ctx.lineWidth = 3 * u; ctx.stroke();
    });
    return y - b.y;
  },
};

export const TEMPLATES: Template[] = [quick, commands, compare, tip, site, trend, steps];

export const SIZES = [
  { id: "sq", label: "مربع", sub: "1080×1080 · كل المنصات", w: 1080, h: 1080 },
  { id: "pt", label: "عمودي", sub: "1080×1350 · إنستغرام", w: 1080, h: 1350 },
  { id: "ls", label: "أفقي", sub: "1600×900 · X ولينكدإن", w: 1600, h: 900 },
  { id: "st", label: "ستوري", sub: "1080×1920", w: 1080, h: 1920 },
];
