import { useState, useEffect, useRef } from 'react';

interface CodeViewProps {
  code: string;
  // 응답을 받는 중이면 복사 버튼 대신 진행 상태를 보여주고, 새 코드가 들어올 때마다 맨 아래로 스크롤한다.
  streaming?: boolean;
}

export function CodeView({ code, streaming = false }: CodeViewProps) {
  const [copied, setCopied] = useState(false);
  const blockRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const block = blockRef.current;
    if (streaming && block) block.scrollTo({ top: block.scrollHeight });
  }, [code, streaming]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-panel">
      {streaming ? (
        <p className="code-status" role="status">
          <span className="led led--busy" aria-hidden="true" />
          {code ? '코드를 받는 중입니다.' : '모델이 응답을 준비하고 있습니다.'}
        </p>
      ) : (
        <button className="key key--small btn-copy" onClick={handleCopy}>
          {copied ? '복사됨' : '코드 복사'}
        </button>
      )}
      <pre className="code-block" ref={blockRef}>
        <code>{code}</code>
        {streaming && <span className="code-caret" aria-hidden="true" />}
      </pre>
    </div>
  );
}
