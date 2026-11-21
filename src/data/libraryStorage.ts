import {
  BUILT_IN_LESSONS,
  DEFAULT_EDGE_VOICE_ID,
  EDGE_ARABIC_VOICES,
  type LessonDefinition,
  type LessonId,
  type ReelScene,
  type VoiceEngine,
} from './lessonStoryboard';

const STORAGE_KEY = 'sarb_reel_studio_library_v1';
const VALID_EDGE_VOICE_IDS = new Set(EDGE_ARABIC_VOICES.map((v) => v.id));

export interface PersistedLibraryState {
  customLessons: LessonDefinition[];
  deletedBuiltInIds: string[];
  builtInCategoryOverrides: Record<string, string>;
  durationsByLesson: Record<string, Record<string, number>>;
  voiceEngine: VoiceEngine;
  edgeVoice: string;
  edgeRate: string;
  voiceDefaultMigratedV2?: boolean;
  activeLessonId: LessonId | null;
  seenBuiltInIds?: string[];
}

const LATEST_BUILT_IN_ID = 'sarb-brand-intro';

const DEFAULT_STATE: PersistedLibraryState = {
  customLessons: [],
  deletedBuiltInIds: [],
  builtInCategoryOverrides: {},
  durationsByLesson: {},
  voiceEngine: 'edge-tts',
  edgeVoice: DEFAULT_EDGE_VOICE_ID,
  edgeRate: '+4%',
  voiceDefaultMigratedV2: true,
  activeLessonId: LATEST_BUILT_IN_ID,
  seenBuiltInIds: [LATEST_BUILT_IN_ID],
};

function sanitizeLessons(raw: unknown): LessonDefinition[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is LessonDefinition => {
    if (!item || typeof item !== 'object') return false;
    const obj = item as Partial<LessonDefinition>;
    return (
      typeof obj.id === 'string' &&
      obj.id.length > 0 &&
      typeof obj.title === 'string' &&
      Array.isArray(obj.scenes) &&
      obj.scenes.length > 0
    );
  });
}

export function loadLibraryState(): PersistedLibraryState {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<PersistedLibraryState>;
    const deletedBuiltInIds = Array.isArray(parsed.deletedBuiltInIds)
      ? parsed.deletedBuiltInIds.filter((id): id is string => typeof id === 'string')
      : [];
    const seenBuiltInIds = Array.isArray(parsed.seenBuiltInIds)
      ? parsed.seenBuiltInIds.filter((id): id is string => typeof id === 'string')
      : [];
    const shouldFocusNewBuiltIn =
      !seenBuiltInIds.includes(LATEST_BUILT_IN_ID) &&
      !deletedBuiltInIds.includes(LATEST_BUILT_IN_ID);

    const resolvedEngine: VoiceEngine = parsed.voiceDefaultMigratedV2
      ? parsed.voiceEngine === 'charon'
        ? 'charon'
        : 'edge-tts'
      : 'edge-tts';

    const resolvedEdgeVoice =
      typeof parsed.edgeVoice === 'string' && VALID_EDGE_VOICE_IDS.has(parsed.edgeVoice)
        ? parsed.edgeVoice
        : DEFAULT_EDGE_VOICE_ID;

    const resolvedEdgeRate =
      typeof parsed.edgeRate === 'string' && /^[+-]\d{1,2}%$/.test(parsed.edgeRate)
        ? parsed.edgeRate
        : '+4%';

    return {
      customLessons: sanitizeLessons(parsed.customLessons),
      deletedBuiltInIds,
      builtInCategoryOverrides:
        parsed.builtInCategoryOverrides && typeof parsed.builtInCategoryOverrides === 'object'
          ? parsed.builtInCategoryOverrides
          : {},
      durationsByLesson:
        parsed.durationsByLesson && typeof parsed.durationsByLesson === 'object'
          ? parsed.durationsByLesson
          : {},
      voiceEngine: resolvedEngine,
      edgeVoice: resolvedEdgeVoice,
      edgeRate: resolvedEdgeRate,
      voiceDefaultMigratedV2: true,
      activeLessonId: shouldFocusNewBuiltIn
        ? LATEST_BUILT_IN_ID
        : typeof parsed.activeLessonId === 'string'
          ? parsed.activeLessonId
          : LATEST_BUILT_IN_ID,
      seenBuiltInIds: shouldFocusNewBuiltIn
        ? [...seenBuiltInIds, LATEST_BUILT_IN_ID]
        : seenBuiltInIds,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveLibraryState(state: PersistedLibraryState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function buildAllLessons(state: PersistedLibraryState): LessonDefinition[] {
  const deletedSet = new Set(state.deletedBuiltInIds);

  const builtIns = BUILT_IN_LESSONS.filter((lesson) => !deletedSet.has(lesson.id)).map(
    (lesson) => {
      const category = state.builtInCategoryOverrides[lesson.id] || lesson.category;
      const durMap = state.durationsByLesson[lesson.id];
      const scenes: ReelScene[] = lesson.scenes.map((sc) => ({
        ...sc,
        durationMs:
          durMap && typeof durMap[sc.id] === 'number' && durMap[sc.id] >= 1400
            ? durMap[sc.id]
            : sc.durationMs,
      }));
      return {
        ...lesson,
        category,
        scenes,
      };
    }
  );

  const customs = state.customLessons.map((lesson) => {
    const durMap = state.durationsByLesson[lesson.id];
    const scenes = lesson.scenes.map((sc) => ({
      ...sc,
      durationMs:
        durMap && typeof durMap[sc.id] === 'number' && durMap[sc.id] >= 1400
          ? durMap[sc.id]
          : sc.durationMs,
    }));
    return {
      ...lesson,
      isBuiltIn: false,
      scenes,
    };
  });

  // Newest custom lessons appear alongside built-ins; keep customs ordered by createdAt desc
  const sortedCustoms = [...customs].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  return [...sortedCustoms, ...builtIns];
}
