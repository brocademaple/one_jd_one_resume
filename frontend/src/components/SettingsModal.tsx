import { useState, useEffect } from 'react';
import { X, Save, Eye, EyeOff, Trash2, CheckCircle, AlertCircle, Wifi } from 'lucide-react';
import { SettingsResponse } from '../types';
import { fetchSettings, updateSettings, clearApiKey, testConnection } from '../api';

interface SettingsModalProps {
  onClose: () => void;
  onSaved: () => void;
}

const PROVIDER_ORDER = ['anthropic', 'qwen', 'zhipu', 'deepseek', 'moonshot', 'baidu'];

const PROVIDER_DOCS: Record<string, { label: string; url: string }> = {
  anthropic: { label: 'Anthropic Console', url: 'https://console.anthropic.com/keys' },
  qwen:      { label: '阿里云百炼控制台', url: 'https://bailian.console.aliyun.com/' },
  zhipu:     { label: '智谱AI开放平台', url: 'https://open.bigmodel.cn/usercenter/apikeys' },
  deepseek:  { label: 'DeepSeek Platform', url: 'https://platform.deepseek.com/api_keys' },
  moonshot:  { label: 'Moonshot AI', url: 'https://platform.moonshot.cn/console/api-keys' },
  baidu:     { label: '百度智能云千帆', url: 'https://console.bce.baidu.com/qianfan/ais/console/applicationConsole/application' },
};

