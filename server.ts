import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';
import { generateSarbEdgeTts } from './server/edgeTtsService.ts';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OFFICIAL_SARB_VOICE = 'Charon';
const OFFICIAL_SARB_STYLE =
  'Clear, warm, engaging Arabic tech educator explaining concepts naturally with crisp pacing';

function createGeminiClient(apiVersion?: string): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    ...(apiVersion ? { apiVersion } : {}),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function parseSampleRate(mimeType: string): number {
  const match = mimeType.match(/rate=(\d+)/i);
  const parsed = match ? Number(match[1]) : 24000;
  return Number.isFinite(parsed) && parsed >= 8000 && parsed <= 96000 ? parsed : 24000;
}

function ensureWavAudio(
  base64Audio: string,
  rawMimeType: string
): { audioBase64: string; mimeType: string } {
  const rawBuf = Buffer.from(base64Audio, 'base64');
  const isAlreadyWav =
    rawBuf.length >= 44 &&
    rawBuf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    rawBuf.subarray(8, 12).toString('ascii') === 'WAVE';

  if (isAlreadyWav) {
    return { audioBase64: base64Audio, mimeType: 'audio/wav' };
  }

  const lowerMime = rawMimeType.toLowerCase();
  const isRawPcm =
    lowerMime.includes('pcm') ||
    lowerMime.includes('l16') ||
    lowerMime === '' ||
    lowerMime.includes('wav');

  if (!isRawPcm && (lowerMime.includes('mp3') || lowerMime.includes('mpeg') || lowerMime.includes('ogg') || lowerMime.includes('webm'))) {
    return { audioBase64: base64Audio, mimeType: rawMimeType };
  }

  const sampleRate = parseSampleRate(rawMimeType);
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = rawBuf.length;

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  const wavBuf = Buffer.concat([header, rawBuf]);
  return {
    audioBase64: wavBuf.toString('base64'),
    mimeType: 'audio/wav',
  };
}

async function generateSarbUnifiedTts(text: string): Promise<{ audioBase64: string; mimeType: string }> {
  const attempts: Array<{
    label: string;
    apiVersion?: string;
    model: string;
    useSpeechMetadata: boolean;
  }> = [
    {
      label: '3.8-flash-lite-tts',
      model: 'gemini-3.8-flash-lite-tts',
      useSpeechMetadata: true,
    },
    {
      label: '2.5-flash-preview-tts',
      apiVersion: 'v1beta',
      model: 'gemini-2.5-flash-preview-tts',
      useSpeechMetadata: false,
    },
  ];

  let lastError: unknown = null;

  for (const attempt of attempts) {
    try {
      const ai = createGeminiClient(attempt.apiVersion);
      const part: Record<string, unknown> = attempt.useSpeechMetadata
        ? { text, speechMetadata: { style: OFFICIAL_SARB_STYLE } }
        : { text };

      const response = await ai.models.generateContent({
        model: attempt.model,
        contents: [{ role: 'user', parts: [part as never] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: OFFICIAL_SARB_VOICE },
            },
          },
        } as never,
      });

      const parts = response.candidates?.[0]?.content?.parts ?? [];
      const audioPart = parts.find((p) => p.inlineData?.data);
      const base64Audio = audioPart?.inlineData?.data;

      if (base64Audio) {
        const rawMime = audioPart?.inlineData?.mimeType || 'audio/wav';
        return ensureWavAudio(base64Audio, rawMime);
      }
    } catch (err: unknown) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[TTS attempt failed: ${attempt.label}]`, msg.slice(0, 260));
      // Do not hammer fallback models if we simply hit a temporary rate limit
      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
        break;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('تعذّر توليد الصوت من النموذج الموحّد.');
}

const LIBRARY_FILE = path.join(os.tmpdir(), 'sarb-academy-reel-library.json');

const ALLOWED_SFX_CUES = new Set([
  'hookAlert',
  'carSpawn',
  'memorySplit',
  'stackPush',
  'overflowWarn',
  'heapAlloc',
  'referenceSnap',
  'outroResolve',
]);

const ALLOWED_LAYOUT_TYPES = new Set([
  'hook_cards',
  'code_concept',
  'split_comparison',
  'flow_pipeline',
  'layered_capsule',
  'tree_hierarchy',
  'checklist_pillars',
  'outro_takeaway',
]);

function estimateNarrationDurationMs(narration: string, isHook: boolean, isOutro: boolean): number {
  const words = narration.trim().split(/\s+/).filter(Boolean).length;
  const base = words * 390 + (isHook ? 1400 : isOutro ? 2200 : 1200);
  return Math.max(4200, Math.min(13500, Math.round(base / 200) * 200));
}

function sanitizeSlug(raw: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 42);
  return cleaned ? `sarb-${cleaned}-60fps` : `sarb-lesson-${Date.now()}-60fps`;
}

async function generateReelFromScript(script: string, requestedCategory?: string) {
  const ai = createGeminiClient();

  const categoryDirective = requestedCategory?.trim()
    ? `Use this exact Arabic category/section name for "category": "${requestedCategory.trim()}".`
    : `Assign a concise, clear Arabic category/section name for "category", choosing from standard sections when applicable: "أساسيات البرمجة", "البرمجة الكائنية (OOP)", "إدارة الذاكرة", "تطوير الويب والأنظمة", "هياكل البيانات والخوارزميات", "قواعد البيانات", "هندسة البرمجيات", or a fitting 2-3 word Arabic tech section.`;

  const systemInstruction = `You are the Motion Graphics Director & Curriculum Designer for "أكاديمية سَرب" (Sarb Academy), producing crisp vertical 9:16 tech educational Reels (1080x1920) on a solid #101010 dark background with Volt (#D4FF00) and Purple (#A78BFA) accents.

