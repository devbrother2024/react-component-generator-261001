import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CodeView } from './CodeView';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CodeView 생성 중(스트리밍)', () => {
  it('아직 받은 코드가 없으면 응답을 기다린다고 알린다', () => {
    render(<CodeView code="" streaming />);

    expect(screen.getByRole('status')).toHaveTextContent('모델이 응답을 준비하고 있습니다.');
  });

  it('코드를 받기 시작하면 받는 중이라고 알린다', () => {
    render(<CodeView code="const A" streaming />);

    expect(screen.getByRole('status')).toHaveTextContent('코드를 받는 중입니다.');
  });

  it('새 코드가 들어오면 코드 영역을 맨 아래로 스크롤한다', () => {
    // jsdom은 레이아웃을 계산하지 않아 scrollHeight를 고정값으로 둔다.
    const scrollTo = vi.spyOn(Element.prototype, 'scrollTo');
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(480);
    const { rerender } = render(<CodeView code="const A" streaming />);
    scrollTo.mockClear();

    rerender(<CodeView code={'const A\nconst B'} streaming />);

    expect(scrollTo).toHaveBeenCalledWith({ top: 480 });
  });
});
