import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentCard } from './ComponentCard';
import type { GeneratedComponent } from '../types';

// 미리보기 실행 여부만 검증하기 위해 react-live 대신 표식 요소로 대체한다.
vi.mock('./LivePreview', () => ({
  LivePreview: () => <div data-testid="live-preview" />,
}));

const restoredComponent: GeneratedComponent = {
  id: '1',
  prompt: '카드',
  code: 'render(<div />)',
  createdAt: new Date('2026-10-01T05:00:00.000Z'),
  restored: true,
};

function renderCard(component: GeneratedComponent) {
  render(
    <ComponentCard
      component={component}
      onRemove={vi.fn()}
      onRegenerate={vi.fn()}
      isLoading={false}
    />,
  );
}

describe('ComponentCard 복원된 컴포넌트', () => {
  it('미리보기를 실행하지 않고 "미리보기 실행" 버튼을 보여준다', () => {
    renderCard(restoredComponent);

    expect(screen.queryByTestId('live-preview')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '미리보기 실행' })).toBeInTheDocument();
  });

  it('"미리보기 실행"을 누르면 미리보기를 실행한다', async () => {
    const user = userEvent.setup();
    renderCard(restoredComponent);

    await user.click(screen.getByRole('button', { name: '미리보기 실행' }));

    expect(screen.getByTestId('live-preview')).toBeInTheDocument();
  });

  it('미리보기를 실행하기 전에는 "다시 보기"가 비활성이다', () => {
    renderCard(restoredComponent);

    expect(screen.getByRole('button', { name: '다시 보기' })).toBeDisabled();
  });
});
