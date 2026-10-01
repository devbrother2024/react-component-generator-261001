import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom은 요소 스크롤(Element.scrollTo)을 구현하지 않아 no-op으로 채운다.
Element.prototype.scrollTo ??= () => {};

// 각 테스트 후 렌더된 DOM을 정리해 테스트 간 격리를 보장한다.
afterEach(() => {
  cleanup();
});
