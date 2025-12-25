/**
 * OpenContext Configuration Management
 * Supports persistent configuration items like API keys
 */
const path = require('path');
const fs = require('fs');
const os = require('os');

const DEFAULT_BASE_ROOT = path.join(os.homedir(), '.opencontext');
const BASE_ROOT = process.env.OPENCONTEXT_ROOT || DEFAULT_BASE_ROOT;
const CONFIG_PATH = path.join(BASE_ROOT, 'config.json');

// Supported configuration keys and their descriptions
const CONFIG_KEYS = {
  EMBEDDING_API_KEY: {
    description: 'API Key for embedding generation (OpenAI, DashScope, etc.)',
    sensitive: true,
    envVar: 'EMBEDDING_API_KEY',
    // Backward compatibility: also check old env var name
    fallbackEnvVar: 'OPENAI_API_KEY'
  },
  EMBEDDING_API_BASE: {
    description: 'API Base URL for embedding service',
    sensitive: false,
    envVar: 'EMBEDDING_API_BASE',
    fallbackEnvVar: 'OPENAI_BASE_URL',
    default: 'https://api.openai.com/v1'
  },
  EMBEDDING_MODEL: {
    description: 'Embedding model name',
    sensitive: false,
    envVar: 'EMBEDDING_MODEL',
    default: 'text-embedding-3-small'
  },
  // AI Chat Configuration
  AI_PROVIDER: {
    description: 'AI provider: openai | ollama',
    sensitive: false,
    envVar: 'AI_PROVIDER',
    default: 'openai'
  },
  AI_API_KEY: {
    description: 'API Key for AI chat (OpenAI compatible)',
    sensitive: true,
    envVar: 'AI_API_KEY',
    fallbackEnvVar: 'OPENAI_API_KEY'
  },
  AI_API_BASE: {
    description: 'API Base URL for AI chat service',
    sensitive: false,
    envVar: 'AI_API_BASE',
    default: 'https://api.openai.com/v1'
  },
  AI_MODEL: {
    description: 'AI chat model name',
    sensitive: false,
    envVar: 'AI_MODEL',
    default: 'gpt-4o'
  },
  AI_PROMPT: {
    description: 'Custom system prompt for AI reflections',
    sensitive: false,
    envVar: 'AI_PROMPT',
    default: 'You are an AI within a journaling app. Your job is to help the user reflect on their thoughts in a thoughtful and kind manner. The user can never directly address you or directly respond to you. Try not to repeat what the user said, instead try to seed new ideas, encourage or debate. Keep your responses concise, but meaningful. Respond in the same language as the user.'
  }
};

/**
 * Ensure config directory exists
 */
function ensureConfigDir() {
  if (!fs.existsSync(BASE_ROOT)) {
    fs.mkdirSync(BASE_ROOT, { recursive: true });
  }
}

/**
 * Load config file
 * @returns {Object} Config object
 */
function loadConfig() {
  ensureConfigDir();
  
  if (!fs.existsSync(CONFIG_PATH)) {
    return {};
  }
  
  try {
    const content = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    console.error(`Warning: Failed to parse config file: ${e.message}`);
    return {};
  }
}

/**
 * Save config file
 * @param {Object} config - Config object
 */
function saveConfig(config) {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Get config value
 * Priority: environment variable > fallback env var > config file > default value
 * @param {string} key - Config key
 * @returns {string|undefined} Config value
 */
function get(key) {
  const keyInfo = CONFIG_KEYS[key];
  
  // 1. Check primary environment variable
  if (keyInfo?.envVar && process.env[keyInfo.envVar]) {
    return process.env[keyInfo.envVar];
  }
  
  // 2. Check fallback environment variable (backward compatibility)
  if (keyInfo?.fallbackEnvVar && process.env[keyInfo.fallbackEnvVar]) {
    return process.env[keyInfo.fallbackEnvVar];
  }
  
  // 3. Check config file (new key name first, then old key name for migration)
  const config = loadConfig();
  if (config[key] !== undefined) {
    return config[key];
  }
  // Backward compatibility: check old key names in config file
  if (key === 'EMBEDDING_API_KEY' && config['OPENAI_API_KEY'] !== undefined) {
    return config['OPENAI_API_KEY'];
  }
  if (key === 'EMBEDDING_API_BASE' && config['OPENAI_BASE_URL'] !== undefined) {
    return config['OPENAI_BASE_URL'];
  }
  
  // 4. Return default value
  return keyInfo?.default;
}

/**
 * Set config value
 * @param {string} key - Config key
 * @param {string} value - Config value
 */
function set(key, value) {
  if (!CONFIG_KEYS[key]) {
    throw new Error(`Unknown config key: ${key}. Run "oc config list" to see available keys.`);
  }
  
  const config = loadConfig();
  config[key] = value;
  saveConfig(config);
}

/**
 * Delete config value
 * @param {string} key - Config key
 */
function unset(key) {
  const config = loadConfig();
  delete config[key];
  saveConfig(config);
}

/**
 * List all configurations
 * @param {boolean} showValues - Whether to show values (sensitive info will be masked)
 * @returns {Array<{key: string, value: string, source: string, description: string}>}
 */
function list(showValues = false) {
  const config = loadConfig();
  const result = [];
  
  for (const [key, info] of Object.entries(CONFIG_KEYS)) {
    let value = null;
    let source = 'default';
    
    // Check primary environment variable
    if (info.envVar && process.env[info.envVar]) {
      value = process.env[info.envVar];
      source = 'env';
    }
    // Check fallback environment variable
    else if (info.fallbackEnvVar && process.env[info.fallbackEnvVar]) {
      value = process.env[info.fallbackEnvVar];
      source = 'env (legacy)';
    }
    // Check config file
    else if (config[key] !== undefined) {
      value = config[key];
      source = 'config';
    }
    // Default value
    else if (info.default) {
      value = info.default;
      source = 'default';
    }
    
    // Mask sensitive info
    let displayValue = value;
    if (value && info.sensitive && showValues) {
      displayValue = maskSensitive(value);
    } else if (value && info.sensitive) {
      displayValue = '********';
    }
    
    result.push({
      key,
      value: displayValue,
      source,
      description: info.description,
      isSet: value !== null && value !== undefined
    });
  }
  
  return result;
}

/**
 * Mask sensitive info, show only first and last few characters
 * @param {string} value - Original value
 * @returns {string} Masked value
 */
function maskSensitive(value) {
  if (!value || value.length < 8) {
    return '********';
  }
  const prefix = value.substring(0, 4);
  const suffix = value.substring(value.length - 4);
  return `${prefix}••••••••${suffix}`;
}

/**
 * Get config file path
 * @returns {string}
 */
function getConfigPath() {
  return CONFIG_PATH;
}

/**
 * Get all supported config keys
 * @returns {string[]}
 */
function getAvailableKeys() {
  return Object.keys(CONFIG_KEYS);
}

module.exports = {
  get,
  set,
  unset,
  list,
  loadConfig,
  saveConfig,
  getConfigPath,
  getAvailableKeys,
  CONFIG_KEYS,
  BASE_ROOT
};