Given an Arabic educational script from the user, convert it into a structured multi-scene Sarb Academy Reel storyboard JSON.

CRITICAL RULES:
1. Preserve the user's Arabic script ideas, analogies, and wording faithfully inside each scene's "narration". Split the script naturally into 4 to 8 scenes (minimum 4 scenes, maximum 8 scenes). Every part of the user's script must appear smoothly across the scenes without inventing contradictory facts.
2. Scene 1 MUST have visualBlueprint.layoutType = "hook_cards", mascotActive = true, sfxCue = "hookAlert", and labelEn starting with "HOOK · ".
3. The FINAL scene MUST have visualBlueprint.layoutType = "outro_takeaway", mascotActive = true, sfxCue = "outroResolve", and labelEn = "SARB ACADEMY · CTA". If the script didn't include a Sarb closing CTA, add a short natural closing phrase like "تابع سَرب... ونراك في الدرس القادم!".
4. Middle scenes (Scene 2 to Scene N-1) MUST choose the best matching visual layout from:
   - "code_concept": Terminal/code snippet (codeTitle, codeLines max 4 short lines) + key takeaway.
   - "split_comparison": Two contrasting cards (leftTitle/leftItems in Purple vs rightTitle/rightItems in Volt — e.g. Before/After, Problem/Solution, Concept A/Concept B).
   - "flow_pipeline": 3 sequential pipeline steps in "items" showing data/action flowing step by step.
   - "layered_capsule": Protected/hidden internal layer (leftTitle, leftItems in Purple) + simple public interface/controls (rightTitle, rightItems in Volt).
   - "tree_hierarchy": 1 parent/base concept (leftTitle, leftItems[0]) branching into 2-3 concrete implementations/cases in "items".
   - "checklist_pillars": 2-4 crisp bullet/concept cards in "items" (label + short English/code tag).
   Vary layouts across middle scenes so the video feels dynamic and cinematic!
5. Keep ALL visualBlueprint text SHORT and punchy so it fits cleanly inside 9:16 mobile cards:
   - "headline": 3 to 7 Arabic words max.
   - "sectionKicker": 1 to 3 Arabic words (e.g. "المبدأ الأول", "المشكلة", "كيف يعمل؟").
   - "subheadline": 2 to 5 English words (e.g. "clean architecture", "request -> response").
   - "items": max 4 items; each "label" 2 to 6 Arabic words max; "tag" max 22 ASCII chars.
   - "leftItems" / "rightItems": max 3 short phrases each (2 to 5 words).
   - "codeLines": max 4 short lines (max 34 chars per line).
   - "takeaway": max 8 Arabic words.
