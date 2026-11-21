import type { LessonDefinition } from '../data/lessonStoryboard';
import type { CarouselSlide } from './postTemplates';

export type CaptionPlatform = 'instagram' | 'x' | 'linkedin';
export type VideoPostAngle = 'teaser' | 'summary';

function stripHighlightStars(s: string): string {
  return s.replace(/\*/g, '').trim();
}

function formatSingleSummary(tplId: string, data: Record<string, string>): {
  headline: string;
  details: string[];
} {
  const clean = (k: string) => stripHighlightStars(data[k] ?? '');

  switch (tplId) {
    case 'quick':
      return {
        headline: clean('title'),
        details: [
          clean('body'),
          data.code?.trim() ? `مثال (${clean('lang') || 'Code'}):\n${data.code.trim()}` : '',
        ].filter(Boolean),
      };
    case 'commands':
      return {
        headline: clean('title'),
        details: (data.items ?? '')
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
          .map((l) => {
            const [cmd, desc] = l.split('|').map((x) => x.trim());
            return desc ? `• ${cmd}: ${desc}` : `• ${cmd}`;
          }),
      };
    case 'compare':
      return {
        headline: clean('title'),
        details: [
          `🔹 ${clean('aName')} (${clean('aQ')}): ${clean('aDesc')}`,
          `🔹 ${clean('bName')} (${clean('bQ')}): ${clean('bDesc')}`,
        ],
      };
    case 'tip':
      return {
        headline: clean('quote'),
        details: [
          clean('body'),
          clean('statA') ? `${clean('statA')} ${clean('labelA')} · ${clean('statB')} ${clean('labelB')}` : '',
        ].filter(Boolean),
      };
    case 'site':
      return {
        headline: `${clean('name')} — ${clean('url')}`,
        details: [
          clean('desc'),
          ...(data.features ?? '')
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean)
            .map((f) => `✓ ${f}`),
        ],
      };
    case 'trend':
      return {
        headline: `${clean('name')} — ${clean('tagline')}`,
        details: [clean('desc'), clean('audience') ? `لمن يفيد؟ ${clean('audience')}` : ''].filter(Boolean),
      };
    case 'steps':
      return {
        headline: clean('title'),
        details: (data.steps ?? '')
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
          .map((l, idx) => {
            const [st, sd] = l.split('|').map((x) => x.trim());
            return sd ? `${idx + 1}. ${st}: ${sd}` : `${idx + 1}. ${st}`;
          }),
      };
    default:
      return { headline: clean('title'), details: [clean('body')].filter(Boolean) };
  }
}

export function generatePostCaption(params: {
  mode: 'single' | 'carousel' | 'video';
  tplId: string;
  data: Record<string, string>;
  slides?: CarouselSlide[];
  platform: CaptionPlatform;
  handleText: string;
  videoAngle?: VideoPostAngle;
}): string {
  const { mode, tplId, data, slides = [], platform, handleText, videoAngle } = params;
  const handle = handleText.trim() || '@SarbAcademy';

  const summary =
    mode === 'carousel' && slides.length > 0
      ? (() => {
          const first = formatSingleSummary(slides[0].tplId, slides[0].data);
          const restHeadlines = slides
            .slice(1)
            .map((sl, i) => `${i + 2}. ${formatSingleSummary(sl.tplId, sl.data).headline}`)
            .filter((x) => x.length > 4);
          return {
            headline: first.headline,
            details: [...first.details, ...restHeadlines],
          };
        })()
      : formatSingleSummary(tplId, data);

  if (mode === 'video' && videoAngle === 'teaser') {
    const teaserDesc = summary.details[0] || '';
    if (platform === 'x') {
      return `${summary.headline}\n\n${teaserDesc}\n\nالليلة ننشر الفيديو الكامل خطوة بخطوة على ${handle}\n#سرب #أكاديمية_سرب #برمجة`;
    }
    if (platform === 'linkedin') {
      return `${summary.headline}\n\n${teaserDesc}\n\nنشارككم الليلة الفيديو التوضيحي الكامل بأسلوب بصري مبسّط دون حشو.\nما توقعكم أو أول سؤال يتبادر لذهنكم حول الموضوع؟\n\n—\nأكاديمية سَرب للبرمجة | ${handle}\n#هندسة_البرمجيات #برمجة #أكاديمية_سرب`;
    }
    return `${summary.headline}\n\n${teaserDesc}\n\nترقّبوا الفيديو الكامل الليلة على حسابنا.\nفعّل التنبيهات وكن جزء من السَّرب: ${handle}\n\n#أكاديمية_سرب #سرب #برمجة #فيديو_الليلة #تطوير_البرمجيات`;
  }

  if (platform === 'x') {
    const compactDetails = summary.details.slice(0, 2).join('\n');
    return `${summary.headline}\n\n${compactDetails}\n\nتابع ${handle} لمحتوى برمجي مركّز بلا حشو.\n#سرب #أكاديمية_سرب #برمجة`;
  }

  if (platform === 'linkedin') {
    const body = summary.details.join('\n');
    return `${summary.headline}\n\n${body}\n\nبرأيك، ما أكثر نقطة تواجه المطورين في هذا الموضوع؟ شاركنا في التعليقات.\n\n—\nأكاديمية سَرب للبرمجة | ${handle}\n#هندسة_البرمجيات #برمجة #أكاديمية_سرب #تطوير_البرمجيات`;
  }

  const body = summary.details.join('\n');
  const saveCta =
    mode === 'carousel'
      ? 'احفظ الشرائح للرجوع إليها لاحقًا.'
      : 'احفظ المنشور وشاركه مع صديق مبرمج.';

  return `${summary.headline}\n\n${body}\n\n${saveCta}\nتابعنا وكن جزء من السَّرب: ${handle}\n\n#أكاديمية_سرب #سرب #برمجة #تعلم_البرمجة #تطوير_البرمجيات`;
}

