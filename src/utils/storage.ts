// localStorage는 시크릿 모드·차단 설정·용량 초과로 예외를 던질 수 있어 모두 fallback으로 흡수한다.
export function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장 실패는 앱 동작을 막지 않는다.
  }
}

export const STORAGE_KEYS = {
  provider: 'rcg:provider',
  promptHistory: 'rcg:prompt-history',
  components: 'rcg:components',
} as const;
