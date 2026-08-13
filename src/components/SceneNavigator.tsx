import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Script } from '@/types';

interface SceneNavigatorProps {
  script: Script;
  onNavigate: (sceneId: string, lineNumber: number) => void;
  activeFilters: Record<string, boolean>;
  activeSceneId?: string | null;
}

export const SceneNavigator: React.FC<SceneNavigatorProps> = ({
  script,
  onNavigate,
  activeFilters,
  activeSceneId: externalActiveSceneId,
}) => {
  const [internalActiveSceneId, setInternalActiveSceneId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const activeSceneId = externalActiveSceneId ?? internalActiveSceneId;

  const navListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeSceneId || isCollapsed) return;
    const navList = navListRef.current;
    if (!navList) return;

    const activeBtn = navList.querySelector(`[data-nav-scene-id="${activeSceneId}"]`);
    if (activeBtn) {
      const rect = activeBtn.getBoundingClientRect();
      const navRect = navList.getBoundingClientRect();
      if (rect.top < navRect.top + 40 || rect.bottom > navRect.bottom - 40) {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [activeSceneId, isCollapsed]);

  const filteredScenes = useMemo(() => {
    if (!searchQuery.trim()) return script.scenes;
    const q = searchQuery.trim().toLowerCase();
    return script.scenes.filter((s) => {
      return (
        s.header.toLowerCase().includes(q) ||
        s.sceneNumber.toLowerCase().includes(q) ||
        (s.summary && s.summary.toLowerCase().includes(q)) ||
        s.associatedCharacters.some((c) => c.toLowerCase().includes(q))
      );
    });
  }, [script.scenes, searchQuery]);

  const handleClick = (sceneId: string, lineNumber: number) => {
    setInternalActiveSceneId(sceneId);
    onNavigate(sceneId, lineNumber);
  };

  const totalScenes = script.scenes.length;

  if (isCollapsed) {
    return (
      <div className="w-10 bg-white border-r border-slate-200 flex flex-col items-center py-3 shrink-0">
        <button
          onClick={() => setIsCollapsed(false)}
          className="w-7 h-7 rounded hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
          title="展开场次目录"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9,18 15,12 9,6" />
          </svg>
        </button>
        <div className="flex-1 w-full flex flex-col items-center gap-1 mt-4 overflow-y-auto">
          {script.scenes.map((scene) => (
            <button
              key={scene.id}
              data-nav-scene-id={scene.id}
              onClick={() => handleClick(scene.id, scene.lines.find((l) => l.lineNumber > 0)?.lineNumber || 1)}
              className={`
                w-7 h-6 rounded text-[10px] font-mono transition-all
                ${activeSceneId === scene.id
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }
              `}
              title={scene.header}
            >
              {scene.sceneNumber.replace('SC', '')}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-56 bg-white border-r border-slate-200 flex flex-col shrink-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200">
        <div className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          <span className="text-xs font-semibold text-slate-700">场次目录</span>
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          className="w-5 h-5 rounded hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors"
          title="收起目录"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15,18 9,12 15,6" />
          </svg>
        </button>
      </div>

      <div className="px-3 py-2 border-b border-slate-200">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索场次..."
            className="w-full text-xs pl-6 pr-2 py-1.5 border border-slate-200 rounded-md bg-slate-50 focus:outline-none focus:border-slate-400 focus:bg-white transition-colors placeholder-slate-400"
          />
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <div className="mt-1.5 text-[10px] text-slate-400 flex items-center justify-between">
          <span>共 {totalScenes} 场</span>
          {searchQuery && (
            <span>筛选 {filteredScenes.length} 场</span>
          )}
        </div>
      </div>

      <div ref={navListRef} className="flex-1 overflow-y-auto py-1" style={{ maxHeight: 'calc(100vh - 120px)' }}>
        <div className="px-2 space-y-0.5">
          {filteredScenes.map((scene, idx) => {
            const isActive = activeSceneId === scene.id;

            return (
              <button
                key={scene.id}
                data-nav-scene-id={scene.id}
                onClick={() => handleClick(scene.id, scene.lines.find((l) => l.lineNumber > 0)?.lineNumber || 1)}
                className={`
                  w-full text-left px-2 py-1.5 rounded-md text-xs transition-all
                  group flex items-start gap-2
                  ${isActive
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'hover:bg-slate-100 text-slate-700'
                  }
                `}
                title={scene.header}
              >
                <span
                  className={`
                    shrink-0 w-8 text-right font-mono text-[10px] leading-5
                    ${isActive ? 'text-slate-300' : 'text-slate-400 group-hover:text-slate-500'}
                  `}
                >
                  {scene.sceneNumber.replace('SC', '')}
                </span>
                <div className="flex-1 min-w-0">
                  <div className={`truncate text-[11px] font-medium leading-tight ${isActive ? 'text-white' : ''}`}>
                    {scene.header || `场次 ${scene.sceneNumber}`}
                  </div>
                  {scene.summary && (
                    <div className={`truncate text-[10px] mt-0.5 ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                      {scene.summary}
                    </div>
                  )}
                  {scene.associatedCharacters.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mt-1">
                      {scene.associatedCharacters.slice(0, 3).map((char) => (
                        <span
                          key={char}
                          className={`
                            inline-block px-1 py-px rounded text-[9px] leading-none
                            ${isActive
                              ? 'bg-slate-700 text-slate-200'
                              : 'bg-sky-50 text-sky-600'
                            }
                          `}
                        >
                          {char.replace('谢赫·', '').replace('谢哈·', '').replace('阿里·本·哈利法', '阿里')}
                        </span>
                      ))}
                      {scene.associatedCharacters.length > 3 && (
                        <span className={`text-[9px] ${isActive ? 'text-slate-400' : 'text-slate-400'}`}>
                          +{scene.associatedCharacters.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        {filteredScenes.length === 0 && (
          <div className="text-center py-8 text-xs text-slate-400">
            未找到匹配的场次
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const first = script.scenes[0];
              if (first) handleClick(first.id, first.lines.find((l) => l.lineNumber > 0)?.lineNumber || 1);
            }}
            className="flex-1 text-[10px] px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
          >
            回到第一幕
          </button>
          <button
            onClick={() => {
              const last = script.scenes[script.scenes.length - 1];
              if (last) handleClick(last.id, last.lines.find((l) => l.lineNumber > 0)?.lineNumber || 1);
            }}
            className="flex-1 text-[10px] px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
          >
            跳到结局
          </button>
        </div>
      </div>
    </div>
  );
};

export default SceneNavigator;
