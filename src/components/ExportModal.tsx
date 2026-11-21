import React from 'react';
import { Download, Film, X } from 'lucide-react';
import { formatTimecode } from '../data/lessonStoryboard';

interface ExportModalProps {
  isOpen: boolean;
  isExporting: boolean;
  exportSlug: string;
  progress: number;
  stageLabel: string;
  currentTimeMs: number;
  totalDurationMs: number;
  exportedUrl: string | null;
  exportedMime: string | null;
  exportedSizeBytes: number | null;
  exportError: string | null;
  onStartExport: () => void;
  onCancelExport: () => void;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  isExporting,
  exportSlug,
  progress,
  stageLabel,
  currentTimeMs,
  totalDurationMs,
  exportedUrl,
  exportedMime,
  exportedSizeBytes,
  exportError,
  onStartExport,
  onCancelExport,
  onClose,
}) => {
  if (!isOpen) return null;

  const isMp4 = !exportedMime || exportedMime.includes('mp4');
  const extension = isMp4 ? 'mp4' : 'webm';
  const fileName = `${exportSlug}.${extension}`;
  const formattedSize =
    exportedSizeBytes && exportedSizeBytes > 0
      ? `${(exportedSizeBytes / (1024 * 1024)).toFixed(1)} MB`
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
    >
      <div className="w-full max-w-lg bg-[#1C1C1C] border border-[#2A2A2A] rounded-2xl p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Film className="w-5 h-5 text-[#D4FF00]" />
            <h2 id="export-modal-title" className="text-lg font-bold text-[#FFFFFF]">
              تصدير الفيديو بصيغة MP4 (60 FPS)
            </h2>
          </div>
          {!isExporting && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#8A8A8A] hover:text-[#FFFFFF] hover:bg-[#242424] cursor-pointer"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="text-sm text-[#E6E6E6] leading-relaxed">
          سيتم تصيير جميع مشاهد الدرس إطاراً بإطار بدقة <span dir="ltr" className="font-mono text-[#FFFFFF]">1080×1920</span> وبمعدل <span dir="ltr" className="font-mono text-[#D4FF00]">60 FPS</span> مع مزج التعليق الصوتي والمؤثرات في ملف <span dir="ltr" className="font-mono text-[#D4FF00]">MP4</span> متوافق مع جميع الأجهزة ومنصات الريلز.
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-[#8A8A8A] border-y border-[#2A2A2A] py-3">
          <span>الدقة: 1080×1920</span>
          <span aria-hidden="true">·</span>
          <span className="text-[#D4FF00] font-semibold" dir="ltr">60 FPS · MP4</span>
          <span aria-hidden="true">·</span>
          <span>النسبة: 9:16 Reels</span>
          <span aria-hidden="true">·</span>
          <span dir="ltr" className="font-mono tabular-nums text-[#E6E6E6]">
            المدة: {formatTimecode(totalDurationMs)}
          </span>
        </div>

        {exportError && (
          <div className="text-xs text-[#FF5C5C] bg-[#101010] border border-[#FF5C5C]/40 rounded-lg px-3.5 py-2.5">
            {exportError}
          </div>
        )}

        {isExporting && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-[#D4FF00] font-semibold truncate">{stageLabel}</span>
              <span dir="ltr" className="font-mono text-[#FFFFFF] tabular-nums shrink-0">
                {Math.round(progress * 100)}% ({formatTimecode(currentTimeMs)})
              </span>
            </div>
            <div className="w-full h-2 bg-[#101010] rounded-full overflow-hidden border border-[#2A2A2A]">
              <div
                style={{ width: `${Math.round(progress * 100)}%` }}
                className="h-full bg-[#D4FF00] transition-all duration-100"
              />
            </div>
          </div>
        )}

        {exportedUrl && !isExporting && (
          <div className="flex flex-col gap-3">
            <div className="rounded-xl overflow-hidden bg-[#101010] border border-[#2A2A2A] max-h-[300px] flex justify-center">
              <video
                src={exportedUrl}
                controls
                playsInline
                className="max-h-[300px] w-auto"
              />
            </div>

            <a
              href={exportedUrl}
              download={fileName}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#D4FF00] text-[#101010] font-bold text-sm hover:bg-[#E5FF66] transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>
                تنزيل الفيديو إلى جهازك (60 FPS · {extension.toUpperCase()}
                {formattedSize ? ` · ${formattedSize}` : ''})
              </span>
            </a>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-1">
          {isExporting ? (
            <button
              type="button"
              onClick={onCancelExport}
              className="px-4 py-2 rounded-lg bg-[#242424] text-[#FF5C5C] border border-[#FF5C5C]/40 text-sm font-medium hover:bg-[#2A2A2A] cursor-pointer"
            >
              إلغاء التصدير
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-[#242424] text-[#E6E6E6] text-sm font-medium hover:text-[#FFFFFF] cursor-pointer"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={onStartExport}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#D4FF00] text-[#101010] font-bold text-sm hover:bg-[#E5FF66] transition-colors cursor-pointer"
              >
                <Film className="w-4 h-4" />
                <span>{exportedUrl ? 'إعادة التصدير' : 'بدء التصدير الفعلي'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
