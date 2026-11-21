import { ArrayBufferTarget, Muxer } from 'mp4-muxer';
import {
  findSceneAtTime,
  REEL_DIMENSIONS,
  type LessonId,
  type ScheduledScene,
} from '../data/lessonStoryboard';
import {
  renderReelFrame,
  type LoadedBrandImages,
} from '../canvas/sarbReelRenderer';
import { sarbAudioEngine } from '../audio/sfxEngine';

export interface Mp4ExportProgress {
  progress: number;
  currentTimeMs: number;
  stageLabel: string;
}

export interface Mp4ExportParams {
  lessonId: LessonId;
  scheduled: ScheduledScene[];
  totalDurationMs: number;
  images: LoadedBrandImages;
  signal: AbortSignal;
  onProgress: (info: Mp4ExportProgress) => void;
}

const EXPORT_FPS = 60;
const VIDEO_BITRATE = 10_000_000;
const AUDIO_SAMPLE_RATE = 48000;
const AUDIO_BITRATE = 192_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function pickWebCodecsProfile(): Promise<{
  videoCodec: string;
  muxerVideoCodec: 'avc' | 'vp9';
  audioCodec: string;
  muxerAudioCodec: 'aac' | 'opus';
  needsTranscode: boolean;
} | null> {
  if (typeof VideoEncoder === 'undefined' || typeof AudioEncoder === 'undefined') {
    return null;
  }

  const h264Candidates = ['avc1.64002a', 'avc1.4d002a', 'avc1.42002a', 'avc1.42001f'];
  let supportedH264: string | null = null;
  for (const codec of h264Candidates) {
    try {
      const res = await VideoEncoder.isConfigSupported({
        codec,
        width: REEL_DIMENSIONS.width,
        height: REEL_DIMENSIONS.height,
        bitrate: VIDEO_BITRATE,
        framerate: EXPORT_FPS,
      });
      if (res.supported) {
        supportedH264 = codec;
        break;
      }
    } catch {
      // Try next profile
    }
  }

  let supportedAac = false;
  try {
    const aacRes = await AudioEncoder.isConfigSupported({
      codec: 'mp4a.40.2',
      sampleRate: AUDIO_SAMPLE_RATE,
      numberOfChannels: 2,
      bitrate: AUDIO_BITRATE,
    });
    supportedAac = Boolean(aacRes.supported);
  } catch {
    supportedAac = false;
  }

  if (supportedH264 && supportedAac) {
    return {
      videoCodec: supportedH264,
      muxerVideoCodec: 'avc',
      audioCodec: 'mp4a.40.2',
      muxerAudioCodec: 'aac',
      needsTranscode: false,
    };
  }

  // Fallback WebCodecs profile (VP9 + Opus -> server ffmpeg H.264/AAC MP4 transcode)
  let supportedVp9 = false;
  try {
    const vp9Res = await VideoEncoder.isConfigSupported({
      codec: 'vp09.00.10.08',
      width: REEL_DIMENSIONS.width,
      height: REEL_DIMENSIONS.height,
      bitrate: VIDEO_BITRATE,
      framerate: EXPORT_FPS,
    });
    supportedVp9 = Boolean(vp9Res.supported);
  } catch {
    supportedVp9 = false;
  }

  let supportedOpus = false;
  try {
    const opusRes = await AudioEncoder.isConfigSupported({
      codec: 'opus',
      sampleRate: AUDIO_SAMPLE_RATE,
      numberOfChannels: 2,
      bitrate: 128_000,
    });
    supportedOpus = Boolean(opusRes.supported);
  } catch {
    supportedOpus = false;
  }

  if (supportedVp9 && supportedOpus) {
    return {
      videoCodec: 'vp09.00.10.08',
      muxerVideoCodec: 'vp9',
      audioCodec: 'opus',
      muxerAudioCodec: 'opus',
      needsTranscode: true,
    };
  }

  return null;
}

