import { useState } from 'react';
import type { GeneratedComponent } from '../types';
import { LivePreview } from './LivePreview';
import { CodeView } from './CodeView';

interface ComponentCardProps {
  component: GeneratedComponent;
  onRemove: (id: string) => void;
  onRegenerate: (prompt: string) => void;
  isLoading: boolean;
  // 응답을 받는 중인 카드. 코드 탭에서 실시간으로 코드를 보여주고, 끝나면 미리보기 탭으로 넘어간다.
  streaming?: boolean;
}

type Tab = 'preview' | 'code';

export function ComponentCard({
  component,
  onRemove,
  onRegenerate,
  isLoading,
  streaming = false,
}: ComponentCardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('preview');
  // 생성 중에는 코드 탭을 강제한다. 탭 클릭이 막혀 activeTab은 'preview'로 남아 있으므로, 끝나면 자연스럽게 미리보기로 전환된다.
  const tab: Tab = streaming ? 'code' : activeTab;
  const [previewKey, setPreviewKey] = useState(0);
  // 복원된 코드는 무한 루프 등으로 탭을 멈출 수 있어 사용자가 직접 실행할 때까지 미리보기를 멈춰 둔다.
  const [isPreviewRunning, setIsPreviewRunning] = useState(!component.restored);
  const createdAt = component.createdAt.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <article className={`component-card ${streaming ? 'component-card--streaming' : ''}`} aria-busy={streaming}>
      <header className="card-header">
        <div className="card-title-group">
          <time dateTime={component.createdAt.toISOString()}>{createdAt}</time>
          <p className="card-prompt">{component.prompt}</p>
        </div>
        <div className="card-actions">
          <button
            className="key key--small"
            onClick={() => setPreviewKey((k) => k + 1)}
            disabled={!isPreviewRunning || streaming}
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
            disabled={streaming}
          >
            삭제
          </button>
        </div>
      </header>
      <div className="card-tabs">
        <div className="switch" role="tablist" aria-label="보기 방식">
          <button
            role="tab"
            aria-selected={tab === 'preview'}
            className={`switch-option ${tab === 'preview' ? 'switch-option--on' : ''}`}
            onClick={() => setActiveTab('preview')}
            disabled={streaming}
          >
            미리보기
          </button>
          <button
            role="tab"
            aria-selected={tab === 'code'}
            className={`switch-option ${tab === 'code' ? 'switch-option--on' : ''}`}
            onClick={() => setActiveTab('code')}
          >
            코드
          </button>
        </div>
      </div>
      <div className="card-content">
        {tab === 'preview' && isPreviewRunning && (
          <LivePreview key={previewKey} code={component.code} />
        )}
        {tab === 'preview' && !isPreviewRunning && (
          <div className="preview-paused">
            <p>이전에 만든 컴포넌트라 미리보기를 멈춰 두었습니다.</p>
            <button className="key key--small" onClick={() => setIsPreviewRunning(true)}>
              미리보기 실행
            </button>
          </div>
        )}
        {tab === 'code' && <CodeView code={component.code} streaming={streaming} />}
      </div>
    </article>
  );
}
