import React, { useEffect, useRef, useState } from 'react';
import {
  Mic,
  Square,
  Upload,
  Trash2,
  Volume2,
  VolumeX,
  Wand2,
  ArrowLeftRight,
  Sparkles,
  Play,
  Loader2,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import {
  EDGE_ARABIC_VOICES,
  formatTimecode,
  type LessonId,
  type ScheduledScene,
  type VoiceEngine,
} from '../data/lessonStoryboard';
import { sarbAudioEngine } from '../audio/sfxEngine';

const VOICE_PROFILES: Record<
  VoiceEngine,
  { id: VoiceEngine; label: string; badge: string; desc: string }
> = {
  'edge-tts': {
    id: 'edge-tts',
    label: 'الصوت المجاني بلا حدود (GitHub Edge TTS)',
    badge: 'Edge TTS',
    desc: 'مجاني 100% بدون قيود أو كوتا يومية · 10 أصوات عربية متنوعة',
  },
  charon: {
    id: 'charon',
    label: 'الصوت الرسمي لأكاديمية سَرب (Charon · Gemini)',
    badge: 'Charon',
    desc: 'صوت Gemini الرسمي (يخضع لحصة الاستخدام اليومية للـ API)',
  },
};

const EDGE_RATE_OPTIONS = [
  { id: '-4%', label: 'هادئ (-4%)' },
  { id: '+4%', label: 'طبيعي (+4%)' },
  { id: '+10%', label: 'سريع (+10%)' },
] as const;

interface VoiceSyncPanelProps {
  lessonId: LessonId;
  voiceEngine: VoiceEngine;
  onVoiceEngineChange: (engine: VoiceEngine) => void;
  edgeVoice: string;
  onEdgeVoiceChange: (voiceId: string) => void;
  edgeRate: string;
  onEdgeRateChange: (rate: string) => void;
  hasVoiceover: boolean;
  voiceFileName: string | null;
  voiceDurationMs: number;
  waveformPeaks: number[];
  currentTimeMs: number;
  totalDurationMs: number;
  scheduledScenes: ScheduledScene[];
  voiceVolume: number;
  voiceMuted: boolean;
  sfxVolume: number;
  sfxMuted: boolean;
  isSyncMode: boolean;
  syncSceneIndex: number;
  isExporting: boolean;
  onUploadAudio: (file: File) => Promise<void>;
  onRecordComplete: (blob: Blob) => Promise<void>;
  onGeneratedAudio: (blob: Blob, label: string, autoFit: boolean) => Promise<void>;
  onClearVoiceover: () => void;
  onVoiceVolumeChange: (vol: number) => void;
  onToggleVoiceMute: () => void;
  onSfxVolumeChange: (vol: number) => void;
  onToggleSfxMute: () => void;
  onFitScenesToVoice: () => void;
  onStartTapSync: () => void;
  onTapSyncNextScene: () => void;
  onCancelTapSync: () => void;
  onSeek: (timeMs: number) => void;
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

export const VoiceSyncPanel: React.FC<VoiceSyncPanelProps> = ({
  lessonId,
  voiceEngine,
  onVoiceEngineChange,
  edgeVoice,
  onEdgeVoiceChange,
  edgeRate,
  onEdgeRateChange,
  hasVoiceover,
  voiceFileName,
  voiceDurationMs,
  waveformPeaks,
  currentTimeMs,
  totalDurationMs,
  scheduledScenes,
  voiceVolume,
  voiceMuted,
  sfxVolume,
  sfxMuted,
  isSyncMode,
  syncSceneIndex,
  isExporting,
  onUploadAudio,
  onRecordComplete,
  onGeneratedAudio,
  onClearVoiceover,
  onVoiceVolumeChange,
  onToggleVoiceMute,
  onSfxVolumeChange,
  onToggleSfxMute,
  onFitScenesToVoice,
  onStartTapSync,
  onTapSyncNextScene,
  onCancelTapSync,
  onSeek,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const sampleAudioRef = useRef<HTMLAudioElement | null>(null);

  const defaultFullScript = scheduledScenes.map((s) => s.narration).join('\n');

  const [ttsScript, setTtsScript] = useState<string>(defaultFullScript);
  const [autoFitOnGenerate, setAutoFitOnGenerate] = useState<boolean>(true);
  const [isGeneratingTts, setIsGeneratingTts] = useState<boolean>(false);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [ttsSuccess, setTtsSuccess] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordMs, setRecordMs] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Sync script textarea automatically whenever active lesson changes
  useEffect(() => {
    setTtsScript(scheduledScenes.map((s) => s.narration).join('\n'));
    setTtsError(null);
    setTtsSuccess(null);
  }, [lessonId]);

  const activeVoiceProfile = VOICE_PROFILES[voiceEngine];
  const selectedEdgeOption =
    EDGE_ARABIC_VOICES.find((v) => v.id === edgeVoice) ?? EDGE_ARABIC_VOICES[0];

  const requestTtsAudio = async (
    text: string,
    overrideEngine?: VoiceEngine,
    overrideEdgeVoice?: string
  ): Promise<{ blob: Blob }> => {
    const targetEngine = overrideEngine ?? voiceEngine;
    const targetVoice = overrideEdgeVoice ?? edgeVoice;
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        engine: targetEngine,
        edgeVoice: targetVoice,
        edgeRate,
      }),
    });

    const rawText = await res.text();
    let data: {
      audioBase64?: string;
      mimeType?: string;
      error?: string;
    } = {};
    try {
      data = JSON.parse(rawText);
    } catch {
      throw new Error(
        res.ok
          ? 'استجابة غير صالحة من خادم الصوت.'
          : `تعذّر الاتصال بخدمة توليد الصوت (${res.status}).`
      );
    }

    if (!res.ok || !data.audioBase64) {
      throw new Error(data.error || 'تعذّر توليد الصوت من الخادم.');
    }

    const fallbackMime = targetEngine === 'edge-tts' ? 'audio/mpeg' : 'audio/wav';
    const blob = base64ToBlob(data.audioBase64, data.mimeType || fallbackMime);
    return { blob };
  };

  const handleGenerateFullVoiceover = async () => {
    setTtsError(null);
    setTtsSuccess(null);
    const trimmed = ttsScript.trim();
    if (!trimmed) {
      setTtsError('يرجى لصق أو كتابة السكريبت أولاً قبل التوليد.');
      return;
    }

    void sarbAudioEngine.resume();

    setIsGeneratingTts(true);
    try {
      const { blob } = await requestTtsAudio(trimmed);
      const voiceTag =
        voiceEngine === 'edge-tts'
          ? `Edge TTS · ${selectedEdgeOption.nameAr}`
          : activeVoiceProfile.badge;
      await onGeneratedAudio(blob, `صوت سَرب · ${voiceTag}`, autoFitOnGenerate);
      setTtsSuccess(
        autoFitOnGenerate
          ? `تم توليد الصوت (${voiceTag}) وضبط مدة المشاهد (${scheduledScenes.length} مشاهد) بنجاح.`
          : `تم توليد الصوت (${voiceTag}) وتطبيقه على المسار الصوتي بنجاح.`
      );
    } catch (err: unknown) {
      setTtsError(
        err instanceof Error && err.message
          ? err.message
          : 'حدث خطأ أثناء توليد الصوت أو تطبيقه على الفيديو.'
      );
    } finally {
      setIsGeneratingTts(false);
    }
  };

  const handlePreviewVoiceSample = async (previewEdgeVoiceId?: string) => {
    setTtsError(null);
    if (sampleAudioRef.current) {
      sampleAudioRef.current.pause();
      sampleAudioRef.current = null;
    }
    void sarbAudioEngine.resume();
    const targetEngine: VoiceEngine = previewEdgeVoiceId ? 'edge-tts' : voiceEngine;
    const key = previewEdgeVoiceId ?? voiceEngine;
    setPreviewingVoiceId(key);

    let objectUrl: string | null = null;
    try {
      const sampleText = 'أهلاً بك في أكاديمية سَرب. نتعلّم معاً، ونبني أثرًا معًا!';
      const { blob } = await requestTtsAudio(sampleText, targetEngine, previewEdgeVoiceId);
      objectUrl = URL.createObjectURL(blob);
      const audio = new Audio(objectUrl);
      sampleAudioRef.current = audio;
      const cleanup = () => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = null;
        }
        setPreviewingVoiceId(null);
      };
      audio.onended = cleanup;
      audio.onerror = () => {
        cleanup();
        setTtsError('تعذّر تشغيل عينة الصوت في المتصفح.');
      };
      await audio.play();
    } catch (err: unknown) {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setTtsError(err instanceof Error ? err.message : 'تعذّر تشغيل عينة الصوت.');
      setPreviewingVoiceId(null);
    }
  };

  const handleCopyLessonScript = async () => {
    const full = scheduledScenes.map((s) => s.narration).join('\n');
    setTtsScript(full);
    try {
      await navigator.clipboard.writeText(full);
      setCopiedScript(true);
      window.setTimeout(() => setCopiedScript(false), 1800);
    } catch {
      // Filled into textarea even if clipboard write is blocked
    }
  };

  const startRecording = async () => {
    setAudioError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setAudioError('المتصفح لا يدعم تسجيل الصوت من الميكروفون.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordChunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) recordChunksRef.current.push(ev.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        const blob = new Blob(recordChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setIsRecording(false);
        setRecordMs(0);
        await onRecordComplete(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      const startedAt = Date.now();
      timerRef.current = window.setInterval(() => {
        setRecordMs(Date.now() - startedAt);
      }, 100);
    } catch {
      setAudioError('تعذّر الوصول إلى الميكروفون. تأكد من منح الإذن أو ارفع ملفاً صوتياً.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setAudioError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await onUploadAudio(file);
    } catch {
      setAudioError('تعذّر قراءة الملف الصوتي. جرّب صيغة MP3 أو WAV أو M4A.');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* AI Script-to-Voice Generator */}
      <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-4 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[#FFFFFF]">
              توليد التعليق الصوتي الموحّد لأكاديمية سَرب
            </h2>
            <p className="text-xs text-[#8A8A8A] mt-0.5">
              يستخدم الاستوديو صوت سَرب الرسمي الموحّد فقط لضمان ثبات الهوية الصوتية في جميع الفيديوهات
            </p>
          </div>

          <button
            type="button"
            onClick={handleCopyLessonScript}
            disabled={isGeneratingTts || isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#242424] border border-[#2A2A2A] text-xs text-[#E6E6E6] hover:text-[#D4FF00] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copiedScript ? 'تم النسخ والتعبئة' : 'تعبئة سكريبت الدرس'}</span>
          </button>
        </div>

        {/* Script Textarea */}
        <textarea
          value={ttsScript}
          onChange={(e) => setTtsScript(e.target.value)}
          rows={5}
          placeholder="ألصق السكريبت العربي هنا لتوليد التعليق الصوتي..."
          disabled={isGeneratingTts || isExporting}
          className="w-full bg-[#101010] border border-[#2A2A2A] focus:border-[#D4FF00] focus:outline-none rounded-xl p-3 text-sm text-[#FFFFFF] leading-relaxed resize-y"
        />

        {/* Unified Voice Engine Switcher (Free Unlimited Edge TTS vs Charon) */}
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(Object.values(VOICE_PROFILES)).map((profile) => {
              const selected = voiceEngine === profile.id;
              return (
                <button
                  key={profile.id}
                  type="button"
                  disabled={isGeneratingTts || isExporting}
                  onClick={() => {
                    onVoiceEngineChange(profile.id);
                    setTtsError(null);
                    setTtsSuccess(null);
                  }}
                  className={`text-right px-3.5 py-2.5 rounded-xl border transition-colors cursor-pointer disabled:opacity-50 ${
                    selected
                      ? 'bg-[#242424] border-[#D4FF00]'
                      : 'bg-[#101010] border-[#2A2A2A] hover:border-[#3A3A3A]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs font-bold ${
                        selected ? 'text-[#D4FF00]' : 'text-[#FFFFFF]'
                      }`}
                    >
                      {profile.badge}
                    </span>
                    <span className="text-[11px] text-[#8A8A8A]">
                      {profile.id === 'edge-tts' ? 'مجاني بلا حدود' : 'Gemini الرسمي'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#E6E6E6]/85 mt-1 leading-snug">
                    {profile.desc}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Curated 10 Free Unlimited Arabic Voices Picker (Edge TTS) */}
          {voiceEngine === 'edge-tts' && (
            <div className="bg-[#101010] border border-[#2A2A2A] rounded-xl p-3 flex flex-col gap-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#FFFFFF]">
                  اختر الصوت العربي المجاني (بلا حدود) واضغط زر التشغيل للمعاينة
                </span>

                <div className="flex items-center gap-1">
                  {EDGE_RATE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={isGeneratingTts || isExporting}
                      onClick={() => onEdgeRateChange(opt.id)}
                      className={`px-2 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                        edgeRate === opt.id
                          ? 'bg-[#D4FF00] text-[#101010] border-[#D4FF00] font-bold'
                          : 'bg-[#1C1C1C] text-[#8A8A8A] border-[#2A2A2A] hover:text-[#FFFFFF]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-0.5">
                {EDGE_ARABIC_VOICES.map((voice) => {
                  const isSelected = edgeVoice === voice.id;
                  const isPreviewingThis = previewingVoiceId === voice.id;
                  return (
                    <div
                      key={voice.id}
                      onClick={() => {
                        if (!isGeneratingTts && !isExporting) {
                          onEdgeVoiceChange(voice.id);
                        }
                      }}
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#242424] border-[#D4FF00]'
                          : 'bg-[#1C1C1C] border-[#2A2A2A] hover:border-[#3A3A3A]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-xs font-bold">
                          <span className={isSelected ? 'text-[#D4FF00]' : 'text-[#FFFFFF]'}>
                            {voice.nameAr}
                          </span>
                          <span aria-hidden="true" className="text-[#8A8A8A]">·</span>
                          <span className="text-[11px] font-normal text-[#8A8A8A]">
                            {voice.gender === 'female' ? 'نسائي' : 'رجالي'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#E6E6E6]/80 truncate mt-0.5">
                          {voice.dialect}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdgeVoiceChange(voice.id);
                          void handlePreviewVoiceSample(voice.id);
                        }}
                        disabled={isGeneratingTts || previewingVoiceId !== null}
                        title={`سماع عينة ${voice.nameAr}`}
                        className="p-1.5 rounded-md bg-[#101010] border border-[#2A2A2A] text-[#E6E6E6] hover:text-[#D4FF00] hover:border-[#D4FF00] transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                      >
                        {isPreviewingThis ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D4FF00]" />
                        ) : (
                          <Play className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Unified Voice Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#101010] border border-[#2A2A2A] rounded-xl px-3.5 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() =>
                  void handlePreviewVoiceSample(
                    voiceEngine === 'edge-tts' ? edgeVoice : undefined
                  )
                }
                disabled={isGeneratingTts || previewingVoiceId !== null}
                title="سماع عينة الصوت المختار"
                className="p-2 rounded-lg bg-[#1C1C1C] border border-[#2A2A2A] text-[#E6E6E6] hover:text-[#D4FF00] hover:border-[#D4FF00] transition-colors shrink-0 cursor-pointer disabled:opacity-50"
              >
                {previewingVoiceId !== null ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#D4FF00]" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </button>

              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#D4FF00] truncate">
                  {voiceEngine === 'edge-tts'
                    ? `الصوت المجاني المختار: ${selectedEdgeOption.nameAr} (${selectedEdgeOption.dialect})`
                    : activeVoiceProfile.label}
                </div>
                <p className="text-[11px] text-[#8A8A8A] mt-0.5 truncate">
                  {voiceEngine === 'edge-tts'
                    ? `${selectedEdgeOption.style} · سرعة ${edgeRate} · مجاني بلا حدود`
                    : activeVoiceProfile.desc}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerateFullVoiceover}
              disabled={isGeneratingTts || isExporting || isRecording}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#D4FF00] text-[#101010] font-bold text-sm hover:bg-[#E5FF66] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              {isGeneratingTts ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري توليد الصوت...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>توليد الصوت وتطبيقه</span>
                </>
              )}
            </button>
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs text-[#E6E6E6] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={autoFitOnGenerate}
            onChange={(e) => setAutoFitOnGenerate(e.target.checked)}
            className="accent-[#D4FF00] w-3.5 h-3.5 cursor-pointer"
          />
          <span>ضبط مدة جميع المشاهد تلقائياً لتتوافق مع طول الصوت المولّد</span>
        </label>

        {ttsSuccess && (
          <div className="flex items-center gap-2 text-xs text-[#3DDC84] bg-[#101010] border border-[#3DDC84]/40 rounded-lg px-3 py-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{ttsSuccess}</span>
          </div>
        )}

        {ttsError && (
          <p className="text-xs text-[#FF5C5C] bg-[#101010] border border-[#FF5C5C]/40 rounded-lg px-3 py-2">
            {ttsError}
          </p>
        )}
      </div>

      {/* Voiceover Capture / Upload / Waveform */}
      <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-[#FFFFFF]">أو سجّل / ارفع صوتك يدوياً</h3>
            <p className="text-xs text-[#8A8A8A] mt-0.5">
              يمكنك استبدال الصوت بتسجيل ميكروفون مباشر أو ملف صوتي جاهز
            </p>
          </div>
          {hasVoiceover && (
            <button
              type="button"
              onClick={onClearVoiceover}
              disabled={isExporting || isRecording}
              className="p-2 rounded-lg text-[#8A8A8A] hover:text-[#FF5C5C] hover:bg-[#242424] transition-colors cursor-pointer"
              title="حذف الصوت"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {!isRecording ? (
            <button
              type="button"
              onClick={startRecording}
              disabled={isExporting || isSyncMode || isGeneratingTts}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#242424] text-[#FFFFFF] border border-[#2A2A2A] font-medium text-xs hover:border-[#D4FF00] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40"
            >
              <Mic className="w-3.5 h-3.5 text-[#D4FF00]" />
              <span>تسجيل عبر الميكروفون</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#FF5C5C] text-[#FFFFFF] font-semibold text-xs hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <Square className="w-3.5 h-3.5 fill-current" />
              <span dir="ltr" className="font-mono tabular-nums">
                إيقاف ({formatTimecode(recordMs)})
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isExporting || isRecording || isSyncMode || isGeneratingTts}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#242424] text-[#FFFFFF] border border-[#2A2A2A] font-medium text-xs hover:border-[#D4FF00] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40"
          >
            <Upload className="w-3.5 h-3.5 text-[#D4FF00]" />
            <span>رفع ملف صوتي</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {audioError && (
          <p className="text-xs text-[#FF5C5C] bg-[#101010] border border-[#FF5C5C]/30 rounded-lg px-3 py-2">
            {audioError}
          </p>
        )}

        {/* Waveform & Sync Controls when Audio is Loaded */}
        {hasVoiceover ? (
          <div className="flex flex-col gap-3 pt-3 border-t border-[#2A2A2A]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#E6E6E6] truncate max-w-[240px]">
                {voiceFileName || 'تعليق صوتي'}
              </span>
              <span dir="ltr" className="font-mono text-[#D4FF00] tabular-nums">
                {formatTimecode(voiceDurationMs)}
              </span>
            </div>

            {/* Interactive Waveform */}
            <div
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                onSeek(ratio * totalDurationMs);
              }}
              dir="ltr"
              className="relative h-14 bg-[#101010] border border-[#2A2A2A] rounded-lg px-2 flex items-center gap-[2px] cursor-pointer overflow-hidden"
              title="انقر للانتقال إلى موضع معين"
            >
              {waveformPeaks.map((peak, i) => {
                const barRatio = i / Math.max(1, waveformPeaks.length);
                const playRatio = currentTimeMs / Math.max(1, totalDurationMs);
                const passed = barRatio <= playRatio;
                return (
                  <div
                    key={i}
                    style={{ height: `${Math.round(peak * 85)}%` }}
                    className={`flex-1 rounded-full transition-colors ${
                      passed ? 'bg-[#D4FF00]' : 'bg-[#3A3A3A]'
                    }`}
                  />
                );
              })}
            </div>

            {/* Sync Tools */}
            {!isSyncMode ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onStartTapSync}
                  disabled={isExporting}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#242424] text-[#FFFFFF] border border-[#3A3A3A] text-xs font-medium hover:border-[#D4FF00] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-[#D4FF00]" />
                  <span>مزامنة حية بالضغط</span>
                </button>

                <button
                  type="button"
                  onClick={onFitScenesToVoice}
                  disabled={isExporting}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#242424] text-[#E6E6E6] border border-[#2A2A2A] text-xs font-medium hover:text-[#FFFFFF] hover:bg-[#2A2A2A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5 text-[#D4FF00]" />
                  <span>ملاءمة المدد تلقائياً</span>
                </button>
              </div>
            ) : (
              <div className="bg-[#101010] border border-[#D4FF00] rounded-lg p-3 flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#D4FF00] font-semibold">
                    وضع المزامنة الحية — المشهد {syncSceneIndex + 1} من {scheduledScenes.length}
                  </span>
                  <button
                    type="button"
                    onClick={onCancelTapSync}
                    className="text-[#8A8A8A] hover:text-[#FFFFFF] cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
                <p className="text-xs text-[#E6E6E6]">
                  {scheduledScenes[syncSceneIndex]?.narration}
                </p>
                <button
                  type="button"
                  onClick={onTapSyncNextScene}
                  className="w-full py-2.5 rounded-lg bg-[#D4FF00] text-[#101010] font-bold text-sm hover:bg-[#E5FF66] transition-colors cursor-pointer"
                >
                  {syncSceneIndex < scheduledScenes.length - 1
                    ? 'انتقل للمشهد التالي عند هذه اللحظة'
                    : 'إنهاء المزامنة وتثبيت النهاية'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-[#8A8A8A] bg-[#101010] border border-[#2A2A2A] rounded-lg px-3 py-2.5">
            لا يوجد تعليق صوتي مرفق حالياً — يمكنك توليده من السكريبت أعلاه أو تسجيل صوتك.
          </div>
        )}
      </div>

      {/* Audio Mixer */}
      <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-4 flex flex-col gap-3.5">
        <h3 className="text-sm font-semibold text-[#FFFFFF]">مازج الصوت والمؤثرات</h3>

        {/* Voice Track */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleVoiceMute}
            className="p-1.5 rounded-md bg-[#242424] text-[#E6E6E6] hover:text-[#FFFFFF] cursor-pointer"
            title={voiceMuted ? 'إلغاء كتم التعليق' : 'كتم التعليق'}
          >
            {voiceMuted ? <VolumeX className="w-4 h-4 text-[#FF5C5C]" /> : <Volume2 className="w-4 h-4 text-[#D4FF00]" />}
          </button>
          <span className="text-xs text-[#E6E6E6] w-24 shrink-0">التعليق الصوتي</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={voiceMuted ? 0 : voiceVolume}
            onChange={(e) => onVoiceVolumeChange(Number(e.target.value))}
            className="flex-1 accent-[#D4FF00] cursor-pointer"
          />
          <span dir="ltr" className="font-mono text-xs text-[#8A8A8A] w-10 text-right tabular-nums">
            {Math.round((voiceMuted ? 0 : voiceVolume) * 100)}%
          </span>
        </div>

        {/* SFX Track */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSfxMute}
            className="p-1.5 rounded-md bg-[#242424] text-[#E6E6E6] hover:text-[#FFFFFF] cursor-pointer"
            title={sfxMuted ? 'إلغاء كتم المؤثرات' : 'كتم المؤثرات'}
          >
            {sfxMuted ? <VolumeX className="w-4 h-4 text-[#FF5C5C]" /> : <Volume2 className="w-4 h-4 text-[#D4FF00]" />}
          </button>
          <span className="text-xs text-[#E6E6E6] w-24 shrink-0">المؤثرات الحركية</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={sfxMuted ? 0 : sfxVolume}
            onChange={(e) => onSfxVolumeChange(Number(e.target.value))}
            className="flex-1 accent-[#D4FF00] cursor-pointer"
          />
          <span dir="ltr" className="font-mono text-xs text-[#8A8A8A] w-10 text-right tabular-nums">
            {Math.round((sfxMuted ? 0 : sfxVolume) * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};
