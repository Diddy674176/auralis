import { useState } from 'react';
import type { AppSettings } from '../types';
import {
  clearApiKey,
  getApiKey,
  getActiveTtsProvider,
  hasKey,
  setApiKey,
  setStoredProxyUrl,
  setTtsRuntimeConfig,
} from '../lib/tts';
import { VOICE_PRESETS } from '../lib/voices';

type PremiumChoice = 'none' | 'elevenlabs' | 'openai';

export function PremiumTtsCard({
  settings,
  onChange,
}: {
  settings: AppSettings;
  onChange: (s: AppSettings) => void;
}) {
  const provider = settings.premiumTts.provider;
  const [keyDraft, setKeyDraft] = useState(() =>
    provider === 'none' ? '' : getApiKey(provider),
  );
  const [proxyDraft, setProxyDraft] = useState(
    () => settings.premiumTts.proxyUrl || '',
  );
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function selectProvider(next: PremiumChoice) {
    setKeyDraft(next === 'none' ? '' : getApiKey(next));
    setTestStatus(null);
    setTtsRuntimeConfig({ provider: next, proxyUrl: proxyDraft.trim() });
    onChange({
      ...settings,
      premiumTts: {
        ...settings.premiumTts,
        provider: next,
        apiKeyConfigured: next === 'none' ? false : hasKey(next),
        proxyUrl: proxyDraft.trim(),
      },
    });
  }

  function saveKey() {
    if (provider === 'none') return;
    setApiKey(provider, keyDraft);
    setTestStatus(keyDraft.trim() ? 'API key saved on this device.' : 'Key cleared.');
    setTtsRuntimeConfig({ provider, proxyUrl: proxyDraft.trim() });
    onChange({
      ...settings,
      premiumTts: {
        ...settings.premiumTts,
        provider,
        apiKeyConfigured: hasKey(provider),
        proxyUrl: proxyDraft.trim(),
      },
    });
  }

  function clearKey() {
    if (provider === 'none') return;
    clearApiKey(provider);
    setKeyDraft('');
    setTestStatus('API key cleared from this device.');
    onChange({
      ...settings,
      premiumTts: {
        ...settings.premiumTts,
        provider,
        apiKeyConfigured: false,
        proxyUrl: proxyDraft.trim(),
      },
    });
  }

  function saveProxy() {
    const url = proxyDraft.trim();
    setStoredProxyUrl(url);
    setTtsRuntimeConfig({ provider, proxyUrl: url });
    onChange({
      ...settings,
      premiumTts: {
        ...settings.premiumTts,
        proxyUrl: url,
        apiKeyConfigured: provider === 'none' ? false : hasKey(provider),
      },
    });
    setTestStatus(url ? 'Proxy URL saved.' : 'Proxy URL cleared.');
  }

  async function testVoice() {
    setBusy(true);
    setTestStatus(null);
    try {
      if (provider !== 'none') {
        if (!hasKey(provider) && keyDraft.trim()) {
          setApiKey(provider, keyDraft);
        }
        if (!hasKey(provider)) {
          setTestStatus('Save an API key first.');
          return;
        }
        setStoredProxyUrl(proxyDraft.trim());
        onChange({
          ...settings,
          premiumTts: {
            ...settings.premiumTts,
            provider,
            apiKeyConfigured: true,
            proxyUrl: proxyDraft.trim(),
          },
        });
      }
      setTtsRuntimeConfig({
        provider,
        proxyUrl: proxyDraft.trim(),
      });
      const tts = getActiveTtsProvider();
      const preset = VOICE_PRESETS.find((p) => p.id === 'audiobook-narrator') ?? VOICE_PRESETS[0];
      await tts.preview('Hello from Auralis. Premium voices are ready.', preset, null);
      setTestStatus(`Playing via ${tts.label}.`);
    } catch (e) {
      setTestStatus(e instanceof Error ? e.message : 'Test failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card stack">
      <h2 className="h2">Premium voices</h2>
      <p className="muted">
        Browser Web Speech is free. ElevenLabs and OpenAI sound more natural but cost money — your API key
        stays on this device (localStorage) and is never committed or uploaded to Auralis.
      </p>
      <div className="chip-row">
        {(
          [
            ['none', 'Browser (free)'],
            ['elevenlabs', 'ElevenLabs'],
            ['openai', 'OpenAI'],
          ] as [PremiumChoice, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`chip ${provider === id ? 'active' : ''}`}
            onClick={() => selectProvider(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {provider !== 'none' && (
        <>
          <label className="muted" htmlFor="tts-api-key">
            API key ({provider === 'elevenlabs' ? 'ElevenLabs' : 'OpenAI'})
            {hasKey(provider) ? ' · saved' : ''}
          </label>
          <input
            id="tts-api-key"
            className="field"
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder={hasKey(provider) ? '•••••••• (saved — paste to replace)' : 'Paste API key'}
            value={keyDraft}
            onChange={(e) => setKeyDraft(e.target.value)}
          />
          <div className="chip-row">
            <button type="button" className="btn btn-primary" onClick={saveKey}>
              Save key
            </button>
            <button type="button" className="btn btn-secondary" onClick={clearKey}>
              Clear key
            </button>
          </div>
          <p className="muted">
            Get a key:{' '}
            {provider === 'elevenlabs' ? (
              <a href="https://elevenlabs.io/app/settings/api-keys" target="_blank" rel="noreferrer">
                elevenlabs.io/app/settings/api-keys
              </a>
            ) : (
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">
                platform.openai.com/api-keys
              </a>
            )}
          </p>
        </>
      )}

      <label className="muted" htmlFor="tts-proxy">
        CORS proxy URL (optional)
      </label>
      <input
        id="tts-proxy"
        className="field"
        type="url"
        placeholder="https://your-worker.workers.dev"
        value={proxyDraft}
        onChange={(e) => setProxyDraft(e.target.value)}
      />
      <button type="button" className="btn btn-secondary" onClick={saveProxy}>
        Save proxy URL
      </button>
      <p className="muted">
        If the browser blocks the API (CORS), paste a proxy Worker URL here. See{' '}
        <code>workers/tts-proxy/</code> in the repo for a sample Cloudflare Worker that forwards to
        ElevenLabs/OpenAI and allows <code>https://diddy674176.github.io</code>.
      </p>

      <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void testVoice()}>
        {busy ? 'Testing…' : 'Test voice'}
      </button>
      {testStatus && <p className="muted">{testStatus}</p>}
    </div>
  );
}
