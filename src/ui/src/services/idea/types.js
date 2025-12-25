/**
 * Idea 模块数据类型定义
 * 
 * 规范化的数据模型，独立于存储格式
 */

/**
 * @typedef {Object} Entry
 * @property {string} id - 唯一标识
 * @property {string} threadId - 所属 Thread ID
 * @property {string} content - 内容文本
 * @property {boolean} isAI - 是否为 AI 生成
 * @property {string} createdAt - 创建时间 (ISO8601)
 */

/**
 * @typedef {Object} Thread
 * @property {string} id - 唯一标识
 * @property {string} title - 标题
 * @property {string} createdAt - 创建时间 (ISO8601)
 * @property {string} updatedAt - 最后更新时间 (ISO8601)
 * @property {Entry[]} entries - 条目列表
 */

/**
 * @typedef {Object} CreateThreadInput
 * @property {string} content - 第一条内容
 * @property {string} [title] - 可选标题
 * @property {boolean} [isAI] - 是否为 AI 生成
 */

/**
 * @typedef {Object} AddEntryInput
 * @property {string} threadId - Thread ID
 * @property {string} content - 内容
 * @property {boolean} [isAI] - 是否为 AI 生成
 */

/**
 * @typedef {Object} ThreadFilter
 * @property {string} [date] - 按日期筛选 (YYYY-MM-DD)
 * @property {string} [search] - 搜索关键词
 */

// 导出空对象以支持 JSDoc 类型引用
export default {};

