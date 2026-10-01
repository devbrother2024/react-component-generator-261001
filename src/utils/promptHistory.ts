export const MAX_PROMPT_HISTORY = 20;

// 최신 프롬프트를 맨 앞에 두고, 중복은 제거하며, 최대 개수를 넘는 오래된 항목은 버린다.
export function addPromptToHistory(history: string[], prompt: string): string[] {
  return [prompt, ...history.filter((p) => p !== prompt)].slice(0, MAX_PROMPT_HISTORY);
}
