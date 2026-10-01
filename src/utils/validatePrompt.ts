export const MAX_PROMPT_LENGTH = 500;

export function validatePromptLength(prompt: string): string | null {
  if (prompt.trim().length > MAX_PROMPT_LENGTH) {
    return `프롬프트는 ${MAX_PROMPT_LENGTH}자 이하로 입력해주세요.`;
  }
  return null;
}