async function transcodeToStandardMp4(
  rawBlob: Blob,
  signal: AbortSignal
): Promise<Blob> {
  const res = await fetch('/api/transcode-mp4', {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: rawBlob,
    signal,
  });

  if (!res.ok) {
    let errMsg = 'تعذّر تحويل الفيديو إلى صيغة MP4.';
    try {
      const json = (await res.json()) as { error?: string };
      if (json.error) errMsg = json.error;
    } catch {
      // Ignore parse failure
    }
    throw new Error(errMsg);
  }

  return res.blob();
}

async function exportWithWebCodecs(
  params: Mp4ExportParams,
  profile: NonNullable<Awaited<ReturnType<typeof pickWebCodecsProfile>>>
): Promise<Blob> {
  const { lessonId, scheduled, totalDurationMs, images, signal, onProgress } = params;

  onProgress({
    progress: 0.02,
    currentTimeMs: 0,
    stageLabel: 'جاري مزج المسار الصوتي والمؤثرات...',
  });

  const audioBuffer = await sarbAudioEngine.renderMixedAudioBuffer(scheduled, totalDurationMs);
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: {
      codec: profile.muxerVideoCodec,
      width: REEL_DIMENSIONS.width,
      height: REEL_DIMENSIONS.height,
    },
    audio: {
      codec: profile.muxerAudioCodec,
      numberOfChannels: 2,
      sampleRate: AUDIO_SAMPLE_RATE,
    },
    fastStart: 'in-memory',
    firstTimestampBehavior: 'offset',
  });

  let encodeError: Error | null = null;

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (err) => {
      encodeError = err instanceof Error ? err : new Error(String(err));
    },
  });

  const audioEncoder = new AudioEncoder({
    output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
    error: (err) => {
      encodeError = err instanceof Error ? err : new Error(String(err));
    },
  });

  try {
    const videoConfig: VideoEncoderConfig = {
      codec: profile.videoCodec,
      width: REEL_DIMENSIONS.width,
      height: REEL_DIMENSIONS.height,
      bitrate: VIDEO_BITRATE,
      framerate: EXPORT_FPS,
    };
    if (profile.muxerVideoCodec === 'avc') {
      videoConfig.avc = { format: 'avc' };
    }
    videoEncoder.configure(videoConfig);

    audioEncoder.configure({
      codec: profile.audioCodec,
      sampleRate: AUDIO_SAMPLE_RATE,
      numberOfChannels: 2,
      bitrate: profile.muxerAudioCodec === 'aac' ? AUDIO_BITRATE : 128_000,
    });

    // 1. Encode sample-accurate stereo audio chunks
    const left = audioBuffer.getChannelData(0);
    const right = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : left;
    const totalAudioFrames = audioBuffer.length;
    const CHUNK_FRAMES = 4096;

    for (let offset = 0; offset < totalAudioFrames; offset += CHUNK_FRAMES) {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      if (encodeError) throw encodeError;

      const count = Math.min(CHUNK_FRAMES, totalAudioFrames - offset);
      const planar = new Float32Array(count * 2);
      planar.set(left.subarray(offset, offset + count), 0);
      planar.set(right.subarray(offset, offset + count), count);

      const audioData = new AudioData({
        format: 'f32-planar',
        sampleRate: AUDIO_SAMPLE_RATE,
        numberOfChannels: 2,
        numberOfFrames: count,
        timestamp: Math.round((offset * 1_000_000) / AUDIO_SAMPLE_RATE),
        data: planar,
      });

      while (audioEncoder.encodeQueueSize > 8 && !signal.aborted && !encodeError) {
        await sleep(4);
      }
      audioEncoder.encode(audioData);
      audioData.close();
    }

    // 2. Render & encode every single frame deterministically at exact 60 FPS
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = REEL_DIMENSIONS.width;
    offscreenCanvas.height = REEL_DIMENSIONS.height;
    const ctx = offscreenCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('تعذّر تهيئة لوحة التصيير.');
    }

    const totalFrames = Math.max(1, Math.ceil((totalDurationMs / 1000) * EXPORT_FPS));
    const frameDurationUs = Math.round(1_000_000 / EXPORT_FPS);
    const maxRenderShare = profile.needsTranscode ? 0.85 : 0.96;

    for (let frameIdx = 0; frameIdx <= totalFrames; frameIdx++) {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      if (encodeError) throw encodeError;

      const timeMs = Math.min(totalDurationMs, (frameIdx / EXPORT_FPS) * 1000);
      const { scene, progress } = findSceneAtTime(scheduled, timeMs);

      renderReelFrame(ctx, scene, scheduled, progress, timeMs, images, false, lessonId);

      const timestampUs = Math.round((frameIdx * 1_000_000) / EXPORT_FPS);
      const videoFrame = new VideoFrame(offscreenCanvas, {
        timestamp: timestampUs,
        duration: frameDurationUs,
      });

      while (videoEncoder.encodeQueueSize > 8 && !signal.aborted && !encodeError) {
        await sleep(4);
      }
      if (signal.aborted) {
        videoFrame.close();
        throw new DOMException('Aborted', 'AbortError');
      }

      videoEncoder.encode(videoFrame, { keyFrame: frameIdx % EXPORT_FPS === 0 });
      videoFrame.close();

      if (frameIdx % 6 === 0 || frameIdx === totalFrames) {
        onProgress({
          progress: 0.04 + (frameIdx / totalFrames) * maxRenderShare,
          currentTimeMs: timeMs,
          stageLabel: `جاري تصيير الإطارات بدقة 60 FPS (${frameIdx} / ${totalFrames})...`,
        });
        await sleep(0);
      }
    }

    onProgress({
      progress: profile.needsTranscode ? 0.9 : 0.98,
      currentTimeMs: totalDurationMs,
      stageLabel: 'جاري تجميع ملف الفيديو النهائي...',
    });

    await Promise.all([videoEncoder.flush(), audioEncoder.flush()]);
    if (encodeError) throw encodeError;

    muxer.finalize();
    const rawMp4Blob = new Blob([target.buffer], { type: 'video/mp4' });

    if (!profile.needsTranscode) {
      return rawMp4Blob;
    }

    onProgress({
      progress: 0.93,
      currentTimeMs: totalDurationMs,
      stageLabel: 'جاري تحويل الترميز إلى MP4 قياسي (H.264)...',
    });
    return await transcodeToStandardMp4(rawMp4Blob, signal);
  } finally {
    if (videoEncoder.state !== 'closed') {
      try {
        videoEncoder.close();
      } catch {
        // Ignore close errors
      }
    }
    if (audioEncoder.state !== 'closed') {
      try {
        audioEncoder.close();
      } catch {
        // Ignore close errors
      }
    }
  }
}

