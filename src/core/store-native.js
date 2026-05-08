/**
 * Native Store Adapter
 * 
 * Adapts the native (Rust) OpenContext bindings to match the original store.js API.
 */

const native = require('./native');

// Re-export availability checks
const isNativeAvailable = native.isAvailable;
const getNativeError = native.getError;

/**
 * Handle native result - throw if Error, return otherwise
 * NAPI sometimes returns Error objects instead of throwing
 * @param {*} result - Result from native call
 * @returns {*}
 */
function handleResult(result) {
  if (result instanceof Error) {
    throw result;
  }
  return result;
}

// ==================== Store API ====================

/**
 * Initialize environment and return paths
 * @returns {{ contextsRoot: string, dbPath: string }}
 */
function initEnvironment() {
  const info = handleResult(native.get().initEnvironment());
  return {
    contextsRoot: info.contexts_root,
    dbPath: info.db_path,
  };
}

/**
 * List folders
 * @param {{ all?: boolean }} options
 * @returns {Array<Folder>}
 */
function listFolders(options = {}) {
  return handleResult(native.get().listFolders({ all: options.all ?? false }));
}

/**
 * Create a folder
 * @param {{ path: string, description?: string }} options
 * @returns {{ rel_path: string, abs_path: string, description: string }}
 */
function createFolder(options) {
  return handleResult(native.get().createFolder({
    path: options.path,
    description: options.description,
  }));
}

/**
 * Rename a folder
 * @param {{ path: string, newName: string }} options
 * @returns {{ old_path: string, new_path: string }}
 */
function renameFolder(options) {
  return handleResult(native.get().renameFolder({
    path: options.path,
    newName: options.newName,
  }));
}

/**
 * Move a folder
 * @param {{ path: string, destFolderPath: string }} options
 * @returns {{ old_path: string, new_path: string }}
 */
function moveFolder(options) {
  return handleResult(native.get().moveFolder({
    path: options.path,
    destFolderPath: options.destFolderPath,
  }));
}

/**
 * Remove a folder
 * @param {{ path: string, force?: boolean }} options
 * @returns {{ removed: string }}
 */
function removeFolder(options) {
  const result = handleResult(native.get().removeFolder({
    path: options.path,
    force: options.force ?? false,
  }));
  return { removed: result.rel_path };
}

/**
 * List documents in a folder
 * @param {{ folderPath: string, recursive?: boolean }} options
 * @returns {Array<Doc>}
 */
function listDocs(options) {
  return handleResult(native.get().listDocs({
    folderPath: options.folderPath,
    recursive: options.recursive ?? false,
  }));
}

/**
 * Create a document
 * @param {{ folderPath: string, name: string, description?: string }} options
 * @returns {{ rel_path: string, abs_path: string, description: string, stable_id: string }}
 */
function createDoc(options) {
  return handleResult(native.get().createDoc({
    folderPath: options.folderPath,
    name: options.name,
    description: options.description,
  }));
}

/**
 * Move a document
 * @param {{ docPath: string, destFolderPath: string }} options
 * @returns {{ old_path: string, new_path: string }}
 */
function moveDoc(options) {
  return handleResult(native.get().moveDoc({
    docPath: options.docPath,
    destFolderPath: options.destFolderPath,
  }));
}

/**
 * Rename a document
 * @param {{ docPath: string, newName: string }} options
 * @returns {{ old_path: string, new_path: string }}
 */
function renameDoc(options) {
  return handleResult(native.get().renameDoc({
    docPath: options.docPath,
    newName: options.newName,
  }));
}

/**
 * Remove a document
 * @param {{ docPath: string }} options
 * @returns {{ removed: string }}
 */
function removeDoc(options) {
  const result = handleResult(native.get().removeDoc({
    docPath: options.docPath,
  }));
  return { removed: result.rel_path };
}

/**
 * Set document description
 * @param {{ docPath: string, description: string }} options
 * @returns {{ rel_path: string, description: string }}
 */
function setDocDescription(options) {
  return handleResult(native.get().setDocDescription({
    docPath: options.docPath,
    description: options.description,
  }));
}

/**
 * Get document metadata
 * @param {{ docPath: string }} options
 * @returns {Doc}
 */
function getDocMeta(options) {
  return handleResult(native.get().getDocMeta(options.docPath));
}

/**
 * Get document by stable ID
 * @param {string} stableId
 * @returns {Doc}
 */
function getDocByStableId(stableId) {
  return handleResult(native.get().getDocByStableId(stableId));
}

/**
 * Get document content
 * @param {string} docPath
 * @returns {string}
 */
function getDocContent(docPath) {
  return handleResult(native.get().getDocContent(docPath));
}

/**
 * Save document content
 * @param {{ docPath: string, content: string, description?: string }} options
 * @returns {{ rel_path: string, abs_path: string }}
 */
function saveDocContent(options) {
  return handleResult(native.get().saveDocContent({
    docPath: options.docPath,
    content: options.content,
    description: options.description,
  }));
}

/**
 * Generate manifest with drift detection.
 *
 * Returns documents registered in SQLite for the folder, plus a list of
 * `*.md` files that exist on disk but are NOT indexed (i.e. someone wrote
 * a file directly via Write/Edit, bypassing oc_create_doc/saveDocContent).
 *
 * @param {{ folderPath: string, limit?: number }} options
 * @returns {{ items: Array<DocManifestEntry>, unindexed_files: string[] }}
 */
function generateManifest(options) {
  return handleResult(native.get().generateManifest({
    folderPath: options.folderPath,
    limit: options.limit,
  }));
}

/**
 * Reconcile a folder: scan filesystem under `folderPath` and INSERT a
 * `docs` row for every `*.md` that has none. Does NOT rebuild embeddings.
 * @param {{ folderPath: string }} options
 * @returns {string[]} rel_paths of newly registered docs
 */
function reconcileFolder(options) {
  return handleResult(native.get().reconcileFolder({
    folderPath: options.folderPath,
  }));
}

module.exports = {
  // Availability checks
  isNativeAvailable,
  getNativeError,
  
  // Store API
  initEnvironment,
  listFolders,
  createFolder,
  renameFolder,
  moveFolder,
  removeFolder,
  listDocs,
  createDoc,
  moveDoc,
  renameDoc,
  removeDoc,
  setDocDescription,
  getDocMeta,
  getDocByStableId,
  getDocContent,
  saveDocContent,
  generateManifest,
  reconcileFolder,
};
