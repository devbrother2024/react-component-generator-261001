import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { STORAGE_KEYS } from './utils/storage';

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ envKeys: { anthropic: false, google: false } }),
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('App 저장/복원', () => {
  it('저장된 Provider를 선택된 상태로 복원한다', () => {
    localStorage.setItem(STORAGE_KEYS.provider, JSON.stringify('anthropic'));
    render(<App />);

    expect(screen.getByRole('radio', { name: 'Anthropic' })).toBeChecked();
  });

  it('Provider를 바꾸면 localStorage에 저장한다', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('radio', { name: 'Anthropic' }));

    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.provider) ?? 'null')).toBe('anthropic');
  });

  it('저장된 프롬프트 히스토리를 최근 프롬프트 목록에 보여준다', () => {
    localStorage.setItem(STORAGE_KEYS.promptHistory, JSON.stringify(['프로필 카드']));
    render(<App />);

    expect(screen.getByRole('list', { name: '최근 프롬프트' })).toHaveTextContent('프로필 카드');
  });
});
