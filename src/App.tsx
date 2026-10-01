import { useState, useEffect } from 'react';
import { PromptInput } from './components/PromptInput';
import { ComponentCard } from './components/ComponentCard';
import { useComponentGenerator } from './hooks/useComponentGenerator';
import type { Provider } from './types';
import { readStorage, writeStorage, STORAGE_KEYS } from './utils/storage';
import { restoreProvider } from './utils/restore';
import './App.css';

const PROVIDER_CONFIG = {
  anthropic: { label: 'Anthropic', placeholder: 'sk-ant-...' },
  google: { label: 'Google', placeholder: 'AIza...' },
} as const;

function App() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [provider, setProvider] = useState<Provider>(() =>
    restoreProvider(readStorage(STORAGE_KEYS.provider, null)),
  );
  const [envKeys, setEnvKeys] = useState<Record<Provider, boolean>>({
    anthropic: false,
    google: false,
  });
  const { components, history, isLoading, error, generate, removeComponent, clearAll } =
    useComponentGenerator();

  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => setEnvKeys(data.envKeys))
      .catch(() => {});
  }, []);

  const hasEnvKey = envKeys[provider];

  const handleGenerate = (prompt: string) => {
    if (!apiKey.trim() && !hasEnvKey) {
      alert(`${PROVIDER_CONFIG[provider].label} API 키를 입력하거나 .env에 설정해주세요.`);
      return;
    }
    generate(prompt, apiKey || undefined, provider);
  };

  const handleProviderChange = (newProvider: Provider) => {
    setProvider(newProvider);
    writeStorage(STORAGE_KEYS.provider, newProvider);
    setApiKey('');
  };

  const lcdProvider = PROVIDER_CONFIG[provider].label.toUpperCase();
  const lcdCount = String(components.length).padStart(2, '0');

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-copy">
          <p className="nameplate">
            <span className="nameplate-model">RC-1</span>
            React 컴포넌트 생성기
          </p>
          <h1>말로 설명하면, 바로 쓸 수 있는 컴포넌트로.</h1>
          <p className="header-lede">
            만들고 싶은 UI를 적으면 React 코드와 실시간 미리보기가 함께 나옵니다.
          </p>
        </div>
        <div
          className={`lcd ${isLoading ? 'lcd--busy' : ''}`}
          role="status"
          aria-label={`${PROVIDER_CONFIG[provider].label} 사용 중, ${
            isLoading ? '생성 중' : '대기'
          }, 생성된 컴포넌트 ${components.length}개`}
        >
          <div className="lcd-screen" aria-hidden="true">
            <div className="lcd-top">
              <span>{lcdProvider}</span>
              <span className="lcd-state">{isLoading ? 'BUSY' : 'READY'}</span>
            </div>
            <div className="lcd-count">
              <span className="lcd-ghost">88</span>
              <span className="lcd-digits">{lcdCount}</span>
            </div>
          </div>
          <span className="lcd-caption" aria-hidden="true">생성된 컴포넌트</span>
        </div>
      </header>

      <main className="workspace">
        <section className="composer-panel" aria-label="컴포넌트 생성">
          <PromptInput onGenerate={handleGenerate} isLoading={isLoading} history={history} />
        </section>

        <aside className="settings-panel" aria-label="실행 설정">
          <h2>실행 설정</h2>
          <div className="setting">
            <span className="setting-label" id="provider-label">
              AI 제공자
            </span>
            <div className="switch" role="radiogroup" aria-labelledby="provider-label">
              {(Object.keys(PROVIDER_CONFIG) as Provider[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={provider === key}
                  className={`switch-option ${provider === key ? 'switch-option--on' : ''}`}
                  onClick={() => handleProviderChange(key)}
                >
                  {PROVIDER_CONFIG[key].label}
                </button>
              ))}
            </div>
          </div>
          <div className="setting">
            <label className="setting-label" htmlFor="api-key">
              API 키
            </label>
            <div className="api-key-field">
              <input
                id="api-key"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder={hasEnvKey ? '서버 키 사용 중' : PROVIDER_CONFIG[provider].placeholder}
              />
              <button
                className="key key--small"
                onClick={() => setShowKey(!showKey)}
                type="button"
              >
                {showKey ? '숨기기' : '보기'}
              </button>
            </div>
            <p className={`key-status ${hasEnvKey ? 'key-status--ready' : ''}`}>
              <span className="led" aria-hidden="true" />
              {hasEnvKey
                ? '.env 키가 연결되어 있습니다. 직접 입력하면 이 키 대신 사용합니다.'
                : '키를 입력하거나 서버 .env에 설정하세요.'}
            </p>
          </div>
        </aside>
      </main>

      {error && (
        <div className="error-banner" role="alert">
          <strong>생성하지 못했습니다.</strong>
          <p>{error}</p>
        </div>
      )}

      <section className="results-section" aria-label="생성 결과">
        {components.length > 0 && (
          <div className="results-header">
            <h2>생성된 컴포넌트</h2>
            <button className="key key--small key--quiet" onClick={clearAll}>
              전체 삭제
            </button>
          </div>
        )}

        {components.length === 0 && !isLoading && (
          <div className="empty-state">
            <div className="empty-screen" aria-hidden="true">
              <span />
            </div>
            <div className="empty-copy">
              <h2>아직 만든 컴포넌트가 없습니다.</h2>
              <p>
                위에 만들고 싶은 UI를 적고 <strong>컴포넌트 생성</strong>을 누르세요. 결과는
                여기에 최신 순으로 쌓입니다.
              </p>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="loading-card" role="status">
            <span className="led led--busy" aria-hidden="true" />
            <p>컴포넌트를 생성하고 있습니다.</p>
          </div>
        )}

        <div className="results-grid">
          {components.map((component) => (
            <ComponentCard
              key={component.id}
              component={component}
              onRemove={removeComponent}
              onRegenerate={handleGenerate}
              isLoading={isLoading}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

export default App;
