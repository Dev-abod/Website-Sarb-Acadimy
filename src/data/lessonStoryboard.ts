export type SfxCueType =
  | 'hookAlert'
  | 'carSpawn'
  | 'memorySplit'
  | 'stackPush'
  | 'overflowWarn'
  | 'heapAlloc'
  | 'referenceSnap'
  | 'outroResolve';

export type VisualLayoutType =
  | 'hook_cards'
  | 'code_concept'
  | 'split_comparison'
  | 'flow_pipeline'
  | 'layered_capsule'
  | 'tree_hierarchy'
  | 'checklist_pillars'
  | 'outro_takeaway';

export interface BlueprintItem {
  label: string;
  tag?: string;
  tone?: 'volt' | 'purple' | 'success' | 'error';
}

export interface SceneVisualBlueprint {
  layoutType: VisualLayoutType;
  sectionKicker: string;
  headline: string;
  subheadline: string;
  accentColor: 'volt' | 'purple';
  codeTitle?: string;
  codeLines?: string[];
  leftTitle?: string;
  leftItems?: string[];
  rightTitle?: string;
  rightItems?: string[];
  items?: BlueprintItem[];
  takeaway?: string;
}

export type VoiceEngine = 'charon' | 'edge-tts';

export interface EdgeArabicVoiceOption {
  id: string;
  nameAr: string;
  dialect: string;
  style: string;
  gender: 'male' | 'female';
}

export const EDGE_ARABIC_VOICES: EdgeArabicVoiceOption[] = [
  {
    id: 'ar-EG-ShakirNeural',
    nameAr: 'شاكر',
    dialect: 'عربي · نبرة عميقة وواضحة',
    style: 'ممتاز للشروحات التقنية',
    gender: 'male',
  },
  {
    id: 'ar-JO-TaimNeural',
    nameAr: 'تيم',
    dialect: 'عربي · هادئ ومتزن',
    style: 'إلقاء تعليمي سلس',
    gender: 'male',
  },
  {
    id: 'ar-SA-HamedNeural',
    nameAr: 'حامد',
    dialect: 'السعودية · رصين ومباشر',
    style: 'نبرة فصحى رسمية',
    gender: 'male',
  },
  {
    id: 'ar-AE-HamdanNeural',
    nameAr: 'حمدان',
    dialect: 'الإمارات · دافئ وواضح',
    style: 'مناسب للريلز السريعة',
    gender: 'male',
  },
  {
    id: 'ar-SY-LaithNeural',
    nameAr: 'ليث',
    dialect: 'الشام · قريب وطبيعي',
    style: 'أسلوب حواري شيّق',
    gender: 'male',
  },
  {
    id: 'ar-LB-RamiNeural',
    nameAr: 'رامي',
    dialect: 'لبنان · حيوي ونشيط',
    style: 'طاقة عالية للمقدمات',
    gender: 'male',
  },
  {
    id: 'ar-KW-FahedNeural',
    nameAr: 'فهد',
    dialect: 'الكويت · جاد وواضح',
    style: 'تركيز على المفاهيم',
    gender: 'male',
  },
  {
    id: 'ar-SA-ZariyahNeural',
    nameAr: 'زارية',
    dialect: 'السعودية · صوت نسائي واضح',
    style: 'فصحى نقية ومنظمة',
    gender: 'female',
  },
  {
    id: 'ar-EG-SalmaNeural',
    nameAr: 'سلمى',
    dialect: 'مصر · صوت نسائي تعليمي',
    style: 'شرح مريح وسلس',
    gender: 'female',
  },
  {
    id: 'ar-JO-SanaNeural',
    nameAr: 'سناء',
    dialect: 'الأردن · صوت نسائي هادئ',
    style: 'إيقاع متوازن وواضح',
    gender: 'female',
  },
];

export const DEFAULT_EDGE_VOICE_ID = 'ar-EG-ShakirNeural';

export interface ReelScene {
  id: string;
  index: number;
  title: string;
  labelEn: string;
  narration: string;
  durationMs: number;
  sfxCue: SfxCueType;
  visualFocus: string;
  mascotActive: boolean;
  visualBlueprint?: SceneVisualBlueprint;
}

export interface ScheduledScene extends ReelScene {
  startMs: number;
  endMs: number;
}

