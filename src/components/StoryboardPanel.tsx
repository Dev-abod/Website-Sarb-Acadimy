import React from 'react';
import { Minus, Plus, RotateCcw, Volume2 } from 'lucide-react';
import { formatTimecode, type ScheduledScene, type SfxCueType } from '../data/lessonStoryboard';

interface StoryboardPanelProps {
  scheduledScenes: ScheduledScene[];
  activeSceneId: string;
  isExporting: boolean;
  onSelectScene: (startMs: number) => void;
  onAdjustDuration: (sceneId: string, deltaMs: number) => void;
  onPreviewSfx: (cue: SfxCueType) => void;
  onResetDurations: () => void;
}

export const StoryboardPanel: React.FC<StoryboardPanelProps> = ({
  scheduledScenes,
  activeSceneId,
  isExporting,
  onSelectScene,
  onAdjustDuration,
  onPreviewSfx,
  onResetDurations,
}) => {
  return (
    <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl overflow-hidden flex flex-col">
      <div className="px-4 py-3.5 border-b border-[#2A2A2A] flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#FFFFFF]">
            مشاهد الدرس ({scheduledScenes.length})
          </h2>
          <p className="text-xs text-[#8A8A8A] mt-0.5">
            اضغط على أي مشهد للانتقال إليه أو عدّل مدته بدقة
          </p>
        </div>

        <button
          type="button"
          onClick={onResetDurations}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#242424] text-xs text-[#E6E6E6] hover:text-[#FFFFFF] hover:bg-[#2A2A2A] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>استعادة التوقيت</span>
        </button>
      </div>

      <div className="divide-y divide-[#2A2A2A] max-h-[540px] overflow-y-auto">
        {scheduledScenes.map((scene) => {
          const isActive = scene.id === activeSceneId;
          return (
            <div
              key={scene.id}
              onClick={() => !isExporting && onSelectScene(scene.startMs)}
              className={`px-4 py-3.5 transition-colors cursor-pointer ${
                isActive ? 'bg-[#242424]' : 'hover:bg-[#242424]/50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {/* Unboxed quiet metadata line */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#8A8A8A] mb-1">
                    <span
                      className={`font-mono font-semibold tabular-nums ${
                        isActive ? 'text-[#D4FF00]' : 'text-[#E6E6E6]'
                      }`}
                    >
                      0{scene.index}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span dir="ltr" className="font-mono tabular-nums">
                      {formatTimecode(scene.startMs)} – {formatTimecode(scene.endMs)}
                    </span>
                    {scene.mascotActive && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#D4FF00]">ظهور الشخصية</span>
                      </>
                    )}
                  </div>

                  <h3 className="text-sm font-semibold text-[#FFFFFF] leading-snug">
                    {scene.title}
                  </h3>

                  <p className="text-xs text-[#E6E6E6]/90 leading-relaxed mt-1.5">
                    {scene.narration}
                  </p>
                </div>

                {/* Duration & SFX controls */}
                <div
                  className="flex flex-col items-end gap-2 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-1 bg-[#101010] border border-[#2A2A2A] rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => onAdjustDuration(scene.id, -200)}
                      disabled={isExporting || scene.durationMs <= 1600}
                      title="تقليل 0.2 ثانية"
                      className="p-1.5 text-[#E6E6E6] hover:text-[#D4FF00] disabled:opacity-30 cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span
                      dir="ltr"
                      className="font-mono text-xs text-[#FFFFFF] px-1.5 tabular-nums min-w-[42px] text-center"
                    >
                      {(scene.durationMs / 1000).toFixed(1)}s
                    </span>
                    <button
                      type="button"
                      onClick={() => onAdjustDuration(scene.id, 200)}
                      disabled={isExporting || scene.durationMs >= 20000}
                      title="زيادة 0.2 ثانية"
                      className="p-1.5 text-[#E6E6E6] hover:text-[#D4FF00] disabled:opacity-30 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onPreviewSfx(scene.sfxCue)}
                    className="flex items-center gap-1 text-[11px] text-[#8A8A8A] hover:text-[#D4FF00] transition-colors cursor-pointer"
                    title="معاينة المؤثر الصوتي"
                  >
                    <Volume2 className="w-3 h-3" />
                    <span>معاينة المؤثر</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
