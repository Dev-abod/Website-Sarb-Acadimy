import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Film, Check, FolderOpen, LayoutGrid, Plus, Sparkles, Layers } from 'lucide-react';
import {
  BUILT_IN_LESSONS,
  computeSchedule,
  EDGE_ARABIC_VOICES,
  findSceneAtTime,
  formatTimecode,
  groupLessonsByCategory,
  LESSONS,
  SARB_ASSETS,
  type LessonDefinition,
  type LessonId,
  type SfxCueType,
  type VoiceEngine,
} from './data/lessonStoryboard';
import {
  buildAllLessons,
  loadLibraryState,
  saveLibraryState,
  type PersistedLibraryState,
} from './data/libraryStorage';
import {
  loadBrandImages,
  renderReelFrame,
  type LoadedBrandImages,
} from './canvas/sarbReelRenderer';
import { sarbAudioEngine } from './audio/sfxEngine';
import { exportReelToMp4 } from './export/mp4Exporter';
import { ReelStage } from './components/ReelStage';
import { StoryboardPanel } from './components/StoryboardPanel';
import { VoiceSyncPanel } from './components/VoiceSyncPanel';
import { ScriptToVideoPanel } from './components/ScriptToVideoPanel';
import { VideoLibraryPanel } from './components/VideoLibraryPanel';
import { ExportModal } from './components/ExportModal';
import { PostsStudioPanel } from './components/PostsStudioPanel';

