/**
 * useFolderCache - 文件夹缓存管理
 * 
 * 职责：
 * 1. 管理文件夹树状态
 * 2. 管理展开的文件夹列表
 * 3. 缓存文件夹下的文档列表
 */

import { useCallback, useEffect, useReducer, useRef } from 'react';
import { collectFolderPaths } from './useDataIntegrity';
import { isNotFoundError } from '../utils/errors';

// ============ 辅助函数 ============

/**
 * 递归过滤隐藏目录（以 . 开头的目录）
 * @param {Array} folders - 文件夹数组
 * @returns {Array} - 过滤后的文件夹数组
 */
function filterHiddenFolders(folders) {
  if (!Array.isArray(folders)) return [];
  
  return folders
    .filter(folder => {
      // 过滤掉以 . 开头的目录
      const name = folder.rel_path?.split('/')[0];
      return name && !name.startsWith('.');
    })
    .map(folder => ({
      ...folder,
      children: folder.children ? filterHiddenFolders(folder.children) : undefined,
    }));
}

// ============ Reducer ============

const initialState = {
  folders: [],
  folderDocs: {},
  expandedFolders: new Set(),
  foldersLoaded: false,
};

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD_FOLDERS_SUCCESS':
      return { ...state, folders: action.folders || [] };
      
    case 'LOAD_FOLDERS_FINISH':
      return { ...state, foldersLoaded: true };
      
    case 'SET_FOLDERS':
      return { ...state, folders: action.folders || [] };
      
    case 'SET_FOLDER_DOCS':
      return { 
        ...state, 
        folderDocs: { ...state.folderDocs, [action.folderPath]: action.docs || [] } 
      };
      
    case 'SET_FOLDER_DOCS_RAW':
      return { ...state, folderDocs: action.folderDocs || {} };
      
    case 'SET_EXPANDED_FOLDERS':
      return { ...state, expandedFolders: action.expandedFolders || new Set() };
      
    case 'REMOVE_STALE_FOLDER': {
      const newExpanded = new Set(state.expandedFolders);
      newExpanded.delete(action.folderPath);
      const newFolderDocs = { ...state.folderDocs };
      delete newFolderDocs[action.folderPath];
      return { ...state, expandedFolders: newExpanded, folderDocs: newFolderDocs };
    }
    
    case 'SYNC_WITH_VALID_PATHS': {
      // 只保留有效路径，移除过时的缓存
      const { validPaths } = action;
      const newExpanded = new Set();
      state.expandedFolders.forEach((p) => {
        if (validPaths.has(p)) newExpanded.add(p);
      });
      const newFolderDocs = {};
      Object.keys(state.folderDocs).forEach((p) => {
        if (validPaths.has(p)) newFolderDocs[p] = state.folderDocs[p];
      });
      return { ...state, expandedFolders: newExpanded, folderDocs: newFolderDocs };
    }
    
    default:
      return state;
  }
}

// ============ Hook ============

