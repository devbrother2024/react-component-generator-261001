import { useState } from 'react';
import type { GeneratedComponent } from '../types';
import { LivePreview } from './LivePreview';
import { CodeView } from './CodeView';

interface ComponentCardProps {
  component: GeneratedComponent;
  onRemove: (id: string) => void;
  onRegenerate: (prompt: string) => void;
  isLoading: boolean;
}

type Tab = 'preview' | 'code';

export function ComponentCard({ component, onRemove, onRegenerate, isLoading }: ComponentCardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('preview');
  const [previewKey, setPreviewKey] = useState(0);
  const createdAt = component.createdAt.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <article className="component-card">
      <header className="card-header">
        <div className="card-title-group">
          <time dateTime={component.createdAt.toISOString()}>{createdAt}</time>
          <p className="card-prompt">{component.prompt}</p>
        </div>
        <div className="card-actions">
          <button
            className="key key--small"
            onClick={() => setPreviewKey((k) => k + 1)}
            title="애니메이션을 처음부터 다시 재생합니다"
          >
            다시 보기
          </button>
          <button
            className="key key--small"
            onClick={() => onRegenerate(component.prompt)}
            disabled={isLoading}
          >
            {isLoading ? '생성 중...' : '재생성'}
          </button>
          <button
            className="key key--small key--danger"
            onClick={() => onRemove(component.id)}
          >
            삭제
          </button>
        </div>
      </header>
      <div className="card-tabs">
        <div className="switch" role="tablist" aria-label="보기 방식">
          <button
            role="tab"
            aria-selected={activeTab === 'preview'}
            className={`switch-option ${activeTab === 'preview' ? 'switch-option--on' : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            미리보기
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'code'}
            className={`switch-option ${activeTab === 'code' ? 'switch-option--on' : ''}`}
            onClick={() => setActiveTab('code')}
          >
            코드
          </button>
        </div>
      </div>
      <div className="card-content">
        {activeTab === 'preview' ? (
          <LivePreview key={previewKey} code={component.code} />
        ) : (
          <CodeView code={component.code} />
        )}
      </div>
    </article>
  );
}