export const SARB_COLORS = {
  extremeBlack: '#101010',
  darkSurface: '#1C1C1C',
  elevatedSurface: '#242424',
  borderSubtle: '#2A2A2A',
  borderStrong: '#3A3A3A',
  volt: '#D4FF00',
  voltSoft: '#E5FF66',
  voltMuted: '#556600',
  white: '#FFFFFF',
  grayHint: '#E6E6E6',
  grayMuted: '#8A8A8A',
  success: '#3DDC84',
  error: '#FF5C5C',
  warning: '#FFB020',
  info: '#5CC8FF',
  stackPurple: '#A78BFA',
} as const;

export const REEL_DIMENSIONS = {
  width: 1080,
  height: 1920,
  safeMarginX: 80,
  safeMarginTop: 250,
  safeMarginBottom: 250,
} as const;

export const SARB_ASSETS = {
  icon: '/assets/aistudio/sarb_app_icon_512_3e68d294.png',
  logoOnDark: '/assets/aistudio/sarb_logo_on_dark_5de451f3.png',
  mascot: '/assets/aistudio/sarb_line_mascot_v1_67637345.png',
} as const;

export type LessonId = string;

export interface LessonDefinition {
  id: LessonId;
  category: string;
  shortTitle: string;
  badgeLabel: string;
  title: string;
  exportSlug: string;
  isBuiltIn?: boolean;
  createdAt?: number;
  scenes: ReelScene[];
}

export const LESSON_CATEGORY_SUGGESTIONS: string[] = [
  'هوية سَرب ومميزاتها',
  'البرمجة الكائنية (OOP)',
  'إدارة الذاكرة',
  'أساسيات البرمجة',
  'تطوير الويب والأنظمة',
  'هياكل البيانات والخوارزميات',
  'قواعد البيانات',
  'هندسة البرمجيات',
];

export const SARB_BRAND_INTRO_SCENES: ReelScene[] = [
  {
    id: 'scene-brand-1',
    index: 1,
    title: 'الخطاف — فخ الدورات غير المكتملة',
    labelEn: 'HOOK · THE LEARNING TRAP',
    narration: 'كم دورة برمجية بدأتها، وتوقفت في منتصف الطريق بسبب الحشو والتشتت؟',
    durationMs: 5800,
    sfxCue: 'hookAlert',
    visualFocus: 'بطاقات دورات متوقفة في المنتصف بسبب الحشو والتشتت',
    mascotActive: true,
  },
  {
    id: 'scene-brand-2',
    index: 2,
    title: 'المشكلة في الطريقة التقليدية',
    labelEn: '01 · THE REAL PROBLEM',
    narration:
      'المشكلة ليست في قدرتك على التعلم، المشكلة في الطريقة التقليدية التي تستهلك وقتك دون نتيجة عملية.',
    durationMs: 6400,
    sfxCue: 'overflowWarn',
    visualFocus: 'تبرئة قدرة المتعلم مقابل دوامة استهلاك الوقت في الطريقة التقليدية',
    mascotActive: false,
  },
  {
    id: 'scene-brand-3',
    index: 3,
    title: 'هنا تأتي سَرب — مسارك المختصر',
    labelEn: '02 · ENTER SARB ACADEMY',
    narration: 'هنا تأتي سَرب. لسنا مجرد منصة أخرى، نحن مسارك المختصر لإتقان البرمجة الحقيقية.',
    durationMs: 6200,
    sfxCue: 'carSpawn',
    visualFocus: 'ظهور شعار وسرب الطيور + مقارنة الطريق المشتت بمسار سَرب المباشر',
    mascotActive: false,
  },
  {
    id: 'scene-brand-4',
    index: 4,
    title: 'الركائز الثلاث في سَرب',
    labelEn: '03 · SARB METHODOLOGY',
    narration:
      'نقدّم لك مفاهيم معقدة بتبسيط بصري يرسخ في ذهنك فوراً، ومشاريع من واقع العمل لتفكر كمهندس برمجيات، ومساراً تعليمياً مباشراً يحترم وقتك بلا حشو.',
    durationMs: 9200,
    sfxCue: 'memorySplit',
    visualFocus: 'تبسيط بصري فوري + مشاريع من واقع العمل + مسار مباشر بلا حشو',
    mascotActive: false,
  },
  {
    id: 'scene-brand-5',
    index: 5,
    title: 'الخاتمة — مستقبلك البرمجي بذكاء',
    labelEn: 'SARB ACADEMY · CTA',
    narration: 'سَرب صُنعت لتبني مستقبلك البرمجي بذكاء. تابع سَرب... ونراك في الدرس القادم.',
    durationMs: 6600,
    sfxCue: 'outroResolve',
    visualFocus: 'خلاصة سَرب + الشخصية الكرتونية + شعار سَرب + منصاتنا',
    mascotActive: true,
  },
];

