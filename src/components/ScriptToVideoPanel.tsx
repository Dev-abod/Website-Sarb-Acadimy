import React, { useState } from 'react';
import {
  CheckCircle2,
  FolderPlus,
  Loader2,
  Sparkles,
  Volume2,
  Wand2,
} from 'lucide-react';
import {
  EDGE_ARABIC_VOICES,
  LESSON_CATEGORY_SUGGESTIONS,
  type LessonDefinition,
  type VoiceEngine,
} from '../data/lessonStoryboard';

interface ScriptToVideoPanelProps {
  existingCategories: string[];
  voiceEngine: VoiceEngine;
  onVoiceEngineChange: (engine: VoiceEngine) => void;
  edgeVoice: string;
  onEdgeVoiceChange: (voiceId: string) => void;
  edgeRate: string;
  isExporting: boolean;
  onLessonCreated: (
    lesson: LessonDefinition,
    generatedAudioBlob: Blob | null,
    ttsWarning: string | null
  ) => Promise<void>;
}

const SAMPLE_SCRIPTS: Array<{ label: string; category: string; text: string }> = [
  {
    label: 'مثال: الـ API في 30 ثانية',
    category: 'تطوير الويب والأنظمة',
    text: `لما تطلب أكل في مطعم، إنت ما تدخل المطبخ وتطبخ بنفسك!
إنت تتكلم مع النادل، والنادل يوصل طلبك للمطبخ ويرجع لك بالوجبة جاهزة.
في البرمجة، الـ API هو بالضبط هذا النادل!

تطبيقك (Client) يرسل Request عبر الـ API إلى الخادم (Server).
الخادم يعالج البيانات ويفحص الصلاحيات في الخلفية، ثم يرجع لك النتيجة بصيغة JSON.

النتيجة: أمان أعلى، فصل كامل بين الواجهة والبيانات، وسهولة ربط أي تطبيق مع أي نظام.
تابع سَرب... ونراك في الدرس القادم!`,
  },
  {
    label: 'مثال: الذاكرة المؤقتة Caching',
    category: 'هندسة البرمجيات',
    text: `تخيّل كل مرة تحتاج قلم، تمشي للمخزن اللي يبعد كيلو عشان تجيبه! رح تتعب وتضيع وقتك.
الحل إنك تحط الأقلام المهمة في مقلمة على مكتبك مباشرة.
هذا بالضبط مفهوم الـ Caching في البرمجة.

بدل ما نضرب قاعدة البيانات في كل طلب ثقيل، نحفظ النتيجة المتكررة في ذاكرة سريعة مثل Redis.
الطلب الأول يجلب البيانات ويخزنها في الـ Cache، والطلبات التالية ترجع في أجزاء من الثانية!

لكن انتبه: لازم تحدد مدة صلاحية (TTL) عشان البيانات ما تصير قديمة.
تابع سَرب... ونراك في الدرس القادم!`,
  },
];

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
}

