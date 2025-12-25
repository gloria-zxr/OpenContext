/**
 * Idea Service 模块
 * 
 * 提供 Idea 数据管理的完整解决方案：
 * - IdeaService: 业务逻辑层
 * - IdeaStorageAdapter: 存储适配器抽象
 * - LocalStorageAdapter: 本地文件存储实现
 * 
 * 使用示例：
 * ```js
 * import { IdeaService, LocalStorageAdapter } from './services/idea';
 * import * as api from './api';
 * 
 * const adapter = new LocalStorageAdapter(api);
 * const ideaService = new IdeaService(adapter);
 * 
 * // 获取所有想法
 * const threads = await ideaService.getAllThreads();
 * 
 * // 创建新想法
 * const newThread = await ideaService.createIdea('这是一个新想法');
 * 
 * // 继续一个想法
 * const newEntry = await ideaService.continueThread(threadId, '这是续写内容');
 * ```
 */

export { IdeaStorageAdapter } from './IdeaStorageAdapter';
export { LocalStorageAdapter } from './LocalStorageAdapter';
export { IdeaService } from './IdeaService';
export { default as types } from './types';

// 默认导出 Service 类
export { IdeaService as default } from './IdeaService';

