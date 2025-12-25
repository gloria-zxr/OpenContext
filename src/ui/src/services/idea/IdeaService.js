/**
 * IdeaService - Idea 业务逻辑层
 * 
 * 职责：
 * 1. 封装业务逻辑（创建、更新、删除等操作）
 * 2. 数据转换和聚合（按日期分组等）
 * 3. 与存储层解耦，支持不同的存储适配器
 */

/**
 * @typedef {import('./types').Thread} Thread
 * @typedef {import('./types').Entry} Entry
 * @typedef {import('./IdeaStorageAdapter').IdeaStorageAdapter} IdeaStorageAdapter
 */

// ============ 工具函数 ============

function formatDateKey(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getRelativeDate(dateKey) {
  const today = formatDateKey(new Date());
  const yesterday = formatDateKey(new Date(Date.now() - 86400000));
  
  if (dateKey === today) return 'today';
  if (dateKey === yesterday) return 'yesterday';
  return dateKey;
}

// ============ IdeaService ============

export class IdeaService {
  /**
   * @param {IdeaStorageAdapter} adapter - 存储适配器
   */
  constructor(adapter) {
    this.adapter = adapter;
  }

  /**
   * 获取当前存储类型
   * @returns {string}
   */
  getStorageType() {
    return this.adapter.getType();
  }

  /**
   * 获取所有 Threads
   * @returns {Promise<Thread[]>}
   */
  async getAllThreads() {
    return this.adapter.listThreads();
  }

  /**
   * 按日期获取 Threads
   * @param {string} date - 日期 (YYYY-MM-DD)
   * @returns {Promise<Thread[]>}
   */
  async getThreadsByDate(date) {
    return this.adapter.listThreads({ date });
  }

  /**
   * 搜索 Threads
   * @param {string} keyword - 搜索关键词
   * @returns {Promise<Thread[]>}
   */
  async searchThreads(keyword) {
    return this.adapter.listThreads({ search: keyword });
  }

  /**
   * 获取单个 Thread
   * @param {string} threadId
   * @returns {Promise<Thread|null>}
   */
  async getThread(threadId) {
    return this.adapter.getThread(threadId);
  }

  /**
   * 创建新想法（新 Thread）
   * @param {string} content - 内容
   * @param {Object} [options]
   * @param {string} [options.title] - 可选标题
   * @param {boolean} [options.isAI] - 是否为 AI 生成
   * @param {string[]} [options.images] - 图片数组（base64）
   * @returns {Promise<Thread>}
   */
  async createIdea(content, options = {}) {
    return this.adapter.createThread({
      content,
      title: options.title,
      isAI: options.isAI || false,
      images: options.images || [],
    });
  }

  /**
   * 继续一个 Thread（添加新 Entry）
   * @param {string} threadId - Thread ID
   * @param {string} content - 内容
   * @param {Object} [options]
   * @param {boolean} [options.isAI] - 是否为 AI 生成
   * @param {string[]} [options.images] - 图片数组（base64）
   * @returns {Promise<Entry>}
   */
  async continueThread(threadId, content, options = {}) {
    return this.adapter.addEntry({
      threadId,
      content,
      isAI: options.isAI || false,
      images: options.images || [],
    });
  }

  /**
   * 更新 Entry 内容
   * @param {string} entryId - Entry ID
   * @param {string} content - 新内容
   * @returns {Promise<Entry>}
   */
  async updateEntry(entryId, content) {
    return this.adapter.updateEntry(entryId, { content });
  }

  /**
   * 删除 Thread
   * @param {string} threadId
   * @returns {Promise<void>}
   */
  async deleteThread(threadId) {
    return this.adapter.deleteThread(threadId);
  }

  /**
   * 删除 Entry
   * @param {string} entryId
   * @returns {Promise<void>}
   */
  async deleteEntry(entryId) {
    return this.adapter.deleteEntry(entryId);
  }

  /**
   * 获取可用日期列表
   * @returns {Promise<string[]>}
   */
  async getAvailableDates() {
    const threads = await this.getAllThreads();
    const dates = new Set();
    
    threads.forEach(thread => {
      if (thread._date) {
        dates.add(thread._date);
      }
    });

    return Array.from(dates).sort().reverse();
  }

  /**
   * 按日期分组获取所有 Threads
   * @returns {Promise<Map<string, Thread[]>>}
   */
  async getThreadsGroupedByDate() {
    const threads = await this.getAllThreads();
    const groups = new Map();

    threads.forEach(thread => {
      const date = thread._date || formatDateKey(thread.createdAt);
      if (!groups.has(date)) {
        groups.set(date, []);
      }
      groups.get(date).push(thread);
    });

    // 按日期倒序排列
    const sortedEntries = Array.from(groups.entries())
      .sort((a, b) => b[0].localeCompare(a[0]));

    return new Map(sortedEntries);
  }

  /**
   * 获取按日期分组的所有 Entries（用于时间线展示）
   * @returns {Promise<Array<{date: string, relativeDate: string, entries: Array}>>}
   */
  async getAllEntriesGroupedByDate() {
    const threads = await this.getAllThreads();
    const entriesByDate = new Map();

    threads.forEach(thread => {
      thread.entries.forEach((entry, index) => {
        const date = formatDateKey(entry.createdAt);
        
        if (!entriesByDate.has(date)) {
          entriesByDate.set(date, []);
        }

        entriesByDate.get(date).push({
          ...entry,
          threadId: thread.id,
          threadTitle: thread.title,
          isFirstInThread: index === 0,
          isLastInThread: index === thread.entries.length - 1,
          type: entry.isAI ? 'ai' : 'user',
        });
      });
    });

    // 转换为数组并排序
    const result = Array.from(entriesByDate.entries())
      .map(([date, entries]) => ({
        date,
        relativeDate: getRelativeDate(date),
        entries: entries.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    return result;
  }

  /**
   * 同步数据（用于云端存储）
   * @returns {Promise<{synced: number, conflicts: number}>}
   */
  async sync() {
    return this.adapter.sync();
  }
}

export default IdeaService;