export const ScriptToVideoPanel: React.FC<ScriptToVideoPanelProps> = ({
  existingCategories,
  voiceEngine,
  onVoiceEngineChange,
  edgeVoice,
  onEdgeVoiceChange,
  edgeRate,
  isExporting,
  onLessonCreated,
}) => {
  const [scriptText, setScriptText] = useState('');
  const [categoryMode, setCategoryMode] = useState<'auto' | 'preset' | 'custom'>('auto');
  const [selectedPresetCategory, setSelectedPresetCategory] = useState<string>(
    existingCategories[0] || LESSON_CATEGORY_SUGGESTIONS[0]
  );
  const [customCategory, setCustomCategory] = useState('');
  const [autoGenerateVoice, setAutoGenerateVoice] = useState(true);

  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStage, setProgressStage] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const allCategoryOptions = Array.from(
    new Set([...existingCategories, ...LESSON_CATEGORY_SUGGESTIONS])
  );

  const resolvedCategory =
    categoryMode === 'auto'
      ? ''
      : categoryMode === 'custom'
        ? customCategory.trim()
        : selectedPresetCategory;

  const handleGenerateVideo = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmed = scriptText.trim();
    if (trimmed.length < 20) {
      setErrorMsg('يرجى كتابة أو لصق السكريبت كاملاً (20 حرفاً على الأقل) لإنشاء الفيديو.');
      return;
    }

    if (categoryMode === 'custom' && !customCategory.trim()) {
      setErrorMsg('يرجى كتابة اسم القسم المخصص أو اختيار التصنيف التلقائي.');
      return;
    }

    setIsGenerating(true);
    setProgressStage('جاري تحليل السكريبت وتقسيم المشاهد والرسوميات بهوية سَرب...');

    try {
      const res = await fetch('/api/generate-reel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: trimmed,
          category: resolvedCategory || undefined,
        }),
      });

      const rawText = await res.text();
      let data: { lesson?: LessonDefinition; error?: string } = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(
          res.ok
            ? 'استجابة غير متوقعة من خادم توليد الفيديو.'
            : `تعذّر الاتصال بخادم توليد الفيديو (${res.status}).`
        );
      }

      if (!res.ok || !data.lesson) {
        throw new Error(data.error || 'تعذّر تحويل السكريبت إلى فيديو.');
      }

      const createdLesson = data.lesson;
      let audioBlob: Blob | null = null;
      let ttsWarning: string | null = null;

      if (autoGenerateVoice) {
        const chosenEdge =
          EDGE_ARABIC_VOICES.find((v) => v.id === edgeVoice) ?? EDGE_ARABIC_VOICES[0];
        const engineLabel =
          voiceEngine === 'edge-tts' ? `Edge TTS · ${chosenEdge.nameAr}` : 'Charon';
        setProgressStage(`تم بناء المشاهد! جاري توليد الصوت (${engineLabel})...`);
        const fullNarration = createdLesson.scenes.map((s) => s.narration).join('\n');
        try {
          const ttsRes = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: fullNarration,
              engine: voiceEngine,
              edgeVoice,
              edgeRate,
            }),
          });
          const ttsRaw = await ttsRes.text();
          const ttsData = JSON.parse(ttsRaw) as {
            audioBase64?: string;
            mimeType?: string;
            error?: string;
          };
          if (ttsRes.ok && ttsData.audioBase64) {
            const fallbackMime = voiceEngine === 'edge-tts' ? 'audio/mpeg' : 'audio/wav';
            audioBlob = base64ToBlob(ttsData.audioBase64, ttsData.mimeType || fallbackMime);
          } else {
            ttsWarning =
              ttsData.error ||
              'تم إنشاء الفيديو والمشاهد بنجاح، لكن تعذّر توليد الصوت حالياً (يمكنك توليده من تبويب الصوت والمزامنة).';
          }
        } catch {
          ttsWarning =
            'تم إنشاء الفيديو والمشاهد بنجاح، لكن تعذّر الاتصال بخدمة الصوت مؤقتاً. يمكنك توليده من تبويب الصوت والمزامنة.';
        }
      }

      await onLessonCreated(createdLesson, audioBlob, ttsWarning);

      setSuccessMsg(
        `تم إنشاء فيديو «${createdLesson.shortTitle}» وحفظه داخل قسم «${createdLesson.category}» (${createdLesson.scenes.length} مشاهد).`
      );
      setScriptText('');
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error && err.message
          ? err.message
          : 'حدث خطأ غير متوقع أثناء إنشاء الفيديو من السكريبت.'
      );
    } finally {
      setIsGenerating(false);
      setProgressStage('');
    }
  };

  return (
    <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5 flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-[#D4FF00]" />
            <h2 className="text-base font-bold text-[#FFFFFF]">
              إنشاء فيديو تلقائياً من السكريبت
            </h2>
          </div>
          <p className="text-xs text-[#8A8A8A] mt-1">
            ألصق أي سكريبت تعليمي وسيقوم الاستوديو تلقائياً بتقسيمه إلى مشاهد موشن جرافيك 9:16 بهوية سَرب وحفظه في مكتبة الأقسام دون حذف أي فيديو سابق.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {SAMPLE_SCRIPTS.map((sample) => (
            <button
              key={sample.label}
              type="button"
              disabled={isGenerating || isExporting}
              onClick={() => {
                setScriptText(sample.text);
                setCategoryMode('preset');
                setSelectedPresetCategory(sample.category);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-[#242424] border border-[#2A2A2A] text-[11px] font-medium text-[#E6E6E6] hover:border-[#D4FF00] hover:text-[#D4FF00] transition-colors cursor-pointer disabled:opacity-40"
            >
              {sample.label}
            </button>
          ))}
        </div>
      </div>

      {/* Script Input */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs text-[#8A8A8A]">
          <span>نص السكريبت (العربي أو المختلط)</span>
          <span dir="ltr" className="font-mono tabular-nums">
            {scriptText.trim().length} / 6000
          </span>
        </div>
        <textarea
          value={scriptText}
          onChange={(e) => setScriptText(e.target.value)}
          rows={7}
          disabled={isGenerating || isExporting}
          placeholder="اكتب أو ألصق السكريبت هنا... مثال: مقدمة المشكلة، المفاهيم أو الخطوات، والخاتمة."
          className="w-full bg-[#101010] border border-[#2A2A2A] focus:border-[#D4FF00] focus:outline-none rounded-xl p-3.5 text-sm text-[#FFFFFF] leading-relaxed resize-y"
        />
      </div>

      {/* Category / Section Selector */}
      <div className="bg-[#101010] border border-[#2A2A2A] rounded-xl p-3.5 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#E6E6E6]">
          <FolderPlus className="w-3.5 h-3.5 text-[#A78BFA]" />
          <span>القسم الذي سيُحفظ بداخله الفيديو</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'auto', label: 'تحديد القسم تلقائياً' },
              { id: 'preset', label: 'اختيار قسم موجود' },
              { id: 'custom', label: 'كتابة قسم جديد' },
            ] as const
          ).map((mode) => (
            <button
              key={mode.id}
              type="button"
              disabled={isGenerating || isExporting}
              onClick={() => setCategoryMode(mode.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                categoryMode === mode.id
                  ? 'bg-[#A78BFA] text-[#101010] border-[#A78BFA]'
                  : 'bg-[#1C1C1C] text-[#E6E6E6] border-[#2A2A2A] hover:border-[#3A3A3A]'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {categoryMode === 'preset' && (
          <select
            value={selectedPresetCategory}
            onChange={(e) => setSelectedPresetCategory(e.target.value)}
            disabled={isGenerating || isExporting}
            className="w-full bg-[#1C1C1C] border border-[#2A2A2A] focus:border-[#D4FF00] focus:outline-none rounded-lg px-3 py-2 text-xs text-[#FFFFFF]"
          >
            {allCategoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        )}

        {categoryMode === 'custom' && (
          <input
            type="text"
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            disabled={isGenerating || isExporting}
            placeholder="مثال: الأمن السيبراني، قواعد البيانات، تطبيقات الموبايل..."
            className="w-full bg-[#1C1C1C] border border-[#2A2A2A] focus:border-[#D4FF00] focus:outline-none rounded-lg px-3 py-2 text-xs text-[#FFFFFF]"
          />
        )}
      </div>

      {/* Unified Voice Auto-Generation Checkbox + Engine Switcher */}
      <div className="flex flex-col gap-2.5 bg-[#101010] border border-[#2A2A2A] rounded-xl p-3.5">
        <label className="flex items-center gap-2.5 text-xs text-[#E6E6E6] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={autoGenerateVoice}
            onChange={(e) => setAutoGenerateVoice(e.target.checked)}
            disabled={isGenerating || isExporting}
            className="accent-[#D4FF00] w-4 h-4 cursor-pointer"
          />
          <Volume2 className="w-3.5 h-3.5 text-[#D4FF00] shrink-0" />
          <span>توليد الصوت الموحّد ومزامنة مدة المشاهد تلقائياً بعد الإنشاء</span>
        </label>

        {autoGenerateVoice && (
          <div className="flex flex-col gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { id: 'edge-tts', label: 'Edge TTS (مجاني بلا حدود)' },
                  { id: 'charon', label: 'Charon (صوت Gemini الرسمي)' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={isGenerating || isExporting}
                  onClick={() => onVoiceEngineChange(opt.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                    voiceEngine === opt.id
                      ? 'bg-[#D4FF00] text-[#101010] border-[#D4FF00]'
                      : 'bg-[#1C1C1C] text-[#E6E6E6] border-[#2A2A2A] hover:border-[#3A3A3A]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {voiceEngine === 'edge-tts' && (
              <select
                value={edgeVoice}
                onChange={(e) => onEdgeVoiceChange(e.target.value)}
                disabled={isGenerating || isExporting}
                className="w-full bg-[#1C1C1C] border border-[#2A2A2A] focus:border-[#D4FF00] focus:outline-none rounded-lg px-3 py-2 text-xs text-[#FFFFFF]"
              >
                {EDGE_ARABIC_VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {`${v.nameAr} — ${v.dialect} (${v.style})`}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {isGenerating && progressStage && (
        <div className="flex items-center gap-2.5 text-xs text-[#D4FF00] bg-[#101010] border border-[#D4FF00]/40 rounded-lg px-3.5 py-2.5">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>{progressStage}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 text-xs text-[#3DDC84] bg-[#101010] border border-[#3DDC84]/40 rounded-lg px-3.5 py-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="text-xs text-[#FF5C5C] bg-[#101010] border border-[#FF5C5C]/40 rounded-lg px-3.5 py-2.5">
          {errorMsg}
        </div>
      )}

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => void handleGenerateVideo()}
          disabled={isGenerating || isExporting || scriptText.trim().length < 20}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#D4FF00] text-[#101010] font-bold text-sm hover:bg-[#E5FF66] transition-colors cursor-pointer disabled:opacity-45"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>جاري إنشاء الفيديو...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>إنشاء الفيديو وحفظه في المكتبة</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
