import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

export const DEFAULT_EDGE_VOICE = 'ar-EG-ShakirNeural';

const ALLOWED_ARABIC_EDGE_VOICES = new Set([
  'ar-EG-ShakirNeural',
  'ar-JO-TaimNeural',
  'ar-SA-HamedNeural',
  'ar-AE-HamdanNeural',
  'ar-SY-LaithNeural',
  'ar-LB-RamiNeural',
  'ar-KW-FahedNeural',
  'ar-SA-ZariyahNeural',
  'ar-EG-SalmaNeural',
  'ar-JO-SanaNeural',
]);

function sanitizeTextForEdgeSsml(input: string): string {
  return input
    .replace(/&/g, ' و ')
    .replace(/</g, ' ')
    .replace(/>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function generateSarbEdgeTts(
  text: string,
  options?: { voiceName?: string; rate?: string }
): Promise<{ audioBase64: string; mimeType: string; voiceName: string }> {
  const cleanText = sanitizeTextForEdgeSsml(text);
  if (!cleanText) {
    throw new Error('النص المدخل غير صالح لتوليد الصوت.');
  }

  const chosenVoice =
    options?.voiceName && ALLOWED_ARABIC_EDGE_VOICES.has(options.voiceName)
      ? options.voiceName
      : DEFAULT_EDGE_VOICE;

  const chosenRate =
    options?.rate && /^[+-]\d{1,2}%$/.test(options.rate) ? options.rate : '+4%';

  const tts = new MsEdgeTTS({
    connectionTimeoutMs: 15000,
    synthesisTimeoutMs: 45000,
  });

  try {
    await tts.setMetadata(
      chosenVoice,
      OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
    );

    const { audioStream } = tts.toStream(cleanText, {
      rate: chosenRate,
      pitch: 'default',
    });

    const audioBuffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      audioStream.on('data', (chunk: Buffer | Uint8Array) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      audioStream.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      audioStream.on('error', (err: unknown) => {
        reject(err instanceof Error ? err : new Error('Edge TTS stream failed'));
      });
    });

    if (audioBuffer.length === 0) {
      throw new Error('لم يُرجع خادم Edge TTS بيانات صوتية.');
    }

    return {
      audioBase64: audioBuffer.toString('base64'),
      mimeType: 'audio/mpeg',
      voiceName: chosenVoice,
    };
  } finally {
    try {
      tts.close();
    } catch {
      // Ignore socket cleanup errors
    }
  }
}
