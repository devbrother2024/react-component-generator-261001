import { useState, useCallback, useEffect } from 'react';
import type { GeneratedComponent, Provider } from '../types';
import { readStorage, writeStorage, STORAGE_KEYS } from '../utils/storage';
import { restoreComponents, restorePromptHistory } from '../utils/restore';
import { addPromptToHistory } from '../utils/promptHistory';
import { readGenerateStream } from '../utils/generateStream';

// 생성 코드 전체를 저장하므로 localStorage 용량(약 5MB)을 넘지 않도록 최신 항목만 저장한다.
const MAX_SAVED_COMPONENTS = 30;

interface UseComponentGeneratorReturn {
  components: GeneratedComponent[];
  history: string[];
  // 생성 중인 컴포넌트. code에는 지금까지 받은 응답 조각이 누적된다. 생성 중이 아니면 null.
  streamingComponent: GeneratedComponent | null;
  isLoading: boolean;
  error: string | null;
  generate: (prompt: string, apiKey: string | undefined, provider: Provider) => Promise<void>;
  removeComponent: (id: string) => void;
  clearAll: () => void;
}

export function useComponentGenerator(): UseComponentGeneratorReturn {
  const [components, setComponents] = useState<GeneratedComponent[]>(() =>
    restoreComponents(readStorage(STORAGE_KEYS.components, [])),
  );
  const [history, setHistory] = useState<string[]>(() =>
    restorePromptHistory(readStorage(STORAGE_KEYS.promptHistory, [])),
  );
  const [streamingComponent, setStreamingComponent] = useState<GeneratedComponent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.components, components.slice(0, MAX_SAVED_COMPONENTS));
  }, [components]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.promptHistory, history);
  }, [history]);

  const generate = useCallback(async (prompt: string, apiKey: string | undefined, provider: Provider) => {
    setIsLoading(true);
    setError(null);

    // 완료 후에도 같은 id를 써서, 생성 중 카드가 그대로 완성 카드로 이어지게 한다.
    const pending: GeneratedComponent = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      prompt,
      code: '',
      createdAt: new Date(),
    };
    setStreamingComponent(pending);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, ...(apiKey && { apiKey }), provider }),
      });

      // 스트리밍 시작 전 실패(키 누락, 과부하 등)는 JSON 에러 응답으로 온다.
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate component');
      }

      const code = await readGenerateStream(res.body, (text) => {
        setStreamingComponent((prev) => prev && { ...prev, code: prev.code + text });
      });

      setComponents((prev) => [{ ...pending, code }, ...prev]);
      setHistory((prev) => addPromptToHistory(prev, prompt));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setStreamingComponent(null);
      setIsLoading(false);
    }
  }, []);

  const removeComponent = useCallback((id: string) => {
    setComponents((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setComponents([]);
  }, []);

  return { components, history, streamingComponent, isLoading, error, generate, removeComponent, clearAll };
}
