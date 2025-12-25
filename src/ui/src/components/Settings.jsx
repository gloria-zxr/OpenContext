import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Cog6ToothIcon, 
  ArrowPathIcon, 
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckIcon,
  PencilIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import * as api from '../api';
import { useAI } from '../context/AIContext';

export function Settings() {
  const { t } = useTranslation();
  const { config: aiConfig, saveConfig: saveAIConfig, loadConfig: loadAIConfig } = useAI();
  const [envInfo, setEnvInfo] = useState(null);
  const [indexStatus, setIndexStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [indexBuilding, setIndexBuilding] = useState(false);
  const [indexProgress, setIndexProgress] = useState(null); // { phase, current, total, percent, message }
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAIApiKey, setShowAIApiKey] = useState(false);
  
  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    apiKey: '',
    apiBase: '',
    model: '',
  });
  const [saving, setSaving] = useState(false);
  
  // AI edit mode states
  const [isEditingAI, setIsEditingAI] = useState(false);
  const [aiEditForm, setAIEditForm] = useState({
    provider: 'openai',
    apiKey: '',
    apiBase: '',
    model: '',
    prompt: '',
  });
  const [savingAI, setSavingAI] = useState(false);

  // Load initial data and setup Tauri event listener
  useEffect(() => {
    loadData();
    
    // Listen for index progress events (Tauri only)
    let unlisten = null;
    (async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        unlisten = await listen('index-progress', (event) => {
          setIndexProgress(event.payload);
        });
      } catch (e) {
        // Not in Tauri environment, ignore
      }
    })();
    
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [env, idx] = await Promise.all([
        api.getEnvInfo().catch(() => null),
        api.getIndexStatus().catch(() => null)
      ]);
      setEnvInfo(env);
      setIndexStatus(idx);
      
      // Initialize edit form with current values
      if (env) {
        setEditForm({
          apiKey: '', // Don't show actual key, user must re-enter
          apiBase: env.embedding_api_base || 'https://api.openai.com/v1',
          model: env.embedding_model || 'text-embedding-3-small',
        });
      }
    } catch (err) {
      console.error('Failed to load settings data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initialize AI form when aiConfig changes
  useEffect(() => {
    if (aiConfig) {
      setAIEditForm({
        provider: aiConfig.provider || 'openai',
        apiKey: '',
        apiBase: aiConfig.apiBase || 'https://api.openai.com/v1',
        model: aiConfig.model || 'gpt-4o',
        prompt: aiConfig.prompt || aiConfig.defaultPrompt || '',
      });
    }
  }, [aiConfig]);

  const handleStartEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    // Reset form to current values
    if (envInfo) {
      setEditForm({
        apiKey: '',
        apiBase: envInfo.embedding_api_base || 'https://api.openai.com/v1',
        model: envInfo.embedding_model || 'text-embedding-3-small',
      });
    }
  }, [envInfo]);

  // AI config handlers
  const handleStartEditAI = useCallback(() => {
    setIsEditingAI(true);
  }, []);

  const handleCancelEditAI = useCallback(() => {
    setIsEditingAI(false);
    if (aiConfig) {
      setAIEditForm({
        provider: aiConfig.provider || 'openai',
        apiKey: '',
        apiBase: aiConfig.apiBase || 'https://api.openai.com/v1',
        model: aiConfig.model || 'gpt-4o',
        prompt: aiConfig.prompt || aiConfig.defaultPrompt || '',
      });
    }
  }, [aiConfig]);

  const handleSaveAIConfig = async () => {
    setSavingAI(true);
    try {
      await saveAIConfig({
        provider: aiEditForm.provider || undefined,
        apiKey: aiEditForm.apiKey || undefined,
        apiBase: aiEditForm.apiBase || undefined,
        model: aiEditForm.model || undefined,
        prompt: aiEditForm.prompt || undefined,
      });
      setIsEditingAI(false);
    } catch (err) {
      console.error('Failed to save AI config:', err);
      alert(t('error.operationFailed') + ': ' + err.message);
    } finally {
      setSavingAI(false);
    }
  };

  const handleResetPrompt = useCallback(() => {
    setAIEditForm(f => ({ ...f, prompt: aiConfig?.defaultPrompt || '' }));
  }, [aiConfig]);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await api.saveConfig({
        apiKey: editForm.apiKey || undefined,
        apiBase: editForm.apiBase || undefined,
        model: editForm.model || undefined,
      });
      setIsEditing(false);
      // Reload to get updated info
      await loadData();
    } catch (err) {
      console.error('Failed to save config:', err);
      alert(t('error.operationFailed') + ': ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleBuildIndex = async () => {
    if (indexBuilding) return;
    setIndexBuilding(true);
    setIndexProgress(null);
    try {
      await api.buildSearchIndex();
      await loadData();
    } catch (err) {
      console.error('Failed to build index:', err);
      alert(t('error.operationFailed') + ': ' + err.message);
    } finally {
      setIndexBuilding(false);
      // Clear progress after a short delay to show completion message
      setTimeout(() => setIndexProgress(null), 2000);
    }
  };

  const handleCleanIndex = async () => {
    if (!confirm(t('settings.confirmCleanIndex'))) return;
    try {
      await api.cleanSearchIndex();
      await loadData();
    } catch (err) {
      console.error('Failed to clean index:', err);
      alert(t('error.operationFailed') + ': ' + err.message);
    }
  };

  if (loading && !envInfo) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <ArrowPathIcon className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-8">
      <h1 className="text-2xl font-bold mb-8 text-gray-900">{t('settings.title')}</h1>

      {/* Embedding Configuration */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Cog6ToothIcon className="w-5 h-5" />
            {t('settings.globalConfig')}
          </h2>
          {!isEditing ? (
            <button
              onClick={handleStartEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              <PencilIcon className="w-4 h-4" />
              {t('settings.edit')}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancelEdit}
                className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-gray-900 hover:bg-black rounded-md transition-colors disabled:opacity-50 shadow-sm"
              >
                {saving ? (
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckIcon className="w-4 h-4" />
                )}
                {t('common.save')}
              </button>
            </div>
          )}
        </div>
        
        <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
          {/* Embedding Model */}
          <div className="px-6 py-4 border-b border-gray-200/60 grid grid-cols-3 gap-4 items-center">
            <div className="text-sm font-medium text-gray-500">{t('settings.embeddingModel')}</div>
            <div className="col-span-2">
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.model}
                  onChange={(e) => setEditForm(f => ({ ...f, model: e.target.value }))}
                  className="w-full px-3 py-1.5 text-sm font-mono bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-all"
                  placeholder="text-embedding-3-small"
                />
              ) : (
                <span className="text-sm text-gray-900 font-mono">
                  {envInfo?.embedding_model || 'text-embedding-3-small'}
                </span>
              )}
            </div>
          </div>
          
          {/* API Base URL */}
          <div className="px-6 py-4 border-b border-gray-200/60 grid grid-cols-3 gap-4 items-center">
            <div className="text-sm font-medium text-gray-500">{t('settings.embeddingApiBase')}</div>
            <div className="col-span-2">
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.apiBase}
                  onChange={(e) => setEditForm(f => ({ ...f, apiBase: e.target.value }))}
                  className="w-full px-3 py-1.5 text-sm font-mono bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-all"
                  placeholder="https://api.openai.com/v1"
                />
              ) : (
                <span className="text-sm text-gray-900 font-mono break-all">
                  {envInfo?.embedding_api_base || 'https://api.openai.com/v1'}
                </span>
              )}
            </div>
          </div>
          
          {/* API Key */}
          <div className="px-6 py-4 border-b border-gray-200/60 grid grid-cols-3 gap-4 items-center">
            <div className="text-sm font-medium text-gray-500">{t('settings.embeddingApiKey')}</div>
            <div className="col-span-2">
              {isEditing ? (
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={editForm.apiKey}
                  onChange={(e) => setEditForm(f => ({ ...f, apiKey: e.target.value }))}
                  className="w-full px-3 py-1.5 text-sm font-mono bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-all"
                  placeholder={envInfo?.has_api_key ? t('settings.embeddingApiKeyPlaceholderExisting') : t('settings.embeddingApiKeyPlaceholder')}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-900 font-mono">
                    {envInfo?.has_api_key ? (
                      showApiKey ? envInfo?.api_key_masked : '••••••••••••'
                    ) : (
                      <span className="text-gray-400 italic">{t('settings.notConfigured')}</span>
                    )}
                  </span>
                  {envInfo?.has_api_key && (
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      title={showApiKey ? t('settings.hideApiKey') : t('settings.showApiKey')}
                    >
                      {showApiKey ? (
                        <EyeSlashIcon className="w-4 h-4" />
                      ) : (
                        <EyeIcon className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Config Path (read-only) */}
          <div className="px-6 py-4 grid grid-cols-3 gap-4">
            <div className="text-sm font-medium text-gray-500">{t('settings.configPath')}</div>
            <div className="col-span-2 text-xs text-gray-400 font-mono break-all">
              {envInfo?.config_path || '~/.opencontext/config.json'}
            </div>
          </div>
        </div>
        
        <p className="mt-3 text-xs text-gray-400 px-1 flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-gray-300"></span>
          {t('settings.configNote')}
        </p>
      </section>

      {/* AI Configuration */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <SparklesIcon className="w-5 h-5" />
            {t('settings.aiConfig')}
          </h2>
          {!isEditingAI ? (
            <button
              onClick={handleStartEditAI}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              <PencilIcon className="w-4 h-4" />
              {t('settings.edit')}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancelEditAI}
                className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSaveAIConfig}
                disabled={savingAI}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-gray-900 hover:bg-black rounded-md transition-colors disabled:opacity-50 shadow-sm"
              >
                {savingAI ? (
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckIcon className="w-4 h-4" />
                )}
                {t('common.save')}
              </button>
            </div>
          )}
        </div>
        
        <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
          {/* Provider */}
          <div className="px-6 py-4 border-b border-gray-200/60 grid grid-cols-3 gap-4 items-center">
            <div className="text-sm font-medium text-gray-500">{t('settings.aiProvider')}</div>
            <div className="col-span-2">
              {isEditingAI ? (
                <select
                  value={aiEditForm.provider}
                  onChange={(e) => setAIEditForm(f => ({ ...f, provider: e.target.value }))}
                  className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-all"
                >
                  <option value="openai">OpenAI / Compatible</option>
                  <option value="ollama">Ollama (Local)</option>
                </select>
              ) : (
                <span className="text-sm text-gray-900">
                  {aiConfig?.provider === 'ollama' ? 'Ollama (Local)' : 'OpenAI / Compatible'}
                </span>
              )}
            </div>
          </div>
          
          {/* AI Model */}
          <div className="px-6 py-4 border-b border-gray-200/60 grid grid-cols-3 gap-4 items-center">
            <div className="text-sm font-medium text-gray-500">{t('settings.aiModel')}</div>
            <div className="col-span-2">
              {isEditingAI ? (
                <input
                  type="text"
                  value={aiEditForm.model}
                  onChange={(e) => setAIEditForm(f => ({ ...f, model: e.target.value }))}
                  className="w-full px-3 py-1.5 text-sm font-mono bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-all"
                  placeholder="gpt-4o"
                />
              ) : (
                <span className="text-sm text-gray-900 font-mono">
                  {aiConfig?.model || 'gpt-4o'}
                </span>
              )}
            </div>
          </div>
          
          {/* AI API Base URL */}
          <div className="px-6 py-4 border-b border-gray-200/60 grid grid-cols-3 gap-4 items-center">
            <div className="text-sm font-medium text-gray-500">{t('settings.aiApiBase')}</div>
            <div className="col-span-2">
              {isEditingAI ? (
                <input
                  type="text"
                  value={aiEditForm.apiBase}
                  onChange={(e) => setAIEditForm(f => ({ ...f, apiBase: e.target.value }))}
                  className="w-full px-3 py-1.5 text-sm font-mono bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-all"
                  placeholder={aiEditForm.provider === 'ollama' ? 'http://localhost:11434/api' : 'https://api.openai.com/v1'}
                />
              ) : (
                <span className="text-sm text-gray-900 font-mono break-all">
                  {aiConfig?.apiBase || 'https://api.openai.com/v1'}
                </span>
              )}
            </div>
          </div>
          
          {/* AI API Key */}
          {aiEditForm.provider !== 'ollama' && (
            <div className="px-6 py-4 border-b border-gray-200/60 grid grid-cols-3 gap-4 items-center">
              <div className="text-sm font-medium text-gray-500">{t('settings.aiApiKey')}</div>
              <div className="col-span-2">
                {isEditingAI ? (
                  <input
                    type={showAIApiKey ? 'text' : 'password'}
                    value={aiEditForm.apiKey}
                    onChange={(e) => setAIEditForm(f => ({ ...f, apiKey: e.target.value }))}
                    className="w-full px-3 py-1.5 text-sm font-mono bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-all"
                    placeholder={aiConfig?.hasApiKey ? t('settings.aiApiKeyPlaceholderExisting') : t('settings.aiApiKeyPlaceholder')}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900 font-mono">
                      {aiConfig?.hasApiKey ? (
                        showAIApiKey ? aiConfig?.apiKeyMasked : '••••••••••••'
                      ) : (
                        <span className="text-gray-400 italic">{t('settings.notConfigured')}</span>
                      )}
                    </span>
                    {aiConfig?.hasApiKey && (
                      <button
                        onClick={() => setShowAIApiKey(!showAIApiKey)}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        title={showAIApiKey ? t('settings.hideApiKey') : t('settings.showApiKey')}
                      >
                        {showAIApiKey ? (
                          <EyeSlashIcon className="w-4 h-4" />
                        ) : (
                          <EyeIcon className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* System Prompt */}
          <div className="px-6 py-4 grid grid-cols-3 gap-4">
            <div className="text-sm font-medium text-gray-500 pt-1.5">{t('settings.aiPrompt')}</div>
            <div className="col-span-2">
              {isEditingAI ? (
                <div>
                  <textarea
                    value={aiEditForm.prompt}
                    onChange={(e) => setAIEditForm(f => ({ ...f, prompt: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-all resize-y min-h-[100px]"
                    placeholder={t('settings.aiPromptPlaceholder')}
                    rows={4}
                  />
                  <button
                    onClick={handleResetPrompt}
                    className="mt-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {t('settings.aiPromptReset')}
                  </button>
                </div>
              ) : (
                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-[120px] overflow-y-auto">
                  {aiConfig?.prompt || aiConfig?.defaultPrompt || ''}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Index Status */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
          <ArrowPathIcon className="w-5 h-5" />
          {t('settings.indexStatus')}
        </h2>
        
        <div className="bg-gray-50 rounded-lg border border-gray-100 p-6">
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div>
              <div className="text-sm text-gray-500 mb-1">{t('settings.totalChunks')}</div>
              <div className="text-2xl font-bold text-gray-900 tracking-tight">
                {indexStatus?.chunkCount || 0}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">{t('settings.indexState')}</div>
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${indexStatus?.exists ? 'bg-green-500' : 'bg-red-400'}`} />
                <span className="text-sm font-medium text-gray-700">
                  {indexStatus?.exists ? t('settings.ready') : t('settings.notBuilt')}
                </span>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">{t('settings.lastUpdated')}</div>
              <div className="text-sm font-medium text-gray-700">
                {indexStatus?.lastUpdated ? (
                  new Date(indexStatus.lastUpdated).toLocaleString()
                ) : (
                  <span className="text-gray-400">{t('settings.never')}</span>
                )}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          {indexBuilding && indexProgress && (
            <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {indexProgress.message || t('settings.building')}
                </span>
                <span className="text-sm text-gray-500">
                  {indexProgress.percent}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full bg-gray-900 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${indexProgress.percent}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-gray-400">
                {indexProgress.phase === 'chunking' && '📄 分块处理中...'}
                {indexProgress.phase === 'embedding' && '🧠 生成向量中...'}
                {indexProgress.phase === 'storing' && '💾 写入索引中...'}
                {indexProgress.phase === 'done' && '✅ 完成！'}
                {' '}({indexProgress.current}/{indexProgress.total})
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-6 border-t border-gray-200/60">
            <button
              onClick={handleBuildIndex}
              disabled={indexBuilding}
              className={`
                px-4 py-2 rounded-md text-sm font-medium text-white shadow-sm transition-all
                flex items-center gap-2
                ${indexBuilding 
                  ? 'bg-gray-400 cursor-wait' 
                  : 'bg-gray-900 hover:bg-black active:scale-[0.98]'}
              `}
            >
              <ArrowPathIcon className={`w-4 h-4 ${indexBuilding ? 'animate-spin' : ''}`} />
              {indexBuilding ? t('settings.building') : t('settings.rebuildIndex')}
            </button>

            <button
              onClick={handleCleanIndex}
              disabled={indexBuilding}
              className="px-4 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all flex items-center gap-2 ml-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <TrashIcon className="w-4 h-4" />
              {t('settings.cleanIndex')}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
