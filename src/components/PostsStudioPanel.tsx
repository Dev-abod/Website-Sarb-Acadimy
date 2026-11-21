import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Briefcase,
  Check,
  Copy,
  CopyPlus,
  Download,
  Eye,
  EyeOff,
  Film,
  Flame,
  FolderArchive,
  GitBranch,
  Globe,
  Heart,
  Layers,
  Maximize2,
  MessageCircle,
  Minimize2,
  Plus,
  Repeat2,
  RotateCcw,
  Scale,
  Send,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Terminal,
  Trash2,
  Zap,
} from 'lucide-react';
import { SARB_ASSETS, type LessonDefinition } from '../data/lessonStoryboard';
import {
  DEFAULT_POST_BRAND_OPTIONS,
  renderSarbPost,
  type BackgroundStyle,
  type CodeFontScale,
  type IconTone,
  type PostAssets,
  type PostBrandOptions,
  type PostSize,
  type PostTextAlign,
} from '../posts/postEngine';
import {
  SOCIAL_PLATFORMS,
  SocialPlatformSvg,
  type IconEffect,
  type SocialPlatform,
} from '../posts/postIcons';
import {
  DEFAULT_CAROUSEL_SLIDES,
  POST_SIZES,
  POST_TEMPLATES,
  type CarouselSlide,
} from '../posts/postTemplates';
import {
  generatePostCaption,
  lessonToVideoPost,
  type CaptionPlatform,
  type VideoPostAngle,
} from '../posts/postHelpers';
import { canvasToPngUint8Array, createZipBlob } from '../posts/zipExporter';

const POST_LOGO_PRIMARY = '/assets/aistudio/logo_db8c0bb3.png';

type StudioMode = 'single' | 'carousel' | 'video';
type MockupView = 'raw' | 'instagram' | 'x' | 'linkedin';

