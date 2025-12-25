/**
 * useIdeaLoader - Idea 模块数据加载管理
 * 
 * 职责：
 * 1. 管理 Idea 数据状态
 * 2. 提供 CRUD 操作
 * 3. 数据聚合（按日期分组等）
 * 
 * 架构：
 * - 使用 IdeaService 处理业务逻辑
 * - 通过 StorageAdapter 支持多种存储后端
 * - 当前使用 LocalStorageAdapter（本地文件存储）
 */

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { IdeaService, LocalStorageAdapter } from '../services/idea';

// ============ 工具函数 ============

function formatDateKey(dateInput) {
  if (!dateInput) {
    // 如果没有日期，使用今天
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  
  // 检查是否是有效日期
  if (isNaN(d.getTime())) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ============ Reducer ============

const initialState = {
  threads: [],
  isLoading: false,
  error: null,
  selectedDate: formatDateKey(new Date()),
};

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, isLoading: true, error: null };
    case 'LOAD_SUCCESS':
      return { ...state, threads: action.threads, isLoading: false };
    case 'LOAD_ERROR':
      return { ...state, error: action.error, isLoading: false };
    case 'SET_SELECTED_DATE':
      return { ...state, selectedDate: action.date };
    case 'UPDATE_THREAD':
      return {
        ...state,
        threads: state.threads.map((t) =>
          t.id === action.threadId ? { ...t, ...action.updates } : t
        ),
      };
    case 'ADD_THREAD':
      return { ...state, threads: [action.thread, ...state.threads] };
    case 'REMOVE_THREAD':
      return {
        ...state,
        threads: state.threads.filter((t) => t.id !== action.threadId),
      };
    default:
      return state;
  }
}

// ============ Hook ============

