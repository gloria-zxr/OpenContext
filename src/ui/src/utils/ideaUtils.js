/**
 * Idea 模块工具函数
 * 
 * 数据格式：
 * - 一个 Thread = 一个 Markdown 文档
 * - Entry 使用隐藏标记：[//]: # (idea:id=<uuid> created_at=<ISO8601>)
 * - Entry 内容紧跟在标记之后
 */

import i18n from '../i18n';

// ============ 常量 ============

// 使用隐藏目录存储想法，用户无法直接访问
export const IDEAS_ROOT = '.ideas';

// Entry marker 正则：[//]: # (idea:id=xxx created_at=xxx [is_ai=true])
const ENTRY_MARKER_REGEX = /^\[\/\/\]: # \(idea:id=([a-f0-9-]+) created_at=([^\s)]+)(?:\s+is_ai=(\w+))?\)\s*$/;

// ============ ID 生成 ============

export function generateEntryId() {
  // 简化版 UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============ Entry Marker 生成/解析 ============

export function createEntryMarker(id, createdAt, isAI = false) {
  const base = `[//]: # (idea:id=${id} created_at=${createdAt}`;
  return isAI ? `${base} is_ai=true)` : `${base})`;
}

export function parseEntryMarker(line) {
  const match = line.match(ENTRY_MARKER_REGEX);
  if (!match) return null;
  return {
    id: match[1],
    createdAt: match[2],
    isAI: match[3] === 'true',
  };
}

// ============ 文档解析 ============

/**
 * 解析 Thread 文档，提取所有 entries
 * @param {string} content - Markdown 文档内容
 * @returns {Array<{id: string, createdAt: string, text: string}>}
 */
export function parseThreadDocument(content) {
  if (!content) return [];
  
  const lines = content.split('\n');
  const entries = [];
  let currentEntry = null;
  let contentLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const marker = parseEntryMarker(line);

    if (marker) {
      // 保存上一个 entry
      if (currentEntry) {
        currentEntry.text = contentLines.join('\n').trim();
        entries.push(currentEntry);
      }
      // 开始新 entry
      currentEntry = {
        id: marker.id,
        createdAt: marker.createdAt,
        text: '',
        isAI: marker.isAI || false,
      };
      contentLines = [];
    } else if (currentEntry) {
      contentLines.push(line);
    }
  }

  // 保存最后一个 entry
  if (currentEntry) {
    currentEntry.text = contentLines.join('\n').trim();
    entries.push(currentEntry);
  }

  return entries;
}

/**
 * 将 entries 序列化为 Markdown 文档
 * @param {Array<{id: string, createdAt: string, text: string}>} entries
 * @returns {string}
 */
export function serializeThreadDocument(entries) {
  if (!entries || entries.length === 0) return '';
  
  return entries
    .map((entry) => {
      const marker = createEntryMarker(entry.id, entry.createdAt, entry.isAI);
      return `${marker}\n${entry.text}`;
    })
    .join('\n\n');
}

// ============ 日期工具 ============

function getLocale() {
  return i18n?.resolvedLanguage || i18n?.language || 'en';
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat(getLocale(), { month: 'short', day: 'numeric' }).format(date);
}

export function formatDateKey(date) {
  // 返回 YYYY-MM-DD 格式
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

export function formatDateDisplay(dateKey) {
  // 处理无效日期
  if (!dateKey || dateKey.includes('NaN')) {
    return i18n.t('time.today', 'Today'); // 默认显示今天
  }
  
  const today = formatDateKey(new Date());
  const yesterday = formatDateKey(new Date(Date.now() - 86400000));
  
  if (dateKey === today) return i18n.t('time.today', 'Today');
  if (dateKey === yesterday) return i18n.t('time.yesterday', 'Yesterday');
  
  const d = new Date(dateKey);
  if (isNaN(d.getTime())) {
    return i18n.t('time.today', 'Today'); // 无效日期默认显示今天
  }
  
  return formatShortDate(d);
}

export function formatRelativeTime(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return i18n.t('time.justNow', 'Just now');
  if (diffMins < 60) return i18n.t('time.minutesAgo', { count: diffMins });
  if (diffHours < 24) return i18n.t('time.hoursAgo', { count: diffHours });
  return formatShortDate(date);
}

// ============ Thread 文件路径 ============

/**
 * 生成 Thread 文档路径
 * 格式：ideas/YYYY/MM/YYYY-MM-DD-<slug>.md
 */
export function generateThreadPath(title, date = new Date()) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const datePrefix = `${year}-${month}-${day}`;
  
  // 生成 slug
  const slug = title
    ? title
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 30) || 'thread'
    : 'thread';
  
  const timestamp = Date.now().toString(36);
  
  return `${IDEAS_ROOT}/${year}/${month}/${datePrefix}-${slug}-${timestamp}.md`;
}

