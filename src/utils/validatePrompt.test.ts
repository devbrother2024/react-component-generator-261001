import { describe, it, expect } from 'vitest';
import { validatePromptLength, MAX_PROMPT_LENGTH } from './validatePrompt';

describe('validatePromptLength', () => {
  it('최대 길이는 500자다', () => {
    expect(MAX_PROMPT_LENGTH).toBe(500);
  });

  it('500자 이하면 null을 반환한다', () => {
    expect(validatePromptLength('가'.repeat(500))).toBeNull();
  });

  it('500자를 넘으면 한국어 에러 메시지를 반환한다', () => {
    expect(validatePromptLength('가'.repeat(501))).toBe(
      '프롬프트는 500자 이하로 입력해주세요.',
    );
  });

  it('앞뒤 공백은 길이에 포함하지 않는다', () => {
    expect(validatePromptLength(`  ${'가'.repeat(500)}\n`)).toBeNull();
  });
});