export function useFolderCache({ api, onError }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // ---- 同步缓存与有效路径 ----
  const syncWithValidPaths = useCallback((validPaths) => {
    dispatch({ type: 'SYNC_WITH_VALID_PATHS', validPaths });
  }, []);

  // ---- 初始化：加载文件夹列表 ----
  useEffect(() => {
    (async () => {
      try {
        const allFolders = await api.listFolders({ all: true });
        // 过滤掉隐藏目录（如 .ideas），用户不可见
        const folders = filterHiddenFolders(allFolders);
        dispatch({ type: 'LOAD_FOLDERS_SUCCESS', folders });
        
        // 同步缓存，移除已删除的文件夹
        const validPaths = collectFolderPaths(folders);
        syncWithValidPaths(validPaths);
      } catch (err) {
        // 完全失败时清空所有缓存
        syncWithValidPaths(new Set());
        onError?.(err);
      } finally {
        dispatch({ type: 'LOAD_FOLDERS_FINISH' });
      }
    })();
  }, [api, onError, syncWithValidPaths]);

  // ---- Setters ----
  const setFolders = useCallback((valueOrUpdater) => {
    const prev = stateRef.current.folders;
    const next = typeof valueOrUpdater === 'function' ? valueOrUpdater(prev) : valueOrUpdater;
    dispatch({ type: 'SET_FOLDERS', folders: next });
  }, []);

  const setFolderDocs = useCallback((valueOrUpdater) => {
    const prev = stateRef.current.folderDocs;
    const next = typeof valueOrUpdater === 'function' ? valueOrUpdater(prev) : valueOrUpdater;
    dispatch({ type: 'SET_FOLDER_DOCS_RAW', folderDocs: next });
  }, []);

  const setExpandedFolders = useCallback((valueOrUpdater) => {
    const prev = stateRef.current.expandedFolders;
    const next = typeof valueOrUpdater === 'function' ? valueOrUpdater(prev) : valueOrUpdater;
    dispatch({ type: 'SET_EXPANDED_FOLDERS', expandedFolders: next });
  }, []);

  // ---- 刷新单个文件夹 ----
  const refreshFolder = useCallback(
    async (folderPath) => {
      try {
        const docs = await api.listDocs(folderPath);
        dispatch({ type: 'SET_FOLDER_DOCS', folderPath, docs });
      } catch (err) {
        if (isNotFoundError(err)) {
          dispatch({ type: 'REMOVE_STALE_FOLDER', folderPath });
        }
        // 静默处理，不抛出错误
      }
    },
    [api],
  );

  // ---- 切换文件夹展开状态 ----
  const toggleFolder = useCallback(
    async (folderPath) => {
      const isExpanded = stateRef.current.expandedFolders.has(folderPath);
      const next = new Set(stateRef.current.expandedFolders);
      
      if (isExpanded) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      dispatch({ type: 'SET_EXPANDED_FOLDERS', expandedFolders: next });

      // 展开时加载文件夹内容
      if (!isExpanded && !stateRef.current.folderDocs[folderPath]) {
        await refreshFolder(folderPath);
      }
    },
    [refreshFolder],
  );

  // ---- 刷新侧边栏所有已展开的文件夹 ----
  const refreshSidebarAll = useCallback(async () => {
    try {
      const allFolders = await api.listFolders({ all: true });
      const folders = filterHiddenFolders(allFolders);
      dispatch({ type: 'SET_FOLDERS', folders });
      
      const validPaths = collectFolderPaths(folders);
      syncWithValidPaths(validPaths);

      // 只刷新仍然有效的已展开文件夹
      const expandedAfterSync = new Set();
      stateRef.current.expandedFolders.forEach((p) => {
        if (validPaths.has(p)) expandedAfterSync.add(p);
      });
      
      for (const p of expandedAfterSync) {
        await refreshFolder(p);
      }
    } catch (err) {
      onError?.(err);
    }
  }, [api, onError, refreshFolder, syncWithValidPaths]);

  // ---- 刷新指定 space 下的文件夹 ----
  const refreshSidebarForSpace = useCallback(
    async (space) => {
      if (!space) return;
      
      try {
        const allFolders = await api.listFolders({ all: true });
        const folders = filterHiddenFolders(allFolders);
        dispatch({ type: 'SET_FOLDERS', folders });
        
        const validPaths = collectFolderPaths(folders);
        syncWithValidPaths(validPaths);

        // 只刷新属于该 space 且仍然有效的文件夹
        const targets = new Set();
        if (validPaths.has(space)) targets.add(space);
        
        stateRef.current.expandedFolders.forEach((p) => {
          if (validPaths.has(p) && (p === space || String(p).startsWith(`${space}/`))) {
            targets.add(p);
          }
        });
        
        for (const p of targets) {
          await refreshFolder(p);
        }
      } catch (err) {
        onError?.(err);
      }
    },
    [api, onError, refreshFolder, syncWithValidPaths],
  );

  return {
    // State
    folders: state.folders,
    folderDocs: state.folderDocs,
    expandedFolders: state.expandedFolders,
    foldersLoaded: state.foldersLoaded,
    // Setters
    setFolders,
    setFolderDocs,
    setExpandedFolders,
    // Actions
    refreshFolder,
    toggleFolder,
    refreshSidebarAll,
    refreshSidebarForSpace,
    syncWithValidPaths,
  };
}