/**
 * 从文档路径提取日期
 */
export function extractDateFromPath(relPath) {
  // 尝试匹配 YYYY-MM-DD 格式
  const match = relPath.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  return null;
}

/**
 * 从文档路径提取标题
 */
export function extractTitleFromPath(relPath) {
  const filename = relPath.split('/').pop() || '';
  // 移除 .md 后缀和日期前缀
  const withoutExt = filename.replace(/\.md$/, '');
  const withoutDate = withoutExt.replace(/^\d{4}-\d{2}-\d{2}-/, '');
  // 移除时间戳后缀
  const withoutTimestamp = withoutDate.replace(/-[a-z0-9]+$/, '');
  return withoutTimestamp || 'Untitled';
}

// ============ 按天分组 ============

/**
 * 将 threads 按天分组
 * @param {Array<{rel_path: string, entries: Array}>} threads
 * @returns {Map<string, Array>} dateKey -> threads
 */
export function groupThreadsByDate(threads) {
  const map = new Map();
  
  threads.forEach((thread) => {
    const dateKey = extractDateFromPath(thread.rel_path) || formatDateKey(new Date());
    if (!map.has(dateKey)) {
      map.set(dateKey, []);
    }
    map.get(dateKey).push(thread);
  });
  
  // 按日期降序排列
  return new Map([...map.entries()].sort((a, b) => b[0].localeCompare(a[0])));
}

/**
 * 获取某天的所有 entries（按 Thread 分组，保持续写顺序）
 * 
 * 返回结构：
 * - Thread 之间：按第一条 entry 时间倒序（新 Thread 在上）
 * - Thread 内部：按时间正序（第一条在上，续写在下）
 */
export function getDayEntries(threads, dateKey) {
  const dayThreads = threads.filter((t) => extractDateFromPath(t.rel_path) === dateKey);
  
  // 为每个 Thread 添加元数据，并按正序排列 entries
  const threadsWithMeta = dayThreads.map((t) => {
    const entries = (t.entries || []).map((e) => ({
      ...e,
      threadId: t.rel_path,
      threadTitle: t.title || extractTitleFromPath(t.rel_path),
      type: e.isAI ? 'ai' : 'user', // 设置 entry 类型
    }));
    // Thread 内部按时间正序（第一条在上，续写在下）
    entries.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    const firstEntryTime = entries[0]?.createdAt || new Date(0).toISOString();
    return { entries, firstEntryTime };
  });
  
  // Thread 之间按第一条 entry 时间倒序（新 Thread 在上）
  threadsWithMeta.sort((a, b) => new Date(b.firstEntryTime) - new Date(a.firstEntryTime));
  
  // 扁平化返回，但保持 Thread 内部的顺序
  // 为了在 UI 中区分不同 Thread，给每个 entry 添加 isFirstInThread 标记
  const result = [];
  threadsWithMeta.forEach(({ entries }) => {
    entries.forEach((entry, index) => {
      result.push({
        ...entry,
        isFirstInThread: index === 0,
        isLastInThread: index === entries.length - 1,
      });
    });
  });
  
  return result;
}

/**
 * 获取所有 entries，按日期分组
 * 
 * 返回结构：
 * [
 *   { dateKey: '2024-01-15', entries: [...] },
 *   { dateKey: '2024-01-14', entries: [...] },
 *   ...
 * ]
 * 日期按降序排列（最新在前），每个日期内的 entries 按 getDayEntries 规则排列
 */
export function getAllEntriesGroupedByDate(threads) {
  // 获取所有日期
  const dateKeys = new Set();
  threads.forEach((t) => {
    const dateKey = extractDateFromPath(t.rel_path);
    if (dateKey) {
      dateKeys.add(dateKey);
    }
  });
  
  // 按日期降序排列
  const sortedDates = Array.from(dateKeys).sort((a, b) => b.localeCompare(a));
  
  // 为每个日期获取 entries
  return sortedDates.map((dateKey) => ({
    dateKey,
    entries: getDayEntries(threads, dateKey),
  }));
}