6. ${categoryDirective}
7. For "exportSlug", provide a clean English kebab-case slug (2-4 words, e.g. "rest-api-basics").`;

  const schemaConfig = {
    systemInstruction,
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        shortTitle: { type: Type.STRING, description: 'Short Arabic title (2-4 words)' },
        title: { type: Type.STRING, description: 'Full Arabic lesson title' },
        badgeLabel: { type: Type.STRING, description: 'Concise Arabic badge e.g. درس البرمجة: ...' },
        category: { type: Type.STRING, description: 'Arabic section/category name' },
        exportSlug: { type: Type.STRING, description: 'English kebab-case slug' },
        scenes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              labelEn: { type: Type.STRING },
              narration: { type: Type.STRING },
              sfxCue: { type: Type.STRING },
              visualFocus: { type: Type.STRING },
              mascotActive: { type: Type.BOOLEAN },
              visualBlueprint: {
                type: Type.OBJECT,
                properties: {
                  layoutType: { type: Type.STRING },
                  sectionKicker: { type: Type.STRING },
                  headline: { type: Type.STRING },
                  subheadline: { type: Type.STRING },
                  accentColor: { type: Type.STRING },
                  codeTitle: { type: Type.STRING },
                  codeLines: { type: Type.ARRAY, items: { type: Type.STRING } },
                  leftTitle: { type: Type.STRING },
                  leftItems: { type: Type.ARRAY, items: { type: Type.STRING } },
                  rightTitle: { type: Type.STRING },
                  rightItems: { type: Type.ARRAY, items: { type: Type.STRING } },
                  items: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        label: { type: Type.STRING },
                        tag: { type: Type.STRING },
                        tone: { type: Type.STRING },
                      },
                      required: ['label'],
                    },
                  },
                  takeaway: { type: Type.STRING },
                },
                required: ['layoutType', 'sectionKicker', 'headline', 'subheadline', 'accentColor'],
              },
            },
            required: ['title', 'labelEn', 'narration', 'sfxCue', 'visualFocus', 'mascotActive', 'visualBlueprint'],
          },
        },
      },
      required: ['shortTitle', 'title', 'badgeLabel', 'category', 'exportSlug', 'scenes'],
    },
  };

  const modelsToTry = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
  let response: Awaited<ReturnType<typeof ai.models.generateContent>> | null = null;
  let lastErr: unknown = null;

  for (const modelName of modelsToTry) {
    try {
      response = await ai.models.generateContent({
        model: modelName,
        contents: `حول هذا السكريبت إلى فيديو ريلز متكامل بهوية أكاديمية سَرب:\n\n${script}`,
        config: schemaConfig,
      });
      if ((response.text ?? '').trim()) {
        break;
      }
    } catch (err: unknown) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[generate-reel attempt failed: ${modelName}]`, msg.slice(0, 260));
      if (msg.includes('403') || msg.includes('PERMISSION_DENIED') || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
        throw err;
      }
    }
  }

  if (!response) {
    throw lastErr instanceof Error ? lastErr : new Error('تعذّر الاتصال بنموذج توليد المشاهد.');
  }

  const rawText = (response.text ?? '').trim();
  if (!rawText) {
    throw new Error('لم يُرجع الذكاء الاصطناعي بيانات للمشاهد.');
  }

  const parsed = JSON.parse(rawText) as {
    shortTitle?: string;
    title?: string;
    badgeLabel?: string;
    category?: string;
    exportSlug?: string;
    scenes?: Array<Record<string, unknown>>;
  };

  const rawScenes = Array.isArray(parsed.scenes) ? parsed.scenes.slice(0, 8) : [];
  if (rawScenes.length < 2) {
    throw new Error('لم يتم تقسيم السكريبت إلى مشاهد كافية. أعد المحاولة بنص أوضح.');
  }

  const lessonId = `custom-${Date.now()}-${randomUUID().slice(0, 6)}`;
  const normalizedScenes = rawScenes.map((raw, idx) => {
    const isFirst = idx === 0;
    const isLast = idx === rawScenes.length - 1;
    const narration = typeof raw.narration === 'string' && raw.narration.trim()
      ? raw.narration.trim()
      : 'مفهوم برمجي مهم من أكاديمية سَرب.';
    const rawBp = (raw.visualBlueprint && typeof raw.visualBlueprint === 'object'
      ? raw.visualBlueprint
      : {}) as Record<string, unknown>;

    let layoutType = typeof rawBp.layoutType === 'string' && ALLOWED_LAYOUT_TYPES.has(rawBp.layoutType)
      ? rawBp.layoutType
      : 'checklist_pillars';
    if (isFirst) layoutType = 'hook_cards';
    if (isLast) layoutType = 'outro_takeaway';

    const rawCue = typeof raw.sfxCue === 'string' && ALLOWED_SFX_CUES.has(raw.sfxCue)
      ? raw.sfxCue
      : isFirst
        ? 'hookAlert'
        : isLast
          ? 'outroResolve'
          : idx % 2 === 1
            ? 'carSpawn'
            : 'heapAlloc';

    const rawItems = Array.isArray(rawBp.items)
      ? rawBp.items
          .filter((it): it is Record<string, unknown> => Boolean(it && typeof it === 'object'))
          .slice(0, 4)
          .map((it, itemIdx) => ({
            label: typeof it.label === 'string' ? it.label.trim() : `نقطة ${itemIdx + 1}`,
            tag: typeof it.tag === 'string' ? it.tag.trim() : undefined,
            tone:
              it.tone === 'volt' || it.tone === 'purple' || it.tone === 'success' || it.tone === 'error'
                ? it.tone
                : itemIdx % 2 === 0
                  ? 'volt'
                  : 'purple',
          }))
      : [];

    return {
      id: `${lessonId}-scene-${idx + 1}`,
      index: idx + 1,
      title: typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : `المشهد ${idx + 1}`,
      labelEn:
        typeof raw.labelEn === 'string' && raw.labelEn.trim()
          ? raw.labelEn.trim().toUpperCase()
          : isFirst
            ? 'HOOK · SARB ACADEMY'
            : isLast
              ? 'SARB ACADEMY · CTA'
              : `0${idx} · CONCEPT`,
      narration,
      durationMs: estimateNarrationDurationMs(narration, isFirst, isLast),
      sfxCue: rawCue,
      visualFocus:
        typeof raw.visualFocus === 'string' && raw.visualFocus.trim()
          ? raw.visualFocus.trim()
          : 'تصميم حركي تفاعلي بهوية سَرب',
      mascotActive: isFirst || isLast || Boolean(raw.mascotActive),
      visualBlueprint: {
        layoutType,
        sectionKicker:
          typeof rawBp.sectionKicker === 'string' && rawBp.sectionKicker.trim()
            ? rawBp.sectionKicker.trim()
            : isFirst
              ? 'مقدمة الدرس'
              : isLast
                ? 'الخلاصة'
                : `النقطة ${idx}`,
        headline:
          typeof rawBp.headline === 'string' && rawBp.headline.trim()
            ? rawBp.headline.trim()
            : typeof raw.title === 'string'
              ? raw.title.trim()
              : 'مفهوم برمجي',
        subheadline:
          typeof rawBp.subheadline === 'string' && rawBp.subheadline.trim()
            ? rawBp.subheadline.trim()
            : 'sarb academy',
        accentColor: rawBp.accentColor === 'purple' ? 'purple' : 'volt',
        codeTitle: typeof rawBp.codeTitle === 'string' ? rawBp.codeTitle.trim() : undefined,
        codeLines: Array.isArray(rawBp.codeLines)
          ? rawBp.codeLines.filter((l): l is string => typeof l === 'string').slice(0, 4)
          : undefined,
        leftTitle: typeof rawBp.leftTitle === 'string' ? rawBp.leftTitle.trim() : undefined,
        leftItems: Array.isArray(rawBp.leftItems)
          ? rawBp.leftItems.filter((l): l is string => typeof l === 'string').slice(0, 3)
          : undefined,
        rightTitle: typeof rawBp.rightTitle === 'string' ? rawBp.rightTitle.trim() : undefined,
        rightItems: Array.isArray(rawBp.rightItems)
          ? rawBp.rightItems.filter((l): l is string => typeof l === 'string').slice(0, 3)
          : undefined,
        items: rawItems,
        takeaway: typeof rawBp.takeaway === 'string' ? rawBp.takeaway.trim() : undefined,
      },
    };
  });

  const finalCategory =
    requestedCategory?.trim() ||
    (typeof parsed.category === 'string' && parsed.category.trim()) ||
    'دروس برمجية';

  return {
    id: lessonId,
    category: finalCategory,
    shortTitle:
      typeof parsed.shortTitle === 'string' && parsed.shortTitle.trim()
        ? parsed.shortTitle.trim()
        : 'فيديو جديد',
    badgeLabel:
      typeof parsed.badgeLabel === 'string' && parsed.badgeLabel.trim()
        ? parsed.badgeLabel.trim()
        : `قسم: ${finalCategory}`,
    title:
      typeof parsed.title === 'string' && parsed.title.trim()
        ? parsed.title.trim()
        : 'فيديو تعليمي — أكاديمية سَرب',
    exportSlug: sanitizeSlug(parsed.exportSlug || parsed.shortTitle || 'sarb-custom-reel'),
    isBuiltIn: false,
    createdAt: Date.now(),
    scenes: normalizedScenes,
  };
}

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT || 3000);

  app.use(express.json({ limit: '25mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/library', async (_req, res) => {
    try {
      const raw = await fs.readFile(LIBRARY_FILE, 'utf8');
      res.json(JSON.parse(raw));
    } catch {
      res.json(null);
    }
  });

  app.put('/api/library', async (req, res) => {
    try {
      await fs.writeFile(LIBRARY_FILE, JSON.stringify(req.body), 'utf8');
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: 'تعذّر حفظ المكتبة على الخادم.' });
    }
  });

  app.post('/api/generate-reel', async (req, res) => {
    if (!process.env.GEMINI_API_KEY) {
      res.status(500).json({
        error: 'مفتاح GEMINI_API_KEY غير مهيأ. يرجى التحقق من لوحة Settings > Secrets.',
      });
      return;
    }

    const body = req.body as { script?: unknown; category?: unknown };
    const script = typeof body.script === 'string' ? body.script.trim() : '';
    const category = typeof body.category === 'string' ? body.category.trim() : '';

    if (!script || script.length < 20) {
      res.status(400).json({ error: 'يرجى إدخال سكريبت واضح (20 حرفاً على الأقل) لإنشاء الفيديو.' });
      return;
    }

    if (script.length > 6000) {
      res.status(400).json({ error: 'السكريبت طويل جداً؛ الحد الأقصى 6000 حرف.' });
      return;
    }

    try {
      const lesson = await generateReelFromScript(script, category || undefined);
      res.json({ lesson });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'خطأ غير متوقع أثناء بناء الفيديو';
      console.error('[generate-reel error]', message);
      const status =
        message.includes('403') || message.includes('PERMISSION_DENIED')
          ? 403
          : message.includes('429') || message.includes('RESOURCE_EXHAUSTED')
            ? 429
            : message.includes('503') || message.includes('UNAVAILABLE')
              ? 503
              : 500;
      res.status(status).json({
        error:
          status === 403
            ? 'تعذّر التحقق من صلاحية مفتاح API. تحقق من Settings > Secrets.'
            : status === 429
              ? 'تم تجاوز حد الطلبات مؤقتاً. انتظر لحظات ثم أعد المحاولة.'
              : status === 503
                ? 'نموذج الذكاء الاصطناعي يواجه ضغطاً مؤقتاً الآن. انتظر بضع ثوانٍ ثم أعد المحاولة.'
                : `تعذّر تحويل السكريبت إلى فيديو: ${message}`,
      });
    }
  });

  app.post('/api/tts', async (req, res) => {
    const body = req.body as {
      text?: unknown;
      engine?: unknown;
      edgeVoice?: unknown;
      edgeRate?: unknown;
    };

    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const engine = body.engine === 'charon' ? 'charon' : 'edge-tts';
    const edgeVoice = typeof body.edgeVoice === 'string' ? body.edgeVoice.trim() : undefined;
    const edgeRate = typeof body.edgeRate === 'string' ? body.edgeRate.trim() : undefined;

    if (!text) {
      res.status(400).json({ error: 'يرجى إدخال النص أو السكريبت لتوليد الصوت.' });
      return;
    }

    if (text.length > 4000) {
      res.status(400).json({ error: 'النص طويل جداً؛ الحد الأقصى 4000 حرف في المرة الواحدة.' });
      return;
    }

    if (engine === 'edge-tts') {
      try {
        const result = await generateSarbEdgeTts(text, {
          voiceName: edgeVoice,
          rate: edgeRate,
        });
        res.json(result);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'فشل توليد الصوت عبر Edge TTS';
        console.error('[Edge TTS error]', message);
        res.status(500).json({
          error: `تعذّر توليد الصوت المجاني عبر Edge TTS: ${message}`,
        });
      }
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      res.status(500).json({
        error: 'مفتاح GEMINI_API_KEY غير مهيأ. يمكنك التحقق من Settings > Secrets أو اختيار Edge TTS المجاني.',
      });
      return;
    }

    try {
      const result = await generateSarbUnifiedTts(text);
      res.json({
        audioBase64: result.audioBase64,
        mimeType: result.mimeType,
        voiceName: OFFICIAL_SARB_VOICE,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'خطأ غير متوقع أثناء توليد الصوت';
      const status =
        message.includes('403') || message.includes('PERMISSION_DENIED')
          ? 403
          : message.includes('429') || message.includes('RESOURCE_EXHAUSTED')
            ? 429
            : 500;

      res.status(status).json({
        error:
          status === 403
            ? 'تعذّر التحقق من صلاحية مفتاح API. تحقق من Settings > Secrets أو استخدم Edge TTS المجاني.'
            : status === 429
              ? 'تم تجاوز حد الطلبات مؤقتاً لـ Charon. جرّب التبديل إلى Edge TTS المجاني بلا حدود أو انتظر لحظات.'
              : `فشل توليد الصوت: ${message}`,
      });
    }
  });

  app.post(
    '/api/transcode-mp4',
    express.raw({ type: ['application/octet-stream', 'video/*'], limit: '250mb' }),
    async (req, res) => {
      const inputBuffer = Buffer.isBuffer(req.body) ? req.body : null;
      if (!inputBuffer || inputBuffer.length === 0) {
        res.status(400).json({ error: 'بيانات الفيديو المرسلة فارغة.' });
        return;
      }

      const id = randomUUID();
      const inputPath = path.join(os.tmpdir(), `sarb-in-${id}.bin`);
      const outputPath = path.join(os.tmpdir(), `sarb-out-${id}.mp4`);

      try {
        await fs.writeFile(inputPath, inputBuffer);
        await execFileAsync(
          'ffmpeg',
          [
            '-y',
            '-i',
            inputPath,
            '-c:v',
            'libx264',
            '-preset',
            'veryfast',
            '-crf',
            '18',
            '-pix_fmt',
            'yuv420p',
            '-r',
            '60',
            '-c:a',
            'aac',
            '-b:a',
            '192k',
            '-movflags',
            '+faststart',
            outputPath,
          ],
          { maxBuffer: 10 * 1024 * 1024 }
        );

        const mp4Buffer = await fs.readFile(outputPath);
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Length', String(mp4Buffer.length));
        res.send(mp4Buffer);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'فشل تحويل الفيديو إلى MP4';
        console.error('[transcode-mp4 error]', msg);
        res.status(500).json({ error: 'تعذّر تحويل الفيديو إلى صيغة MP4.' });
      } finally {
        await fs.unlink(inputPath).catch(() => {});
        await fs.unlink(outputPath).catch(() => {});
      }
    }
  );

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Sarb Reel Studio server running on http://0.0.0.0:${port}`);
  });
}

startServer();
