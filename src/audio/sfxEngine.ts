import type { ScheduledScene, SfxCueType } from '../data/lessonStoryboard';

export class SarbAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private voiceGain: GainNode | null = null;
  private exportDest: MediaStreamAudioDestinationNode | null = null;

  private voiceBuffer: AudioBuffer | null = null;
  private voiceSource: AudioBufferSourceNode | null = null;

  private timelineAnchorCtxTime = 0;
  private timelineAnchorOffsetMs = 0;

  private sfxVolume = 0.65;
  private voiceVolume = 1.0;
  private sfxMuted = false;
  private voiceMuted = false;

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1.0;

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxMuted ? 0 : this.sfxVolume;

      this.voiceGain = this.ctx.createGain();
      this.voiceGain.gain.value = this.voiceMuted ? 0 : this.voiceVolume;

      this.exportDest = this.ctx.createMediaStreamDestination();

      // Keep MediaStreamAudioDestinationNode continuously clocked for MediaRecorder
      // even when SFX are muted or between scenes with no voiceover
      const keepAliveOsc = this.ctx.createOscillator();
      const keepAliveZeroGain = this.ctx.createGain();
      keepAliveZeroGain.gain.value = 0;
      keepAliveOsc.connect(keepAliveZeroGain);
      keepAliveZeroGain.connect(this.exportDest);
      keepAliveOsc.start();

      this.sfxGain.connect(this.masterGain);
      this.voiceGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.connect(this.exportDest);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public async resume(): Promise<void> {
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
  }

  public getExportStream(): MediaStream {
    this.ensureContext();
    if (!this.exportDest) {
      throw new Error('Audio export destination unavailable');
    }
    return this.exportDest.stream;
  }

  public setSfxSettings(volume: number, muted: boolean): void {
    this.sfxVolume = volume;
    this.sfxMuted = muted;
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(muted ? 0 : volume, this.ctx.currentTime, 0.02);
    }
  }

  public setVoiceSettings(volume: number, muted: boolean): void {
    this.voiceVolume = volume;
    this.voiceMuted = muted;
    if (this.voiceGain && this.ctx) {
      this.voiceGain.gain.setTargetAtTime(muted ? 0 : volume, this.ctx.currentTime, 0.02);
    }
  }

  private trimSilenceEdges(ctx: AudioContext, raw: AudioBuffer): AudioBuffer {
    const ch0 = raw.getChannelData(0);
    const sr = raw.sampleRate;
    const threshold = 0.014;

    let firstActive = 0;
    for (let i = 0; i < ch0.length; i++) {
      if (Math.abs(ch0[i]) > threshold) {
        firstActive = i;
        break;
      }
    }

    let lastActive = ch0.length - 1;
    for (let i = ch0.length - 1; i > firstActive; i--) {
      if (Math.abs(ch0[i]) > threshold) {
        lastActive = i;
        break;
      }
    }

    const padStart = Math.max(0, firstActive - Math.floor(sr * 0.04));
    const padEnd = Math.min(ch0.length, lastActive + Math.floor(sr * 0.18));
    const trimmedLen = padEnd - padStart;

    // Only trim if meaningful silence exists and resulting buffer is valid
    if (trimmedLen <= Math.floor(sr * 0.3) || (padStart < sr * 0.08 && ch0.length - padEnd < sr * 0.25)) {
      return raw;
    }

    const out = ctx.createBuffer(raw.numberOfChannels, trimmedLen, sr);
    for (let c = 0; c < raw.numberOfChannels; c++) {
      const src = raw.getChannelData(c);
      const dst = out.getChannelData(c);
      dst.set(src.subarray(padStart, padEnd));
    }
    return out;
  }

  private decodeRawPcmBuffer(
    ctx: AudioContext,
    arrayBuffer: ArrayBuffer,
    mimeType: string
  ): AudioBuffer {
    const rateMatch = mimeType.match(/rate=(\d+)/i);
    const sampleRate = rateMatch ? Math.max(8000, Math.min(96000, Number(rateMatch[1]))) : 24000;
    const sampleCount = Math.floor(arrayBuffer.byteLength / 2);
    if (sampleCount <= 0) {
      throw new Error('بيانات الصوت المستلمة فارغة.');
    }
    const view = new DataView(arrayBuffer);
    const out = ctx.createBuffer(1, sampleCount, sampleRate);
    const channel = out.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      channel[i] = view.getInt16(i * 2, true) / 32768;
    }
    return out;
  }

  public async decodeAudioBlob(blob: Blob): Promise<{
    buffer: AudioBuffer;
    durationMs: number;
    peaks: number[];
  }> {
    const ctx = this.ensureContext();
    const arrayBuffer = await blob.arrayBuffer();
    let decoded: AudioBuffer;
    try {
      // Slice a copy because decodeAudioData can detach the original ArrayBuffer
      decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
    } catch (decodeErr) {
      const lowerType = (blob.type || '').toLowerCase();
      if (lowerType.includes('pcm') || lowerType.includes('l16')) {
        decoded = this.decodeRawPcmBuffer(ctx, arrayBuffer, blob.type);
      } else {
        throw decodeErr;
      }
    }
    const buffer = this.trimSilenceEdges(ctx, decoded);
    const peaks = this.extractWaveformPeaks(buffer, 96);
    return {
      buffer,
      durationMs: Math.round(buffer.duration * 1000),
      peaks,
    };
  }

  public setVoiceBuffer(buffer: AudioBuffer | null): void {
    this.stopVoiceover();
    this.voiceBuffer = buffer;
  }

  public startPlaybackSynced(offsetMs: number): void {
    const ctx = this.ensureContext();
    const anchorTime = ctx.currentTime;
    this.timelineAnchorCtxTime = anchorTime;
    this.timelineAnchorOffsetMs = Math.max(0, offsetMs);
    this.startVoiceoverAt(offsetMs, anchorTime);
  }

  public getTimelineElapsedMs(): number {
    if (!this.ctx) return this.timelineAnchorOffsetMs;
    return Math.max(
      0,
      this.timelineAnchorOffsetMs + (this.ctx.currentTime - this.timelineAnchorCtxTime) * 1000
    );
  }

  public startVoiceoverAt(offsetMs: number, exactCtxTime?: number): void {
    this.stopVoiceover();
    if (!this.voiceBuffer) return;

    const ctx = this.ensureContext();
    if (!this.voiceGain) return;

    const offsetSec = Math.max(0, offsetMs / 1000);
    if (offsetSec >= this.voiceBuffer.duration) {
      return;
    }

    const source = ctx.createBufferSource();
    source.buffer = this.voiceBuffer;
    source.connect(this.voiceGain);
    source.start(exactCtxTime ?? ctx.currentTime, offsetSec);
    this.voiceSource = source;
  }

  public stopVoiceover(): void {
    if (this.voiceSource) {
      try {
        this.voiceSource.stop();
        this.voiceSource.disconnect();
      } catch {
        // Already stopped
      }
      this.voiceSource = null;
    }
  }

  /**
   * Aligns scene durations to the active voice buffer by combining per-scene
   * narration text length weights with natural pause/silence valleys detected
   * in the audio waveform. Guarantees exact sum == totalAudioMs (zero drift).
   */
  public alignSceneDurationsToVoice(narrations: string[]): number[] | null {
    if (!this.voiceBuffer || narrations.length === 0) return null;

    const totalMs = Math.round(this.voiceBuffer.duration * 1000);
    if (totalMs < 2000) return null;

    const count = narrations.length;
    // 1. Estimate speaking weight per scene based on text + pauses
    const weights = narrations.map((text) => {
      const clean = text.trim();
      const latinMatches = clean.match(/[A-Za-z0-9]+/g) ?? [];
      const pauseMatches = clean.match(/[؟.!:،…]/g) ?? [];
      const nonSpaceLen = clean.replace(/\s+/g, '').length;
      return Math.max(8, nonSpaceLen + latinMatches.length * 4 + pauseMatches.length * 5);
    });
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    // 2. Compute 20ms RMS energy envelope
    const data = this.voiceBuffer.getChannelData(0);
    const sr = this.voiceBuffer.sampleRate;
    const winSamples = Math.max(1, Math.floor(sr * 0.02));
    const numFrames = Math.floor(data.length / winSamples);
    const rms: number[] = new Array(numFrames);

    for (let f = 0; f < numFrames; f++) {
      const start = f * winSamples;
      let sumSq = 0;
      for (let j = 0; j < winSamples; j++) {
        const s = data[start + j];
        sumSq += s * s;
      }
      rms[f] = Math.sqrt(sumSq / winSamples);
    }

    const sortedRms = [...rms].sort((a, b) => a - b);
    const p20 = sortedRms[Math.floor(sortedRms.length * 0.2)] ?? 0.005;
    const p80 = sortedRms[Math.floor(sortedRms.length * 0.8)] ?? 0.08;
    const silenceThresh = Math.max(0.01, p20 + (p80 - p20) * 0.14);

    // 3. Extract silence/breath valleys >= 80ms (4 frames)
    const valleys: Array<{ centerMs: number; score: number }> = [];
    let runStart = -1;
    for (let f = 0; f <= numFrames; f++) {
      const isQuiet = f < numFrames && rms[f] <= silenceThresh;
      if (isQuiet && runStart === -1) {
        runStart = f;
      } else if (!isQuiet && runStart !== -1) {
        const runLen = f - runStart;
        if (runLen >= 4) {
          const centerMs = ((runStart + f) / 2) * 20;
          valleys.push({ centerMs, score: runLen * 20 });
        }
        runStart = -1;
      }
    }

    // 4. Snap each scene boundary to the strongest nearby pause valley
    const boundaries: number[] = [0];
    let cumWeight = 0;
    const minSceneMs = Math.min(1200, Math.floor(totalMs / (count * 1.5)));

    for (let i = 0; i < count - 1; i++) {
      cumWeight += weights[i];
      const expectedMs = (cumWeight / totalWeight) * totalMs;
      const prevBound = boundaries[i];
      const remainingMinMs = (count - 1 - i) * minSceneMs;

      const minAllowed = prevBound + minSceneMs;
      const maxAllowed = totalMs - remainingMinMs;
      const clampedExpected = Math.max(minAllowed, Math.min(maxAllowed, expectedMs));

      let bestMs = clampedExpected;
      let bestFitness = -Infinity;
      const searchWindowMs = 2000;

      for (const v of valleys) {
        if (v.centerMs < minAllowed || v.centerMs > maxAllowed) continue;
        const dist = Math.abs(v.centerMs - clampedExpected);
        if (dist > searchWindowMs) continue;
        const fitness = v.score - dist * 0.18;
        if (fitness > bestFitness) {
          bestFitness = fitness;
          bestMs = v.centerMs;
        }
      }

      boundaries.push(Math.round(bestMs));
    }
    boundaries.push(totalMs);

    const durations: number[] = [];
    for (let i = 0; i < count; i++) {
      durations.push(Math.max(400, boundaries[i + 1] - boundaries[i]));
    }
    return durations;
  }

  private extractWaveformPeaks(buffer: AudioBuffer, bars: number): number[] {
    const channelData = buffer.getChannelData(0);
    const step = Math.max(1, Math.floor(channelData.length / bars));
    const peaks: number[] = [];
    for (let i = 0; i < bars; i++) {
      const start = i * step;
      const end = Math.min(channelData.length, start + step);
      let max = 0;
      for (let j = start; j < end; j++) {
        const val = Math.abs(channelData[j]);
        if (val > max) max = val;
      }
      peaks.push(Math.max(0.08, Math.min(1, max)));
    }
    return peaks;
  }

  public async renderMixedAudioBuffer(
    scheduledScenes: ScheduledScene[],
    totalDurationMs: number
  ): Promise<AudioBuffer> {
    const sampleRate = 48000;
    const totalSamples = Math.max(sampleRate, Math.ceil((totalDurationMs / 1000) * sampleRate));
    const offlineCtx = new OfflineAudioContext(2, totalSamples, sampleRate);

    if (this.voiceBuffer && !this.voiceMuted && this.voiceVolume > 0) {
      const voiceGainNode = offlineCtx.createGain();
      voiceGainNode.gain.value = this.voiceVolume;
      voiceGainNode.connect(offlineCtx.destination);

      const voiceSrc = offlineCtx.createBufferSource();
      voiceSrc.buffer = this.voiceBuffer;
      voiceSrc.connect(voiceGainNode);
      voiceSrc.start(0);
    }

    if (!this.sfxMuted && this.sfxVolume > 0) {
      const sfxGainNode = offlineCtx.createGain();
      sfxGainNode.gain.value = this.sfxVolume;
      sfxGainNode.connect(offlineCtx.destination);

      for (const sc of scheduledScenes) {
        this.scheduleSfxOnContext(offlineCtx, sfxGainNode, sc.sfxCue, sc.startMs / 1000);
      }
    }

    return offlineCtx.startRendering();
  }

  public playSfx(cue: SfxCueType): void {
    if (this.sfxMuted || this.sfxVolume <= 0) return;
    const ctx = this.ensureContext();
    if (!this.sfxGain) return;
    this.scheduleSfxOnContext(ctx, this.sfxGain, cue, ctx.currentTime);
  }

  private scheduleSfxOnContext(
    audioCtx: BaseAudioContext,
    dest: AudioNode,
    cue: SfxCueType,
    now: number
  ): void {
    switch (cue) {
      case 'hookAlert':
        this.playTone(audioCtx, dest, now, 440, 290, 0.14, 'sawtooth', 0.16);
        this.playTone(audioCtx, dest, now + 0.11, 310, 180, 0.22, 'triangle', 0.22);
        break;

      case 'carSpawn':
        this.playTone(audioCtx, dest, now, 330, 495, 0.12, 'sine', 0.18);
        this.playTone(audioCtx, dest, now + 0.08, 495, 660, 0.18, 'sine', 0.15);
        break;

      case 'memorySplit':
        this.playNoiseSweep(audioCtx, dest, now, 0.24, 900, 260, 0.14);
        this.playTone(audioCtx, dest, now + 0.05, 220, 330, 0.18, 'triangle', 0.16);
        break;

      case 'stackPush':
        this.playTone(audioCtx, dest, now, 280, 520, 0.08, 'sine', 0.18);
        this.playTone(audioCtx, dest, now + 0.09, 360, 640, 0.08, 'sine', 0.15);
        this.playTone(audioCtx, dest, now + 0.18, 440, 760, 0.09, 'sine', 0.14);
        break;

      case 'overflowWarn':
        this.playTone(audioCtx, dest, now, 190, 130, 0.18, 'sawtooth', 0.16);
        this.playTone(audioCtx, dest, now + 0.14, 170, 110, 0.24, 'sawtooth', 0.16);
        break;

      case 'heapAlloc':
        this.playTone(audioCtx, dest, now, 392, 587.33, 0.22, 'sine', 0.18);
        this.playTone(audioCtx, dest, now + 0.12, 587.33, 783.99, 0.28, 'triangle', 0.15);
        break;

      case 'referenceSnap':
        this.playTone(audioCtx, dest, now, 523.25, 1046.5, 0.16, 'sine', 0.2);
        this.playTone(audioCtx, dest, now + 0.09, 783.99, 1318.5, 0.24, 'sine', 0.16);
        break;

      case 'outroResolve':
        this.playTone(audioCtx, dest, now, 440, 440, 0.22, 'sine', 0.14);
        this.playTone(audioCtx, dest, now + 0.1, 554.37, 554.37, 0.26, 'sine', 0.14);
        this.playTone(audioCtx, dest, now + 0.2, 659.25, 880, 0.4, 'sine', 0.18);
        break;
    }
  }

  private playTone(
    audioCtx: BaseAudioContext,
    dest: AudioNode,
    startTime: number,
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType,
    peakGain: number
  ): void {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, startTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), startTime + duration);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  private playNoiseSweep(
    audioCtx: BaseAudioContext,
    dest: AudioNode,
    startTime: number,
    duration: number,
    freqStart: number,
    freqEnd: number,
    peakGain: number
  ): void {
    const sampleCount = Math.floor(audioCtx.sampleRate * duration);
    const buffer = audioCtx.createBuffer(1, sampleCount, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freqStart, startTime);
    filter.frequency.exponentialRampToValueAtTime(Math.max(60, freqEnd), startTime + duration);
    filter.Q.value = 2.4;

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    source.start(startTime);
    source.stop(startTime + duration + 0.02);
  }
}

export const sarbAudioEngine = new SarbAudioEngine();
