import React, { useMemo, useState, useRef, useEffect } from 'react';
import rawScript from '@/data/rawScript.md?raw';
import { Copy, Check } from 'lucide-react';

interface ScriptReaderProps {
  onNavigate?: (lineNumber: number) => void;
}

export const ScriptReader: React.FC<ScriptReaderProps> = ({ onNavigate }) => {
  const lines = useMemo(() => {
    const arr = rawScript.split('\n');
    return arr.map((text, idx) => ({
      lineNumber: idx + 1,
      text: text.replace(/<br\s*\/?>/gi, ''),
      isEmpty: text.trim() === '' || text.replace(/<br\s*\/?>/gi, '').trim() === '',
    }));
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentLine, setCurrentLine] = useState(1);
  const [jumpInput, setJumpInput] = useState('');
  const [showJumpDialog, setShowJumpDialog] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const filteredLines = useMemo(() => {
    if (!searchQuery.trim()) return lines.map((l) => ({ ...l, visible: true }));
    const q = searchQuery.toLowerCase();
    return lines.map((l) => ({
      ...l,
      visible: l.text.toLowerCase().includes(q),
    }));
  }, [lines, searchQuery]);

  const matches = useMemo(() => {
    if (!searchQuery.trim()) return [] as number[];
    const q = searchQuery.toLowerCase();
    const result: number[] = [];
    lines.forEach((l) => {
      if (l.text.toLowerCase().includes(q)) {
        result.push(l.lineNumber);
      }
    });
    return result;
  }, [lines, searchQuery]);

  const [matchIndex, setMatchIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const scrollToLine = (lineNumber: number) => {
    const el = lineRefs.current.get(lineNumber);
    if (el && containerRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setCurrentLine(lineNumber);
    }
  };

  const handleJump = () => {
    const num = parseInt(jumpInput, 10);
    if (!isNaN(num) && num >= 1 && num <= lines.length) {
      scrollToLine(num);
      setShowJumpDialog(false);
      setJumpInput('');
    }
  };

  const goToMatch = (direction: 'prev' | 'next') => {
    if (matches.length === 0) return;
    let idx: number;
    if (direction === 'next') {
      idx = (matchIndex + 1) % matches.length;
    } else {
      idx = (matchIndex - 1 + matches.length) % matches.length;
    }
    setMatchIndex(idx);
    scrollToLine(matches[idx]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && showJumpDialog) {
      handleJump();
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const lineHeight = 24;
      setCurrentLine(Math.floor(scrollTop / lineHeight) + 1);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(rawScript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = rawScript;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExport = () => {
    const blob = new Blob([rawScript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'The_Hakim_剧本原文.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const showLineNumbers = true;

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-slate-800">剧本阅读</h2>
          <span className="text-xs text-slate-400">
            共 {lines.length} 行
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setMatchIndex(0);
              }}
              placeholder="搜索文本..."
              className="w-56 pl-8 pr-16 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <span className="text-xs text-slate-400">
                  {matches.length > 0 ? `${matchIndex + 1}/${matches.length}` : '0/0'}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => goToMatch('prev')}
            disabled={matches.length === 0}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 disabled:opacity-40 transition-colors"
            title="上一个匹配"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            onClick={() => goToMatch('next')}
            disabled={matches.length === 0}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 disabled:opacity-40 transition-colors"
            title="下一个匹配"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          <button
            onClick={() => setShowJumpDialog(true)}
            className="px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="跳转到指定行"
          >
            跳转
          </button>

          <button
            onClick={handleCopyAll}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg transition-colors ${
              copied
                ? 'bg-emerald-100 text-emerald-700'
                : 'hover:bg-slate-100 text-slate-600'
            }`}
            title="复制全部文本"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? '已复制' : '复制全部'}</span>
          </button>

          <button
            onClick={handleExport}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 transition-colors"
            title="导出原文"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto" ref={containerRef}>
        <div className="max-w-4xl mx-auto py-6 px-6">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex">
              {showLineNumbers && (
                <div className="shrink-0 select-none text-right py-4 pr-3 pl-3 bg-slate-50 border-r border-slate-100">
                  {filteredLines.map((line) => (
                    <div
                      key={line.lineNumber}
                      className={`text-[11px] leading-6 font-mono transition-colors ${
                        line.lineNumber === currentLine
                          ? 'bg-sky-100 text-sky-700'
                          : 'text-slate-300'
                      }`}
                    >
                      {line.lineNumber}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex-1 py-4 pr-6">
                {filteredLines.map((line) => {
                  if (!line.visible) {
                    return (
                      <div
                        key={line.lineNumber}
                        ref={(el) => {
                          if (el) lineRefs.current.set(line.lineNumber, el);
                        }}
                        className="hidden"
                      />
                    );
                  }
                  const isMatch = searchQuery && matches.includes(line.lineNumber);
                  const isCurrent = line.lineNumber === currentLine;
                  return (
                    <div
                      key={line.lineNumber}
                      ref={(el) => {
                        if (el) lineRefs.current.set(line.lineNumber, el);
                      }}
                      className={`leading-6 text-sm transition-colors px-3 select-text ${
                        isCurrent
                          ? 'bg-sky-50'
                          : 'hover:bg-slate-50'
                      } ${
                        isMatch ? 'bg-amber-50' : ''
                      }`}
                      onClick={() => {
                        setCurrentLine(line.lineNumber);
                      }}
                    >
                      {line.text || '\u00A0'}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
            <span>当前行: {currentLine}</span>
            <span>总行数: {lines.length}</span>
          </div>
        </div>
      </div>

      {showJumpDialog && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={() => setShowJumpDialog(false)}>
          <div className="bg-white rounded-lg shadow-xl p-4 w-64" onClick={handleKeyDown}>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">跳转到行</h3>
            <input
              type="number"
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleJump();
                if (e.key === 'Escape') setShowJumpDialog(false);
              }}
              placeholder={`输入行号 (1-${lines.length})`}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              autoFocus
              min={1}
              max={lines.length}
            />
            <div className="flex items-center gap-2 mt-3 justify-end">
              <button
                onClick={() => setShowJumpDialog(false)}
                className="px-3 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleJump}
                className="px-3 py-1 text-sm bg-slate-800 text-white rounded hover:bg-slate-700 transition-colors"
              >
                跳转
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScriptReader;