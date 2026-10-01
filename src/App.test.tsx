import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { STORAGE_KEYS } from './utils/storage';

// react-live 실행 대신 표식 요소로 대체한다.
vi.mock('./components/LivePreview', () => ({
  LivePreview: () => <div data-testid="live-preview" />,
}));

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

describe('App 스트리밍 생성', () => {
  function mockServer() {
    const encoder = new TextEncoder();
    let controller!: ReadableStreamDefaultController<Uint8Array>;
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        controller = c;
      },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        Promise.resolve(
          url === '/api/config'
            ? { ok: true, json: () => Promise.resolve({ envKeys: { anthropic: true, google: true } }) }
            : { ok: true, body },
        ),
      ),
    );
    return {
      send: (event: object) =>
        act(async () => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))),
      finish: (code: string) =>
        act(async () => {
          controller.enqueue(encoder.encode(`${JSON.stringify({ type: 'done', code })}\n`));
          controller.close();
        }),
    };
  }

  async function startGenerate() {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByPlaceholderText('서버 키 사용 중');
    await user.type(screen.getByLabelText('무엇을 만들까요?'), '버튼');
    await user.click(screen.getByRole('button', { name: '컴포넌트 생성' }));
  }

  it('생성 중에는 결과 섹션에 카드를 띄우고 코드 탭에 받은 코드를 실시간으로 보여준다', async () => {
    const server = mockServer();
    await startGenerate();

    await server.send({ type: 'delta', text: 'const Button' });

    const results = screen.getByRole('region', { name: '생성 결과' });
    expect(within(results).getByRole('tab', { name: '코드' })).toHaveAttribute('aria-selected', 'true');
    expect(within(results).getByText('const Button')).toBeInTheDocument();
  });

  it('생성이 끝나면 같은 카드가 미리보기 탭으로 전환된다', async () => {
    const server = mockServer();
    await startGenerate();
    await server.send({ type: 'delta', text: 'const Button' });
    const results = screen.getByRole('region', { name: '생성 결과' });
    expect(within(results).getByRole('tab', { name: '코드' })).toHaveAttribute('aria-selected', 'true');

    await server.finish('render(<Button />)');

    expect(within(results).getAllByRole('article')).toHaveLength(1);
    expect(within(results).getByRole('tab', { name: '미리보기' })).toHaveAttribute('aria-selected', 'true');
    expect(within(results).getByTestId('live-preview')).toBeInTheDocument();
  });
});
