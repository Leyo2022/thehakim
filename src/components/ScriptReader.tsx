import React, { useMemo, useState, useRef, useEffect } from 'react';
import rawScript from '@/data/rawScript.md?raw';
import v4Script from '@/data/v4Script.md?raw';
import { scriptVersions, getScriptVersions, getV3Content, getV4Content } from '@/data/scriptVersions';
import type { ScriptVersion } from '@/data/scriptVersions';
import { ChevronDown, GitBranch, FileDiff, BookOpen, List } from 'lucide-react';
import { VersionDiffViewer } from './VersionDiffViewer';
import { SynopsisView } from './SynopsisView';

interface ScriptReaderProps {
  onNavigate?: (lineNumber: number) => void;
}

export const ScriptReader: React.FC<ScriptReaderProps> = ({ onNavigate }) => {
  const versions = useMemo(() => getScriptVersions(), []);
  const [selectedVersionId, setSelectedVersionId] = useState(versions[0]?.id || 'v3');
  const [showVersionMenu, setShowVersionMenu] = useState(false);
  const [showDiffViewer, setShowDiffViewer] = useState(false);
  const [showSynopsis, setShowSynopsis] = useState(false);
  const [v4Language, setV4Language] = useState<'zh' | 'en'>('zh');
  
  // 管理可编辑的V4内容（支持从版本差异面板修改后同步）
  const [editableV4Content, setEditableV4Content] = useState<string | null>(null);

  const isV4 = selectedVersionId === 'v4';

  const currentContent = useMemo(() => {
    if (isV4) {
      // 如果有自定义的V4内容，优先使用
      if (editableV4Content) {
        return editableV4Content;
      }
      return getV4Content(v4Language);
    }
    const version = versions.find((v) => v.id === selectedVersionId);
    return version?.content || rawScript;
  }, [versions, selectedVersionId, isV4, v4Language, editableV4Content]);

  const lines = useMemo(() => {
    const arr = currentContent.split('\n');
    return arr.map((text, idx) => ({
      lineNumber: idx + 1,
      text: text.replace(/<br\s*\/?>/gi, ''),
      isEmpty: text.trim() === '' || text.replace(/<br\s*\/?>/gi, '').trim() === '',
    }));
  }, [currentContent]);

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

  useEffect(() => {
    setCurrentLine(1);
    setSearchQuery('');
    setMatchIndex(0);
    setShowJumpDialog(false);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [selectedVersionId]);

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

  const showLineNumbers = true;
  const currentVersion = versions.find((v) => v.id === selectedVersionId);

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {/* 剧本概述切换 */}
          <div className="flex items-center gap-0.5 bg-slate-100 rounded-md p-0.5">
            <button
              onClick={() => setShowSynopsis(false)}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded transition-colors ${
                !showSynopsis ? 'bg-white text-slate-700 shadow-sm font-medium' : 'text-slate-500'
              }`}
            >
              <BookOpen size={12} />
              <span>正文</span>
            </button>
            <button
              onClick={() => setShowSynopsis(true)}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded transition-colors ${
                showSynopsis ? 'bg-white text-slate-700 shadow-sm font-medium' : 'text-slate-500'
              }`}
            >
              <List size={12} />
              <span>概述</span>
            </button>
          </div>

          <div className="h-4 w-px bg-slate-200" />

          <div className="relative flex items-center gap-2">
            <button
              onClick={() => setShowVersionMenu(!showVersionMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition-colors"
            >
              <GitBranch size={12} />
              <span className="font-medium">{currentVersion?.name}</span>
              <ChevronDown size={12} className={`transition-transform ${showVersionMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* V4 中英文切换 */}
            {isV4 && (
              <>
                <div className="flex items-center gap-0.5 bg-slate-100 rounded-md p-0.5">
                  <button
                    onClick={() => setV4Language('zh')}
                    className={`px-2 py-0.5 text-xs rounded transition-colors ${
                      v4Language === 'zh' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    🇨🇳 中文
                  </button>
                  <button
                    onClick={() => setV4Language('en')}
                    className={`px-2 py-0.5 text-xs rounded transition-colors ${
                      v4Language === 'en' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    🇬🇧 EN
                  </button>
                </div>

                {/* 版本差异按钮 */}
                <button
                  onClick={() => setShowDiffViewer(true)}
                  className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-md bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200 transition-colors"
                  title="查看 V3 与 V4 版本差异"
                >
                  <FileDiff size={12} />
                  <span>版本差异</span>
                </button>
              </>
            )}

            {showVersionMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowVersionMenu(false)} />
                <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50 min-w-[250px]">
                  <div className="px-3 py-1 text-[10px] text-slate-400 uppercase tracking-wider">选择剧本版本</div>
                  {versions.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => {
                        setSelectedVersionId(v.id);
                        setShowVersionMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 ${
                        v.id === selectedVersionId ? 'bg-sky-50' : ''
                      }`}
                    >
                      <div className="flex-1">
                        <div className={`font-medium flex items-center gap-1 ${v.id === selectedVersionId ? 'text-sky-700' : 'text-slate-700'}`}>
                          {v.name}
                          {v.language === 'zh' && <span className="text-[9px] bg-red-50 text-red-500 px-1 rounded">中</span>}
                          {v.language === 'en' && <span className="text-[9px] bg-blue-50 text-blue-500 px-1 rounded">EN</span>}
                        </div>
                        <div className="text-slate-400 text-[10px]">{v.description} · {v.updatedAt}</div>
                      </div>
                      {v.id === selectedVersionId && (
                        <div className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

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
        </div>
      </div>

      {/* 正文 / 概述 切换 */}
      {showSynopsis ? (
        <div className="flex-1 overflow-hidden">
          <SynopsisView onNavigate={(lineNumber) => {
            const scene = script?.scenes.find((s) =>
              s.lines.some((l) => l.lineNumber <= lineNumber)
            );
            if (scene) {
              onNavigate?.(lineNumber);
            }
          }} />
        </div>
      ) : (
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
      )}

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

      {/* 版本差异对比窗口 */}
      {showDiffViewer && (
        <VersionDiffViewer
          v3Content={getV3Content('en')}
          v4Content={getV4Content('en')}
          onClose={() => setShowDiffViewer(false)}
          onSaveV4Content={(content) => {
            setEditableV4Content(content);
          }}
        />
      )}
    </div>
  );
};

export default ScriptReader;