export function SettingsModal({ onClose, onSaved }: SettingsModalProps) {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [selectedProvider, setSelectedProvider] = useState('anthropic');
  const [selectedModel, setSelectedModel] = useState('');
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSettings().then(data => {
      setSettings(data);
      setSelectedProvider(data.provider);
      setSelectedModel(data.model);
      setApiKeys(Object.fromEntries(
        Object.keys(data.providers).map(k => [k, ''])
      ));
      setLoading(false);
    }).catch(() => {
      setError('加载设置失败');
      setLoading(false);
    });
  }, []);

  // When provider changes, reset model to provider default
  const handleProviderChange = (pid: string) => {
    setSelectedProvider(pid);
    setTestResult(null);
    const pconfig = settings?.providers[pid];
    if (pconfig) setSelectedModel(pconfig.default_model);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await updateSettings({
        provider: selectedProvider,
        model: selectedModel,
        api_keys: apiKeys,
      });
      setSaved(true);
      onSaved();
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setError('');
    try {
      const keyToTest = apiKeys[selectedProvider]?.trim();
      const result = await testConnection(
        selectedProvider,
        selectedModel,
        keyToTest || undefined,
      );
      setTestResult(result);
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : '测试失败',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleClearKey = async (provider: string) => {
    if (!confirm(`确认清除 ${settings?.providers[provider]?.name} 的 API Key？`)) return;
    try {
      await clearApiKey(provider);
      setSettings(prev => prev ? {
        ...prev,
        api_keys_set: { ...prev.api_keys_set, [provider]: '' },
      } : prev);
    } catch {
      setError('清除失败');
    }
  };

  const toggleShowKey = (provider: string) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-xl p-8 text-center">
          <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  if (!settings) return null;

  const providers = PROVIDER_ORDER.filter(p => settings.providers[p]);
  const currentProviderConfig = settings.providers[selectedProvider];
  const models = currentProviderConfig?.models ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-2xl shadow-2xl w-[700px] max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">AI 模型设置</h2>
            <p className="text-xs text-gray-500 mt-0.5">选择 AI 提供商、模型并配置 API Key</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Provider tabs */}
          <div className="px-6 pt-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">选择 AI 提供商</p>
            <div className="grid grid-cols-3 gap-2">
              {providers.map(pid => {
                const p = settings.providers[pid];
                const hasKey = !!settings.api_keys_set[pid];
                const isActive = selectedProvider === pid;
                return (
                  <button
                    key={pid}
                    onClick={() => handleProviderChange(pid)}
                    className={`relative flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${
                      isActive
                        ? 'border-primary-500 bg-primary-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isActive ? 'text-primary-700' : 'text-gray-700'}`}>
                        {p.name_cn}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{p.name}</p>
                    </div>
                    {hasKey && (
                      <CheckCircle size={14} className="flex-shrink-0 text-green-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Model selection */}
          <div className="px-6 pt-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">选择模型</p>
            <div className="grid grid-cols-2 gap-2">
              {models.map(m => (
                <button
                  key={m.id}
                  onClick={() => { setSelectedModel(m.id); setTestResult(null); }}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${
                    selectedModel === m.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                    selectedModel === m.id
                      ? 'border-primary-500 bg-primary-500'
                      : 'border-gray-300'
                  }`} />
                  <div className="min-w-0">
                    <p className={`text-sm truncate ${selectedModel === m.id ? 'font-medium text-primary-700' : 'text-gray-700'}`}>
                      {m.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate font-mono">{m.id}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* API Keys section */}
          <div className="px-6 pt-5 pb-6">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">API Keys 配置</p>
            <div className="space-y-3">
              {providers.map(pid => {
                const p = settings.providers[pid];
                const hasKey = !!settings.api_keys_set[pid];
                const doc = PROVIDER_DOCS[pid];
                const isCurrentProvider = pid === selectedProvider;

                return (
                  <div
                    key={pid}
                    className={`rounded-xl border p-3 transition-colors ${
                      isCurrentProvider ? 'border-primary-200 bg-primary-50/30' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${isCurrentProvider ? 'text-primary-700' : 'text-gray-700'}`}>
                          {p.name}
                        </span>
                        {hasKey
                          ? <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                              <CheckCircle size={10} /> 已配置
                            </span>
                          : <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                              <AlertCircle size={10} /> 未设置
                            </span>
                        }
                      </div>
                      <div className="flex items-center gap-1">
                        {doc && (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary-600 hover:underline"
                          >
                            获取 Key →
                          </a>
                        )}
                        {hasKey && (
                          <button
                            onClick={() => handleClearKey(pid)}
                            className="ml-2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="清除Key"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <div className="relative flex-1">
                        <input
                          type={showKeys[pid] ? 'text' : 'password'}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-9 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
                          placeholder={hasKey ? '已设置（输入新值以更新）' : `输入 ${p.name} API Key`}
                          value={apiKeys[pid] || ''}
                          onChange={e => setApiKeys(prev => ({ ...prev, [pid]: e.target.value }))}
                          autoComplete="off"
                        />
                        <button
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          onClick={() => toggleShowKey(pid)}
                          type="button"
                        >
                          {showKeys[pid] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                      {isCurrentProvider && (
                        <button
                          onClick={handleTestConnection}
                          disabled={testing}
                          className="flex items-center gap-1.5 px-3 py-2 text-sm text-primary-600 border border-primary-300 rounded-lg hover:bg-primary-50 disabled:opacity-50 whitespace-nowrap shrink-0"
                        >
                          {testing ? (
                            <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Wifi size={14} />
                          )}
                          {testing ? '测试中...' : '测试连接'}
                        </button>
                      )}
                    </div>
                    {isCurrentProvider && testResult && (
                      <p className={`mt-2 text-xs flex items-center gap-1 ${testResult.success ? 'text-green-600' : 'text-red-500'}`}>
                        {testResult.success ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                        {testResult.message}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <div className="text-sm">
            {error && (
              <span className="text-red-500 flex items-center gap-1">
                <AlertCircle size={14} /> {error}
              </span>
            )}
            {saved && (
              <span className="text-green-600 flex items-center gap-1">
                <CheckCircle size={14} /> 设置已保存
              </span>
            )}
          </div>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save size={14} />
              )}
              {saving ? '保存中...' : '保存设置'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