export const OOP_SCENES: ReelScene[] = [
  {
    id: 'scene-oop-hook',
    index: 1,
    title: 'الخطاف — من كتابة كود إلى هندسة أنظمة',
    labelEn: 'HOOK · OOP PRINCIPLES',
    narration:
      'أربع كلمات في البرمجة لو فهمتها صح، رح تنقل تفكيرك من مجرد كتابة كود إلى هندسة أنظمة حقيقية: مبادئ الـ OOP.',
    durationMs: 5600,
    sfxCue: 'hookAlert',
    visualFocus: 'شخصية سَرب + تايبوغرافي حركي + بطاقات المبادئ الأربعة',
    mascotActive: true,
  },
  {
    id: 'scene-encapsulation',
    index: 2,
    title: '1. التغليف — Encapsulation',
    labelEn: '01 · ENCAPSULATION',
    narration:
      'المبدأ الأول: Encapsulation — التغليف. تخيّل سيارتك: لو يقدر أي شخص يمسك أسلاك المحرك بيده مباشرة، رح تتدمر! عشان كذا نقفل على البيانات الحساسة ونخليها Private، ونعطي المستخدم أزرار آمنة فقط للتعامل معها، مثل دواسة البنزين والمكابح.',
    durationMs: 11200,
    sfxCue: 'overflowWarn',
    visualFocus: 'أسلاك مكشوفة خطر -> قفل الكبسولة Private + دواسة البنزين والمكابح Public',
    mascotActive: false,
  },
  {
    id: 'scene-abstraction',
    index: 3,
    title: '2. التجريد — Abstraction',
    labelEn: '02 · ABSTRACTION',
    narration:
      'المبدأ الثاني: Abstraction — التجريد. لما تشغل السيارة، كل اللي تسويه تضغط زر Start. هل محتاج تعرف كيف تحركت شمعات الاحتراق أو كيف ضُخ الوقود؟ لا! التجريد يعني: إعطاء المستخدم النتيجة بكل بساطة، وإخفاء آلاف التعقيدات في الخلفية.',
    durationMs: 9600,
    sfxCue: 'carSpawn',
    visualFocus: 'زر Start البسيط في الواجهة مقابل التروس وشمعات الاحتراق وضخ الوقود المخفية',
    mascotActive: false,
  },
  {
    id: 'scene-inheritance',
    index: 4,
    title: '3. الوراثة — Inheritance',
    labelEn: '03 · INHERITANCE',
    narration:
      'المبدأ الثالث: Inheritance — الوراثة. عندنا تصميم سيارة أساسية فيها محرك وعجلات ومقود. لما نصنع سيارة كهربائية، ما نبدأ التصميم من الصفر! نرث كل خصائص السيارة الأساسية، ونضيف فقط الشيء الجديد الخاص بها: البطارية ومنفذ الشحن.',
    durationMs: 10000,
    sfxCue: 'memorySplit',
    visualFocus: 'مخطط السيارة الأساسية Car يتفرع إلى ElectricCar مع البطارية ومنفذ الشحن',
    mascotActive: false,
  },
  {
    id: 'scene-polymorphism',
    index: 5,
    title: '4. تعدد الأشكال — Polymorphism',
    labelEn: '04 · POLYMORPHISM',
    narration:
      'المبدأ الرابع: Polymorphism — تعدد الأشكال. كل المركبات عندها أمر واحد مشترك: "تحرّك". لكن السيارة تتحرك على أربع عجلات، الطائرة تطير في الجو، والغواصة تغوص في الأعماق. نفس الاستدعاء ونفس الأمر، لكن كل كائن ينفذه بطريقته الخاصة.',
    durationMs: 9800,
    sfxCue: 'heapAlloc',
    visualFocus: 'أمر move() واحد يتفرع إلى سيارة وطائرة وغواصة تتحرك كلٌ بطريقته',
    mascotActive: false,
  },
  {
    id: 'scene-oop-outro',
    index: 6,
    title: 'الخلاصة وخاتمة سَرب',
    labelEn: 'SARB ACADEMY · CTA',
    narration:
      'أربعة مبادئ تحول الكود العشوائي إلى نظام قوي وقابل للتوسع. تابع سَرب... ونراك في الدرس القادم!',
    durationMs: 6400,
    sfxCue: 'outroResolve',
    visualFocus: 'خلاصة المبادئ الأربعة + الشخصية الكرتونية + شعار سَرب + منصاتنا',
    mascotActive: true,
  },
];

