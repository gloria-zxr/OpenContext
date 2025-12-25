/**
 * IdeaStorageAdapter - 存储适配器抽象接口
 * 
 * 定义 Idea 存储的标准接口，支持多种存储后端：
 * - LocalStorageAdapter: 本地文件存储
 * - CloudStorageAdapter: 云端 API 存储（未来）
 * - HybridStorageAdapter: 本地 + 云端同步（未来）
 */

/**
 * @typedef {import('./types').Thread} Thread
 * @typedef {import('./types').Entry} Entry
 * @typedef {import('./types').CreateThreadInput} CreateThreadInput
 * @typedef {import('./types').AddEntryInput} AddEntryInput
 * @typedef {import('./types').ThreadFilter} ThreadFilter
 */

/**
 * 存储适配器基类
 * @abstract
 */
export class IdeaStorageAdapter {
  /**
   * 获取所有 Threads
   * @param {ThreadFilter} [filter] - 可选筛选条件
   * @returns {Promise<Thread[]>}
   */
  async listThreads(filter) {
    throw new Error('listThreads must be implemented');
  }

  /**
   * 获取单个 Thread
   * @param {string} threadId - Thread ID
   * @returns {Promise<Thread|null>}
   */
  async getThread(threadId) {
    throw new Error('getThread must be implemented');
  }

  /**
   * 创建新 Thread（包含第一条 Entry）
   * @param {CreateThreadInput} input
   * @returns {Promise<Thread>}
   */
  async createThread(input) {
    throw new Error('createThread must be implemented');
  }

  /**
   * 添加 Entry 到 Thread
   * @param {AddEntryInput} input
   * @returns {Promise<Entry>}
   */
  async addEntry(input) {
    throw new Error('addEntry must be implemented');
  }

  /**
   * 更新 Entry
   * @param {string} entryId - Entry ID
   * @param {Partial<Entry>} updates - 更新内容
   * @returns {Promise<Entry>}
   */
  async updateEntry(entryId, updates) {
    throw new Error('updateEntry must be implemented');
  }

  /**
   * 删除 Thread
   * @param {string} threadId - Thread ID
   * @returns {Promise<void>}
   */
  async deleteThread(threadId) {
    throw new Error('deleteThread must be implemented');
  }

  /**
   * 删除 Entry
   * @param {string} entryId - Entry ID
   * @returns {Promise<void>}
   */
  async deleteEntry(entryId) {
    throw new Error('deleteEntry must be implemented');
  }

  /**
   * 同步数据（用于云端同步）
   * @returns {Promise<{synced: number, conflicts: number}>}
   */
  async sync() {
    // 默认实现：本地存储无需同步
    return { synced: 0, conflicts: 0 };
  }

  /**
   * 获取适配器类型
   * @returns {string}
   */
  getType() {
    return 'abstract';
  }
}

export default IdeaStorageAdapter;

