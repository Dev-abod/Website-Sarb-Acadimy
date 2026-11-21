import React from 'react';
import {
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Music,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import {
  formatTimecode,
  REEL_DIMENSIONS,
  type ScheduledScene,
} from '../data/lessonStoryboard';

interface ReelStageProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isPlaying: boolean;
  isExporting: boolean;
  isExpanded: boolean;
  hasVoiceover: boolean;
  currentTimeMs: number;
  totalDurationMs: number;
  activeScene: ScheduledScene;
  scheduledScenes: ScheduledScene[];
  showSafeZones: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  onSeek: (timeMs: number) => void;
  onToggleSafeZones: () => void;
  onToggleExpand: () => void;
  onOpenAudioPanel: () => void;
}

export const ReelStage: React.FC<ReelStageProps> = ({
  canvasRef,
  isPlaying,
  isExporting,
  isExpanded,
  hasVoiceover,
  currentTimeMs,
  totalDurationMs,
  activeScene,
  scheduledScenes,
  showSafeZones,
  onTogglePlay,
  onRestart,
  onSeek,
  onToggleSafeZones,
  onToggleExpand,
  onOpenAudioPanel,
}) => {
  return (
    <div
      className={
        isExpanded
          ? 'fixed inset-0 z-40 bg-[#101010]/98 backdrop-blur-sm p-4 sm:p-6 flex flex-col items-center justify-center gap-3'
          : 'flex flex-col items-center gap-4 w-full'
      }
    >
      {/* 9:16 Stage Header Controls */}
      <div
        className={`flex items-center justify-between gap-2 text-xs text-[#E6E6E6] ${
          isExpanded ? 'w-full max-w-[460px]' : 'w-full max-w-[380px]'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-[#D4FF00] tabular-nums shrink-0">
            1080×1920
          </span>
          <span aria-hidden="true" className="text-[#5C5C5C]">·</span>
          <span className="truncate text-[#8A8A8A]">
            {activeScene.title}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onToggleSafeZones}
            disabled={isExporting}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 ${
              showSafeZones
                ? 'bg-[#D4FF00] text-[#101010]'
                : 'bg-[#1C1C1C] text-[#E6E6E6] hover:bg-[#242424] border border-[#2A2A2A]'
            }`}
          >
            {showSafeZones ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>الهوامش</span>
          </button>

          <button
            type="button"
            onClick={onToggleExpand}
            title={isExpanded ? 'تصغير الفيديو' : 'تكبير الفيديو'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isExpanded
                ? 'bg-[#D4FF00] text-[#101010]'
                : 'bg-[#1C1C1C] text-[#E6E6E6] hover:bg-[#242424] border border-[#2A2A2A]'
            }`}
          >
            {isExpanded ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>تصغير</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-[#D4FF00]" />
                <span>تكبير</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 9:16 Full-Bleed Canvas Viewport */}
      <div
        className={`relative aspect-[9/16] overflow-hidden bg-[#101010] border border-[#2A2A2A] shadow-2xl ${
          isExpanded
            ? 'h-[72vh] max-h-[820px] w-auto rounded-2xl'
            : 'w-full max-w-[380px] rounded-2xl'
        }`}
      >
        <canvas
          ref={canvasRef}
          width={REEL_DIMENSIONS.width}
          height={REEL_DIMENSIONS.height}
          className="w-full h-full block"
        />
      </div>

      {/* Transport & Timeline Scrubber */}
      <div
        className={`bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-3.5 flex flex-col gap-3 ${
          isExpanded ? 'w-full max-w-[460px]' : 'w-full max-w-[380px]'
        }`}
      >
        {/* Scrubber */}
        <div className="relative flex flex-col gap-1.5">
          <input
            type="range"
            min={0}
            max={totalDurationMs}
            step={20}
            value={Math.min(currentTimeMs, totalDurationMs)}
            onChange={(e) => onSeek(Number(e.target.value))}
            disabled={isExporting}
            aria-label="الخط الزمني للفيديو"
            className="w-full accent-[#D4FF00] cursor-pointer h-1.5 bg-[#2A2A2A] rounded-lg"
          />
          <div className="flex items-center justify-between gap-1 h-1.5 px-0.5">
            {scheduledScenes.map((sc) => {
              const widthPct = (sc.durationMs / Math.max(1, totalDurationMs)) * 100;
              const isCurrent = sc.id === activeScene.id;
              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => onSeek(sc.startMs)}
                  disabled={isExporting}
                  title={`المشهد ${sc.index}: ${sc.title}`}
                  style={{ width: `${widthPct}%` }}
                  className={`h-full rounded-full transition-colors cursor-pointer ${
                    isCurrent ? 'bg-[#D4FF00]' : 'bg-[#3A3A3A] hover:bg-[#5C5C5C]'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Play Controls, Audio Shortcut & Timecode */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onTogglePlay}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D4FF00] text-[#101010] font-semibold text-sm hover:bg-[#E5FF66] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>إيقاف</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>تشغيل</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onRestart}
              disabled={isExporting}
              title="العودة للبداية"
              className="p-2 rounded-lg bg-[#242424] text-[#E6E6E6] hover:text-[#FFFFFF] hover:bg-[#2A2A2A] transition-colors cursor-pointer disabled:opacity-40"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {!isExpanded && (
              <button
                type="button"
                onClick={onOpenAudioPanel}
                disabled={isExporting}
                title="إرفاق أو توليد الصوت"
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
                  hasVoiceover
                    ? 'bg-[#242424] border-[#3DDC84]/50 text-[#3DDC84]'
                    : 'bg-[#242424] border-[#2A2A2A] text-[#E6E6E6] hover:border-[#D4FF00]'
                }`}
              >
                <Music className="w-3.5 h-3.5" />
                <span>{hasVoiceover ? 'الصوت مرفق' : 'إرفاق صوت'}</span>
              </button>
            )}
          </div>

          <div dir="ltr" className="font-mono text-xs text-[#E6E6E6] tabular-nums whitespace-nowrap">
            <span className="text-[#FFFFFF] font-semibold">{formatTimecode(currentTimeMs)}</span>
            <span className="text-[#5C5C5C] mx-1">/</span>
            <span className="text-[#8A8A8A]">{formatTimecode(totalDurationMs)}</span>
          </div>
        </div>

        {/* Live Teleprompter Readout */}
        {!isExpanded && (
          <div className="pt-2.5 border-t border-[#2A2A2A] text-xs leading-relaxed text-[#E6E6E6]">
            <span className="text-[#D4FF00] font-semibold ml-1.5">
              المشهد {activeScene.index}:
            </span>
            <span>{activeScene.narration}</span>
          </div>
        )}
      </div>
    </div>
  );
};