export const STACK_HEAP_SCENES: ReelScene[] = [
  {
    id: 'scene-sh-1',
    index: 1,
    title: 'الخطاف — رسائل انهيار الذاكرة',
    labelEn: 'HOOK · MEMORY CRASH',
    narration:
      'لماذا ينهار برنامجك فجأة بهذه الرسائل المزعجة: Stack Overflow و Out of Memory؟ السر كلّه في مكان حفظ البيانات داخل الذاكرة.',
    durationMs: 5600,
    sfxCue: 'hookAlert',
    visualFocus: 'شخصية سَرب + بطاقات أخطاء الذاكرة Stack Overflow و Out of Memory',
    mascotActive: true,
  },
  {
    id: 'scene-sh-2',
    index: 2,
    title: 'مثال السيارة في الكود',
    labelEn: '01 · OBJECT IN CODE',
    narration:
      'عندما تنشئ كائناً لسيارة في كودك... أين يُحفظ بالضبط داخل الذاكرة؟',
    durationMs: 6200,
    sfxCue: 'carSpawn',
    visualFocus: 'كتابة new Car("Sedan", 2026) مع رسم السيارة المتجهي',
    mascotActive: false,
  },
  {
    id: 'scene-sh-3',
    index: 3,
    title: 'تقسيم الذاكرة إلى Stack و Heap',
    labelEn: '02 · RAM ARCHITECTURE',
    narration:
      'الذاكرة ليست مساحة واحدة عشوائية، بل تنقسم إلى قسمين رئيسيين: Stack سريع ومنظم، و Heap مستودع واسع ومفتوح.',
    durationMs: 6400,
    sfxCue: 'memorySplit',
    visualFocus: 'انقسام كتلة RAM إلى Stack بنفسجي و Heap فولت',
    mascotActive: false,
  },
  {
    id: 'scene-sh-4',
    index: 4,
    title: 'الـ Stack ونظام LIFO',
    labelEn: '03 · STACK (LIFO)',
    narration:
      'الـ Stack هو درج مكتبك السريع، منظم وصارم بنظام LIFO — الداخل أخيراً يخرج أولاً، ويحفظ المتغيرات البسيطة وسريعة الاستدعاء.',
    durationMs: 6800,
    sfxCue: 'stackPush',
    visualFocus: 'درج Stack منظم مع مؤشر SP ودخول وخروج المتغيرات البسيطة',
    mascotActive: false,
  },
  {
    id: 'scene-sh-5',
    index: 5,
    title: 'السيارة لا تتسع للـ Stack',
    labelEn: '04 · STACK OVERFLOW',
    narration:
      'لكن كائن السيارة المعقد لا يتسع له درج المكتب! الحجم والبيانات أكبر من سعة الدرج السريع.',
    durationMs: 6800,
    sfxCue: 'overflowWarn',
    visualFocus: 'ارتداد السيارة عند محاولة دخولها درج Stack الصغير مع تنبيه تحذيري',
    mascotActive: false,
  },
  {
    id: 'scene-sh-6',
    index: 6,
    title: 'المستودع المفتوح Heap وكلمة new',
    labelEn: '05 · HEAP ALLOCATION',
    narration:
      'هنا يأتي دور الـ Heap: المستودع المفتوح. بكلمة new تبني السيارة هنا... وتمنحك عنوان Reference واضح.',
    durationMs: 6800,
    sfxCue: 'heapAlloc',
    visualFocus: 'تخصيص كائن السيارة داخل مستودع Heap وتوليد عنوان 0x7FA3',
    mascotActive: false,
  },
  {
    id: 'scene-sh-7',
    index: 7,
    title: 'القاعدة الذهبية: العنوان في Stack والكائن في Heap',
    labelEn: '06 · THE GOLDEN RULE',
    narration:
      'هذا العنوان الصغير فقط يستقر في Stack ليشير للسيارة في Heap. الـ Stack = العنوان، والـ Heap = الكائن الحقيقي بالكامل.',
    durationMs: 7400,
    sfxCue: 'referenceSnap',
    visualFocus: 'سهم مرجعي يربط myCar (0x7FA3) في Stack بالسيارة داخل Heap',
    mascotActive: false,
  },
  {
    id: 'scene-sh-8',
    index: 8,
    title: 'الخلاصة وخاتمة سَرب',
    labelEn: 'SARB ACADEMY · CTA',
    narration:
      'فهمك لهذا الفرق يحميك من استنزاف الذاكرة وانهيار برامجك. تابع سَرب... ونراك في الدرس القادم!',
    durationMs: 6600,
    sfxCue: 'outroResolve',
    visualFocus: 'خلاصة حماية الذاكرة + الشخصية الكرتونية + شعار سَرب + منصاتنا',
    mascotActive: true,
  },
];