type DeckTab = 'posts' | 'create' | 'library' | 'storyboard' | 'audio' | 'brand';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const brandImagesRef = useRef<LoadedBrandImages>({
    logoOnDark: null,
    appIcon: null,
    mascot: null,
  });

  const [assetsReady, setAssetsReady] = useState(false);
  const [libraryState, setLibraryState] = useState<PersistedLibraryState>(() =>
    loadLibraryState()
  );
  const [activeTab, setActiveTab] = useState<DeckTab>('posts');
  const [creatorNotice, setCreatorNotice] = useState<string | null>(null);
  const [importedLessonRequest, setImportedLessonRequest] = useState<{
    lesson: LessonDefinition;
    nonce: number;
  } | null>(null);
  const postDownloadFnRef = useRef<(() => void) | null>(null);
  const registerPostDownload = useCallback((fn: (() => void) | null) => {
    postDownloadFnRef.current = fn;
  }, []);
  const handleConvertLessonToPost = useCallback((lesson: LessonDefinition) => {
    setIsPlaying(false);
    sarbAudioEngine.stopVoiceover();
    setImportedLessonRequest({ lesson, nonce: Date.now() });
    setActiveTab('posts');
  }, []);

  const allLessons = useMemo(() => buildAllLessons(libraryState), [libraryState]);
  const sectionGroups = useMemo(() => groupLessonsByCategory(allLessons), [allLessons]);

  const activeLesson: LessonDefinition | null = useMemo(() => {
    if (allLessons.length === 0) return null;
    const found = allLessons.find((l) => l.id === libraryState.activeLessonId);
    return found ?? allLessons[0];
  }, [allLessons, libraryState.activeLessonId]);

  const activeLessonId: LessonId = activeLesson?.id ?? 'empty';
  const scenes = activeLesson?.scenes ?? [];

  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Audio & Voiceover State
  const [hasVoiceover, setHasVoiceover] = useState(false);
  const [voiceFileName, setVoiceFileName] = useState<string | null>(null);
  const [voiceDurationMs, setVoiceDurationMs] = useState(0);
  const [waveformPeaks, setWaveformPeaks] = useState<number[]>([]);
  const [voiceVolume, setVoiceVolume] = useState(1.0);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [sfxVolume, setSfxVolume] = useState(0.65);
  const [sfxMuted, setSfxMuted] = useState(false);

  // Tap-to-Sync State
  const [isSyncMode, setIsSyncMode] = useState(false);
  const [syncSceneIndex, setSyncSceneIndex] = useState(0);
  const syncMarkersRef = useRef<number[]>([]);

  // Export State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportTimeMs, setExportTimeMs] = useState(0);
  const [exportStageLabel, setExportStageLabel] = useState('جاري تصيير الفيديو (60 إطار/ثانية)...');
  const [exportedUrl, setExportedUrl] = useState<string | null>(null);
  const [exportedMime, setExportedMime] = useState<string | null>(null);
  const [exportedSizeBytes, setExportedSizeBytes] = useState<number | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const exportAbortRef = useRef<AbortController | null>(null);
  const lastSceneIdRef = useRef<string | null>(null);
  const hasHydratedServerRef = useRef(false);

  const { scheduled, totalDurationMs } = useMemo(() => computeSchedule(scenes), [scenes]);

  const activeFrameInfo = useMemo(
    () => (scheduled.length > 0 ? findSceneAtTime(scheduled, currentTimeMs) : null),
    [scheduled, currentTimeMs]
  );

  // Persist library state to localStorage + server backup
  useEffect(() => {
    saveLibraryState(libraryState);
    if (hasHydratedServerRef.current) {
      void fetch('/api/library', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(libraryState),
      }).catch(() => {});
    }
  }, [libraryState]);

  // On mount, merge any server-saved custom lessons not yet in localStorage
  useEffect(() => {
    let cancelled = false;
    fetch('/api/library')
      .then((res) => (res.ok ? res.json() : null))
      .then((serverData: Partial<PersistedLibraryState> | null) => {
        if (cancelled) return;
        hasHydratedServerRef.current = true;
        if (!serverData || !Array.isArray(serverData.customLessons)) return;
        setLibraryState((prev) => {
          const existingIds = new Set(prev.customLessons.map((l) => l.id));
          const missing = serverData.customLessons!.filter(
            (l) => l && typeof l.id === 'string' && !existingIds.has(l.id)
          );
          if (missing.length === 0) return prev;
          return {
            ...prev,
            customLessons: [...missing, ...prev.customLessons],
          };
        });
      })
      .catch(() => {
        hasHydratedServerRef.current = true;
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Load fonts & brand images once on mount
  useEffect(() => {
    let mounted = true;
    Promise.all([loadBrandImages(), document.fonts.ready]).then(([imgs]) => {
      if (!mounted) return;
      brandImagesRef.current = imgs;
      setAssetsReady(true);
    });
    return () => {
      mounted = false;
      sarbAudioEngine.stopVoiceover();
    };
  }, []);

  // Close expanded stage on Escape
  useEffect(() => {
    if (!isExpanded) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isExpanded]);

  // Draw current frame when paused/scrubbing or when assets/safeZones update
  useEffect(() => {
    if (isPlaying || isExporting || scheduled.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { scene, progress } = findSceneAtTime(scheduled, currentTimeMs);
    renderReelFrame(
      ctx,
      scene,
      scheduled,
      progress,
      currentTimeMs,
      brandImagesRef.current,
      showSafeZones,
      activeLessonId
    );
  }, [scheduled, currentTimeMs, showSafeZones, assetsReady, isPlaying, isExporting, activeLessonId]);

  // Main Playback Animation Loop (Hardware AudioContext Clock Locked)
  useEffect(() => {
    if (!isPlaying || scheduled.length === 0) return;

    let rafId = 0;

    const tick = () => {
      const next = sarbAudioEngine.getTimelineElapsedMs();
      const clampedNext = Math.min(totalDurationMs, Math.max(0, next));
      const { scene, progress } = findSceneAtTime(scheduled, clampedNext);

      if (scene.id !== lastSceneIdRef.current) {
        lastSceneIdRef.current = scene.id;
        sarbAudioEngine.playSfx(scene.sfxCue);
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        renderReelFrame(
          ctx,
          scene,
          scheduled,
          progress,
          clampedNext,
          brandImagesRef.current,
          showSafeZones,
          activeLessonId
        );
      }

      setCurrentTimeMs(clampedNext);

      if (next >= totalDurationMs) {
        setIsPlaying(false);
        sarbAudioEngine.stopVoiceover();
        return;
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [isPlaying, scheduled, totalDurationMs, showSafeZones, activeLessonId]);

  const handleTogglePlay = useCallback(async () => {
    if (isExporting) return;
    await sarbAudioEngine.resume();

    if (isPlaying) {
      setIsPlaying(false);
      sarbAudioEngine.stopVoiceover();
      return;
    }

    const startFrom = currentTimeMs >= totalDurationMs - 40 ? 0 : currentTimeMs;
    if (startFrom === 0) {
      setCurrentTimeMs(0);
    }

    const { scene } = findSceneAtTime(scheduled, startFrom);
    lastSceneIdRef.current = scene.id;
    sarbAudioEngine.startPlaybackSynced(startFrom);
    sarbAudioEngine.playSfx(scene.sfxCue);
    setIsPlaying(true);
  }, [isExporting, isPlaying, currentTimeMs, totalDurationMs, scheduled]);

  const handleRestart = useCallback(async () => {
    if (isExporting) return;
    await sarbAudioEngine.resume();
    setCurrentTimeMs(0);
    lastSceneIdRef.current = scheduled[0]?.id ?? null;
    if (isPlaying) {
      sarbAudioEngine.startPlaybackSynced(0);
      sarbAudioEngine.playSfx(scheduled[0].sfxCue);
    }
  }, [isExporting, isPlaying, scheduled]);

  const handleSeek = useCallback(
    (timeMs: number) => {
      if (isExporting) return;
      const clamped = Math.max(0, Math.min(totalDurationMs, timeMs));
      setCurrentTimeMs(clamped);
      const { scene } = findSceneAtTime(scheduled, clamped);
      lastSceneIdRef.current = scene.id;
      if (isPlaying) {
        sarbAudioEngine.startPlaybackSynced(clamped);
      }
    },
    [isExporting, totalDurationMs, scheduled, isPlaying]
  );

  const alignScenesWithVoice = useCallback(
    (targetLessonId?: LessonId, overrideNarrations?: string[]) => {
      const targetId = targetLessonId ?? activeLessonId;
      const targetLesson =
        allLessons.find((l) => l.id === targetId) ?? LESSONS[targetId];
      const narrations =
        overrideNarrations ?? targetLesson?.scenes.map((s) => s.narration) ?? [];
      if (narrations.length === 0) return;

      const alignedDurations = sarbAudioEngine.alignSceneDurationsToVoice(narrations);
      if (!alignedDurations) return;

      setLibraryState((prev) => {
        const nextMap: Record<string, number> = {};
        const lessonScenes = targetLesson?.scenes ?? [];
        lessonScenes.forEach((sc, idx) => {
          nextMap[sc.id] = alignedDurations[idx] ?? sc.durationMs;
        });
        return {
          ...prev,
          durationsByLesson: {
            ...prev.durationsByLesson,
            [targetId]: nextMap,
          },
        };
      });
      setCurrentTimeMs(0);
    },
    [activeLessonId, allLessons]
  );

  // Audio Handlers
  const loadAudioBlob = useCallback(async (blob: Blob, label: string) => {
    setIsPlaying(false);
    sarbAudioEngine.stopVoiceover();
    setCurrentTimeMs(0);
    void sarbAudioEngine.resume();
    const decoded = await sarbAudioEngine.decodeAudioBlob(blob);
    sarbAudioEngine.setVoiceBuffer(decoded.buffer);
    setHasVoiceover(true);
    setVoiceFileName(label);
    setVoiceDurationMs(decoded.durationMs);
    setWaveformPeaks(decoded.peaks);
    return decoded.durationMs;
  }, []);

  const handleUploadAudio = useCallback(
    async (file: File) => {
      const durationMs = await loadAudioBlob(file, file.name);
      if (durationMs >= 2000) {
        alignScenesWithVoice();
      }
      setActiveTab('audio');
    },
    [loadAudioBlob, alignScenesWithVoice]
  );

  const handleRecordComplete = useCallback(
    async (blob: Blob) => {
      const durationMs = await loadAudioBlob(blob, 'تسجيل مباشر من الميكروفون');
      if (durationMs >= 2000) {
        alignScenesWithVoice();
      }
    },
    [loadAudioBlob, alignScenesWithVoice]
  );

  const handleGeneratedAudio = useCallback(
    async (blob: Blob, label: string, autoFit: boolean) => {
      const durationMs = await loadAudioBlob(blob, label);
      if (autoFit && durationMs >= 2000) {
        alignScenesWithVoice();
      }
    },
    [loadAudioBlob, alignScenesWithVoice]
  );

  const handleClearVoiceover = useCallback(() => {
    sarbAudioEngine.setVoiceBuffer(null);
    setHasVoiceover(false);
    setVoiceFileName(null);
    setVoiceDurationMs(0);
    setWaveformPeaks([]);
    setIsSyncMode(false);
  }, []);

  const handleVoiceVolumeChange = useCallback(
    (vol: number) => {
      setVoiceVolume(vol);
      setVoiceMuted(vol === 0);
      sarbAudioEngine.setVoiceSettings(vol, vol === 0);
    },
    []
  );

  const handleToggleVoiceMute = useCallback(() => {
    const nextMuted = !voiceMuted;
    setVoiceMuted(nextMuted);
    sarbAudioEngine.setVoiceSettings(voiceVolume, nextMuted);
  }, [voiceMuted, voiceVolume]);

  const handleSfxVolumeChange = useCallback(
    (vol: number) => {
      setSfxVolume(vol);
      setSfxMuted(vol === 0);
      sarbAudioEngine.setSfxSettings(vol, vol === 0);
    },
    []
  );

  const handleToggleSfxMute = useCallback(() => {
    const nextMuted = !sfxMuted;
    setSfxMuted(nextMuted);
    sarbAudioEngine.setSfxSettings(sfxVolume, nextMuted);
  }, [sfxMuted, sfxVolume]);

  // Fit Scene Durations to Voiceover Pause Valleys
  const handleFitScenesToVoice = useCallback(() => {
    if (!hasVoiceover || voiceDurationMs < 2000) return;
    alignScenesWithVoice();
  }, [hasVoiceover, voiceDurationMs, alignScenesWithVoice]);

  // Tap-to-Sync Mode
  const handleStartTapSync = useCallback(async () => {
    await sarbAudioEngine.resume();
    setIsPlaying(false);
    sarbAudioEngine.stopVoiceover();

    syncMarkersRef.current = [0];
    setSyncSceneIndex(0);
    setIsSyncMode(true);
    setCurrentTimeMs(0);

    lastSceneIdRef.current = scheduled[0]?.id ?? null;
    sarbAudioEngine.startPlaybackSynced(0);
    setIsPlaying(true);
  }, [scheduled]);

  const handleTapSyncNextScene = useCallback(() => {
    if (!isSyncMode) return;
    const mark = Math.max(currentTimeMs, (syncMarkersRef.current.at(-1) ?? 0) + 1200);
    syncMarkersRef.current.push(mark);

    if (syncSceneIndex < scenes.length - 1) {
      const nextIdx = syncSceneIndex + 1;
      setSyncSceneIndex(nextIdx);
      const nextScene = scenes[nextIdx];
      if (nextScene) {
        sarbAudioEngine.playSfx(nextScene.sfxCue);
      }
    } else {
      // Apply recorded markers to all scenes in active lesson
      const markers = syncMarkersRef.current;
      setLibraryState((prev) => {
        const nextMap: Record<string, number> = {};
        scenes.forEach((sc, i) => {
          const start = markers[i] ?? 0;
          const end = markers[i + 1] ?? start + sc.durationMs;
          nextMap[sc.id] = Math.max(1400, Math.round((end - start) / 100) * 100);
        });
        return {
          ...prev,
          durationsByLesson: {
            ...prev.durationsByLesson,
            [activeLessonId]: nextMap,
          },
        };
      });
      setIsSyncMode(false);
      setIsPlaying(false);
      sarbAudioEngine.stopVoiceover();
      setCurrentTimeMs(0);
    }
  }, [isSyncMode, currentTimeMs, syncSceneIndex, scenes, activeLessonId]);

  const handleCancelTapSync = useCallback(() => {
    setIsSyncMode(false);
    setIsPlaying(false);
    sarbAudioEngine.stopVoiceover();
  }, []);

  // Storyboard Adjustments
  const handleAdjustDuration = useCallback(
    (sceneId: string, deltaMs: number) => {
      const targetScene = scenes.find((s) => s.id === sceneId);
      if (!targetScene) return;
      const nextDuration = Math.min(20000, Math.max(1600, targetScene.durationMs + deltaMs));
      setLibraryState((prev) => ({
        ...prev,
        durationsByLesson: {
          ...prev.durationsByLesson,
          [activeLessonId]: {
            ...(prev.durationsByLesson[activeLessonId] ?? {}),
            [sceneId]: nextDuration,
          },
        },
      }));
    },
    [activeLessonId, scenes]
  );

  const handleResetDurations = useCallback(() => {
    setLibraryState((prev) => {
      const nextDurations = { ...prev.durationsByLesson };
      delete nextDurations[activeLessonId];
      return {
        ...prev,
        durationsByLesson: nextDurations,
      };
    });
    setCurrentTimeMs(0);
  }, [activeLessonId]);

  const handlePreviewSfx = useCallback(async (cue: SfxCueType) => {
    await sarbAudioEngine.resume();
    sarbAudioEngine.playSfx(cue);
  }, []);

  // Real 1080x1920 60 FPS MP4 Video Export
  const handleStartExport = useCallback(async () => {
    setExportError(null);
    setExportedSizeBytes(null);
    if (exportedUrl) {
      URL.revokeObjectURL(exportedUrl);
      setExportedUrl(null);
    }

    if (exportAbortRef.current) {
      exportAbortRef.current.abort();
    }
    const controller = new AbortController();
    exportAbortRef.current = controller;

    setIsPlaying(false);
    sarbAudioEngine.stopVoiceover();
    setExportProgress(0);
    setExportTimeMs(0);
    setExportStageLabel('جاري تهيئة التصدير بصيغة MP4...');
    setIsExporting(true);

    try {
      const mp4Blob = await exportReelToMp4({
        lessonId: activeLessonId,
        scheduled,
        totalDurationMs,
        images: brandImagesRef.current,
        signal: controller.signal,
        onProgress: ({ progress, currentTimeMs: tMs, stageLabel }) => {
          setExportProgress(progress);
          setExportTimeMs(tMs);
          setExportStageLabel(stageLabel);
        },
      });

      if (controller.signal.aborted) return;

      const url = URL.createObjectURL(mp4Blob);
      setExportedMime('video/mp4');
      setExportedSizeBytes(mp4Blob.size);
      setExportedUrl(url);
      setExportProgress(1);
      setExportTimeMs(totalDurationMs);
    } catch (err: unknown) {
      if (controller.signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
        return;
      }
      setExportError(
        err instanceof Error && err.message
          ? err.message
          : 'تعذّر تصدير ملف MP4. حاول مرة أخرى.'
      );
    } finally {
      if (exportAbortRef.current === controller) {
        exportAbortRef.current = null;
      }
      setIsExporting(false);
    }
  }, [activeLessonId, exportedUrl, scheduled, totalDurationMs]);

  const resetTransientMedia = useCallback(() => {
    setIsPlaying(false);
    sarbAudioEngine.stopVoiceover();
    sarbAudioEngine.setVoiceBuffer(null);
    setHasVoiceover(false);
    setVoiceFileName(null);
    setVoiceDurationMs(0);
    setWaveformPeaks([]);
    setIsSyncMode(false);
    setCurrentTimeMs(0);
    lastSceneIdRef.current = null;
    if (exportedUrl) {
      URL.revokeObjectURL(exportedUrl);
      setExportedUrl(null);
    }
  }, [exportedUrl]);

  const handleSelectLesson = useCallback(
    (nextLessonId: LessonId) => {
      if (isExporting || nextLessonId === activeLessonId) return;
      resetTransientMedia();
      setCreatorNotice(null);
      setLibraryState((prev) => ({
        ...prev,
        activeLessonId: nextLessonId,
      }));
    },
    [activeLessonId, isExporting, resetTransientMedia]
  );

  const handleLessonCreatedFromScript = useCallback(
    async (
      createdLesson: LessonDefinition,
      generatedAudioBlob: Blob | null,
      ttsWarning: string | null
    ) => {
      resetTransientMedia();

      let nextDurationsForCreated: Record<string, number> | undefined;
      if (generatedAudioBlob) {
        const decoded = await sarbAudioEngine.decodeAudioBlob(generatedAudioBlob);
        sarbAudioEngine.setVoiceBuffer(decoded.buffer);
        setHasVoiceover(true);
        const chosenEdge =
          EDGE_ARABIC_VOICES.find((v) => v.id === libraryState.edgeVoice) ??
          EDGE_ARABIC_VOICES[0];
        setVoiceFileName(
          libraryState.voiceEngine === 'edge-tts'
            ? `صوت سَرب · Edge TTS · ${chosenEdge.nameAr}`
            : 'صوت سَرب الموحّد · Charon'
        );
        setVoiceDurationMs(decoded.durationMs);
        setWaveformPeaks(decoded.peaks);

        if (decoded.durationMs >= 2000) {
          const aligned = sarbAudioEngine.alignSceneDurationsToVoice(
            createdLesson.scenes.map((s) => s.narration)
          );
          if (aligned) {
            nextDurationsForCreated = {};
            createdLesson.scenes.forEach((sc, idx) => {
              nextDurationsForCreated![sc.id] = aligned[idx] ?? sc.durationMs;
            });
          }
        }
      }

      setLibraryState((prev) => ({
        ...prev,
        customLessons: [createdLesson, ...prev.customLessons],
        durationsByLesson: nextDurationsForCreated
          ? {
              ...prev.durationsByLesson,
              [createdLesson.id]: nextDurationsForCreated,
            }
          : prev.durationsByLesson,
        activeLessonId: createdLesson.id,
      }));

      setCreatorNotice(ttsWarning);
      setActiveTab('storyboard');
    },
    [libraryState.edgeVoice, libraryState.voiceEngine, resetTransientMedia]
  );

  const handleVoiceEngineChange = useCallback((engine: VoiceEngine) => {
    setLibraryState((prev) => ({
      ...prev,
      voiceEngine: engine,
    }));
  }, []);

  const handleEdgeVoiceChange = useCallback((voiceId: string) => {
    setLibraryState((prev) => ({
      ...prev,
      edgeVoice: voiceId,
    }));
  }, []);

  const handleEdgeRateChange = useCallback((rate: string) => {
    setLibraryState((prev) => ({
      ...prev,
      edgeRate: rate,
    }));
  }, []);

  const handleDeleteLesson = useCallback(
    (lessonId: LessonId) => {
      if (isExporting) return;
      const remaining = allLessons.filter((l) => l.id !== lessonId);
      const isBuiltIn = BUILT_IN_LESSONS.some((b) => b.id === lessonId);

      if (lessonId === activeLessonId) {
        resetTransientMedia();
      }

      setLibraryState((prev) => {
        const nextDurations = { ...prev.durationsByLesson };
        delete nextDurations[lessonId];
        return {
          ...prev,
          customLessons: prev.customLessons.filter((l) => l.id !== lessonId),
          deletedBuiltInIds:
            isBuiltIn && !prev.deletedBuiltInIds.includes(lessonId)
              ? [...prev.deletedBuiltInIds, lessonId]
              : prev.deletedBuiltInIds,
          durationsByLesson: nextDurations,
          activeLessonId:
            prev.activeLessonId === lessonId
              ? remaining[0]?.id ?? null
              : prev.activeLessonId,
        };
      });
    },
    [activeLessonId, allLessons, isExporting, resetTransientMedia]
  );

  const handleChangeLessonCategory = useCallback(
    (lessonId: LessonId, nextCategory: string) => {
      const cleaned = nextCategory.trim();
      if (!cleaned) return;
      const isBuiltIn = BUILT_IN_LESSONS.some((b) => b.id === lessonId);
      setLibraryState((prev) => {
        if (isBuiltIn) {
          return {
            ...prev,
            builtInCategoryOverrides: {
              ...prev.builtInCategoryOverrides,
              [lessonId]: cleaned,
            },
          };
        }
        return {
          ...prev,
          customLessons: prev.customLessons.map((l) =>
            l.id === lessonId ? { ...l, category: cleaned } : l
          ),
        };
      });
    },
    []
  );

  const handleRestoreBuiltIns = useCallback(() => {
    setLibraryState((prev) => ({
      ...prev,
      deletedBuiltInIds: [],
      activeLessonId: prev.activeLessonId ?? BUILT_IN_LESSONS[0].id,
    }));
  }, []);

  const handleCancelExport = useCallback(() => {
    exportAbortRef.current?.abort();
    exportAbortRef.current = null;
    setIsExporting(false);
    sarbAudioEngine.stopVoiceover();
  }, []);

  return (
    <div className="min-h-screen bg-[#101010] text-[#FFFFFF] flex flex-col">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="border-b border-[#2A2A2A] bg-[#101010]/95 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-[1320px] mx-auto px-6 py-3.5 flex items-center justify-between gap-6">
          {/* Zone 1: Single-line Brand Zone */}
          <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
            <img
              src={SARB_ASSETS.icon}
              alt="أكاديمية سَرب"
              className="w-8 h-8 rounded-lg object-cover"
            />
            <span className="text-lg font-bold tracking-tight text-[#FFFFFF]">
              أكاديمية سَرب
            </span>
          </div>

          {/* Zone 2: Clean Single-Line Nav Links */}
          <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                sarbAudioEngine.stopVoiceover();
                setActiveTab('posts');
              }}
              className={`flex items-center gap-1.5 py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'posts'
                  ? 'border-[#D4FF00] text-[#D4FF00]'
                  : 'border-transparent text-[#8A8A8A] hover:text-[#FFFFFF]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>البوستات</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className={`flex items-center gap-1.5 py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'create'
                  ? 'border-[#D4FF00] text-[#D4FF00]'
                  : 'border-transparent text-[#8A8A8A] hover:text-[#FFFFFF]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>من سكريبت</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('library')}
              className={`flex items-center gap-1.5 py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'library'
                  ? 'border-[#D4FF00] text-[#FFFFFF]'
                  : 'border-transparent text-[#8A8A8A] hover:text-[#FFFFFF]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>المكتبة ({allLessons.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('storyboard')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'storyboard'
                  ? 'border-[#D4FF00] text-[#FFFFFF]'
                  : 'border-transparent text-[#8A8A8A] hover:text-[#FFFFFF]'
              }`}
            >
              المشاهد ({scenes.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('audio')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'audio'
                  ? 'border-[#D4FF00] text-[#FFFFFF]'
                  : 'border-transparent text-[#8A8A8A] hover:text-[#FFFFFF]'
              }`}
            >
              الصوت والمزامنة
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('brand')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'brand'
                  ? 'border-[#D4FF00] text-[#FFFFFF]'
                  : 'border-transparent text-[#8A8A8A] hover:text-[#FFFFFF]'
              }`}
            >
              الهوية
            </button>
          </nav>

          {/* Zone 3: 1 Primary CTA */}
          <div className="flex items-center shrink-0">
            {activeTab === 'posts' ? (
              <button
                type="button"
                onClick={() => postDownloadFnRef.current?.()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D4FF00] text-[#101010] text-sm font-bold hover:bg-[#E5FF66] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>تنزيل البوست PNG</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={!activeLesson || scenes.length === 0}
                onClick={() => {
                  setIsPlaying(false);
                  sarbAudioEngine.stopVoiceover();
                  setIsExportModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D4FF00] text-[#101010] text-sm font-bold hover:bg-[#E5FF66] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40"
              >
                <Film className="w-4 h-4" />
                <span>تصدير الفيديو</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Studio Workspace */}
      <main className="flex-1 max-w-[1320px] w-full mx-auto px-6 py-8">
        <div className={activeTab === 'posts' ? 'flex flex-col gap-5' : 'hidden'}>
          {/* Mobile Tab Switcher */}
          <div className="flex md:hidden items-center gap-1 p-1 bg-[#1C1C1C] border border-[#2A2A2A] rounded-lg overflow-x-auto">
            {(
              [
                { id: 'posts', label: 'البوستات' },
                { id: 'create', label: 'من سكريبت' },
                { id: 'library', label: `المكتبة (${allLessons.length})` },
                { id: 'storyboard', label: 'المشاهد' },
                { id: 'audio', label: 'الصوت' },
                { id: 'brand', label: 'الهوية' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 px-2.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#D4FF00] text-[#101010]'
                    : 'text-[#E6E6E6] hover:text-[#FFFFFF]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <PostsStudioPanel
            lessons={allLessons}
            importedLessonRequest={importedLessonRequest}
            onRegisterDownload={registerPostDownload}
          />
        </div>
        {activeTab !== 'posts' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Interactive 9:16 Video Stage */}
          <section className="lg:col-span-5 flex flex-col items-center">
            {activeLesson && activeFrameInfo ? (
              <ReelStage
                canvasRef={canvasRef}
                isPlaying={isPlaying}
                isExporting={isExporting}
                isExpanded={isExpanded}
                hasVoiceover={hasVoiceover}
                currentTimeMs={currentTimeMs}
                totalDurationMs={totalDurationMs}
                activeScene={activeFrameInfo.scene}
                scheduledScenes={scheduled}
                showSafeZones={showSafeZones}
                onTogglePlay={handleTogglePlay}
                onRestart={handleRestart}
                onSeek={handleSeek}
                onToggleSafeZones={() => setShowSafeZones((v) => !v)}
                onToggleExpand={() => setIsExpanded((v) => !v)}
                onOpenAudioPanel={() => setActiveTab('audio')}
              />
            ) : (
              <div className="w-full max-w-[380px] aspect-[9/16] rounded-2xl bg-[#101010] border border-[#2A2A2A] flex flex-col items-center justify-center p-6 text-center gap-4">
                <p className="text-sm text-[#E6E6E6]">لا يوجد فيديو محدد حالياً</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('create')}
                  className="px-4 py-2 rounded-lg bg-[#D4FF00] text-[#101010] text-xs font-bold cursor-pointer"
                >
                  إنشاء فيديو من سكريبت
                </button>
              </div>
            )}
          </section>

          {/* Control & Sync Deck */}
          <section className="lg:col-span-7 flex flex-col gap-5">
            {/* Compact Quick Switcher + Create Shortcut */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {allLessons.slice(0, 4).map((lesson) => {
                  const isSelected = lesson.id === activeLessonId;
                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      disabled={isExporting}
                      onClick={() => handleSelectLesson(lesson.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                        isSelected
                          ? 'bg-[#D4FF00] text-[#101010] border-[#D4FF00]'
                          : 'bg-[#1C1C1C] text-[#E6E6E6] border-[#2A2A2A] hover:border-[#3A3A3A] hover:text-[#FFFFFF]'
                      }`}
                    >
                      <span>{lesson.shortTitle}</span>
                      <span
                        className={`font-mono text-[11px] ${
                          isSelected ? 'text-[#101010]/80' : 'text-[#8A8A8A]'
                        }`}
                      >
                        ({lesson.scenes.length})
                      </span>
                    </button>
                  );
                })}
                {allLessons.length > 4 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('library')}
                    className="px-3 py-1.5 rounded-lg bg-[#1C1C1C] border border-[#2A2A2A] text-xs text-[#A78BFA] hover:border-[#A78BFA] cursor-pointer"
                  >
                    عرض الكل ({allLessons.length})
                  </button>
                )}
              </div>

              <button
                type="button"
                disabled={isExporting}
                onClick={() => setActiveTab('create')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#242424] border border-[#A78BFA]/50 text-[#A78BFA] hover:bg-[#A78BFA] hover:text-[#101010] text-xs font-bold transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>فيديو جديد من سكريبت</span>
              </button>
            </div>

            {/* Active Lesson Header Summary */}
            {activeLesson && (
              <div className="flex flex-col gap-2 pb-4 border-b border-[#2A2A2A]">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#8A8A8A]">
                  <span className="flex items-center gap-1 text-[#A78BFA] font-semibold">
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>{activeLesson.category}</span>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#D4FF00] font-semibold">موشن جرافيك 9:16</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeLesson.badgeLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span dir="ltr" className="font-mono tabular-nums text-[#E6E6E6]">
                    {formatTimecode(totalDurationMs)}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-[#FFFFFF] leading-tight">
                  {activeLesson.title}
                </h1>
              </div>
            )}

            {creatorNotice && (
              <div className="text-xs text-[#FFB020] bg-[#1C1C1C] border border-[#FFB020]/40 rounded-lg px-3.5 py-2.5 flex items-center justify-between gap-2">
                <span>{creatorNotice}</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('audio')}
                  className="text-[#D4FF00] font-semibold underline shrink-0 cursor-pointer"
                >
                  فتح تبويب الصوت
                </button>
              </div>
            )}

            {/* Mobile Tab Switcher */}
            <div className="flex md:hidden items-center gap-1 p-1 bg-[#1C1C1C] border border-[#2A2A2A] rounded-lg overflow-x-auto">
              {(
                [
                  { id: 'posts', label: 'البوستات' },
                  { id: 'create', label: 'من سكريبت' },
                  { id: 'library', label: `الأقسام (${allLessons.length})` },
                  { id: 'storyboard', label: 'المشاهد' },
                  { id: 'audio', label: 'الصوت' },
                  { id: 'brand', label: 'الهوية' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-2 px-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-[#D4FF00] text-[#101010]'
                      : 'text-[#E6E6E6] hover:text-[#FFFFFF]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'create' && (
              <ScriptToVideoPanel
                existingCategories={sectionGroups.map((s) => s.category)}
                voiceEngine={libraryState.voiceEngine}
                onVoiceEngineChange={handleVoiceEngineChange}
                edgeVoice={libraryState.edgeVoice}
                onEdgeVoiceChange={handleEdgeVoiceChange}
                edgeRate={libraryState.edgeRate}
                isExporting={isExporting}
                onLessonCreated={handleLessonCreatedFromScript}
              />
            )}

            {activeTab === 'library' && (
              <VideoLibraryPanel
                lessons={allLessons}
                activeLessonId={activeLessonId}
                hasDeletedBuiltIns={libraryState.deletedBuiltInIds.length > 0}
                isExporting={isExporting}
                onSelectLesson={(id) => {
                  handleSelectLesson(id);
                  setActiveTab('storyboard');
                }}
                onDeleteLesson={handleDeleteLesson}
                onChangeLessonCategory={handleChangeLessonCategory}
                onRestoreBuiltIns={handleRestoreBuiltIns}
                onOpenCreator={() => setActiveTab('create')}
                onConvertToPost={handleConvertLessonToPost}
              />
            )}

            {activeTab === 'storyboard' && activeFrameInfo && (
              <StoryboardPanel
                scheduledScenes={scheduled}
                activeSceneId={activeFrameInfo.scene.id}
                isExporting={isExporting}
                onSelectScene={(startMs) => handleSeek(startMs)}
                onAdjustDuration={handleAdjustDuration}
                onPreviewSfx={handlePreviewSfx}
                onResetDurations={handleResetDurations}
              />
            )}

            {activeTab === 'audio' && (
              <VoiceSyncPanel
                lessonId={activeLessonId}
                voiceEngine={libraryState.voiceEngine}
                onVoiceEngineChange={handleVoiceEngineChange}
                edgeVoice={libraryState.edgeVoice}
                onEdgeVoiceChange={handleEdgeVoiceChange}
                edgeRate={libraryState.edgeRate}
                onEdgeRateChange={handleEdgeRateChange}
                hasVoiceover={hasVoiceover}
                voiceFileName={voiceFileName}
                voiceDurationMs={voiceDurationMs}
                waveformPeaks={waveformPeaks}
                currentTimeMs={currentTimeMs}
                totalDurationMs={totalDurationMs}
                scheduledScenes={scheduled}
                voiceVolume={voiceVolume}
                voiceMuted={voiceMuted}
                sfxVolume={sfxVolume}
                sfxMuted={sfxMuted}
                isSyncMode={isSyncMode}
                syncSceneIndex={syncSceneIndex}
                isExporting={isExporting}
                onUploadAudio={handleUploadAudio}
                onRecordComplete={handleRecordComplete}
                onGeneratedAudio={handleGeneratedAudio}
                onClearVoiceover={handleClearVoiceover}
                onVoiceVolumeChange={handleVoiceVolumeChange}
                onToggleVoiceMute={handleToggleVoiceMute}
                onSfxVolumeChange={handleSfxVolumeChange}
                onToggleSfxMute={handleToggleSfxMute}
                onFitScenesToVoice={handleFitScenesToVoice}
                onStartTapSync={handleStartTapSync}
                onTapSyncNextScene={handleTapSyncNextScene}
                onCancelTapSync={handleCancelTapSync}
                onSeek={handleSeek}
              />
            )}

            {activeTab === 'brand' && (
              <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5 flex flex-col gap-5">
                <div>
                  <h2 className="text-base font-semibold text-[#FFFFFF]">
                    تطبيق دليل هوية أكاديمية سَرب داخل الفيديو
                  </h2>
                  <p className="text-xs text-[#8A8A8A] mt-1">
                    جميع مشاهد الدرس مضبوطة برمجياً لتتوافق مع معايير الدليل المرفق
                  </p>
                </div>

                {/* Color Rule 70/20/10 */}
                <div className="flex flex-col gap-2.5 pt-3 border-t border-[#2A2A2A]">
                  <span className="text-xs font-semibold text-[#E6E6E6]">
                    توزيع الألوان (70 / 20 / 10)
                  </span>
                  <div className="h-3 rounded-full overflow-hidden flex border border-[#2A2A2A]">
                    <div className="bg-[#101010] w-[70%]" title="Extreme Black #101010 (70%)" />
                    <div className="bg-[#E6E6E6] w-[20%]" title="Gray Hint #E6E6E6 (20%)" />
                    <div className="bg-[#D4FF00] w-[10%]" title="Volt #D4FF00 (10%)" />
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#8A8A8A]" dir="ltr">
                    <span className="font-mono">#101010 Extreme Black</span>
                    <span className="font-mono">#1C1C1C Surface</span>
                    <span className="font-mono text-[#A78BFA]">#A78BFA Secondary Purple</span>
                    <span className="font-mono text-[#D4FF00]">#D4FF00 Primary Volt</span>
                    <span className="font-mono text-[#E6E6E6]">#E6E6E6 Gray Hint</span>
                  </div>
                </div>

                {/* Brand Checklist */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#2A2A2A] text-xs text-[#E6E6E6]">
                  {[
                    'هوامش الريلز الآمنة: 80px جانبياً و250px أعلى وأسفل',
                    'النص فوق الفولت والبنفسجي بالأسود الداكن #101010 فقط',
                    'تمييز تعليمي: البنفسجي للحماية/التصميم الأساسي والفولت للواجهة والتنفيذ',
                    'خطوط IBM Plex Sans Arabic و JetBrains Mono للكود LTR',
                    'ظهور شخصية سَرب في المقدمة والخاتمة والهوية المستمرة',
                    'خلفية نقية خالية من الخطوط مع تصدير MP4 بمعدل 60 FPS',
                  ].map((rule, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#3DDC84] shrink-0 mt-0.5" />
                      <span>{rule}</span>
                    </div>
                  ))}
                </div>

                {/* Brand Assets Preview */}
                <div className="pt-3 border-t border-[#2A2A2A] flex flex-wrap items-center justify-between gap-4">
                  <img
                    src={SARB_ASSETS.logoOnDark}
                    alt="Sarb Academy Logo"
                    className="h-9 w-auto object-contain"
                  />
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-[#FFFFFF] border-2 border-[#D4FF00] overflow-hidden flex items-center justify-center">
                      <img
                        src={SARB_ASSETS.mascot}
                        alt="Sarb Mascot"
                        className="w-10 h-10 object-contain"
                      />
                    </div>
                    <span className="text-xs text-[#8A8A8A]">نتعلّم معًا، ونبني أثرًا معًا.</span>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
        )}
      </main>

      <ExportModal
        isOpen={isExportModalOpen}
        isExporting={isExporting}
        exportSlug={activeLesson?.exportSlug ?? 'sarb-reel-60fps'}
        progress={exportProgress}
        stageLabel={exportStageLabel}
        currentTimeMs={isExporting ? exportTimeMs : currentTimeMs}
        totalDurationMs={totalDurationMs}
        exportedUrl={exportedUrl}
        exportedMime={exportedMime}
        exportedSizeBytes={exportedSizeBytes}
        exportError={exportError}
        onStartExport={handleStartExport}
        onCancelExport={handleCancelExport}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
}