function defaultDataByTemplate(): Record<string, Record<string, string>> {
  return Object.fromEntries(POST_TEMPLATES.map((t) => [t.id, { ...t.defaults }]));
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function TemplateIcon({ id, className = 'w-4 h-4' }: { id: string; className?: string }) {
  switch (id) {
    case 'quick':
      return <Zap className={className} />;
    case 'commands':
      return <Terminal className={className} />;
    case 'compare':
      return <Scale className={className} />;
    case 'tip':
      return <Briefcase className={className} />;
    case 'site':
      return <Globe className={className} />;
    case 'trend':
      return <Flame className={className} />;
    case 'steps':
      return <GitBranch className={className} />;
    default:
      return <Zap className={className} />;
  }
}

interface PostsStudioPanelProps {
  lessons: LessonDefinition[];
  importedLessonRequest?: { lesson: LessonDefinition; nonce: number } | null;
  onRegisterDownload?: (fn: (() => void) | null) => void;
}

export const PostsStudioPanel: React.FC<PostsStudioPanelProps> = ({
  lessons,
  importedLessonRequest,
  onRegisterDownload,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [assets, setAssets] = useState<PostAssets | null>(null);

  // Three cleanly separated sub-studio states (no post saving library)
  const [mode, setMode] = useState<StudioMode>('single');

  // 1. Single post isolated state
  const [singleTplId, setSingleTplId] = useState<string>('quick');
  const [singleDataByTpl, setSingleDataByTpl] = useState<Record<string, Record<string, string>>>(() =>
    defaultDataByTemplate()
  );

  // 2. Carousel isolated state
  const [slides, setSlides] = useState<CarouselSlide[]>(() =>
    DEFAULT_CAROUSEL_SLIDES.map((s) => ({ ...s, data: { ...s.data } }))
  );
  const [activeSlideIdx, setActiveSlideIdx] = useState<number>(0);

  // 3. Dedicated Video-to-Post isolated state (separate from single & carousel)
  const [selectedLessonId, setSelectedLessonId] = useState<string>(lessons[0]?.id ?? '');
  const [videoAngle, setVideoAngle] = useState<VideoPostAngle>('teaser');
  const initialVideoConverted = useMemo(() => {
    const first = lessons[0];
    return first
      ? lessonToVideoPost(first, 'teaser')
      : {
          tplId: 'tip',
          data: { ...POST_TEMPLATES[3].defaults },
          suggestedSeriesTag: 'تشويقي · فيديو الليلة',
        };
  }, [lessons]);
  const [videoTplId, setVideoTplId] = useState<string>(initialVideoConverted.tplId);
  const [videoData, setVideoData] = useState<Record<string, string>>(initialVideoConverted.data);
  const [videoSeriesTag, setVideoSeriesTag] = useState<string>(
    initialVideoConverted.suggestedSeriesTag
  );

  // Shared canvas size & brand controls
  const [sizeId, setSizeId] = useState<PostSize['id']>('sq');
  const [brand, setBrand] = useState<PostBrandOptions>(() => ({ ...DEFAULT_POST_BRAND_OPTIONS }));

  // Toolbars & UI drawers
  const [showBrandDrawer, setShowBrandDrawer] = useState(false);
  const [showCaptionDrawer, setShowCaptionDrawer] = useState(false);
  const [captionPlatform, setCaptionPlatform] = useState<CaptionPlatform>('instagram');
  const [captionText, setCaptionText] = useState<string>(() =>
    generatePostCaption({
      mode: 'single',
      tplId: 'quick',
      data: POST_TEMPLATES[0].defaults,
      platform: 'instagram',
      handleText: DEFAULT_POST_BRAND_OPTIONS.handleText,
    })
  );
  const [captionCopied, setCaptionCopied] = useState(false);

  const [mockupView, setMockupView] = useState<MockupView>('raw');
  const [isExpanded, setIsExpanded] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [isBatchExporting, setIsBatchExporting] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);

  const activeSlide = slides[Math.min(activeSlideIdx, slides.length - 1)] ?? slides[0];
  const currentTplId =
    mode === 'carousel' ? activeSlide.tplId : mode === 'video' ? videoTplId : singleTplId;

  const activeTemplate = useMemo(
    () => POST_TEMPLATES.find((t) => t.id === currentTplId) ?? POST_TEMPLATES[0],
    [currentTplId]
  );

  const activeSize = useMemo(
    () => POST_SIZES.find((s) => s.id === sizeId) ?? POST_SIZES[0],
    [sizeId]
  );

  const activeFields =
    mode === 'carousel'
      ? activeSlide.data
      : mode === 'video'
        ? videoData
        : singleDataByTpl[activeTemplate.id] ?? activeTemplate.defaults;

  const effectiveBrand = useMemo<PostBrandOptions>(
    () =>
      mode === 'video'
        ? {
            ...brand,
            seriesTag: videoSeriesTag,
          }
        : brand,
    [brand, mode, videoSeriesTag]
  );

  // Load Google fonts & Sarb Academy logo
  useEffect(() => {
    let active = true;
    (async () => {
      await Promise.all([
        document.fonts.ready,
        document.fonts.load('700 40px "IBM Plex Sans Arabic"', 'سَرب'),
        document.fonts.load('600 40px "IBM Plex Sans Arabic"', 'سَرب'),
        document.fonts.load('400 40px "IBM Plex Sans Arabic"', 'سَرب'),
        document.fonts.load('500 40px "JetBrains Mono"', 'code'),
        document.fonts.load('700 40px "JetBrains Mono"', 'code'),
      ]).catch(() => {});

      let logo = await loadImage(POST_LOGO_PRIMARY);
      if (!logo) {
        logo = await loadImage(SARB_ASSETS.logoOnDark);
      }
      if (!active) return;
      setAssets({ logo });
    })();
    return () => {
      active = false;
    };
  }, []);

  // Re-render live canvas
  useEffect(() => {
    if (!assets || !canvasRef.current) return;
    renderSarbPost(
      canvasRef.current,
      activeSize.w,
      activeSize.h,
      activeTemplate,
      activeFields,
      assets,
      effectiveBrand,
      mode === 'carousel' ? { index: activeSlideIdx, total: slides.length } : undefined
    );
  }, [
    assets,
    activeSize,
    activeTemplate,
    activeFields,
    effectiveBrand,
    mode,
    activeSlideIdx,
    slides.length,
  ]);

  // Populate ONLY the isolated Video-to-Post workspace (does not touch single or carousel posts)
  const applyLessonToVideoWorkspace = useCallback(
    (lesson: LessonDefinition, angle: VideoPostAngle) => {
      const converted = lessonToVideoPost(lesson, angle);
      setSelectedLessonId(lesson.id);
      setVideoAngle(angle);
      setVideoTplId(converted.tplId);
      setVideoData(converted.data);
      setVideoSeriesTag(converted.suggestedSeriesTag);
      setMode('video');
      setCaptionText(
        generatePostCaption({
          mode: 'video',
          tplId: converted.tplId,
          data: converted.data,
          platform: captionPlatform,
          handleText: brand.handleText,
          videoAngle: angle,
        })
      );
      setImportNotice(
        angle === 'teaser'
          ? `تم تجهيز البوست التشويقي الصباحي لدرس «${lesson.shortTitle}» في قسمه المستقل.`
          : `تم تجهيز ملخص درس «${lesson.shortTitle}» في قسم التحويل المستقل.`
      );
      window.setTimeout(() => setImportNotice(null), 3500);
    },
    [brand.handleText, captionPlatform]
  );

  // Triggered when user clicks "تحويل لبوست" from Video Library
  useEffect(() => {
    if (!importedLessonRequest) return;
    applyLessonToVideoWorkspace(importedLessonRequest.lesson, 'teaser');
  }, [importedLessonRequest, applyLessonToVideoWorkspace]);

  useEffect(() => {
    if (!isExpanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isExpanded]);

  const handleDownloadCurrentPng = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download =
        mode === 'carousel'
          ? `sarb-slide-${String(activeSlideIdx + 1).padStart(2, '0')}-${activeSize.w}x${activeSize.h}.png`
          : mode === 'video'
            ? `sarb-video-${videoAngle}-${activeSize.w}x${activeSize.h}.png`
            : `sarb-${activeTemplate.id}-${activeSize.w}x${activeSize.h}.png`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 2500);
    }, 'image/png');
  }, [mode, videoAngle, activeSlideIdx, activeTemplate.id, activeSize.w, activeSize.h]);

  useEffect(() => {
    onRegisterDownload?.(handleDownloadCurrentPng);
    return () => onRegisterDownload?.(null);
  }, [handleDownloadCurrentPng, onRegisterDownload]);

  const handleBatchZipExport = useCallback(async () => {
    if (!assets || isBatchExporting) return;
    setIsBatchExporting(true);
    try {
      const offCanvas = document.createElement('canvas');
      const entries: { name: string; data: Uint8Array }[] = [];

      if (mode === 'carousel') {
        for (let i = 0; i < slides.length; i++) {
          const sl = slides[i];
          const tpl = POST_TEMPLATES.find((t) => t.id === sl.tplId) ?? POST_TEMPLATES[0];
          renderSarbPost(
            offCanvas,
            activeSize.w,
            activeSize.h,
            tpl,
            sl.data,
            assets,
            effectiveBrand,
            { index: i, total: slides.length }
          );
          const data = await canvasToPngUint8Array(offCanvas);
          entries.push({
            name: `slide-${String(i + 1).padStart(2, '0')}-${tpl.id}-${activeSize.w}x${activeSize.h}.png`,
            data,
          });
        }
      } else {
        for (const sz of POST_SIZES) {
          renderSarbPost(offCanvas, sz.w, sz.h, activeTemplate, activeFields, assets, effectiveBrand);
          const data = await canvasToPngUint8Array(offCanvas);
          entries.push({
            name: `sarb-${mode === 'video' ? `video-${videoAngle}` : activeTemplate.id}-${sz.id}-${sz.w}x${sz.h}.png`,
            data,
          });
        }
      }

      const zipBlob = createZipBlob(entries);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download =
        mode === 'carousel'
          ? `sarb-carousel-${activeSize.w}x${activeSize.h}.zip`
          : mode === 'video'
            ? `sarb-video-${videoAngle}-all-sizes.zip`
            : `sarb-${activeTemplate.id}-all-sizes.zip`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 3000);
    } finally {
      setIsBatchExporting(false);
    }
  }, [
    assets,
    isBatchExporting,
    mode,
    videoAngle,
    slides,
    activeSize,
    effectiveBrand,
    activeTemplate,
    activeFields,
  ]);

  const handleCopyImage = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !navigator.clipboard || typeof ClipboardItem === 'undefined') {
      setCopyStatus('error');
      window.setTimeout(() => setCopyStatus('idle'), 2200);
      return;
    }
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setCopyStatus('copied');
      } catch {
        setCopyStatus('error');
      }
      window.setTimeout(() => setCopyStatus('idle'), 2200);
    }, 'image/png');
  }, []);

  const selectTemplate = (nextTplId: string) => {
    const tplDef = POST_TEMPLATES.find((t) => t.id === nextTplId) ?? POST_TEMPLATES[0];
    if (mode === 'carousel') {
      setSlides((prev) =>
        prev.map((sl, i) =>
          i === activeSlideIdx
            ? {
                ...sl,
                tplId: nextTplId,
                data: { ...tplDef.defaults, ...sl.data },
              }
            : sl
        )
      );
    } else if (mode === 'video') {
      setVideoTplId(nextTplId);
      setVideoData((prev) => ({ ...tplDef.defaults, ...prev }));
    } else {
      setSingleTplId(nextTplId);
    }
  };

  const updateField = (key: string, value: string) => {
    if (mode === 'carousel') {
      setSlides((prev) =>
        prev.map((sl, i) =>
          i === activeSlideIdx ? { ...sl, data: { ...sl.data, [key]: value } } : sl
        )
      );
    } else if (mode === 'video') {
      setVideoData((prev) => ({ ...prev, [key]: value }));
    } else {
      setSingleDataByTpl((prev) => ({
        ...prev,
        [activeTemplate.id]: {
          ...(prev[activeTemplate.id] ?? activeTemplate.defaults),
          [key]: value,
        },
      }));
    }
  };

  const resetActiveTemplate = () => {
    if (mode === 'carousel') {
      setSlides((prev) =>
        prev.map((sl, i) =>
          i === activeSlideIdx ? { ...sl, data: { ...activeTemplate.defaults } } : sl
        )
      );
    } else if (mode === 'video') {
      const found = lessons.find((l) => l.id === selectedLessonId) ?? lessons[0];
      if (found) {
        applyLessonToVideoWorkspace(found, videoAngle);
      } else {
        setVideoData({ ...activeTemplate.defaults });
      }
    } else {
      setSingleDataByTpl((prev) => ({
        ...prev,
        [activeTemplate.id]: { ...activeTemplate.defaults },
      }));
    }
  };

  // Carousel management actions
  const addSlide = () => {
    if (slides.length >= 10) return;
    const tpl = POST_TEMPLATES.find((t) => t.id === 'quick') ?? POST_TEMPLATES[0];
    const nextSlide: CarouselSlide = {
      id: `slide-${Date.now()}`,
      tplId: tpl.id,
      data: { ...tpl.defaults },
    };
    const nextSlides = [...slides, nextSlide];
    setSlides(nextSlides);
    setActiveSlideIdx(nextSlides.length - 1);
  };

  const duplicateCurrentSlide = () => {
    if (slides.length >= 10) return;
    const copy: CarouselSlide = {
      id: `slide-${Date.now()}`,
      tplId: activeSlide.tplId,
      data: { ...activeSlide.data },
    };
    const nextSlides = [
      ...slides.slice(0, activeSlideIdx + 1),
      copy,
      ...slides.slice(activeSlideIdx + 1),
    ];
    setSlides(nextSlides);
    setActiveSlideIdx(activeSlideIdx + 1);
  };

  const moveSlide = (dir: -1 | 1) => {
    const targetIdx = activeSlideIdx + dir;
    if (targetIdx < 0 || targetIdx >= slides.length) return;
    const next = [...slides];
    const [moved] = next.splice(activeSlideIdx, 1);
    next.splice(targetIdx, 0, moved);
    setSlides(next);
    setActiveSlideIdx(targetIdx);
  };

  const deleteCurrentSlide = () => {
    if (slides.length <= 2) return;
    const next = slides.filter((_, i) => i !== activeSlideIdx);
    setSlides(next);
    setActiveSlideIdx(Math.max(0, Math.min(activeSlideIdx, next.length - 1)));
  };

  const refreshCaption = useCallback(
    (targetPlatform: CaptionPlatform = captionPlatform) => {
      setCaptionText(
        generatePostCaption({
          mode,
          tplId: activeTemplate.id,
          data: activeFields,
          slides,
          platform: targetPlatform,
          handleText: brand.handleText,
          videoAngle: mode === 'video' ? videoAngle : undefined,
        })
      );
    },
    [captionPlatform, mode, videoAngle, activeTemplate.id, activeFields, slides, brand.handleText]
  );

  const handleCopyCaption = async () => {
    if (!captionText.trim() || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(captionText);
      setCaptionCopied(true);
      window.setTimeout(() => setCaptionCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const updateBrand = <K extends keyof PostBrandOptions>(key: K, value: PostBrandOptions[K]) => {
    setBrand((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const togglePlatform = (platform: SocialPlatform) => {
    setBrand((prev) => {
      const exists = prev.enabledPlatforms.includes(platform);
      const next = exists
        ? prev.enabledPlatforms.filter((p) => p !== platform)
        : [...prev.enabledPlatforms, platform];
      return {
        ...prev,
        enabledPlatforms: next,
      };
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Control Deck (Right side in RTL) */}
      <section className="lg:col-span-5 flex flex-col gap-5">
        {/* Top Separated Mode Switcher + Header */}
        <div className="flex flex-col gap-3 pb-4 border-b border-[#2A2A2A]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-[#8A8A8A]">
              <span className="text-[#D4FF00] font-semibold">استوديو البوستات</span>
              <span aria-hidden="true">·</span>
              <span>
                {mode === 'carousel'
                  ? `${slides.length} شرائح`
                  : mode === 'video'
                    ? videoAngle === 'teaser'
                      ? 'بوست تشويقي من فيديو'
                      : 'ملخص درس من فيديو'
                    : 'بوست فردي'}
              </span>
              <span aria-hidden="true">·</span>
              <span dir="ltr" className="font-mono tabular-nums text-[#E6E6E6]">
                {activeSize.w}×{activeSize.h}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl">
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`py-2 px-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === 'single'
                  ? 'bg-[#D4FF00] text-[#101010]'
                  : 'text-[#E6E6E6] hover:text-[#FFFFFF]'
              }`}
            >
              بوست فردي
            </button>
            <button
              type="button"
              onClick={() => setMode('carousel')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === 'carousel'
                  ? 'bg-[#D4FF00] text-[#101010]'
                  : 'text-[#E6E6E6] hover:text-[#FFFFFF]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>كاروسيل</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('video')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === 'video'
                  ? 'bg-[#A78BFA] text-[#101010]'
                  : 'text-[#E6E6E6] hover:text-[#FFFFFF]'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>من فيديو لبوست</span>
            </button>
          </div>

          <h1 className="text-2xl font-bold text-[#FFFFFF] leading-tight">
            {mode === 'carousel'
              ? `الشريحة ${String(activeSlideIdx + 1).padStart(2, '0')} · ${activeTemplate.label}`
              : mode === 'video'
                ? videoAngle === 'teaser'
                  ? 'بوست تشويقي صباحي للفيديو'
                  : 'بوست ملخص الفيديو'
                : activeTemplate.label}
          </h1>
          <p className="text-xs text-[#8A8A8A]">
            {mode === 'video'
              ? 'مساحة مستقلة لتحويل أي فيديو إلى بوست تشويقي للصباح أو ملخص للدرس دون التأثير على بوستاتك الأخرى.'
              : activeTemplate.subtitle}
          </p>
        </div>

        {/* Dedicated Video-to-Post Workspace (only visible in 'video' mode) */}
        {mode === 'video' && (
          <div className="bg-[#1C1C1C] border border-[#A78BFA]/45 rounded-xl p-4 flex flex-col gap-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-[#A78BFA]">
                <Film className="w-3.5 h-3.5" />
                <span>إعداد البوست من درس الفيديو</span>
              </span>
              <span className="text-[11px] text-[#8A8A8A]">قسم مستقل</span>
            </div>

            {/* Angle selector: Morning Teaser vs Lesson Summary */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  const found = lessons.find((l) => l.id === selectedLessonId) ?? lessons[0];
                  if (found) applyLessonToVideoWorkspace(found, 'teaser');
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                  videoAngle === 'teaser'
                    ? 'bg-[#D4FF00] text-[#101010] border-[#D4FF00]'
                    : 'bg-[#101010] text-[#E6E6E6] border-[#2A2A2A] hover:border-[#3A3A3A]'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>تشويقي (للصباح)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const found = lessons.find((l) => l.id === selectedLessonId) ?? lessons[0];
                  if (found) applyLessonToVideoWorkspace(found, 'summary');
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                  videoAngle === 'summary'
                    ? 'bg-[#A78BFA] text-[#101010] border-[#A78BFA]'
                    : 'bg-[#101010] text-[#E6E6E6] border-[#2A2A2A] hover:border-[#3A3A3A]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>ملخص الدرس</span>
              </button>
            </div>

            {/* Lesson picker */}
            {lessons.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  value={selectedLessonId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setSelectedLessonId(nextId);
                    const found = lessons.find((l) => l.id === nextId);
                    if (found) applyLessonToVideoWorkspace(found, videoAngle);
                  }}
                  className="flex-1 min-w-0 rounded-lg border border-[#2A2A2A] bg-[#101010] px-2.5 py-2 text-xs text-[#FFFFFF] outline-none focus:border-[#A78BFA]"
                >
                  {lessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.shortTitle} · {l.category}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const found = lessons.find((l) => l.id === selectedLessonId) ?? lessons[0];
                    if (found) applyLessonToVideoWorkspace(found, videoAngle);
                  }}
                  className="px-3 py-2 rounded-lg bg-[#A78BFA] text-[#101010] text-xs font-bold hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
                >
                  تحديث
                </button>
              </div>
            )}

            {/* Dedicated teaser/video badge in header */}
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-[#8A8A8A]">
                وسم التوقيت في الترويسة (اتركه فارغًا لإخفائه)
              </span>
              <input
                type="text"
                value={videoSeriesTag}
                onChange={(e) => setVideoSeriesTag(e.target.value)}
                placeholder="مثال: تشويقي · فيديو الليلة الساعة 9"
                className="rounded-lg border border-[#2A2A2A] bg-[#101010] px-3 py-1.5 text-xs text-[#FFFFFF] outline-none focus:border-[#A78BFA]"
              />
            </label>

            {importNotice && <p className="text-[11px] text-[#3DDC84]">{importNotice}</p>}
          </div>
        )}

        {/* Carousel Slide Strip (only visible in Carousel Mode) */}
        {mode === 'carousel' && (
          <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#E6E6E6]">
                شرائح الكاروسيل ({slides.length})
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => moveSlide(-1)}
                  disabled={activeSlideIdx === 0}
                  title="تحريك لليمين"
                  className="p-1.5 rounded-md bg-[#101010] border border-[#2A2A2A] text-[#E6E6E6] hover:border-[#3A3A3A] disabled:opacity-35 cursor-pointer"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveSlide(1)}
                  disabled={activeSlideIdx >= slides.length - 1}
                  title="تحريك لليسار"
                  className="p-1.5 rounded-md bg-[#101010] border border-[#2A2A2A] text-[#E6E6E6] hover:border-[#3A3A3A] disabled:opacity-35 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={duplicateCurrentSlide}
                  disabled={slides.length >= 10}
                  title="تكرار الشريحة"
                  className="p-1.5 rounded-md bg-[#101010] border border-[#2A2A2A] text-[#E6E6E6] hover:border-[#3A3A3A] disabled:opacity-35 cursor-pointer"
                >
                  <CopyPlus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={deleteCurrentSlide}
                  disabled={slides.length <= 2}
                  title="حذف الشريحة"
                  className="p-1.5 rounded-md bg-[#101010] border border-[#2A2A2A] text-[#FF5C5C] hover:border-[#FF5C5C]/50 disabled:opacity-35 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {slides.map((sl, idx) => {
                const isSelected = idx === activeSlideIdx;
                const tpl = POST_TEMPLATES.find((t) => t.id === sl.tplId);
                return (
                  <button
                    key={sl.id}
                    type="button"
                    onClick={() => setActiveSlideIdx(idx)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#D4FF00] text-[#101010] border-[#D4FF00]'
                        : 'bg-[#101010] text-[#E6E6E6] border-[#2A2A2A] hover:border-[#3A3A3A]'
                    }`}
                  >
                    <span className="font-mono tabular-nums">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="text-[11px] opacity-80">{tpl?.label}</span>
                  </button>
                );
              })}

              {slides.length < 10 && (
                <button
                  type="button"
                  onClick={addSlide}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-dashed border-[#3A3A3A] text-xs font-semibold text-[#D4FF00] hover:border-[#D4FF00] transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>شريحة</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* 1. Template Picker */}
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#E6E6E6]">
              {mode === 'carousel' ? 'قالب الشريحة الحالية' : 'نوع القالب'}
            </span>
            <span className="text-[11px] font-mono tabular-nums text-[#8A8A8A]">
              {POST_TEMPLATES.length} قوالب
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {POST_TEMPLATES.map((tpl) => {
              const selected = tpl.id === activeTemplate.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => selectTemplate(tpl.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-right text-xs font-semibold transition-colors cursor-pointer ${
                    selected
                      ? 'bg-[#D4FF00]/10 border-[#D4FF00] text-[#D4FF00]'
                      : 'bg-[#101010] border-[#2A2A2A] text-[#E6E6E6] hover:border-[#3A3A3A] hover:text-[#FFFFFF]'
                  }`}
                >
                  <TemplateIcon id={tpl.id} className="w-4 h-4 shrink-0" />
                  <span className="truncate">{tpl.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Size Selector */}
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-4 flex flex-col gap-3">
          <span className="text-xs font-semibold text-[#E6E6E6]">المنصة والمقاس</span>
          <div className="grid grid-cols-2 gap-2">
            {POST_SIZES.map((sz) => {
              const selected = sz.id === activeSize.id;
              return (
                <button
                  key={sz.id}
                  type="button"
                  onClick={() => setSizeId(sz.id)}
                  className={`px-3 py-2.5 rounded-lg border text-right transition-colors cursor-pointer ${
                    selected
                      ? 'bg-[#D4FF00]/10 border-[#D4FF00]'
                      : 'bg-[#101010] border-[#2A2A2A] hover:border-[#3A3A3A]'
                  }`}
                >
                  <p
                    className={`text-xs font-bold ${
                      selected ? 'text-[#D4FF00]' : 'text-[#FFFFFF]'
                    }`}
                  >
                    {sz.label}
                  </p>
                  <p className="text-[11px] text-[#8A8A8A] mt-0.5 tabular-nums">{sz.sub}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Dynamic Template Content Fields */}
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#E6E6E6]">محتوى البوست</span>
            <button
              type="button"
              onClick={resetActiveTemplate}
              className="flex items-center gap-1.5 text-[11px] text-[#8A8A8A] hover:text-[#D4FF00] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{mode === 'video' ? 'إعادة تعبئة من الدرس' : 'استرجاع المثال'}</span>
            </button>
          </div>

          <div className="flex flex-col gap-3.5">
            {activeTemplate.fields.map((field) => (
              <label key={field.key} className="flex flex-col gap-1.5">
                <span className="text-xs text-[#E6E6E6] font-medium">{field.label}</span>
                {field.kind === 'text' ? (
                  <input
                    type="text"
                    value={activeFields[field.key] ?? ''}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#101010] px-3 py-2 text-sm text-[#FFFFFF] outline-none focus:border-[#D4FF00] transition-colors"
                  />
                ) : (
                  <textarea
                    dir={field.kind === 'code' ? 'ltr' : 'rtl'}
                    rows={field.kind === 'code' ? 4 : 3}
                    value={activeFields[field.key] ?? ''}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    className={`w-full resize-y rounded-lg border border-[#2A2A2A] bg-[#101010] px-3 py-2 text-sm text-[#FFFFFF] leading-relaxed outline-none focus:border-[#D4FF00] transition-colors ${
                      field.kind === 'code' ? 'font-mono text-left text-xs' : ''
                    }`}
                  />
                )}
                {field.hint && (
                  <span className="text-[11px] text-[#8A8A8A]">{field.hint}</span>
                )}
              </label>
            ))}
          </div>

          <p className="rounded-lg bg-[#101010] border border-[#2A2A2A] px-3 py-2 text-[11px] text-[#8A8A8A]">
            ضع أي كلمة أو مصطلح بين <span className="text-[#D4FF00] font-mono">*نجمتين*</span> ليظهر بلون الفولت داخل التصميم.
          </p>
        </div>

        {/* 4. Caption & Hashtags Drawer */}
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-4 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => {
              if (!showCaptionDrawer) refreshCaption();
              setShowCaptionDrawer((v) => !v);
            }}
            className="flex items-center justify-between w-full text-right cursor-pointer"
          >
            <span className="flex items-center gap-2 text-xs font-semibold text-[#E6E6E6]">
              <Sparkles className="w-3.5 h-3.5 text-[#D4FF00]" />
              <span>
                {mode === 'video' && videoAngle === 'teaser'
                  ? 'كابشن تشويقي للنشر الصباحي'
                  : 'توليد الكابشن والهاشتاقات'}
              </span>
            </span>
            <span className="text-[11px] text-[#8A8A8A]">
              {showCaptionDrawer ? 'إخفاء' : 'فتح'}
            </span>
          </button>

          {showCaptionDrawer && (
            <div className="flex flex-col gap-3 pt-3 border-t border-[#2A2A2A]">
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: 'instagram', label: 'Instagram' },
                    { id: 'x', label: 'X' },
                    { id: 'linkedin', label: 'LinkedIn' },
                  ] as { id: CaptionPlatform; label: string }[]
                ).map((pf) => (
                  <button
                    key={pf.id}
                    type="button"
                    onClick={() => {
                      setCaptionPlatform(pf.id);
                      refreshCaption(pf.id);
                    }}
                    className={`py-1.5 px-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                      captionPlatform === pf.id
                        ? 'bg-[#D4FF00] text-[#101010] border-[#D4FF00]'
                        : 'bg-[#101010] text-[#E6E6E6] border-[#2A2A2A]'
                    }`}
                  >
                    {pf.label}
                  </button>
                ))}
              </div>

              <textarea
                rows={6}
                value={captionText}
                onChange={(e) => setCaptionText(e.target.value)}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#101010] px-3 py-2 text-xs text-[#E6E6E6] leading-relaxed outline-none focus:border-[#D4FF00]"
              />

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => refreshCaption()}
                  className="px-3 py-1.5 rounded-lg bg-[#101010] border border-[#2A2A2A] text-xs text-[#E6E6E6] hover:border-[#D4FF00] cursor-pointer"
                >
                  إعادة التوليد من البوست
                </button>
                <button
                  type="button"
                  onClick={handleCopyCaption}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4FF00] text-[#101010] text-xs font-bold cursor-pointer"
                >
                  {captionCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{captionCopied ? 'تم النسخ' : 'نسخ النص'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 5. Visual Design, Identity & Social Icons Controls */}
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-4 flex flex-col gap-4">
          <button
            type="button"
            onClick={() => setShowBrandDrawer((v) => !v)}
            className="flex items-center justify-between w-full text-right cursor-pointer"
          >
            <span className="flex items-center gap-2 text-xs font-semibold text-[#E6E6E6]">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#D4FF00]" />
              <span>تخصيص الهوية والتفاصيل البصرية</span>
            </span>
            <span className="text-[11px] text-[#8A8A8A]">
              {showBrandDrawer ? 'إخفاء' : 'تعديل'}
            </span>
          </button>

          {/* Compact live circular social icon preview strip */}
          <div className="flex flex-col gap-3 pt-2 border-t border-[#2A2A2A]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-[#E6E6E6]">
                {SOCIAL_PLATFORMS.map((p) => {
                  const enabled = brand.enabledPlatforms.includes(p.id);
                  const effectStyle = !enabled
                    ? ''
                    : brand.iconEffect === 'shadow'
                      ? 'shadow-[0_4px_10px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.2)]'
                      : brand.iconEffect === 'glow'
                        ? brand.iconTone === 'volt'
                          ? 'shadow-[0_0_12px_rgba(212,255,0,0.45)]'
                          : 'shadow-[0_0_10px_rgba(255,255,255,0.22)]'
                        : brand.iconEffect === 'neon'
                          ? 'shadow-[0_0_16px_rgba(212,255,0,0.65)] ring-1 ring-[#D4FF00]/60'
                          : '';

                  return (
                    <button
                      key={p.id}
                      type="button"
                      title={`${p.labelAr} (${enabled ? 'مفعّل' : 'مخفي'})`}
                      onClick={() => togglePlatform(p.id)}
                      className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all cursor-pointer ${effectStyle} ${
                        enabled
                          ? brand.iconTone === 'volt'
                            ? 'border-[#D4FF00]/45 bg-[#D4FF00]/12 text-[#D4FF00]'
                            : brand.iconTone === 'white'
                              ? 'border-[#FFFFFF]/30 bg-[#242424] text-[#FFFFFF]'
                              : 'border-[#E6E6E6]/25 bg-[#1C1C1C] text-[#E6E6E6]'
                          : 'border-[#2A2A2A]/60 bg-[#101010]/40 text-[#8A8A8A]/35'
                      }`}
                    >
                      <SocialPlatformSvg platform={p.id} className="w-3.5 h-3.5" />
                    </button>
                  );
                })}
              </div>
              <span dir="ltr" className="font-mono text-xs text-[#8A8A8A]">
                {brand.handleText || '@SarbAcademy'}
              </span>
            </div>

            {/* Social Icon Visual Effect Selector */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] text-[#8A8A8A]">التأثير البصري للأيقونات</span>
              <div className="grid grid-cols-4 gap-1.5">
                {(
                  [
                    { id: 'none', label: 'قياسي' },
                    { id: 'shadow', label: 'ظل عميق' },
                    { id: 'glow', label: 'توهّج ناعم' },
                    { id: 'neon', label: 'توهّج سَرب' },
                  ] as { id: IconEffect; label: string }[]
                ).map((ef) => (
                  <button
                    key={ef.id}
                    type="button"
                    onClick={() => updateBrand('iconEffect', ef.id)}
                    className={`py-1.5 px-1.5 rounded-lg border text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      brand.iconEffect === ef.id
                        ? 'bg-[#D4FF00] text-[#101010] border-[#D4FF00] font-bold'
                        : 'bg-[#101010] text-[#E6E6E6] border-[#2A2A2A] hover:border-[#3A3A3A]'
                    }`}
                  >
                    {ef.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {showBrandDrawer && (
            <div className="flex flex-col gap-3.5 pt-3 border-t border-[#2A2A2A]">
              {/* Background Texture */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] text-[#8A8A8A]">خلفية التصميم</span>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'clean', label: 'صافية' },
                      { id: 'grid', label: 'شبكة هندسية' },
                      { id: 'spotlight', label: 'إضاءة مركّزة' },
                    ] as { id: BackgroundStyle; label: string }[]
                  ).map((bg) => (
                    <button
                      key={bg.id}
                      type="button"
                      onClick={() => updateBrand('backgroundStyle', bg.id)}
                      className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                        brand.backgroundStyle === bg.id
                          ? 'bg-[#D4FF00] text-[#101010] border-[#D4FF00] font-bold'
                          : 'bg-[#101010] text-[#E6E6E6] border-[#2A2A2A] hover:border-[#3A3A3A]'
                      }`}
                    >
                      {bg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Code & Alignment Options */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] text-[#8A8A8A]">حجم خط الكود</span>
                  <div className="grid grid-cols-3 gap-1">
                    {(
                      [
                        { id: 'sm', label: 'صغير' },
                        { id: 'md', label: 'عادي' },
                        { id: 'lg', label: 'كبير' },
                      ] as { id: CodeFontScale; label: string }[]
                    ).map((cs) => (
                      <button
                        key={cs.id}
                        type="button"
                        onClick={() => updateBrand('codeFontScale', cs.id)}
                        className={`py-1.5 rounded-md border text-[11px] font-medium cursor-pointer ${
                          brand.codeFontScale === cs.id
                            ? 'bg-[#A78BFA] text-[#101010] border-[#A78BFA] font-bold'
                            : 'bg-[#101010] text-[#E6E6E6] border-[#2A2A2A]'
                        }`}
                      >
                        {cs.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] text-[#8A8A8A]">محاذاة النص</span>
                  <div className="grid grid-cols-2 gap-1">
                    {(
                      [
                        { id: 'right', label: 'يمين' },
                        { id: 'center', label: 'توسيط' },
                      ] as { id: PostTextAlign; label: string }[]
                    ).map((al) => (
                      <button
                        key={al.id}
                        type="button"
                        onClick={() => updateBrand('textAlign', al.id)}
                        className={`py-1.5 rounded-md border text-[11px] font-medium cursor-pointer ${
                          brand.textAlign === al.id
                            ? 'bg-[#A78BFA] text-[#101010] border-[#A78BFA] font-bold'
                            : 'bg-[#101010] text-[#E6E6E6] border-[#2A2A2A]'
                        }`}
                      >
                        {al.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Element visibility toggles */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {(
                  [
                    { key: 'showHeader', label: 'الترويسة والشعار' },
                    { key: 'showFooter', label: 'شريط التذييل' },
                    { key: 'showSocialIcons', label: 'أيقونات المنصات' },
                    { key: 'showWingPattern', label: 'خطوط شعار سَرب' },
                    { key: 'showLineNumbers', label: 'أرقام أسطر الكود' },
                  ] as const
                ).map((item) => {
                  const active = brand[item.key];
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => updateBrand(item.key, !active)}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#D4FF00]/10 border-[#D4FF00]/50 text-[#FFFFFF]'
                          : 'bg-[#101010] border-[#2A2A2A] text-[#8A8A8A]'
                      }`}
                    >
                      <span>{item.label}</span>
                      {active ? (
                        <Eye className="w-3.5 h-3.5 text-[#D4FF00] shrink-0" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-[#8A8A8A] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Icon Tone */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] text-[#8A8A8A]">لون أيقونات التواصل</span>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'gray', label: 'رمادي هادئ' },
                      { id: 'volt', label: 'فولت هادئ' },
                      { id: 'white', label: 'أبيض صافي' },
                    ] as { id: IconTone; label: string }[]
                  ).map((tone) => (
                    <button
                      key={tone.id}
                      type="button"
                      onClick={() => updateBrand('iconTone', tone.id)}
                      className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                        brand.iconTone === tone.id
                          ? 'bg-[#D4FF00] text-[#101010] border-[#D4FF00] font-bold'
                          : 'bg-[#101010] text-[#E6E6E6] border-[#2A2A2A] hover:border-[#3A3A3A]'
                      }`}
                    >
                      {tone.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Handle & Series Tag */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-[#8A8A8A]">اسم الحساب الموحد</span>
                  <input
                    dir="ltr"
                    type="text"
                    value={brand.handleText}
                    onChange={(e) => updateBrand('handleText', e.target.value)}
                    placeholder="@SarbAcademy"
                    className="rounded-lg border border-[#2A2A2A] bg-[#101010] px-3 py-1.5 text-xs font-mono text-[#FFFFFF] outline-none focus:border-[#D4FF00]"
                  />
                </label>
                {mode !== 'video' && (
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-[#8A8A8A]">وسم السلسلة (اختياري)</span>
                    <input
                      type="text"
                      value={brand.seriesTag}
                      onChange={(e) => updateBrand('seriesTag', e.target.value)}
                      placeholder="مثال: سلسلة OOP · 02"
                      className="rounded-lg border border-[#2A2A2A] bg-[#101010] px-3 py-1.5 text-xs text-[#FFFFFF] outline-none focus:border-[#D4FF00]"
                    />
                  </label>
                )}
              </div>

              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-[#8A8A8A]">عبارة التذييل</span>
                <input
                  type="text"
                  value={brand.footerCta}
                  onChange={(e) => updateBrand('footerCta', e.target.value)}
                  className="rounded-lg border border-[#2A2A2A] bg-[#101010] px-3 py-1.5 text-xs text-[#FFFFFF] outline-none focus:border-[#D4FF00]"
                />
              </label>
            </div>
          )}
        </div>
      </section>

      {/* Live Canvas Preview Stage (Left side in RTL) */}
      <section className="lg:col-span-7 flex flex-col gap-4 lg:sticky lg:top-24">
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-2xl p-4 sm:p-6 flex flex-col gap-4">
          {/* Stage Top Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#2A2A2A]">
            <div className="flex items-center gap-1 p-1 bg-[#101010] border border-[#2A2A2A] rounded-lg">
              {(
                [
                  { id: 'raw', label: 'تصميم خام' },
                  { id: 'instagram', label: 'Instagram' },
                  { id: 'x', label: 'X' },
                  { id: 'linkedin', label: 'LinkedIn' },
                ] as { id: MockupView; label: string }[]
              ).map((mv) => (
                <button
                  key={mv.id}
                  type="button"
                  onClick={() => setMockupView(mv.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    mockupView === mv.id
                      ? 'bg-[#242424] text-[#D4FF00]'
                      : 'text-[#8A8A8A] hover:text-[#FFFFFF]'
                  }`}
                >
                  {mv.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopyImage}
                disabled={!assets}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#101010] border border-[#2A2A2A] hover:border-[#3A3A3A] text-xs font-medium text-[#E6E6E6] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40"
              >
                {copyStatus === 'copied' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#3DDC84]" />
                    <span className="text-[#3DDC84]">تم النسخ</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copyStatus === 'error' ? 'تعذّر النسخ' : 'نسخ'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleBatchZipExport}
                disabled={!assets || isBatchExporting}
                title={
                  mode === 'carousel'
                    ? 'تصدير جميع شرائح الكاروسيل في ملف ZIP'
                    : 'تصدير جميع المقاسات الأربعة في ملف ZIP'
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#101010] border border-[#A78BFA]/50 text-[#A78BFA] hover:bg-[#A78BFA] hover:text-[#101010] text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40"
              >
                <FolderArchive className="w-3.5 h-3.5" />
                <span>
                  {isBatchExporting
                    ? 'جاري التجهيز...'
                    : mode === 'carousel'
                      ? `كل الشرائح (${slides.length} ZIP)`
                      : 'كل المقاسات (4 ZIP)'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsExpanded((v) => !v)}
                aria-label={isExpanded ? 'تصغير المعاينة' : 'تكبير المعاينة'}
                className="p-1.5 rounded-lg bg-[#101010] border border-[#2A2A2A] hover:border-[#3A3A3A] text-[#E6E6E6] transition-colors cursor-pointer"
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={handleDownloadCurrentPng}
                disabled={!assets}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#D4FF00] text-[#101010] text-xs font-bold hover:bg-[#E5FF66] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تنزيل PNG</span>
              </button>
            </div>
          </div>

          {/* Canvas Frame or Social Feed Mockup Wrapper */}
          <div className="flex items-center justify-center bg-[#101010] rounded-xl p-4 sm:p-6 border border-[#2A2A2A] min-h-[440px]">
            {mockupView === 'raw' ? (
              <canvas
                ref={canvasRef}
                aria-label="معاينة البوست المباشرة"
                className="max-h-[66vh] max-w-full rounded-xl shadow-[0_24px_64px_-24px_rgba(212,255,0,0.22)] ring-1 ring-[#2A2A2A]"
                style={{ aspectRatio: `${activeSize.w}/${activeSize.h}` }}
              />
            ) : (
              <div className="w-full max-w-[460px] bg-[#161616] border border-[#2A2A2A] rounded-2xl overflow-hidden shadow-2xl">
                <div className="px-4 py-3 flex items-center justify-between border-b border-[#242424]">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={SARB_ASSETS.icon}
                      alt="Sarb"
                      className="w-8 h-8 rounded-full object-cover border border-[#D4FF00]/50"
                    />
                    <div>
                      <p className="text-xs font-bold text-[#FFFFFF]">أكاديمية سَرب للبرمجة</p>
                      <p dir="ltr" className="text-[11px] font-mono text-[#8A8A8A]">
                        {brand.handleText || '@SarbAcademy'} · {mockupView === 'x' ? '2m' : 'برمجة وهندسة'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-[#8A8A8A] uppercase">
                    {mockupView}
                  </span>
                </div>

                {(mockupView === 'x' || mockupView === 'linkedin') && (
                  <div className="px-4 py-2.5 text-xs text-[#E6E6E6] leading-relaxed line-clamp-3 border-b border-[#242424]">
                    {captionText.split('\n')[0]}
                  </div>
                )}

                <div className="bg-[#101010] flex items-center justify-center p-2">
                  <canvas
                    ref={canvasRef}
                    aria-label="معاينة المنصة"
                    className="max-h-[52vh] max-w-full rounded-lg"
                    style={{ aspectRatio: `${activeSize.w}/${activeSize.h}` }}
                  />
                </div>

                {mode === 'carousel' && slides.length > 1 && (
                  <div className="flex items-center justify-center gap-1.5 pt-2.5">
                    {slides.map((sl, i) => (
                      <button
                        key={sl.id}
                        type="button"
                        onClick={() => setActiveSlideIdx(i)}
                        aria-label={`الشريحة ${i + 1}`}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          i === activeSlideIdx ? 'w-4 bg-[#D4FF00]' : 'w-1.5 bg-[#3A3A3A]'
                        }`}
                      />
                    ))}
                  </div>
                )}

                <div className="px-4 py-3 flex items-center justify-between text-[#8A8A8A]">
                  <div className="flex items-center gap-4">
                    <Heart className="w-4 h-4" />
                    <MessageCircle className="w-4 h-4" />
                    {mockupView === 'x' ? (
                      <Repeat2 className="w-4 h-4" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </div>
                  <Bookmark className="w-4 h-4" />
                </div>

                {mockupView === 'instagram' && (
                  <div className="px-4 pb-3.5 text-[11px] text-[#E6E6E6] leading-relaxed line-clamp-2">
                    <span className="font-bold text-[#FFFFFF] ml-1.5">sarbacademy</span>
                    {captionText.split('\n')[0]}
                  </div>
                )}
              </div>
            )}
          </div>

          {!assets && (
            <p className="text-center text-xs text-[#8A8A8A]">جاري تجهيز الخطوط وشعار سَرب…</p>
          )}
        </div>
      </section>

      {/* Fullscreen Preview Overlay */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 gap-4"
          onClick={() => setIsExpanded(false)}
        >
          <div
            className="flex items-center justify-between w-full max-w-4xl text-xs text-[#E6E6E6]"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="font-semibold">
              {activeTemplate.label} · {activeSize.w}×{activeSize.h}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadCurrentPng}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#D4FF00] text-[#101010] font-bold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تنزيل PNG</span>
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="px-3 py-1.5 rounded-lg bg-[#1C1C1C] border border-[#2A2A2A] text-[#FFFFFF] cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
          {canvasRef.current && (
            <img
              src={canvasRef.current.toDataURL('image/png')}
              alt="معاينة البوست بالحجم الكبير"
              onClick={(e) => e.stopPropagation()}
              className="max-h-[82vh] max-w-full rounded-xl ring-1 ring-[#3A3A3A]"
            />
          )}
        </div>
      )}
    </div>
  );
};
