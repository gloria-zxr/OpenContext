/**
 * Tests for the Native Store Adapter
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Test environment setup
let tempDir;
let originalEnv;

function setupTestEnv() {
  tempDir = path.join(os.tmpdir(), `oc-store-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  fs.mkdirSync(tempDir, { recursive: true });
  
  originalEnv = {
    OPENCONTEXT_ROOT: process.env.OPENCONTEXT_ROOT,
    OPENCONTEXT_CONTEXTS_ROOT: process.env.OPENCONTEXT_CONTEXTS_ROOT,
    OPENCONTEXT_DB_PATH: process.env.OPENCONTEXT_DB_PATH,
  };
  
  process.env.OPENCONTEXT_ROOT = tempDir;
  process.env.OPENCONTEXT_CONTEXTS_ROOT = path.join(tempDir, 'contexts');
  process.env.OPENCONTEXT_DB_PATH = path.join(tempDir, 'test.db');
}

function cleanupTestEnv() {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  
  if (tempDir && fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

// Setup test env first before loading any modules
setupTestEnv();

// Try to load the store adapter
let storeNative;
let isAvailable = false;
try {
  storeNative = require('../../src/core/store-native.js');
  isAvailable = storeNative.isNativeAvailable();
} catch (e) {
  console.log('Native store not available:', e.message);
}

describe('Store Native Adapter', async () => {
  
  before(() => {
    // Already setup above
  });
  
  after(() => {
    cleanupTestEnv();
  });
  
  describe('Availability', () => {
    it('should report native availability', () => {
      assert.strictEqual(typeof storeNative.isNativeAvailable, 'function');
      const available = storeNative.isNativeAvailable();
      assert.strictEqual(typeof available, 'boolean');
    });
    
    it('should provide error if not available', () => {
      assert.strictEqual(typeof storeNative.getNativeError, 'function');
      const error = storeNative.getNativeError();
      if (!storeNative.isNativeAvailable()) {
        assert.ok(error instanceof Error || error === null);
      }
    });
  });
  
  describe('initEnvironment()', { skip: !isAvailable }, () => {
    it('should return environment info', () => {
      const info = storeNative.initEnvironment();
      
      assert.ok(info.contextsRoot, 'Should have contextsRoot');
      assert.ok(info.dbPath, 'Should have dbPath');
      assert.ok(info.contextsRoot.includes('contexts'));
    });
  });
  
  describe('Folder Operations', { skip: !isAvailable }, () => {
    
    it('should create and list folders', () => {
      const created = storeNative.createFolder({ path: 'test-folder' });
      
      assert.strictEqual(created.rel_path, 'test-folder');
      assert.ok(created.abs_path);
      
      const folders = storeNative.listFolders({ all: true });
      assert.ok(Array.isArray(folders));
      assert.ok(folders.some(f => f.rel_path === 'test-folder'));
    });
    
    it('should rename folder', () => {
      storeNative.createFolder({ path: 'rename-me' });
      
      const result = storeNative.renameFolder({ 
        path: 'rename-me', 
        newName: 'renamed-folder' 
      });
      
      assert.strictEqual(result.old_path, 'rename-me');
      assert.strictEqual(result.new_path, 'renamed-folder');
    });
    
    it('should remove folder', () => {
      storeNative.createFolder({ path: 'delete-me' });
      
      const result = storeNative.removeFolder({ path: 'delete-me' });
      
      assert.strictEqual(result.removed, 'delete-me');
    });
  });
  
  describe('Document Operations', { skip: !isAvailable }, () => {
    
    before(() => {
      try {
        storeNative.createFolder({ path: 'doc-test' });
      } catch (e) {
        // May already exist
      }
    });
    
    it('should create document', () => {
      const doc = storeNative.createDoc({ 
        folderPath: 'doc-test', 
        name: 'test.md',
        description: 'Test document'
      });
      
      assert.strictEqual(doc.rel_path, 'doc-test/test.md');
      assert.ok(doc.stable_id);
      assert.strictEqual(doc.description, 'Test document');
    });
    
    it('should list documents', () => {
      const docs = storeNative.listDocs({ folderPath: 'doc-test' });
      
      assert.ok(Array.isArray(docs));
      assert.ok(docs.some(d => d.name === 'test.md'));
    });
    
    it('should get document meta', () => {
      const doc = storeNative.getDocMeta({ docPath: 'doc-test/test.md' });
      
      assert.strictEqual(doc.name, 'test.md');
      assert.strictEqual(doc.description, 'Test document');
    });
    
    it('should get document by stable_id', () => {
      const created = storeNative.createDoc({ 
        folderPath: 'doc-test', 
        name: 'stable-test.md' 
      });
      
      const doc = storeNative.getDocByStableId(created.stable_id);
      
      assert.strictEqual(doc.rel_path, 'doc-test/stable-test.md');
    });
    
    it('should save and get content', () => {
      storeNative.createDoc({ folderPath: 'doc-test', name: 'content.md' });
      
      storeNative.saveDocContent({ 
        docPath: 'doc-test/content.md', 
        content: '# Hello World' 
      });
      
      const content = storeNative.getDocContent('doc-test/content.md');
      
      assert.strictEqual(content, '# Hello World');
    });
    
    it('should rename document', () => {
      storeNative.createDoc({ folderPath: 'doc-test', name: 'rename-me.md' });
      
      const result = storeNative.renameDoc({ 
        docPath: 'doc-test/rename-me.md', 
        newName: 'renamed.md' 
      });
      
      assert.strictEqual(result.old_path, 'doc-test/rename-me.md');
      assert.strictEqual(result.new_path, 'doc-test/renamed.md');
    });
    
    it('should remove document', () => {
      storeNative.createDoc({ folderPath: 'doc-test', name: 'delete-me.md' });
      
      const result = storeNative.removeDoc({ docPath: 'doc-test/delete-me.md' });
      
      assert.strictEqual(result.removed, 'doc-test/delete-me.md');
    });
    
    it('should throw on not found', () => {
      assert.throws(() => {
        storeNative.getDocMeta({ docPath: 'nonexistent/doc.md' });
      });
    });
  });
  
  describe('Manifest', { skip: !isAvailable }, () => {
    
    before(() => {
      try {
        storeNative.createFolder({ path: 'manifest-test' });
        storeNative.createDoc({ 
          folderPath: 'manifest-test', 
          name: 'doc1.md',
          description: 'First'
        });
        storeNative.createDoc({ 
          folderPath: 'manifest-test', 
          name: 'doc2.md',
          description: 'Second'
        });
      } catch (e) {
        // May already exist
      }
    });
    
    it('should generate manifest', () => {
      const manifest = storeNative.generateManifest({ folderPath: 'manifest-test' });

      assert.ok(manifest && Array.isArray(manifest.items));
      assert.ok(Array.isArray(manifest.unindexed_files));
      assert.ok(manifest.items.length >= 2);

      const entry = manifest.items[0];
      assert.ok(entry.doc_name);
      assert.ok(entry.rel_path);
      assert.ok(entry.stable_id);
    });

    it('should respect limit', () => {
      const manifest = storeNative.generateManifest({
        folderPath: 'manifest-test',
        limit: 1
      });

      assert.strictEqual(manifest.items.length, 1);
    });
  });
});

