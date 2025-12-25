/**
 * IdeaSidebar - Idea 模块侧边栏分区
 * 
 * 显示按天分组的导航列表
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronRightIcon,
  ChevronDownIcon,
  PlusIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { formatDateDisplay, formatDateKey } from '../utils/ideaUtils';

export default function IdeaSidebar({
  isExpanded,
  onToggleExpand,
  availableDates,
  selectedDate,
  onSelectDate,
  onAddNew,
}) {
  const { t } = useTranslation();

  // 确保至少显示今天
  const displayDates = useMemo(() => {
    const today = formatDateKey(new Date());
    const dates = new Set(availableDates);
    dates.add(today);
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  }, [availableDates]);

  return (
    <div className="mb-2">
      {/* Section Header */}
      <div
        className="flex items-center gap-1 px-3 py-1 text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:bg-[#EFEFED] cursor-pointer group"
        onClick={onToggleExpand}
      >
        {isExpanded ? (
          <ChevronDownIcon className="w-3 h-3" />
        ) : (
          <ChevronRightIcon className="w-3 h-3" />
        )}
        <span>{t('idea.sidebarTitle', '想法 (Ideas)')}</span>
        <button
          className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 hover:text-gray-900"
          onClick={(e) => {
            e.stopPropagation();
            onAddNew?.();
          }}
          title={t('idea.addNew', 'Add new idea')}
        >
          <PlusIcon className="w-3 h-3" />
        </button>
      </div>

      {/* Date List */}
      {isExpanded && (
        <div className="mt-1">
          {displayDates.map((dateKey) => (
            <div
              key={dateKey}
              onClick={() => onSelectDate(dateKey)}
              className={`flex items-center gap-2 mx-2 px-5 py-1.5 text-sm cursor-pointer transition-colors rounded-sm ${
                selectedDate === dateKey
                  ? 'bg-gray-200 text-gray-900 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <CalendarIcon className="w-4 h-4 text-gray-400" />
              <span>{formatDateDisplay(dateKey)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

