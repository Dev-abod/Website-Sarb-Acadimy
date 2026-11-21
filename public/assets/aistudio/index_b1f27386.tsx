import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { render, type Assets } from "@/lib/studio/engine";
import { SIZES, TEMPLATES } from "@/lib/studio/templates";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "استوديو سَرب — صمّم بوستاتك بهوية الأكاديمية" },
      { name: "description", content: "أنشئ بوستات برمجية احترافية بهوية أكاديمية سَرب ونزّلها بصيغة PNG لكل المنصات." },
      { property: "og:title", content: "استوديو سَرب" },
      { property: "og:description", content: "صمّم بوستات برمجية بهوية أكاديمية سَرب في ثوانٍ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Studio,
});

const ICONS = ["facebook", "instagram", "x", "linkedin", "telegram"];

function loadImg(src: string) {
  return new Promise<HTMLImageElement | null>((res) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => res(null);
    i.src = src;
  });
}

function Studio() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [assets, setAssets] = useState<Assets | null>(null);
  const [tplId, setTplId] = useState("quick");
  const [sizeId, setSizeId] = useState("sq");
  const [data, setData] = useState<Record<string, Record<string, string>>>(() =>
    Object.fromEntries(TEMPLATES.map((t) => [t.id, { ...t.defaults }])),
  );
  const [open, setOpen] = useState(false);
  const tpl = useMemo(() => TEMPLATES.find((t) => t.id === tplId)!, [tplId]);
  const size = SIZES.find((s) => s.id === sizeId)!;

  useEffect(() => {
    (async () => {
      await Promise.all([
        document.fonts.load('700 40px "IBM Plex Sans Arabic"', "سَرب"),
        document.fonts.load('400 40px "IBM Plex Sans Arabic"', "سَرب"),
        document.fonts.load('600 40px "IBM Plex Sans Arabic"', "سَرب"),
        document.fonts.load('500 40px "JetBrains Mono"', "code"),
        document.fonts.load('700 40px "JetBrains Mono"', "code"),
      ]).catch(() => {});
      const [logo, ...icons] = await Promise.all([loadImg("/brand/logo.png"), ...ICONS.map((n) => loadImg(`/brand/${n}.svg`))]);
      setAssets({ logo, icons: icons.filter(Boolean) as HTMLImageElement[] });
    })();
  }, []);

  useEffect(() => {
    if (assets && canvasRef.current) render(canvasRef.current, size.w, size.h, tpl, data[tpl.id] ?? {}, assets);
  }, [assets, tpl, size, data]);

  const set = (k: string, v: string) => setData((d) => ({ ...d, [tpl.id]: { ...d[tpl.id], [k]: v } }));

  const download = () => {
    canvasRef.current?.toBlob((b) => {
      if (!b) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = `sarb-${tpl.id}-${size.w}x${size.h}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }, "image/png");
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground font-sans lg:flex">
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 left-5 z-30 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg lg:hidden"
      >
        {open ? "عرض البوست" : "التحكم"}
      </button>

      <aside
        className={`${open ? "block" : "hidden"} fixed inset-0 z-20 overflow-y-auto bg-card lg:static lg:block lg:h-screen lg:w-[400px] lg:shrink-0 lg:border-l lg:border-border`}
      >
        <div className="flex items-center gap-3 border-b border-border px-6 py-5">
          <img src="/brand/logo.png" alt="سَرب" className="h-8 w-auto" />
          <div className="mr-auto text-left">
            <p className="text-sm font-semibold">استوديو سَرب</p>
            <p className="font-mono text-[10px] tracking-widest text-muted-foreground">POST.STUDIO</p>
          </div>
        </div>

        <div className="space-y-7 px-6 py-6 pb-28">
          <section>
            <Label>نوع البوست</Label>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTplId(t.id)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-right text-sm transition-colors ${
                    t.id === tplId ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:border-muted-foreground/40"
                  }`}
                >
                  <span aria-hidden>{t.icon}</span>
                  <span className="font-medium">{t.label}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <Label>المقاس</Label>
            <div className="grid grid-cols-2 gap-2">
              {SIZES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSizeId(s.id)}
                  className={`rounded-xl border px-3 py-2 text-right transition-colors ${
                    s.id === sizeId ? "border-primary bg-primary/10" : "border-border bg-background hover:border-muted-foreground/40"
                  }`}
                >
                  <p className={`text-sm font-semibold ${s.id === sizeId ? "text-primary" : ""}`}>{s.label}</p>
                  <p className="text-[11px] text-muted-foreground">{s.sub}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-baseline justify-between">
              <Label>المحتوى</Label>
              <button onClick={() => setData((d) => ({ ...d, [tpl.id]: { ...tpl.defaults } }))} className="text-xs text-muted-foreground hover:text-primary">
                استرجاع المثال
              </button>
            </div>
            {tpl.fields.map((f) => (
              <label key={f.key} className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{f.label}</span>
                {f.kind === "text" ? (
                  <input
                    value={data[tpl.id]?.[f.key] ?? ""}
                    onChange={(e) => set(f.key, e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                ) : (
                  <textarea
                    dir={f.kind === "code" ? "ltr" : "rtl"}
                    rows={f.kind === "code" ? 5 : 3}
                    value={data[tpl.id]?.[f.key] ?? ""}
                    onChange={(e) => set(f.key, e.target.value)}
                    className={`w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed outline-none focus:border-primary ${f.kind === "code" ? "font-mono text-left" : ""}`}
                  />
                )}
                {f.hint && <span className="mt-1 block text-[11px] text-muted-foreground">{f.hint}</span>}
              </label>
            ))}
            <p className="rounded-lg bg-background px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
              ضع كلمة واحدة بين *نجمتين* لتظهر بلون الفولت.
            </p>
          </section>
        </div>

        <div className="fixed bottom-0 right-0 w-full border-t border-border bg-card p-4 lg:sticky lg:w-auto">
          <button
            onClick={download}
            disabled={!assets}
            className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            تنزيل PNG
          </button>
        </div>
      </aside>

      <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-4 p-6 lg:h-screen lg:p-10">
        <div className="flex w-full max-w-[900px] items-center justify-between text-xs text-muted-foreground">
          <span>{tpl.label}</span>
          <span className="font-mono">{size.w}×{size.h}</span>
        </div>
        <div className="flex w-full flex-1 items-center justify-center overflow-hidden">
          <canvas
            ref={canvasRef}
            aria-label="معاينة البوست"
            className="max-h-[calc(100vh-140px)] max-w-full rounded-2xl shadow-[0_30px_80px_-30px_rgba(212,255,0,0.25)] ring-1 ring-border"
            style={{ aspectRatio: `${size.w}/${size.h}` }}
          />
        </div>
        {!assets && <p className="text-sm text-muted-foreground">يتم تحميل الخطوط…</p>}
      </main>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-[11px] font-semibold tracking-wider text-muted-foreground">{children}</p>;
}