export interface ConvertedVideoPost {
  tplId: string;
  data: Record<string, string>;
  suggestedSeriesTag: string;
}

/**
 * Convert a Video Lesson into either:
 * - 'teaser': Morning teaser post before the full evening video release.
 * - 'summary': Full summary post of the lesson's key concepts/code.
 */
export function lessonToVideoPost(
  lesson: LessonDefinition,
  angle: VideoPostAngle
): ConvertedVideoPost {
  const scenes = lesson.scenes;
  const hookScene = scenes[0];
  const compareScene = scenes.find((s) => s.visualBlueprint?.layoutType === 'split_comparison');
  const codeScene = scenes.find(
    (s) => s.visualBlueprint?.codeLines && s.visualBlueprint.codeLines.length > 0
  );
  const takeawayScene = scenes.find((s) => s.visualBlueprint?.takeaway);

  if (angle === 'teaser') {
    const hookText =
      hookScene?.narration?.trim() ||
      hookScene?.visualBlueprint?.headline ||
      `هل تعرف كيف يعمل *${lesson.shortTitle}* فعليًا؟`;

    const teaserQuote = hookText.includes('*')
      ? hookText
      : hookText.replace(lesson.shortTitle, `*${lesson.shortTitle}*`);

    const subHint =
      takeawayScene?.visualBlueprint?.subheadline ||
      scenes[1]?.visualBlueprint?.subheadline ||
      'الفيديو الكامل يُنشر الليلة بأسلوب بصري مبسّط وبدون حشو.';

    return {
      tplId: 'tip',
      data: {
        quote: teaserQuote,
        body: `${subHint} ترقّبوا الفيديو الليلة على سَرب.`,
        statA: '',
        labelA: '',
        statB: '',
        labelB: '',
      },
      suggestedSeriesTag: '',
    };
  }

  // Summary mode
  if (compareScene?.visualBlueprint) {
    const bp = compareScene.visualBlueprint;
    return {
      tplId: 'compare',
      data: {
        title: `*${lesson.shortTitle}* — مقارنة سريعة`,
        aName: bp.leftTitle || 'المفهوم الأول',
        aQ: bp.sectionKicker || 'الجانب الأول',
        aDesc: (bp.leftItems ?? []).slice(0, 2).join(' · ') || bp.subheadline,
        bName: bp.rightTitle || 'المفهوم الثاني',
        bQ: 'الجانب الثاني',
        bDesc: (bp.rightItems ?? []).slice(0, 2).join(' · ') || bp.headline,
      },
      suggestedSeriesTag: `ملخص درس · ${lesson.shortTitle}`,
    };
  }

  if (codeScene?.visualBlueprint) {
    const bp = codeScene.visualBlueprint;
    return {
      tplId: 'quick',
      data: {
        title: bp.headline || `*${lesson.shortTitle}*`,
        body: bp.subheadline || codeScene.narration,
        lang: 'TypeScript',
        code: (bp.codeLines ?? []).join('\n'),
      },
      suggestedSeriesTag: `ملخص درس · ${lesson.shortTitle}`,
    };
  }

  return {
    tplId: 'steps',
    data: {
      title: `*${lesson.shortTitle}* — الخلاصة`,
      steps: scenes
        .slice(0, 4)
        .map(
          (sc) =>
            `${sc.visualBlueprint?.headline || sc.title} | ${sc.visualBlueprint?.subheadline || sc.narration.slice(0, 72)}`
        )
        .join('\n'),
    },
    suggestedSeriesTag: `ملخص درس · ${lesson.shortTitle}`,
  };
}