export const LESSONS: Record<string, LessonDefinition> = {
  'sarb-brand-intro': {
    id: 'sarb-brand-intro',
    category: 'هوية سَرب ومميزاتها',
    shortTitle: 'لماذا سَرب؟ مسارك المختصر',
    badgeLabel: 'هوية سَرب: مسارك المختصر للبرمجة',
    title: 'لماذا سَرب؟ مسارك المختصر لإتقان البرمجة الحقيقية',
    exportSlug: 'sarb-brand-intro-60fps',
    isBuiltIn: true,
    createdAt: 3,
    scenes: SARB_BRAND_INTRO_SCENES,
  },
  'oop-principles': {
    id: 'oop-principles',
    category: 'البرمجة الكائنية (OOP)',
    shortTitle: 'مبادئ الـ OOP الأربعة',
    badgeLabel: 'درس البرمجة كائنية التوجه: OOP',
    title: 'مبادئ الـ OOP الأربعة — من كتابة كود إلى هندسة أنظمة',
    exportSlug: 'sarb-oop-principles-60fps',
    isBuiltIn: true,
    createdAt: 1,
    scenes: OOP_SCENES,
  },
  'stack-vs-heap': {
    id: 'stack-vs-heap',
    category: 'إدارة الذاكرة',
    shortTitle: 'الذاكرة: Stack vs Heap',
    badgeLabel: 'درس أساسيات الذاكرة: Stack vs Heap',
    title: 'سرّ الذاكرة في البرمجة — الفرق بين Stack و Heap',
    exportSlug: 'sarb-stack-vs-heap-60fps',
    isBuiltIn: true,
    createdAt: 2,
    scenes: STACK_HEAP_SCENES,
  },
};

export const BUILT_IN_LESSONS: LessonDefinition[] = [
  LESSONS['sarb-brand-intro'],
  LESSONS['oop-principles'],
  LESSONS['stack-vs-heap'],
];

export const LESSON_LIST: LessonDefinition[] = BUILT_IN_LESSONS;

export const INITIAL_SCENES: ReelScene[] = SARB_BRAND_INTRO_SCENES;

export interface LessonSectionGroup {
  category: string;
  lessons: LessonDefinition[];
}

export function groupLessonsByCategory(lessons: LessonDefinition[]): LessonSectionGroup[] {
  const map = new Map<string, LessonDefinition[]>();
  for (const lesson of lessons) {
    const cat = (lesson.category || '').trim() || 'فيديوهات متنوعة';
    const existing = map.get(cat);
    if (existing) {
      existing.push(lesson);
    } else {
      map.set(cat, [lesson]);
    }
  }
  return Array.from(map.entries()).map(([category, items]) => ({
    category,
    lessons: items,
  }));
}

export function computeSchedule(scenes: ReelScene[]): {
  scheduled: ScheduledScene[];
  totalDurationMs: number;
} {
  let cursor = 0;
  const scheduled: ScheduledScene[] = scenes.map((scene) => {
    const startMs = cursor;
    const endMs = startMs + scene.durationMs;
    cursor = endMs;
    return {
      ...scene,
      startMs,
      endMs,
    };
  });
  return {
    scheduled,
    totalDurationMs: cursor,
  };
}

export function findSceneAtTime(
  scheduled: ScheduledScene[],
  timeMs: number
): { scene: ScheduledScene; localMs: number; progress: number } {
  if (scheduled.length === 0) {
    throw new Error('Storyboard has no scenes');
  }
  const clamped = Math.max(0, timeMs);
  for (const scene of scheduled) {
    if (clamped < scene.endMs) {
      const localMs = clamped - scene.startMs;
      return {
        scene,
        localMs,
        progress: Math.min(1, Math.max(0, localMs / scene.durationMs)),
      };
    }
  }
  const last = scheduled[scheduled.length - 1];
  return {
    scene: last,
    localMs: last.durationMs,
    progress: 1,
  };
}

export function formatTimecode(ms: number): string {
  const safe = Math.max(0, Math.floor(ms));
  const totalSeconds = Math.floor(safe / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((safe % 1000) / 100);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
}
