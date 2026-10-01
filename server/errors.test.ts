import { describe, it, expect } from 'vitest';
import { toClientError } from './errors';

describe('toClientError', () => {
  it('503이 포함된 에러는 과부하 안내와 503 상태로 바꾼다', () => {
    expect(toClientError('Gemini API error: 503')).toEqual({
      status: 503,
      error: 'API 서버가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요.',
    });
  });

  it('429가 포함된 에러는 요청 과다 안내와 429 상태로 바꾼다', () => {
    expect(toClientError('Claude API error: 429')).toEqual({
      status: 429,
      error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
    });
  });

  it('그 밖의 에러는 메시지를 그대로 두고 500 상태로 바꾼다', () => {
    expect(toClientError('알 수 없는 문제')).toEqual({ status: 500, error: '알 수 없는 문제' });
  });
});
