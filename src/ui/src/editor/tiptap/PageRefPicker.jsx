/**
 * PageRefPicker - Modal for selecting and inserting page references.
 *
 * Features:
 * - Search documents by query
 * - Browse folder tree
 * - Insert oc://doc/ links
 */

import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';
import * as api from '../../api';
import { IdeaService, LocalStorageAdapter } from '../../services/idea';

/**
 * @param {object} props
 * @param {object} props.docMeta - Current document metadata
 * @param {Function} props.onSelect - Callback when a document is selected
 * @param {Function} props.onSelectIdea - Callback when an idea entry is selected
 * @param {Function} props.onClose - Callback to close the picker
 * @param {Function} props.onToast - Toast notification callback
 */
function PageRefPicker({ docMeta, onSelect, onSelectIdea, onClose, onToast }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState('pages');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [folders, setFolders] = useState([]);
  const [folderOpen, setFolderOpen] = useState(new Set());
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [folderDocs, setFolderDocs] = useState({});
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [ideaThreads, setIdeaThreads] = useState([]);
  const [ideaLoading, setIdeaLoading] = useState(false);
  const listScrollRef = useRef(null);
  const itemRefs = useRef([]);
  const ideaServiceRef = useRef(null);
  if (!ideaServiceRef.current) {
    ideaServiceRef.current = new IdeaService(new LocalStorageAdapter(api));
  }
  const ideaService = ideaServiceRef.current;
  const isIdeaFolder = useCallback((relPath) => {
    if (!relPath) return false;
    return relPath === '.ideas' || relPath.startsWith('.ideas/') || relPath === 'ideas' || relPath.startsWith('ideas/');
  }, []);

  // Load folders on mount
  useEffect(() => {
    const loadFolders = async () => {
      try {
        const result = await api.listFolders({ all: true });
        const filtered = (result || []).filter((f) => !isIdeaFolder(f?.rel_path));
        setFolders(filtered);
        
        // Default expand top-level folders
        const topLevel = filtered
          .map((f) => f.rel_path)
          .filter(Boolean)
          .map((p) => p.split('/')[0]);
        setFolderOpen(new Set(topLevel));
        
        // Default select current document's folder
        const currentDir = docMeta?.rel_path
          ? docMeta.rel_path.split('/').slice(0, -1).join('/')
          : null;
        const safeCurrentDir = currentDir && isIdeaFolder(currentDir) ? null : currentDir;
        setSelectedFolder(safeCurrentDir || topLevel[0] || null);
      } catch (e) {
        onToast?.(t('pageRef.loadFolderFail', 'Failed to load folders'));
      }
    };
    loadFolders();
  }, [docMeta, t, onToast, isIdeaFolder]);

  // Load docs for selected folder
  useEffect(() => {
    if (!selectedFolder) return;
    if (folderDocs[selectedFolder]) return;
    
    const loadDocs = async () => {
      try {
        const docs = await api.listDocs(selectedFolder, false);
        setFolderDocs((prev) => ({ ...prev, [selectedFolder]: docs || [] }));
      } catch {
        // ignore
      }
    };
    loadDocs();
  }, [selectedFolder, folderDocs]);

  // Search documents
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSearchResults([]);
      setSelectedIndex(0);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        if (mode === 'ideas') return;
        const results = await api.searchDocs(q, 50);
        if (cancelled) return;
        setSearchResults(results || []);
        setSelectedIndex(0);
      } catch {
        if (!cancelled) setSearchResults([]);
      }
    }, 120);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, mode]);

  useEffect(() => {
    if (mode === 'ideas') {
      setSelectedIndex(0);
    }
  }, [mode, query]);

  // Load ideas when in ideas mode
  useEffect(() => {
    if (mode !== 'ideas') return;
    let cancelled = false;
    const loadIdeas = async () => {
      setIdeaLoading(true);
      try {
        const threads = await ideaService.getAllThreads();
        if (cancelled) return;
        const normalized = (threads || []).map((thread) => {
          const entries = Array.isArray(thread.entries) ? thread.entries : [];
          const latest = entries[entries.length - 1];
          return {
            ...thread,
            latestAt: latest?.createdAt || thread.updatedAt || thread.createdAt,
          };
        });
        normalized.sort((a, b) => new Date(b.latestAt || 0).getTime() - new Date(a.latestAt || 0).getTime());
        setIdeaThreads(normalized);
      } catch {
        if (!cancelled) setIdeaThreads([]);
        onToast?.(t('pageRef.loadIdeasFail', 'Failed to load ideas'));
      } finally {
        if (!cancelled) setIdeaLoading(false);
      }
    };
    loadIdeas();
    return () => {
      cancelled = true;
    };
  }, [mode, ideaService, onToast, t]);

  // Current list (search results or folder docs)
  const currentList = useMemo(() => {
    if (mode === 'ideas') {
      const q = query.trim().toLowerCase();
      if (!q) return ideaThreads;
      return ideaThreads.filter((thread) => {
        const title = String(thread.title || '').toLowerCase();
        const text = String(thread.entries?.[0]?.content || '').toLowerCase();
        return title.includes(q) || text.includes(q);
      });
    }
    return query.trim()
      ? searchResults
      : (folderDocs[selectedFolder] || []);
  }, [mode, query, searchResults, selectedFolder, folderDocs, ideaThreads]);

  // Scroll selected item into view
  useEffect(() => {
    if (!currentList.length) return;
    const el = itemRefs.current?.[selectedIndex];
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex, currentList.length]);

  // Build folder tree
  const folderTree = useMemo(() => {
    const root = { children: {} };
    folders.forEach((folder) => {
      if (!folder?.rel_path) return;
      const parts = folder.rel_path.split('/');
      let current = root;
      parts.forEach((part, index) => {
        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            path: parts.slice(0, index + 1).join('/'),
            children: {},
          };
        }
        current = current.children[part];
      });
    });

    const toArray = (node) =>
      Object.values(node.children)
        .map((child) => ({ ...child, children: toArray(child) }))
        .sort((a, b) => a.name.localeCompare(b.name));

    return toArray(root);
  }, [folders]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    if (!currentList.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((p) => (p + 1) % currentList.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((p) => (p - 1 + currentList.length) % currentList.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = currentList[selectedIndex];
      if (!item) return;
      if (mode === 'ideas') onSelectIdea?.(item);
      else onSelect(item);
    }
  }, [currentList, selectedIndex, onClose, onSelect, onSelectIdea, mode]);

  // Render folder node recursively
  const renderFolderNode = useCallback((node, depth = 0) => {
    const isOpen = folderOpen.has(node.path);
    const hasChildren = node.children?.length > 0;

    return (
      <div key={node.path}>
        <button
          type="button"
          className={`w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center gap-2 ${
            selectedFolder === node.path
              ? 'bg-gray-200 text-gray-900'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          style={{ paddingLeft: 8 + depth * 12 }}
          onClick={() => {
            setSelectedFolder(node.path);
            if (hasChildren) {
              setFolderOpen((prev) => {
                const next = new Set(prev);
                if (next.has(node.path)) next.delete(node.path);
                else next.add(node.path);
                return next;
              });
            }
          }}
        >
          <span className="text-gray-400 w-4">
            {hasChildren ? (isOpen ? '▾' : '▸') : ''}
          </span>
          <span className="truncate">{node.name}</span>
        </button>
        {hasChildren && isOpen && (
          <div>
            {node.children.map((c) => renderFolderNode(c, depth + 1))}
          </div>
        )}
      </div>
    );
  }, [folderOpen, selectedFolder]);

  return (
    <div className="fixed inset-0 z-[10001] flex items-start justify-center pt-[12vh] px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-[2px]"
        onMouseDown={onClose}
      />
      
      {/* Modal */}
      <div
        className="relative w-full max-w-[760px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-150"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/30 flex items-center">
          <div className="flex items-center gap-1 rounded-full bg-gray-100 p-0.5 text-[11px] text-gray-500">
            <button
              type="button"
              className={`px-2 py-0.5 rounded-full transition-colors ${
                mode === 'pages' ? 'bg-white text-gray-900 shadow-sm' : 'hover:text-gray-700'
              }`}
              onClick={() => { setMode('pages'); setSelectedIndex(0); }}
            >
              {t('pageRef.tabPages', 'Pages')}
            </button>
            <button
              type="button"
              className={`px-2 py-0.5 rounded-full transition-colors ${
                mode === 'ideas' ? 'bg-white text-gray-900 shadow-sm' : 'hover:text-gray-700'
              }`}
              onClick={() => { setMode('ideas'); setSelectedIndex(0); }}
            >
              {t('pageRef.tabIdeas', 'Ideas')}
            </button>
          </div>
          <div className="ml-auto text-[10px] text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
            {t('pageRef.esc', 'ESC to close')}
          </div>
        </div>

        {/* Search input */}
        <div className="px-4 py-3 border-b border-gray-100">
          <input
            className="w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 bg-white border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            placeholder={mode === 'ideas'
              ? t('pageRef.placeholderIdeas', 'Search ideas...')
              : t('pageRef.placeholder', 'Search documents...')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>

        {/* Content */}
        <div className="grid grid-cols-12 min-h-[380px] max-h-[520px]">
          {/* Folder tree / Ideas info */}
          <div className="col-span-4 border-r border-gray-100 overflow-y-auto p-2 bg-white">
            {mode === 'ideas' ? (
              <div className="px-2 py-2 text-xs text-gray-500">
                {t('pageRef.ideaHint', 'Browse or search your ideas')}
              </div>
            ) : (
              <>
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 py-1">
                  {t('pageRef.tree', 'Folders')}
                </div>
                <div className="mt-1">
                  {folderTree.map((n) => renderFolderNode(n, 0))}
                </div>
              </>
            )}
          </div>

          {/* List */}
          <div ref={listScrollRef} className="col-span-8 overflow-y-auto p-2">
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 py-1">
              {mode === 'ideas'
                ? (query.trim() ? t('pageRef.results', 'Search Results') : t('pageRef.ideas', 'Ideas'))
                : query.trim()
                  ? t('pageRef.results', 'Search Results')
                  : selectedFolder
                    ? `${t('pageRef.pages', 'Pages')} · ${selectedFolder}`
                    : t('pageRef.pages', 'Pages')}
            </div>
            <div className="mt-1 space-y-1">
              {currentList.map((item, idx) => {
                if (mode === 'ideas') {
                  const firstEntry = item.entries?.[0];
                  const titleLine = String(firstEntry?.content || '').split('\n')[0].trim();
                  const title = item.title || titleLine || t('idea.untitled', 'Untitled idea');
                  const dateLabel = item.latestAt ? new Date(item.latestAt).toLocaleDateString() : '';
                  const count = Array.isArray(item.entries) ? item.entries.length : 0;
                  return (
                    <button
                      key={`${item.id}-${idx}`}
                      ref={(el) => { itemRefs.current[idx] = el; }}
                      type="button"
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        idx === selectedIndex ? 'bg-gray-100' : 'hover:bg-gray-50'
                      }`}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={() => onSelectIdea?.(item)}
                    >
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {title}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {t('idea.ideas', 'Ideas')} {count ? `· ${count}` : ''} {dateLabel ? `· ${dateLabel}` : ''}
                      </div>
                    </button>
                  );
                }

                const doc = item;
                const docTitle = (doc.rel_path || '')
                  .split('/')
                  .pop()
                  ?.replace(/\.md$/i, '') || doc.name || t('editor.untitled', 'Untitled');

                return (
                  <button
                    key={`${doc.stable_id || doc.rel_path}-${idx}`}
                    ref={(el) => { itemRefs.current[idx] = el; }}
                    type="button"
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      idx === selectedIndex ? 'bg-gray-100' : 'hover:bg-gray-50'
                    }`}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={() => onSelect(doc)}
                  >
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {docTitle}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {doc.rel_path}
                    </div>
                    {doc.description && (
                      <div className="text-xs text-gray-400 truncate mt-0.5">
                        {doc.description}
                      </div>
                    )}
                  </button>
                );
              })}
              {currentList.length === 0 && (
                <div className="px-3 py-6 text-sm text-gray-400">
                  {mode === 'ideas'
                    ? (ideaLoading ? t('pageRef.loadingIdeas', 'Loading ideas...') : t('pageRef.emptyIdeas', 'No ideas found'))
                    : t('pageRef.empty', 'No documents found')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(PageRefPicker);
