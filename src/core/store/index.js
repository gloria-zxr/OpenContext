/**
 * OpenContext Store Module
 * 
 * Provides document and folder management via Rust native bindings.
 */

const path = require('path');
const os = require('os');

const native = require('../native');
const nativeStore = require('../store-native.js');

// Require native bindings at load time
native.require();

// Constants (derived from environment)
const DEFAULT_BASE_ROOT = path.join(os.homedir(), '.opencontext');
const BASE_ROOT = process.env.OPENCONTEXT_ROOT || DEFAULT_BASE_ROOT;
const CONTEXTS_ROOT = process.env.OPENCONTEXT_CONTEXTS_ROOT || path.join(BASE_ROOT, 'contexts');
const DB_PATH = process.env.OPENCONTEXT_DB_PATH || path.join(BASE_ROOT, 'opencontext.db');

// Log if debug enabled
if (process.env.OC_STORE_DEBUG) {
  console.log('[oc store] Using native (Rust) implementation');
}

module.exports = {
  // Core functions
  initEnvironment: nativeStore.initEnvironment,
  listFolders: nativeStore.listFolders,
  createFolder: nativeStore.createFolder,
  renameFolder: nativeStore.renameFolder,
  moveFolder: nativeStore.moveFolder,
  removeFolder: nativeStore.removeFolder,
  listDocs: nativeStore.listDocs,
  createDoc: nativeStore.createDoc,
  moveDoc: nativeStore.moveDoc,
  renameDoc: nativeStore.renameDoc,
  removeDoc: nativeStore.removeDoc,
  setDocDescription: nativeStore.setDocDescription,
  getDocMeta: nativeStore.getDocMeta,
  getDocByStableId: nativeStore.getDocByStableId,
  getDocContent: nativeStore.getDocContent,
  saveDocContent: nativeStore.saveDocContent,
  generateManifest: nativeStore.generateManifest,
  reconcileFolder: nativeStore.reconcileFolder,
  
  // Constants
  DEFAULT_BASE_ROOT,
  BASE_ROOT,
  CONTEXTS_ROOT,
  DB_PATH,
  
  // Implementation info
  isNativeAvailable: native.isAvailable,
  USE_NATIVE: true,
};
