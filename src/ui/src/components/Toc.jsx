import { useTranslation } from 'react-i18next';

export function Toc({
  toc,
  isOpen,
  activeId,
  onToggle,
  onSelectHeading,
  showToggle = true,
  showPanel = true,
}) {
  const { t } = useTranslation();

  if (!toc || toc.length === 0) return null;

  return (
    <>
      {showToggle && (
        <button
          type="button"
          onClick={onToggle}
          className={`text-sm text-gray-500 hover:text-gray-900 ${isOpen ? 'text-gray-900' : ''}`}
        >
          {isOpen ? t('toc.hide') : t('toc.show')}
        </button>
      )}

      {showPanel && isOpen && (
        <aside className="w-64 hidden lg:block overflow-y-auto py-8 pr-8 pl-4 sticky top-0 h-full border-l border-gray-100/50">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 pl-3">
            {t('toc.title')}
          </div>
          <ul className="space-y-0.5 relative">
            {toc.map((heading, i) => {
              const isActive = heading.id === activeId;
              return (
                // eslint-disable-next-line react/no-array-index-key
                <li key={i} className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      onSelectHeading?.(heading);
                    }}
                    className={`
                      block w-full text-left text-sm py-1.5 pr-2 rounded-md transition-colors duration-150
                      ${
                        isActive
                          ? 'text-gray-900 font-medium bg-gray-100'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                      }
                    `}
                    style={{ paddingLeft: `${(heading.level - 1) * 12 + 12}px` }}
                  >
                    {heading.text}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
      )}
    </>
  );
}