async function exportWithMediaRecorderFallback(
  params: Mp4ExportParams
): Promise<Blob> {
  const { lessonId, scheduled, totalDurationMs, images, signal, onProgress } = params;

  const offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = REEL_DIMENSIONS.width;
  offscreenCanvas.height = REEL_DIMENSIONS.height;
  // Append invisibly 1x1 so Chromium paints and updates captureStream reliably
  offscreenCanvas.style.cssText =
    'position:fixed;left:-9999px;top:0;width:2px;height:2px;pointer-events:none;opacity:0.01;';
  document.body.appendChild(offscreenCanvas);

  const ctx = offscreenCanvas.getContext('2d');
  if (!ctx) {
    offscreenCanvas.remove();
    throw new Error('تعذّر تهيئة لوحة التصدير.');
  }

  let canvasStream: MediaStream | null = null;

  try {
    await sarbAudioEngine.resume();
    canvasStream = offscreenCanvas.captureStream(EXPORT_FPS);
    const audioStream = sarbAudioEngine.getExportStream();
    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioStream.getAudioTracks(),
    ]);

    const candidates = [
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      'video/mp4',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ];
    const supportedMime = candidates.find((m) => MediaRecorder.isTypeSupported(m)) || '';
    const recorder = supportedMime
      ? new MediaRecorder(combinedStream, {
          mimeType: supportedMime,
          videoBitsPerSecond: VIDEO_BITRATE,
        })
      : new MediaRecorder(combinedStream);

    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (ev) => {
      if (ev.data.size > 0) chunks.push(ev.data);
    };

    const stoppedPromise = new Promise<Blob>((resolve, reject) => {
      recorder.onerror = () => reject(new Error('فشل تسجيل الفيديو في المتصفح.'));
      recorder.onstop = () => {
        const mime = recorder.mimeType || supportedMime || 'video/webm';
        const blob = new Blob(chunks, { type: mime });
        if (blob.size === 0) {
          reject(new Error('تم إنهاء التسجيل دون التقاط بيانات كافية.'));
          return;
        }
        resolve(blob);
      };
    });

    if (scheduled[0]) {
      renderReelFrame(ctx, scheduled[0], scheduled, 0, 0, images, false, lessonId);
    }

    recorder.start(250);
    sarbAudioEngine.startPlaybackSynced(0);
    let lastSceneId = scheduled[0]?.id ?? '';
    if (scheduled[0]) {
      sarbAudioEngine.playSfx(scheduled[0].sfxCue);
    }

    await new Promise<void>((resolve, reject) => {
      let rafId = 0;
      const tick = () => {
        if (signal.aborted) {
          window.cancelAnimationFrame(rafId);
          reject(new DOMException('Aborted', 'AbortError'));
          return;
        }

        const elapsed = sarbAudioEngine.getTimelineElapsedMs();
        const clamped = Math.min(totalDurationMs, Math.max(0, elapsed));
        const { scene, progress } = findSceneAtTime(scheduled, clamped);

        if (scene.id !== lastSceneId) {
          lastSceneId = scene.id;
          sarbAudioEngine.playSfx(scene.sfxCue);
        }

        renderReelFrame(ctx, scene, scheduled, progress, clamped, images, false, lessonId);

        onProgress({
          progress: (clamped / Math.max(1, totalDurationMs)) * 0.88,
          currentTimeMs: clamped,
          stageLabel: 'جاري تسجيل الفيديو (60 FPS)...',
        });

        if (elapsed >= totalDurationMs) {
          window.setTimeout(() => {
            if (recorder.state !== 'inactive') recorder.stop();
            resolve();
          }, 120);
          return;
        }

        rafId = window.requestAnimationFrame(tick);
      };

      rafId = window.requestAnimationFrame(tick);
    });

    sarbAudioEngine.stopVoiceover();
    const recordedBlob = await stoppedPromise;
    if (recordedBlob.type.includes('mp4')) {
      return recordedBlob;
    }

    onProgress({
      progress: 0.92,
      currentTimeMs: totalDurationMs,
      stageLabel: 'جاري تحويل الفيديو إلى صيغة MP4...',
    });
    return await transcodeToStandardMp4(recordedBlob, signal);
  } finally {
    sarbAudioEngine.stopVoiceover();
    if (canvasStream) {
      canvasStream.getTracks().forEach((t) => t.stop());
    }
    offscreenCanvas.remove();
  }
}

export async function exportReelToMp4(params: Mp4ExportParams): Promise<Blob> {
  const profile = await pickWebCodecsProfile();
  if (profile) {
    try {
      return await exportWithWebCodecs(params, profile);
    } catch (err) {
      if (params.signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
        throw err;
      }
      console.warn('[WebCodecs MP4 fallback triggered]', err);
    }
  }
  return exportWithMediaRecorderFallback(params);
}
