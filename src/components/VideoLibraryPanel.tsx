import React, { useMemo, useState } from 'react';
import {
  Check,
  FolderOpen,
  Layers,
  LayoutGrid,
  Play,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import {
  computeSchedule,
  formatTimecode,
  groupLessonsByCategory,
  LESSON_CATEGORY_SUGGESTIONS,
  type LessonDefinition,
  type LessonId,
} from '../data/lessonStoryboard';

interface VideoLibraryPanelProps {
  lessons: LessonDefinition[];
  activeLessonId: LessonId;
  hasDeletedBuiltIns: boolean;
  isExporting: boolean;
  onSelectLesson: (lessonId: LessonId) => void;
  onDeleteLesson: (lessonId: LessonId) => void;
  onChangeLessonCategory: (lessonId: LessonId, nextCategory: string) => void;
  onRestoreBuiltIns: () => void;
  onOpenCreator: () => void;
  onConvertToPost?: (lesson: LessonDefinition) => void;
}

export const VideoLibraryPanel: React.FC<VideoLibraryPanelProps> = ({
  lessons,
  activeLessonId,
  hasDeletedBuiltIns,
  isExporting,
  onSelectLesson,
  onDeleteLesson,
  onChangeLessonCategory,
  onRestoreBuiltIns,
  onOpenCreator,
  onConvertToPost,
}) => {
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('ALL');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  const sections = useMemo(() => groupLessonsByCategory(lessons), [lessons]);

  const visibleSections = useMemo(() => {
    if (selectedSectionFilter === 'ALL') return sections;
    const filtered = sections.filter((sec) => sec.category === selectedSectionFilter);
    return filtered.length > 0 ? filtered : sections;
  }, [sections, selectedSectionFilter]);

  const allCategoryChoices = useMemo(
    () =>
      Array.from(
        new Set([...sections.map((s) => s.category), ...LESSON_CATEGORY_SUGGESTIONS])
      ),
    [sections]
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Header & Top Actions */}
      <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#D4FF00]" />
            <h2 className="text-base font-bold text-[#FFFFFF]">
              مكتبة الفيديوهات المقسمة ({lessons.length})
            </h2>
          </div>
          <p className="text-xs text-[#8A8A8A] mt-0.5">
            جميع الفيديوهات السابقة والجديدة محفوظة ومقسّمة في أقسام، مع إمكانية حذف أي فيديو لا تريده
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasDeletedBuiltIns && (
            <button
              type="button"
              disabled={isExporting}
              onClick={onRestoreBuiltIns}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#242424] border border-[#2A2A2A] text-xs font-medium text-[#E6E6E6] hover:text-[#D4FF00] hover:border-[#D4FF00] transition-colors cursor-pointer disabled:opacity-40"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>استعادة الأساسية</span>
            </button>
          )}

          <button
            type="button"
            disabled={isExporting}
            onClick={onOpenCreator}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#D4FF00] text-[#101010] text-xs font-bold hover:bg-[#E5FF66] transition-colors cursor-pointer disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>فيديو جديد من سكريبت</span>
          </button>
        </div>
      </div>

      {/* Section Filter Pills */}
      {sections.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedSectionFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              selectedSectionFilter === 'ALL'
                ? 'bg-[#D4FF00] text-[#101010] border-[#D4FF00]'
                : 'bg-[#1C1C1C] text-[#E6E6E6] border-[#2A2A2A] hover:border-[#3A3A3A]'
            }`}
          >
            جميع الأقسام ({lessons.length})
          </button>

          {sections.map((sec) => {
            const isSelected = selectedSectionFilter === sec.category;
            return (
              <button
                key={sec.category}
                type="button"
                onClick={() => setSelectedSectionFilter(sec.category)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#A78BFA] text-[#101010] border-[#A78BFA]'
                    : 'bg-[#1C1C1C] text-[#E6E6E6] border-[#2A2A2A] hover:border-[#3A3A3A]'
                }`}
              >
                {sec.category} ({sec.lessons.length})
              </button>
            );
          })}
        </div>
      )}

      {/* Divided Sections List */}
      {visibleSections.length === 0 ? (
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-8 text-center flex flex-col items-center gap-3">
          <p className="text-sm text-[#E6E6E6]">لا توجد فيديوهات في المكتبة حالياً.</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={onOpenCreator}
              className="px-4 py-2 rounded-lg bg-[#D4FF00] text-[#101010] text-xs font-bold cursor-pointer"
            >
              إنشاء فيديو من سكريبت
            </button>
            {hasDeletedBuiltIns && (
              <button
                type="button"
                onClick={onRestoreBuiltIns}
                className="px-4 py-2 rounded-lg bg-[#242424] text-[#FFFFFF] border border-[#2A2A2A] text-xs font-semibold cursor-pointer"
              >
                استعادة الفيديوهات الأساسية
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {visibleSections.map((section) => (
            <div
              key={section.category}
              className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl overflow-hidden"
            >
              {/* Section Header */}
              <div className="px-4 py-3 bg-[#171717] border-b border-[#2A2A2A] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-[#A78BFA]" />
                  <h3 className="text-sm font-bold text-[#FFFFFF]">
                    {section.category}
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-[#A78BFA] bg-[#101010] border border-[#2A2A2A] px-2.5 py-0.5 rounded-md">
                  {section.lessons.length} {section.lessons.length === 1 ? 'فيديو' : 'فيديوهات'}
                </span>
              </div>

              {/* Lessons inside Section */}
              <div className="divide-y divide-[#2A2A2A]">
                {section.lessons.map((lesson) => {
                  const isActive = lesson.id === activeLessonId;
                  const isConfirmingDelete = confirmDeleteId === lesson.id;
                  const isEditingCategory = editingCatId === lesson.id;
                  const { totalDurationMs } = computeSchedule(lesson.scenes);

                  return (
                    <div
                      key={lesson.id}
                      className={`p-4 flex flex-col gap-3 transition-colors ${
                        isActive ? 'bg-[#242424]/80' : 'hover:bg-[#242424]/40'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 text-[11px] mb-1">
                            <span
                              className={`px-2 py-0.5 rounded font-semibold ${
                                lesson.isBuiltIn
                                  ? 'bg-[#242424] text-[#E6E6E6] border border-[#3A3A3A]'
                                  : 'bg-[#A78BFA]/20 text-[#A78BFA] border border-[#A78BFA]/40'
                              }`}
                            >
                              {lesson.isBuiltIn ? 'درس أساسي' : 'مولّد من سكريبت'}
                            </span>
                            <span dir="ltr" className="font-mono text-[#8A8A8A] tabular-nums">
                              {lesson.scenes.length} مشاهد · {formatTimecode(totalDurationMs)}
                            </span>
                            {isActive && (
                              <span className="flex items-center gap-1 text-[#D4FF00] font-semibold">
                                <Check className="w-3 h-3" />
                                <span>معروض الآن</span>
                              </span>
                            )}
                          </div>

                          <h4 className="text-sm font-bold text-[#FFFFFF] leading-snug">
                            {lesson.title}
                          </h4>
                          <p className="text-xs text-[#8A8A8A] mt-0.5 truncate">
                            {lesson.badgeLabel}
                          </p>
                        </div>

                        {/* Actions: Preview / Move Section / Delete */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {!isActive && (
                            <button
                              type="button"
                              disabled={isExporting}
                              onClick={() => onSelectLesson(lesson.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4FF00] text-[#101010] text-xs font-bold hover:bg-[#E5FF66] transition-colors cursor-pointer disabled:opacity-40"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>فتح ومعاينة</span>
                            </button>
                          )}

                          {onConvertToPost && (
                            <button
                              type="button"
                              disabled={isExporting}
                              onClick={() => onConvertToPost(lesson)}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#101010] border border-[#2A2A2A] text-xs text-[#E6E6E6] hover:border-[#D4FF00] hover:text-[#D4FF00] transition-colors cursor-pointer disabled:opacity-40"
                            >
                              <LayoutGrid className="w-3.5 h-3.5" />
                              <span>تحويل لبوست</span>
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={isExporting}
                            onClick={() =>
                              setEditingCatId(isEditingCategory ? null : lesson.id)
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-[#101010] border border-[#2A2A2A] text-xs text-[#E6E6E6] hover:border-[#A78BFA] hover:text-[#A78BFA] transition-colors cursor-pointer disabled:opacity-40"
                          >
                            نقل لقسم
                          </button>

                          {!isConfirmingDelete ? (
                            <button
                              type="button"
                              disabled={isExporting}
                              onClick={() => setConfirmDeleteId(lesson.id)}
                              title="حذف الفيديو"
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#101010] border border-[#2A2A2A] text-xs text-[#8A8A8A] hover:text-[#FF5C5C] hover:border-[#FF5C5C]/50 transition-colors cursor-pointer disabled:opacity-40"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>حذف</span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5 bg-[#101010] border border-[#FF5C5C]/60 rounded-lg p-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmDeleteId(null);
                                  onDeleteLesson(lesson.id);
                                }}
                                className="px-2.5 py-1 rounded bg-[#FF5C5C] text-[#FFFFFF] text-[11px] font-bold cursor-pointer"
                              >
                                تأكيد الحذف
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 rounded text-[11px] text-[#E6E6E6] hover:text-[#FFFFFF] cursor-pointer"
                              >
                                إلغاء
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {isEditingCategory && (
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#2A2A2A]">
                          <span className="text-[11px] text-[#8A8A8A]">نقل إلى قسم:</span>
                          <select
                            value={lesson.category}
                            onChange={(e) => {
                              onChangeLessonCategory(lesson.id, e.target.value);
                              setEditingCatId(null);
                            }}
                            className="bg-[#101010] border border-[#2A2A2A] rounded-lg px-2.5 py-1 text-xs text-[#FFFFFF]"
                          >
                            {allCategoryChoices.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
