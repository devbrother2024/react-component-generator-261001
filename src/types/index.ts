export type Provider = 'anthropic' | 'google';

export interface GeneratedComponent {
  id: string;
  prompt: string;
  code: string;
  createdAt: Date;
  // localStorage에서 복원된 항목. 저장된 코드가 탭을 멈추게 할 수 있어 미리보기를 자동 실행하지 않는다.
  restored?: boolean;
}
