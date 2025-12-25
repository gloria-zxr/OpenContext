/**
 * Search Results Formatter
 * 
 * Shared formatting logic for both Native and JS implementations.
 * Ensures consistent output format regardless of backend.
 */

/**
 * Normalize a search result to use snake_case field names
 * @param {Object} result - Raw search result (may have mixed naming)
 * @returns {Object} Normalized result with snake_case fields
 */
function normalizeResult(result) {
  return {
    score: result.score,
    file_path: result.file_path || result.filePath,
    content: result.content,
    heading_path: result.heading_path || result.headingPath,
    section_title: result.section_title || result.sectionTitle,
    line_start: result.line_start || result.lineStart,
    line_end: result.line_end || result.lineEnd,
    matched_by: result.matched_by || result.matchedBy,
    hit_count: result.hit_count || result.hitCount,
    doc_count: result.doc_count || result.docCount,
    folder_path: result.folder_path || result.folderPath,
    display_name: result.display_name || result.displayName,
    doc_type: result.doc_type || result.docType,
    entry_id: result.entry_id || result.entryId,
    entry_date: result.entry_date || result.entryDate,
    entry_created_at: result.entry_created_at || result.entryCreatedAt,
  };
}

/**
 * Normalize an array of results
 * @param {Array} results - Raw results
 * @returns {Array} Normalized results
 */
function normalizeResults(results) {
  return (results || []).map(normalizeResult);
}

/**
 * Format search results to plain text
 * @param {string} query - Original query
 * @param {Array} results - Search results (normalized)
 * @param {Object} options - Format options
 * @param {string} options.mode - Search mode
 * @param {string} options.aggregateBy - Aggregation type
 * @returns {string} Formatted results
 */
function formatPlain(query, results, options = {}) {
  const { mode = 'hybrid', aggregateBy = 'content' } = options;

  if (!results || results.length === 0) {
    return `🔍 Search: "${query}"\nNo results found. Try different keywords or run "oc index build" first.`;
  }

  const modeLabel = { hybrid: 'Hybrid', vector: 'Vector', keyword: 'Keyword' }[mode] || mode;
  let output = `🔍 ${modeLabel} Search: "${query}"\nFound ${results.length} results:\n\n`;

  results.forEach((result, i) => {
    const r = normalizeResult(result);
    const matchLabel = formatMatchLabel(r.matched_by);

    if (aggregateBy === 'folder') {
      output += formatFolderResult(i, r, matchLabel);
    } else if (aggregateBy === 'doc') {
      output += formatDocResult(i, r, matchLabel);
    } else {
      output += formatContentResult(i, r, matchLabel);
    }
  });

  return output;
}

function formatMatchLabel(matchedBy) {
  if (matchedBy === 'vector+keyword') return '[vector+keyword]';
  if (matchedBy === 'vector') return '[vector]';
  return '[keyword]';
}

function formatFolderResult(index, result, matchLabel) {
  return `[${index + 1}] Score: ${result.score.toFixed(4)} ${matchLabel}\n` +
    `📁 ${result.folder_path || result.file_path}\n` +
    `   ${result.doc_count || 0} documents, ${result.hit_count || 0} matches\n\n`;
}

function formatDocResult(index, result, matchLabel) {
  return `[${index + 1}] Score: ${result.score.toFixed(4)} ${matchLabel}\n` +
    `📄 ${result.file_path}\n` +
    `   ${result.hit_count || 0} matches\n\n`;
}

function formatContentResult(index, result, matchLabel) {
  const headingPath = result.heading_path ? ` > ${result.heading_path}` : '';
  const lineInfo = result.line_start && result.line_end 
    ? ` (lines ${result.line_start}-${result.line_end})` 
    : '';
  const separator = '─'.repeat(40);
  const content = result.content || '';
  const truncated = content.length > 300 ? content.slice(0, 300) + '...' : content;

  return `[${index + 1}] Score: ${result.score.toFixed(4)} ${matchLabel}\n` +
    `📄 ${result.file_path}${headingPath}${lineInfo}\n` +
    `${separator}\n${truncated}\n${separator}\n\n`;
}

/**
 * Format search results to JSON format
 * @param {string} query - Original query
 * @param {Array} results - Search results
 * @param {Object} options - Format options
 * @returns {Object} JSON formatted results
 */
function formatJson(query, results, options = {}) {
  const { mode = 'hybrid', aggregateBy = 'content' } = options;

  return {
    query,
    mode,
    aggregate_by: aggregateBy,
    count: results.length,
    results: normalizeResults(results),
  };
}

module.exports = {
  normalizeResult,
  normalizeResults,
  formatPlain,
  formatJson,
};