export function useIdeaLoader({ api }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const loadingRef = useRef(false);
  
  // 创建 Service 实例（使用 LocalStorageAdapter）
  const serviceRef = useRef(null);
  if (!serviceRef.current) {
    const adapter = new LocalStorageAdapter(api);
    serviceRef.current = new IdeaService(adapter);
  }
  const service = serviceRef.current;

  // ---- 加载所有 Threads ----
  const loadThreads = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    dispatch({ type: 'LOAD_START' });

    try {
      const threads = await service.getAllThreads();
      dispatch({ type: 'LOAD_SUCCESS', threads });
    } catch (err) {
      dispatch({ type: 'LOAD_ERROR', error: err.message });
    } finally {
      loadingRef.current = false;
    }
  }, [service]);

  // ---- 初始加载 ----
  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  // ---- 设置选中日期 ----
  const setSelectedDate = useCallback((date) => {
    dispatch({ type: 'SET_SELECTED_DATE', date });
  }, []);

  // ---- 按天分组的数据 ----
  const threadsByDate = useMemo(() => {
    const groups = new Map();
    state.threads.forEach(thread => {
      const date = thread._date || formatDateKey(thread.createdAt);
      if (!groups.has(date)) {
        groups.set(date, []);
      }
      groups.get(date).push(thread);
    });
    return groups;
  }, [state.threads]);

  // ---- 获取可用的日期列表 ----
  const availableDates = useMemo(() => {
    return Array.from(threadsByDate.keys()).sort().reverse();
  }, [threadsByDate]);

  // ---- 获取当前日期的 entries ----
  const currentDayEntries = useMemo(() => {
    const threads = threadsByDate.get(state.selectedDate) || [];
    const entries = [];

    threads.forEach(thread => {
      thread.entries.forEach((entry, index) => {
        entries.push({
          ...entry,
          text: entry.content, // 兼容旧字段名
          threadId: thread.id,
          threadTitle: thread.title,
          isFirstInThread: index === 0,
          isLastInThread: index === thread.entries.length - 1,
          type: entry.isAI ? 'ai' : 'user',
        });
      });
    });

    return entries.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [state.threads, state.selectedDate, threadsByDate]);

  // ---- 获取所有 entries，按日期分组 ----
  // 设计：同一个 thread 内的 entries 按创建时间正序显示，thread 之间按最新活跃时间倒序
  const allEntriesGrouped = useMemo(() => {
    const today = formatDateKey(new Date());
    const yesterday = formatDateKey(new Date(Date.now() - 86400000));

    // Step 1: 计算每个 thread 的最新 entry 时间（用于排序）
    const threadsWithLatestTime = state.threads.map(thread => {
      const latestEntry = thread.entries[thread.entries.length - 1];
      return {
        ...thread,
        latestTime: latestEntry?.createdAt ? new Date(latestEntry.createdAt).getTime() : 0,
      };
    });

    // Step 2: 按最新活跃时间倒序排列 threads
    const sortedThreads = [...threadsWithLatestTime].sort((a, b) => b.latestTime - a.latestTime);

    // Step 3: 按日期分组（使用 thread 的第一个 entry 的日期）
    const entriesByDate = new Map();

    sortedThreads.forEach(thread => {
      // 获取这个 thread 的日期（基于第一个 entry）
      const firstEntry = thread.entries[0];
      const date = firstEntry?.createdAt ? formatDateKey(firstEntry.createdAt) : formatDateKey(new Date());
      
      if (!entriesByDate.has(date)) {
        entriesByDate.set(date, []);
      }

      // Thread 内的 entries 保持原始顺序（创建时间正序）
      thread.entries.forEach((entry, index) => {
        entriesByDate.get(date).push({
          ...entry,
          text: entry.content, // 兼容旧字段名
          threadId: thread.id,
          threadTitle: thread.title,
          isFirstInThread: index === 0,
          isLastInThread: index === thread.entries.length - 1,
          type: entry.isAI ? 'ai' : 'user',
        });
      });
    });

    // 转换为数组并按日期倒序
    return Array.from(entriesByDate.entries())
      .map(([date, entries]) => ({
        date,
        relativeDate: date === today ? 'today' : date === yesterday ? 'yesterday' : date,
        entries, // 保持已排好的顺序
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [state.threads]);

  // ---- 添加新想法（创建新 Thread）----
  const addEntry = useCallback(
    async (text, options = {}) => {
      const today = formatDateKey(new Date());

      try {
        const thread = await service.createIdea(text.trim(), {
          title: options.title,
          isAI: options.isAI,
          images: options.images || [],
        });

        // 更新本地状态
        dispatch({ type: 'ADD_THREAD', thread });

        // 确保选中今天
        if (state.selectedDate !== today) {
          setSelectedDate(today);
        }

        return { 
          entryId: thread.entries[0]?.id, 
          threadPath: thread.id,
        };
      } catch (err) {
        console.error('Failed to create idea:', err);
        throw err;
      }
    },
    [service, state.selectedDate, setSelectedDate]
  );

  // ---- 在指定 Thread 中继续添加 Entry ----
  const continueThread = useCallback(
    async (threadId, text, options = {}) => {
      try {
        const newEntry = await service.continueThread(threadId, text.trim(), {
          isAI: options.isAI,
          images: options.images || [],
        });

        // 更新本地状态
        const thread = state.threads.find(t => t.id === threadId);
        if (thread) {
          dispatch({
            type: 'UPDATE_THREAD',
            threadId,
            updates: { 
              entries: [...thread.entries, { ...newEntry, content: newEntry.content }],
            },
          });
        }

        return { entryId: newEntry.id };
      } catch (err) {
        console.error('Failed to continue thread:', err);
        throw err;
      }
    },
    [service, state.threads]
  );

  // ---- 添加 AI 反思回复到 Thread ----
  const addAIReflection = useCallback(
    async (threadId, text) => {
      return continueThread(threadId, text, { isAI: true });
    },
    [continueThread]
  );

  // ---- 删除 Thread ----
  const deleteThread = useCallback(
    async (threadId) => {
      try {
        await service.deleteThread(threadId);
        // 重新加载数据
        await loadThreads();
      } catch (err) {
        console.error('Failed to delete thread:', err);
        throw err;
      }
    },
    [service, loadThreads]
  );

  // ---- 删除 Entry ----
  const deleteEntry = useCallback(
    async (entryId, threadId) => {
      try {
        await service.deleteEntry(entryId);

        if (!threadId) {
          await loadThreads();
          return;
        }

        const thread = state.threads.find((t) => t.id === threadId);
        if (!thread) {
          await loadThreads();
          return;
        }

        const updatedEntries = thread.entries.filter((entry) => entry.id !== entryId);
        if (updatedEntries.length === 0) {
          dispatch({ type: 'REMOVE_THREAD', threadId });
        } else {
          dispatch({
            type: 'UPDATE_THREAD',
            threadId,
            updates: { entries: updatedEntries },
          });
        }
      } catch (err) {
        console.error('Failed to delete entry:', err);
        throw err;
      }
    },
    [service, loadThreads, state.threads]
  );

  // ---- 刷新数据 ----
  const refresh = useCallback(() => {
    loadThreads();
  }, [loadThreads]);

  // ---- 获取存储类型 ----
  const storageType = useMemo(() => {
    return service.getStorageType();
  }, [service]);

  return {
    // State
    threads: state.threads,
    isLoading: state.isLoading,
    error: state.error,
    selectedDate: state.selectedDate,
    // Derived
    threadsByDate,
    availableDates,
    currentDayEntries,
    allEntriesGrouped,
    // Actions
    setSelectedDate,
    addEntry,
    continueThread,
    addAIReflection,
    deleteEntry,
    deleteThread,
    refresh,
    // Service Info
    storageType,
    service, // 暴露 service 实例，方便未来扩展
  };
}
