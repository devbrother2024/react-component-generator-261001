import type { GeneratedComponent, Provider } from '../types';
import { MAX_PROMPT_HISTORY } from './promptHistory';

// localStorage 값은 손상되었거나 예전 형식일 수 있으므로 신뢰하지 않고 검증한 뒤 복원한다.

const PROVIDERS: readonly Provider[] = ['anthropic', 'google'];

export function restoreProvider(value: unknown): Provider {
  return PROVIDERS.includes(value as Provider) ? (value as Provider) : 'google';
}

export function restorePromptHistory(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const prompts = value.filter((item): item is string => typeof item === 'string');
  return [...new Set(prompts)].slice(0, MAX_PROMPT_HISTORY);
}

export function restoreComponents(value: unknown): GeneratedComponent[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const { id, prompt, code, createdAt } = (item ?? {}) as Record<string, unknown>;
    if (typeof id !== 'string' || typeof prompt !== 'string' || typeof code !== 'string') {
      return [];
    }
    const date = new Date(createdAt as string);
    if (typeof createdAt !== 'string' || Number.isNaN(date.getTime())) return [];
    return [{ id, prompt, code, createdAt: date }];
  });
}
