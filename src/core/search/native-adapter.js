/**
 * Native Search Adapter
 * 
 * Wraps Rust native bindings to match the JS Searcher/Indexer API.
 * Uses shared formatting logic via formatter.js.
 */

const native = require('../native');
const { normalizeResults, formatPlain, formatJson } = require('./formatter');

// Re-export availability checks
const isNativeAvailable = native.isAvailable;
const getNativeError = native.getError;

/**
 * Native Searcher wrapper - matches JS Searcher API
 */
class NativeSearcher {
  constructor(options = {}) {
    this.vectorWeight = options.vectorWeight ?? 0.7;
    this.keywordWeight = options.keywordWeight ?? 0.3;
    this.initialized = false;
    this._searcher = null;
  }

  /**
   * Initialize search engine
   * @param {boolean} forceReinit - Force re-initialization
   */
  async initialize(forceReinit = false) {
    if (this.initialized && !forceReinit) return;
    
    this._searcher = await native.get().Searcher.create();
    this.initialized = true;
  }

  /**
   * Execute search
   * @param {string} query - Search query
   * @param {Object} options
   * @param {number} options.limit - Number of results to return
   * @param {string} options.mode - Search mode: 'hybrid' | 'vector' | 'keyword'
   * @param {string} options.aggregateBy - Aggregation type: 'content' | 'doc' | 'folder'
   * @returns {Promise<Array>} Search results array with snake_case fields
   */
  async search(query, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const { limit = 5, mode = 'hybrid', aggregateBy = 'content' } = options;

    const response = await this._searcher.search({
      query,
      limit,
      mode,
      aggregateBy,
      docType: options.docType,
    });

    // Native returns { results: [...], count: N, ... }
    // JS API expects just the array, normalized to snake_case
    return normalizeResults(response.results);
  }

  /** @see formatPlain */
  formatResults(query, results, options = {}) {
    return formatPlain(query, results, options);
  }

  /** @see formatPlain */
  formatResultsPlain(query, results, options = {}) {
    return formatPlain(query, results, options);
  }

  /** @see formatJson */
  formatResultsJson(query, results, options = {}) {
    return formatJson(query, results, options);
  }
}

/**
 * Native Indexer wrapper - matches JS Indexer API
 */
class NativeIndexer {
  constructor(options = {}) {
    this._indexer = null;
    this.initialized = false;
  }

  /**
   * Initialize indexer
   */
  async initialize() {
    if (this.initialized) return;

    this._indexer = await native.get().Indexer.create();
    this.initialized = true;
  }

  /**
   * Build index for all documents
   * @param {Object} options
   * @param {Function} options.onProgress - Progress callback
   * @returns {Promise<Object>} Index stats
   */
  async buildIndex(options = {}) {
    await this.initialize();

    // Native buildAll doesn't support progress callback yet
    // TODO: Add progress support via ThreadsafeFunction
    const stats = await this._indexer.buildAll();
    
    if (options.onProgress) {
      options.onProgress({ phase: 'done', percent: 100 });
    }

    return {
      fileCount: stats.totalDocs,
      chunkCount: stats.totalChunks,
      mode: 'full',
      elapsedMs: stats.elapsedMs,
    };
  }

  /**
   * Index a single file
   * @param {string} relPath - Relative path to the file
   * @returns {Promise<number>} Number of chunks created
   */
  async indexFile(relPath) {
    await this.initialize();
    return await this._indexer.indexFile(relPath);
  }

  /**
   * Remove a file from the index
   * @param {string} relPath - Relative path to the file
   */
  async removeFile(relPath) {
    await this.initialize();
    await this._indexer.removeFile(relPath);
  }

  /**
   * Check if index exists
   * @returns {Promise<boolean>}
   */
  async indexExists() {
    await this.initialize();
    return await this._indexer.indexExists();
  }

  /**
   * Get index statistics
   * @returns {Promise<Object>}
   */
  async getStats() {
    await this.initialize();
    return await this._indexer.getStats();
  }

  /**
   * Clean/reset the index
   */
  async clean() {
    await this.initialize();
    await this._indexer.clean();
  }
}

module.exports = {
  isNativeAvailable,
  getNativeError,
  NativeSearcher,
  NativeIndexer,
};
